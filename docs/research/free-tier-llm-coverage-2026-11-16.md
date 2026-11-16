# Free-tier LLM coverage for ETNOS (Gemini API free tier, Workers AI, Clef)

16 November 2026. Research note. Public data only. Private community data goes through the separate gateway and never touches a free tier.

Method: Google's pricing, rate-limit, terms, URL-context, batch and Gemma pages were fetched on 16 November 2026. Google no longer prints per-model free limits in its docs. The numbers in section 1 come from two blog posts that read their own AI Studio "rate limit" screen in October 2026, and they disagree in places. Treat them as unverified until the owner reads the real numbers at https://aistudio.google.com/rate-limit while signed in to the project.

## Summary

- The free tier still exists. It covers Gemini 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite, Gemini 4 Hydrogen, Gemma 4 (26B A4B and 31B), Gemini Decision 1 and the embedding models. Gemini 4 Argon, Carbon and 3.1 Pro are paid only.
- The strong Flash models give only about 20 requests a day. Flash-Lite gives about 500. Gemma 4 gives about 14,400. This shapes everything.
- One deployment's whole daily load (about 330 calls, about 1.3 million tokens) fits if work is spread by model: Gemma 4 takes bulk text jobs, the two Flash-Lite models take writing and Q&A, 3.8 Flash takes only the long stories.
- Free tier input and output "may be used to improve Google products" and human reviewers may read it. Public data only, as planned.
- Workers AI alone cannot carry the whole load: it would use about 160% of the 10,000 free neurons a day. It is a fallback for one or two workloads, not for everything.
- About 3 deployments fit if each has its own Google project (about 2 with a safe margin using the plain routing, 3 to 4 if Q&A is balanced across both Flash-Lite models). Check Google's terms first (section 7).

## 1. What the free tier offers (16 November 2026)

Limits are per project, not per key, and (by the two blogs) per model. Daily counts reset at midnight Pacific time. That is 08:00 UTC now, 17:00 in Papua (WIT), and 07:00 UTC, 16:00 WIT in northern summer. Google says limits "are not guaranteed" and are lower for preview models. A 429 comes back if any one of RPM, TPM or RPD is passed.

| Model (ID) | Free? | RPM | TPM (input) | RPD | Context | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Gemini 4 Hydrogen (`gemini-4-hydrogen`) | Yes | 5 | 250,000 | 20 | 1M (Google) | Newest. Implicit caching free. Not in the owner's list. |
| Gemini 3.8 Flash (`gemini-3.8-flash`) | Yes | 5 | 250,000 | 20 | 1,048,576 in | Paid price doubles on 1 Jan 2027. Context caching free. |
| Gemini 3.6 Flash (`gemini-3.6-flash`) | Yes | 5 | 250,000 | 20 | not stated | Same pool size as 3.8, separate bucket. Caching free. |
| Gemini 3 Flash Preview | Yes | 5 | 250,000 | 20 | not stated | Preview, tighter. |
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | Yes | 10 or 15 | 250,000 | 500 | not stated | RPM differs between sources. Workhorse. |
| Gemini 3.1 Flash-Lite (`gemini-3.1-flash-lite`) | Yes | 10 or 15 | 250,000 | 500 | not stated | Same. Best Indonesian reading score of the Lite models (section 5). |
| Gemini 2.5 Flash (`gemini-2.5-flash`) | Existing users only | 5 | 250,000 | 20 | 1M (Google) | Deprecated. Routes to 3.5 Flash-Lite on 1 Dec 2026. Do not build on it. |
| Gemini 2.5 Flash-Lite (`gemini-2.5-flash-lite`) | Yes | 10 | 250,000 | 20 | not stated | One source only. Not deprecated, but 20 a day is low. |
| Gemini 2.5 Pro (`gemini-2.5-pro`) | Conflict | 0 | 0 | 0 | not stated | Pricing page says free, two blog screens show 0. Deprecated, routes to 3.8 Flash on 1 Dec 2026. |
| Gemma 4 26B A4B (`gemma-4-26b-a4b-it`) | Yes | 30 | 16,000 (one source) | 14,400 | 256K | No paid tier. Text and image. |
| Gemma 4 31B (`gemma-4-31b-it`) | Yes | 30 | 16,000 (one source) | 14,400 | 256K | Text and image. Whether it shares a bucket with 26B is unknown. |
| Gemini Decision 1 (`gemini-decision-1`) | Yes | 200 | 50,000 | 10,000 | up to 1,000 questions per call | Official numbers from Google's rate-limit page. No output tokens. No Batch API. |
| Gemini Embedding 2 / 001 | Yes | 100 | 30,000 | 1,000 | n/a | We embed on Workers AI instead. |
| Gemini 4 Argon, Carbon, 3.1 Pro, image, video, music | No | 0 | 0 | 0 | n/a | Paid only. |

