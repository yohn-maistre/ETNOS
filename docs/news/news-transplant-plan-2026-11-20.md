# Plan to move the West Papua Watch news engine into ETNOS

20 November 2026. Research and planning only. No code was changed in either repository. The West Papua Watch repository is called WPW below. WPW commit read: `a2fed8b`. Strata commit read: `9a11c4e`.

The goal is that Kabar in ETNOS gathers news from Papuan outlets, groups reports of one event into one item ("3 laporan · 2 sumber"), writes a short Indonesian and English summary with a picture, and tags it with a topic and a place ("Hak & keadilan · Enarotali"). Later, news items should also attach to places, peoples and languages in the knowledge model.

## What the plan recommends

The engine can be moved, but only after it is rewritten against Strata's own storage and runtime. WPW runs on D1, Queues, Workflows, R2 and a paid-style browser service. Strata runs on one SQLite Durable Object with alarms. Almost every storage call in WPW (about 195 `env.DB` call sites) must change.

The cheapest and safest path is to ship in layers. First a Kabar that works with no model at all, then grouping, then summaries and tags. If the model key is missing or the daily quota is used up, Kabar keeps working at the earlier layer.

## How the WPW engine works from start to finish

The engine is one private Worker in `services/watch-engine/`. The Astro site and its Pages Functions in `functions/api/` only read from it.

| Part | What it does | Where it lives |
| --- | --- | --- |
| Source list | 18 sources, 17 enabled. Jubi, Aneta Papua, Suara Papua, Mongabay Indonesia, Project Multatuli, Lao Lao Papua, Nadi Papua, BBC Indonesia, RNZ, ABC Pacific, RRI, Antara, Antara Papua, Kalawai, PUSAKA, Human Rights Monitor, Papuan Voices. ACLED is off. Each has a role (local newsroom, state media and so on), languages and a feed. | `content/news-sources.json`, loaded by `services/watch-engine/src/sources/registry.ts` |
| Finding new articles | Reads RSS or Atom with `@rowanmanning/feed-parser`. Falls back to a homepage link scan or a sitemap scan for sources without a feed. Keeps only links on the publisher's own host. | `src/sources/discover.ts` |
| Schedule | One Cloudflare cron trigger every hour (`0 * * * *`) starts a Workflow instance. A second cron on Monday starts the weekly review. | `wrangler.template.jsonc`, `src/index.ts` (`scheduled`), `src/workflow.ts` |
| Work queues | Two queues, one for article ingestion and one for editorial writing. Each runs one message at a time with a dead-letter queue. A cycle sends at most 20 new articles, spaced 12 seconds apart. | `src/workflow.ts`, `src/index.ts` (`queue`) |
| Fetching the text | Plain `fetch`, then Defuddle, then Mozilla Readability, all on `linkedom`. Falls back to the Cloudflare browser binding, then to Firecrawl if a key exists. | `src/ingest/extract.ts` |
| Relevance | A keyword list of Papuan place names keeps or drops an article. Unclear articles go to the model, which must quote evidence from the text. | `src/ingest/prefilter.ts`, `src/ingest/relevance.ts` |
| Story packet | One model call per article returns an Indonesian summary, key points, event key, places, people, organizations, topics, a desk (environment, land, human rights, politics, culture, regional) and a relevance verdict with quotes. | `src/ingest/story.ts` |
| Storage | D1 for articles, packets, stories (called developments), places, issues and review logs, with FTS5 search tables. R2 keeps the full article text as `articles/<id>.txt`. 22 migrations. | `services/watch-engine/migrations/`, `db/schema.sql` (an older Postgres sketch, not in use) |
| Grouping | For each new article: find up to 30 candidate stories by FTS5 search, place overlap and a 45 day window, score the top 6 with a weighted formula, then ask the model whether it is the same event. A later pass re-checks recent pairs and merges them. | `src/cluster/index.ts`, `src/search.ts`, `src/cluster/evidence.ts`, `src/cluster/partition.ts` |
| Writing | A writer model produces English and Indonesian titles, summaries, key points and "what changed". A critic model checks it against the sources. Up to 4 revisions. A single-source story can be published as a 24 word literal excerpt. Pacing allows one writer batch every 3 minutes. | `src/cluster/editorial.ts`, `src/cluster/synthesis-quality.ts` |
| Topics and places | Regular expressions map text to 7 issue dossiers, 11 broad issues and 13 topic tags. Place names from the model go through an alias table; unknown names become a "reported" place. | `src/knowledge.ts`, `src/news-read.ts` (`TAG_RULES`) |
| Images | Only the page's `og:image` URL, credit and caption are stored. The file is not copied. With `ALLOW_EXTERNAL_IMAGES=true` the site shows the hotlinked image. | `src/ingest/extract.ts`, `image_candidates` table, `imageForDevelopment` in `src/news-read.ts` |
| Public API | `/current` (paged list, desk and place filter, 10 minute cache), `/development/:id`, `/places`, `/issues`, `/search`, `/weekly`. Pages Functions pass these through as `/api/*`. | `src/index.ts`, `src/news-read.ts`, `functions/api/*.ts`, `shared/news-desk.ts` |

