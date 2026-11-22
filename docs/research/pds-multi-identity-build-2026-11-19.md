# Multi-account identity host: what was built, tested and measured

19 November 2026 · build note for task 24 (Run 2), following `pds-multi-identity-plan-2026-11-18.md`. All identities in tests are synthetic and live in an in-memory fake directory.

**Update, later on 19 November (owner's go-ahead for a test deploy):** the host is **live on workers.dev with sign-up closed**, at `https://etnos-identity-host.giyaibo.workers.dev` (`/health` answers `"signup":"closed"`). It was deployed by the `identity-host` job in `.github/workflows/deploy-etnos.yml` (deploy line `2026-11-19l`). No DNS was touched and no DID was registered on the public PLC directory. AT Protocol spaces (alpha) are built on the host (§9), and the same bundle runs on plain workerd for self-hosting (§10). ETNOS does not offer hosted sign-up until the owner sets `ETNOS_ACCOUNT_HOST` (§6).

Status words follow `competition/claims-2026-11-18.md`: the host is **live for testing, closed to sign-up**; spaces are **built** (alpha upstream); self-hosting on workerd is **built and tested locally**; Docker is a **plan**.

## 1. What exists now

A second Worker entry in `packages/pds`, `src/host/worker.ts`, hosts many AT accounts on one deployment. The single-identity worker (`src/worker.ts`) is unchanged and keeps its tests.

| Piece | File | What it does |
| --- | --- | --- |
| Edge | `src/host/worker.ts` | Splits the service host (`etnos-identity-host.giyaibo.workers.dev`: XRPC, OAuth, pages) from handle hosts (`<name>.etnos.space`: only `/.well-known/atproto-did`). Reads the directory before waking any account object. Body limits, no service proxy, 501 for everything not listed. |
| Directory | `src/host/directory.ts`, `migrations/0001_directory.sql` | D1 tables `accounts`, `invites`, `audit`. Handle and invite claims are one D1 batch with `UNIQUE` constraints, so concurrent claims have exactly one winner. Status is the authority the edge checks. |
| Account object | `src/host/account-do.ts` | One SQLite Durable Object per account (`idFromName("account:" + random account id)`). Generates the signing key and the host rotation key, signs the genesis operation, computes the DID and hashes the password, all inside the object. Keys are wrapped with AES-256-GCM under `HKDF(KEK, salt=DID, info=account-key/<purpose>/v1)` with associated data `DID|purpose|kek_version`; rows are rewrapped lazily when `ACCOUNT_KEK_CURRENT` moves to a new version. Every method takes the DID the edge expects and refuses any other. Deletion empties the object and leaves a tombstone that blocks reprovisioning. |
| Auth hub | `src/host/auth-hub.ts` | One object holding OAuth pushed requests, codes and tokens (reusing the Cirrus `SqliteOAuthStorage`), purge by `sub`, and per-address budgets keyed by HMAC (no raw IPs). |
| OAuth | `src/host/oauth.ts` | Wraps `@getcirrus/oauth-provider` 0.6.0 without forking it. Adds the account step: the account comes from the client's `login_hint` (read from the stored pushed request) or from a signed ten-minute cookie bound to that request, set on the selector page. Indonesian consent and selector pages; the provider's own English page is not shown. Accounts used on the device are remembered in a signed cookie and listed on the selector. The token endpoint refuses and revokes grants for accounts that are no longer active. |
| Sessions | `src/host/session.ts` | Legacy `createSession` tokens with a per-account HS256 secret derived from the KEK, verified at the edge without waking an object. Each token carries the account's session epoch; deactivation, deletion and takedown bump it. |
| PLC | `src/host/plc.ts` | Genesis operation, signing, DID derivation (checked against a public genesis operation from plc.directory), and `registerGenesis`, which reads `log/last` before posting and reads again after any unclear outcome. It never posts a second time on an unknown result. |
| Lifecycle | `src/host/service.ts` | Sign-up saga (claim → provision → record DID → PLC → active), resumable with the same invite, name and password; deactivate, reactivate, delete (directory `deleting` → purge hub, object and blobs → `deleted`, name kept). |
| Pages | `src/host/pages.ts` | `/akun/baru` sign-up form and the OAuth pages. No scripts, strict CSP, `frame-ancestors 'none'`. |
| ETNOS side | `src/oauth.ts`, `src/worker.ts` | Optional `accountHost` (`ETNOS_ACCOUNT_HOST`). `/auth/options` returns it; `/auth/start` in sign-up mode accepts `provider: "host"` (authorise at the configured host, which shows the selector) or `handle` (enrol an existing account with an ETNOS invitation). The host is never taken from request input and must be in `allowedHosts`. |
| Tools | `scripts/measure-host.mjs`, `scripts/host-escrow-key.mjs`, `wrangler.host.example.jsonc` | Local timing; offline escrow key generation; deployment template with D1. |
| Ports | `src/host/ports.ts`, `src/host/directory-do.ts` | The directory depends on a small `SqlDatabase` port. D1 satisfies it; `DirectoryDurableObject` is the same schema in one SQLite Durable Object (used on workers.dev and on plain workerd). |
| Deployed config | `wrangler.host.jsonc` | workers.dev, directory in a Durable Object, no D1 or R2, `PLC_WRITES "off"` (sign-up closed, no escrow key needed), spaces on. |
| Spaces | `src/host/spaces.ts` | AT Protocol spaces (alpha) for many accounts; §9. |
| Self-hosting | `scripts/selfhost-config.mjs` | Writes a workerd configuration for the same bundle with Durable Objects on local disk; §10. |

What ETNOS reads after sign-in (checked in `src/oauth.ts`): only the OAuth session's DID and the handle from identity resolution (handle → DID through `bsky.social`'s resolver, DID → document through plc.directory). No profile record. So the host must answer the well-known handle file, OAuth, and the PLC document must list the workers.dev service host and `at://<name>.etnos.space`. All three are covered.

