# Strata as an open data observatory: scope, data model, modalities, access and deployment

20 November 2026. Design research; no product code changed. Marks: *(proposal)*, *(not measured)*, *(to verify)*, *(roadmap)*. Names follow `../naming.md` and sentences follow `../voice.md`. This note sits beside [world-model-and-starter-data-2026-11-20.md](world-model-and-starter-data-2026-11-20.md), which defines how a people's world is modelled and seeded. This note defines what else the observatory holds, how people see it, who may use what, and where it runs. Sources are at the end.

## 1. In one paragraph

The owner wants the observatory to become the place where anyone finds up-to-date public and communal knowledge about a place and its peoples. That knowledge includes cultural and scientific datasets and artifacts as well as the wiki. Strata should hold the **record** of each dataset or artifact (what it is, where it comes from, what it is about, who may use it and how it changed), show it in a **viewer** made for its kind of data, and connect it to the world model. Aksara works as the librarian. It finds and describes data, answers "what exists about this place", routes requests for restricted data to the right stewards, and prepares starting packs for researchers and local governments. Strata stays a public observatory and social platform. It does not become a GIS, a CAD program or a records system. It embeds open, standard viewers and links out to specialised software. Restricted originals stay on Aksara Nodes or with their custodians, and Strata holds only the catalogue entry and the route to ask. Two deployment profiles share one data model. An **edge profile** on Cloudflare is the wedge, and a **server profile** on a VPS or the community's own hardware can carry heavy data and heavy viewers.

## 2. What the owner asked

From 20 November, lightly edited:

- Lean into a comprehensive data observatory. Anything public and communal belongs here, from cultural to scientific knowledge, datasets and artifacts. People should be able to build on the seed toward a fuller observatory, as far as computers can represent reality and as far as we can feasibly implement it. Use AT Protocol where it applies and where it is safe.
- Cloudflare is the wedge. The other deployment path on real servers or a VPS could support far more, such as a CAD viewer, GIS, dossiers of documents or public policy, and the world model. Keep pushing the technical limits.
- Do not become an everything burger or rebuild specialised software. Check whether the data model can support many more modalities, ideally all of them, with a separate polyglot database later. This is roadmap material, not work for now.
- The two screenshots (a feature on speech data in psychosis research, and a regency in Papua Barat receiving digital products from a university team) are things to think about, not features to copy.
- People should come to the site for up-to-date data from the platform and the public, with Aksara as librarian and steward.
- Help researchers find data for their research, with proper permission. Local Contexts could perhaps be enforced as code with AT Protocol.
- Help local governments find starting points for their work.
- The Aksara Node is for anything internal.
- Flesh out the framing, use cases, app views, modalities and dataset viewers.

## 3. The boundary: what Strata is and is not

Strata is three things joined together:

1. **A social platform for a place** (posts, communities, events, news). This is unchanged.
2. **A record of what is known**: the world model with things, statements, witnesses and voices.
3. **A catalogue of data and artifacts**, each with a record, a viewer, its links to the world model and its access rules. This note adds this part.

Strata is not, and should not become, specialised software. A rule of thumb keeps the boundary clear *(proposal)*:

- **View in Strata** when an open, standard browser viewer exists for the format, and when viewing is what most readers need. Examples are a map layer, a table, a scanned page, a recording, a 3D scan and a building model.
- **Link out** when the work needs editing, heavy analysis or a professional tool. Examples are editing a CAD drawing, running a hydrological model and managing population records.
- **Never hold** restricted originals on the public node. They stay on an Aksara Node, with the custodian, or in a trusted research environment. Strata holds the catalogue entry, the protocol and the route to ask.

This follows rules that already exist in `AGENTS.md`. Private content never enters public records, search or exports. Custodial originals and approved public derivatives are different records with different identifiers. Access is checked at the time of use.

## 4. What belongs in the observatory

The admission test has three parts *(proposal)*:

