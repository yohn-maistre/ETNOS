# Multi-account identity host: what was built, tested and measured

19 November 2026 · build note for task 24 (Run 2), following `pds-multi-identity-plan-2026-11-18.md`. All identities in tests are synthetic and live in an in-memory fake directory.

**Update, later on 19 November (owner's go-ahead for a test deploy):** the host is **live on workers.dev with sign-up closed**, at `https://etnos-identity-host.giyaibo.workers.dev` (`/health` answers `"signup":"closed"`). It was deployed by the `identity-host` job in `.github/workflows/deploy-etnos.yml` (deploy line `2026-11-19l`). No DNS was touched and no DID was registered on the public PLC directory. AT Protocol spaces (alpha) are built on the host (§9), and the same bundle runs on plain workerd for self-hosting (§10). ETNOS does not offer hosted sign-up until the owner sets `STRATA_ACCOUNT_HOST` (§6).

Status words follow `proposal/claims-2026-11-18.md`: the host is **live for testing, closed to sign-up**; spaces are **built** (alpha upstream); self-hosting on workerd is **built and tested locally**; Docker is a **plan**.

## 1. What exists now

A second Worker entry in `packages/pds`, `src/host/worker.ts`, hosts many AT accounts on one deployment. The single-identity worker (`src/worker.ts`) is unchanged and keeps its tests.

| Piece | File | What it does |
| --- | --- | --- |
| Edge | `src/host/worker.ts` | Splits the service host (`pds.etnos.space`: XRPC, OAuth, pages) from handle hosts (`<name>.etnos.space`: only `/.well-known/atproto-did`). Reads the directory before waking any account object. Body limits, no service proxy, 501 for everything not listed. |
| Directory | `src/host/directory.ts`, `migrations/0001_directory.sql` | D1 tables `accounts`, `invites`, `audit`. Handle and invite claims are one D1 batch with `UNIQUE` constraints, so concurrent claims have exactly one winner. Status is the authority the edge checks. |
| Account object | `src/host/account-do.ts` | One SQLite Durable Object per account (`idFromName("account:" + random account id)`). Generates the signing key and the host rotation key, signs the genesis operation, computes the DID and hashes the password, all inside the object. Keys are wrapped with AES-256-GCM under `HKDF(KEK, salt=DID, info=account-key/<purpose>/v1)` with associated data `DID|purpose|kek_version`; rows are rewrapped lazily when `ACCOUNT_KEK_CURRENT` moves to a new version. Every method takes the DID the edge expects and refuses any other. Deletion empties the object and leaves a tombstone that blocks reprovisioning. |
| Auth hub | `src/host/auth-hub.ts` | One object holding OAuth pushed requests, codes and tokens (reusing the Cirrus `SqliteOAuthStorage`), purge by `sub`, and per-address budgets keyed by HMAC (no raw IPs). |
| OAuth | `src/host/oauth.ts` | Wraps `@getcirrus/oauth-provider` 0.6.0 without forking it. Adds the account step: the account comes from the client's `login_hint` (read from the stored pushed request) or from a signed ten-minute cookie bound to that request, set on the selector page. Indonesian consent and selector pages; the provider's own English page is not shown. Accounts used on the device are remembered in a signed cookie and listed on the selector. The token endpoint refuses and revokes grants for accounts that are no longer active. |
| Sessions | `src/host/session.ts` | Legacy `createSession` tokens with a per-account HS256 secret derived from the KEK, verified at the edge without waking an object. Each token carries the account's session epoch; deactivation, deletion and takedown bump it. |
| PLC | `src/host/plc.ts` | Genesis operation, signing, DID derivation (checked against a public genesis operation from plc.directory), and `registerGenesis`, which reads `log/last` before posting and reads again after any unclear outcome. It never posts a second time on an unknown result. |
| Lifecycle | `src/host/service.ts` | Sign-up saga (claim → provision → record DID → PLC → active), resumable with the same invite, name and password; deactivate, reactivate, delete (directory `deleting` → purge hub, object and blobs → `deleted`, name kept). |
| Pages | `src/host/pages.ts` | `/akun/baru` sign-up form and the OAuth pages. No scripts, strict CSP, `frame-ancestors 'none'`. |
| ETNOS side | `src/oauth.ts`, `src/worker.ts` | Optional `accountHost` (`STRATA_ACCOUNT_HOST`). `/auth/options` returns it; `/auth/start` in sign-up mode accepts `provider: "host"` (authorise at the configured host, which shows the selector) or `handle` (enrol an existing account with an ETNOS invitation). The host is never taken from request input and must be in `allowedHosts`. |
| Tools | `scripts/measure-host.mjs`, `scripts/host-escrow-key.mjs`, `wrangler.host.example.jsonc` | Local timing; offline escrow key generation; deployment template with D1. |
| Ports | `src/host/ports.ts`, `src/host/directory-do.ts` | The directory depends on a small `SqlDatabase` port. D1 satisfies it; `DirectoryDurableObject` is the same schema in one SQLite Durable Object (used on workers.dev and on plain workerd). |
| Deployed config | `wrangler.host.jsonc` | workers.dev, directory in a Durable Object, no D1 or R2, `PLC_WRITES "off"` (sign-up closed, no escrow key needed), spaces on. |
| Spaces | `src/host/spaces.ts` | AT Protocol spaces (alpha) for many accounts; §9. |
| Self-hosting | `scripts/selfhost-config.mjs` | Writes a workerd configuration for the same bundle with Durable Objects on local disk; §10. |

What Strata reads after sign-in (checked in `src/oauth.ts`): only the OAuth session's DID and the handle from identity resolution (handle → DID through `bsky.social`'s resolver, DID → document through plc.directory). No profile record. So the host must answer the well-known handle file, OAuth, and the PLC document must list `https://pds.etnos.space` and `at://<name>.etnos.space`. All three are covered.

