# Repository reconciliation and research receipt

Reviewed 11 November 2026. The complete uploaded foundation is preserved: 672 extracted paragraph/table blocks, 21,690 words, 30 numbered sections, 38 decision entries, both appendices and the closing. No original source text was deleted to simplify the plan. Original hash: `dafd2ef03407443d0647f0d391bd26f08e9a731e7cf549ed9bb31a4c0eb2440a`.

## What the code actually supports

| Repository | Reviewed baseline | Useful material | What must not be inferred |
| --- | --- | --- | --- |
| Strata | `3a6ed617b7a3f5038f542cd548d28e502306fe27` | Existing typed services, official AT OAuth/SDK, Node/DO SQLite port, source/release fixture, agent entrance and mandates, Wiki proposals, transactional outbox | Main's Nov 10 merge adds a CI configuration fix; it does not add a resident, native source engine or protected Wiki. |
| Honai connected | `f489846`, `feat/strata-connected`, `apps/strata` | Standalone Svelte/Vite UI, same-origin API, profiles, responsive forum/media, moderation behavior, notices | Legacy `honai-metro` main is the SvelteKit Photon/PieFed fork. Reusing its UI does not mean reintroducing Lemmy/PieFed transport or JWT auth. |
| West Papua Watch | `658f55f`, origin/main | Source registry/discovery, article extraction, dedup/syndication, clustering/evidence, source provenance and operational workflow patterns | Watch remains editorially independent. A trusted static registry is not a secure configurable URL intake system. Public article bodies/media are not freely licensed by default. |
| Aksara Core | `2017d5b`, main | Rust/SQLite custodial authority, current source-read-set checks, Pi durable worker and Mastra interactive bounded-runtime boundaries | No permission to traverse institutional memory. Optional `feat/etnos-public-reader` adapter at `806e12b` is not main and does not prove live write integration. |

Strata files examined include README, architecture/status/capabilities, Worker, Wiki, agent access/client and decision adapter. Honai review covered the connected app README/upstream notes, routes/components/shell and moderation/media donor paths. Watch review covered its AGENTS, root package, registry, discovery, acquisition/process and cluster/workflow modules. Aksara review covered AGENTS/handoff, component coverage and selected runtime/platform documents; its entire repository was not exhaustively audited.

### Concrete reuse map

- **Policy and current authority:** preserve Strata's service checks and transactional effects; follow its [implementation rules](../../AGENTS.md). Agent posting and editorial authority remain separate.
- **Wiki:** [src/wiki.ts](../../src/wiki.ts) explicitly requires public communities. Private pages need new permission-aware service/projection behavior, not an unlocked frontend tab.
- **Agent entrance:** [src/agent-access.ts](../../src/agent-access.ts) and existing client/protocol routes provide principals and mandates; add durable jobs/tools above these without granting the scheduler global authority.
- **Native news:** Watch `content/news-sources.json`, `services/watch-engine/src/sources/{registry,discover}.ts`, `ingest/{extract,process,publication-date,prefilter,relevance,story}.ts`, `cluster/{index,partition,evidence,editorial,synthesis-quality}.ts`, `workflow.ts`. Adapt extraction and provenance only after safe-fetch/rights controls; avoid copying Watch-specific narratives and defaults as generic truths.
- **Source-fetch gap:** Watch discovery's timeout does not cap `response.text()` bytes. Its browser/extraction fallbacks need a fresh arbitrary-source threat model. Keep private endpoints and credentials outside the acquisition tool.
- **Runtime ports:** Aksara `packages/runtime-pi` and `packages/runtime-mastra` are Apache-2.0 packages with real upstream dependencies. Their authority separation is useful; importing both stacks into Workers is not a prerequisite for a durable resident.
- **UI and donor provenance:** connected app `apps/strata/UPSTREAM.md`, `public/third-party-notices.txt`, `licenses/*`, rich forum components and `src/styles/conversation.css`. Keep the separate app's same-origin cookie/CSRF client. Root Honai and Strata identify AGPL; record copied-file attribution rather than assuming a general license file settles every media asset.
- **Packaging:** current interface lives in another repository. Proposed `apps/web` consolidation needs a parity build, preserved notices and one canonical owner. The original fork remains a behavior/moderation/media donor.

## Live read-only baseline

Public `/health`, `/auth/options` and `/v1/capabilities` were checked in this review. Health reports `enrollment: open`, `auth: atproto-oauth`, Cloudflare Durable Object runtime, `liveFederation: false` and `custodyFixture: false`. Auth options report open Bluesky signup. Capabilities still mark institutional access, hosted accounts, live AT, ingestion, Aksara/A2A/Iroh/hardware/offline sync and private Library unavailable. Public Wiki/proposals/drafts are available; agent acceptance remains unavailable.

