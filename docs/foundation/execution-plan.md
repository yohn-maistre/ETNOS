# Implementation plan — 11–14 November 2026

This plan covers the complete foundation, not only the news and agent headline features. The owner wants a publicly accessible friend-testing link and a video by 14 November, using current free infrastructure where possible. Dates below use Asia/Bangkok. They are build targets, not evidence of completion. Scope stays in the feature ledger; a failed qualification or missing external authority is reported explicitly rather than replaced by a pretend success.

## Product direction

The core loop is **ordinary participation → working knowledge → reviewed durable knowledge → questions and accountable action**. News and public references give newcomers something real to explore before a social graph exists. One optional resident steward helps connect that activity. People must still have a useful forum without a model, an agent deployment or a cultural catalog.

Keep three distinctions visible through behavior and object types:

| Concept | Meaning | Consequence |
| --- | --- | --- |
| Context | A place, language or topic used as a public discovery lens | Reggae is a topic, not a place or a governed collective. Contexts do not grant membership or representation. |
| Community / Group | A governed collective, including an organization when appropriate | Own roles, admission, identity and optional features; no mandatory DID for every region. |
| Space / audience | Who can discover or read a governed area | A group can have a public discussion and a protected language room. A public context must not expose its private rooms. |
| Instance / PDS | The platform host / the account's AT repository host | Changing a hosting provider must not redefine a person's community authority. |

Communities retain Discussion, Wiki, Media, Suara, Work, Collections or Offers only where enabled and populated. The global shell remains Home, Explore, Communities, Wiki and personal continuity. News, commerce, Agents and Studio have deep links without becoming nine competing main navigation items. User-selected typography, sky-blue accent and gradual clock-based themes remain intact. No large Home hero, banner initials or restored Lajur. Contextual side panels are object detail/navigation, not multiple feeds.

## Current checkpoint and selected next work

The current reading pass is deployed: canonical Strata UI `apps/web` at engine/UI commit `f8b6702`, mirrored to Honai Metro main `92c53b0`, with its [release receipt](../ui-reading-pass-2026-11-11.md). Optional Pi is packaged and deployed; real hosted resident inference still needs owner activation and an actual model receipt. Open external-provider signup, source/working-knowledge pipelines and accepted-public Wiki discovery exist. This planning update changes no runtime or deployment.

The [living-culture and sustainability refinement](living-culture-refinement-2026-11-11.md) is the current detailed selection. It preserves the [verbatim side-chat reference](supplements/2026-11-11-sustainability-side-chat.txt), adds acceptance criteria and extends the complete feature ledger. The [project evidence index](../evidence/README.md) maintains the continuing ETNOS lineage and a concise judge-facing selection. Do not treat the current engine's creation date as the origin of the project.

Next selected slices, with no feature silently removed:

1. **Real e-means adapter and appearance:** implement the upstream CPU Faiss backend now behind a portable clustering port; Paper fresh default, MessagesSquare private inbox and softer compose entries. Saved appearance choices, Jakarta + Geist Serif, sky accent and gradual themes remain.
2. **Welcome/auth dialog:** reuse actual AT provider OAuth and the existing accessible dialog/LoginForm. First-visit Home welcome is dismissible; public deep links remain readable. Keep direct `/login`, callback errors and safe returns working. Start without artwork; add an optional original landscape print after the owner's reference ZIP and rights review.
3. **Resident-to-knowledge loop:** qualify a real public source/model job and make labelled starting points, human contributions, review and correction understandable together. Authenticated external MCP uses the existing bounded entrance; OpenCode is experimental/omittable rather than a mandatory dependency.
4. **Everyday action and sustainability:** canonical offers/requests with working enquiry/status, community questions/reports and accountable follow-through. Managed setup/hosting/training is an initial revenue hypothesis; optional merchant tools and disclosed contextual placements support the free commons. Paying buys service, not editorial or institutional authority.
5. **Remaining foundation and demo:** continue protected collections, organization/work flows, portable distribution/Watch extraction, moderation, recovery and source rights against the complete ledger. Record one connected human story and the actual release/build evidence.

