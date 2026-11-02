# ETNOS commons implementation, 3 November 2026

This implements the next-phase assessment and the final S.space reference pass. The public square remains usable without an agent. Aksara execution, PDS hosting and private institutional custody remain distinct services/authorities. This is an alpha refinement, not general production qualification.

## Delivered behavior

- Five primary destinations, with account utilities separately accessible. Rooms and organizations share a directory while keeping their existing IDs and different membership/authority models.
- Home offers one, two or three feeds through a small layout control; `/board` remains usable. Workspace headers, toolbars and feed scrollers have separate layout rows. Thin, restrained scrollbars retain hover/focus visibility. Mobile navigation closes after route changes and supports touch dismissal through the existing focus-trapped Sheet.
- Explore presents three news stories and links to a full `/news` index. The fixed WPW port forwards only validated desk/place/page/limit controls, preserves paging metadata and separates edge cache keys. Photos pin their selected URL digest so a feed credit cannot silently accompany another article's image. Suara Papua is an approved host, but source HTTP 403 responses remain an availability limit; failed images collapse cleanly.
- Focused reply routes fetch the chosen branch. A bounded recursive SQL selection preserves current root/community visibility before projection and pagination. The reader previews a child reply, exposes expansion, and moves deeper branches to their own route. Mobile reply submission uses an accessible arrow control.
- A lazy-loaded Tiptap editor supports expanded posts and wiki proposals. Advanced existing Markdown stays in source mode to avoid silent normalization. Markdown remains canonical for this slice; inline media has an explicit version-1 manifest of attached media IDs. Images are rendered only from matching authorized attachments, never arbitrary editor URLs. The existing image re-encoder and full-screen viewer remain in use.
- Approved external publishers can provide bounded title/description/cover previews. The port is HTTPS/host-restricted, strips irrelevant query parameters, follows no redirects, forwards no user credentials, bounds HTML/cover reads, and rejects HTML/SVG disguised as images. Generic remote previews are disabled for protected posts. Unsupported sources remain ordinary links. Video providers retain cover/title display and explicit player activation.
- Profiles support optional bio, HTTPS website and location. These fields do not establish ethnicity, residence, institutional verification or community access. Existing profile visibility checks still apply; creating a profile does not add someone to public discovery.
- Wiki creation combines title and actual draft in one atomic, optionally idempotent request. New initial drafts are absent from anonymous reads, listings, search and history routes until accepted. Authors and currently authorized reviewers see the appropriate working state. Review compares current and proposed text, retains exact digest/base checks, and exposes history and a compact page-contents popover. The atlas uses real context links and eligible page lists rather than inferred cultural categories.
- Optional contributor/reviewer group restrictions are additional to community permissions. Binding a group requires group steward rights. Submission, review and review notifications recheck current membership. Policy IDs are available to community stewards, not ordinary public readers. Human acceptance remains required.
- Suara komunitas discovers actual open/closed forum polls and published, source-linked sponsored work results. It is reachable from Explore and community pages. Forum choices remain actor-linked opt-in responses; the interface does not claim representative opinion or secret ballots. Public threads can link to sponsored work and start a restricted wiki draft with an explicit public source citation.

## API additions and changes

| Route | Contract |
| --- | --- |
| `GET /v1/news?desk=land&place=…&page=2&limit=12` | Public filtered news. Desks: focus/all/rights/land/politics/regional; limit 6–24; bounded page/slug; unrelated parameters are not forwarded. |
| `GET /v1/news/:id/image?asset=…` | Only the approved image with the exact selected digest; no arbitrary image URL parameter. |
| `GET /v1/link-preview[ /image ]?url=…` | Same-origin preview/cover for the explicitly supported public publisher set. No arbitrary host proxy. |
| `GET /v1/posts/:id/replies` | Root ID returns the conversation; a reply ID returns that reply's descendants. Cursor paging remains available. |
| `GET /v1/feed/page?polls=true` | Permission-filtered poll discovery before limit/paging. |
| `POST /v1/profile` | The authenticated human's optional bio/website/location only; caller-supplied actor/authority fields are rejected. |
| `POST /v1/communities/:id/wiki` with `draft` | Atomically creates a restricted initial draft/proposal. Optional stable `requestKey` makes the same creation replay idempotent and rejects changed content under that key. Existing title-only API remains compatible. |
| `GET, POST /v1/communities/:id/wiki-policy` | Community steward settings; optional contributor/reviewer group IDs, each additionally steward-bound when configured. |

Schema **16** adds `wiki_pages.draft`, `wiki_policies`, `wiki_requests` and `actor_profiles`. It is a forward, additive migration. Existing community IDs, post IDs, memberships, media, follows, encrypted-message state and outbox history are retained. Do not roll back to a host that refuses schema 16 after the migration has run; use a compatible forward fix or a separately qualified restore.

## What this does not claim

There is no new resident model runtime, automatic multi-agent dispatcher, arbitrary embedded-app execution, hosted PDS signup, live AT publishing, Git-backed live wiki, real-time multi-user document editing, inline review comments, secret ballot or fully versioned institutional consultation protocol. The shared-result UI builds on existing sponsored PublicWork and accepted wiki revisions. More complete consultation/report versions and consent methods require a separate qualified contract. Nothing treats posting as permission to export a language corpus or train a model.

Open Social Groups/Spaces remains a pinned synthetic lab. Existing revocation/expiry and hosting-trust caveats still apply. Useful later upstream work includes reproducible multi-PDS revocation and succession tests; no upstream contact or private-data migration is part of this interface release.

## Verification and release gates

- [x] Engine type checks and access/lifecycle tests, including new draft invisibility, atomic rollback/replay, editorial-group revocation/activity, profile restrictions, scoped inline images and bounded preview ports.
- [x] Actual workerd storage/isolation/restart contract and web Worker outbound tests, including cache-key separation and absence of forwarded forum credentials.
- [x] UI type checks and native tests; expanded editor loaded separately from ordinary reading.
- [x] New isolated browser journey: wiki draft/acceptance, profile edit, inline image/viewer, deep branch, news filters/paging, Home columns, drawer navigation/dismissal and screenshots.
- [ ] Complete the full frozen-build browser regression suite and visual review.
- [ ] Commit source, deploy the exact reviewed artifact with existing namespace/secrets/origin, then verify production through anonymous read-only requests and screenshots.

The deployment receipt records final source IDs, checks, artifact sizes/hash, version and remaining limits after those gates complete. Synthetic people, posts and sources stay in loopback test fixtures and are never seeded into the public node.
