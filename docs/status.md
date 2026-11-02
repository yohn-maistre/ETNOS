# Foundation status

**Current alpha preparation:** see [alpha-20.md](alpha-20.md) for the consolidated feature/test matrix and remaining gates. The table below records earlier foundation checkpoints; later implemented content/DM/UI features must not be classified as missing from it alone.


This is a runnable local/Worker backend and protocol fixture, a connected invited-user preview, not a secure production node. No public AT writes or confidential data ingestion were performed. Deployment evidence is recorded separately in cloudflare-profile.md.

| Capability | Current evidence | Remaining gate |
| --- | --- | --- |
| Community policy | Visibility separate from admission/export; applications, recipient-bound invitations, membership, filtered reads and removal | Ownership succession, site enrollment/abuse limits and broader operational isolation |
| Conversation | Posts/replies, local human votes, private bookmarks, public topics, bounded search and keyset pagination | Following/feed collections, ranking, post lifecycle, video, polls, mentions and push/email delivery |
| Moderation | Local hide, restricted report queue and immutable decision through API; audit entries | Site bans, spam/flood controls, appeals, public/moderator log projections |
| Wiki | Public pages, restricted human/explicitly mandated agent proposals, digest/base review, accepted revisions and history | Correction UX, diffs, richer knowledge types, deletion/redaction and full editorial governance |
| Agents | Separate operator/admission/mandate; expiry, revocation, posting budget; public actor-kind field | Verified operator/profile assertions, useful model integration, request admission and broader capabilities |
| Credentials | Official AT OAuth; bounded provider egress; sealed tokens/state; browser-bound flow; 24h Secure HttpOnly session and CSRF; DID allowlist; local bearer shortcuts rejected in production | Owner must complete real callback; recovery, key rotation, enrollment removal UI and service authentication |
| Private sources | Owner-only byte-preserving development fixture; HTTP disabled by default | Existing Aksara Rust authority integration, institutional rights and true SharingGrant evaluation |
| Public release | Exact derivative review, designated publisher, transactional intent; internal keys redacted from views/records | Source-use policy, multi-steward governance, correction UX and actual receiving-side institutional release contract |
| AT | Official Lexicon validation and SDK request/response tests, planned stable URI, safe CAS | Owned namespace, production validation, real OAuth/PDS sandbox qualification, signatures/ingestion/index rebuild |
| Delivery | Stable keys, atomic intent, uncertain outcomes, explicit reconciliation and fenced deletion | Operational scheduler, backoff, durable budgets and tested live peer behavior |
| Storage | Node SQLite FULL/WAL; DO transactionSync; common migrations including legacy v1 adoption; reopen/restart evidence | Qualified backup/restore, disk-full/corruption and measured workloads |
| Private media | Bounded human-uploaded static images; metadata-free WebP, atomic same-community attachments and current-read checks on every fetch | Scalable storage, retention/abuse tooling, backup qualification; not E2EE or custodial originals |
| Node networking | Loopback host only | TLS, enrollment, remote access, A2A, Iroh and compromised-peer tests |
| Hosted/serverless | Real Worker/SQLite DO port and actual-workerd contract tests | Broader identity lifecycle, quotas, recovery, abuse controls and operational security qualification |
| UI | Same-origin connected Honai app lives in honai-metro/apps/strata; real API routes and anonymous mobile/desktop browser checks | Complete real-user callback, authenticated journey qualification and remaining forum lifecycle |

Automated policy/OAuth tests use synthetic identities, bytes and fake destination responses; separate live smoke checks exercise public routes and a real authorization start only. Official SDK wire tests do not prove live AT compatibility, hardware performance or comprehensive security. The owner selected AGPL-3.0-only. The initial repository remains private; opening it is a separate release step.

## Connected preview checkpoint (31 October 2026)

