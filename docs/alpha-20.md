# ETNOS: twenty-person alpha

Decision and preparation record · 1 November 2026 (Asia/Bangkok)

The owner chose **anyone can read public content; only admitted testers can participate**. Start with about twenty friends. This is an invitation-controlled public forum, not a confidential deployment. Private communities retain current membership checks, including on media, search and activity. AT broadcasting stays off. Ordinary conversation does not become institutional work or permission to train a model.

This document is the current alpha checklist. It supersedes older status-table claims that polls, post edits/deletion, media or nested replies are still entirely missing. It does not declare every release gate complete.

## What we are releasing

One useful conversation network before many deployments: readable threads, controlled community admission, media/links, individual profiles, local following, search, activity, moderation and experimental encrypted one-to-one messages. Public Wiki is an editorial destination with reviewed revisions, rather than a compulsory workflow for every post. Institutional public work remains an explicit sponsored action. Aksara is a persistent participant with a visible operator and bounded authority, not a second name for the forum.

Site enrollment, community membership and AT identity are three independent decisions. A successful AT OAuth sign-in does not automatically admit an account to ETNOS or a private community. Invitation alone does not give everyone moderation privileges. Choose one default public posting community and a small number of optional communities so the first twenty people can find each other. Do not launch twenty empty geographic instances.

Full AT account hosting is the selected direction; see [Decision 004](decision-004-at-account-hosting.md) for the researched serverless/PDS/database options. Local-only signup is not being introduced.

## Signup, domain and publishing

`etnos.space` exists as an active Cloudflare zone. On inspection today its apex A record was still `162.255.119.161`; `www` pointed to `parkingpage.namecheap.com`. No Worker custom-domain binding for it was present. Nameservers/zone activation alone do not route the application. Existing registrar mail records must be preserved.

The preview currently accepts invited **existing AT accounts** using official OAuth. There is no hosted PDS, password signup, PDS migration, or managed `name.etnos.space` account issuance. Owning the domain makes stable application URLs, schema namespaces and optional verified domain handles possible; it does not supply these missing services. For this alpha, friends can use an existing AT account or create one with a compatible provider, then be enrolled by DID. A future assisted signup flow can hide some provider complexity without misrepresenting who hosts the identity.

For the alpha:

- Public forum content is readable by visitors. Only invited, authenticated members with appropriate community access may write.
- New communities publish locally by default. `STRATA_PUBLISHING_ENABLED=false` remains set. Login must clearly say no account migration and no automatic outward post publishing.
- Public AT repositories are not private storage. Custom Strata records would not automatically become ordinary Bluesky posts, but compatible readers/indexers may still discover them.
- Exercise actual AT writes on a disposable consenting test account/PDS, separately from the ordinary forum. Qualify create, read-back/CID, uncertain response reconciliation, update/delete and revocation before enabling any alpha community. Establish a real owned schema namespace before enduring public records. Do not write public test data using the owner's account implicitly.
- ActivityPub/Threads bridging is not implemented. AT OAuth or public custom records do not provide it.

### Domain cutover needs a continuity plan

The application validates its exact origin. Adding DNS alone will fail. OAuth client identity/callback, browser-bound state, CSRF, cookies, server credentials and the browser's encrypted DM vault are also origin-sensitive. The DM vault uses the origin in authenticated encryption metadata; a redirect does not transfer IndexedDB or rebind that metadata.

Two supported *plans*, neither silently applied by this preparation pass:

1. Preserve the current node and qualify a protected browser vault export/import/recovery flow, then migrate the origin, require fresh OAuth consent and keep the old host available for recovery. Validate the actual data/DM continuity. A database backup alone cannot recover browser E2EE keys.
2. Create a clearly labelled fresh alpha node at `etnos.space`, with new secrets and empty messages; leave preview history and keys on the existing host. Explicitly communicate that histories have not migrated. Copying private browser state or sharing credentials between origins is not a shortcut.

Prefer continuity if these preview conversations matter. A new deployment is operationally simpler but must not silently discard them. Worker naming itself is not destructive; changing the user-facing origin is the material change.

## Discovery and profiles

