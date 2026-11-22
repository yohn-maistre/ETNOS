# ETNOS next phase: verified findings and proposed design

3 November 2026, Asia/Bangkok (2 November UTC). Research and planning only. No UI/runtime change, deployment, schema migration, PDS provisioning or public publication in this pass. This extends Decision 002 and the existing wiki/engagement notes; it does not replace their authority boundaries.

## Outcome

Keep the product understandable as a public square, a community directory and a knowledge atlas. News has a complete listing and native story readers; Explore carries a small selection. Lajur becomes an optional Home layout. Preserve separate backend concepts for regions, institutions, discussion rooms, PDS hosting and institutional custody even when their navigation is consolidated.

Proposed primary navigation: **Beranda, Jelajah, Komunitas, Wiki, Pesan**. Activity belongs at the bell; saved posts and settings remain available from the account menu. Public work and consultations are reachable through Explore and the sponsoring group's pages. Keep direct URLs and useful redirects when removing navigation entries.

## Verified evidence

### News photos and listing

A read-only comparison of the current ETNOS and WPW 12-item feeds found the same story IDs. WPW supplied an image for all 12. ETNOS supplied seven and omitted five: 1149, 1153, 1154, 1155 and 1150. All five omitted images were on `suarapapua.com`, which is absent from `src/news.ts`'s approved image-host list. The other seven ETNOS image endpoints returned HTTP 200 JPEG, about 12–267 KB. This establishes the cause of this sample, not all historical image failures.

Next change: audit and admit the specific publisher/image host; retain HTTPS, host, redirect, size, MIME and publication/rights checks. Do not turn the endpoint into an arbitrary URL proxy. Match the selected image and credit consistently between feed, detail and proxy: the feed currently projects WPW's chosen image, while the image endpoint independently selects an eligible article image. Add useful fallback/diagnostics when a source image fails. Attribution labels are not a blanket copyright license.

WPW already supports `desk`, `place`, `page` and `limit` (6–24), filtering and ordering before pagination, with `place_options`, total and next-page metadata. Its desks are focus, rights, land, politics, regional and all. Focus uses a dated relevance shelf; other desks order by recency. ETNOS currently requests a fixed 12-item feed and drops these controls. A real news index needs a validated query adapter and normalized cache keys, not client-only filters on those first 12 items. Do not label a ranking "trending" without the corresponding signal.

Design: Explore shows three or four stories, a modest photo lead and compact secondary cards, plus “Lihat semua.” `/news` supplies the full index with the supported desk/place controls and paging; retain `/news/:id` for native reading and related discussions. Reuse WPW's published clusters and summaries, with source attribution. No second summarization/clustering service is necessary for this step. Do not copy full third-party articles merely because the source page is accessible.

The small map already uses Natural Earth coastline data. Improve that SVG with restrained land/water texture, coastline contrast, readable labels and markers, and captions explaining that these are places mentioned in reporting rather than exact incident coordinates. Keep a textual place list. A larger optional map can be lazy-loaded later; decorative texture must not pretend to be terrain or settle customary boundaries.

### Mobile navigation and board layout

Read-only live Chromium checks at 390×844 reproduced Settings navigation from Explore: the URL became `/preferences` while the “Navigasi” dialog stayed open. The equivalent Komunitas action reached `/communities` and closed the dialog. Source inspection also found missing close handling on the brand link and compose action; those two were not independently exercised in this check. Prefer one navigation/action lifecycle rule over scattered per-link close handlers. Close navigation before opening a different modal; preserve focus and same-page-link behavior.

Current mobile navigation is a Bits UI Sheet. A drag-aware shadcn-svelte Drawer, based on Vaul Svelte, is a candidate replacement for the presentation layer. The official examples use `vaul-svelte@next`: pin and test the actual version rather than assuming stable compatibility. Start with finger-following dismissal of an open drawer. Retain Escape, close button, focus management, scroll locking, reduced motion and touch targets. Do not capture the operating system's back gesture.