Not built yet (plan phases 5–7): passkeys and recovery links, outbound migration (`signPlcOperation` returns 501), member-held rotation key, nightly CAR backup to R2, firehose hub and relay crawling, blob quotas, email. `getRepo` (CAR export) works, so a member can download their repository.

## 2. Tests

All in `packages/pds/test/`, run by `npm test` in that package (workerd through Miniflare; the official Strata OAuth client from `src/oauth.ts`; every network edge intercepted).

- `host-units.test.mjs`: DID derivation equals the public directory's for a known genesis; a changed operation fails verification; `registerGenesis` reads first, never posts on an unreadable directory, and posts exactly once on a thrown request; handle rules; password hashes and key wrapping fail closed for another DID or purpose.
- `host-runtime.test.mjs`:
  - **creation and resolution**: invite-only; handle host serves only the DID; `describeServer` says invite required; HTML form errors in Indonesian; used invites refused; operator listing has no key material.
  - **access isolation**: Alice's token naming Bob's repo is refused on createRecord, putRecord, deleteRecord and applyWrites and Bob's commit is unchanged; a token signed with Alice's secret but naming Bob fails; forged or unknown DIDs create no object (counted on disk); the operator token is not an account credential; Alice's object refuses Bob's DID on `repoFor`, `checkPassword`, `purge` and `fetch`; Bob's password does not open Alice; `listRepos` lists active accounts only.
  - **concurrency**: five simultaneous sign-ups for one name, one winner; four simultaneous uses of one invite, one winner; two accounts writing in parallel stay separate; a replayed refresh token wins once.
  - **uncertain PLC outcome**: a lost response is reconciled by reading (one POST); a network failure leaves the account pending and unresolvable, a different password cannot take it over, and the retry reads first and posts once with the same DID.
  - **key custody**: the test decrypts the stored keys with the test KEK, then checks that no response body or header in a scripted lifecycle (writes, reads, CAR export, sessions, wrong passwords, unsupported identity routes, admin) contains either key in hex, base64, base64url or base58btc, and that the object's SQLite file holds neither key in plaintext. Changed associated data fails to decrypt. KEK rotation: with V2 current, the signing key is rewrapped under V2 and still signs after V1 is replaced.
  - **withdrawal**: deactivation hides the handle, refuses reads with `RepoDeactivated`, stops old tokens at once, leaves `listRepos`; signing in again shows `deactivated` and allows only reactivation. Operator takedown and reinstatement. Deletion needs the password; afterwards reads, export, handle and sign-in are gone, the object holds only its tombstone and cannot be provisioned again, and the name stays taken.
  - **throttles**: ten failures lock one account's password checks without touching another; one address that spends its budget is refused while another address signs in.
  - **publication boundary and guards**: firehose, Spaces, AppView and import routes return 501; `atproto-proxy` is refused; oversized bodies 413; the public directory is refused without `PLC_WRITES=public-directory-approved`; a short operator token is refused.
