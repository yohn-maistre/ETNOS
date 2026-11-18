# Topic primitives and knowledge organisation

18 November 2026. Research for the owner. Tags: [V] verified in a source opened today, [S] from memory or a search summary, [U] unverified. Nothing here changes code or other docs.

## Summary

1. Keep the four axes already decided (place, people and language, topic, kind). They match the facet idea in classification theory [S], and that is the strongest support in the literature.
2. Ship one topic scheme, the fourteen ranah, plus four additions for everyday interests: Olahraga dan permainan, Kerja dan usaha, Pendidikan, Teknologi dan komputer. That makes 18.
3. Reason for the four: the fourteen cover knowledge of place well. They have no home for football, jobs, coding or school, which large platforms treat as top-level [V for Wikipedia and Meetup, S for others].
4. Depth is two levels shipped. Display headings above the 18 are not labels and hold no posts.
5. Each topic is a concept with a stable id, several names (each with language and who gave it), and links to crosswalk schemes (UU 5/2017, UNESCO, Western disciplines). Local names lead.
6. A topic may have several parents. Crosswalk links use match types (exact, close, broader) and never change the working tree.
7. Change is by proposal. Rename, merge and withdraw keep the old id and name as an alias. Found themes from posts feed proposals only after sustained use.
8. Who defines categories is the main finding of the Indigenous literature. Each community defines its own. The shipped set is a default, labelled as one, and every deployment can replace it.
9. Evidence is thin for Papua, for the exact count of 18, and for how Papuan users group topics. An open card sort with ETNOS users should settle the first draft.
10. The UU 5/2017 ten objects and the UNESCO five mix kinds of heritage with subjects, so they work as crosswalks and lenses.

## 1. What the repo already decides

| Source | Decision | This research |
| --- | --- | --- |
| `knowledge-organisation-2026-11-15.md` | Label families need a citable source, about a dozen top entries, and never label a person. Topics are a hand-made list of 23 in three groups. Themes come from posts. | Agrees on all three rules. The three groups are an extra level that this note recommends treating as headings (section 6). |
| `strata-model-2026-11-17.md` 4.1a, 4.5 | Place spine is administrative, cultural regions are overlays. Topic schemes ship as data and sit side by side. | Agrees. Section 5 applies the same overlay idea to topics. |
| `advisor-review-2026-11-17.md` section 8 | One working scheme, the fourteen ranah. UU 5/2017 and Western disciplines are crosswalks. | Agrees on the principle. Disagrees that fourteen are enough for a default to every deployment (section 6). |
| `direction-2026-11-16.md` | Four axes, topic tree two levels at most. | Agrees. |
| `knowledge-map-design-2026-11-16.md` 2 | Fourteen ranah, multi-label, communities may rename, merge or add. | Agrees. Bridges across ranah are supported by section 3. |
| `src/catalogues/tanah-papua.json` | Topic entries carry `facet` values (topic-group, cultural-domain, community-kind, institution-kind) and `parents`. "Iman & gereja" is already titled "Iman & agama" with the old title kept in `previousTitles`. Eight of the ten UU 5/2017 objects have their own entry. Seni and Bahasa reuse existing topics. | The `previousTitles` field is the right shape for rename without loss. Community kinds and institution kinds are stored as topics, which is a data-model convenience. They answer a different question (how people gather, what an organisation is) and should stay a separate facet in the interface. |

## 2. Classic knowledge organisation

**Facets.** Ranganathan's Colon Classification is an early faceted (analytico-synthetic) scheme. Its facets are Personality (the focal subject), Matter, Energy (processes and activities), Space (place) and Time, abbreviated PMEST [V, Wikipedia, https://en.wikipedia.org/wiki/Colon_classification]. The argument for facets is that a subject is a combination, so one tree forces a single order on things that vary independently. A single tree must pick whether "sago in Nabire in the 1950s" files under food, place or period. Facets let all three hold at once [S].

