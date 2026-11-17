# Aksara's agent harness: keep pi, add a place notebook

17 November 2026. Read-only research; no code changed. Sources are at the end; everything marked *(not measured)* or *(to verify)* is an estimate or an open check.

## 1. Recommendation (one line)

**Keep pi (pi-durable hosted by the Cloudflare `agents` package) and build the missing part ourselves: a per-region place notebook in SQLite, plus a model backend that runs inside the Worker.** Do not adopt Mastra. Do not adopt Flue. About 12 to 15 working days for everything, 6 to 7 for the part the showcase needs.

Why, in four sentences. Pi already gives us the hard, boring half of an agent (durable loop, tools, retries, crash recovery, compaction) and our security layer is already built on it. None of the three alternatives gives us the thing we are actually missing, which is memory with a source and a withdrawal rule on every fact, stored in our own SQLite. Flue is built on the same pi packages, so switching buys a framework and a rewrite for no new capability. Mastra's memory is generic chat memory that wants a vector store we cannot keep in a Durable Object, and a very large dependency tree.

## 2. What we have today

`packages/resident-pi/` is **460 lines in 5 source files** (31 KB, written in a dense style) and 4 test files (about 150 lines), plus about 590 lines on the Strata side (`src/resident*.ts`) that own jobs, routing, mandates and publication.

| Piece | File, lines | What it does | Who wrote it |
| --- | --- | --- | --- |
| Agent loop, tool calls, retries, crash recovery, durable transcript | pi-durable `Harness` | model turn, tool round, resume after eviction, `maxTurns`, `restartLimit`, retry policy | **pi** |
| Compaction | pi-durable, `settings.compaction` | summarises the older part of one transcript | **pi** (configured by us: reserve 2,048, keep 2,048) |
| Durable sessions in a Durable Object | `agents/harness/pi` (`PiHarness`) + `agents/lifecycle` | opens pi over `ctx.storage.sql`, wakes on alarm | **agents 0.33.0** |
| Web search and fetch tools | `agents/websearch/pi`, `agents/webfetch/pi` | optional, off by default | **agents** (we wrap them) |
| Entry, input validation, one DO per (community, agent, epoch, session) | `worker.ts`, 114 | 64 KB body cap, skill allow-list, work table, 100-job retention, failure codes | us |
| Model transport | `gateway-models.ts`, 42 | one allowed URL, redaction, 32 KB cap, `inference` reservation through Strata, token cap, **fake SSE** so pi's OpenAI adapter can read a buffered reply | us |
| Authority calls | `authority.ts`, 11 | every call re-checks the job capability in Strata | us |
| Tools | `extensions.ts`, 78 | `read_current_sources`, `research_helper` (a child pi conversation), `search_reviewed_wiki`, gated `web_search` and `web_fetch` (6 calls per job, each page read recorded) | us |
| Gemini tool-call signatures | `protocol-replay.ts`, 33 | pi's OpenAI adapter drops `extra_content.google.thought_signature`; we store and restore it | us |

What it is, plainly: **a bounded, one-shot-per-job drafting agent.** Evidence in, a few tool rounds, one text out, Strata publishes or abstains. Declared limits: context window 8,192 tokens, 600 output tokens, 3 turns, 6 tool calls, 5 pieces of evidence.

