# Peoples, places and public data: a reference model and seed sources

17 November 2026. Research for ETNOS (etnos.space) on the Strata engine. It builds on `strata-model-2026-11-17.md` (sections 1-5), `research/places-and-hierarchy-2026-11-16.md`, `research/customary-regions-and-boundaries-2026-11-17.md`, `research/2026-11-01-community-language-custody.md` and `sources-and-sensitive-material-2026-11-16.md`. All links were read on 17 November 2026 unless noted. Items marked **[UNVERIFIED]** rest on a search snippet, a third-party page, or memory, or could not be reached from the research environment.

## Summary of recommendations

1. Keep one administrative spine (country, province, regency, district, kampung) as the filing system, and treat every cultural region, people, language and clan as a separate kind of entity linked by claims.
2. Make every link a claim: subject, relation, object, extent (whole, part, contested), source, source date, who asserts it, status. Never store a bare fact.
3. Use eight entity kinds and nine relation types (Part 2). The same schema serves Papua, Kalimantan and Aotearoa, and only data packs differ.
4. Identify languages by Glottolog codes (CC BY 4.0, includes dialects and a clean tree), and carry ISO 639-3 as a cross-reference. Do not ship Ethnologue data; its terms restrict reuse.
5. Never ship a registry of who belongs to which people. Record peoples and their places, not persons' ethnicity. Wikidata's own guidance for person ethnicity (P172) says a very high standard of proof is needed.
6. Store the stewardship scope of each Aksara as a claim too (it is a deployment decision, reviewed by local people), so a contested place can sit in two scopes.
7. Borrow from Local Contexts (Notices as placeholders, Labels authored by the community) and Mukurtu (communities, cultural protocols, categories) for access rules. Treat CARE and OCAP as design tests, and Te Mana Raraunga and the Kaitiakitanga licence as precedent for custody.
8. Show a plain "not official, not a land claim" line on every overlay, as AIATSIS, Native Land and Te Kāhui Māngai do.
9. Seed Papua from Kemendagri codes (Kepmendagri 300.2.2-2138/2025 as amended by 300.2.2-2430/2025), checked against BPS MFD. A script can fetch a community GitHub mirror today; village polygons have no confirmed open source.
10. geoBoundaries gives Indonesia only down to regency (ADM2, CC BY 3.0 IGO via BPS/WFP/OCHA). Village boundaries need BIG, whose terms I could not confirm.
11. Use Wikimedia Commons for page headers: all files are freely licensed by policy. In a spot-check, coverage per regency ranges from about 15 files (Paniai) to about 240 (Manokwari). Send a descriptive User-Agent and expect rate limits.
12. Show election, budget and village-fund data only as attributed aggregates by regency or district. Do not show per-polling-station results for small kampung, and do not show personal data of officials beyond public name, office and party.

---

# Part 1: How others model peoples, places and languages

## 1.1 Languages

| System | Units | Nesting and overlap | Identifiers | Licence and access |
|---|---|---|---|---|
| ISO 639-3 [1] | Individual language, macrolanguage, collective; scope (individual, macro, special) and type (living, extinct, etc.) | Flat. No dialects, no families. Macrolanguage maps are a separate table. | Three letters (`mri`). Private use range qaa-qtz. | Free tables, attribution required, identifiers may not be modified or extended in public, and the site says only it may distribute the tables. Latest tables carry a 20261015 filename (release date not stated on the page). |
| Glottolog [2] | Languoid: family, language, dialect | A strict tree (one parent per languoid), genealogical. Dialects are leaves under a language. Each languoid also has an ISO code where one exists. | Glottocode, four letters plus four digits (`nabi1234` style). | Version 5.4 is current on the site. Data releases archived on Zenodo. Licence reported as CC BY 4.0 **[UNVERIFIED]**, taken from general knowledge; the site's licence text did not load here. |
| Ethnologue [3] | Language, with status on the EGIDS scale | Language families, country lists | ISO 639-3 codes, plus its own status codes | Academic and general terms of use differ; commercial or production use needs a licence; the Global Dataset is a licensed product with restricted sharing. Not suitable as a seed. (Search results, second-hand: **[UNVERIFIED]** in detail.) |
| AUSTLANG (AIATSIS) [4] | Language, language group, dialect, with alternate names and place links | Not a strict tree; names map to codes with many variants | Codes such as `E6`, devised by a 1963 survey and added to Library of Congress MARC in 2018 | CC BY 4.0 since 2019; downloadable CSV from data.gov.au. States its locations are not authoritative or definitive, and that some terms reflect past attitudes. |

Lessons: use Glottolog's tree for "language X is a dialect or variety of Y" but record dialect chains as claims with sources, since a tree forces one parent. Keep the ISO code as a lookup key only. AUSTLANG's habit of holding many names per language, each with a source, is the right model for Papuan languages, where Indonesian, Dutch-era and community names differ.

## 1.2 Peoples and territory

**Native Land Digital** [5]. Territories, languages and treaties are drawn as overlapping polygons by design. Its FAQ says that where knowledge is contradictory it includes all Indigenous perspectives, and its founder argues the alternative would put the mapper in the position of deciding whose claims are valid [per `customary-regions-and-boundaries-2026-11-17.md`]. The API page asks for responsible use, says the map is not official or legal, and says a key will soon be required [6]. I could not find a data licence on that page, so treat the data as not freely reusable until Native Land confirms terms.

