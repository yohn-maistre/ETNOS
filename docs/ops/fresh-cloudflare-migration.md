# Migrating ETNOS to a Dedicated Cloudflare Free Account

This runbook moves both Cloudflare Workers (`strata-preview` for ETNOS and `etnos-identity-host` for the AT Protocol identity host) to a fresh, dedicated Cloudflare Free account so ETNOS has the full free-tier budget (100,000 Worker requests/day, SQLite Durable Objects, Workers AI, D1, and R2 free tier) without sharing quotas with other projects.

## Free-tier architecture built in

1. Static frontend assets (`/assets/*`, `/branding/*`, `/fonts/*`, `/manifest.webmanifest`, `/sw.js`) bypass the Worker via `assets.run_worker_first` exclusions and do not consume the 100,000/day Worker quota.
2. Anonymous public API reads (`/v1/entri*`, `/v1/contexts*`, `/v1/wiki/discover`, `/v1/aksara/jadwal`, `/v1/peta-kata*`, anonymous `/v1/feed/page`) are served from Cloudflare's edge Cache API (`src/edge-cache.ts`) for 30–120 seconds, shielding the SQLite Durable Object from anonymous traffic spikes. Authenticated requests (`Cookie` or `Authorization`) strictly bypass the cache.
3. Hot-path composite SQLite indexes (`posts_community_visible_created`, `kamus_entries_public_lookup`, `voice_clips_kamus_lookup`) keep DO row reads low.
4. `DAILY_SIGNUP_CAP` (default `50` brand-new accounts per 24 hours on `etnos-identity-host`) protects against invite-link bursts exhausting free-tier limits.

## Before you cut over

1. Trigger a full R2 CAR backup of all active accounts on the existing `etnos-identity-host`:
   ```bash
   curl -fsS -X POST "https://<old-pds-host>/admin/backup" \
     -H "Authorization: Bearer $OLD_OPERATOR_TOKEN" | jq .
   ```
2. Record your existing `ESCROW_ROTATION_KEY` (held offline) and decide whether you are keeping the same `ACCOUNT_KEK_V1` (required to decrypt exported account keys) or starting fresh accounts.
3. Have a Cloudflare API Token for the **new** account with permissions:
   - Account → Workers Scripts: Edit
   - Account → Workers KV / Durable Objects / D1 / R2: Edit
   - Zone → DNS & Workers Routes: Edit (for `etnos.space`)

## Step-by-step migration

### 1. Run the provisioning & deploy script

```bash
export CLOUDFLARE_ACCOUNT_ID="<new-account-id>"
export CLOUDFLARE_API_TOKEN="<new-api-token>"
export ETNOS_ORIGIN="https://etnos.space"
export PDS_HOSTNAME="pds.etnos.space" # or leave empty for workers.dev
bash scripts/migrate-cloudflare-account.sh
```

The script:
- Creates the D1 directory database (`etnos-identity-directory`) and runs `packages/pds/migrations/0001_directory.sql`.
- Creates the R2 blob/backup bucket (`etnos-identity-blobs`).
- Generates fresh `STRATA_OAUTH_JWK` (ES256 JWK) and `STRATA_AUTH_SEAL_KEY` (32-byte random key) if not supplied via env vars.
- Uploads required Worker secrets to both `strata-preview` and `etnos-identity-host`.
- Builds the web UI and deploys both Workers.

### 1b. Move the node's data with export and import

A Durable Object's storage cannot be moved between Cloudflare accounts, so the node (`StrataNode`: communities, posts, Ensiklopedia, Kamus, members, invitation links and requests) moves as a backup file instead (`src/node-backup.ts`). The file is one consistent snapshot of every table, compressed with gzip. It leaves out sign-in state, so everyone signs in again after the move, and it leaves out the model and service keys that were added in Studio, so add those again in Studio. The file holds private data: keep it off shared drives and delete it once the move is checked.