E-means replaces a numerical optimization problem, not the explicit community/place/organization model. Strata currently has no k-means stage to swap. Use real optional CPU training, versioned public embeddings/receipts, final `assign` when required, current-source checks and candidate/evidence filtering. Training is off the Worker request path; no paid container or available host is assumed. See [implementation selection and research](../agent-seeding-and-clustering-2026-11-11.md).

## Build on the actual repositories

Strata main now contains the canonical independently buildable connected Svelte/Vite UI in **`apps/web`**, with source attribution and bundled notices. Honai Metro main carries the matched public UI mirror in **`apps/strata`**. This packaging is implemented; do not repeat the relocation or rebuild the legacy Photon SvelteKit client. Make edits in the canonical source, mirror deliberately and record matched release commits rather than maintaining independently edited copies. [Distribution contract](../client-deployment-contract.md) and [portable/Watch plan](../portable-commons-and-watch-plan-2026-11-11.md) describe the remaining host adapters and installer work.

Keep Aksara Core independent. Its Rust/SQLite custodial authority is not the forum database. Reuse its runtime boundaries and source-read-set/effect checks; do not pull the whole private kernel into a Worker. Keep West Papua Watch's editorial identity independent while extracting or adapting its source/discovery/dedup/provenance logic into a configurable Strata module. Its fixed trusted feed registry is not a safe arbitrary-URL intake API.

Both Strata and the connected Honai app identify their code as AGPL-3.0-only; record precise copied-file origin and third-party notices before transfer. The current root Watch checkout has no obvious LICENSE file: owner-directed reuse is authorized, but its distribution terms and third-party provenance must be recorded before publishing an extracted shared package. Do not assign it an invented permissive license.

## Small common contracts, typed domains

Adopt Actor, Scope, Artifact, Activity, Relation, Policy and Projection as common contracts over the existing typed tables. Do not replace the schema with a universal JSON blob. Artifact envelopes carry stable ID, kind, scope/audience, creator/operator, revision, provenance and policy reference. Public projections omit internal protected source identifiers. Typed relations connect a post to a source, an amendment to a proposal, a Wiki revision to evidence and a work report to a commitment.

Share transition plumbing: expected revision, action, request key, current actor/capability, source read-set, authority checks and durable receipt. Keep domain-specific Wiki, job, participation, offer and membership lifecycles. Available actions come from the server. Commit business changes and authorized outbox intent together. Remote success with a lost reply remains uncertain until readback/reconciliation; it must not become an unconditional retry.

Add modules behind existing API/service/storage boundaries rather than compulsory microservices:

1. **Discovery:** source registry, bounded acquisition, snapshots/rights, normalization, dedup, Development/Issue grouping and editorial candidates.
2. **Knowledge:** working notes, claims/evidence, reviewed Wiki, history/diffs, dependencies/corrections, collections and protected page policies.
3. **Participation:** questions, consultation components, institutional responses, sponsored work, offers and profile/shop projections.
4. **Agency:** job repository, eligibility resolver, tool registry, model adapter, bounded runner and artifact receipts.
5. **Operations:** role-aware Studio, real health/quotas, moderation/appeals, backup/restore, protocol qualification and incident notices.

Migrations must preserve schema-19 data and support reopen/restart. Keep a release manifest tying engine, UI, schema, feature flags and qualified integrations together. New endpoints return actual capabilities and specific unavailable states; a disabled external provider is never shown as a successful action.

## Resident agent execution

**Owner refinement, 11 November:** the optional resident is an active foundation deliverable: a person must be able to test Strata’s own resident steward without installing or relying on an external harness. It now uses Pi Durable, with scope/source/budget/publication enforcement outside the runtime in Strata. One resident identity can use isolated scoped helper conversations. The initial public resident has no private cultural-room access. The [implementation checkpoint](../implementation-checkpoint-2026-11-11.md) and [hosted release receipt](../release-2026-11-11-commons-checkpoint.md) record implementation and deployment evidence. Real hosted model execution remains a separate qualification; the selected Pi adapter is not a proposal to replace it with another harness.

