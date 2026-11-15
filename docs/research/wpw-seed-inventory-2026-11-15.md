# WPW seed inventory (West Papua Watch to ETNOS knowledge layer)

Date: 2026-11-15. Read-only research. Nothing in the WPW clone was changed.

Source clone: `/home/user/yohn-maistre/westpapua-watch` (HEAD `658f55f`). Live site: https://westpapua.watch (about 10 public URLs fetched once each).

Paths below are relative to the WPW repo root unless they start with `/`. "Not stated" means WPW records no licence or rights position for the item.

## Summary

WPW is an Astro site. Its knowledge content is typed JSON in `content/`, not Markdown. There is no licence file in the repo, and no statement of the licence of WPW's own text. All WPW prose, captions and translations are therefore "not stated".

What is there, and its scale:

| Area | What | Scale |
| --- | --- | --- |
| History (curated chapters) | `content/history.json` | 11 chapters |
| History (explorer) | `content/history-explorer.json` | 42 dated records, 2026-10-08 review |
| History (reading) | `content/history-reading.json` | 61 chapters, 20 extra records, 25 text overrides with per-paragraph source URLs, 14 eras |
| Other timelines | `content/merauke-timeline.json` | 42 dated entries, 2010 to 2026 |
| Archive media | `content/archive-media.json` | 77 items (32 photo, 34 document, 11 film) in 7 sections |
| Local media | `public/images/history/` and `public/media/history/` | 295 WebP, 24 JPG, 5 MP4 under `public/` |
| Exhibition | `content/exhibition.json` | 56 works, crafts and voices, mostly link-only |
| Reference sources | `content/reference-sources.json` | 91 cited sources |
| Library candidates | `content/research/library-candidates.json` | 372 bibliography leads (238 P0) |
| Live library API | `/api/resources` | 382 items (148 research, 51 books, 47 reports, 17 datasets, 17 films) |
| Languages | `public/data/languages.geojson` | 256 language reference points (Glottolog 5.3) |
| Cultural regions | `geo/build.mjs` | 7 customary-style regions, 49 regency names |
| Statistics | `content/data/*.json` | HDI, poverty, APBD, Otsus, SPPG, observations |
| News registry | `content/news-sources.json` | 18 publishers, 17 enabled, 11 with RSS feeds |
| Organisations | `content/organizations.json` | 39 organisations |
| Species / environment data | none | Only linked papers and reports. No species dataset exists. |

Main findings:

- WPW is a curation layer. Almost all history text cites external sources and WPW holds few of the originals. Going to the originals is the right plan.
- The strongest openly licensed source is the ANU Press book "West New Guinea: Social, Biological, and Material Histories" (Gaffney and Tolla, 2025, Terra Australis). WPW cites it for 17 history records. WPW's own figure records carry CC BY-NC-ND 4.0.
- The strongest open images are 11 Nationaal Archief photos (CC0 1.0), 5 Open Beelden films (CC BY-SA 3.0 or 3.0 NL), 3 Australian War Memorial items (public domain), and 2 KITLV items (CC BY 4.0).
- Languages: 256 points, but only name, Glottocode and family. No speaker counts, ISO codes, or boundaries.
- Cultural regions are not stored as data. The membership is a hardcoded object in `geo/build.mjs`. See section 3.
- There is no biodiversity, music or art dataset. There are linked sources only (section 2, 3).

---

## 1. History content

### 1a. Curated history chapters (`content/history.json`, 11 chapters, bilingual en and pmy)

Used by the main `/history/` page. Rights of the WPW text: not stated.

| id | Date | Title | Original sources cited (id in `reference-sources.json`) | Image and credit | Image rights |
| --- | --- | --- | --- | --- | --- |
| history-living | Living history | A place of many peoples | UNESCO Noken listing (`unesco-noken`) https://ich.unesco.org/en/USL/noken-multifunctional-knotted-or-woven-bag-handcraft-of-the-people-of-papua-00619 | `public/images/history/noken-2017.jpg`, Nurul Ichlasiah, https://commons.wikimedia.org/wiki/File:Noken.jpg | CC BY-SA 4.0 |
| history-1949 | 1949 to 1960 | A colonial future contested | HRW 2001 (`hrw-congress-2001`); Kluge 2025 (`kluge-petitions`) | none | n/a |
| history-1961 | 1961 | A council, a flag, an aspiration | HRW 2000 (`hrw-history-2000`) | `council-1961.jpg`, Jack de Nijs / Anefo, Nationaal Archief (Commons) | CC0 |
| history-1962 | 1962 to 1963 | An agreement without Papuan signatories | UN New York Agreement; UNSF background; Saltford | none | n/a |
| history-1969 | 1969 | The choice that remains disputed | UN GA 2504 (1969); Saltford; HRW 2000 | none | n/a |
| history-land | 1970s onward | Land and the meaning of development | AJAR "All the Birds Are Gone"; NASA Grasberg | `grasberg-2005.jpg`, NASA / ISS Crew Earth Observations | "NASA imagery" (no licence named) |
| history-mambesak | 1978 to 1984 | Culture as a public voice | Muman Minggil documentary (`muman-minggil`) | none | n/a |
| history-reformasi | 1998 to 2000 | An opening for public organising | HRW 2001 | none | n/a |
| history-2001 | 2001 onward | Autonomy and its unfinished promises | Otsus Law 2001; AJAR "I Am Here" | none | n/a |
| history-2014 | 2014 onward | A movement across borders | ULMWP Saralana Declaration; ULMWP background | none | n/a |
| history-today | 2020s | Safety, dignity and the right to be heard | OHCHR 2022; OHCHR 2024 | none | n/a |

### 1b. History explorer records (`content/history-explorer.json`, 42 records)

Each record has `year`, `era`, `paths`, bilingual `title` and `body`, and `sources[]` with title, publisher and URL. `archiveIds` and `places` are empty in this file. Rights of WPW text: not stated. Rights of the cited sources: not recorded in this file (see 1e for the plates). Years below are as stored; negative is BCE.

| id | Year | Title | First cited original source |
| --- | --- | --- | --- |

