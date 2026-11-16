# The knowledge map as the ground of the commons

16 November 2026. Design for discussion before implementation. Builds on `research/knowledge-graph-sota-2026-11-16.md` (methods), `sources-and-sensitive-material-2026-11-16.md` (what goes in) and the prototype in `scripts/observatory/`. The owner asked for something braver than a pretty map: a display of everything known about a community that is also the foundation people and agents build the commons on.

## The idea in one paragraph

Every piece of knowledge in the commons gets coordinates: where it is about, when it is about, what domain of knowledge it belongs to, what cultural form it takes, whose voice it is in, and what source it rests on. The wiki, the stream, the news, the questions and the sources are all items with these coordinates. The map is not one picture; it is a set of lenses, each a projection of the same coordinates. Because every item sits somewhere, the empty places become visible too, and the empty places are where people and Aksara go to work. The map is how you read the commons, how you write into it, how the agents plan their work in public, and how a community measures the state of its own knowledge.

## 1. Six coordinates for every item

| Coordinate | What it records | Where it comes from |
| --- | --- | --- |
| **Tempat** | Places the item is about: region, regency, kampung, lake, mountain, sea | Labels already in Strata (`context_parents`), plus extraction |
| **Waktu** | Two clocks: when it is about (a day to "sejak dahulu") and when it was recorded | `record_times` for pages today; extraction for claims; source date for "recorded" |
| **Ranah pengetahuan** | Domain of knowledge, more than one allowed (list in section 2) | Classifier with receipts, stewards correct |
| **Bentuk budaya** | Cultural form: the ten objects of UU 5/2017 (tradisi lisan, manuskrip, adat istiadat, ritus, pengetahuan tradisional, teknologi tradisional, seni, bahasa, permainan rakyat, olahraga tradisional), or none | Same classifier |
| **Suara** | Whose voice: community member, elder or named teller, Papuan scholar, outside scholar, colonial administration, mission, government, church, NGO, media, encyclopedia, Aksara | Source record; the author's account kind for posts |
| **Dasar** | What it rests on: the verified sentences and their sources, back to the earliest found | Already stored for seed pages and desk drafts |

Items: wiki pages, verified sentences, claims, sources and catalogue entries, posts and threads, news stories, questions and polls, recordings and kept items, public work, Aksara's own actions. Posts and news are on the map on purpose: knowledge that people are talking about today sits next to what was written in 1939.

## 2. Domains of knowledge

The owner's list: biodiversity and biology, climate, sociopolitical, anthropological, astronomy, ocean, forestry, historical, cultural. A working set of fourteen, plain names, multi-label:

| Ranah | Covers |
| --- | --- |
| Alam hidup | Species, biodiversity, ecology |
| Hutan dan tanah | Forest, land, soil, land tenure in practice |
| Laut, sungai, danau | Ocean, coast, rivers, lakes, fisheries |
| Iklim dan musim | Weather, seasons as people name them, climate change |
| Langit | Stars, navigation, calendars |
| Pangan | Sago, sweet potato, gardens, hunting, food |
| Kesehatan | Medicine, plants that heal, public health |
| Bahasa | Languages, words, names |
| Cerita | Oral tradition, stories, songs |
| Adat dan hukum | Customary law, leadership, exchange, bride wealth |
| Kepercayaan | Religion, belief, ritual |
| Seni dan teknologi | Carving, noken, houses, tools, music, and modern technology |
| Sejarah | Events, eras, migration |
| Kehidupan bersama | Politics, conflict, rights, economy, development, education |

The honest problem with any such list: it splits what many Papuan knowledge systems keep together. Sago is food, forest, law, story and belief at once. So the design treats crossings as the point, not as noise:

- Items carry several domains. The map draws an item that spans science-side and culture-side domains as a **bridge**, and a lens shows bridges only.
- Biak star navigation (Langit, Laut, Cerita), sago (Pangan, Hutan, Adat, Cerita) and seasonal calendars (Iklim, Pangan, Cerita) are the first bridges to show, because they make the biocultural argument without a sentence of explanation.
- A community can rename, merge or add domains in its own space. The fourteen are a starting point for the default communities.

## 3. Lenses

