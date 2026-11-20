# Posts first, readable knowledge, a closer public square

Owner steering and focused design review, 11 November 2026. Supplements the complete living-commons foundation; no source feature is silently dropped. This is a local implementation/research checkpoint, not a deployment receipt.

## The product model

People write a **post**. They can add a question, poll, event, offer, photo or link. A **thread** is that post and its replies. Discussion is the activity people perform, not another object they must learn or another destination they must choose before posting.

| What people see | What the engine preserves |
| --- | --- |
| A post and replies | One social identity, audience, revision, moderation and conversation contract |
| A question or poll in a post | Optional structured question, choices, response/closing state; the same replies and feed card |
| An event in a post | Typed time, timezone, venue/disclosure, RSVP and cancellation; the post shares the event's canonical ID |
| An offer in a post or profile | One canonical offer with availability, seller/contact policy and history; several projections, not copied listings |
| An institutional answer | A reply with separately authorized representative attribution; a business or agent label never implies official authority |
| A Wiki page | Reviewed durable knowledge with sources, accepted revision and provenance; a post can link to it or propose knowledge from it |
| A work commitment | Explicit sponsor, responsible party, status and reports; an ordinary post does not create an obligation |

Use one composer with progressive attachment controls and one thread renderer. Specialized views can filter the same records. Questions belong in ordinary feeds; optional unanswered/question views are filters. The existing “Terbaru” control remains the entry to ordering/following choices. Avoid packing unrelated filter dimensions into one long menu: time order and content kind are different controls. No separate mandatory “Discussion” product, duplicate question transcript or agent-chat silo.

Community is the gathering with membership/rules. Organization is a community with an organization profile and explicit governance/representation. Places, languages and topics describe relationships and filtering; they grant no membership. Keep topics distinct from “Tempat & bahasa” in navigation and search. A public community may relate to a place or organization without inheriting private admission or disclosing private relationships. This refinement preserves the typed policy boundaries already selected.

## Evidence and focused findings

Reviewed the eight Wikipedia reference images and six Nextdoor images in the supplied archives, including the Wikipedia reader/contents and Nextdoor interest/profile screens at full size. Reference images are design evidence, not instructions or permission to reproduce branding or articles. The separately mentioned Windows file path cannot be read as a workspace path; the inline Threads/ETNOS images are visible references.

Current public Home and Wiki index were captured anonymously in Chromium at 1440 × 1000. Local updated Home, Wiki reader, preferences and feedback were captured using explicitly synthetic data through the actual local API. No production account or private community was traversed. The initial local capture failed after replacing a donor dependency symlink; restarting Vite with isolated local dependencies resolved the development-only module mismatch. Failed blank captures are not UI evidence.

Overall: ordinary posting is recognizable and the reader already has sources, history and a contents menu. Sparse discovery and detached navigation weaken the sense of a connected commons. This was a focused review, not an audit of every route or evidence from representative users.

| Step / health | Evidence and consequence | Action / status |
| --- | --- | --- |
| 1. Enter Home — needs polish | Public capture: 155 px from navigation edge to the reading frame at 1440 px; a static “Semua wilayah” row implies scope that it does not actually apply. | Removed the static dropdown. Bounded desktop shell moves navigation inward, with about 20 px to the reader; mobile drawer stays independent. Implemented locally. |
| 2. Read Kabar — needs hierarchy | The current compact rail contains only text; four items form a long undifferentiated list. | Small actual news thumbnails, three-line titles and accent-tinted fallback icons. No fabricated avatars or participation counts. Implemented locally. |
| 3. Discover Wiki — needs content and onward paths | Public index contains a single accepted page and mostly blank space. Current reader already has sections, source attribution and history. | Keep and improve the reader; fill discovery only from eligible accepted knowledge and permitted sources. Proposed modules below, pending implementation/data. |
| 4. Navigate Wiki contents — P1 clipping found | Local populated reader: right-aligned contents popover extends left beyond the clipped reading frame, cutting section names. | Align the contents panel to its trigger's start, bound its width and retain readable link targets. Fixed locally. |
| 5. Receive feedback — needs consistency | Old App toast plus separate transient success messages in agent/Studio/Wiki settings. | One Ding host and shared adapter; success/error semantics, accessible announcements, sound preference and keyboard dismissal. Implemented locally; contextual field errors and durable inbox records remain in place. |