- `host-oauth.test.mjs`: the official client signs in Alice with her `login_hint`; Bob's password does not authorise Alice; a cross-site post is refused; Alice's DPoP grant writes her repository and is refused on Bob's; the steward enrols Bob through ETNOS; Bob on the same device sees his consent page, "Pakai akun lain" shows the selector with Alice remembered; a tampered selection cookie is ignored; Bob's selection and password cannot complete a request for Alice; deleting Alice revokes her grants (her ETNOS agent can no longer write, the hub holds no live tokens for her) while Bob continues; a new person with an ETNOS invitation signs up with `provider: "host"`, picks the account on the selector and is enrolled.
- `host-runtime.test.mjs`, **closed sign-up**: with `PLC_WRITES "off"` and the public directory configured, the host serves health, `describeServer` and OAuth metadata, refuses `/akun/baru` and `createAccount` (`SignupsClosed`), makes no PLC call and claims no row; a malformed escrow key is still refused.
- `host-workerd.test.mjs`: the bundle on open-source workerd (not Miniflare), directory in `DirectoryDurableObject`, Durable Objects on a local folder, fake PLC behind workerd's outbound service: invite, sign-up, a reused invite refused, a record written, workerd restarted, then the handle, the record and a password sign-in still work.
- `host-spaces.test.mjs`: §9.
- `host-units.test.mjs` also checks that the inlined directory schema equals `migrations/0001_directory.sql`.
- Root `test/signup.test.ts`: sign-up by handle sends `login_hint`; `provider: "host"` sends none; a node without an account host refuses it; a host outside `allowedHosts` is refused.

## 3. Measurements

`node scripts/measure-host.mjs` on this machine, 19 November, Node 22.23, Miniflare/workerd. Wall time including harness overhead; an upper bound for orientation, not Cloudflare's CPU metering.

| Step | Median ms | p90 ms |
| --- | --- | --- |
| Node: two key generations, genesis signature, DID | 2.6 | 10.6 |
| Node: PBKDF2-SHA256 100,000 iterations (hash) | 16.8 | 29.3 |
| Node: PBKDF2-SHA256 100,000 iterations (verify) | 15.0 | 25.3 |
| Node: HKDF and AES-GCM unwrap | 0.15 | 0.39 |
| Node: HKDF and HS256 verify | 0.2 | 0.5 |
| workerd: `createAccount` (claim, keys, genesis, fake PLC, session) | 66.9 | 76.4 |
| workerd: `createSession` (PBKDF2 inside the account object) | 25.7 | 28.0 |
| workerd: `createRecord` | 9.8 | 17.1 |
| workerd: `getRecord` (D1 and account object) | 5.0 | 12.6 |
| workerd: handle well-known (D1 only) | 3.1 | 3.7 |
| workerd: `describeServer` | 1.6 | 1.8 |