| history-geography | -100000 | An island shaped by movement | Tectonics of the New Guinea region (Baldwin, Fitzgerald & Webb · 2012) https://doi.org/10.1146/annurev-earth-040809-152540 |
| history-sahul | -60000 | Sahul and the sea crossings | West New Guinea: Social, Biological, and Material Histories (Gaffney & Tolla · ANU Press · 2025) https://press.anu.edu.au/publications/series/terra-australis/west-new-guinea |
| history-coastlines | -9500 | Changing shores and island connections | West New Guinea: Social, Biological, and Material Histories (Gaffney & Tolla · ANU Press · 2025) https://press.anu.edu.au/publications/series/terra-australis/west-new-guinea |
| history-gardens | -7000 | Gardens and wetland cultivation | West New Guinea: Social, Biological, and Material Histories (Gaffney & Tolla · ANU Press · 2025) https://press.anu.edu.au/publications/series/terra-australis/west-new-guinea |
| history-pottery | -1500 | Pottery and contact in Raja Ampat | The archaeology of pottery in Raja Ampat (Gaffney & Tanudirjo · ANU Press) https://press-files.anu.edu.au/downloads/press/n12314/pdf/ch17.pdf |
| history-austronesian | -1501 | Austronesian languages and local contact | The languages of West New Guinea (Laura Arnold · ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch03.pdf |
| history-languages | 1500 | Many language families | The languages of West New Guinea (Laura Arnold · ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch03.pdf |
| history-population | 1501 | Movement, contact and ancestry | Population histories of West New Guinea (Jacobs, Kusuma & Attenborough · ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch04.pdf |
| history-pacific | 1502 | Melanesia and Polynesia | Genomic insights into the peopling of the Southwest Pacific (Skoglund et al. · 2016) https://pmc.ncbi.nlm.nih.gov/articles/PMC5515717/ |
| history-leadership | 1503 | Regional systems of authority | Sistem Politik Tradisional di Irian Jaya (J. R. Mansoben · 1995) https://www.papuaerfgoed.org/sites/default/files/collectie/files/2004-01/Mansoben_1995_Sistem.pdf |
| history-exchange | 1504 | Routes through the highlands | Sistem Politik Tradisional di Irian Jaya (J. R. Mansoben · 1995) https://www.papuaerfgoed.org/sites/default/files/collectie/files/2004-01/Mansoben_1995_Sistem.pdf |
| history-tidore | 1600 | Western coasts and Maluku | Topics relating to Netherlands New Guinea in nineteenth-century memoranda (J. A. Overweel · 1995) https://www.papuaerfgoed.org/sites/default/files/collectie/files/2004-10/Overweel_1995_Topics_13.pdf |
| history-sago | 1601 | Sago forests and customary land | A sweetness like unto death: voices of the indigenous Malind of Merauke (Forest Peoples Programme · 2013) https://www.forestpeoples.org/publications-resources/reports/article/a-sweetness-like-unto-death-voices-of-the-indigenous-malind-of-merauke-papua/ |
| history-khombouw | 1602 | Khombouw around Lake Sentani | Fansoway Art: galeri karya seni dan kerajinan Kampung Asei Besar (Jubi · 2024) https://jubi.id/seni-budaya/2024/fansoway-art-galeri-karya-seni-dan-kerajinan-kampung-asei-besar-sentani/ |
| history-noken-practice | 1603 | Making and carrying noken | Noken, multifunctional knotted or woven bag handcraft (UNESCO) https://ich.unesco.org/en/USL/noken-multifunctional-knotted-or-woven-bag-handcraft-of-the-people-of-papua-00619 |
| history-1828 | 1828 | Fort Du Bus | Topics relating to Netherlands New Guinea in nineteenth-century memoranda (J. A. Overweel · 1995) https://www.papuaerfgoed.org/sites/default/files/collectie/files/2004-10/Overweel_1995_Topics_13.pdf |
| history-1898 | 1898 | Permanent colonial stations | Topics relating to Netherlands New Guinea in nineteenth-century memoranda (J. A. Overweel · 1995) https://www.papuaerfgoed.org/sites/default/files/collectie/files/2004-10/Overweel_1995_Topics_13.pdf |
| history-merauke-station | 1902 | Merauke and the southern administration | Topics relating to Netherlands New Guinea in nineteenth-century memoranda (J. A. Overweel · 1995) https://www.papuaerfgoed.org/sites/default/files/collectie/files/2004-10/Overweel_1995_Topics_13.pdf |
| history-mission-schooling | 1903 | Missions, teachers and schooling | Educating Children, Civilizing Society (Maaike Derksen · International Review of Social History) https://www.cambridge.org/core/journals/international-review-of-social-history/article/educating-children-civilizing-society-missionary-schools-and-noneuropean-teachers-in-south-dutch-new-guinea-19021942/2991790133D3B7E11667F9C5AFE1B065 |
| history-digoel | 1927 | Boven Digoel | West New Guinea: Social, Biological, and Material Histories (Gaffney & Tolla · ANU Press · 2025) https://press.anu.edu.au/publications/series/terra-australis/west-new-guinea |
| history-koreri | 1938 | Koreri movements | Koreri: Messianic Movements in the Biak-Numfor Culture Area (Freerk Kamma · 1972) https://www.papuaerfgoed.org/sites/default/files/collectie/files/2003-10/Kamma%201972_koreri.pdf |
| history-wwii | 1944 | War on Papuan land | Tracing the remains of World War II on Biak Island (ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch14.pdf |
| history-papuanisation | 1955 | Papuanisation and political organisation | Papua Road Map (LIPI · 2009) https://www.obor.or.id/Papua-Road-Map |
| history-1963 | 1963 | Administration transferred to Indonesia | Papua Road Map (LIPI · 2009) https://www.obor.or.id/Papua-Road-Map |
| history-freeport-contract | 1967 | Freeport’s first contract | History of PT Freeport Indonesia (PT Freeport Indonesia) https://ptfi.co.id/en/about/history |
| history-highlands-1977 | 1977 | Violence in the Central Highlands | Central Highlands investigation, 1977–78 (Asian Human Rights Commission · 2013) https://tapol.org/sites/default/files/sites/default/files/pdfs/NeglectedGenocideAHRC.pdf |
| history-women-testimony | 2000 | Care, work and political memory | I am Here: Voices of Papuan Women (AJAR · 2019) https://asia-ajar.org/wp-content/uploads/2019/04/I-am-Here-Voices-of-Papuan-Women-2019.pdf |
| history-mifee | 2010 | MIFEE in Merauke | A sweetness like unto death: voices of the indigenous Malind of Merauke (Forest Peoples Programme · 2013) https://www.forestpeoples.org/publications-resources/reports/article/a-sweetness-like-unto-death-voices-of-the-indigenous-malind-of-merauke-papua/ |
| history-racism-2019 | 2019 | Anti-racism protests | If It’s Not Racism, What Is It? (Human Rights Watch · 2024) https://www.hrw.org/report/2024/09/18/if-its-not-racism-what-is-it/discrimination-and-other-abuses-against-papuans-in |
| history-internet-ruling | 2020 | The internet shutdown ruling | Court ruling on internet blackout (Amnesty International Indonesia · 2020) https://www.amnesty.id/kabar-terbaru/siaran-pers/court-ruling-on-internet-blackout-is-a-rare-victory-for-freedom-of-expression-in-papua/06/2020/ |
| history-psn-2023 | 2023 | New food and energy programmes | Merauke National Strategic Project timeline (Yayasan Pusaka Bentala Rakyat) https://pusaka.or.id/en/lini-masa/merauke-national-strategic-project-timeline/ |
| history-raja-permits | 2025 | Four Raja Ampat permits revoked | Four mining permits revoked in Raja Ampat (Ministry of Energy and Mineral Resources · 2025) https://www.esdm.go.id/en/media-center/news-archives/pemerintah-cabut-empat-izin-perusahaan-tambang-di-raja-ampat |
| history-andarewa | -26000 | Occupation on the Bomberai Peninsula | Last Glacial Maximum to Late Holocene occupation on the Bomberai Peninsula (Mene, Setiawan & Gaffney · ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch09.pdf |
| history-sentani-settlements | -2000 | Living around Lake Sentani | Prehistoric sites in the western Lake Sentani area (Hari Suroto · ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch12.pdf |
| history-kayu-batu-pottery | -1900 | Decorated pottery at Kayu Batu | Decorated pottery from the Kayu Batu area, Jayapura (Klementin Fairyo · ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch13.pdf |
| history-keerom-rock-art | -1800 | Rock art and territory in Keerom | Rock art from caves in the Keerom Regency, Papua Province (Klementin Fairyo · ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch11.pdf |
| history-meege | 1602 | Meege and family relationships | Meege as bride price in Mee culture (Martinus Tekege · ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch18.pdf |
| history-muyu-makers | 2012 | Muyu makers and the noken economy | Muyu noken (men): Shifting economic opportunities and cultural values (Veronika Triariyani Kanem · ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch19.pdf |
| history-kamoro-collections | 1828.5 | Kamoro objects and collecting relationships | A collection of relationships: Kamoro material culture in the museum (Karen Jacobs · ANU Press · 2025) https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch20.pdf |
| history-untea | 1962.8 | Seven months under UN administration | UNSF / UNTEA historical background (United Nations Peacekeeping) https://peacekeeping.un.org/en/mission/past/unsfbackgr.html |
| history-otsus-revision | 2021 | Revising special autonomy | Law No. 2 of 2021 (JDIH Ministry of Finance) https://jdih.kemenkeu.go.id/dok/uu-2-tahun-2021 |
| history-new-provinces | 2022 | Four new provinces | Law No. 14 of 2022: Papua Selatan (BPK legal database) https://peraturan.bpk.go.id/Details/217796/uu-no-14-tahun-2022 |

Other sources in these records: Overweel (1995) memoranda, Kamma (1972) Koreri, Mansoben (1995) traditional politics, all hosted by Stichting Papua Erfgoed (papuaerfgoed.org); LIPI "Papua Road Map" (obor.or.id); Skoglund et al. 2016 (PMC5515717); Baldwin et al. 2012 (doi 10.1146/annurev-earth-040809-152540); AHRC 1977-78 highlands report (tapol.org); AJAR "I am Here" 2019 (asia-ajar.org); HRW 2024 racism report; Amnesty Indonesia 2020; Pusaka Merauke timeline; ESDM 2025 Raja Ampat release; UN Peacekeeping UNSF page; Indonesian laws (jdih.kemenkeu.go.id, peraturan.bpk.go.id, mkri.id).

### 1c. History reading records and chapters (`content/history-reading.json`)

Structure: 14 eras (Landscape; Early settlement; Coasts and contact; Regional accounts; Maritime relations; 1828 to 1937; 1938 to 1945; 1949 to 1960; 1961 to 1969; 1970 to 1997; 1998 to 2009; 2010 to 2020; 2021 onward; Current). 61 chapters. 25 `overrides` hold paragraph text, and each paragraph carries `sourceUrls`. `reviewedAt` is 2026-10-10. Rights of WPW text: not stated.

The 20 extra `records` are all 1855 to 2023 political and rights events. Each cites 1 to 3 sources, mostly news and NGO reports:

| id | Year | Title | Example cited sources |
| --- | --- | --- | --- |

| history-mansinam | 1855 | Mansinam and the mission | They brought us the light (United Evangelical Mission · Martina Pauly); Educating Children, Civilizing Society (Maaike Derksen · International Review of Social History) |
| history-resistance | 1965 | Resistance and the OPM | The Current Status of the Papuan Pro-Independence Movement (IPAC · Report 21 · 24 August 2015); Anatomy of an Occupation: The Indonesian Military in West Papua (Jim Elmslie, Camellia Webb-Gannon & Pet |
| history-border-1984 | 1984 | Border crossings and political networks | The Integration of Refugees into a Host Country (Rosemary Preston · International Migration Review · 1992); Dwelling in Exile (Diana Glazebrook · 2001) |
| history-yosepha | 1994 | Yosepha Alomang and Amungme land | Yosepha Alomang (Goldman Environmental Prize · 2001 recipient); The Amungme, Kamoro & Freeport: How Indigenous Papuans Have Resisted (Abigail Abrash · Cultural Survival) |
| history-fronts-dialogue | 2008 | Political fronts and dialogue | The Current Status of the Papuan Pro-Independence Movement (IPAC · Report 21 · 24 August 2015); Talks between Jakarta and Papua: An Interview with Neles Tebay (Peace Brigades International · 7 July 20 |
| history-amungme-courts | 2009 | Amungme claims in court | Amungme tuntut Freeport lagi (Rohmatin Bonasir · BBC Indonesia · 9 March 2010); Papuan Tribesmen Sue Freeport for Rights Violations (Jakarta Globe · 17 July 2009 · ETAN archive) |
| history-kiwirok | 2021 | Kiwirok, displacement and care | TPNPB allegedly attacks health center in Kiwirok, murders a nurse (Jubi / West Papua Daily · 20 September 2021); Destroy them first… discuss human rights later: Kiwirok investigation (Human Rights Mon |
| history-aerial-investigations | 2023 | Investigating aerial attacks | Free Fire Zone: West Papua (Declassified Australia · 11 September 2023); Destroy them first… discuss human rights later: Kiwirok investigation (Human Rights Monitor · August 2023) |
| history-paniai | 2014 | Paniai and accountability | Anggota TNI ditetapkan sebagai tersangka pelanggaran HAM berat Paniai (BBC Indonesia · March 2022); Statement on the Paniai acquittal (LBH Papua · Suara Papua · 9 December 2022) |
| history-church-institutions | 1956 | Church institutions and Papuan leadership | Sejarah GKI di Tanah Papua (Sinode GKI di Tanah Papua · institutional history); Pergerakan Ekumene GKI di Tanah Papua, 1962–2020 (MURAI · STFT GKI I.S. Kijne · 2024) |
| history-kobe-oser | 1962 | Kobe Oser and diaspora organising | Document 4430: Kobe Oser meeting (Huygens ING · Dutch diplomatic records · 6 February 1962); Kobe Oser freedom march in The Hague (Nationaal Archief · 9 May 1969 · inventory 347035) |
| history-wasior-wamena | 2003 | Wasior, Wamena and investigations | Komnas HAM Tolak Pendekatan Politik dalam Selesaikan Kasus Wasior-Wamena (VOA Indonesia · 2016) |
| history-mimika-health | 1999 | Health infrastructure in Mimika | About Rumah Sakit Mitra Masyarakat (RSMM · institutional history); LPMAK Sustainability Report 2019 (LPMAK / YPMAK · 2019) |
| history-timika-1995 | 1994 | Military violence around Timika | Irian Jaya: National Commission confirms violations (Amnesty International · 1995) |
| history-mapenduma | 1996 | Mapenduma and Geselema | Blood on the cross (Mark Davis · Pacific Journalism Review · 2000); Trahi par l’armée indonésienne, le CICR demande des comptes (Le Temps · 15 March 2000) |
| history-biak | 1998 | Biak massacre | Biak: the flag-raising and military attack (Human Rights Watch · 1998); Names Without Graves (ELSHAM Papua & church investigators · 1999) |
| history-abepura | 2000 | Abepura: raids on students | The Abepura case (Human Rights Watch · 2001); Justice denied for the victims of Abepura (Amnesty International · 2005) |
| history-theys | 2001.85 | The killing of Theys Eluay | Kopassus troops jailed over Papua leader’s murder (ABC News · 21 April 2003) |
| history-wamena | 2003 | Wamena: raids and displacement | Wasior and Wamena: the cases awaiting justice (BBC Indonesia · 2017); Komnas HAM rejects a solely political settlement (VOA Indonesia · 2016) |
| history-nduga | 2018 | Nduga: families displaced by operations | Communication to Indonesia concerning Nduga (UN Special Procedures · 2019); Frightened and displaced: Papua children haunted by conflict (Al Jazeera · 5 June 2019) |

Override paragraphs with source URLs, relevant for earliest history and anthropology: `history-geography`, `history-sahul`, `history-coastlines`, `history-andarewa`, `history-mololo`, `history-toe-kria`, `history-sentani-settlements`, `history-kayu-batu-pottery`, `history-keerom-rock-art`, `history-austronesian`, `history-pottery`, `history-languages`, `history-leadership`, `history-exchange`, `history-sago`, `history-tidore`, `history-khombouw`, `history-noken-practice`, `history-muyu-makers`, `history-meege`, `history-kamoro-collections`, `history-1828`, `history-merauke-station`, `history-wwii`, `history-living`. Main example source: https://press.anu.edu.au/publications/series/terra-australis/west-new-guinea.

### 1d. Other timelines

| File | Entries | Scope | Sources | Rights |
| --- | --- | --- | --- | --- |
| `content/merauke-timeline.json` | 42 (2010 to 2026-09-18) | Merauke food and energy estate (MIFEE, PSN) | each entry has `source` URL and `publisher`; mainly Ginting and Pye (ASEAS 2013), Pusaka, Greenpeace, Mongabay | Not stated |
| `content/following-timelines.json`, `content/following.json` | topic timelines | Land, mining, Raja Ampat, Merauke | news and NGO URLs | Not stated |
| `content/conflict-map.json` | small | Conflict map reference | Human Rights Monitor reports | Not stated |

### 1e. History images and media (`content/archive-media.json`, 77 items)

Fields: `id`, `section`, `date`, `title`, `place`, `mediaType`, `archive.institution`, `archive.identifier`, `archive.sourceUrl`, `editorial.caption`/`context`, `access.mode` (`self_host`, `external`, `editorial`), `access.rightsStatus`, `access.license`, `rightsVerifiedAt`. Local files: `public/images/history/archive/` (16 JPG), `public/images/history/research/` (106 files), `public/media/history/*.mp4` (5 films).

Rights summary across all 77:

| WPW rightsStatus | Count | Meaning |
| --- | --- | --- |
| unknown | 38 | Linked or shown as editorial context. Rights not stated. |
| cc_by_nc_nd | 16 | ANU Press book figures, CC BY-NC-ND 4.0 |
| cc0 | 11 | Nationaal Archief photos (some via Wikimedia Commons) |
| cc_by_sa | 6 | Open Beelden films (CC BY-SA 3.0 NL or 3.0) and the noken photo (CC BY-SA 4.0) |
| public_domain | 3 | Australian War Memorial |
| cc_by | 2 | KITLV photos (CC BY 4.0; one is a Commons copy) |
| restricted | 1 | One item flagged restricted |

Openly licensed items with stated credit and original source (the best candidates to import):

| id | Date | Title | Institution, identifier | Original source URL | Licence (as stated) |
| --- | --- | --- | --- | --- | --- |

| archbold-baliem-1938 | c. 1938 | Baliem Valley during the Archbold expedition | Leiden University Libraries / KITLV, KITLV 113841 | https://commons.wikimedia.org/wiki/File:Archbold_expeditie_in_de_Baliem-vallei,_KITLV_113841.tiff | CC BY 4.0 |
| awm-hollandia-1944 | 22 Apr 1944 | Invasion of Hollandia | Australian War Memorial, F01731 | https://www.awm.gov.au/collection/F01731 | Public domain |
| awm-merauke-1944 | 24 May 1944 | Merauke Force | Australian War Memorial, F01742 | https://www.awm.gov.au/collection/C189088 | Public domain |
| awm-noemfoor-1944 | 1944–1945 | Noemfoor | Australian War Memorial, F02155 | https://www.awm.gov.au/collection/C189399 | Public domain |
| openbeelden-conference-1950 | 4 Dec 1950 | New Guinea conference opens | Netherlands Institute for Sound and Vision / Open Beelden, Week 50-49 | https://vpro.openbeelden.nl/media/1493/Opening_van_de_Nieuw_Guinea_conferentie.nl | CC BY-SA 3.0 NL |
| serido-biak-1950 | 1950 | Coastal kampung at Serido | Nationaal Archief, 142-1255 | https://commons.wikimedia.org/wiki/File:Zeekampong_Serido_(Biak),_Bestanddeelnr_142-1255.tif | CC0 1.0 |
| hollandia-housing-1953 | Oct 1953 | Housing in Hollandia | Nationaal Archief, 142-1218 | https://commons.wikimedia.org/wiki/File:Huizenbouw_in_Hollandia,_Bestanddeelnr_142-1218.tif | CC0 1.0 |
| manokwari-street-1954 | Nov 1954 | Manokwari’s main street | Nationaal Archief, 142-1087 | https://commons.wikimedia.org/wiki/File:De_hoofdstraat_in_Manokwari,_Bestanddeelnr_142-1087.tif | CC0 1.0 |
| openbeelden-mld-1955 | 1 Jan 1955 | Biak to the Wissel Lakes | Netherlands Institute for Sound and Vision / Open Beelden, Week 55-02 | https://eye.openbeelden.nl/media/17389 | CC BY-SA 3.0 NL |
| mokmer-biak-1955 | Jul 1955 | Mokmer airfield | Nationaal Archief, 142-0422 | https://commons.wikimedia.org/wiki/File:Het_Mokmer-vliegveld_te_Biak,_Bestanddeelnr_142-0422.tif | CC0 1.0 |
| fakfak-neighbourhood-1956 | Oct 1956 | A neighbourhood in Fakfak | Nationaal Archief, 144-0640 | https://commons.wikimedia.org/wiki/File:Chinese_woonwijk_te_Fak-Fak,_Bestanddeelnr_144-0640.tif | CC0 1.0 |
| openbeelden-clinic-ship-1958 | 17 Nov 1958 | A clinic ship for Raja Ampat | Netherlands Institute for Sound and Vision / Open Beelden, Week 58-47 | https://www.openbeelden.nl/media/118796/Tewaterlating_van_polikliniekschip_voor_Nieuw_Guinea.nl | CC BY-SA 3.0 NL |
| sentani-powe-1958 | Mar 1958 | Powë, Lake Sentani | Nationaal Archief, 142-1269 | https://commons.wikimedia.org/wiki/File:Kampong_Pow%C3%AB,_gelegen_aan_een_eilandje_in_het_Sentani-meer,_Bestanddeelnr_142-1269.tif | CC0 1.0 |
| merauke-street-1961 | Nov 1961 | A street in Merauke | Nationaal Archief, 142-0820 | https://commons.wikimedia.org/wiki/File:Een_straatje_te_Merauke,_Bestanddeelnr_142-0820.tif | CC0 1.0 |
| council-election-1961 | Feb 1961 | Council election in Hollandia | Nationaal Archief, 144-0367 | https://commons.wikimedia.org/wiki/File:Verkiezingen_voor_de_Nieuw-Guinea_Raad._Hollandia._Nicolaas_Jouwe_en_J.O._de_Rijke_reiken_elkaar_de_vriendenhand,_Bestanddeelnr_144-0367.tif | CC0 1.0 |
| council-opening-1961 | 5 Apr 1961 | Opening of the New Guinea Council | Nationaal Archief, 143-0126 | https://commons.wikimedia.org/wiki/File:Opening_Nieuw-Guinea_Raad,_Bestanddeelnr_143-0126.tif | CC0 1.0 |
| openbeelden-flag-1961 | 17 Nov 1961 | Flags made for New Guinea | Netherlands Institute for Sound and Vision / Open Beelden, Week 61-48 | https://eye.openbeelden.nl/media/670291/Vlag_voor_Nieuw_Guinea.en | CC BY-SA 3.0 |
| openbeelden-plateel-1962 | 3 Oct 1962 | Farewell of Governor Plateel | Netherlands Institute for Sound and Vision / Open Beelden, Week 62-41 | https://eye.openbeelden.nl/media/17560/Nieuws_uit_Nieuw_Guinea_afscheid_van_gouverneur_Plateel.en | CC BY-SA 3.0 |
| evacuees-1962 | 29 May 1962 | Evacuees from Biak and Fak-Fak | Nationaal Archief / Anefo, 347034_040 | https://commons.wikimedia.org/wiki/File:Evacu%C3%A9s_uit_Biak_en_Fak-Fak_arriveerden_op_Schiphol,_Bestanddeelnr_347034_040.tif | CC0 1.0 |
| noken-documentation-2017 | 2017 | Noken documentation | Nurul Ichlasiah, not stated | https://commons.wikimedia.org/wiki/File:Noken.jpg | CC BY-SA 4.0 |
| digoel-camp | 1920s–1930s; photograph date uncertain | Tanahmerah detention settlement | Leiden University Libraries · KITLV, KITLV 400106 · album A1243 | https://digitalcollections.universiteitleiden.nl/view/item/899426 | CC BY 4.0 · Commons copy |
| council-amsterdam-1961 | 7 September 1961 | Council delegation in Amsterdam | Nationaal Archief, 912-9030 | https://commons.wikimedia.org/wiki/File:Nieuw-Guinea_raad_in_Amsterdam_De_groep_op_de_binnenplaats,_Bestanddeelnr_912-9030.jpg | CC0 1.0 |

The 16 ANU Press figures (CC BY-NC-ND 4.0) are: geology-plate, sahul-plate, coastlines-plate, andarewa-plate, authority-plate, language-plate, sentani-plate, kayu-batu-plate, keerom-plate, kamoro-1828-plate, marind-canoes-1902-plate, biak-war-plate, exchange-shell-plate, meege-plate, pottery-waigeo-plate, province-plate. Source chapters are at `https://press-files.anu.edu.au/downloads/press/n13144/pdf/chNN.pdf`. `docs/research/history-visual-provenance-2026-10-10.csv` (50 rows) repeats the credit and licence per image.

Link-only or rights-unknown archive items, with original holder (do not import files):
Australian National University "Schetskaart van Nieuw Guinee, Sheet I" 1919 (https://digitalcollections.anu.edu.au/items/c0e7aad1-d4a4-4ae3-9026-bb6de9bc82f1); NFSA "Merauke on film" c.1925; Smithsonian Libraries "Mamberamo expedition films" 1926; Leiden University Libraries "Sentani flute orchestra" 1953-54 (https://digitalcollections.universiteitleiden.nl/view/item/707976); Stichting Papua Erfgoed "From Stone Age to Atom Age" 1962 (https://www.papuaerfgoed.org/en/FI/1200/29); UN Photo "UNTEA administration" 1962; Collection Constantinopel Ruhukail / PACE "Arnold Ap and Sam Kapisa" (https://www.papuacollecties.nl/arnold-ap/); National Gallery of Australia "Historical Sentani bark cloth"; Goldman Prize portrait of Yosepha Alomang; Pusaka chronology photos (8, photographer often not listed); Greenpeace, VOA, HRW, Amnesty, Access Now, Human Rights Monitor, Puncak regency, NASA, AHRC, ULMWP, UN treaty and report cover images.

### 1f. Local film files (`public/media/history/`)

| File | Source | Rights as stated |
| --- | --- | --- |
| `openbeelden-conference-1950.mp4` | Open Beelden, "Opening van de Nieuw Guinea conferentie", 4 Dec 1950, https://vpro.openbeelden.nl/media/1493/Opening_van_de_Nieuw_Guinea_conferentie.nl | CC BY-SA 3.0 NL; holder Nederlands Instituut voor Beeld en Geluid |
| `biak-wissel-1955.mp4` | Open Beelden, "Biak to the Wissel Lakes" (Week 55-02), https://eye.openbeelden.nl/media/17389 | CC BY-SA 3.0 NL |
| `openbeelden-clinic-ship-1958.mp4` | Open Beelden, Week 58-47, https://www.openbeelden.nl/media/118796/Tewaterlating_van_polikliniekschip_voor_Nieuw_Guinea.nl | CC BY-SA 3.0 NL |
| `openbeelden-flag-1961.mp4` | Open Beelden, Week 61-48, creator Polygoon-Profilti, https://eye.openbeelden.nl/media/670291/Vlag_voor_Nieuw_Guinea.en | CC BY-SA 3.0 |
| `openbeelden-plateel-1962.mp4` | Open Beelden, Week 62-41, https://eye.openbeelden.nl/media/17560/Nieuws_uit_Nieuw_Guinea_afscheid_van_gouverneur_Plateel.en | CC BY-SA 3.0 |

### 1g. Exhibition (`content/exhibition.json`, 56 items; lanes: 30 works, 14 crafts, 12 voices)

Fields: `slug`, `title`, `type`, `lane`, `summary`, `image`, `sourceUrl`, `publisher`, `credit`, `mediaKind`, `rights`. Rights values: source-only 27 (no image kept, link only), attributed-external 13, partner-context 10, editorial-display 5, cc-by-sa-4.0 1.

| Group | Examples | Original source | Rights position |
| --- | --- | --- | --- |
| Udeido Collective installations | Hidden Faces of Papua, Bihm, Koreri Projection | peacebrigades.nl, lahorebiennale.org | attributed-external |
| Sa Pu Kisah women's paintings (2021), 10 works | The Last Hope, Broken, Pain | arsip.jubi.id, humanisma.wordpress.com (AJAR project) | partner-context, credit per artist |
| Mairi (2019) works, 7 | Di Negeriku, The Death Dresses | indoartnow.com/artworks/320xx | attributed-external |
| Museum objects | Korwar, canoe prows, Asmat objects (7 items) | metmuseum.org/art/collection/search/..., brooklynmuseum.org/opencollection/objects/80174 | source-only |
| Music and audio | Mambesak Vol. 1 (papuaheritage.org/nl/AU/27/1), Guitar Bands of West Papua (concertzender.nl), Spirit of Mambesak (Bandcamp) | as listed | source-only |
| Crafts (Sentani bark cloth, noken) | Ongge bark cloth (sentaniarts.wordpress.com), Fansoway Art (jubi.id), Rosina Tabuni noken (nokenwene.com) | as listed | editorial-display |
| Noken photo | `noken-woven-bags-2017` | https://commons.wikimedia.org/wiki/File:Noken.jpg | CC BY-SA 4.0 |

Research files (not published): `content/research/exhibition-candidates.json`, `exhibition-september-17.json`, `archive-assets-2026-10-08.json`, `crafts-2026-10-08.json`, `docs/research/EXHIBITION_PASS_2.md`, `docs/EXHIBITION_MEDIA_RESEARCH_2026_09_27.md`.

---

## 2. Resources and library

Three layers feed the Library:

1. `content/reference-sources.json`: 91 curated, cited sources (below).
2. `content/research/library-candidates.json`: 372 bibliography leads (not published as such, but exposed by the live API).
3. Live D1 items (news-derived), classified by the watch-engine. The live API merged list is 382 items, all flagged `curated: true`.

Item contract fields (`shared/library.ts`, `docs/SOURCES_AND_LIBRARY.md`): `itemType`, `evidenceRoles`, `format`, `publishedAt`, `topics`, `places`, `languages`, `accessType`, `provenance`. The `accessType` text is WPW's own label (for example "open access", "publisher page"). It is not a licence. No item carries an SPDX or CC licence field. Rights: not stated, except as inferred from the access label.

### 2a. Reference sources (91): composition

| Type | Count | Format |
| --- | --- | --- |
| article 22, research 19, collection 15, report 14, documentary 14, official 5, book 2 | 91 | web 53, pdf 23, video 15 |

Languages: en 75, multi 8, id 8. Topic tags use `content/taxonomy.json` (13 tags).

Key items for researchers (original URL as WPW cites it). Rights: not stated by WPW unless in the note.

| id | Title | Publisher | Year | URL | Note |
| --- | --- | --- | --- | --- | --- |
| west-new-guinea-2025 | West New Guinea: Social, Biological, and Material Histories | Gaffney and Tolla, ANU Press | 2025 | https://press.anu.edu.au/publications/series/terra-australis/west-new-guinea | Plates CC BY-NC-ND 4.0 per WPW. Open access book. |
| west-new-guinea-languages-2025 | Language as a lens into the prehistory of West New Guinea | Laura Arnold | 2025 | https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch03.pdf | ch03 |
| west-new-guinea-population-2025 | Deep histories in New Guinea (human genetics) | Jacobs, Kusuma, Attenborough | 2025 | https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch04.pdf | ch04 |
| west-new-guinea-ch07 to ch20 | 11 more chapters (ch07, 08, 09, 11, 12, 13, 15, 16, 18, 19, 20) | various | 2025 | `.../pdf/chNN.pdf` | submerged landscape, Lydekker Line, Bomberai, Keerom rock art, Sentani, Kayu Batu pottery, Marind canoes, Asmat axes, Meege, Muyu noken, Kamoro collections |
| unesco-noken | Noken, multifunctional knotted or woven bag | UNESCO | n/a | https://ich.unesco.org/en/USL/noken-multifunctional-knotted-or-woven-bag-handcraft-of-the-people-of-papua-00619 | UNESCO ICH list (2012 urgent safeguarding) |
| muman-minggil | Muman Minggil: Road to the Ancestors | Yoikatra / restitution | n/a | https://restitutionmatters.org/publication/muman-minggil-docu-about-a-cultural-papuan-grou... | video |
| nasa-papua-forest | Deforestation in Papua | NASA Earth Observatory | n/a | https://science.nasa.gov/earth/earth-observatory/deforestation-in-papua-148021/ | NASA terms not recorded |
| nasa-grasberg | Grasberg Mine, Indonesia | NASA Earth Observatory | n/a | https://science.nasa.gov/earth/earth-observatory/grasberg-mine-indonesia-5718/ | |
| ajar-birds | All the Birds Are Gone | AJAR and Papuan Women's Working Group | n/a | https://asia-ajar.org/wp-content/uploads/2021/03/ABAG_FINAL_compressed.pdf | book, PDF |
| ajar-here | I Am Here: Voices of Papuan Women | AJAR | 2016 | https://www.asia-ajar.org/files/I%20am%20here%20-%20AJAR%20Report.pdf | PDF |
| papuan-voices-collection | Papuan Voices community documentary collection | Papuan Voices | n/a | https://papuanvoices.net/ | video, multi-language |
| laolao-collection | Lao-Lao Papua essays | Lao-Lao Papua | n/a | https://laolaopapua.com/ | |
| archive-cook-papers | Edwin Cook and Susan Pflanz Cook Collection | UC San Diego Library / Calisphere | n/a | https://calisphere.org/collections/5020/ | photo archive |
| archive-uncen-hampton | Hampton collection returned to Museum Loka Budaya | Universitas Cenderawasih | 2026 | https://www.uncen.ac.id/ribuan-artefak-dan-arsip-budaya-o-w-hampton-resmi-diserahkan-ke-mu... | news of repatriation |
| exhibit-reference-papua-erfgoed-stone-atom-age | From Stone Age to Atom Age (1962 film) | Stichting Papua Erfgoed | 1962 | https://www.papuaerfgoed.org/en/FI/1200/29 | |
| exhibit-reference-muo-rem-dance-of-the-cassowary | Muo Reme, Dance of the Cassowary | Papua Heritage | n/a | https://papuaheritage.org/en/AU/10/1 | audio, Anceaux |
| exhibit-reference-black-brothers | Black Brothers | kultur.media | n/a | https://kultur.media/en/interview/black-brothers/ | music |
| exhibit-reference-sentani-flute-orchestra | Sentani flute orchestra | Leiden University Libraries | n/a | https://digitalcollections.universiteitleiden.nl/view/item/707976 | |
| history-reference-resistance-2 | Anatomy of an Occupation | Elmslie, Webb-Gannon, Univ. Wollongong | 2011 | https://documents.uow.edu.au/content/groups/public/@web/@socs/@has/documents/doc/uow270886 | |
| history-reference-border-1984-3 | Constructing Papuan Nationalism | Chauvel (East-West Center) | 2005 | https://www.files.ethz.ch/isn/26108/PS014.pdf | also hdl.handle.net/10125/3515 |
| history-reference-church-institutions-3 | Zakheus Pakage and His Communities | Benny Giay | 1995 | https://dacc.net.au/wp-content/uploads/2023/01/Giay_1995_Zakheus.pdf | |
| mifee-research | The Merauke Integrated Food and Energy Estate | ASEAS journal | n/a | https://aseas.univie.ac.at/index.php/aseas/article/view/2571/2159 | |
| ptfi-audit-2025 | PT Freeport Indonesia 2024-2025 environmental audit | Freeport-McMoRan | 2025 | https://www.fcx.com/sites/fcx/files/documents/sustainability/audits/2024-2025PTFIEnvironme... | corporate PDF |

Also in the 91: 7 Human Rights Monitor reports (2025 to 2026), 3 documentaries on YouTube (Cogito, Frontier War, Paradise Bombed), 6 Merauke and Raja Ampat items (Pusaka, TAPOL, ESDM, Greenpeace, Jakarta Post/Asia News Network), 5 UN and official items (OHCHR, ULMWP), 12 history references on IPAC, Glazebrook, Preston, Jakarta Globe, BBC Indonesia, Goldman Prize, Cultural Survival. Full list: `content/reference-sources.json`.

### 2b. Library candidates (`content/research/library-candidates.json`, 372 leads)

Fields: `lane`, `priority` (P0 238, P1 122, P2 12), `itemType`, `title`, `creator`, `year`, `url`, `access`, `note`, `repoStatus`. Type counts: paper 111, book 37, book-chapter 27, report 27, documentary 20, dissertation 11, grammar 10, novel 7 (others fewer). Access labels: open access 40, open journal 25, journal/DOI 23, bibliographic lead 23, open PDF 22, open access via volume 22, open report 14, publisher page 10. WPW labels first-pass metadata as unverified (`provenance.verifiedHere: false`).

| Lane | Count | | Lane | Count |
| --- | --- | --- | --- | --- |
| history-decolonisation | 60 | | economy-livelihoods-development | 21 |
| society-culture-religion | 44 | | language-education-knowledge | 21 |
| land-extraction-environment | 34 | | archives-material-culture | 21 |
| health-everyday-life | 27 | | language-oral-knowledge | 19 |
| society-anthropology | 26 | | rights-conflict | 18 |
| governance-development | 22 | | culture-literature | 14 |
| land-ecology | 21 | | politics-law-governance | 11 |
| archaeology | 6 | | peace-dialogue 4, population-migration 3 | |

### 2c. Live library API items by type (`/api/resources`, 382)

research 148, book 51, report 47, collection 36, reporting 21, archive 19, dataset 17, film 17, document 12, analysis 7, statement 4, audio 2, map 1. Access labels: not stated 77, open access 39, open journal 24, open PDF 22, journal/DOI 22, open report 14, source record 16, publisher page 10.

Datasets (all 17 are linked, not hosted by WPW):

| Title | Holder | Year | URL | WPW access label |
| --- | --- | --- | --- | --- |
| Biak Language Documentation Project | University of Oxford | 2010 | https://biak.clp.ox.ac.uk/ | open corpus |
| Wamesa Language Documentation (EAG1) | PARADISEC | 2010 | https://catalog.paradisec.org.au/collections/EAG1 | open archive |
| OUTOFPAPUA Lexical Database | OUTOFPAPUA Project | 2026 | https://database.outofpapua.com/languages | open database |
| Papuan Voices lexical dataset in CLICS | CLICS | 2026 | https://clics.clld.org/contributions/papuanvoices | open dataset |
| Yali Language Documentation Corpus | DoBeS / The Language Archive | 2010 | https://hdl.handle.net/1839/b57560e1-414d-485d-9870-df24f988c53a | open archive |
| Salawati Language Documentation Collection | Laura Arnold | 2024 | https://datashare.ed.ac.uk/handle/10283/8672 | open Edinburgh DataShare |
| Wauyai Ma'ya Vocabulary Dataset | Laura Arnold | 2024 | https://datashare.ed.ac.uk/items/510064e0-ed69-4f20-8f62-799d6af23e9f | open dataset |
| Wauyai Ma'ya Morphosyntax Dataset | Laura Arnold | 2024 | https://doi.org/10.7488/ds/7574 | open dataset |
| TransNewGuinea.org | project | 2026 | https://transnewguinea.org/maps/language/ | open database |
| Ninye Bun: Eipo Myths, Stories, Songs and Tales | Heeschen / The Language Archive | 1990 | https://hdl.handle.net/1839/00-0000-0000-0021-5C73-5 | archive |
| Orchids of the Bird's Head Peninsula | Kew / JCU / UNIPA | 2026 | https://birdsheadorchid.id/about.html | open database |
| Colonial Collections Datahub | Dutch consortium | 2026 | https://app.colonialcollections.nl/en/ | open database |
| BPS Papua Barat Long Form Census 2020, migration, welfare statistics (3) | BPS | 2023 to 2024 | papuabarat.bps.go.id | official publication |
| Indikator Penting Papua Pegunungan; Bapperida Papua infographic (2) | BPS / Bapperida | 2024 to 2025 | papua.bps.go.id | official |

Audio and music: "Arnold Ap / Mambesak Audio and Archival Collection" (https://www.papuacollecties.nl/arnold-ap/), "West Papua: Spirit of Mambesak" (https://wantokmusik.bandcamp.com/album/west-papua-spirit-of-mambesak), "Muo Reme, Dance of the Cassowary" (https://papuaheritage.org/en/AU/10/1), Jubi "Upaya Mendokumentasikan Musik Tradisi Papua" (2019), Jubi "Musicians and Songwriters from Teluk Wondama" (2025), Wompere et al. 2024 "Hai Tanahku Papua" (open PDF), Rayfield "Singing for Life" (Inside Indonesia, 2004). Hip-hop: Richards-Hewat "Hip Hop in Manokwari".

Featured set (`content/library-featured.json`, 9): HRM Q1 2026 report; Kluge "West Papuans between transnationalism and internationalism"; Rencana Induk Percepatan Pembangunan Papua 2022-2041; OUTOFPAPUA lexical database; LIPI Papua Road Map; PESTA BABI film; Arnold Ap / Mambesak collection; Chauvel and Bhakti "The Papua Conflict"; ANU West New Guinea.

Topic taxonomy (`content/taxonomy.json`, 13 tags, bilingual): includes history-decolonisation, culture-language, environment-biodiversity, land-indigenous-rights, politics-governance, human-rights-security.

---

## 3. Languages, cultures, biodiversity, music, art, regions

### 3a. Languages dataset

| Item | Fact |
| --- | --- |
| File | `public/data/languages.geojson` (113,667 bytes), built from `content/data/languages-source.tsv` and `content/data/languages-curated.json` by `scripts/build-papua-languages.py` |
| Count | 256 features, one point each |
| Properties | `name`, `glottocode`, `family`, `source` ("Glottolog 5.3"), `location_note` |
| Not present | ISO 639-3 codes, speaker counts, endangerment, alternate names, polygons |
| Scope | Six current Papua provinces. Filtered with BIG province geometry, cross-checked with a CC BY 4.0 mask. |
| Source | Glottolog CLDF v5.3 (WPW states CC BY 4.0), https://glottolog.org |
| Caveat stated by WPW | Points are representative locations, not language or customary boundaries. |
| Families (top) | Nuclear Trans New Guinea 64, Austronesian 43, Lakes Plain 20, Unclassified 20, Geelvink Bay 10, Greater Kwerba 8, Tor-Orya 8, South Bird's Head 7, Border 5, Nimboranic 5, plus about 25 smaller families |
| Optional historical layer | `content/data/language-atlas-notes.json`: Glottography "wurm1981pacific" v2.0 speaker-area polygons, https://zenodo.org/records/18643982, licence CC BY-NC 4.0. WPW lists it as future, not shipped. |
| Provinces' peoples and languages | `geo/build.mjs` `PROVINCE_META`: capital, number of regencies, a "selected, not exhaustive" list of peoples and languages per province (for example Papua Selatan: Marind, Asmat, Muyu, Mandobo, Awyu), context note, BPS link. Rights not stated. |
| Live copy | https://westpapua.watch/data/languages.geojson (HTTP 200, `access-control-allow-origin: *`) |

Related linked language sources (from the live API, section 2c and 2d): Kluge "A Grammar of Papuan Malay" (CC BY, https://langsci.github.io/78/main.pdf), Dol "Grammar of Maybrat" (ANU), Bromley "Lower Grand Valley Dani" (ANU), van den Heuvel "Biak" (LOT), Yoder "Grammar of Abawiri" (eScholarship), Riesberg "Yali (Angguruk)-English-German Dictionary" (ANU, 2024), Arnold et al. "Four Undocumented Languages of Raja Ampat", Usher and Schapper "Lexicons of the Onin Peninsula", Anceaux (1961) on Yapen, Voorhoeve "Languages of Irian Jaya Checklist" 1975 (papuaweb.org), Voorhoeve "A Hundred Years of Papuan Linguistic Research" (ANU), Sawaki and Arka (2018), SIL Kapauri survey, Language Science Press series "Languages of the New Guinea Region". Rights: access labelled "open" by WPW; licences not recorded except "open access CC BY" for the Papuan Malay grammar.

### 3b. Cultural/reference regions (customary-style regions): the membership data

There is no GeoJSON or JSON file of the regions in the repo. The membership is a literal object `REGION_MEMBERS` in `geo/build.mjs` (lines 72 to 80). The build queries BIG admin polygons, assigns each regency to a region by name, dissolves them, and writes PMTiles to `geo/out/cultural_regions.pmtiles` (generated, git-ignored, served at `/geo/cultural_regions.pmtiles`, not fetched here).

Stated source: Bappenas RPJMN 2020 to 2024 narrative, https://ditkumlasi.bappenas.go.id/download/file/Narasi_RPJMN_2020-2024.pdf (`src/lib/map/registry.ts` line 93; `docs/WATCH_FREEZE_10.md` line 51). Geometry: BIG (Badan Informasi Geospasial) regency boundaries from https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/BATAS_WILAYAH/MapServer/2. WPW licence label: "Reference/generalized". WPW caveat: planning and reference regions, not customary-land or cadastral boundaries. Not verified here against the Bappenas PDF.

| Region | Regencies and cities (as hardcoded) |
| --- | --- |
| Mamta / Tabi | Jayapura, Kota Jayapura, Sarmi, Mamberamo Raya, Keerom |
| Saireri | Biak Numfor, Supiori, Kepulauan Yapen, Waropen |
| Mee Pago | Nabire, Intan Jaya, Paniai, Dogiyai, Deiyai, Mimika |
| Laa Pago | Puncak, Puncak Jaya, Tolikara, Mamberamo Tengah, Lanny Jaya, Nduga, Jayawijaya, Yalimo, Yahukimo, Pegunungan Bintang |
| Anim Ha | Asmat, Merauke, Mappi, Boven Digoel |
| Domberay | Kota Sorong, Sorong, Raja Ampat, Tambrauw, Maybrat, Sorong Selatan, Pegunungan Arfak, Manokwari, Manokwari Selatan, Teluk Bintuni, Teluk Wondama |
| Bomberay | Fakfak, Kaimana |

Notes: membership predates some 2022 regency splits (new provinces Papua Selatan, Tengah, Pegunungan, Barat Daya). Some regencies created after 2020 may not match the BIG names. The code logs unmapped regencies in a build status file. `functions/geo/[name].ts` also allows a `customary_territories.pmtiles` name, but no build step for it exists in the repo, so no customary-territory data is present.

Other geo data: `public/data/major-extraction-sites.geojson` (small, point features, "updated 2026-09-03", operators such as Grasberg); `content/data/sppg.json` (national free-meal kitchens, points; upstream https://github.com/yohn-maistre/detak-detik, SISMON BGN https://sismonbgn.com/, snapshot 2026-07-01); ESDM mining permits, BIG Satu Peta forest and plantation permits, protected areas (`SUMBER_DAYA_ALAM_DAN_LINGKUNGAN` layer 33), NASA FIRMS hotspots. All are fetched at build time and not stored in the repo.

### 3c. Statistics and observation datasets (`content/data/`)

| File | Content | Source and date | Rights |
| --- | --- | --- | --- |
| `hdi.json` | HDI by province 2024, 2025 | BPS table, retrieved 2026-09-22 | Not stated |
| `poverty-2025.json` | Poverty rate by province, Sept 2025 | BPS press releases | Not stated |
| `apbd.json` | Provincial budget realisation 2024 | DJPK Kemenkeu, fetched 2026-07-03 | Not stated |
| `otsus.json` | Special autonomy transfers 2026 | DJPK SIKD, as of 2026-09-18 | Not stated |
| `sppg.json` | Free-meal kitchens (points) | SISMON BGN snapshot 2026-07-01 | Not stated |
| `watch-observations.json` | Displacement and other indicators (e.g. 127,031 IDPs late Aug 2026) | Human Rights Monitor etc. | Not stated |

### 3d. Biodiversity and environment

WPW holds no species list, occurrence data or habitat polygons. It only links sources. Best linked items (from `/api/resources`, rights labelled "open" by WPW only):

| Title | Authors / holder | Year | URL |
| --- | --- | --- | --- |
| Orchids of the Bird's Head Peninsula (database) | Kew / JCU / UNIPA | 2026 | https://birdsheadorchid.id/about.html |
| Exploring the Vertebrate Fauna of the Bird's Head Peninsula | Lengguru research | 2021 | https://archimer.ifremer.fr/doc/00692/80409/83518.pdf |
| Reef Fishes of the Bird's Head Peninsula | Allen and Erdmann | 2009 | https://www.biotaxa.org/cl/article/view/5.3.587 |
| The Floodplain Forests of the Mamberamo Basin | Sheil et al. (MDPI Forests) | 2021 | https://doi.org/10.3390/f12121790 |
| Bird checklist, Gam Island, Raja Ampat | Forest and Society | 2020 | https://journal.unhas.ac.id/index.php/fs/article/view/8664 |
| Wildlife Diversity of Malagufuk Forest | Ruslim et al. (Biodiversitas) | 2025 | https://doi.org/10.13057/biodiv/d260529 |
| State of the Seascape 2020: Bird's Head | UNIPA, YKAN/TNC, WWF, CI | 2020 | https://birdsheadseascape.com/download/fact-sheets/State-of-Seascape_Final_August_202... |
| Endemic Marine Species of the Bird's Head Seascape | Seascape science partners | 2020 | https://birdsheadseascape.com/download/research/biodiversity/endemics.pdf |
| Natural History of Manta Rays (Mobula alfredi) | Setyawan et al. | 2020 | https://www.oceansciencefoundation.org/josf/josf36h.pdf |
| Karst Geodiversity and Endemic Species (Misool-type) | MDPI Sustainability | 2026 | https://www.mdpi.com/2071-1050/18/7/3287 |
| Tambrauw and Raja Ampat Biodiversity Conservation Project | Darwin Initiative | 2025 | https://www.darwininitiative.org.uk/documents/DAREX005/26767/DAREX005%20AR1%20-%20edi... |
| The Manokwari Declaration (70% of Tanah Papua forest) | Forest and Society | 2019 | http://dx.doi.org/10.24259/fs.v3i1.6067 |
| DNA barcoding of 19 Lutjanus species | Toha et al. (Biodiversitas) | 2025 | https://doi.org/10.13057/biodiv/d261042 |
| Etnobiologi tumbuhan bahan tas noken suku Yali | Helakombo, Tanjung | 2022 | https://doi.org/10.31957/jbp.2291 |
| Kamoro Natural Resources; Biodiversity in West Guinea (2001) | Galda Verlag | 2000/2001 | galda-verlag.de (publisher PDFs) |
| Deforestation in Papua; Grasberg | NASA Earth Observatory | n/a | see 2a |

Biocultural: Chao "In the Shadow of the Palm" (Cultural Anthropology, open access, https://journal.culanth.org/index.php/ca/article/view/ca33.4.08/117), Davies "Sago versus Rice" (doi 10.1002/ocea.5306), Mangaluk et al. 2026 customary forest conservation (https://doi.org/10.33506/jn.v12i1.5581), Sawir et al. 2026 sea sasi (doi 10.1007/s44274-026-00601-x), Wambrauw and Morgan 2014 (Mauri model in Asmat).

### 3e. Music and art

- Music: Mambesak and Arnold Ap (history chapter `history-mambesak`; exhibition `mambesak-vol-1`; PACE collection https://www.papuacollecties.nl/arnold-ap/), Black Brothers (kultur.media), Wisisi music film (ffd.or.id/en/film/our-wisisi-music/), Read My World programme (7 entries, readmyworld.nl), Concertzender "Guitar Bands of West Papua". No audio files are in the repo.
- Art: Udeido Collective, Sa Pu Kisah (10 paintings), Mairi (7), Sentani bark cloth (Ongge, Fansoway Art), noken (Wamena), museum korwar and canoe prow records at The Met and Brooklyn Museum (open-access object records, not copied). See 1g.
- Organisations (`content/organizations.json`, 39): 17 community, 11 research, 10 reporting, 1 culture. Fields: name, description, role, URL, aliases, provenance, category. Rights not stated.

---

## 4. News source registry (`content/news-sources.json`, 18 entries; operational registry for the watch-engine)

Fields: `id`, `name`, `homepage`, `feed`, `role`, `ownership`, `language`, `scope`, `enabled`, `priority`, `libraryPolicy`, `notes`, `discoveryPages`. All use `libraryPolicy: selective` (item-level review needed). Rights note in the registry: only "retain article-level attribution" for Lao-Lao Papua and "keep ownership visible" for RRI and ANTARA. WPW publishes summaries with links, not article reproductions. Reuse licence for each publisher: not stated.

| id | Name | Homepage | Feed type | Role / ownership | Lang | Enabled / priority |
| --- | --- | --- | --- | --- | --- | --- |
| jubi | Jubi | https://jubi.id/ | RSS https://jubi.id/feed/ | local newsroom / non-state | id, en | yes / 1 |
| aneta-papua | Aneta Papua | https://aneta-papua.org/ | RSS /feed/ | alternative media / community | id | yes / 1 |
| mongabay-indonesia | Mongabay Indonesia | https://mongabay.co.id/ | RSS /feed/ | environmental / nonprofit | id | yes / 1 |
| suara-papua | Suara Papua | https://suarapapua.com/ | RSS /feed/ | local newsroom / non-state | id | yes / 1 |
| project-multatuli | Project Multatuli | https://projectmultatuli.org/ | RSS /feed/ | investigative / non-state | id, en | yes / 1 |
| lao-lao-papua | Lao-Lao Papua | https://laolaopapua.com/ | RSS /feed/ | movement media | id | yes / 2 |
| nadi-papua | Nadi Papua | https://nadipapua.com/ | RSS /feed/ | local newsroom | id | yes / 2 |
| bbc-indonesia | BBC News Indonesia | https://www.bbc.com/indonesia | no feed (page discovery) | public service | id | yes / 2 |
| rnz-pacific | RNZ Pacific | https://www.rnz.co.nz/international/pacific-news | no feed | public service | en | yes / 2 |
| abc-pacific | ABC Pacific | https://www.abc.net.au/pacific | no feed | public service | en | yes / 2 |
| rri | RRI | https://rri.co.id/ (discovery page /papua) | page discovery | state public broadcaster | id | yes / 3 |
| antara | ANTARA | https://www.antaranews.com/ (tag/papua) | page discovery | state-owned | id, en | yes / 3 |
| antara-papua | ANTARA News Papua | https://papua.antaranews.com/ | RSS https://papua.antaranews.com/rss/terkini.xml | state-owned | id | yes / 2 |
| kalawai | Kalawai | https://kalawai.org/ | RSS /feed/ | civil society | id | yes / 1 |
| pusaka | Yayasan Pusaka Bentala Rakyat | https://pusaka.or.id/ | RSS /feed/ plus /news/ | civil society | id, en | yes / 1 |
| human-rights-monitor | Human Rights Monitor | https://humanrightsmonitor.org/ | RSS /feed/ | monitoring org / civil society | en | yes / 1 |
| papuan-voices | Papuan Voices | https://papuanvoices.net/ | no feed | community media | id, en | yes / 1 |
| acled | ACLED | https://acleddata.com/ | none | monitoring org | en | NO: structured data needs its own access arrangement |

Note: `docs/SOURCES_AND_LIBRARY.md` says 16 enabled; the file has 17 enabled. `src/data/publishers.ts` is an older, richer publisher catalogue, not operational.

---

## 5. Public APIs and machine-readable endpoints

All GET. No authentication. No stated rate limit or terms. Cloudflare Pages Functions in `functions/api/` call a Worker (`services/watch-engine`). Static JSON endpoints send `access-control-allow-origin: *`. The `/api/*` JSON responses did not show a CORS header in the requests made, so browser use from another origin is unconfirmed (server-side reads are fine). Be polite: cache and use sparingly.

| Endpoint | Returns | Size seen | Notes |
| --- | --- | --- | --- |
| `/api/resources` | `{"items":[...]}` 382 library items (all curated) | 334 KB | `limit` query is ignored. Best seed feed. |
| `/api/places` | `{"items":[{slug,name,kind,parent_slug,latitude,longitude,development_count}]}` | 14 KB | kinds: province, city, regency, reported. `?q=` filter. |
| `/api/search?q=noken` | `{"items":[{id,type,title{en,pmy},text{en,pmy},...}]}` | 6 KB | `q` max 120 characters |
| `/api/issues` | `{"items":[{slug,title_en,title_id,summary_en,summary_id,category,status_en,sort_order,...}]}` | 7 KB | 13 issue dossiers |
| `/api/current` (`page`, `limit` max 24, `desk`, `place`) | news developments | not fetched | cached |
| `/api/weekly`, `/api/emerging-issues`, `/api/following`, `/api/geo-status`, `/api/fires` | weekly review, trends, followed cases, geo layer status, FIRMS hotspots | not fetched | see `functions/api/` |
| `/api/ask` | LLM assistant (POST) | n/a | do not use |
| `/search.json` | static search corpus (history, issues, investigations, news): array of `{id,type,title{en,pmy},text{en,pmy},...}` | 1.09 MB | CORS `*` |
| `/site.json` | site name, navigation, 13 issue summaries | 14 KB | CORS `*` |
| `/feed.xml` | RSS of developments | 2.5 KB | CORS `*` |
| `/llms.txt` | plain text site guide | 930 B | CORS `*` |
| `/data/languages.geojson` | the 256 language points | 114 KB | CORS `*` |
| `/geo/{name}.pmtiles` | range-served PMTiles (provinces, cultural_regions, mining, concessions, protected, roads, airports, ports, settlements) | large | not fetched |

Example `/api/resources` item (shortened):

```json
{"id":"research:constructing-papuan-nationalism-history-ethnicity-and-adaptation|richard-chauvel|2005",
 "url":"http://hdl.handle.net/10125/3515","title":"Constructing Papuan Nationalism: History, Ethnicity, and Adaptation",
 "authors":["Richard Chauvel"],"itemType":"book","subtype":"book","accessType":"open access","year":"2005",
 "tags":["history-decolonisation"],"topics":["history-decolonisation","politics-governance-representation"],
 "provenance":{"kind":"supplied-bibliography","sourcePass":1,"verifiedHere":false},"curated":true}
```

Example `/api/places` item: `{"slug":"papua","name":"Papua","kind":"province","parent_slug":null,"latitude":-2.8,"longitude":139.3,"development_count":560}`.

Example language feature: `{"type":"Feature","geometry":{"type":"Point","coordinates":[139.213,-3.04582]},"properties":{"name":"Abawiri","glottocode":"foau1240","family":"Lakes Plain","source":"Glottolog 5.3","location_note":"Representative language reference point; not a language boundary or customary territory."}}`

---

## Best first seeds

Ordered by value for a demo that feels alive and serves researchers. "Original" is the source to read directly; ETNOS should link to or ingest the original, not WPW's summary. Rights are as stated by WPW and must be re-checked at the original before copying bytes.

| # | Seed | Topic | Original source | Rights position |
| --- | --- | --- | --- | --- |
| 1 | ANU Press, "West New Guinea: Social, Biological, and Material Histories" (book and 17 cited chapters) | Earliest history, archaeology, anthropology | https://press.anu.edu.au/publications/series/terra-australis/west-new-guinea | Open access book. WPW records CC BY-NC-ND 4.0 for its figures. Check the book licence directly. |
| 2 | Sahul and the sea crossings (`history-sahul`), Boesl et al. ch07 | Earliest history | https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch07.pdf | as #1 |
| 3 | Andarewa Cave, Bomberai (26,000 BCE), Mene et al. ch09 | Earliest history | https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch09.pdf | as #1 |
| 4 | Mololo Cave, Waigeo (Gaffney et al., Antiquity 2024) and Raja Ampat pottery | Earliest history | https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch17.pdf | as #1; Antiquity figures not stated |
| 5 | Lake Sentani sites, Kayu Batu pottery, Keerom rock art (ch11, 12, 13) | Archaeology | https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch12.pdf | as #1 |
| 6 | 256 language points (Glottolog 5.3) with family as a context layer | Languages | https://glottolog.org (CLDF v5.3) and WPW `public/data/languages.geojson` | CC BY 4.0 per WPW |
| 7 | Arnold, "Language as a lens into the prehistory of West New Guinea" (ch03) and the language-families figure | Languages | https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch03.pdf | as #1 |
| 8 | OUTOFPAPUA Lexical Database and Sources Database | Languages, research | https://database.outofpapua.com/languages | "open database" (licence not stated) |
| 9 | Papuan Malay grammar (Kluge 2017) | Languages | https://langsci.github.io/78/main.pdf | "open access CC BY" per WPW |
| 10 | Biak, Wamesa, Yali, Salawati, Wauyai Ma'ya documentation corpora | Languages | biak.clp.ox.ac.uk, catalog.paradisec.org.au/collections/EAG1, hdl.handle.net/1839/b57560e1-414d-485d-9870-df24f988c53a, datashare.ed.ac.uk/handle/10283/8672 | "open", licences not stated |
| 11 | Seven regions (Mamta/Tabi, Saireri, Mee Pago, Laa Pago, Anim Ha, Domberay, Bomberay) as place contexts, with regency membership | Regions | `geo/build.mjs` lines 72-80; Bappenas RPJMN 2020-2024 PDF | Membership list is a fact table; Bappenas licence not stated. Mark as generalised planning regions. |
| 12 | Noken: UNESCO ICH listing 2012, plus Commons photo | Biocultural, craft | https://ich.unesco.org/en/USL/noken-multifunctional-knotted-or-woven-bag-handcraft-of-the-people-of-papua-00619 ; https://commons.wikimedia.org/wiki/File:Noken.jpg | Photo CC BY-SA 4.0 (Nurul Ichlasiah). UNESCO text terms not stated. |
| 13 | Muyu noken (ch19), Meege (ch18), Marind canoes (ch15), Asmat axes (ch16), Kamoro museum collections (ch20) | Anthropology | https://press-files.anu.edu.au/downloads/press/n13144/pdf/ch19.pdf (and ch15, 16, 18, 20) | as #1 |
| 14 | Koreri (Kamma 1972), traditional politics (Mansoben 1995), Overweel 1995 memoranda | Anthropology, history | papuaerfgoed.org collection PDFs (see 1b) | Heritage archive; terms not stated |
| 15 | Nationaal Archief 1950 to 1962 photos (11 items: Serido, Hollandia, Manokwari, Mokmer, Fakfak, Sentani, Merauke, council) | History, places | Wikimedia Commons file pages listed in 1e | CC0 1.0 |
| 16 | Open Beelden newsreels (5 films, 1950 to 1962) | History, media | URLs in 1f | CC BY-SA 3.0 / 3.0 NL; keep attribution and share-alike |
| 17 | KITLV Archbold expedition, Baliem Valley c.1938 (KITLV 113841) and Digoel camp (KITLV 400106) | Anthropology, history | https://commons.wikimedia.org/wiki/File:Archbold_expeditie_in_de_Baliem-vallei,_KITLV_113841.tiff ; https://digitalcollections.universiteitleiden.nl/view/item/899426 | CC BY 4.0 |
| 18 | Australian War Memorial WWII Hollandia, Merauke, Noemfoor 1944 | History | https://www.awm.gov.au/collection/F01731 , C189088 , C189399 | Public domain per WPW (link only, not copied by WPW) |
| 19 | Arnold Ap / Mambesak collection and the Mambesak history chapter | Music | https://www.papuacollecties.nl/arnold-ap/ | Link-only; terms not stated |
| 20 | Muo Reme "Dance of the Cassowary" (Anceaux), Sentani flute orchestra, Black Brothers | Music | https://papuaheritage.org/en/AU/10/1 ; https://digitalcollections.universiteitleiden.nl/view/item/707976 ; https://kultur.media/en/interview/black-brothers/ | Link-only; terms not stated |
| 21 | Orchids of the Bird's Head Peninsula database | Biodiversity | https://birdsheadorchid.id/about.html | "open database" (licence not stated) |
| 22 | Bird's Head Seascape: State of the Seascape 2020; Endemic marine species; Allen and Erdmann reef fishes | Biodiversity | https://birdsheadseascape.com/download/fact-sheets/ (see 3d); https://www.biotaxa.org/cl/article/view/5.3.587 | "open PDF/journal" (licence not stated) |
| 23 | Mamberamo floodplain forests (Sheil et al. 2021, MDPI) and Malagufuk wildlife (Biodiversitas 2025) | Biodiversity | https://doi.org/10.3390/f12121790 ; https://doi.org/10.13057/biodiv/d260529 | MDPI is normally CC BY; confirm at source. WPW: "open access". |
| 24 | Biocultural papers: Chao (sago and palm, Marind), Mangaluk (customary forest), Sawir (sea sasi), Helakombo (noken plants) | Biocultural | URLs in 3d | Open journals; licences not stated |
| 25 | Province context table (capital, regencies, peoples and languages) and HDI/poverty tables | Context | `geo/build.mjs` PROVINCE_META; `content/data/hdi.json` | Factual; BPS terms not stated |

Seeding approach suggested by the data shape: use `/api/resources` plus the 17 ANU chapter URLs as the source list; use `languages.geojson` and the REGION_MEMBERS table as context nodes (languages, regions, provinces from `/api/places`); use the CC0 and Open Beelden items as the media layer.

---

## Rights cautions

1. WPW states no licence for its own text, translations (en and Papuan Malay "pmy"), captions or timelines. Do not copy WPW prose into ETNOS. Write fresh summaries and cite the originals.
2. `NC-ND` plates (16 ANU figures) cannot be adapted, cropped into derivatives, or used commercially. Link to the chapter and cite. Do not host edited copies.
3. Open Beelden films are CC BY-SA. Hosting them needs attribution and share-alike. WPW has mixed labels (3.0 NL and 3.0). Check each at source.
4. KITLV photos are CC BY 4.0, but the Digoel camp record is a "Commons copy". Check the Leiden original.
5. `rightsStatus: unknown` applies to 38 of 77 archive items. Treat them as link-only. These include UN, HRW, Amnesty, Greenpeace, VOA, Tempo, NASA, Pusaka and others.
6. Pusaka-sourced photos are reproductions with the original photographer often "not listed". Do not copy.
7. The NASA Grasberg image is labelled only "NASA imagery". NASA Earth Observatory use is usually allowed with credit, but WPW does not state it.
8. Wikimedia Commons CC0 labels for Nationaal Archief photos are WPW's record from 2026-09/10. Re-verify per file before import.
9. Exhibition items: 27 are "source-only" (WPW kept no image). Museum records (The Met, Brooklyn) and artist works (Udeido, Sa Pu Kisah, Mairi) carry artist and photographer rights. Several depict living artists and Indigenous cultural heritage. Get consent and community guidance before reproducing images. Papuan cultural objects (korwar, canoe prows) in museums raise restitution questions.
10. Cultural and sacred material: korwar, Koreri, Asmat objects, rock art sites and Mambesak recordings may have community custodianship. A CC licence on an image does not settle community permission.
11. Language data: Glottolog points are CC BY 4.0 but are representative points only. Do not present them as territories. The optional Wurm atlas polygons are CC BY-NC 4.0 and NC-restricted.
12. Region membership comes from a planning document (Bappenas RPJMN 2020-2024), predates the 2022 provinces, and is not a customary boundary. Label it "reference region".
13. Library items marked "open" are WPW's access labels, not licences. 77 live items have no access label. Library candidate metadata is "first-pass" and unverified (`verifiedHere: false`).
14. Several cited sources are advocacy or political material (ULMWP, TAPOL, Free West Papua, Pusaka) or state media (ANTARA, RRI). WPW keeps ownership visible. ETNOS should keep publisher type and attribution when seeding.
15. Human-rights and conflict material (HRM, Kiwirok, Nduga, Biak, Wamena records, named victims, IDP figures) is sensitive. It also falls outside the knowledge seeds above. Handle separately with care for named people.
16. News-derived live items and `/search.json` text are WPW-generated summaries of publisher articles. Do not bulk-copy.
17. The live `/api/*` endpoints have no published terms or rate limits. Read sparingly, cache the result, and ask WPW's owner for permission before relying on them.

