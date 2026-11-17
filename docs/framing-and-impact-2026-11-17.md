# Strata: the case, the impact, and how we tell it

17 November 2026, evening. A long conversation between the owner and an assistant, written down as one document: what Strata is for, who it helps, how it meets BUDAYA GO! 2026, what is still missing, and what we would add next. It gathers the owner's own words, the competition's technical guide (juknis), the research done today, and the assistant's reading of all three.

**Status: living ground truth, not frozen.** Treat this as the reference other plans can point to, and change it whenever we learn something. Where it disagrees with `showcase-plan-2026-11-17.md` on *what we build*, the showcase plan wins until the showcase. Where it disagrees on *how we frame it*, this document wins. Sections marked *proposal* are suggestions the owner can overturn. Names of private people are left out on purpose; roles stand in for them.

A note on readers: the repository is public, and judges may be invited to it. Everything here is written so that a judge could read it without surprise. It is candid about our weaknesses because the juknis rewards honesty about readiness, and because we would rather say it first.

Contents:

1. The case in one breath
2. What the owner said
3. What the competition asks for
4. The problem
5. The idea, and why it is new
6. Who benefits, and how we will know
7. What we show: flagship features and the demo
8. The last mile: what a people's daily life needs
9. Doing more with the knowledge: the state's data and ours
10. Ways to answer: card primitives for knowledge and research
11. Names and positioning
12. Why AT Protocol
13. Models for Aksara and for seeding
14. Business and sustainability
15. Risks, gaps and compliance
16. The field: last year's winners and this year's entries
17. A judge's reading of our entry
18. Open questions and next steps
19. Sources

---

## 1. The case in one breath

> **Yang hidup tidak tercatat, yang tercatat tidak hidup.**
>
> Budaya Papua hidup di percakapan sehari-hari, tetapi percakapan itu tercecer dan hilang. Pengetahuan tentang Tanah Papua sebagian besar terkunci di jurnal, buku dan museum, dan kebanyakan ditulis oleh orang luar. Strata menyatukan keduanya: percakapan hari ini mengendap menjadi pengetahuan, dan pengetahuan itu kembali hidup dalam percakapan. ETNOS adalah tempat pertama di mana ini terjadi, dimulai dari Tanah Papua.

In English: what is alive goes unrecorded, and what is recorded is no longer alive. Strata joins the two. Today's talk settles into knowledge, and knowledge comes back into today's talk. ETNOS is the first place this happens, starting in Tanah Papua.

Everything else in this document is the explanation of that sentence.

## 2. What the owner said

These are the owner's points from the conversation of 17 November, kept close to his own words and lightly cleaned up. They are the intent this document serves.

**On why Strata exists**

- "Culture should be lived, and that's pretty much why we ended up with Strata."
- People need "a place to access all the knowledge pertaining to our own place and land, that is way more accessible than Wikipedia or actual published papers or a long book. It should be right there, on the next page, alongside language communities", while people on the home page are "talking about rap battles or family feuds or politics or crazy stuff".
- The language spaces exist "for communities to digitalise and build a corpus of their language and cultural artifacts on their own PDSes".
- "Curating the knowledge helps us write the current state of culture of our own going forward."

**On what he has seen** (the gut feeling behind the problem statement)

- Many small "news outlet" websites where Papuans write their own thoughts, "all sort of all over the internet".
- City Facebook groups that are "half active with 50 members".
- People writing on Instagram captions "with 50 likes because they have 100 followers".
- WhatsApp groups "forming their own bubble with no intercommunication with other people".
- Grassroots organisations not knowing how to coordinate, "and even government institutions".
- The wish for Strata to be the layer, the substrate, "where people discuss and work as well". Institutions with an Aksara node, or self-hosted, "could house their agents, and the agents could communicate publicly on the platform".

**On seeding**

- "We're starting with public CC materials, and this is to invite people to discuss and add on to their own knowledge base."
- "Most of the stuff is copyrighted on behalf of the custodians anyway, like museums. The subjects should have the right to curate it back for their own use."
- "People just probably won't start writing or joining a new thing unless there's something already there."
- "No one is gonna hand-curate 600 pages just to deploy a community if they have Facebook groups already. This is what invites people to check and join."
- Aksara's ongoing work (talking about the wiki, taking care of it, researching more, pruning, editing) is "the flagship as well: a living communal knowledge base to be moulded, built upon".

**On AT Protocol**

- "What we aim for is data sovereignty, and that means users get to own their data. We started with ActivityPub, but it could risk centralisation. With atproto's latest development of Spaces, it introduces a stronger primitive for a community of users to take ownership of their data while still being able to participate in a larger community."

**On sustainability and people**

- "Abstraksi maintains it, and we'll hire developers, and we'll get the community involved directly, picked from the active users." Stewards drawn from many areas "will think of this as important and will tell people to join".
- On the business side, his earlier idea: "a built-in marketplace so people can offer products, or switch a toggle and their profile could show a badge showing they have stuff to offer, or actually open a business page". Also a sustainable ad mechanism for local businesses, "maybe a meta community just to post ads".
- On what judges mean by sustainability: "is this solution sustainable and can it be funded, rather than it being a mere landing page for a tribe."

**On the competition**

- The competition contact confirmed that judges can be invited to repositories as evidence that forms of the idea existed before 31 March 2026.
- Unfinished work goes in the roadmap, not the proposal.
- Politics is toned down in what we submit. West Papua Watch was only used to demo the news site; the feed engine now lives in Strata.
- The live feed during judging will be carried by close friends of varied backgrounds.
- Strata leads as the product name; ETNOS is our own deployment of it.
- "So it's pretty much an everything burger, but it's not unfounded at least."

**On daily life, art and research** (later the same evening)

- Sharing a montage of Papuan Instagram from his own feed: "obviously not research", but it shows a range, with "most kids already tech-savvy and mingling with the greater western cohorts". His point: this is "still a melting pot of a social place that's more place-aware and closer to communal data and knowledge, but not just limited to those. We want to facilitate for all of them."
- Between the fast news and discussion and "the slow-moving bedrock": should there be craft and artwork showcases, communities "like subreddits", event pages, wiki pages "alongside the idea that today is also being written", or a combination? Aksara could highlight works from a community.
- Voice posts, "kinda like Threads where people can post voice notes".
- What we do with the knowledge base beyond the map, the wiki and Aksara's lenses, especially since the juknis points at using the state's large cultural datasets.
- "We must not forget the academics and hard-science researchers in Papua, because they're a minority on every platform, even Earth." He wants "a different interaction primitive to get people thinking on research problems and providing answers quickly, like a survey but actually fun and tied to everyday problems", whether endless scrolling through the knowledge base and papers, daily research problems Aksara posts for people to poll, or a swipe left/right for knowledge, policy, gaps, people or words.
- On stories: "reposts, since everyone posting video would ruin my day."

**Decisions already made today**

- Aksara's default model on the Cloudflare path is Workers AI with Gemma 4. opencode's keyless models are not the resident's default (section 13).
- The business model with real numbers is the next working session (section 18).

## 3. What the competition asks for

The full technical guide (*Petunjuk Teknis BUDAYA GO! 2026*) was read on 17 November. What matters for us:

### 3.1 The background chapter reads like our brief

The juknis grounds the competition in the Kongres Kebudayaan Indonesia: the seven resolutions of KKI 2018 and the ten ideas (*gagasan*) of KKI 2023. Several of them describe Strata almost directly, and we should cite them in the proposal:

- **KKI 2023, idea 10:** Indonesia needs a cultural observatory that monitors and studies cultural change and helps shape policy with a holistic, cross-disciplinary approach. Strata is a knowledge observatory, built by and for the people being observed.
- **KKI 2023, idea 9:** masyarakat adat and other local communities are sovereign subjects over their land, natural resources and *sources of cultural knowledge*. This is the owner's "subjects should curate it back" argument, in the organiser's own framing.
- **KKI 2023, idea 7:** cultural meeting driven by *pe-lumbung-an* (commoning) and organic collective organising, sharing resources from sowing to harvest to storage. Strata is a digital lumbung.
- **KKI 2023, idea 8:** digital technology is needed to process the large cultural datasets the state already collects (PPKD, the culture index, Indonesiana), and AI should help renew heritage and support regeneration and the transfer of knowledge. The same idea worries about mental-health harm from screen culture, which our published ranking without engagement prediction answers directly.
- **KKI 2018, resolutions 3 and 4:** use cultural wealth to strengthen Indonesia's place in the world, and use the objects of cultural advancement to raise people's welfare. These anchor the business and Cultural Power sections.

Among the programme's stated goals: wider integration of and access to cultural data, and stronger cultural sovereignty in the digital era. Its mission puts communities as the main subject of cultural advancement.

### 3.2 Category and subtheme

We enter **Inovasi Digital**, subtheme **5: Platform Digital untuk Komunitas Budaya**. The juknis's own examples for this subtheme are community and sanggar management, activity and performance management, membership, and platforms for collaboration and cultural networks. Strata fits squarely.

### 3.3 Eligibility

- The product must exist and work by 31 March 2026, with verifiable evidence. For digital products, a release date on a website or app store, or other supporting proof that it was available and working.
- It need not be commercialised. Users, customers, sales or partners are welcome as extra evidence.
- The competition contact confirmed that repositories can be shared with judges as evidence of earlier forms of the idea. `docs/evidence/` holds the record.

