# Deploy paths and the seeding agent

17 November 2026. Research note. Every external page below was read on 17 November 2026 unless a different date is given. Statements marked *unverified* rest on one third-party source or on inference.

## Summary

1. A Cloudflare one-click path is feasible on the free plan for the Strata Worker, its SQLite Durable Object and static assets. It needs a neutral template first (the current configs are tied to the ETNOS preview) and a small setup script for secrets and the first steward.
2. A VPS path is feasible as one script that installs Docker, the official Bluesky PDS installer and a Strata container, with the PDS's own Caddy serving both. Strata's Node host needs Node 24.19 or later (`package.json` engines) because `src/store.ts` uses `node:sqlite`.
3. The operator onboarding flow can be built on what exists: the resident (Pi on a Durable Object), the `seed.config.json` pipeline in `next-2026-11-16.md`, and Studio.
4. opencode is MIT-licensed and can run headless with an HTTP API and an SDK. Its keyless "free models" exist today but are promotional, are restricted to the opencode client, have unpublished limits, and several of them may keep or train on prompts. It cannot run inside a Worker. Embedding it as the seeding engine of every deployment is not recommended. Using it by choice, for public data only, on a laptop or VPS is reasonable.
5. "OpenBot" is real (more than one project of that name). "dusk.bot" is a real desktop app. Neither ships its own keyless models. The nearest match is a third-party listing saying OpenBot can use opencode's free models.
6. The owner's guess in question E is mostly right, with two corrections (section 7).

## 1. opencode