At desktop 1440×960, the live board had a centered 640px header over a 920px board, 752px inner feed scrollers and a 1035px document. The narrow reading header and viewport-derived column heights create competing scroll owners; the supplied three-column screenshot also shows a partial column/frame. Fix workspace layout sizing, not just border radii. Header and toolbar need their own aligned rows; use a viewport grid with `min-height:0` scroll regions instead of arbitrary height subtraction. Fit the selected columns or deliberately expose horizontal navigation with inset edges; never accidentally clip controls.

Use thin transparent-track scrollbars that become clearer on hover, keyboard focus or active scroll, with a small discoverability cue. Respect forced-colors and operating-system scrollbar preferences. Scope styles to actual scrollers; do not rely on unsupported universal opacity animation of scrollbar pseudo-elements. Avoid fully hiding the only indication of off-screen columns.

### Existing content and wiki limits

Photon's `PostMedia.svelte` and `PostLink.svelte` already provide useful image/video/link/poll/event presentation patterns. They receive `thumbnail_url`, `embed_title`, `embed_description` and provider metadata from the backend. Copying only those components cannot generate missing metadata in ETNOS. Reuse attributed code only where suitable, while adapting the component boundary and authorization to ETNOS.

Current local posts allow 20,000 JavaScript string units; the current public-export-associated path caps at 6,000. These are ETNOS application limits, not universal AT/Bluesky limits. Existing uploaded images are scoped attachments below text. The Markdown renderer deliberately excludes raw images/HTML media. Inline media needs a versioned content schema and authorized rendering, not only a richer textarea.

The current wiki is public knowledge only: steward-created page identities, member proposals, human steward acceptance, immutable accepted revisions, digest/base checks, citations, language and perspective. Proposals are visible to their author and authorized stewards, not a public PR discussion. Group-specific contributor/reviewer policies and review discussion are future work. The present create flow exposes a title-only page before an accepted revision; the screenshots show that empty state accurately. A better draft/publication lifecycle needs backend policy as well as new UI.

## Navigation, directory and Home layouts

One Komunitas directory can offer Ruang, Organisasi and Diikuti tabs. Preserve the difference: an institution/group is a durable collective identity with its own authority; a room/community is a conversation audience. A group can organize several rooms; a standalone hobby room remains valid. Joining one group must not silently admit someone to all its rooms or give a moderator institution-wide authority. Improve landing pages with real descriptions, scope/languages, current public activity and clear join controls; avoid oversized empty cards or invented activity/member counts.

Home gets a compact reading/split/columns control. Default to one feed. On a wide screen, allow the contextual rail to become another chosen feed; show up to three readable columns only when width supports them. Context/news/feed can be explicit rail modes. Keep `/board` as a compatible entry point. On mobile, use one active feed and clear peer tabs.

Do not swipe through every unrelated page globally. That conflicts with browser back, text selection, media carousels, horizontal tabs and the board. Trial horizontal swipes only between peer feeds, ignore interactive/scrollable descendants, and preserve position. Main destinations remain explicit navigation controls.

## Threads and media

The Threads references support a lighter thread reader: compact action row, curved parent-child connectors, author continuations, a few useful child replies, an explicit expansion action and a short mobile composer. Replace the reply submit label with an accessible arrow button with a generous target. Keep the compact dock above the safe area and keyboard; it must not cover the final reply. Desktop can retain a composer immediately below the parent post.

Current recursive replies render every child initially; visual depth is capped but data recursion continues. Start with one or two direct child previews, then “Lihat N balasan.” At roughly two visual nesting levels, offer a focused conversation route with its parent context and paginated descendants. Existing `/square/:replyId` currently resolves to the root and scrolls to the selected item; it is not yet a focused branch reader. New branch fetching must retain visibility, deleted/moderated-parent handling, sort and return anchors. Do not invent view counts or rank “best” replies without an honest, explicit rule.

For media, standardize aspect handling, cover/title/source/description, warnings, loading/failure states and full-screen gallery captions. Video covers and titles are visible during composition and scrolling; only pressing play creates a player. No autoplay or background video buffering is requested. Existing browser image compression is useful for ordinary attachments; never silently use it for protected archival originals.

