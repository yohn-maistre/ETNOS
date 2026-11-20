# Detak Detik, and data sources for biodiversity, terrain and cultural objects

16 November 2026. Research for ETNOS. Part 1 reads the owner's earlier project. Part 2 checks current data sources. Part 3 proposes features and ties each to the six coordinates in `knowledge/knowledge-map-design-2026-11-16.md` (Tempat, Waktu, Ranah, Bentuk budaya, Suara, Dasar).

How to read the evidence. "Measured today" means I ran the query on 16 November 2026. "Reported" means a web page says it, and I did not re-check. "Not checked" means what it says. Counts from keyword searches are rough. They include noise.

## Short answers

1. Detak Detik gives ETNOS five good habits: a reviewed registry as the floor, a live fetch that may only add, licence and credit captured per image, a fact gate that is code and not prompt, and a visible absence ("no row" is shown, not hidden). It also shows five traps: sample data on a real page, a gate that ignores small numbers, "verbatim" text that is wrong, hand-curated lists with no community write path, and Papua material treated as a lens about conflict only.
2. Open data is good for species and terrain, thin for local names, and mixed for museum objects. GBIF is the strongest source: 608,324 occurrence records in a box around Western New Guinea, all under CC0, CC BY or CC BY-NC. The Met has the metadata but no usable Asmat images. Only the Dutch Wereldmuseum (linked data, CC0) and Europeana are open at scale for objects. The British Museum and the Musée du quai Branly have no usable open API.
3. IUCN data cannot be redistributed, even through an API or an open dataset. This conflicts with the "open dataset now" decision for any IUCN field except the category label. Plan around it.
4. The best first build is a map of where Papuan natural-history specimens are held (GBIF, clean and open). It builds the machinery for the harder objects map.
5. No open dataset of species names in Papuan languages exists at scale. There are small, real ones (Ambel tree names, CC BY 4.0). This gap is also the opportunity.
6. Sacred objects and human remains: record that they exist and where they are held. Do not show images. Default to hidden. A community lifts the default, not ETNOS.

---

# Part 1. Detak Detik (`/home/user/yohn-maistre/detak-detik`)

What I read: `README.md`, `AGENTS.md`, `docs/CLAUDE.md`, `docs/NEWSROOM.md`, `docs/AMD-LENSES-PAPUA.md`, `docs/research/2026-06-27-act-iii-data-and-components.md`, `docs/research/act3-revamp-brief.md`, `etl/`, the newsroom Python (`main.py`, `gate.py`, `llm.py`, `ilmu.py`, `sari.py`, desks and sources for Papua), `worker/src/index.ts`, `scripts/atlas/refresh-hayati.py`, the registries in `newsroom/data/atlas/`, and the Act III islands. I did not read all 47 islands or all 25,000 lines of data files. The repo is a snapshot of mid-July 2026 (60 archived editions in `arsip/`).

## 1.1 What it is

An automated daily newspaper for Indonesia, in Indonesian. Static Astro site, Svelte 5 islands, one stateless Cloudflare Worker, and a Python "newsroom" that runs twice a day in GitHub Actions on free tiers. Three acts: Pagi (neutral national statistics), Malam (investigation by data), Nusantara (the "Atlas": culture and nature). Status in the README: pre-launch, with sample data marked `(data contoh)`.

Six "iron laws" (`README.md`, `docs/CLAUDE.md` section 2): citation or silence; two lanes never crossed; documents speak and nobody accuses; one command vocabulary; shared edition for all readers; local-first with no tracking. Law 5 in the code means a deterministic daily rotation (`HARI % list.length`), so two readers see the same plate on the same day.

## 1.2 The sections you asked about

| Section (file) | What it does | Data and licence | Notes |
| --- | --- | --- | --- |
| **Wajah Nusantara**, people profile (`src/islands/WajahNusantara.svelte`, `newsroom/data/atlas/manusia.json`) | One people per half day. Shows the reviewed Wikipedia lead, then up to 3 whole sections of the article, a pull-quote, an engraved plate, a locator map, language, and "warisan" items (e.g. Mege shell money, koteka, emawa for Suku Mee). | 20 peoples, 10 of them Papuan: Mee, Dani, Asmat, Amungme, Kamoro, Biak, Marind, Yali, Korowai, Sentani. Text from id.wikipedia (CC BY-SA). Image URL, licence and credit stored per entry (e.g. "CC BY-SA 4.0, via Wikimedia Commons"). Heritage items hand-written, each with a source string. | The registry is the floor. A live fetch (`api.php?...prop=extracts&explaintext=1`) may lengthen the text, never shorten it. Section titles like "Daftar pustaka" are skipped by a regex. |
| **Zona Hayati**, biodiversity (`ZonaHayati.svelte`, `hayati.json`, `scripts/atlas/refresh-hayati.py`) | Wallace (1859) and Weber (1904) lines as the control. Click one of three realms, see that realm's species ledger sorted by extinction risk. | 43 species. 10 are Papuan (birds of paradise, tree kangaroo, cassowary, echidna, pig-nosed turtle, New Guinea crocodile). Refresh script re-pulls: id.wikipedia lead, Commons licence and credit, and the IUCN category from GBIF `/species/{key}/iucnRedListCategory`. | Honest "NE" (not evaluated) footnote. One point coordinate per species. All Papua is one bucket ("Sahul"). |
| **Galeri / Rupa**, art (`GaleriNusantara.svelte`, `rupa.json`) | One public-domain painting a day with a museum-label caption and a provenance line. | 5 paintings. Image from the id.wikipedia article lead. | If the image fails, an engraved plate stands in. |
| **Pustaka & Pikiran**, books (`PustakaPikiran.svelte`, `pustaka.json`, `refresh-pustaka.py`) | Ten writers on a "shelf". The calendar pulls one forward. Verbatim encyclopedia lead and a curated note about the work. | 10 entries (Kartini and others). None Papuan. | Text-led. Click pins a card (a phone tap must not navigate blind). |
| **Almanak** and the research shelf (`AlmanakSains.svelte`, `almanak.json`, `jurnal.json`, `newsroom/ilmu.py`) | Four shelves (Langit, Bumi, Hayat, Angka). Sky column: moon drawn at its true phase, computed locally (`src/lib/langit.ts`). Research shelf: the month's Crossref papers that mention Indonesia, picked by a model. | Crossref (open metadata). Moon and sun are computed. Sample arithmetic uses published figures. | `ilmu.py` keeps picks across editions, retires them after about 28 editions, and leaves the old stash alone if the API or model is down. Labelled machine-picked. |
| **Bahasa 718** (`Bahasa718.svelte`) | A tally mark per language, and the word for "water" in one language a day. | 20 hand-entered words. Only one Papuan language (Biak: "war"). The count of "falling silent" languages (24) is marked illustrative. | The Glottolog CLDF upgrade (CC BY 4.0) is only in the research note, not built. |
| **Rimba Hidup** (`RimbaHidup.svelte`) | A seeded flock of ink birds that synchronise, with a hawk, a drawn coastline and the computed moon. | No data claims. Deterministic seed. | Mood piece. |
| **Tugu Rakyat** (`TuguRakyat.svelte`) | A shared pixel canvas with a fixed palette and no free text. | Local only in this build. A Durable Object version is planned. | "A mural that cannot spell a slur." |
| **Suku Lokasi** (`SukuLokasi.svelte`, `src/lib/atlas-dots.ts`) | A small locator: a dotted raster of the archipelago, home province inked darker, a seal ring on the point. | Province raster built from BPS-coded boundaries. | Cheap, printable, readable on a phone. |
| **Engraved fallback** (`src/lib/engrave.ts`) | Hatched land, stippled sea, faint graticule. The frame is never blank. | Computed. | Direct ancestor of the terrain plates in Part 3. |
| **Papua lens** (`docs/AMD-LENSES-PAPUA.md`; code: `newsroom/desks/papua.py`, `sources/papua.py`) | Design: displacement figures, concession overlaps, a "Yang Tidak Dihitung" table where the official row is empty, an "Indeks Keheningan" map of missing statistics. | Code today: a seed file with the special-autonomy allocation and the poverty gap. The rest is design. | Strong ideas. A staging gate means displacement figures (Lane C, from human-rights reports) never publish automatically. Conflict-centred, not culture-centred. |