Not built yet (plan phases 5–7): passkeys and recovery links, outbound migration (`signPlcOperation` returns 501), member-held rotation key, nightly CAR backup to R2, firehose hub and relay crawling, blob quotas, email. `getRepo` (CAR export) works, so a member can download their repository.

## 2. Tests

All in `packages/pds/test/`, run by `npm test` in that package (workerd through Miniflare; the official ETNOS OAuth client from `src/oauth.ts`; every network edge intercepted).

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

**Live CPU on Cloudflare (19 November, GraphQL Analytics over the first day).** The edge Worker used p50 2.5 ms, p90 4.3 ms and p99 14.4 ms of CPU across 64 requests. The account objects used 567 ms of CPU for about 26 password checks (sign-ins and the first account), which is **about 21 ms per sign-in, over the 10 ms Free figure**. Cloudflare recorded no exceeded-CPU errors. The directory and OAuth objects used under 1 ms per request. The workflow prints these figures on every deploy (step "CPU over the last day"). Passkeys or Workers Paid remain the fix for sign-in.

## 4. Licence checks (19 November)

- **Cirrus** (`ascorbic/cirrus`): `packages/pds/package.json` on `main` declares `"license": "MIT"`; no LICENSE file was found at the repository root or package root on `main` today (raw requests returned 404). The fork's grant and notice are kept in `packages/pds/LICENSE.cirrus`. New code in `src/host/` is ETNOS's (AGPL-3.0-only); it reuses Cirrus files (account object, OAuth storage, repository handlers) by import, with the one change recorded in `UPSTREAM.md`.
- **rust-pds-cloudflare** (`Spirallex/rust-pds-cloudflare`): LICENSE says "PolyForm Noncommercial License 1.0.0" and `Cargo.toml` says `license = "PolyForm-Noncommercial-1.0.0"`. Nothing was copied and its code was not read; only the licence file and `Cargo.toml` were fetched. It stays out of this repository.
- `@getcirrus/oauth-provider` 0.6.0 (MIT) is wrapped as a dependency, not copied.

## 5. Deviations from the plan, and why

- **Account objects are addressed by a random account id, not by DID.** The DID only exists after the keys are generated, and keys are generated inside the object. The directory maps DID to account id; every route reads the directory first, so this costs one D1 read per request and gives the "never wake an object for an unknown DID" property for free.
- **Passwords, not passkeys first.** Passkeys need the browser flow and an account step before options are issued; they are the next piece. Passwords are hashed inside the object with PBKDF2 and throttled per account and per address.
- **Session revocation by epoch instead of `tokens_valid_after` timestamps**, so a session issued in the same second as a revocation is not ambiguous.
- **Handle routing**: the template routes only `*.etnos.space/.well-known/atproto-did` to the Worker (a path-scoped wildcard route), so other subdomains never reach it. The pass-through switch remains for a whole-host route if the spike shows the path route does not work.

