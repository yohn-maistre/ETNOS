# Why Strata: eight threads of rationale

19 November 2026. Proposal support. This note gathers everything we have (findings from our own data, published research, features, laws and policy, impact) into eight threads, each of which can carry a part of the BUDAYA GO! 2026 proposal, deck and showcase. It sits beside `framing-and-impact-2026-11-17.md` (the case and the competition) and draws its research from `research/epistemic-multiplex-2026-11-19.md` (the knowledge model and its analyses).

How to read the status words, which follow `proposal/claims-2026-11-18.md`:
- **live:** deployed on etnos.space and seen.
- **built:** merged and tested, deploy pending.
- **rencana:** planned, not built. In the proposal these must be written as plans. The juknis is explicit: "Jangan mencantumkan teknologi atau spesifikasi yang belum diterapkan seolah-olah sudah berfungsi."

**Revised 19 November, morning:** thread 1's figures corrected after reading the seed pipeline end to end; each thread now has a **Voice and media** part (voice notes, short video, photos) and a **Public data** part (satellite embeddings, weather, biodiversity, language and speech datasets), from sections 9 and 10 of the multiplex note.

Laws and policies are paraphrased, not quoted, and each one names its article where we have read it. *(to verify)* marks anything we have not read in the original.

## 0. The threads at a glance

| # | Thread | One line | Rubric weight it feeds most |
| --- | --- | --- | --- |
| 1 | **Ditulis tentang kita** (written about us) | The open record of Papua is mostly outsiders' and the state's view; the commons adds the people's own layer | Akar budaya 25%, proposal 30% |
| 2 | **Kedaulatan pengetahuan** (knowledge sovereignty) | Communities keep authority over their knowledge, identities and data, by design | Akar budaya, teknis |
| 3 | **Observatorium yang berakar** (a rooted observatory) | A provenance-aware knowledge graph that shows what is core, what is fading, and where the gaps are | Teknis 25%, proposal |
| 4 | **Dua mata** (two eyes) | Modern science and people's knowledge side by side, each judged on its own terms | Akar budaya, proposal |
| 5 | **Pengetahuan yang hidup** (living knowledge) | Measure and support vitality: languages, practices and stories still told | Akar budaya, proposal (impact) |
| 6 | **Ruang bersama yang terawat** (a commons with a staff) | A social commons kept active by Aksara's public rhythm, without engagement manipulation | Teknis, model bisnis |
| 7 | **Dapat dipercaya** (trustworthy) | Every sentence verified, every claim provable, compliance built in | Teknis, proposal |
| 8 | **Berkelanjutan dan bisa dibawa** (sustainable and portable) | One product, many deployments; open standards; a business and a research programme | Model bisnis 20%, Cultural Power |

Section 9 maps each thread to the proposal's sections and the deck's ten slides. Section 10 is the regulatory map in one table.

### 0.1 Three flagships across the threads *(added 19 November; design in `research/epistemic-multiplex-2026-11-19.md` §17)*

| Flagship | One line | Threads it carries |
| --- | --- | --- |
| **Kata Bersama** | The largest open database of New Guinea wordlists holds 41 words of Ekari, all from one 1975 source; speakers confirm, correct and voice their words, and corrections go back to open science with consent | 1, 5, 2, 8 |
| **Siapa yang menulis Papua?** | The voices and topics behind the open record (92% encyclopaedia; administration and population 31%, culture and ecology under 6%) and how they move as tellers join | 1, 3, 7 |
| **Lensa Kita** | A community's own landscape categories become a map through a tiny classifier on open satellite embeddings that the community owns; what the satellite cannot learn is the cultural residual, and residual times vitality says what to record first | 3, 4, 5, 2 |

The idea that ties them: **small sovereign heads on big open bodies.** Open foundation models already turn land, sound and speech into embeddings; a community adds its categories with a few dozen examples, and the resulting lens is small enough to own, inspect, share under protocol or delete. It is a sovereign model sized to a people, and it reverses the usual direction of extraction.

## 1. Ditulis tentang kita (written about us)

**Claim.** Most published knowledge about Tanah Papua was written by outsiders, and the open web's version of it is mostly the state's administrative view. The people it describes can rarely read it and almost never answer it. Strata makes their answer part of the record.