## 1.3 Where the data comes from

| Need | Source | Access | How Detak Detik uses it |
| --- | --- | --- | --- |
| Species photos and status | GBIF occurrence search (`mediaType=StillImage`, licence filter) and `/species/{key}/iucnRedListCategory` | Keyless, CORS open | Daily plate and risk code. Notes that many records are CC BY-NC, so it filters. |
| IUCN detail | IUCN Red List API v4 | Free token | Planned, newsroom lane only. Not built. |
| People, species, paintings text and lead image | id.wikipedia REST summary and Action API | Keyless | Verbatim lead, then live extension. |
| Image licence and credit | Commons `imageinfo` with `extmetadata` | Keyless; spaced at least 2.2 s between calls (`WM_GAP`) | Stored with every image. |
| Heritage, languages, events | Wikidata SPARQL (CC0), UNESCO ICH list, Glottolog CLDF | Keyless or bulk | Mostly planned in `2026-06-27-act-iii-data-and-components.md`. |
| Archive art | Rijksmuseum data services, Commons categories (Tropenmuseum, KITLV) | Rijksmuseum key dropped in later notes; Commons keyless | Planned. NMVW direct API listed as "unverified", so reached through Commons. |
| Money, courts, forests, prices | BPS WebAPI, DJPK, GFW, PIHPS, putusan MA, BMKG | Mixed. Many `.go.id` portals return 403 to scripts | `etl/sources.ts` records status and "fragility" per source. |

## 1.4 How the ETL and the automated writing work

1. **Schedule.** `.github/workflows/newsroom.yml` runs at 21:32 and 09:32 UTC (04:32 and 16:32 WIB), off the hour to dodge cron jitter. `newsroom/main.py` numbers editions deterministically from a start date.
2. **Gather.** One `gather_*` function per beat returns corpus rows (`id` plus numeric values) and raw rows. A dark source degrades that beat only. `etl/README.md`: each source is its own job, "one dead portal never fails the run", and a dark source becomes a story.
3. **Detect, then narrate.** Detection is deterministic (rules in code). The model only phrases a finding as a typed object (Pydantic AI `Temuan`). `docs/NEWSROOM.md`: "detection is deterministic, narration is the model's only job."
4. **Fact gate** (`newsroom/gate.py`). Plain code. Every cited id must exist in the corpus. Every number of 100 or more in the headline or body must match a cited row within 0.5 percent. A failure raises `ModelRetry(reason)` and the model redrafts with that reason. No appeal.
5. **Lawyer pass** (`lawyer.py`, rules in `docs/EDITORIAL_GUIDELINES.md`). A second model call removes intent, accusation and implied causation. "Documents speak, nobody accuses."
6. **Editor** ranks and picks the lead. **Layout desk** writes a 10 to 15 second opening camera move.
7. **Summaries** (`sari.py`). Two-sentence overviews of news clusters, accepted only if bounded, link-free, and every number appears in the evidence. A failing summary is dropped, not repaired. Labelled `SARI · LANE C`.
8. **Model lane** (`llm.py`). NVIDIA NIM first, then Groq, OpenRouter, Gemini, all free tiers, through LiteLLM and a Pydantic AI `FallbackModel`. With no key, desks write a deterministic number-only finding.
9. **Publish.** The Python job posts `edisi.json` to Worker KV. The browser renders it. The Worker (`worker/src/index.ts`) is stateless: `/ask`, `/tour`, `/ticker` (hourly RSS pass-through, headline and link only, "no model ever touches this lane"), and a Workers AI fallback with a Sea-Lion model tuned for Indonesian.
10. **Three lanes.** A = verbatim RSS. B = derived from structured data through the gate. C = staged, labelled, human-gated (displacement figures; machine-picked papers).

## 1.5 What worked well

- **Registry as floor, live fetch as extension** (`WajahNusantara.svelte`): the frame is never empty and text is never worse than what was reviewed.
- **Licence and credit captured at refresh time**, per image, in the registry. Attribution is data, not a manual step.
- **Gate as code.** A cheap model becomes a throughput problem, not a truth problem. Detection in rules, wording by model.
- **Absence shown.** The "NE" footnote, the empty-row table, the idea that a missing BPS row is a fact. This matches ETNOS "Belum tercatat".
- **Deterministic rotation** gives a shared page and is testable.
- **Persistent stash with age-out** (`ilmu.py`): a dark source never erases yesterday's work.
- **Polite fetching**: honest user agent, spacing between Wikimedia calls, a source ledger with "fragility" (`etl/sources.ts`).
- **Engraved fallback** keeps every frame alive and prints well.

## 1.6 What to watch (found while reading)

- **Sample data on a live page.** The README says every figure is sample until the pipeline replaces it. ETNOS must not do this for cultural claims.
- **Verbatim is not the same as correct.** The stored Badak jawa extract in `hayati.json` reads "panjang tubuh 31–32 m (102–105 ft) dan tinggi 14–17 m". That is a decimal-comma slip (should be about 3.1–3.2 m and 1.4–1.7 m). The text is "citation-clean" and wrong. A verbatim lane needs a number sanity check and a human review.
- **The gate skips numbers under 100** (`gate.py`: `if n is None or n < 100: continue`). Years and small counts pass unchecked. For ETNOS, years and counts are central claims.
- **The gate checks numbers, not meaning.** It cannot catch a true number attached to the wrong claim.
- **Hand-curated lists.** 20 peoples, 43 species, 10 writers, edited by one person. No way for a community to add or correct.
- **Wikipedia is the only voice** for the peoples. ETNOS's Suara coordinate exists because of this.
- **One coordinate per species and one realm for all of Papua** is too coarse for a Papua commons.
- **WAF blocking.** `.go.id` portals return 403 to scripts. I saw the same today on `dapobud.kemenbud.go.id`.
- **Papua lens is a conflict lens.** Sound design (staging gate, no accusation), but ETNOS wants culture and ecology first.

