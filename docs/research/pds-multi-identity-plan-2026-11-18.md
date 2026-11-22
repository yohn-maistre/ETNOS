# Multi-identity account host on Workers Free: design and build plan

18 November 2026 · research and plan for task 24. Nothing was deployed, no identity was created, no code outside this file was changed. Cites `packages/pds` at the current checkout (line numbers refer to it today).

Evidence tags used below: **[V]** verified today against a primary source or by reading the code; **[M]** measured today on this machine; **[A]** assumption or estimate; **[U]** not verified and needs a test.

Builds on `docs/research/serverless-pds-and-auth-2026-11-17.md` (the earlier research) and `docs/research/free-tier-measurement-2026-11-17.md` (how ETNOS itself uses the Free budget). It does not repeat their market survey. It replaces one claim in `docs/plan/showcase-plan-2026-11-17.md` section 4: that an identity-first host "is a smaller job". It is smaller than a full PDS, but the OAuth and key-custody parts are not small (see section 6).

**Update 19 November:** phases 1 to 3 and most of phase 4 are built and tested locally; see [pds-multi-identity-build-2026-11-19.md](pds-multi-identity-build-2026-11-19.md) for what exists, the tests, the measurements (password check about 15 ms inside the account object, so the Free CPU question still needs the spike) and the owner's ordered approval steps.

## Summary

1. The fork is built around one identity per deployment. Seven per-deployment values (`DID`, `HANDLE`, `SIGNING_KEY`, `SIGNING_KEY_PUBLIC`, `PASSWORD_HASH`, `JWT_SECRET`, `AUTH_TOKEN`) are read in 116 places across 10 files **[V]**. The good news: the repo engine already takes `did` and `signingKey` as constructor options (`repo/engine.ts:26-34`), so the engine, storage and sequencer can stay as they are.
2. Recommended layout: one SQLite Durable Object per account, addressed by DID (`idFromName(did)`); a D1 directory for handle to DID, invites and status; one auth-hub Durable Object for OAuth state; a firehose-hub Durable Object only when public publishing is switched on. R2 keeps per-DID prefixes, as the fork already does.
3. Keys: a random signing key and a host rotation key per account, born in code (not in a secret), stored encrypted in the account's own SQLite with a key derived from one Workers secret (the KEK). One ETNOS escrow rotation key is held offline. Members can optionally add their own rotation key at top priority. Nobody can export the signing key; leaving uses standard PLC migration.
4. Handles: serve `/.well-known/atproto-did` from a wildcard route for `*.etnos.space`, answered from D1. No DNS write credentials are needed. Caveat: a wildcard route also catches every other subdomain, so the Worker must pass those through.
5. Free tier: for identity-only use (publishing off), 30 or 300 accounts use a few percent of every daily allowance **[A]**. Storage and R2 only become a concern with public publishing at 300 accounts. **The one thing that may not fit Free is CPU**: bcrypt (91 ms **[M]**) cannot run in a Free Worker, and whether Free enforces 10 ms on Durable Object invocations is contradicted by Cloudflare's own pages (section 3). A full commit path measured 10.6 ms median locally **[M]**.
6. Riskiest unknown: DO CPU enforcement on Free. A one-day spike (section 8) settles it and also tests wildcard routing and handle resolution through bsky.social.
7. Effort: about 14 to 15 focused days to a demonstrable happy path, about 20 to a version we would trust with a real member, about 27 with public publishing. Today is day 0 of a 27-day run to the 15 December freeze. A demo with throwaway or steward-test identities on 18 to 19 December is realistic if the work starts about 22 November and nothing else competes; real members' identities should stay on the official-PDS track.

## 0. Against the earlier decisions

Checked after writing, against `decisions/decision-004-at-account-hosting.md`, `decisions/decision-005-node-account-data-planes.md`, `accounts-and-hosting/pds-hosting.md` and `plan/showcase-plan-2026-11-17.md` §4.

- **Consistent.** This is Track 2 of showcase §4 (one Durable Object per account, hashing and signing inside the object, throwaway identities first) and the "multi-tenant Worker PDS fork" row of Decision 004, not the rejected one-Worker-per-person fleet. Real members stay on Track 1, the official PDS on a small server. Decision 004's registration contract (separately checked forum and PDS invitations, reconcile an uncertain createAccount instead of repeating it, verify handle to DID to PDS before binding, fresh OAuth consent) is what section 4 follows. Decision 005's rule against a multi-tenant fork "by changing a hostname" holds: the routing, keys and OAuth are rebuilt per account.
- **In tension.** Decision 005 says an institution should not own every member's identity or hold the sole recovery key. In section 2.3 the member's own rotation key is optional and under "Advanced", so for most members ETNOS (host key plus escrow) would be the only recovery path. Before a real member is hosted, either the member key becomes the default at sign-up, or the owner accepts and states this custody plainly. Open question 3 in section 9 is where it is decided.
- **Updated.** Showcase §4 estimated 8–10 days to a happy path and 15–19 to something trusted. This plan's figures (about 14.5 and 20.5) are larger because OAuth needs an account step and keys need custody, both counted here.

## 1. What assumes a single identity today

Counts come from a grep of `env.(DID|HANDLE|SIGNING_KEY|SIGNING_KEY_PUBLIC|PASSWORD_HASH|AUTH_TOKEN|JWT_SECRET)` in `src/upstream/`: index.ts 18, xrpc/server.ts 27, xrpc/repo.ts 16, spaces.ts 16, xrpc/identity.ts 13, xrpc/sync.ts 7, oauth.ts 6, middleware/auth.ts 6, account-do.ts 4, xrpc-proxy.ts 3 (total 116) **[V]**.

