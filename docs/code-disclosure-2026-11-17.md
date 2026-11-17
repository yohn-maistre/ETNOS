# Code disclosure

Status: draft for the BUDAYA GO! proposal, 17 November 2026. The rules ask us to show which code we wrote and which existed before. Licences were read from each project's own LICENSE file or package manifest on this date.

## The table

| Part | Where | Origin | Licence | What we did |
| --- | --- | --- | --- | --- |
| Strata engine | `src/` | Written for Strata, first commit 31 October 2026 | AGPL-3.0-only | Original: forum, wiki, governance, resident steward, desk, metering, model gateway |
| Web app | `apps/web/` | Interface carried over from Honai Metro, the owner's own client, which was forked from Photon in March 2026 | Photon and Honai: AGPL-3.0 | Rebuilt around Strata's API; most screens are new. Some Photon behaviour is kept (see open item 1) |
| Account host | `packages/pds/src/upstream/` | Fork of Cirrus by Matt Kane and contributors, commit `de476f5`, version 0.19.0 | MIT, kept in `packages/pds/LICENSE.cirrus` | Changes listed in `packages/pds/UPSTREAM.md`; `packages/pds/src/worker.ts`, the CLI and tests are ours |
| Resident runtime | `packages/resident-pi/` | Our code on top of pi (Earendil) and Cloudflare's Agents SDK as dependencies | Our code AGPL-3.0-only; dependencies under their own licences | Work-scoped authority, egress refusal, redaction and budgets are ours |
| Clustering batch | `packages/clustering-cpu/` | Our script calling Faiss `NumpyEmeans` as a dependency | Our code AGPL-3.0-only; Faiss MIT | No reimplementation |
| Forum behaviour | Throughout | Inspired by PieFed (communities, voting, moderation vocabulary) | PieFed is AGPL-3.0 | Behaviour only. No PieFed code copied (`docs/serverless-reuse-review.md`) |
| Libraries, fonts, map data | `apps/web/licenses/`, `apps/web/public/third-party-notices.txt` | Third parties | MIT, OFL and others as listed | Used as dependencies |

## Open items before the proposal

1. **Photon notice.** `apps/web/src/commons.css` and `apps/web/src/markdown.ts` mention retained Photon features, but Photon's copyright and AGPL notice is not in `apps/web/licenses` or the third-party notices. Both projects are AGPL, so there is no conflict, but the notice must be added, and the files that still contain Photon-derived code should be listed. Needs one pass through `git log` of Honai and a file-by-file check.
2. **AGENTS.md wording.** "Do not copy AGPL donor implementation until licensing is settled" refers to new reuse. The Photon lineage predates it and is the owner's own fork; the rule should say so, so a reviewer does not read it as a contradiction.
3. **Numbers for the proposal.** Commits, files and tests can be counted at submission time with `git rev-list --count HEAD`, `git ls-files` and `npm test`.