1. **Public or communal.** The item is published under an open licence, is public by law (for example government statistics and regulations), or a community has decided to share it at some level.
2. **About a place, a people or their world.** It must link to at least one place and one thing in the world model. A dataset that is about nothing in the deployment does not belong in it.
3. **Sourced.** It has a publisher, a licence or protocol, and a date.

Within that test, the scope is as wide as the world model. The following kinds of data and artifacts all qualify:

- statistics, laws, budgets and public plans;
- maps, satellite products and terrain;
- species records, sound recordings and ecological interactions;
- word lists, dictionaries, grammars and corpora;
- archives, photographs, manuscripts and films;
- 3D scans of objects and places;
- building and infrastructure models;
- papers, theses and reports;
- the commons' own exports.

### 4.1 Three access tiers cover every item *(proposal)*

| Tier | Interface label | Who can see the record | Who can use the data | Examples |
| --- | --- | --- | --- | --- |
| Open | *Terbuka* | Everyone | Everyone, under the licence | BPS tables, OpenStreetMap layers, GBIF records, published word lists |
| Community | *Komunitas* | Everyone sees that it exists, unless the community hides even that | Members, under the community's protocol | A language community's recordings, a clan's map layer |
| Controlled | *Atas permintaan* | Everyone sees that it exists and how to ask | Approved people for an approved purpose, in an approved setting | Clinical speech data, sensitive locations, unpublished archives |

The controlled tier follows the **Five Safes** framework, which trusted research environments use to decide on access to sensitive data. It asks five questions. Is the use appropriate (safe projects)? Can the users be trusted (safe people)? Does the facility prevent unauthorised use (safe settings)? Is there a disclosure risk in the data (safe data)? Are the results non-disclosive (safe outputs)? Strata answers the first two through a request and a steward's decision. The custodian answers the last three, because the data never sits on the public node.

The first screenshot shows why this tier matters. The DISCOURSE consortium's first public dataset holds audio recordings, transcripts and tables from people in early-stage psychosis. Access is granted by the consortium's Data Access Committee to approved researchers. A catalogue that lists such data, explains how to ask and never stores it is the right pattern for health, conflict and sacred material in Strata.

## 5. The data model: a dataset record beside the world model

### 5.1 A dataset is a new record kind that links to things *(proposal)*

The world model already has things, statements and witnesses. This note adds one record kind, the **dataset** (*Dataset*, with *Katalog data* as the interface label for the list). A dataset can be a table, a map layer, a collection of images, a 3D scan, a corpus or a single document. Its fields come from published standards rather than from Strata:

| Part | What it records | Standard |
| --- | --- | --- |
| Description | Title, summary, publisher, dates, language, keywords | DCAT 3 and schema.org Dataset |
| Distributions | Each file or service, with its format, size, checksum and URL | DCAT 3 (`dcat:Distribution`, `spdx:checksum`) |
| Versions and series | Earlier versions, the current one, and series such as yearly statistics | DCAT 3 versioning and `dcat:DatasetSeries` |
| Structure | Fields, types and units, so a viewer and a machine-learning loader know the shape | Croissant, which builds on schema.org Dataset |
| Package | A folder of files with its own metadata, for archives and research outputs | RO-Crate |
| About | Links to things in the world model (*Hal*): places, beings, practices | Strata's knowledge model |
| Access | Tier, licence, community protocol, Local Contexts labels and notices | ODRL policy, generated (section 7) |
| Lineage | Which datasets or records this one was derived from, and how | DCAT and PROV relations *(to verify the exact terms)* |
| Indonesian rules | Standard data, metadata, interoperability, and reference codes such as BPS region codes | Satu Data Indonesia (Perpres 39/2019) |

DCAT is the W3C vocabulary for describing datasets and data services in catalogs so that metadata from many catalogs can be gathered together. Version 3 adds checksums for distributions, version properties and dataset series. Croissant is a community metadata format for machine-learning datasets that builds on schema.org Dataset. It is supported by Kaggle, Hugging Face and OpenML and by the main ML frameworks. Using both means that a Strata catalogue can be harvested by government portals and research search engines, and that its datasets load directly into analysis tools.