Reading: the edge Worker's own work is a D1 query, an HKDF and an HMAC, well under a millisecond of crypto. Password checks moved from bcryptjs in the Worker (91 ms in the 18 November note) to native PBKDF2 inside the account object (about 15 ms). That still exceeds 10 ms, so **the Free question is unchanged: if Durable Objects on Free are held to 10 ms CPU, password sign-in does not fit**, and neither may account creation. The spike in plan §8 is still the way to settle it, and the fix if it fails is Workers Paid. PBKDF2 at 100,000 iterations is also the Workers ceiling and below current OWASP advice for PBKDF2-SHA256; passkeys (planned) avoid both problems.

## 4. Licence checks (19 November)

- **Cirrus** (`ascorbic/cirrus`): `packages/pds/package.json` on `main` declares `"license": "MIT"`; no LICENSE file was found at the repository root or package root on `main` today (raw requests returned 404). The fork's grant and notice are kept in `packages/pds/LICENSE.cirrus`. New code in `src/host/` is Strata's (AGPL-3.0-only); it reuses Cirrus files (account object, OAuth storage, repository handlers) by import, with the one change recorded in `UPSTREAM.md`.
- **rust-pds-cloudflare** (`Spirallex/rust-pds-cloudflare`): LICENSE says "PolyForm Noncommercial License 1.0.0" and `Cargo.toml` says `license = "PolyForm-Noncommercial-1.0.0"`. Nothing was copied and its code was not read; only the licence file and `Cargo.toml` were fetched. It stays out of this repository.
- `@getcirrus/oauth-provider` 0.6.0 (MIT) is wrapped as a dependency, not copied.

## 5. Deviations from the plan, and why

- **Account objects are addressed by a random account id, not by DID.** The DID only exists after the keys are generated, and keys are generated inside the object. The directory maps DID to account id; every route reads the directory first, so this costs one D1 read per request and gives the "never wake an object for an unknown DID" property for free.
- **Passwords, not passkeys first.** Passkeys need the browser flow and an account step before options are issued; they are the next piece. Passwords are hashed inside the object with PBKDF2 and throttled per account and per address.
- **Session revocation by epoch instead of `tokens_valid_after` timestamps**, so a session issued in the same second as a revocation is not ambiguous.
- **Handle routing**: the template routes only `*.etnos.space/.well-known/atproto-did` to the Worker (a path-scoped wildcard route), so other subdomains never reach it. The pass-through switch remains for a whole-host route if the spike shows the path route does not work.

## 6. What the owner must approve, in order

Done with the owner's go-ahead of 19 November: the Worker deploy on workers.dev (`etnos-identity-host`, sign-up closed), its secrets (the KEK was made once on the runner and exists only as a Worker secret, which is fine while there are no accounts; set the repository secret `STRATA_PDS_KEK` before opening sign-up if a paper copy is wanted, and do it **before** the first account exists, because the workflow never replaces an existing KEK), and the health check. Still to approve, each one setting or one command:

1. **Decide the open questions** (plan §9): Workers Paid or not; where the KEK paper copy and the escrow private key live and who may hold them; whether the custodial wording on `/akun/baru` is acceptable (draft: "Akun ini adalah identitas AT Protocol yang disimpan oleh ETNOS. ETNOS menyimpan kunci akun Anda dan dapat diminta memindahkannya ke penyedia lain."); who may issue invites and takedowns; whether deleted names are held for ever (built) or released after 90 days; whether deletion should also tombstone the DID at PLC (not built).
2. **CPU on Cloudflare**: with accounts closed, CPU can only be read for health, metadata and pages today. The PBKDF2 sign-in figure (about 15 ms locally) is read from Workers Logs after step 5.
3. **Escrow key**, on the owner's machine: `node scripts/host-escrow-key.mjs ~/etnos-escrow.key`; put the printed `did:key` in the repository variable `STRATA_PDS_ESCROW_KEY`; store the file offline.
4. **DNS and routes** (see §12: use a separate PDS domain, not `pds.etnos.space`): add the custom domain `pds.etnos.space` to the `etnos-identity-host` Worker, a proxied wildcard record `*.etnos.space` (originless), and the route `*.etnos.space/.well-known/atproto-did`; then set the repository variable `STRATA_PDS_HOSTNAME=pds.etnos.space`. Check that existing subdomains still reach their origins.
5. **One throwaway DID on the public directory**: set the repository variable `STRATA_PDS_PLC_WRITES=public-directory-approved`, redeploy (append a line to `deploy/etnos.txt`), create one account named for the test (for example `uji-1`) with an invite from `/admin/invites` (operator token: repository secret `STRATA_PDS_OPERATOR_TOKEN`, then redeploy), check it resolves through `bsky.social` and plc.directory, then deactivate it. The DID stays in the public log for ever.
6. **ETNOS configuration**: set the repository variable `STRATA_ACCOUNT_HOST=https://pds.etnos.space`. The workflow adds the host to `STRATA_OAUTH_HOSTS`. The ETNOS worker must reach the host through its public name; same-zone Worker-to-Worker `fetch` may need the `global_fetch_strictly_public` compatibility flag or a service binding **[U]**, to confirm at this step.
7. **Real members**: not before passkeys, recovery and backups (plan phases 5–6). Real members stay on the official PDS track until then.

## 7. What the interface should show (for the web app)

- On the sign-in page, when `/auth/options` returns `accountHost`: a button "Buat akun ETNOS" that links to `<accountHost>/akun/baru` (with `?kode=` when the person has a host invite), and a sign-up button that posts `/auth/start` with `{mode: "signup", invitation, provider: "host"}`.
- After sign-up on the host, the "Masuk ke ETNOS" button goes to `SIGNIN_URL?handle=<name>.etnos.space`; the login page can prefill the handle from that parameter.
- In Studio, for stewards: an "Undang anggota" action that calls the host's `/admin/invites` through the ETNOS server (needs the operator token as an ETNOS secret; not built, because it would put a host credential in the ETNOS worker and should be decided with the owner).
- For spaces (§9), when the community UI wants them: a steward action "Buat ruang AT" on a private community that calls `com.atproto.simplespace.createSpace` with the lembaga's account, and member changes that call `addMember` and `removeMember` together with the Strata membership change. The UI should say plainly that the operator can read space data (access control, not encryption) and that spaces are in trial.

## 8. Live deployment (19 November)

- Worker `etnos-identity-host` on `https://etnos-identity-host.giyaibo.workers.dev`, deployed by the `identity-host` job after the ETNOS job in `deploy-etnos.yml`. A failure there does not hold back ETNOS.
- Bindings: `ACCOUNT`, `AUTH_HUB`, `DIRECTORY_DO`, `SPACES`, `SPACES_INDEX` (all SQLite Durable Objects, available on the Free plan). No D1 and no R2, so blob upload is not available until an R2 bucket is approved.
- Secrets: `ACCOUNT_KEK_V1` (set once, never replaced by the workflow), `OPERATOR_TOKEN` (from `STRATA_PDS_OPERATOR_TOKEN` when set, otherwise random once).
- Repository variables the owner may set: `STRATA_PDS_HOSTNAME`, `STRATA_PDS_ESCROW_KEY`, `STRATA_PDS_PLC_WRITES`, `STRATA_ACCOUNT_HOST`.
- Bundle: 3.5 MiB raw, 690 KiB gzip with spaces (Free limit 3 MiB gzip).

## 9. AT Protocol spaces on this host *(alpha, built 19 November)*