### Models and keys

Every model call goes through Cloudflare AI Gateway routes named `dynamic/watch-fast`, `watch-synth` and `watch-ask`. Each route tries Groq `qwen/qwen3.8-27b` first and falls back to Google `gemini-3.5-flash-lite`. The route files are `config/ai-gateway/*.json`. Direct Workers AI is switched off.

Embeddings are not in use. The code can embed with `@cf/baai/bge-m3` and store vectors in Vectorize, but `ENABLE_VECTORIZE_ENRICHMENT` is `false`. Grouping in production therefore rests on FTS5 search, a lexical score and the model check.

Keys and tokens exist in these places, and no value was read or copied for this plan:

- `AI_GATEWAY_TOKEN` is a Worker secret. The provider keys for Groq and Google sit inside AI Gateway, not in the repository.
- `GROQ_API_KEY` is used by the Pages Ask function. `.env.example` holds the name only.
- `WATCH_ADMIN_TOKEN` protects the admin routes and is a GitHub production secret.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are GitHub secrets for deployment.
- `FIRMS_MAP_KEY` (fire map) and `FIRECRAWL_API_KEY` (optional scraper) are Worker secrets that the news engine does not need.

### Documents that disagree with the code

`docs/WATCH_ENGINE_FREE_TIER.md` says the cron runs twice an hour and `AUTO_PUBLISH` is `false`. The current template runs hourly and sets `AUTO_PUBLISH` to `true`. The code was treated as correct.

## Free tier footprint of the WPW engine

These figures are estimates from reading the code, not measurements. Cloudflare limits were checked on 20 November 2026 in the Cloudflare documentation.

| Item | WPW today | Free tier limit | What it means for Strata |
| --- | --- | --- | --- |
| Cron triggers | 2 | 5 per account | Strata should use no cron. Its Durable Object alarms already drive Discovery. |
| Outside fetches per hourly cycle | About 20 for discovery, then 1 per article (up to 20), plus 1 to 3 model calls per article | 50 outside subrequests per invocation | Do one small unit of work per alarm. Never discover and process in one wake. |
| Model calls per day | About 150 to 250 typical, over 1,000 at the cap (packet, grouping check, writer and critic batches, hourly re-check) | Google free tier about 500 a day for Flash-Lite and about 14,400 for Gemma 4 (unverified third-party numbers, see `research/free-tier-llm-coverage-2026-11-16.md`) | Strata's keyed budget is 200 calls a day and the keyless budget is 10. The news engine needs its own counter and a lighter pipeline. |
| CPU-heavy steps | HTML parsing with `linkedom`, Defuddle and Readability on pages up to 900 KB. Candidate scoring of up to 30 stories per article. | Workers Free: 10 ms CPU. Durable Object invocations: 30 s default per the Durable Objects limits page | The Durable Object limit looks sufficient, but Strata's own notes assume 10 ms. Test parsing under workerd before depending on it. Prefer the small `og:` tag scan already in `src/link-preview.ts`. |
| Read cost of the public list | `readCurrent` reads every published story with joins and `GROUP_CONCAT` on each cache miss | 5 million rows read a day in a Durable Object; 30 heavy users already use 40% | Store a ready-made list table that is updated when a story changes. |
| Queues, Workflows, R2, D1, Vectorize, browser | All in use or available | Queues free: 10,000 operations a day. Browser: 10 minutes a day. Vectorize free is unclear in the docs. D1 is unused by Strata. | Drop all of them. |