1. **Use the same release on both sides.** A backup restores only into a node with the same schema version. Deploy the new account from the same commit as the old one, restore, and only then deploy newer code.
2. **Make the backup on the old account.** In Studio, open *Pengaturan* and then *Cadangan node*. Press *Buat cadangan sekarang*, then *Unduh* on the newest row (or *Unduh salinan sekarang*, which needs no bucket). Do this last, right before the DNS change, and pause writing (for example, tell the alpha group) so nothing is written after the backup.
3. **Create the backup bucket in the new account** before the first deploy, because `wrangler.web.jsonc` binds it as `NODE_BACKUPS`:
   ```bash
   npx wrangler r2 bucket create etnos-node-backups
   ```
   Leave it private: no public access and no custom domain.
4. **Set a one-time restore token on the new `strata-preview`** (at least 32 characters):
   ```bash
   node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))' | npx wrangler secret put ETNOS_RESTORE_TOKEN --config wrangler.web.jsonc
   ```
5. **Restore before anyone signs in**, on the Worker's own workers.dev name, before the DNS change:
   ```bash
   curl -fsS -X POST "https://strata-preview.<new-subdomain>.workers.dev/v1/ops/restore" \
     -H "Authorization: Bearer $ETNOS_RESTORE_TOKEN" \
     --data-binary @etnos-node-<time>.json.gz
   ```
   The answer lists the tables and rows restored. The node refuses a backup when it already holds posts or more than one person, when the schema version differs, or when the file is not an ETNOS backup; a refused or failed restore changes nothing.
6. **Remove the token** once the restore has succeeded:
   ```bash
   npx wrangler secret delete ETNOS_RESTORE_TOKEN --config wrangler.web.jsonc
   ```
7. **Check** after the DNS change that `/v1/communities` lists the old communities, then sign in as the operator and open Studio.

The identity host is separate: its accounts move with the R2 CAR backups above and their PLC records, as described in the steps for the identity host.

Daily backups run on the node's alarm once the bucket is bound: one object per day under `node/<time>.json.gz`, kept 14 days, visible and downloadable only in Studio, *Pengaturan*. A failed run is shown there and tried again an hour later.

### 2. Optional service secrets (set via Studio or `wrangler secret put`)

- `STRATA_MODEL_KEY` (Google AI Studio or OpenRouter API key; can also be pasted in `/studio` -> Aksara)
- `OPENALEX_API_KEY` (optional literature citations; also settable in `/studio`)
- `PLANTNET_API_KEY` (optional opt-in public plant identification; also settable in `/studio`)
- `ETNOS_SPLAT_WORKER_URL` + `ETNOS_SPLAT_SECRET` (optional Modal.com free-tier GPU worker from `packages/splat-worker/`)

### 3. Update GitHub Actions for automatic deploys

In `yohn-maistre/etnos` → **Settings → Secrets and variables → Actions**:
- **Secrets:** update `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to the new account.
- **Variables:** set `STRATA_ACCOUNT_HOST` (`https://pds.etnos.space` or your new `workers.dev` URL), `STRATA_PDS_HOSTNAME`, and optionally `STRATA_MODEL_FAST` / `STRATA_MODEL_BASE_URL`.

### 4. DNS cutover

Move or point `etnos.space` DNS on the new Cloudflare account:
- Attach Workers Custom Domains / Routes for `etnos.space/*` and `*.etnos.space/*` to `strata-preview`.
- Attach `pds.etnos.space/*` to `etnos-identity-host`.

### 5. Post-cutover verification

```bash
curl -fsS https://etnos.space/health | jq .
curl -fsS -D - -o /dev/null https://etnos.space/v1/aksara/jadwal | grep -i x-etnos-edge-cache
curl -fsS https://etnos.space/v1/peta-kata/concepts | jq '.concepts | length'
curl -fsS https://pds.etnos.space/health | jq .
```
