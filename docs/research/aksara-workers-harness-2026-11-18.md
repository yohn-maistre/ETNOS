# Aksara on Workers: a workspace for pi, and what "coding agent" can honestly mean on the free tier

18 November 2026. Read-only research; no code changed. Builds on `resident-harness-2026-11-17.md` (keep pi, build a place notebook). Anything marked *(not measured)* or *(to verify)* is an estimate or an open check. Sources and dates are at the end.

## 1. Recommendation (one paragraph)

**Keep pi. Give each region a real workspace (a durable folder of files) using Cloudflare's `@cloudflare/computer` Workspace, which runs on Workers Free. Keep the place notebook in ETNOS's own database as the one source of truth, and show it to the agent as read-only markdown files. Let the agent write only to a scratch and drafts area. Do not promise model-written code execution on the free tier, because every Cloudflare way to do it needs the $5 Workers Paid plan. Use a small set of ETNOS-defined functions ("scripts") instead, and add real code execution as an opt-in Paid step and as the self-hosted harness's job.** Do not adopt optmem: its method is a good idea but upstream has no licence and its store does not allow withdrawal. Copy the shape (append-only log, rebuildable summary, small startup read), not the code.

So: "coding agent" is the wrong frame for the free tier. The right frame is **a notebook-keeping research editor that works in files**. Reasons are in section 6 (the daily model budget allows a handful of long coding tasks a day, not a coding assistant).

## 2. "Cloudflare OS" and "Cloudflare computer": what they are

They are two different, real, recent products. Both are August 2026.

| | What it is | What it gives an agent | Plan | Licence | Maturity |
| --- | --- | --- | --- | --- | --- |
| **`@cloudflare/computer`** (npm 0.11.3, 17 Nov 2026; repo `cloudflare/computer`) | A library: a SQLite-backed virtual filesystem inside a Durable Object, plus pluggable execution backends | `fs` like `node:fs/promises` (read, write, mkdir, readdir, rm, grep); ready-made agent tools (`read`, `ls`, `find`, `grep`, `write`, `edit`, `delete`, optional `exec`) **with a pi-shaped entry point** (`createPiTools`, `forPiTools`); a git client; read-only mounts from R2 or bundled files; shell and code execution through a chosen backend | **Filesystem and tools: Workers Free is enough** (needs only `nodejs_compat` and a SQLite Durable Object). **Every execution backend needs Paid** (see below) | MIT | Announced 3 Aug 2026 as "an early preview". The README now marks Workspace, fs, codemode backend, tools, git as **Stable**; container backend, worker-shell, remote exec, sync as **Experimental** |
| **Cloudflare OS** (repo `cloudflare/cloudflare-os`, 11.8k stars) | A whole self-deployable product: an agent chat workspace for a company, "gadgets" (small apps the agent builds, each in a Dynamic Worker with its own SQLite), "gatekeepers" (OAuth-style access to outside systems with simulated side effects and later human approval) | A finished UI and security model, not a library | Not stated by Cloudflare; it relies on Dynamic Workers, so **assume Paid** | Apache-2.0 (per the repo page) | README: "early access", v2 "very capable, but still has many rough edges"; self-hosting off Cloudflare is "coming soon"; outside code contributions limited |

