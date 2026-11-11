# Living commons source checkpoint

11 November 2026. Source is pushed directly to `main`, as requested. **This is not a hosted deployment receipt.**

| Repository | Source checkpoint | Remote checks |
| --- | --- | --- |
| [Strata](https://github.com/yohn-maistre/strata/commit/9320ef3ef0501aa35c42e65420e26c8d6496306e) | `9320ef3` — `feat: add living commons knowledge, resident steward, and connected UI` | [Foundation checks](https://github.com/yohn-maistre/strata/actions/runs/42949181534): foundation, resident and PDS jobs all succeeded |
| [Honai Metro](https://github.com/yohn-maistre/honai-metro/commit/68f1d007a677159a065346a02ee9e36dab6737fa) | `68f1d00` — `feat: make connected Honai the main UI` | [Connected UI check](https://github.com/yohn-maistre/honai-metro/actions/runs/42949196776): succeeded; app also rebuilt from a clean local install |

Strata `apps/web` is the canonical connected frontend. Honai Metro's public `main` now includes the connected UI and current polish in `apps/strata`, with a current quickstart and preserved historical Photon/PieFed donor. Its old Pages deployment is manual, so promoting this branch does not accidentally publish the historical backend client. The connected ETNOS app must ship with its same-origin Strata Worker, not as an unrelated static site.

Local evidence: 113 core tests; nine UI unit tests; root types/worker types and generated binding check; real workerd engine access/rollback/restart and web-origin tests; two native Pi model/tool/helper tests and a real Pi SQLite/named-entrypoint authority test. Focused browser journeys pass source → working note → restricted Wiki proposal, sound/mute/font persistence, safe image failure, reader contents, responsive layout at 320–1920 px, and the 24-case navigation/gradual-theme/private-parent check. Fixtures are explicitly synthetic. No live hosted inference is implied.

The optional **embedded Pi resident remains an active foundation deliverable**. Operators should be able to test Strata's own resident without an external harness. The optional external Aksara Core/Node entrance remains separately authorized. Context corrections and revocation fence model use/publication from outside Pi. Source/model provider routes use the configured WPW gateway through a private service entrypoint; no keys were copied into this repository.

Cloudflare plugin was retried and returns `UNAUTHORIZED` / “requires reauthentication”; local Wrangler also reports signed out. Reconnect the existing account before inspecting bindings, backing up hosted state, migrating schema24 and deploying. No temporary account/deployment was created. Qualify the hosted Strata ↔ Pi ↔ WPW binding/bootstrap path and a real resident run after reconnection; keep private language/cultural rooms excluded from the public resident. The WPW bridge has local tests/build evidence but remains an undeployed integration change in its own checkout.

The full scope and current refinement remain in [the foundation](foundation/README.md), [implementation checkpoint](implementation-checkpoint-2026-11-11.md) and [post-first design](post-first-design-2026-11-11.md). Next work should use common post/reply interactions for questions, polls, events and offers, connect readable Wiki/discovery to actual eligible content, and complete the native resident/mention path. The X/Lemmy material is a sourced recommender design, not an already deployed For You algorithm.