Continue the implemented TypeScript job/tool contract and selected optional Pi adapter. A job records trigger, operator, agent, scope, permission snapshot identifier, current read-set revisions, allowed tools, step/token/time/output budgets, state, checkpoint, lease owner/expiry, generation and receipt. Proposed states are queued → leased → running → waiting-review / succeeded / abstained / failed / cancelled. Claims expire; a new lease increments the generation. Stale generations cannot publish.

Events, schedules, eligible mentions and explicit requests may enqueue work. Every fetch and every effect checks current rights, audience, membership, source status and mandate. External content is untrusted data, never authority to invoke a tool. Retrieval tools are scoped; arbitrary shell, arbitrary network egress and cross-community SQL are not default tools. Publication uses existing domain transitions/outbox rather than direct table writes. Revocation and source withdrawal between retrieval and publication stop the effect. Keep anti-loop limits, duplicate keys, cooldowns and a working kill switch.

Start with one resident Aksara identity and specialist skills: source comparison, working-page draft, unanswered-question prompt, consultation digest, correction follow-up. Output native artifact cards, not a transcript feed. Clearly show operator and statement class. An agent's name, DID or attested device is not an institutional mandate. An official government response needs separately verified institutional control, a current representative grant and its own approval policy. Human/operator verification is a release dependency, not something an LLM can decide.

The external Aksara runtime uses the same participation contract, with a separately scoped principal and deployment credential. A request into institutional custody returns an authorized derivative or refusal; no traversal of private memory. The authenticated MCP entrance already supports separately enrolled/granted external agents and durable action receipts. A deployed entrance is not evidence of a particular external harness completing a real job. Pi remains the embedded runtime; other harnesses may use the same port without redefining publication authority. OpenCode stays experimental and may be omitted.

## Source and knowledge flow

Operator adds sources → validates reach/rights and previews sample items → chooses index-only, news-eligible or review mode → bounded feed/page acquisition → canonical URL/hash/provenance → duplicate/syndication grouping → optional model interpretation → candidate routing → authorized publication or human review → correction/dependency tracking.

Source acquisition needs HTTPS policy, approved host/path reach, redirect revalidation, private/reserved endpoint exclusion, credential stripping, response/expansion byte limits, content-type checks, timeouts, per-source cooldowns and robots/terms handling. DNS/rebinding and browser redirects require platform-supported controls or a constrained broker; superficial URL regexes are insufficient. Never send user session credentials to source sites. Use feed/index metadata when a safe extraction is unavailable. Browser automation is an optional capped fallback, not required for every source.

Publicly reachable text is not automatically licensed for bulk storage, republication, images or model training. Track source terms, evidence kind, permissible excerpts, attributed external media and snapshot retention separately. Initial books/papers/publications become source-backed working candidates. Sparse or disputed evidence yields a question or plural accounts, not a fabricated definitive Wiki page. A configured low-risk news policy may publish eligible cards; permanent Wiki acceptance and official institutional statements retain their own review requirements.

Knowledge contributions include simple notes, corrections, memories, source links and unresolved questions. Reviewed/open/restricted editing modes are enforced server policies. Conflict/rebase behavior is explicit. Source withdrawal marks dependent drafts, revisions, summaries, caches and future jobs for invalidation/review; it cannot recall every copy already published on the public internet.

## Private language and cultural data

A private Wiki is new backend work: the current Wiki service only permits public communities. Protect page existence, titles, IDs, counts, snippets, media URLs, revisions, notifications, exports, search, embeddings, model prompts and caches. Public MCP remains public-only; membership in a language room does not broaden a public agent tool. Test the same resource as outsider, admitted human, revoked member, permitted scoped agent and public crawler.

Model Collection, Item, SourceRef, Rights, Derivative, Release and Custodian separately. Independent custody and approved public derivatives keep different identifiers. Use Local Contexts/protocol references where relevant without claiming that a label is legal consent. A language room is useful for conversation first. An opt-in corpus/dataset program additionally records purpose, review, per-contributor rights, retention, withdrawal/version behavior, permitted training and evaluation. No automatic harvesting or ethnicity inference. Formal corpus work stays a distinct capability even if it shares collection infrastructure.

## Full-scope workstreams and target sequence