## 6. What the owner approved, and what is left

The owner approved the go-live for a test with 5 to 20 people on 19 November. The decisions are these:

- **The PDS keeps its workers.dev name**, `etnos-identity-host.giyaibo.workers.dev`, and no second domain is bought. `workers.dev` is on the Public Suffix List, so the PDS is a separate site from `etnos.space`, which meets Bluesky's production guidance (§12). Changing the PDS host name later means migrating each account, so this name is meant to last. `pds.etnos.space` and `papua.etnos.space` are not used as the PDS host.
- **Handles stay `nama.etnos.space`.** `HANDLE_DOMAIN` is `etnos.space`, and the route `*.etnos.space/.well-known/atproto-did` sends handle checks to the identity host.
- **Sign-up is by invite code only.** `/health` (`signup: "invite"` and `signupNote`), `describeServer` (`inviteCodeRequired: true`) and the home page of the host say so.
- **The escrow key, PLC writes, one test DID, `ETNOS_ACCOUNT_HOST` and the knowledge-model decisions are approved.**
- **Blobs are stored in the R2 bucket `etnos-identity-blobs`.** They are served with `content-security-policy: default-src 'none'; sandbox`, `x-content-type-options: nosniff`, and `content-disposition: attachment` for everything except plain images, video and audio. Only a plain CID is accepted, so a crafted CID cannot reach staged uploads or private space blobs (`test/host-blobs.test.mjs`).

What was done, in order:

1. **The escrow key was made** with `scripts/host-escrow-key.mjs`. Its public half, `did:key:zQ3shvuJC9x23TnbYs5YtPci6fDyxUj3rHm2gsZhpHP3Za1wP`, is in `wrangler.host.jsonc` as `ESCROW_ROTATION_KEY`. The private half was handed to the owner outside the repository and must be stored offline.
2. **The KEK is never replaced by the workflow.** The workflow makes a KEK only on the very first deploy, when the Worker has neither the KEK nor the operator token. If the operator token exists without a KEK, the step stops, because that means that the KEK was removed by hand. A lost KEK loses the wrapped account keys, but the escrow key can still rotate each DID to a new key.
3. **PLC writes are on** (`PLC_WRITES: "public-directory-approved"` in `wrangler.host.jsonc`).
4. **The test account `uji-1.etnos.space` exists** as `did:plc:5ldynkk4iomg45uu37nmgdhy`. plc.directory serves its DID document with the handle and the workers.dev endpoint, and `resolveHandle` on the host answers with the DID. Sign-in works (§3 has the CPU figures).
5. **ETNOS points at the host.** The deploy workflow sets `STRATA_ACCOUNT_HOST` (read as `ETNOS_ACCOUNT_HOST`) to the workers.dev origin unless a repository variable overrides it, and adds the host to `STRATA_OAUTH_HOSTS`.
6. **Five invite codes for the owner** were made with the operator token and handed over outside the repository. They last 30 days.

The public values are in `wrangler.host.jsonc` rather than in repository variables, because this session cannot write repository variables. That file is now the one place to read them. The operator token is accepted either as the `OPERATOR_TOKEN` secret or as any token whose SHA-256 equals `OPERATOR_TOKEN_SHA256`. Publishing the hash of a 256-bit random token is safe, and it lets the operator act without a secrets channel.

What is left:

1. **The wildcard DNS record must be added by the owner.** The deploy token can create Worker routes but cannot read or edit DNS (Cloudflare answers "Authentication error", code 10000). In the Cloudflare dashboard, open the zone etnos.space, then DNS, Records, Add record, with type `AAAA`, name `*`, IPv6 address `100::`, proxied, and TTL Auto. Another way is to give the token the permission Zone, DNS, Edit; the next deploy then adds the record only if it is missing. Until then, `uji-1.etnos.space` does not resolve, and Bluesky shows the handle as invalid.
2. **Real members are not invited before passkeys, recovery and backups exist** (plan phases 5–6). The test group knows that this is a trial.
3. **The open questions in plan §9 remain**: Workers Paid or not, who may issue invites and takedowns, whether deleted names are held for ever, and whether deletion should also tombstone the DID at PLC.

