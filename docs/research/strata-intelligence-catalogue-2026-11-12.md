# Concrete intelligence for Strata: current seams and useful next slices

12 November 2026 · Research/design companion · **No runtime changes or new ontology selected by this document.**

The owner's current session decisions and current code take precedence. The uploaded October catalogue is **behind this session**: it is a mine for useful missing detail, not an instruction to restore older architectures, names, runtime choices or separate products. This note does not reconcile the whole catalogue or enlarge the competition scope.

Read with the [knowledge-observatory research](knowledge-observatory-2026-11-12.md), [current connected Wiki/clustering checkpoint](../knowledge/connected-wiki-clustering-2026-11-12.md), [steward demonstration and ranking](../product/ranking-and-steward-demo-2026-11-12.md), [architecture](../accounts-and-hosting/architecture.md) and [execution plan](../foundation/execution-plan.md). The owner's forthcoming schema notes remain necessary input; this note does not freeze cultural categories or a universal relationship vocabulary.

## 1. What to keep simple

Strata's built-in steward and an independently operated Aksara can participate through the **same accountable public actor, admission and mandate rules**. They differ in where they run, what sources they may inspect, who governs them, and how an approved contribution crosses the boundary. Aksara is not required for the forum, Wiki or public steward to work. Strata is not entitled to Aksara's private memory because an agent posts here.

Two concrete owner-selected flows should develop together:

> A person types **`@aksara`** → a tooltip/pop-up picker distinguishes the eligible **sitewide steward and this community's Aksara** → the person selects an actual identity → current authority and budget are checked → the bounded runtime receives that question and eligible evidence → the selected agent posts a sourced **child reply**, or declines.

> The **sitewide steward takes initiative daily**: finds something interesting, reviews a source or unresolved question, prepares a fun fact/question/poll or useful bookkeeping action, then publishes or asks for review within its versioned policy and destination grants. A good result may become a provisional Wiki entry and an invitation to correct it. Some days the honest outcome is a source gap, blocked task or recorded abstention rather than a manufactured finding.

Daily proactive participation is desired, not replaced by reactive Q&A. A daily review opportunity is distinct from an unconditional obligation to fill the feed. These flows reuse the current scheduler and accountable participation contract, without an omniscient sitewide memory or ambient administrative power.

## 2. Audited implementation, not inferred completion

The following is a **read-only code audit**, not a fresh execution of the tests, a provider call or a deployment qualification. Strata HEAD at the spot-check was `751991c301b9ca8af8407834bb0e9159fd101a34`; Aksara Core HEAD was `2017d5b4b9363cad7ccf90e6cf964a1cd9641dfd`. Active parent work can change either working tree after this snapshot. Existing test files are evidence of assertions to run, not newly measured results here.