| Item | Finding | Source |
| --- | --- | --- |
| Licence | MIT. The repository page shows 227.4k stars and a `packages`, `services`, `sdks` layout. It now sits under the `anomalyco` organisation; the old `sst/opencode` path is the former name (*unverified redirect*). | [GitHub](https://github.com/sst/opencode) |
| Install | Install script, npm package `@opencode/cli`, Homebrew, Nix, a desktop beta. | [GitHub](https://github.com/sst/opencode) |
| Headless | `opencode serve` starts an HTTP server with no TUI (default 127.0.0.1:4096), OpenAPI 3.1 spec at `/doc`, HTTP basic auth through `OPENCODE_SERVER_PASSWORD`, sessions, messages, events over SSE. | [Server docs](https://opencode.ai/docs/server/) |
| SDK | `@opencode-ai/sdk`: `createOpencode()` starts a server and client; `createOpencodeClient({baseUrl})` connects to one. The v2 client supports JSON-schema structured output with retries. | [SDK docs](https://opencode.ai/docs/sdk/) |
| Non-interactive | `opencode run "prompt"` is described as "designed for scripts, CI jobs, and other workflows". | [CLI docs](https://opencode.ai/docs/cli/) |
| Local models | Ollama, LM Studio and vLLM on localhost are discovered with no account. | [Providers](https://opencode.ai/docs/providers/) |
| In a Worker | Not possible. It is a Node/Bun process that spawns a server, reads and writes a working directory, and runs tools. Nothing in the docs suggests a Workers build. This is an inference. | n/a |

### Free models ("Zen" and the Console)

The model catalogue page is at [opencode.ai/docs/zen](https://opencode.ai/docs/zen) and describes a pay-as-you-go gateway (the page now speaks of the "OpenCode Console"). Findings:

- Fourteen free models were listed, including Big Pickle, Iceman Free, Inkling 2 Small Free, GLM-5.3-Flash Free, DeepSeek V4.1 Flash Free, Beam Free, Flint 40B Free, LongCat 2.5 Free, MiMo-V2.6-Flash Free, three Nemotron Free models and Jev 1.13 Free.
- Stability: several are described as free "for a limited time"; the page publishes no end date. A third-party article of 2 November 2026 says an earlier free model was removed from the picker when its promotion ended ([Apidog](https://apidog.com/blog/deepseek-v4-1-flash-free-opencode/)). Treat the list as promotional and changing.
- Client restriction: the page says "Free-tier chat models require OpenCode; use paid models or Go from other clients." The same article reports a 403 `FreeTierError` for calls from outside opencode. So the free models cannot be called from our own Worker or from a plain HTTP client.
- Key or account: the official page does not say whether free models work without sign-in. The same article reports a fresh install ran a free model with no sign-in and no key (one source, *unverified*). Other third-party guides disagree ([search results, 17 Nov](https://learnopencode.com/en/1-start/04a-free-models)).
- Rate limits: the only published number is 100 requests a day for LongCat 2.5 Free. Third-party reports describe HTTP 429 `FreeUsageLimitError` and limits per IP or workspace, *unverified*. Context is capped at 200K tokens and output at 32K for the model in the article.
- Data use (official page): providers "follow a zero-retention policy and do not use your data for model training", with exceptions. Big Pickle and Flint 40B Free may use data to improve the model (Flint keeps it 30 days); Iceman Free retains data and uses it; Inkling 2 Small Free retains and may train; the Nemotron Free models are trial endpoints, logged, and "should not be used for personal or confidential data"; Beam Free keeps data 30 days; LongCat 2.5 Free is hosted in China. Per-model terms vary, so a deployment would have to pin a model whose terms it has read.
- Terms of service ([terms](https://opencode.ai/legal/terms-of-service)): on unpaid accounts content may be used to develop and improve the services; programmatic extraction of output, "auto-responders" and "processes that run while you're logged out" are prohibited; use is for the user's own internal use; bulk or multiple accounts to get around limits are prohibited. The terms do not mention Zen or the free models. Whether a deployment's seeding agent counts as "automated use" is not settled by the text. Ask the vendor before depending on it.

Consequence: private community data must never go to these models. Public data (Wikidata, Glottolog, Wikipedia, news metadata) is acceptable if the chosen model's terms are read. Seeding is a one-time, public-data job, which fits.

## 2. Alternatives for keyless or low-key inference

| Option | Key needed | Runs where | Free allowance | Data use | Source |
| --- | --- | --- | --- | --- | --- |
| Cloudflare Workers AI | No key; a binding in the Worker | In the Worker | 10,000 Neurons a day, Workers Free and Paid; Free cannot exceed it; resets 00:00 UTC | Cloudflare does not train on customer content; standard inference inputs and outputs are not retained after the response | [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/) |
| Google AI Studio (Gemini API) | Yes, a key from AI Studio | Any server | See `free-tier-llm-coverage-2026-11-16.md`: about 14,400 a day for Gemma 4, 500 for Flash-Lite, 20 for the strongest Flash. Numbers are third-party | Free-tier input and output may be used to improve products and read by reviewers; public data only | [repo note](free-tier-llm-coverage-2026-11-16.md) |
| OpenRouter free models | Yes, an API key | Any server | 50 requests a day without purchased credits, 1,000 a day with 10 credits purchased | Prompts not logged by default; routes only to providers that meet that unless the operator changes the setting | [FAQ](https://openrouter.ai/docs/faq) |
| Local model (Ollama, LM Studio) | No | Operator's laptop or VPS | Hardware only | Stays local | [Providers](https://opencode.ai/docs/providers/) |
| opencode free models | Reportedly none, opencode client only | Laptop or VPS | Unpublished, promotional | Varies by model, see above | [Zen](https://opencode.ai/docs/zen) |

Workers AI is the only option that is keyless, in-Worker, documented as non-training and stable in the account's own control. Its limit (10,000 Neurons a day) is small; the repo note estimates a full ETNOS day would use about 160% of it, so it suits seeding in slices over several days, not live Q&A for a busy site.

## 3. "OpenBot" and "dusk.bot"

| Name | What it is | Models | Verdict |
| --- | --- | --- | --- |
| OpenBot (`meetopenbot/openbot`) | "A local-first harness for running AI agents": local server on port 4132, agents defined in `AGENT.md`, plugins, SSE event API, Node 20.12+. The repository page says MIT through v0.5.3 and that newer work is not published there. Aggregator listings of the desktop app say PolyForm Noncommercial, *unverified*. | The README example sets a provider API key (`openai/gpt-4o-mini`). A search result says its only no-account option is opencode's free models; the repository page does not say this. | Real. It does not ship keyless models of its own. The keyless route, if it exists, is opencode's. [GitHub](https://github.com/meetopenbot/openbot), [search](https://www.mindstudio.ai/blog/openbot-run-locally-free/) |
| dusk bot | Desktop app (macOS, Windows, Linux) running "bots", each with its own computer, memory and job; optional hosted Dusk Cloud. Free for personal use; work licences on paid plans; source licence not stated. | You sign in with an existing AI account (it lists OpenCode among them), bring an API key, or run a model yourself. Replies go from the machine to the provider "on your plan". | Real. No keyless models of its own. [dusk.bot](https://dusk.bot) |

So the owner's recollection is half right: such apps let a user plug in opencode, whose free models need no key. They do not bundle models. They delegate to opencode, and so inherit its promotional terms.

## 4. Cloudflare one-click deploy

| Topic | Finding | Source |
| --- | --- | --- |
| Button | `https://deploy.workers.cloudflare.com/?url=<repo URL>`. Cloudflare clones the repository into the user's GitHub or GitLab account, shows one setup page for names, builds with Workers Builds and deploys. | [Deploy buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/) |
| Provisions | KV, D1, R2, Hyperdrive, Vectorize, Secrets Store; Durable Objects, Workers AI, Queues. Reads the Wrangler config, creates resources, writes IDs back. | same |
| Requirements | Public repository; defaults in the Wrangler config; plain variables under `vars`; secrets listed in `.dev.vars.example` (the setup page prompts for them); `build` and `deploy` scripts in `package.json` are pre-filled; a `cloudflare.bindings` section in `package.json` can describe each value. | same |
| Limits | Workers only, github.com and gitlab.com only, monorepos "not fully supported": a subdirectory URL works only if the app and its dependencies are fully isolated in it. | same |
| Free plan, Durable Objects | SQLite-backed only. Per day: 100,000 requests, 5 million rows read, 100,000 rows written, 13,000 GB-s duration; 5 GB stored; resets 00:00 UTC. | [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) |
| Free plan, R2 | 10 GB-month storage, 1 million Class A and 10 million Class B operations a month, free egress. Whether a payment method must be on file to enable R2 is not stated on that page (*unverified*). | [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| Free plan, Workers | 100,000 requests a day and 10 ms CPU per request, as already recorded in `showcase-plan-2026-11-17.md` §3. Sign-in cost on Free is still unmeasured. | repo |

What a Strata template needs, from `wrangler.web.jsonc` and `docs/cloudflare-profile.md`:

- One Worker (`src/web-worker.ts`) with an `ASSETS` binding for the built Svelte app, one SQLite Durable Object class `StrataNode` with migration `v1`, `nodejs_compat`, observability off.
- Plain variables: `STRATA_ORIGIN`, `STRATA_NODE`, `STRATA_STEWARD_DID`, `STRATA_CLIENT_NAME`, `STRATA_CATALOGUE`, enrolment and publishing switches.
- Two secrets: `STRATA_OAUTH_JWK` and `STRATA_AUTH_SEAL_KEY`. Both are generated, so a setup script should create them rather than ask the operator.
- Optional: an `AI` binding for Workers AI; an R2 bucket (the cloudflare-profile says none is required today); a separate PDS Worker (`packages/pds`, one identity per deployment, not multi-account).

Gaps found in the repository:

- `docs/client-deployment-contract.md` already says the current configs share the preview Worker name and node and must not be deployed unchanged, and that neutral validated templates are needed before calling this an installer.
- The web assets live in `apps/web` and are built by `npm run build:ui` before `wrangler deploy`. The button's build step must run that, so a root `deploy` script such as `npm ci && npm run build:ui && wrangler deploy` is needed.
- The root repository is one package with `apps/web` and `packages/*` inside it, so the button should point at the repository root, not a subdirectory.
- `STRATA_STEWARD_DID` is an AT identity, which the operator has before they have a deployment only if they already hold a Bluesky or PDS account. The setup flow must say so, or offer to create one on a PDS first.
- The origin must be known at deploy time (`STRATA_ORIGIN`); with a `workers.dev` name it is predictable, with a custom domain the operator sets it in the second step. Custom domains are attached after deploy and are available on the free plan (*unverified in this research*).

The alternative to the button is a C3 template (`npm create cloudflare@latest -- --template <repo>`), which suits the laptop path (`npx strata init`) because it can run the secret generation and the first publish locally. Not read in this research; the Cloudflare C3 documentation should be checked before relying on it.

## 5. VPS one-command install

| Topic | Finding | Source |
| --- | --- | --- |
| Official PDS installer | `installer.sh` from `bluesky-social/pds`, run with `sudo bash`, interactive (DNS name, admin email, optional first account). Ubuntu 22.04, 24.04, 26.04, Debian 11, 12, 13. Needs ports 80 and 443 and an A record plus a wildcard A record. Docker Compose with Caddy and Watchtower. 1 GB RAM, 1 CPU, 20 GB SSD recommended for 1 to 20 users. MIT or Apache 2.0. | [bluesky-social/pds](https://github.com/bluesky-social/pds) |
| What it writes | Data in `/pds` (the script refuses any other path), `/pds/compose.yaml`, `/pds/pds.env` with generated secrets, `/pds/caddy/etc/caddy/Caddyfile`, a systemd unit `pds.service`, `/usr/local/bin/pdsadmin`. Installs Docker from Docker's apt repository if missing. | [installer.sh](https://raw.githubusercontent.com/bluesky-social/pds/main/installer.sh) |
| Caddyfile | One block for `*.${PDS_HOSTNAME}, ${PDS_HOSTNAME}` with on-demand TLS and `reverse_proxy http://localhost:3000`. | same |

Consequences for putting Strata beside it:

- The PDS's Caddy owns ports 80 and 443 and its Caddyfile already claims the wildcard of the PDS hostname. Strata should therefore live on a different hostname (for example `etnos.example.org` for Strata and `pds.example.org` for the PDS, so user handles are `name.pds.example.org`). A second block is added to the same Caddyfile with `reverse_proxy` to Strata's port; one Caddy, one certificate manager. The installer's file is regenerated only on install, so the Strata script must append to it idempotently and reload Caddy (inference; not tested).
- Do not point the PDS wildcard at the same name as Strata. This is why the PDS `hostname` and the Strata origin must differ.
- Strata on the VPS runs from the repository's Node host (`npm start` runs `src/cli.ts serve`, which uses `src/http.ts` and `node:sqlite`). `docs/client-deployment-contract.md` calls this host a "loopback developer API; not a production browser-auth server". So the VPS path is **not ready**: the Node host has to be qualified for production sign-in (OAuth, sealed cookies, exact Origin), or Strata on the VPS must run the Worker code under workerd (`wrangler dev` or the open-source `workerd` binary) with the same Durable Object. The second is closer to what is already tested (`test:worker`, `test:web`) and keeps one code path. This choice is a decision for the owner.
- Package as a Docker image (`node:24` or a workerd image), a compose file added next to `/pds/compose.yaml`, and one script (`install.sh`) that: checks the OS and ports, downloads the PDS installer, verifies a published SHA-256, runs it, then adds Strata. The `curl | sh` pattern is acceptable only with a pinned checksum, a version in the URL and a readable script; the PDS README itself downloads then runs, which is the safer shape to copy.
- Hardware: the PDS recommends 1 GB RAM; add roughly the engine's needs (not measured here). Treat 2 GB RAM as a working guess, *unverified*.

## 6. Where the seeding agent can run

Existing pieces in the repository:

- `packages/resident-pi`: the optional Aksara resident. One Pi agent session per community/thread on a SQLite Durable Object (`PiResidentSession`), bound to Strata through `ResidentAuthority` (budgets, work tickets, publication) and to a model through a `MODEL_GATEWAY` service binding (today the owner's WPW gateway). Web search and fetch tools need an `AI` binding and AI Gateway. It has no model keys inside.
- `docs/next-2026-11-16.md`: the seed pipeline (`seed.config.json`, survey, `verify-wiki-seed.py`, writer step, `check-wiki-pages.ts`, `propose-wiki-pages.ts`). Today these are scripts run by the owner.
- `docs/direction-2026-11-16.md`, "Aksara Node": the separate aksara-core host (Mastra-based harness, alpha, Apache-2.0) for a community's private work. Out of scope for first seeding.
- `src/web-worker.ts` shows no model call in the engine itself; inference is behind the resident and a gateway.

| Path | Seeding agent | Why | Data allowed |
| --- | --- | --- | --- |
| Cloudflare free, no extra account | Workers AI through an `AI` binding, driven by the resident or a small seeding Durable Object, in daily slices | Keyless, in-Worker, non-training, stable; 10,000 Neurons a day means a seed of a few hundred pages takes days, so the flow must show progress and resume | Public only |
| Cloudflare free, with a Google AI Studio key | Gemma 4 for bulk, Flash-Lite for writing, as already planned | Higher volume and quality | Public only (free-tier terms) |
| VPS | Same as above, plus a local model if the server has the memory, plus opencode if the operator chooses it | More freedom; PDS beside it | Public only for free hosted models; private data only with a local model |
| Operator laptop, `npx strata init` | opencode free models by choice, or any key the operator has, or a local model; the CLI calls the deployment's seed API | Seeding is a one-time public-data job; the laptop avoids both the Worker's CPU limit and Workers AI's daily cap | Public only |

## 7. Verdict on the owner's guess

The guess is right in shape. Corrections:

1. opencode's free models are restricted to the opencode client and are promotional, so they cannot be a dependency of the default flow. They are a convenience on a laptop or a VPS, switched on by the operator after reading the per-model terms, and the CLI must refuse to send anything not marked public.
2. Workers AI alone does not carry quality seeding of wiki pages in Indonesian or Papuan-region languages (no measurement in the repository). The honest default for the Cloudflare path is Workers AI for structured, short jobs (labels, matching, extraction) and an optional AI Studio key (or a local model) for page writing. The existing checkers (`verify-wiki-seed.py`, `check-wiki-pages.ts`) apply regardless of model; they are what makes a small model acceptable.
3. A Worker-resident seeding agent can already use the existing resident and `ResidentAuthority`, so the in-browser flow does not need a new agent runtime. A second runtime (opencode) adds a Node process, a port, a password and a licence relationship the project does not control.

## 8. Recommended build order

1. Neutral template: root config, `.dev.vars.example`, `deploy` script, a `strata init` step that generates the two secrets and writes `STRATA_ORIGIN` and the steward. Test it against a fresh free account (not created in this research).
2. Seed API in the engine: draft, confirm and receipt records for each step, with the sources per item; reuse the existing verification scripts as library code.
3. Operator onboarding screens in Studio ("Mulai dari awal"), driven by Workers AI first.
4. `npx strata init` CLI with model adapters (Workers AI over the API, AI Studio key, local model, opencode through its SDK) and a public-data-only guard.
5. VPS script, after the production-host question in section 5 is decided.

## Open questions for the owner

- Is the VPS Strata process to be the Node host (needs production sign-in work) or workerd running the Worker build?
- Is the first steward required to already hold an AT account?
- Does ETNOS ask opencode's maintainers whether seeding through their free models is within their terms before it appears in docs?

## Sources

All read 17 November 2026.

- opencode repository: https://github.com/sst/opencode
- opencode server docs: https://opencode.ai/docs/server/
- opencode SDK docs: https://opencode.ai/docs/sdk/
- opencode CLI docs: https://opencode.ai/docs/cli/
- opencode providers: https://opencode.ai/docs/providers/
- opencode models and free list (Zen/Console): https://opencode.ai/docs/zen
- opencode terms of service: https://opencode.ai/legal/terms-of-service
- Apidog article on a free model in opencode (2 November 2026): https://apidog.com/blog/deepseek-v4-1-flash-free-opencode/
- Third-party free-model guide (search result, not opened in full): https://learnopencode.com/en/1-start/04a-free-models
- OpenBot: https://github.com/meetopenbot/openbot ; listing: https://www.mindstudio.ai/blog/openbot-run-locally-free/
- dusk bot: https://dusk.bot
- Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Workers AI data usage: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- OpenRouter FAQ: https://openrouter.ai/docs/faq
- Deploy to Cloudflare buttons: https://developers.cloudflare.com/workers/platform/deploy-buttons/
- Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Bluesky PDS: https://github.com/bluesky-social/pds ; installer: https://raw.githubusercontent.com/bluesky-social/pds/main/installer.sh
- Repository documents: `docs/showcase-plan-2026-11-17.md`, `docs/next-2026-11-16.md`, `docs/strata-model-2026-11-17.md` §4.5, `docs/research/free-tier-llm-coverage-2026-11-16.md`, `docs/cloudflare-profile.md`, `docs/client-deployment-contract.md`, `docs/pds-hosting.md`, `docs/direction-2026-11-16.md`, `packages/resident-pi/README.md`, `wrangler.web.jsonc`, `package.json`.