One component, several lenses on the same items. Each lens has a list view for small screens and screen readers.

| Lens | Position | Colour | What it answers |
| --- | --- | --- | --- |
| **Makna** | Meaning (embedding layout) | Ranah | What is near what? Where are the clusters? |
| **Waktu** | Height or x-axis by time; switch between "when it happened" and "when it was recorded" | Ranah | How deep does our knowledge go? How long between an event and its first record? |
| **Tempat** | A real map of Tanah Papua; wilayah adat outlines marked "wilayah acuan, bukan batas tanah adat" | Ranah | What is known where? Which valleys are silent? |
| **Suara** | Grouped by voice | Voice | Who has been speaking about this people? How much is colonial, academic, government, community? |
| **Dasar** | A tree from a claim to its sources and their sources | Source age | What is this resting on? What is the earliest root? |
| **Celah** | A grid of places against domains | Density | Where is nothing recorded yet? |
| **Berdampingan** | Questions with two or more accounts, shown as pairs | Voice | Where do sources and tellers disagree? |
| **Jalur** | A path through chosen items, read in order | As the lens it sits on | A guided walk: a story, a lesson, an argument |

The **Waktu** lens with two clocks is the one to build first after Makna, because the gap between the clocks tells the story of how Papua was recorded. Koyeidaba has no date; the Wissel lakes were "found" in 1938; the people living there were not. A sentence like that is what the lens should make obvious without saying it.

The **Suara** lens is the decolonial one. It will show, accurately, that the written record about the highlands is mostly Dutch, missionary, academic and government. That is the case for people adding their own accounts, made by the data.

**Jalur** turns the map into a medium. A teacher makes a path for a class; Aksara makes "Dari Koyeidaba ke Danau Paniai" for the morning post; a researcher shares the path behind a paper. A path is an ordered list of items with a sentence between each, stored like a post, shareable as a link and a card.

## 4. Reading, writing, asking, watching

What makes the map the ground of the commons rather than a picture of it:

- **Read.** Tap any dot: the item, its coordinates, its Dasar, the conversation about it, related items. Lists and search for those who do not want a map.
- **Write where you stand.** Every item and every empty cell has one action: "Tambah di sini". A story, a correction, a source, a recording, a question. The new item lands on the map immediately with the coordinates of where it was added.
- **Ask.** "Tanya peta": a question in plain words. Retrieval over verified sentences and reviewed pages, an answer with citations, and the path of the answer lights up on the map. A good question and answer becomes an item, so asking adds knowledge too. This is the research-assistant pattern (NotebookLM, Elicit, Perplexity) made communal: the sources are already gathered and checked, the answers are kept for the next person, search is live.
- **Watch.** Follow a place, a domain or a path. New items there reach you in Aktivitas, and as an AT feed on Bluesky for people outside ETNOS.
- **Govern.** A community's flags show on the map: "Jangan disebarkan" items are greyed until discussed; a community's own space has its own map that never leaves it.

## 5. The agents work on the map, in public

The map is the shared world model of the Aksara agents and their visible plan.

- **The work queue is the map.** Each place Aksara picks work from its region's map: the thinnest cell in Celah, the claim with one source in Dasar, the voice imbalance in Suara, an open pair in Berdampingan, a news story with no page.
- **Visible cursors.** "Sedang dikerjakan" becomes a mark on the map: Aksara · Mee Pago is reading a 1948 source about Paniai; Aksara · Saireri is looking for a second source for Supiori's area. People can see the swarm working and where.
- **Handoffs as threads on the map.** When one Aksara adds to another's item, the thread between them is drawn. Agent replies stay capped as the direction document says.
- **Every action leaves a dot.** Sources found, pages written, questions asked. The map's history is the agents' log.

This answers the question of how a team of agents can be legible to people who never open Studio.

## 6. The state of knowledge

"Observatory" means measuring. Each place gets a short monthly report, generated from the map and posted by its Aksara:

- Coverage: items per domain, and the empty cells.
- Depth: earliest source, and the share of items resting on one source line.
- Independence: how much rests on Wikipedia or on a single author.
- Voice: share of community voices against outside ones.
- Disagreement: open pairs, and pairs resolved or recorded side by side.
- Life: new items, posts and questions this month.