Spec: proposal 0016 ([permissioned data](https://github.com/bluesky-social/proposals/blob/main/0016-permissioned-data/README.md)), alpha announced 20 August 2026 ([atproto.com/blog/atproto-spaces-alpha](https://atproto.com/blog/atproto-spaces-alpha)). Bluesky's own words: not for production, no backups, schema not final. Our earlier trial against the official alpha is in `labs/spaces`. The design this follows is `docs/communities-spaces-2026-11-19.md` §3–4.1.

**What it is.** A space is `at://{authority}/space/{type}/{key}`. The authority is any DID; its PDS is the space host. An individual account can be the authority; for a lembaga the design uses a dedicated account. Policies: member list (`memberListPolicy`), public (`publicPolicy`), or a managing app. Each member's records stay in a per-space repository on that member's own PDS. Readers get a short delegation from their own PDS and exchange it at the space host for a credential (bound to a DPoP key); repo hosts accept that credential.

**How it is built here.** `src/host/spaces.ts` wraps the MIT engine `@getcirrus/spaces` 0.1.0 (pinned to `@atproto/space` alpha 2026-08-18), which upstream serves one account per deployment. This host extends it to serve every account it hosts, so one Worker runs spaces for many people:

- Every spaces request is served for one hosted, active account: the signed-in account for writes and management, the `repo` for reads, the space authority for credential and sync calls. Unknown or inactive accounts get `RepoNotFound`.
- Space objects are named `"{account} {space uri}"`, so two hosted members of one space never share storage; each account has its own index.
- Space tokens and service JWTs are signed inside the account's object (`signSpaceJwt`). It signs only JWT signing inputs of the space kinds, issued by that account, so it is not a general signing oracle. The key never leaves the object.
- A session counts only for its own account: Budi's token naming Ana's space repository is refused.
- **Removal is immediate.** The alpha's credentials live up to two hours and cannot be revoked; the lab showed a removed member still reading. Here the authority's object records whom each credential went to, and every credential read on this host for a space whose authority is also on this host is checked against the space's current policy (member list: still a member; public: allowed). For an authority on another PDS, a credential is accepted only while younger than `SPACES_REMOTE_CREDENTIAL_MAX_AGE` (default 300 seconds); the reader then has to fetch a fresh one, which the remote host grants only to current members.
- Deleting an account removes its space repositories and index (withdrawal).
- Calls between accounts on this host stay inside the Worker (a Worker cannot fetch its own host name).

**Modes.**

| Mode | Authority | Space host | Members' records | Status |
| --- | --- | --- | --- | --- |
| Host-managed | the lembaga's account on this host | this host | each member's own PDS (this host for hosted members) | built, tested |
| Own PDS | the lembaga's account on its own PDS (Aksara node, mini PC, own Cloudflare) | that PDS | each member's own PDS | members on this host can write and serve reads; tested against an outside authority |

**Tests** (`test/host-spaces.test.mjs`): the lembaga creates a member-list space; a member cannot manage members; Ana writes into her space repository and Budi's session cannot; the record is absent from Ana's public `listRecords`, `getRecord` and `describeRepo`; Budi reads with a credential; the credential without its key, Budi's session on Ana's repo and an anonymous read are refused; a non-member gets no credential; **after removal Budi's existing credential is refused at once** and a new one is refused; a public space lets a non-member read with a credential, and that credential does not open the private space; after Ana deletes her account her space repository is gone. Second test: a space whose authority is a DID on another PDS; Ana's write is announced to that PDS with `notifyWrite`; a credential it signed is accepted while fresh and refused once older than the limit; a forged credential is refused.

**Not built / alpha gaps.** Blob storage for spaces (needs R2); sync notifications to outside syncers are the engine's, untested here; managing-app policy is accepted only within 60 seconds of issue; OAuth consent text for space scopes is the provider's; credential records are kept until expiry. Strata's private communities stay the store of record; mirroring a community into a space is behind the design doc's per-community flag and not wired into the Strata app.

## 10. Self-hosting: one codebase, plain workerd *(recommendation confirmed; Docker is a plan)*

The owner's recommendation holds, with one change from the original plan: the directory no longer needs D1.

- `packages/pds` is its own package with its own entry (`src/host/worker.ts`) and configs. It imports no Strata app code; Strata talks to it only over XRPC and OAuth (the OAuth test uses Strata's client as an outside client).
- The seam: `SqlDatabase` for the directory (D1 or `DirectoryDurableObject`), SQLite Durable Objects for accounts, auth, spaces (workerd runs these on local disk), R2 for blobs (optional), and the Workers runtime API for fetch, alarms and secrets, which workerd implements.
- **Tested**: `host-workerd.test.mjs` runs the production bundle on the open-source `workerd` binary with `scripts/selfhost-config.mjs`, and it survives a restart. So a Node adapter is not needed; nothing in workerd blocked the host.
- **Not yet**: blobs on workerd (no R2 there). Options: a disk-backed blob object behind the `R2Bucket` subset Cirrus uses, or an S3-compatible store. Records and accounts work without it; voice notes need it.

Docker plan (not shipped: no Docker daemon was available to test a build):

1. Build the bundle: `cd packages/pds && npx wrangler deploy --dry-run --config wrangler.host.jsonc --outdir dist`.
2. Image: `FROM debian:bookworm-slim`, copy the `workerd` binary from the `@cloudflare/workerd-linux-64` package (or `-arm64` for ARM mini PCs) and `dist/worker.js`; a non-root user; `VOLUME /data`.
3. At start: `node scripts/selfhost-config.mjs --bundle /app/worker.js --storage /data --port 8080 --address 0.0.0.0 --vars /run/secrets/vars.json --config-dir /app > /app/config.capnp`, then `workerd serve /app/config.capnp --experimental` (the config can also be generated at build time).
4. In front: Caddy or the node's reverse proxy for TLS, setting `X-Forwarded-Proto: https`; handles need `*.<domain>` pointing at the box.
5. Backups: copy `/data` while workerd is stopped, or after a nightly export (not built).

## 11. Rust or WebAssembly: plan, not a rewrite

Where this host spends CPU, measured on this machine (Node, 19 November; `@atproto/crypto` and `@atcute/cbor`, the libraries the host uses):

| Work | Median |
| --- | --- |
| PBKDF2-SHA256 100,000 iterations (sign-in) | about 15 ms (native WebCrypto) |
| secp256k1 signature (each commit, each space token) | 0.27 ms (pure JS, noble) |
| SHA-256 of 32 KiB | 0.17 ms |
| DAG-CBOR encode of a post | 0.002 ms |
| CID of a block | 0.002 ms |

A record write is a few CBOR encodes and CIDs (the MST path, about log16 of the repo size), one signature and SQLite writes. Local `createRecord` was 9.8 ms wall in workerd, mostly runtime and storage, not crypto. The one heavy step is the password hash, already native. Repository export (`getRepo`) grows with repo size and is the only other candidate.

What Rust or WASM would change: secp256k1 in WASM is likely a few times faster than pure JS **[U]**, a saving of roughly 0.2 ms per write, well inside the Free plan's 10 ms. It cannot speed up PBKDF2, which is already native, and it would add a build toolchain and a second language. Passkeys remove the password cost entirely.

The ecosystem (licences checked 19 November): **rsky** (Blacksky, Apache-2.0, a full PDS and relay in Rust, with a spaces branch, rsky#319); **atrium** (MIT, Rust client libraries); **rust-pds-cloudflare** (PolyForm Noncommercial, not usable here). Apache-2.0 and MIT code could be used as dependencies in an AGPL project.

Recommendation: no move now. Measure first, then reconsider if any of these holds, read from Workers Logs on the live host:

- p95 CPU above 7 ms on write routes once passwords are excluded;
- `getRepo` or `listRepoOps` for a 10,000-record repository above 30 ms CPU;
- signing becomes more than a third of CPU on any route.

Then the first step would be one WASM module for secp256k1 signing and CAR writing behind the same functions, not a rewrite.


## 12. Hosting 5 to 20 people, entryways, domains, and which hosts may join *(research, 19 November)*

**One Worker already hosts many people.** The host runs one Durable Object per account, so 5 to 20 test accounts need no new design. Only the spaces engine (`@getcirrus/spaces`) is single-account upstream, and §9 explains how this host extends it to every account. The one open risk is CPU on the Free plan. A password sign-in costs about 15 ms locally, and Free may cap a request at 10 ms. Passkeys avoid that cost, and Workers Paid (5 USD a month) removes the cap. Reading the real figure from Workers Logs after the first test account settles which one we need.

**An entryway is only needed when one name fronts several PDS machines.** Bluesky moved accounts off `bsky.social` in November 2023 and kept that name as an "account entryway" in front of about 90 PDS hosts ([atproto discussion #1832](https://github.com/bluesky-social/atproto/discussions/1832)). The entryway owns passwords, OAuth, service handles and the PLC rotation key; each PDS behind it holds repositories, blobs and signing keys, and clients send data requests straight to the PDS that is named in the DID document. Bluesky's entryway is not open source. `atproto-entryway` from atproto-crates implements the same contract and is a release candidate ([atproto-crates.com/entryway](https://atproto-crates.com/entryway.html)); the reference PDS has an entryway mode (`PDS_ENTRYWAY_URL`). The atproto-crates guide also says that a single PDS should run without an entryway, because an entryway adds a second service that holds every password and hot key. On Cloudflare our host already spreads accounts across Durable Objects, so it gains nothing from an entryway today. An entryway becomes useful when ETNOS runs Aksara Node machines in several places and wants one sign-in name for all of them. That test belongs with the Aksara Node work.

**The PDS needs its own domain, separate from the app.** Bluesky's production guide says that an app and a PDS must not share a domain, because blobs from the PDS would be served from the same site as its password and OAuth pages ([atproto.com/guides/going-to-production](https://atproto.com/guides/going-to-production)). Its example rules out `pds.greensky.app` and suggests `greensky-pds.net`. So `pds.etnos.space`, which §6 step 4 proposes, should be replaced by a separate domain before the first real account. Changing a PDS hostname later means migrating each account one by one. Handles can still be `nama.etnos.space`, because a handle domain and a PDS host are independent: Bluesky handles end in `bsky.social` while the accounts live on `*.host.bsky.network`.

**Handles under `etnos.space` can be offered to accounts on any PDS.** A handle only needs `etnos.space` to answer `/.well-known/atproto-did` for that name. ETNOS could therefore give a member on their own PDS, or on a lembaga's machine, a name such as `nama.etnos.space`. A lembaga can do the same on its own domain. This separates the name that people see from the place where the data is stored, and it lets people move hosts without losing their name.

**Public participation should stay open to any AT Protocol account; private spaces can limit hosts.** Signing in with an account from any PDS is the main value of the network, and AGENTS.md already says that an AT identity never grants community membership. Membership stays a Strata decision. Private spaces are different, because each member's private records are stored on that member's own PDS. A lembaga that wants its records to stay on hosts it trusts should be able to set a list of allowed hosts for a space: the ETNOS host, its own Aksara Node, or both. Strata would check the `atproto_pds` entry in the member's DID document when they join and again when it reads. This is a proposal and is not built.

Recommended order for the 5 to 20 person test:
1. Register a separate PDS domain and use it in place of `pds.etnos.space` in §6 step 4.
2. Keep handles as `nama.etnos.space` through the well-known route.
3. Create one throwaway DID, then read sign-in CPU from Workers Logs and decide between passkeys and Workers Paid.
4. Invite 5 to 20 test members with invite codes, after recovery and backups are in place.
5. Add the per-space list of allowed hosts when the first private space is mirrored.