**Wikidata** [7, 8]. For groups the common pattern is: instance of (P31) ethnic group (Q41710), and these properties, all read on 17 November 2026:

| Property | Label | Use for Strata |
|---|---|---|
| P2341 | indigenous to | people or language to place (or to a people) |
| P1412 | languages spoken, written or signed | people to language |
| P361 / P527 | part of / has part | sub-group to group, and the reverse |
| P131 | located in the administrative territorial entity | the spine |
| P220, P1394 | ISO 639-3 code, Glottolog code | language identifiers |
| P3823 | Ethnologue language status | language vitality, if licence permits (Ethnologue-derived, check) |
| P1999 | UNESCO language status | endangerment level |
| P1098 | number of speakers, writers, or signers | counts, always dated |
| P1588 | Statistics Indonesia area code | BPS code, but its description says it was last issued in 2021, so stale |
| P172 | ethnic group | for persons; its description demands a very high standard of proof, so Strata should not use it |

Wikidata statements can carry qualifiers and references, which is the pattern Strata should copy for claims. Coverage for Papuan peoples is uneven; check before relying on it.

**Joshua Project** [9]. Lists people groups by country with an API. Terms: free, non-commercial, revocable, attribution required, key required, no replicating its services, delete cached data on termination. Its stated purpose is non-commercial missions research. That framing (counting "unreached" peoples by religion) is not neutral for a platform serving Indigenous communities, and the terms conflict with caching. Do not seed from it.

**BRWA and AMAN** (Indonesia) [10, 11]. BRWA (Badan Registrasi Wilayah Adat) registers participatory maps of customary territories and tags each with a status. Reported figures (second-hand, from news and a statistics site, **[UNVERIFIED]** against BRWA itself): 1,633 maps and 33.6 million ha nationally by August 2025, and 324 maps on the island of Papua at a March 2026 cut-off, with the largest areas in Papua Selatan, Papua and Papua Barat Daya. The statuses distinguish maps that are registered from those that are "ditetapkan" (formally designated by a regional government), with the difference being legal recognition. AMAN is the national indigenous alliance whose members' maps feed BRWA.

**Legal category: masyarakat hukum adat (MHA)** [12]. Under Permendagri 52/2014, a regent or governor may recognise an MHA by decree (Surat Keputusan Bupati) after identification, verification and a committee's recommendation, with the regent reporting to the governor. Other routes are regional regulations (Perda). In Papua, Perdasus 23/2008 on ulayat rights is the usual reference, and Perdasus 21/2008 deals with forest management. Kabupaten Jayapura has a Perda (No. 8/2021) and decrees for specific territories, per a search summary **[UNVERIFIED]**. So a recognition has: the community, the territory, the legal instrument and number, the issuing authority, a date, and a status. That is exactly a sourced, dated claim, and Strata should store the instrument number and issuer instead of a yes/no "recognised".

## 1.3 Aotearoa

- **Units**: iwi (tribe), hapū (sub-tribe), whānau (family), marae (meeting place), rohe (territory). Te Kāhui Māngai (TKM) [13] is the government directory of iwi, hapū, marae and representative organisations, run by Te Puni Kōkiri. Its disclaimer says rohe descriptions are information supplied by representative Māori organisations, and that although many rohe overlap it is not the site's function to demarcate a single line [as quoted in the earlier boundaries research]. TPK declined a request for the directory's boundaries as KML or shapefile because its map areas are indicative only [13]. A separate ArcGIS service lists iwi as in the Māori Fisheries Act 2004 [13], with Te Puni Kōkiri as copyright holder (licence **[UNVERIFIED]**).
- **Overlap**: the Crown's overlapping-interests policy declines to adjudicate "predominant interest" and quotes the Waitangi Tribunal's principle of "associations", not exclusivity [per the earlier research].
- **Te Mana Raraunga** [14]. The Māori data sovereignty network's principles include rangatiratanga (authority), whakapapa (all data has a genealogy, so record provenance and context), kaitiakitanga (guardianship, and Māori decide what is tapu or noa), plus whanaungatanga, kotahitanga and manaakitanga. Sub-labels differ by site; check the original brief before citing clauses.
- **Te Hiku Media's Kaitiakitanga licence** [15]. Te Hiku acts as kaitiaki, not owner, of language data. Its Papa Reo API licence says kaitiakitanga of data remains with the contributors, who decide whether their data improves services, and access depends on users' intentions aligning with tikanga. It calls itself a living licence. Note the repository text could only be seen through a mirror; read the original before quoting.

## 1.4 Kalimantan

"Dayak" is an umbrella term from outsiders. Sources say Dutch and German authors adopted it for non-Muslim natives of Borneo, so the line was partly religious, and Brooke used it for only two groups (Land Dayak or Bidayuh, and Sea Dayak or Iban) [16]. A seven-group scheme attributed to Tjilik Riwut (dated 1954 in one version and 1958 in another, **[UNVERIFIED]**) lists Ngaju, Apo Kayan, Iban, Klemantan, Murut, Punan and Ot Danum; a 2017 congress reportedly revised it to Ngaju-Ot Danum, Apo Kayan-Kenyah, Iban, Klemantan, Kadazan-Dusun and Punan **[UNVERIFIED]**. Placements are disputed: Murut falls under Kadazan-Dusun-Murut in one table, Punan sits with Kajang and Melanau in another, and a linguistic study argues Merap is Kayan, not Punan [16]. Another reading (in the same sources) is that Riwut counted 18 "tribes" and 403 sub-tribes. In Malaysia "Dayak" usually means Iban and Bidayuh.