**Post-first refinement:** questions, events, polls, offers and links share the existing post/reply experience. Discussion is not another mandatory object or application. Keep typed canonical records where lifecycle/authority requires them, expose native cards and optional filtered views, and retain reviewed Wiki and explicit work commitments. [Detailed design, current polish and recommender research](../post-first-design-2026-11-11.md) supplements this plan without dropping a feature. The deployed fresh typography default is Plus Jakarta Sans + Geist Serif, with saved choices retained. Paper is the newly selected fresh base; it remains next implementation work in this planning pass.

These are parallelizable areas of work, not instructions to create additional agents. The dependency graph in the ledger is authoritative for sequencing. Every source section is represented, including field validation, commerce, cultural collections, scientific extensions and sustainability. Long-range explorations remain explicitly exploratory; full-scope planning does not convert them into invented production capabilities by the demo.

| Workstream | Main output | First dependencies |
| --- | --- | --- |
| A — Shared platform | Packaging, contracts, migrations, typed relations, release manifests | Existing engine/UI and donor review |
| B — Sources and knowledge | Native discovery, working knowledge, Wiki, correction loop | A, safe acquisition and source rights |
| C — Resident and external agency | Durable jobs, skill tools, model budgets, real Aksara connection | A, current authority, eligible sources |
| D — Community and action | Composable community/org UX, Suara, representative responses, work and offers | A, verified authority where official |
| E — Culture and language | Collections, protected pages, rights/release and opt-in corpus program | A, complete private projection boundary |
| F — UI and discovery | Compact shell, all route states, native cards, curiosity modules, continuity | A and actual B–E data contracts |
| G — Operations and protocol | Studio, moderation, backup, quotas, AT/Groups/Spaces qualification | Each feature's real powers and credentials |

| Target date | Integrated result to aim for |
| --- | --- |
| Nov 11 | Preserve/reconcile foundation; package canonical surface; freeze shared contracts; source registry/job foundations; compact shell and Studio navigation. |
| Nov 12 | Connect actual source → working knowledge → reviewed Wiki → resident artifact loop; build organization/Suara/work, collection and offer slices against the same contracts. |
| Nov 13 | Complete cross-feature integration, protected-data isolation, moderation/recovery, authorized external agent and owned-account protocol journeys; finish route states and stabilize the friend-testing link. |
| Nov 14 | Record connected human stories against the qualified build; repair recording blockers; retain exact build/release receipts and honestly label remaining external gates. |

The schedule is aggressive. If verification, provider capacity or implementation takes longer, record the specific feature and impact immediately. Do not silently omit it, backfill fake content, enable an unqualified protected path or present a schema-only implementation as finished.

## What must be demonstrated end to end

1. **Knowledge:** a real permitted public source is discovered; a person can inspect provenance, add a working contribution, review a Wiki diff and find the accepted page through Explore. A changed/withdrawn source produces a visible follow-up.
2. **Resident:** an eligible event or mention creates a durable job; the resident produces a useful native artifact with operator, sources and receipt. Revocation or insufficient evidence produces a real abstention. Restart does not duplicate a post.
3. **Institution and action:** a clearly labeled test institution or genuinely verified institution receives a question, issues an appropriately classified response, creates a sponsored commitment and reports progress. Never impersonate an actual office or show synthetic verification as real.
4. **Protected culture:** an invited participant can use a protected page/item; outsiders, public tools and revoked participants cannot discover it. A designated custodian approves a separate public derivative without exposing the original.
5. **Everyday usefulness:** a real or explicitly labeled test offer has one canonical record across profile/community/Explore, working contact flow and clear status; a language room supports ordinary participation without automatic corpus collection.

Exercise the foundation's eight human stories A–H across these loops. Use genuine public sources and clearly marked test fixtures. The video must show actual connected outcomes, not mocked provider success or fabricated residents.

## Cloudflare Free and concrete gates

Official docs checked on Nov 11 using Exa (Firecrawl credits exhausted). These are documented allowances, not verified account allocations or capacity measurements. Other apps, including Watch, may share account quotas. The owner reauthenticated Cloudflare and connector-based deployment has since succeeded; a DNS plan still does not establish every runtime allocation or spare account quota.

