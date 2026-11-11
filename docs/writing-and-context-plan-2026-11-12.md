# Writing, editing and community context

**Owner refinement, 12 November:** [Integrated Wiki, AT/Node/language boundaries and current UI build sequence](foundation/commons-experience-2026-11-12.md) supplements this plan. Provisional public knowledge belongs inside Wiki; original source and accepted-review safeguards remain intact. The optional distribution couples Strata and Aksara Node without merging custody.

12 November 2026, Asia/Bangkok. Owner follow-up during the welcome/profile release. Finish and deploy that qualified slice, including the small Ctrl+B/formatting-discovery fix, then continue this writing redesign against existing primitives.

## Immediate correction

Remove the global inherited Ctrl/Cmd+B sidebar toggle. Formatting shortcuts belong to the focused editor. Keep deliberate navigation controls separate. Expose the existing Tiptap/Markdown editor through a visible Format action rather than requiring discovery inside the extra-options menu. Preserve current text, source mode, inline media authorization, audience confirmation, draft discard and publication receipts.

## Composer as the common writing surface

Use the existing Tiptap editor and Markdown serialization, not a second document engine. Aim for a compact initial writing area that expands with content, one intentional scrolling region, a stable destination/audience row and reachable submit. Keep a simple quick-post path and make formatting obvious; verify selection/focus when changing modes before making rich editing the default. Titles remain optional.

Group visible controls by purpose: writing (bold, italic, link, lists and quote), attachments (images/video/source), and typed post content (poll/event and future canonical offer/request). Use progressive disclosure for rare options without hiding ordinary writing. Inline image insertion, paste/drop, alt-text editing, reordering and image removal should all operate on the existing scoped upload records. Switching community cannot silently reuse protected media in a public audience. Existing advanced Markdown must not be silently round-tripped into a lossy document.

A complete writing pass covers new posts, replies, post editing, working notes and Wiki proposals through shared editor behavior while respecting each record's own permissions/review. Preserve draft recovery with explicit audience/account boundaries. Offer clear uncertainty/retry behavior on a failed save, keyboard undo/redo and source/preview when useful. Do not present a formatter toggle as the completed redesign.

## Right rail that belongs to the backdrop

On wide desktop, keep the current visual background, add sticky positioning below the top bar and give a tall right rail its own bounded overflow region. The main document remains the browser's primary scroll surface. Allow ordinary scroll chaining when the rail reaches an edge; avoid a scroll trap, competing fixed columns or restored Lajur. Mobile keeps one main flow and places contextual detail behind an appropriate accessible disclosure.

A post or community route should lead with its actual community: name, description, rules, visibility/admission, viewer's current join state and a link to its Wiki/knowledge. Then show relevant news/reading. Home may keep broader discovery. Statistics must be server-projected, definition-labelled and current-permission filtered; never estimate membership/active users from the currently loaded feed or expose hidden communities/counts. Implement real stats before rendering numbers. Keep common rail composition reusable rather than bespoke route sidebars.

## Quiet scrollbars

Final owner refinement: the main page keeps a translucent thumb and transparent track, with native arrows where the browser/OS supplies them. Component thumbs hide when idle and return on hover, focus or actual scrolling; passive activity tracking does not intercept scroll gestures. Keep system/forced-colour visibility and reduced-motion behaviour.

## Qualification

Check 320px/mobile keyboards, long drafts, selection formatting, switching text/source modes, rich editing of existing content, inline media access and revocation, dirty-close/recovery, and desktop rail keyboard/scroll behavior. The full foundation remains in the [implementation plan](foundation/execution-plan.md); this is the next UI workstream rather than a reason to pause knowledge/resident/offering implementation.