Generic external previews need a separately qualified server fetch port: allowlisted integrations first, bounded MIME/bytes/time/redirects, private-network/DNS/credential controls and sanitized metadata. No arbitrary HTML/iframe execution, no browsing private internal URLs on a user's behalf, and no private link disclosures to a third-party preview service. Use cover images through the appropriate approved proxy.

## Editor and knowledge atlas

Preferred editor foundation: **Tiptap/ProseMirror with our Svelte/shadcn chrome**. Its official Svelte integration and MIT core fit the current application. Evaluate **Edra's individual Svelte components** as an accelerator: its `next` package and license verify Svelte 5, Tiptap and MIT, but adopting its entire dependency tree or claiming production qualification requires a spike. **Milkdown/Crepe** is the strongest Markdown-first alternative. **BlockNote's ready-made UI is React-oriented**, making it a less natural fit here.

Keep short posting simple; lazy-load the expanded long-post/wiki editor with headings, lists, quotes, inline images, captions and source links. Store one versioned, allowlisted canonical document model, with scoped `{mediaId,alt,caption}` references and derived text/search/Markdown or AT projections. Preserve existing plain/Markdown posts. Never trust an arbitrary editor `src` as authority to fetch private media. Tiptap's Markdown extension is described as early release; test round trips and unsupported constructs instead of promising lossless conversion. Test Android composition/selection, Mee diacritics, pasting, keyboard navigation, accessible controls and payload bounds. Paid Tiptap history/comments/collaboration are not required to keep our own review model.

Retain ETNOS's review engine. A Git server or another whole wiki platform would duplicate storage/auth/deployment concerns. Optional Git export is for accepted public revisions plus provenance manifests, not private originals or the live permissions database. Yjs can support simultaneous drafts later; CRDT convergence does not implement review, consent or revocation.

The wiki entry becomes a **knowledge atlas** with overlapping places, history, languages, biodiversity and community-approved cultural categories. Use actual pages below those lenses, related-page links, optional spatial/timeline views and a list alternative. A reader gets calm typography, sources, related knowledge, discussion and “Usulkan perubahan.” Long pages use an on-page contents popover; history/diff/review opens a dedicated view or sheet, without another permanent sidebar.

Create a page with title and an actual draft in one flow; clearly mark pending drafts and publish only accepted material. Make reviewer-group policy, exact base/content review and stale-change reconciliation explicit. Hide advanced metadata until needed, offer useful language defaults and explain perspective/attribution. Public, steward-approved oral-history attribution can coexist with a restricted recording held elsewhere. Do not demand a public URL for every knowledge tradition or leak a private source ID/existence in a public citation. This is an extension to source types, not a reason to bypass current restrictions.

## Engagement, including Wisevoter and Polis

Use the visible loop **context → approved question → participation → report → sponsor response/action**. Context may be a WPW story, wiki page, community concern or public-work item. Casual forum polls stay lightweight posts. A civic consultation adds an explicit sponsor, purpose, audience/eligibility, language versions, close date, frozen question version and privacy/report plan. One canonical question can be embedded on several relevant surfaces without double-counting submissions.

Place one relevant question after a story/page, a few open questions in Explore, and a reachable question library with Open, Reports and Responses views. Start through those links and group tabs rather than another primary sidebar item. A report exposes wording, dates, response counts, collection channels and limits; the sponsoring body publishes its response and linked work. Aksara may draft translations and evidence-linked reports, but humans approve wording/publication. No automatic conversion of private conversations into survey answers or training data.

Wisevoter is a useful interaction reference, not verified evidence of representative sampling or fraud resistance. Current ETNOS poll choices are actor-linked in service storage: they are neither secret ballots nor one-human-one-vote. Report opt-in participant responses, not “Papuan public opinion.” Avoid exposing respondent lists and sensitive small-group breakdowns. Polis is a later optional adapter for statement submission and agree/disagree/pass, surfacing areas of agreement without treating opinion clusters as ethnic/demographic categories.