Satu Data Indonesia requires four principles: data meets a data standard, has metadata, follows interoperability rules, and uses reference codes or master data. Strata's record meets all four if every dataset carries DCAT metadata, a declared structure, open formats and official region codes. This lets a regency publish through Strata and still meet national rules.

### 5.2 Datasets connect to the world model in both directions

- A dataset is **about** things. A rainfall table is about a place and a season. A photograph collection is about a practice and a people. A building model is about a school.
- A dataset can be a **witness** for statements. A measurement in a table supports a statement in the same way as an excerpt does now. The existing `witnessKinds` already include `measurement` and `derived`.
- A thing's page lists the **datasets about it**, grouped by kind, and the dataset page lists the **things it is about**.

This is what turns a catalogue into an observatory. A reader who opens the sago palm finds the wiki statements, the GBIF records, a sound recording of the swamp, a satellite layer of sago swamps, two papers and a community's word list. Each of these is shown in its own viewer and governed by its own access rules.

### 5.3 Communities can build on the seed

Anyone with an account can propose a dataset record, as anyone can post now. A steward accepts it into the catalogue, as stewards accept wiki changes now. Aksara can draft records from harvested sources. Every record shows who proposed it, who accepted it and when. A community can also publish a **derived dataset**, for example a cleaned table, a new map layer or a translated word list, with its lineage pointing back to the sources. Over time, the seed becomes a fuller observatory that the deployment's own people have made.

## 6. Modalities and viewers

Strata shows each kind of data with an open, standard viewer. The table lists the format to store, the viewer to embed, and whether it fits the edge profile, the server profile or both. Edge-friendly formats are **cloud-native**, which means that a browser reads only the bytes it needs from one file through HTTP range requests, with no server in the middle.

| Modality | Store as | Viewer in the browser | Edge | Server | Notes |
| --- | --- | --- | --- | --- | --- |
| Tables and statistics | Parquet, CSV | DuckDB-Wasm for SQL in the browser, plus a chart component | Yes | Yes | DuckDB-Wasm reads Parquet, CSV and JSON from HTTP and fetches only the parts it needs through range requests |
| Map layers (vector) | PMTiles, GeoParquet | MapLibre GL | Yes | Yes | PMTiles is one file of map tiles that MapLibre reads through range requests from storage such as R2, with no tile server |
| Rasters and satellite products | Cloud Optimized GeoTIFF, Zarr | MapLibre with raster sources; a small COG reader | Yes, for tiles | Yes | TESSERA embeddings are already streamed as Zarr |
| Point clouds (LiDAR, photogrammetry) | COPC (cloud-optimised LAZ) | Potree or copc.js | Partly | Yes | Potree renders billions of points in a browser |
| 3D objects and scans | glTF | three.js, already in the web app's world | Yes | Yes | Museum objects, carvings, noken |
| Gaussian splats of places and objects | SPZ, PLY, streamed formats | Spark for three.js | Partly | Yes | Spark is an open 3D Gaussian splatting renderer for three.js |
| Building and infrastructure models (BIM) | IFC | That Open Company's web-ifc engine | No | Yes | web-ifc reads and writes IFC in the browser at native speed through WebAssembly; still pre-alpha |
| CAD drawings | DXF, converted to SVG or glTF on the server | SVG or three.js | No | Yes | Conversion runs on the server; editing stays in CAD software |
| Images, scans, manuscripts | JPEG 2000 or tiled JPEG behind a IIIF Image API | OpenSeadragon or Mirador | Static IIIF tiles only | Yes | IIIF is the standard way for libraries, archives and museums to deliver images and their structure |
| Documents and policy texts | PDF, HTML, plain text | PDF.js and the existing reader | Yes | Yes | A *Berkas* (dossier) groups documents about one issue or place |
| Audio | Opus or MP3 with WebVTT transcript | A waveform player with the transcript beside it | Yes | Yes | Voice posts, songs, recordings of forests |
| Video | HLS or MP4 with WebVTT captions | The browser player | Yes, through Cloudflare Stream or R2 | Yes | Practice videos, films |
| Word lists and dictionaries | CLDF | The community dictionary views | Yes | Yes | Links to Concepticon and Glottolog |
| Time series and sensors | Parquet, NetCDF | A chart component; the time view in the world model doc | Yes | Yes | Weather, river levels, air quality |
| Networks and graphs | The knowledge model; GraphML exports | The existing canvas map | Yes | Yes | Already built |
| Models and classifiers | ONNX, with a model card | A card and a "try it" panel where safe | Yes, for small models | Yes | Community land classifiers (the satellite flagship), small language taggers |

