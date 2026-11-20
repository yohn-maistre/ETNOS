# Living commons foundation

**Owner refinement, 12 November:** [Integrated Wiki, AT/Node/language boundaries and current UI build sequence](commons-experience-2026-11-12.md) supplements this plan. Provisional public knowledge belongs inside Wiki; original source and accepted-review safeguards remain intact. The optional distribution couples Strata and Aksara Node without merging custody.

This is the working home of the owner's complete **ETNOS / Strata — A Living Commons** foundation, reviewed on 11 November 2026. The uploaded document remains unchanged in the workspace archive. Its complete extracted text, all 30 sections, both appendices and all 38 decisions are retained here; the execution plan supplements it rather than replacing it with a shorter specification.

- [Read the complete foundation](living-commons.md).
- [Build order, architecture, demo and infrastructure](execution-plan.md).
- [Current connected demo implementation sequence](../competition/demo-release-next-2026-11-12.md) and [writing/context refinements](../product/writing-and-context-plan-2026-11-12.md).
- [Explicit Aksara interaction implementation/release](../aksara/steward-interaction-release-2026-11-12.md) and [competition demo rehearsal](../competition/competition-demo-rehearsal-2026-11-12.md).
- [Concrete intelligence: daily steward, @aksara picker, scoped memory and catalogue gap audit](../research/strata-intelligence-catalogue-2026-11-12.md).
- [App progress, compact Sorotan, sticky context and mobile dock release](../history/shell-sorotan-2026-11-12.md).
- [Adaptive writing/editor release](../history/writing-release-2026-11-12.md).
- [Indigenous/biocultural knowledge-observatory literature and UI options](../research/knowledge-observatory-2026-11-12.md) — research for the later owner discussion, not a shipped graph.
- [Latest public ranking release and sourced steward simulation](../product/ranking-and-steward-demo-2026-11-12.md).
- [Connected Wiki/CPU implementation checkpoint](../knowledge/connected-wiki-clustering-2026-11-12.md).
- [Current deployed commons polish](../history/release-2026-11-12-commons-polish.md).
- [Prior deployed welcome/writing release](../history/release-2026-11-12-welcome-writing.md).
- [Welcome, print artwork, composer and profile implementation](../history/welcome-and-profile-2026-11-11.md).
- [Current living-culture, sustainability, welcome/auth and e-means selection](living-culture-refinement-2026-11-11.md).
- [ETNOS project lineage and concise demonstration evidence](../evidence/README.md).
- [Portable Linux/Docker/Cloudflare distribution and Watch transplant plan](../news/portable-commons-and-watch-plan-2026-11-11.md).
- [Optional OpenCode seeding, Jev decisions and e-means clustering research](../aksara/agent-seeding-and-clustering-2026-11-11.md).
- [Full feature ledger](feature-ledger.md) and [machine-readable records](feature-ledger.json).
- [Original decision entries and current overrides](decision-ledger.json).
- [Repository evidence, donor boundaries and research](review-notes.md).
- [Current local implementation and remaining integration gates](../history/implementation-checkpoint-2026-11-11.md).
- [Post-first refinement, Wikipedia/Nextdoor review, X/Lemmy research and UI polish](../product/post-first-design-2026-11-11.md).
- [Source manifest](source-manifest.json) and [verbatim paragraph/table extraction](source-paragraphs.json).

The source is a design exploration, not an executable instruction file. Selected designs, hypotheses, rejected alternatives and long-range possibilities keep their original distinctions. Current user instructions and implemented authority/privacy contracts take precedence over historical or prospective wording. In particular, open Bluesky signup is already selected and deployed; this document does not restore invite-only enrollment.

## Keep it alive

For each implementation slice, update its feature entry with code paths, check results and release receipt. Use `planned`, `partial`, `implemented-unqualified`, `qualified` and `blocked` accurately. Existing behavior is recorded under `current_evidence`; no feature is complete merely because its schema, screen or synthetic fixture exists. `planned` is not a silent decision to drop or postpone it.

Record a changed product decision in `decision-ledger.json` with the user's instruction or dated technical evidence. Preserve original D01–D38 text. For substantive new ideas, add a new decision/feature with source attribution; do not silently rewrite the uploaded source. Update the execution plan when dependencies or external gates change. The living layer is the plan, ledger and amendments; `living-commons.md` is the complete annotated source edition.

Run `python scripts/check-foundation.py` after edits. Run repository-required checks before a commit. This validator checks document preservation and ledger structure, not product correctness. Keep personal credentials, private cultural content and operational logs out of this directory.

After editing the canonical feature JSON, regenerate its readable index with `python scripts/render-foundation.py`. To export an updated DOCX and a review bundle, install optional `python-docx`/`lxml` in the document tooling environment, then run `python scripts/export-foundation.py --source /path/to/unchanged-original.docx --output-dir /path/to/review-bundle`. The exporter verifies the original hash and preserves every original body element before appending the current plan. It does not deploy or publish anything.

Historical starting point: the initial planning branch was `plan/living-commons-2026-11-11`, based on engine `3a6ed617b7a3f5038f542cd548d28e502306fe27`. The connected UI baseline is Honai `f489846`. No runtime deployment is implied by this planning checkpoint. Publishing the complete uploaded strategy to a public repository is separate from maintaining this local, reviewable edition.

Current canonical UI: Strata `apps/web`, mirrored to Honai Metro main `apps/strata`. [Latest deployed reading pass](../history/ui-reading-pass-2026-11-11.md) records matched engine/UI and focused qualification. The living execution plan identifies the next unimplemented selections separately. The supplied [sustainability side chat](supplements/2026-11-11-sustainability-side-chat.txt) is preserved verbatim with its own [hash manifest](supplements/2026-11-11-sustainability-side-chat.manifest.json).