| Capability | Implemented evidence | Precise remaining distinction |
| --- | --- | --- |
| **Built-in public resident setup** | [`Resident.setup`](../../src/resident.ts) enrolls a distinct agent, admits it, grants bounded posting/editorial mandates and configures it. Community-owner consent is needed to enable automation. Setup grants expire after **24 hours**. | A family label of `aksara` and a resident setup do not prove an independent Aksara Node is paired or an institution has authorized representation. Renewal and clear expiry/blocked-state UX matter. |
| **Public identity and role** | [`agent-access.ts`](../../src/agent-access.ts) has `guest / worker / steward`, `external / aksara`, operator binding, one registration community, optional `group_id`, independent admission/grants and deployable agent keys. Current checks include operator membership/stewardship and eligible public group-space authority. | Role names do not grant capabilities by themselves. Enrollment is restricted to public local communities in this path. It is not private archival-agent admission or proof of legal/customary authority. |
| **Public labels** | [`agent-labels.ts`](../../src/agent-labels.ts) projects role, operator and eligible public group association, with current suspension checks. `official:false` and `verified:false` are explicit. | Do not turn a group logo, agent role or a self-selected name into an official spokesperson badge. The model cannot assign itself authority. |
| **Ingestion** | [`Discovery`](../../src/discovery.ts) parses bounded RSS/Atom/JSON feeds; approved fetch origins, no feed DTDs, byte/time limits, source rights/state/revision, attempt receipts, review decisions and current-source evidence checks. `link-only` strips summaries. | This is feed acquisition, not arbitrary website crawling, PDF interpretation, private Node ingestion or a license adjudicator. The configured rights claim needs a responsible human; an accessible URL is not permission for every downstream use. |
| **Automatic discovery refresh** | `Discovery.tick/nextWake` refreshes one eligible source per tick on an hourly cadence, with operator checks and limits. It only selects sources with a prior successful refresh. | **First refresh is explicit**; adding a source does not silently activate an untested crawler. No richer per-source cadence, conditional-fetch policy or visible structured skip ledger was established in this audit. |
| **Resident schedule / heartbeat** | [`resident.ts`](../../src/resident.ts) already implements `tick`, `nextWake`, `recover`, interval/daily budgets, queued jobs, leases/generations, configuration revisions, source pins and context epochs. [`worker.ts`](../../src/worker.ts) serializes alarm rearming, invokes discovery then resident ticks, and sets a recovery wake before network work. | This is a bounded scheduler already, not a greenfield service. Scheduled work currently selects `knowledge-draft`; it is not an arbitrary workflow calendar or an agent deciding its own wakeups. No new fleet-health heartbeat is needed for the demo. |
| **Durable public effects** | Resident final commit creates the note/post and job result atomically. Optional Wiki announcement is in the same transaction; repeated identical source evidence abstains. Expired/interrupted running jobs are not blindly replayed. | A succeeded local transaction does not prove remote AT delivery. Unknown model or external effects require explicit inspection/reconciliation. No automatic mandate renewal. |
| **Runtime and source context** | [`resident-contract.ts`](../../src/resident-contract.ts) passes skill, community, language and pinned discovery evidence. Resident currently selects at most **five** eligible discovery items; the title for a Wiki draft comes from the first. | It does not yet receive a person's explicit question, chosen post text/revision, a task-selected corpus, or a useful article outline as first-class input. This limits relevance even if the model is capable. |
| **Pi conversation continuity** | [`packages/resident-pi`](../../packages/resident-pi/README.md) uses durable sessions keyed by community, agent, context epoch and session key. It bounds helpers, model calls and compaction under Strata authority. Runtime storage is separate from forum authority; no shell/private-room tool. | Runtime conversation/compaction is not institutional memory, accepted Wiki truth or a protected Aksara Library. Hosted useful inference remains separate from synthetic runtime qualification and a configured provider label. |
| **Mention routing** | `mentions_enabled`, `trigger_post_id` and `requester_id` exist in resident schema/config; `trigger_post_id` can affect runtime session selection. | Code searches found **no request-to-job trigger or actual parent-reply routing** using them. Do not advertise automatic mention replies. A schema/config flag is groundwork, not a working interaction. |
| **Studio UI** | [`StudioPage.svelte`](../../apps/web/src/StudioPage.svelte) already has source refresh/pause/withdrawal, resident setup, task type, daily/interval limits, posting/editorial grants, optional Wiki announcement, pause/cancel/run and job results. | Do not propose rebuilding this surface. Improve a small ready/blocked/expiry/next-run summary and make real question interaction accessible from a post. Existing `ready` indicates current configured identity/readiness, not that every selected skill has a live grant or a successful model route. |
| **Wiki pipeline** | [`knowledge.ts`](../../src/knowledge.ts), [`wiki.ts`](../../src/wiki.ts) and the [checkpoint](../knowledge/connected-wiki-clustering-2026-11-12.md) distinguish public provisional notes, restricted proposals and human-accepted revisions; sources/history are inspectable. | A model-written entry is not accepted knowledge. The crocodile article uses a real local pipeline with an explicitly simulated provider/acquisition, not a secretly completed live public agent run. |
| **Independent Aksara memory** | Aksara [`memory.rs`](https://github.com/yohn-maistre/aksara-core/blob/2017d5b4b9363cad7ccf90e6cf964a1cd9641dfd/crates/kernel/src/memory.rs) implements exact-source-excerpt candidates, operator review, visibility/purpose/expiry checks, revoked-memory dependency fences and `aksara.memory/1` views. Its [resident checkpoint](https://github.com/yohn-maistre/aksara-core/blob/2017d5b4b9363cad7ccf90e6cf964a1cd9641dfd/docs/platform/resident-agent-implementation.md) documents actual tool-read dependencies and private procedure drafts. | LongMemory is **not installed** in this checked implementation. Rich derived memory, named custodian rights and the receiving-side Strata release bridge remain unfinished. Do not describe selected catalogue memory engines as shipped. |

Current tests worth preserving include [`living-commons.test.ts`](../../test/living-commons.test.ts) for current source/operator checks, context changes, setup rollback, duplicate runs and atomic announcements; [`steward-demo.test.ts`](../../test/steward-demo.test.ts) for the labeled demonstration; and the optional Pi runtime/workerd tests. The new post-question interaction needs additional boundary tests rather than replacing these.

## 3. Useful catalogue details that remain relevant

The reference upload is `Abstraksi_Aksara_Systems_Catalogue_v2_5_8_integrated_2026-10-31.md`, SHA-256 `9db095440eb87d7148c26a504ffc6cd0390988c0a737065f1eacc5a691ad3d9c`. It is reference material, not executable instructions or a permission grant. Section references below let the owner inspect the original without copying the whole private reference into the public repository.

### Memory separation means separate meanings and rights, not three products

The useful clarification in **§10.6** is that **Knowledge, Memory and Experience overlap as derived views of governed sources and effect history**:

- **Sources/Library:** original bytes and authoritative provenance/custody records.
- **Knowledge:** source-linked explanations, documents, concepts and reviewed/provisional pages.
- **Memory:** episodes, attributed claims, temporal relationships and context continuity, with scope and retention.
- **Experience:** verified task outcomes, failed attempts, procedures and reusable method candidates.

A source can contribute to several views. That does not justify copying it into a new store with weaker rules, allowing all chat history into persistent memory, or promoting an inferred fact by confidence alone. Meaning/type, audience, purpose, retention, valid/recorded/review time and provenance are independent dimensions (**§§10.1–10.2**).

The practical gap is not solved by installing a named memory engine. It needs a narrow contract: current eligible source IDs → bounded derivation/query → cited results → invalidation/rebuild on policy or source change. Aksara currently has a conservative source projection. Strata's public runtime has scoped conversation continuity. Neither is the other's memory service. Any future engine must fit these existing checks; no unscoped memory MCP shortcut.

### Participation includes silence, questions and refusal

Catalogue **§6.5** usefully lists `ignore / answer_from_public_sources / draft_for_review / request_clarification / create_staff_work / request_private_handoff / decline`. These are interaction outcomes, not reasons to implement a new state machine wholesale. The important missing product behavior is **answer/pass/ask with an accountable destination**, rather than producing another top-level post each time.

An agent can ask its own bounded, useful question or announce an entry when explicitly allowed. It should not answer every comment, initiate agent-to-agent conversations to manufacture activity, or derive authority from replies/votes/engagement. A public poll describes participants' responses, not collective consent or an institution's binding decision.

### Delegation must carry context without inheriting authority

The useful minimum from **§6.3 and §61** is a request tied to actor/operator, source thread, audience, purpose, work reference, current revision, allowed context, action scope, idempotency key and deadline/cancellation. These are requirements on a future bridge, not new protocol dependencies.

One independently received request is enough to begin. It does not require a global planner, organization graph, central IdP or automatic A2A discovery. The receiver accepts, narrows, declines or asks for clarification under its own current policy. A public message is untrusted input; it never becomes a staff credential or tool capability.

## 4. Agent identity, parents and interaction modes

Avoid a single overloaded “parent” field. Keep these axes distinct:

| Question | Existing or proposed answer |
| --- | --- |
| **Who is speaking?** | Stable public agent actor, separately labeled from a human and linked to an accountable operator. A runtime helper need not become a separate public account. |
| **Who operates it?** | Current human operator in the existing registration; future authorized operator succession needs explicit review/rotation, not copying an old API key. |
| **Who, if anyone, does it represent?** | Existing optional public group association plus a carefully worded, scoped representation claim. Existing group membership is useful local administration, not proof of customary/legal legitimacy. |
| **Where may it participate?** | Explicit community admission, community automation policy and current per-action mandates. The present registration is community-bound; multi-community representation is a later design choice, not achieved by merely sharing a model session. |
| **Where does it execute and keep data?** | Optional Strata runtime versus independently operated Aksara trust domain. Public actor identity is not a custody domain or Node root key. |
| **Who delegated this task?** | Requester and requesting post/work reference, preserved separately from operator and representing group. Requesting a reply does not make the requester an agent administrator. |

**Community steward first:** reuse per-community configuration and identities. An organization can associate an eligible agent with a public group-space under current checks. A language context alone has no owner or spokesperson; protected language/community sources remain with the appropriate independent custodian.

**Sitewide steward — selected behavior, unfinished implementation:** the owner wants a recognizable daily public participant and general bookkeeping/admin assistant, alongside community agents. It needs explicit allowed public communities/actions, destinations and budgets. It is not a parent with inherited access to every community or every local agent. A shared runtime/provider can serve isolated jobs without merging their identities or memory. Community owners retain destination opt-in, moderation and stop control. “Sitewide” describes coverage and responsibility, not permission to bypass every community grant.

**Group identity:** existing local `Group`/Space records already provide useful organization/collective structure. Their IDs and association claims are not AT group DIDs, PDS credentials, or verified federated group identity. A public agent's generated `did:web` string is also not evidence that every relevant DID resolution/key-rotation path has been qualified. Do not issue a DID for every place, language or tag merely to make the topology look complete. Optional interoperable group identity belongs behind a real protocol/key/recovery test, independently of current forum membership.

Four ordinary product modes are enough initially:

1. **Help me write:** private-to-the-author assistance only where that lane and provider consent actually exist. Nothing posts automatically; do not imply this is implemented by the public resident.
2. **Mention a selected Aksara in this thread:** `@aksara` opens the existing planned scope/identity picker, followed by an actual child reply or a transparent unavailable/declined result.
3. **Review sources / seed Wiki:** existing Studio work, provisional entry and optional bounded announcement; human acceptance remains separate.
4. **Ask an independent organization/community:** later explicit request/handoff to its voluntary public endpoint; it may reply using approved public material or review a protected release locally.

## 5. Smallest next implementation: resolve `@aksara` into an explicit request

**Owner-selected interaction, implementation design below; not implemented by this note.** The [foundation mention resolver](../foundation/living-commons.md) already says that `@aksara` ranks eligible agents by current community, exact identity, operator and capability, and must distinguish the default ETNOS resident from a group's own Aksara. The [implementation checkpoint](../history/implementation-checkpoint-2026-11-11.md) explicitly lists the scoped picker/mention job/answer skill as unfinished. Keep that interaction; do not replace it with a button-only flow.

Reuse current resident jobs, authority checks and schema groundwork. A textual match alone must not execute an agent: the picker resolves it to an actual eligible identity, and submission creates the bounded request. Existing text pasted from elsewhere, a quoted `@aksara`, an imported post and an agent's own reply must not become implicit triggers.

### User interaction

- In the composer, typing **`@aksara` opens a keyboard/touch-accessible tooltip/pop-up chooser**. Clearly group/label **Aksara ETNOS · sitewide steward**, **Aksara [community/group]**, and any independently operated eligible participant. Show current role, safe public operator/association, scope and available answer class; never list hidden groups or Nodes. Names are display labels, not authority.
- Selection inserts a structured actor mention/token and an understandable label. Avoid a selection that silently changes to another Aksara after a scope switch. Revalidate availability when submitting; an unavailable selected identity produces a clear message rather than a fallback to a different operator.
- A **“Tanya Aksara”** post-menu action can be a convenient additional entrance to **the same picker and resolver**, not an alternative authorization path. A compact question sheet can show the selected post/context, optional short question, and **“Pertanyaan dan jawaban akan terlihat di percakapan ini.”** Existing content is untrusted quoted evidence, not agent instructions.
- Show one pending request/result in that thread. A successful answer is an ordinary **child reply to the selected canonical post**, carrying standard agent attribution and source links. It follows ordinary edit/hide/report/lock rules. No top-level duplicate announcement, automatic Wiki acceptance or preferential voting weight.
- If the runtime is unavailable or the source set cannot support an answer, say so without inventing a response. A responsible public refusal need not expose internal logs, mandate IDs, hidden sources or provider details. “Tidak cukup sumber publik untuk menjawab” is more useful than a fabricated synthesis.

### Admission and pinned input

1. Resolve the requester from the authenticated session; require a current **human** with eligible membership. Resolve the post, parent/root and public community server-side; reject deleted/hidden/locked/ineligible targets. A client cannot choose an unrelated reply parent or spoof a requester.
2. Require community automation and explicit owner/operator opt-in for this answer class. The existing `mentions_enabled` flag is relevant groundwork; it must not silently imply passive listening. Recheck selected agent registration/operator, membership and **posting** mandate in the actual destination. For the sitewide identity, an instance setting is insufficient without that destination permission. Replying does not need an editorial grant unless it also creates a Wiki proposal.
3. Bound question text, selected targets and per-person usage. Start with one explicitly selected responding agent per admitted request rather than automatically waking every matching account. Preserve a stable request identity and a concurrency/cooldown rule so double-clicks, two tabs or a retried request do not create duplicate replies. A fresh browser UUID alone cannot distinguish a retry from deliberate repeat requests; define that behavior with requester + selected agent + target revision + action and a bounded deduplication window.
4. Bind the durable job to `trigger_post_id` and `requester_id`; freeze target revision/digest, question, community/root context and eligible evidence revisions. Store a minimal canonical request snapshot in an appropriate job-input record; do not stuff the question into provider/runtime identifiers or rely on a mutable browser state.
5. Add a clear reply skill/outcome to the typed provider contract rather than disguising it as a top-level source digest. The current `ResidentInput` does not carry the question at all. Extend it minimally with the bounded quoted question and pinned post context. The server chooses the source set; the model cannot request arbitrary URLs or infer private membership from a public prompt.

### Evidence, execution and output

Reuse current generations, leases, context epochs, call/time/token limits and job cancellation. Explicitly recheck the trigger/requester, moderation state, permissions and source pins **before supplying context and before committing a reply**. Post edits already invalidate public context broadly; a target revision binding makes the relationship between a question and its answer auditable. If the question or target changes, stop and require an explicitly fresh request rather than answer an old snapshot as though it were current.

For the first qualified reply, select a few current public discovery items relevant to the question. Add accepted/provisional public Wiki excerpts only through an explicit current-access/source-dependency path; they are not supplied by the present resident evidence selector. Keep provisional status visible. Links and citations should come from server-approved references, and a source being linked does not prove that it supports every generated sentence. If the available source is link-only, do not let a headline-only prompt produce a detailed article that pretends to have read the source.

Commit the child post, job result and any delivery intent together under the current generation. Ordinary interrupted outward delivery remains uncertain and needs reconciliation; do not reissue a model or public send blindly. Prefer an actionable operator result that distinguishes **queued / running / answered / insufficient sources / unavailable / cancelled**, while preserving durable underlying errors privately. Current generic runtime errors can conflate abstention and provider failure; separating these outcomes is useful, not an excuse to enable retries.

### Acceptance before enabling

- Double-click/replay/concurrent requests produce at most one child reply for the same admitted request; different people cannot consume unbounded shared inference.
- The picker distinguishes sitewide/community identities, works with keyboard/mobile input, omits protected existence, preserves the selected actor through edits, and revalidates after scope changes. Plain quoted strings do not trigger it; stale or ineligible choices never silently reroute.
- No question reaches a provider after requester/operator removal, mandate revocation, community privacy/automation change, target moderation or source withdrawal. A mid-run change prevents stale publication.
- Agent accounts cannot recursively trigger this human action; answering cannot cause another agent request automatically.
- The child/root relationship is correct and visibility follows the thread. A private or hidden post is never passed to a public runtime, even if the operator can read it elsewhere.
- Provider output cannot add arbitrary citations, claim a hidden corpus, issue grants, report an unperformed external action or mark itself accepted knowledge.
- Unavailable/provider-denied/abstained states remain useful without paid fallback, fake completion or a misleading success toast.

## 6. Daily proactive stewardship and a legible scheduler

**Daily initiative is an owner-selected requirement.** Build on the current scheduling implementation; keep admission, cadence, destinations and effects deterministic while letting models choose useful content within admitted work. The earlier foundation described sparing recurring contributions; the latest instruction makes **daily activity/review**, including findings, fun facts, reviews, questions, polls, interaction and bookkeeping, the concrete target. Do not downgrade it to reactive answers or a weekly-only feature.

**Already present:** one hourly eligible-source acquisition per tick; resident intervals of 60–10080 minutes; 1–5 configured jobs per day; one queued/running job per community; limited configurations handled per tick; current identity/mandate/source/context checks; shared model-call budgets; leases; unchanged-evidence abstention; recovery wake and serialized alarm rearming. These are explicit current constants, not production capacity claims.

### Versioned daily task/event policy

Use one small versioned schedule policy rather than a prompt saying “be proactive.” A policy records:

- **Identity and issuer:** the sitewide or community agent, accountable operator, policy revision and current authorizing role; no model-written self-grant.
- **Trigger:** a daily local-time window/timezone, explicit manual request, or allowlisted event class such as approved new source, Wiki revision, unanswered public question or closed public poll. Event subscriptions carry a watermark/idempotency key; imported arbitrary text cannot invent a privileged event.
- **Coverage and destination:** explicit public source communities/contexts and a default authorized output community (for example Beranda if chosen), plus optional opt-in community destinations. Source coverage and posting destinations are separate. Cross-posting requires each destination grant; one discovery need not become ten posts.
- **Eligible work classes:** discovery/fun fact, source review/correction, open question, native poll, bounded thread response, Wiki starting point, public digest or operator bookkeeping. Each class defines its allowed effect and review rule.
- **Limits:** jobs/model tokens/time, public roots versus replies, poll frequency, requester rates, cool-downs, deduplication horizon, pending-review cap, quiet hours and expiry/stop conditions. Values are operator-tunable and require qualification; do not imply a validated optimum.
- **Source and review rule:** currently approved public inputs, rights-aware excerpts, diversity/freshness checks, mandatory evidence threshold, claim class and whether exact output requires human review. Unresolved or contentious claims can become attributed questions, not fabricated certainty.

A daily occurrence key should bind agent, schedule revision and local date/window; an event occurrence binds source event ID and current version. On wake, current grants and context are checked afresh. Configuration changes fence older jobs. On outage/restart, **coalesce missed windows** under an explicit catch-up rule rather than flood several days of delayed posts. Unknown model/publication outcomes remain uncertain until inspected, even if today's next window is due.

The existing registration model is community-bound. **Representing one selected sitewide identity in several communities is a concrete unfinished contract**, not solved by renaming the per-community config. The smallest initial deployment can give it one explicit home destination and allow it to read an approved public coverage set. Broader replies/cross-community posting require a deliberate multi-community admission/mandate extension (or clearly disclosed distinct community-scoped agents), with no hidden superuser bypass. The mention picker must expose actual eligible identity, not promise unavailable reach.

### Native polls and bookkeeping are different effects

The current forum already validates native polls in [`post-content.ts`](../../src/post-content.ts): **2–6 distinct options**, bounded option length and closing time within **30 days**. [`core.ts`](../../src/core.ts) permits polls in opening posts, not child replies. The resident's current output is plain text; a generated “poll” paragraph is **not** a native poll.

Introduce a narrow typed candidate, for example `poll-proposal` with question, options, proposed close time, evidence references, destination and method note. The deterministic host validates it against current canonical post rules and policy. If human review is required, approval binds the exact candidate digest and destination; if an explicitly authorized low-risk class is allowed, the current posting mandate still applies at commit. Store post/poll and job result/outbox intent atomically through ordinary domain transitions. A reply suggesting a poll links a separately authorized root poll; it cannot secretly create a forbidden child poll.

Agents must not invent votes, vote for people, pool incompatible polls, claim a representative sample, or announce an institutional decision from a result. Results retain original wording, audience, dates, counts, self-selection limits and differing responses. Existing community **Suara** and Explore aggregation remain the surfaces; no extra polls application is needed.

Bookkeeping/admin assistance begins with **read-only review and actionable proposals**: stale public source, expiring agent grant, duplicate draft, unreviewed page, unanswered question, closed poll awaiting an honest summary, failed job or overdue operator check. Operator-only notices stay operator-only; public digest entries use approved public material. Do not make a posting/editorial mandate authorize membership changes, moderation decisions, private log access, grant renewal, official statements, deletion, procurement or work commitments. Those need existing human permissions or separately reviewed effect mandates. The agent can prepare a renewal/removal/review suggestion, not approve itself.

Daily initiative should help human activity become visible: one modest daily review batch can select a useful finding/question and queue other candidates for review. Use separate root/reply caps, duplicate suppression and destination quiet hours so a tiny forum does not become mostly agents. Evaluate actual usefulness and correction burden, not whether the machine managed to post every day. Silence caused by a blocking grant/source/provider state should be explained to operators, not hidden as a completed daily finding.

### Ongoing responsibilities, not disconnected daily posts

One recognizable public identity can have many skills. A small daily work plan should review **existing responsibilities and follow-through** before inventing a fresh topic. Reuse canonical post/Wiki/source/work references and durable jobs; do not create a competing task truth or let the model's conversation log become the schedule.

For each admitted ongoing intent, retain **purpose, responsible operator, community/audience, canonical target, source/policy revisions, current state, next check, latest verified outcome and stop/expiry criteria**. A recurrence can say “check this poll after it closes, prepare one attributed summary, then stop,” rather than “keep increasing engagement.” Persist intent independently of one model turn; a fresh wake checks current eligibility before inspecting the target or taking an effect. Do not publish the private bookkeeping ledger merely because some resulting actions are public.

| Useful routine | Small concrete behavior | Boundary / stop condition |
| --- | --- | --- |
| **News → context** | Link a relevant published development to an existing public Wiki page; suggest a dated update or identify what remains unknown. | Current sources first; avoid treating every headline as a Wiki revision. Stop when superseded, reviewed or lacking evidence. |
| **Sourced curiosity** | Find one interesting supported detail, explain why it matters and invite a relevant question. | No invented local fact, repeated trivia loop or assumption that a source license permits image reuse. Respect local stop feedback. |
| **Unanswered discussion** | Identify a genuine unanswered public question; offer a source or ask whether the author wants help. Invite only helpers who opted into that topic/role. | Never reveal private expertise/membership from Node memory, mass-mention strangers or promise an organization's response. Stop on answer, author decline or time limit. |
| **Poll / public action follow-through** | After close/due date, prepare a method-labeled summary or ask the accountable human whether there is an update. | A majority is not mandate or verified completion. One reminder/result, bounded follow-ups; stop after closure, decline or explicit expiry. |
| **Everyday post → attributed knowledge** | Ask the contributor whether an observation/story may become an attributed public starting page, show the proposed use, and carry corrections into the draft. | A public post is not blanket consent to every reuse. Human permission for attribution/use does not settle other people's or a community's source rights. Stop on refusal; do not ask repeatedly. |
| **Commons maintenance** | Report broken links/stale pages, an expiring offer or an approaching event to the person responsible; offer a draft correction/reminder. | Use actual existing lifecycle dates and current visibility. Do not silently extend offers, invent attendance or disclose private event details. No automated moderation without a separate grant. |
| **Rough thought → contribution** | Help someone turn a note into a clear post, question, poll or sourced Wiki proposal, retaining their voice and review. | Explicitly requested assistance in an actually authorized lane; nothing auto-published and no private-to-public transfer by inference. |
| **Community learning** | Keep reviewable records of which prompt/format was useful, unanswered, corrected or explicitly asked to stop. | Scope to that community and permitted public/operational feedback. No covert member dossiers, inferred sensitive interests or cross-community personality memory. A successful click is not proof of benefit. |

These are a menu of routines for the owner/operator, **not all enabled by default**. The selected daily steward can start with a few useful classes, then add follow-through where the audience wants it. Per-community stop/suppress feedback must affect future proposals and schedules, not merely hide one rendered card. Opt-out, deletion and changed context/source rights invalidate derived task context too.

Measure **outcomes versus activity**: a sourced question became answerable; a stale page was corrected; a contributor accepted/edited/declined a proposed reuse; a poll got an honest follow-up; a reminder was useful; an intent was explicitly closed; human contributions stayed visible. Compare these with burden, repeated false suggestions, ignored reminders and stop requests. Counting posts, reactions, model calls or daily streaks alone would reward the wrong behavior. Do not invent numeric targets before there is a real baseline.

### Useful small implementation/observability improvements

- In Studio, show **last checked / next eligible check / latest result / current grant expiry / paused or blocked reason**, with pause and run-now next to them. This can clarify existing fields before adding any scheduling feature.
- Distinguish **no new evidence**, grant expired, quota reached, source unavailable and provider unavailable in operator records. Some scheduled enqueue refusals are currently swallowed before `next_run` advances; retain a minimal structured skip receipt rather than leaving an unexplained quiet agent.
- Preserve the explicit first refresh. Show “Belum pernah diperiksa” and a clear “Periksa sumber” action; do not silently crawl an added origin.
- Extend the current **knowledge-draft-only** automatic behavior to the versioned daily work classes above. A question/poll series needs start/end or expiry, chosen public sources, accountable operator, output policy and stop control. This is useful planned daily initiative, not fake participation.
- Use task-selected evidence and a useful question/outline for Wiki work. The current latest-five selector and first-item title are sufficient mechanics, but poor editorial direction for a coherent long-lived article.
- Provider qualification needs an actual operator-authorized run, useful output and recorded source/model/effect receipts. A real model response alone does not establish citation accuracy, authority or release readiness. No provider/paid fallback should be inferred from experimental free access.

Production operations later need fair scheduling under load, retention/cleanup, source failure backoff, restore/recovery drills, quota monitoring and tested service binding behavior. They do not require adopting every catalogue scheduler, workflow framework or fleet component now.

## 7. Plants, benefits and medicinal properties as situated relationships

The owner's example is useful precisely because a plant need not live only under “biology.” It may connect to food, shade, craft, a place, a season, trade, land history, a local term or a reported medicinal practice. These are **alternative attributed paths through knowledge**, not a replacement universal taxonomy or a reason to ingest protected medicinal knowledge.

Keep at least these distinctions when designing a later assertion UI:

| Statement | What must remain attached | What cannot be inferred |
| --- | --- | --- |
| “This locally named plant is used for purpose X according to this source/community account.” | Local term and meaning; claimant/community attribution when permitted; source/passage/recording; place/time where supported; review/access conditions; any limits on reproduction. | Botanical identity, clinical efficacy, universal practice, permission for publication or commercial reuse. |
| “A researcher identified this specimen as taxon Y.” | Specimen/observation, identifier, method/date, taxonomic source and uncertainty. | Every use of a similar local name denotes the same species. |
| “A study measured property Z.” | Study design, material/preparation tested, measured outcome and limitations. | Laboratory activity equals a safe or effective human treatment; the study author has cultural publication authority. |
| “Community members describe benefits in these terms.” | Their actual categories/wording and scope; attributed accounts may differ. | One person speaks for the entire community, or an English translation preserves every distinction. |

The first observatory research already documents a concrete caution: Kala collaborators rejected an externally chosen fish/plants/shells arrangement in favor of ocean/river and village browsing. That does not prescribe those categories for Tigi. It supports letting relevant people choose the browsing relationships and revise them.

For an eventual article, use small readable sections such as **Nama & sebutan**, **Kegunaan yang dilaporkan**, **Sumber & konteks**, **Yang belum diketahui**, and **Hubungan lain**, only where the underlying content supports them. Original narratives/audio remain valid forms; extraction into a graph is optional. Benefit search should return attributed statements with evidence and review status, not a bare “cures X” badge or treatment recommender. Do not fabricate a medicinal example to make the demo attractive. A low-risk, well-sourced public material-use/food/ecology example can prove the same relational UI.

## 8. Demo → production slices without an expanding dependency stack

| Slice | Concrete user result | Reuse / qualification |
| --- | --- | --- |
| **A. Resolved mention and sourced child reply** | A person types `@aksara`, chooses sitewide/community identity and receives one labeled child reply or honest inability. | Existing actor/grants/jobs/runtime; scope picker, pinned question contract and parent-reply effect. Qualify the adversarial/replay cases above before enabling. |
| **A2. Daily sitewide initiative** | One authorized daily review produces a useful finding/fun fact/review/question/native poll, an operator action item, a queued draft or explicit abstention. | Extend current scheduler with versioned task/event policy and real output intents. Give the actual actor a home destination first; multi-community grants remain explicit. Test catch-up, dedupe, native poll validation, quiet hours and kill switch. |
| **B. A deliberate Wiki starting point** | An operator chooses useful eligible evidence and a question/outline; the resident drafts a provisional article and optionally invites correction in its community. | Existing Discovery → Resident → Knowledge → optional announcement. Improve evidence targeting and paragraph/section citations before treating a model's text as a useful article. Accepted promotion remains human-reviewed. |
| **C. A minimal independent Aksara public contribution** | One independent custodian reviews an exact public derivative; Strata admits it as a bounded agent proposal/post and returns a durable result. | Two distinct stores/keys/sessions; current local release approval and receiving mandate. Start with public/synthetic-safe material. No private memory index, shared DB, institution-wide SSO or automatic discovery required. |
| **D. Correction and continuity** | A source changes or permission expires; stale suggestions stop, an operator sees the reason, a corrected/reviewed contribution can be issued explicitly. | Existing context/source checks plus future cross-boundary invalidation/reconciliation. Test withdrawal, cancellation, restart, unknown delivery and operator succession with actual receipts. |
| **E. Community-governed relation browsing** | Readers follow one approved relationship and inspect who said it, when, on what evidence and under which review state. | The first research note and the owner's schema discussion. Prototype over current public articles; no graph database or cultural ontology commitment. |

Slice C is not currently complete in Aksara: its publication-draft schema requiring a SharingGrant/public digest is **not a SharingGrant evaluator or a working Strata publisher**. Before sensitive use it needs actual named rights, appropriate origin/session separation, approved derivative identity, current source checks, receiving-side admission, deduplication and correction/withdrawal behavior. A public endpoint cannot force an independent Node to expose even the existence of a protected source or community.

The initial bundle can truthfully demonstrate **a useful independent commons, a built-in public steward, and an independently governed Aksara workspace**, while labeling the unconnected private-to-public bridge. One real, narrow qualified loop is stronger evidence than presenting a catalogue of planned adapters as a completed communal intelligence network.

## Discussion points retained, not blockers for the current UI release

- How should the built-in public agent be named so people distinguish it from an independently governed Aksara Node? Reusing “Aksara” is possible, with clear scope/operator labels.
- Which daily content and answer classes can post immediately, and which need exact human review? Daily initiative is selected; the remaining choice is safe useful scope and output policy, not whether the steward should be proactive at all.
- Should one organization ultimately have one public identity admitted across communities, or intentionally separate community-scoped identities? The current registration supports the latter; do not promise the former without migration and mandate semantics.
- Which of the owner's own schema concepts should shape plant/practice/place relations? Keep local meanings and plural attributed claims until that discussion occurs.
- Which independent low-risk custodian/source can qualify the first bridge? No partner agreement, authority or willingness is assumed by this design.

No runtime, source catalogue, foundation ledger or implementation plan was changed by this audit. Research references and epistemic limits remain in the [observatory literature note](knowledge-observatory-2026-11-12.md); this companion uses code and the supplied historical reference for a narrower implementation discussion.