| Area | Where | What it assumes | Change needed |
| --- | --- | --- | --- |
| Config | `types.ts:42-97` | `PDSEnv` carries one `DID`, `HANDLE`, `AUTH_TOKEN`, `SIGNING_KEY`, `SIGNING_KEY_PUBLIC`, `JWT_SECRET`, `PASSWORD_HASH`, `EMAIL` | Reduce to host-level values: `PDS_HOSTNAME`, `HANDLE_DOMAIN`, KEK, operator token, escrow public key, bindings |
| Startup | `index.ts:40-63` | Module load throws if any identity var is missing; validates one DID and handle | Remove; validate host config only |
| Startup | `account-do.ts:36-46` | DO constructor throws without `SIGNING_KEY` or `DID` | Read identity from the DO's own storage |
| One global DO | `index.ts:95-111` (`idFromName("account")` at 105; EU jurisdiction branch at 99-102) | Every request goes to one object | `idFromName(did)`; location hint per account at creation |
| Engine and key | `account-do.ts:111-118`, `repo/engine.ts:133,140,954,961-965` | `did` and `signingKey` strings from env; import rejects a CAR for another DID | Pass values loaded from DO storage. Keep the DID-mismatch check |
| Signing key elsewhere | `index.ts:72-78` (service-auth keypair), `middleware/auth.ts:193-198`, `xrpc/server.ts:446`, `xrpc/identity.ts:83,216`, `spaces.ts:49-51,157` | Single env key signs service JWTs and PLC operations | Fetch key operations through the account DO; never return key bytes |
| Signing key is also the PLC rotation key | `xrpc/identity.ts:83-85` (`rotationKeys: [signingKey]`), `:216` | One key does both jobs | Separate keys; see section 2.3 |
| Repo storage | `repo/storage.ts:32-90` (`repo_state id=1`, `blocks`, `firehose_events`...) | One repo per SQLite database | Fine as is, because each account gets its own DO |
| DID document | `index.ts:114-116`, `xrpc/identity.ts:32-69`, `xrpc/repo.ts:157-168` | Built from env; served for the one host | did:plc accounts do not serve their own document; the PLC directory does. Keep `did.json` only for the service `did:web:pds.etnos.space` |
| Handle resolution | `index.ts:119-123` (`/.well-known/atproto-did` returns `env.DID` for any Host), `:288-294` (resolveHandle compares to `env.HANDLE`), `xrpc/server.ts:76` | One handle | D1 lookup by Host label |
| Host check | `worker.ts:27` | Rejects any origin other than `PDS_HOSTNAME`, which would reject every handle host | Allow handle hosts for the well-known path only |
| `describeServer` | `xrpc/server.ts:41-47` | Returns `did: c.env.DID` (the account) and `inviteCodeRequired: false` | Return the service DID `did:web:pds.etnos.space`, `availableUserDomains: [".etnos.space"]`, `inviteCodeRequired: true`, `phoneVerificationRequired: false` |
| Ownership checks | `xrpc/repo.ts:144,204,262,303,387,435,505`, `xrpc/sync.ts:31,72,147,196,273,319,457`, `index.ts:234,242,250` | `repo !== c.env.DID` means "not found" | Compare to the DID that the request was routed to and authenticated as |
| `listRepos` | `xrpc/sync.ts:102-120` ("Single-user PDS - just return our one repo") | Returns one repo | Page through the directory |
| Sessions | `middleware/auth.ts:145-148` (static `AUTH_TOKEN` becomes `env.DID` with full trust), `:155-163`; `session.ts:22-57` (one HS256 secret); `xrpc/server.ts:76,110,123-136` | One password hash, one JWT secret, one operator token that doubles as a user token | Remove the static-token path. Per-account JWT secret derived from the KEK. Passkey first |
| Password hashing | `session.ts:2`, `oauth.ts:140`, `xrpc/server.ts:110` | `bcryptjs.compare`, run in the Worker, 91 ms **[M]** | Drop, or run inside the DO; see section 3 |
| OAuth provider | `oauth.ts:125-175` | `verifyUser(password)` takes a password only and returns `env.DID`; `@getcirrus/oauth-provider@0.6.0` has no identifier field in its login form and its `verifyUser` signature has no identifier argument **[V]**, read from the published package's `dist/index.d.ts:447`; `getAccountDO` is a module-level variable (`oauth.ts:178,196`) | Account selection step; shared OAuth storage; see 2.2 |
| OAuth storage | `oauth-storage.ts:43-110` in each account DO | PAR, codes, tokens keyed by random strings with no account hint | Move to one auth-hub DO so a token or code can be found without knowing the account |
| OAuth userinfo | `oauth.ts:302` | `preferred_username: c.env.HANDLE` | Look up by `sub` |
| Auth throttle | `worker.ts:47-70`, `account-do.ts:73-85` | Keys hashed with `env.JWT_SECRET`; global cap `total >= 300` per 10 minutes in one DO (`account-do.ts:81`) | Becomes a shared limiter. As written, one attacker rotating IPs can exhaust the global cap and lock everyone out. Needs a per-account cap and a smaller global cap |
| Passkeys | `index.ts:436-526`, `passkey.ts:116,178,268` | `rpID` is the PDS hostname; one DID | Fine for one host name. Per-account storage already exists (`account/store.ts:43-60`). Needs account selection before options are issued |
| Firehose | `account-do.ts:259-290`, `repo/sequencer.ts`, `repo/storage.ts:59-64` | Each DO has its own `seq` and its own hibernating WebSocket; `subscribeRepos` goes to the single DO (`index.ts:217-229`) | A relay needs one stream per host (section 2.6) |
| Relay poke | `relay.ts:30-75` | Isolate-global `nextCheckAt` and `nextPokeAt` timers; one DO's subscriber status | Host-level, once |
| Blobs | `repo/blobs.ts:18-24`, `xrpc/repo.ts:35,721`, `xrpc/sync.ts:341` | R2 keys are already `${did}/...` | Reuse. Add a per-account byte quota |
| Spaces | `spaces.ts:49,156,304,351,402,484,567` | A single `operatorDid` | Stays off. Not in scope |
| Dead proxy code | `xrpc-proxy.ts:231-241` | Reads `AUTH_TOKEN`, `DID` | Not mounted (`index.ts:578` returns 501). Delete in the fork |
| Daily alarm | `account-do.ts:125-129,150-158` | Each DO sets a 24-hour alarm | Per account this becomes one DO request and one row written per day each; acceptable, see section 3 |
| Planner and tests | `src/pds-hosting.ts:9,58-60,112,125-127`, `src/pds-cli.ts`, `test/pds-hosting.test.ts`, `packages/pds/README.md` | "accounts" is a fleet size; Cloudflare profile is one identity; signup is "closed" | Add a multi-account profile; keep the single-identity profile |

Things that need no change because the fork already did them right: per-DO serialised engine operations (`repo/engine.ts:61-67`), swap checks, transactional block/root updates, per-DID blob keys, host-level body limits (`worker.ts:83-118`).

Not present in the fork at all: did:plc creation (Cirrus assumes the DID already exists, `xrpc/identity.ts:135-143` returns a stub and the migration token comes from a CLI), an account directory, invites, account deletion, and a member-facing way to leave.

## 2. Target design

### 2.1 Layout and why

```
Browser / ETNOS / relay
        |
   Edge Worker  (stateless: host + path routing, body limits, JWT check, throttle)
     |        |          |               |
  D1 directory  AccountDO (one per DID)  AuthHubDO (one)   FirehoseHubDO (one, later)
  handle, DID,   repo, keys, passkeys,    PAR, codes,        host-wide seq, #commit frames,
  invites,       outbox, sessions         tokens, throttles  relay WebSocket
  status, head
                 R2: BLOBS/<did>/...
```

Alternatives considered:

- **One DO for all accounts.** Simple, but one 1 GB-class object holds everyone's keys, every commit queues behind every other (`repo/engine.ts:61` serialises per object), and an isolation bug has no structural backstop. Rejected.
- **A few shard DOs, many accounts each.** The engine and storage assume one repo per database (`repo_state id=1`, `repo/storage.ts:45-52`). Rewriting that is the largest possible change. Rejected.
- **D1 for repositories.** The engine uses synchronous `ctx.storage.sql` and `transactionSync`. D1 is async. A rewrite. Rejected.
- **One DO per account (chosen).** Physical isolation: a routing bug can reach the wrong object, but the object holds only its own data and can refuse. It matches the engine as written. Free allows unlimited objects; the 5 GB storage cap is account-wide **[V]** (DO limits page, read today). Cost: more cold starts, one daily alarm per account.

