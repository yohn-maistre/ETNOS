# opencode's keyless free models for first-run seeding

17 November 2026. Research note, second pass. It corrects `deploy-paths-and-seeding-agent-2026-11-17.md`, which read only READMEs and docs. This pass read source code. Everything below was read on 17 November 2026. "Unverified" marks what I could not confirm.

Source trees read (shallow clones at the commit shown):

- opencode: `anomalyco/opencode` at `db1d7b9` (the old `sst/opencode` is the former name; the repo has 227k stars). MIT.
- OpenBot: `Leka74/openbot` at `cdfdecf`. MIT. A "self-hosted Grok Bot alternative".
- dusk bot: `DuskBotAI/duskbot` at `76735c0`. PolyForm Noncommercial. I read it for facts only and copied nothing.
- zen-proxy: `12errh/zen-proxy` at the default branch head. MIT. A third-party tool, read only to learn how the gateway behaves.

## Short answer

1. **The owner is right and the earlier note was wrong on the main point.** Both products start the real opencode program and use its built-in keyless "OpenCode Zen" free models. No account, no device login, no token is involved. The program sends the literal API key `public`.
2. **The earlier note was right on three other points.** The free models are limited-time promotions. The gateway only serves the real opencode client; a plain HTTP call is refused. The terms of service contain clauses a seeding job brushes against.
3. **It cannot run in a Cloudflare Worker, and a Worker should not try to imitate the client.** On a VPS or a laptop it can run as a sidecar process, the way dusk bot and OpenBot run it.
4. **Recommended:** offer it as an operator choice in a command-line first run (laptop or VPS), public data only, with a clear disclosure, a pinned download and a one-step removal when a key is added. Do not make it the only default of the Cloudflare path. Details in section 7.

## 1. How OpenBot and dusk bot get a keyless model

### Which projects

There are several projects called OpenBot. `meetopenbot/openbot` (the one the earlier note read) has no opencode code at all: a search of its `src` and `docs` finds no mention. The one that uses opencode is `Leka74/openbot`. dusk bot is `DuskBotAI/duskbot`. Which of these the owner has used is unverified; both match the description.

### dusk bot (DuskBotAI/duskbot)

- **Mechanism: the opencode binary over ACP.** The driver starts `opencode acp` as a child process (`server/drivers/acp/opencode-go.ts:854`, `spawnArgs: () => ["acp"]`). It does not use the SDK and does not call the gateway itself.
- **Auth: none.** The comment at `opencode-go.ts:454` reads "Zen's free models need no login". `isAuthenticated` (about `:895-899`) counts the program as ready if it can list any model, so a person with no key still passes. The status flag `freeFallback` marks the case where only Zen's free models are available (`:641-643`; `shared/model-providers.ts:272-276`). The docs say "OpenCode includes anonymous free models" (`docs/opencode-go.md:22`).
- **Which models.** It does not hard-code ids. It runs `opencode models --verbose` and treats a model as free if the listed cost is zero or the id ends in `-free` (`opencode-go.ts:29`, `:74-78`). It prefers an `opencode/…` free model (`:80-88`). With no login of its own, it shows only the free ones, because the paid ones answer HTTP 402 (`docs/opencode-go.md:62-68`). Provider id is `opencode`; ids look like `opencode/deepseek-v4.1-flash-free`.
- **Fallback ladder.** `server/drivers/acp/free-ladder.ts` steps through free models when one is busy or silent, and cools a failing one for five minutes (`:11-14`). Its comment records a finding from its own testing: "Zen's free limit is per client across every free model (verified 2026-11-14: all twelve answered FreeUsageLimitError at once)" (`:18-19`). The docs add: "The free models all share one per-IP limit, so picking a different one does not buy more free turns" (`docs/opencode-go.md:69-70`).
- **Bundling: binary download, pinned and hashed.** `server/drivers/acp/opencode-release.ts:13-37` pins opencode 1.19.4 from `github.com/anomalyco/opencode/releases`, with a SHA-256 for each platform archive and for the unpacked program. The comment says the vendor "publishes no checksum file", so dusk measured the hashes itself (`:3-7`). I downloaded the Linux x64 archive and its SHA-256 matched dusk's pin (`1697ef40…7cbc`). `server/free-backup.ts:29-53` installs it on first start, only if no copy is found, and never throws. It sets `OPENCODE_DISABLE_AUTOUPDATE=1` (`opencode-release.ts:24`) so the vendor updater cannot replace the pinned copy.
- **Where it runs.** On the user's machine (the desktop app sets `DUSK_PREINSTALL_FREE_BACKUP: "1"` at `electron/main.mjs:1338`) and in a server container: the "cloud home" Docker image sets the same variable (`deploy/docker/Dockerfile:196-199`; `server/cloud-home-start.ts:50`). So dusk runs keyless opencode in a server container, unattended, as its fallback.
- **Role.** It is a backup. The default order puts "OpenCode running only Zen's free no-login models" last (`docs/self-hosting.md` around line 927).

