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
