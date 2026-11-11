# Living commons implementation checkpoint

The living-commons checkpoint is on `main`. The connected UI, source/knowledge APIs, Pi service and private WPW model bridge are deployed to the existing ETNOS account after an encrypted backup and a proven restore/migration. See the [release receipt](release-2026-11-11-commons-checkpoint.md) for versions and remaining live-inference qualification. Synthetic browser/model fixtures are not hosted inference evidence.

Source checkpoint is now on Strata `main` at `9320ef3`; Honai Metro's connected UI is on `main` at `68f1d00`. Both remote build/check workflows passed. [Source release receipt](release-2026-11-11-commons-checkpoint.md). Further work follows the owner's direct-to-main, tested, one-line commit convention.

## Local implementation preserved

- Canonical connected Svelte app copied into `apps/web` with donor attribution; original Honai checkout is a frozen donor. Its dependency symlink has now been replaced by an isolated local install. Do not edit the donor app.
- Source registry and bounded RSS/Atom/JSON Feed acquisition (`src/discovery.ts`), source rights/review/state and current evidence. Feed parsing uses exact-pinned saxes; no model required for reading news.
- Working notes, revisions, source evidence and human promotion to a restricted Wiki proposal (`src/knowledge.ts`). Private notes check current membership; private Wiki remains unimplemented.
- Durable idempotent receipts/events/context epochs (`src/commons.ts`), resident config/jobs/leases/generation fencing, source/operator/mandate checks, cancellation and external model budgets (`src/resident.ts`). Result and terminal receipt are committed together through actual post/note paths.
- Pure model port and redaction utility. Redaction is limited defense in depth, not certification that arbitrary text is safe to publish.
- Native optional Pi Durable package in `packages/resident-pi` using Pi 1.5.2 and Agents 0.33.0. Separate per-scope/epoch/job contexts, bounded tools/helper calls, durable operation identities, foreground compaction; every inference crosses Strata's authority/budget service. Public fetch remains unavailable on the resident Worker.
- WPW bridge source changes remain local in `/workspace/westpapua-watch/services/watch-engine/src/commons-model.ts`, `commons-entrypoint.ts` and the named export from `index.ts`. Reuses configured model routes and CF AI Gateway; no keys copied and no obsolete model hardcoded. Four private gateway boundary tests, the existing real D1 news-selection test and the production 364-page Astro build pass. Its index test runtime stub was updated to include the newly imported WorkerEntrypoint class. The private bridge is deployed with the incumbent live WPW router; actual hosted inference remains unqualified.
- Studio and working-note UI, plus [current post-first design and focused polish](post-first-design-2026-11-11.md): native Ding feedback/sound settings, Geist default/Jakarta option, compact centered sidebar, removed static region selector, Kabar thumbnails/fallbacks, Wiki contents clipping repair, restrained shared surface depth and a labelled floating mobile dock.

## Verification evidence

Core `npm run check` passes; `npm test`: **115 passed** (including source egress, current withdrawal/revocation, private working-note projection, resident publication/lease/cancel boundaries). UI `npm run check`: zero errors/warnings; `npm test`: **9 passed**; production build passes. Existing upstream HPKE/Rollup and large-chunk build warnings remain visible; no warning was converted to a claim of failure or full performance qualification.

`apps/web/tests/browser/living-commons.mjs` passes through the actual local source → human review → note → pending Wiki proposal pipeline at 390/1280 widths with no page errors. The fixture does not contact a production provider or mutate public data. Focused polish journey is `apps/web/tests/browser/commons-design.mjs`; run it with the UI stable (avoid simultaneous source edits/build-triggered Vite reloads). Captures are under `/workspace/shared/etnos-ui-review-2026-11-11/`.

Pi type check, two native model/tool/helper tests, the production dry-run bundle (366 KiB gzip), and a real workerd named-entrypoint/SQLite/authority test now pass. The Pi date was aligned with Strata's existing tested **2026-10-23** compatibility pin; no root dependency upgrade was needed. Root actual workerd access/rollback/outbox/restart tests also pass. Provider replies remain synthetic: this does not prove hosted inference or deployed service bindings.

## Immediate next work

The owner reaffirmed that the embedded Pi steward is part of the living-commons proposition, not a detour to defer. Keep its hosted test alongside sources, Wiki and ordinary participation, while optional external Aksara integrations remain independent.

1. Context epoch invalidation now covers public post edit/delete/hide/restore/lock and other moderation changes, accepted Wiki revisions and withdrawn fixture releases, in the business transaction. New tests fence late publication, verify rollback and keep unrelated scopes independent. Extend this contract whenever adding a retained context source or tool.
2. Local workerd compatibility and hosted service bootstrap/bindings are resolved. Finish the native Studio setup and qualify a real hosted Pi ↔ Strata authority ↔ WPW inference. In-flight source/context changes and cancellation are covered by local adversarial tests, not a hosted model run.
3. Backup, restore and schema24 deployment are complete; Cloudflare connector reauthentication works. Preserve these receipts and verify plan/quotas as actual usage grows. No paid product, temporary account or unrelated preview was created.
4. Wire opt-in `@aksara` scoped picker/mention job/answer skill with per-person usage and isolated conversation state. `mentions_enabled` is stored but mention handling and UI are not implemented. Keep private cultural rooms excluded from the public resident.
5. Follow the post-first refinement for question/event/offer/social projections and Wiki discovery. All 72 foundation entries remain in scope; update actual evidence rather than marking a schema as completion.

Root AGENTS requires `npm run check` and `npm test` before committing. Preserve source decisions and do not publish the uploaded strategy merely because UI/runtime source is authorized. No secrets, databases, operational logs or synthetic identities disguised as real accounts belong in a commit or demo.

Focused UI result: commons-design passes font persistence, actual Web Audio/mute, no replay, one host, image fallback, reader contents bounds and 320/390/768/1100/1440/1920 widths without page errors. Existing navigation journey passes 24 viewport checks, actual gradual/reduced-motion theme paths, hidden-parent filtering and photo fallback. Its initial simulated time was moved one minute before sunrise to avoid cold-loading across a one-second boundary.