## 7. What the interface should show (for the web app)

- On the sign-in page, when `/auth/options` returns `accountHost`: a button "Buat akun ETNOS" that links to `<accountHost>/akun/baru` (with `?kode=` when the person has a host invite), and a sign-up button that posts `/auth/start` with `{mode: "signup", invitation, provider: "host"}`.
- After sign-up on the host, the "Masuk ke ETNOS" button goes to `SIGNIN_URL?handle=<name>.etnos.space`; the login page can prefill the handle from that parameter.
- In Studio, for stewards: an "Undang anggota" action that calls the host's `/admin/invites` through the ETNOS server (needs the operator token as an ETNOS secret; not built, because it would put a host credential in the ETNOS worker and should be decided with the owner).
- For spaces (§9), when the community UI wants them: a steward action "Buat ruang AT" on a private community that calls `com.atproto.space.createSpace` with a `com.atproto.memberspace.policy` for the lembaga's account, and member changes that call `com.atproto.memberspace.putMembers` and `removeMembers` together with the ETNOS membership change. The UI should say plainly that the operator can read space data (access control, not encryption) and that spaces are in trial.

## 8. Live deployment (19 November)

- Worker `etnos-identity-host` on `https://etnos-identity-host.giyaibo.workers.dev`, deployed by the `identity-host` job after the ETNOS job in `deploy-etnos.yml`. A failure there does not hold back ETNOS.
- Bindings: `ACCOUNT`, `AUTH_HUB`, `DIRECTORY_DO`, `SPACES`, `SPACES_INDEX` (all SQLite Durable Objects, available on the Free plan), and the R2 bucket `etnos-identity-blobs` as `BLOBS`.
- Since 2026-11-19o, PLC writes are on and sign-up is by invite code only (§6).
- Secrets: `ACCOUNT_KEK_V1` (set once, never replaced by the workflow), `OPERATOR_TOKEN` (from the repository secret `STRATA_PDS_OPERATOR_TOKEN` when set, otherwise random once).
- Public settings live in `wrangler.host.jsonc`. The repository variables `STRATA_PDS_HOSTNAME` and `STRATA_ACCOUNT_HOST` still override the host name and the ETNOS link.
- Bundle: 3.5 MiB raw, 690 KiB gzip with spaces (Free limit 3 MiB gzip).

## 9. AT Protocol spaces on this host *(alpha; rebuilt 19 November to the current proposal text)*