## Regions, PDS hosting and admission

Keep four questions separate: where an account's PDS is hosted; which regional context someone is browsing; which community they can enter; where protected sources/traces reside. A region does not need its own PDS or database. A PDS handle is not evidence of residence, ethnicity, institutional role or authority.

Use stable region/context IDs with typed relationships and overlapping cultural/administrative areas. Support several affiliations and locally reviewed names rather than one compulsory territory tree. Public context links can mean “about” or “declared coverage”; they do not reveal a person's private affiliation. A regional deployment appears in the dropdown after an explicit trusted registration/discovery decision, not whenever an arbitrary PDS appears online. Network views aggregate eligible, selected regional data; global firehose ingestion is not a prerequisite.

Papua can be our hosted service's focus. Other groups can run an Aksara node, a PDS, an ETNOS authority/index, or a combination. Shared hardware is optional packaging, with separate keys, scoped agent credentials, recovery and exports. A device that is off cannot serve a reliable PDS without another availability arrangement. Running all services on one host does not isolate them from a compromised host administrator. The core engine and Svelte UI are already separate builds/repositories; genuinely third-party web clients still need a qualified scoped API/auth contract.

New official Open Social Groups work closely matches this model: a group has a DID, roles, landing-page identity and multiple permissioned Spaces; administrators can act through delegated authority without a shared account password. Per-member records can remain on different PDSes; the group's authority is not automatically the store for all members' data. Strict community custody therefore requires an explicit hosting/authority design, not just naming a Space.

The 28 October official vision still says Spaces has weekly breaking changes. It is access control, not E2EE. Our existing synthetic Spaces report also records a removed member's previously issued credential remaining usable until revocation/expiry (600-second lifetime); new credentials were denied. Continue a pinned adapter/lab, with denial, host trust, expiry/revocation, outages, migration and app-scope tests. Do not migrate real protected community sources or people's primary accounts on the strength of a successful fixture.

Current selected access remains public reading and invited posting. A login wall can reduce casual exposure but does not verify a human, prevent screenshots or stop an admitted scraper. If adopted later it must gate APIs, images, search and previews too. Prefer invitations/vouching, proportionate probation/rate limits, block/report tools and revocable participation for this alpha, alongside genuinely restricted rooms. Avoid compulsory legal-name or ethnicity disclosure. AT users can control multiple DIDs; authentication is not one-person-one-account.

## Proposed implementation order

1. Repair known defects: mobile close lifecycle, board header/sizing, restrained scrollbars, reply arrow, audited image-host gap and coherent image selection/credit.
2. Consolidate navigation, Home layouts, directory tabs and compact Explore; add the real paginated news index.
3. Focused thread branches and composer behavior; safe reusable media/preview components; a small shared editor spike before choosing the persisted inline-content schema.
4. Wiki draft/review/read flows, appropriate contributor/reviewer policy and a small sourced knowledge atlas; then the sponsor-approved question/report/response loop.
5. Regional trust/discovery and replaceable Group DID/Spaces interoperability, retaining the qualified local authority boundaries.

No new database, vector model, real-time collaboration server or always-on ML service is needed for the first two steps. Later editor/consultation/group changes may require explicit schema migrations and new access-boundary tests. Measure their payload/CPU/storage costs rather than inferring them from UI library marketing.

## Final reference pass: S.space and mobile examples

The owner explicitly wants continued Open Social Groups experimentation and possible later contributions upstream. Keep that work in the pinned, synthetic interoperability lab; it does not depend on adopting S.space. Useful prospective contributions include reproducible multi-PDS membership/revocation tests, group administrator succession and clearer app-authority examples. Inspect the upstream contribution process and reproduce a concrete issue before proposing a patch. No upstream message, issue or contribution was sent in this pass.

S.space was investigated through Exa searches and its public product documentation, with canonical documentation links checked from the live site. This is a documented-feature assessment, not an authenticated product test, source-code review or security audit. Search results include old AG2 Space branding and older paths; canonical current pages live under `/docs/`. The root app initially exposes a loading/sign-in surface to public extraction. Four searches requested 21 search results, with substantial duplicate coverage; that is not 21 independently verified sources.