### OpenBot (Leka74/openbot)

- **Mechanism: `opencode serve` plus the opencode client library.** `packages/harness-opencode/src/server.ts:4-5` spawns the user's installed program as `opencode serve --stdio --port 0 --hostname 127.0.0.1` with a generated password. It talks to it with `@opencode/client` 2.0.29 over HTTP and server-sent events (`client.ts:11`, `index.ts:4`).
- **Auth: none.** `probe.ts:15-16` reads "OpenCode Zen (`opencode/*-free`, public key): usable without any login", and `:74` reports "No provider connected (free OpenCode models only)" as a normal state.
- **Which models.** It asks the server for its model list (`model.list`) and shows what is enabled (`probe.ts:53-54`). No ids are hard-coded.
- **Bundling: none.** It uses the opencode the user already installed (`server.ts:201-215`: PATH, then `~/.bun/bin`, `~/.opencode/bin`, `~/.local/bin`). Without it, OpenBot tells the user to install opencode (`probe.ts:32-40`).
- **Client name.** It sets `OPENCODE_CLIENT=openbot` (`packages/harness-opencode/src/config.ts:49`). opencode sends that as the `x-opencode-client` header, so the vendor can see which host program is calling. This matters for the terms (section 3).
- **Where it runs.** On the machine running OpenBot's "brain": a home server, a VPS or a laptop (README, "Many machines").

### What this means

Both depend on the **real opencode program being the client**. Neither talks to the gateway directly. Both treat the free models as a convenience that can disappear.

## 2. What opencode's own source shows

| Question | Finding | Source |
| --- | --- | --- |
| How is an anonymous user authenticated? | If there is no `OPENCODE_API_KEY`, no stored login and no configured key, the `opencode` provider is switched on with `apiKey: "public"`. That is the whole mechanism on the program's side. | `packages/core/src/plugin/provider/opencode.ts:481-486` |
| Are paid models hidden without a key? | Yes. Models with a non-zero input cost are disabled when there is no key. | `opencode.ts:489-501` |
| Can free models be turned off? | `OPENCODE_DISABLE_FREE_MODELS=1` removes them. | `opencode.ts:193`, `packages/core/src/model.ts:100,231` |
| What identifies the client? | Every request carries `x-opencode-client` (the app name), `x-opencode-session`, `x-opencode-session-id`, `x-opencode-project` and a `User-Agent` of `opencode/<channel>/<version>/<name>`. `opencode acp` sets the name to `acp`. | `packages/core/src/session/model-request.ts:325-335`; `packages/core/src/app.ts:22-24`; `packages/cli/src/commands/handlers/acp.ts:24` |
| What happens at the limit? | The gateway answers `FreeUsageLimitError`; the program shows "Free usage limit reached. Connect a provider or subscribe to OpenCode Go to keep going, or switch models." | `packages/ai/src/provider-error.ts:96`; `packages/core/src/session/to-session-error.ts:31-32,47-48` |
| Headless commands | `opencode run` (with `--model provider/model#variant` and `--format json`), `opencode serve`, `opencode acp`. | `packages/cli/src/commands/commands.ts:100,400,426,432,579` |

**The server side is not in the repository.** The gateway that decides who gets a free answer (`https://opencode.ai/inference/…`) is closed. I could not read its rules. What I know of them comes from three sources: the vendor's docs, the third-party zen-proxy project's notes, and one request I made myself.