Sources for the numbers: Gemini Decision 1 limits are from Google's own page (https://aistudio.google.com/docs/rate-limits). The rest are third-party: https://imisofts.com/blog/gemini-api-free-tier-limits/ (21 Oct 2026), https://chatgpt.kwgo.co.kr/posts/google-gemini-api-free-tier-rate-limit-guide.html (3 Oct 2026, source of the Gemma 16K TPM), https://www.scriptbyai.com/gemini-api-free-tier-limits/ (13 Nov 2026, says Flash-Lite RPM 10, Hydrogen 20 RPD). A forum post of 3 Sep 2026 also confirms 20 RPD for 3.8 Flash and 500 for Flash-Lite (https://discuss.ai.google.dev/t/gemini-3-8-flash-free-tier-20-rpd-is-too-limited-for-practical-evaluation/180609).

### Features on the free tier

| Feature | Free? | Source and notes |
| --- | --- | --- |
| Structured output / JSON schema | Yes on Gemini 3 and 4 series. Gemma: unverified. | Google's structured-output page lists Gemini 3/4 models and says nothing about Gemma. A third-party guide says Gemma 4 handles JSON output "at the model level" (https://www.philschmid.de/gemma-4-gemini-api, 7 Apr 2026). Google's Gemma page shows function calling on the Gemini API. Test Gemma JSON schema before relying on it. We already validate in code. |
| Structured output with built-in tools | Gemini 3 and 4 only | Same page. Preview. |
| Grounding with Google Search | No on Gemini 3.x and 4. Yes only on 2.5 Flash / Flash-Lite (500 a day, shared) | Pricing page. 2.5 is deprecated, so treat grounding as not free. Paid Gemini 3+ gets 5,000 free searches a month, then $14 per 1,000. |
| Grounding with Maps | No (same pattern) | Pricing page. |
| URL context | Listed "free of charge"; fetched text counts as input tokens | Pricing table row and https://aistudio.google.com/docs/url-context. Up to 20 URLs per request, 34 MB each, public pages only. Supported on Gemini 3/4 and 2.5, not listed for Gemma. Our desk design stores source text first, so we do not need it. |
| Code execution, File search | Free of charge | Pricing page. Not needed. |
| Context caching | Free on 3.8 Flash, 3.6 Flash, Hydrogen. Not on Flash-Lite models. | Pricing page. Hydrogen is implicit caching only. Gemma: free (Gemma row). |
| Batch API | Not on free tier (best reading) | Apidog (22 Oct) and scriptbyai say Batch and Flex need paid access. One read of Google's pricing page marked batch "yes" for the Flash-Lite models, a second read found no free batch. Google's batch page does not say. Treat as no. Batch would be 50% of price on paid. |
| Data use | Free-tier content is used to improve products | Pricing page: "Used to improve our products: Yes" on free, "No" on paid. |

### Data-use terms and regions

From Google's terms (https://aistudio.google.com/docs/terms, read 16 Nov 2026):

- Google uses content you submit to unpaid services and the responses "to provide, improve, and develop" its products.
- "Human reviewers may read, annotate, and process your API input and output", after it is disconnected from the account, key and project.
- "Do not submit sensitive, confidential, or personal information to the Unpaid Services."
- In the EEA, Switzerland and the UK, the paid-services data terms apply to everything, including unpaid quota. So a user there is not trained on. This does not help us, because our deployments run outside those regions, so the free-tier terms apply.

Regional availability of the free API tier by country: not verified. Google says AI Studio usage is free "in all available regions". Indonesia is not confirmed in anything I read. Test with a real key from Papua. The pages also say "some projects need verification" for free access.

