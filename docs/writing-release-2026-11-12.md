# Adaptive writing and editing

12 November 2026, Asia/Bangkok. Continuation of the owner's [writing/context plan](writing-and-context-plan-2026-11-12.md), after canonical offers/requests. Exact source/deployment evidence is recorded below when qualification completes.

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