What would need to change in Strata's runtime, in short: replace D1 calls with the synchronous store calls that `src/core.ts` offers, replace queues and workflows with an alarm that does one bounded step, and replace R2 with no stored body text at all.

## Licence and third-party material

The WPW repository has no `LICENSE` file and no `license` field in `package.json`. The git history holds one commit. The owner owns both repositories, so copying into AGPL-3.0 Strata is the owner's decision. Two housekeeping steps are still worth doing: record the WPW commit hash and the copied files in a notice, and decide whether WPW itself gets a licence file.

Dependencies of the news engine all fit AGPL-3.0:

| Package | Licence | Needed in Strata |
| --- | --- | --- |
| `@mozilla/readability` 0.6.0 | Apache-2.0 (compatible with AGPLv3) | Probably not. See the plan. |
| `defuddle` 0.19.3 | MIT | Probably not. |
| `linkedom` 0.18.13 | ISC | Probably not. |
| `@rowanmanning/feed-parser` 2.1.4 | MIT | No. Strata already parses feeds with `saxes` in `src/discovery.ts`. |

The rest of the WPW lockfile is MIT, ISC, BSD, Apache-2.0, CC0 and similar. Three entries need a note and none touches the news engine. `lightningcss` is MPL-2.0 and is a build tool. `@img/sharp-libvips-*` is LGPL-3.0 and comes in through Astro image tooling. The two Instrument fonts are OFL-1.1.

Other third-party material inside WPW that carries its own terms, none of it needed for the news engine:

- `.agents/skills/design-taste-frontend/` is a vendored skill under the MIT licence, copyright Leonxlnx.
- `public/data/languages.geojson` and `content/data/languages-source.tsv` come from Glottolog 5.3 under CC BY 4.0, and need credit if reused.
- `geo/` builds map layers from BIG, Kementerian ESDM and Satu Peta public services and from NASA FIRMS. Their reuse terms were not checked.
- `content/`, `public/images/` and `public/media/` hold exhibition, history and archive material with source-specific rights. `docs/history-refinement-2026-10-10.md` states that unknown rights are not a licence.
- Place coordinates in migration `0012_freeze_10_geography.sql` are entered by hand, and their origin is not recorded.
- The article text, titles and images that the engine collects belong to the outlets. That is a rights question for publishing, covered under risks.

Strata's own `src/catalogues/tanah-papua.json` already lists the Bappenas and BIG sources for region membership, so no new geo data should be copied.

## What maps onto Strata and what is new

| WPW piece | Strata equivalent | Verdict |
| --- | --- | --- |
| Source list and feed reading | `src/discovery.ts`: source registry per community, `parseFeed` (RSS, Atom, JSON Feed), rights levels `link-only`, `excerpt-permitted`, `open`, modes `index`, `review`, `news`, one source refreshed per hourly alarm, 100 fetches a day cap, approved hosts only | Reuse. Seed the 17 sources from `content/news-sources.json`. Add image extraction and a node-level (not per community) scope. |
| Article page fetch and `og:image` | `src/link-preview.ts`: bounded 128 KB read, meta tag scan, fixed host list | Reuse the scan. Replace the fixed host list with hosts taken from approved sources. |
| Hourly cron, queues, workflow | Durable Object alarm in `src/worker.ts` (`arm`, `alarm`), `Meter` in `src/usage.ts` | Replace. One bounded step per alarm. |
| Model calls | `src/models.ts` `nodeModels`: one keyed OpenAI-compatible provider (Google AI Studio works) with Workers AI Gemma 4 as fallback, purposes `fast` and `synthesis`, key and model chosen in Studio | Reuse. Add a `runJson` wrapper from WPW's `src/llm.ts` (schema check and JSON repair, about 100 lines). |
| Daily call budget | `residentBudget` in `src/resident.ts` (200 keyed, 10 keyless) | New counter for news so Aksara and news do not starve each other. |
| Place matching | Catalogue entries with `kabar:<slug>` aliases (55 entries), `newsPlaces` in `src/groups.ts`, place filter in `src/news.ts` | Reuse. Map WPW place names to catalogue slugs. Unknown places (for example Enarotali, a district seat in Paniai) stay plain text and attach to the nearest known parent. |
| Topics | 18 starter topics in `src/catalogues/tanah-papua.json`, designed in `docs/research/topic-primitives-and-knowledge-organisation-2026-11-18.md` | Replace WPW's 7 issues, 11 broad issues and 13 tags with a model or rule mapping to these 18. |
| Same-event grouping | `src/clustering.ts` is a different thing: operator-imported e-means receipts over public discovery items | Keep separate. News grouping is new. |
| Public list and story reads | `src/news.ts` (`publicNews`, `publicStory`, `publicNewsImage`), `/v1/news` in `src/web-worker.ts`, `apps/web/src/news.svelte.ts`, Kabar in `DiscoveryPage.svelte`, `NewsPage.svelte` | Keep the shapes. The reader code changes from the WPW URL to a local table. Add `reportCount`, `topics` and key points. |
| Labels on records | `record_contexts` allows only `post`, `group`, `wiki`, `work` | New record kind `news`. |
| Knowledge model | `src/knowledge-model.ts`: entities, assertions, witnesses. Every assertion needs a witness excerpt and a person's approval. `graph.json` holds 110 entities (63 places, 38 languages, 9 groups). | News attaches as related items. It becomes a witness only through a steward. |