## 2. Workloads and sizes

Assumptions are mine, from the design documents. They are not measured. Tokens per Indonesian word are taken as about 1.6. All counts are for one deployment at steady state.

Facts taken from the repository:

- 7 regions, two short posts a day each, plus up to two long stories a day (direction doc, "Aksara by place").
- The desk pipeline is: fact sheet (one call per source, copies sentences), draft (one call), checks in code, one retry, then review. `src/desk.ts` uses `@cf/google/gemma-4-26b-a4b-it`. The first live story run used 1,920 tokens in and 1,324 out (about 54 neurons). The planning figure in the direction doc for a three-call story is about 12,000 in and 2,400 out.
- The map has 6 coordinates per item, 14 domains, 10 cultural forms (UU 5/2017), about a dozen voices, and receipts. Embeddings are on Workers AI.
- Pages are 150 to 600 words from 40 to 80 verified sentences (`checkPage` in `desk.ts`).

| Id | Workload | Unit and volume per day | Tokens per call (in / out) | Calls per day | Why |
| --- | --- | --- | --- | --- | --- |
| a1 | Place posts: 14 short posts (news line, fact, question) | 14 posts, each: fact sheet call, draft call, 30% retry | about 3.5k fact sheet + 2.5k draft (1.3 x), out 0.5k + 0.4k | 46 | 14 x 3.3 calls. |
| a2 | Long stories: up to 2 | Retell call with 5k in, 1.5k out. One retry on average. | 5k / 1.5k | 4 | The fact sheets for stories are counted in (b). |
| b | Fact sheets and drafts from the shelf (beyond a1) | 20 shelf sources. Fact sheet: 5k source + 0.3k prompt in, 1.2k out. Draft 3k in, 0.8k out, 1.3 attempts. | see left | 20 + 26 = 46 | About 20 new sources a day. |
| c | Wiki pages: write and revise | 10 pages (avg 375 words, 600 tokens; max about 1k). 1.8k basis + 0.8k prompt in, 0.8k out, 1.5 attempts. | 2.6k / 0.8k | 15 | Early days more, once the seed pages exist. |
| d | Claim and edge extraction | 10,000 items over about 90 days = 111 a day. 10 items per call (structured output), 3.8k in, 1.5k out. | 3.8k / 1.5k | 12 | Backfill version: 10,000 in 14 days = 714 a day = 72 calls, 380k tokens. |
| e | Classify into domain, form, voice with receipts | 150 new items a day, 8 per call. Taxonomy prompt 1.2k + items 2k in, 1k out. | 3.2k / 1k | 19 | Backfill: 90 calls, 380k tokens. |
| f | Decision checks: claim supported by sentence, duplicates | about 1,150 questions a day (150 claims x 3, 600 page sentences, 84 post sentences). About 150 tokens each, 100 per call. | 15k / 0 | 12 | Backfill: about 2,100 questions, 22 calls. |
| g | Source discovery summaries (catalogue records) | 100 records, 5 per call. 3.5k in, 0.75k out. | 3.5k / 0.75k | 20 | |
| h | Tanya peta Q&A with citations | 100 questions + 20 mention replies. 12 retrieved sentences + prompt: 3k in, 0.4k out. | 3k / 0.4k | 120 | Grows with users. This is the only user-facing, latency-sensitive load. |
| i | Image captions and alt text | 40 images. 1.2k in (image about 260 to 1,000 tokens), 0.1k out. | 1.2k / 0.1k | 40 | |

## 3. Which free model fits, and does it fit

Rules used: strong Flash models (3.8, 3.6, Hydrogen) at 20 requests a day are kept for the few jobs where prose quality matters most and a person reviews it. Bulk jobs that copy or label text go to Gemma 4 (14,400 a day, its own bucket). Writing and answers go to the two Flash-Lite models, which have separate buckets (500 a day each).

