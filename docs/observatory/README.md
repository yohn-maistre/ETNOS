# Observatory

> **Observatory redesign, phase 1 built (20 November 2026).** The wiki front is now the observatory front (*Observatorium*), with the knowledge map in three lenses, a data catalogue, a *Data* tab on thing pages and a locator map on place pages. The starter-data build, crosswalks, embeddings and access tiers beyond the open tier are phase 2. The [build status](#build-status) below lists what exists and what remains. Remove this notice when phase 2 is built.

This folder holds the design of the observatory: how knowledge, datasets and artifacts about a place are modelled, seeded, shown and shared. Earlier designs of the knowledge map are in [knowledge/](../knowledge/README.md), and the research behind the knowledge model is in [research/](../research/).

## Read in this order

| Order | Document | What you get | Status |
| --- | --- | --- | --- |
| 1 | [world-model-and-starter-data-2026-11-20.md](world-model-and-starter-data-2026-11-20.md) | The model of a people's world: things placed by size, pace and level of organisation (Integrative Levels Classification), statements with depth (Berkes) and voice, published schemes as lenses (OCM, IDS and Concepticon, OpenAlex, nature's contributions to people, UU 5/2017, Marble), crosswalks by embeddings, relations as a typed hypergraph, synthesis notes, pre-computed embeddings, the starter build from keyless sources, onboarding with one profile file, and the knowledge map as a constellation. | current design; phase 1 built |
| 2 | [data-observatory-2026-11-20.md](data-observatory-2026-11-20.md) | The observatory beyond the wiki: what belongs in it, three access tiers (open, community, controlled, following the Five Safes), the dataset record (DCAT 3, Croissant, RO-Crate, Satu Data Indonesia), viewers for each modality, access as code (ODRL, Local Contexts, AT Protocol), the edge and server deployment profiles, Aksara as librarian, use cases, app views, and notes from Engagic, a comparable civic data system. | current design; phase 1 built |

## Assets

- [peta-pengetahuan-prototipe.html](../assets/peta-pengetahuan-prototipe.html): a working prototype of the knowledge map with four arrangements (size and pace, level, field of science, need). Open it in a browser. Its 71 items are design examples with rough positions, not ETNOS data.
- [skala-dunia-2026-11-20.svg](../assets/skala-dunia-2026-11-20.svg): the same design examples drawn as a size and pace chart.

## How this relates to earlier documents

- The knowledge model in [epistemic-multiplex-2026-11-19.md](../research/epistemic-multiplex-2026-11-19.md) and the code in `src/knowledge-model.ts` stay the core. The world model adds coordinates, depth, schemes and relation families to it.
- The knowledge map design in [knowledge-map-design-2026-11-16.md](../knowledge/knowledge-map-design-2026-11-16.md) and the keyword domains in `scripts/observatory/build-map.mjs` are replaced by the constellation and the scheme lenses once the redesign is built.
- The 18 post topics in [topic-primitives-and-knowledge-organisation-2026-11-18.md](../research/topic-primitives-and-knowledge-organisation-2026-11-18.md) keep their job for posts and communities. They are not used to classify knowledge.

## Build status

Phase 1 was built on 20 November 2026 in two commits: the data layer in `f136ce7` and the interface after it. Everything shown on etnos.space comes from public sources that were checked on that day, and every seeded record stays *proposed* until a steward reviews it.

The data layer holds these parts:

| Part | Where it lives | What it does |
| --- | --- | --- |
| World model fields | `src/world-model.ts`, `src/knowledge-model.ts` (tables `km_coordinates`, `km_depth`) | Every thing gets size and pace as ranges with a basis, and a level as one of 25 ILC classes in seven colour bands. Every statement gets a Berkes depth. Rules fill the values, and a reviewer can correct them through `POST /v1/knowledge-model/entities/:slug/coordinates`. |
| Dataset records | `src/datasets.ts`, `src/catalogues/tanah-papua-datasets.json` | DCAT 3 and Croissant core fields, links to things, open tier only. Routes are `GET /v1/datasets`, `GET /v1/datasets/:id` (with JSON-LD), `GET /v1/datasets/queue`, and `POST /v1/datasets`, `/v1/datasets/seed` and `/v1/datasets/:id/review`. Seven real records are seeded: Glottolog, Grambank, the TransNewGuinea.org word list for Ekari, D-PLACE for the Mee, Global Forest Change, ESA WorldCover and the butterfly collection of Universitas Cenderawasih. |
| Place points | `src/catalogues/tanah-papua-places.json`, `apps/web/public/observatory/places.json`, `scripts/observatory/build-place-points.ts` | One reference point and area for each of the 55 catalogue places, from the simplified BIG outlines, rounded to 0.01 degree. |
| Static graph | `apps/web/public/observatory/knowledge/graph.json`, `scripts/observatory/build-knowledge-portal.ts` | Each node now carries its size, pace and level. Notes written by a reviewer stay in the live API; the static file keeps only the range and its basis. |