Two rules keep the viewers maintainable:

- **One viewer component per modality.** Each viewer reads a distribution from the dataset record and nothing else. A new modality means one new component and one entry in the table above.
- **Load viewers only when needed.** Heavy libraries such as DuckDB-Wasm, Potree and web-ifc load when a reader opens that kind of data, so phones on slow connections do not pay for them.

## 7. Access as code: Local Contexts, protocols and AT Protocol

### 7.1 A protocol becomes a machine-readable policy *(proposal)*

Every dataset and record already carries a community protocol in Strata's model. This note proposes compiling each protocol into an **ODRL** policy. ODRL is the W3C information model for statements that permit, prohibit or require actions on content. Its basic rule is that any use not explicitly permitted is prohibited. The compiled policy states:

- the permitted actions (read, display, download, derive, train a model, cite), each for a party (everyone, members, approved requesters);
- the prohibited actions (commercial use, publishing exact locations);
- the duties (attribute the community, report outputs, delete after the project ends);
- the Local Contexts labels and notices that apply.

The policy does not enforce anything by itself. Strata's server checks it at every read, export and model run, as it checks access today. Local Contexts' own position is the same: a label states a responsibility, and a system must honour it. Labels come from the community's Local Contexts Hub project when one exists. API v2 of the Hub needs a key, and platforms can become certified integration partners.

### 7.2 AT Protocol carries what is safe to carry

| What | On AT Protocol? | Why |
| --- | --- | --- |
| Public dataset records (catalogue entries) | Yes, as a Strata lexicon | Other apps and catalogues can find them; the community's account signs them |
| Public statements and derived datasets | Yes | Portable and attributable |
| Policies and labels attached to public records | Yes, as records that reference the dataset | Apps can read the rules with the data |
| Community-tier records | Only inside AT Protocol spaces, under the 19 November design | Spaces keep them out of the public firehose |
| Controlled-tier data and restricted originals | Never | They stay with the custodian or on an Aksara Node |
| Large files | Referenced by URL and checksum, not stored in repositories | Object storage serves them; the record proves which bytes are meant |

## 8. Two deployment profiles share one data model

| | Edge profile (the wedge) | Server profile *(roadmap)* |
| --- | --- | --- |
| Runs on | Cloudflare Workers, SQLite Durable Objects, R2 | A VPS, a university server, a regency data centre, or an Aksara Node |
| Engine | Today's Worker build | The same TypeScript engine on Node, which already runs locally with SQLite |
| Records | SQLite in Durable Objects, up to 10 GB per object | PostgreSQL, with PostGIS for space and pgvector for embeddings |
| Files | R2, which has no egress fees | Any S3-compatible object store |
| Analytics | Parquet files in R2, queried in the reader's browser with DuckDB-Wasm | DuckDB or another column store on the server |
| Maps | PMTiles in R2 | PMTiles, plus a tile server for live layers |
| Images | Static IIIF tiles generated at build time | A IIIF image server |
| Heavy viewers | Viewers that read cloud-native files | All viewers, including IFC, large point clouds and server-side conversion |
| Builds | CI jobs (GitHub Actions) | Workers on the server, with an optional GPU for BioCLIP 2, Perch or ASR |
| Best for | A new deployment, low cost, global reach | Large archives, sensitive hosting, institutions that must keep data in country |