Strata's axes line up with this. Place is Space. The "when it is about" range is Time. Kind (cerita, kabar, tanya) is close to Energy. Topic and people or language together cover Personality and Matter [S, my mapping]. Colon Classification itself starts from a discipline main class and then applies facets [S]. Strata starts from facets and has no discipline-first step, which avoids that dependence.

**Bias in the general schemes.** Hope Olson's *The Power to Name* (2002) examines Dewey Decimal Classification and Library of Congress Subject Headings and argues that their claim to universality marginalises groups, including by gender, race and ethnicity [V, Wikipedia summary of the book, https://en.wikipedia.org/wiki/Hope_A._Olson]. I did not read the book. Sanford Berman's critique of subject headings is collected in *The Joy of Cataloging* (1981), which includes a chapter on Dewey [V for the existence of the chapter, via a 1984 review at https://core.ac.uk/download/4813936.pdf]. His 1971 *Prejudices and Antipathies* is the best-known earlier work [S]. The commonly cited Dewey example is that class 200 gives most of its subdivisions to Christianity [S]. UDC inherits Dewey's structure [S].

The lesson for Strata is narrow. A scheme written in one place and time puts its own concerns at the centre and everyone else's under "other". The defence is local naming, visible provenance and the ability to change, which section 7 builds in.

**Basic level.** Rosch and colleagues (1976) argued that people prefer a middle level of generality (chair, not furniture or armchair) and that this level carries most shared attributes [V, https://www.cns.nyu.edu/~msl/courses/2223/Readings/Rosch-CogPsych1976.pdf, via search excerpts]. Two cautions apply. The 1976 sample was Berkeley undergraduates, and for biological kinds the basic level came out as bird, fish and tree rather than robin, trout and maple. Medin and Waxman (1998) suggested that people from farming societies know more about plants and animals and would show a finer basic level [V as reported in search excerpts, https://groups.psych.northwestern.edu/medin/documents/MedinWaxman1998ConceptOrg.pdf]. Later studies found expertise moves the basic level [V as reported, Tanaka and Taylor 1991].

Implication. Top-level topics should be at the grain people already name in daily talk (football, health, farming, school). It should not be the grain of a discipline (sociology, zoology). The basic-level work gives no count for top-level topics. It also says the right grain differs by expertise, so a community of sago growers will want finer labels under food than a city deployment. That argues for letting communities add children (section 7).

## 3. Indigenous and community-centred organisation

| Work | What it is | What it says about who defines categories |
| --- | --- | --- |
| Brian Deer Classification | Made in the mid-1970s by A. Brian Deer (Kahnawake Mohawk) at the National Indian Brotherhood library. Top levels follow relationships among people, animals and land. Xwi7xwa Library at UBC uses an adapted version [V, https://en.wikipedia.org/wiki/Brian_Deer_Classification_System]. | Deer built each collection's scheme around the concerns of local Indigenous people at the time, so categories varied by library. The cost is inconsistency between catalogues [V, same page]. |
| Ngā Upoko Tukutuku (Māori Subject Headings) | Standard te reo Māori subject terms, developed by a project sponsored by LIANZA, Te Rōpū Whakahau and the National Library, launched 2006, more than 2,000 terms. Used beside LCSH, with MARC source code "reo". The National Library takes suggestions for new terms by email [V via search summary, https://natlib.govt.nz/librarians/nga-upoko-tukutuku and https://otago.libguides.com/Nga_Upoko_Tukutuku]. | Māori librarians' bodies co-own it. Terms are in Māori first. It runs beside the national scheme, and does not replace it. The library page itself would not load today (bot check). |
| Mashantucket Pequot Thesaurus | A user-centred thesaurus of American Indian terminology, meant for use with LCSH [V via search, https://main.aisc.ucla.edu/research/past-research-projects/mashantucket-pequot-thesaurus-project]. The main scholarly account is Littletree and Metoyer (2015), *Cataloging & Classification Quarterly* 53 [S, not read]. | Built for the people who search, and the sources note its reach is limited by the variety of tribal knowledge structures [V via search]. |
| Mukurtu CMS | Organises content around communities, cultural protocols and categories. Protocols control access and belong to a community. Categories are site-specific high-level terms for browsing. TK Labels can be customised on the site [V via search, https://docs.mukurtu.org/digital-heritage-items/DHMetadataFields/]. | The site decides its categories. Access rules are set by the community that holds the item. |
| Local Contexts TK Labels | Labels for provenance, protocol and permission, such as TK Seasonal, TK Women Restricted, TK Community Use Only. Indigenous communities and local organisations apply them [V, https://localcontexts.org/labels/traditional-knowledge-labels/]. | Only the community sets its labels. This matches the existing line in `direction-2026-11-16.md` that TK Labels are protocol and not topics. |
| CARE principles | Collective benefit, Authority to control, Responsibility, Ethics. Written by the International Indigenous Data Sovereignty Interest Group within the Research Data Alliance, as a complement to FAIR. Carroll et al. 2020, Data Science Journal 19(1):43 [V via search, https://doaj.org/article/b3fcded6f18a4d0488c20ce01be01994]. The GIDA page would not load (404). | Authority to control is the principle that bears on categories. People who hold the knowledge have a say over how it is described. |
| Vanuatu Cultural Centre | Fieldworker programme to record kastom. A 1984 moratorium on foreign research, lifted 1995 with new guidelines, was driven by concerns about who owns kastom knowledge and controls its circulation [V via search, https://press-files.anu.edu.au/downloads/press/p146521/pdf/ch23.pdf]. | Control over circulation is a political question in Melanesia, and categories are part of circulation [S, my reading]. |

**Indonesia and Papua.** The National Library of Indonesia keeps a Daftar Tajuk Subjek and an online controlled-heading version, and uses DDC and UDC adaptations [V via search, https://ejournal.perpusnas.go.id/bp/article/download/5025/1355/10597]. I found no published procedure for adding local-culture headings. I found no scholarship on Papuan or PNG knowledge organisation for library or platform use. The Vanuatu material is the nearest Melanesian result. This gap is real and should be stated in the project's own documents.

**Reading across.** Four points recur in these works and the sources agree on them.

- Categories come from the community that holds the knowledge.
- A national or universal scheme runs beside the local one. It does not replace it.
- Local-language terms lead.
- Access rules are separate from topic labels.

Strata's design (topics as labels, protocol as a separate field) follows all four.

## 4. Platforms and what they teach

Only the rows marked [V] were opened or returned by a search today. The rest are from memory and should be checked before anything is quoted.

| Platform | Structure | What it suggests |
| --- | --- | --- |
| Wikipedia | Main topic classifications category has 34 subcategories and states it is "not intended to adhere to some strictly hierarchical structure" [V, https://en.wikipedia.org/wiki/Category:Main_topic_classifications]. Vital articles use 11 top categories, one of them Everyday life, across five levels of 10, 100, 1,000, 10,000 and 50,000 articles [V, https://en.wikipedia.org/wiki/Wikipedia:Vital_articles]. | A volunteer scheme for a global encyclopaedia settled on about eleven top groups and tolerates overlap. A top group for everyday life exists. |
| Meetup | Each group has one category from 30 or more (33 in a 2016 archived page) and up to 15 topics. Staff review suggested topics before adding them [V via search, https://www.meetup.com/blog/how-to-use-topics-to-maximize-your-meetup-experience]. | Two layers: a short fixed list for browsing, a larger reviewed list for matching. The count of 30 or more is higher than the other schemes here. |
| Stack Exchange | Tags with synonyms and a "burninate" process to retire a tag. A tag that cannot stand alone as the only tag on a question is treated as a meta-tag [V via search, https://stackoverflow.blog/2010/08/01/tag-folksonomy-and-tag-synonyms/]. | A working merge and retire process, run by the community with moderator help. |
| Discourse | Guidance that categories should stay few and tags carry detail [S]. The official page I tried returned 404. | Plausible, unverified. |
| Reddit | Communities are created by anyone, with no shared taxonomy beyond search and recommendation [S]. | Gives freedom and duplicates. Strata's communities are already free to start. The topic list is only a way to find them. |
| Mastodon | Hashtags, with follow-a-tag [S]. | Free tags work for discovery. No synonym handling [S]. |
| Bluesky | Custom feeds and starter packs, which bundle accounts and feeds for a newcomer [S]. The docs page redirected and the redirect target returned 404. | Starter packs suggest the form for a deployment's default: a bundle a newcomer can accept, edit or drop. |
| Facebook Groups, YouTube, Spotify | Category and genre lists maintained by the operator [S]. | Operator-owned lists. Not useful as models for community authority. |
| IAB Content Taxonomy | Version 3.1, about 1,500 categories in 3.0, used for contextual targeting and brand safety [V, https://iabtechlab.com/standards/content-taxonomy/]. Tier count and licence not stated on the page [U]. | An industry scheme for classifying pages for advertisers. It is a possible crosswalk target and a poor model for a default. |
| Wikidata | Items with statements. "Subclass of" and "instance of" allow many parents [S]. | Multi-parent graphs are workable at scale, with known cleanup costs [S]. |

**Folksonomy and controlled vocabulary.** Thomas Vander Wal coined "folksonomy" in 2004. He distinguishes broad folksonomies, where many people tag one item, from narrow ones, where few do. Known weaknesses are synonyms, homonyms, spelling variants and vague personal tags [V, https://en.wikipedia.org/wiki/Folksonomy]. Golder and Huberman (2006) studied Del.icio.us and found that the proportions of tags applied to a given URL settle into stable patterns [V via search summary of the abstract, https://www.arxiv.org/pdf/0705.1013 lists related work; the paper is in J. Information Science 32(2):198-208]. The practical reading is that a tag used by many people for a long time is a reliable candidate for promotion. This supports the existing rule that a found theme becomes a candidate only after months of wide use.

**SKOS.** The W3C vocabulary has prefLabel (one per language tag per concept), altLabel, broader, narrower and related. Broader links are not transitive, a concept may have several broader concepts, and related cannot sit beside a hierarchical link between the same concepts [V, https://www.w3.org/TR/skos-reference/]. SKOS also defines mapping properties (exactMatch, closeMatch, broadMatch and others) for links between schemes [S, not reached in the part of the page I read]. This is the established way to hold a working tree and crosswalks at once.

**Failure patterns** seen across these examples [S unless noted].

- A scheme owned by the operator drifts from how people talk.
- Free tags fragment (synonyms, spellings).
- Deep trees are hard to keep, and Wikipedia says so about its own categories [V].
- Lists with no retire process grow without limit.
- A small fixed list for browsing plus a flexible layer for matching (Meetup, Stack Exchange) appears in the schemes that scale.

## 5. Heritage schemes and everyday interests

UNESCO's 2003 Convention, Article 2.2, lists five domains: oral traditions and expressions including language; performing arts; social practices, rituals and festive events; knowledge and practices concerning nature and the universe; traditional craftsmanship [V, https://ich.unesco.org/en/convention].

UU 5/2017 Pasal 5 lists ten objects: tradisi lisan, manuskrip, adat istiadat, ritus, pengetahuan tradisional, teknologi tradisional, seni, bahasa, permainan rakyat, olahraga tradisional [V, as quoted in `knowledge-organisation-2026-11-15.md`, which cites the law's PDF].

| Observation | Basis |
| --- | --- |
| Both schemes are about heritage, so they leave out contemporary life. Football, coding, jobs, a new film or a school fee have no place unless called "traditional". | [V] from the lists above |
| Both mix kinds of thing and subjects. "Manuskrip" names a medium. "Ritus" names an event type. "Bahasa" and "olahraga tradisional" name subjects. A single label cannot both file a manuscript and describe what it is about. | [V] from the lists above, my reading |
| UU 5/2017 maps to UNESCO's five by grouping (for example seni to performing arts, teknologi tradisional and pengetahuan tradisional to craftsmanship and nature knowledge). The mapping is many to many. | [S], my mapping |
| Dinas kebudayaan and Budaya GO! use the UU words, so the crosswalk has practical value. | Existing docs |

So these schemes are right as a lens and as a reporting table. They would be a poor primary list for a deployment where most posts are about everyday life. This agrees with section 8 of the advisor review.

How the fourteen ranah relate to everyday interests is the gap. Mapping the interests named in the brief against the fourteen.

| Everyday interest | Nearest ranah today | Fit |
| --- | --- | --- |
| Music | Seni dan teknologi | Fair, mixed with carving and tools |
| Football and other sport | None (Permainan rakyat exists only in the UU crosswalk) | Missing |
| Coding, phones, internet | Seni dan teknologi | Poor, grouped with carving |
| Jobs, scholarships, business | Kehidupan bersama | Weak, grouped with politics |
| School, studying | Kehidupan bersama | Weak |
| Food and cooking | Pangan | Good |
| Film, books, games | Seni dan teknologi, Cerita | Weak |

## 6. Recommendation

### 6.1 Structure

- **Four facets, as decided.** Place, people and language, topic, kind. Time and protocol remain properties of records and are not topics.
- **One working topic scheme with two shipped levels.** Level one is the 18 topics below. Level two is optional children that a deployment or community adds. A third level is allowed only inside a single community's own space, where it does not appear in the global list.
- **Display headings are not labels.** The three groups in the catalogue file (Hidup bersama, Pengetahuan, Budaya & hiburan) become section headings on the browse page. They hold no posts and have no page. This removes one level and keeps the basic-level grain at the top.
- **Multi-parent allowed.** A child may sit under several topics (the engine already allows up to 20 parents and refuses cycles). A bridge is an item with two or more topics. Parents are for browsing, and relations between topics that are not parent and child use a related link, as in SKOS.
- **Crosswalks as match links.** Each topic carries optional links to UU 5/2017 objects, UNESCO domains and Western disciplines. Each link has a type (exact, close, broader, narrower) and a source. Crosswalks never add posts to a topic and never change the tree. A "lens" re-groups topics under another scheme's headings for display.
- **Separate facets for kind.** Community kinds and institution kinds stay out of the topic list in the interface. In data they can remain entries with a `facet` value.

### 6.2 The starter set

Eighteen topics, with the fourteen from `knowledge-map-design-2026-11-16.md` unchanged in name except one rename, and four additions. English names are glosses for operators.

| # | Indonesian | English | Status |
| --- | --- | --- | --- |
| 1 | Alam hidup | Living world | Existing |
| 2 | Hutan dan tanah | Forest and land | Existing |
| 3 | Laut, sungai, danau | Sea, rivers, lakes | Existing |
| 4 | Iklim dan musim | Weather and seasons | Existing |
| 5 | Langit | Sky | Existing |
| 6 | Pangan | Food and gardens | Existing |
| 7 | Kesehatan | Health | Existing |
| 8 | Bahasa | Language | Existing |
| 9 | Cerita | Stories and songs | Existing |
| 10 | Adat dan hukum | Custom and law | Existing |
| 11 | Kepercayaan | Faith and belief | Existing |
| 12 | Seni dan kerajinan | Art and craft (music, film, books, carving, noken) | Renamed from Seni dan teknologi, machine technology moves to 16 |
| 13 | Sejarah | History | Existing |
| 14 | Kehidupan bersama | Public life (politics, rights, conflict, development) | Existing, narrowed |
| 15 | Olahraga dan permainan | Sport and games | New |
| 16 | Teknologi dan komputer | Technology and computing | New |
| 17 | Kerja dan usaha | Work and business | New |
| 18 | Pendidikan | Education and learning | New |

Grounds for the additions. Wikipedia's vital articles and Meetup both give separate space to everyday life, technology and work [V for Wikipedia's "Everyday life", S for the rest]. The catalogue already holds Olahraga, Teknologi & pemrograman, Kerja & beasiswa and Pendidikan as topics, so the four additions keep what ETNOS already seeded and fold the rest (Film, Buku, Hobi, Pemuda, Jalan listrik internet, Iklim & bencana) into children or into existing topics. Pemuda is an audience and belongs to a people facet or to community kind, not to topic [S, my judgement].

The 18 is a judgement. Eleven (Wikipedia) to about 30 (Meetup) is the range seen, and none of the cognitive work gives a number [V for the range, no source for a best count]. Eighteen fits one screen of chips on a phone, which is a design reason and not an evidence-based one.

Where this disagrees with the advisor review. The review asks for "one working topic scheme (the fourteen ranah)". The principle holds. The count of fourteen leaves everyday interests homeless, so I recommend 18 and keep the crosswalk rule.

### 6.3 Avoiding imposition

- **Provenance line on every family**, already the "Dasar label" practice. For topics the line should read as what it is, for example "Daftar awal dari tim ETNOS, disusun dari rancangan peta pengetahuan. Dapat diubah oleh komunitas."
- **Local names first.** A topic has several names. Each name records its language and who gave it. A deployment, or a community inside it, chooses which name leads in its own pages. A Mee, Biak or Dani name may lead in a language space while the Indonesian name stays as an alias. SKOS allows one prefLabel per language tag, so community-specific leading names need a scope field Strata adds itself [S, my design, SKOS itself does not provide it].
- **Aliases and searchable synonyms.** altLabel equivalent for old names, slang and spellings. Old titles stay (as `previousTitles` already does).
- **Facet for who defined it.** Each topic and each crosswalk link shows its source, creator and date. The shipped 18 are labelled as Strata defaults.
- **No label on a person.** Already a rule. Keep it for topics.
- **Protocol separate from topic.** An item may be on "Kepercayaan" and carry a protocol that restricts viewing. The community sets that protocol (Local Contexts, Mukurtu pattern) [V].

### 6.4 Evolving the set

| Action | Who can propose | Who decides | What is kept |
| --- | --- | --- | --- |
| Add a child under a topic | Any member of a community | That community's stewards | Appears first in that community. Promoted to the deployment list on steward vote. |
| Add a top-level topic | A steward | Deployment stewards, with a public note of reasons | Topic id and creator. |
| Rename | A community or steward | Same body that owns the label | Old name as alias. Old id never changes. |
| Merge | Anyone with a reason | Stewards of the deployment | Redirect from the merged id. Posts keep their labels. Mirrors Stack Exchange synonyms [V via search]. |
| Withdraw | A steward | Same | Page remains with a note and is removed from browse. Posts keep the label. |
| Found theme becomes a topic | The theme proposal path from `knowledge-organisation-2026-11-15.md` | Stewards | Kept after months of use, in line with stable tag proportions in Golder and Huberman [V as reported]. |

Rules that hold in all cases.

- A deployment can replace the whole starter set at setup. The default is an offer, in the style of a Bluesky starter pack [S, not verified].
- Changes to a deployment's top level are logged publicly with reasons.
- A community's local topics never need approval from the deployment to exist inside that community.
- Upstream Strata changes to the default set arrive as a proposal the operator accepts or declines, never as an automatic edit.

### 6.5 Where the evidence is thin

| Question | Evidence | State |
| --- | --- | --- |
| Is 18 the right top-level count? | Range seen is 11 to 30 or more. No study gives a count. | Judgement |
| Do Papuan users group topics this way? | No Papuan or PNG study found. Only Vanuatu on control of kastom. Indonesian national subject headings exist but no local-culture procedure was found. | Gap |
| Does the basic-level result hold for these users? | Rosch tested US students. Later work says expertise shifts the level. | Open |
| Do multi-parent trees stay usable on a phone? | Wikipedia and SKOS allow them. No test in this context. | Open |
| Are the community-owned categories of Deer and Mukurtu transferable to a web platform at scale? | Both serve a single library or site. | Open |
| Does the IAB scheme need a crosswalk? | Only the version and size were verified. Licence unknown. | Unverified |

Suggested next step. Run an open card sort with 15 to 25 ETNOS users in two or three places, using 40 to 60 cards of real posts and community names, in Indonesian and in local language where possible. Compare the groups people make with the 18. Treat disagreement as a reason to rename or add, and record it in the topic's history.

## Sources

Accessed 18 November 2026 unless noted.

- Brian Deer Classification System, Wikipedia. https://en.wikipedia.org/wiki/Brian_Deer_Classification_System
- Colon classification, Wikipedia. https://en.wikipedia.org/wiki/Colon_classification
- Hope A. Olson, Wikipedia. https://en.wikipedia.org/wiki/Hope_A._Olson
- Perreault, review of Berman's *The Joy of Cataloging* (1984). https://core.ac.uk/download/4813936.pdf (surfaced by search, not opened in full)
- Rosch et al., "Basic Objects in Natural Categories", Cognitive Psychology 8 (1976). https://www.cns.nyu.edu/~msl/courses/2223/Readings/Rosch-CogPsych1976.pdf (search excerpts only)
- Medin and Waxman (1998), concept organisation. https://groups.psych.northwestern.edu/medin/documents/MedinWaxman1998ConceptOrg.pdf (search excerpts only)
- Basic category, Wikipedia. https://en.wikipedia.org/wiki/Basic_category (does not describe the experiments)
- Ngā Upoko Tukutuku, National Library of New Zealand. https://natlib.govt.nz/librarians/nga-upoko-tukutuku (bot check, not read; claims from search summary) and https://otago.libguides.com/Nga_Upoko_Tukutuku
- Mashantucket Pequot Thesaurus Project, UCLA AISC. https://main.aisc.ucla.edu/research/past-research-projects/mashantucket-pequot-thesaurus-project (search summary)
- Mukurtu documentation. https://docs.mukurtu.org/digital-heritage-items/DHMetadataFields/ (search summary)
- Local Contexts, TK Labels. https://localcontexts.org/labels/traditional-knowledge-labels/
- Carroll et al., CARE Principles, Data Science Journal 19(1):43 (2020), DOI 10.5334/dsj-2020-043. https://doaj.org/article/b3fcded6f18a4d0488c20ce01be01994 (the GIDA page https://www.gida-global.org/care returned 404)
- Vanuatu Cultural Centre and kastom research, ANU Press chapter. https://press-files.anu.edu.au/downloads/press/p146521/pdf/ch23.pdf (search excerpt)
- Perpustakaan Nasional, subject headings article. https://ejournal.perpusnas.go.id/bp/article/download/5025/1355/10597 (search summary)
- Category: Main topic classifications, Wikipedia. https://en.wikipedia.org/wiki/Category:Main_topic_classifications
- Wikipedia:Vital articles. https://en.wikipedia.org/wiki/Wikipedia:Vital_articles
- Meetup, how to use topics. https://www.meetup.com/blog/how-to-use-topics-to-maximize-your-meetup-experience (search summary)
- Stack Overflow blog, tag folksonomy and tag synonyms (2010). https://stackoverflow.blog/2010/08/01/tag-folksonomy-and-tag-synonyms/ (search listing only)
- IAB Tech Lab, Content Taxonomy. https://iabtechlab.com/standards/content-taxonomy/
- Folksonomy, Wikipedia. https://en.wikipedia.org/wiki/Folksonomy
- Golder and Huberman, Usage patterns of collaborative tagging systems (2006). https://collablab.northwestern.edu/CollabolabDistro/nucmc/GolderAndHuberman-usage%20patterns%20collab%20tagging.pdf (abstract-level summary only)
- SKOS Reference, W3C. https://www.w3.org/TR/skos-reference/ (first 100,000 characters read)
- UNESCO, 2003 Convention. https://ich.unesco.org/en/convention
- UU 5/2017 Pasal 5, as cited in `docs/knowledge-organisation-2026-11-15.md`. https://dapobud.kemenbud.go.id/docs/dasar-hukum/uu-5-2017.pdf (not reopened today)

Not loaded or not reached: Bluesky starter pack docs (redirect, then 404), Discourse category guidance (404), GIDA CARE page (404), NZ National Library page (bot check). Reddit, Mastodon, Facebook, YouTube, Spotify and Wikidata rows rest on memory. Littletree and Metoyer (2015), Olson's book and Berman's 1971 book were not read.