The screenshots exposed two actual bugs/limitations: global search searched only posts, and a profile depended on the person appearing in the loaded home feed. This preparation adds a permission-filtered cross-entity endpoint and independent author pagination.

Search opens from the header or Ctrl/Cmd K. Blank search shows actual discoverable participants/content, not fabricated trends. Categories: people, posts, communities, contexts, groups and Wiki. Full results have a shareable `/find?q=…` URL. Exact name matching and the viewer's followed people receive priority within identity suggestions. There is no remote identity crawl or global directory of private-only people. Requests are debounced/abortable and results are never shared-cacheable. This is bounded literal search, not yet a full BM25/vector search service. The current SQLite `lower()` does not provide full Unicode case folding; multilingual normalization/ranking, result pagination, spelling variants and larger-corpus benchmarks remain work.

Following is local to ETNOS. Follow/unfollow is idempotent; the feed selects followed authors before pagination and still checks current access. It does not subscribe a person to a private space, import a Bluesky graph, publish an AT follow, or reveal their follow graph publicly. No friends-of-friends inference from private connections. Future recommendations can use opt-in public interests, public discussion participation and declared places/languages; avoid making ethnicity or institutional affiliation an inferred identity claim. Current suggestions are modest: followed visible participants first, then discoverable people ordered deterministically, not a social ranking algorithm.

Profiles use the Threads approach: identity/avatar area, short public biography/links eventually, follow/message actions and posts/replies. No banner required. This pass fixes actual profile lookup/feed pagination and reduces the DID to expandable technical identity. Display-name editing, biography/links/avatar lifecycle and a posts/replies/media tab set remain required polish, rather than claiming a complete social profile. DID is stable; a handle/display name is mutable. Do not expose private role, operator relationships or community membership just to decorate the profile.

Messaging search deliberately excludes self. Searching `giyaibo.bsky.social` while signed in as that account was not evidence the encrypted relay failed. Discoverable contacts must be another human with messaging activated and a currently readable conversation, or an existing DM peer; two-way blocking still applies. Search now accepts name/DID and an optional `@`. An invited newcomer with no visible post and no DM setup is not yet searchable. Existing MLS browser tests prove two independent synthetic browser participants can exchange actual encrypted messages; they do not constitute an independent security audit. Multi-device recovery, groups, attachments, interoperability and agent DMs remain absent.

## Explore, context, community and Spaces

| Object | What it answers | Visibility/access rule |
| --- | --- | --- |
| Context: place, region, language, topic | What is this conversation/knowledge about? | Public descriptive association, never admission authority |
| Community/space | Who can join this conversation? | Separate public/listed-private/hidden-private visibility and admission |
| Group/institution profile | Who maintains these spaces and public commitments? | Public landing page optional; role/membership protected separately |
| Person | Who is speaking? | Voluntary public identity; no inferred tribal/institutional affiliation |
| Deployment | Who controls this node's storage, policies and availability? | Operational boundary; moving one requires real export/import and authority transfer |

Explore should show real context tiles, communities, people in visible conversations and Wiki links. The earlier Honai mosaic is a useful visual structure, but its sample concerts, research and counters must not be presented as live ETNOS activity. Start with compact live sections and an honest small empty-context note. The former sidebar “all regions” control currently navigates rather than filtering; persist a clearly displayed context filter only after its scope works across feed/Explore/search. A context page already connects public posts, institution pages, knowledge and work. Context assignment remains explicit and reviewable. No GPS/IP or hidden membership-derived ethnicity clustering.

Local institution Spaces remain independent communities: group membership does not grant access to a hidden staff space. The official experimental AT Spaces work stays in the lab. Its two-PDS tests found an issued credential could still read immediately after removal for its remaining 600-second lifetime. Do not advertise instant private federated revocation or put sensitive Mee corpus collection there.

## Wiki and Aksara

The Wiki needs a clear compact index by title/language/place, real text comparison between revisions, provenance/citations, correction/contestation and editorial queues. Current restricted proposals and human exact-base/digest acceptance are real. Aksara may suggest a summary and propose links/revisions; a posting mandate does not grant editorial acceptance. No automatic conversion of ordinary conversation into canonical knowledge.