**Our own findings**
- The seed holds 657 verbatim quotes chosen by a seeding agent for three regions; 586 were confirmed word for word against their sources. **92% come from Wikipedia**, the rest from regency government sites. Tellers' accounts: none yet. *(computed 19 November; method in multiplex note §5)*
- By the seeding agent's own section tags, administration and population make up **31%** of quotes, culture **5%**, ecology **under 1%**. Part of this skew is our own first seeding pass, which followed what the open web has and what could be verified; we say so.
- The source catalogue holds 105 sources: ethnographies, articles, archive collections, reports, theses, mission records, a grammar and a dictionary. 22 are archive-only, paywalled or library-only, and half state no licence.
- Still to gather before 26 November (from the framing doc): how many of the 105 have Papuan authors; a 50-person survey; a screenshot audit of city Facebook groups.

**Research**
- Polyvocal and contested-claims modelling in heritage graphs: recent work insists that colonial-era objects carry several incompatible narratives that fixed database fields flatten.
- Comparing salience across groups is a recognised way to show cultural difference (Thompson and Zhang 2006); Epistemic Network Analysis compares how groups connect the same ideas.

**Features**
- Sources panel and verified seed pages (**live**). Voice tags on sources (**built** in the map script). *Versi lain* and *Saya tahu lebih* (framing doc §7, **rencana** unless the claims ledger says otherwise). Voice layers on the map (**rencana**).

**Laws and policy**
- **KKI 2023, idea 9:** masyarakat adat and local communities are sovereign subjects over their land, natural resources and sources of cultural knowledge.
- **UUD 1945 Article 28I(3):** cultural identity and the rights of traditional communities are respected in step with the times.
- **UU 2/2021 (Otsus Papua), Article 57:** the provincial government must protect, foster and develop Papuan culture, giving the community the widest role.
- **Perpres 115/2024 (RIPK 2025–2045), mission 1:** space for diverse cultural expression and cultural interaction.

**Voice and media**
- A voice answer from a person of the region is the strongest possible correction to an outsider's record: their language, their voice, attributed. *Ceritakan versimu* and *Jawab dengan suara* (Ritme note §4.1a) make that one tap.
- Short video shows practice (weaving, building, cooking) that text describes poorly.

**Public data**
- OpenAlex shows how much scholarship exists about each region and topic; set against what people ask (the demand lens), it shows where research has looked away.

**Impact and indicators**
- Share of assertions per region whose voice is *tuturan* (people of the region), against the 0% baseline today.
- Number of entities whose page has at least one variant from the region.
- The voice bar on each page moving from outside sources toward people of the region (framing doc flagship 1).

## 2. Kedaulatan pengetahuan (knowledge sovereignty)

**Claim.** Communities hold authority over their knowledge, their identities and their data, and the system enforces it rather than promising it.

**Our own findings**
- In ActivityPub-style platforms, identity, data and the app all belong to whoever runs the server. AT Protocol separates the three, so people keep their identities and data if ETNOS disappears (framing doc §12).
- Many Papuan cultural galleries collect material by email and shared drives today (framing doc §4.4).

**Research**
- CARE principles for Indigenous data governance (collective benefit, authority to control, responsibility, ethics), as summarised in recent work.
- The Kaitiakitanga Licence (Te Hiku Media): data held in guardianship rather than ownership, with benefit returning to the source. Te Kāhui Raraunga's 2025 Māori AI Governance Framework requires free, prior and informed consent for Māori data in AI and recognises collective privacy.
- A 2026 proposal to braid Indigenous data justice with the access-and-benefit-sharing logic of the Nagoya Protocol for AI training data.

**Features**
- Private communities invisible from outside, including to search and agents (**live**). Labels never attached to people (**live**). Sign-in with an existing AT Protocol account (**live**). Community labelers for protocols such as *Jangan disebarkan* (**rencana**). Training permission as its own flag on every assertion (**rencana**). Withdrawal that removes dependent assertions (**rencana** for the graph; AGENTS.md already requires withdrawal tests at boundaries).