**My own request.** I sent one plain HTTP chat request to `https://opencode.ai/inference/openai/v1/chat/completions` with `Authorization: Bearer public`, model `deepseek-v4.1-flash-free` and no other headers. It returned HTTP 429: `FreeUsageLimitError … Free models work in OpenCode (https://opencode.ai); subscribe to OpenCode Go to keep going`. I made no further calls. The public model list at `https://opencode.ai/inference/v1/models` answered 200 with 86 models and needs no key.

**Third-party confirmation.** The zen-proxy README says the free models "are served only to the OpenCode CLI itself" and that a bare `curl` gets 429 or 403 `FreeTierError` (`README.md` lines 110-116 and 143). It says the gateway wants genuine agent traffic: paired session headers, opencode's system prompt, a plausible wire format, and it even says the gateway refuses Node's network stack and wants Bun. That project works by imitating the client. I am not recommending that (section 3).

**I did not run the opencode program.** The sandbox refused to execute the downloaded binary, so I did not confirm a live keyless turn from this container. The evidence that it works comes from the source and from dusk bot's own test comment dated 14 November 2026.

### Package names

The earlier note gave the npm package as `@opencode/cli`. In the source, `packages/cli/package.json` is named `@opencode/cli` version 2.3.0 (the unreleased V2 line), while dusk's pinned release is 1.19.4 and its comment says the published npm install is `npm install -g opencode-ai`. Use the release binary, as dusk does, not either npm name, until checked.

## 3. Free models, limits and terms

### Free model list

From the vendor's models page (`opencode.ai/docs/zen`, "Pricing") and the live list (`/inference/v1/models`), thirteen text models are free today, plus one System One model (`jev-1.13-free`):

`big-pickle`, `iceman-free`, `inkling-2-small-free`, `glm-5.3-flash-free`, `deepseek-v4.1-flash-free`, `beam-free`, `flint-40b-free`, `longcat-2.5-free`, `hy4-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3-ultra-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`.

`deepseek-v4.1-flash-free` has a 200,000-token context and a 32,000-token output cap. It was released 17 October 2026 (models.dev catalogue). The vendor lists the paid `deepseek-v4.1-flash` at 0.30 / 1.20 USD per million tokens, so a paid fallback in the same family exists.

The list changes quickly. The same page's deprecation table shows `MiniMax M3.1 Flash Free` retiring today (17 November) and two other free models retired in the past two weeks. The vendor's wording for most of them is "free on OpenCode for a limited time", with no end date.

### Rate limits

- **Published:** only `longcat-2.5-free`, 100 requests a day.
- **Observed by dusk (14 November):** one pool per client or IP shared across all free models; when it is spent, all of them fail at once (`free-ladder.ts:18-19`, `docs/opencode-go.md:69-70`). The size of the pool is not published. Unverified for any particular number.
- **My own bare request** hit the limit message immediately, which is consistent with the gateway refusing non-opencode clients rather than with real exhaustion (zen-proxy makes the same point).

### Data use per model (vendor's "Privacy" section on the same page)

| Model | Retention and training, as stated |
| --- | --- |
| `deepseek-v4.1-flash-free` | Zero retention; not used for training |
| `glm-5.3-flash-free` | Zero retention; not used for training |
| `hy4-flash-free` | Zero retention; not used for training |
| `longcat-2.5-free` | Not retained, not trained on; hosted in China; 100 requests a day |
| `beam-free` | Not trained on; kept 30 days; not available in a long list of countries |
| `big-pickle`, `iceman-free`, `flint-40b-free`, `inkling-2-small-free`, `mimo-v2.6-flash-free` | May be used to improve the model (Iceman and Inkling retain it; Flint 30 days); mimo is a "collect feedback" model |
| `nemotron-*-free` | NVIDIA trial endpoints; logged; "do not submit personal or confidential data" |

The vendor's privacy policy says prompts "are passed through to the upstream model provider … and are not stored" by OpenCode itself, apart from hosted agents (`opencode.ai/legal/privacy-policy`, effective 9 Nov 2026). That does not remove the upstream provider's own terms above.

These statements are the vendor's. I could not check them independently.

### Terms of service (effective 8 November 2026)

Source text: `services/site/src/lib/legal/terms-of-service.ts`, also at `opencode.ai/legal/terms-of-service`.