A first resident `@aksara` should be summoned intentionally in an eligible public thread. Give it an agent identity, disclosed human operator, limited communities, purpose, short-lived service credentials and posting budget. The server—not the model—checks authority at read, tool invocation and write time. Quote the evidence actually available to the request. Keep a duplicate-safe job record, timeout/cancellation and human stop control. Do not let a remote post grant tools, expose protected channels, act as someone else's credential, or widen context because the model requests it.

Existing posting/editorial/work mandate semantics are foundation, not a connected agent harness. Missing alpha integration: scoped machine authentication, verified mention parsing (including structured refs), job scheduling/idempotency, an Aksara adapter, model cost ceilings and an operator UI. Start public-only, low daily budget, respond-on-mention; no automatic reading of private communities or DMs. A helpful first task is answering a thread with cited public sources or proposing a Wiki draft. It should also be possible to enjoy ETNOS with the agent offline.

Mee-language preservation remains a community-governed future purpose. Community data can be administered as a collection, but forum participation is not blanket consent for research/training. Record chief/dewan adat stewardship, the speaker's applicable consent, purpose, export/withdrawal and individual restrictions. Public originals cannot be made confidential retroactively. This alpha is not a corpus collection launch.

## WPW integration: adapt its published outputs first

Reviewed `yohn-maistre/westpapua-watch` main at `658f55f6a5eeacdd2711a31b58140fb0e8d035c8`. The current source is more capable than its older planning README: `services/watch-engine` has ingest/extract/relevance, story packets, editorial leases/quality, clustering/partition, issue/place relations, current/weekly views, source registries, search, activity and resource APIs.

Its Worker uses D1, archive R2, queues/dead letters, scheduled Workflows, model routing and optional Vectorize/browser facilities. It is a separate deployment and cost envelope. Importing it into every forum would add those provisioning requirements and couple conversation availability to a newsroom pipeline. No WPW source or infrastructure was modified here.

Use an optional Watch adapter returning **only published developments**, with stable upstream ID, canonical story URL, title/summary language, places/topics, report time, source count and attributed image/rights where present. Read `/current`, `/development/:id`, `/issues`, `/places` and `/search` through a configured service binding or fixed allowlisted HTTPS endpoint. Keep credentials server-side and ingestion/admin routes unavailable through Strata. Apply bounded response size/timeouts, cache only public upstream data, and fail with a small unavailable state; a slow newsroom must never block posting/search.

On mobile: an optional compact News strip below the composer/primary content, a few horizontal story cards, and a clearly separate News category in search. Open the original dossier or start a local discussion linked to its stable source ID. Do not duplicate whole copyrighted articles or fabricate a news tab before the adapter returns actual data. A later `with-news` deployment preset can install a generic source adapter; WPW's Papuan editorial policy should not become mandatory for every institution or region.

## Content and current hard limits

| Content | Implemented limit/behavior |
| --- | --- |
| Post body | 20,000 JavaScript UTF-16 code units; a surrogate-pair emoji uses two. Not 20,000 grapheme clusters |
| Title / external URL / content warning | 180 / 2,048 / 160 code units |
| Rich text | Sanitized Markdown, titles, HTTPS links, collapsed long reading, warnings |
| Images | Four attachments/post; static, metadata-stripped WebP; 512 KiB each; max dimension 2,048 px |
| Browser image input | JPEG/PNG/WebP up to 12 MiB, then browser resizing/metadata stripping |
| Image quotas | 64 MiB total/node; 8 MiB per uploader/day; 64 uploads/day and 32/hour; 16 unattached drafts; drafts expire after 24 hours |
| Poll / event | 2–6 single-choice options, closes within 30 days; event dates/location and RSVP |
| Video | Click-to-load YouTube/Vimeo allowlisted embeds; no arbitrary iframe/autoplay fetch |
| Uploaded video/audio/files | Not implemented; no transcode, HLS pipeline, audio player or general file store |
| AT record | Draft custom Strata schema has its own 6,000-character validation boundary; do not confuse this with the local 20,000-body limit or Bluesky's app-specific schema |

