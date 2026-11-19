# Multi-account identity host: what was built, tested and measured

19 November 2026 · build note for task 24 (Run 2), following `pds-multi-identity-plan-2026-11-18.md`. Nothing was deployed, no Cloudflare resource was created, no DNS was touched and no DID was registered on the public PLC directory. All identities in tests are synthetic and live in an in-memory fake directory.

Status words follow `proposal/claims-2026-11-18.md`: this host is **built** (merged and tested locally), not live.

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
| Tools | `scripts/measure-host.mjs`, `scripts/host-escrow-key.mjs`, `wrangler.host.example.jsonc` | Local timing; offline escrow key generation; deployment template (not deployed). |

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

Each step is one command or one setting. None has been done.

1. **Decide the open questions** (plan §9): Workers Paid or not; where the KEK paper copy and the escrow private key live and who may hold them; whether the custodial wording on `/akun/baru` is acceptable (draft: "Akun ini adalah identitas AT Protocol yang disimpan oleh ETNOS. ETNOS menyimpan kunci akun Anda dan dapat diminta memindahkannya ke penyedia lain."); who may issue invites and takedowns; whether deleted names are held for ever (built) or released after 90 days; whether deletion should also tombstone the DID at PLC (not built).
2. **Spike, Worker only** (plan §8 steps 1–4, no DNS, no DID): approve deploying the throwaway probe and this host under a `workers.dev` name with a private fake PLC URL. Commands: `cd packages/pds && npx wrangler d1 create etnos-identity-directory-spike`, put the id in a copy of `wrangler.host.example.jsonc`, `npx wrangler d1 migrations apply etnos-identity-directory-spike --remote`, `npx wrangler secret put ACCOUNT_KEK_V1` (value from `openssl rand 32 | basenc --base64url | tr -d =`), `npx wrangler secret put OPERATOR_TOKEN`, `npx wrangler deploy --config <copy>`. Read CPU per request from Workers Logs. Delete afterwards with `npx wrangler delete` and `npx wrangler d1 delete`.
3. **Escrow key**, on the owner's machine: `node scripts/host-escrow-key.mjs ~/etnos-escrow.key`; put the printed `did:key` in `ESCROW_ROTATION_KEY`; store the file offline.
4. **DNS and routes** (plan §8 step 5): approve the `pds.etnos.space` custom domain and a proxied wildcard record `*.etnos.space` (originless), plus the route `*.etnos.space/.well-known/atproto-did`. Check that existing subdomains still reach their origins.
5. **One throwaway DID on the public directory** (plan §8 step 6): set `PLC_URL=https://plc.directory` and `PLC_WRITES=public-directory-approved`, create one account named for the test (for example `uji-1`), check it resolves through `bsky.social` and plc.directory, then deactivate it. The DID stays in the public log for ever.
6. **ETNOS configuration**: add `pds.etnos.space` to `STRATA_OAUTH_HOSTS` and set `STRATA_ACCOUNT_HOST=https://pds.etnos.space`. The ETNOS worker must reach the host through its public name; same-zone Worker-to-Worker `fetch` may need the `global_fetch_strictly_public` compatibility flag or a service binding **[U]**, to confirm in the spike.
7. **Real members**: not before passkeys, recovery and backups (plan phases 5–6). Real members stay on the official PDS track until then.

## 7. What the interface should show (for the web app)

- On the sign-in page, when `/auth/options` returns `accountHost`: a button "Buat akun ETNOS" that links to `<accountHost>/akun/baru` (with `?kode=` when the person has a host invite), and a sign-up button that posts `/auth/start` with `{mode: "signup", invitation, provider: "host"}`.
- After sign-up on the host, the "Masuk ke ETNOS" button goes to `SIGNIN_URL?handle=<name>.etnos.space`; the login page can prefill the handle from that parameter.
- In Studio, for stewards: an "Undang anggota" action that calls the host's `/admin/invites` through the ETNOS server (needs the operator token as an ETNOS secret; not built, because it would put a host credential in the ETNOS worker and should be decided with the owner).
