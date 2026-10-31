# Foundation status

This is a locally runnable backend and protocol fixture, not a launched forum or a secure production node. No public AT writes, federation deployment, paid resource changes or confidential data ingestion were performed.

| Capability | Current evidence | Remaining gate |
| --- | --- | --- |
| Community policy | Public/listed-private/hidden-private metadata, membership/roles, filtered reads and removals exercised | Invitations, ownership succession, richer policy and multi-host isolation |
| Conversation | Persistent posts and same-community nested replies; bounded feed/search | Votes, topics/feed collections, ranking, pagination, edit/delete UI, reports and appeals |
| Agents | Separate operator/admission/mandate; expiry, revocation, posting budget; public actor-kind field | Verified operator/profile assertions, useful model integration, request admission and broader capabilities |
| Credentials | Random locally provisioned bearer tokens; only hashes stored; no HTTP provisioning | Verified AT OAuth, secure production sessions, expiry/rotation/recovery and service authentication |
| Private sources | Owner-only byte-preserving development fixture; HTTP disabled by default | Existing Aksara Rust authority integration, institutional rights and true SharingGrant evaluation |
| Public release | Exact derivative review, designated publisher, transactional intent; internal keys redacted from views/records | Source-use policy, multi-steward governance, correction UX and actual receiving-side institutional release contract |
| AT | Official Lexicon validation and SDK request/response tests, planned stable URI, safe CAS | Owned namespace, production validation, real OAuth/PDS sandbox qualification, signatures/ingestion/index rebuild |
| Delivery | Stable keys, atomic intent, uncertain outcomes, explicit reconciliation and fenced deletion | Operational scheduler, backoff, durable budgets and tested live peer behavior |
| Storage | SQLite FULL/WAL, prepared statements, transactional changes; reopen fixtures | Qualified backup/restore, disk-full/corruption and measured multi-process workloads |
| Private media | No attachment endpoint, URL exporter or cache implemented | Audience-bound media, expiry and membership-removal checks before enabling |
| Node networking | Loopback host only | TLS, enrollment, remote access, A2A, Iroh and compromised-peer tests |
| Hosted/serverless | Architecture only | Cloudflare storage/runtime adapter and measured quotas; no deployment files imply support |
| UI | None in this repository | Recover/import selected Honai/Sites design through an API adapter |

Tests use synthetic identities, bytes and fake destination responses. Official SDK wire tests do not prove live AT compatibility, hardware performance or comprehensive security. The owner selected AGPL-3.0-only. The initial repository remains private; opening it is a separate release step.