- You may use the Services "only for your own internal use, and not on behalf of or for the benefit of any third party" (`:107`).
- You may not use them in a manner that "automatically or programmatically extracts data or Output" (`:138`), or "runs … any form of auto-responder … or any processes that run or are activated while you are not logged into the Services" (`:158`), or "uses accounts in bulk … or multiple accounts to circumvent usage limits" (`:136`).
- OpenCode may "terminate (or suspend access to) your use of the Services for any reason in our discretion" and decides what counts as a violation (`:284`).
- The terms say nothing specific about the free models or about server use. They are written for the coding agent.
- The models page says: "Free-tier chat models require OpenCode; use paid models or Go from other clients."

### Plain verdict on the terms

- **Not clearly allowed, not clearly forbidden for a single operator running opencode on their own machine to seed their own site once.** That is "your own internal use" using the real client, the same thing dusk bot and OpenBot do for their users. A one-time, supervised, public-data run is the strongest case.
- **Unattended server use is a grey area that leans against us.** The "programmatically extracts … Output" and "processes that run while you are not logged in" clauses were not written about anonymous use, but they read broadly, and the vendor decides. dusk runs this in server containers, which shows it is tolerated in practice, not that it is permitted. That inference is mine.
- **Using the free endpoint from anything other than the opencode program is against the vendor's stated rule** ("require OpenCode") and would mean copying its client fingerprints. We should not do that, in a Worker or anywhere.
- **Use for the benefit of third parties.** A Strata deployment belongs to its operator and serves a community, so "not on behalf of any third party" is another reason for operator-by-operator, not a shared hosted seeder run by the Strata project.
- **No written permission exists.** The earlier note's suggestion still stands: ask the maintainers before the feature is documented as a supported path.

## 4. Feasibility on Cloudflare Workers Free

**Not feasible as a keyless path. Do not build it.**

- opencode is a native program (about 80 MB archive, 214 MB unpacked) that keeps files and spawns tools. It cannot run in a Worker.
- A Worker calling `https://opencode.ai/inference/openai/v1/chat/completions` with the key `public` is what I tested. The gateway refused it with a free-limit error. Making it work means imitating the opencode client's headers and prompts, which is circumventing the vendor's gate and contrary to the terms.
- Even if it were accepted, the pool is per client or IP. A Worker's outbound address is shared with other Cloudflare tenants (inference; unverified), so it would hit someone else's limit.
- The keyless in-Worker option that is documented and stable is Workers AI (see `deploy-paths-and-seeding-agent-2026-11-17.md` section 2).

What the Worker side still does: hold the seed API, the drafts, confirmations and receipts, and accept pages from an outside seeder through the existing agent route (`scripts/propose-wiki-pages.ts` uses `etnos_propose_page`).

## 5. Feasibility on a VPS or laptop

**Feasible, as a sidecar process the operator opts into.**

### Integration

1. **Install.** A small `strata init` step downloads the pinned release archive for the platform from `github.com/anomalyco/opencode/releases`, checks its SHA-256 against a value we record, unpacks into the deployment's data folder (for example `<data>/engines/opencode/`), and sets `OPENCODE_DISABLE_AUTOUPDATE=1`. This is what `opencode-release.ts` and `free-backup.ts` do; we write our own version with our own measured hashes. The vendor publishes no checksum file (per dusk's comment), so we measure and record them ourselves. I checked the Linux x64 hash against dusk's.
2. **Run.** Two options.
   - `opencode run --model opencode/deepseek-v4.1-flash-free --format json "<prompt>"` for each job (`commands.ts:400,426,432`). Simple, no long-lived process, easy to remove. One start-up cost per call (not measured).
   - `opencode serve --hostname 127.0.0.1 --port <p>` with a generated password (`OPENCODE_PASSWORD` or `OPENCODE_SERVER_PASSWORD`, `packages/cli/src/env.ts:10-11`), as OpenBot does, driven from Node. Better for many calls. Bind to loopback only.
   - In both, run in an empty working folder, set `OPENCODE_DISABLE_PROJECT_CONFIG=1`, and deny every tool permission (the seeding step only needs text out). Both OpenBot (`config.ts:50-52`) and dusk (`opencode-go.ts:881-890`) isolate config the same way.
   - Set `OPENCODE_CLIENT=strata-seed` so the vendor can see who is calling, as OpenBot does with `openbot`. That is honest and keeps us out of impersonation.
