# Hal, Pernyataan, Rekaman: an ontology for a people's world

> **Updated 19 November.** Read **[epistemic-multiplex-2026-11-19.md](epistemic-multiplex-2026-11-19.md)** first. It renames the layers (Hal → **Entity**, Pernyataan → **Assertion**, Rekaman → **Witness**, computed clusters → **Clusters**; the holder's-account layer *kesaksian* → *tuturan*), keeps all twelve kinds as classes under three top classes, lets measurements be witnesses so science joins the graph as one voice, and replaces sections 8–11 here with a motif library and five lenses on importance. The reasoning below on what the things are, seeding, the first-person voice and "classify their own" still stands.

18 November 2026, evening. Design research; no code changed. It answers two things the owner raised in the same session: the knowledge map shows documents and sentences instead of the things they are about, and the wiki needs a proper object model for everything a people knows about its world. Marks: *(proposal)* for suggestions the owner can overturn, *(not measured)* for estimates, *(to verify)* for open checks. Sources are at the end.

It builds on, and does not replace: `../knowledge-organisation-2026-11-15.md` (label families), `../knowledge-map-design-2026-11-16.md` (six coordinates, lenses), `knowledge-graph-sota-2026-11-16.md` (methods, CIDOC CRM, perspective tags), `topic-primitives-and-knowledge-organisation-2026-11-18.md` (facets, SKOS, Indigenous schemes), `why-these-axes-2026-11-18.md` (place, language, topic, kind) and `aksara-living-program-2026-11-18.md` (Jadwal Aksara). Those settle the **axes** (how anything is located). This note settles the **things** (what the nodes are).

## 1. What the owner asked

In his words, lightly cleaned up:

> I'm looking to organise everything a people would know about their world, experiences and lived knowledge: the world and science, biocultural knowledge, ecosystems, technology and tools, people, human affairs with stories and histories, everything. I want the best ways to organise knowledge so a people can understand their scattered knowledge better, particularly Indigenous peoples. I understand the general consensus is for them to classify their own, but I think that's the Western world playing it politically correct. I'm Mee myself, and people here would like it if we had a way to structure and view everything neatly, and a lot of us don't have the expertise to do so. That's why I want to bring in modern ways of organising knowledge that play well with other systems, including AI, so that in the future we keep full data sovereignty but have the option to fine-tune our own sovereign model for internal use. DIKW sounds natural. Taxonomies and trees could help. Spatial and networked maps are appealing.

And about the map: the nodes should be "actual concepts, objects, ideas, places, entities, whatever is in this abstracted layer of a people's reality", not entries and sentences placed by similarity.

On seeding and the cultural voice: "We still need a starting point to seed, which is why we're doing all of this with the prepopulated wiki. And we should flesh out wiki objects, taking in from different sources about things that matter."

## 2. What exists today

**The map** (`scripts/observatory/build-map.mjs`, rendered by `apps/web/src/KnowledgeMap.svelte`):

- Its nodes are **records, not things**: regions, sources, verified passages, wiki pages and catalogue entries.
- Its edges are record links: *from*, *part*, *cites*, *rests*, *about*.
- **Position** comes from UMAP (3D, seed 7) over `multilingual-e5-small` embeddings of each node's text.
- **Domains** come from keyword regexes, with the embedding as a fallback; **voice** comes from the source's kind.
- So "Danau Paniai" exists only as a page and as sentences that mention it. Sagu, noken, bakar batu and the pig feast have no node of their own, and there is no edge saying a practice uses an object or happens in a season.

**Entity kinds in the data:**

- Contexts in the catalogue: 256 languages, 42 regencies and cities, 13 regions, and 57 topics of several kinds.
- Wiki seed pages: regency (20), people (9), being (8), language (6), region (4).
- So the only *things* ETNOS knows as things are **places, peoples, languages and beings**. Practices, objects, events, ideas, stories, seasons and institutions as things do not exist yet.

**The axes are settled** (place, language, topic, kind, plus seasons per community and beings). Keep them. They answer "where does this sit"; this note answers "what is it".

## 3. The model in one picture

Three planes, plus the two layers ETNOS already has. *(proposal)*

```
  Kerangka (schemes)   Mee's own categories · 18 topics · UU 5/2017 OPK · disciplines   ← lenses, SKOS
        │  classify                                                                     
  HAL (things)  ●──────── typed relations (Pernyataan) ────────●                        ← the map's nodes
        │  each statement rests on                                                      
  REKAMAN (records)  sources · verified sentences · tellers' accounts · posts · recordings  ← evidence
        ⟂
  Protokol (protocol)  who may see, use, train on: Local Contexts, Jangan disebarkan       ← orthogonal
```

- **Hal** (things): what the knowledge is *about*: a lake, a practice, a tool, a season, an idea, a story, a people.
- **Pernyataan** (statements): what is said about a thing, always with *who says it* and *what it rests on*. A statement can link two things (a relation) or give a thing a value (an attribute).
- **Rekaman** (records): the evidence. Everything on today's map lives here.
- **Kerangka** (schemes): ways of grouping things. Several schemes sit side by side as lenses, which the owner decided on 16 November.
- **Protokol**: access and use rules, set by the community, separate from everything else (already the rule in `why-these-axes`).

This matches the owner's own Abstraksi Knowledge Recovery Pipeline v0.1 (2 October 2026):

| Recovery Pipeline v0.1 | Here |
| --- | --- |
| Entity | Hal |
| Statement | Pernyataan |
| Record | Rekaman |
| Perspective | the statement's *voice* |
| Protocol | Protokol |
| Lens | Kerangka |

Its three epistemic layers (trace, holder account, interpretation) become a field on every statement (section 5.2). So this is not a new theory; it makes the existing one concrete enough to build.

## 4. Hal: the kinds of things

A small top level: twelve kinds, each with a plain Indonesian name, room for the community's own term, and a crosswalk to the standards that matter. It is small on purpose. The basic Formal Ontology standard that hundreds of projects build on has only about three dozen classes. Most richness belongs in the schemes and relations, not in the top level.

### 4.1 The twelve kinds *(proposal)*

**Things that last** (in BFO's terms, *continuants*)

| Kind | Covers | Examples | CIDOC CRM | Wikidata-style |
| --- | --- | --- | --- | --- |
| **Tempat** | Places at any scale, named features | region, regency, kampung, Danau Paniai, a mountain, a river, a sacred site (protocol applies) | E53 Place | geographic feature |
| **Makhluk** | Living kinds and named beings | sweet potato, sago palm, cassowary, cenderawasih; a mountain or lake known as a being | E55 Type for kinds; E39 Actor for beings treated as persons | taxon / named entity |
| **Kelompok** | Peoples and groups | a people (suku), a clan *as a group* with consent, a family line *as a group* | E74 Group | ethnic group / clan |
| **Lembaga** | Institutions | church, school, sanggar, dinas, customary council | E74 Group | organisation |
| **Orang** | Persons, narrowly | historical and public figures; tellers who opt in. Never a registry of people | E21 Person | human |
| **Benda** | Made things, tools, technology | noken, stone axe, honai, canoe, tifa | E22 Human-Made Object (or its type) | artefact / tool |
| **Bahasa dan Kata** | Languages, and terms as things | a language (linked to Glottolog); a word with its meaning and sound | E33 Linguistic Object / E56 Language | language / lexeme |
| **Gagasan** | Ideas, values, categories, beliefs, *as recorded or told* | an idea of reciprocity, a moral category, a cosmological concept, a classification | E89 Propositional Object, E55 Type | concept |

**Things that happen** (BFO's *occurrents*)

| Kind | Covers | Examples | CIDOC CRM |
| --- | --- | --- | --- |
| **Praktik** | Recurring ways of doing; skills and know-how | bakar batu, weaving noken, gardening, pig exchange, a dance | E7 Activity type / E29 Design or Procedure |
| **Peristiwa** | Dated events and periods | an expedition, a mission's arrival, a flood, a festival in 2026, an era | E5 Event, E4 Period |
| **Musim dan Siklus** | Seasons, calendars, cycles | a fruiting season, a rainy season, a ritual cycle | E4 Period (recurring), with the community's own season terms (`src/seasons.ts`) |

**Things that are told** (information objects)

| Kind | Covers | Examples | CIDOC / LRM |
| --- | --- | --- | --- |
| **Cerita dan Karya** | Stories, songs, histories, artworks, texts as works | an origin story, a song, a carving, a book, a film | E73 Information Object; LRM *Work* |

### 4.2 Why these and not others

- **Continuant versus occurrent** is the most widely shared split in applied ontology. It is BFO's first division, and BFO is the first top-level ontology approved as an ISO/IEC standard (21838-2). We use it as a quiet alignment so data can travel, not as a word users ever see.
- **Praktik as its own kind** is the important addition. A large share of Papuan knowledge is *how to do things* (cook, build, plant, exchange, mourn, navigate), and "pengetahuan tradisional" and "teknologi tradisional" are two of the ten objects in UU 5/2017. Most general schemes bury practices inside topics.
- **Makhluk covers both kinds of living things and named beings.** Descola's comparative anthropology shows that the Western split between nature and culture is one way among several of relating to non-humans. So the model must not force a lake or a mountain into "nature" when people speak of it as a being with relations. A Makhluk may carry kin and custodial relations, not only biological ones.
- **Gagasan is recorded, never generated.** It holds ideas *as someone stated them*, with their voice (section 6).
- **Orang is deliberately narrow.** The commons is not a registry of people. Clans and families appear only as groups, and only with their consent.

### 4.3 Folk taxonomy inside Makhluk

Ethnobiology offers a ready, well-studied structure for living kinds. Berlin's principles describe folk classifications as shallow hierarchies with up to six ranks: kingdom, life form, intermediate, generic, specific and varietal. Generic taxa are the most numerous and the ones people know best.

*(proposal)* Give Makhluk an optional **folk rank** in the community's own terms, plus a crosswalk to scientific taxa (GBIF or Wikidata) where one exists. Never force a one-to-one match; folk and scientific kinds often overlap without lining up.

## 5. Pernyataan: what is said, by whom, on what basis

### 5.1 Shape

Borrowed from Wikidata's statement model (claims with qualifiers, references and ranks), with ETNOS's voice and protocol added:

```json
{
  "subject": "hal:bakar-batu",
  "predicate": "dilakukan-saat",
  "object": "hal:pesta-pertukaran",
  "qualifiers": { "place": "ctx:mee-pago", "season": "season:…", "time": "sejak dahulu", "language": "id" },
  "voice": "akademik",
  "layer": "jejak",
  "rests_on": [{ "source": "src:…", "sentence": "…exact verified sentence…" }],
  "rank": "variant",
  "status": "seeded",
  "protocol": "public"
}
```

- **Every statement rests on something:** a verified sentence, a teller's account, or an accepted reply. No basis, no statement.
- **Variants are parallel statements, never merged.** Two accounts of an origin story are two statements with different voices, side by side ("who says which", as the showcase plan does for Nabire).
- **Rank** says which statement is shown first (preferred, variant, superseded). It is set by people, never by Aksara.
- **Status:** seeded (from published sources), reviewed (a steward checked it), told (from a teller), contested.

### 5.2 Three epistemic layers, as a field

From the Recovery Pipeline v0.1:

- **jejak** (trace): what a source records, quoted.
- **kesaksian** (holder's account): what a teller or holder of the knowledge says.
- **tafsir** (interpretation): a synthesis by a scholar, a steward or Aksara.

Shown as small labels on every statement. Aksara's syntheses are always *tafsir*, never *kesaksian*.

### 5.3 Relations: a starter set *(proposal)*

About twenty-five predicates in seven families, written in plain Indonesian, each with a crosswalk. A community can add its own.

| Family | Predicates |
| --- | --- |
| Ruang (space) | berada di, bagian dari, berbatasan dengan, di hulu/hilir dari, di atas/bawah dari |
| Kelompok (groups) | anggota dari (groups only), bertetangga dengan, berkerabat dengan (groups and beings) |
| Hidup (life) | tumbuh/hidup di, dimakan/dipakai oleh, berbuah/muncul pada musim |
| Buat (making) | dibuat dari, digunakan untuk, dibuat oleh (group or practice) |
| Praktik (doing) | melibatkan, memakai, dilakukan saat, dilakukan oleh (group), diajarkan melalui |
| Kata (naming) | disebut … dalam bahasa …, berarti, nama lain dari |
| Cerita dan sejarah | diceritakan dalam, menjelaskan asal, terjadi di, terjadi pada, mengubah |
| Penjagaan (custody) | dijaga oleh, dipegang oleh (group), hanya untuk (protocol) |
| Pengetahuan (knowledge) | menurut, dibantah oleh, sama dengan (crosswalk) |

The "hulu/hilir" and "atas/bawah" predicates follow the idea that Papuan and wider New Guinea ways of ordering space use terrain (upstream and downstream, uphill and downhill) more than compass directions. That idea comes from the note the owner shared; the studies it cites are *(to verify)*.

### 5.4 Events and practices as hubs

A pig exchange involves groups, a place, a season, objects, a story and an obligation all at once. Binary links scatter that. Following CIDOC CRM's event-centred model (already our export target), **Praktik and Peristiwa are hubs**: participants, place, time, season, objects and stories all attach to the one hub node. This is how the model handles what the shared note called hypergraphs, without new technology.

## 6. Seeding, and the first-person cultural voice

The earlier note pushed back on using a people's cosmology as Aksara's "alignment prompt". The owner's point stands: we need a starting point, and that is what seeding is for. Both are true. The line is this:

- **Allowed and wanted:** seeding Hal pages, including Gagasan (ideas, values, cosmology), from published sources, as statements with voice and basis: *"Menurut [sumber, tahun], …"*. A Gagasan page about a Mee idea can start entirely from what anthropologists, missionaries and Papuan scholars have written, clearly marked as seeded and *jejak* or *tafsir*.
- **Not allowed:** Aksara writing **as the people** ("kami orang Mee percaya …"), or presenting its synthesis as the community's own worldview. A first-person account comes only from a person, as *kesaksian*.

The page then invites exactly what the seed lacks: *"Ini yang tertulis. Bagaimana menurut keluargamu?"*

## 7. "Classify their own": where we agree, and the honest version

The owner argues that "let Indigenous people classify their own" can be the West playing it safe, and that Mee people would welcome a neat, modern structure they don't have the expertise to build.

**Agreed, with one refinement.** Offering a well-made structure is a service, not an imposition, *if* three things hold:

1. **The community can change it.** Choosing a modern structure *is* Mee people classifying their own. The structure ships as a scheme they can adopt, edit or replace, not as the database itself.
2. **No people speaks with one voice.** The model keeps variants and voices, so a structure never silences a family or clan that sees things differently.
3. **Data stays portable and theirs.** Things and statements export to standards (SKOS, CIDOC CRM, Wikidata-style JSON), so the structure helps sovereignty instead of locking the data into our app.

Philosophy has a name for this middle path. Ludwig and Weiskopf's *ethnoontology* (2019) proposes a model of cross-cultural relations between ontologies that goes beyond a simple split between universalism and relativism. It is an integrative model of ontology building that draws on biological taxonomy, cognitive science, cultural anthropology and political ecology. That is our position: a shared top level for interoperability, local schemes for meaning, explicit crosswalks between them.

## 8. Other ways of organising knowledge, and what each is good for

The owner asked what else is popular or gaining ground. A survey, with a verdict for ETNOS:

| Approach | What it is | Use in ETNOS |
| --- | --- | --- |
| **DIKW** (data, information, knowledge, wisdom) | A pyramid from raw data up to wisdom | **As a reading ladder, not a storage model** (section 9). It has been criticised as logically unsound: Frické (2009) argued it should be dropped from information science. Useful for explaining, not for building. |
| **Facets** (Ranganathan's PMEST) | Independent axes instead of one tree | Already adopted as ETNOS's axes |
| **Taxonomies and SKOS schemes** | Trees of concepts with labels in many languages, plus links between schemes | **Kerangka**: Mee categories, the 18 topics, UU 5/2017 objects and disciplines as parallel schemes with crosswalks |
| **Knowledge graphs with typed things** (Wikidata, property graphs) | Things, typed relations, statements with qualifiers and references | **The core**: Hal and Pernyataan |
| **Upper ontologies** (BFO, ISO/IEC 21838-2; DOLCE) | A small, rigorous top level | Quiet alignment for the twelve kinds; never shown to users |
| **CIDOC CRM** (ISO 21127) | Event-centred model for cultural heritage | Practices and events as hubs; export to museums and archives |
| **Folk taxonomy** (Berlin) | Shallow folk ranks for living kinds | Ranks inside Makhluk, with crosswalks to science |
| **Ethnoontology** (Ludwig and Weiskopf) | Philosophy of how cultures build ontologies | The stance in section 7 |
| **Descola's four ontologies** | Animism, totemism, analogism, naturalism as ways of relating to non-humans | A design warning: don't hard-code the nature/culture split |
| **Ologs** (Spivak and Kent, 2012) | Category-theory knowledge representation: typed boxes and arrows, with structure-preserving maps between models | A precise way to think about crosswalks between the Mee scheme and others: a mapping should keep the arrows, not just the labels. Inspiration, not a dependency. |
| **Claims with provenance** (nanopublications, Wikidata references) | Each assertion carries its own provenance | Pernyataan; and on AT Protocol, a statement could later be a signed record (*kesaksian bertanda tangan*) |
| **LLM-assisted ontology learning** | Models propose term types, taxonomies and relations; humans decide | The extraction pipeline in section 11. The LLMs4OL challenge (2024, 2025) benchmarks exactly these tasks and found hybrid pipelines do best. A 2025 systematic review found LLMs serve mainly as *auxiliary* ontology engineers, which is our draft-only rule. |
| **Spatial and temporal views** | Maps, timelines, the two clocks | Lenses on the map (section 10) |
| **Concept maps and reading paths** | Guided sequences through linked ideas | "Jalan baca" (reading paths), already decided on 16 November |

## 9. DIKW as a reading ladder *(proposal)*

The owner likes DIKW, and it does explain the commons well, as long as it is not used as a pipeline:

| Rung | In ETNOS | Who makes it |
| --- | --- | --- |
| **Data** | Rekaman: sources, recordings, verified sentences | Collected and verified |
| **Information** | Pernyataan: who said what about which thing | Extracted, checked, reviewed |
| **Knowledge** | Hal: a thing with its statements, variants and relations, and the map of how things connect | Built together by people and Aksara |
| **Wisdom** | People's own judgement: tellers' teachings, community decisions, "pelajaran" written by people | **People only.** Aksara does not produce wisdom. |

That last row says the project's whole stance in one line, and it reads well to judges.

## 10. The map, rebuilt around things *(proposal)*

**Nodes are Hal.**

- Colour by kind; size by how much reviewed evidence a thing has.
- Records move one level down: tap a thing to open its evidence drawer (statements, sources, variants, threads).

**Edges are typed statements.**

- Only statements with a basis are drawn.
- Variants show as forked edges with their voices.
- Contested edges are dashed.

**Embeddings stay, in a new job.** They suggest links, catch duplicates and help search. They no longer decide where a thing sits.

**Lenses** (the same graph, laid out differently):

1. **Jaringan:** a force layout over typed relations, grouped by kind.
2. **Peta:** places anchored on the map, with other things hanging from their places.
3. **Lapisan:** things arranged by pace layer. Tempat and Makhluk sit deep; Praktik, Gagasan and Cerita in the middle; Peristiwa and the news on top. This ties the map to the ETNOS model.
4. **Pohon:** pick a scheme (Mee categories, the 18 topics, UU 5/2017, disciplines) and see the same things as a tree. Switching schemes shows how the same world looks under different eyes, which the owner asked for on 16 November.
5. **Waktu:** the two clocks (when it is about, when it was recorded).
6. **Celah:** gaps. Things with few sources, or only outsiders' voices, glow. This is the state-of-knowledge report as a picture, and it feeds Jadwal Aksara's questions.

**Semantic zoom:** region, then kinds, then things, then statements.

## 11. From what we have to things *(proposal; estimates not measured)*

The seed already holds 586 verified sentences across three regions, every one checked word for word against its source. They are the raw material.

1. **Propose things.** For each verified sentence, the model proposes the things it mentions (with a kind) and the statements it makes (subject, predicate, object), quoting the sentence. These are the LLMs4OL tasks: term typing and relation extraction.
2. **Link.** Match proposals to existing contexts (languages, places, peoples, beings), then to outside identifiers (Wikidata, Glottolog, GBIF) where they exist.
3. **Review.** A steward in Studio accepts, merges, splits or rejects. Nothing becomes a thing without a person. The model is an auxiliary engineer, as the review literature found.
4. **Rebuild the map** from things and statements.
5. **Seed pages** for the most-evidenced things that have no page yet.

| Step | Days |
| --- | --- |
| Tables for Hal and Pernyataan (and a migration of existing contexts and page kinds into them) | 2 |
| Extraction script over the seed, with quote checks | 2 |
| Review queue in Studio | 3 |
| Map rebuild with three lenses (Jaringan, Peta, Celah) | 4 |

**About eleven days.** This competes with Run 3 (Aksara). If the showcase is close, ship the extraction and one lens on one region, and keep the rest for January.

**Expected yield** *(not measured)*: a few hundred candidate things from 586 sentences, of which perhaps half survive review.

## 12. Sovereignty and a model of their own

The owner wants the option, later, to fine-tune a sovereign model for internal use. Structured statements are what makes that responsible:

- **Training permission is its own protocol flag.** "Access is not training permission" (Recovery Pipeline v0.1). Only statements, sources and accounts whose protocol says *boleh dipakai melatih* go into a training set.
- **Exports in open formats:** SKOS for schemes, CIDOC CRM / Linked Art for heritage partners, Wikidata-style JSON for things and statements, and JSONL question-and-answer pairs generated from *reviewed* statements, each carrying its source.
- **Withdrawal propagates.** A withdrawn source removes the statements that rest on it, and the next training export leaves them out.
- **Evaluation from the same data.** The negative competency questions in the Jadwal Aksara note ("never infer a marga from a name" and so on) double as an evaluation set for any model trained on it.

## 13. Open questions for the owner

1. Are twelve kinds right? Candidates to merge: Lembaga into Kelompok. Candidates to add: Penyakit dan Obat (illness and medicine) as its own kind rather than Praktik plus Makhluk.
2. Should Mee categories be written now as the first local scheme, and by whom? A small session with the culture lead and two elders would be enough to start.
3. Is Orang acceptable at all on the public commons, or only for historical figures?
4. Which outside identifiers matter most: Wikidata, Glottolog, GBIF, or the Ministry's DAPOBUD records?
5. Do we migrate today's page kinds (regency, people, being, language, region) into Hal now, or run both side by side until the showcase?

## 14. Sources

Read 18 November 2026.

- Ethnoontology: Ludwig, D. and Weiskopf, D. A. (2019), "Ethnoontology: Ways of world-building across cultures", *Philosophy Compass*. <https://philsci-archive.pitt.edu/16275>, <https://philarchive.org/archive/LUDEWO>
- Basic Formal Ontology and ISO/IEC 21838-2: <https://arxiv.org/pdf/2405.00197>, <https://www.wikiwand.com/en/articles/Basic_Formal_Ontology>, <https://journals.sagepub.com/doi/10.3233/FAIA250495>
- Descola, *Beyond Nature and Culture* (University of Chicago Press, 2013): <https://www.press.uchicago.edu/ucp/books/book/chicago/B/bo9826233.html>
- Folk taxonomy: Berlin (1992), *Ethnobiological Classification*: <https://s10.lite.msu.edu/res/msu/botonl/b_online/library/peopleplants/curricula/thai/lecture12.htm>, <https://ethnobiology.org/sites/default/files/pdfs/JoE/13-1/BREthnobiologicalClassification.pdf>
- Ologs: Spivak, D. I. and Kent, R. E. (2012), *PLOS ONE*: <https://pmc.ncbi.nlm.nih.gov/articles/PMC3269434>
- DIKW critique: Frické, M. (2009), *Journal of Information Science* 35(2): <https://experts.arizona.edu/en/publications/the-knowledge-pyramid-a-critique-of-the-dikw-hierarchy/>
- LLMs for ontology learning: LLMs4OL 2025 overview <https://oa.tib.eu/renate/items/7a045b0b-c347-4003-803d-1a9e63007209>; LLMs4OL <https://arxiv.org/pdf/2307.16648>; systematic review <https://semantic-web-journal.net/content/large-language-models-ontology-engineering-systematic-literature-review-1>
- The note the owner shared, as checked in `aksara-living-program-2026-11-18.md` section 10 (Wang, Hsieh and Lai 2025; OntoKG; ATR4CH).
- In this repository: `scripts/observatory/build-map.mjs`, `apps/web/src/KnowledgeMap.svelte`, `src/catalogues/tanah-papua.json`, `seed/wiki/pages/*.json`, `seed/wiki/*.verify.json`, `src/seasons.ts`, and the notes named at the top.