| Documented S.space feature | Useful ETNOS adaptation |
| --- | --- |
| Rooms contain humans and explicitly invited agents; Spaces organize rooms | Keep human and agent membership explicit. Expose organizational/group navigation without granting an operator's agent automatic access to every room. |
| Commons opens beside chat and contains shared docs, whiteboards, HTML, PDFs, sheets and databases | A conversation can open a durable wiki draft, report or project beside it. Start with our actual document/report/work types, not the full set of embedded apps. |
| @mentions acknowledge pickup and show which agents are waiting or have taken work | Add bounded task receipts: queued, accepted, running, waiting, needs review, completed, failed/cancelled. Tie each displayed state to a real event; acceptance is not completion. |
| Per-room, per-agent invocation/response controls and separate room sessions | Give an agent profile an operator, scope and active mandate, plus understandable controls for who may request which actions. Keep context sessions separated by authority; that separation also needs enforced data/tool access. |
| Local Sutando engine/gateway; web/mobile clients reach it through the service; optional cloud agents | Aksara remains the execution runtime. ETNOS can carry admitted requests/results while a device or explicitly chosen server does the work. The PDS remains an identity/data service, not the execution engine. |
| Other-app agents connect through MCP and individual linking | Preserve an engine/API-first approach. Later provide narrowly scoped MCP/CLI access using the same permission and task contracts as the UI; do not require every participant to install our agent runtime. |
| Optional room templates, room apps and visible runtime/usage state | Offer a few purpose-specific community presets and quiet agent status. Keep ordinary discussion useful without an agent; advanced work surfaces stay optional. |

The room docs describe invocation defaults (other members cannot invoke an agent by default), role-like collaborator controls, per-room response rules and configurable sessions. Those are product design references, not evidence that their policy implementation satisfies ETNOS's custody requirements. In ETNOS, tool grants need current host-enforced authorization. Natural-language room instructions, an LLM sensitive-data filter, or an agent's membership are not sufficient authority to read protected sources or use an operator's credentials. Agent-to-agent handoffs must preserve the original requester, audience, scope, budget and cancellation state, without treating another agent's output as an instruction from the operator. Do not start autonomous multi-agent reply loops from every mention.

Their runtime docs describe local workspace files and Keychain credentials, server-carried room messages, provider-processed model requests and Google-processed voice. Thus local execution alone does not imply all data stays local. ETNOS should describe each actual processing path and route protected work through Aksara's current source/tool grants. A visible public task status must not reveal a private source, prompt, tool response or reason for denial. Give the authorized operator a separate detailed activity view; never expose raw reasoning traces as a public progress feature.

**Git backing was not verified.** The public docs establish shared, simultaneously edited Commons surfaces, local agent workspace files and a GitHub PR-board integration. None establishes Git as Commons' authoritative storage, branch/merge semantics or its review protocol. Search also found the separate `commons.diy` product's repository contribution docs; no relationship to S.space was established, so its Git features are not attributed to S.space. Our Git decision remains unchanged: reviewed revisions in ETNOS, optional public Git export, and a separate repository adapter only when a real code/research project needs it.

Likewise, S.space's product term “Space” does not establish AT Permissioned Spaces/Open Social Groups interoperability. Keep a future verified Group DID binding explicit rather than equating similarly named concepts.

The strongest addition to the implementation plan is a **durable result linked to its source conversation**: a thread can produce a draft, reviewed wiki revision, consultation report or sponsored work result. The result has its own ID, version, audience, author/operator attribution and approval state. Opening it beside the thread is a presentation choice, not copying it into a public feed. An expandable work card can point to the canonical artifact and limited progress receipts. Shared working drafts and accepted public knowledge are different publication states; live collaborative edits must not silently change an accepted wiki revision.