The limits that decide when to move are known. A D1 database holds at most 10 GB, and that limit cannot be raised. SQLite-backed Durable Objects are generally available with a 10 GB database per object. Strata already spreads data across objects, so a deployment reaches the server profile because of heavy files, heavy processing or rules about where data is kept, not because of record count.

The **polyglot store** in the server profile is a roadmap item. One rule keeps it sane: there is one source of truth per record kind. Records live in the relational store. Files live in object storage. Every other store (columns, vectors, tiles, search indexes) is a **projection** that can be rebuilt from those two. This is the same rule the knowledge portal follows today, where static files are rebuilt from the model's export.

## 9. Aksara as librarian

The resident Aksara already gathers news, finds sources and drafts wiki pages. For the observatory it takes on six more duties *(proposal)*:

1. **Harvest.** Read DCAT catalogues (national and regional open data portals, research repositories) and propose records for datasets about the deployment's places.
2. **Describe.** Draft the record, the structure and the links to things, and send it to a steward.
3. **Answer.** Reply to "what data exists about X" with a list of datasets, each with its tier and its viewer.
4. **Route requests.** For controlled data, collect the requester's purpose and send it to the custodian's stewards. Aksara never grants access itself.
5. **Prepare packs.** Build a *Paket data wilayah* (place data pack) for a place: a short list of the most useful datasets, with a one-page summary written from them.
6. **Watch.** Report when a dataset gets a new version, when a source disappears, or when a community withdraws something.

Each duty runs under the community's rules and the mandates in the resident code. Each output carries its AI label and its sources.

## 10. Use cases

### 10.1 A linguist looks for Ekari speech data

The linguist searches the catalogue for Ekari. The result is grouped by tier:

- **Open:** the published word lists from TransNewGuinea.org and Lexibank, shown in the dictionary viewer with their sources, and older dictionaries with their licences.
- **Community:** the Mee language community's dictionary, which lists that it exists, how many entries members have checked, and its protocol.
- **Controlled:** a set of recordings, with an *Ajukan permintaan* (submit a request) button.

The linguist states a purpose, and the community's stewards decide. If they agree, the linguist gets access in the setting that the stewards choose, under duties such as attribution and returning results. Every step is recorded.

### 10.2 A regency looks for a starting point

The second screenshot shows a pattern that repeats across Papua. A university team spends a few months in a regency, builds useful digital products, and hands them over. In Manokwari Selatan in 2026, a team from ITS built a web system for population documents, a digital health data warehouse for health facilities and a scholarship form. Each team starts from almost nothing and learns the place again.

The observatory gives a regency, and every team that comes to help it, the same starting point *(proposal)*:

- a place data pack with the regency's public statistics, maps of villages, roads, schools and clinics from OpenStreetMap, health and climate indicators, and the world model of its peoples and lands;
- a list of **public work** for the regency (*Kerja publik*, already built): what has been built, by whom, whether it is still running and who maintains it;
- dataset records for the regency's own open data, with Satu Data metadata, so the next team can find them;
- a place for residents to say whether a service helps them, in the regency's community on ETNOS.

The records name roles and institutions, not individual officials.

### 10.3 A lembaga adat prepares evidence about its land

A community maps its own land categories with pins and voice notes in a private space. It uses the satellite classifier from the world model flagship, and it combines the result with public forest-change data. It then publishes a derived map at the resolution it chooses, under its protocol. The observatory keeps the lineage, so a ministry or a court can see where each layer came from. The community decides what the map is for.

### 10.4 A teacher prepares local content