Registries: provincial law gives structure rather than a register. Central Kalimantan's Perda 16/2008 on Dayak customary institutions defines the kedamangan (a customary territory under a damang), and a 2024 provincial Perda is said to move toward recognising communities as legal subjects **[UNVERIFIED]** [17]. Land recognition there uses Surat Keterangan Tanah Adat (SKTA). AMAN Kalteng publishes procedures for recognition [17]. I did not find a national Dayak registry other than the Majelis Adat Dayak Nasional referred to in regional regulations. Not verified.

## 1.5 Others

- **Sámi**. Parliaments in Norway and Finland keep electoral rolls built on self-declaration plus language or descent criteria; Norwegian and Finnish authorities state there is no official ethnicity registration in the Nordic countries. The rolls are protected by data protection law, and the Finnish roll has been contested in court [18]. Lesson: a membership list is the most sensitive artefact a platform can hold. Strata should never build one.
- **First Nations in Canada**. OCAP (Ownership, Control, Access, Possession) from the First Nations Information Governance Centre. FNIGC holds OCAP as a registered trademark and says these are First Nations principles, not generic Indigenous ones, with interpretation unique to each nation [19]. Strata should cite it, not claim compliance.
- **Australian Aboriginal nations**. The AIATSIS map (made 1996, from sources to 1994, drawn by a named cartographer) shows only general locations of larger groupings, which may contain clans, dialects or languages. It says some information is contested and it is not suitable for native title or land claims [20, 4].

## 1.6 Governance standards for content

- **CARE** [21]: Collective benefit, Authority to control, Responsibility, Ethics. Published in 2020 in the Data Science Journal; maintained by the Global Indigenous Data Alliance, drafted by an RDA interest group. It is guidance for data stewards (to be "FAIR and CARE"), not a technical standard.
- **Local Contexts** [22, 23]: TK (Traditional Knowledge) Labels and BC (Biocultural) Labels. Two kinds of mark with different authors: **Notices** are applied by institutions and researchers as placeholders; **Labels** are made by the Indigenous community on the Local Contexts Hub and carry their own text. The Hub exposes an API (v2 is the default since 10 February 2025; sandbox and production hosts exist; an API key from a Hub account is needed). The API fetches the Labels and Notices attached to a Hub Project by a GET request. The v2 guide says Notice text, icons and titles may not be altered when displayed. DataCite records them as rights identifiers such as `TK-Notice` with scheme "Local Contexts" [22]. Labels express protocols and are not enforcement. Endpoint paths come from the OpenAPI spec the guide links to; I did not read it **[UNVERIFIED]**.
- **Mukurtu CMS** [24]: three structural elements. Communities (who) group users; cultural protocols (how) attach to communities and set access, from open to community-only, with categories such as gender or seasonal access; categories (what) are site-wide controlled vocabularies for browsing. A site has no built-in protocols; each community defines its own. Mukurtu documents integration with the Local Contexts Hub [23].

**What Strata should borrow.** (1) Mukurtu's separation of who, how and what, so a community, its protocol and the topic of an item are three independent things. (2) The Notice and Label split: Aksara and operators may apply a Notice ("not yet reviewed by the community") while only the community creates the Label. (3) CARE and OCAP as review questions on every deployment, not as claims of compliance. (4) The Kaitiakitanga and TMR idea that provenance (whakapapa of data) travels with each record, which the claim schema below already does. Existing language-custody work (`2026-11-01-community-language-custody.md`) remains the authority for private language communities.

---

# Part 2: A generalizable model

## 2.1 Principles

1. **Data packs, not code.** A pack lists entities, claims and scheme names. No deployment changes engine code.
2. **Facts are claims.** Every statement relating two things is a record with provenance, a date and a status. Disagreement is two claims, not an edit war.
3. **The spine is administrative and single-parent; everything cultural is a graph.**
4. **Self-description first.** Where a group has described itself, that claim is shown first and labelled as such.
5. **No registry of persons.** Entities are peoples, places, languages and organisations, never individuals' ethnicity.

## 2.2 Entity kinds

| Kind | Examples | Identifier |
|---|---|---|
| `place` (spine) | Indonesia, Papua Tengah, Nabire, Wanggar district, a kampung; New Zealand, Gisborne district | Government code and Wikidata QID; Strata ID |
| `overlay` | Wilayah adat Mee Pago; Dayak group territories as named in a pack; an iwi rohe; a tribal region | Strata ID, scheme name, source |
| `people` | Mee, Yerisiam, Ngaju, Ngāti Porou | Strata ID, Wikidata QID, TKM ID where one exists; names in several languages, each sourced |
| `subgroup` | Clan, marga, hapū, kedamangan | Strata ID; relation to its parent people is itself a claim |
| `language` | Language or dialect | Glottocode; ISO 639-3 as secondary |
| `organisation` | Church, school, customary council (LMA), iwi authority, NGO | Strata ID; registration number where public |
| `community` | Interest community, place community, private language community | Strata ID (managed in Strata) |
| `steward` | One Aksara with a scope | Strata ID; scope is itself a set of claims |