Photon provides interaction patterns, not missing storage/codecs/media processing. Its Lemmy endpoints do not transparently operate against Strata.

**First likely alpha bottleneck is media policy, not twenty identities.** At 20 people × 3 photos/day × 250 KiB, image growth is about 14.65 MiB/day; a fresh 64 MiB cap lasts about 4.37 days, before existing media. Raise no cap blindly: put authorized private-bucket R2 storage behind the same read checks, verify ownership/cleanup/backup and quotas, then permit more generous posting. Do not make private image URLs publicly cacheable or bypass current membership with permanent links.

For a later tiny video experiment, bounded direct MP4 upload with supported codecs, MIME checks, range reads and explicit consent can work without on-server transcoding. It will not reliably accept every Android/iPhone source. A managed transcode/stream service is easier but adds cost. Prefer embeds for the first alpha and plainly say local video uploads are unavailable.

## Capacity and costs

Provider limits are ceilings, not an ETNOS benchmark. No real users were load-tested. A single Strata node is currently one serial transactional Durable Object; the platform's ability to create many objects does not automatically shard its authority. Cloudflare documents a soft 1,000 requests/s/object, explicitly workload-dependent. Do not advertise that as our throughput.

Prices checked against official product docs today:

| Product | Free allowance | Paid baseline / overage |
| --- | --- | --- |
| Workers | 100,000 requests/day, 10 ms CPU/invocation | Minimum $5/account/month; 10M requests and 30M CPU-ms/month included; then $0.30/M requests and $0.02/M CPU-ms |
| SQLite Durable Objects | 100,000 requests/day; 13,000 GB-s/day; 5M rows read/day; 100k rows written/day; 5GB account total | Includes 1M requests, 400k GB-s, 25B rows read and 50M rows written/month; storage 5GB-month included, then $0.20/GB-month; compute/row overages separate |
| DO database size | Current limits page has an inconsistent general 10GB row; its storage-full section specifies **1GB/object Free**, **10GB/object Paid** | Plan conservatively using the lower Free limit; validate actual account enforcement before growing |
| R2 Standard | 10GB-month, 1M Class A and 10M Class B operations/month; internet egress free | $0.015/GB-month; $4.50/M Class A, $0.36/M Class B beyond allowances; billing-unit rounding applies |
| Stream | No general free video allowance assumed | Storage purchased in $5/month blocks per 1,000 stored minutes; delivery $1/1,000 minutes |

The account's DNS “Free Website” label does not establish its Workers plan. Reading account subscriptions with this OAuth connector returned 403: no OAuth scope covers billing. No account subscription was changed. Therefore costs above are conditional; this record does not assert the account is on Workers Free. Allowances are shared with the owner's other Workers/services. R2 listing confirmed an existing westpapua-watch-archive bucket; R2 is enabled. Existing consumption and subscription billing still need verification; the included storage is shared with that archive.

Illustrative load only: 20 people × 100 page views/day × 7 API requests/view ≈ 14,000 API requests/day. HTML Worker invocations, refreshes, profile/follow queries, activity/DM polling, image reads and bots add to that. SQL queries are not the same as rows read, and one post can write many rows/index entries. Public anonymous readers mean traffic is not capped at twenty users. Restrict background polling to visible tabs; avoid an always-live process, high-cardinality telemetry or model invocation on every view.

A small text/image alpha can plausibly fit free allocations or the $5 Workers baseline, excluding models, news ingestion, domain renewals and optional storage/video services. That is a budget hypothesis, not a free-hosting guarantee. Use actual request/error/row/CPU/storage measurements, configured application limits, and a simple stop lever. On Free, exhausted operations fail; on Paid, alerts alone do not cap billing. WPW crawling/model usage and Aksara inference need independent budgets.

## Moving hosts or databases later

Keep SQLite for this cohort. Store large binaries separately first. A move from Cloudflare to a VPS can retain the same domain and API, with a qualified SQLite backup/import and media manifest plus credentials/secrets handled separately. Test transactional consistency and a full restore before changing DNS. Preserving origin also helps retain browser vault access.