For the first implementation, extend existing PublicWork/editorial proposal concepts where their semantics fit rather than create an unrelated task platform. A generic multi-agent task protocol needs an explicit later contract: scoped requests, durable IDs/idempotency, results, receipts, expiry, bounded retries, cancellations and reconciliation. Use the existing transactional outbox pattern for admitted deliveries and keep remote side effects separate from claiming success. Plain forum mentions can still be conversational without automatically becoming institutional work.

The new mobile screenshots reinforce these presentation choices:

- News/topic reader: concise summary with expansion, visible sources/review status, then related discussion sorted by an honest available rule. Do not reproduce screenshot story claims or invent popularity/view metrics.
- Discovery: compact rows with short descriptions and actual eligible activity, alongside a few image tiles. Participant avatars/counts must reflect publicly eligible records, not reveal private membership.
- Community home: a small recent/joined-room shelf and contextual room attribution on posts. Organize rather than add another permanent navigation layer.
- Mobile drawer: a clear account block, readable compact labels, restrained active state and a footer for account/settings/help. It must close after navigation and support the planned drag interaction.
- Profile: strong avatar/name/handle/bio hierarchy, follow counts and focused content tabs; keep banners optional rather than require another media asset. Location, affiliation and external links are explicit profile disclosures, never inferred from the regional lens.

Primary S.space references: [Rooms, agent policies and Commons](https://docs.s.space/docs/rooms), [runtime and data paths](https://docs.s.space/docs/how-it-works), [agents from other apps and MCP](https://docs.s.space/docs/other-agents), [Commons surface tour](https://docs.s.space/tour), and [public product demo](https://start.s.space/). The demo is product positioning, not independent evidence that every shown integration is qualified. No signup, desktop installation, app integration or private-room access was performed.

## Sources and qualification

Local sources inspected: `src/news.ts`, `src/wiki.ts`, `src/post-content.ts`, `docs/decisions/decision-002-groups-knowledge-and-regional-surfaces.md`, `docs/accounts-and-hosting/client-deployment-contract.md`, `docs/product/wiki-and-community-engagement-2026-11-03.md`; Honai `ShellContent.svelte`, sidebar Sheet, `FeedBoard.svelte`, `ThreadBranch.svelte`, `NewsMap.svelte`, board/topbar CSS and Photon media components; WPW `news-read.ts` and `shared/news-desk.ts`. Evidence from read-only production requests and anonymous Chromium checks, plus the owner's supplied screenshots. No authenticated private data was accessed or changed.

Primary external references inspected in this and the preceding wiki research:

- https://atproto.com/specs/repository — ordinary repository/public data boundary.
- https://atproto.com/specs/account — identity and account portability.
- https://docs.bsky.app/docs/advanced-guides/federation-architecture — distinct PDS, relay and App View roles.
- https://atproto.com/blog/atproto-spaces-alpha — alpha qualification and permissioned-data boundaries.
- https://atproto.com/blog/atmospheric-groups-intro — group DID, roles, Spaces and distributed records.
- https://atproto.com/blog/devex-goals-for-spaces — developer goals and evolving modalities.
- https://atproto.com/blog/open-social-groups-vision — collective identity, administration prototypes and weekly breaking changes as of 28 October.
- https://shadcn-svelte.com/docs/components/drawer — directional Drawer, Vaul Svelte integration and current example package.
- https://tiptap.dev/docs/editor/getting-started/install/svelte — official Svelte integration.
- https://tiptap.dev/docs/editor/markdown — Markdown extension and early-release caveat.
- https://github.com/Tsuzat/Edra/blob/next/package.json and https://github.com/Tsuzat/Edra/blob/next/LICENSE — direct Svelte 5/Tiptap dependency and MIT checks; not a runtime or security audit.
- https://milkdown.dev/docs/api/crepe and https://milkdown.dev/docs/guide/using-crepe — Markdown-first editor/feature configuration.
- https://www.blocknotejs.org/docs/react/overview — React UI integration.
- https://docs.yjs.dev/ — optional collaborative editing substrate.
- https://wisevoter.com/ — contextual question/product reference; methodology not qualified.
- https://compdemocracy.org/Polis/ — deliberation/agree-disagree-pass reference.
