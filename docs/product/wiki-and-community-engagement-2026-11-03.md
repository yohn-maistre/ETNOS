# Wiki and community engagement: design notes

3 November 2026, Asia/Bangkok. Research and proposed direction, not implemented promises. Finish the current alpha interface pass before expanding these systems.

## Knowledge: reviewed pages, approachable reading

ETNOS already stores page identities, immutable accepted revisions, proposals tied to a base revision, citations, language/perspective and human review. That is the useful part of a pull-request model. Keep it as the authoritative model; do not introduce a Git server or require contributors to understand branches.

A proposal is a branch of a page, not an immediate edit of the accepted page. The next extension should add an explicit contributor-group policy, reviewer-group policy and review discussion. Recheck current group/community rights on submission, every draft read, and acceptance. Being an AT user or an institution's agent does not confer review rights. The initial implementation admits community members to propose and stewards to accept; arbitrary group-specific proposal policies and inline review comments are still future work.

Acceptance must continue to bind the exact base revision and content digest, reject stale/conflicting bases, and record the human reviewer. Agent stewards can gather evidence, suggest structure and draft changes. They should not silently merge disputed knowledge. Sensitive sources, private deliberation, unapproved translations and restricted cultural knowledge must not appear in public history, a Git mirror or AI context just because a page is public.

Git can be an optional **export of accepted public revisions**, not the live access-control database. Raw Git history makes withdrawal difficult and is unsuitable for private source material. Export Markdown plus a manifest of page ID, revision ID, parent revision, language/perspective, citations, author/reviewer attribution and timestamp. An Aksara-node workspace could support a Git-backed adapter later without changing the public forum's API.

### Browsing without another sidebar

Use a regional knowledge atlas as the entry point, with compact topic chips and actual pages beneath them: places, languages, history, biodiversity, communities and public institutions. These are overlapping lenses, not a rigid folder tree. Let people switch region/language and search from the existing global command dialog.

A page opens as a calm reading sheet: title, short context, accepted text, sources, nearby/related pages, then discussion and a clearly marked “Suggest a change” action. Show revisions and pending proposals in a sheet or dedicated review route. Use breadcrumbs and a small “On this page” popover for long text rather than a permanent nested sidebar. Present a map or timeline when the content has genuine spatial or historical relationships; neither should be mandatory navigation. Offer a list alternative for low bandwidth, keyboard use and screen readers.

Perspective and language need first-class treatment: named variants can coexist with clear attribution rather than forcing one official truth. Place names and cultural labels should remain community-correctable. No inferred ethnicity or private affiliations in navigation/recommendations.

### Building blocks worth testing

| Candidate | What it contributes | Limits / decision |
| --- | --- | --- |
| Tiptap / ProseMirror | Headless editor, works with Svelte, selective extensions | MIT core; some comments/history/collaboration features are paid. Start with a small editor and our revision API, not a purchased document platform. |
| Yjs | Concurrent draft editing and optional local persistence | Merge convergence is not review, authorization or consent. Add only when simultaneous editing is needed; isolated draft rooms and revoked-client handling still require design. |
| Lexical / Kherad | Reference for a friendly editor over actual Git review | Kherad is a young, single-instance Docker application, not a Workers-native dependency. Its model is worth studying, not transplanting wholesale. |
| CollabMD | Local Markdown folders, Yjs, agent access and source-linked comments | Better reference for the private Aksara workspace; filesystem/long-running server assumptions differ from ETNOS's edge runtime. |
| Small text diff library | Review changed paragraphs, sources and translated text | Keep plain source mode and detect lossy rich-text/Markdown round trips. Never flatten unsupported syntax silently. |

Do not load the editor, CRDT or graph libraries into normal feed/news reading. Lazy-load only the actual editing/review surface. Gate export and agent access with the same current policy as browser reads.

## Engagement: questions with visible follow-through

Wisevoter's homepage describes a clear pattern: learn about a local story, answer a related question, see the accumulated picture over time. Its article layout combines context, related live polls and topic navigation. We verified that product framing; this research did **not** establish that its opt-in website poll results are representative of a population or verify its sampling, fraud controls, weighting or privacy implementation. Borrow the interaction pattern, not unverified methodological claims or its content.