## 1.7 Adopt, adapt, improve

| Idea (Detak Detik file) | Verdict | What ETNOS does |
| --- | --- | --- |
| Registry floor plus live extension (`WajahNusantara.svelte`) | Adopt | Wiki pages and verified sentences are the floor. Any live fetch only adds, and shows its source. |
| Licence and credit stored per image (`refresh-hayati.py`) | Adopt | Store licence, creator, source URL, `retrieved_at` and a content hash with every file and every museum record. |
| Source ledger with fragility (`etl/sources.ts`) and provenance columns (`etl/README.md`) | Adopt | One `sources` table. Each source is its own job. A dark source becomes an item on the map ("Belum tercatat"). |
| Fact gate in code (`gate.py`) | Adapt | ETNOS cites sentences, not rows. Gate rule: every sentence needs a source span. Also check numbers of any size and years. Keep the retry-with-reason loop. |
| Lanes A, B, C | Adapt | Verbatim source, derived from structured data, model-written and labelled unverified in a fold (matches the knowledge-map design). |
| Stash with age-out (`ilmu.py`) | Adopt | For Aksara's picks and reading paths. |
| Absence as content ("Yang Tidak Dihitung", `AMD-LENSES-PAPUA.md`) | Adopt, expand | Becomes the Belum tercatat lens. Part 3 uses it for registries (WBTb) and for museum holdings with no record of origin. |
| Deterministic daily rotation | Adapt | Fine for the front door. Add a "random object, with its trail" button. |
| Dotted raster map and engraved plate (`atlas-dots.ts`, `engrave.ts`) | Adopt | Basis for the terrain plate style and for locator figures on cards. |
| Zona Hayati realms | Improve | Replace three realms with bioregions of New Guinea and customary regions, and real occurrence polygons from GBIF. |
| Wajah text from Wikipedia only | Improve | Community text first, Wikipedia second and labelled. |
| Sample numbers, "illustrative" counts | Do not copy | Show nothing rather than an invented number. |
| Gate ignores numbers under 100 | Do not copy | Check all numbers. |
| Tugu Rakyat | Skip | Not relevant to the commons. |

---

# Part 2. Current data sources (checked 16 November 2026)

## 2.1 Species

| Source | Access | Licence and terms | What I measured or read | Use for ETNOS |
| --- | --- | --- | --- | --- |
| **GBIF occurrences** (`api.gbif.org/v1/occurrence/search`) | Keyless read. Downloads need an account and give a DOI. | Per dataset: CC0, CC BY 4.0, CC BY-NC 4.0. Cite by dataset. | Box 129.0–141.1°E, 9.5°S–0.5°N (Western New Guinea plus Aru, Kai, Tanimbar and a sliver of PNG, so overcounts): **608,324 records**. Licences: CC BY 371,073; CC0 128,600; CC BY-NC 108,651. Basis: 364,729 human observations; 210,352 preserved specimens; 13,852 material samples; 849 living specimens. About 24,980 distinct species keys. Top datasets: eBird 252,900 (CC BY); iNaturalist research-grade 80,073 (CC BY-NC); Naturalis botany 49,747 and Lepidoptera 25,865 (CC0); Kew herbarium 15,880 (CC BY); Australian Museum OZCAM 7,587 (CC BY). | Core source. Filter by licence. Use the polygon, not `stateProvince`: that field is free text and fragmented (Papua 276,587; Papua Barat 67,504; "West Papua" 15,104; "Irian Jaya Barat" 7,733; new provinces 222 to 2,110 each). GBIF has no "endemic" flag, so endemism needs another source. |
| **iNaturalist API** (`api.inaturalist.org/v1`) | Keyless read. 10,000-result cap per query. Bulk is "not best handled by the API". | Photo licence is set per photo by the observer, and many are all-rights-reserved or CC BY-NC. The GBIF copy of research-grade data is CC BY-NC at dataset level. | Recommended-practices page read. Papuan-language names in iNaturalist: not checked. | Photos only where the licence is CC0 or CC BY, with credit. Use observations for counts and seasons. CC BY-NC is a limit if ETNOS ever earns revenue. |
| **IUCN Red List API v4** | Free token on request. You state your use. | Same terms as the website. **No commercial use**, and commercial includes a non-profit "for revenue generation". **No reposting or redistribution** of data in original format, "including ... through web services including utilization of The IUCN Red List APIs" and "archiving in a public data" set. The terms say there are no limits on use of the **Red List Categories** and that you may "view and query". The API page warns it may restrict "visualization projects unrelated to conservation". Cache only with permission. | Read at `iucnredlist.org/terms/terms-of-use` and `api.iucnredlist.org`. | Show the category (CR, EN, VU...) with credit and a link. Do not mirror other fields. Keep IUCN out of the open dataset except the category, and write to `redlist@iucn.org` before relying on even that. The GBIF field repeats IUCN data, so assume the same limits. |
| **Wikidata** | `wbgetentities` and `wbsearchentities` work. The SPARQL service did not. | CC0. | The query service answered 429 "1 req / min" on my first calls, then 504 on a retry. A test entity (Paradisaea minor, Q332621) has 61 labels, vernacular names (P1843) in 25 languages **including Indonesian, none Papuan**, an IUCN status (P141) and no endemic-to claim (P183). | Good for Indonesian names, taxon IDs and links. Weak for local names and endemism. Cache with the item API, not live SPARQL. |
| **Plants of the World Online** (Kew) | Search API, Python client `pykew`. Rate limits at Kew's discretion. | Dataset metadata CC BY. Cite as "POWO (year)... Retrieved date". Must say Kew cannot warrant accuracy. Must not imply Kew endorsement. Contact BI@kew.org when you use data. | Terms page read. A WCVP bulk file: not checked. | Accepted names and native-range checks for plants. |
| **Local names, small open sets** | Zenodo and ELAR | Ambel tree names: **CC BY 4.0**. OUTOFPAPUA: site footer says **CC BY-NC 4.0**. ELAR terms: not checked. | **Kamus Nama-nama Pohon di Bahasa Ambel**, Webb and the people of Kabilol, Waigeo, 2013 field work (doi 10.5281/zenodo.4283784). **OUTOFPAPUA database v1.0** (2025), lexicons of the West Papuan language area, original sources cited. **ELAR collection dk0420**: Marori and Smärky Kanum ethnobiology, Merauke. A review chapter reports over 1,500 plant names in Kalam (PNG). Huli names for 1,181 plants in the Tari Basin (PNG, ANU). Gasser (2019) lists flora, fauna and colour loan words across 52 languages in the northwest of the island. | Seed set for "Nama Hidup". Treat each as a source with its own consent history. Ask OUTOFPAPUA about reuse. |

