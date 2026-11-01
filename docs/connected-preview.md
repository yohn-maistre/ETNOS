# OAuth and connected Honai checkpoint

Updated 1 November 2026. Preview: https://strata-preview.giyaibo.workers.dev

The engine and the selected Honai visual direction now run on the same origin. The original Sites prototype is unchanged. ETNOS is the intended deployment name; no etnos.space DNS/domain change or purchase was performed, and the permanent AT namespace remains an unregistered example.

## Latest deployment — forum content and isolated Spaces lab

Deployment `29d074c4d67e41cbab7341c3dfa1b7be`; engine `537977f`, Honai `ca9dc3b`. Worker artifact SHA-256 `f43af4760bbcf9b0f1e8156f0a7c63ab8664847385c9f4b0a9ddba0f0bc6b7ef`, 2,859,070 bytes / 775,980 gzip; reported startup 112 ms. These are artifact/startup observations, not traffic benchmarks. Application schema advances to **14**, retaining namespace `2b28195b06644e77bc380c8d41b65ce6`, DO migration tag `v1`, origin and both signing/sealing secret bindings. Existing public posts and replies still render; no synthetic data was written to the deployment.

[Rich content, lifecycle, capacity and experiment scope](forum-rich-content-checkpoint.md). Titles/links/Markdown, long writing, image-only posts, click-to-load external video, polls/events, local author edits/deletion and human moderator locks/pins/hide/restore are enabled. Buttons are neutral with quiet customizable accents; duplicate route loaders are removed. The read-only [Spaces experiment report](https://strata-preview.giyaibo.workers.dev/labs/spaces) shows the isolated official alpha two-PDS trial, including its observed old-credential access after removal. No real community/account migration, hosted PDS, private AT federation or live public publishing was enabled.

Validation: 58 Node tests; actual-workerd access/rollback/persistence/restart and rich forum lifecycle checks; Worker/type checks; Svelte check (0 errors/warnings), UI ESLint/root lint, 3 native UI tests and 4 isolated browser journeys. The independent Spaces probe passed 14 checks using official alpha PDS/SDK. Post-deploy public verification covered 20 routes across 390/1440 px plus the existing thread and lab page; all returned 200 with no horizontal overflow or browser errors. Public health/capabilities are 200; inaccessible media remains an indistinguishable 404. No live load test was performed.

## Delivered

- Official NodeOAuthClient with upstream DID/handle/issuer validation, PKCE, PAR, confidential-client assertions and DPoP. A small DID transport subclass bypasses the SDK's early native Request construction so workerd can reject redirects manually; it does not replace identity validation or OAuth with a custom protocol.
- Explicit HTTPS provider host allowlist, rejected cross-origin redirects, bounded responses and request timeouts. Initially supports the qualified Bluesky hosting path; arbitrary self-hosted PDS providers need operator qualification rather than unrestricted discovery egress.
- Separate signing and sealing secrets in Cloudflare secret bindings. SDK state and access/refresh/DPoP credentials are sealed with AES-GCM and kind/key-bound AAD. Hosting operators remain trusted; this is not end-to-end encryption. Session cookies contain a random bearer value, only its hash is stored server-side.
- Browser-bound ten-minute authorization state, atomic consumption, callback issuer checks, verified DID enrollment, 24-hour application session, explicit CSRF confirmation and exact Origin on mutations. Local development bearer credentials cannot authenticate on the hosted profile. A new login revokes previous browser sessions for that actor; logout revokes local access even if the provider is unavailable.
- Initial steward is bound to giyaibo.bsky.social's verified DID, not a typed display name. Later login admission requires a steward invitation. This grants deployment enrollment only; each community grants membership and agent mandates separately.
- First verified steward login creates four empty public, approval-controlled communities. They publish locally and contain no synthetic posts or invented organizations. Existing state is preserved; bootstrapping is idempotent.
- Standalone Svelte app in Honai's apps/strata: real API-backed text conversations, replies, votes, bookmarks/reports, communities and applications, steward queues, public Wiki proposals/review/history, account settings/invites/logout. Theme/accent presentation preferences use localStorage; experimental DM key/history state uses a separately passphrase-encrypted IndexedDB vault. Legacy Photon remains separately available in its original source.
- Configurable public record contract and live adapter checks retain CAS/CID safety and require remote validation for any future live mode. This does not connect a live publishing route by itself.

## Validation and actual limits

Node tests cover access/custody, admission, proposals, transactions/outbox plus OAuth binding, replay, wrong issuer/subject, expiry, provider egress and fixture-credential rejection. Actual workerd exercises both SQLite policy and the synthetic OAuth start/callback/session flow. The test-only fixture has no production route or provisioning RPC.

Public live smoke checks: health, anonymous session, capabilities, OAuth metadata/JWKS and frontend deep links return 200. A real authorization start for giyaibo.bsky.social returns a bsky.social authorization endpoint. This requests identity-only OAuth; it does not complete login, grant publishing consent, migrate the account or publish anything. The account owner must complete authentication in their own browser; no password is requested or handled by Strata.

Browser checks cover seven public routes at 390px and 1280px widths. This is narrower than authenticated real-provider end-to-end verification, assistive-technology testing, a security review or operational load qualification.

## Deployment

The API-only entrypoint remains src/worker.ts. The web profile uses src/web-worker.ts, an ASSETS binding and SPA fallback. Its generated web/ directory is copied from Honai's built dist/; those generated assets are ignored, and engine CI does not need the UI build. The same StrataNode namespace/migration tag v1 is retained. SQLite application migrations add sealed auth/session tables and thread-root indexes while retaining existing content.

Use a reviewed build in cloud CI/development, not the owner's phone. Do not deploy test/worker-harness.ts or a test config. Preserve signing/sealing secrets when updating a Worker; do not regenerate them on ordinary deployments. Rotation and recovery require a separate plan for sealed sessions and revocation.

The initial same-origin web deployment was 2,793,567 uncompressed script bytes, approximately 747 KiB gzip, with 121ms reported startup; these are artifact/startup observations, not request-latency or traffic benchmarks. Subsequent UI-only assets do not change the engine artifact. One logical node still uses one Durable Object and synchronous SQL; feed projections now batch reads; see the latest checkpoint below. AT scalability does not establish this implementation's capacity. No DAU/RPS guarantee or measured advantage over PieFed/Lemmy/SiliconBeest is claimed.

## Remaining release gates

- Owner completes actual OAuth callback; verify sessions across restart, logout and enrollment revocation operationally.
- Verified owned namespace, discoverable production Lexicon, explicit publication consent, live delivery/reconciliation routes and a disposable-account publishing/deletion test. Preview publishing stays off.
- PDS hosting and hosted account signup are separate work. No existing account migration or hosted username registration has occurred. Private-only accounts remain planned.
- Backups/restore, owner succession/recovery, broader moderation/abuse controls, membership/enrollment removal UX, key rotation, load/resource ceilings and production security qualification.
- Post lifecycle/media, advanced notifications, AT ingestion and Aksara/Iroh/A2A adapters remain incomplete. The later [commons checkpoint](commons-implementation.md) records local Groups/Spaces, contextual entities, PublicWork and experimental DMs. Do not label the preview full PieFed parity or a production institutional vault.

A public custom AT record is public even if this deployment only admits invited writers. It is not automatically a Bluesky post. ActivityPub/Threads bridging is a separate opt-in projection, never a route for protected source or membership data.

Deployment evidence: initial connected web deployment `2f93605c466748739399b70ecccc35a1`; final UI asset update `d1413b18288f4371a8b7663a2cfdf9d8`. Engine artifact SHA-256 `9101567ea25e260be8782aa62cb880c629459cc1bd4763de8e1700cf5b153ee4`; Durable Object migration tag remains `v1`. Final reported startup 122ms. Automated local verification: 32 Node tests plus the actual-workerd contract; UI component check reports zero errors/warnings.

A separate browser journey used the deployed UI with all auth/API requests intercepted into an in-memory Strata fixture. It exercised persisted posting/replies, voting, bookmarking, Wiki creation/proposal/acceptance with zero page errors and zero real public writes. This verifies UI/API behavior, not real-user authentication or operational custody.

## Commons / shadcn / DM deployment — 1 November 2026

The [current scope](commons-implementation.md) is live on the same preview origin. Deployment `eaa2a06ba4ee447aabf393d182b0f459` uses engine source `fc1fc70` and Honai source `2d60b98`. The generated Worker is 2,840,594 bytes; artifact SHA-256 `d858146461d7110807d0c834e7db2bc97918e54f6aa9c13d3b0ab06b67fdb937`. Cloudflare reported 108ms startup for this upload; this is not a workload or latency benchmark. There are 28 UI assets, including lazy-loaded messaging dependencies and third-party notices.

Post-deploy settings confirm the same SQLite Durable Object namespace `2b28195b06644e77bc380c8d41b65ce6`, class StrataNode, compatibility date and both existing OAuth secret bindings. No Worker rename, account/PDS migration, secret regeneration, domain binding or live AT public write occurred. Application migrations are forward-versioned; an older host that does not understand the schema must not be blindly restored against the new database. Backup/restore qualification remains a release gate.

Live health/session/capability, Groups/Contexts/work and frontend routes return 200. Anonymous activity and DM data routes return 401. Public capabilities correctly expose experimental messaging, no independent security review, no multi-device/interop and live AT publishing disabled. Ten public UI routes at 390px and 1440px render without browser errors or horizontal overflow. Separate isolated browser contracts cover authenticated behavior and two real MLS clients; no test account or synthetic post was inserted into deployed storage.

GitHub checks passed on both implementation branches: foundation, connected-ui and root Lint. Local evidence: 48 Node policy/OAuth tests, actual-workerd migration/isolation/DM/activity contract, Worker type/config checks, two UI native tests and three built-UI browser journeys. The standalone Svelte app reports zero errors and warnings; the legacy Photon root check still reports its existing warnings and is not represented as warning-free. The owner’s real-provider callback and physical-phone security/performance were not simulated by these tests.

Final UI refinement: deployment `39ba05c79efe4908aa3ac63bb4ab4259` serves Honai `c3808d8`, adding connected community tab panels/arrow-key verification and correctly pressed filter/theme controls. The engine bytes/hash and Durable Object namespace are unchanged. Cloudflare reported 177ms startup for this upload, also only an observation. The three isolated browser journeys were rerun successfully against this UI build.

## Conversation and image preview — 1 November 2026

Deployment `dd6c417047de4bbdb59cc668f8a58f65` serves engine `67e9a0e` and Honai `e879a0c` on the existing preview origin. Worker artifact: 2,845,333 bytes, SHA-256 `86123489b8e160b656a20d5afa56150e606003402acfb2438c9567f22894ad95`, approximately 772,400 gzip bytes; Cloudflare reported 120ms startup. These are build/startup observations, not traffic benchmarks. The same Durable Object namespace `2b28195b06644e77bc380c8d41b65ce6`, migration tag v1, origin and both OAuth secret bindings are preserved. Application migration 13 adds bounded image storage without replacing existing content or creating additional cloud resources.

The [conversation/media checkpoint](forum-media-checkpoint.md) records nested replies, compact shadcn composition, full-width opening posts/media, mobile reply ergonomics and audience-bound image delivery. Tiny-image floods are bounded by upload/object counts as well as bytes, and denied/unknown image HTTP responses use the same status/body. Image posts currently require a text caption. AT image publication, video/files and DM attachments remain disabled.

Validation: 54 Node tests; actual-workerd migration/rollback/access/image-byte/restart/moderation contract; Worker type checks; three UI native tests; three isolated built-UI browser journeys covering forum/Wiki/images, governance and real two-client MLS. The conversation checks include 320/360/390/768px overflow checks and exact full-screen mobile composer bounds. Root ESLint passed locally; GitHub foundation, connected-ui and Lint passed for the implementation commits. Taste's documented empty-fixture warning is retained rather than filling the public deployment with mock activity.

Post-deploy public UI routes render at phone/desktop widths without page errors or horizontal overflow, including the owner's existing three-post conversation. Anonymous private activity/DM APIs remain 401; unknown image reads are 404. No synthetic user/post, real-provider account action, public AT write or protected institutional upload was made in deployed storage. The serverless preview remains subject to the operational and security release gates above; downloaded public/private copies cannot be recalled.