## 2.3 Relation types

| Relation | From, to | Notes |
|---|---|---|
| `within` | place to place | Spine. Exactly one current parent, with valid-from and valid-to dates. |
| `part_of_overlay` | place to overlay | Extent: `whole`, `part` (with description), `contested`. Many allowed. |
| `speaks` | people (or subgroup) to language | Optional register (home, church, school). |
| `indigenous_to` | people or language to place or overlay | Wikidata P2341 mapping. Many allowed. |
| `subgroup_of` | subgroup or people to people | The literature uses many bases (descent, language, settlement). Record the basis. |
| `located_in` | organisation or community to place | Where it operates. |
| `represents` | organisation to people or subgroup | Self-declared or recognised, with instrument. |
| `recognised_as` | people or territory to a legal category | For example MHA with decree number, issuer and date. |
| `steward_scope` | steward to place, overlay, people or language | The scope of one Aksara. |

## 2.4 Claim record

```
claim: subject, relation, object, extent (whole|part|contested|n/a),
       extent_note, asserted_by (who), source (id), source_type
       (law|planning|customary body|scholar|press|community|dataset),
       source_date, read_date, valid_from, valid_to, status
       (asserted|disputed|withdrawn|superseded), sensitivity, note
```

Any member of a place community may contest a claim by attaching a counter-claim; the engine shows both and never deletes the first. A steward can change `status` but not erase history. Contested extents are computed: if two live claims for one place and relation point to different objects, the overlay chip shows "contested".

## 2.5 Three worked examples

Facts below are from the repository's research files or the sources in Part 1 unless marked. They are illustrations of the schema, not finished data.

**Nabire (Papua)**

| Subject | Relation | Object | Extent | Source |
|---|---|---|---|---|
| Nabire | within | Papua Tengah | n/a | UU 15/2022 (per `customary-regions-and-boundaries-2026-11-17.md`), Kemendagri code |
| Nabire | part_of_overlay | Saireri | contested | provincial profile, 2008-era (source A) |
| Nabire | part_of_overlay | Mee Pago | contested | Bappenas RPJMN 2020-2024 (source B) |
| Nabire | part_of_overlay | Saireri | part: coast | DAP Nabire statements, press (source C) |
| Nabire | part_of_overlay | Mee Pago | part: highlands | same |
| Yerisiam (coastal people) | indigenous_to | Nabire | n/a | local press **[UNVERIFIED]** against an ethnography |
| Mee | indigenous_to | Nabire (highlands) | part | same |
| Mee | speaks | Mee language (Glottocode; ISO code to check) | n/a | Glottolog |

The Nabire page then shows a "Beda versi" section listing A, B and C and their dates.

**Dayak example: Ngaju in Central Kalimantan** (illustrative; check each item)

| Subject | Relation | Object | Extent | Source |
|---|---|---|---|---|
| Kabupaten Kapuas | within | Kalimantan Tengah | n/a | Kemendagri code |
| Ngaju | subgroup_of | "Dayak" (umbrella) | n/a, basis: ethnonym | Riwut scheme, 1950s [16] |
| Ngaju | indigenous_to | Kalimantan Tengah river basins | part | scholar, to be sourced |
| Ngaju | speaks | Ngaju language (ISO `nij`, from memory **[UNVERIFIED]**) | n/a | Glottolog |
| Kedamangan X | subgroup_of | Ngaju | n/a | Perda 16/2008 [17] |
| Kedamangan X | recognised_as | customary institution | n/a | Perda 16/2008, with article number |
| "Ngaju-Ot Danum" | alternative grouping | Ngaju and Ot Danum | n/a | 2017 congress, reported **[UNVERIFIED]** |

The umbrella "Dayak" is a `people` entity with a note that its use is contested, not a root of a tree.

**Iwi example: Ngāti Porou** (illustrative; check each item)

| Subject | Relation | Object | Extent | Source |
|---|---|---|---|---|
| Gisborne District | within | New Zealand | n/a | official codes |
| Ngāti Porou | indigenous_to | rohe as described by its representative organisation | whole | TKM entry, self-described [13] |
| Ngāti Porou | indigenous_to | areas overlapping neighbouring iwi | contested | TKM states overlap exists [13] |
| a hapū | subgroup_of | Ngāti Porou | n/a, basis: whakapapa | TKM |
| the same hapū | subgroup_of | a second iwi | n/a | allowed: hapū often belong to more than one iwi **[UNVERIFIED]** |
| Ngāti Porou | speaks | Māori (`mri`) | n/a | Glottolog |

## 2.6 Where a tree breaks

| Where | Why | What the graph does |
|---|---|---|
| Overlay membership of a place (Nabire, Mimika, Puncak) | Two or more sources, each a tree, disagree | Several `part_of_overlay` claims, shown as chips |
| Peoples spanning provinces or countries (Dayak across Indonesia, Malaysia, Brunei) | The spine is national | `indigenous_to` links to many places; no single parent |
| Clans and hapū in more than one parent | Kinship is a network | Multiple `subgroup_of` with a basis field |
| Dialect continua | Glottolog needs one parent | Keep Glottolog's parent, add `related_to` claims with sources |
| Umbrella ethnonyms | Dayak, "Papua" as categories imposed from outside | Entities flagged as exonym or umbrella |
| Administrative change | 2022 provinces moved regencies, new codes in 2025 | `within` has valid-from and valid-to; old paths stay |