| Component | Documented Free allowance / limitation | Design consequence |
| --- | --- | --- |
| Workers | 100,000 requests/day; 10 ms active CPU/invocation | Keep HTTP orchestration small; cap parsing and measure representative load. |
| SQLite Durable Objects | 100,000 requests/day; 13,000 GB-s/day; 5m row reads/day; 100k writes/day; 5 GB account storage | Durable jobs/receipts fit the model; measure shared usage and keep headroom. |
| DO per-object storage | FAQ explicitly states 1 GB on Free despite the generic table showing 10 GB | Budget at 1 GB/object until account/runtime qualification resolves the documentation inconsistency. |
| DO CPU | Default 30 seconds/invocation documented | A separate bounded discovery/job DO can perform measured extraction without occupying the forum's authority object. No unlimited-work assumption. |
| Workflows | Available Free: 3,000 steps/day, 10 ms CPU/invocation, 1 GB-month storage; default 3-day retention | Optional orchestration; canonical receipts/checkpoints must live in our durable domain storage. |
| Queues | 10,000 operations/day; write/read/delete operations count | Optional delivery port; not 10,000 completed jobs. |
| Workers AI | 10,000 neurons/day/account | Shared hard budgets, small trials and abstention; model-free feeds remain usable. No automatic paid fallback. |
| Browser Run | 10 minutes/day, 3 concurrent sessions | Optional selective fallback; feeds and ordinary HTTP are the baseline. |
| R2 Standard | 10 GB-month, 1m Class A and 10m Class B operations/month included | Check activation/billing and account usage before enabling; free allowance is not a universal spending cap. |
| Containers / Linux Sandbox | Containers require Workers Paid, minimum $5/month plus excess usage | A full Linux/shell runtime is a real paid gate on CF. The bounded native resident does not need it; external Aksara can run on another machine. |

No unavoidable paid platform requirement has been established for a bounded resident, source registry, Wiki and small friend-testing forum. This does not guarantee that unbounded crawling, large PDFs, bulk media/transcoding or all model work fit Free. Use explicit response/storage/output budgets, per-source/per-agent limits and circuit breakers; pause candidates when a cap is hit while preserving public reads. Set limits from measurements, not fictional available budget. Do not enable paid services automatically.

Other real gates: provider credentials and available models; legitimate institutional verification; media/source rights; payment provider onboarding and dispute policy; owned AT namespace and qualified PDS readback; experimental Spaces authority/delegation semantics; recovery/restore evidence. Each remains in the ledger. A provider test mode is useful but does not prove live commerce or real institutional authority.

## Focused verification and release

Run existing required checks once per meaningful slice, then tests for changed boundaries rather than exhaustive repetition. Prioritize adversarial private projection reads, current mandate/source revocation, concurrent revisions, stale job generations, duplicate/uncertain effects, denied source egress, quota exhaustion and restore. Add browser journeys for actual connected flows plus mobile tab overflow, bottom safe-area clearance, source image fallback, theme transition, composer keyboard and panel/back navigation.

Release to the existing origin and persistent store only after schema migration/rollback strategy and version manifest review. Back up before migration and prove restore using synthetic data and permission-sensitive media/keys. Keep a deploy receipt and post-deploy public capability checks. Cloudflare connector access is restored and the current reading pass is deployed. Recheck actual account/runtime capabilities for each additional integration rather than inheriting stale reauthentication blockers.

## Maintaining this plan

The current checkpoint and next slices above supersede the original first-packet list: canonical packaging, source registry, public working knowledge and optional resident jobs have already landed. Continue from their real implementation and remaining gates rather than restarting them. The complete ledger remains the acceptance surface for subsequent implementation.

Keep [post-first design](../post-first-design-2026-11-11.md), [reading-pass receipt](../ui-reading-pass-2026-11-11.md), [portable distribution/Watch extraction](../portable-commons-and-watch-plan-2026-11-11.md), [provider/clustering research](../agent-seeding-and-clustering-2026-11-11.md), [living-culture/sustainability refinement](living-culture-refinement-2026-11-11.md) and [project evidence](../evidence/README.md) linked here. Preserve historical decisions and source bytes; add dated amendments for changed selections. Planning does not qualify an unbuilt feature.