**Memory today is only the transcript of one thread.** A changed community epoch (any corrected, deleted or moderated post, any accepted wiki revision) starts a fresh session, by design. Nothing carries between jobs, between threads or between days. "Compaction" shrinks one transcript; it is not a memory of a place. So "an Aksara that knows Mee Pago" does not exist yet, and neither pi nor the `agents` package ships one (pi's README has no memory feature; `agents` has context blocks, see §4).

Other things the code tells us:
- The only model path is a service binding to `westpapua-watch-engine` / `CommonsIntelligence`. That is the dependency we are removing.
- pi-durable is labelled **Experimental** ("API changes without notice between releases"). `agents` supports **one pi minor at a time** (`~1.5.0`). Pin exact versions, as now.
- Bundle: `dist/worker.js` is 1.96 MB raw, 393 KB gzip. Workers now limit only the uncompressed size (64 MiB, Free included), so size is not a blocker. Cold-start CPU of this bundle is *(not measured)*; measure it once before adding more.
- Limits that matter on Free: 10 ms CPU per HTTP request at the Worker entry (our entry only validates and forwards by RPC, so it is tiny); Durable Object invocations list 30 s CPU by default on both plans. Time spent waiting for the model is not CPU. The two daily budgets that bind are **neurons** (10,000) and **SQL rows** (5M read, 100k written, account-wide).

## 3. What "capable agent with place memory" needs, and what is missing

| Need | Have | Missing |
| --- | --- | --- |
| Multi-step loop with tools, durable | yes (pi) | nothing |
| Per-job authority, egress refusal, redaction, budgets | yes (ours) | extend to new tools |
| Model without an external gateway | no | in-Worker backend (Workers AI binding, optional OpenAI-compatible key) |
| Memory of a region across jobs | **no** | notebook tables, ingest, consolidation, bounded read |
| Provenance and withdrawal on every remembered fact | no | resolve at read time against the source |
| People's corrections kept beside facts | no | corrections table, never auto-merged |
| Open questions as first-class | no | questions table |
| Recent events (news, posts, edits) | partly (Strata has them) | a ring buffer view for the prompt |
| Seven regions plus one sitewide face | one resident per community | region identity, per-region budget, sitewide as a view |
| Skills beyond draft and reply (morning story, weekly summary, Tanya) | 4 skills | 3 to 4 more prompts and tools |

## 4. The candidates

### 4.1 Keep pi

- **What it is.** Earendil's monorepo `earendil-works/pi` (MIT, about 122k stars, 8,050 commits). Packages: `pi-ai` (provider layer), `pi-durable` (durable conversations, tasks, tools, hooks, compaction, child tasks, skills), `pi-agent-core` (a lighter non-durable loop), `chord` (document store), `pi-schema`. Current: **1.5.2, released 10 November 2026**; 1.5.0 on 2 November, 1.5.1 on 9 November, so a release about weekly.
- **Does it run in a Worker?** Yes, and it is already tested in workerd in this repo. `openDurableObjectSqliteStorage(ctx.storage)` is a first-party storage adapter; `agents` hosts it.
- **Memory.** Transcript, compaction, "your own state" (documents) and a task graph. No long-term or semantic memory. Everything it stores is in our DO SQLite.
- **Providers.** `pi-ai` has OpenAI-compatible, Google, Anthropic and others; a custom provider with a custom `fetch` is what we use. `agents/models/pi-ai` offers `createAI({binding: env.AI})`, a Workers AI provider (any `@cf/` id; the gateway path is optional). The package's own catalog does not name Gemma 4; whether it accepts `@cf/google/gemma-4-26b-a4b-it` is *(to verify)*.
- **Hooks.** pi-durable has `hook(ToolTask, {beforeTool})`, `replay: 'safe' | 'unsafe'` per tool, per-conversation settings and child conversations. That is exactly what our authority layer uses.
- **Licence.** MIT, AGPL-compatible. `agents` 0.33.0 is MIT (0.x, five minors in the two weeks to 3 November: expect churn).
- **Security layer.** 100% survives; it is built on it.
- **Cost of staying.** Experimental banner, one-minor pinning, an upstream that moves weekly. Mitigation: exact pins, the existing workerd tests as the upgrade gate, upgrade on purpose.

### 4.2 Flue

**What it is, and how sure I am.** *High confidence* it is **Flue, "The Agent Harness Framework" by the Astro team (`github.com/withastro/flue`; npm `@flue/sdk`, `@flue/cli`, `@flue/runtime`; Apache-2.0; about 8.7k stars).** npm lists those packages with `repository: withastro/flue`; the plain `flue` package on npm is an unrelated 2022 library, and several GitHub forks exist. One blog says the maintainers joined Cloudflare; I could not confirm that from a primary source and it does not affect the assessment.

- **Current:** 2.3.0, **12 October 2026** (2.0.x in mid-September, so the 2.x line is about two months old). Its docs warn that a beta-era database is rejected after the move to 2.x ("schema reset"), and its persistence page says the settlement and lease methods are "subject to change until 1.0", which contradicts the 2.x version number. Maturity: young, moving.
- **Built on pi.** `@flue/runtime` depends on `@earendil-works/pi-ai` and `@earendil-works/pi-agent-core`. Provider registry is pi's; custom providers are pi `createProvider` objects. So Flue is **a framework on the same upstream, with its own durability engine instead of pi-durable.**
- **Cloudflare.** The target generates one Durable Object class per agent function using the Agents SDK; conversations, submissions and attachments live in that DO's SQLite; `cloudflare/@cf/...` models use Workers AI with no key; custom OpenAI-compatible providers via `setProvider`. The build must go through its Vite plugin plus `@cloudflare/vite-plugin`, and it requires `nodejs_compat`. A fresh agent response runs inside the DO's alarm.
- **Memory.** Sessions with automatic compaction (`useModel(..., {compaction})`) and typed persistent agent state (`useState`-style). **No long-term, semantic or place memory.**
- **Aimed at** coding-style agents: sandboxes, bash, filesystem, skills (its README's example triages a bug report). Our agent is a source-bound editor, not a coding agent.
- **Security layer.** Provider shim could be reused through `setProvider`; tool gating by wrapping `useTool`; but `worker.ts`, the job/ticket entry, the replay logic, and the workerd tests would be rewritten around Flue's generated classes and Vite build.
- **Verdict.** Same upstream, more opinions, a build system we do not need, a younger durability engine, and no memory. Not worth a rewrite. Worth borrowing: its idea of skills as markdown files (pi already has skills through `agents/harness/pi`).

### 4.3 Mastra

- **Licence, exactly.** The repo is **Apache-2.0 except any directory named `ee/`**, which is under the Mastra Enterprise License (source-available, needs a licence for production). In `@mastra/core` 1.83.0 those directories are `auth/ee`, `agent-builder/ee` and `@mastra/editor/ee`, and **they ship inside the same npm tarball** (there is an `ee-*.js` chunk). npm metadata just says "Apache-2.0", which understates this. Apache-2.0 is compatible with AGPL-3.0 in the one direction we need (an AGPL work may include Apache-2.0 code). The `ee/` parts are not, so we would have to prove they are not bundled. Packages I checked (`core`, `memory`, `cloudflare`, `cloudflare-d1`, `libsql`, `deployer-cloudflare`) list Apache-2.0.
- **Runs on Workers?** Yes in principle: there is `@mastra/deployer-cloudflare`, and `@mastra/cloudflare` has KV and **Durable Object SQLite** storage (`CloudflareDOStorage`, since March 2026; it creates thread, message and workflow tables). Its docs say Workers need external storage for observability, and Cloudflare storage does not support observability.
- **Size.** `@mastra/core` is **98 MB unpacked** with about 30 runtime dependencies (including `posthog-node`, `ws`, `execa`, three AI SDK provider shims, A2A SDKs). Whether it fits and starts quickly on Workers Free is *(not measured)*; the 64 MiB limit makes deployment possible but the startup limit is 1 s.
- **Memory.** Message history (default), **working memory** (a structured block the model rewrites each turn, injected into the system prompt), **semantic recall** (embeddings in a vector store, matches interleaved into history), **observational memory** (background agents compress old messages into "observations"; costs extra model calls). The docs say observational memory needs a storage adapter that supports it and otherwise "turns off without a warning"; I found no sign of it in the Cloudflare adapter's code *(to verify before relying on either)*.
- **Where memory lives.** DO SQLite for threads and messages is possible. Semantic recall needs a vector store, and nothing in the DO adapter provides one; the Cloudflare option is Vectorize, a separate service, which breaks "our DO SQLite, never a third party". We could use the FTS5 route instead, but then we are not using Mastra's memory.
- **Fit.** Its memory is built around a user and a chat thread (`resourceId`, `threadId`). A model-rewritten "working memory" blob has no per-fact source, no withdrawal and no contested state, which is the property AGENTS.md demands. We would build the notebook anyway.
- **Maturity.** 1.x since 20 January 2026; `@mastra/core` 1.83.0 on **12 November 2026**, about 209 stable releases in ten months; about 29.6k stars, 455 open issues. Fast and well funded; also fast-changing.
- **Security layer.** Possible (custom `fetch` in an AI SDK provider, wrapped tools, `RequestContext` for the job ticket), but every piece is rewritten and the per-job generation/epoch semantics have no equivalent.
- **Verdict.** Wrong shape and weight. Revisit only if we later want its eval tooling.

### 4.4 Cloudflare Agents SDK alone (baseline)

- `agents` 0.33.0 (MIT, 3 November 2026). We already depend on it. `@cloudflare/think` 0.23.0 (MIT, 29 October) is its opinionated chat agent: durable loop, **context blocks** (labelled prompt sections, some writable by the model through `set_context`), non-destructive compaction, FTS5 search over messages, tools, extensions, Workers AI by default. The sessions page labels itself **Experimental**; Think's turn API "may evolve".
- It is AI SDK based (not pi), chat and websocket oriented, and its memory is again free text per block with no per-fact provenance. It is a good baseline and confirms the shape of what we should build (labelled blocks in the prompt, a size budget, a search tool), but it does not remove the work, and we would swap a working durable loop for an experimental one.
- Useful ideas to copy (not code): block budget in the header (`maxTokens`), a frozen prompt per session for cache hits, `getRecentHistory(maxBytes)` to bound reads.

## 5. Comparison

| | Keep pi | Flue 2.3 | Mastra 1.83 | Agents SDK / Think |
| --- | --- | --- | --- | --- |
| Licence | MIT | Apache-2.0 | Apache-2.0, **plus `ee/` Enterprise licence shipped in the same package** | MIT |
| AGPL-compatible to depend on | yes | yes | yes for Apache parts; `ee/` no | yes |
| Runs in a Worker / DO | yes, tested here | yes (Vite build, generated DO per agent) | yes (deployer; DO SQLite store) | yes |
| Size and CPU on Free | 393 KB gz now; CPU *(not measured)* | 1.5 MB dist, plus `hono`, `valibot`, MCP client; *(not measured)* | 98 MB package, ~30 deps; *(not measured)*, riskiest | small to medium |
| Durable multi-step loop with tools | yes (pi-durable) | yes (own engine on pi-agent-core) | yes (workflows, agents) | yes (Think, experimental) |
| Working / semantic / compaction | compaction only | compaction, typed state | all four kinds | context blocks, compaction, FTS |
| Memory stored in our DO SQLite | yes | yes | threads yes; vectors **no** | yes |
| Per-fact provenance and withdrawal | no (we build) | no | no | no |
| OpenAI-compatible and Workers AI | yes (custom provider; `createAI`) | yes (`setProvider`; `cloudflare/@cf/...`) | via AI SDK providers | yes |
| Maturity | 1.5.2, 10 Nov, weekly, Experimental banner on durable | 2.3.0, 12 Oct, 2.x about 2 months | 1.83.0, 12 Nov, several a week | 0.33.0, 3 Nov, 0.x, several minors a fortnight |
| Our security layer survives | all | most, after rewrite | rewrite | most, after rewrite |
| Does it give us place memory | no | no | no (generic) | no (generic) |

## 6. Build outline: Aksara with place memory

### 6.1 Principles

1. Memory is **pointers with receipts, not copies of truth.** Wiki pages, claims, posts and sources already live in Strata. The notebook stores what Aksara has noticed and a pointer to the source revision; it never becomes a second source of truth.
2. **Resolve at use time** (AGENTS.md). Every fact is joined to its source when read; a withdrawn, deleted, private or superseded source drops the fact from the prompt that instant.
3. Small enough for the Free budget: the model sees a **bounded briefing (about 2,500 tokens, at most about 40 rows read)**, not a database.
4. Nobody's words are merged. People's corrections sit beside the fact, attributed; humans accept wiki changes.

### 6.2 Where it lives

In the **Strata node's Durable Object SQLite**, in `pn_*` tables beside the claims, wiki and posts. Reason: the withdrawal join and the "write notes together with publication outbox" rule are one transaction there. The resident Worker reads and writes it only through new `ResidentAuthority` paths (`/notebook`, `/note`), as it does for `/context` and `/wiki-search` today. The pi DO keeps only conversations. (Alternative considered: a notebook DO per region inside resident-pi. Rejected: it cannot check withdrawal atomically and doubles the places an access bug can hide.)

### 6.3 Memory model (per region, plus the sitewide view)

| Table | Holds | Notes |
| --- | --- | --- |
| `pn_facts` | region, subject (place, people, language), one sentence of at most 280 characters, source kind (accepted wiki revision, published post in a public community, public source with rights), source id and revision, quote hash, state (`active`, `stale`, `withdrawn`, `contested`), last used | The sentence is a snapshot for the prompt. The source join decides if it may be shown. |
| `pn_corrections` | fact id, post id, author (public handle), text of at most 400 characters, stance (`adds`, `disputes`), state (`open`, `accepted`, `closed`) | "Satu tanggapan dari seorang tetua Mee" lives here and in the post; the digest shows "versi lain". Aksara never edits the fact from it. |
| `pn_questions` | region, text, subject, state (`open`, `asked`, `answered`, `dropped`), asked-in post, answered-by post | Feeds the Tanya kind and the "open questions" list on the region page. |
| `pn_events` | ring buffer: news line, new post, wiki edit, one line plus ref, expires after 14 days | At most 200 rows per region. |
| `pn_digest` | one row per region: the briefing text (at most 1,200 tokens), the hash of what it was built from, revision, built-at | The compacted memory. |
| `pn_fts` | FTS5 over fact sentences and question text | For `search_notebook`. |

Sitewide Aksara has **no memory of its own**: it reads the seven `pn_digest` rows (7 rows) and a short cross-region list (a place in two scopes, such as Nabire, is shown with who says which). That is what keeps "one face" cheap and honest.

### 6.4 Writing, compaction, reading

- **Ingest (code, no model).** On existing Strata events (wiki revision accepted, post published in a public place, news item stored, correction posted) append to `pn_events`; mark facts `stale` when their source revision changes and `withdrawn` when source access ends. Only public, accepted or published material enters. Private rooms never do; a test enforces it.
- **Notes by the model (propose only).** Tool `propose_note` writes a fact or question as `proposed` with a mandatory source ref that resolves to something Aksara actually read this job. Web pages are labelled unreviewed and cannot become `active` facts. A steward or the existing verification gates promote.
- **Consolidation (alarm, per region, daily, about 200 rows read).** Deterministic SQL: expire events, dedupe, flag stale, re-rank by use. **Weekly, one model call** rewrites the digest from the active facts, the open questions and the week's events (about 3,000 in and 600 out, about 44 neurons by the showcase plan's rates, so about 350 neurons a week for all eight). The new digest is accepted only if every fact id it cites is still `active`; otherwise the old digest stays.
- **Read (per job).** One authority call returns: the digest (1 row), the top 6 `pn_fts` hits for the question (at most 600 tokens), up to 5 open questions, up to 8 recent events, plus corrections attached to the chosen facts. Injected as a pi prompt section, so the typical job needs **no extra tool round just to remember**. Hard cap about 2,500 tokens and about 40 rows read.

### 6.5 The agent loop

One pi-durable session per (region, epoch) for scheduled editorial work, and per thread for replies, as now. Each job: Strata creates the job and ticket (unchanged) → authority returns the evidence and the notebook briefing → pi runs 1 to 3 turns with tools → the draft returns → Strata's existing gates (verified sentences, redaction, mandate, budget, atomic publication) decide. `ABSTAIN` stays a first-class outcome. Per-region daily budgets (neurons, jobs, rows) are checked by Strata before inference, as `inference` reservations are today.

Skills: keep `source-digest`, `research-question`, `knowledge-draft`, `thread-reply`; add `morning-story`, `weekly-summary`, `tanya` (question or poll draft), and `survey-draft` later.

### 6.6 Tools

Keep: `read_current_sources`, `search_reviewed_wiki`, gated `web_search`/`web_fetch` (thread replies only).
Add: `search_notebook(query)`, `read_place(place id)` (accepted page plus its claims), `read_news(region, since)`, `read_data(place, metric)` for the Data tab, `propose_note(...)`, `list_open_questions()`. All go through `ResidentAuthority`, are budgeted per job (the current 6-call cap applies), and return text marked as untrusted data.
Delete or demote: `research_helper` (a second model call inside a job; neurons are the scarce budget; keep behind a flag for synthesis jobs only).

### 6.7 Model backend (replacing the gateway)

> **Update, same day.** Points 1 and 2 shipped in a different place: the model logic lives in Strata's `src/models.ts`, and the resident's `MODEL_GATEWAY` binding now points at Strata's own binding-only `ModelGateway` entrypoint instead of `westpapua-watch-engine` (commits 6dcdc4f and 32227d1, both deployed). The key stays a secret on the Strata Worker only, and `jobProvider`'s transport rules are unchanged. Still open from this section: the live Gemma 4 call, `protocol-replay.ts`, and whether to drop the binding later and call `env.AI` inside the runtime.

Keep `jobProvider`'s transport rules (single allowed origin, redaction, 32 KB cap, `inference` reservation, token cap). Replace only what is behind them:
1. **Workers AI**, default: call `env.AI.run('@cf/google/gemma-4-26b-a4b-it', {messages, tools, max_tokens})` from the same guarded function, or hand `agents/models/pi-ai` `createAI` a guarded wrapper of the binding. One live call on a Free account is still needed to confirm the model is not paid-only and what shape the tool-call reply has *(to verify)*. Reasoning stays off (thinking tokens bill as output).
2. **Optional OpenAI-compatible key:** operator-set base URL, model id and secret in the Worker's secrets; the egress check allows exactly that one origin; the key never appears in prompts, posts or tool arguments. ETNOS's own setup is this path with Google AI Studio's OpenAI-compatible endpoint. Keep `protocol-replay.ts` for Gemini tool-call signatures, unless pi-ai's native Google provider handles them *(to verify; if so, delete it)*. A free AI Studio key is for public data only (provider terms on free-tier data use apply).
3. Remove the `MODEL_GATEWAY` binding and `gatewayResidentProvider` (the non-pi path in `src/resident-provider.ts`, 36 lines, goes with it unless we want a no-tools fallback).

**Neuron arithmetic (from the showcase plan's rates, not re-measured).** One job with the briefing: about 4,500 tokens in and 600 out is about 57 neurons, so one tool round-free job is about 175 jobs a day across all eight. Each extra tool round resends the context, so a three-round job is about 170 neurons and only about 58 a day. The consequence: **default to one round, allow more only for thread replies, and give each region a daily neuron ledger** (about 1,200 each plus a sitewide share).

**Rows.** A pi job writes transcript, task and document rows; I estimate 50 to 150 per job *(not measured)*, which keeps 100k writes/day far away. Reads are the account-wide risk (Strata already uses about 40% in a heavy simulated day): the notebook read must stay under about 40 rows, and the daily consolidation under about 200 per region.

### 6.8 Tests (required by AGENTS.md)

- Access isolation: region A's job cannot read region B's notes; a place in two scopes shows both with attribution; no private-room content ever enters `pn_*`.
- Withdrawal: withdraw a source, the next job's briefing omits the fact; an in-flight job's cited fact is dropped at publication.
- Concurrency and replay: two jobs in one region; replayed job returns the same note ids; interrupted `propose_note` is not repeated.
- Publication boundary: an output citing a fact whose source changed during the job is refused.
- Budget: ledger exhausted means abstain, not degrade; briefing never exceeds its token and row caps.
- Corrections: a correction never changes a fact; it shows beside it.
- Upgrade gate: the existing workerd test runs against any pi or `agents` bump.

### 6.9 What to delete

- `MODEL_GATEWAY` service binding and everything that assumes `westpapua-watch-engine`; the fake-SSE-from-gateway comment and path (rewritten for the in-Worker backend).
- `gatewayResidentProvider` in `src/resident-provider.ts` (36 lines, shared file).
- `research_helper` default exposure.
- `protocol-replay.ts` (33 lines) if the Google provider path makes it unnecessary.
- Nothing in the authority, redaction, ticket or budget code.

### 6.10 Estimate

| Work | Days |
| --- | --- |
| Model backend: Workers AI binding and optional OpenAI-compatible provider, config, one live call, tests, remove the gateway | 2 to 3 |
| Notebook: schema, ingest, withdrawal join, `/notebook` and `/note` authority paths, FTS, briefing builder, isolation and withdrawal tests | 4 to 5 |
| Agent: new skills and tools, per-region sessions and alarms, per-region ledgers, sitewide view | 3 to 4 |
| Measure (neurons, rows, cold-start CPU) and a 20-question evaluation of reply quality and abstention | 2 |
| Cleanup and docs | 1 |
| **Total** | **12 to 15** |
| Showcase-critical subset (backend, briefing for one region with facts and open questions, reply with memory, tests) | 6 to 7 |

### 6.11 Risks

- **pi-durable churn.** Mitigation above; budget half a day per upgrade.
- **Gemma 4 tool calling quality at 26B/4B-active.** The current design already tolerates it (small tool set, abstain). The evaluation in §6.10 decides whether regional replies use tools at all or get the briefing and answer in one turn.
- **Free tier is shared and daily.** If neurons run out, Aksara goes quiet; the site must keep working without it (AGENTS.md already says so).
- **Notebook staleness is the quiet failure.** Show "diperbarui" on the digest and have the weekly rebuild report how many facts it dropped.
- **Account-wide row budget.** Notebook reads count against the same 5M; measure before turning on all seven regions.

## 7. Sources (accessed 17 November 2026)

- Local code: `packages/resident-pi/{src,test,README.md,wrangler.jsonc,package.json}`, `node_modules/@earendil-works/pi-durable/{README.md,CHANGELOG.md}`, `node_modules/agents/docs/{harnesses/pi.md,models-pi-ai.md,context.md,sessions.md}`; `src/resident*.ts`; `AGENTS.md`; `docs/showcase-plan-2026-11-17.md` §9; `docs/framing-and-impact-2026-11-17.md` §13; `docs/research/free-tier-measurement-2026-11-17.md`.
- pi repository: <https://github.com/earendil-works/pi>. npm: `@earendil-works/pi-durable` (1.5.2, 2026-11-10), `@earendil-works/pi-ai` 1.5.2, `agents` 0.33.0 (2026-11-03), `@cloudflare/think` 0.23.0 (2026-10-29).
- Flue: <https://github.com/withastro/flue>; npm `@flue/sdk`, `@flue/runtime` 2.3.0 (2026-10-12), tarball docs `guide/cloudflare-target.md`, `guide/models.md`, `reference/data-persistence-api.md`; overview coverage <https://betterstack.com/community/guides/ai/flue-framework.md>, <https://firecrawl.dev/blog/flue-vs-eve-agent-frameworks>.
- Mastra: <https://github.com/mastra-ai/mastra> (licence section), <https://raw.githubusercontent.com/mastra-ai/mastra/main/LICENSE.md>, npm `@mastra/core` 1.83.0 (2026-11-12), `@mastra/memory` 1.41.1, `@mastra/cloudflare` 1.8.0, `@mastra/deployer-cloudflare` 1.2.42; docs <https://mastra.ai/docs/memory/overview>, <https://mastra.ai/reference/storage/cloudflare>, <https://mastra.ai/docs/deployment/cloudflare>; changelog <https://mastra.ai/blog/changelog-2026-03-12>.
- Cloudflare: Agents Think <https://developers.cloudflare.com/agents/api-reference/think/>, Sessions <https://developers.cloudflare.com/agents/api-reference/sessions/>, Workers limits <https://developers.cloudflare.com/workers/platform/limits/>, Durable Objects limits <https://developers.cloudflare.com/durable-objects/platform/limits/> (the page contradicts itself on Free storage: 5 GB vs 1 GB), worker size change <https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/>, Gemma 4 model page <https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/> (256K context, function calling, $0.10/$0.30 per million tokens; free-plan availability not stated there).