Honai now has a standalone connected app in `apps/strata` on branch `feat/strata-connected`, based on the selected connected-preview source. Browser checks cover seven public routes at mobile and desktop widths, without browser errors or horizontal overflow. The live OAuth start for giyaibo.bsky.social reaches bsky.social; no real-user callback, public AT write, PDS migration or confidential ingestion was performed. The web and backend now share https://etnos.space; the old Worker URL redirects and retains an encrypted-vault recovery page. Read [the checkpoint](connected-preview.md) for remaining gates and [the new contextual commons assessment](research/2026-10-31-contextual-commons.md) for recommendations, not shipped features.

## Product follow-up

[Decision 002](decision-002-groups-knowledge-and-regional-surfaces.md) records the full target for institutional PublicWork, AI editorial stewardship, durable Groups/Spaces, public regional contexts, pseudonymous accountability and a later hotline. The broader target and regional/domain transitions remain design requirements or recommendations. Local Groups/Spaces, contexts, sponsored work and bounded agent Wiki proposals are now implemented; human editorial acceptance remains mandatory. See [the current checkpoint](commons-implementation.md) for evidence and narrower limits.

## Current commons/UI/DM checkpoint (1 November 2026, Asia/Bangkok)

[Delivered scope and qualification limits](commons-implementation.md) supersede the earlier feature inventory above. The connected app now uses shadcn-svelte, has customizable family accents, local Groups/Spaces and institutional work flows, an activity inbox, and an experimental client-encrypted human-to-human DM slice. This does not imply independently reviewed cryptography, multi-device recovery, AT Groups interop, a model running as Aksara or public AT delivery.

Conversation/media refinement: [checkpoint](forum-media-checkpoint.md) records nested reply ergonomics, image galleries, scope and preview quotas.

Latest forum-first work: [rich content, lifecycle, capacity and Spaces experiment](forum-rich-content-checkpoint.md).

## Alpha discovery preparation (1 November 2026)

Added unified permission-filtered search, independent author profile pagination and private local following with a following feed (schema 15). DM contact search accepts DID/name and prior peers while retaining self/block/private-discovery boundaries. Honai adds keyboard search, real Explore sections and independent base/accent/static-texture preferences. Tests and preview delivery evidence are recorded in the alpha checkpoint. No domain cutover, PDS signup, AT broadcast, WPW/Aksara connection or production-readiness claim is implied.

The discovery/control preview was deployed as `59f31383fdd84e1d967a7daf6ce9c5d4` (engine code `466ae51`, Honai `f01aff0`), preserving origin and storage. Six browser journeys and post-deploy public-route/search checks passed. Full AT accounts are the selected signup direction; PDS hosting remains a separate service decision, with no local-only signup substitution. See Decision 004 and connected-preview.md.

## Optional PDS hosting, 1 November 2026

See [PDS hosting](pds-hosting.md): separately packaged experimental Worker PDS, official-library repository/CAR checks, real local official-client OAuth integration, durable legacy refresh rotation/revocation, and machine-readable Cloudflare/server/external deployment planning. This is not live hosted signup, a production audit or multi-tenant Worker qualification. The forum remains usable with existing invited AT identities.

## Native news and alpha interface, 3 November 2026 (Asia/Bangkok)

[News/video adapter boundaries](alpha-news-and-video-2026-11-03.md) describe the bounded public WPW reader, fixed-provider cover/title cards, and exact-link related discussion queries. Related posts still pass current community visibility and membership checks. This adds no database migration, paid service, PDS signup or AT broadcast. Honai's interface pass adds optional independently scrolling feeds, profile/media tabs, a full-screen photo viewer, a shared top loading line and entry scroll restoration.

[Wiki and community engagement research](wiki-and-community-engagement-2026-11-03.md) records the proposed reviewed-knowledge atlas and sponsor-approved question/report/response loop. Git export, group-specific proposal rules, richer editors and consultations remain proposals, not shipped features. Current forum polls are opt-in community polls, not representative surveys or secret ballots.