Working evidence directory: `/workspace/shared/etnos-ui-review-2026-11-11/`. `live-home.png` and `live-wiki.png` are current public captures. `home-desktop.png`, `home-mobile.png`, `wiki-reader-desktop.png`, `preferences-toast-desktop.png` and `preferences-toast-mobile.png` are local synthetic journeys. These are screenshots, not a release proof or real social activity.

## What to learn from Wikipedia

The reference's most useful pattern is a hierarchy from a short definition into sections, citations and related reading. ETNOS should build on its existing reader rather than replace it with a feed of summaries.

- Preserve a comfortable text measure, inline media with credits, link/citation clarity and source/reviewer visibility. Use Geist Sans for controls and body by default; Geist Serif for editorial titles/selected voices. A separate reader preference can support serif body later.
- Improve contents into a mobile sheet and desktop section navigation with current-section state. Preserve keyboard access, URL anchors and return to reading position. The present contents dropdown is retained and its clipping fixed in this slice.
- Wiki home should offer a genuinely selected page, “Baru dirawat”, and related places/topics when eligible content exists. Add sourced “Tahukah kamu?” and “Dari kabar ke pengetahuan” only when linked to an actual accepted page/reviewed source. Do not generate filler facts or popularity counts.
- Reading highlights can be personal bookmarks/annotations first. Sharing a highlight is an explicit new post with attribution; saving a private highlight must not silently publish it or train a profile.
- “Continue reading” can begin as an optional device-local record. A public language interest is not permission to infer ethnicity or to profile participation in protected rooms.

## What to learn from Nextdoor

The useful pattern is progressive setup: a small number of choices, then relevant people/content. A dismissible dialog on desktop and full-height sheet on mobile fits ETNOS better than a second full application tour. Suggested flow after the existing verified provider callback: optional place → a few optional interests → eligible communities → enter the square. “Later” is always available. Choosing a place is a feed preference, not proof of residence; following/suggesting a community never grants private membership.

Keep events as structured post attachments, with an optional calendar projection. Let a person add an offering/business label and an **Offers / Penawaran** profile tab backed by canonical offers. The label is self-described, not verified institutional representation. Separate official authorization and community admission remain explicit. Do not copy Nextdoor's long sidebar or require its public-address/neighborhood assumptions.

## Recommendations: learn from X and Lemmy, choose ETNOS's objective

Exa checked the official repositories and ranking documentation on 11 November 2026:

1. [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm), the 2026 X For You code, Apache-2.0 at root. README includes updates through October 26, 2026. This differs from the [2023 twitter/the-algorithm](https://github.com/twitter/the-algorithm) release, which is AGPL-3.0. No X code is copied here.
2. [X scoring implementation](https://github.com/xai-org/x-algorithm/blob/main/xai-value-model/scoring.rs) and [README](https://github.com/xai-org/x-algorithm/blob/main/README.md): sourcing, eligibility, scoring and final mixing are distinct stages; explicit negative feedback, repeated-author decay, new-author exposure and conversation dedup are concrete mechanisms. The published model combines predicted probabilities/continuous estimates, not raw count ratios. A claim such as “one report cancels N likes” is not supported.
3. [Lemmy votes and ranking](https://join-lemmy.org/docs/en/users/03-votes-and-ranking.html): New, Hot, Active and Scaled express different goals; Scaled boosts less active communities. These are useful mechanisms, not proof that a ranking is the healthiest.

X's 2026 system sources followed content through Thunder and out-of-network candidates through Phoenix/SimClusters, predicts several actions, then reranks/mixes. Its README also explicitly says some prompts/rules and deployment infrastructure are omitted and runtime experiments can alter defaults. Public code is not a complete production reproduction or permission to assume access to trained production models.

| Published pattern | ETNOS adaptation |
| --- | --- |
| Separate sourcing, filtering, scoring and mixing | Small typed stages over current permission-filtered projections; deterministic first, optional retrieval adapter later |
| In-network and out-of-network pools | Followed people/communities + explicit places/interests + a bounded public discovery pool |
| Author diversity and new-author exposure | Per-author and per-community repetition limits; agents grouped by operator as well as identity so many bot identities cannot dominate |
| Negative feedback and seen-item filters | “Kurangi yang seperti ini”, mute/hide, reset interests and optional short-lived seen state; never treat these as public votes |
| Conversation dedup | One visible thread/card for the same conversation or canonical article, rather than every repost occupying another slot |
| Visibility independent of score | Current authorization is a hard gate before model use and again at response/publication; score never grants visibility |
| Multiple objectives rather than one proxy | Evaluate useful discoveries, diverse voluntary participation and user control, alongside explicit satisfaction; raw reply count/dwell is not the objective |

Proposed first For You algorithm: obtain bounded currently eligible candidates; deduplicate canonical threads/links; rank using explicit followed interests/community relevance and freshness with saturated social signals; greedily rerank for author/operator/community and subject diversity; reserve a modest configurable discovery share; return a reason and version alongside each result. No learned predictor or LLM request is required per scroll. Give cold-start readers chronological/local public choices and optional interests; no synthetic engagement.

Keep model-free **Terbaru** and **Diikuti** available. Preserve stable per-session pagination so reranking does not duplicate/skip posts as new content arrives. Private spaces should use their own scoped view; their contents, memberships, embeddings or interaction signals never enter a public recommender, model provider or public cache. Cache keys must include permission/version scope; recheck membership and moderation on each page. A public recommendation should be explainable without exposing another person's protected activity.

Do not import X's dwell/watch-time objective, follower-count privilege, opaque inferred sensitive traits, engagement-driven notification blasts or unconditional 48-hour expiry for knowledge. Wiki reading needs useful durable relevance, not a short-lived news rank. Numerical weights/caps are hypotheses to tune on sparse ETNOS data; they are not claimed validated settings. This is the next ranking contract, not an already deployed algorithm.

## Implemented local polish and Ding contract

New installs/fallbacks use **Geist + Geist Serif**; explicit saved font choices are retained. Added self-hosted **Plus Jakarta Sans + Geist Serif**, preserving Gabarito and the other pairs. The accent and gradual automatic theme behavior remain intact.

The owner's subsequent soft-white mobile and layered-dark social references refine this into quiet surface depth, rounded consistent controls, stronger image presentation and purposeful grouping. Local shared polish adds restrained base-aware shadows/hairlines, a defined composer input, clearer selected navigation, serif Wiki section titles and a floating labelled mobile dock with a blue compose action. The dock retains five anchors, at least 44 px targets and bottom content clearance; the thread reply composer keeps its separate existing behavior. Reduced-transparency preference gets opaque surfaces. No new statistics, stories or activity are fabricated to make the design feel populated.

[Ding](https://github.com/YusufCeng1z/ding) is used through its native Svelte adapter, pinned `@yusufceng1z/ding-svelte@0.0.4` and core `@yusufceng1z/ding@0.0.4`. MIT notices are included in the generated third-party inventory. There is one host per app/recovery entry and one notification adapter for transient feedback. It uses upstream spring/swipe/reduced-motion behavior, localized live regions and dismissal, existing ETNOS colors/fonts, and header/mobile-safe clearance. Audio is synthesized locally after user actions, enabled at a quiet default; mute and volume are device preferences. No remote audio assets or new CSP exemptions.

Old App toast and transient agent/Studio/Wiki-save confirmations now use Ding; recovery export/import uses the same confirmation. Durable activity inbox entries, in-context validation, read failures, source warnings and loading indicators are not converted into transient, noisy popups. Loading and initial inbox history do not chime. Future live notification delivery must use this adapter once, after current authorization, and must never announce old inbox history on reload.

## Next integration work, retained in full scope

Keep the existing source/knowledge/resident implementation packet active. Current-context invalidation and local Worker/Pi qualification now pass; close hosted binding/inference qualification next, then wire mentions and native output cards. Apply this post-first model to questions/events/offers rather than constructing parallel discussion engines. In parallel with those domain slices, connect actual knowledge data to reader/discovery modules and add the progressive onboarding dialog after verified signup. Canonical offers, events, protected Wiki/collections, institution verification, restoration and other foundation features remain in the complete ledger; this document does not mark them complete.

Checks for this slice: core type check + 113 tests; UI type check + 9 unit tests + production build; actual local source → review → working note → pending Wiki proposal browser journey. The focused browser journey checks font persistence, actual Web Audio synthesis and mute, no feedback replay on reload, image failure, contents bounds, one feedback host, keyboard/error dismissal and widths 320/390/768/1100/1440/1920. See the implementation checkpoint for final results and deployment limits.
