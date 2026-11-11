# Living commons foundation

This is the working home of the owner's complete **ETNOS / Strata — A Living Commons** foundation, reviewed on 11 November 2026. The uploaded document remains unchanged in the workspace archive. Its complete extracted text, all 30 sections, both appendices and all 38 decisions are retained here; the execution plan supplements it rather than replacing it with a shorter specification.

- [Read the complete foundation](living-commons.md).
- [Build order, architecture, demo and infrastructure](execution-plan.md).
- [Full feature ledger](feature-ledger.md) and [machine-readable records](feature-ledger.json).
- [Original decision entries and current overrides](decision-ledger.json).
- [Repository evidence, donor boundaries and research](review-notes.md).
- [Current local implementation and remaining integration gates](../implementation-checkpoint-2026-11-11.md).
- [Post-first refinement, Wikipedia/Nextdoor review, X/Lemmy research and UI polish](../post-first-design-2026-11-11.md).
- [Source manifest](source-manifest.json) and [verbatim paragraph/table extraction](source-paragraphs.json).

The source is a design exploration, not an executable instruction file. Selected designs, hypotheses, rejected alternatives and long-range possibilities keep their original distinctions. Current user instructions and implemented authority/privacy contracts take precedence over historical or prospective wording. In particular, open Bluesky signup is already selected and deployed; this document does not restore invite-only enrollment.

## Keep it alive

For each implementation slice, update its feature entry with code paths, check results and release receipt. Use `planned`, `partial`, `implemented-unqualified`, `qualified` and `blocked` accurately. Existing behavior is recorded under `current_evidence`; no feature is complete merely because its schema, screen or synthetic fixture exists. `planned` is not a silent decision to drop or postpone it.

Record a changed product decision in `decision-ledger.json` with the user's instruction or dated technical evidence. Preserve original D01–D38 text. For substantive new ideas, add a new decision/feature with source attribution; do not silently rewrite the uploaded source. Update the execution plan when dependencies or external gates change. The living layer is the plan, ledger and amendments; `living-commons.md` is the complete annotated source edition.

Run `python scripts/check-foundation.py` after edits. Run repository-required checks before a commit. This validator checks document preservation and ledger structure, not product correctness. Keep personal credentials, private cultural content and operational logs out of this directory.

After editing the canonical feature JSON, regenerate its readable index with `python scripts/render-foundation.py`. To export an updated DOCX and a review bundle, install optional `python-docx`/`lxml` in the document tooling environment, then run `python scripts/export-foundation.py --source /path/to/unchanged-original.docx --output-dir /path/to/review-bundle`. The exporter verifies the original hash and preserves every original body element before appending the current plan. It does not deploy or publish anything.

The initial planning branch is `plan/living-commons-2026-11-11`, based on engine `3a6ed617b7a3f5038f542cd548d28e502306fe27`. The connected UI baseline is Honai `f489846`. No runtime deployment is implied by this planning checkpoint. Publishing the complete uploaded strategy to a public repository is separate from maintaining this local, reviewable edition.