### 3.4 How we are scored (Inovasi Digital)

| Criterion | Weight | What the juknis says it looks at |
| --- | --- | --- |
| Akar budaya (cultural roots) | 25% | Depth of reference to the values and objects of cultural advancement; accuracy and respect toward cultural sources |
| Kelayakan teknis dan implementasi | 25% | Fit between technology and purpose; readiness and function; system reliability; feasibility of implementation, development and maintenance |
| Model bisnis dan potensi komersialisasi | 20% | Clear users or market, value offered, cost and revenue scheme, sustainability; product readiness, market opportunity, marketing strategy, partnership potential |
| Kejelasan dan kualitas proposal | 30% | Clear problem, goals, solution, target users and benefits; completeness of data and supporting evidence; consistency between proposal and product; clear development plan and expected impact |

Selection (28 November to 2 December) uses these four criteria to pick finalists. The jury then ranks finalists at the showcase on the product, the presentation, the demonstration and the supporting evidence.

### 3.5 What we must hand in

- **The proposal**, in the template's order. Its sections include: product name (identical everywhere), problem, solution, cultural elements, novelty against comparable solutions, technology and method, technical implementation, a **mandatory Business Model Canvas** with real data where we have it, track record and validation, sustainability, **Cultural Power Indonesia in the world**, and a roadmap at 6–12 months, 1–2 years and 3–5 years with targets, resources, partners and indicators. The roadmap must separate commitments from plans.
- **A 3–5 minute showcase video** in six parts: introduction, demonstration, usefulness and benefit, uniqueness, evidence of use or testing, development potential.
- **A ten-slide deck** in a fixed order: background, problem, existing solutions and short/long-term plans, cultural elements, solution and how it works, target users, uniqueness, impact achieved and expected, actual product condition, business model and roadmap.
- Signed statements of participation, originality, and freedom from conflicts of interest and licence problems.

### 3.6 Rules that bind us

- The product name must be identical across the proposal, demo, video, slides and other documents.
- Code disclosure: we must show clearly which code we wrote and which existed before. Third-party and open-source code is allowed under its licence.
- Every design asset, digital content and cultural material must have a clear source and right of use.
- The honesty rule, quoted because it governs everything we write: "Jangan mencantumkan teknologi atau spesifikasi yang belum diterapkan seolah-olah sudah berfungsi."
- All data use must comply with UU 27/2022 on personal data protection.
- No SARA content, hate speech or negative content.
- Intellectual property stays with us. Large-scale implementation with the Ministry is negotiated separately, and finalists may continue through a cooperation agreement (PKS) with partners or users. The showcase is where finalists meet prospective strategic partners.

### 3.7 Dates

As shown on budayago.id on 17 November (registration was extended; the juknis PDF still shows the original dates):

| Date | Step |
| --- | --- |
| until 21 Nov | Registration |
| 24–25 Nov | Open lectures on the proposal (attendance required) |
| 26–27 Nov | Final proposal upload |
| 28 Nov – 2 Dec | Administrative and substantive selection |
| 4 Dec | 20 finalists announced (10 digital, 10 prototype) |
| 7–14 Dec | Finalist mentoring on the deck and showcase |
| 17 Dec | Finalists arrive in Jakarta |
| 18–19 Dec | Showcase and judging |
| 20 Dec | Winners announced |

All ten digital finalists are ranked and receive a prize, from Rp100 million for first to Rp15 million each for sixth to tenth. Making the final is the same as making the top ten.

The AT Protocol Spaces public beta opens on 1 December, after the proposal and before the showcase. That timing helps us: the proposal can say "tested in the lab", and the showcase can show it live.

## 4. The problem

### 4.1 Candidate problem statements

Pick one as the headline and use the others as supporting evidence. The first is the recommended headline.

1. **Yang hidup tidak tercatat, yang tercatat tidak hidup.** Culture lives in daily conversation, but the tools we have split talk from record. Social media keeps the talk and forgets it within a day. Encyclopedias and archives keep a record, but nobody talks there and the people described rarely write it.
2. **Tercecer.** Papuans already write every day: on small self-made news sites, in city Facebook groups with fifty members, in Instagram captions with fifty likes, in WhatsApp groups that never speak to each other. None of it is kept, none of it connects, none of it becomes a shared record.
3. **Ditulis tentang kita, bukan oleh kita.** Most published knowledge about Tanah Papua was written by outsiders and is held in journals, expensive books and museums abroad. The people it describes can rarely read it, and almost never answer it.
4. **Tidak ada ruang bersama.** Grassroots groups, churches, sanggar, schools and government offices have no shared public place to coordinate, so every effort starts from zero and every lesson is lost.
5. **Data kita di rumah orang lain.** Our conversations and cultural records live on platforms that can delete, bury or sell them, and communities have no say over their own data. The juknis names cultural sovereignty in the digital era as a goal, so this framing is welcome.

### 4.2 Evidence we already have

- **Language.** Badan Bahasa counts 718 regional languages in Indonesia, and about 428 of them in Tanah Papua, more than anywhere else in the country. Yet BPS data for 2024, as reported, puts Provinsi Papua second-lowest in the country for the share of people aged ten and over who actively use a regional language at home or with friends (13.84%), with Papua Barat Daya also near the bottom (17.56%). The most linguistically rich land in Indonesia is where daily use of those languages is thinnest. *(Check the BPS table directly before quoting the percentages.)*
- **Connectivity.** APJII's 2026 survey puts internet penetration at 81.72% nationally, but 69.74% for Maluku and Papua together, with Papua Tengah at 69.69% and Papua Pegunungan at 58.72%. Most users nationally (84.31%) are on a smartphone with mobile data. This is why we design for low bandwidth, print and WhatsApp.
- **Scattered and locked knowledge, from our own seed work.** The source catalogue for three regions (Mee Pago, Saireri, La Pago) holds 105 sources. 22 of them are archive-only, paywalled or library-only. Half state no licence at all. Ethnographies, mission records, archive collections and expedition reports sit beside theses and news investigations, spread across Leiden, Canberra, Jayapura and elsewhere.
- **Accuracy, also from our own seed work.** The verifier re-reads each source and keeps only sentences it finds word for word. Across the three regions it confirmed 586 sentences, rejected 5 and could not reach the source for 37. This is a number a judge can check, and it speaks directly to "accuracy and respect toward cultural sources".

### 4.3 Evidence to gather before 26 November

- **Who wrote the record.** Tag each catalogued source by whether an author is Papuan (where known). "N of 105 sources about these peoples were written by Papuans" is a strong, honest opening line.
- **A short survey of about 50 people** from the alpha and the owner's network. Ten questions: where do you write; where do you look for news about your kampung; how many WhatsApp groups are you in; have you ever found your own culture written down; would you correct it if you could. The juknis explicitly scores completeness of data and supporting evidence.
- **A screenshot audit** of ten Papuan city or regency Facebook groups: member counts, last post dates, how much is duka, jual-beli and lost-and-found. Concrete, a little painful, and true.
- **Usage numbers from the alpha**, counted honestly: people, posts by non-team members, replies, corrections, pages edited by someone from the region.

### 4.4 A scroll through Papuan Instagram

On 17 November the owner shared screenshots from his own feed. Not a sample, but a fair picture of the range, and each one is a Strata layer living somewhere it doesn't belong:

- **Percakapan and Karya:** a young musician from Fakfak releasing singles (about 130 likes); a Fakfak artist reprinting a 2021 projection piece that asks what development means for adat, sacred places and stories (about 120 likes); a Paniai football club's 2–2 draw.
- **Kabar and events:** a documentary screening and discussion in The Hague; a BBC documentary on Nemangkawi screened and discussed with the Amungme community at a reading space in Timika.
- **Kerja bersama:** a pocket book on free, prior and informed consent (PADIATAPA) for kampung, drafted in Google Docs.
- **Pengetahuan:** an archive library announcing a 510-page book on Mee religious and social history, on a story that disappears in a day.
- **Galleries with nowhere to live:** a Jayapura peer-listening initiative collecting artworks, writing and voice recordings for its gallery **by Gmail, with a Google Drive fallback**.
- **Tech already happening:** a Papua open-source group building a new-tab extension with Papua stories; a Papuan software studio launching a seminary e-library.
- Pacific identity posts and protest coverage sit right beside all of this.

Two uses: as the screenshot audit in section 4.3 (with permission, leaving out political posts), and as a list of **natural first partners**: the listening initiative, the open-source group, the software studio (a possible implementation partner for Aksara nodes), the archive library and the reading space.

## 5. The idea, and why it is new

### 5.1 Layers that settle

Strata describes a place and its people in layers, each moving at its own pace, as in Stewart Brand's pace layers (see `strata-model-2026-11-17.md`):

| Layer | Holds | Pace |
| --- | --- | --- |
| Percakapan | Posts, threads, art, writing, polls | Hours |
| Kabar | News and events, every publisher credited | Days |
| Kerja bersama | Public work, decisions, what institutions do | Weeks to months |
| Pengetahuan | Wiki pages, research, sources, the knowledge map | Years |
| Ingatan | Stories, languages, history, practice | Generations |
| Tempat | Land, water, terrain, living things | Deep time |