3. **Call from the seeding job.** A new script (proposed, not written) such as `scripts/seed-draft.ts` has a one-function adapter, `draft(prompt) -> text`, with three implementations: opencode (`run` or `serve`), an OpenAI-compatible endpoint with the operator's key, and Workers AI. The rest is the pipeline that already exists in `next-2026-11-16.md`: public sentences gathered and checked by `verify-wiki-seed.py`, the writer step, `check-wiki-pages.ts`, then `scripts/propose-wiki-pages.ts`, which already sends each page as a hidden draft with a request key so reruns never double a page. The resident's own model call (`src/resident-provider.ts`, an OpenAI-shaped chat call through a `MODEL_GATEWAY` binding) stays untouched; the seeder is a separate offline job, not a Worker change.
4. **Guard.** The adapter refuses any input not marked public, passes text through `redactPublicModelText` (`src/redaction.ts`, already used by the resident), and pins an allowed model list: `deepseek-v4.1-flash-free`, `glm-5.3-flash-free`, `hy4-flash-free`, `longcat-2.5-free`. All others in section 3 are excluded for retention or training.
5. **Switch to BYOK and remove opencode.**
   - The operator pastes a key in the first-run form (or runs `strata init --key`). The CLI writes it to the deployment's secret store (a Worker secret through `wrangler secret put` on Cloudflare, a protected env file on a VPS), never to a repository or log.
   - Our adapter switches to the OpenAI-compatible implementation. It needs no opencode.
   - The CLI then stops any `opencode serve`, deletes `<data>/engines/opencode/` and the empty working folder, and records "opencode removed" in the first-run receipt. Because the binary lives in one folder and keeps no state elsewhere (isolated home), removal is a directory delete. Unverified: that opencode writes nothing outside its isolated XDG folders; dusk and OpenBot both isolate for this reason.
6. **Removal on a VPS** also means closing the loopback port and removing the systemd unit if one was added.

### Time to seed

The owner's target is under 30 minutes. I could not measure it: I did not run a live turn. The pipeline only needs short, source-bound page drafts (a few hundred tokens each), so call count, not model size, is the limit. A few hundred pages at one call each is plausible in 30 minutes only if the shared free pool is not spent; its size is unpublished and dusk saw all free models fail together. So: **likely for tens of pages, unproven for hundreds.** The existing design already runs in slices and resumes; keep that.

## 6. Risks

| Risk | Detail | Mitigation |
| --- | --- | --- |
| Availability | Free models are "for a limited time"; ids retire without notice (three retired in two weeks). The shared pool can empty at once. | Allowed-list plus automatic fallback in order; show "free models unavailable, add a key or try tomorrow"; never block site launch on it. |
| Terms | Section 3 verdict. Unattended automation is a grey area; the vendor can cut access at will. | Operator opt-in, supervised first run, own machine, own site; ask the maintainers for written confirmation; keep the BYOK path equal in the UI. |
| Free tier ends | Vendor may add a charge or remove the anonymous path. | The adapter is one function; the first-run state saves drafts, so a switch of provider keeps the work. |
| Retention and training | Vendor says zero retention and no training for DeepSeek V4.1 Flash Free, GLM-5.3-Flash Free and Hy4 flash Free. Other free models may keep or train on prompts. These are the vendor's claims. | Public data only; allowed-list; disclose in the form ("what you send is public sources and is processed by a third party"). |
| Indonesian and Papuan content quality | Not measured. DeepSeek, GLM and Hy are strong general models; this says nothing about Papuan place names, languages or customary terms. Unverified. | Do not ask the model for facts. Give it verified public sentences and ask it only to rephrase and cite them; keep `verify-wiki-seed.py` and `check-wiki-pages.ts` as the gate; mark pages "unreviewed". |
| Hallucination | Small and promotional models invent names and links. The project forbids fabricated content. | Every sentence in a page must trace to a supplied source (the existing `basis` field in `propose-wiki-pages.ts`); the model may return `ABSTAIN` as the resident does (`src/resident-provider.ts`); a page failing the checker is dropped, not repaired. |
| Supply chain | We would download an 80 MB vendor binary. | Pin version and hash; fetch only from the vendor's GitHub release; show the hash in the receipt. |
| Tool access | opencode can run shell and file tools. | Empty folder, all permissions denied, loopback only, no secrets in the environment. |
| Licences | opencode is MIT. dusk bot is PolyForm Noncommercial and OpenBot is MIT; we copy neither. Strata is AGPL-3.0. | Write our own thin adapter; cite behaviour, not code. |