This host follows proposal 0016 ([permissioned data](https://github.com/bluesky-social/proposals/blob/main/0016-permissioned-data/README.md)) as it reads on 19 November 2026. The proposal says that details are likely to change, and the official implementation is still a work in progress ([atproto PR 5187](https://github.com/bluesky-social/atproto/pull/5187)). Spaces give access control, not encryption: the operator of this host can read space data. The design follows `docs/plan/communities-spaces-2026-11-19.md` §3–4.1.

**Protocol code comes from the official package.** `src/host/spaces.ts` uses `@atproto/space` `0.0.0-spaces-alpha-20261117141222` (MIT), which is newer than the 2026-10-29 snapshot of the `labs/spaces` trial. From it come credentials and delegation tokens, the RFC 9421 credential signature, the HPKE secret for MACs, LtHash commits and STAR archives. The request handling and storage were written here for Workers and Durable Objects. The official alpha PDS (`@atproto/pds`, MIT) served as the reference for behaviour, and no code was copied from it. The engine `@getcirrus/spaces` stays only in the single-account Cirrus worker (`src/upstream/`), pinned to the August alpha under the alias `@atproto/space-legacy`, because its protocol is out of date.

**One object per account holds both roles.** As a repo host, it holds the account's space repos: records in DRISL, the LtHash state, the commit `rev` and an operation log. It also holds the credentials that authorities have revoked. As a space host, it holds the spaces that the account is the authority of: the policy, the member list, the writer set, and each issued credential with the user it was issued for.

What a reader and a writer see:

- **A reader gets a credential the official way.** The reader's PDS issues a delegation token (`getDelegationToken`, 60 seconds, single use, signed inside the account object). The space host issues a credential (`authorizeSpaceSync`) bound to the reader's P-256 key in `cnf.kid`, valid for 10 minutes. Requests carry `Authorization: Atproto-Space-Credential …`, `Atproto-Space-Audience` and an HTTP Message Signature over both.
- **Reads carry MACs.** `getRecord`, `getLatestCommit`, `getRepo` (a STAR archive) and `listRepoOps` answer a credential read only with the MAC that it asked for in `Accept-Signature`. The MAC uses the account's `#atproto_kem` P-256 key, which is wrapped with the KEK and never leaves the account object.
- **New accounts publish `#atproto_kem` at genesis.** Older accounts get it through a PLC update that the operator sends with `POST /admin/accounts/kem` (signed by the host rotation key). `uji-1` needs this once after this deploy.
- **Writes are attributed to the session's own account.** `createRecord`, `putRecord`, `deleteRecord`, `applyWrites` and `clearRecords` are accepted only for the session's own account. Each write announces the new `repoRev` and `data` to the space host. A space host on this host gets the announcement directly. A space host on another PDS gets `notifyRepoUpdate` with service auth, retried 4 times.
- **The baseline policies are `com.atproto.personalspace.policy` and `com.atproto.memberspace.policy`.** Members are managed with `putMembers`, `removeMembers` and `listMembers`. A refused reader gets `SpaceNotFound`, as the reference PDS answers, so that the space's existence is not revealed.

**Removal takes effect at once, in two ways.** First, every credential read on this host for a space whose authority is also on this host is checked against the space's current policy, so a removed member is refused on the next request (`CredentialRevoked`). Second, when members are removed, when access changes, or when a space is deleted, the authority looks up the unexpired credentials that it issued to those users. It then sends `com.atproto.space.notifyCredentialsRevoked` for them to every writer's repo host, here directly and elsewhere with service auth. A repo host on this host keeps each revocation for 61 minutes, which is longer than any credential can live, and refuses those credentials. Revocations from an authority on another PDS are accepted only when that authority signs them and only for accounts hosted here.

**Modes.**

| Mode | Authority | Space host | Members' records | Status |
| --- | --- | --- | --- | --- |
| Host-managed | the lembaga's account on this host | this host | each member's own PDS (this host for hosted members) | built, tested |
| Own PDS | the lembaga's account on its own PDS (Aksara node, mini PC, own Cloudflare) | that PDS | each member's own PDS | members on this host write, announce and serve reads; revocations from that PDS are honoured; tested against an outside authority |

**Tests** are in `test/host-spaces.test.mjs` and check results with the official helpers (`verifyRecord`, `verifyCommitMac`, `verifyRepoStarFull`):

- The lembaga creates a memberspace, and a member cannot manage members.
- Ana writes into her space repo, and Budi's session cannot write there.
- The record is absent from Ana's public repository.
- Ana's write appears in `listWriters`.
- Budi reads with a credential, and the MAC verifies. The record, commit and STAR archive verify too.
- A delegation token cannot be used twice.
- A read without a MAC request, with another key or with the wrong audience is refused.
- A non-member gets `SpaceNotFound`.
- **After `removeMembers`, Budi's existing credential is refused on the next read**, and a new one is refused.
- A public-read space issues a credential without a delegation token, and that credential does not open the members-only space.
- Deleting the space revokes outstanding credentials and answers `SpaceDeleted`.
- After Ana deletes her account, her space repos are gone.
- With an authority on another PDS, Ana's write is announced with `notifyRepoUpdate`, a credential that the authority signed works, and a forged one fails. `notifyCredentialsRevoked` from the authority then stops that credential, while a revocation for an account not hosted here is refused.
- The `#atproto_kem` PLC update path works.

**Live check on 19 November (deploy 2026-11-19r)** passed with the test account `uji-1`. First, `POST /admin/accounts/kem` published its `#atproto_kem` key on plc.directory. Then `uji-1` created a personalspace, wrote a record, got a delegation token and a credential, and read the record with a MAC. The MAC was verified with the official `verifyRecord`. The record was absent from the public `listRecords`, and the space was deleted afterwards. The script is `node spaces-smoke.mjs`, run from `packages/pds`; it is kept outside the repository, because it reads the test password.

**Where this host differs from the proposal and the reference PDS:**

- Blobs in spaces (`getBlob`, `listBlobs`) are not built and answer 501. Public blobs work (§6).
- Account migration of spaces (`importRepo`, `exportSpaceMeta`, `importSpaceMeta`) is not built and answers 501.
- `managedspace.policy`, `memberspace` `allowedApps` (client attestation) and `publishPolicy` / `publishMembers` are refused with `UnsupportedPolicy`.
- Notification registration (`notify` in `authorizeSpaceSync`, `confirmRegistration`, `notifySpaceUpdate`) is accepted but not acted on, so syncers must poll `listWriters`.
- OAuth sessions must be full access (`transition:generic`). Narrow `space:` scopes are not checked yet, and password sessions count as full access.
- `notifyRepoUpdate` and `notifyCredentialsRevoked` to other PDSes are retried 4 times within one request's lifetime, not persisted for 72 hours.
- Service-auth `jti` values are not stored. Replays within the 60-second token life are possible but harmless, because both methods are idempotent.
- `SPACES_REMOTE_CREDENTIAL_MAX_AGE` is now off by default. Revocation from a remote authority arrives through `notifyCredentialsRevoked`. Setting the variable still caps how old a remote credential may be.

ETNOS's private communities stay the store of record. Mirroring a community into a space is behind the design doc's per-community flag and is not wired into the ETNOS app.

## 10. Self-hosting: one codebase, plain workerd *(recommendation confirmed; Docker is a plan)*

The owner's recommendation holds, with one change from the original plan: the directory no longer needs D1.

- `packages/pds` is its own package with its own entry (`src/host/worker.ts`) and configs. It imports no ETNOS app code; ETNOS talks to it only over XRPC and OAuth (the OAuth test uses ETNOS's client as an outside client).
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

**The PDS needs its own site, separate from the app.** Bluesky's production guide says that an app and a PDS must not share a domain, because blobs from the PDS would be served from the same site as its password and OAuth pages ([atproto.com/guides/going-to-production](https://atproto.com/guides/going-to-production)). Its example rules out `pds.greensky.app` and suggests `greensky-pds.net`. The owner decided on 19 November to keep the PDS on `etnos-identity-host.giyaibo.workers.dev`. `workers.dev` is on the Public Suffix List, so every name under it is its own site, separate from `etnos.space`. That meets the guidance without buying a domain. Changing a PDS host name later means migrating each account one by one, so the workers.dev name is meant to stay. Handles can still be `nama.etnos.space`, because a handle domain and a PDS host are independent: Bluesky handles end in `bsky.social` while the accounts live on `*.host.bsky.network`.

**Handles under `etnos.space` can be offered to accounts on any PDS.** A handle only needs `etnos.space` to answer `/.well-known/atproto-did` for that name. ETNOS could therefore give a member on their own PDS, or on a lembaga's machine, a name such as `nama.etnos.space`. A lembaga can do the same on its own domain. This separates the name that people see from the place where the data is stored, and it lets people move hosts without losing their name.

**Public participation should stay open to any AT Protocol account; private spaces can limit hosts.** Signing in with an account from any PDS is the main value of the network, and AGENTS.md already says that an AT identity never grants community membership. Membership stays an ETNOS decision. Private spaces are different, because each member's private records are stored on that member's own PDS. A lembaga that wants its records to stay on hosts it trusts should be able to set a list of allowed hosts for a space: the ETNOS host, its own Aksara Node, or both. ETNOS would check the `atproto_pds` entry in the member's DID document when they join and again when it reads. This is a proposal and is not built.

Recommended order for the 5 to 20 person test:
1. Keep the PDS on its workers.dev name (owner decision, 19 November).
2. Keep handles as `nama.etnos.space` through the well-known route, once the wildcard DNS record exists (§6).
3. Create one throwaway DID, then read sign-in CPU from Workers Logs and decide between passkeys and Workers Paid.
4. Invite 5 to 20 test members with invite codes, after recovery and backups are in place.
5. Add the per-space list of allowed hosts when the first private space is mirrored.