## 2.7 Where the literature warns against a scheme

Papuan scholars call the seven regions culture areas rather than adat areas, warn that dividing provinces along them risks conflict, and say DAP copied a Dutch map (see `customary-regions-and-boundaries-2026-11-17.md`, section 5). For Dayak the umbrella itself is a colonial construct (1.4). Native Land, AIATSIS and Te Kāhui Māngai all say their maps are indicative and not for claims. So in this model a region is data with a source and a date, each overlay page says "reported classification, not a land boundary", and a contested place is shown contested.

## 2.8 One steward per greater customary region

Treat the steward's scope as `steward_scope` claims, set by the operator and open to challenge, not as a fact about the world. Rule: a place or people may be in more than one steward's scope; the steward answering a question is the one the asker's scope selects, and others are shown as "also in".

| Deployment | Suggested steward scope | Cautions |
|---|---|---|
| Tanah Papua | Seven wilayah adat as seven scopes, with Nabire, Mimika and similar places in two. Optionally a first "all Tanah Papua" steward at launch. | The seven are contested and administrative in origin; offer an eighth scope later if a community proposes it (Kossay). |
| Kalimantan | Start with one steward per province (spine) and add cultural-group stewards (Ngaju-Ot Danum, Apo Kayan-Kenyah, Iban, Klemantan, Punan, Kadazan-Dusun) only if Dayak organisations ask for them. | The groupings are disputed. Borneo also crosses into Malaysia and Brunei. |
| Aotearoa | One steward per iwi or iwi-defined region at the request of that iwi, with hapū as sub-communities; a first deployment run by one iwi has one steward. | Rohe overlap, and TKM refuses a single line. Authority comes from the iwi, not from the platform. Te Mana Raraunga principles govern custody. |

---

# Part 3: Public data to seed a Papua deployment

"Account?" says whether a script can fetch it without signing up. "Tested" means I made a request from the research environment on 17 November 2026. Some Indonesian government hosts could not be reached from there (marked), which says nothing about whether they work for you.

## 3.1 Administrative codes and boundaries

| Source | Format and API | Licence or terms | Freshness | Seeds | Account? |
|---|---|---|---|---|---|
| Kepmendagri 300.2.2-2138/2025 (signed 25 April 2025), amended by Kepmendagri 300.2.2-2430/2025 (effective 23 June 2025) [25] | PDF decrees; official text via Kemendagri or JDIH | Government regulation; reuse terms not stated **[UNVERIFIED]** | 2025; amended once. Check for a later amendment. | Authoritative codes down to desa/kelurahan | n/a |
| `cahyadsn/wilayah` on GitHub [26] | SQL dumps by decree year (2016 to 2025); `wilayah.sql` matches 2430/2025; also island data, area, population | MIT licence for the repository; underlying codes are government data. A third-party compilation: verify against the decree. | README cites the 2430/2025 decree; I could not read the commit date | Province, regency, district, kampung codes, names, counts | No. Raw file fetched (HTTP 200). |
| Row check from that README [26] | Papua 91 (8 regencies, 1 city, 948 desa), Papua Barat 92 (803), Papua Selatan 93 (677), Papua Tengah 94 (1,172), Papua Pegunungan 95 (2,617), Papua Barat Daya 96 (939) | same | same | Sanity check totals (about 7,150 desa) | n/a |
| BPS Master File Desa (MFD) and BPS regional master [27] | Publications by BPS provincial offices, updated twice a year via MFD Online; BPS codes are separate from Kemendagri codes | BPS terms **[UNVERIFIED]** | Semester updates | BPS code crosswalk | Publications public |
| BPS Web API [28] | JSON; free key after registration; documented at webapi.bps.go.id/documentation. A page loaded, but its content looked unlike an official BPS page and endpoint details are unconfirmed. | BPS terms **[UNVERIFIED]** | Live | Statistics tables | Needs key (per a BPS leaflet, second-hand) |
| geoBoundaries gbOpen, Indonesia [29] | JSON API then GeoJSON/shapefile. `ADM1`: OpenStreetMap, Wambacher, ODbL, year 2017. `ADM2`: BPS, WFP, OCHA ROAP, CC BY 3.0 IGO, year 2020. `ADM3` and `ADM4` returned 404. | Licence per boundary in metadata; do not assume CC BY | Boundaries are pre-2022; the new provinces will be missing | Regency polygons only, and they predate the 2022 provinces | No. Tested. |
| BIG and Ina-Geoportal [30] | OGC services and downloads of RBI base maps (1:5,000 recommended for village boundaries); village boundary confirmation covers a small share: about 14 to 17 percent of 75,266 villages per two press reports | Terms not found **[UNVERIFIED]**; Ina-Geoportal host unreachable from here | Ongoing | Desa polygons, where confirmed | Unknown |
| OpenStreetMap | Overpass API, planet extracts | ODbL (known) | Live | Points and some admin boundaries | No |