Things that are new work in Strata: storage tables for articles, packets and stories; the grouping logic; the writer and its checks; the read table; the alarm-driven step runner; per-source rights and image policy.

Things to drop from WPW: the Astro site and all its pages, weekly review (`weekly.ts`), issue dossiers and following sets (`content/following.json`, `shared/following*.ts`), emerging issues, Ask (`ask.ts`, `functions/api/ask.ts`), library and resource candidates, fire and map layers (`geo.ts`, `geo/`), Vectorize and embeddings, Browser and Firecrawl fallbacks, R2 article archive, the 22 migrations as history, admin routes and the GitHub operator workflows, the Postgres sketch in `db/schema.sql`, and the `pmy` locale labels. The critic loop is also postponed, see step 6.

## Steps, each shippable on its own

Sizes are working days for one agent with owner review: S is up to 2, M is 3 to 5, L is 6 to 10. The total is about 25 to 30 days.

1. **Settle provenance first** (S, 0.5 day). Add a notice that names the WPW commit, the copied files and the owner's authorisation. Decide whether WPW gets its own licence file. Ships as a documentation commit.
2. **Extract the pure logic with tests** (S, 2 days). Move URL cleaning, content hash, publication date check, the Papua keyword filter, `relevanceDisposition`, `jaccard`, `scoreCandidate`, `episodeEvidence`, `validatePartition`, `synthesis-quality` and the `runJson` parser into a new module under `src/`. Port `scripts/tests/news-engine.mjs` and `news-desk.mjs` to Strata's test runner. Nothing user-facing changes.
3. **Local headlines with pictures and no model** (M, 4 days). Seed the 17 sources through Discovery. Add image and credit capture to `parseFeed` and a bounded `og:image` read. Store items at node level. Serve them from `/v1/news` next to the existing WPW feed. Each source gets a rights level and an image policy chosen by the owner. This layer also covers the fallback when no key is set.
4. **Deduplication and "N laporan · N sumber" without a model** (M, 4 days). Group by clean URL, content hash, Antara syndication and a high-threshold lexical, place and date score. Count reports and distinct sources the way `news-read.ts` does, treating `antara` and `antara-papua` as one. Store a ready-made list table.
5. **Model extraction, relevance and tags** (M, 4 days). Add the story packet call for items that pass the keyword filter, with its own daily counter. Use Gemma 4 for this bulk job and keep the output in Indonesian. Map topics to the 18 and places to catalogue slugs. Show "Topik · Tempat" on the Kabar cards and filter by place the way `newsQuery` already does.
6. **Model check for grouping and the summary** (M, 5 days). Add the same-event check for borderline candidates and the hourly re-check of recent pairs. Add one writer call for Indonesian and English summary and key points, then the code checks from `groundSynthesisDraft`. Single-source items stay as attributed excerpts. Label model text as such. Add the critic call only if replay tests show errors that the code checks miss.
7. **Replay test against WPW output** (S, 2 days). Run a public sample through both engines and compare groups, source counts and tags. This follows step 5 of `docs/news/portable-commons-and-watch-plan-2026-11-11.md`. Record disagreements instead of forcing identical wording.
8. **Switch Kabar to the local store** (S, 2 days). Point `publicNews` and `publicStory` at local tables. Remove the `WATCH_NEWS` service binding and the fixed WPW host reads. Derive the image host list from approved sources. Add `reportCount` and `topics` to the types in `news.svelte.ts`. Keep old story URLs working through a stored WPW id.
9. **Attach news to places, peoples and languages** (M, 4 days). Allow `news` in `record_contexts` and show related news on each thing page. Match through the `kabar:` aliases and language names in catalogue entries. News never creates a statement. A steward may propose a story as a witness for the knowledge model. Do not infer anything about individual people.
10. **Optional later: share the engine back to WPW** (M, 3 days). Let WPW consume the shared module under its own editorial settings, as the earlier plan suggested.