Verdicts.
- **Cloudflare computer: use the Workspace part.** It is the first-party, MIT, pi-compatible answer to "a filesystem for the agent", and it is built on exactly our storage (the DO's own SQLite).
- **Cloudflare OS: do not build on it.** It is an enterprise app (users, gadgets, gatekeepers), not a harness for a public wiki. It is useful to *read* for ideas: capability-based access ("agents start with zero access"), simulate-then-approve side effects (this is our draft-only rule), and the idea that an agent's apps and files live in one per-workspace Durable Object.
- I found nothing called "Cloudflare computer use" in the Anthropic sense. The nearest is **Browser Run** (the renamed Browser Rendering, with Kitesurf, an agent browser announced 6 Aug 2026 and hosted-only). Not needed for Aksara; skip.

### The container products (Sandbox SDK, Containers)

| | What | Plan | Licence | Maturity | Verdict |
| --- | --- | --- | --- | --- | --- |
| **Containers** | Real Linux containers started by a Worker/DO | **Not on Free** (table shows N/A for Free; usage is bundled in the $5 Paid plan: 25 GiB-hours memory, 375 vCPU-minutes, 200 GB-hours disk included; extra $0.000020 per vCPU-second, $0.0000025 per GiB-second) | n/a (platform) | GA 13 Apr 2026 | Paid only. Self-host phase, not the entry tier |
| **`@cloudflare/sandbox`** (1.0.3, 22 Oct 2026) | SDK over Containers: shell, files, code interpreter, previews | Paid, billed at Containers rates | Apache-2.0 | GA with Containers | Paid only. Not for the free tier |

## 3. Workers-native pieces that need no container

| Component | What it gives | Runs on Free? | Licence | Maturity | Verdict |
| --- | --- | --- | --- | --- | --- |
| **`@cloudflare/computer` Workspace + fs + tools** | Durable per-DO filesystem, grep, git, pi-shaped tools | **Yes** (no Worker Loader needed) | MIT | Stable core | **Adopt** (after one cold-start CPU measurement) |
| `@cloudflare/shell` 0.5.0 (agents repo) | Older Workspace (SQLite plus optional R2 spill at 1.5 MB), `isomorphic-git`, codemode `state` tools | Filesystem yes; code execution via codemode needs Loader | MIT | Marked Experimental; the `computer` package looks like its successor *(to verify)* | Skip; use `computer` |
| **Worker Loader / Dynamic Workers** (`env.LOADER`) | Run model-written JavaScript in a fresh isolate, optional egress cut (`globalOutbound: null`), custom bindings | **No.** Docs: "currently only available on the Workers Paid plan". Included: 1,000 unique Dynamic Workers a month, 30M CPU ms a month; extra $0.002 per Dynamic Worker per day and $0.02 per million CPU ms | platform | Newer product, documented | Paid step |
| `@cloudflare/codemode` 0.5.6 | "Model writes one script that calls typed tools" (fewer round trips); runs in a Dynamic Worker | **No** (needs the loader) | MIT | 0.x | Paid step |
| **just-bash** 3.6.1 (Vercel Labs) | A shell written in JavaScript over a virtual filesystem; used by computer's worker-shell backend | The package itself is plain JS (21 MB unpacked, many deps), but computer runs it inside a Dynamic Worker, so **No** in that setup. Running it directly inside our DO: *(to verify; CPU and size unmeasured)* | Apache-2.0 | Active (release 16 Nov) | Paid step, or test later |
| **QuickJS (`quickjs-emscripten` 0.32.0, MIT, Feb 2026)** | A JavaScript interpreter compiled to WebAssembly (about 650 KB), no network or file access unless we give it | **Likely yes**, inside the DO (a DO invocation lists 30 s CPU on Free; the 10 ms limit applies to the Worker entry). *(not measured; whether wasm loads cleanly in workerd with our bundler is to verify)* | MIT | Last release 9 months ago | **Best free-tier option for "run a small script"**, if the spike passes |
| Pyodide 314.0.8 (MPL-2.0) | Python in WASM | Heavy (14 MB, slow start); skip | MPL-2.0 | Active | No |
| **FTS5 in DO SQLite** | Full-text search over notes | **Yes**; Cloudflare's SQLite API docs list FTS5 as a supported extension (the limits page does not mention it) | n/a | GA | **Adopt** (already planned as `pn_fts`) |
| **Vectorize** | Vector search | Yes on Free (5M stored and 30M queried dimensions a month, 100 indexes) | n/a | GA | Skip for now: it is outside our DO, so withdrawal would not be atomic; FTS5 is enough for hundreds of notes per region |
| `isomorphic-git` 1.44.16 | Git in plain JS | Yes in principle | MIT | Mature | Use only for export/import (phase 4) |
| Alarms / scheduling | `agents` scheduling and DO alarms | Yes | MIT | In use today | Keep |
| Workers AI Gemma 4 26B | Model | 10,000 neurons a day free; fails with an error when exhausted | n/a | GA | Keep; budget in section 6 |

Correction to the brief: Workers now limit only the **uncompressed** script size (64 MiB, Free included); the old 3 MB compressed Free limit no longer appears on the limits page (accessed today). `@cloudflare/computer` is 13 MB unpacked, but it is split into entry points and tree-shaken, so size is not the question; start-up CPU is *(not measured)*. Free limits that do bite: 10 ms CPU per HTTP request or cron at the Worker entry, 50 subrequests per invocation, 100 Workers per account.

## 4. optmem and pi-optmem: found, and why not

**What they are (high confidence).**
- **OptMem**: "Permanent memory for AI agents. A 426-token prompt, a script, plug and play." By **Victor Taelin** (`github.com/VictorTaelin/OptMem`, about 2.4k stars). One Python 3 file, no dependencies. **No licence file** (the repo has no `LICENSE`; the TypeScript port's author says so too).
- **Method**: an append-only `LOG.txt`, one memory per line, at most 280 bytes, "never edited". A `TREE/` of summaries pairs nodes as a binary tree (0-1, 2-3, then 0-3 ...); the tree is a cache that can be rebuilt from the log. Fixed-width records, so a lookup is one seek (claimed 0.03 s `wake` at a million memories). Commands: `wake` (read at session start), `note`, `nap` (do due merges, done by the agent itself), `recall` (regex), `zoom`, `forget` (drops a bad *summary*, not a memory). Nothing runs in the background. Files live in `~/.optmem/memory`.
- **pi-optmem, two packages, not one.** (a) `pi-optmem` 1.0.0, `pi-pod/pi-optmem`, published 26 Jul 2026, one release, **no licence field, no author**, needs Python 3.7+ and shells out to `memo`. (b) `@krzyzanowskim/pi-optmem` 0.2.2, 17 Oct 2026, `krzyzanowskim/pi-optmem`: a TypeScript port (`memo.ts`, 887 lines, Node `fs` only) plus a pi extension (`index.ts`, MIT). It states that upstream has no licence, "so none is granted here for `memo.ts`". It is for pi's coding-agent TUI (`pi install`), with auto-note and auto-compress after each exchange. I read the port's README and source headers; I did not read the Python source.

**Does it run in a Worker or DO?** No. Both implementations are built on synchronous local files (`~/.optmem`, `fcntl` or mkdir locks, `homedir()`). It could be re-expressed in SQLite, but not run as is. And pi-durable is a different host from the pi coding-agent TUI the extension targets.

**Why not adopt.**
1. **Licence.** No licence means all rights reserved: we must not copy or vendor it into an AGPL repo. The ideas (append-only log, summary tree, small wake read) are not protected; a clean re-implementation from the description is allowed, but then we are building it ourselves anyway.
2. **Withdrawal.** "Never edited" and "forget drops summaries only" conflict with our rule that withdrawing a source removes everything derived from it. The log would need tombstones and a rebuild of every summary node that touched the line.
3. **No provenance.** A line is free text. ETNOS needs a source id and revision on every fact (yesterday's `pn_facts`).
4. **Wrong scale and cost.** A binary tree and agent-driven merges make sense for one developer's years of notes. A region has hundreds of facts; a flat digest rebuilt weekly (one model call) is simpler and cheaper. Every `nap` merge is a model call, which costs neurons.
5. **Model-written memory is untrusted.** optmem's agent writes its own memories freely; ours may only *propose*.

**What to keep from it:** (a) a startup read of fixed, small size (their `WAKE_LINES`; our digest cap of about 2,500 tokens), (b) append-only writes with a rebuildable cache (our `pn_facts` plus `pn_digest`), (c) one-line memories with a hard byte cap (we use 280 characters already), (d) "subagents don't write memory" (our helpers share the parent budget and cannot publish).

**Other memory designs checked (for the file, not adopted).**

| Design | Licence | Fit |
| --- | --- | --- |
| MemGPT/Letta-style core blocks | Letta client 1.12.1, Apache-2.0 | The idea is the same as Think's context blocks: small labelled blocks in the prompt. Idea yes, library no (server product) |
| Mem0 (`mem0ai` 3.3.1) | Apache-2.0 | Model-run fact extraction plus a vector store; extraction costs neurons and drops provenance. No |
| Agents SDK / Think context blocks, FTS5 search, compaction | MIT (`agents` 0.33.0, `@cloudflare/think` 0.23.0) | Good baseline, covered yesterday; Sessions page says Experimental |
| Observational memory (Mastra) | Apache-2.0 | Extra background model calls; rejected yesterday |
| LongMemory "Hydrograph" core (used by aksara-core) | Apache-2.0 | Runs in Node over a snapshot; fine for the self-hosted side, see section 7 |

## 5. The honest question: is "coding agent" the right frame?

What a coding agent needs: a workspace, shell or code execution, many tool rounds, a long context that grows.

- **Workspace**: free tier yes.
- **Execution**: free tier only via QuickJS-in-WASM (unproven here) with no network and a tiny library; real shells (just-bash in a Dynamic Worker) and real Linux (containers) are Paid.
- **Many rounds**: the free model budget decides this (next section).
- **Safety**: Aksara's job is not to write code; it is to read sources, keep notes, ask questions and draft wiki text that ETNOS and people accept. The interesting "code" for her is small: count rows in a table, compare two lists, convert a date, parse a CSV a steward uploaded. Those are better as **named, tested functions that ETNOS defines** than as code the model writes live, because tested functions can be budgeted, replayed and audited.

So: **a workspace yes, a coding agent no (on Free).** Offer "run a script" in two forms: (1) free: `run_script(name, args)` for scripts that live in the workspace's bundled `/scripts` folder (read-only, shipped with the Worker via `WorkerBundle`, reviewed in git) and run in QuickJS; (2) Paid or self-hosted: the model may *write* a script and run it in a Dynamic Worker (egress off, authority-bound bindings only) or in the aksara-core harness.

## 6. Free-tier budget: what one or two Workers can really do

Numbers from the Workers AI and limits pages (accessed today): 10,000 neurons a day; Gemma 4 26B costs 9,091 neurons per million input tokens and 27,273 per million output tokens (so 4,500 in plus 600 out is about 57 neurons, as in yesterday's note).

| Agent shape | Neurons per task | Tasks per day across all 8 (about 10k, minus a 15% reserve for consolidation) |
| --- | --- | --- |
| One-round reply with briefing (4.5k in, 0.6k out) | about 57 | about 150 |
| Three rounds with tools | about 170 | about 50 |
| File tool loop, 8 rounds, context growing 3k to 9k tokens (file reads, notes, a script) | about 8 x (6k x 0.009 + 0.5k x 0.027) = about 540 | about 15 |
| "Coding" loop, 20 rounds, context 4k to 14k | about 1,500 to 2,000 | **4 to 5** |

With a free Google AI Studio key as the keyed route, the neuron limit does not apply, but that route is public data only and has its own rate limits *(not measured)*. It is the right place for longer work.

Other Free limits, with the workspace added:
- **SQL rows**: 5M read and 100k written a day, account-wide. A workspace file read is a few rows (inode plus chunks, *(not measured)*). Cap each job at about 60 file operations and 40 notebook rows; grep over a whole region folder is a full scan of its files, so grep only inside a subfolder or use the FTS table.
- **CPU**: the entry Worker stays tiny (10 ms). All work happens in DOs (30 s CPU listed). QuickJS must run with a hard time and memory cap.
- **Workers count**: two Workers (ETNOS, resident) plus DO classes fit well inside 100.
- **Subrequests**: 50 per invocation; the 6-calls-per-job cap keeps us far under.

Realistic per-day plan: **about 40 to 60 ordinary jobs (replies, morning stories, digests), plus a few deeper "research" jobs (8 rounds) a day.** If neurons run out, Aksara abstains and the site works as before (already the rule).

## 7. Design sketch: Aksara's workspace

### 7.1 Where things live

Two stores, one rule: **ETNOS's node database holds truth; the workspace holds working files.**

| Store | Holds | Who writes | Withdrawal |
| --- | --- | --- | --- |
| ETNOS node DO (`pn_*`, from yesterday) | facts with source and revision, corrections, questions, events, digest | ETNOS code, plus `propose` from Aksara (state `proposed`) | Atomic: join to the source at read time |
| Region workspace DO (one per region plus one sitewide, in `resident-pi`, name = region id) using `withWorkspace` | the files below | Aksara, inside her allowed folders; ETNOS's projector for `/place` | Lineage sweep and read-time check (7.3) |

Sitewide Aksara has a workspace of her own but **no copies of regional notes**; she reads the seven `digest.md` files through the authority path, as yesterday's design said.

### 7.2 Layout (plain markdown, front matter, no binary formats)

```
/place/                 READ-ONLY. Rebuilt by ETNOS's projector from pn_*. Mount via a bundled-or-generated tree.
  digest.md             the briefing (<= 1,200 tokens), 'updated' date, built-from hash
  facts/<id>.md         one fact: text (<=280 chars), source kind/id/revision, state, corrections listed beside it
  questions/<id>.md     open questions
  events/YYYY-MM-DD.md  last 14 days
/scratch/               Aksara's working notes for the current job; auto-deleted after 14 days; never published
/drafts/                proposed wiki edits and note proposals; each file has 'sources:' front matter; ETNOS promotes or discards
/scripts/               READ-ONLY, shipped with the Worker (WorkerBundle): reviewed small scripts with a README line each
/journal.md             append-only log of what she did and asked (one line each, 280 chars), for continuity between jobs
```

Every file under `/drafts` and `/scratch` carries front matter:

```
---
region: mee-pago
sources: [wiki:rev:412, post:9981]   # ids ETNOS can resolve
created: 2026-12-01T03:00Z
state: draft | proposed
---
```

### 7.3 Withdrawal and the "resolve at use time" rule

1. `/place` is only a view. It is regenerated when a source revision changes (event from ETNOS) and each file records `source@revision`. On read, the tool asks the authority (one call, cheap) whether each cited source is still current; a withdrawn source returns "removed" instead of text.
2. `/drafts` and `/scratch` files list their `sources:`. A **sweep** runs on every withdrawal event (and daily): delete or blank files whose sources include a withdrawn id; delete any `journal.md` line that cites one. `propose` into ETNOS happens only through the authority path, which re-checks sources then.
3. The notebook rule already in force still applies: only public, accepted or published material is ever written into `/place`; a test enforces that no private-room text appears in any workspace file.
4. Publication stays in ETNOS: a draft file never becomes a post or wiki revision by itself; the existing gates (verified sentences, redaction, mandate, budget, atomic publication) are the only path.

### 7.4 Tools for pi

Built from `@cloudflare/computer/tools/pi-ai` `createPiTools`, restricted by path (and the `exec` tool left off):

| Tool | Allowed on | Notes |
| --- | --- | --- |
| `read`, `ls`, `find`, `grep` | `/place`, `/scratch`, `/drafts`, `/scripts`, `/journal.md` | results capped at 32 KB, marked untrusted, redacted |
| `write`, `edit`, `delete` | `/scratch`, `/drafts`, `/journal.md` (append) | size and file-count caps per job; path check in our wrapper, not the model |
| `search_notebook(query)` | pn_fts via authority | from yesterday |
| `run_script(name, args)` | `/scripts` only (free); phase 3 adds model-written code | QuickJS, no network, 1 s CPU, 16 MB memory, 8 KB output (*to verify*) |
| `query_etnos(endpoint, params)` | an allow-list of ETNOS's public read API (places, wiki, news, data) | GET only, public data only, through the authority path |
| `propose_note`, `propose_wiki_edit` | write a file in `/drafts` then register it | `proposed` only; humans or existing gates promote |
| gated `web_search`, `web_fetch` | thread replies only | unchanged |

Wrapping rule: **never hand the raw tools to pi.** Wrap each so the job ticket is checked first, the path is checked against the folder allow-list, and the call counts against the job's budget (as `/web-call` does today).

### 7.5 Memory method

Keep yesterday's design (`pn_facts`, `pn_corrections`, `pn_questions`, `pn_events`, `pn_digest`, FTS5, weekly digest rebuild). The workspace adds three things at no model cost:
- the digest and facts become **files the agent can grep**, so memory is also navigable, not only injected;
- `journal.md` gives a cheap continuity line per job (the useful part of optmem's `note`), capped at 40 lines read at job start (about 600 tokens);
- the startup read stays a fixed small briefing, so a normal reply still needs no extra round.

### 7.6 What happens to the security layer

| Today | Becomes |
| --- | --- |
| Work-scoped authority (ticket tied to job generation, evidence, operator, agent, community) | Every workspace tool call carries the ticket; the region workspace DO is selected by the ticket's region, so cross-region reads are impossible by construction, then checked again |
| Egress allow-list (one model origin, gated web tools) | Unchanged for the model. Scripts get **no** network (QuickJS) or `globalOutbound: null` (Dynamic Worker). `query_etnos` goes only to ETNOS through the binding |
| Redaction | Applied to everything read from files before it reaches the model, and to everything written to `/drafts` before registration |
| Budgets (neurons, calls, rows) | Add: file ops per job, bytes written per job, script CPU ms, rows per job; per-region daily ledgers include them |
| Replay safety (`replay: safe/unsafe`) | Reads and greps are safe to replay; `write`, `edit`, `run_script` and `propose_*` are marked unsafe, and writes use content-hash names so a replay is idempotent |
| Epoch change starts a fresh session | The workspace persists across epochs, so each file's `source@revision` is rechecked on read, not trusted |
| No secrets | Workspace files never hold keys; tokens stay in ETNOS's secrets; a test scans workspace writes for key-shaped strings |

### 7.7 Mapping onto the self-hosted aksara-core harness

I looked at `aksara-core` only for structure (read-only). It already has `packages/runtime-pi` (a pi adapter, next to a Mastra runtime), `packages/memory` (Apache-2.0 LongMemory core over a Rust-authorized snapshot, cited originals, withdrawal invalidates derived results), Rust `kernel/src/workspace.rs` (versioned working documents with `source_ids`, "drafts, never source grants") and `computer.rs`. So the shapes already agree: drafts with source ids, derived memory invalidated on withdrawal, pi as a runtime.

What to standardise so the two sides interoperate:
1. **Tool names and schemas** (`read`, `ls`, `grep`, `write`, `edit`, `search_notebook`, `propose_*`, `run_script`). Both run pi, so a skill written for the Workers version should run against aksara-core unchanged.
2. **The workspace format**: the folder layout and front matter above, plain markdown, `sources:` ids mapping to `source_ids`. Export is a zip or a git repo (`isomorphic-git`, MIT, or computer's git client). The self-hosted kernel imports `/drafts` as working documents and `/place` as a read-only reviewed projection.
3. **A memory interface, not a memory engine.** The contract is `recall(query, mode, limit)` returning cited originals with a reviewed or provisional flag (aksara-core's `MemoryRecallQuery`). Behind it, Workers uses `pn_fts` plus digest; self-hosted uses LongMemory. Do not make optmem or any one engine the interface.
4. **Execution backend as a plug-in**: `run_script` on Workers (QuickJS or Dynamic Worker); in aksara-core, a container or the Rust kernel's computer layer. The model sees the same tool.
5. **Public/private**: the Workers version holds public data only. Private data never enters a workspace there; in aksara-core the same layout is allowed to carry private lanes, controlled by the Rust authority.

I did not check aksara-core's contracts in depth; confirm the field names before fixing the format.

## 8. Component table (summary)

| Component | Licence | Free? | Maturity | Verdict |
| --- | --- | --- | --- | --- |
| pi (pi-ai, pi-durable) + `agents` | MIT | yes | 1.5.2 weekly; Experimental banner | Keep |
| `@cloudflare/computer` Workspace, fs, tools, git | MIT | **yes** (no loader) | 0.11.3, core Stable | **Adopt** (spike first) |
| computer worker-shell / codemode backends | MIT | no (Loader, Paid) | Experimental / Stable | Paid phase |
| computer container backend, Sandbox SDK, Containers | MIT / Apache-2.0 | no (Paid) | Experimental / GA | Self-host phase |
| Cloudflare OS | Apache-2.0 | unknown, assume Paid | early access | Read for ideas only |
| QuickJS WASM | MIT | likely, unmeasured | stable, slow-moving | Spike for `run_script` |
| just-bash | Apache-2.0 | inside a Dynamic Worker only (no) | active | Paid phase |
| FTS5 in DO SQLite | n/a | yes | GA | Adopt |
| Vectorize | n/a | yes | GA | Skip (not atomic with withdrawal) |
| optmem (upstream) | **none** | n/a | one author, 2.4k stars | Do not copy; borrow shape |
| pi-optmem (both packages) | none / MIT index.ts only | no (Node fs, Python) | 1.0.0 and 0.2.2, each one release | No |
| Mem0, Letta | Apache-2.0 | n/a | active | No (ideas only) |
| Workers AI Gemma 4 + optional AI Studio key | n/a | yes, 10k neurons/day | GA | Keep |

## 9. Phased build (one plan)

**Phase 0, before the showcase (18 to 19 Dec): about 3 extra days on top of yesterday's 6 to 7.** The showcase should show notebook memory, not a coding agent.
1. Yesterday's critical subset (Workers AI backend, notebook for one region, reply with memory, tests).
2. Spike (1 day, do it first): add `@cloudflare/computer` to `resident-pi`, one region DO, `createPiTools` read-only on a generated `/place` and `/drafts`; measure bundle size, cold-start CPU, rows per job, and whether the pi `AgentTool` shape works with pi-durable's replay. **Stop rule: if cold start or rows are bad, ship the notebook alone.**
3. `/place` projector, `read/ls/grep` tools, `journal.md`, withdrawal sweep with test. Demo: "Aksara, what do you know about Mee Pago?" shows the files she read and the source of each.
4. Not in the showcase: writes by the model, scripts, any code execution.

**Phase 1 (January): writable and safe.** `/scratch` and `/drafts` with caps, `propose_wiki_edit` as draft only, per-region ledgers including file ops, replay-safety flags, full test set (isolation, withdrawal, secrets scan).

**Phase 2 (February): scripts without model-written code.** `/scripts` bundle plus `run_script` in QuickJS (after a spike on CPU, memory and wasm loading), 5 to 10 reviewed scripts (CSV summary, date conversion, list diff, table counts from the public Data API).

**Phase 3 (opt-in Paid, when a node operator pays $5):** a feature flag turning on the codemode backend with a Dynamic Worker, egress off, bindings limited to ETNOS's public read API; the model may write scripts. Never on by default.

**Phase 4 (with aksara-core):** publish the workspace format and tool schemas as a short spec in both repos; add export and import (zip or git); implement the `recall` contract on both sides; run one shared skill against both as the interoperability test. Self-hosted gets containers, private lanes and the full coding-agent experience.

## 10. Risks and open checks

- `@cloudflare/computer` is under 3 months old, 0.x, moves several times a week (0.11.3 on 17 Nov). Pin exactly; budget half a day per upgrade, as with pi.
- Whether it adds enough cold-start CPU to hurt the DO on Free is *(not measured)*; it is the first thing the spike decides.
- Whether the Free plan lets a DO instantiate a QuickJS WASM module cleanly *(to verify)*.
- Cloudflare's DO limits page contradicts itself on Free per-object storage (10 GB vs 1 GB); irrelevant at our size but do not quote it.
- Docs do not state whether Cloudflare OS needs Paid; I inferred from Dynamic Workers.
- Workspace files read through a DO cost rows against the shared 5M daily read budget; the per-job file-op cap is a safety, not an estimate.
- I could not read GitHub repositories directly beyond npm tarballs and fetched pages; licence statements for OptMem come from the repo page, the port's README and a missing `LICENSE` (404 on the raw URL). Ask the author if we ever want to use it.

## 11. Sources (accessed 18 November 2026)

- Cloudflare, "Your agent needs a computer, not a container": <https://blog.cloudflare.com/cloudflare-computer/> (published 3 Aug 2026). npm `@cloudflare/computer` 0.11.3 (17 Nov 2026) README, read from the tarball. Repo: <https://github.com/cloudflare/computer>.
- Cloudflare, "Cloudflare OS: an open platform for agents, apps, and work": <https://blog.cloudflare.com/cloudflare-os/> (5 Aug 2026); repo <https://github.com/cloudflare/cloudflare-os>; press release <https://www.cloudflare.com/press/press-releases/2026/cloudflare-os-is-the-first-ai-workspace-built-around-how-companies-actually-work/>.
- Containers and Sandboxes GA: <https://developers.cloudflare.com/changelog/2026-04-13-containers-sandbox-ga>; Containers pricing <https://developers.cloudflare.com/containers/pricing/>; Sandbox pricing <https://developers.cloudflare.com/sandbox/platform/pricing/>; npm `@cloudflare/sandbox` 1.0.3.
- Dynamic Workers pricing and plan: <https://developers.cloudflare.com/dynamic-workers/pricing/>; getting started <https://developers.cloudflare.com/dynamic-workers/getting-started>; Worker Loader <https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader>.
- Limits: Workers <https://developers.cloudflare.com/workers/platform/limits/>; Durable Objects <https://developers.cloudflare.com/durable-objects/platform/limits/>; Vectorize <https://developers.cloudflare.com/vectorize/platform/pricing/>; Workers AI <https://developers.cloudflare.com/workers-ai/platform/pricing/>. FTS5: DO SQLite storage API page (extensions list), seen via search result, not fetched directly.
- Agents Week round-up (Browser Run, Kitesurf): <https://blog.cloudflare.com/agents-week-in-review>, <https://blog.cloudflare.com/browser-run-for-ai-agents/>, TechCrunch 7 Aug 2026 <https://techcrunch.com/2026/08/07/cloudflare-launches-kitesurf-a-browser-built-for-ai-agents/> (not fetched in full).
- optmem: <https://github.com/VictorTaelin/OptMem>; `pi-optmem` 1.0.0 <https://cdn.jsdelivr.net/npm/pi-optmem@1.0.0/README.md> (repo `pi-pod/pi-optmem`); `@krzyzanowskim/pi-optmem` 0.2.2 (17 Oct 2026), tarball read locally, repo `krzyzanowskim/pi-optmem`; forks `doeixd/OptMem`, `rafmyr/OptMem`, `Moeblack/OptMemo` seen in search only.
- npm registry (versions, dates, licences): `just-bash` 3.6.1, `quickjs-emscripten` 0.32.0, `isomorphic-git` 1.44.16, `pyodide` 314.0.8, `@cloudflare/shell` 0.5.0, `@cloudflare/codemode` 0.5.6, `@cloudflare/think` 0.23.0, `agents` 0.33.0, `mem0ai` 3.3.1, `@letta-ai/letta-client` 1.12.1, `@earendil-works/pi-coding-agent` 1.5.2.
- Local: `docs/research/resident-harness-2026-11-17.md`, `packages/resident-pi/README.md`, `src/models.ts`; aksara-core `docs/platform/architecture.md`, `packages/memory/README.md`, `packages/contracts/memory.mjs`, `crates/kernel/src/workspace.rs` (structure only).