These checks establish public availability and advertised feature state, not a completed second-person OAuth callback or a new live agent run. No production data was written and no deployment was performed in this planning checkpoint. Existing release/test receipts remain historical until rerun. The old status table's invited-only wording is superseded by the signup release and live configuration.

The Cloudflare app connection currently returns `UNAUTHORIZED` / “requires reauthentication.” The owner needs to reconnect that app before connector-based account inspection or deployment. The public ETNOS site remains accessible. No secrets should be pasted into chat. Actual Workers billing tier and shared remaining allowance are unverified.

## Research updates and their consequences

Further research uses **Exa**, following the owner's report that Firecrawl credits are exhausted. The targeted Exa pass returned 12 search result entries across three searches (including duplicates); full primary pages for DO limits and Containers pricing were fetched. Earlier direct primary reads supplied the other references below. This is a focused infrastructure/protocol check, not an exhaustive market survey.

| Primary source | Finding used in this plan |
| --- | --- |
| [AT Protocol: Space sync, 6 Nov 2026](https://atproto.com/blog/space-sync) | Backend Jetstream-compatible Spaces sync is described as a prototype/rollout. Backend streams may contain multiple spaces; filter per viewer. Record identity includes space, author, collection and rkey. Use short-lived delegated reader authority rather than storing a person's OAuth session in the sync service. |
| [Wikimedia Explore Feed Refresh](https://www.mediawiki.org/wiki/Wikimedia_Apps/Team/Explore_Feed_Refresh) | Curiosity, freshness and user control inform Explore. Its engagement target is a research hypothesis, not demonstrated ETNOS uplift. |
| [Decidim components](https://docs.decidim.org/en/develop/admin/components.html) | Configurable proposals, debates, meetings, surveys and accountability within participation spaces. Keep component permissions and formal authority explicit. |
| [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) | Free request/CPU/memory limits constrain parsing and scheduling. Static asset serving and API execution must be budgeted separately. |
| [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) and [limits](https://developers.cloudflare.com/durable-objects/platform/limits/) | Free SQLite DO availability and account quotas; default 30s CPU. The generic 10GB/object table conflicts with the FAQ's explicit 1GB Free cap, so use the conservative cap pending qualification. |
| [Workflows pricing](https://developers.cloudflare.com/workflows/reference/pricing/) | Available Free with step/CPU/storage limits and short default retention. Never make temporary orchestration history the only receipt store. |
| [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/) | Free operations count enqueue, consume and acknowledge work separately. |
| [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) | Account-wide free neuron allowance; no guarantee of a particular generation/decision model or available capacity across other apps. |
| [Browser Run pricing](https://developers.cloudflare.com/browser-run/pricing/) and [limits](https://developers.cloudflare.com/browser-run/limits/) | Ten minutes/day Free is a selective extraction fallback, not an unlimited crawler. |
| [R2 pricing](https://developers.cloudflare.com/r2/pricing/) | Included Standard storage/operations differ from a hard spending cap; activation and account usage require checking. |
| [Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/) | Containers require the Workers Paid plan. Do not equate a bounded native agent with a full Linux container. |

## Pushback and unresolved questions

The document's strongest contribution is the missing middle between chat and accepted Wiki. Automating finished cultural pages before that contribution/review layer would recreate the museum problem with model-generated confidence. Seed references and candidates, then let ordinary social life correct and extend them.

One primary steward is a coherent starting point. Giving it more runtime tooling does not supply institutional legitimacy. Government/NGO/school deployments need verified control and current representative grants; hardware attestation may strengthen deployment provenance but cannot prove an office authorized a statement.

The complete corpus/private-federation/payment/science ambitions are retained. They have distinct release dependencies: contributor-purpose rights and suitable compute; experimental protocol and per-viewer isolation; actual payment provider and dispute policy; reproducible computation and evaluation. A three-day demo deadline cannot manufacture those dependencies. Show genuine bounded implementations and explicit unavailable/refusal states where qualification is incomplete.

Field questions remain live: who may refuse/revoke a source use; how contested customary authority is represented; what burden volunteers can maintain; whether mobile bandwidth and selected local languages work; whether merchants want public location/contact; how successors recover custody; and whether the resident creates useful work rather than noise. Do not fill these gaps with inferred consent or fabricated research findings.
