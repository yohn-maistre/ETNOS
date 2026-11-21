# Observatory

> **Observatory redesign, phase 1 built (20 November 2026).** On 21 November the section was renamed *Ensiklopedia* and its front rebuilt (see the one-page system doc, P1). Phase 1 brought the knowledge map in three lenses, a data catalogue, a *Data* tab on thing pages and a locator map on place pages. The starter-data build, crosswalks, embeddings and access tiers beyond the open tier are phase 2. The [build status](#build-status) below lists what exists and what remains. Remove this notice when phase 2 is built.

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
| Ensiklopedia front | `apps/web/src/EnsiklopediaFront.svelte` at `/wiki` | Built 21 November 2026 (one-page system P1). The section is now called *Ensiklopedia* (`apps/web/src/observatory-name.ts`). Search over every entry, a state card (counts in the place scope; *Jawab*, *Tambah*, *Riwayat* for members, *Masuk untuk membantu* for visitors), the kind grid with live counts, the knowledge map as one card that opens `/wiki/peta`, and rows (*Benda, spesies dan bentang alam*, *Belum diketahui*, *Baru diperiksa*, *Di sekitar …*, *Kata minggu ini* when a public Kamus has checked words). The earlier front (`Observatorium.svelte` inside `WikiExperience.svelte`) is no longer routed. |
| Entries | `src/entri.ts`, `src/entri-store.ts`, `GET /v1/entri` and `GET /v1/entri/:slug`, `apps/web/src/EntryPage.svelte`, `apps/web/src/EntryRail.svelte` | One page for every kind at `/wiki/<slug>`, read through an adapter over today's tables (contexts, wiki pages and labels, the knowledge model, viewer records, datasets, public Kamus). No storage change. The slug rule is written at the top of `src/entri.ts` and in the one-page system doc §3. `/contexts/<slug>` and its old tabs redirect in the client (`apps/web/src/entry-routes.ts`). |
| Kind pages | `apps/web/src/KindPage.svelte` at `/wiki/jenis/<kind>` | Sub-kind circles from real sub-kinds, viewer records of the kind, and filters in the address (`?sub=`, `?status=`, `?di=`). `/wiki/jenis/semua` lists every entry. |
| Knowledge map stage | `apps/web/src/MapStage.svelte`, `apps/web/src/stage-layouts.ts`, `apps/web/src/KnowledgeExplorer.svelte` | One canvas and one set of points. Six lenses: *Ukuran dan waktu*, *Tingkat*, *Bidang ilmu*, *Kebutuhan*, *Hubungan* and *Peta*. Every layout is computed once per data and stage shape; a lens change only tweens the points to new targets (650 ms, ease in and out, a cut with reduced motion), and the drawing loop stops when nothing moves. *Ukuran dan waktu* is a box with three log axes that turns all the way round (drag, arrow keys, reset), with axis labels on the edges that face the reader; phones and touch screens start flat with a *Putar 3D* toggle. *Hubungan* keeps the earlier force layout and also turns. *Peta* flies points with a coordinate to the site map projection over the region outlines, gathers the rest in a labelled tray, and *Buka peta lengkap* hands over to the MapLibre map (`TerrainMap.svelte`). |
| Full-screen map | `apps/web/src/KnowledgeMapPage.svelte` at `/wiki/peta?lens=…&focus=…` | *Layar penuh* opens the same explorer over the whole screen with lenses, search, filters, legend and the entry panel. The address keeps the lens and the selected thing, so it can be shared. Esc, *Tutup* or the back button close it. |
| Viewer (*Penampil*) | `apps/web/src/Viewer.svelte` at `/wiki/lihat/:id`, `apps/web/src/viewer/*`, `apps/web/src/viewer-data.ts`, `apps/web/src/styles/viewer.css` | One full-screen shell for every record, with a body per kind that loads only when opened: 3D object (`ModelBody`, own GLB reader and WebGL, no new library), species (`SpeciesBody`: photos, GBIF occurrence map, sound), landform (`LandformBody`: MapLibre relief from open elevation tiles, height on click), images (`ImageBody`, zoom and pan), sound (`AudioBody`, waveform and transcript) and dataset (`DatasetBody`, table preview, licence and files). The panel shows the facts, related records and every source with its licence. A strip at the bottom holds the list the reader came from (`?daftar=semua`, `jenis-<kind>`, `cari-<words>`, `pilih-<id>.<id>`, `entri-<slug>`; `viewerList` in `viewer-data.ts`) with a counter, arrow keys, swipe and a grid with kind filters (`?semua=1` opens it); stepping swaps only the body and replaces the address. It opens from a point (the entry panel's *Lihat di layar penuh*), from a dataset page (*Buka di Penampil*; any catalogue record opens as `/wiki/lihat/data-<id>`), from the record list on the front, and from a wiki article that names the record (`WikiViewerLinks.svelte`). |
| Viewer records | `apps/web/public/observatory/viewer/`, `scripts/observatory/build-viewer-seed.mjs` | 14 seed records built from open sources, with media stored as small static files (7.3 MB in all, nothing in the worker bundle). Licences are listed per file in `apps/web/licenses/observatory-data.txt`. |
| Landform points | `apps/web/public/observatory/landforms.json` | Wikidata coordinates for seven landforms in the graph, used by the *Peta* lens. |
| Default lens | `DEFAULT_LENS` in `KnowledgeExplorer.svelte` | Size and pace, as the world model doc proposes. A link can choose any lens with `?lens=` (`skala`, `tingkat`, `bidang`, `kebutuhan`, `hubungan`, `peta`). |
| Entry panel | `apps/web/src/EntityPanel.svelte` | Adds size, pace and level in words with their basis, the viewer records about the thing, and the datasets about it. |
| Data catalogue (*Katalog data*) | `apps/web/src/DatasetCatalogue.svelte` at `/wiki/data`, `apps/web/src/DatasetPage.svelte` at `/wiki/data/:id` | The list filters by kind and searches title, publisher and keywords. The dataset page shows the facts, the files with size and checksum, the things it is about, how to cite it, and a JSON-LD download. |
| *Riset dan data* tab | `apps/web/src/ThingData.svelte` and `Literature.svelte` in `EntryPage.svelte` (`?tab=riset`) | Research from OpenAlex and the datasets about an entry, grouped by kind and read live from `/v1/datasets?context=` or `?thing=`. |
| Locator map | `apps/web/src/PlaceLocator.svelte` with `LocatorMap.svelte` | A kabupaten or kota shows its reference point. A province shows the points of its kabupaten and kota. A customary region shows its generalised outline with a note that it is a planning reference and not a customary land boundary. A language shows its Glottolog point. A thing without any of these says so in one sentence. |
| Share cards | `src/share.ts`, `apps/web/public/share/wiki.jpg` | `/wiki` shares as *Ensiklopedia*, an entry (`/wiki/<slug>`, and an old `/contexts/<slug>` link) by its title with its article for crawlers, `/wiki/data` as *Katalog data*, and a dataset page by its title when an anonymous reader can see the record. |

### Decisions in phase 2 (21 November 2026)

- **The third axis of *Ukuran dan waktu* is the level (ILC class), not depth.** All 84 public statements are *bagian-dari* at the same Berkes depth, so depth would put every point on one plane. The level separates what overlaps in size and pace: a language (ILC q), the group that speaks it (s) and the regency where it lives (t) have similar ranges and now sit at different depths.
- ***Bidang ilmu* is a rule, not a measurement.** Each ILC class maps to the OpenAlex field that studies it most (`FIELDS` in `stage-layouts.ts`), and the lens says so. It is a stand-in until things get OpenAlex topics through embeddings (world model doc §5.6).
- ***Kebutuhan* shows nine empty needs.** A thing joins a need only through a checked *dipakai untuk* statement, and the public graph has none yet, so every thing waits in the tray and the nine needs show as dashed rings marked *belum ada*.
- **The map lens uses the site's own projection.** Points go to the zoom-7 Web Mercator pixels of `papua-atlas.json`, so outlines and points need no map library; MapLibre loads only after *Buka peta lengkap*.
- **Occurrence points are rounded to 0.1 degree** (about 11 km) and counted per cell, and only CC0 and CC BY 4.0 records are shown, so a nest or roost cannot be read from the map and no non-commercial record is republished.
- **3D files are re-encoded, not decimated.** The seed bakes node transforms, quantises positions (16-bit) and normals (8-bit) under `KHR_mesh_quantization`, and turns the colour texture into a JPEG. The echidna scan went from 8.2 MB to 3.7 MB with every triangle kept.
- **Relief tiles come from Terrain Tiles on AWS** (`elevation-tiles-prod.s3.amazonaws.com`, open CORS, no key). The worker CSP allows that host for images and fetches. Heights read on click are divided by the exaggeration.
- **Full-screen layers sit on the body** (as the old wiki map did), above the app shell; the entry panel sheet still opens above them.
- **Labels never overlap.** Axis titles, axis ends and ticks are drawn by priority, and one that would touch a drawn label is left out.

### Still to build

1. The starter-data command with Wikidata, OpenStreetMap, Glottolog, GBIF, GloBI, NASA POWER and the OpenAlex topics snapshot (world model doc §7). The viewer seed is a hand-picked first step: 2 models, 4 species, 5 landforms, 1 image set, 1 recording, 1 dataset.
2. Schemes as lenses (ILC2, IDS and Concepticon, OpenAlex topics, Marble) and crosswalks computed with embeddings and confirmed by people (§5.5 and §5.6). *Bidang ilmu* then reads real topics.
3. Pre-computed embeddings for things and the "meaning" arrangement (§7.3).
4. *Dipakai untuk* statements so that *Kebutuhan* fills, empty regions linked to questions, and depth and voice filters (§9).
5. Community and controlled access tiers with the request flow, protocols as ODRL policies, and Local Contexts labels (data observatory doc §4.1 and §7).
6. Viewers for more modalities (DuckDB-Wasm tables, PMTiles layers, IIIF images) and the place data pack (data observatory doc §6 and §11). A 3D object made or held by a Papuan community, shared with its consent, should replace the stand-ins: today one model is a museum specimen of a Papuan animal and the other an axe whose origin is not recorded.
7. A steward screen for reviewing dataset records, viewer records and coordinates. The API exists for datasets and coordinates; viewer records are a static file for now.
8. Share cards (`src/share.ts`) for `/wiki/peta` and `/wiki/lihat/:id`. They fall back to the default card today.
