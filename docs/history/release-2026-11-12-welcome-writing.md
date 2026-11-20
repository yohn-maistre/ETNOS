# Welcome, profiles and writing release

12 November 2026, Asia/Bangkok. Live at **https://etnos.space**. This releases the welcome/profile slice and writing-discovery fixes while preserving the full foundation and its remaining implementation scope.

## Source and deployment

- Strata code: `ee8e05c3da8783b3629c9d67139eb482a887e5b7` (welcome `7af3965`, writing/scrollbars `62fe196`, final solid-button refinement `ee8e05c`).
- Matched Honai Metro main UI: `6e52a08eaf3a1fca66ee3b752d2189167cb3595e`.
- Existing Worker: `strata-preview`; deployment `e321a626-7c34-4899-90cb-abf24856026c`, version `dee31d92-c46c-4fea-82b2-9c857870ae81`, 100% traffic. API creation time `2026-11-11T18:03:26.223407Z` is November 12 in Asia/Bangkok.
- Server module SHA-256 unchanged: `b503f443cf22bdbbf7cc5748ffd975005f2245cba394732daf9d799a09b47ed6`; script etag unchanged: `8d43072dc447a0cc421d1c101308c366c81f5e3963a21c155af06b98cca7a845`.
- Refreshed static client assets on the same Worker. Existing secret bindings, namespace, service bindings, source/OAuth policy and open enrollment retained. No schema migration, additional paid resource or hosted model call.
- Remote code CI passed: [Strata](https://github.com/yohn-maistre/strata/actions/runs/43073490272) and [Honai](https://github.com/yohn-maistre/honai-metro/actions/runs/43073498240).

## Visible behavior

First Home welcome starts as one fullscreen surface with a centred wordmark, then physically morphs into the form/print dialog over blurred Home. Returning members get a wordmark-only fade once per tab session; subsequent navigation does not repeat it. Reduced motion skips/intercepts movement. Public Wiki/news deep links remain directly readable, and Escape/browse dismissal is available.

The visible welcome sentence is **“Tempat bertemu, berbagi, dan merawat pengetahuan bersama.”** Existing real provider OAuth handles joining/login; inline failure, Back/Forward, direct-login recovery and safe reading returns remain usable. Source art is an optional local preset: Tigi first, Raja Ampat on the next visit, coded location captions, no timed carousel, original print assets rendered in the chosen accent. Nothing is generated per visitor.

Fresh appearance defaults to Paper and Jakarta + Geist Serif, retaining saved choices and gradual clock themes. Profiles have decorative landscape covers, existing real editable bio/place/website fields, and landscape reading ends. Feed/profile frames have bottom clearance. Prints do not imply a profile owner's home or ethnicity.

Solid accent compose actions are restored at the owner's final request; the full desktop sidebar entry is compact. Messages use a distinct icon. The composer has a spring entrance, clearer identity/audience grouping and accessible native event/media/poll tools. **Format** now exposes the existing Tiptap/Markdown editor directly; Ctrl/Cmd+B no longer collapses navigation and works as bold inside that editor. The complete adaptive writing redesign is still next work, not claimed by the new toggle.

The main scrollbar keeps a translucent thumb and transparent track, with native arrows where supplied by the browser/OS. Component thumbs can hide while idle and return on hover, focus or scrolling. Passive activity observation leaves native gestures intact; forced-colour/system visibility remains available.

## Qualification

- Engine typecheck and 116 tests; UI typecheck with zero errors/warnings, ten UI tests and production build. Existing bundle-size/upstream crypto annotation warnings remain; encryption code was not changed.
- Production browser journeys: first morph/intermediate sizes, member fade, repeat suppression, deep links, history/Escape, inline callback error, artwork failure, per-visit print stability, appearance tinting, reduced-motion interruption, keyboard-height layout, native event creation, real selected-text bold without sidebar collapse, audience widening confirmation, draft discard, profile editing and component scrollbar idle reset. No page errors.
- Existing official-OAuth fixture passed signup → callback → enrollment → returned page and existing login, without automatic community membership; pull-refresh/sandpile/reduced motion/keyboard refresh also passed. Provider/account creation is synthetic in this fixture.
- Final solid-button probe passed at 320, 390, 768, 1100, 1440 and 1920px, including compact desktop bounds, solid current-accent colour and no horizontal overflow.
- Foundation preservation: 672 source blocks, 30 sections, 38 original decisions, 72 features, acyclic dependencies.

Final public post-deploy probe passed against the exact locally built main bundle: health `ok`, open signup controls, first welcome and repeat suppression, Paper/Jakarta defaults, coded Tigi caption, accent-aware Raja Ampat print, public profile cover/footer, directly readable Wiki and the legacy recovery bootstrap under its existing CSP. Solid current-accent buttons and layout fit were verified at 320, 390, 768 and 1440px. Zero page errors. These are anonymous public reads and device-local appearance changes; no hosted account was created and no live post/model job was submitted.

Live screenshots are retained locally in `/tmp/strata-browser-evidence/live-*`. The code release uses the unchanged server-module hash above, with the final client bundle and solid-button refinement. To inspect the first-visitor morph while already signed in, use a fresh private browser window on Home.

## Continue implementation

[Remaining connected demo packets](../competition/demo-release-next-2026-11-12.md) and [writing/context design](../product/writing-and-context-plan-2026-11-12.md) are linked in the [central execution plan](../foundation/execution-plan.md). Actual e-means fit/assign integration, useful source/working-Wiki flows, an owner-authorized hosted resident run, offers/requests, questions/work, protected collections/language and portable operations retain their explicit scope/gates. Community statistics need actual permission-filtered server definitions before numbers are rendered.