The current `npm start` loopback server uses development bearer credentials and is **not a ready production replacement for the OAuth Worker**. A production server port needs HTTPS/reverse proxy, the browser OAuth/session adapter, egress policies, durable job execution, backups and the same authorization suite.

PostgreSQL is feasible but not a drop-in driver swap: the database port is synchronous, transactions use DO `transactionSync`, and queries use SQLite JSON/SQL constructs. Introduce asynchronous repository/unit-of-work boundaries, port the queries/migrations, preserve atomic business/outbox semantics, run access/replay/concurrency tests and rehearse export/import. Hyperdrive can solve connection pooling; it does not do that refactor. Do not add Neon/Supabase solely because SQLite sounds small.

A region/institution may eventually move into an independent node with its own custody, domain, enrollment and operational control. Plan stable origin/node identifiers, explicit authority handover, filtered export and redirect/link resolution. A context page is not a deployable database partition and cannot be “forked private” after its public posts have spread.

## Release checklist and evidence

| Area | Existing/current evidence | Still needed before calling the alpha ready |
| --- | --- | --- |
| Public reads / invited writes | OAuth and API tests; owner has used real preview login/posts | Second invited human end-to-end, no-invite denial, correct default community admission and enrollment removal |
| Profiles/search/following | New engine isolation/pagination tests and built-browser journeys | Editable biography/display name, optional avatar, full results paging/Unicode quality |
| Media/content/moderation | Synthetic built-browser and workerd tests for images, long text, polls/events, replies, edit/delete/lock/report | R2 or explicitly temporary tight image policy, reported-spam/site suspension/recovery and alpha moderator assignment |
| Messages | Real MLS in two independent synthetic browser clients, requests/acceptance/blocking and encrypted restart | Second real-user device test; origin continuity/recovery decision; no activist-safety certification implied |
| Wiki | Proposal/base/digest/human review and visible revision history in browser tests | Compact discovery, useful revision diff/correction controls and editorial owner |
| AT Spaces | Isolated two-PDS protocol lab, 14 checks | Live interoperability and revocation semantics qualification; do not use for sensitive alpha data |
| Hosting | Current Worker/SQLite schema tests, build and mobile/tablet/desktop checks | Domain routing/origin continuity, backup/restore rehearsal, measured budget/error visibility, incident rollback procedure |
| Aksara / WPW | Mandate models and inspected upstream APIs | Real authenticated adapters, bounded jobs/costs, useful agent profile; no live integration claimed |

The existing four browser journeys cover forum/media/wiki, groups/context/work/activity, independent-client encrypted DMs and rich-post lifecycle. A fifth checks unified search, keyboard selection/focus return, author profiles beyond the home page, following feed and appearance persistence at 390/768/1440px. Local browser fixtures use isolated synthetic SQLite state; they do not seed hosted accounts or publish real AT records. Public-route screenshots are smoke checks, not all authenticated workflows. Actual phone keyboard, screen-reader behavior, twenty-human concurrency, disaster recovery and model/remote protocol integration are not inferred from viewport screenshots.

Sequence: finish and verify the current search/profile/follow/discovery polish; resolve domain continuity and backup; onboard two real invited testers; then admit the remaining cohort. WPW/Aksara can be separately enabled once their adapters pass. It is better to label a useful alpha precisely than ask twenty friends to trust a feature list that hides these gaps.

## Sources and implementation references

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) — product page says 5M Free rows read/day; a marketing comparison differed. Use the product figure conservatively.
- [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Stream pricing](https://developers.cloudflare.com/stream/pricing/)
- [AT protocol overview](https://atproto.com/guides/overview), [OAuth](https://atproto.com/specs/oauth), [PDS](https://github.com/bluesky-social/pds)
- Local code reviewed: `src/core.ts`, `api.ts`, `oauth.ts`, `web-worker.ts`, `dm.ts`, `search.ts`, `schema.ts`; Honai App, MessagingPage, appearance, Explore and browser tests.
- [Forum-first decision](decision-003-forum-first-alpha.md), [custody research](research/2026-11-01-community-language-custody.md), [client/deployment boundary](client-deployment-contract.md).