Care: village boundaries are legally unsettled (confirmation covers few villages), customary and administrative boundaries differ, and the 2025 decree shows how a code list can itself be contested (the four-island Aceh and North Sumatra case [25]). Store code lists with a decree reference and date. Wikidata's BPS code property (P1588) is described as last issued in 2021, so do not rely on Wikidata for current codes.

## 3.2 Statistics

| Source | Format | Terms | Freshness | Seeds | Account? |
|---|---|---|---|---|---|
| BPS publications, such as Papua Tengah Province in Figures 2025 and Papua Pegunungan Province in Figures 2024 [31] | PDF and tables on papua.bps.go.id; a "Dalam Angka" edition per province and regency | BPS terms **[UNVERIFIED]** | Annual | Population, area, economy, education, health, per regency | Download public |
| BPS Web API [28] | JSON | key required | Live | Same tables as data | Key |
| data.go.id (Satu Data Indonesia, Perpres 39/2019) [32] | Catalogue, likely CKAN-style API **[UNVERIFIED]** | Per dataset | Varies | Federated national data | Page reachable (HTTP 200); API not tested |
| Provincial portals | Papua Barat: data.papuabaratprov.go.id, CKAN with API link. Papua Tengah: Pergub 20/2025 on Satu Data and a portal called Sadar. Papua: e-PapuaPuData (Pergub 50/2021) [32] | Per dataset | Varies | Local data | CKAN `/api/3/action/package_list` where CKAN; no portal confirmed for Papua Selatan, Papua Pegunungan or Papua Barat Daya |

## 3.3 Politics and government

| Source | Format | Terms and care | Seeds | Account? |
|---|---|---|---|---|
| KPU Pemilu 2024 results via Sirekap (infopemilu.kpu.go.id) [33] | Public web view per TPS; KPU says Sirekap is not the official result, which comes from tiered counting. A past KPU commitment to open an API was reported as not carried through [33]. The hosts I tried were unreachable from here. | Use official recapitulation (by regency, province) not TPS scans. Disputes are active in Papua Tengah (provincial Pilkada reached the Constitutional Court). Show results as "according to KPU recapitulation, date". | Result tables per regency, turnout | Web only; scraping unverified |
| Pilkada 2024 | Same pattern as above; no active API confirmed | Same | Winners, parties | As above |
| DPR and DPRD members | KPU candidate lists and DPR/DPRD sites | Public names, office, party are public; omit home addresses, phones, family, and health | Seats and offices | Web pages |
| APBD and transfers (DJPK, Ministry of Finance) [34] | "Data APBD" page, "Form Download Data APBD", "Rincian Dana Desa per Desa TA 2025" appear on DJPK's most-visited list; some data is requested by form through PPID | Attribute; budgets are plans (APBD) versus outturn (realisasi); do not mix. File formats unconfirmed. | Budgets, transfers, village funds per desa | Pages reachable; whether bulk files need a form is unconfirmed |
| Regulations (peraturan.go.id, JDIHN, regional JDIH) [35] | JDIHN is a hub with member sites that should expose an API; regional JDIH data often outdated. peraturan.go.id and jdihn.go.id were unreachable from here. | Law text; check each member site | UU 14, 15, 16, 29 of 2022; Perda, Perdasus, Pergub | Unconfirmed |
| Village funds | DJPK per-desa table (above) | Aggregate by desa is public; avoid ranking villages in a way that stigmatises them | Per-desa allocations | See above |

**What to show responsibly.** Aggregates by regency or district, with source and date; budget plans labelled as plans; elected officials' public office data; legal texts. Do not show: per-TPS results for a small kampung (secrecy and reprisal risk), allegations about named living people as fact, or compiled lists of persons by ethnicity or religion. This matches `sources-and-sensitive-material-2026-11-16.md`: attribute everything, hold accusations about named living people as claims by their source.

## 3.4 Services

| Source | What | Access | Care |
|---|---|---|---|
| Data Referensi Kemendikdasmen [36] | School reference data keyed on NPSN; schools not updating are flagged; verification at a separate site. The referensi site returned HTTP 200. I could not confirm a bulk CSV per regency. | Browse the site, then test for downloads | Schools data lists institutions, not pupils. Keep it that way; Dapodik itself holds pupil data and is not public. |
| Bappenas Dapodik map layer [36] | A geospatial map of Dapodik 2024 for SLB, SD, SMP, SMA | Catalogue record | Layer coverage and licence unconfirmed |
| Health facilities | Kemenkes facility registries (hosts redirected on test); not confirmed | Unconfirmed | Facility lists are fine; patient data never |
| IDM (Indeks Desa Membangun) [37] | Village index and status per desa. Several district portals post "Per 31 Desember 2025" tables; no Papua file found. | District CKAN portals; official Kemendes host unreachable | An IDM status label ("tertinggal") can stigmatise; show the score and the year |
| Local Contexts and customary registries | BRWA maps [10] | Download policy unconfirmed | Territorial maps are sensitive: ask the custodians before showing |

## 3.5 Images for page headers

Wikimedia Commons accepts only freely licensed or public-domain files. I spot-checked on 17 November 2026 with the MediaWiki API and a descriptive User-Agent (without one, requests were rate-limited). Two measures: files directly in the main category (not in sub-categories), and geotagged files within 10 km of the town centre (coordinates are mine, approximate, **[UNVERIFIED]**). Licences are the geotagged sample.

