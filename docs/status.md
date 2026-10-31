# Foundation status

This is a runnable local/Worker backend and protocol fixture, not a launched forum or a secure production node. No public AT writes or confidential data ingestion were performed. Deployment evidence is recorded separately in cloudflare-profile.md.

| Capability | Current evidence | Remaining gate |
| --- | --- | --- |
| Community policy | Visibility separate from admission/export; applications, recipient-bound invitations, membership, filtered reads and removal | Ownership succession, site enrollment/abuse limits and broader operational isolation |
| Conversation | Posts/replies, local human votes, private bookmarks, public topics, bounded search and keyset pagination | Following/feed collections, ranking, post lifecycle, media, polls, notifications and UI |
| Moderation | Local hide, restricted report queue and immutable decision through API; audit entries | Site bans, spam/flood controls, appeals, public/moderator log projections and UI |
| Wiki | Public pages, restricted human proposals, digest/base review, accepted revisions and history | Review/correction UI, diffs, richer knowledge types, deletion/redaction and full editorial governance |
| Agents | Separate operator/admission/mandate; expiry, revocation, posting budget; public actor-kind field | Verified operator/profile assertions, useful model integration, request admission and broader capabilities |
| Credentials | Random locally provisioned bearer tokens; only hashes stored; no HTTP provisioning | Verified AT OAuth, secure production sessions, expiry/rotation/recovery and service authentication |
| Private sources | Owner-only byte-preserving development fixture; HTTP disabled by default | Existing Aksara Rust authority integration, institutional rights and true SharingGrant evaluation |
| Public release | Exact derivative review, designated publisher, transactional intent; internal keys redacted from views/records | Source-use policy, multi-steward governance, correction UX and actual receiving-side institutional release contract |
| AT | Official Lexicon validation and SDK request/response tests, planned stable URI, safe CAS | Owned namespace, production validation, real OAuth/PDS sandbox qualification, signatures/ingestion/index rebuild |
| Delivery | Stable keys, atomic intent, uncertain outcomes, explicit reconciliation and fenced deletion | Operational scheduler, backoff, durable budgets and tested live peer behavior |
| Storage | Node SQLite FULL/WAL; DO transactionSync; common migrations including legacy v1 adoption; reopen/restart evidence | Qualified backup/restore, disk-full/corruption and measured workloads |
| Private media | No attachment endpoint, URL exporter or cache implemented | Audience-bound media, expiry and membership-removal checks before enabling |
| Node networking | Loopback host only | TLS, enrollment, remote access, A2A, Iroh and compromised-peer tests |
| Hosted/serverless | Real Worker/SQLite DO port and actual-workerd contract tests | Production identity, quotas, recovery, abuse controls and operational security qualification |
| UI | Honest capabilities endpoint; no UI in this repository | Recover/import selected Honai/Sites design through a Strata client; capability-aware controls |

Tests use synthetic identities, bytes and fake destination responses. Official SDK wire tests do not prove live AT compatibility, hardware performance or comprehensive security. The owner selected AGPL-3.0-only. The initial repository remains private; opening it is a separate release step.