A teacher opens the world model for the school's district at the *Ringkas* level. The teacher picks the river and its fish, opens a sound recording and a species map, and follows a learning path to the school concept of food chains. The teacher saves a set of links as a lesson. Students answer two questions from the question list as homework, under the community's rules for students.

### 10.5 A health researcher plans a study

The researcher finds that malaria case counts exist at the province level (open), that a regency data warehouse exists (catalogue entry, controlled), and that clinic locations exist in OpenStreetMap (open). Strata never holds patient data. It shows what exists, who holds it and how to ask, and it records the request.

### 10.6 An archive returns images

A museum abroad holds photographs from an expedition a century ago and publishes them through IIIF. Strata shows them in the IIIF viewer with a Local Contexts notice and asks the community to add names and context. The community decides which images stay public and which should be restricted, and the museum receives the community's labels and corrections.

## 11. Views in the app *(proposal)*

| View | Interface label | What it shows |
| --- | --- | --- |
| Observatory front | *Observatorium* (the existing wiki front, rebuilt) | The knowledge map from the world model doc, recent datasets, open questions, a search box |
| Catalogue | *Katalog data* | All datasets, with filters for place, people, level, size and pace, modality, licence, tier and publisher |
| Dataset page | (dataset title) | Description, the viewer, the files, the access tier and protocol, things it is about, lineage, versions, how to cite, who uses it |
| Thing page, new tab | *Data* | Datasets about this thing, grouped by modality |
| Place data pack | *Paket data wilayah* | The curated list and summary for a place |
| Request | *Permintaan akses data* | Purpose, requester, steward decision, duties, log |
| Dossier | *Berkas* | Documents, datasets and statements about one issue, such as a policy, a road or a land dispute, with a timeline |
| Steward desk | inside *Studio* | Records to accept, requests to decide, harvests to check |
| Researcher export | *Unduh untuk penelitian* | DCAT and Croissant metadata, coded things (world model doc §5.5), and files the reader is allowed to have |

## 12. What Strata will not build

- **No editing of specialised formats.** No CAD editing, BIM authoring, GIS editing or video editing. The observatory views these formats and links to proper tools.
- **No records system.** No population register, patient records or case management. These belong to government systems or to Aksara for institutions.
- **No hosting of controlled originals on the public node.** The catalogue entry and the route to ask are enough.
- **No custom file formats** where a standard exists.
- **No ranking of people.** Datasets and things can be ranked by use, but people cannot.

## 13. Order of work

The order follows the plan in the world model doc and adds the observatory in three steps.

1. **Wedge, before 18 to 19 December.**
   - Add the dataset record kind with DCAT and Croissant fields and links to things.
   - Add three viewers: tables (DuckDB-Wasm on Parquet), map layers (PMTiles with MapLibre) and images (static IIIF tiles).
   - Seed the catalogue for Tanah Papua from the starter build sources (section 7.2 of the world model doc).
   - Show a *Data* tab on thing pages.
2. **January to March 2027 *(roadmap)*.**
   - Build the access tiers and the request flow.
   - Compile protocols into ODRL policies.
   - Add audio, video and 3D viewers.
   - Add Aksara's harvest and place-pack duties.
   - Publish a catalogue lexicon on AT Protocol for public records.
3. **Server profile *(roadmap)*.**
   - Run the Node engine with PostgreSQL, PostGIS, pgvector and object storage.
   - Add a IIIF server, point clouds, IFC models and server-side conversion.
   - Run one deployment in a regency or university data centre.

## 14. Risks

- **Scope.** The observatory can grow without end. The admission test (section 4) and the "will not build" list (section 12) are the brakes.
- **Stale data.** A catalogue of outdated datasets misleads people. Every record shows its last check, and Aksara's watch duty flags changes.
- **False sense of permission.** A policy in a record does not stop a person from copying open files. The tiers decide what is ever put on the public node.
- **Viewer weight.** Heavy viewers load only on demand, and phones get a light preview and a list first.
- **Duplication with government portals.** Strata harvests and links to official portals rather than copying them, and it keeps the official publisher as the publisher.

