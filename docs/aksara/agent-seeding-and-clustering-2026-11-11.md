# Optional seeding assistants and related-content clustering

**Implementation update, 12 November:** [Actual optional Faiss CPU batch and contract](../../packages/clustering-cpu/README.md) and [connected qualification](../knowledge/connected-wiki-clustering-2026-11-12.md) supersede the earlier not-installed status below. Real local numerical fitting is qualified; hosted semantic corpus quality remains a separate gate.

11 November 2026, Asia/Bangkok. Owner follow-up: evaluate OpenCode for easy free-model setup/seeding and Meta FAIR's newly released e-means for clustering. This is a sourced recommendation and implementation plan. Neither an OpenCode runtime nor an e-means service is installed/enabled by this UI pass.

## Current owner selection

The owner selected **real e-means implementation now**, superseding the earlier suggestion to wait for a larger corpus. No backend is installed by this documentation pass. Keep the actual upstream CPU adapter optional behind a portable clustering port, then qualify fit/assign and application behavior. The [living-culture refinement](../foundation/living-culture-refinement-2026-11-11.md) and [central plan](../foundation/execution-plan.md) specify the build slice.

OpenCode is **experimental and may be omitted**. The existing authenticated `src/agent-mcp.ts` entrance is the main harness-neutral integration; enrolled deployment credentials, community admission and current mandates govern effects. It is distinct from browser OAuth and grants no private-source traversal. Optional Pi remains Strata's embedded resident.

## OpenCode can be an optional companion