Directory in D1 rather than a DO: it has its own Free allowance (5M rows read, 100,000 written per day **[V]**, D1 pricing page, 18 Nov) separate from the DO allowance, gives atomic `UNIQUE(handle)` claims, and a handle lookup does not wake any account DO. D1 on Free is limited to 10 databases and 5 GB total **[V]**; we need one.

Auth hub as one DO: the OAuth provider stores PAR requests, authorisation codes and tokens under random strings. At `/oauth/token` or `verifyAccessToken` the request does not say which account it belongs to. A single shared store (reusing `SqliteOAuthStorage`, which only needs a `sql` handle, `oauth-storage.ts`) is the smallest change. Every row carries `sub` (the DID), and account deletion purges by `sub`. The cost is one extra DO request per OAuth-authenticated call. Legacy session JWTs do not need the hub (see 2.2).

### 2.2 Routing: how a request finds its account

| Request | Key used | Path |
| --- | --- | --- |
| `GET /xrpc/com.atproto.repo.{describeRepo,getRecord,listRecords}?repo=` | `repo`: DID, or handle resolved in D1 | `idFromName(did)` |
| `GET /xrpc/com.atproto.sync.*?did=` | `did` | `idFromName(did)`; `listRepos` from D1 |
| Repo writes | `sub` of the verified token | token check, then `idFromName(sub)`; the `repo` field must equal `sub` |
| `GET /xrpc/com.atproto.identity.resolveHandle?handle=` | handle | D1 only |
| `GET https://<name>.etnos.space/.well-known/atproto-did` | Host label | D1 only; 404 for unknown, deactivated or deleted |
| `/oauth/*` | session cookie set by the identify step; otherwise the identify step | auth hub, then account DO for passkey and consent |
| `describeServer`, `_health`, `did.json` | none | static |

Rules that make this safe:

1. **The routing key never decides authorisation.** The DID in the URL only selects which object to ask. Authorisation is the verified token subject, and the account DO checks `expectedDid === its own stored DID` on every RPC (defence in depth if routing is wrong).
2. **Verify before waking an object.** `idFromName(arbitrary string)` creates a new empty object, so an attacker could burn the 100,000 DO requests per day by sending made-up DIDs. For public reads, check the D1 row first. For tokens, verify the signature first.
3. **Per-account JWT secret derived, not stored**: `HKDF(KEK, salt=did, info="jwt/v1")`. The Worker can verify an access token (HMAC, native WebCrypto, expected well under 1 ms **[A]**) with no DO call and rejects forged `sub` values before touching a DO. Revocation: the account DO keeps `tokens_valid_after`, checked on writes (the write path already calls the DO). This replaces `session.ts:22-57` and `middleware/auth.ts:155-163`. The two-hour access-token window stays, as README already states.
4. **OAuth account selection.** The provider has no identifier field, and its PAR handler does not store `login_hint` (no occurrence in the package) **[V]**. Our wrapper adds an identify step at `/oauth/authorize`: ask for the handle (prefilled if ETNOS passes `login_hint`, which we read from the PAR body ourselves), set a short-lived signed `HttpOnly` cookie holding the DID, then build the provider for that DID per request, as `getProvider(env)` already does per request (`oauth.ts:125`). `verifyUser` and passkey callbacks then bind to that account. Usernameless passkeys (a credential-id to account map) can come later. ETNOS can pass the handle today because it starts from a typed handle or DID (`src/oauth.ts:229,249`). **[U]** whether the official client always sends `login_hint`; to be tested in the existing interop test (`test/oauth-interop.test.mjs`).
5. **Handle host vs service host.** `pds.etnos.space` serves XRPC and OAuth. `<name>.etnos.space` serves only `/.well-known/atproto-did` (and a plain page). Anything else on a handle host returns 404. `worker.ts:27` is replaced by this two-way split.
6. **Handle shape**: one label only, lowercase `[a-z0-9-]`, 3 to 20 characters, no leading or trailing hyphen, a reserved list (`www`, `pds`, `api`, `admin`, `mail`, `app`, `status`, `etnos`, `etnos`, `aksara`, the names of existing subdomains). One label matters because Cloudflare's Universal SSL covers first-level subdomains only (per the earlier research note) and handles are ASCII per the handle spec **[V]** (atproto.com/specs/handle).

### 2.3 Identity and keys

**did:plc creation** (does not exist in the fork; to write): generate keys; build `{type: "plc_operation", rotationKeys, verificationMethods: {atproto: <signing did:key>}, alsoKnownAs: ["at://name.etnos.space"], services: {atproto_pds: {type: "AtprotoPersonalDataServer", endpoint: "https://pds.etnos.space"}}, prev: null}`; sign with a rotation key (ECDSA SHA-256, low-S, base64url); the DID is `did:plc:` plus the first 24 base32 characters of SHA-256 of the DAG-CBOR of the signed operation; POST to `https://plc.directory/<did>`. 1 to 5 rotation keys in priority order, secp256k1 or P-256 only; operation at most 7,500 bytes; a higher-priority key can override a lower one for 72 hours **[V]** (web.plc.directory/spec/v0.1/did-plc, read today). The `@did-plc/lib` package (MIT per npm registry **[V]**) provides operation helpers; whether its API fits the Workers runtime is **[U]**. `signOperation` already exists locally (`xrpc/identity.ts:247`).

Rate limits on plc.directory are described as "generous" with no numbers **[V]**. Operations are public and permanent: every tested DID stays in the log. Use as few throwaway DIDs as possible.

**Keys**:

| Key | Type | Generated | Stored | Used for | Exportable |
| --- | --- | --- | --- | --- | --- |
| Account signing key | secp256k1 | in the creating DO or Worker, once | account DO SQLite, AES-256-GCM ciphertext | repo commits, service-auth JWTs | never; replaced on migration |
| Host rotation key | secp256k1, one per account | at creation | same, encrypted | routine PLC operations (handle change, outbound migration) | never |
| ETNOS escrow rotation key | secp256k1 or P-256, one for the host | offline by the owner | private part offline (password manager plus paper); only the public part is in config | emergency repointing or recovery | held by the owner |
| Member rotation key (optional) | P-256 | in the member's browser (WebCrypto supports ECDSA P-256 **[V]**, Cloudflare Web Crypto page; browsers do too) | the member | their own PLC operations; highest priority | held by the member |
| Per-account JWT secret | 32 bytes | derived from KEK, not stored | nowhere | session tokens | n/a |
| KEK | 32 random bytes | by the owner, once | Workers secret `ACCOUNT_KEK_V1`; offline paper copy | wraps the two per-account private keys | n/a |
| Operator token | random | by the owner | Workers secret | `/admin/*` only; cannot write to any repo | n/a |

Rotation key order in the DID: `[member key if present, ETNOS escrow, host key]`. A leaked host key can be overridden by escrow within 72 hours **[V]** (recovery window).