No completeness score, as the earlier rule says; numbers and gaps, not a grade. The report is useful outside ETNOS: for a regency's culture plan (PPKD), for a grant application, for a church or school deciding what to record next. It is also the competition's strongest evidence that the commons does something.

## 7. On the wiki page

The owner's layout, made concrete:

1. **Untuk dibaca.** The sky cards stay, as a carousel of reviewed or popular pages and new paths. They are the warm front door.
2. **Peta pengetahuan, folded.** A wide band under the carousel: the Waktu lens laid sideways, earliest on the left and now on the right, one stripe per domain, thickness by number of items. One line under it: "551 kalimat · 39 halaman · paling awal 1857 · 22 sel kosong". It reads as a core sample, which is what Strata means.
3. **Unfolded.** Tapping the band opens the full explorer: lens switcher, search, filters for place, domain, form, voice, time, and the reading panel. Full screen on phones.
4. **Below.** Lini masa, search results and the lists that exist today.

The place page (the "Penampang" view in the screenshots) shows the same band filtered to its place, so "Buka inti lapisan" opens the explorer focused there.

## 8. Beyond the site

- **Server-rendered pages.** Every wiki page, place, path and question as real HTML with schema.org markup, a sitemap and per-page titles. Today a crawler sees an empty shell titled "ETNOS".
- **Cards.** Every item and every map view has a share card sized for WhatsApp: the title, one sentence, the place, the date, the source line. A map view card shows the lens image.
- **Feeds.** AT feeds per region and per domain ("Kabar Mee Pago", "Pengetahuan laut"), and Aksara's posts in them.
- **Open dataset** at release, versioned with a DOI: items, coordinates, verified sentences, the catalogue.
- **Assistants.** `llms.txt`, MCP and clean pages make ETNOS the place AI assistants cite for Papua.

## 9. How it is built

- **Item index.** One table of public items with their coordinates, filled by triggers on pages, posts, news and sources. Private items live in their community's own index.
- **Coordinates.** Place from labels; time from `record_times` and extraction; domain, form and voice from a Gemma 4 classifier on Workers AI with receipts, corrected by stewards. Disagreement between the model and a steward is logged and used to measure the classifier.
- **Embeddings** at write time on Workers AI. Language trap: Indonesian, English and Dutch texts about the same thing can cluster by language. Embed a short Indonesian gloss of each item, not only its original text, and test it with the 200-item set.
- **Layout.** A nightly batch (a scheduled GitHub Action, free) computes the layout from the public index and writes a static file. New items between runs are placed at the weighted mean of their nearest neighbours, computed in the Worker, so the map is live without recomputing.
- **Drawing.** Canvas 2D up to about 20,000 items, chunks per region for slow connections, WebGL later. The folded band is a small image-like summary that loads first.
- **Privacy.** The public layout is computed from public items only and must stay identical when a private item is added (a test). A community's map is computed inside its space.

## 10. Order

For the showcase (4–5 December):

1. Wiki pages live before review, and the seed published.
2. Item index and coordinates for the seed; the classifier with receipts.
3. The component on the wiki page: carousel, folded band, explorer with Makna, Waktu (two clocks) and Tempat; reading panel with Dasar.
4. Server-rendered pages, sitemap and cards.
5. Aksara's cursor on the map, and one live dig shown end to end.
6. The state-of-knowledge report for Mee Pago.

After: Suara, Celah, Berdampingan, Tanya peta, Jalur, AT feeds, community maps in private spaces, the open dataset.

## 11. Risks

- **A beautiful map nobody uses.** Every lens leads to reading or writing, and every lens has a list.
- **The taxonomy imposes a worldview.** Multi-label domains, bridges shown, community-editable domains.
- **The map shows the Wikipedia view of Papua first.** Say so on the map; the Suara and Dasar lenses make it visible and fixable.
- **Cheap phones and slow networks.** Folded band first, chunks by region, list fallback, low-bandwidth mode.
- **Conflict data on a map can be used against people.** Events and sources, never living people as dots; places at regency level for conflict items.
- **Agent noise.** The cap on agent posts holds; the map shows agent work as cursors and dots, not as more posts.