Gap, said plainly: no open dataset ties species to names in Papuan languages at scale. What exists is small, per language, and often under academic terms. ETNOS could become the place where speakers add names, with the speaker's consent terms attached.

## 2.2 Terrain and places

| Source | Access | Licence | What I measured | Notes |
| --- | --- | --- | --- | --- |
| **Copernicus DEM GLO-30** | Anonymous AWS bucket `s3://copernicus-dem-30m`, 1° cloud-optimised GeoTIFF tiles. `aws s3 ls --no-sign-request`. | Free for the general public, including adaptation and redistribution. Required notice when communicating to the public: "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved". For modified data: "produced using Copernicus WorldDEM-30 ..." (full text in the licence). | A Papua tile (S05 E137) answered HTTP 200. Ocean tiles do not exist (treat as zero). | It is a **surface** model: forest canopy is in the heights, so rainforest ridges read higher than the ground. Say so on plates. |
| **Terrarium elevation tiles** (AWS `elevation-tiles-prod`) | Anonymous PNG tiles. A tile answered 200. Height = R·256 + G + B/256 − 32768. | Mixed source data. Attribution rules: not checked. | — | Lighter than GeoTIFF for a browser. Good for a quick preview. Use GLO-30 for the print. |
| **OpenStreetMap, Overpass** | Public Overpass servers: my connection was reset or timed out today. | ODbL: credit "© OpenStreetMap contributors"; share-alike if you publish a database built from it. | Not measured. | Plan on a regional extract and local queries, not live public Overpass. Check Geofabrik for a Papua extract (not checked). |
| **GeoNames** | `download.geonames.org/export/dump/ID.zip` (10.4 MB). Daily. | **CC BY 4.0.** | Downloaded today. 452,097 Indonesian rows. East of 134°E: **9,915** features; **1,910** populated places; about **270** mountains, peaks and ranges; about **526** lakes and streams. Contains Danau Paniai and Puncak Jaya (DEM field 4,805 m: compare with a surveyed height before printing). | Spelling and coverage are uneven, and 1,910 populated places is surely short of the real number of kampung. Cross-check with Kemendagri codes and OSM. |
| **Wikidata places** | Item API | CC0 | Not counted. | Good for links, coordinates, multilingual labels. |

**How to draw an engraved terrain plate cheaply.** Build time, not in the browser:

1. Read the GLO-30 window for the area (a few tiles) with GDAL or `geotiff.js`. Downsample to about 300 columns.
2. Draw one of three styles: (a) ridgelines, one polyline per row lifted by height with a background-colour fill under each line to hide what is behind (the "Unknown Pleasures" method); (b) contours by marching squares (`d3-contour`, ISC licence); (c) hachures along the slope direction.
3. Simplify the polylines (Douglas-Peucker). My estimate: 150 lines of 300 points, simplified, gives an SVG of roughly 40 to 100 KB.
4. Add paper colour, a graticule, a title in a serif face, local names first, and the DEM credit line. Export SVG (scales to A3) and a PDF through the print stylesheet. Reuse `engrave.ts` inks.

Open-source references to study. Check each licence before copying code, and write our own. `null-jones/contourist` (client-side ridge plots from Terrarium tiles, exports SVG), `sorny/erzberg` (many line-art modes, SVG for pen plotters), `flxn/topojoy`. Licences: not checked.

## 2.3 Cultural objects held in museums

Measured today with the public APIs I could reach. Papua counts that I could not measure are marked.

| Holder | API or access | Metadata licence | Image licence | Papua-related records | Fields useful for a repatriation lens |
| --- | --- | --- | --- | --- | --- |
| **Wereldmuseum (NMVW)**: Amsterdam (ex Tropenmuseum), Leiden (ex Volkenkunde), Berg en Dal, with Rotterdam | Linked data, CIDOC-CRM, SPARQL at `api.colonialcollections.nl/datasets/nmvw/collection-archives/sparql`, listed on the Colonial Collections Datahub. Website `collectie.wereldmuseum.nl`. Thesaurus Wereldculturen as RDF (since 2019). | **CC0**, publisher Wereldmuseum, published 31 January 2023 (Datahub page). | Mixed. About 3,200 items in open high resolution on Europeana (PAGODE). Images exist for about 92 percent of objects (reported 2021). Some are withheld for rights or sensitivity. | **Not measured.** A plain `SELECT *` query worked. A count over the whole graph timed out, so queries need narrow filters. Reported: about 450,000 objects in all; a 2025 thesis counted 172,959 object records for keywords "Indonesië, Indonesisch, Indonesia". | Title, inventory number, maker, production place (with coordinates from GeoNames in a derived project), production time span, materials, **acquisition and transfer-of-custody events** (from actor, to actor), actor biographies (profession, nationality), historical events. This is the best match for "where, when, who collected". |
| **Metropolitan Museum** | `collectionapi.metmuseum.org/public/collection/v1/objects/{id}`. The old `/v1/search` **was retired on 1 October 2026**; use `/v1.1/search` (offset and limit). Open Access CSV on GitHub. | CC0 for Open Access data (Met policy; policy page not re-fetched today). | Public-domain images only. | Search hits: Asmat 652; "New Guinea" 1,020; Papua 1,610 (keyword, noisy). Of the first 100 Asmat results: 96 Indonesia, 81 "Asmat people", **98 in the Michael C. Rockefeller Wing**, 82 accessioned 1978, **0 of 99 public domain, no images**. The `isPublicDomain=true` filter on search did not narrow the count. | culture, country, objectDate, accessionYear, creditLine ("Michael C. Rockefeller Memorial Collection, Bequest of Nelson A. Rockefeller", "Tobias Schneebaum collection"). Collector is in the credit line, not a field. |
| **Smithsonian (NMNH and others)** | `api.si.edu/openaccess/api/v1.0/search` with a free `api.data.gov` key. Bulk JSON on GitHub, refreshed weekly. | **CC0** for metadata and for media the Smithsonian supplies. Items with copyright limits have metadata but no media file. | CC0 where provided. | **Not measured**: the shared `DEMO_KEY` was rate-limited (10 per hour). | `edanmdm` records with culture, place, date and topic terms. |
| **British Museum** | The old SPARQL service is reported dead (a 4 October 2026 check by a third party: host does not connect). The collection pages returned 403 behind a Cloudflare challenge to scripts. No open API found. | Some web content CC BY-NC-SA 4.0. Text and data mining needs written permission (BM page). `robots.txt` reported to carry `ai-train=no`. | CC BY-NC-SA 4.0 for some images. Commercial use needs a licence. | Not measured. | Link out only. Ask `collectiondatabase@britishmuseum.org` for a research extract. |
| **Musée du quai Branly** | No open API. Catalogue pages with PDF per record. | Reuse of data on larger corpora only under a **partnership agreement**. Online use is "free of charge and for strictly cultural, informational or research purposes". | Same limits. Images of human remains are withheld "for ethical reasons". | Not measured. The museum says it holds "a rich collection from New Guinea". | Link out only, or ask for a partnership. |
| **Australian Museum** | No cultural-collection API found. Natural science specimens reach GBIF. | Images carry their own Creative Commons status, per caption. | Same. | GBIF OZCAM: 7,587 records in the Papua box. Cultural: not measured. | Check with the museum. |
| **Europeana** | Search API v2, free key (`api2demo` demo key worked for my queries). | **Metadata CC0.** Objects follow the item's own rights statement (`edm:rights`). Personal keys are for non-production use, project keys for production. | Per item. | Keyword "Asmat": **802** records. Rights: 400 CC0, 313 In Copyright, 43 Public Domain Mark, 25 CC BY, 10 CC BY-NC-SA 3.0, others. Providers: Museon-Omniversum 148, Naturalis 147, Museum of World Culture 146, Museum of Ethnography 105, Center for Research in Ethnomusicology 82, National Museum of Anthropology 57, Nationaal Archief 43, NMVW 14, Ethnologisches Museum Berlin 10. Open-reuse keyword hits: "Papua" 85,003; "Nieuw-Guinea" 75,647 (includes PNG and plants). | Good as a finder for European holders outside NMVW. |
| **Registries of dispersed collections** | Digital Benin (digitalbenin.org) is the model: per-institution counts, restituted counts, archival documents (British Museum 943 objects). | — | — | **I found no equivalent for Papua.** The nearest are the Colonial Collections Datahub (Dutch) and the Dutch Colonial Collections Committee documents. | — |