## 7. Recommendation

**Verdict: feasible as an optional, public-data-only path on a laptop or VPS. Not feasible inside a Worker. Not recommended as the only default.**

The owner's two ideas, adjusted:

1. **opencode as default with BYOK as option.** Only where it can run (command line on a laptop or VPS). On the Cloudflare one-click path the keyless default should be Workers AI for structured jobs, with the key form for page writing. If the owner wants opencode as the first option on the VPS path, that is reasonable once the maintainers agree.
2. **A minimal first-run form.** Yes. Suggested wording and behaviour:
   - Title: "Choose how Aksara writes your first pages."
   - Option A: "Paste an API key" (works on every path; stored as a secret; recommended).
   - Option B: "No key? Start for free." Shown only on the CLI or VPS path. Text: "Uses OpenCode's free models. Not recommended long term: they can change or stop at any time, and what you send is processed by a third party. Only public sources are sent. Private data is never sent."
   - After the first seed, or as soon as a key is saved: stop the helper, delete it, write a receipt line. The form states this.
   - On the Cloudflare path, Option B reads "Start with Cloudflare's free AI (daily limit)", which is Workers AI.

**Build order for this feature:** (1) the `draft()` adapter and public-only guard; (2) the BYOK adapter; (3) the opencode adapter with pinned download and removal; (4) the first-run form. Do (3) only after asking the opencode maintainers.

## 8. What I could not verify

- A live keyless turn through the opencode program (the sandbox refused to execute the downloaded binary).
- The gateway's real rules, pool size and per-IP behaviour (closed source; only inferred from docs, dusk's tests, zen-proxy and one rejected request).
- Whether the vendor treats unattended server seeding as permitted.
- Quality of any free model on Indonesian or Papuan-region content.
- Time to seed hundreds of pages.
- Which OpenBot the owner used. `meetopenbot/openbot` contains no opencode code.
- That the opencode program writes nothing outside an isolated home.

## Sources

Code (read 17 November 2026):

- opencode: `packages/core/src/plugin/provider/opencode.ts:193,481-501`; `packages/core/src/model.ts:100,231`; `packages/core/src/session/model-request.ts:325-335`; `packages/core/src/app.ts:22-24`; `packages/core/src/session/to-session-error.ts:31-32,47-48`; `packages/ai/src/provider-error.ts:96`; `packages/cli/src/commands/commands.ts:100,400,426,432,579`; `packages/cli/src/commands/handlers/acp.ts:24`; `packages/cli/src/env.ts:10-11`; `services/site/src/lib/legal/terms-of-service.ts:107,136,138,158,284`. https://github.com/anomalyco/opencode
- dusk bot: `server/drivers/acp/opencode-go.ts`, `opencode-release.ts`, `free-ladder.ts`; `server/free-backup.ts`; `server/cloud-home-start.ts:50`; `deploy/docker/Dockerfile:196-199`; `electron/main.mjs:1338`; `docs/opencode-go.md:22,62-72`; `docs/self-hosting.md` near line 927. https://github.com/DuskBotAI/duskbot
- OpenBot: `packages/harness-opencode/src/probe.ts:15-16,53-54,74`; `server.ts:4-5,201-215`; `config.ts:49-52`; `client.ts:11`. https://github.com/Leka74/openbot
- zen-proxy README lines 110-116, 143. https://github.com/12errh/zen-proxy

Pages:

- Models, free list, privacy: https://opencode.ai/docs/zen
- Terms: https://opencode.ai/legal/terms-of-service
- Privacy policy: https://opencode.ai/legal/privacy-policy
- Live model list: https://opencode.ai/inference/v1/models
- models.dev catalogue: https://models.dev/api.json

Repository: `docs/research/deploy-paths-and-seeding-agent-2026-11-17.md`, `docs/showcase-plan-2026-11-17.md` section 23, `scripts/propose-wiki-pages.ts`, `src/resident-provider.ts`, `packages/resident-pi/src/worker.ts`.
