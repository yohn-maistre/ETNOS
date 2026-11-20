# ETNOS commons delivery — 3 November 2026

Live alpha: https://etnos.space. This is the implementation of the [next-phase assessment](../research/2026-11-03-etnos-next-phase.md), with [API and permission details](commons-next-implementation.md).

## Source and exact deployment

- Engine: `0f722ef87b94c879100466cb7716accf8e174f50`, `feat/connected-oauth`.
- Connected UI: `f33d5f0cd28424344e28f842b46daa085bf37134` on `feat/strata-connected`; the main interface change is `920dd3569cee3b1d679b61d564d22c0ac22ef3e4`.
- Worker `strata-preview`, canonical origin `https://etnos.space`.
- Final version: `35dd37e4-7045-4ed2-9c88-51a37141bdc5`, 100% in deployment `a3d2fb07-f8c8-4443-85e0-77b8ad1f2081`, uploaded 2026-11-03 06:57:21 UTC / 3 November 13:57:21 Bangkok.
- Worker artifact: 2,886,429 bytes, SHA-256 `308e15f786cfa608527bf43e9cfd5122b874d8c3ececfeeb56aa08d203d5f876`; compressed upload reported 769.18 KiB. Reported startup 129 ms is a deployment observation, not a user-traffic benchmark.
- Final static manifest: 39 files, 2,247,918 bytes. Expanded document editing is a separate 471.55 kB / 149.66 kB gzip chunk; ordinary reading does not load that editor. The main bundle is about 697.5 kB / 205.6 kB gzip; further splitting is still useful.

The existing logical node, Durable Object namespace, `v1` class migration tag, OAuth/seal secrets, WPW production service binding, compatibility date/flags and canonical/legacy origin behavior were preserved. Schema **16** is an additive application migration. No new R2 bucket, database service, resident model, paid service, account migration or live AT broadcast was introduced. Public reading and invited AT participation remain the policy.

After schema 16 is used, an older host that refuses it is not a valid direct rollback. Use a compatible forward fix or a separately qualified restore. The mobile/profile and final texture/headline follow-ups use the same engine artifact as the initial commons deployment. Engine CI and the final UI build/lint CI are green. Phone Lajur uses configurable feed tabs and normal page scrolling; desktop lanes retain independent scrollers. Duplicate inner Back arrows are removed. Peer-feed/global swipe navigation is still a design proposal, not a shipped interaction.

## Delivered behavior

Core social pages and utilities in one scrolling navigation list, a bottom-right Menu control and a shared room/organization directory; one/two/three-feed Home layouts; correctly separated workspace header/toolbar/scrollers; thin scrollbars; mobile drawer dismissal and route closing; three Explore news items with a full filtered/paged news index; exact selected-photo/credit pairing; focused reply branches and an immediate reply composer with arrow submission; expanded Markdown editing with scoped inline attachments and the existing image viewer; bounded public publisher previews; a textured profile header with grouped actions and optional bio/site/location; a wiki atlas with atomic initial drafts, comparison/history/contents, human acceptance and optional contributor/reviewer groups; and Suara komunitas for existing polls and source-linked PublicWork reports/follow-through. Serat is the fresh-state default; saved texture preferences remain in use.

Private initial wiki drafts are absent from anonymous reads, listings, search and history. Group restrictions add to community rights and are rechecked for proposals, review and review notifications. Inline image IDs must belong to the same attached post. Profile fields do not grant discovery or membership. Forum polls remain opt-in, actor-linked responses; they are neither representative surveys nor secret ballots.

Video cards show title and cover and activate a player only on explicit Play. Existing metadata-stripping image re-encoding and bounded storage remain in use. Public metadata ports send no forum credentials and follow no redirects; unsupported publishers remain links. News uses bounded WPW summaries and original-source links, not an unrestricted full-article mirror.

## Verification

- 81 engine tests, TypeScript checks, generated Worker types, and actual workerd storage/access/restart and web Worker outbound/cache contracts pass.
- Five UI tests, zero Svelte errors/warnings, ESLint and the production build pass. The nine-journey commons baseline passed across posting, governance, messaging, rich content, discovery, dialogs, polish, native news and the commons journey. The later mobile/profile pass adds a tenth registered journey and re-runs the affected commons, native-news/video, governance and rich-content journeys. The final small texture/headline change also passes the polish journey. Its new checks cover one drawer scroller, bottom Menu access, normal phone feed scrolling, overlay-only video titles, Serat default/saved-choice retention, one Back control and profile bounds.
- Browser fixtures remain loopback-only. No synthetic accounts, posts, polls, work results or uploads were seeded into the deployed node.
- Production checks are anonymous reads and screenshots. Forty-four anonymous page/viewport combinations at 320/390/768/1440px pass without horizontal overflow, broken visible images, browser errors or player requests before Play. The sampled eight live news photos return JPEG/200; filtered news paging and the GitHub metadata preview also work. The final texture/headline adjustment also passes all four Explore widths and repeats the photo/filter/preview reads successfully. The visual audit confirms the source headline is displayed in two clamped lines; its remaining automatic headline warning counts unclipped source text. The full wording remains accessible in the link and native reader. The obsolete radial-dot layer is removed from Serat, leaving the actual texture image.

## Remaining scope

A few source publishers can reject image requests; rejected photos collapse without a mismatched credit or blank image well. A publisher allowlist is not a promise of upstream image availability. Real-user mobile composition/IME and multi-user operational trials remain useful alpha work; the test results are not a security certification.

A live Git wiki, simultaneous collaborative editing, inline review comments, a complete versioned consultation/report protocol, representative/secret polling, an autonomous agent dispatcher, hosted PDS enrollment and real private-data federation are not part of this release. Existing PDS/Spaces work remains separately packaged and experimental. No public corpus/training rights are inferred from participation.