| Regency | Files in "Category:X Regency" | Sub-categories | Files in "Category:X" (if it exists) | Geotagged within 10 km | Licences in geotagged sample |
|---|---|---|---|---|---|
| Nabire | 25 | 1 | no such category | 7 | CC0 4, CC BY-SA 4.0 2, CC BY-SA 2.0 1 |
| Paniai | 15 | 1 | no such category | 0 (at assumed Enarotali point) | n/a |
| Jayapura | 20 | 9 | 64 (18 sub-categories) | 39 | CC BY-SA 3.0 19, CC BY-SA 4.0 10, CC BY 3.0 5, public domain 4, CC0 1 |
| Manokwari | 47 | 3 | 243 (8 sub-categories) | 88 | CC BY-SA 2.0 44, CC BY-SA 4.0 31, CC BY-SA 3.0 9, CC BY 2.0 3, public domain 1 |
| Merauke | 59 | 8 | 5 (4 sub-categories) | 10 | CC BY 3.0 4, CC BY-SA 3.0 3, CC BY-SA 4.0 2, CC BY 4.0 1 |

Reading: Manokwari and Jayapura are well covered; Nabire, Paniai and Merauke have a few dozen at best. For the many regencies below that, expect nothing, so the engraved cover (already planned) must be the default and photos an upgrade. A script needs no account, but must send a User-Agent and respect rate limits [38]. Credit each file's author and licence from `extmetadata`; CC BY-SA requires share-alike on adaptations, so do not crop and relicense under a different term.

Other openly licensed sources: Wikidata image property (P18) for the same items; Flickr Commons and Flickr's CC-licensed search (needs an API key, **[UNVERIFIED]**); Openverse (aggregator, no-key use possible, **[UNVERIFIED]**); government and church photos are rarely licensed. Photos of people, sacred sites or ceremonies need a community check beyond the licence: a CC licence does not equal consent. Human remains stay without images, as already decided.

---

# Sources

All read 17 November 2026 unless noted. Search-only items are second-hand.

