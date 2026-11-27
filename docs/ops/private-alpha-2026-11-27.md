# Private alpha on etnos.space (27 November 2026)

The owner chose a private alpha of 10 to 20 invited people, with a wider opening after the move to a new Cloudflare account ([fresh-cloudflare-migration.md](fresh-cloudflare-migration.md)). This page records what was built for it, the decisions behind it, and every setting that the owner must create. Newer sections are added below as the work lands.

## 1. Invite gate

`ETNOS_ENROLLMENT_MODE` (still read as `STRATA_ENROLLMENT_MODE` in `wrangler.web.jsonc`) is now `invite`. Everything public stays readable without an account.

**One link, both ways in.** The operator makes an invitation link in Studio, tab *Undangan* (`/studio/undangan`). A link looks like `https://etnos.space/gabung?kode=…`, lasts 1 to 30 days and can be used by 1 to 20 people. The node keeps only the SHA-256 of the code, and the page drops the code from the address bar after reading it. The page `/gabung` offers two ways in:

- **A new account on the ETNOS identity host.** The node checks its own invitation, then sends the person to the host's sign-up page with a *signed grant* in place of the host's own invite code (`packages/pds/src/host/link-grant.ts`). The grant names the invitation and its use count. The host turns each use into an ordinary invite row (`grant:<id>:<n>`), so a link for n people makes at most n host accounts, and each row is used once, exactly like a code from `POST /admin/invites`. Grants expire after one hour or when the invitation expires, whichever is first.
- **An existing Bluesky account** (or a new one made at bsky.social). This is the node's existing enrollment path: the invitation is checked at the start and consumed in the same transaction that enrols the person at the callback.

Neither path is weaker than before. The node still consumes its invitation once per enrolled person, and the host still uses each invite row once. A person who abandons the host flow after the account was made has used a host slot but not a node use; that account still enrols on its first sign-in, because accounts on the node's own host already passed the host's invitation (the rule from 20 November). The worst case for a link for n people is therefore n host accounts plus n Bluesky enrolments, never more. A revoked invitation stops new grants at once; a grant already issued keeps working on the host for at most one hour.

**Requests.** Where a visitor would sign up without a code, the page shows *Minta undangan* with a name, a free-text contact and a short reason. Requests are stored in `invite_requests`, which no public route, search, notification, count or export reads. Each network address may send three requests an hour, and the queue holds at most 300 pending requests. In Studio, *Setujui* makes a one-person link valid for 14 days for the operator to copy and send; *Tolak* deletes the request. Approved requests leave the queue after 30 days. No email is sent.

**What the owner must create.** For the host path to use the same link, one shared secret must exist on both Workers, with the same value (32 random bytes, base64url):

| Worker | Secret name |
| --- | --- |
| `strata-preview` (web) | `ETNOS_IDENTITY_HOST_LINK_KEY` |
| `etnos-identity-host` | `NODE_LINK_KEY` |

Make the value with `node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))'` and set it with `npx wrangler secret put … --config <config>`. Without the secret the invite gate still works: `/gabung` then offers the Bluesky way only, and the host's sign-up form needs a code from `POST /admin/invites` as before.

Tests: `test/invite-gate.test.ts` (outsiders refused on every path, use counts, expiry, revocation, the grant, and requests absent from public paths) and `packages/pds/test/host-links.test.mjs` (grant slots, forged, expired and reset grants, and a host without the key).

## 2. Node backups and restore

The node now backs itself up once a day on its Durable Object alarm (`src/node-backup.ts`). The export reads every table with plain `SELECT` statements inside one synchronous call. A Durable Object runs one request at a time and nothing awaits between the reads, so the result is a consistent snapshot without `VACUUM INTO` or an export API. The JSON dump is compressed with gzip and written to the private R2 bucket `etnos-node-backups` as `node/<time>.json.gz`; objects older than 14 days are deleted after each run. Sign-in state (sessions, sealed OAuth records, rate-limit counters) and the keys added in Studio are never exported.

Studio, *Pengaturan*, shows the time and size of the last backup and the list of stored ones. The operator can start a backup and download any of them; *Unduh salinan sekarang* streams a fresh export even where no bucket is bound. Every backup route answers 404 to anyone but the operator, and file names carry the time only.

An import restores a backup into an empty node of the same schema version, in one transaction with foreign keys checked at the end: `POST /v1/ops/restore`, with the operator's session or the one-time `ETNOS_RESTORE_TOKEN`. The move to a new account uses it; the steps are in [fresh-cloudflare-migration.md](fresh-cloudflare-migration.md) §1b.

**What the owner must create.**

| What | Name | When |
| --- | --- | --- |
| R2 bucket, private | `etnos-node-backups` (binding `NODE_BACKUPS` in `wrangler.web.jsonc`) | Before the next deploy of `strata-preview`, in every account that runs it: `npx wrangler r2 bucket create etnos-node-backups`. Without it `wrangler deploy` fails. |
| Worker secret on `strata-preview` | `ETNOS_RESTORE_TOKEN` | Only for a restore by command line; delete it afterwards. |

Tests: `test/node-backup.test.ts` exports a populated node, imports it into a fresh one and compares every table's row count, known rows, a BLOB column and the private community's visibility; it also checks the refusals (a node with data, another schema version, an unknown table, a broken file, a failure halfway).

## 3. Account recovery on the identity host

Accounts on the identity host carry no email, so recovery works without one.

- **A one-time recovery code** is made at sign-up and shown once: on the page after the sign-up form, on the page between sign-up and consent when the sign-up started from ETNOS, and as `etnosRecoveryCode` in the `createAccount` XRPC answer (other clients ignore the field). It is 20 characters from a 32-letter alphabet without look-alikes (100 bits), in groups of five. The account object keeps only `SHA-256("recovery:" + DID + ":" + code)`.
- **Password reset with the handle and the code** at `/akun/pulihkan`. Each network address has ten tries per ten minutes, and five wrong codes lock this path for that account for the rest of the window. Every refusal reads the same (*Nama akun atau kode pemulihan salah.*), so the page does not tell whether an account exists. A success sets the new password, ends every session (session epoch, OAuth grants and refresh sessions), uses up the code and shows a new one.
- **A one-time reset link from the operator** for someone who lost the code: in Studio, *Undangan*, *Pemulihan akun* (signed by the node with the shared link key from section 1), or with the host's operator token at `POST /admin/accounts/reset-link` with `{"handle": "…"}` (signed with a key the host derives from its KEK). A link names one handle, lasts 24 hours and works once; the host records each used link in the account object. The operator should check who is asking before sending one.
- **Passkeys** are unchanged. The sign-in consent page now links to *Pulihkan akun*, and so does the ETNOS sign-in form when the node has an identity host.

The age to confirm on the host's sign-up form is now a setting, `MIN_AGE` on `etnos-identity-host`, with 18 as the default (see section 6).

Nothing new must be created for this section beyond the shared link key from section 1, which only the Studio route needs.

Tests: `packages/pds/test/host-recovery.test.mjs` (the code is shown and never stored; wrong, foreign, used and mismatched input refused; sessions end; per-account lock and per-address budget; operator links need the token, work once, expire and cannot be altered; node-signed links work with the shared key; an invite grant is not a reset link) and `test/invite-gate.test.ts` (the Studio route is steward only and needs the shared key).