Steps 3 and 4 give a working Kabar on the free tier with no key. Steps 5 and 6 are where model cost begins.

## What would be built differently from WPW

The article body is not stored and the model sees the feed summary plus the first part of the page's meta text, not the full article. This removes R2, the HTML parsers and most CPU cost. The cost is lower summary quality for outlets whose feeds carry only a headline. Those items stay as headline and link.

There is no queue. Each alarm takes one unit: refresh one source, or fetch one article's meta, or run one packet, or run one grouping check, or write one summary. The runner picks the oldest waiting unit, writes the next alarm and stops. This matches how `Discovery.tick` already works and keeps each wake under the 50 outside fetch limit.

## Risks

### Legal

- Summaries of outlet articles are derivative work. WPW mitigates this with attribution, links and a 24 word excerpt limit for single sources. Keep those rules and keep every source link on the story page. Strata's rights field (`link-only` by default) should decide per outlet whether any summary is shown.
- Pictures are the larger exposure. WPW stores only a URL and credit with `rights_status='attributed_external'`, which is not a licence. Strata serves the picture from its own address through `/v1/news/:id/image`. Default each source to no picture and enable pictures only after the owner confirms permission or an open licence.
- Terms of use and robots rules were not checked for the 17 sources. Check them before step 3 and send an honest user agent that names ETNOS.
- Antara, RRI and similar outlets are state media. Show the source type label that `sourceProvenance` already produces.
- AI summaries of killings, arrests and displacement can misstate who did what. WPW auto-publishes after a critic pass. For the human rights and conflict topics, start with steward approval before publishing and revisit once replay results are known.
- The Google free tier may use submitted text to improve its products. This is acceptable only because news text is public. Never send forum or community text to this route.

### Keys and cost

- No new secret is needed. The Google key is added in Studio and stays in Durable Object storage. The WPW tokens listed above stay with WPW and are not copied.
- Without a key the keyless budget is 10 model calls a day, so only steps 3 and 4 work. Say so in the operator page.
- Free-tier model numbers for Google are third-party and unverified. The owner should read the real limits at the AI Studio rate-limit page before step 5.
- Alarm wakes, SQL rows and the daily model counter need entries in `/v1/ops/usage` from the first step, so that Aksara and news cannot silently use all of the 5 million row read allowance.
- Workers Free CPU limits are described differently in Strata's notes (10 ms) and in the Durable Objects limits page (30 s per invocation). Measure with `scripts/load-day.mjs` and a parsing test before relying on either.

### Technical

- WPW leans on SQLite features (FTS5, window functions) that D1 provides. Check that Durable Object SQLite under workerd supports FTS5 before step 4, because candidate search depends on it.
- WPW's place table creates "reported" places on the fly. Strata's catalogue is curated, so unmatched places must stay as text and must not create contexts.
- Two engines will disagree on some groups during the overlap. Keep WPW as the live source until step 8 passes the replay test.
- The only commit in the WPW history is a single agent-authored commit. The owner should confirm that no other contributor's code is inside before the notice in step 1 is written.