1. ISO 639-3 code tables, terms of use: https://iso639-3.sil.org/code_tables/download_tables
2. Glottolog: https://glottolog.org/ (version 5.4 on the site); downloads page https://glottolog.org/meta/downloads (Zenodo-archived releases)
3. Ethnologue terms, via search: https://ethnologue.com/academic-terms-use and https://ethnologue.com/general-terms-use (direct fetch refused, 403)
4. AUSTLANG: https://collection.aiatsis.gov.au/austlang/about and https://data.gov.au/data/dataset/austlang-dataset-001 (search results; direct fetch refused)
5. Native Land FAQ and essay, quoted in the earlier research: https://native-land.ca/about/faq and https://medium.com/@native-land/a-question-of-borders-79d852adfbaa
6. Native Land API page: https://api-docs.native-land.ca/
7. Wikidata property pages, read through the Wikidata API: https://www.wikidata.org/w/api.php (P172, P2341, P1412, P3823, P1999, P1098, P220, P1394, P1588, P131, P361, P527, Q41710)
8. Wikidata ethnic group item: https://www.wikidata.org/wiki/Q41710
9. Joshua Project terms: https://api.joshuaproject.net/terms_of_use and https://joshuaproject.net/help/terms
10. BRWA figures, secondary: https://data.goodstats.id/statistic/papua-punya-wilayah-adat-terluas-di-indonesia-pada-2026-L5wwG and https://mongabay.co.id/2025/08/14/nasib-pangan-lokal-ketika-pengakuan-wilayah-adat-minim/ (BRWA site itself not read)
11. AMAN guide for Central Kalimantan: https://www.aman.or.id/wp-content/uploads/2021/01/Tata-Cara-Pengakuan-Masyarakat-Adat-di-Provinsi-Kalimantan-Tengah.pdf
12. Permendagri 52/2014 and Papua regional documents, via search: https://sibermatadesa.dpmd.jatimprov.go.id/uploads/regulasi/67.%20Permendagri%2052-2014%20ttg%20Pedoman%20Pengakuan%20dan%20Perlindungan%20Masyarakat%20Hukum%20Adat.pdf and https://jdih.jayapurakab.go.id/common/dokumen/2021pdjypkab008.pdf
13. Te Kāhui Māngai and its disclaimer: https://www.tkm.govt.nz/ and https://www.tkm.govt.nz/disclaimer/ ; dataset request: https://data.govt.nz/datasetrequest/show/40 ; Iwi_Rohe service: https://services.arcgis.com/CXBb7LAjgIIdcsPt/ArcGIS/rest/services/Iwi_Rohe/FeatureServer
14. Te Mana Raraunga principles (October 2018), via a mirror: https://online.op.ac.nz/assets/LearningTeachingDevelopment/TMR+Maori+Data+Sovereignty+Principles+Oct+2018.pdf
15. Kaitiakitanga licence, via mirror: https://worker-github.zxx930427.workers.dev/TeHikuMedia/Kaitiakitanga-License/blob/tumu/papareo_api.md ; background https://www.taiuru.maori.nz/maori-data-sovereignty-licences/
16. Dayak classification (secondary): https://wikipedia.com/wiki/Dyaks and https://jltr.academypublication.com/index.php/jltr/article/download/10062/8159/32003
17. Central Kalimantan customary institutions: https://peraturan.bpk.go.id/Download/59720/Perda%20No.%208%20Tahun%202017%20Tentang%20Kelembagaan%20Adat%20Dayak.pdf and https://www.locjkt.or.id/application/docliblcjkt/upload/Hasil%20Studi%20SKTA%20Kalteng%20by%20Ricardo%20Simarmata.pdf
18. Sámi electoral roll and statistics: https://www.nhri.no/wp-content/uploads/2020/08/StatistikkUrfolk_ENG_web_1708.pdf and https://www.ssb.no/en/sametingsvalg
19. OCAP: https://en.wikipedia.org/wiki/First_Nations_principles_of_OCAP (FNIGC's own site, fnigc.ca, not read)
20. AIATSIS Map of Indigenous Australia: https://aiatsis.gov.au/explore/map-indigenous-australia
21. CARE principles: https://account.datascience.codata.org/index.php/up-j-dsj/article/view/dsj-2020-043 and https://www.auckland.ac.nz/en/research/research-resources/research-data/research-data-policies-ethics-requirements/care-principles-indigenous-data.html
22. Local Contexts API guide v2: https://localcontexts.org/support/api-guide/v2/ ; DataCite note: https://support.datacite.org/docs/local-contexts-notices-and-labels
23. Local Contexts labels: https://localcontexts.org/labels/about-the-labels/ ; Mukurtu and the Hub: https://docs.mukurtu.org/local-contexts/UnderstandingTheLocalContextsHub/
24. Mukurtu communities, cultural protocols, categories: https://docs.mukurtu.org/communities-cultural-protocols-categories/UnderstandingCommunitiesAndCulturalProtocols/ and https://sustainableheritagenetwork.org/system/files/atoms/file/Communities_CulturalProtocols_Categories.pdf
25. Kepmendagri 2138/2025 and 2430/2025, via search: https://www.komunitasbelajar.id/2025/05/pemberian-dan-pemutakhiran-kode-data.html and https://www.hukumonline.com/berita/a/polemik-rebutan-pulau-antara-aceh-sumut-perlu-penanganan-hati-hati-dan-solusi-terbaik-lt684d158d9307b
26. cahyadsn/wilayah: https://github.com/cahyadsn/wilayah (README read via https://raw.githubusercontent.com/cahyadsn/wilayah/master/README.md)
27. BPS master files: https://papua.bps.go.id/en/publication/2023/04/07/c2650517156bd78a35c3885c/master-file-desa-provinsi-papua-semester-1.html and https://ppid.bps.go.id/upload/doc/Leaflet_Pelayanan_Statistik_Terpadu_1709099848.pdf
28. BPS Web API: https://webapi.bps.go.id/documentation/
29. geoBoundaries: https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM1/ and .../ADM2/ ; project: https://github.com/wmgeolab/geoBoundaries
30. BIG and village boundaries, via search: https://www.big.go.id/ ; https://nasional.kontan.co.id/news/ditjen-bina-pemdes-targetkan-penyelesaian-batas-desa-di-5000-desa-hingga-2029
31. BPS Papua publications: https://papua.bps.go.id/en/publication/2025/02/28/5a91ad05d70a5c9f24abd8df/papua-tengah-province-in-figures-2025.html and https://papua.bps.go.id/en/publication/2024/02/28/cb8c29a69d5c6f9b146e6375/provinsi-papua-pegunungan-dalam-angka-2024.html
32. Satu Data and provincial portals: https://data.go.id/ ; https://data.papuabaratprov.go.id/group/ ; https://jdih.papuatengahprov.go.id/common/dokumen/2025pg3166020.pdf ; https://data.go.id/news/2024/06/hadapi-berbagai-tantangan-satu-data-indonesia-fokus-integrasi-di-provinsi-papua/497
33. KPU data and Sirekap, via search: https://merahputih.com/post/read/data-hasil-penghitungan-suara-pemilu-2024-bisa-dilihat-publik ; https://opengovpartnership.org/members/indonesia/commitments/ID0098 ; https://berkas.dpr.go.id/pusaka/files/info_singkat/Info%20Singkat-XVII-7-II-P3DI-April-2025-212.pdf
34. DJPK: https://djpk.kemenkeu.go.id/ and https://djpk.kemenkeu.go.id/wp-content/uploads/2026/08/Laporan_Layanan_Informasi_DJPK_Bulan_Juni_2026.pdf
35. JDIH: https://www.hukumonline.com/berita/a/jdih-pemda-belum-optimal--kppod-minta-kemendagri-buat-sop-dan-sanksi-tegas-lt68a2c712b8b7f/
36. Data Referensi Kemendikdasmen: https://referensi.data.kemendikdasmen.go.id/pustaka/satuan_pendidikan ; Bappenas layer: https://datarenbang.bappenas.go.id/geoportal/srv/api/records/f76ebac8-8acb-436e-a025-5a00eb02856f
37. IDM examples: https://data.sumbawabaratkab.go.id/dataset/indeks-desa-membangun-idm ; https://ckan.diskominfo.sultengprov.go.id/dataset/status-desa-di-provinsi-sulawesi-tengah-berdasarkan-indeks-desa-membangun-idm-2024
38. Wikimedia API access policy and rate limits: https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy ; Commons API queried at https://commons.wikimedia.org/w/api.php
