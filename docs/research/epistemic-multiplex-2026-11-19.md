# The epistemic multiplex: a provenance-aware knowledge graph of a people's world

19 November 2026, early morning. Design research; no code changed. It follows `knowledge-ontology-2026-11-18.md` and replaces its naming and its analysis sections; that note's reasoning on what the things are, seeding and the first-person voice still stands. Marks: *(proposal)* for suggestions the owner can overturn, *(not measured)* for estimates, *(to verify)* for open checks, *(rencana)* for anything not built. Nothing in this note is running yet. Sources are at the end.

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
| Ritme | Unchanged | Unchanged; motif outputs feed its existing slots (section 9) |

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
| Post | an accepted reply or thread on Strata | Enters only after acceptance |

Every witness keeps its bytes or its stable link and receipt, as the repository rules already require.

## 5. What the data already tells us *(computed 19 November from today's map; rough, automatic labels)*

A small first finding, from the current map (`apps/web/public/observatory/map.json`, built 17 November):

- **Who speaks.** All 551 verified sentences come from two voices: encyclopaedia pages (499, 91%) and government pages (52, 9%). The source catalogue lists 105 sources across ethnography, articles, archives, reports, theses, mission records, a grammar and a dictionary, but those are not yet quoted, mostly because they are paywalled, scanned or offline. **Tellers: zero.**
- **What it is about.** By the map's automatic domain labels, 62% of verified sentences concern administration, population and conflict (*kehidupan bersama*), 25% land and forest, 23% sea and water. Stories (1%), belief (1%) and health (1%) barely appear. The labels are keyword-based and rough.

So the open record of these three regions, as it stands, is mostly the state's and the encyclopaedia's view of administrative units. That is not a flaw to hide; it is the first result of the multiplex lens, and the clearest argument for what the commons adds (section 7.3).

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

### 6.11 Summary table

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
6. **Export.** The open dataset (section 10).

## 9. Where it shows up, without the reel

The reel's visual design waits. The motif outputs flow into surfaces that already exist or are already planned:

- **Entity pages**: a "why this matters" profile (the five lenses), voices side by side, variants with their logical status, a *Mata kedua* (second eye) panel where measurements exist, and open questions from M9.
- **Map lenses**: Constellations (Jaringan), Places (Peta), Gaps (Celah: thin and single-voice entities glow), Voices (one layer at a time).
- **Observatory report**: per region, the strategic diagram, the voice comparison, the vitality list and the gap timeline. This is the "cultural observatory" of KKI 2023, idea 10.
- **Ritme** (unchanged slots): *Soal hari ini* draws from M9 questions; *Temuan* fires when a gap closes or a constellation changes; *Hari ini di wiki* reports new assertions and which voice they added; the monthly *Denyut* carries the vitality and voice charts.

## 10. Open data and a sovereign model

- **Open by default, protocol first.** Computed data (entities, assertions with voice and witness, constellation memberships, motif outputs) is published under an open licence, except what a protocol restricts. Withdrawal removes dependent assertions and recomputes.
- **Formats.** JSON-LD (CIDOC CRM / Linked Art and Wikidata-style statements), SKOS for schemes, and plain tables (CSV or Parquet) for researchers; one documented package per release.
- **Training permission is separate.** Only assertions whose protocol says *boleh dipakai melatih* enter a fine-tuning or evaluation set. This follows the Kaitiakitanga Licence's logic (guardianship rather than ownership, and benefit returns to the source) and the CARE principles.
- **Evaluation sets come free.** Negative competency questions (from the Ritme note), held-out assertions and the folk–science correspondences double as tests for any model trained later.

## 11. Honesty and guardrails

- **The record is biased; we say so.** Every importance lens is shown per voice. Section 5 is the first example.
- **Small data.** The seed has 551 verified sentences. Early constellations are drafts; every chart says so.
- **Null models.** Every motif is reported against a randomised baseline, or not reported.
- **No inference about people.** No clan, marga, kinship or personal attribute is ever inferred; group-level only, consent first. Directed exchange data stays aggregated.
- **Biological knowledge.** Uses of plants and animals linked to genetic resources follow the Nagoya Protocol (UU 11/2013) and PP 56/2022 on communal intellectual property; nothing is computed or exported without the community's terms.
- **Science is not the referee.** Disagreements are shown as such.
- **Aksara writes *tafsir* only.** Constellation names, summaries and analogies are interpretations, renamed and corrected by people.

## 12. Research outputs *(proposal)*

1. **Resource paper.** The model, the pipeline, the open dataset for three Papuan regions, and the motif library with null models. Fits a semantic-web resources track or a digital humanities journal.
2. **"Whose Papua?"** The epistemic multiplex of the open record: how colonial, mission, state, scholarly, Papuan and tellers' voices structure the same world, with gap dynamics as tellers join. Quantitative ethnography or science-of-science venues.
3. **Folk and scientific living kinds at scale.** Automated correspondence (Berlin, Hunn) for Papuan living kinds. Ethnobiology journals.
4. **Vitality from provenance.** A knowledge-vitality index built from witnesses, tested against the Permen LHK indicators. Ecology and Society or similar.

Co-authorship with Papuan scholars and tellers, by their choice, is the default.

## 13. Build plan *(estimates of the agent's working time; not measured)*

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

About 6–7 days for the first wave and 3–5 for the second. **For the proposal, only what runs by 26 November counts as *berjalan*; the rest is *rencana*.** Realistically, the first wave on one region is the showcase target, and section 5 is the one result we can already state honestly.

## 14. Open questions for the owner

1. Licence for computed data: CC BY 4.0, or a Kaitiakitanga-style licence with benefit-return terms?
2. Which region goes first for the full first wave? *(Recommended: Mee Pago, where the owner can reach tellers.)*
3. May voice layers be shown publicly from day one, given that they expose how thin the tellers' layer is? *(Recommended: yes; it is the argument.)*
4. Which partner holds measurement data we could use first (a university, BMKG, a conservation group)?

## 15. Sources

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

**In this repository**
- `apps/web/public/observatory/map.json` (built 17 November), `scripts/observatory/build-map.mjs`, `seed/sources/*.json`, `seed/wiki/*.verify.json`, `knowledge-ontology-2026-11-18.md`, `aksara-living-program-2026-11-18.md`.
