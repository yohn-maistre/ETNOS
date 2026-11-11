# Welcome, print artwork and profile refinement

11 November 2026, Asia/Bangkok. Owner-directed continuation of the [living-culture refinement](foundation/living-culture-refinement-2026-11-11.md). This checkpoint implements the selected welcome/composer/profile slice; e-means and the wider offering/knowledge work retain their next-slice scope.

## One continuous opening surface

A first Home visit starts with ETNOS centred on a full-screen surface. The existing page loads behind it; the same surface shrinks and rounds into the welcome dialog, the wordmark moves to the top, and the form/landscape fade in. Svelte's physical spring drives dimensions/position; Ding remains the installed toast renderer. The opening is dismissible even while data loads. Reduced motion skips the movement, and switching the preference interrupts an active spring safely.

The only visible opening sentence is the owner's selected **“Tempat bertemu, berbagi, dan merawat pengetahuan bersama.”** Joining and existing-account login reuse the actual provider flow. A small same-origin prepaint script restores the saved/device-clock ground before module loading, without an inline-script CSP exception. No artificial progress indicator or fixed-duration network delay is added.

Device-local welcome state prevents repeated invitations. Returning members receive a wordmark-only fade on the first Home load in a tab session; subsequent loads/navigation skip it. The authenticated boot never morphs into a signup form. Public Wiki/news deep links do not open it. Manual login opens over the current page, with Back/Forward, Escape and a direct `/login` recovery route. Direct dismissal validates the local reading return path; OAuth callback state, safe-return enforcement, CSRF and admission remain server-owned. Authentication failures appear inside the form. In-flight submission blocks closing; draft discard and before-unload protection apply to the composer.

## Artwork as an optional local asset

Two original illustrations were generated from broad place references in the owner-provided landscape ZIP: Tigi and Raja Ampat. The original generated PNGs remain in the workspace; compressed WebP derivatives ship locally. See [asset provenance](../apps/web/public/branding/artwork-manifest.json). Source photographs are not redistributed and these images are illustrations, not documentary evidence.

Tigi is first. The next actual page visit that opens auth chooses the next curated print; reopening/switching forms within a visit keeps the print unchanged. There is no timer-driven carousel. Location names are live text, independently editable/accessibly readable. On narrow screens the welcome uses a small landscape strip; the active auth form keeps the available space for controls and keyboard scrolling.

`apps/web/src/site-branding.ts` is the portable operator preset: replace approved assets/credits or use an empty gallery to disable artwork. An image-load failure removes the reserved column while preserving login. No image provider or generation request is required for visitors.

`LandscapePrint.svelte` extracts ink density with a local SVG filter, then renders the same linework in the current accent on ivory. This requires no palette-specific image downloads. Changing appearance preserves the original artwork and saved preferences; gradual clock theme transitions remain intact.

## Composer and profile

Paper is the fresh base; saved explicit choices and Jakarta + Geist Serif remain. Private inbox/profile message actions use MessagesSquare. Compose entry buttons use a restrained tinted/outlined treatment while final submit remains strong. The composer has a spring entrance, clearer identity/destination grouping, a grounded toolbar with accessible labels and a direct native event action. Polls/events retain their existing typed post payloads and permissions.

Profiles use deterministic decorative print covers without inferring a home/ethnicity, existing public bio/place/website fields and the existing real profile editor. No fabricated statistics or new profile publishing rights. Feed and profile ends reuse the existing decorative landscape, with additional space outside rounded reading frames and mobile safe-area clearance.

## Validation and release

Local qualification passed:

- Engine typecheck and 116 core tests; UI typecheck with zero errors/warnings, ten UI tests and production build.
- Production-build browser journeys at 320, 390, 768, 1440 and 1920px, plus a 360px keyboard-height view: physical intermediate morph sizes, first-visit suppression, member session fade, deep links, Back/Forward/Escape, image failure, inline callback errors, local return-path rejection, stable per-visit artwork, reduced-motion interruption, actual native event creation, private-to-public confirmation, draft discard and real profile editing/accent rendering. No page errors.
- Existing official-OAuth signup fixture: provider signup → callback → local enrollment → returned page, existing login, zero automatic community memberships, pull-refresh/sandpile and keyboard refresh. This is synthetic provider/account creation against the real OAuth implementation.
- Foundation preservation: 672 blocks, 30 sections, 38 original decisions and 72 features, with acyclic dependencies.

Build retains the existing large-chunk and upstream crypto annotations warnings. Encryption libraries were not changed by this UI slice. Browser evidence is retained under `/tmp/strata-browser-evidence/`; it contains synthetic local records only. Exact source/deployment revisions follow the release. Synthetic browser people/content remain local and never provision a hosted account. The real-provider signup fixture uses the official OAuth SDK with a synthetic provider; it does not claim a newly created live Bluesky account.

12 November follow-up: removed the inherited global Ctrl/Cmd+B sidebar toggle and exposed the actual formatting editor as a front-row Format action. Targeted production browser checks verified real selected-text bold formatting without collapsing navigation, actual native event creation, and component scrollbar activity/idle reset with zero page errors. Main-page scroll position stays visible. Full editor/rail redesign and the remaining connected demo are in [writing/context](writing-and-context-plan-2026-11-12.md) and [demo sequence](demo-release-next-2026-11-12.md).