**Laws and policy**
- **UUD 1945 Article 18B(2):** the state recognises and respects masyarakat hukum adat and their traditional rights.
- **UU 2/2021 (Otsus Papua):** Article 43 (recognise, respect, protect and empower adat rights, including hak ulayat); Article 44 (the province must protect the intellectual property of Orang Asli Papua); Article 20 (the MRP's role in protecting the rights of Orang Asli Papua).
- **UU 28/2014 on copyright, Article 38:** copyright in traditional cultural expressions is held by the state, which must inventory, keep and maintain them, and their use must respect the values of the community that holds them. *(to verify the article wording before quoting)*
- **PP 56/2022 on communal intellectual property:** five kinds of KIK (traditional cultural expressions, traditional knowledge, genetic resources, indications of origin, potential geographical indications), electronic inventory through a national information system, and the state protects KIK whether or not it is recorded. The national KIK data centre lists, at the time of reading, 1,029 traditional cultural expressions and 565 traditional knowledge records.
- **UU 11/2013 (Nagoya Protocol):** access to genetic resources and associated traditional knowledge needs the provider's consent and fair benefit-sharing on mutually agreed terms.
- **UU 27/2022 on personal data protection:** privacy notice, purpose limitation, consent where it is the basis; voice posts are personal data.
- **UN Declaration on the Rights of Indigenous Peoples (2007)**, which Indonesia voted for (non-binding).
- **AI governance in Indonesia:** Circular SE Menkominfo 9/2023 on AI ethics; two draft Presidential Regulations (a national AI roadmap for 2026–2029 and AI ethics) were placed on the 2026 programme by Keppres 38/2025; the roadmap's principles include personal data protection and respect for intellectual property. *(to verify whether either has been enacted since March 2026)*

**Voice and media**
- Every voice note and video carries a protocol (public, community only, *Jangan disebarkan*) and a training-permission flag. No voiceprints, speaker identification or face recognition, ever.
- On AT Protocol, video can live on the poster's own data host; Strata defines its own voice-post record so people keep their recordings if ETNOS goes away.

**Public data**
- Open data flows in with its licence attached (TESSERA CC0; AlphaEarth and Open-Meteo CC BY 4.0). People's observations flow out to science (GBIF) only with consent, with sensitive locations generalised.
- Genomics: no. Strata never collects or analyses human genetic data; for plants and animals it only links existing public records.

**Impact and indicators**
- Communities with their own protocols set; items held back by a protocol (counted, never shown).
- Share of assertions with an explicit training-permission decision.
- Withdrawal requests honoured, and time to honour them.

## 3. Observatorium yang berakar (a rooted observatory)

**Claim.** Strata turns scattered sources and conversations into a provenance-aware knowledge graph of a people's world: entities, assertions with voice and witness, and analyses that show what is core, what is at risk, how voices differ and what to ask next. As far as our searches found, this combination has not been built before.

**Our own findings**
- The current map shows records, not the things they are about (diagnosis in `research/knowledge-ontology-2026-11-18.md`).
- The first multiplex result is section 1's two-voice finding.

**Research** (details and sources in the multiplex note)
- Multilayer community detection (Mucha et al. 2010; Kivelä et al. 2014); higher-order networks and motifs (Battiston et al. 2020; Lotito et al. 2022).
- Knowledge gaps as topological cavities (Sizemore et al. 2018); Wikipedia's science grows by opening and filling gaps (Ju et al. 2022).
- Link prediction for research directions (SemNet 2020; Science4Cast 2023; Gu and Krenn 2025).
- Sheaf consistency for measuring disagreement (Robinson); optimal transport for aligning schemes.
- Cultural keystone species (Garibaldi and Turner 2004), generalised to any entity.

**Features**
- Knowledge map with places, sources and verified sentences (**live**). Entity model, motif library, five importance lenses, observatory report per region (**rencana**).

**Laws and policy**
- **KKI 2023, idea 10:** a cultural observatory that monitors and studies cultural change and informs policy. **Idea 8:** digital processing of the large cultural datasets the state holds, and AI that supports regeneration and transfer of knowledge.
- **UU 5/2017 on cultural advancement:** the ten objects of cultural advancement (OPK); PPKD drafted bottom-up from regencies. **PP 87/2021** (the implementing regulation) sets up the integrated cultural data system (Sistem Pendataan Kebudayaan Terpadu).
- **Perpres 114/2022 (Strategi Kebudayaan), Article 3(2):** the strategy must be equipped with maps of how the OPK are developing across Indonesia, maps of cultural human resources and institutions, and maps and analysis of problems. A per-regency state-of-knowledge report produces exactly these, bottom-up.
- **Perpres 65/2018:** procedures for PPKD and the Strategi Kebudayaan.
- **Perpres 115/2024 (RIPK 2025–2045):** the target is better government services that keep the cultural ecosystem alive; mission 7 casts government as facilitator.
- **Perpres 39/2019 (Satu Data Indonesia):** shared standards, metadata and reference codes for government data. *(to verify how cultural data is covered)*

**Voice and media**
- Voice notes and video become witnesses in the graph, so the observatory measures the people's own layer growing, not only documents.

**Public data**
- Each place carries a landscape fingerprint per year from satellite embeddings; change becomes a question to the people of that place (motif M21). Comparing how people connect places with how alike those places look from space (motif M20, from neuroscience's representational similarity analysis) asks whether a people's map of meaning follows the land.

**Impact and indicators**
- Regencies with a state-of-knowledge report; reports used in a PPKD revision or a Dinas plan (letters of use).
- Gaps opened and closed per month (the topology lens); questions generated and answered.
- Researchers and institutions using the open dataset; citations.

## 4. Dua mata (two eyes)

**Claim.** Strata brings the good art of modern science closer to people, and people's knowledge closer to science, without making either the judge of the other. Measurements, papers and biodiversity records enter the same graph as one more voice.

**Our own findings**
- None yet; the seed has no measurement witnesses. The first spike would set one seasonal assertion beside one climate series.

**Research**
- **Two-Eyed Seeing (Etuaptmumk)**, introduced by Mi'kmaw Elders: see with the strengths of Indigenous knowledge in one eye and mainstream science in the other, and use both together.
- **Multiple Evidence Base** (Tengö et al. 2014): each knowledge system is evaluated within itself, then set side by side for triangulation and joint assessment.
- **Seasonal calendars:** CSIRO and the Bureau of Meteorology co-create Indigenous seasonal calendars; a 2024 study set calendar bushfire seasons beside drought and climate indices.
- **Folk and scientific classification:** high correspondence at the generic level (Berlin; Hunn 1975); near-perfect correspondence for lower-level vertebrate categories among the Fore of New Guinea (Diamond); and the Karam cassowary, where the difference is about relationship, not anatomy (Bulmer 1967).
- **Phylogenetic signal in traditional medicine** (Saslis-Lagoudakis et al. 2012), with benefit-sharing as the condition.

**Features**
- *Mata kedua* panel on entity pages; measurement witnesses (GBIF, rainfall, satellite, elevation, OpenAlex); folk–science correspondence computed per deployment (all **rencana**).

**Laws and policy**
- **UU 32/2009 on the environment** and **Permen LHK P.34/2017:** recognition and protection of local wisdom in managing natural resources; local wisdom open to the public is distinguished from secret or sacred local wisdom.
- **MK decision 35/PUU-X/2012:** customary forests are not state forests. Knowledge of land and forest is also a matter of rights.
- **UU 5/1994** (Convention on Biological Diversity) and **UU 11/2013** (Nagoya Protocol).
- **Perpres 115/2024 (RIPK), mission 5:** cultural advancement that protects biodiversity and strengthens ecosystems.
- **UU 2/2021 (Otsus Papua), Article 56:** education in Papua must take account of culture and local wisdom. **Permendikdasmen 22/2026** on local content makes schools natural partners (framing doc §8).

**Voice and media**
- With consent, a forest recording can be run through an open bioacoustics model (Perch 2.0, about 15,000 classes): an elder names a bird or frog call, the model finds similar calls, people confirm. Folk names and species meet through sound, with the folk name first.
- A photo of a plant gets a species suggestion (Pl@ntNet, free up to 500 a day), beside the poster's own name for it.

**Public data**
- Seasons beside climate: ERA5 reanalysis since 1940 and forecasts (including Google's WeatherNext 2) through Open-Meteo, free for non-commercial use.
- Landscape words beside the land: do a people's names for forest and garden types separate in satellite-embedding space? (ethnophysiography, motif M22). Studies in Angola, the Tiwi Islands and Ethiopia's Lower Omo combine remote sensing and local knowledge while keeping each on its own terms.
- Living kinds beside occurrence records (GBIF, iNaturalist).

**Impact and indicators**
- Entities with a second-eye panel; agreements, differences and silences reported.
- School classes or university groups using the panel; joint pieces by a scientist and a teller.

## 5. Pengetahuan yang hidup (living knowledge)

**Claim.** What matters is not only what was recorded, but what is still told and done. Strata measures vitality from provenance and helps keep knowledge in use.

**Our own findings**
- Badan Bahasa counts about 428 regional languages in Tanah Papua, yet reported BPS data for 2024 puts Provinsi Papua second-lowest nationally for daily use of a regional language (13.84%). *(check the BPS table before quoting; framing doc §4.2)*

**Research**
- A review of 92 studies found 77% reporting loss of local ecological knowledge, driven by globalisation, modernisation and market integration (Aswani et al. 2018).
- A 2026 synthesis of 473 cases found that communities' own resistance (keeping practices, values and management systems) is what sustains local knowledge (Fang et al. 2026, *One Earth*).
- Indigenous knowledge networks collapse as fast when cultural transmission is lost as when species are lost, and faster when both go (Cámara-Leret et al. 2019, *PNAS*). Core knowledge survives the loss of some holders; peripheral knowledge does not (Uruguay, 2024).

**Features**
- Language pages exist with the place and topic pages (**built**). Language rooms with a community-controlled dictionary and the Kata card ("Do you know this word? Is it still used? Say it.") (framing doc §7 and §10, **rencana**). Vitality lens and robustness simulations (**rencana**).

**Laws and policy**
- **UUD 1945 Article 32(2):** the state respects and maintains regional languages as national cultural wealth.
- **UU 24/2009, Article 42:** regional governments must develop, foster and protect regional languages and literature. *(to verify article text)*
- **UU 2/2021 (Otsus Papua), Article 58:** the province must foster, develop and preserve Papua's regional languages and literature; regional languages may be the language of instruction in basic education.
- **Permen LHK P.34/2017:** indicators of living local wisdom include maintained practice, maintained collective memory, and transmission between generations, which our vitality lens follows.
- **Perpres 78/2007** ratifying the UNESCO 2003 Convention for the Safeguarding of the Intangible Cultural Heritage.

**Voice and media**
- Voice notes are how a language stays in use on the platform. Meta's open Omnilingual ASR (1,600+ languages, 77 New Guinea languages in its evaluation, extendable with a few examples) may transcribe Papuan languages; whether Ekari is covered is *(to verify)*. Where it is not, the community writes transcripts ("bantu tulis"), which also builds the room's corpus under its control.

**Public data**
- Concepticon and Lexibank link words to standard concepts across 2,000+ languages, so language rooms can compare words across Papuan languages without giving up control of their dictionaries.

**Impact and indicators**
- Words added and voiced per language room; words marked "still used".
- Entities whose vitality improved (new *tuturan*, a taught-by link).
- Practices with a recorded transmission chain.

## 6. Ruang bersama yang terawat (a commons with a staff)

**Claim.** People need a reason to open the app on an ordinary day. Strata is a social commons kept active by a small, visible, sourced staff (Aksara and its regional voices) following a public rhythm (Ritme), without engagement prediction or infinite feeds.

**Our own findings**
- Papuans already write every day across scattered Facebook groups, Instagram captions and WhatsApp groups that never speak to each other (framing doc §4).
- An empty room is the first risk; the Ritme note designs a fortnight of public work before people arrive.

**Research**
- Lessons from Nextdoor's 2025 rebuild around daily needs; the risks of AI accounts on Meta's platforms and of Grok on X (Ritme note §3).

**Features**
- Communities, founding by two, seasons (**built**). Aksara abstains when it has no source, and stewards can switch it off at once (**live**, per claims ledger). Ritme slots: *Kabar pagi*, *Sedang dibicarakan*, *Soal hari ini*, *Hari ini di wiki*, *Temuan* (**rencana**). Mentions and handoff (**rencana**).

**Laws and policy**
- **KKI 2023, idea 7:** cultural meeting driven by *pe-lumbung-an* (commoning) and organic collective organising. **Idea 8** worries about screen-culture harm to mental health; a published ranking without engagement prediction answers it.
- **PP 17/2025 (PP Tunas):** duties for any system minors may use: a minimum age, age assurance, a reporting path, a risk self-assessment.
- **Juknis subtheme 5:** platforms for cultural communities, membership, activities and cultural networks.

**Voice and media**
- Threads-style posting: voice notes as a first-class component, short videos (60 seconds at first). Agents never post video or a synthetic voice.
- The reel is a *Temuan* selector beside *Terbaru* on Beranda, showing agents' composed cards; new card kinds include weather and season, landscape change and forest sounds (Ritme note §8).

**Public data**
- *Kabar pagi* adds weather by place; *Siaga* covers heavy rain, not "suspicious people".

**Impact and indicators**
- Weekly active people not on the team; communities opened by users and still active after a month.
- Share of feed items written by people versus Aksara (the Ritme ceiling is 20%).
- Aksara's record: posts flagged as wrong, verified-sentence rate.

## 7. Dapat dipercaya (trustworthy)

**Claim.** Every factual sentence in the seed was checked word for word against its source, every proposal claim links to code or a test, and compliance is part of the design.

**Our own findings**
- The verifier confirmed **586** sentences, rejected **5**, and could not reach the source for **37** (`seed/wiki/*.verify.json`).
- Each claim in `proposal/claims-2026-11-18.md` is tied to code and a test, and re-checked on 25 November.

**Research**
- Contested-claims modelling: separate a claim, a judgement about it, and an uncertainty assessment; keep superseded claims rather than delete them.
- Negative competency questions as tests (Ritme note §10).

**Features**
- Word-for-word quote check (**live**). AI writing always labelled and hidden until a person accepts it (**live**). Assertion logical status and witnesses (**rencana**).

**Laws and policy**
- **Juknis honesty rule** (quoted above) and the requirement that every cultural material has a clear source and right of use.
- **UU 28/2014, Article 41(b):** ideas, procedures, methods, findings and data are not protected by copyright even inside a protected work, so verified facts and short attributed quotes can be restated with links to the holder (framing doc §8).
- **PSE registration** (PP 71/2019; Permenkominfo 5/2020); **UU 27/2022**; **PP 17/2025**.

**Voice and media**
- Recordings are validated and stripped of metadata on the phone, as images are today. Machine transcripts, captions and species suggestions are labelled as machine-made until a person confirms.

**Public data**
- Every derived number keeps its model, version, source and licence in its witness, so a judge or researcher can trace it.

**Impact and indicators**
- Verified-sentence rate; time to correct a reported error; number of claims dropped at the 25 November re-check (aim: zero surprises).

## 8. Berkelanjutan dan bisa dibawa (sustainable and portable)

**Claim.** Strata is one product with many deployments. ETNOS is the first; any community (a Kalimantan deployment, a church synod, a partner in Aotearoa) can run its own, on open standards, with its own schemes and Ritme. A business and a research programme keep it alive.

**Our own findings**
- Free-tier Workers AI runs the default model; one key serves all resident agents (Ritme note §6).
- "A new region in one afternoon" is a planned recorded demo (framing doc §7).

**Research**
- Standards that make data travel: CIDOC CRM, Linked Art, SKOS, Wikidata's statement model, Glottolog.
- Cross-deployment comparison done properly: cultural phylogenetics with language trees (D-PLACE).
- Four research papers planned from the multiplex (multiplex note §14), co-authored with Papuan scholars and tellers by their choice.

**Features**
- AT Protocol identity and data portability (**live** sign-in; Spaces from 1 December). Open dataset per release (**rencana**). Business Model Canvas (**owed**; a dedicated session is still pending).

**Laws and policy**
- **KKI 2018, resolutions 3 and 4:** use cultural wealth to strengthen Indonesia's place in the world and raise people's welfare.
- **Perpres 115/2024 (RIPK), missions 3 and 4:** develop cultural wealth to strengthen Indonesia internationally; use the OPK for welfare.
- **PP 56/2022:** the KIK data centre aims at protection, promotion, research and education, and community empowerment; a community-run commons can feed a national inventory under the community's terms *(proposal)*.
- **Juknis:** finalists may continue through a cooperation agreement (PKS); the showcase is for meeting strategic partners.

**Voice and media**
- Costs are known: R2's free tier holds about 28,000 two-minute voice notes or about a thousand one-minute videos; Cloudflare Stream costs $5 a month per 1,000 minutes stored and $1 per 1,000 minutes watched; Workers AI Whisper fits about 200 transcript minutes a day in the free allocation.

**Public data**
- The measurement layer uses free or open resources only, so a new deployment inherits it at no cost. TESSERA's open embeddings can be cached by a partner in Papua.

**Impact and indicators**
- Deployments beyond ETNOS; institutions with a letter of use or PKS; paying observatory clients; dataset downloads and papers.

## 9. Where each thread goes in the submission

| Proposal section (template order) | Threads | Deck slide (fixed order) |
| --- | --- | --- |
| Problem | 1, 5 | 1 Background, 2 Problem |
| Existing solutions, short- and long-term plans | 1, 6 | 3 Existing solutions and plans |
| Cultural elements | 1, 2, 4, 5 | 4 Cultural elements |
| Solution and how it works; technology and method | 3, 6, 7 | 5 Solution and how it works |
| Target users | 6, 3 (institutions), 4 (schools, researchers) | 6 Target users |
| Novelty against comparable solutions | 3, 2, 4 | 7 Uniqueness |
| Track record and validation; impact | 7, 1 (findings), 5 | 8 Impact achieved and expected |
| Technical implementation; actual product condition | 7, 6 | 9 Actual product condition |
| Business Model Canvas; sustainability; roadmap | 8 | 10 Business model and roadmap |
| Cultural Power Indonesia in the world | 8, 3 | 10 (and the closing line) |

For the showcase video's six parts: introduction (1), demonstration (6, 3), usefulness and benefit (5, 4), uniqueness (3, 2), evidence of use or testing (7), development potential (8).

## 10. Regulatory map

| Instrument | What it says, in short | How Strata responds | Status |
| --- | --- | --- | --- |
| UUD 1945 Art. 18B(2), 28I(3), 32 | Adat communities and their rights recognised; cultural identity respected; regional languages maintained | Communities govern their spaces, protocols and schemes | live (spaces); rencana (protocols) |
| UU 5/2017; PP 87/2021; Perpres 65/2018 | Ten OPK; PPKD bottom-up; integrated cultural data system | OPK as a scheme; state-of-knowledge reports fit for PPKD | rencana |
| Perpres 114/2022 (Strategi Kebudayaan) | Needs maps of OPK development, cultural resources and problems | Observatory report per regency | rencana |
| Perpres 115/2024 (RIPK 2025–2045) | Seven missions incl. diversity, tradition, international standing, welfare, biodiversity, government as facilitator | Threads 1, 4, 5, 8 | — |
| UU 21/2001 as amended by UU 2/2021 (Otsus Papua) | Adat rights (43), OAP intellectual property (44), education with local wisdom (56), culture (57), languages (58), MRP (20) | Sovereignty, language rooms, schools, partnership with MRP and Dinas | rencana (partnerships) |
| UU 24/2009 (Bahasa) Art. 42 | Regional governments develop and protect regional languages | Language rooms with community control | rencana |
| UU 28/2014 (Hak Cipta) Art. 38, 41(b) | State holds copyright in traditional cultural expressions; ideas and data unprotected | Restate facts with links; check before republishing performances or designs | live (seed policy) |
| PP 56/2022 (KIK) | Inventory of five kinds of communal IP via a national system | Possible community-consented feed to the national inventory | rencana |
| UU 5/1994 (CBD); UU 11/2013 (Nagoya) | Consent and benefit-sharing for genetic resources and associated knowledge | Protocol and training flags; no export of biological-use knowledge without terms | rencana |
| UU 32/2009; Permen LHK P.34/2017 | Recognition of local wisdom; public vs secret/sacred; vitality indicators | Protocol layer; vitality lens | rencana |
| MK 35/PUU-X/2012 | Customary forests are not state forests | Land knowledge treated as a rights matter; no boundary claims by Aksara | policy |
| UU 27/2022 (PDP) | Personal data rules; biometric and genetic data are specific personal data with stricter handling | Privacy notice, consent, voice as personal data; no voiceprints, face recognition or human genetic data | partly live; to complete |
| PP 71/2019; Permenkominfo 5/2020 (PSE) | Registration of electronic system operators | Register or state the plan | to do |
| PP 17/2025 (Tunas) | Child-safety duties | Minimum age, reporting path, age assurance | to do |
| SE Menkominfo 9/2023; draft Perpres on AI roadmap and ethics | AI ethics; roadmap principles incl. data protection and IP | Labelled AI, human acceptance, published method | live (labels); watch the Perpres |
| Perpres 78/2007 (UNESCO ICH 2003) | Safeguarding intangible heritage | Community-led documentation | — |
| UNDRIP (2007) | Indigenous rights incl. over cultural heritage and knowledge | CARE-aligned governance | — |
| Permendikdasmen 22/2026 | Local content in schools | School communities, two-eyes panel | rencana |

## 11. Sources

Read 18–19 November 2026, in addition to those in `framing-and-impact-2026-11-17.md` and `research/epistemic-multiplex-2026-11-19.md`.

- Perpres 114/2022 (Strategi Kebudayaan): <https://peraturan.bpk.go.id/Details/225310/perpres-no-114-tahun-2022>, full text <https://jdih.kemenkoinfra.go.id/dokumen/file/perpres/2022/perpres-114/perpres-nomor-114-tahun-2022.pdf>
- Perpres 115/2024 (RIPK 2025–2045): <https://jdih.kemenkoinfra.go.id/en/berita/perpres-1152024-rencana-induk-pemajuan-kebudayaan-tahun-2025-2045>; derived regulations of UU 5/2017: <https://pemajuankebudayaan.id/peraturan-turunan/>
- PP 56/2022 (KIK): <https://peraturan.bpk.go.id/Details/233504/pp-no-56-tahun-2022>; DJKI announcement: <https://www.dgip.go.id/index.php/artikel/detail-artikel-berita/pp-nomor-56-tahun-2022-disahkan-inventarisasi-kekayaan-intelektual-komunal-akan-semakin-digeber>; national KIK data centre: <https://kikomunal-indonesia.dgip.go.id/pusat-data>
- UU 2/2021 (Otsus Papua): <https://peraturan.bpk.go.id/Download/165578/UU%20Nomor%202%20Tahun%202021.pdf>; comparison matrix (BPK Papua Barat): <https://papuabarat.bpk.go.id/wp-content/uploads/2022/11/MATRIKS-PERBANDINGAN-OTONOMI-KHUSUS-PAPUA-PAPUA-BARAT.pdf>
- UU 11/2013 (Nagoya Protocol): <https://jdih.kemenkeu.go.id/api/download/fulltext/2013/11TAHUN2013UU.htm>
- Permen LHK P.34/2017: <https://tanahkita.id/docs/pp/PERMEN_file_20190107_145414.pdf>; Permen LHK P.17/2020 on customary and private forests: <https://jdih.kemenkoinfra.go.id/dokumen/file/permen-lhk/p_17_2020_hutan_adat_dan_hutan_hak_menlhk_09252020092916.pdf>
- MK 35/PUU-X/2012: <https://www.mkri.id/public/content/persidangan/putusan/putusan_sidang_35%20PUU%202012-Kehutanan-telah%20ucap%2016%20Mei%202013.pdf>
- AI regulation: Komdigi on the draft Perpres for the AI roadmap 2026–2029 (12 February 2026): <https://jdih.komdigi.go.id/berita/view/113>; Komdigi on the planned AI Perpres (16 March 2026): <https://portal.komdigi.go.id/kanal-publik/berita-kini/10081>; Kompas on Keppres 38/2025: <https://www.kompas.id/artikel/program-perpres-2026-ditetapkan-dua-rancangan-atur-etika-dan-peta-jalan-ai-nasional>
- Kaitiakitanga Licence, as described: <https://kiwidynamics.co.nz/maori-ai/frameworks/kaitiakitanga-license/>; Māori AI Governance Framework: <https://www.kahuiraraunga.io/_files/ugd/b8e45c_79f4162207da4123861c50dec08cd0fb.pdf>; Schulz and Loewen-Colón (2026): <https://link.springer.com/article/10.1007/s00146-026-02931-z>
- Measurement layer and multimodal sources (AlphaEarth, TESSERA, Open-Meteo, Perch 2.0, Omnilingual ASR, Pl@ntNet, GBIF, CLDF datasets, Cloudflare and AT Protocol limits): see `research/epistemic-multiplex-2026-11-19.md` §17.
- Not re-read this session, cited from standing knowledge and marked *(to verify)* where it matters: UUD 1945 Articles 18B, 28I, 32; UU 24/2009 Article 42; UU 28/2014 Article 38; UU 27/2022 Article 4 (specific personal data); UU 5/1994; Perpres 39/2019; Perpres 78/2007; PP 87/2021.