The current official [Console model documentation](https://opencode.ai/docs/console/models/) says: **“Free-tier chat models require OpenCode; use paid models or Go from other clients.”** Its free models are limited-time offers with model-specific availability, limits and retention. A third-party keyless bridge that worked months ago is not evidence that arbitrary hosted Pi requests are supported today. Do not impersonate OpenCode's user agent, relay operator credentials, evade its gate or make “free frontier forever” a deployment promise.

The [official SDK](https://opencode.ai/docs/sdk/) controls a real OpenCode server, defaulting to `127.0.0.1:4096`. That makes a supported **optional Linux/Docker setup or seeding companion** plausible: use the actual runtime and its permitted models, read only operator-approved public sources, and submit draft knowledge through Strata's normal scoped agent API. Verify headless/free-model availability and applicable terms before shipping that profile. An installed harness, a listed model and permission to use a free tier are separate facts.

Keep Pi as the embedded resident selected by the owner. Provider access and public agent identity are ports, so an OpenCode companion need not become a second mascot or a new global authority. Default it to a separate labelled worker principal/short-lived mandate linked to the operator; optionally hand draft results to the resident's reviewed workflow. It does not inherit that resident's credentials or permission merely by sharing the name Aksara. No root shell or filesystem tool is made available to forum posts. Keep a supported local process off the public network; Cloudflare Workers cannot spawn this Linux server, so a Worker-only install uses the existing configured gateway or another permitted HTTPS provider instead of requiring a paid container silently.

Recommended first path:

1. Source discovery, canonicalization and duplicate checks run without an LLM.
2. Preview a source set with rights/terms recorded. Publicly reachable books, news and cultural material are not automatically licensed for copying, training or a new Wiki article.
3. The operator optionally selects a permitted provider/runtime, sees retention and budget, and requests a bounded seed batch. Existing ETNOS can reuse WPW's private configured gateway; new operators can provide their own provider credentials.
4. Produce attributed **working notes and pending Wiki proposals**, plural perspectives and explicit unanswered questions. Human review remains the default for permanent Wiki acceptance. No fabricated residents, endorsements or “verified” sources.
5. Persist job/source/version receipts; gracefully pause when a free route ends or hits quota. Ordinary forum and accepted Wiki remain available. Switching providers cannot broaden the job's source scope or retry an uncertain public publication blindly.

An additional relevant discovery: the same official Console page lists **Jev 1.13 Free**, a limited-time System One decision model, at a distinct `/inference/systemone/v1/systemone` endpoint using a Console API key. It accepts typed `noul`, `choice` and `score` questions rather than chat completions. The documentation does not establish a keyless entitlement. A future decision adapter can use it for candidate routing, with explicit abstention and current authority checks; this research is not an authenticated successful provider call.

## Separate explicit structure from suggested similarity

| Object | Meaning and durable source of truth | How suggestions help |
| --- | --- | --- |
| Community | Governed gathering, rules/admission/roles and its spaces | Suggest nearby or related public communities; never auto-enroll |
| Organization | An organization profile plus governance/representative grants | Entity linking can suggest duplicate names; cannot verify government authority |
| Place / region | Explicit geographic/cultural reference with editable relations | Suggest relevant public material without inferring a person's home or ethnicity |
| Language / topic | An explicit subject/language relationship | Suggest labels with confidence and correction; no access or training rights |
| Offer / market | Canonical offer, provider, availability, optional stated service area and contact policy | Filter offers by explicit place/category and permitted semantic relevance |
| News development | Distinct occurrence with dated sources and correction/merge history | Dedup reporting about the same occurrence while preserving competing accounts |
| Issue / subject | A continuing public subject connecting several developments/posts/pages | Broader, optional reading clusters with editable labels |

Regions and customary territories are not always a single administrative tree. Model typed `part-of`, `overlaps`, `located-in`, `serves`, `about` and `associated-language` relations with provenance and dispute/correction rather than forcing an organization/tribe/language/place into one folder. An offer can serve several places and belong to a community; a public organization can govern a private language room without exposing that room in public browse counts or clustering.

Market and offering remain a planned canonical feature, projected into a post and an optional profile/offers view. Regions/contexts describe that record rather than creating multiple copied offers or duplicate shops. Human business labels remain self-described unless a separate verification workflow grants a more specific status.

## Where e-means fits

The actual paper is [Bessa et al., arXiv:2611.09501](https://arxiv.org/abs/2611.09501), submitted **November 6, 2026**. The authors' [project and reference implementation](https://e-means.github.io/) describe an EMA/mini-batch replacement for Lloyd's k-means, with initialization, dead-cluster revival, scheduling and finalization. They report reaching Lloyd's 25-epoch loss in roughly 1–3 epochs and large wall-clock improvements on tested embedding datasets. These are the authors' numerical-clustering benchmarks, not evidence of semantic accuracy or a measured speedup on ETNOS.

Implement it as an **optional CPU clustering/index-building adapter now**, while retaining direct bounded comparison for small datasets. It still needs embeddings, a chosen cluster count, memory, a host and a refresh strategy. Lower vector distortion does not decide whether two reports concern the same dated event, distinguish a persistent issue from an occurrence, select a truthful summary, or establish the correct institutional/geographic ontology. Its EMA optimization on a dataset is not a ready-made online evolving-news lifecycle.

Keep native Faiss training off the free Worker request path and behind a clustering port. The official CPU implementation needs Faiss/NumPy, not PyTorch or a GPU. A Linux operator can optionally run a bounded CPU batch; a larger deployment can add GPU capacity after measurement. Return versioned centroid/candidate assignments, not privileged SQL writes. No private room contents, private membership/interaction signals or protected cultural datasets enter the public embedding set or an external clustering provider.

The upstream [Faiss v1.16.0 release](https://github.com/facebookresearch/faiss/releases/tag/v1.16.0) was published November 10, 2026. Its [CPU API](https://github.com/facebookresearch/faiss/blob/main/contrib/e_means/README.md) exposes `NumpyEmeans(d, k).train(x)` and `assign(x)`. Training labels may be last-epoch labels rather than nearest to final centroids; use `assign` when canonical final assignments are required. Pin implementation/version, float32 dimensions, finite inputs, preprocessing, dataset/read-set hash, recipe and actual run receipt. Recheck source eligibility when consuming results and invalidate stale/withdrawn embeddings. The current engine has no k-means stage to replace, so this is an added backend at the candidate-retrieval seam, not a one-line dependency swap.

## Useful first clustering pipeline

1. **Eligibility first:** current public scope, usable source rights, allowed content, version and withdrawal state. Preserve language; never infer cultural identity from a name/profile/avatar.
2. **Exact matching:** canonical URL/content digest and syndication metadata prevent counting the same report as many independent sources.
3. **Bounded candidate retrieval:** for a new article/post, compare a small recent public set using shared entities, stated place, time and subject; use compatible multilingual embeddings/KNN when configured. With only around 20 current developments, a direct bounded comparison is simpler than training a centroid index.
4. **Decision stage:** a typed rule/model response chooses same occurrence / related issue / separate / uncertain and cites the supplied evidence. Jev-style parallel questions are a possible adapter. Confidence and abstention require calibration; model scores are not intrinsically probabilities we can trust.
5. **Durable identity:** retain canonical article/development/issue IDs, source versions, reversible merge/split decisions and redirect history. A retrained cluster label cannot silently change a Wiki page's sources or an official statement.
6. **Onward reading:** connect posts, news, accepted Wiki and offers through typed, currently public relations. Present “Tentang ini” or “Bacaan terkait” with a correction control and a reason. Keep explicit community/place/topic navigation available.

Alongside the immediate e-means integration, compare ordinary KNN/threshold grouping, existing Watch rules and a simple k-means baseline on a small, human-labelled public corpus. Measure wrong merges (especially same-place/different-date events), missed matches, duplicate-source inflation, language parity, low-confidence abstention, drift, cost and wall time. Fix embedding/model/seed/version when comparing. Retain human corrections across refreshes. Keep the selected backend available while choosing when its candidate index improves the actual job. Numerical fit/assign success does not establish useful semantic grouping.

The full offering, institutional, context, region and corpus work remains in the foundation ledger. Semantic suggestions assist those primitives; they do not replace their rights, governance or identities.