Repatriation facts to keep straight (reported):

- The Dutch Colonial Collections Committee returned 288 objects to Indonesia in September 2024. These were four Hindu-Buddhist statues from Java and 284 objects from the Puputan Badung collection (Bali). None was Papuan. (`colonialcollections.nl`, 20 September 2024.)
- On 8 July 2025 the Manhattan District Attorney announced the return of three antiquities to Indonesia. One was an **Asmat war shield** carved as a flying fox. (`manhattanda.org`.)
- The Hampton Archive of objects from the Baliem Valley has approval to move to Museum Loka Budaya in Papua (Tracing Patterns Foundation project, July 2024 to January 2025). Status after that: not checked.
- NWA research "Echoes of Ancestry" (2026 to 2027) studies Asmat bis poles in Dutch collections with Wereldmuseum, Leiden University, BRIN and the Asmat Museum, and mentions "potential repatriation discussions".

## 2.4 Images

| Source | Access | Licence per file | Papua holdings | Notes |
| --- | --- | --- | --- | --- |
| **Wikimedia Commons** | `action=query&prop=imageinfo&iiprop=url|extmetadata` with `LicenseShortName`, `Artist`, `Credit`, `AttributionRequired`, `UsageTerms` (the call pattern in `refresh-hayati.py`). Needs a descriptive user agent. | Yes, per file. Mixed CC BY-SA, CC BY, CC0, public domain. | "Category:Asmat people": 19 files and a subcategory "Asmat culture" (5 categories, 37 files). Includes Tropenmuseum and Nationaal Archief photographs. "Category:Netherlands New Guinea" exists. | My Commons API calls got **429 Too Many Requests** today from this network. Cache, space calls, send a real user agent. Credit string must travel with the image. |
| **Leiden University Libraries, KITLV image collection** | Digital Collections with IIIF Image API 2.1 and Presentation manifests for public-domain items. Handle URLs per item. | Item pages state "rights status ... public domain. Citing the Leiden University Libraries as a source is appreciated." Some images are viewable on site only. | Album **KITLV A271** alone has about 70 photographs from the 1950s: Merauke, Marind-Anim, Hollandia, Biak (Mokmer), Sorong, the Wissel Lakes (Enarotali, Ekari pig feasts), the Baliem Valley, mission schools. | Captions use the colonial voice ("Papoea"). Keep the original caption as a historic record, label it, and let communities add theirs. |
| **Europeana** | See 2.3. | Per item. | See 2.3. | — |
| **Delpher** (KB, Dutch newspapers and books) | Not checked this session. | Not checked. | — | Check the KB API terms before promising a feature. |

## 2.5 Traditions, rituals and calendars