## 15. Open questions for the owner

1. Is *Observatorium* the right interface name for the rebuilt wiki front, or should it stay *Wiki* with *Katalog data* beside it?
2. Should the controlled tier exist in the first release, or only open and community?
3. Which regency would try a place data pack first?
4. Which server should host the first server-profile deployment: a VPS, a university machine or an Aksara Node?
5. Should Strata apply to be a Local Contexts integration partner now, or after the request flow exists?

## 16. Sources

Read or checked on 20 November 2026.

Catalogue and metadata standards
- W3C (2024). Data Catalog Vocabulary (DCAT) Version 3. https://www.w3.org/TR/vocab-dcat-3/
- Akhtar, M. et al. (2024). Croissant: a metadata format for ML-ready datasets. NeurIPS Datasets and Benchmarks; arXiv:2403.19546. https://mlcommons.org/croissant
- Soiland-Reyes, S. et al. (2022). Packaging research artefacts with RO-Crate. *Data Science* 5(2). https://www.researchobject.org/ro-crate/
- W3C (2018). ODRL Information Model 2.2. https://www.w3.org/TR/odrl-model/
- Peraturan Presiden Nomor 39 Tahun 2019 tentang Satu Data Indonesia. https://peraturan.go.id/files/ps39-2019.pdf; Sekretariat Kabinet summary. https://setkab.go.id/presiden-jokowi-tandangani-perpres-no-392019-tentang-satu-data-indonesia/

Access to sensitive data
- Five Safes. UK Data Service, What is the Five Safes framework? https://ukdataservice.ac.uk/help/secure-lab/what-is-the-five-safes-framework/ and https://en.wikipedia.org/wiki/Five_safes
- Cho, B. et al. (2026). The DISCOURSE in psychosis (London Ontario): a speech dataset to examine communication disturbances in early-stage psychosis. *Data in Brief* 65: 112517.
- Palaniyappan, L., Alonso-Sanchez, M. F. and MacWhinney, B. (2022). Is collaborative open science possible with speech data in psychiatric disorders? *Schizophrenia Bulletin*.
- Nautilus (18 November 2026). The speech patterns of psychoses. https://nautil.us/the-speech-patterns-of-psychoses-1286780
- Local Contexts Hub API guide (v2) and integration partners. https://localcontexts.org/support/api-guide/v2/ and https://localcontexts.org/hub-agreements/integration-partners/

Local government example
- ITS News (2026). Tim Ekspedisi Patriot ITS work in Manokwari Selatan: digital population services, a health data warehouse, and other programmes. https://www.its.ac.id/news/pangkas-jarak-ratusan-kilometer-patriot-its-rancang-layanan-kependudukan-digital/ and https://rri.co.id/surabaya/iptek/2729117/tep-its-hadirkan-solusi-teknologi-untuk-papua-barat

Viewers and formats
- DuckDB-Wasm. Kohn, A. et al. (2022). DuckDB-Wasm: fast analytical processing for the web. *PVLDB* 15(12); https://duckdb.org/docs/current/clients/wasm/overview
- PMTiles. https://github.com/protomaps/PMTiles and https://docs.protomaps.com/pmtiles/
- International Image Interoperability Framework. https://iiif.io and https://iiif.harvard.edu/about-iiif
- Schütz, M. (2016). Potree: rendering large point clouds in web browsers. TU Wien; COPC support in Potree, https://github.com/potree/potree/pull/1381
- Spark, a 3D Gaussian splatting renderer for three.js. https://github.com/sparkjsdev/spark
- web-ifc by That Open Company. https://github.com/ThatOpen/engine_web-ifc

Hosting limits
- Cloudflare D1 limits. https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare Durable Objects limits and SQLite storage. https://developers.cloudflare.com/durable-objects/platform/limits/
- Cloudflare storage overview (R2 without egress fees). https://developers.cloudflare.com/workers/reference/storage/overview/