**Encryption at rest.** Per-account wrapping key `HKDF(KEK, salt=did, info="signing-key/v1")`, AES-256-GCM, random 12-byte nonce, associated data `did || purpose || kek_version`. Table `account_keys(purpose, kek_version, nonce, ciphertext)` in the account's own SQLite. KEK rotation: add `ACCOUNT_KEK_V2` and re-wrap lazily per account on next use; keep V1 until all rows are V2. What this protects against: a stolen DO dump or backup, a bug that returns a table, a log line. What it does not protect against: whoever controls the Cloudflare account and can deploy code that reads the secret. **This is a custodial host and must say so** (Tentang text, signup screen).

**Why not Workers secrets per account**: secrets are per Worker (64 per Worker on Free **[V]**, Workers limits page, 5 KB each). 300 accounts would need 600 secrets. Storing wrapped keys in the account's own storage, under one secret, is the standard answer.

**Who can export what**:

- The member: their repo as a CAR and their blobs, any time (public anyway). Their own rotation key never reaches us.
- A steward: invite, suspend, issue a recovery link, see the audit trail. No endpoint returns any private key or any wrapped blob. A steward cannot sign anything.
- The operator (owner): holds the KEK and the Cloudflare account. Technically able to decrypt. Mitigation is policy and audit, not cryptography.
- Nobody: the signing key. Migration does not need it, because the new host creates its own signing key and the DID document is updated with a PLC operation (account-migration guide **[V]**, atproto.com/guides/account-migration).

**Portability: how a member leaves.**

1. *Cooperative path* (standard atproto migration): the new host calls our `getServiceAuth`, `getRepo`, `listBlobs`/`getBlob`; our `requestPlcOperationSignature` and `signPlcOperation` use the host rotation key (today these are stubs, `xrpc/identity.ts:135-143`, and sign with the signing key, `:216`). The member confirms in an authenticated session; we replace the CLI migration-token with an in-session confirmation. Estimate: 2 days (section 7).
2. *Take your keys* (opt-in, advanced): the member's browser generates a P-256 key; we submit a PLC operation signed by the host key that adds the member key at index 0. After that the member can migrate or repoint without us, and the host's key can no longer override within the window. Cost: 1 day.
3. *Host gone or hostile*: the escrow key holder signs an operation repointing the DID at a new host, using a CAR backup. The repo is signed by the old signing key, which the new host does not have, so the new host imports the CAR and signs new commits with its own key. Public relays also hold copies **[V]** (migration guide). Works only if the escrow key and a CAR backup both exist.
4. *Leaving and deleting*: see the deletion flow in section 5.

**Backups** [U, to verify]: SQLite-backed Durable Objects have point-in-time recovery; we have not checked its retention or Free availability today. Independent of that, run a nightly alarm per account that writes `getRepo` CAR plus a directory dump to R2 (small, a few KB per account in the identity phase). KEK and escrow key backups are the owner's responsibility and are the single most important thing to record before any real person's account is created.

### 2.4 Handle verification for `*.etnos.space`

Options (handle spec **[V]**): HTTPS well-known at `https://<handle>/.well-known/atproto-did` (2xx, body is the DID, redirects allowed, HTTPS on 443), or DNS TXT at `_atproto.<handle>` with `did=<DID>`. DNS TXT wins if the two disagree, so never publish both with different values.

| | Well-known from the Worker | DNS TXT per account |
| --- | --- | --- |
| Credentials | None beyond the Worker | A Cloudflare API token with DNS edit on the zone, stored as a Worker secret (broad blast radius) |
| Worker requests per check | 1 each time someone verifies | 0 |
| Record limits | None (D1 row) | One record per account; the Free zone record limit is **[U]** (page read today states no limit) |
| Failure mode | Worker down or over quota, verification fails | Independent of the Worker |

Recommendation: well-known first (nothing to leak). Add TXT records later only if the request budget needs it; the earlier handle-portability note (`docs/accounts-and-hosting/handle-portability-2026-11-04.md`) already prefers operator-approved TXT for a tiny pilot, which still holds for the 5 to 10 founding accounts if the owner prefers it.

Wildcard routing, verified from Cloudflare docs today: all plans can proxy wildcard DNS records; a wildcard DNS record applies only where no exact record exists; wildcards are multi-level, so `a.b.etnos.space` also resolves; Worker routes accept `*.example.com/*`, the most specific route wins, a proxied DNS record must exist, and a route with no Worker attached can carve out exceptions **[V]**. Consequence that matters: **`*.etnos.space/*` sends every subdomain's traffic through our Worker, including subdomains that have their own records and origins.** Either (a) the Worker passes through anything that is not a registered handle (costs one subrequest and one Worker request each), or (b) every existing subdomain gets an exact route (no-Worker or its own Worker). Do (b) for known names and (a) as the safety net. This is the thing to test on a canary hostname first. Also mind scanner traffic: any random hostname reaches the Worker and counts against the 100,000 daily Worker requests; its volume is unknown **[U]**.

Handle resolution by others: bsky.social's resolver and AppView call our well-known; ETNOS resolves handles via `https://bsky.social` (`src/oauth.ts:143`) **[V]**. If that resolver caches a "not found" for a handle that was queried before the account existed, a just-created member may fail to sign in for a while **[U]**. Mitigation: ETNOS tries our own `resolveHandle` or the well-known directly for `*.etnos.space` handles, or signs in by DID right after creation. Test in the spike.

Reverse check: the DID document must list the handle in `alsoKnownAs`, so a handle is not valid until the PLC operation has landed.

### 2.5 Blobs

R2, key `${did}/${cid}` with staging at `${did}/staged/${cid}` (already in `repo/blobs.ts:18-24`). Do not store blobs in DO SQLite: they count toward the 5 GB account-wide DO storage and the size limit per row is 8 MB **[V]**.

R2 Free: 10 GB-month, 1M Class A, 10M Class B per month, egress free **[V]** (earlier note; same bucket allowance is shared with `westpapua-watch-archive`, per `docs/accounts-and-hosting/pds-hosting.md`). Policy:

- Identity phase: only profile avatar and banner, at most 1 MB each and 3 MB per account. 300 accounts cap at under 1 GB.
- Publishing phase: per-account quota enforced in the account DO from a `blob_bytes` counter (new). 25 MB at 30 accounts (0.75 GB). At 300 accounts, 25 MB is 7.5 GB, which will not coexist with the archive on 10 GB; use 10 MB or move to Paid R2.
- The fork's flow (`staged` upload, then copy on first reference) costs about three Class A operations per blob. Not a concern.

### 2.6 Relay, firehose, and how Bluesky crawls many repos

Facts **[V]**, atproto sync spec read today: `seq` is a per-stream value; a PDS firehose covers all accounts the host serves and relays merge many hosts; per-account events must be in order; `rev` must increase per repo; `since` and `prevData` let a consumer detect gaps; events for inactive accounts are to be ignored; at most 200 operations per commit.

So a multi-account host needs **one** `subscribeRepos` stream with one `seq`. The fork has one stream per account (`account-do.ts:259-290`). Design:

1. Each commit still writes its frame to the account DO's `firehose_events` table inside the commit transaction (this is already atomic, `repo/sequencer.ts`). That table becomes an **outbox** (AGENTS.md: commit business changes and outbox intent together).
2. After commit, the Worker (via `waitUntil`) or the account DO's alarm pushes unsent events, in order, to the firehose hub. The hub assigns the host `seq`, stores the frame, and broadcasts to hibernating WebSockets. The hub deduplicates on `(did, account_local_seq)`, so a retry after an uncertain outcome is safe (AGENTS.md: never blindly retry an uncertain outward action; here the remote action is idempotent by key, and delivery is confirmed by a hub acknowledgement).
3. `subscribeRepos` upgrades to the hub. `#identity` and `#account` events (deactivation, deletion, takedown) go through the same path.
4. `listRepos` reads from D1: the account DO updates `head` and `rev` in the directory after each commit (one D1 write per commit).
5. `requestCrawl` once for the host (`hostname: pds.etnos.space`), not per account (`relay.ts:30-75` is per deployment and keeps isolate-global timers).

New-host limits **[U]**: the Bluesky relay documentation lists 50 events/second, 1,500/hour and 10,000/day plus 5 new accounts per second for new PDS hosts, raisable on request (reported by a search result today; the page itself would not load, so the numbers are unconfirmed at the primary source). A 2024 post spoke of a 10-account cap per new host (atproto.com/blog/self-host-federation, read in the earlier note); whether that still applies is unknown. At 30 accounts posting a few times a day we are far below 1,500/hour. There were reports through January 2026 of new hosts not being picked up (github.com/bluesky-social/atproto/discussions/4258, earlier note). **Public publishing is out of the showcase scope** (ETNOS keeps posts in ETNOS; publishing is off), so this section is phase 7 and cuttable.

## 3. Free-tier budget

### 3.1 Limits used (read today unless noted)

| Item | Free | Source |
| --- | --- | --- |
| Worker requests | 100,000/day per account, 10 ms CPU per invocation, 50 subrequests, 128 MB, startup under 1 s | developers.cloudflare.com/workers/platform/limits/ |
| Worker bundle | 64 MiB uncompressed; the old 3 MB compressed cap was removed 4 Sep 2026 | changelog 2026-09-04. **[M]** our current bundle: 3.55 MB uncompressed (`wrangler deploy --dry-run`, run in a scratch copy) |
| DO requests | 100,000/day; 13,000 GB-s/day | .../durable-objects/platform/pricing/ |
| DO rows read / written | 5,000,000 / 100,000 per day | same |
| DO counting rules | each RPC session = 1 request (calls on a returned RpcTarget stay in the session); alarm invocations count; `setAlarm()` = 1 row written; 20 incoming WebSocket messages = 1 request; outgoing free | same |
| DO storage | 5 GB total on Free; per object the limits table says 10 GB but the FAQ says 1 GB (the page contradicts itself) | .../durable-objects/platform/limits/ |
| DO CPU | "30 seconds default, configurable up to 5 minutes", reset per request or message; the FAQ also says DOs "have the same per invocation CPU limits as any Workers do" | same, and .../durable-objects/reference/faq/ |
| D1 | 5M rows read, 100,000 written per day, 5 GB, 10 databases | .../d1/platform/pricing/ ; free-tier enforcement since 1 Sep 2026 per changelog |
| KV | 100,000 reads, 1,000 writes per day | not planned |
| R2 | 10 GB-month, 1M Class A, 10M Class B per month | earlier note |

ETNOS already uses the same account allowances: the measured heavy 30-person day uses 9.1% of DO requests, 39.8% of rows read and 1.5% of rows written (`docs/research/free-tier-measurement-2026-11-17.md`). If the identity host lives in the same Cloudflare account (it must, to route `*.etnos.space` from this zone), it shares those numbers. The Worker request count for ETNOS is close to its DO request count plus first loads (same document). Treat about 15% of Worker requests, 10% of DO requests, 40% of DO rows read as already spoken for on a heavy ETNOS day.

### 3.2 CPU, measured locally

