# Serverless multi-account PDS and sign-up options for ETNOS

17 November 2026 · research note. All web pages were read on 17 November 2026 unless a different date is given. Nothing was deployed, created or changed. "Unverified" marks anything not confirmed by a primary source or a test in this pass.

## Summary and recommendation

1. No multi-account PDS for Workers exists in a usable state. Cirrus (the basis of `packages/pds`) is still single-account; its latest npm release is 0.19.0 (29 Aug 2026), the same version we forked. The only multi-account Workers PDS found, `pds-workers`, is a 20-commit "under development" project.
2. Making `packages/pds` multi-account is real work: about 120 references to per-deployment `DID`, `HANDLE`, `SIGNING_KEY`, `PASSWORD_HASH`, `AUTH_TOKEN` and `JWT_SECRET`, one global DO name, per-account firehose. Estimate 8 to 10 focused days for a happy-path demo, 15 to 20 for something we would trust. It will not be demo-ready by 21 to 25 November.
3. Workers Free is not a clear blocker for 30 people on CPU if heavy work runs inside Durable Objects (30 s CPU per DO request per the docs, unverified by test). It is a blocker for email (arbitrary recipients need Paid) and any Worker-side bcrypt (measured about 90 ms against a 10 ms limit). Workers Paid ($5/month) removes the CPU and email concerns.
4. Every large third-party host (bsky.social, Eurosky, Blacksky family, selfhosted.social) currently reports `phoneVerificationRequired: true` (checked live today). Northsky is invite-only. So fallback (c) does not remove phone friction.
5. Spaces: the public beta is announced for 1 December 2026 (confirmed, official post dated 13 Nov 2026). The reference PDS gets it by update that day. A custom Workers PDS cannot rely on that date.
6. **For 21 to 25 November: run the official PDS on a small rented VPS** (any provider with capacity; the owner must buy it) with invite codes, SMTP through a free transactional-email tier, and handles under `etnos.space`. It is the only path with real multi-account, real did:plc, real email and no phone gate that can exist in days.
7. **For the 4 to 5 December showcase:** the same PDS, updated on 1 December if the Spaces release ships as announced (unconfirmed until it does). Do not demo a Workers PDS as the account host.
8. **After the showcase:** build the multi-account Workers PDS on Workers Paid, as the easy deployment path for other communities, after a one-day probe on a throwaway account to confirm CPU and wildcard-route behaviour.
9. If a VPS is impossible this week: use Eurosky or Blacksky accounts (free, SMS verification), then change handles to `name.etnos.space` by DNS record. Worse than 6 but needs no infrastructure.
10. ETNOS-native accounts (fallback b) are viable only as an emergency; they contradict the "full AT account from the start" direction in Decision 004 and need a DID-rebind migration.

## 1. Upstream state

