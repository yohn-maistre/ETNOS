# Adaptive writing and editing

12 November 2026, Asia/Bangkok. Continuation of the owner's [writing/context plan](../product/writing-and-context-plan-2026-11-12.md), after canonical offers/requests. Exact source/deployment evidence is recorded below when qualification completes.

## Concrete behavior

Local-community posts and replies open directly in the existing Tiptap/Markdown editor. Formatting is visible rather than hidden in the extra-options menu. Bold, italic, headings, lists, quotes, inline code, links and undo/redo share one toolbar. Ctrl/Cmd+B/I stay with the editor; Ctrl/Cmd+K opens a selection-preserving link tool, not global search. Ctrl/Cmd+Enter submits through the existing form. Formatting a draft is distinct from hiding its toolbar. A lazily loaded editor has a visible preparation state and focuses writing once ready, without taking focus back from another form control.

Preview keeps the editor mounted, preserving selection/history. An external successful-send reset clears the still-mounted reply editor. Ordinary typing does not round-trip a controlled value back into the editor. Existing Markdown posts use the same surface when edited; historical plain posts keep their original plain semantics. Advanced Markdown containing HTML, tables or images opens in source mode and cannot be silently converted through the options menu into a lossy document.

The dialog header keeps publish reachable. The containing form owns vertical scrolling for long posts; the document/source textarea grows with content rather than adding another vertical scroll region. Short replies stay compact until focused. Mobile formatting tools scroll horizontally when needed. Semantic foreground/surface colors preserve existing appearance preferences, neutral solid actions and quiet scrollbar behavior.

Scoped inline image insertion and alt-text controls remain available, including in replies. Existing same-community upload/access checks, audience-widening confirmation, dirty-close protection, publication retry payload and CSRF/session rules remain authoritative. Local text is bounded at 20,000 characters; AT-community plain text at 6,000. Oversized rich drafts cannot submit; oversized pastes receive an explanation. The link tool permits ordinary HTTP(S) and local page paths; render-time sanitization remains independent.

This does not implement general drag/drop/reordering, durable recovery for every post draft, a private institutional editor or an external agent memory system. Those remain in the full implementation plan; no new editor engine or cloud service is required for this slice.

## Verification

A focused browser contract uses the real isolated engine with explicitly synthetic people/content: default rich toolbar, actual selected-text formatting, keyboard shortcuts, mounted preview/undo, safe local link editing/Escape, long-draft scroller, submission bounds, native Markdown post, two successive replies/reset, editing an existing Markdown post, advanced-source preservation, 320/390/1440px, keyboard-height viewport and discard/resume. Existing offering, welcome/audience/media and knowledge journeys are checked against the final build as appropriate.

The earlier offering release added two batched canonical offering/place reads to feed projection. CI's obsolete ten-read assertion is updated to twelve, with an additional one-post versus thirty-post comparison proving the count stays constant. Actual workerd isolation/rollback/bytes/restart and web-origin contracts pass locally; this changes test instrumentation, not the deployed backend.

Local checks: engine typecheck and all 130 tests pass (including actual optional CPU fitting); Svelte reports zero errors/warnings; eleven UI unit tests pass; production build passes. Both actual workerd contracts pass. Production-browser writing, offering, welcome, inline-image/knowledge, rich-forum and source-to-provisional-Wiki journeys pass with synthetic identities and no deployed writes. The final focused browser result also checks lazy-editor focus. Markdown-aware link extraction has a pure regression test for nested formatting, parentheses, code, images, local and credentialed links.

## Deployed release receipt

- Canonical Strata code: `23d77ad6abcf5c5e0ac5323816c78736eb8e9f05`; matching Honai UI: `9d01af12455137d1292f77da171fd0bef99a98bf`.
- Both main pushes passed CI: [Strata](https://github.com/yohn-maistre/strata/actions/runs/43159815656) and [Honai](https://github.com/yohn-maistre/honai-metro/actions/runs/43159815966). The stale feed-query assertion is fixed and actual workerd now checks constant reads for one/thirty posts.
- Existing same-origin `strata-preview` Worker, https://etnos.space, deployed 12 November 2026 at 12:12:55 Asia/Bangkok. Deployment `08d4d1f3-5af3-4f1f-abe7-dd6bd893171a`, version `79225615-24a7-45ad-9903-3675605455c4`, 100%.
- UI-only upload preserves the exact server module SHA-256 `b5cd38f9cebaf219fc6c5576f82996c0d3b22ee39264475dfaae25c5175960e5`, schema 26 and incumbent OAuth/secret/DO/model/source bindings. Etag `c24b7a2eea6ffc4cae0adea71a5b67d84dbe539cd3095fbdae3130127d07ecfb`. No new paid resource, model call or account/post was created for deployment qualification.
- Public live Chromium smoke matched `/assets/index-3SHQrePs.js` to the built release, health `ok`, Paper/Jakarta defaults, welcome/signup UI, repeat/deep-link behavior, profile/community art, Wiki/growing endpoint, clustering authentication, ranking/sort and offers at 320/390/768/1440px as applicable. Legacy recovery bootstrap remains available. Zero page errors. Authenticated writing/reply/media transitions were qualified against the real isolated local engine with synthetic identities; the public smoke does not impersonate a logged-in owner.

The [intelligence audit](../research/strata-intelligence-catalogue-2026-11-12.md) and A22 are included in the source push: `@aksara` identity selection, sourced child replies, daily initiative/native polls/follow-through, community-specific benefits/knowledge relations, independent memory and explicit participation grants. This receipt does not claim those remaining interactions or the observatory graph are implemented. The owner has authorized continuing them after this deployed writing slice.
