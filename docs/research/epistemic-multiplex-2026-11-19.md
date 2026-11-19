# The epistemic multiplex: a provenance-aware knowledge graph of a people's world

19 November 2026, early morning. Design research; no code changed. It follows `knowledge-ontology-2026-11-18.md` and replaces its naming and its analysis sections; that note's reasoning on what the things are, seeding and the first-person voice still stands. Marks: *(proposal)* for suggestions the owner can overturn, *(not measured)* for estimates, *(to verify)* for open checks, *(rencana)* for anything not built. Nothing in this note is running yet. Sources are at the end.

**Revised 19 November, morning:** section 5 corrected after reading the seed pipeline end to end (the first draft overstated one figure); new sections 9 (public data and foundation models as the measurement layer) and 10 (multimodal witnesses: voice notes, video, photos, with the technical path); motifs M20–M23 added. Later sections renumbered. **Second revision, same morning:** section 17 (three flagships and the idea that ties them together) added; sources moved to 18.

For the case built on top of this note (why it matters, which laws and policies it answers, how it maps to the proposal), read `../rationale-threads-2026-11-19.md`.

## 1. In one paragraph

Strata keeps a people's knowledge as **entities** (what knowledge is about), **assertions** (what is said about them, by whom, on what basis) and **witnesses** (the documents, recordings, tellers' accounts and measurements the assertions rest on). Because every assertion carries its voice and its witness, the whole graph can be read as a **multiplex**: one layer per voice (colonial records, missions, the state, scholars, Papuan writers, tellers, scientific measurement). On that structure we run a library of **mathematical motifs** that have travelled across fields (community detection, higher-order networks, topology, link prediction, sheaves, optimal transport, ecological network metrics, phylogenetic signal) to see what no single voice can see: what is core to a people, what is at risk, where voices agree or diverge, where the gaps are, and what to ask next. Science enters the same graph as one more voice, not as the referee, so the commons brings modern science closer to people and people's knowledge closer to science. As far as our searches found, nobody has yet built a provenance-aware, multi-voice knowledge graph of one people's world and analysed it this way.

## 2. What the owner asked

From the session of 18–19 November, lightly edited:

- Nodes should be the actual concepts, objects, ideas, places and entities of "this abstracted layer of a people's reality", not documents placed by similarity.
- Keep the full twelve-kind schema: it matters for anyone who uses the computed data, which will be open.
- Do not over-flatten. Prune only what is overengineered, and keep a sophisticated system that produces new insight. Treat it as a research opportunity, ideally doing things not yet done formally, even with public data.
- Use proper technical names, not "things".
- "We don't want to just cater to the past": bring the good art of modern science closer to people and organise knowledge so it is useful.
- Find the underlying mathematical motifs that carry across fields and apply as many as we can to communal data, so we see what outsiders, or our old ways of thinking alone, would struggle to see.
- Ritme stays. The reel's visual design is the risky part, so it waits.

## 3. What changed since 18 November