| Project | State | Source |
| --- | --- | --- |
| Cirrus (ascorbic) | Describes itself as "A single-user ATProto PDS", "experimental beta". Latest npm `@getcirrus/pds` 0.19.0 published 2026-08-29; prior 0.18.0 on 2026-06-01. No multi-user mention or plan found on the repo page (216 commits). Releases/issues could not be read through the API here (access blocked), so unverified for open issues. | [repo](https://github.com/ascorbic/cirrus), [npm registry](https://registry.npmjs.org/@getcirrus/pds) |
| pds.js (chadtmiller.com) | "It serves one account"; no invite codes; runtimes Node, Deno, Workers; Spaces as an experimental labs feature. | [pdsjs.dev](https://pdsjs.dev/) |
| pds-workers (tuna2134) | Independent multi-account Workers PDS: one SQLite DO per DID, D1 for accounts/sessions/OAuth, global Firehose DO, R2 blobs, did:plc genesis, `createAccount` that leaves failed PLC registration `pending`. README says under development; browser OAuth code exchange and restore drills unverified; email sender still a placeholder; firehose keeps last 10,000 frames; license not shown; 20 commits. Best design reference, not adoptable. | [repo](https://github.com/tuna2134/pds-workers) |
| alteran | Single-user, `did:web`, "Nobody should use this project as their PDS yet". | [repo](https://github.com/alteran-social/alteran) |
| Official PDS | Multi-account, SQLite, Docker; recommended 1 CPU, 1 GB RAM, 20 GB SSD for 1 to 20 users; `PDS_INVITE_REQUIRED` defaults to true; SMTP needed for email. | [bluesky-social/pds](https://github.com/bluesky-social/pds) |
| Other PDS implementations seen | rsky, ZDS, a Rust PDS (tranquil), a Go PDS (cocoon), a Perl one. None serverless; not evaluated. | [Spaces alpha post](https://atproto.com/blog/atproto-spaces-alpha), [search results](https://tangled.org/tranquil.farm/tranquil-pds/issues/3) |

Official statements about serverless PDS: none found. One community write-up says the standalone `@atproto/pds` cannot run on Workers as is, only `@atproto/repo` can, and that the firehose needs DO WebSocket hibernation ([notes on hosting a PDS on Cloudflare](https://leaflet.pub/24abb069-60c6-4929-9589-2ed6cef9d35d), undated). Its claim that Cloudflare cannot do wildcard routing is contradicted by current docs (section 3).

## 2. Spaces (permissioned data)

Confirmed from official sources:

- Alpha opened 20 Aug 2026 (Daniel Holmgren). "This is truly an alpha... you absolutely should not run production code against it." Protocol, SDKs and schema "not final". Official image `ghcr.io/bluesky-social/atproto:pds-spaces-alpha`; community PDS projects implementing the draft: ZDS, atproto-crates, rsky. Access control, not encryption. [Alpha post](https://atproto.com/blog/atproto-spaces-alpha)
- 13 Nov 2026 (Jim Ray): "Atproto spaces are moving from alpha to public beta on December 1." Protocol changes to be minimised. Bluesky updates its PDS fleet with the reference PDS release; stock PDS operators "should need to update to the latest version released on December 1". Active did:plc accounts get a new `kem` key via a PLC update handled by migration. Alpha PDS operators: migration "will not be smooth"; do not run alpha with production data; hosted alpha PDS will be shut down. Partner hosts named: Blacksky, Eurosky, Northsky, selfhosted.social. End-user promotion starts early 2027. [Public beta post](https://atproto.com/blog/getting-ready-for-the-spaces-public-beta)
- Design reference: [proposal 0016](https://github.com/bluesky-social/proposals/tree/main/0016-permissioned-data).

Unconfirmed: that the 1 December release ships on time; what the beta changes versus alpha (a search summary said `com.atproto.simplespace` was removed upstream, from [a GitHub project PR](https://github.com/tobbbles/exosphere/pull/35); not verified); how a non-reference PDS must handle the new `kem` key.

For ETNOS: the Strata PDS fork has Spaces routes (off by default) written against the alpha; they may need rework. A Workers PDS could implement Spaces (Cirrus and pds.js both do, experimentally), but alpha-era code is likely to break at beta. Before 1 December, the only honest demo is the alpha image on a disposable server with no production data. After 1 December, the official PDS update is the lowest-risk way to show Spaces.

## 3. Multi-account Workers PDS design

| Concern | Design | Notes |
| --- | --- | --- |
| Account storage | One SQLite DO per DID (`idFromName(did)`), plus a directory (D1 or a directory DO) mapping handle, DID, email, invite code. | Same pattern as pds-workers. D1 cannot be created dynamically, so share one D1 ([notes](https://leaflet.pub/24abb069-60c6-4929-9589-2ed6cef9d35d)). |
| Identity | did:plc: generate a signing key and rotation key(s), build a `plc_operation` (`prev: null`, 1 to 5 rotation keys, `atproto_pds` service, `alsoKnownAs: at://handle`), sign with ES256K or P-256, low-S, POST to `plc.directory/:did`. Needs 24-character DID derivation from hash. [PLC spec](https://web.plc.directory/spec/v0.1/did-plc) | Keep one ETNOS-held rotation key offline so accounts can be recovered or migrated. did:web does not support migration or recovery from domain loss ([DID spec](https://atproto.com/specs/did)); not suitable for 30 people's identities. |
| Handles | `name.etnos.space` via `/.well-known/atproto-did` served by a Worker on route `*.etnos.space/*` looking up the directory, or per-account `_atproto` TXT. Reverse check (DID document lists the handle) is mandatory. [Handle spec](https://atproto.com/specs/handle) | Cloudflare: all plans can proxy wildcard DNS ([docs](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/)); route hostnames may start `*.` ([docs](https://developers.cloudflare.com/workers/configuration/routing/routes/)); Universal SSL covers first-level subdomains only ([docs](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/)). Whether a wildcard DNS record satisfies the "DNS record must exist" rule for routes: unverified, needs a probe. Existing explicit records (apex, www, pds) keep priority. |
| Relay | `requestCrawl` to bsky.network on first write; Bluesky's relay then serves posts to bsky.app. | New-host limits: a Feb 2024 post said 10 accounts, 1,500 events/hour and 10,000/day per new PDS, raised "as trust is established" ([post](https://atproto.com/blog/self-host-federation)). Current values unverified; the relay docs page returned no content. 30 accounts may exceed an unraised cap. Also a relay race bug left some new PDS hosts uncrawled, reports through Jan 2026 ([discussion](https://github.com/bluesky-social/atproto/discussions/4258)); workaround was a fresh hostname. |
| Firehose | A single global Firehose DO fed by each account DO (pds-workers design), because `subscribeRepos` has one global sequence. | Our fork's sequencer is per account. Largest structural change. |
| Email | Needed for verification and reset. Cloudflare Email Sending is public beta; Free can send only to verified destinations, arbitrary recipients need Paid (3,000/month included, then $0.35 per 1,000) ([overview](https://developers.cloudflare.com/email-service/), [pricing](https://developers.cloudflare.com/email-service/platform/pricing/)). Resend Free: 3,000/month, 100/day, 3 domains ([pricing](https://resend.com/pricing)). | Resend free fits 30 people from a Worker over HTTPS. Avoid dependence on email by making passkeys primary (Cirrus already has passkey code). |
| Blobs | R2, per-DID prefix, served only when referenced. The fork's `BlobStore` already takes a DID. | R2 free: 10 GB-month, 1M Class A, 10M Class B, free egress ([pricing](https://developers.cloudflare.com/r2/pricing/)); shared with `westpapua-watch-archive`. |
| Sign-up flow | OAuth `prompt=create`-style account creation at the PDS: the May 2025 official post says a PDS lets apps start OAuth without a handle and offer account creation, with handle choice, terms and anti-abuse ([post](https://atproto.com/blog/network-account-management)). | Support varies by implementation; Tranquil and Margin notes show fallbacks ([search](https://tangled.org/margin.at/margin/commit/2c4e898c8f8506a6a0b11e9639ccbeaacbbb4d06)). The current ETNOS code already starts OAuth without a handle (docs/accounts-and-hosting/signup-2026-11-04.md). |

## 4. Cloudflare Workers Free limits and CPU

Official numbers:

| Limit | Free | Paid | Source |
| --- | --- | --- | --- |
| Worker requests | 100,000/day per account | 10M/month included, then $0.30/M | [limits](https://developers.cloudflare.com/workers/platform/limits/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/) |
| Worker CPU per invocation | 10 ms | 30 s default, up to 5 min | same |
| Subrequests | 50 | 10,000 | limits |
| DO requests / duration | 100,000/day, 13,000 GB-s/day | 1M/month, 400,000 GB-s/month | [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) |
| DO rows read / written | 5M/day, 100,000/day | 25B/month, 50M/month | same |
| DO storage | 5 GB per account (SQLite only); per-object 1 GB on Free per FAQ, 10 GB per table (page contradicts itself) | 10 GB per object | [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/) |
| DO CPU per request | 30 s default, resets per HTTP request or WebSocket message (docs; same on both plans) | same | DO limits |
| R2 | 10 GB-month, 1M A, 10M B | pay per use | [R2](https://developers.cloudflare.com/r2/pricing/) |

CPU time excludes I/O wait ([docs](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)); exceeding gives error 1102.

**Measured today (Node 22, 2.1 GHz Xeon, pure-JS libraries; indicative only, Workers will differ):**

| Operation | CPU per op |
| --- | --- |
| bcryptjs 3.0.3, cost 10 (what Cirrus uses: `compare()` in `session.ts`, `oauth.ts`, `xrpc/server.ts`; app passwords hashed at cost 10) | 88 to 91 ms |
| bcryptjs cost 8 / 6 / 5 | 25 / 6 / 3 ms |
| scrypt N=2^14 (pure JS) / N=2^12 | 85 / 25 ms |
| PBKDF2-SHA256, 100,000 iterations, native WebCrypto | 18 ms (Node); Workers behaviour and its iteration cap not checked, unverified |
| secp256k1 sign / verify (noble, JS) | 1.2 / 2.7 ms |
| P-256 sign (noble, JS) | 1.1 ms |

Reading:

- Cost-10 bcryptjs is about 9 times over the Free Worker limit. Lowering cost to 5 to fit 10 ms is a weak password hash; reject. WebCrypto PBKDF2 is native but 100k iterations is still near 18 ms on this machine. Free-plan Worker-side password hashing is not workable.
- Signing, verification and MST updates for a small repo are low single-digit milliseconds each, but a commit plus sequencing plus JSON handling in one request could approach 10 ms. Unmeasured on Workers.
- Escape hatch: do hashing, signing and CAR export inside the per-account DO, whose CPU limit is 30 s per request on Free per the docs. A 90 ms hash costs about 0.01 GB-s, negligible against 13,000 GB-s/day. This is documented but untested for our code; probe with a throwaway deployment before relying on it.
- Better: make passkeys and short-lived email codes the main login so passwords are rare.
- Account-wide request budget: ETNOS already uses an estimated 14,000 requests/day (Decision 004 illustration). Thirty users posting lightly plus relay and AppView fetches likely fit in 100,000/day, but nothing has been measured. DO rows written: roughly 10 to 30 rows per post (blocks, index, sequencer), so 300 posts a day is about 3,000 to 10,000 rows of 100,000; ample.
- Paid changes: $5/month minimum; CPU up to 30 s; email to any recipient; no daily caps. This is the correct baseline for a community-deployable product.

## 5. Bluesky sign-up friction for Indonesia

- Live check of `com.atproto.server.describeServer` today: bsky.social returns `inviteCodeRequired:false`, `phoneVerificationRequired:true`. So the server asks for phone verification at signup. Eurosky, the Blacksky domains and selfhosted.social return the same flags; Northsky returns `inviteCodeRequired:true`, `phoneVerificationRequired:false`. [bsky.social](https://bsky.social/xrpc/com.atproto.server.describeServer), [Eurosky](https://eurosky.social/xrpc/com.atproto.server.describeServer), [Blacksky](https://blacksky.app/xrpc/com.atproto.server.describeServer), [selfhosted.social](https://selfhosted.social/xrpc/com.atproto.server.describeServer), [Northsky](https://pds.northsky.social/xrpc/com.atproto.server.describeServer).
- Whether SMS is actually demanded for every country, whether Indonesian numbers receive codes reliably, and whether the flag is applied per-signup rather than globally: unverified. Many target users may lack or not want to share a phone number; treat this as a real friction.
- Age assurance: Bluesky's terms say users must be 13+ and some regions may need age assurance ([summary of terms](https://conductatlas.com/platform/bluesky/bluesky-terms-of-service/age-eligibility-and-age-assurance/)). Indonesia's 2026 under-16 regulation lists YouTube, TikTok, Facebook, Instagram, Threads, X, Bigo Live and Roblox; Bluesky is not named in the source read ([search summary](https://www.biometricupdate.com/202603/indonesia-to-ban-under-16s-from-social-media-implement-standard-based-age-checks)). No Bluesky-specific Indonesian requirement found; unverified.
- Third-party PDS accounts appear in the Bluesky app: yes, through the relay and AppView, since identity is DID-based (protocol design; see [network account management](https://atproto.com/blog/network-account-management)). Not tested by us. Subject to the relay caveats in section 3.

## 6. Fallbacks

| Option | What it gives | Gaps and risks |
| --- | --- | --- |
| (a) One Cirrus Worker per person | Real AT account, no fork work | About 30 deployments, 30 R2 prefixes or buckets, 30 secrets sets; Worker bcrypt limit; did:web or per-person did:plc scripting; all share one 100,000/day budget; operations nightmare. Reject. |
| (b) ETNOS-native accounts (email link or passkey) in our DO, later "claim your AT account" | Works in a day; no phone | Contradicts Decision 004. Needs email sending (Resend free fits). Migration: each person gets a stable local actor ID; later we create a did:plc (ours-held rotation key, then transferred to the person) or they link an existing DID; the actor row is re-keyed to the DID in one transaction, old posts get republished as AT records with original `createdAt` and a mapping table preserves URLs. Strata actors are anchored on DID today (handle-portability doc), so this needs a placeholder-actor migration; effort unscoped. Posts made before the claim are not on Bluesky. |
| (c) Hosted third-party PDS | Free real accounts: Eurosky (free, open to anyone, Germany) ([FAQ](https://eurosky.tech/faq/)); Blacksky family (`myatproto.social`, `blacksky.app`, `cryptoanarchy.network`; more domains listed live); selfhosted.social; Northsky (Canada, invite code) | All but Northsky ask for phone verification. Handles under `etnos.space` are set after signup by DNS record plus handle change ([Blacksky guide](https://docs.blacksky.community/info-about-blacksky-the-community/migrating-to-blacksky-pds-complete-guide)). The host controls abuse rules and could suspend accounts. PDS directory list is sparse on policies ([list](https://discourse.atmosphere.community/t/pds-hosting-list/478)). |
| (d) Supabase / Cloudflare-native auth | Sign-in layer only (not AT identity) | Supabase Free: 500 MB, two projects, pause after a week idle, no backups (Decision 004). better-auth documents SQLite/Postgres/MySQL and passkey/magic-link plugins; D1/DO adapters not confirmed on the page read ([docs](https://www.better-auth.com/docs/installation)). For open-source reuse, Cloudflare-native (no external account) is simpler to deploy; but neither solves "real AT account". |
| (e) Official PDS on a VPS (from Decision 004) | Real multi-account, did:plc, invites, SMTP, no phone; Spaces by update on 1 Dec | Owner must rent and run a server (1 CPU, 1 GB, 20 GB documented as sufficient for 1 to 20 users; for 30 accounts, take 2 GB); needs 80/443; DNS wildcard to the VPS for handle subdomains; backups. Provider and price not researched, unverified. |

Recommendation: path (e) for 21 to 25 November and the 4 to 5 December showcase; path (c) with Eurosky/Blacksky as the temporary emergency route; Workers multi-account PDS after the showcase. Do not do (a). Do (b) only if both (e) and (c) fail.

Practical notes for (e), from the official guide: set `PDS_INVITE_REQUIRED=true`, create invites with the `goat` admin command, set `PDS_EMAIL_SMTP_URL` and a from address (Resend or SendGrid suggested), and keep `PDS_CRAWLERS` at the default `https://bsky.network` ([guide](https://github.com/bluesky-social/pds)). Handle domain configuration (`PDS_SERVICE_HANDLE_DOMAINS`) and on-demand TLS for handle subdomains are part of the official install; not re-verified here. ETNOS needs its OAuth allowlist to accept the new PDS issuer (docs/accounts-and-hosting/handle-portability-2026-11-04.md already notes this). Keep the invite codes in the steward UI flow (`/auth/enrollment-invites` exists).

## 7. Effort to make `packages/pds` multi-account

Findings from the fork (`src/upstream`, about 10,600 lines): one DO via `idFromName("account")` in `getAccountDO(env)`; `PDSEnv` carries one `DID`, `HANDLE`, `SIGNING_KEY`, `PASSWORD_HASH`, `AUTH_TOKEN`, `JWT_SECRET`; about 120 reads of these across `index.ts`, `xrpc/*`, `oauth.ts`, `spaces.ts`, `middleware/auth.ts`, `account-do.ts`; `worker.ts` blocks `createAccount` and reports `accountsPerDeployment: 1`; the Strata edge allows only one repo import into an empty account; per-account sequencer instead of a global one.

| Work item | Days (focused agent coding) | Risk |
| --- | --- | --- |
| Directory (handle, DID, email, invite, status) and routing by Host, DID or token | 1 to 1.5 | Medium |
| Parameterise all env-global identity into per-account state; per-account signing key sealed with a master secret; remove shared bearer `AUTH_TOKEN` | 2 to 3 | High: authorization bugs leak across accounts |
| `createAccount` with invite codes, handle rules, reserved names, rollback | 1 | Medium |
| did:plc genesis and PLC submit, with recoverable rotation key | 1 to 1.5 | High: irreversible public identity; test only with disposable DIDs |
| Handle resolution Worker (`*.etnos.space`), `describeServer`, `resolveHandle`, `listRepos` | 1 | Medium: wildcard route behaviour unverified |
| Global firehose and `requestCrawl` for many accounts | 2 to 3 | High: relay compatibility, replay, hibernation |
| OAuth provider across accounts (login routing, per-account consent, session storage) | 2 | High |
| Password hashing replacement (PBKDF2 or passkey-first) and move CPU-heavy work into DO | 0.5 to 1 | Medium: Free CPU unverified |
| Email verification and reset via Resend or Cloudflare Email Sending | 1 | Low |
| Blob quotas, deletion, export, deactivation | 1 | Medium |
| Interop tests with official OAuth client, official PDS import/migration, relay ingestion | 2 to 3 | High: cannot be proven locally |

Total: about 15 to 19 days for a trusted deployment; 8 to 10 if limited to a happy-path demo with no recovery. These are estimates, not measurements. Dependency risks: relay caps for new hosts, Spaces beta changes, PLC `kem` key handling.

## 8. Proposed timeline

| Window | Do |
| --- | --- |
| Now to 20 Nov | Owner rents a small VPS (not Oracle Singapore). Install official PDS with invites and SMTP via a free tier. Point `pds.etnos.space` and a wildcard handle record at it. Create two test accounts and confirm they appear in bsky.app. Add the PDS issuer to ETNOS's OAuth allowlist. |
| 21 to 25 Nov | Issue invites; people get `name.etnos.space` accounts; they sign in to ETNOS by OAuth. Watch relay cap messages; contact Bluesky if throttled. |
| 1 Dec | Apply the official PDS update; try Spaces on a test account only. |
| 4 to 5 Dec | Demonstrate. |
| Mid Dec onward | Probe Workers Free/Paid behaviour with disposable accounts; build the Workers multi-account PDS (section 7) on Workers Paid; reuse the same directory and handle design so other communities can deploy it. |

## Sources

- Cirrus: https://github.com/ascorbic/cirrus (17 Nov 2026); npm registry https://registry.npmjs.org/@getcirrus/pds (17 Nov 2026)
- pds.js: https://pdsjs.dev/ (17 Nov 2026)
- pds-workers: https://github.com/tuna2134/pds-workers (17 Nov 2026)
- alteran: https://github.com/alteran-social/alteran (17 Nov 2026)
- Hosting notes: https://leaflet.pub/24abb069-60c6-4929-9589-2ed6cef9d35d (17 Nov 2026, page undated)
- Official PDS: https://github.com/bluesky-social/pds (17 Nov 2026)
- Spaces alpha, 20 Aug 2026: https://atproto.com/blog/atproto-spaces-alpha (17 Nov 2026)
- Spaces public beta, 13 Nov 2026: https://atproto.com/blog/getting-ready-for-the-spaces-public-beta (17 Nov 2026)
- Permissioned data proposal: https://github.com/bluesky-social/proposals/tree/main/0016-permissioned-data
- Spaces beta lexicon change (unverified): https://github.com/tobbbles/exosphere/pull/35
- Network account management, 9 May 2025: https://atproto.com/blog/network-account-management (17 Nov 2026)
- Self-host federation, 22 Feb 2024: https://atproto.com/blog/self-host-federation (17 Nov 2026)
- Relay new-PDS discussion, Oct 2025 to Jan 2026: https://github.com/bluesky-social/atproto/discussions/4258 (17 Nov 2026)
- DID spec: https://atproto.com/specs/did; PLC spec: https://web.plc.directory/spec/v0.1/did-plc; handle spec: https://atproto.com/specs/handle (17 Nov 2026)
- Cloudflare: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [wildcard DNS](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/), [Worker routes](https://developers.cloudflare.com/workers/configuration/routing/routes/), [Universal SSL limitations](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/), [Email Service](https://developers.cloudflare.com/email-service/), [Email pricing](https://developers.cloudflare.com/email-service/platform/pricing/), [Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/) (all 17 Nov 2026)
- Resend pricing: https://resend.com/pricing (17 Nov 2026)
- Live `describeServer` checks (17 Nov 2026): bsky.social, eurosky.social, blacksky.app, myatproto.social, cryptoanarchy.network, selfhosted.social, pds.northsky.social
- Eurosky FAQ: https://eurosky.tech/faq/; PDS hosting list: https://discourse.atmosphere.community/t/pds-hosting-list/478; Blacksky guide: https://docs.blacksky.community/info-about-blacksky-the-community/migrating-to-blacksky-pds-complete-guide
- Indonesia/Bluesky age assurance (secondary): https://www.biometricupdate.com/202603/indonesia-to-ban-under-16s-from-social-media-implement-standard-based-age-checks; https://conductatlas.com/platform/bluesky/bluesky-terms-of-service/age-eligibility-and-age-assurance/
- better-auth: https://www.better-auth.com/docs/installation
- Local CPU benchmark: scratch script run 17 Nov 2026 (bcryptjs 3.0.3, @noble/curves 1.9.7, @noble/hashes), Node 22, not committed.
- Repo: docs/decisions/decision-004-at-account-hosting.md, docs/decisions/decision-005-node-account-data-planes.md, docs/accounts-and-hosting/pds-hosting.md, docs/accounts-and-hosting/signup-2026-11-04.md, docs/accounts-and-hosting/handle-portability-2026-11-04.md, packages/pds/README.md, UPSTREAM.md, src/upstream/*.
