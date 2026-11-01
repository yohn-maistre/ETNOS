# Forum content and Spaces checkpoint — 1 November 2026

The first release remains a useful forum. [Decision 003](decision-003-forum-first-alpha.md) records community-scoped content, agreed custodianship, CARE-informed future language work and the decision to defer corpus/training/archive plumbing. No automatic collection or Wiki publication was added. Aksara posting/service authentication and automated moderation remain distinct unfinished integrations.

## Delivered ordinary forum behavior

- Local text up to 20,000 UTF-16 code units; optional title/link, sanitized Markdown, collapsed long feed text, content warnings and image-only posts. Existing plain posts retain their rendering. The renderer uses Marked and DOMPurify with an explicit formatting allowlist, safe external links and no inline remote image/SVG/script/iframe HTML.
- Existing image galleries/ALT/fullscreen viewer retain scope and quotas. Click-to-load allowlisted YouTube privacy-enhanced/Vimeo embeds; no automatic third-party video request, arbitrary iframe or remote preview fetch. This does not host uploaded video, audio or general files.
- Single-choice polls, two to six distinct options, one current vote per admitted human, changes/clear before closing, no public voter list. Locking closes participation. Events have a start, optional end, location and aggregate interested/going responses; there is no public attendee roster or calendar/reminder integration. The UI currently offers going/clear, while the API also supports interested.
- Authors can edit local posts with revision compare-and-swap, or delete content/media with a structural tombstone preserving replies. This is a revision counter, not historical edit storage. Public-PDS and protected-release posts reject this ordinary edit/delete route; remote update/retraction needs separate reconciliation.
- Human community stewards can hide/restore ordinary posts, lock/unlock roots, pin/unpin roots, and inspect a restricted action/reason log. Up to three pins are returned separately for the first community feed page; chronological pagination remains stable. Deleted author content and protected withdrawals cannot be restored through this route. Hiding does not delete another author's PDS copy.
- New posts, attachments, context links and request receipt commit together. Optional per-actor request keys let the UI retry the same frozen payload after an uncertain response without creating another post. Definitively rejected requests can be edited. A per-actor HTTP limit caps new posts at 20/minute, independently of stricter agent mandates and media quotas.
- shadcn components and small optional composer controls; context URL/language fields moved under an expansion, default URL derived from name. Primary actions are neutral; lilac remains a subdued customizable accent. One loading owner per self-loading route, preserving encrypted DM state during navigation.

The local API provides `POST /v1/posts/:id/{edit,delete,moderate,poll,rsvp}` and steward-only `GET /v1/communities/:id/moderation`. `GET /v1/capabilities` distinguishes this local behavior from live AT/ActivityPub publishing.

## Official AT Spaces trial

[Runnable pinned lab and limits](../labs/spaces/README.md). Two actual official alpha PDSes, a local PLC directory and three disposable accounts; no Strata production content or real identity migration. Fourteen assertions cover creation, cross-PDS writing/authorized reading, credential keys, outsider/anonymous denial, public API omission, private blob isolation and removal behavior. Expected denials check protocol error codes rather than treating a network failure as success. MAC verification and signatures use official helpers.

The lab **observed old credentials remain usable immediately after member removal**, while new credential issuance is denied. Credentials last 600 seconds in this snapshot. This is a concrete integration gate, not a blanket claim that all revocation is broken or that expiry alone is sufficient. The read-only `/labs/spaces` page reports the experiment; it is not a live hosted PDS, federation switch or privacy guarantee. No existing private community was mapped/exported automatically. Upstream packaging contribution candidates are documented, not submitted.

## Capacity evidence and alpha limits

Synthetic fixture: 30 root posts and 150 replies, anonymous 30-root first page. Before batching: **241 SQL reads** per feed; after: **10**. In this cloud container, Node 24 in-memory SQLite, 100 iterations, baseline p50/p95 2.07/4.50 ms and batched 0.76/1.11 ms. These are local execution observations, not Cloudflare CPU accounting, concurrent throughput or internet latency.

Actual local workerd also exercised the same 30+150 fixture, 50 iterations, 10 queries/feed, with coarse `performance.now()` observations around 1 ms p50/p95. This timer's precision is not sufficient for a precise speedup or live capacity promise. The workerd lifecycle checks also cover private access, rollback, persistence, poll/lock/edit/deletion and restart.

If hosted on Workers Free, the documented 100,000 dynamic requests/day and 10 ms Worker CPU/request are relevant boundaries; the DO and storage have their own limits. A page performs multiple API requests, so requests are not users or page views. The preview uses one logical SQLite DO and a **64 MiB image-store cap**. Cloudflare's single-object soft rate guidance is not measured application throughput. No live load test, paid-plan change or quota increase was performed. Controlled enrollment remains appropriate before promotion to a 100k-follower audience; backup/restore, recovery, monitoring, abuse operations and sustainable media storage are launch gates.

Sources checked: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/). Exact plan entitlements and provider limits can change.

## Remaining Photon/PieFed gaps

Full ActivityPub delivery/ingestion and live AT publishing; account recovery/ownership succession; profile media/banners; following/subscriptions/custom feeds; crossposts; hot/top/active ranking; uploaded video/audio/files and scalable object storage; rich remote link metadata; poll variants/multi-select; event calendars/reminders; mentions/push/email; blocks/mutes and stronger abuse controls; appeals; historical post edits; comprehensive Wiki diff/contestation/page lifecycle; actual Aksara connector and unattended moderation; operational backup/restore and load qualification. These are not inherent AT limitations and this checkpoint does not claim full parity.