Communities and institutions are columns running through every layer. Aksara is the groundwater: it carries material between layers, and everything it moves carries its source. A news story becomes a proposed wiki change. A wiki fact rises as a post that asks members what they know. A member's account becomes a sourced variant on the page.

This is not a metaphor added afterwards. It is how the product works, and it is why the name Strata fits.

### 5.2 What exists already, and the gap

| | Fast layer (talk) | Slow layer (record) | Something that moves between them |
| --- | --- | --- | --- |
| Facebook groups, WhatsApp | Yes | No | No |
| Wikipedia | No | Yes, but published sources only | No |
| Mukurtu and museum portals | No | Yes, custodial | No |
| AI language apps (e.g. this year's language-archive entries) | No | An archive plus an AI tutor | No |
| **Strata** | **Yes** | **Yes** | **Aksara and the correction loop** |

Wikipedia's rule that facts need published sources is a known barrier for oral cultures. A Wikimedia-funded research project in 2011, *People are Knowledge*, tried oral citations in India and South Africa for exactly this reason, and met resistance from editors. Strata is built for oral testimony from the start: a teller's account sits beside the published record, attributed, and is never overwritten.

### 5.3 Full of content, empty of fake people

The owner's point about cold start is right, and the Strata model already has the honest wording: a new deployment is **full of content and empty of fake people**. Places, pages, news and sources are there on day one. Communities exist as names waiting to be opened, institutions as listings waiting to be claimed, places as pages waiting for their stories. Nothing pretends someone is there who is not.

Seeding is what makes a first visit worth it. Aksara's daily care (asking, linking, pruning, proposing) is what makes the second visit worth it.

### 5.4 Curating back (kurasi balik), and the copyright path

The moral case is strong, and the juknis supports it (KKI 2023, idea 9). The legal path needs care, because a museum's own photographs and catalogue text remain its copyright even when they describe us. The clean path, which the seed pipeline already follows:

- **Facts and short verified sentences.** UU 28/2014 on copyright, Article 41(b), excludes ideas, procedures, systems, methods, concepts, principles, findings and data from protection, even when they appear inside a protected work. We restate facts, quote briefly with attribution, and link to the holder.
- **CC and public-domain material**, with author and licence shown.
- **Catalogue entries, not copies,** for restricted material. The community's comments, corrections and stories attach to the entry, while the original stays with its holder.
- **Traditional cultural expressions.** UU 28/2014 also gives the state a role over ekspresi budaya tradisional. Worth a short legal check before we republish any performance, song or design at length.

Call this *kurasi balik*: source communities curating the record back. There is a respected precedent. The Reciprocal Research Network, co-developed by the Musqueam Indian Band, the Stó:lō Nation, the U'mista Cultural Society and the Museum of Anthropology at UBC, connects First Nations communities with collections held by museums around the world, so that originating communities, researchers and museum staff can study and discuss them together. Citing a precedent is stronger than saying the argument is subjective.

## 6. Who benefits, and how we will know

### 6.1 Who benefits

| Who | What changes for them |
| --- | --- |
| **Ordinary people of a place** | One place to talk about anything, find news about their kampung with sources, and read about their own land and peoples on the next tab. Their words are kept instead of scrolling away. |
| **Elders and knowledge holders** | Their accounts sit beside the published record, attributed to them and never silently edited. They can say "that is not how we tell it", and the page changes. |
| **Language communities** | Rooms where speakers talk to each other in their language, a dictionary and corpus they build and keep, and control over what becomes public. |
| **Young Papuans, at home and away** | A way back to their own history and language, and a stage for their writing, music and art, with open calls and showcases. |
| **Grassroots groups, churches, sanggar, schools** | A shared public place to announce, coordinate and keep a record of work, without building their own website. |
| **Local government and Dinas Kebudayaan** | A living, sourced picture of a regency's culture, usable as input for PPKD and cultural planning, and a channel to hear people directly. |
| **Academics and scientists in Papua** | A minority on every platform. A home with a thesis shelf, scholar labels, research questions answered by the people they concern, and findings that visibly come back (section 10). |
| **Researchers and museums** | A respectful way to return knowledge to source communities and hear back from them. |
| **Other peoples in Indonesia and beyond** | An open engine they can run for their own place, with their own stewards. |

### 6.2 Theory of change *(proposal)*

1. Seeding makes the first visit worthwhile, and the social layer makes people come back.
2. Coming back, people meet Aksara's questions about their own place. Answering is easy: *Benar*, *Ada yang salah*, *Saya tahu lebih*.
3. Answers become variants, corrections and new pages, attributed to the people who gave them.
4. Over months, the share of the record written by people of the region rises. That is the change we want to see.
5. Institutions arrive because people are there, and stay because the record is useful to them.

### 6.3 Indicators *(proposal)*

The juknis asks for success indicators per roadmap stage. These are the ones that measure the thesis rather than vanity:

- People active each week, and how many are not on the team.
- Share of wiki content written or reviewed by people of that region, per region.
- Corrections and variants accepted, and median time to acceptance.
- Communities opened by users (not by us), and how many are still active after a month.
- Language rooms opened, words and voice clips added, and how many entries each room chose to publish.
- Institutions that claimed their listing.
- Regencies with at least one page reviewed by someone from there.
- Aksara's record: share of its posts flagged as wrong, and its verified-sentence rate.

## 7. What we show: flagship features and the demo

The point of the demo is that this is **not social media with Wikipedia attached**. The hero is the person whose knowledge it is. Aksara plays a supporting role.

### 7.1 Flagships

1. **Cerita yang dijawab (a story that gets answered).** Aksara posts a sourced story from the region, with the sources folded underneath. A Mee member taps *Saya tahu lebih* and adds how their family tells it. It becomes an attributed *Versi lain* on the page. The bar showing whose voices the page rests on moves from outside sources toward people of the region. This one sequence is the whole thesis.
2. **A state-of-knowledge report per regency, in a shape fit for PPKD.** What is recorded about the regency, what is missing, and who wrote it. It meets KKI 2023's call for digital processing of PPKD data and for a cultural observatory, and it is policy-relevant without being political.
3. **Ruang bahasa, where speakers talk.** A speaker records a word, it goes into the room's living dictionary, and the room decides whether it ever becomes public. (See section 11.3 for how this differs from AI language apps.)
4. **A new region in one afternoon.** A recorded run of the operator's first setup for another place (Toraja, for example), on the Workers AI path. It answers "does this only work in Papua?" and supports both the technical and the business scores.
5. **Things to hold.** A printed A4 weekly bulletin with the elder's correction on it, and a WhatsApp share card on a phone. The showcase is in person; hand the judges paper.
6. **Laporan Denyut Budaya.** A monthly cultural pulse for one place, printed: what people talked about, made, corrected and asked. The cultural observatory in a form a Dinas can hold (section 9.2).
7. **Benar / Salah / Saya tahu lebih.** The review loop as a three-second swipe on a phone (section 10.3).

What appears only as one line or one screenshot: the knowledge map, AT accounts ("your account is yours and can move with you"), Studio, and the regional Aksara voices.

### 7.2 The walk

This follows section 2 of the showcase plan, which stays the build reference:

1. Open the live site on a phone, place set to Mee Pago. People's posts, and one Aksara card.
2. Aksara's story, two sources folded underneath, a question at the end. A member answers; the answer becomes a variant on the page.
3. Tap the region: its page with regencies, peoples, languages, news and open questions. Nabire shows both Mee Pago and Saireri, with who says which.
4. Tap Bahasa Mee: the public language page, then a demo room with consenting members, where a word and a voice clip enter the living dictionary.
5. Share a story card to WhatsApp.
6. Close on the printed bulletin with the elder's correction on it.

The Strata layers are the explanation slide after the walk, not before it.

### 7.3 Agents doing public work *(proposal)*

The agent gate exists today: enrolled agents with their own Ed25519 keys, five-minute scoped tokens, MCP access, a named human operator, bound to one community (`agent-entrance-2026-11-03.md`). So an outside harness, Claude Code included, can already do public work through it. The owner wants to show institutions' agents working in the open, and it can be shown.

Two cautions: the Aksara anti-goals include "bots talking to bots", and the showcase plan rules out agents replying to agents on stage. So the demo should show **institutions coordinating through agents, with people approving**:

> A demo sanggar's agent posts a Kerja publik item: "pentas budaya 20 Desember, butuh tempat". A demo church's agent proposes its hall. Each side's named human approves. Aksara links the item to the place page and the event. Every step shows its receipt. Both institutions are labelled as demo institutions.

That is the Aksara Node story in sixty seconds, without any hardware.

## 8. The last mile: what a people's daily life needs

The six layers cover talk, news, work, knowledge, memory and land. What is still thin is ordinary life: the reasons someone opens the app on a Tuesday. These are the additions we think matter most, grouped by what they serve. Everything here is roadmap unless marked otherwise, and each maps onto an existing layer or primitive so it adds post types and filters rather than new pages (the rule in `product-shape-2026-11-14.md`).

### 8.1 Life together

| Idea | Layer | Why it matters | Cost |
| --- | --- | --- | --- |
| **Kabar keluarga: duka, syukur, kelahiran, wisuda, pernikahan, orang hilang** | Percakapan → Ingatan | This is most of what moves through Papuan Facebook groups today. Culture as lived. The strongest reason to come back. | Small: a post type plus place scope; privacy defaults matter |
| **Bantu dan galang** (help with funeral costs, school fees, disaster relief; sharing flight seats, boat space and cargo between regencies) | Kerja bersama | Gotong royong as a feature. Link out to existing transfers; ETNOS never holds money. | Small to medium |
| **Kalender bersama** (events, church calendars, market days, the seasonal calendar) | Kabar, Tempat | Events already exist in the engine; this surfaces them by place and by week. | Small |
| **Titip cerita** (an elder tells, a grandchild posts, with consent; shown as "diceritakan oleh … ditulis oleh …") | Ingatan | Many elders have no smartphone. This brings them in without pretending they typed it. | Small |

### 8.2 Getting through the week

| Idea | Layer | Why it matters | Cost |
| --- | --- | --- | --- |
| **Peluang** (scholarships, jobs, grants, competitions, gathered by place) | Kabar | Huge pull for young Papuans, and plainly useful. Aksara can gather from credited sources. | Small to medium |
| **Layanan dekat sini** (nearby puskesmas, office hours, how to get a KTP) | Tempat, Kerja bersama | Practical civic information, and a bridge to Aksara's public-service story without politics. | Medium |
| **Harga hari ini** (a shared price board per regency) | Kerja bersama | Highland prices are a daily concern; a light, useful, apolitical way to participate. | Small |
| **Jadwal perintis dan kapal** (pioneer flights and ships, compiled from public sources) | Kabar, Tempat | In the highlands, getting there is half the battle. | Medium |
| **Siaga bencana** (official alerts by place) | Kabar | Safety, and trust. | Small |

### 8.3 Reaching people where they are

| Idea | Why it matters | Cost |
| --- | --- | --- |
| **WhatsApp and print bridge** (daily or weekly bulletin to WhatsApp channels; share cards; an A4 print edition) | Do not fight WhatsApp; flow into it. That is the honest last mile in Papua. Print reaches where data does not. | Small to medium |
| **Voice first and data-saver mode** (voice posts with community transcripts, text-only mode, compressed images, posts queued offline) | Most users are on mobile data; penetration in the highlands is the lowest in Indonesia. | Medium |
| **Papuan Malay interface** ("sa", "ko", "dong" as a language option) | People already post in Papuan Malay. Speaking their register is respect, not decoration. | Small (one strings file) |

### 8.4 Keeping it ours

| Idea | Why it matters | Cost |
| --- | --- | --- |
| **Family and marga archives as private Spaces** | A family's history held by the family, never public, never a registry of people. The most persuasive use of Spaces we can show. | Medium; after the Spaces beta |
| **Penjaga** (a steward programme drawn from active users across regions, with training, recognition and, where grants allow, a small honorarium) | Legitimacy and moderation capacity, and the owner's growth loop: stewards bring their people. | Small to start |
| **Pintu peneliti** (researchers register and ask the community for access; results come back to the community) | Puts CARE into practice and opens a fair revenue line (section 14). | Medium |
| **Monthly transparency note** (what was moderated, what Aksara did, what data left the platform) | Trust, and evidence for the proposal. | Small |

### 8.5 Learning and making

| Idea | Why it matters | Cost |
| --- | --- | --- |
| **Sekolah dan muatan lokal** (class communities; students interview elders with consent; stories enter Ingatan) | The new rules on local content (Permendikdasmen 22/2026) and regional languages as co-curricular work make schools natural partners. A content engine, an education partnership and a revenue line at once. | Medium |
| **Warta jemaat** (church bulletins as Kabar plus Kerja bersama) | Churches are among the largest institutions in Tanah Papua. A weekly bulletin is a habit already. | Small, via the organisation claim flow |
| **Seniman dan lagu** (artist pages that artists can claim; open calls; showcases that become zines) | Papuan music and writing are alive and under-recorded; open calls already exist in the model. | Small |

### 8.6 Small touches

- **Noken** as the name for saved collections instead of *Tersimpan*. The noken carries what you gather; it is also UNESCO-listed Papuan heritage. *(playful, optional)*
- A "word of the day" card from a language room that chose to publish it.
- Local names first everywhere, with the administrative name as the second line.

**If only two get built before the proposal:** Kabar keluarga (it is a post type plus place scope) and the Papuan Malay interface (it is a strings file). Both are cheap, both show daily life, and neither claims anything we cannot demonstrate.

### 8.7 Karya: art and craft between the fast layers and the bedrock

The owner asked whether showcases should be communities, event pages, wiki pages, or a mix. The answer is a mix, built from **one primitive**: *Karya*, a post kind for art, craft, music, writing and photography, with a flag for "this is my work" versus "sharing someone's work" so credit is always right. Everything else is a view of it:

| Where | What it is | Layer |
| --- | --- | --- |
| The feed | A credited Karya post | Percakapan |
| Scene communities (Seni Rupa Papua, Musik Jayapura, Noken dan Anyaman), like subreddits | Communities, which exist already | Percakapan |
| A **Galeri** tab on every community and place page | An automatic collection of Karya, not a new page type | Percakapan, Kabar |
| **Open calls and exhibitions** (a festival exhibition, a listening initiative's gallery) | An event plus a time-boxed collection with uploads, curated by stewards | Kabar, Kerja bersama |
| Artist, collective and scene pages | Wiki pages that artists can claim | Pengetahuan |
| **Hari ini juga sejarah** (today is history too) | Year pages per place gather that year's notable works and events | Ingatan |

Aksara's part is a weekly **Sorotan Karya** per community: it gathers what members appreciated or stewards picked, and never judges art quality on its own. A single post can climb every layer: the Fakfak projection piece in section 4.4 links an artists' collective, the city's anniversary, nutmeg (and the national Jalur Rempah programme), and open questions about development and sacred places.

### 8.8 Voice posts

Feasible, and about a week of work:

- **Recording** in the browser: Opus/WebM on Android Chrome, AAC/MP4 on Safari, so both are accepted.
- **Size:** at about 24 kbps, a two-minute note is around 360 KB, inside the existing 512 KB media cap. No new storage design is needed.
- **Strict validation** as with images: check the container, strip metadata, store a small waveform computed on the phone.
- **Transcripts:** Workers AI Whisper costs about 47 neurons per audio minute, so roughly 200 minutes a day fit in the free allocation (shared with Gemma). Whisper handles Indonesian and Papuan Malay, but not Mee or other Papuan languages. There, transcripts are written by the community ("bantu tulis"), which also grows the room's corpus.
- **Scope:** voice replies, a two-minute cap, reporting, and voice treated as personal data under UU PDP.
- **Demo:** an elder's voice answer becoming a *Versi lain* on the page.

### 8.9 Lessons from Nextdoor

Nextdoor rebuilt itself in July 2025 around three daily needs (Alerts, News and Faves) to become a daily utility rather than an app people open only when a cat goes missing. What to borrow and what to avoid:

- **Borrow:** official alerts on a place map (weather, outages, earthquakes, traffic). Ours is *Siaga* by place.
- **Borrow:** local news from credited publishers. Kabar already does this.
- **Borrow, translated:** *Faves*, a discovery hub of local businesses ranked by neighbours' trust, with requests routed to people who offer that service. Ours is **Andalan**: trusted carpenters, ojek drivers and mama-mama sellers, ranked by community trust, where a request ("butuh tukang") reaches the people who offer it. This is what makes Pasar useful beyond ads.
- **Avoid:** address verification. In Papua, it is a safety risk. Use chosen places and vouching ("dikenal oleh") instead.
- **Avoid:** advertiser audience targeting. It contradicts our rules on ads.
- **Learn from its worst failure:** crime and "suspicious person" posts became known for racial profiling. Papuans are profiled constantly, so *Siaga* covers weather, disasters and services, never "suspicious people".

## 9. Doing more with the knowledge: the state's data and ours

The knowledge base already shows up as a map, a wiki, and the material Aksara works with (lenses, stories, questions). The juknis asks for more: KKI 2023 wants digital processing of the cultural data the state already holds, and a cultural observatory. This section is how we answer that.

### 9.1 What the state has, and what it lacks

- The Ministry gathers its cultural data in **DAPOBUD** (Data Pokok Kebudayaan): objects of cultural advancement (OPK), heritage objects and sites (cagar budaya), and intangible heritage (WBTb). As of 1 September 2026, Daerah Istimewa Yogyakarta held the most WBTb in DAPOBUD, with 162.
- Back in 2020, the Directorate General of Culture itself noted that very little of the national heritage registers and collections was published.
- Regional open-data portals mostly publish **counts** (how many WBTb designated each year), not content.
- **PPKD** is built bottom-up under UU 5/2017: each regency's PPKD feeds its province's, which in turn feeds the national Strategi Kebudayaan. The law requires community involvement, through experts.

So the state has registries and counts, and Strata has living content and voices. Every flagship below joins the two.

### 9.2 Data flagships *(proposal)*

| Idea | What it does | Why it matters |
| --- | --- | --- |
| **Laporan Denyut Budaya** (monthly cultural pulse) | Per place, aggregated and privacy-safe: what is being talked about, new works, events, language-room activity, corrections accepted, gaps filled. Printed and online. | This *is* the cultural observatory of KKI 2023, idea 10. **Recommended demo hero:** hand the judges "Denyut Budaya Mee Pago, November 2026". |
| **PPKD yang bisa dijawab warga** (a PPKD residents can answer) | Load a regency's PPKD; each claim appears on the place page with "Apakah ini masih benar?". The output is a change list ready for the next revision. | Makes the law's community involvement real, and gives a Dinas Kebudayaan something it can use. |
| **Indeks vitalitas dari penutur** (a vitality index answered by speakers) | Official figures (Badan Bahasa, BPS regional-language use) beside community-reported transmission: "Do the children in your kampung still speak Mee?" | The sharpest contrast with archive-style language apps; living use, measured by the people living it. |
| **Berkas usulan WBTb** (a nomination dossier builder) | A community assembles its own nomination (description, practitioners who opt in, photos, video, history) in a private room, then exports it. | Turns the registry gap into a community-led route in. Compare Papua's DAPOBUD counts with Yogyakarta's 162 (check the Papua numbers first). |
| **Bantu ajukan dana** (help applying for funding) | Aksara drafts a sanggar's or community's Dana IndonesiaRaya application from that community's own record, for people to edit and submit. | Real practical value, and money flowing into communities without us selling anything. |
| **Pantau cagar budaya** (citizen heritage monitoring) | Registered heritage sites as a map layer, with condition reports, photos and stories from people nearby. | The protection pillar, done by residents. |
| **Data kembali, dengan izin** (open data back, with consent) | Data a community has approved goes out as open datasets or an API toward DAPOBUD and Satu Data. The community decides what goes, following the CARE principles. | A two-way pipe instead of extraction; a reason for government to partner. |
| **Jalur** (routes) | Koreri, mission history, trade and nutmeg routes, linked to the national Jalur Rempah programme. | A place's story told as a journey; good for schools and tourism. |
| **Paket muatan lokal** | Teaching materials generated only from *reviewed* pages. | Schools as partners and as a revenue line (section 14.3). |
| **Rekap tahunan and "hari ini dalam sejarah"** per place | Year pages made shareable. | Habit, pride, and the present entering the record. |

Not now: customary land mapping. It matters greatly, but it is land rights, and it needs a deliberate, consent-led design of its own.

Suggested ranking for the proposal: Denyut Budaya (demo hero), then PPKD and the vitality index (policy plus language), then funding help (sustainability). The rest go in the roadmap.

## 10. Ways to answer: card primitives for knowledge and research

The owner's ask: academics and hard-science researchers in Papua are "a minority on every platform, even Earth", and we want an interaction that gets people thinking about research problems and answering quickly, "like a survey but actually fun and tied to everyday problems".

### 10.1 One engine: Kartu and Tanggapan

Everything below is a single engine, not a dozen features:

- **Kartu (card):** a claim, word, gap, question, pair of options, archive photo, paper, or place. Every card carries its source.
- **Tanggapan (response):** a swipe, a tap, a guess, a short text, a voice note. Every response is attributed, counted, and lands somewhere in the record.

*Satu kartu, banyak cara menjawab.* One card, many ways to answer. A card shown to a thousand people becomes a dataset; a dataset with a story becomes a wiki page.

### 10.2 Rules for every primitive

1. **Ten seconds or less.** If an answer takes longer, it is a post, not a card.
2. **Every answer goes somewhere.** It changes a review status, fills a gap, adds a variant, ranks a priority, or adds a data point, and the person sees what changed ("jawabanmu menambah …").
3. **Totals only.** Results show aggregates, never who chose what (the existing poll rule).
4. **Finite decks.** Swipe decks end ("Selesai untuk hari ini"). No streak punishment and no engagement prediction. Reading (Gali, below) can go on as long as someone wants.
5. **People of the place carry weight on cultural claims,** without silencing others. A claim never changes status from swipes alone; a threshold triggers steward review.
6. **Never swipe on people,** and keep politics out of binary decks (10.4).

### 10.3 The primitives

**Reading**

- **Gali (dig).** The endless scroll, done the Strata way: scrolling down goes *deeper in time*. The top is today's talk and news. Below that come wiki facts, then papers, archive photos and old maps, then oral history, then land and deep time. Each card shows its layer. The geological metaphor becomes the navigation. *(signature primitive)*
- **Cerita as reposts, not uploads.** A daily story ring per place made of reposted cards with a one-line take ("ini terjadi di kampung saya") and a sticker: *Benar*, *Saya tahu lebih*, *Pertanyaan*. Aksara's five cards of the day open the ring. No original video uploads; people can still link videos. This avoids the cost and moderation load of video.
- **Baca bareng** (paper club). A weekly paper chosen by vote, a plain-language card that Aksara writes from the abstract only, cited, and a thread. Monthly **Tanya Ilmuwan**: a scientist answers questions.

**Swiping**

- **Benar / Salah / Saya tahu lebih.** Claims from seeded pages: swipe right for true, left for wrong, up to open a text or voice answer. Review becomes a three-second act, and it feeds the flagship loop directly (section 7.1).
- **Kata.** In a language room: "Do you know this word?", then "Is it still used?", then "Say it" (record). People teach the dictionary, instead of the app teaching people. Each answer is a vitality data point for that word.
- **Celah** (gaps). Open gaps and research problems: right for "important", left for "not for us", up for "I can help". It builds a research and documentation agenda per place.

**Choosing and guessing**

- **Pilih satu** (pairwise wiki survey). "Which matters more for your kampung: clean water or phone signal?" People can add their own options. Pairwise choices produce a ranked list that is statistically sound and genuinely fun. The method is established: the *All Our Ideas* wiki surveys (Salganik and Levy, 2015). Use it for research priorities, programme priorities and gap priorities.
- **Tebak dulu** (guess first). "What share of children in Paniai still speak Mee?" Guess, then see the official figure and the community's answers side by side. Or draw the curve, then see the real one (the *You Draw It* format). Data literacy using the state's own data.
- **Ramal** (forecast). Questions that resolve later: "Will the price of pinang go up next month?" Aggregate forecasts and show who was well calibrated over time. Collective intelligence at local scale; no money involved.

**Daily**

- **Soal Hari Ini** (today's problem). One real open question per place per day, posted by Aksara or a researcher: "When did Lake Paniai last flood?", "What does cement cost in Enarotali this week?", "What is this bird called in Mee?". A shareable result card, like Wordle, and every answer is a data point. No streaks.

**Archives and the field**

- **Ini di mana?** (where is this?). Public-domain archive photos: guess the place, the year, the object. It enriches archive metadata and is a natural paid service for museums under kurasi balik (section 14.3). Never human remains or sacred items. People in photos are identified only by kin, privately.
- **Amati** (observe). A photo of a bird, plant, river level or fruiting tree, with place and date. Biodiversity records (compatible with iNaturalist-style data) and the seasonal calendar, built by residents. Hard science that schools can join.
- **Lab kampung.** Coordinated simple measurements (bottle rain gauges, water test strips), run by schools, with results on the place page.

**Connecting**

- **Rantai** (link). "How are X and Y connected?" People draw an edge between two knowledge items and justify it in a sentence. The knowledge map grows by hand, with reasons.
- **Isi yang kosong** (fill the blank). A wiki sentence with a gap ("Dalam adat Mee, mas kawin terdiri dari ___"). Different answers become variants, each attributed.
- **Dua sumber, satu pertanyaan.** Two sources disagree; which do you trust, and why? It helps resolve contested places and claims.

**For academics and researchers**

- **Rak Skripsi Papua** (a thesis shelf). Theses by Papuan students, with community and scholar feedback, entering the record as sources. Theses already appear among our seed sources.
- **Peneliti bertanya** (researchers ask). A researcher posts a micro-instrument (one to three questions) with an ethics note and consent. Results come back to the community as a summary card.
- **Kembali ke kampung** (return rate). Each researcher's page shows whether their findings came back to the community, and when. Research that only takes becomes visible; research that returns earns trust.
- **Peneliti label.** Researchers can link a verified scholarly identity (ORCID) to their account, so academics can find each other on the platform.
- **Pintu peneliti** and **bounties** for open problems ("dataset needed", "translation needed"), funded by grants, as in section 8.4.

**Collecting**

- **Noken.** The cards you verified, the words you taught, the gaps you filled, collected in your noken: a personal record of contribution that a student can show on a scholarship application ("I added 40 Mee words and 12 reviewed facts").

### 10.4 What we would not build

- **Swiping on people.** It reads as dating, invites profiling and harassment, and is unsafe in Papua. Match people to *tasks* instead: swipe on open public work, with mutual opt-in.
- **Binary like/dislike on public policy.** It flattens nuance and becomes a flashpoint. Use *Pilih satu* for priorities and "dampaknya ke saya" (how it affects me) for impact reporting, both aggregated, and keep them out of the submission.
- **Original video uploads** (for now). Reposts and links do the job.

### 10.5 Cost and order

The Kartu and Tanggapan engine plus three decks (*Benar/Salah*, *Kata*, *Soal Hari Ini*) is about a week of work on top of existing polls and wiki review. Gali is a view over existing pages, a few days more. For the competition, *Benar / Salah / Saya tahu lebih* is the one to show, because it is the flagship loop in three seconds. Everything else is roadmap.

## 11. Names and positioning

### 11.1 One product name

The juknis requires one product name across the proposal, demo, video and slides. The owner's call: **Strata** is the product; **ETNOS** is our own deployment of it, the first place where Strata runs. That works if the live site says so plainly, for example "ETNOS · dijalankan dengan Strata" in the header or footer and on the *Tentang* page, and the proposal's title reads something like:

> **STRATA: Lumbung digital tempat masyarakat bercakap, bekerja dan mencatat budayanya sendiri.** Penerapan pertama: ETNOS di Tanah Papua.

Whatever name went into the registration form is the one that must appear everywhere.

### 11.2 The word "Aksara"

In a culture competition, *aksara* first means a script (Aksara Jawa, Lontara). This year's public entries already include names built on it. A judge may hear "Aksara" as a writing-system feature. Introduce it once as *Aksara, asisten penjaga ETNOS* and keep the explanation in the same sentence every time.

### 11.3 Language rooms, and the language-archive entries this year

At least one strong entry this year is an AI platform for documenting and teaching regional languages and oral traditions (section 16). The difference between us and that kind of product should be stated plainly and kindly:

- **Bahasa tidak punah karena kurang arsip; bahasa punah karena berhenti dipakai bersama.** Languages don't die for lack of archives; they die when people stop using them together.
- **Ruang bahasa: tempat penutur bicara, bukan mesin yang bicara untuk penutur.** A place where speakers talk to each other, not a machine that talks for them.
- **Custody, not extraction.** The room's dictionary and corpus belong to the room, live on its members' own storage, and are never sold. What becomes public is the room's choice.
- **Depth before breadth.** One language with real speakers first, then the next language when its speakers ask.

And the positioning choice: **do not lead with language.** That kind of entry sits in subtheme 4 (education); we are in subtheme 5 (community platforms). Lead with the lumbung and observatory, and show language rooms as one column inside it. Leading with language would invite a head-to-head comparison we do not need.

### 11.4 Lines worth keeping

- *Yang hidup tidak tercatat, yang tercatat tidak hidup.*
- *Penuh isi, tanpa orang palsu.* Full of content, empty of fake people.
- *Kesaksian bertanda tangan.* Testimony signed by the teller's own key (section 12).
- *Akunmu milikmu. Data komunitas di server komunitas. Aplikasinya bisa diganti, datanya tetap.*
- *Platform bukan pemilik cerita. Ia lumbungnya.* The platform does not own the stories; it is the granary.

## 12. Why AT Protocol

### 12.1 The owner's answer, sharpened

The owner's version is right in spirit. "ActivityPub risks centralisation" is a little fuzzy, though, and judges won't parse protocol vocabulary. The precise argument:

> In ActivityPub (Lemmy, Mastodon, PieFed), a person's identity, their data and the app all belong to whoever runs the server. If that server closes or turns against its members, the accounts and posts go with it. AT Protocol separates the three: **identity** (a DID and a handle on a domain), **data** (a signed repository on a host the person or community chooses), and **the app** (Strata is one reader of that data among many). If ETNOS disappeared tomorrow, people would keep their identities and their data, and another app could read them.
>
> Spaces, the protocol's new primitive for non-public data, extends the same separation to communities: a group can keep its private material under its own access rules while still taking part in the wider network.

**For judges, three plain promises:**

1. **Akunmu milikmu.** Your name can sit on your community's own domain, and you can move hosts without losing anything.
2. **Data komunitas di server komunitas.** A host on an Aksara node can sit in Papua, which also helps with UU PDP.
3. **Aplikasinya bisa diganti, datanya tetap.** If the app goes, the data stays.

### 12.2 The steelman

Protocol features that fit cultural work unusually well:

- **Signed repositories: testimony that authenticates itself.** Every record is signed by its author's key, so an elder's variant can be verified as theirs, and no platform (ours included) can quietly alter it. *Kesaksian bertanda tangan.* For a project about who gets to speak, this is the quiet killer feature.
- **Labelers: customary protocols as infrastructure.** A community can run its own labeler that publishes labels such as "Jangan disebarkan" or Local Contexts notices, and any app that subscribes can honour them. Customary protocol stops being a policy page and becomes part of the network.
- **Lexicons: shared schemas.** Records follow published schemas, so other apps can build on the same data. A language-learning app could read a room's published dictionary, with the room's consent.
- **Custom feeds:** communities can run their own ranking, published and accountable.
- **Spaces:** non-public data with explicit access control, keeping portable identity and interoperability. Members' records stay with them rather than in the platform's database.
- **Governance is moving outward.** The PLC identity directory, long operated by Bluesky, now has an independent Swiss association set up to run it. Bluesky has said major changes to public data sync are expected to go through the IETF standards process. Anyone can run every piece of the stack, including us, in Indonesia.
- **Precedents for community infrastructure exist.** Blacksky runs its own relay and AppView for its community. Coves, a forum project on AT, gives every community its own DID and repository so that a community can move between hosts.

### 12.3 What we say before a technical judge says it for us

- **Spaces is access control, not encryption.** Anyone with access to a space can read it, including the apps it grants. It is in public beta from 1 December; the protocol and SDKs can still change.
- **The PLC directory is still one directory**, now run by an independent association. Its logs are self-certifying, and it can be mirrored, but it is a dependency.
- **Public AT data is truly public.** Deletion propagates, but copies made in the meantime cannot be recalled. Cultural material defaults to private or local; nothing sacred is ever published to the network.
- **What is live today:** AT sign-in and identity. ETNOS keeps posts in its own store, and public AT publishing is off. "People own their data" is therefore a roadmap claim, and the proposal must say so in exactly those words (section 3.6).
- **Running a full AppView over the whole network is expensive.** We don't need to: a Strata deployment indexes only its own schemas and scopes.

### 12.4 How federation works here (the Lemmy mindset, translated)

- **One identity across deployments: already native.** Any Strata deployment accepts AT OAuth, so the same account signs into ETNOS and into a deployment in Kalimantan.
- **Shared content works differently from Lemmy.** In Lemmy, servers push posts to each other. In AT, people write records to their own repositories, relays gather them into a stream, and each app (AppView) indexes the records it cares about. A host does not "take in" the stream; apps do. So a Strata deployment is an AppView: it subscribes to records of Strata's schemas, filtered by its places and communities. Federation happens through shared data rather than server-to-server messages.
- **Give each community its own DID** *(proposal)*. Then a community, not just a person, can move between deployments, and its public record travels with it. Coves does this today.
- **Reaching the fediverse later:** Bridgy Fed already bridges public AT posts to ActivityPub. We do not need to write our own adapter.
- **Name our schemas carefully** *(proposal)*. Schema names (NSIDs) are permanent once records exist. Put them under the engine's domain (Strata or Abstraksi), not under `etnos`, so other deployments are first-class.

## 13. Models for Aksara and for seeding

Decided on 17 November, after reading opencode's source (`research/opencode-keyless-seeding-2026-11-17.md`):

- **Aksara, the resident, defaults to Workers AI with Gemma 4** (`@cf/google/gemma-4-26b-a4b-it`) on the Cloudflare path, with "bring your own key" as the upgrade. The model has a 256K context, tool calling and structured output. The free allocation is 10,000 neurons a day; at about 9,091 neurons per million input tokens and 27,273 per million output tokens, a source-bound page of roughly 3,000 tokens in and 600 out costs about 44 neurons, so on the order of 200 pages a day for free. That holds only with reasoning turned off, since thinking tokens bill as output. *To confirm: one live call on a Free account to make sure the model is not paid-only.*
- **opencode is not the resident's default**, for three reasons:
  1. **Architecture.** The resident runs inside a Durable Object, and its model port is a chat-completions route through ResidentAuthority. opencode cannot run in a Worker, and it is a whole coding agent, not a model endpoint.
  2. **Terms.** opencode's terms limit use to the user's own internal use, not on behalf of third parties, and forbid processes that run while logged out. A resident answering community members is third-party use by definition.
  3. **Capacity.** The free models share one per-client limit, so they can all fail at once (as observed by dusk bot on 14 November), and free model IDs retire without notice.
- **opencode stays possible for seeding**: an opt-in "No key? Start free" choice in the laptop or VPS first run, supervised, public data only, with the binary deleted once a key is saved. We will ask the maintainers whether first-run seeding for self-hosted community platforms is acceptable use, without waiting on the answer.
- **On stage:** *Berjalan di paket gratis Cloudflare dengan Gemma 4; data tidak dipakai untuk melatih model.* A clean, checkable line for the feasibility score.
- **Whatever the model:** it only rephrases sentences from sources it actually fetched, and the existing verification gates decide what goes live. That is what lets us say "the platform helps curate the wiki" and stand behind it.

## 14. Business and sustainability

### 14.1 What judges mean

The owner's reading is right: the question is whether this can keep running and be funded, rather than being a landing page for one people. The juknis makes it concrete: a mandatory Business Model Canvas, real data where we have it, partners, and a roadmap that separates commitments from plans.

### 14.2 Marketplace, badges, business pages and ads

These are good, but they are a cultural-economy feature, not the engine that pays for the platform. Commerce volume in Papua will not fund a platform for years.

- **Offers and requests are live already.** Keep them free for individuals and craftspeople.
- **"Ada tawaran" profile badge:** yes. It is cheap and useful.
- **Business pages:** don't build them separately. They are the organisation claim flow with kind = *usaha*.
- **Ads:** the Pasar already designed per place covers this. A flat fee for a shop profile and a disclosed, rotating slot inside Pasar only. Nothing paid in conversation or knowledge, and no targeting from polls, politics or private data (`product-shape-2026-11-14.md`). A separate "ads community" would just be Pasar under another name.
- In the BMC, these appear as **value for users and for the cultural economy**, not as the main revenue.

### 14.3 Where sustainable money can come from *(proposal; numbers next session)*

1. **Government: a regency cultural observatory as a service.** Strata, plus an Aksara node where wanted, plus the state-of-knowledge report as PPKD input. This answers KKI 2023 ideas 8 and 10 (PPKD data and the cultural observatory), and the buyer is a Dinas Kebudayaan or Bappeda.
2. **Managed deployments for other peoples and organisations:** customary councils, AMAN chapters, church synods, diaspora associations, other regions. Paid setup, hosting and maintenance; the engine stays open.
3. **Schools and muatan lokal:** class communities and elder-interview projects as a supported package for regencies that set regional language and culture as local content.
4. **Kurasi balik with institutions:** museums and universities paying for structured community review of their holdings, with results returned to the community.
5. **Research access through Pintu peneliti:** fees for supported, consented research access, part of which goes back to the community.
6. **Grants:** Dana IndonesiaRaya (the Ministry's culture endowment programme, renamed from Dana Indonesiana in April 2026 and run with LPDP; about Rp500 billion set aside for 2026, with schemes for community facilitation and media production), plus international digital-heritage and open-infrastructure funds.
7. **Pasar fees**, small and honest.

### 14.4 Letters: what they are for

Not funding. The juknis treats partners, adoption and cooperation as additional evidence, has a proposal section for partners and proof of cooperation, describes the showcase as the place to meet strategic partners, and expects selected products to continue through a PKS. A letter is **proof of adoption and a path to a PKS**. In priority order:

1. A community or organisation that actually uses ETNOS (adoption).
2. Universitas Cenderawasih as a research partner, through the owner's network there.
3. A Dinas Kebudayaan, Bappeda or church synod stating interest in a pilot (a future buyer).

### 14.5 To do next session

The business model with numbers: the full BMC, cost per deployment (Workers Paid at $5 a month, storage, model use, the official PDS on a small server), setup and hosting prices per kind of customer, the observatory price for a regency, and a three-year projection marked plainly as assumptions.

## 15. Risks, gaps and compliance

### 15.1 Compliance we have not written down yet

- **PSE registration.** Every private electronic system operator serving users in Indonesia must register (Permenkominfo 5/2020, under PP 71/2019). Komdigi enforces it: Wikipedia's operator was given a final deadline in April 2026, and several services were warned with access blocking in September. ETNOS should register, or the proposal should state when it will. *Check the registration route for a small operator through OSS.*
- **PP Tunas (PP 17/2025), in force since 28 March 2026.** It applies to every electronic system that minors may use, not only large social networks. The core duties named by Komdigi: publish the minimum user age, have a way to verify children's ages, and have a way to report misuse or harm to children, plus a self-assessed risk profile. ETNOS needs at least a stated minimum age, a reporting path and a plan for age assurance. *Decide the minimum age; read the derived regulations.*
- **UU PDP (UU 27/2022).** A privacy notice, a record of what we process and why, consent where it is the basis, and a contact for data requests. Surveys and language rooms need particular care.
- **Takedown obligations** under the PSE rules, which set response windows for unlawful content. Our moderation process must be able to meet them.

### 15.2 Safety

- **Hoaxes and misinformation.** The information environment around Papua is fraught. *Perlu dicek*, sources on every Aksara post and the correction loop are our answer; say so.
- **Harassment and doxxing,** especially of women, activists and elders. Moderation, private membership lists and blocking already exist; the steward programme adds people.
- **Network disruptions.** Print, WhatsApp and offline queueing are resilience, not nostalgia.
- **Sacred material:** *Jangan disebarkan*, no human-remains images, catalogue-only for restricted items (already decided).

### 15.3 Product and operations

- **Breadth.** The owner calls it an everything burger, and judges may agree. The answer is the one-sentence case, the layers as the explanation, and a strict *Berjalan / Diuji / Rencana* table in the proposal.
- **Who keeps it running.** A small team, with heavy use of AI coding assistants, built the current engine. The answer: Abstraksi maintains it, hiring is planned, and stewards come from active users. Put names of roles and a maintenance plan in the deck.
- **Key custody.** Who besides the owner holds identity keys and backups is still an open question in the showcase plan.
- **Code disclosure.** One clean table: the Cirrus fork, the Photon and Honai donors, PieFed-inspired behaviour, and what is original.

### 15.4 Politics in the submission

The platform hosts every kind of conversation, politics included, because culture is not separate from public life. The submission is about culture, and the judged material shows what is built and cultural. Elections, budgets and surveys stay live on the platform under the aggregation rules in the showcase plan, and are not featured in the proposal or the demo walk.

## 16. The field: last year's winners and this year's entries

### 16.1 BUDAYA GO! 2025

- 627 valid submissions: 391 student teams and 236 professional teams. 68% were web apps and 41% used AI.
- Professional winners included Nusaheritage.id, AIN E-MBAT Gamelan Tuner and PANTUNESIA DEV. Within days of the showcase, the Riau Islands provincial administration launched the AI-based Pantunesia programme.
- Pantunesia's own site shows its lineage: physical pantun cards (2018–2021), an interactive presentation (2022), then the app (2025 onward). One idea carried through three forms. It shows that the form may change while the idea stays the same. Our version is the same shape: the 2022 Papuan magazine drive, the 2025 ETNOS forums, then the commons and Aksara.
- The pattern among winners: one recognisable cultural object, a demo that lands in thirty seconds, and, in Pantunesia's case, a government that picked it up.
- At the 2025 showcase, the Deputy Minister of Culture said AI should help people preserve and develop culture rather than replace human cultural experts. That is our thesis.

### 16.2 Public repositories that mention BUDAYA GO! 2026

A small and skewed sample, since many teams keep their code private. Read on 17 November:

| Entry | What it is |
| --- | --- |
| A language and oral-tradition archive with an AI tutor | A progressive web app on Cloudflare: a map of regional languages, a recording studio with automatic transcription, learning modules, an AI conversation tutor in regional languages, an oral-tradition archive. Subtheme 4. |
| An AI batik motif recogniser | Identifies batik motifs from a photo. |
| A marketplace and planner for Bugis-Makassar adat weddings | Subtheme 2. |
| A BISINDO sign-language alphabet recogniser | Local-first, with Indonesian and Javanese learning. |
| A 3D wayang exhibition with Aksara Jawa | Svelte and Three.js. |
| A Mandar–Indonesian digital dictionary | Possibly a returning entry. |
| A Sulawesi Barat culture-knowledge entry | Empty at the time of reading; its own eligibility audit lists the 31 March rule as a blocker. |

What we take from this:

- **Most entries are single-purpose apps with a clear thirty-second demo.** Legibility is the bar to meet.
- **Many repositories were created in November 2026,** so the 31 March rule will likely narrow the field.
- **AI-assisted writing is everywhere now.** Polished documents no longer signal effort; real use and real community do.
- **The language-archive entry is the closest to us, and it is well packaged.** Its submission package follows the juknis point by point: a 4-minute video covering all six parts, and ten slides in the required order. We should match that discipline. Where we differ is substance: sourced content rather than unsourced seed text, speakers rather than an AI speaking for them, custody rather than corpus sales, and one community with real people rather than many languages without a visible speaker community yet. Section 9.3 says how to put this kindly.

## 17. A judge's reading of our entry

Written as a judge might see it, so we can fix what we can before they do.

**Strengths**

- Deep cultural roots: a Mee founder and a culture lead, Papuan sources, local terms, sacred-material safeguards, sourced and contested place claims.
- A real, live product with a real alpha, far beyond the median entry in technical depth, with receipts and tests.
- A thesis that matches the KKI 2023 ideas the juknis itself cites (observatory, sovereignty over cultural knowledge, commoning) and the Deputy Minister's view of AI.
- A rare region in a national competition, with a credible path to every other region through the open engine.
- A checkable accuracy number from the verifier.

**What could cost us**

- Breadth that reads as sprawl in a five-minute slot.
- Claims about data ownership that are roadmap rather than live (section 12.3), if not labelled.
- An unfamiliar protocol story told in jargon.
- A business model without a named buyer or numbers.
- Seeded pages about regions with no reviewer yet, if the review status is not shown proudly.
- Compliance gaps (PSE, PP Tunas) a careful curator might ask about.

**What would move the score most, in order**

1. Real usage numbers and the evidence in section 4.3.
2. One adoption letter (section 14.4).
3. A proposal, video and deck that follow the juknis structure exactly, with one product name.
4. A strict *Berjalan / Diuji / Rencana* table running through the proposal.
5. The cerita-yang-dijawab sequence working live, with a real elder's correction.

## 18. Open questions and next steps

**Next working session**

- The business model with numbers (section 14.5).

**Before the proposal upload on 26–27 November**

- Gather the evidence in section 4.3 (authorship tags, survey, screenshot audit, alpha numbers).
- Ask for the letters in section 14.4.
- Confirm Gemma 4 on Workers Free with one live call.
- Decide the minimum age and the reporting path (PP Tunas); start PSE registration or state the plan.
- Put "ETNOS · dijalankan dengan Strata" on the site, and check the name used in the registration form.
- Write the code-disclosure table.
- Optional, cheap, and visible: Kabar keluarga as a post type; a Papuan Malay interface option.

**Cheap builds that strengthen the story** *(proposal)*

- *Benar / Salah / Saya tahu lebih* as a swipe deck on top of wiki review (section 10).
- Voice replies, capped at two minutes (section 8.8).
- *Karya* as a post kind, plus a Galeri tab (section 8.7).
- One printed *Laporan Denyut Budaya* for Mee Pago (section 9.2).
- First conversations with the partners named in section 4.4.

**Before the showcase on 18–19 December**

- Spaces live on a test community after 1 December.
- The agents-doing-public-work demo with two clearly labelled demo institutions.
- The printed bulletin.
- A recorded "new region in one afternoon" run.

**Still open from the showcase plan**

- Who besides the owner answers *Jangan disebarkan*, and how fast.
- Who besides the owner holds identity keys and backups.
- Whether every private room says that the operator can technically read it until Spaces arrives.

**Questions this document raises**

- Should the schemas (NSIDs) be named under Strata or Abstraksi before anything is published?
- Should each community get its own DID from the start?
- Which school or church could be the first institutional partner?

## 19. Sources

Read on 17 November 2026.

**Competition**

- BUDAYA GO! 2026 site and guide: <https://budayago.id>, <https://budayago.id/panduan>, 2025 results summary <https://budayago.id/hasil-2025>
- *Petunjuk Teknis BUDAYA GO! 2026* (PDF linked from the official site; a copy is in a public competitor repository at `upload/` of <https://github.com/hyperchainpro/Warisan-Suara>)
- Rules and criteria summary: <https://www.ajanglomba.com/2026/10/lomba-inovasi-budaya-go-kemenbud-2026.html>
- 2025 winners: <https://voi.id/en/amp/541018>; Pantunesia launch: <https://www.thejakartapost.com/indonesia/2025/12/22/riau-islands-launches-ai-based-pantunesia-to-strengthen-malay-culture-conservation>; Pantunesia site: <https://pantunesia.id>

**Problem evidence**

- Languages in Tanah Papua (Badan Bahasa figures as reported): <https://papua.antaranews.com/berita/730961/balai-bahasa-papua-dan-pemkab-jayapura-tingkatkan-bahasa-sentani>, <https://www.gebrak.id/?p=59725>
- Regional-language use by province, BPS 2024 as reported: <https://goodstats.id/article/10-provinsi-dengan-penggunaan-bahasa-daerah-terendah-OJWTR>
- APJII 2026 internet survey: <https://data.goodstats.id/statistic/10-provinsi-dengan-tingkat-penetrasi-internet-terendah-2026-kqUoA>, <https://teknologi.bisnis.com/read/20260522/101/1975680/penetrasi-internet-indonesia-2026-tembus-2352-juta-jiwa-laju-pertumbuhan-melambat>, <https://www.indotelko.com/read/1782017170/sempit-di-kualitas-dan-pemanfaatan>
- Our own seed: `seed/sources/*.json` (105 sources) and `seed/wiki/*.verify.json` (586 kept, 5 rejected, 37 unreachable)

**Knowledge, precedent and law**

- Oral citations on Wikipedia: <https://meta.wikimedia.org/wiki/Research:Oral_Citations>
- Reciprocal Research Network: <https://rrnpilot.org>, <https://www.rrncommunity.org/help/faqs>
- UU 28/2014, Article 41(b), as quoted in Constitutional Court case 276/PUU-XXIII/2025: <https://pasal.id/peraturan/putusan-mk/puu-mk-276-2025>

**AT Protocol**

- Spaces alpha: <https://atproto.com/blog/atproto-spaces-alpha>; public beta: <https://atproto.com/blog/getting-ready-for-the-spaces-public-beta>
- Spring 2026 roadmap (IETF): <https://atproto.com/blog/2026-spring-roadmap>
- Independent PLC organisation: <https://docs.bsky.app/blog/plc-directory-org>, <https://docs.bsky.app/blog/protocol-checkin-fall-2025>
- Blacksky AppView: <https://feedbagel.com/post/blackskys-fork-of-bluesky-at-protocol-with-appview-performance-optimizations-and>; Coves communities with their own DIDs: <https://tangled.org/bretton.dev/coves/blob/main/docs/PRD_COMMUNITIES.md>
- Access control, not encryption (discussion): <https://zeli.app/story/49379732>

**Models**

- Gemma 4 on Workers AI: <https://developers.cloudflare.com/changelog/post/2026-04-04-gemma-4-26b-a4b-workers-ai>; rates <https://agentdeals.dev/go/cloudflare-workers-ai>; free allocation <https://free-llm.com/models/cloudflare-workers-ai/gemma-4-26b-a4b>
- opencode research: `research/opencode-keyless-seeding-2026-11-17.md`

**Funding and compliance**

- Dana IndonesiaRaya: <https://infopublik.id/kategori/nasional-sosial-budaya/964507/dana-indonesiaraya-diluncurkan-pemerintah-perluas-akses-pendanaan-kebudayaan>, <https://wartaekonomi.co.id/read606650/kemenbud-salurkan-rp500-miliar-lewat-dana-indonesiaraya-2026-untuk-perluas-akses-budaya>, <https://www.gebrak.id/?p=3984>
- PSE registration enforcement: <https://teknologi.bisnis.com/read/20260415/101/1966868/komdigi-beri-tenggat-7-hari-bagi-wikimedia-untuk-daftar-pse-sanksi-blokir-menanti>, <https://inet.detik.com/law-and-policy/d-8556636/komdigi-siap-blokir-akses-25-pse-abai-strava-sampai-qatar-airways/amp>
- PP Tunas: <https://teknologi.bisnis.com/read/20260505/101/1971394/10-kewajiban-platform-dalam-pp-tunas-yang-perlu-diketahui-pse>, <https://teknologi.bisnis.com/read/20260507/84/1972189/lindungi-anak-dari-risiko-transaksi-e-commerce-wajib-patuhi-pp-tunas>, <https://teknologi.bisnis.com/read/20260329/101/1962838/jalan-berliku-pp-tunas-perlindungan-anak-di-dunia-maya-butuh-dukungan/2>
- Local content rules: <https://www.komunitasbelajar.id/2026/09/permendikdasmen-nomor-22-tahun-2026.html>; regional languages as co-curricular: <https://www.detik.com/edu/sekolah/d-7933623/menteri-muti-bahasa-daerah-jadi-bagian-kokurikuler-dan-hidden-curriculum-di-sekolah>

**Daily-life, data and interaction research** (read the same evening)

- Nextdoor redesign: <https://www.businesswire.com/news/home/20250715416819/en>, <https://techcrunch.com/2025/07/15/nextdoor-redesigns-app-with-ai-recommendations-local-news-and-real-time-emergency-alerts>, <https://blog.nextdoor.com/whats-new-on-nextdoor-product-updates>, <https://www.destinationcrm.com/Articles/CRM-News/CRM-Across-the-Wire/Nextdoor-Adds-to-the-Essential-Neighborhood-Network-176455.aspx>, <https://yespress.io/nextdoor>
- DAPOBUD WBTb by province (1 September 2026): <https://data.goodstats.id/statistic/yogyakarta-jadi-provinsi-dengan-warisan-budaya-takbenda-terbanyak-di-indonesia-ini-10-besarnya-QqDEv>; open cultural data in 2020: <https://www.goethe.de/resources/files/pdf205/hilmar-farid---15-juni-20201.pdf>; a regional WBTb count dataset: <https://sasando.nttprov.go.id/dataset-sektoral/feb39fa3-f8ec-4df2-93c9-6054fce41bed/download/pdf>
- PPKD in UU 5/2017: <https://pasal.id/peraturan/uu/uu-no-5-tahun-2017>
- Workers AI pricing (Whisper per audio minute): <https://developers.cloudflare.com/workers-ai/platform/pricing/>
- Wiki surveys: Salganik, M. J. and Levy, K. E. C. (2015), "Wiki Surveys: Open and Quantifiable Social Data Collection", *PLOS ONE*; <https://allourideas.org>

**Related documents in this repository**

`showcase-plan-2026-11-17.md`, `strata-model-2026-11-17.md`, `product-shape-2026-11-14.md`, `budaya-go-plan-2026-11-14.md`, `agent-entrance-2026-11-03.md`, `research/opencode-keyless-seeding-2026-11-17.md`, `research/serverless-pds-and-auth-2026-11-17.md`, `evidence/README.md`.