| Source | What it is | Machine-readable? | Licence | Papua facts |
| --- | --- | --- | --- | --- |
| **UNESCO ICH** | Representative and Urgent Safeguarding lists. | No official API found. Pages and per-element files. Wikidata mirrors the list. | Terms for site texts: not checked. | **Noken**: "Noken multifunctional knotted or woven bag, handcraft of the people of Papua", inscribed **2012** on the Urgent Safeguarding List (decision 7.COM 8.3, file 00619). The page has the nomination form and a **consent of communities** document (Indonesian and English). Threats named: weaker transmission, fewer makers, factory bags, raw material access. |
| **WBTb Indonesia** (Warisan Budaya Takbenda, Ministry of Culture) | The national registry of "ditetapkan" intangible heritage. | **Partly.** `warisanbudaya.kemdikbud.go.id` lists entries as an HTML table (year, number, name, province, domain). `referensi.data.kemdikbud.go.id/budayakita/wbtb/objek/...` has one page per item (Noken: SK 238/M/2013, Prov. Papua). `dapobud.kemenbud.go.id/wbtb/` is the newer list but returned **403 to my script**. `data.go.id` holds only aggregate counts. A recap PDF for 2013 to 2024 is hosted on a third-party site. No documented API. | No open licence stated. Treat as public information, cite it, and ask the ministry for a dataset. | **2,727** ditetapkan from 2013 to 2025 (514 in 2025). In 2025, **Papua, Papua Barat and Papua Pegunungan submitted no proposals** (Koran Gala, 11 October 2025, quoting the assessor). By 2019, **38** items from Papua and Papua Barat were ditetapkan, against **1,488** inventoried by BPNB Papua (kebudayaan.kemdikbud.go.id, 2020). The recap lists: Noken, Ukiran Asmat, Yosim Pancar, Tifa, Koteka, Tomako, Honai, Papeda, Wor (Biak), Elha, Aker, Snap Mor, Akonipuk, Anu Beta Tubat, Igya Ser Hanjop, Banondit (Rumput Kebar), Bhukere and others. Several fall in the domain "pengetahuan dan kebiasaan perilaku mengenai alam dan semesta" (knowledge and practice about nature and the universe). That is the nearest registry category to a seasonal and ecological calendar. I know only names, places and domains, not what the entries say. |
| **Glottolog** (CLDF) | Languoids with codes, coordinates, endangerment. | Bulk files. | CC BY 4.0 (per Detak Detik's research note). | Language IDs to tag names, stories and objects. |

---

# Part 3. Bold features for ETNOS

Effort scale (my estimate for one developer with Aksara helping): S = up to 1 week, M = 2 to 4 weeks, L = 5 or more.

Every feature below produces **items with coordinates**, so it lands on the map and in the lenses. None is a list page. The two rules that apply to all of them: (1) store licence and source with every record; (2) a `sensitivity` field on every object and photo, default hidden for the classes in section 3.2.

## 3.1 The features

### 1. Jejak Spesimen: where Papua's specimens sleep (build first)

A world map and a time band of natural-history specimens collected in Western New Guinea and now held elsewhere: who collected them, in which year, and where they are kept. Click a collector to see their route. Click an institution to see how much of Papua it holds.

- **Data.** GBIF `basisOfRecord=PRESERVED_SPECIMEN`: 210,352 records in the box. Fields: `recordedBy`, `eventDate`, `institutionCode`, `typeStatus`, `locality`, coordinates. Datasets include Naturalis, Kew and the Australian Museum.
- **Licence.** CC0, CC BY and CC BY-NC per dataset. Filter. Credit the dataset and keep the GBIF DOI. No IUCN fields.
- **Gaps.** Collector names are free text and messy. Dates are missing for many. The box includes non-Papuan islands, so clip with a real polygon.
- **Effort.** S to M.
- **Coordinates.** Tempat (collected here, held there: two places), Waktu (two clocks: collected, recorded), Ranah Alam hidup, Suara (collector voice), Dasar (GBIF record).
- **Why first.** Clean open data, no sacred-object problem, and it builds the holdings map, the collector page and the two-clock band that feature 2 needs.

### 2. Peta Benda: where Papuan objects are held (the repatriation lens)

Same map, for cultural objects. Each institution is a node sized by the number of Papua-related objects. Each object has origin place, collector or seller, date made, date acquired, and the chain of custody if the museum records one. A filter shows "origin unknown" (Belum tercatat). Reading paths follow a collector or an expedition.

- **Data.** Wereldmuseum SPARQL (CC0, has acquisition events and actors); Met API (CC0 metadata); Smithsonian (CC0, key needed); Europeana (CC0 metadata, rights per item). British Museum and quai Branly: institution-level count only, linked out, unless they agree to share an extract.
- **Licence.** Metadata from the CC0 sources can be stored and published openly. Images: only where the rights statement is open and the object is not in a sensitive class. The Met shows 0 of 99 Asmat records as public domain, so expect links, not pictures.
- **Gaps.** Papua counts per museum are unmeasured. Place of origin is often vague ("Zuid Nieuw-Guinea"). Collector is a name in free text. Dutch, French and English terms need a thesaurus map. "Papua" in a museum record often includes PNG.
- **Effort.** L (start with Wereldmuseum, then the Met).
- **Coordinates.** Tempat (origin and holding), Waktu (made, collected, acquired: two clocks plus a third), Bentuk budaya (object type to the ten objects of UU 5/2017), Suara (museum catalogue voice against community voice), Dasar (record URL and licence).
- **Care.** See 3.2. The page states what is **not** shown and why.
- **Why bold.** It makes the Waktu lens concrete: an object made "since long ago" and acquired in 1956 shows two very different clocks.

### 3. Nama Hidup: species with their names and their stories

A species page that opens with names, not Latin. Under the Latin name: Indonesian name (Wikidata), names in Papuan languages as contributed and sourced, the story or use attached to each (Cerita, Pangan, Kesehatan), a distribution polygon from GBIF, status (IUCN category, linked), and recorded sightings by month. A second door starts from a language ("Bahasa Ambel: 100 pohon") and opens the species.

- **Data.** GBIF (distribution, photos by licence), iNaturalist (CC0 and CC BY photos only), Wikidata (Indonesian names, taxon IDs), POWO (plants), Glottolog (language IDs), Ambel dictionary (CC BY 4.0), ELAR and OUTOFPAPUA only with permission.
- **Licence.** Local names and uses are the speakers' knowledge. Attach the consent terms and a traditional-knowledge label (the Mukurtu and Local Contexts pattern already named in the knowledge-map design). The IUCN category only, linked. OUTOFPAPUA is BY-NC: ask.
- **Gaps.** No open species-to-local-name dataset at scale. Start with about 50 species in 3 languages through partners. Misidentification risk: a local name can cover several species. Store the match as "assigned by", "confidence" and "who agreed".
- **Effort.** M for the page; the collection is continuous work.
- **Coordinates.** Ranah Alam hidup and Bahasa and Cerita (a bridge), Tempat, Suara (the speaker is named, or "anonymous by request"), Dasar.

### 4. Kalender Hidup: a seasonal calendar made of signs

A circular calendar for a place. Layers: the moon (computed locally, as in Detak Detik's `langit.ts`), rainfall from the weather service, months when a species is seen flowering, fruiting or displaying (GBIF and iNaturalist histograms, with sample size shown), and **signs told by people** ("when X blooms, it is time for Y"), each attached to a speaker and a place. The WBTb entries in the nature-and-universe domain (Elha, Aker, Snap Mor and others) are pointers to ask about, not content to copy.

- **Data.** GBIF and iNaturalist for observation months; BMKG for climate (access: not checked); computed sky; the community's own posts.
- **Licence.** Aggregate counts from CC0 and CC BY records are fine. CC BY-NC records: keep to counts, no images. People's signs: their terms.
- **Gaps.** Observation data follows observers, not seasons. Raja Ampat and the Arfak Mountains have many bird records, the central highlands few. Show "n = 12" on every bar. A scientific calendar must never overwrite what a community says. Community entries rank first.
- **Effort.** M.
- **Coordinates.** Waktu (a cycle, a third kind of time), Tempat, Ranah Iklim dan musim, Langit, Pangan, Suara, Dasar.
- **Why bold.** It shows a bridge between science and knowledge held in language and practice.

### 5. Lembar Medan: engraved terrain plates and place pages

A place page whose hero is an engraved plate: Paniai and the Wissel Lakes, Lake Sentani, the Baliem Valley, Puncak Jaya, the Arfak range, the Birds Head coast. Local names first, other names second (Native Land pattern). The plate prints at A3 and becomes the share card. Below it: species seen there (GBIF), photographs from the 1950s (feature 6), objects collected near there (feature 2), WBTb entries from that regency, and the stories people have added.

- **Data.** Copernicus GLO-30, GeoNames (CC BY), OSM extract (ODbL), Wikidata, plus the other features.
- **Licence.** DEM notice on every plate. OSM credit if OSM data is drawn. No restrictions on printing.
- **Gaps.** DEM includes tree canopy. GeoNames and OSM names miss many kampung. Some places have several names, for example the Puncak Jaya or Carstensz summit, and communities may use others. Show the names people use and let them add more.
- **Care.** Some mountains, lakes and caves are sacred. Let a community mark a site "do not show on the plate". Do not publish exact coordinates for those.
- **Effort.** M (plate generator about a week, pages and content longer).
- **Coordinates.** Tempat, Ranah Hutan dan tanah and Laut, sungai, danau, Suara (names), Dasar.

### 6. Foto Lama, Nama Baru: re-captioning the colonial photo archive

A viewer for 1950s photographs of Netherlands New Guinea (KITLV album A271 and similar). Beside each: the original colonial caption, labelled as such. Beside that: what people today say it shows, who the people are, the real name of the place, what is wrong in the caption. A "Beda versi" pair per photograph.

- **Data.** Leiden IIIF (public domain per item), Commons (CC BY-SA and public domain, per file), Nationaal Archief via Commons.
- **Licence.** Public domain does not remove the duty of dignity. Keep the original caption and show a notice, as quai Branly does. Allow takedown requests by communities. Do not show photographs of rituals that a community says should not be seen.
- **Gaps.** Many items are "on site only". Delpher: not checked.
- **Effort.** M.
- **Coordinates.** Waktu (date of photograph against date of caption, two clocks), Tempat, Suara (colonial caption against community caption), Bentuk budaya, Dasar.
- **Why bold.** It is the Sumber suara and Beda versi lenses made real, with an action that a person can do: "Tambah nama".

### 7. Daftar yang Tidak Ada: the heritage registry and its silences

A map and table of what is **registered** (WBTb: 2,727 nationally, 38 from Papua and Papua Barat by 2019; UNESCO: Noken) against what is **inventoried** (1,488 items by BPNB Papua) and against what people say exists. Each empty cell is a button: "Tambah di sini". It repeats Detak Detik's best idea, "Yang Tidak Dihitung" (a visible empty row), for culture.

- **Data.** WBTb HTML lists and the recap PDF (ask the ministry for a dataset), UNESCO pages, BPNB statement.
- **Licence.** No open licence stated. Cite and link. Do not claim it as open data. Ask for a dataset and a written permission.
- **Gaps.** The 403 on `dapobud` shows access can change. Scrape politely or ask. Province names changed with the new provinces in 2022 to 2025, so map entries by regency.
- **Effort.** S to M.
- **Coordinates.** Bentuk budaya (UU 5/2017 ten objects against UNESCO five domains: a crosswalk), Tempat, Waktu (year ditetapkan against "since long ago"), Suara (government), Dasar.

### 8. Pulang: a repatriation tracker

A public, plain page per claim or return: what, where, who asked, what was decided, what happened, with source documents. It starts from real cases: the Asmat shield returned from New York in July 2025, the Hampton Archive to Museum Loka Budaya, the Asmat bis pole research (2026 to 2027). It also records what has **not** happened: the 288 objects returned by the Netherlands in 2024 were from Java and Bali, not Papua.

- **Data.** Official announcements, committee documents, news. Linked to feature 2 records.
- **Licence.** Quote briefly, link, cite. Facts are not copyrightable but text is.
- **Gaps.** Status after announcements is often not public. State "last confirmed" dates. Do not guess.
- **Effort.** S (editorial, light code).
- **Coordinates.** Tempat (from, to), Waktu (taken, asked, returned), Suara (institution against community against state), Dasar.

### 9. Satu Lembah: a capstone path

A guided reading path (Bacaan terpandu) for one valley, joining features 3, 4, 5, 6 and 2: the plate, the species with their names, the calendar, the old photographs, the objects that were taken, and what has been registered. For example, from the Wissel Lakes (Paniai). This is not new data; it is a showcase of the map as a medium, and it is the demo for 4 to 5 December.

- **Effort.** M after features 1, 3, 5 and 6 exist in a first version. For the showcase, do one valley by hand.

## 3.2 Care for sacred objects and human remains

These rules apply to features 1, 2, 5, 6 and 8.

| Class | Rule |
| --- | --- |
| Human remains (skulls, bones, mummies, hair, preserved bodies), and objects made with them | Record that the object exists, where it is held, and the date acquired. **Do not show images.** Do not give a precise find spot. Quai Branly also withholds such images. |
| Sacred, secret or restricted objects (men's house objects, initiation items, ancestor figures, ritual masks, objects tied to a clan) | Same default: existence and holder only. Only the community that holds the knowledge decides whether to show more. ETNOS does not decide by itself which objects are sacred, so default to hidden until a community or museum record says otherwise. |
| Photographs of living people or recent ritual | Show only with consent or a clear public-domain status plus a takedown route. |
| Places that are sacred | Show only if the community agrees. Round the coordinates to regency level if asked. |
| Museum catalogue language | Keep the museum's original title and caption as a record. Mark offensive terms. Add the community's own name. |
| Everything | A `sensitivity` field (`open`, `hidden-image`, `existence-only`) on each record. A change log that shows who changed it and why. Respect an institution's own withholding. |

## 3.3 Licence summary, in one table

| Source | Metadata | Images or media | Can go in ETNOS open dataset? |
| --- | --- | --- | --- |
| GBIF | Per dataset (CC0, CC BY, CC BY-NC) | Per record | Yes for CC0 and CC BY, with credit. CC BY-NC only if ETNOS stays non-commercial and says so. |
| iNaturalist | Per observation | Per photo | Counts yes. Photos only CC0 and CC BY. |
| IUCN | No redistribution | — | **No**, except the category label, and ask first. |
| Wikidata | CC0 | — | Yes. |
| POWO | CC BY, with notices | — | Yes with credit. |
| Wereldmuseum | CC0 | Mixed | Metadata yes. Images per rights statement. |
| Met | CC0 | Public domain only | Metadata yes. No images for Asmat today. |
| Smithsonian | CC0 | CC0 where supplied | Yes. |
| Europeana | CC0 | Per item | Metadata yes. |
| British Museum | CC BY-NC-SA, TDM by permission | CC BY-NC-SA, some | Link only. Ask first. |
| Quai Branly | Partnership only | Same | Link only. Ask first. |
| Commons | Per file | Per file | Yes with credit string kept. |
| Leiden IIIF | — | Public domain per item | Yes, credit appreciated. |
| Copernicus DEM | — | Free with notice | Derived plates yes, with notice. |
| OSM | ODbL | — | Yes, share-alike on the database. |
| GeoNames | CC BY 4.0 | — | Yes with credit. |
| WBTb, UNESCO | No licence stated | — | Cite and link. Ask. |

## 3.4 Suggested order

1. Source ledger and sensitivity field (S). Copy the idea of `etl/sources.ts`.
2. Feature 1, Jejak Spesimen (S to M).
3. Feature 5, plate generator and one place page (M).
4. Feature 6 for one album, and feature 7 as a table (S each).
5. Feature 2 with Wereldmuseum only (M), then more holders.
6. Feature 3 with Ambel and 50 species, and feature 4 for one place (M each).
7. Feature 8 as editorial work in parallel.
8. Feature 9 as the December showcase, done by hand for one valley.

## 3.5 Open questions for the owner

1. Will ETNOS ever earn revenue (grants, subscriptions, donations)? IUCN, iNaturalist CC BY-NC data and the British Museum terms all turn on "non-commercial". Decide the line now.
2. Who in Papua decides what is sacred? Pick a first partner (a museum such as Museum Loka Budaya, the Asmat Museum, a customary council, or a church archive) before feature 2 goes public.
3. Is writing to IUCN, the British Museum, quai Branly and the Ministry of Culture (dataset request) worth a letter from the owner? Yes for all four; one page each.
4. Should the open dataset include museum records? CC0 sources: yes. The rest: link only.

## Sources and dates

Fetched or queried 16 November 2026 unless stated.

- GBIF API: `https://api.gbif.org/v1/occurrence/search` (counts above), `https://api.gbif.org/v1/dataset/{key}`.
- iNaturalist API recommended practices: https://www.inaturalist.org/pages/api+recommended+practices
- IUCN Red List terms of use: https://www.iucnredlist.org/terms/terms-of-use ; API page: https://api.iucnredlist.org/
- Kew data terms: https://www.kew.org/science/collections-and-resources/data-and-digital/terms-of-use ; POWO citation: https://powo.science.kew.org/cite-us ; pykew: https://github.com/RBGKew/pykew
- Wikidata item Q332621 via `wbgetentities`; SPARQL responses 429 and 504.
- Ambel tree names: https://doi.org/10.5281/zenodo.4283784 (CC BY 4.0 via the Zenodo API). OUTOFPAPUA: https://outofpapua.com/ and https://database.outofpapua.com/ . ELAR dk0420: https://www.elararchive.org/dk0420/ . Gasser 2019: https://doi.org/10.1163/19552629-01203003 . Haberle, Ethnobotany of the Tari Basin: http://hdl.handle.net/1885/144171 .
- Copernicus DEM: https://registry.opendata.aws/copernicus-dem/ ; readme https://copernicus-dem-30m.s3.amazonaws.com/readme.html ; licence text https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf ; CDSE collection page https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- GeoNames dump: https://download.geonames.org/export/dump/ID.zip (CC BY 4.0).
- Terrain rendering references: https://github.com/null-jones/contourist , https://github.com/sorny/erzberg , https://github.com/flxn/topojoy
- Wereldmuseum linked data: https://datasets.colonialcollections.nl/ (CC0, published 31 Jan 2023); SPARQL `https://api.colonialcollections.nl/datasets/nmvw/collection-archives/sparql`; 2019 announcement https://amsterdam.wereldmuseum.nl/nl/collectiedata-en-thesaurus-van-nmvw-online-beschikbaar ; PAGODE https://photoconsortium.net/pagode/2021/09/30/wereldculturen-museum/ ; thesis on Indonesian object digitisation http://urn.kb.se/resolve?urn=urn%3Anbn%3Ase%3Auu%3Adiva-562604 (2025).
- Met Open Access API (v1 object endpoint and v1.1 search, queried today): https://collectionapi.metmuseum.org/public/collection/v1.1/search
- Smithsonian Open Access: https://www.si.edu/openaccess/faq and https://www.si.edu/openaccess/devtools
- British Museum copyright and permissions: https://www.britishmuseum.org/terms-use/copyright-and-permissions ; status of the old endpoint, secondhand: https://atlasdataset.com/research/kb-lab%2Flab%2Fsources%2Fcards%2Fsource-british-museum-collection-online.md (5 Oct 2026)
- Quai Branly: https://www.quaibranly.fr/fr/collections/toutes-les-collections/explorer-les-collections-1 and https://quaibranly.fr/fr/collections/toutes-les-collections/histoire-des-collections/collections-doceanie
- Australian Museum: https://australian.museum/copyright/ and https://australian.museum/about/organisation/am-images/
- Europeana API search (demo key, 16 Nov 2026), terms https://www.europeana.eu/en/rights/terms-of-use , API FAQ https://europeana.atlassian.net/wiki/spaces/EF/pages/2360508417/Europeana%2BAPI%2BFAQ
- Digital Benin: https://digitalbenin.org/institutions
- Dutch returns 2024: https://www.colonialcollections.nl/en/2024/09/24/for-second-time-cultural-artefacts-to-be-returned-to-indonesia/ ; committee page https://committee.kolonialecollecties.nl/documents/2024/08/28/indonesia
- Manhattan DA, 8 July 2025: https://manhattanda.org/d-a-bragg-announces-return-of-antiquities-to-indonesia-and-turkiye/
- Hampton Archive: https://tracingpatterns.org/project/representing-papua/ ; Asmat bis poles: https://www.nwo.nl/en/projects/jubsh33694
- Commons categories: https://commons.wikimedia.org/wiki/Category:Asmat_people , https://commons.wikimedia.org/wiki/Category:Netherlands_New_Guinea
- Leiden KITLV: https://digitalcollections.universiteitleiden.nl/imagecollection-kitlv ; album https://digitalcollections.universiteitleiden.nl/view/item/696562 ; IIIF docs https://lab.library.universiteitleiden.nl/iiif-docs/services/
- UNESCO Noken: https://ich.unesco.org/en/USL/noken-multifunctional-knotted-or-woven-bag-handcraft-of-the-people-of-papua-00619
- WBTb: https://warisanbudaya.kemdikbud.go.id/?penetapan&&list&limitto=1 ; Noken item https://referensi.data.kemdikbud.go.id/budayakita/wbtb/objek/AA000841 ; 2025 totals https://news.detik.com/berita/d-8261888/kemenbud-tetapkan-514-warisan-budaya-takbenda-indonesia ; Papua non-submission https://www.koran-gala.id/news/58716065955/ ; 38 Papua items and 1,488 inventoried https://kebudayaan.kemdikbud.go.id/bpnbpapua/warisan-budaya-tak-benda-wbtb-tanah-papua/ ; recap 2013 to 2024 https://indonesiaheritage-cities.org/wp-content/uploads/2025/09/2013-2024-Rekap-Penetapan-WBTb.pdf ; list on id.wikipedia (11 Nov 2026) https://id.wikipedia.org/wiki/Daftar_Warisan_Budaya_Takbenda_Indonesia
- Detak Detik files: paths given inline in Part 1.

Limits of this research: Papua object counts for Wereldmuseum, Smithsonian, British Museum, quai Branly and the Australian Museum were not measured. Delpher, Overpass, Geofabrik, BMKG data access, the Met Open Access policy page, UNESCO site text licence, ELAR access conditions and the licences of the open-source terrain tools were not checked. WDQS was rate-limited. The Commons API returned 429.