ETNOS can improve the loop by making the outcome and responsible body visible:

1. A news cluster, wiki page, public-work item or community concern supplies the context and source links.
2. A sponsoring institution/community proposes a question, with a stated purpose, intended audience, language versions, dates and what will happen with the answers.
3. A human reviewer checks wording and the publication/privacy plan. Aksara can draft translations, accessibility variants and summaries; approval stays separate.
4. People answer from the relevant page. Discussion is optional and separate from the recorded response.
5. A report shows the exact question/version, dates, response count, eligibility rule, collection channels, missingness, changes and limitations. Preserve uncertainty and dissent; do not relabel nonresponse as agreement.
6. The sponsor posts a response or resulting work item, with updates linked back to the question. Close the loop visibly.

### Where it belongs

Use one compact question card after the story/context, and a short contextual rail item when relevant. Do not put a sticky political question banner on every screen or attach an unrelated question to each news item. A future `/voices` or `/questions` page can have Open, Reports and Responses tabs; Explore surfaces a few relevant open questions. The same canonical question ID is used for WPW, ETNOS and approved future channels, preventing duplicated counts.

Casual forum polls remain ordinary posts: music, events and daily questions should not become institutional consultations or public work automatically. Civic questions require an explicit sponsor and purpose. A separate `Consultation` record should reference a forum poll only when its eligibility and visibility model is sufficient; otherwise use its own response store and authorization. Store question versions and freeze wording/options after responses begin; material changes start a new version/cohort, with the change disclosed.

### Feasible sequence

- First, use existing single-choice forum polls, better presentation, links and current human membership checks. These are **community polls**, not elections, secret ballots or representative surveys.
- Add sponsor-approved consultation records, closing dates, “unsure / not enough information” where appropriate, and a report/response object. No new ML service is necessary.
- For more open deliberation, evaluate a **Polis** adapter: participants submit statements and agree/disagree/pass; analysis can surface cross-group agreement. Do not copy a whole survey/statistics stack into the free alpha Worker. Its opinion clusters are not demographic, ethnic or institutional identity labels.
- Later, consider approved voice/hotline/SMS channels with channel-specific deduplication and visible collection-method disclosures. A shared hotline account is attribution for the channel, not evidence that distinct respondents have been verified.

### Privacy and honest reporting

Existing forum poll choices are not publicly enumerated with voter identities, but the service stores actor-linked choices to enforce membership and one current response. That is not a cryptographically secret ballot. Do not promise anonymity, end-to-end encrypted tallies, one-human-one-vote, unbiased samples or representative “Papuan sentiment.” Multiple AT identities remain possible. Decide explicitly whether an agent is eligible; institutional agents should not silently count as individual human respondents.

For future consultations, separate eligibility from public results, minimize actor-linked retention, prevent small-cell reports and differencing/repeated-query disclosure, and never publish respondent lists or sensitive regional/tribal breakdowns by default. A closed community can keep responses and discussion private while explicitly approving only an aggregate report for publication. CARE/custodian review and individual notice still matter; an elder's authorization does not automatically constitute every participant's consent to model training.

Questions should disclose whether their answers may feed research or models. Reading/posting in a forum is not blanket consent to corpus export. Aksara can prepare an evidence-linked report for review; it should not infer political or ethnic identities, fill missing answers, or quietly turn conversation into survey responses.

## Sources inspected

- Wisevoter homepage/product framing: https://wisevoter.com/
- Wisevoter article/live-poll layout: https://wisevoter.com/world/us/tx/2026/10/22/analysts-question-texas-midterm-polling-accuracy
- Tiptap official editor overview and MIT/core vs paid features: https://tiptap.dev/docs/editor/getting-started/overview
- Yjs official architecture/editor/provider overview: https://docs.yjs.dev/
- Polis official introduction, agreement/disagreement/pass and reports; AGPL-3: https://compdemocracy.org/Polis/
- Candidate project, further audit required: https://github.com/mohammadmaso/kherad
- Candidate project, further audit required: https://github.com/andes90/collabmd

The candidate repository descriptions came from search results and are not a security, maintenance or deployment qualification. Recheck primary source/license and measure a small spike before adopting code.