| Workload | Model | Calls/day | Tokens/day (in+out) | Free limit | % of daily request limit used | Fallback |
| --- | --- | --- | --- | --- | --- | --- |
| a1 place short posts | Gemini 3.1 Flash-Lite | 46 | about 102k | 500 RPD, 250k TPM | 9% | Workers AI Gemma 4 26B (about 41 neurons per call, 46 calls = about 1,900 neurons) |
| a2 long stories (retell) | Gemini 3.8 Flash | 4 | about 26k | 20 RPD, 5 RPM | 20% | Gemini 3.6 Flash (own 20), then Workers AI Gemma 4 |
| b fact sheets | Gemma 4 26B (Gemini API) | 20 | about 130k | 14,400 RPD, 16k TPM | 0.1% | Workers AI Gemma 4 26B (the current default in `desk.ts`) |
| b drafts | Gemini 3.5 Flash-Lite | 26 | about 99k | 500 RPD | 5% | Workers AI Gemma 4 |
| c wiki write and revise | Gemini 3.5 Flash-Lite (hard pages: 3.6 Flash) | 15 | about 51k | 500 RPD | 3% | Workers AI Gemma 4 |
| d claim and edge extraction | Gemma 4 26B (Gemini API) | 12 (backfill 72) | about 64k (backfill 380k) | 14,400 RPD, 16k TPM | 0.1% (0.5%) | Workers AI Gemma 4, about 75 neurons per call: backfill 72 calls = 5,400 neurons, over half the day's 10,000 |
| e classification with receipts | Gemini 3.1 Flash-Lite | 19 (backfill 90) | about 80k (backfill 380k) | 500 RPD | 4% (18%) | Workers AI Gemma 4, then Clef once it has confirmed examples |
| f decision checks | Gemini Decision 1 | 12 | about 172k in, 0 out | 10,000 RPD, 50k TPM | 0.1% | Clef decision models, or MinHash and rules for duplicates |
| g source summaries | Gemma 4 26B (Gemini API) | 20 | about 86k | 14,400 RPD | 0.1% | Workers AI Gemma 4 |
| h Tanya peta Q&A | Gemini 3.5 Flash-Lite | 120 | about 408k | 500 RPD, 10 to 15 RPM | 24% | Workers AI Gemma 4 (about 40 neurons per call at 3k in and 0.4k out) |
| i captions, alt text | Gemini 3.1 Flash-Lite (image input) | 40 | about 52k | 500 RPD | 8% | Gemma 4 26B (accepts images) on Gemini or Workers AI |

Per-model totals for one deployment:

| Model bucket | Calls | Tokens | Daily limit | Used |
| --- | --- | --- | --- | --- |
| Gemini 3.8 Flash | 4 | 26k | 20 | 20% |
| Gemini 3.1 Flash-Lite | 105 | 234k | 500 | 21% |
| Gemini 3.5 Flash-Lite | 161 | 558k | 500 | 32% |
| Gemma 4 26B | 52 | 280k | 14,400 | 0.4% |
| Gemini Decision 1 | 12 | 172k | 10,000 | 0.1% |
| All | 334 | about 1.27M | | |

Where the limits really bite:

- **Per-minute limits, not daily ones, are the risk.** Flash-Lite at 10 RPM allows one call every 6 seconds. Gemma at about 16k TPM allows only 2 to 3 large calls a minute (a 6.5k fact sheet is 40% of a minute). Space background jobs out and queue them.
- **Q&A is the one workload that scales with people.** At 24% for 120 questions a day, about 500 a day would use up the 3.5 Flash-Lite bucket. Overflow goes to the other Flash-Lite model, then Gemma, then Workers AI.
- **Backfill** (10,000 items for claims and labels in two weeks) raises 3.1 Flash-Lite to about 176 calls a day (35%) and Gemma to about 130 calls. Still fits.
- **The 20-a-day models give almost no slack for retries.** Four calls is the plan. Do not route anything else there.
- **If all workloads moved to Workers AI Gemma 4 26B:** about 1.0M input tokens x 9,091 + 0.25M output x 27,273 neurons per million = about 9,100 + 6,800 = about 16,000 neurons a day, 160% of the 10,000 free neurons (https://developers.cloudflare.com/workers-ai/platform/pricing/, read 16 Nov 2026; resets 00:00 UTC, 09:00 WIT). Workers AI also serves embeddings and Clef. It can carry about 60% of the load and only if nothing else uses neurons.

### One deployment, all workloads

About 334 calls and 1.3 million tokens a day. The tightest bucket is 3.5 Flash-Lite at 32% of requests. That leaves about 3x headroom on the plain routing, and about 4x if Q&A is split across both Flash-Lite models. This is before Google changes limits again, which it has done repeatedly in 2026 (a third-party guide notes that older sources quote 10 RPM and 1,500 a day for free Flash, while the same blog's own project shows 5 and 20).

### Deployments per key

Counting limits per project, with each deployment on its own project and key:

| Rule | Deployments |
| --- | --- |
| Plain routing, up to 100% of every limit | 3 (3.5 Flash-Lite is full at 3.1) |
| Plain routing, 70% safety cap | 2 |
| Rebalanced: Q&A split across both Flash-Lite, captions and classification moved to Gemma | 3 at a 70% cap, 4 at about 90% |
| Gemma and Decision 1 alone | hundreds (not the constraint) |

On the Cloudflare side, each deployment on its own Cloudflare account has its own 10,000 neurons. Several deployments on one account share it.

Caveats: the free tier needs project verification in some cases, quotas are per project (more keys in one project add nothing), and I did not find or check a Google clause on creating many projects to multiply free quota. Read the Gemini API additional terms before relying on that. Also, several deployments with separate keys is a design the owner can still avoid: moving to paid Tier 1 costs about $5 prepaid and gives 10,000 a day on 3.8 Flash and about 150,000 a day on 3.5 Flash-Lite (scriptbyai, 13 Nov), but then the "free tier terms" worry goes away and the "paid tier data terms" apply (content is not used to improve products). That is worth weighing for the main deployment.

## 4. Gemma 4 through the Gemini API

- Two models: `gemma-4-26b-a4b-it` and `gemma-4-31b-it` (https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api). Open weights, Apache 2.0. Context 256K. 26B A4B is a mixture-of-experts with 3.8B active parameters. Text and image input.
- Free on the API with no paid tier. Free-tier data use applies ("Used to improve products: Yes").
- Limits (third-party, unverified): 30 RPM, 14,400 RPD, one source says 16k TPM. The small TPM means big documents must be cut into chunks of about 6k tokens or less.
- No Google Search grounding, no URL context listed, no batch, no Decision-style features.
- Function calling is documented on the Gemini API. JSON schema output through the API is not documented on the Gemini structured-output page. Test it.

## 5. Quality evidence for Indonesian

What exists (all third-party benchmarks of general Indonesian, not Papuan Malay):

| Evidence | Result | Source |
| --- | --- | --- |
| Belebele Indonesian (reading), Baibu survey of Indonesian languages, 3 Nov 2026 | Gemini 3.1 Flash-Lite 94.1, Gemma 4 31B 93.9, Gemini 3.5 Flash-Lite 90.8, Gemma 4 E4B 88.3 | https://baibu.id/en/blog/what-language-models-can-do-in-indonesias-languages/ |
| Same survey, school exams on 7 other regional languages and cultures | Gemini 3.1 Flash-Lite 67.5, 3.5 Flash-Lite 62.3, Gemma 4 31B 59.7, Gemma E4B 41.2 | same |
| Same survey, replies in Minangkabau (a language outside Indonesian) | 3.5 Flash-Lite 85%, Gemma 4 31B 80%, 3.1 Flash-Lite 64%, Gemma E4B 0% | same |
| Same survey, 17 less-resourced languages | Every model does worse. Batak Toba, Buginese, Makassarese correct answers 1 to 17% | same |
| SEA-HELM Indonesian score, board updated 18 Sep 2026 (thinking runs) | Gemini 3.8 Flash 80.9, 3.6 Flash 80.8, 3.5 Flash 80.1, Gemma 4 31B 79.8, Gemini 3.1 Flash-Lite 79.4, Gemma 4 26B A4B 78.3 | https://atlas.village.dev/benchmarks/sea-helm-indonesian |
| SEA-HELM overall (ID), Gemma 4 31B | 79.75 (95% interval about plus or minus 1.2) | https://leaderboard.sea-lion.ai/detailed/ID |

What this says, in plain terms:

- For Indonesian reading and instruction following, Flash-Lite and Gemma 4 are close. Differences of one to two SEA-HELM points are inside the error bars.
- Gemma 4 26B A4B is about 1.5 points below the 31B and about 2.5 below Flash-Lite 3.1 on SEA-HELM Indonesian. That is small.
- Nothing here tests Papuan Malay, Mee, Dani or other local languages. The only hint is the Baibu survey: all models drop sharply on regional languages. Local words in drafts must come from the fact sheet, as the existing pipeline already enforces.

Not verified:

- Faithfulness and storytelling quality of long Indonesian prose from these models (the direction doc already asks for a ten-source test scored by a person).
- Quality of Gemini 3.5 Flash-Lite on SEA-HELM Indonesian (not in the excerpt I read; the Baibu reading score for it is lower than for 3.1).
- Any NLI, claim-support or duplicate test of Gemini Decision 1 or of Gemma in Indonesian. The algorithms note already says none was found.
- JSON-schema validity rates of Gemma 4 through the Gemini API.
- A listing on a site called "Hemat" scores gemini-3.5-flash-lite at 70.6% on Indonesian regional languages, but I could not read how it was measured. Not used.

## 6. Recommended routing

| Task | Primary | Second choice | Last resort |
| --- | --- | --- | --- |
| Fact sheets, claim and edge extraction, catalogue summaries (copy and label, verified in code) | Gemma 4 26B on Gemini API | Workers AI Gemma 4 26B | Pause until reset |
| Short posts, wiki pages, Q&A, classification, captions | Gemini 3.1 and 3.5 Flash-Lite (spread across both buckets) | Gemma 4 31B on Gemini API | Workers AI Gemma 4 |
| Long story retell, hard pages, retries that failed on Flash-Lite | Gemini 3.8 Flash, then 3.6 Flash, then Hydrogen (each its own 20 a day) | Flash-Lite with a steward edit | Workers AI Gemma 4 |
| Claim supported by sentence, duplicates | Gemini Decision 1 (batch up to about 300 questions per call to stay under 50k TPM) | Clef decision models and MinHash/SimHash in code | Mark "not checked", send to a steward |
| Labels (domain, form, voice) once confirmed examples exist | Clef reads each draft; Flash-Lite labels with receipts until then | Gemma 4 | Steward |
| Embeddings | Workers AI (EmbeddingGemma 2 at 154 neurons per million tokens, Qwen3-Embedding at 1,075) | Gemini Embedding (100 RPM, 1,000 a day free) | n/a |

Clef and Decision 1 give triage and checks, never approval, as the direction doc says. Decision 1 is free to 10,000 requests a day, has no output tokens, and no Indonesian test is known, so run it beside a code check for the first month and log disagreements.

### Caching

- Cache every result by hash of (model, prompt version, input text) in D1 or KV. Fact sheets key on the stored source hash. Classification keys on item hash plus taxonomy version. A cache hit costs no quota.
- Q&A: cache by normalised question plus index version for an hour or a day. Popular questions repeat.
- Put the long fixed text (taxonomy, outline, examples) first in each prompt. Implicit caching on 3.8 Flash, 3.6 Flash and Hydrogen is free. Flash-Lite has none, so fewer prompt tokens there.
- Batch items into one call (8 to 10 per call, up to 100 questions for Decision 1). RPD counts requests, so batching multiplies throughput. Keep each batch under the model's TPM.

### Retries and 429

- On 429 or 5xx: read any retry hint, then wait with exponential backoff and full jitter: 2 s, 4 s, 8 s, 16 s, up to 60 s, at most 4 tries.
- If the day's count is the reason (RPD), do not retry. Mark the model "spent until 08:00 UTC" and go straight to the next model in the table.
- An RPM or TPM 429 means wait about 60 s on that model. Meanwhile try the next model.
- Keep one in-flight call per model for background jobs. Run user questions ahead of background work.
- Failed code checks (names, numbers, citations) get one retry, as `desk.ts` does today, and then go to the steward as failed. A retry spends quota, so count it.

### Per-day budget guard

1. Keep a counter per model per Pacific day in D1 or a Durable Object (calls, input and output tokens, 429s). Reset at 08:00 UTC (07:00 UTC in summer). Do the same for Workers AI neurons per UTC day.
2. Read the project's real limits once a day, or set them from config. Do not hard-code. The setup should read them, as the direction doc says for model names.
3. Soft cap at 70% of RPD per model: background jobs stop, user Q&A continues. Hard cap at 90%: everything moves to the fallback.
4. Reserve lanes: 3.8 Flash only for long stories. Keep 30% of each Flash-Lite bucket for Q&A. Stop backfill first.
5. Neuron guard: keep Workers AI use under 70% of 10,000 neurons so Clef and embeddings are never starved.
6. Log every call with model, tokens, cost estimate and result so stewards can see the budget (the desk code already stores model and counts).
7. Refuse private data at the door: only items with public state may go to a free-tier route. Add a test, as the map design does for layout.
8. Alert a steward if three days in a row a model hits its cap, or if a model's limits change (read them from AI Studio).

## 7. Open points for the owner

1. Read the real free limits for the project at https://aistudio.google.com/rate-limit and tell me where they differ from section 1.
2. Decide about paid Tier 1 for the main deployment. It would cost little ($5 prepay) and switches the data terms to "not used to improve products", which matters for trust even with public data. This is a policy choice, not a technical one.
3. Check Google's terms on using several free projects before planning around "one key per deployment".
4. Gemini 2.5 Flash and 2.5 Pro route to other models on 1 December 2026. Do not depend on them.
5. Gemini 3.8 Flash and 3.6 Flash prices double on 1 January 2027 (paid tier). The free tier is unaffected, but it is a sign that limits and prices move.
6. Test before launch: Gemma JSON schema on the API, Indonesian faithfulness on ten sources, Decision 1 on a set of Indonesian claim-sentence pairs, free-tier access from Papua.

## Sources (read 16 November 2026 unless noted)

- Google, Gemini Developer API pricing: https://aistudio.google.com/docs/pricing (was ai.google.dev/gemini-api/docs/pricing)
- Google, Rate limits: https://aistudio.google.com/docs/rate-limits (Decision 1 table, tiers, batch)
- Google, Terms (unpaid services, EEA/CH/UK): https://aistudio.google.com/docs/terms
- Google, Structured output: https://aistudio.google.com/docs/structured-output
- Google, URL context: https://aistudio.google.com/docs/url-context
- Google, Batch API: https://aistudio.google.com/docs/batch-api
- Google, Models: https://aistudio.google.com/docs/models
- Google, What's new in Gemini 4 Hydrogen: https://aistudio.google.com/docs/whats-new-gemini-4-hydrogen
- Google, Run Gemma with the Gemini API: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api
- Google, Gemma 4 model card: https://ai.google.dev/gemma/docs/core/model_card_4
- Cloudflare, Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Imisofts, Gemini API free tier limits, 21 Oct 2026: https://imisofts.com/blog/gemini-api-free-tier-limits/
- AI Workmate (Korean), free tier limits per model, 3 Oct 2026: https://chatgpt.kwgo.co.kr/posts/google-gemini-api-free-tier-rate-limit-guide.html
- ScriptByAI, free tier limits, 13 Nov 2026: https://www.scriptbyai.com/gemini-api-free-tier-limits/
- Apidog, free tier in 2026, 22 Oct 2026: https://apidog.com/blog/gemini-api-free-tier/
- Philipp Schmid, Gemma 4 with the Gemini API, 7 Apr 2026: https://www.philschmid.de/gemma-4-gemini-api
- Baibu Research, What AI models can do in Indonesia's languages, 3 Nov 2026: https://baibu.id/en/blog/what-language-models-can-do-in-indonesias-languages/
- Village LLM Atlas, SEA-HELM Indonesian (board of 18 Sep 2026): https://atlas.village.dev/benchmarks/sea-helm-indonesian
- SEA-HELM leaderboard, Indonesian: https://leaderboard.sea-lion.ai/detailed/ID
- Repository: `docs/knowledge-map-design-2026-11-16.md`, `docs/direction-2026-11-16.md` ("Aksara's posts", "How Aksara writes with a small model", "Desks", "Aksara by place"), `src/desk.ts`, `docs/research/algorithms-and-decision-models-2026-11-16.md` (section 5.2).