Scratch copy of the package, `npm ci --ignore-scripts`, Miniflare/workerd, Node 22, this machine, warm, wall time around `dispatchFetch` (includes harness overhead; a rough upper bound for CPU, not Cloudflare's metering) **[M]**:

| Operation | Median | p90 |
| --- | --- | --- |
| `GET /health` (Worker only) | 2.5 ms | 3.6 ms |
| `describeServer` | 2.2 ms | 3.3 ms |
| `getRecord` (Worker + DO) | 3.1 ms | 3.9 ms |
| `createRecord` (token check, MST update, signature, sequencing; Worker + DO) | 10.6 ms | 14.4 ms |
| `createSession` with bcrypt cost 10 | 91.5 ms | 130.9 ms |
| first request to a fresh runtime (`/health`, `describeServer`, `listRepos`) | 35, 16, 66 ms | (single samples) |

Earlier measured (Node, noble, `serverless-pds-and-auth-2026-11-17.md`): secp256k1 sign 1.2 ms, verify 2.7 ms.

Reading:

- `createSession` runs bcrypt in the **Worker** (`xrpc/server.ts:110`), so it cannot fit 10 ms on Free. Drop passwords for the multi-account host (passkey first, steward-issued recovery link), or if a password is kept, hash inside the account DO.
- `createRecord` is 10.6 ms median for the whole path. How much of it lands in the Worker (10 ms limit) versus the DO (30 s documented) is not separable here. The DO FAQ sentence makes this a genuine unknown **[U]**; it is the spike's first question.
- Genesis creation (two key generations, one signature, SHA-256, CBOR) is a few milliseconds of pure JS **[A]**; do it in a DO to be safe.
- Passkey verification (`@simplewebauthn/server`, ES256 verify) is not measured **[U]**.
- Cold start: the bundle is 3.55 MB uncompressed. Whether module start-up CPU is billed to the first request is **[U]**.

### 3.3 Daily request and row budget

Assumptions **[A]**, stated so they can be changed: an active member signs in to ETNOS once a day (about 8 Worker requests and 20 DO requests including the throttle call and passkey steps; about 100 rows read and 30 written); each account is verified by other services about 10 times a day (one Worker request plus one D1 row each, no DO); scanner and bot traffic to the wildcard route 5,000 Worker requests a day (unmeasured, could be far higher); per account one daily alarm (1 DO request, 1 row written). "Publishing" adds, for half the accounts, 5 posts a day at 1 Worker request, 5 DO requests, 20 rows written, 40 rows read per post.

| | 30 accounts, identity only | 300 accounts, identity only | 300 accounts, publishing on |
| --- | --- | --- | --- |
| Worker requests/day | 540 + 5,000 noise = about 5.5k (5.5%) | 4,200 + 5,000 = about 9.2k (9%) | about 10k (10%) |
| DO requests/day | 600 + 30 alarms = about 630 (0.6%) | 3,000 + 300 = about 3.3k (3.3%) | about 7k (7%) |
| DO rows read/day | about 3k (0.1%) | about 15k (0.3%) | about 45k (0.9%) |
| DO rows written/day | about 1k (1%) | about 4.8k (4.8%) | about 20k (20%) |
| D1 rows read/day | about 1k | about 9k | about 10k |
| D1 rows written/day | about 30 (create, status) | about 300 | about 1k (head/rev per commit) |
| DO storage | under 10 MB | under 100 MB | about 1.4 GB per year of use **[A]**; a repo keeps old blocks and the outbox keeps 10,000 events (`repo/sequencer.ts:426`) |
| R2 | under 100 MB | under 1 GB | quota-bound, see 2.5 |

Add ETNOS's own heavy-day share (previous section) and every row still fits, with the highest combined figure being DO rows read at about 41%. So **identity-only fits Free at both sizes if the CPU question resolves favourably**. The plan's exposure is not the daily counts; it is:

1. **CPU** (above).
2. **Wildcard noise**: unmeasured, and it is the largest single Worker-request term. Watch it from day one (the usage page pattern in the ETNOS measurement doc applies).
3. **Shared allowance with ETNOS**: if ETNOS's heavy day grows (the measurement doc says reads reach 60% at about 75 people), a runaway scanner or a bug in the host can take ETNOS down with it, because limits are per account. This is the argument for Workers Paid ($5/month), which the open-work list already has as an open question; this host should be the reason to say yes.
4. **DO storage at 300 publishing accounts**: shares the 5 GB with ETNOS content.
5. **Relay caps** for publishing, if ever on.

What does not fit Free at all: bcrypt in a Worker; email to arbitrary recipients from Cloudflare Email Service (Paid; earlier note) so recovery cannot rely on email unless Resend's free tier is added (3,000 a month, 100 a day).

## 4. Account creation for a member without an account

Recommendation: **invite-only, steward-issued, single-use, bound to a reserved name.** No open registration. Reasons: DIDs are permanent public entries; Free quotas; the relay's new-host account-creation limit (above); and ETNOS already has the invite machinery (`src/oauth.ts:322`, enrollment invitations with hash-only storage and one redemption).

Flow:

1. A steward (existing role) opens "Undang anggota", enters the intended name (`giyaibo`) and optionally a community, and gets a link `https://etnos.space/gabung/<code>` to send by WhatsApp. Code: 128 bits, stored hashed, valid 7 days, one use; the name is reserved in D1 for the same period.
2. The member opens the link on a phone and sees, in Indonesian: the name they will have (`giyaibo.etnos.space`) with an availability check; two sentences on what an account is and that ETNOS hosts it for them and can be asked to release it; a checkbox "Saya berusia 16 tahun atau lebih" (attestation only); a button "Buat kunci dengan layar kunci HP" (passkey registration). Optional: email (clearly marked as optional and why). No phone number, no birth date, no password.
3. On submit: the Worker validates the invite, claims the handle in D1 (`pending`), the provisioning step creates keys and the genesis operation, submits to plc.directory, creates the account DO, marks the row `active`. If the PLC step has an uncertain outcome, **read `plc.directory/<did>/log/last` before any retry** rather than resubmitting (AGENTS.md). A saga row records each step so a crash resumes instead of repeating.
4. The browser continues straight into the OAuth consent for ETNOS (the signup doc already starts OAuth without a handle, `docs/accounts-and-hosting/signup-2026-11-04.md`), so after one confirm the member is signed in to ETNOS. ETNOS's own enrollment allowlist is a separate decision and is written by the invite redemption, not granted by owning a DID (AGENTS.md: AT identities do not grant community membership).
5. The member sees their handle on their ETNOS profile, a "Unduh cadangan" link, and under Advanced "Bawa kunci sendiri".
6. Lost phone or passkey: steward issues a recovery link bound to the DID; the member registers a new passkey. This makes the steward a recovery authority, which is a real trust cost for a custodial host. Every recovery writes an audit row the member sees at next sign-in. No email means no notification at the time of recovery; say so.

Minimum age and abuse (brief): Bluesky's terms say 13+ (from a secondary summary, earlier note **[U]**); Indonesia's 2026 under-16 rules in the earlier note name other platforms, not Bluesky, and no Bluesky-specific rule was found **[U]**. We collect only an attestation and rely on stewards inviting people they know; this is not age verification and the doc should not be read as legal advice. Abuse controls: single-use hashed invites, per-IP throttle on `/gabung`, reserved and confusable-looking names rejected (ASCII only makes homoglyph attacks moot but not lookalike words), steward review of the name, no DID created before redemption (keeps plc.directory clean), suspend and takedown actions that emit `#account` events.

## 5. Security: what must be tested

AGENTS.md requires tests for access isolation, withdrawal, concurrency/replay and durable publication wherever these boundaries change. All of the below belong in `packages/pds/test/` (workerd via Miniflare, as the existing tests are) unless marked ETNOS.

**Access isolation**

- A: A's token with `repo=B` on every write route returns 403/400 and B's repo is unchanged (one test per route; the 14 `repo !== c.env.DID` sites are the checklist).
- A's legacy and OAuth tokens on B's account RPC (direct stub call with the wrong `expectedDid`) are refused.
- Read endpoints given B's DID with A's Host header, A's handle host, `X-Forwarded-Host`, double-encoded or case-variant handles: always resolve to the correct account or 404.
- `getBlob(A.did, cidOfB)` is 404; R2 keys never cross prefixes; staged blobs are not served (existing behaviour, keep the test).
- `listRepos` lists only active accounts and never deactivated, deleted, pending or taken-down ones.
- OAuth: a code or refresh token minted for A cannot be redeemed against B's consent; a DPoP token replayed for another `sub`; PAR `request_uri` reuse; the identify cookie for A cannot be used to authorise B; cookie tampering.
- A forged JWT with an arbitrary `sub` does not create or wake any DO (count DO instantiations).
- Throttle: one IP cannot exhaust the cap for all accounts; one account's failures do not lock another.
- The static operator token cannot act as any user and `/admin/*` cannot write records.
- ETNOS side (root `test/`): an account that exists on the host but was not enrolled in ETNOS has no rights; removing enrollment does not delete the PDS account and vice versa.

**Keys never leak**

- Fixture with a sentinel signing-key value: scan every response body and header in a full scripted lifecycle (create, login, write, export, migrate-out, delete), all error paths, and captured `console.*` output, for the key's hex, base64, base64url, multibase, and `did:key` private forms. None may appear. Public `did:key` is allowed.
- A raw dump of the account's SQLite contains no plaintext key; decrypting requires the KEK; a wrong `kek_version` or modified associated data fails closed.
- KEK rotation: after V2 is added, old rows still decrypt, new rows use V2, and V1 can then be removed without data loss.
- No endpoint, admin included, returns `account_keys`.
- Logging policy (as ETNOS's route-shape-only logging): no bodies, tokens, handles in query strings, or DIDs paired with IPs.

**Withdrawal and deletion**

- Member deactivates: `#account` event (when the hub exists), handle returns 404 from well-known, repo reads return not found, writes refused, tokens stop working at the next check.
- Member deletes: account DO storage cleared (`deleteAll`), R2 prefix emptied, auth-hub rows for that `sub` purged, passkeys gone, directory row `deleted` with the handle held for 90 days (to stop re-registration by someone else and stale-cache impersonation), ETNOS notified to revoke its OAuth session. A new request for that DID does not resurrect the object.
- Outbound migration: after `signPlcOperation` with the host key, the host marks the account deactivated and its commits stop.
- Member adds their own rotation key: the host key can no longer override it; test with a mock PLC that enforces priority and the 72-hour window.
- Escrow path: with the host key "lost", the escrow key can repoint the DID (mock PLC).
- Export while a write is in flight: the CAR is a consistent snapshot (README lists streaming export during concurrent mutation as still unqualified; this host cannot claim withdrawal without it).

**Concurrency and replay**

- Two simultaneous `createRecord`/`applyWrites` on one account with `swapCommit`: exactly one wins (exists today; keep it).
- Two simultaneous commits on different accounts do not block or corrupt each other.
- Two simultaneous signups claiming the same handle or the same invite: exactly one succeeds (D1 uniqueness).
- Signup crash after each saga step: resume, no duplicate DID, no orphan handle.
- PLC outcome uncertain: the second attempt reads the log, does not re-POST blindly.
- Refresh-token rotation and logout replay (exists at `test/runtime.test.mjs:63-100`; port to per-account secrets).
- Hub delivery: duplicate push of the same `(did, local_seq)` yields one `seq`; out-of-order push is refused and re-requested; hub restart mid-batch resumes without a gap per account.

**Publication boundary**

- Nothing private can enter a public repo through this host: Spaces stays off (a test asserts the routes return 404/501), no endpoint accepts private data, staged uploads are never served.
- No public AT record is written for a member unless they or ETNOS acting under their OAuth grant wrote it (ETNOS's publishing switch stays off by default).
- `describeServer` states the host's policy truthfully (`inviteCodeRequired: true`).

The existing `test/pds-hosting.test.ts` must also change: its single-identity assertions (`accountsPerDeployment: 1`, "configures one identity only") become a new multi-account profile with the same honesty rules (no claim of qualification until the tests above pass).

## 6. Licence notes

- **Cirrus** (`ascorbic/cirrus`, 0.19.0): MIT, copyright "Matt Kane and Cirrus contributors" **[V]** (`packages/pds/LICENSE.cirrus`; npm registry says MIT today). Reuse is fine with the notice kept and provenance recorded in `UPSTREAM.md` for each file that still derives from it. Our additions are AGPL-3.0-only (`packages/pds/package.json`); keep a list of which files are Cirrus-derived so the MIT notice stays attached to those.
- **Official `@atproto/*` packages and `bluesky-social/pds`**: the repository LICENSE says "Dual MIT/Apache-2.0" (fetched today for `bluesky-social/atproto` and `bluesky-social/pds`) **[V]**. The npm registry lists the individual packages as MIT. We use them as dependencies, not copies. If we ever copy code, pick the MIT option and keep the copyright line. Apache-2.0 code can also go into an AGPL-3.0 project but brings NOTICE obligations.
- **`@getcirrus/oauth-provider` 0.6.0**: MIT (package.json read today) **[V]**. It is our OAuth engine; we wrap it, not fork it.
- **`@did-plc/lib`, `@atproto/identity`, `@atproto/oauth-client-node`, `@simplewebauthn/server`, `hono`, `jose`**: MIT per registry today **[V]**; `bcryptjs` BSD-3-Clause; `@atcute/cbor` 0BSD.
- **`rsky` (Blacksky)**: the LICENSE file begins "Apache License Version 2.0" **[V]**, first lines only. Fine as a reference; copying code needs NOTICE handling. No reason to copy.
- **`pds-workers` (tuna2134)**: the earlier note recorded "licence not shown". Today a raw `LICENSE` request for `main` and `master` returned 404 **[V]**, so no licence file was found. Treat it as all rights reserved: read it for ideas only if at all, copy nothing.
- **Anything AGPL** (other PDS projects, community code): AGENTS.md says do not copy until licensing is settled. A permissive-looking README is not a licence; check the file. Do not paste AGPL code into an MIT-derived file.
- The `@atproto` repository is the specification-quality reference. Read `packages/pds` there for behaviour (for example account creation and PLC flows); depend on the published npm packages for code.

## 7. Phased build plan

Effort in focused working days of one lead writer, including tests; helpers can parallelise leaf work but the OAuth and key-custody parts have one owner (open-work rule: the lead owns sign-in and the private boundary). Estimates, not measurements.

| Phase | Content | Days | Result |
| --- | --- | --- | --- |
| 0 | **Spike** (section 8) | 1 | Go/no-go on Free; Paid decision |
| 1 | Skeleton: edge router with two host kinds; account DO loads identity from its own storage; D1 directory schema and migrations; remove env identity and `AUTH_TOKEN` path; DID-from-token routing; per-account JWT secret derivation; ownership checks at the 14 sites; port existing tests to two accounts | 4 | Two accounts, isolated, with fixture identities |
| 2 | Identity: provisioner, `account_keys` encryption with KEK, did:plc genesis with mock and real PLC clients, saga with reconcile-on-uncertain, handle well-known, `resolveHandle`, `describeServer`, invites, reserved names | 3.5 | Create `name.etnos.space` from an invite, verified by an independent resolver |
| 3 | OAuth across accounts: auth hub DO, identify step, passkey per account, throttle rework, `userinfo`, revoke, interop test with the official client against two accounts | 4 | ETNOS signs in with a new account |
| 4 | Signup UI (Indonesian copy), steward invite screen, ETNOS allowlist and `allowedHosts` for `pds.etnos.space`, handle-resolution fallback | 2 | Whole flow for a member on a phone |
| **Subtotal** | | **14.5** | **Happy-path demo with test identities** |
| 5 | Lifecycle: deactivate, delete with purge, export, outbound migration with host key, take-your-keys, recovery link, audit rows, nightly CAR backup | 3 | Leaving works |
| 6 | Hardening: the whole of section 5, load run in the style of `scripts/load-day.mjs`, logging policy, wildcard noise watch, usage page | 3 | A version we would trust with one real member |
| **Subtotal** | | **~20.5** | |
| 7 | Public publishing: firehose hub with outbox, `listRepos` from D1, `requestCrawl`, blob quotas, relay-limit handling | 6 to 8 | Posts reach the relay (only if wanted) |

Versus the earlier estimate (8 to 10 happy-path, 15 to 20 trusted): the happy-path figure here is higher because it includes key custody, a real signup flow, and the OAuth hub, which the earlier table treated as "2 days"; the trusted figure is similar. The earlier table's "firehose 2 to 3 days" is now in phase 7 because the showcase does not need it.

**By 18 to 19 December** (start about 22 November, 27 days to the 15 December freeze, but ETNOS work competes and finalist mentoring runs 7 to 14 December): phases 0 to 4 fit in about 3 working weeks if this is the lead's main task; phases 5 and 6 only partly. Realistic demo: the owner or a steward creates 2 to 3 accounts on stage with invites and passkeys; each resolves from an independent resolver (`dig`, `curl`, bsky.social's `resolveHandle`) and from plc.directory pointing at `pds.etnos.space`; each signs in to ETNOS by OAuth; one exports a CAR and verifies it with the official `verifyRepoCar`; one runs the leave flow to a throwaway account on another PDS if phase 5 is done. Show a usage page with the daily numbers.

**Do not** put a real person's only identity on this host before phase 6. Per the 17 November plan, people use the official PDS track for the pilot; this host is shown as the way ETNOS deploys without a server.

**Cut first (in this order):** public publishing and relay (phase 7), blobs beyond avatar, app passwords and legacy `createSession` (note: the official Bluesky mobile app may still use legacy login against a third-party PDS **[U]**, so "sign in to the Bluesky app with this account" is not promised), email, preferences, Spaces, outbound migration polish, usernameless passkeys, per-account TXT records, KEK rotation tooling (design it, test it, defer the tool).

## 8. Riskiest unknown and a one-day spike

**Riskiest unknown: whether Workers Free lets our heavy work complete.** The Worker limit is 10 ms CPU. Durable Object pages say 30 s by default, and the DO FAQ also says DOs "have the same per invocation CPU limits as any Workers do" **[V]**; the two statements do not agree. If DOs are also held to 10 ms on Free, key generation, signing a commit (10.6 ms whole-path locally) and passkey verification are at or over the limit, and the Free premise fails; the fix is Workers Paid at $5 per month. Everything else in the plan can be tested locally; this one cannot.

Second unknown, also external: whether the wildcard route behaves as documented on this zone with first-level handles, and whether bsky.social resolves a fresh `*.etnos.space` handle and caches negatives.

**Spike, about one day, on a throwaway deployment** (needs the owner's go-ahead to deploy and, for steps 5 and 6, to touch DNS and create one disposable DID; delete afterwards):

1. Deploy a tiny Worker plus `Probe` Durable Object on workers.dev with a method `burn(ms)` (busy loop). Call it from the Worker by RPC at 5, 15, 50, 200 and 1,000 ms of CPU. Record which succeed and what the error is (Worker 1102 versus DO). **This answers the first unknown.**
2. Deploy the current fork build with synthetic secrets (`wrangler.test.jsonc` fixture, as a separate throwaway name). Run 50 `createRecord` and 5 `createSession`; read CPU time from Workers Logs. Confirms which invocation exceeds what.
3. In the Worker and in the DO: time secp256k1 key generation plus one ECDSA signature plus SHA-256 plus DAG-CBOR (a genesis operation), HKDF plus AES-GCM wrap/unwrap, HMAC-SHA256 JWT verify, PBKDF2 at 100,000 iterations, and one WebAuthn ES256 verification with `@simplewebauthn/server`.
4. Measure module start-up: first request after deploy, three times.
5. Wildcard route: add an exact canary record `spike-1.etnos.space` and a route `*.etnos.space/*` to a Worker that serves `/.well-known/atproto-did` only for `spike-1` and passes every other host through with `fetch(request)`; verify existing subdomains still reach their origins; remove the route afterwards if anything looks wrong.
6. Create one disposable did:plc for `spike-1.etnos.space` using locally generated keys. Check bsky.social's `resolveHandle` before the DNS and DID exist, then after, to see negative-caching; check the DID document at plc.directory shows the right service.

Decision at the end: Free works (go, with budget table as is), Free works only with Paid (decide with the owner; the plan is otherwise unchanged), or wildcard routing needs per-handle routes (adds an API token and about 1 day). Write the numbers into a short dated note next to this file.

## 9. Open questions for the owner

1. Workers Paid ($5 a month): yes or no, given the shared allowances and the unmeasured wildcard noise. The spike informs this but the shared-account risk to ETNOS stands either way.
2. Where does the KEK paper copy and the escrow rotation key live, and who besides the owner may hold either? Required before any real account is created.
3. Is a custodial host acceptable in the public copy ("ETNOS hosts your account and can be asked to release it")? The text needs to be agreed before the signup screen is written.
4. Who may issue recovery links (any steward, or the owner only)?
5. Handle policy: hold deleted handles for 90 days? Allow members to choose any name or only steward-approved ones?

## Sources

All pages read on 18 November 2026 unless noted.

- Cloudflare Durable Objects limits: https://developers.cloudflare.com/durable-objects/platform/limits/ ; pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/ ; FAQ (CPU wording): https://developers.cloudflare.com/durable-objects/reference/faq/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/ ; Worker size changelog 4 Sep 2026: https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/
- Cloudflare D1 pricing and Free enforcement from 1 Sep 2026: https://developers.cloudflare.com/d1/platform/pricing/ , https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/
- Cloudflare Worker routes: https://developers.cloudflare.com/workers/configuration/routing/routes/ ; wildcard DNS: https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/ ; Web Crypto: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- did:plc specification: https://web.plc.directory/spec/v0.1/did-plc
- Handle specification: https://atproto.com/specs/handle ; sync (firehose) specification: https://atproto.com/specs/sync ; account hosting status: https://atproto.com/specs/account ; account migration guide: https://atproto.com/guides/account-migration
- Bluesky relay new-host limits (search result only, primary page did not load; unconfirmed): https://docs.bsky.app/docs/advanced-guides/rate-limits ; 2024 early federation post: https://atproto.com/blog/self-host-federation ; new-host crawl discussion: https://github.com/bluesky-social/atproto/discussions/4258 (the last two as cited in the 17 November note)
- Licences: https://raw.githubusercontent.com/bluesky-social/atproto/main/LICENSE.txt and https://raw.githubusercontent.com/bluesky-social/pds/main/LICENSE.txt (dual MIT/Apache-2.0); https://raw.githubusercontent.com/blacksky-algorithms/rsky/main/LICENSE (Apache-2.0, first lines); npm registry `latest` licence fields for `@atproto/pds` (0.5.61, MIT), `@getcirrus/pds` (0.19.0, MIT), `@atproto/repo`, `@atproto/crypto`, `@atproto/oauth-provider`, `@did-plc/lib`, `@atproto/identity`, `@atproto/oauth-client-node`, `@simplewebauthn/server`, `@getcirrus/oauth-provider` 0.6.0 (MIT), `hono`, `jose`, `bcryptjs` (BSD-3-Clause), `@atcute/cbor` (0BSD); `pds-workers` raw LICENSE 404 on `main` and `master`.
- Local: `@getcirrus/oauth-provider@0.6.0` tarball inspected in a scratch directory (`dist/index.d.ts:447` for `verifyUser`; no `login_hint` handling in `dist/index.js`). Local measurements: scratch copy of `packages/pds`, `npm ci --ignore-scripts`, `wrangler deploy --dry-run` (bundle 3,552,162 bytes), Miniflare timing scripts (not committed). The repository itself was not modified.
- Repo documents: `AGENTS.md`, `packages/pds/UPSTREAM.md`, `packages/pds/README.md`, `docs/research/serverless-pds-and-auth-2026-11-17.md`, `docs/research/free-tier-measurement-2026-11-17.md`, `docs/plan/showcase-plan-2026-11-17.md` (section 4, 21), `docs/plan/open-work-2026-11-17.md`, `docs/accounts-and-hosting/pds-hosting.md`, `docs/accounts-and-hosting/handle-portability-2026-11-04.md`, `docs/accounts-and-hosting/signup-2026-11-04.md`.