| Topic | 18 November | Now |
| --- | --- | --- |
| Names | Hal, Pernyataan, Rekaman | **Entity, Assertion, Witness**; computed clusters are **Constellations** |
| Kinds | Twelve, as Indonesian labels | Twelve **classes** under three **top classes** (continuant, occurrent, information entity), exported in the open data |
| Science | An outside crosswalk | **Measurements are witnesses**; science is one voice in the multiplex |
| Predicates | About 25 named by hand | About 12 seeded; extraction proposes more; frequent ones are promoted by a steward |
| Schemes | Separate "Kerangka" machinery | Scheme concepts are entities, linked by "broader" assertions (SKOS's own design) |
| Holder's account layer | *kesaksian* | **tuturan** (so it does not clash with Witness) |
| Analysis | Similarity and keyword domains | A **motif library** (section 6) and **five lenses on importance** (section 7) |
| Ritme | Unchanged | Unchanged; motif outputs feed its existing slots (section 11) |

Today's map stays as it is until the new one ships. It remains useful as the "records" view.

## 4. The model

### 4.1 Names and why

| Layer | English / Indonesian | Standard it aligns with | Why this word |
| --- | --- | --- | --- |
| What knowledge is about | **Entity / Entitas** | CIDOC CRM E1 CRM Entity; BFO entity; Wikidata item | The neutral top term in heritage and ontology standards |
| Top classes | **Continuant · Occurrent · Information entity** (*yang bertahan · yang berlangsung · yang dituturkan*) | BFO continuant/occurrent; CIDOC E77 Persistent Item, E2 Temporal Entity, E73 Information Object | The most widely shared first split in applied ontology |
| What is said | **Assertion / Pernyataan** | Nanopublication assertion; Wikidata statement | An assertion carries its own provenance |
| What it rests on | **Witness / Saksi** | Textual criticism (each manuscript attesting a text is a witness); PROV-O entity | Covers documents, recordings, tellers' accounts and measurements alike |
| Grouping | **Scheme / Kerangka** | SKOS concept scheme | Many schemes side by side, as lenses |
| Computed clusters | **Constellation / Rasi** | Network communities | Avoids "community", which means people here |
| Access and use | **Protocol / Protokol** | Local Contexts labels and notices | Separate from everything else, as decided on 18 November |

### 4.2 Twelve classes

Unchanged in substance from `knowledge-ontology-2026-11-18.md` section 4, now placed under the three top classes.

| Top class | Class | Examples | CIDOC CRM |
| --- | --- | --- | --- |
| Continuant | **Tempat** (place) | Danau Paniai, a river, a kampung, a sacred site (protocol applies) | E53 Place |
| | **Makhluk** (living kind or being) | sweet potato, sago palm, cassowary; a mountain spoken of as a being | E55 Type / E39 Actor |
| | **Kelompok** (people or group) | a people; a clan *as a group*, with consent | E74 Group |
| | **Lembaga** (institution) | church, school, sanggar, customary council | E74 Group |
| | **Orang** (person, narrow) | historical and public figures; tellers who opt in | E21 Person |
| | **Benda** (made thing, tool, technology) | noken, stone axe, honai, canoe, tifa | E22 / E55 |
| | **Bahasa dan Kata** (language, term) | a language (Glottolog); a word with meaning and sound | E56 / E33 |
| | **Gagasan** (idea, value, category, belief, as recorded) | an idea of reciprocity; a cosmological concept | E89 / E55 |
| Occurrent | **Praktik** (recurring practice, skill) | bakar batu, weaving noken, gardening, pig exchange | E7 / E29 |
| | **Peristiwa** (dated event or period) | an expedition, a flood, a festival in 2026 | E5 / E4 |
| | **Musim dan Siklus** (season, cycle) | a fruiting season, a ritual cycle | E4 (recurring) |
| Information entity | **Cerita dan Karya** (story, song, history, work) | an origin story, a song, a carving, a book | E73; LRM Work |

Two rules carried over: Makhluk has no nature/culture split (Descola), and Orang is never a registry of people.

Bulmer's classic New Guinea case shows why both matter. The Karam of the Schrader Mountains place the cassowary outside their taxon for birds; Bulmer argued the reason is its unique relationship to people in Karam thought (a kind of cousin of man), not its feathers. A model that forced Makhluk into "nature" would lose exactly what makes that classification meaningful.

### 4.3 Assertion

```json
{
  "id": "as:…",
  "subject": "en:bakar-batu",
  "predicate": "dilakukan-saat",
  "object": "en:pesta-pertukaran",
  "qualifiers": { "place": "en:paniai", "season": "en:…", "time": "sejak dahulu" },
  "voice": "akademik",
  "layer": "jejak",
  "witnesses": [{ "id": "wt:…", "excerpt": "…exact verified sentence…" }],
  "status": "seeded",
  "rank": "variant",
  "logical": "undisputed",
  "protocol": { "visibility": "public", "train": false }
}
```

- **voice**: who is speaking (the multiplex layer).
- **layer**: *jejak* (what a witness records), *tuturan* (a holder's account), *tafsir* (an interpretation, including every Aksara synthesis).
- **logical**: borrowed from recent work on contested claims in heritage graphs: undisputed, disputed, settled, superseded. Lets variants coexist without forcing one truth.
- **protocol.train**: whether this assertion may enter a training set. "Access is not training permission."

### 4.4 Witness

| Type | Examples | Notes |
| --- | --- | --- |
| Document | a book, an article, a mission report, a Wikipedia page, a government page | The only type in today's seed |
| Recording | a voice post, a video, a song recording | Personal data under UU PDP; consent and protocol first |
| Tuturan | a teller's account given on the platform | Always attributed to the teller or to a consenting group |
| Measurement | a GBIF occurrence, a rainfall series, a satellite index, an elevation model | How science enters the graph |
| Paper | a scholarly work (OpenAlex) | Also a document; listed separately for the science layer |
| Post | an accepted reply or thread on Strata, including voice notes and videos | Enters only after acceptance (section 10) |
| Derived | a transcript, a caption, a species suggestion, a satellite embedding for a place | Machine-made; labelled as such until a person confirms; keeps the model, version and licence |

Every witness keeps its bytes or its stable link and receipt, as the repository rules already require.

## 5. What the data already is, and what it tells us *(computed 19 November)*

### 5.1 How the seed was made

The owner asked whether the 500-odd sentences were pulled at random from Wikipedia or summarised. Neither. Reading `seed/wiki/*.json`, `scripts/verify-wiki-seed.py`, `src/desk.ts` and `scripts/observatory/build-map.mjs`:

- **Selected, verbatim quotes.** A seeding agent surveyed sources for three regions (16–18 November) and copied whole sentences from them, each tagged with a section label it chose (administration, geography, history, language, population, peoples, livelihood, culture, ecology and a few others). There are **657 quotes** in `seed/wiki/{meepago,saireri,la-pago}.json` (220, 210, 227).
- **Checked word for word.** `verify-wiki-seed.py` re-fetches each source (Wikipedia through its plain-text API, other pages as stripped HTML), folds case, quotes and dashes, and keeps a quote only if it is a contiguous span of the source. Last run: **586 confirmed, 5 rejected, 37 unreachable** (the sources could not be fetched, so their quotes were not checked).
- **Where they come from.** 602 of 657 quotes (92%) are from Wikipedia (364 Indonesian, 238 English); the rest come from six regency government sites. The 105-source catalogue (ethnographies, articles, archives, reports, theses, mission records, a grammar, a dictionary) is listed but **not yet quoted**: most of it is paywalled, scanned or offline.
- **The wiki pages are written prose, held to their quotes.** The 39 seed pages (20 regencies, 9 peoples, 8 beings, 6 languages, 4 regions) are Indonesian prose written by the seeding agent from those quotes, with numbered citations. `checkPage` in `src/desk.ts` enforces that every paragraph cites a source and every name and number in the prose appears in the quotes it rests on. It allows translation and paraphrase; it does not require identical wording. The wiki pages are therefore *tafsir* resting on *jejak*, in this note's terms.
- **The map's 551 sentence nodes** are the quotes that survived verification and deduplication.

### 5.2 How the map clusters today

It does not run a clustering algorithm.

- Each node's text (sentence, page, source or catalogue entry) is embedded with `multilingual-e5-small`, and **UMAP** places the nodes in 3D so that similar texts sit near each other. Groups you see are UMAP neighbourhoods, not computed communities.
- **Colours** are 14 domains assigned by keyword regular expressions (the top three or four by keyword hits). When no keyword matches, the nearest domain description by embedding is used. Cultural forms (the ten OPK) are assigned by a second keyword list.
- **Edges** are provenance only: sentence *from* source, page *part of* region, page *cites* source, page *rests on* sentence, catalogue entry *about* page.
- The labels are noisy. The keyword list for *kehidupan bersama* also matches "km", "kampung", "road" and "school", and the English Wikipedia page for Mee Pago fell back to *kesehatan* (health) by embedding. Treat any domain figure from the map as rough.

### 5.3 What it tells us

- **Who speaks.** Every verified sentence comes from two voices: encyclopaedia (91%) and the state (9%). **Tellers: none yet.**
- **What it is about.** The seeding agent's own section tags are a cleaner measure than the map's colours: administration 21%, geography 18%, history 13%, language 12%, population 9%, peoples 9%, livelihood 5%, culture 5%, ecology under 1%. Administration and population together are **31%**; culture and ecology together under **6%**. (The map's keyword labels put *kehidupan bersama* at 62%, but that list is too broad to quote.)
- **Part of this bias is ours.** The seeding agent chose regency pages and their administrative sections, because those are what the open web has and what it could verify. The finding is about the reachable open record *and* our first seeding pass, and should be stated that way.

So the open, verifiable record of these three regions is mostly an encyclopaedia's and the state's account of administrative units. That is the first result of the multiplex lens, the clearest argument for what the commons adds (section 7.3), and a reason to seed next from the catalogue's ethnographies and Papuan-authored works where licences allow.

## 6. The motif library

The owner's insight: research is increasingly done by finding **mathematical motifs that carry across fields**. A structure first understood in ecology, neuroscience or physics often reveals something new when it meets a different kind of data. Recent AI-for-science work makes the same bet: an agent that maps a problem's relational structure onto cross-domain analogies finds more novel solutions, and one 2026 system reuses proof patterns from probability theory in representation theory.

Below are the motifs worth running on a people's knowledge graph. Each is a known, published method; the novelty is in the combination and the data. Every motif is compared against a **null model** (the same graph randomly rewired), as the network-science literature does, so we report only what is unlikely by chance.

### 6.1 Structure

**M1. Typed graph and co-occurrence.** Entities linked by assertions, plus co-occurrence of entities in the same witness. From co-word analysis in science mapping (Callon and colleagues, 1980s).

**M2. Constellations.** Community detection (Leiden) groups entities that are densely connected. Hierarchical, so a region splits into constellations and constellations into smaller ones. GraphRAG uses the same step to write summaries per community; Aksara would draft a name and summary for each, marked *tafsir*, renamed by people.

**M3. Strategic roles.** Callon's diagram places each constellation by centrality (how tied it is to the rest) and density (how developed it is inside): core, foundational-but-thin, specialist, emerging or fading. The **foundational-but-thin** quadrant is a research agenda: what everything leans on but no one has recorded well.

### 6.2 Voices: the epistemic multiplex

**M4. Multiplex by voice.** Each voice is a layer over the same entities. Multilayer network science (Kivelä et al. 2014; Mucha et al. 2010) gives community detection that respects layers. Infomap's multilayer method lets the same entity sit in different constellations in different layers: sago may cluster with exchange and marriage in tellers' accounts, and with commodities and food security in government pages. **Aggregating the layers would erase exactly that difference.**

**M5. Comparing how voices structure the world.** Quantitative ethnography's Epistemic Network Analysis was built to compare co-occurrence networks between groups, with statistics. Applied here: how differently do colonial records, missions, the state, scholars, Papuan writers and tellers connect the same entities? Layer similarity and per-layer constellations give a numeric answer.

**M6. Where voices disagree, measured (sheaves).** Sheaf theory is a mathematics of gluing local views into a global one. Robinson's **consistency radius** measures how far a set of local reports is from a single consistent picture, and a filtration shows which sources disagree with which. Applied to assertions about one entity (when a season starts, where a river rises, who holds a practice), it measures disagreement and finds subsets of voices that agree among themselves: in effect, it finds the variants. Robinson's "multiple foxes" example is exactly this. *(Research spike; to verify on real assertions.)*

### 6.3 Higher-order structure

**M7. Practices and events as hyperedges.** A pig exchange joins a group, a place, a season, objects and a story at once. Network science now treats such group interactions as hyperedges, since they cannot be reduced to pairs (Battiston et al. 2020). **Higher-order motifs** (Lotito et al. 2022), small patterns of group interactions over-represented against a null model, act as a fingerprint of a system. Directed hypergraphs (2026) add direction: who gives and who receives in an exchange. *(Directed exchange data is sensitive; aggregate only, and only with consent.)*

### 6.4 Gaps and questions

**M8. Gaps as topology.** Sizemore, Bassett and colleagues proposed that knowledge gaps appear as cavities in a concept network and used persistent homology to track how they form and fill. Ju et al. (2022) found that Wikipedia's science networks grow mainly by creating and filling gaps, not by spreading outward from a core, and that nodes involved in opening or closing gaps tend to be the influential ones. **Applied to a people's knowledge, cavity births and deaths over time are a measurable picture of a commons learning.** As far as we found, this has not been done for community knowledge.

**M9. Link prediction becomes questions.** SemNet in quantum physics predicted which unconnected concepts would be studied together; Science4Cast benchmarked it on AI research; Gu and Krenn (2025) predicted the impact of not-yet-published concept pairs from a 21-million-paper graph, with AUC above 0.9 in most settings. Here, predicted links do not become claims. They become **questions**: cards for tellers and researchers ("Is there a link between this tree and that season?"), which is how the gap list fills. Simple network features did best in Science4Cast, so this runs on a laptop.

### 6.5 Hierarchy and alignment

**M10. Hyperbolic layout for schemes.** Hierarchies fit naturally in hyperbolic space: Poincaré embeddings capture hierarchy by distance from the centre and similarity by distance between points, in far fewer dimensions than flat space. A natural layout for the Pohon (tree) lens, with general categories at the centre and specifics at the rim. *(rencana)*

**M11. Aligning schemes without shared labels (optimal transport).** Gromov-Wasserstein optimal transport matches two structures by their internal shape, without needing shared names; it has been used to align knowledge graphs across five languages without supervision. Applied: align a Mee folk scheme with the scientific taxonomy, or one people's scheme with a neighbour's, and **measure how much structure the crosswalk preserves**. Where it breaks (a cassowary case) is itself the finding.

### 6.6 Living systems

**M12. Ecological network metrics on knowledge.** Ethnobiology already treats knowledge as an ecological network. A PNAS study across 57 Neotropical communities modelled Indigenous knowledge as plant–service networks and found they **collapse as fast when cultural transmission is lost as when plant species are lost**, and much faster when both go together. A 2024 study in Uruguay found a core–periphery structure in medicinal plant knowledge, where core plants survive the removal of knowledge holders. Applied: nestedness, modularity, core–periphery and **robustness simulations** ("what if this practice stops being taught, or this species is lost?") on our graph.

**M13. Phylogenetic signal.** Saslis-Lagoudakis et al. (2012) found that traditionally used medicinal plants cluster on the evolutionary tree across three distant floras, and that this can focus the search for bioactive species. Applied with great care: do Papuan plant uses cluster on the tree of life? Benefit-sharing (Nagoya Protocol, UU 11/2013) and protocol flags decide what is even computed. *(rencana; consent first)*

**M14. Cultural phylogenetics across deployments.** D-PLACE links cultural data for over 1,400 societies to language trees and environment, so cross-cultural comparison can control for shared ancestry (Galton's problem). When several Strata deployments exist, comparing practices across peoples should control for language family in the same way. New Guinea's many language families make this important. *(later; needs more than one deployment)*

### 6.7 Measures on single entities

**M15. Diversity of voices.** Hill numbers from ecology measure how evenly an entity's assertions spread across voices. Single-voice entities are flagged.

**M16. Salience and consensus.** Smith's salience from free-list research; comparative salience across groups (Thompson and Zhang 2006); cultural consensus theory, which estimates when agreement among people indicates a shared answer, and mixture models that detect several distinct answer sets. Aggregated only; never used to place an individual.

### 6.8 Time

**M17. Two clocks and reconfiguration.** Every assertion has a time it is *about* and a time it was *recorded*. Thematic evolution (Cobo et al.) and multilayer community detection over time slices (the method Ju et al. used to see paradigm shifts as module reconfigurations) let us see how outsiders' framing of a region changed: colonial survey, mission, development, conflict reporting. Change-point detection marks the eras.

### 6.9 The second eye

**M18. Concordance with science (Two-Eyed Seeing, Multiple Evidence Base).** Two-Eyed Seeing, introduced by Mi'kmaw Elders, means seeing with the strengths of Indigenous knowledge in one eye and mainstream science in the other, and using both together. The Multiple Evidence Base (Tengö et al. 2014) adds that each system is evaluated within itself and then set side by side for triangulation. Concretely:

- **Seasons and satellites.** An assertion "this tree fruits in season X" set beside rainfall and vegetation records; an Australian study placed Indigenous seasonal calendars beside drought and climate indices for the same windows. Drifting markers become a local, people-told climate signal.
- **Folk and scientific taxonomy at scale.** Berlin's work counted one-to-one, under- and over-differentiated correspondences by hand; in Tzeltal plant generics, 61% were one-to-one. Diamond found near-perfect correspondence at lower levels for the Fore of New Guinea; Bulmer's Karam matched zoological species for about 60% of taxa. We would compute this automatically for every linked living kind, in every deployment.
- **Terrain.** Upstream/downstream and uphill/downhill assertions checked against an elevation model; altitude zones as a lens.

Science here does not grade people's knowledge. Disagreement is reported as disagreement, with both witnesses.

### 6.10 Analogy across communities

**M19. Structural analogy.** When several deployments exist, structure-mapping can propose that a practice in one community has the same relational shape as one elsewhere (a seasonal exchange cycle, a custody pattern). Aksara would offer these as questions to both communities, never as claims. *(later)*

### 6.11 Across modalities

**M20. Representational similarity across modalities.** From neuroscience: representational similarity analysis (Kriegeskorte et al. 2008) compares two systems by comparing their *similarity matrices*, not their raw features. Applied here: build one matrix from how a community connects its places (shared assertions, stories, practices) and another from how alike those places look from space (satellite embeddings, section 9). Where the two agree, people's knowledge tracks the land; where they diverge, something cultural (a sacred site, a customary boundary, a history) organises the place. **A people's map of meaning, compared with the land's own map.**

**M21. Change on place embeddings becomes questions.** Satellite embeddings are consistent across years, so the angle between a place's vectors in two years flags change (a road, a mine, a garden gone back to forest). Change becomes a candidate *Peristiwa* and a question to people of that place ("Apa yang berubah di sini sejak 2019?"), never a claim.

**M22. Landscape words and the land (ethnophysiography).** Ethnophysiography studies how languages carve up the landscape; landscape terms often have no one-to-one equivalent across languages. With consented points (a garden type, a forest type, a wetland named in Mee), we can test whether a people's landscape categories separate in embedding space, as participatory mapping in Angola and the Tiwi Islands did by hand. This is Berlin's folk-science correspondence (M18), applied to land instead of species.

**M23. Bird and frog calls, named by people.** Bioacoustic embeddings (Perch 2.0) make it possible to build a classifier for a sound from a single example and a local expert's corrections ("agile modelling"). Applied: an elder names a call in a forest recording; the model finds similar calls; people confirm. Folk names and scientific species meet through sound, with the folk name first. Only with the recorder's consent, and never on human speech.

### 6.12 Summary table

| Motif | Question it answers | Needs | Effort *(not measured)* | When |
| --- | --- | --- | --- | --- |
| M1–M3 constellations, roles | What is the world organised around? | assertions | small | first |
| M4–M5 multiplex, ENA | How does each voice structure it? | voice tags | small | first |
| M6 sheaves | Where, exactly, do voices disagree? | numeric or categorical assertion values | research spike | second |
| M7 hyperedges, motifs | What are the building blocks of practice? | practice and event hubs | medium | second |
| M8 topology | Where are the gaps; is the commons learning? | dated assertions | small (Python at build time) | first |
| M9 link → question | What should we ask next? | the graph | small | first |
| M10 hyperbolic | How do schemes nest? | scheme entities | small | second |
| M11 optimal transport | How well do two schemes line up? | two schemes | medium | second |
| M12 ecological metrics | What is robust and what is fragile? | entity–use and holder links | medium | second |
| M13 phylogenetic signal | Do plant uses follow deep biology? | GBIF / tree of life links, consent | medium | later |
| M14 cultural phylogenetics | Is a pattern shared ancestry or adaptation? | several deployments | large | later |
| M15–M16 diversity, salience, consensus | Who knows it; is it shared? | voices; card answers | small | first |
| M17 time | How has the framing changed? | witness dates | small | first |
| M18 second eye | Where do science and the people agree, differ or stay silent? | measurement witnesses | medium | second |
| M19 analogy | What looks alike across peoples? | several deployments | large | later |
| M20 cross-modal similarity | Does knowledge of places follow the land? | place assertions; satellite embeddings | medium | second |
| M21 change → questions | What changed here, and what do people say about it? | satellite embeddings, two years | small | first (one region) |
| M22 ethnophysiography | Do landscape words follow the land? | consented points with local terms | medium | second |
| M23 sounds named by people | Which calls does a people name, and how do they map to species? | consented recordings; Perch | medium | second |

## 7. Five lenses on importance

"What is core to a people" has no single number. We show a **profile** of five lenses for every entity and constellation, never a combined rank.

| Lens | Measures | Built from | Generalises because |
| --- | --- | --- | --- |
| **Structure** | Centrality and strategic role (core, foundational-but-thin, …) | M1–M3, M8 | Uses only the graph |
| **Identity (keystone)** | Variety of uses, influence on language (names across languages), role in practices and stories, persistence over time, irreplaceability, reach beyond its territory | Garibaldi and Turner's cultural keystone criteria, generalised from species to any entity | The criteria are content-free |
| **Voice** | Salience per voice, and the gap between outsiders' salience and tellers' | M4–M5, M15–M16 | Any deployment has voices |
| **Demand** | How often people ask about it (mentions of Aksara, searches, card answers) against how much is recorded | Usage logs, aggregated | Any deployment has users |
| **Vitality** | Is it still told and done? Living tuturan, recency, a taught-by chain, current use, sensitivity to loss in robustness simulations | M12, M16, M17; indicators below | Any knowledge can be alive or fading |

### 7.1 Vitality, grounded in Indonesian regulation

Indonesia already has indicators for living local wisdom. The environment ministry's regulation on recognising local wisdom (Permen LHK P.34/2017, implementing UU 32/2009) lists, among its indicators: practices and skills are still maintained, the community's **collective memory** of them is maintained, and they are **passed between generations**. It also separates local wisdom open to the public from that which is **secret or sacred**. Our vitality lens can follow those indicators one for one, and the secret/sacred split is already our protocol layer.

Global evidence makes vitality urgent: a review of 92 studies found that 77% reported loss of local ecological knowledge, driven by globalisation, modernisation and market integration (Aswani et al. 2018), and a 2026 synthesis of 473 cases found that communities' own resistance (keeping practices, values and management systems) is what sustains it (Fang et al. 2026, *One Earth*).

### 7.2 What "core" means here

An entity is shown as core when several lenses agree: structurally central, keystone by several criteria, salient in tellers' voice, asked about, and alive. The interesting cases are disagreements: central in outsiders' records but absent in tellers' (an outsider's preoccupation), or alive and asked about but barely recorded (the commons' first job).

### 7.3 The first result, restated

Section 5 is the voice lens on today's seed: two voices only, mostly about administration. The commons exists to add the missing layers.

## 8. Pipeline *(proposal)*

1. **Extract.** For each verified sentence, the model proposes entities (with class) and assertions (with predicate), quoting the sentence. Same tasks as the LLMs4OL benchmark.
2. **Resolve.** Match proposals to existing entities (catalogue contexts, places, languages, beings), using embeddings for candidates and optimal transport for structure; link to Wikidata, Glottolog, GBIF and OpenAlex where they exist.
3. **Review.** A steward in Studio accepts, merges, splits or rejects. Nothing becomes an entity without a person.
4. **Build.** A build step computes constellations and the motif outputs, each against its null model, and writes JSON for the web app. The runtime stays TypeScript on Workers; heavy analysis (persistent homology, Infomap) runs in a small Python step at build time, as the map's UMAP and embeddings already run offline.
5. **Publish.** Entity pages, map lenses, an observatory report page, and inputs for Ritme.
6. **Export.** The open dataset (section 12).

## 9. The measurement layer: public data and foundation models *(proposal)*

The owner asked what more we can do with public data, including specialised embedding models already hosted with free use. The idea: every entity can carry, beside its assertions, **embeddings and measurements from other modalities**, each kept as a witness with its source and licence. Most of what follows is free for non-commercial use; some of it is fully open.

### 9.1 What is available

| Modality | Resource | What it gives | Access and licence (as read 19 Nov) | Use in Strata |
| --- | --- | --- | --- | --- |
| Land | **AlphaEarth Foundations** Satellite Embedding (Google DeepMind) | A 64-number vector for every 10 m pixel per year (2017–2025), summarising optical, radar and other sensors; consistent across years | Earth Engine (free for non-commercial and research use with a registered project); CC BY 4.0; also as COGs in a GCS bucket that is "provider pays" since July 2026 | Place fingerprints, change detection (M21), M20, habitat models for Makhluk |
| Land | **TESSERA** (University of Cambridge) | 128-number vectors per 10 m pixel per year, 2017–2025, from Sentinel-1 and -2 | Embeddings CC0, encoder MIT; streamed over HTTPS (Zarr) with no request; fine-tunes on a CPU | **The sovereign choice**: fully open, can be cached by us or by a partner in Papua |
| Land | Clay, Major TOM, Copernicus-Embed and others | Coarser patch embeddings | Various open licences | Not needed for the first wave |
| Weather and climate | **Open-Meteo** | ERA5 reanalysis from 1940, forecasts from 30+ models, and Google's WeatherNext 2 ensemble since July 2026 | Free for non-commercial use up to 10,000 calls a day, no key; data CC BY 4.0 | Seasons beside climate (M18), *Siaga* weather by place, a Ritme weather card |
| Terrain | Copernicus DEM (30 m) | Elevation | Free | Upstream/downstream checks, altitude zones |
| Species | **GBIF** API | Occurrences, names, vernacular names | Free, no key for reads | Measurement witnesses for Makhluk; crosswalk of folk names |
| Species | **Pl@ntNet** API | Plant identification from photos (87,000+ species) | Free up to 500 identifications a day, commercial use allowed; more for non-profits | Suggest a species for a posted plant photo; the poster's own name stays first |
| Species | **iNaturalist** datasets | Research-grade observations, taxonomy, range maps | Open datasets; API rate-limited | Background for living kinds |
| Sound | **Perch 2.0** (Google DeepMind) | Embeddings and labels for about 15,000 classes (around 10,000 birds, plus frogs, insects, mammals) | Apache 2.0; a CPU variant and ONNX/TFLite conversions exist | M23; species presence from consented forest recordings |
| Speech | **Omnilingual ASR** (Meta) | Speech recognition for 1,600+ languages, including 77 New Guinea languages in its evaluation (average character error rate 5.5); extendable to a new language with a few paired examples | Apache 2.0 models (300M to 7B), CC BY corpus | Transcripts of voice notes in Papuan languages; whether Ekari is covered is *(to verify)* |
| Speech | Workers AI Whisper (large-v3-turbo) | Indonesian and Papuan Malay transcripts | About 47 neurons per audio minute on the free tier | Transcripts on the platform itself |
| Language | **Glottolog, Concepticon, Lexibank, Grambank** (CLDF) | Language identities; 3,000+ standard concepts linking word lists; 2,456 languages of word lists; grammar features for 2,467 varieties | CC BY | Link *Kata* entities to standard concepts, so "sweet potato" in Mee and in Moni meet; never replace the community's own dictionary |
| Culture | **D-PLACE** | Cultural, linguistic and environmental data for 1,400+ societies | Open | Cross-deployment comparison (M14) |
| Scholarship | **OpenAlex**, Wikidata | Papers, concepts; general entities | Open | Science witnesses; attention of scholarship vs demand of people |

### 9.2 What the combination makes possible

- **Every place has a landscape fingerprint per year.** Places in the wiki can show how their land changed (with the caveat that an embedding is not a land-cover map), and Aksara can ask the people of that place what happened. This is the "Lanskap berubah" Ritme card (Ritme note §8).
- **Seasons meet climate.** Each *Musim* entity can show rainfall and temperature by month from ERA5 beside what people say marks the season (M18).
- **Living kinds meet occurrence data and sound.** A Makhluk page can show GBIF records, an iNaturalist range, a Pl@ntNet match for a posted photo, and calls identified in consented recordings, always under the people's own name for it.
- **Words meet concepts.** Concepticon links let language rooms compare their words across Papuan languages without anyone giving up control of their dictionary.
- **People's observations can flow back to science, on their terms.** With consent, observations can be published to GBIF (Darwin Core), with sensitive locations generalised, as GBIF already does for sensitive species. Two eyes, both ways.

### 9.3 What we will not do: genomics

The owner asked about genomics. **Our recommendation is no, for now, and never for human data.**

- AlphaGenome (and AlphaGenome 2, November 2026) is a human DNA model, free for non-commercial use, with terms that bar using its outputs to train other models.
- Human genetic data is among the most sensitive data a people has. UU 27/2022 classes genetic data as specific personal data, and Indigenous peoples have a long record of genetic research done without proper consent. Strata will never collect, hold or analyse human genetic data.
- For plants and animals, the only step that makes sense is **linking** a Makhluk entity to existing public taxonomic and genome records as a witness. Anything beyond that touches genetic resources and the knowledge associated with them, which needs prior informed consent and agreed terms under the Nagoya Protocol (UU 11/2013) and PP 56/2022.

### 9.4 Practical notes

- **Where it runs.** Satellite and sound embeddings are computed or fetched at build time (Python, as the map's embeddings already are), never on the Worker. Results are stored as small JSON per entity.
- **Coordinates.** We fetch embeddings only for places that are already public entities, at a resolution the community is comfortable with. Sacred sites and private gardens never go to an outside API.
- **Licences travel.** Every derived number keeps its source and licence in its witness (CC BY 4.0 for AlphaEarth with its required attribution; CC0 for TESSERA; CC BY 4.0 for Open-Meteo).
- **Free tiers have limits.** Earth Engine's free use is for non-commercial work; TESSERA is the fallback with no such condition.

## 10. Multimodal witnesses: voice, video, photos *(proposal)*

The owner wants people to post **voice notes and short videos**, as on Threads, with voice notes as a first-class post component. In this model, every such post is a **witness**, and when it is accepted as knowledge it becomes *tuturan* in the people's own voice: the layer the seed lacks entirely (section 5).

### 10.1 What each medium adds

| Medium | What it carries that text cannot | Derived witnesses (always labelled as machine-made until a person confirms) |
| --- | --- | --- |
| Voice note | The language itself; the teller's voice; songs and calls; people who prefer speaking to typing | Transcript (Whisper for Indonesian and Papuan Malay; Omnilingual ASR for Papuan languages where it works; "bantu tulis" by the community otherwise); species in background sound (Perch, opt-in) |
| Video | Practice: how a noken is woven, how bakar batu is laid, a dance | Captions (WebVTT from the transcript); a poster frame |
| Photo | Objects, plants, places | Species suggestion (Pl@ntNet), never a face match |

### 10.2 Rules

- **Consent and protocol first.** Each post carries its protocol (public, community only, *Jangan disebarkan*) and a training-permission flag, like any assertion.
- **No biometrics.** No voiceprints, speaker identification or face recognition, ever. Biometric data is specific personal data under UU 27/2022.
- **Metadata stripped.** Location and device metadata are removed by re-encoding on the phone, as images already are.
- **Agents do not post voice or video.** Aksara never speaks with a synthetic voice and never publishes video; its cards may embed a person's clip with that person's permission.
- **Children.** PP 17/2025 duties apply (minimum age, reporting, age assurance) before video opens to everyone.

### 10.3 The technical path

**Voice notes (first):**
- Recorded in the browser with MediaRecorder: Opus in WebM on Android Chrome, AAC in MP4 on iPhone. At about 24 kbps a two-minute note is about 360 KB, inside today's 512 KB media cap (`src/media.ts`).
- Validated strictly, as WebP images are today: container check, metadata stripped, duration and size caps. A 64-bar waveform is computed on the phone and stored with the post.
- Stored in the bounded media store for previews and in R2 for originals. R2's free tier (10 GB a month) holds roughly 28,000 two-minute notes.
- Transcribed in the background with Workers AI Whisper (about 47 neurons a minute; roughly 200 minutes a day fit in the free allocation, shared with Aksara's model). Papuan-language transcripts come from Omnilingual ASR, run off the Worker in a small batch job, or from the community.

**Video (second):**
- Two options. **Cloudflare Stream**: $5 a month per 1,000 minutes stored and $1 per 1,000 minutes watched; encoding and ingest are free. **R2 with compression on the phone** (WebCodecs, about 480p): a one-minute video is about 9 MB, so the free tier holds about a thousand; Media Transformations makes poster frames and audio-only versions (5,000 free a month).
- A 60-second cap at first; captions from the transcript; an audio-only fallback for low bandwidth.

**On AT Protocol:**
- Bluesky's video embed allows up to 10 minutes and 300 MB per video with up to 20 WebVTT caption files, handled by a separate video service before the blob reaches the PDS. A Strata video post can use the same shape, so it plays in other Atmosphere apps.
- There is no standard audio post in Bluesky's schemas. Strata defines its own voice-post record (audio blob, waveform, transcript, language, protocol). For reach, a voice note can also be published as a short video with a waveform frame, so it plays in Bluesky. *(proposal)*
- **Contribute it back** *(flagged by the owner, 19 November; after the proposal, not before)*: once our voice-post record has run in production, publish it as a community lexicon and propose it to the Atmosphere (the community lexicon index at lexicon.garden, and the AT Protocol developer community), so any app can post and play voice notes. Same later for the place, language and assertion records if they prove useful to others.

**Estimated effort** *(agent's working time, not measured)*: voice notes with transcripts, about 1.5–2 days including tests for access and withdrawal; video with Stream or R2, about 2 days more.

## 11. Where it shows up, without the reel

The reel's visual design waits. The motif outputs flow into surfaces that already exist or are already planned:

- **Entity pages**: a "why this matters" profile (the five lenses), voices side by side, variants with their logical status, a *Mata kedua* (second eye) panel where measurements exist, and open questions from M9.
- **Map lenses**: Constellations (Jaringan), Places (Peta), Gaps (Celah: thin and single-voice entities glow), Voices (one layer at a time).
- **Observatory report**: per region, the strategic diagram, the voice comparison, the vitality list and the gap timeline. This is the "cultural observatory" of KKI 2023, idea 10.
- **Ritme** (unchanged slots; the reel is a selector on Beranda, Ritme note §8): *Soal hari ini* draws from M9 questions; *Temuan* fires when a gap closes or a constellation changes; *Hari ini di wiki* reports new assertions and which voice they added; the monthly *Denyut* carries the vitality and voice charts.

## 12. Open data and a sovereign model

- **Open by default, protocol first.** Computed data (entities, assertions with voice and witness, constellation memberships, motif outputs) is published under an open licence, except what a protocol restricts. Withdrawal removes dependent assertions and recomputes.
- **Formats.** JSON-LD (CIDOC CRM / Linked Art and Wikidata-style statements), SKOS for schemes, and plain tables (CSV or Parquet) for researchers; one documented package per release.
- **Training permission is separate.** Only assertions whose protocol says *boleh dipakai melatih* enter a fine-tuning or evaluation set. This follows the Kaitiakitanga Licence's logic (guardianship rather than ownership, and benefit returns to the source) and the CARE principles.
- **Evaluation sets come free.** Negative competency questions (from the Ritme note), held-out assertions and the folk–science correspondences double as tests for any model trained later.

## 13. Honesty and guardrails

- **The record is biased; we say so.** Every importance lens is shown per voice. Section 5 is the first example.
- **Small data.** The seed has 551 verified sentences. Early constellations are drafts; every chart says so.
- **Null models.** Every motif is reported against a randomised baseline, or not reported.
- **No inference about people.** No clan, marga, kinship or personal attribute is ever inferred; group-level only, consent first. Directed exchange data stays aggregated.
- **Biological knowledge.** Uses of plants and animals linked to genetic resources follow the Nagoya Protocol (UU 11/2013) and PP 56/2022 on communal intellectual property; nothing is computed or exported without the community's terms.
- **Science is not the referee.** Disagreements are shown as such.
- **Aksara writes *tafsir* only.** Constellation names, summaries and analogies are interpretations, renamed and corrected by people.

## 14. Research outputs *(proposal)*

1. **Resource paper.** The model, the pipeline, the open dataset for three Papuan regions, and the motif library with null models. Fits a semantic-web resources track or a digital humanities journal.
2. **"Whose Papua?"** The epistemic multiplex of the open record: how colonial, mission, state, scholarly, Papuan and tellers' voices structure the same world, with gap dynamics as tellers join. Quantitative ethnography or science-of-science venues.
3. **Folk and scientific living kinds at scale.** Automated correspondence (Berlin, Hunn) for Papuan living kinds. Ethnobiology journals.
4. **Vitality from provenance.** A knowledge-vitality index built from witnesses, tested against the Permen LHK indicators. Ecology and Society or similar.

Co-authorship with Papuan scholars and tellers, by their choice, is the default.

## 15. Build plan *(estimates of the agent's working time; not measured)*

| Step | Time |
| --- | --- |
| Tables for entities, assertions and witnesses; migrate catalogue contexts and page kinds | half a day |
| Extraction over the seed with quote checks; review queue in Studio | 1–1.5 days |
| Build step: constellations, roles, voice layers, salience, diversity, topology, link-to-question | 1–1.5 days |
| Linking to Wikidata, Glottolog, GBIF, OpenAlex | 1 day |
| Map lenses (Constellations, Places, Gaps, Voices) and entity-page profile | 1.5 days |
| Observatory report page per region | 1 day |
| Second-eye spike: one seasonal assertion set beside one climate series | 1–2 days *(data access to verify)* |
| Sheaf, hypergraph, optimal-transport and ecological-metric spikes | 2–3 days |
| Voice notes: record, validate, store, transcribe, protocol and withdrawal tests | 1.5–2 days |
| Video posts (Stream or R2) with captions | about 2 days |
| Measurement layer, first slice: Open-Meteo by season, TESSERA or AlphaEarth change for one region's places, GBIF for living kinds | 1.5–2 days |
| Cross-modal spikes (M20, M22, M23) | 2–3 days |

About 6–7 days for the first wave, 3–5 for the second, and 7–9 more for multimodal posts and the measurement layer. **Voice notes are the one multimodal piece that can realistically be *berjalan* by 25 November.** **For the proposal, only what runs by 26 November counts as *berjalan*; the rest is *rencana*.** Realistically, the first wave on one region is the showcase target, and section 5 is the one result we can already state honestly.

## 16. Open questions for the owner

1. Licence for computed data: CC BY 4.0, or a Kaitiakitanga-style licence with benefit-return terms?
2. Which region goes first for the full first wave? *(Recommended: Mee Pago, where the owner can reach tellers.)*
3. May voice layers be shown publicly from day one, given that they expose how thin the tellers' layer is? *(Recommended: yes; it is the argument.)*
4. Which partner holds measurement data we could use first (a university, BMKG, a conservation group)?
5. TESSERA (CC0, fully open) or AlphaEarth (Earth Engine, non-commercial) as the default land embedding? *(Recommended: TESSERA by default, AlphaEarth as a second witness where its terms allow.)*
6. Video in the showcase, or voice notes only? *(Recommended: voice notes for the proposal; video as a showcase stretch if voice ships.)*

## 17. Flagships: what to build with all this *(proposal, 19 November)*

> **Superseded as northstar, same day:** the owner asked for one cleaner, more ambitious purpose. That is **[bahasa-tumbuh-2026-11-19.md](bahasa-tumbuh-2026-11-19.md)**: a dictionary and grammar that grow from how people talk, seeded from the published record. *Kata Bersama* (§17.3) is now its seed layer. *Lensa Kita* and *Siapa yang menulis Papua?* remain as supporting flagships for the showcase and the observatory.

The owner asked for something more ambitious than more charts: a flagship that uses these open models and motifs, in service of preservation, of knowledge organisation, and of paths for science that start from Indigenous knowledge.

### 17.1 The idea that ties it together

**Small sovereign heads on big open bodies.** Open foundation models (TESSERA and AlphaEarth for land, Perch for sound, Omnilingual for speech, multilingual text encoders) have already done the expensive part: they turn the world into embeddings. What they lack is a people's categories. A community can supply those categories with a few dozen examples, and a tiny classifier (a linear probe, a few kilobytes) turns the open embeddings into **a lens in the community's own terms**. Evidence that this works with few labels:
- On TESSERA, a single logistic regression trained in seconds on a laptop reaches about 84% weighted accuracy on land cover in a public demo.
- TESSERA's paper reports about 0.5 F1 with only four labelled samples per class on crop types.
- AlphaEarth was evaluated with one, ten and a few hundred samples per class.

Three consequences matter:

1. **It reverses the usual direction of extraction.** Instead of large companies training on Indigenous data, a community trains a tiny model on openly released embeddings. Its labels never have to leave the commons. The probe is small enough to inspect, keep in the community's own repository, share under a protocol, or delete. This is the owner's "sovereign model for internal use", sized to a people and available now.
2. **What the lens cannot learn is information too.** Where a community's category is predictable from open embeddings, the open world can reconstruct it. Where it is not (a category defined by history, custody, a story or a relationship), the category is **cultural residual**: knowledge no satellite or sound model can recover. Residual is a measurable signature of irreplaceable knowledge.
3. **Residual times vitality is a preservation priority.** Knowledge that is both unrecoverable by machines and fading among people (vitality lens, section 7) is what to record first, with whom, now.

### 17.2 Flagship A: **Lensa Kita** (our lens), land first

*What a judge sees:* in a private Mee room, members have dropped pins on a map for five or six of their own landscape categories, named in Mee with a voice note (for example kinds of garden, forest and wetland). A few minutes later the room sees:
- Paniai in those categories, as a map in the people's own legend.
- A card saying which categories the satellite can see and which it cannot (the residual).
- How each category changed since 2017.
- Where the people's categories split or merge the official land-cover classes: Berlin's folk–science correspondence (M18), applied to land.

*How it works:*
1. A pin layer in a private community. Pins are stored like posts, under the room's protocol.
2. At build time, a script reads TESSERA embeddings (CC0, streamed over HTTPS) for the pins and for the region at a coarse grid.
3. It trains a logistic regression with spatial cross-validation, and writes a small probe file, a coarse prediction raster, per-class scores and a confusion table.
4. The room renders this as a map overlay and a card from the composed-view catalogue.

The run happens on the owner's machine or in a CI job, because the agent workspace cannot reach the data host. Nothing leaves the room unless its stewards publish it.

*Rules:*
- Private by default.
- No sacred categories, no named sites.
- Coarse resolution.
- No boundary claims by Aksara.
- The community decides what any map is for.

Such maps may one day support a customary-forest recognition file (MK 35/PUU-X/2012; Permen LHK P.17/2020 asks for evidence that a forest is managed and used by the community). If so, the community uses them, on its own terms.

*Research question:* **how much of a people's landscape vocabulary is visible from space, and what is left over?** (M22, M20).

*Effort (agent time, not measured):*
- Pins and room overlay: about 1 day.
- Pipeline and probe: about 1 day.
- Cards: half a day.
- People's time: one evening for 3–5 Mee speakers to drop and name pins.

*Then sound:* the same pattern with Perch 2.0 on consented forest recordings, so bird and frog calls are named by people (M23).

### 17.3 Flagship B: **Kata Bersama** (shared words)

*The problem, in one line:* TransNewGuinea.org, the largest open database of New Guinea wordlists (588 languages, 1,027 meanings, 124,464 words; CC BY 4.0 as a Lexibank CLDF dataset), holds **41 words of Ekari, all from a single 1975 source**. The open record of the Mee language is a list a child could say in a minute.

*What a judge sees:*
- Every language page in ETNOS shows its published words with their source, as witnesses.
- Each concept has a map ("pig", "sweet potato", "sago", "tree") showing the word across the languages of New Guinea.
- Speakers tap *Masih dipakai?*, *Bukan begitu di kampung kami* or *Rekam suaramu*, and every answer is a voice witness and a vitality data point.
- A colexification view (CLICS, a CLDF network of which concepts share one word across 3,000+ languages) shows how Papuan languages group meanings, and where a living community's usage differs from the 1975 record.

*Two-way:* with the speakers' consent, corrections and new words are offered back to TransNewGuinea.org and Lexibank as attributed contributions. The commons gives to open science instead of only taking from it.

*Research question:* **how do Papuan languages carve meaning, and how far does today's usage differ from the published record?** It feeds the vitality lens.

*Effort:*
- Import the CLDF dataset and map its languages to the catalogue's Glottocodes: about half a day.
- Concept map and language-page block: about 1 day.
- Confirm, correct and record actions, using voice notes: half a day once voice notes exist.

The data is on GitHub and Zenodo, so the import can run here.

### 17.4 Flagship C: **Siapa yang menulis Papua?** (who wrote Papua?)

The observatory flagship. Entities and assertions are extracted from the seed and laid out as a multiplex by voice, with gaps (M8) and predicted links turned into question cards (M9).

*The headline chart:*
- the voices behind the open record (92% encyclopaedia today);
- the topics the record covers (administration and population 31%, culture and ecology under 6%);
- how both move as tellers join.

OpenAlex adds a third series: what scholarship has studied, set against what people ask Aksara (the demand lens).

*Effort:* about 2–3 days. It is the per-regency state-of-knowledge report from the framing doc, made rigorous.

### 17.5 How they fit

| | Lensa Kita | Kata Bersama | Siapa yang menulis Papua? |
| --- | --- | --- | --- |
| Preservation | Residual × vitality says what to record first | Words confirmed, corrected and voiced | Gaps become questions |
| Knowledge organisation | A people's scheme becomes a working lens | Words linked to standard concepts without losing the community's own | Entities, assertions, voices |
| Science | Land categories meet satellite embeddings; folk–science correspondence | Contributions back to open linguistic data | A provenance-aware dataset for research |
| Sovereignty | Probe owned by the room, labels never leave | Consent before anything is offered back | Voice layers show whose record it is |
| Judge criteria | Akar budaya, teknis | Akar budaya, proposal | Proposal, teknis |
| Ready by | Showcase (18–19 Dec) | Proposal (26–27 Nov) if started now | Proposal or showcase |

**Recommended order:**
1. Voice notes first; the other two use them.
2. **Kata Bersama**, which is quick, real and proposal-ready.
3. **Siapa yang menulis Papua?**, the observatory headline.
4. **Lensa Kita** as the showcase centrepiece, once a Mee room has dropped its pins.

### 17.6 Research questions, consolidated

1. Whose Papua? How do colonial, mission, state, scholarly, Papuan and tellers' voices structure the same world? (multiplex)
2. How much of a people's landscape vocabulary is visible from space, and what is the cultural residual? (Lensa Kita)
3. Which knowledge is irreplaceable and fading, and so should be recorded first? (residual × vitality)
4. How do Papuan languages carve meaning, and how far has usage moved from the published record? (Kata Bersama, CLICS)
5. Does a commons learn? Do its knowledge gaps open and close the way science's do? (topology)
6. Where do folk and scientific classifications of living kinds and landscapes agree? (M18, M22)

## 18. Sources

Read 18–19 November 2026.

**Networks, topology and motifs**
- Battiston et al. (2020), "Networks beyond pairwise interactions", *Physics Reports* 874: <https://arxiv.org/abs/2006.01764>
- Lotito et al. (2022), "Higher-order motif analysis in hypergraphs", *Communications Physics*: <https://www.nature.com/articles/s42005-022-00858-7>; directed hypergraphs (2026): <https://www.nature.com/articles/s42005-025-02472-9>
- Kivelä et al. (2014), "Multilayer networks", *J. Complex Networks*: <https://arxiv.org/abs/1309.7233>
- Mucha et al. (2010), *Science* 328: <https://www.science.org/doi/10.1126/science.1184819>
- Infomap multilayer documentation: <https://mapequation.org/infomap-python-docs/flow-models/multilayer.html>
- Sizemore et al. (2018), "Knowledge gaps in the early growth of semantic feature networks", *Nature Human Behaviour*: <https://arxiv.org/abs/1709.00133>
- Ju et al. (2022), "Historical growth of concept networks in Wikipedia", *Collective Intelligence*: <https://journals.sagepub.com/doi/full/10.1177/26339137221109839>
- Robinson, sheaves and consistency radius: <https://arxiv.org/html/1603.01446v3>, <https://doi.org/10.1090/noti1867>; Joslyn et al. (2020), *Sensors*: <https://doi.org/10.3390/s20123418>
- Nickel and Kiela (2017), Poincaré embeddings: <https://arxiv.org/abs/1705.08039>
- Tang et al. (2023), Fused Gromov-Wasserstein entity alignment: <https://aclanthology.org/2023.findings-acl.205.pdf>; OTMapOnto: <https://ceur-ws.org/Vol-3063/oaei21_paper12.pdf>
- Microsoft GraphRAG community detection: <https://www.mintlify.com/microsoft/graphrag/concepts/community-detection>
- Co-word analysis and strategic diagrams: <https://arxiv.org/pdf/2307.13179>, <https://arxiv.org/html/2603.06436v1>

**Prediction and AI for science**
- Krenn and Zeilinger (2020), SemNet, *PNAS*: <https://pmc.ncbi.nlm.nih.gov/articles/PMC6994972>
- Krenn et al. (2023), Science4Cast, *Nature Machine Intelligence*: <https://www.nature.com/articles/s42256-023-00735-0>
- Gu and Krenn (2025), impact forecasting on evolving knowledge graphs: <https://iopscience.iop.org/article/10.1088/2632-2153/add6ef>
- Analogical reasoning for LLM creativity in science (2026): <https://arxiv.org/html/2605.11258v1>; Yanasse proof transfer (2026): <https://arxiv.org/html/2604.17229>

**Ethnobiology, knowledge and science**
- Cámara-Leret et al. (2019), "Indigenous knowledge networks in the face of global change", *PNAS*: <https://www.pnas.org/doi/full/10.1073/pnas.1821843116>
- Core–periphery of a medicinal botanical system (2024), *J. Ethnobiology and Ethnomedicine*: <https://link.springer.com/article/10.1186/s13002-024-00739-z>
- Saslis-Lagoudakis et al. (2012), *PNAS*: <https://ui.adsabs.harvard.edu/abs/2012PNAS..10915835S>
- Kirby et al. (2016), D-PLACE, *PLOS ONE*: <https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0158391>
- Bulmer (1967), "Why is the cassowary not a bird?", *Man* 2(1): <https://doi.org/10.1038/214550a0> (Nature summary)
- Berlin's principles and correspondence types: <https://s10.lite.msu.edu/res/msu/botonl/b_online/library/peopleplants/curricula/thai/lecture12.htm>; Hunn (1975): <https://faculty.washington.edu/hunn/vitae/1975_AE.pdf>
- Garibaldi and Turner (2004), cultural keystone species: <https://www.ecologyandsociety.org/vol9/iss3/art1/>
- Aswani et al. (2018), *PLOS ONE*: <https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0195440>
- Fang et al. (2026), *One Earth*: <https://www.cell.com/one-earth/abstract/S2590-3322(26)00081-3>
- Tengö et al. (2014), Multiple Evidence Base, *Ambio*: <https://pmc.ncbi.nlm.nih.gov/articles/PMC4132468>
- Reid et al. (2020), Two-Eyed Seeing, *Fish and Fisheries*: <https://www.cclmportal.ca/resource/two-eyed-seeing-indigenous-framework-transform-fisheries-research-and-management>
- Coleman and Jain (2024), bushfire season in Indigenous seasonal calendars, *Aqua*: <https://doaj.org/article/59e9fd8a08904f47b530cc83959d67ea>; CSIRO seasonal calendar method: <https://research.csiro.au/dsp/indigenous-seasonal-calendars-enabling-indigenous-knowledge-through-a-dynamic-and-engaging-tool>

**Salience, consensus, quantitative ethnography**
- Smith's S and free-list uncertainty: <https://research-information.bris.ac.uk/en/publications/modeling-uncertainty-around-free-list-cultural-salience-scores/>; Thompson and Zhang (2006): <https://rune.une.edu.au/web/handle/1959.11/15993>
- Romney, Weller and Batchelder (1986), "Culture as consensus": <https://qualquant.org/wp-content/uploads/2013/04/Romney-Weller-and-Batchelder-1986.pdf>; cultural mixture models: <https://escholarship.org/content/qt9g65k4fd/qt9g65k4fd.pdf>
- Epistemic Network Analysis: <https://pmc.ncbi.nlm.nih.gov/articles/PMC9809407>

**Contested claims and provenance in heritage graphs**
- Interpretable uncertainty in colonial collection research (CEUR, 2026): <https://ceur-ws.org/Vol-4212/short1.pdf>
- Provenance and change tracking in heritage RDF, survey (2025): <https://academic.oup.com/dsh/article/41/Supplement_1/i196/8219704>
- Conjectures and weaker logical status (dissertation, 2025): <https://amsdottorato.unibo.it/id/eprint/12142/1/Tesi_Pasqual_complete.pdf>
- Polyvocal provenance modelling: <https://www.researchgate.net/publication/374010049_Polyvocal_Knowledge_Modelling_for_Ethnographic_Heritage_Object_Provenance>

**Data sovereignty and AI**
- Kaitiakitanga Licence (Te Hiku Media), as described: <https://kiwidynamics.co.nz/maori-ai/frameworks/kaitiakitanga-license/>
- Māori AI Governance Framework (Te Kāhui Raraunga, 2025): <https://www.kahuiraraunga.io/_files/ugd/b8e45c_79f4162207da4123861c50dec08cd0fb.pdf>
- Schulz and Loewen-Colón (2026), braiding Indigenous data justice with ABS, *AI & Society*: <https://link.springer.com/article/10.1007/s00146-026-02931-z>

**Indonesian regulation used here**
- Permen LHK P.34/2017 on recognising local wisdom: <https://tanahkita.id/docs/pp/PERMEN_file_20190107_145414.pdf>
- UU 11/2013 ratifying the Nagoya Protocol: <https://jdih.kemenkeu.go.id/api/download/fulltext/2013/11TAHUN2013UU.htm>
- PP 56/2022 on communal intellectual property: <https://peraturan.bpk.go.id/Details/233504/pp-no-56-tahun-2022>

**Measurement layer and multimodal (read 19 November)**
- AlphaEarth Foundations Satellite Embedding, Earth Engine catalogue: <https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_SATELLITE_EMBEDDING_V1_ANNUAL>; GCS README: <https://developers.google.com/earth-engine/guides/aef_on_gcs_readme>; DeepMind announcement: <https://deepmind.google/blog/alphaearth-foundations-helps-map-our-planet-in-unprecedented-detail/>
- TESSERA: <https://geotessera.org/>, <https://github.com/ucam-eo/geotessera/>; "Earth Embeddings as Products" (2026): <https://arxiv.org/abs/2601.13134>
- AlphaEarth in practice: forest mapping preprint <https://eartharxiv.org/repository/object/14063/download/24645/>; atoll ecosystems (2026) <https://doi.org/10.3390/rs18172964>; AlphaSDM <https://cran.dcc.uchile.cl/web/packages/AlphaSDM/refman/AlphaSDM.html>
- Combining remote sensing and local knowledge: Lower Omo (2026) <https://eprints.whiterose.ac.uk/id/eprint/243653/1/1-s2.0-S2665972726001741-main.pdf>; southeast Angola (2025) <https://doi.org/10.21203/rs.3.rs-6466451/v1>; Tiwi Islands ecosystem typology (2024) <https://doi.org/10.32942/x20p75>
- Ethnophysiography: Mark and Turk (2017) <https://doi.org/10.1002/9781118786352.wbieg0349>; Burenhult and Levinson (2008) <https://doi.org/10.1016/j.langsci.2006.12.028>
- Representational similarity analysis: Kriegeskorte, Mur and Bandettini (2008), *Frontiers in Systems Neuroscience*: <https://doi.org/10.3389/neuro.06.004.2008>
- Open-Meteo: <https://open-meteo.com/>, historical API <https://open-meteo.com/en/docs/historical-weather-api>, WeatherNext 2 <https://open-meteo.com/en/docs/google-weathernext-api>, pricing <https://open-meteo.com/en/pricing>
- Perch 2.0: <https://www.kaggle.com/models/google/bird-vocalization-classifier>, <https://deepmind.google/blog/how-ai-is-helping-advance-the-science-of-bioacoustics-to-save-endangered-species/>
- Omnilingual ASR: <https://ai.meta.com/blog/omnilingual-asr-advancing-automatic-speech-recognition/>, <https://arxiv.org/html/2511.09690>, <https://github.com/facebookresearch/omnilingual-asr/>
- Pl@ntNet API pricing: <https://my.plantnet.org/pricing>; GBIF API: <https://techdocs.gbif.org/en/openapi/>; iNaturalist datasets: <https://www.inaturalist.org/pages/developers>
- TransNewGuinea.org: <https://transnewguinea.org/>, Ekari entry <https://transnewguinea.org/language/ekari>, Greenhill (2015) *PLOS ONE* <https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0141563>, CLDF release v3.2 (CC BY 4.0) <https://zenodo.org/records/14162587>
- CLICS colexifications: Rzymski et al. (2020), *Scientific Data* <https://www.nature.com/articles/s41597-019-0341-x>; <https://clics.clld.org/>
- Few-label probes on satellite embeddings: TESSERA paper <https://arxiv.org/abs/2506.20380>; TESSERA linear-probe demo <https://github.com/isan-miguel/tessera-demo>; AlphaEarth paper <https://arxiv.org/abs/2507.22291v2>
- CLDF <https://cldf.clld.org/>; Lexibank (2022) <https://www.nature.com/articles/s41597-022-01432-0>; Grambank <https://grambank.clld.org/>; Concepticon <https://github.com/concepticon/concepticon-cldf>
- AlphaGenome API and terms: <https://github.com/google-deepmind/alphagenome>; AlphaGenome 2 (November 2026): <https://deepmind.google/blog/alphagenome-2-deciphering-how-cells-read-dna-to-better-understand-disease/>
- AT Protocol video handling: <https://atproto.com/guides/video-handling>; Bluesky 10-minute videos (August 2026): <https://techcrunch.com/2026/08/26/bluesky-now-lets-you-upload-10-minute-long-videos/>; video embed limits: <https://opentweet.io/tools/bluesky-video-checker>
- Cloudflare Stream pricing <https://developers.cloudflare.com/stream/pricing/>; R2 pricing <https://developers.cloudflare.com/r2/pricing/>; Media Transformations <https://developers.cloudflare.com/stream/transform-videos/>

**In this repository**
- `apps/web/public/observatory/map.json` (built 17 November), `scripts/observatory/build-map.mjs`, `scripts/verify-wiki-seed.py`, `src/desk.ts` (`checkPage`), `src/media.ts`, `seed/wiki/*.json`, `seed/wiki/pages/*.json`, `seed/sources/*.json`, `seed/wiki/*.verify.json`, `knowledge-ontology-2026-11-18.md`, `aksara-living-program-2026-11-18.md`.