The interface holds these parts:

| Part | Where it lives | What it does |
| --- | --- | --- |
| Observatory front (*Observatorium*) | `apps/web/src/Observatorium.svelte`, `apps/web/src/WikiExperience.svelte`, `apps/web/src/styles/observatorium.css` | Replaces the old wiki front at `/wiki`. The knowledge map has three lenses: *Ukuran dan waktu* (size and pace), *Hubungan* (the network, `KnowledgeGraph3D.svelte`) and *Peta* (MapLibre through `TerrainMap.svelte`, loaded only when chosen). Level is the colour in every lens, and the legend can hide a level. Below the map come the wiki pages, the data catalogue, what is still unknown, and the large groups. |
| Size and pace chart | `apps/web/src/ScaleConstellation.svelte`, `apps/web/src/world-scale.ts` | Size runs right and pace runs up on log scales, with level as colour. On wide screens with a mouse the level is also depth, and dragging turns the frame in the same direction as the network map. Phones and reduced motion get a flat chart. A thing sits at a fixed spot inside its range, and the selected thing shows the whole range as a box. *Seluruh skala* shows the full frame and its empty parts; *Bagian yang terisi* zooms to the things that exist. |
| Default lens | `DEFAULT_LENS` in `Observatorium.svelte` | Size and pace, as the world model doc proposes. Change the constant to `'hubungan'` to open on the network. A link can also choose with `?lens=hubungan` or `?lens=peta`. |
| Entry panel | `apps/web/src/EntityPanel.svelte` | Adds size, pace and level in words with their basis, and the datasets about the thing. |
| Data catalogue (*Katalog data*) | `apps/web/src/DatasetCatalogue.svelte` at `/wiki/data`, `apps/web/src/DatasetPage.svelte` at `/wiki/data/:id` | The list filters by kind and searches title, publisher and keywords. The dataset page shows the facts, the files with size and checksum, the things it is about, how to cite it, and a JSON-LD download. |
| *Data* tab | `apps/web/src/ThingData.svelte` in `ThingPage.svelte` (`?tab=data`) | Datasets about a place, language or topic, grouped by kind and read live from `/v1/datasets?context=`. |
| Locator map | `apps/web/src/PlaceLocator.svelte` with `LocatorMap.svelte` | A kabupaten or kota shows its reference point. A province shows the points of its kabupaten and kota. A customary region shows its generalised outline with a note that it is a planning reference and not a customary land boundary. A language shows its Glottolog point. A thing without any of these says so in one sentence. |
| Share cards | `src/share.ts`, `apps/web/public/share/wiki.jpg` | `/wiki` shares as *Observatorium*, `/wiki/data` as *Katalog data*, and a dataset page by its title when an anonymous reader can see the record. |

Phase 2 still has to build these parts:

1. The starter-data command with Wikidata, OpenStreetMap, Glottolog, GBIF, GloBI, NASA POWER and the OpenAlex topics snapshot (world model doc §7).
2. Schemes as lenses (ILC2, IDS and Concepticon, OpenAlex topics, Marble) and crosswalks computed with embeddings and confirmed by people (§5.5 and §5.6).
3. Pre-computed embeddings for things and the "meaning" arrangement (§7.3).
4. The level, field and need arrangements of the constellation as separate lenses, empty regions drawn as cells linked to questions, and depth and voice filters (§9).
5. Community and controlled access tiers with the request flow, protocols as ODRL policies, and Local Contexts labels (data observatory doc §4.1 and §7).
6. Viewers for each modality (tables with DuckDB-Wasm, map layers with PMTiles, IIIF images) and the place data pack (data observatory doc §6 and §11).
7. A steward screen for reviewing dataset records and correcting coordinates. The API exists, and Studio does not show it yet.
