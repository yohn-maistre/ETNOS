# Decision 003: forum-first alpha, community-scoped content

Accepted product direction from the owner, 1 November 2026 (Asia/Bangkok). This narrows the first release while retaining the [language-custody research](../research/2026-11-01-community-language-custody.md) as future context.

Start with an operational forum. Each community is the access, moderation and content-management boundary for its posts, replies and attachments. A community is a logical scope; it does not automatically receive a separate physical database, encryption keys or independent hosting. Public Papuan participation and a private Mee discussion space can coexist in the same deployment.

Abstraksi may provide technical operations/custodianship alongside the community's chiefs/dewan adat and chosen stewards under their agreed arrangements. The proposed purpose is ethical, CARE-informed community language preservation and later NLP work, beginning with Mee. Software must support those decisions; it cannot establish representation or issue permission on people's behalf. Ordinary participation remains simple. A declared preservation/retention policy belongs at community entry/settings, rather than a research form on every post.

## First release

- Familiar posts, replies, longer writing, links and media; readable mobile and desktop presentation.
- Public, listed-private and hidden-private communities with current membership checks on content and attachment delivery. Private material never becomes a public AT record or global discovery context.
- Basic author lifecycle and community moderation, reports, locks/pins, reversible local moderation and clear action history where implemented.
- Spam/flood controls and bounded automation. Human operators can configure deterministic checks; an agent's posting mandate is separate from editorial/moderation authority. No sharing a human's browser session, credentials or blanket institutional access with an agent.
- An accountable, visibly identified Aksara persona can participate under a scoped operator-issued integration once its service-auth/connector is qualified. Existing agent policy tests are not a connected resident deployment.
- The community forum remains useful without Aksara, a model, a separate archive stack, Iroh or private AT Spaces.

## Deferred plumbing

No automated corpus collection, training, archive replication, preservation claim, private federation or automatic Wiki publication is enabled by this decision. The community's forum content is the initial managed data; a later corpus is a separate reviewed use with documented permissions and lineage. Preserve the agent-assisted discussion-to-Wiki proposal workflow as a future extension: sources/proposals can be organized automatically, acceptance/publication remains separately authorized. Personal DMs stay outside collection.

Private forum data is access controlled, not E2EE; the hosting operator/provider can access server-side content. AT identity does not make membership public and does not require private forum posts to be stored on a user's PDS. Existing AT Spaces/group prototypes remain an isolated research adapter until qualified.

## Alpha operations

Public reading can precede broad enrollment. Do not infer capacity from AT's network size, followers or a serverless label. The deployment currently uses one configured SQLite Durable Object; free-tier request/CPU/storage budgets, per-post queries, media quotas and absence of qualified backup/restore constrain a launch. Measure synthetic workloads in local workerd, label that environment clearly and start controlled enrollment before promotion to a large audience. Do not stress the live community with public load tests or change billing automatically.

A launch checklist must cover enrollment/invite UX, actual owner login, moderation staffing/automation boundaries, write limits, media storage/retention, backup/restore and incident/recovery ownership. Local benchmark throughput is not a promised live capacity. The existing 64 MiB image preview store is not a production video/original-recording archive.

## Explicit AT Spaces experiment

The owner subsequently requested trying the official alpha now. Accepted as an **isolated synthetic two-PDS integration**, not a migration of real accounts or communities. [The runnable lab](../../labs/spaces/README.md) and its result preserve the observed credential-removal window. Local Spaces in the ordinary forum and official AT Spaces remain different capabilities. No real private data is exported by this experiment.
