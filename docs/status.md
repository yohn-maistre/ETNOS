# Foundation status

This is a runnable local/Worker backend and protocol fixture, a connected invited-user preview, not a secure production node. No public AT writes or confidential data ingestion were performed. Deployment evidence is recorded separately in cloudflare-profile.md.

| Capability | Current evidence | Remaining gate |
| --- | --- | --- |
| Community policy | Visibility separate from admission/export; applications, recipient-bound invitations, membership, filtered reads and removal | Ownership succession, site enrollment/abuse limits and broader operational isolation |
| Conversation | Posts/replies, local human votes, private bookmarks, public topics, bounded search and keyset pagination | Following/feed collections, ranking, post lifecycle, media, polls, notifications |
| Moderation | Local hide, restricted report queue and immutable decision through API; audit entries | Site bans, spam/flood controls, appeals, public/moderator log projections |
| Wiki | Public pages, restricted human proposals, digest/base review, accepted revisions and history | Correction UX, diffs, richer knowledge types, deletion/redaction and full editorial governance |
| Agents | Separate operator/admission/mandate; expiry, revocation, posting budget; public actor-kind field | Verified operator/profile assertions, useful model integration, request admission and broader capabilities |
| Credentials | Official AT OAuth; bounded provider egress; sealed tokens/state; browser-bound flow; 24h Secure HttpOnly session and CSRF; DID allowlist; local bearer shortcuts rejected in production | Owner must complete real callback; recovery, key rotation, enrollment removal UI and service authentication |
| Private sources | Owner-only byte-preserving development fixture; HTTP disabled by default | Existing Aksara Rust authority integration, institutional rights and true SharingGrant evaluation |
| Public release | Exact derivative review, designated publisher, transactional intent; internal keys redacted from views/records | Source-use policy, multi-steward governance, correction UX and actual receiving-side institutional release contract |
| AT | Official Lexicon validation and SDK request/response tests, planned stable URI, safe CAS | Owned namespace, production validation, real OAuth/PDS sandbox qualification, signatures/ingestion/index rebuild |
| Delivery | Stable keys, atomic intent, uncertain outcomes, explicit reconciliation and fenced deletion | Operational scheduler, backoff, durable budgets and tested live peer behavior |
| Storage | Node SQLite FULL/WAL; DO transactionSync; common migrations including legacy v1 adoption; reopen/restart evidence | Qualified backup/restore, disk-full/corruption and measured workloads |
| Private media | No attachment endpoint, URL exporter or cache implemented | Audience-bound media, expiry and membership-removal checks before enabling |
| Node networking | Loopback host only | TLS, enrollment, remote access, A2A, Iroh and compromised-peer tests |
| Hosted/serverless | Real Worker/SQLite DO port and actual-workerd contract tests | Broader identity lifecycle, quotas, recovery, abuse controls and operational security qualification |
| UI | Same-origin connected Honai app lives in honai-metro/apps/strata; real API routes and anonymous mobile/desktop browser checks | Complete real-user callback, authenticated journey qualification and remaining forum lifecycle |

Automated policy/OAuth tests use synthetic identities, bytes and fake destination responses; separate live smoke checks exercise public routes and a real authorization start only. Official SDK wire tests do not prove live AT compatibility, hardware performance or comprehensive security. The owner selected AGPL-3.0-only. The initial repository remains private; opening it is a separate release step.

## Connected preview checkpoint (31 October 2026)

Honai now has a standalone connected app in `apps/strata` on branch `feat/strata-connected`, based on the selected connected-preview source. Browser checks cover seven public routes at mobile and desktop widths, without browser errors or horizontal overflow. The live OAuth start for giyaibo.bsky.social reaches bsky.social; no real-user callback, public AT write, PDS migration or confidential ingestion was performed. The web and backend share https://strata-preview.giyaibo.workers.dev. Read [the checkpoint](connected-preview.md) for remaining gates and [the new contextual commons assessment](research/2026-10-31-contextual-commons.md) for recommendations, not shipped features.

## Product follow-up

[Decision 002](decision-002-groups-knowledge-and-regional-surfaces.md) records the full target for institutional PublicWork, AI editorial stewardship, durable Groups/Spaces, public regional contexts, pseudonymous accountability and a later hotline. These features and regional/domain transitions are design requirements or recommendations, not newly shipped runtime capabilities. Current Wiki agent restrictions remain in effect.
