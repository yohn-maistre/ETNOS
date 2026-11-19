# ETNOS for the showcase: what it is and how we build it

17 November 2026, night. A brainstorm with the owner, written down as one plan. It answers the outside review (`research/advisor-review-2026-11-17.md`), records the owner's decisions of 17 November, and settles the open design questions it can. Where it disagrees with `direction-2026-11-16.md` or `strata-model-2026-11-17.md`, this document wins for the showcase build. The build list lives in `open-work-2026-11-17.md`.

Status: **draft for the owner**. Sections marked *proposal* are my calls with reasons; the owner can overturn any of them. Questions only the owner can answer are at the end.

## 1. Dates

- Registration on budayago.id closes **21 November**. Polish and first people until then.
- Open lectures for registrants: 24–25 November.
- **Proposal upload: 26–27 November** (final product proposal). Everything shown in it must be usable by then.
- Administrative and substance selection: 28 November – 2 December.
- Finalists announced 4 December: 20 finalists, 10 digital and 10 physical prototypes.
- Mentoring for finalists on the deck and the showcase: 7–14 December.
- Arrival in Jakarta 17 December; **showcase and judging 18–19 December**, ranked 1–10 per category.
- AT Protocol "Spaces" public beta: 1 December (official post of 13 November).
- Pilot opens to everyone after the competition, on a proper server or Abstraksi's own machines.

Source: the BUDAYA GO! 2026 timetable the owner shared on 17 November. This replaces the 4–5 December showcase date in earlier documents.

The owner's position: everything on the list gets built before the proposal goes in, not cut. Aksara Node stays a roadmap slide. I agree to try, with one condition: we build in an order where the showcase story is complete after each step, so that if a risky item slips (the serverless PDS above all), nothing else is left half done.

## 2. What ETNOS is, in one paragraph *(proposal, revised after the second review)*

Framed in the judges' own law: Cerita is *tradisi lisan* and Ruang bahasa is *bahasa*, two of the ten objects of UU 5/2017. Draft, to be written last and to claim only what is live on upload day:

> Orang Papua mencatat, membicarakan dan memakai budayanya sendiri setiap hari di ETNOS. Cerita dan sejarah dari sumber terbitan ada di satu tempat, dan orang dari wilayahnya bisa menambah versi mereka; satu tanggapan dari seorang tetua Mee tersimpan di samping catatan yang sudah terbit. Setiap tulisan menunjukkan sumbernya, dan Aksara, sebuah program, membantu mencari dan merangkum. ETNOS berjalan di Strata, mesin terbuka yang bisa dipakai wilayah lain, dan laporan keadaan pengetahuan per wilayah bisa menjadi masukan PPKD kabupaten.

**What leads at the showcase.** The direction document named two things: **Cerita** (stories of Tanah Papua with sources, and the people a story belongs to say what it means) and **Ruang bahasa** (rooms where people talk in their language). The owner had forgotten the first; it was Cerita. The Strata model, the wiki, the map and the communities are how those two work. Surveys and government data stay out of the headline.

**The demo in one walk:**

1. Open etnos.space on a phone. Place set to Mee Pago. The feed has posts from people and one card from Aksara.
2. Aksara · Mee Pago's morning story, with "2 sumber" folded underneath and a question at the end. A Mee member answers with how their family tells it; the answer becomes a variant on the story's page.
3. Tap the region: the Mee Pago page with a photo, its regencies, peoples, languages, news and open questions. Nabire shows both Mee Pago and Saireri, with who says which.
4. Tap Bahasa Mee: the public language page, then a demo room with consenting members (said on stage), where a word is marked and added to the living dictionary with a voice clip. Real private rooms are never shown.
5. Share a story card to WhatsApp. It looks like a printed page.
6. Close on the printed A4 bulletin with the elder's correction on it.

The Strata model (layers, places, columns) is the explanation slide after the walk.

## 3. Thirty people on the free tier

**Measured on 17 November** ([research/free-tier-measurement-2026-11-17.md](research/free-tier-measurement-2026-11-17.md)). A heavy simulated day for 30 people at showcase scale used 102% of the daily read allowance before the fixes and 40% after (requests 9%, writes under 2%). The usage page `/v1/ops/usage` and Workers Logs now meter the live site. Aksara's recurring work (alarms) is the thing to watch during the alpha. The table below was written before the measurement and is kept for its reasoning.

**Where we are.** The site is one Worker in front of one SQLite Durable Object that holds everything. The browser does not poll the server; requests come only from navigation and actions.

**What breaks first on Workers Free** (limits to be confirmed by the research in §4):

| Limit | Risk for 30 active people |
| --- | --- |
| 100,000 Worker requests a day | Low. 30 people × 60 page views × 8 API calls is about 15,000. |
| 10 ms CPU per Worker request | Medium. Sign-in (OAuth, DPoP, sealing) and any image or card rendering may exceed it. |
| Durable Object rows read per day (SQLite billing counts rows scanned) | Unknown, possibly the real limit. A feed query that scans a whole table on every load multiplies fast. |
| Durable Object rows written per day | Low for posting; watch seeding jobs (kampung, news, map rebuilds) that write in bulk. |

**Plan:**

1. Turn on Workers Logs with sampling for one day and read CPU time per route. Free.
2. Measure rows read per API route locally against a copy of the seed with 30 synthetic accounts and a week of posts. Add indexes where a route scans.
3. Cache public reads at the edge (wiki pages, place pages, the map JSON, news) for a short time, keyed so private content can never enter the cache. Signed-in reads of public content stay uncached but cheap.
4. Move bulk jobs (kampung load, map rebuild, news ingestion) out of request paths into scheduled runs with a daily write budget.
5. Load test: 30 simulated people posting, replying and reading for an hour, against a local workerd with the same limits.

If the measurements say Free cannot carry it, Workers Paid is $5 a month for the account and lifts the CPU limit to 30 seconds. That is the honest fallback and should be in the proposal budget.

**Revised after the second review:** pay the $5 for Workers Paid now rather than spend build days protecting it, and still measure what Free would carry so the proposal can say "berjalan di paket gratis untuk N orang" honestly. Kampung search ships as a static file searched in the browser, and the map stipple is drawn from the same file, so it reads no database rows.

## 4. Accounts: the full AT experience

The owner wants every person to have a real AT account from the start, without signing up at Bluesky first. Today ETNOS sends new people to bsky.social. Running the official PDS needs a VM; the Oracle free tier had no capacity in Singapore.

What already exists: `packages/pds` is an attributed fork of Cirrus (MIT) running on Workers with a SQLite Durable Object and R2, tested locally against the official OAuth client. It hosts **one identity per deployment**. Making it host many accounts is the work.

**What the research found** (`research/serverless-pds-and-auth-2026-11-17.md`):

- No multi-account PDS for Workers is usable today. Cirrus is still single-user (0.19.0, the version we forked). One independent multi-account attempt exists and is a good design reference, not adoptable.
- Making ours multi-account touches about 120 places that assume one identity. Estimate: 8–10 focused days for a happy path, 15–19 for something we would trust.
- CPU: the password hash Cirrus uses takes about 90 ms, far over the 10 ms Worker limit on Free; signing is about 1 ms. Durable Objects allow far more CPU per request, so hashing and signing inside the account object may make Free workable (untested).
- Email to arbitrary addresses from Cloudflare needs Workers Paid; Resend's free tier (100 a day) works.
- Bluesky and the other open hosts currently require phone verification at sign-up. That is real friction for our people.
- Spaces public beta on 1 December is confirmed by the official post of 13 November; the reference PDS gets it by update that day.
- A new PDS may be capped by Bluesky's relay at a small number of accounts until trusted (figure from 2024, current value unverified). This only matters once public AT publishing is on; ETNOS keeps posts in its own store today.

**One thing that shrinks the work** *(my finding)*: ETNOS uses the AT account for identity and sign-in. Posts live in Strata, and public AT publishing is off. So for ETNOS the PDS only has to create accounts, sign people in through OAuth, hold a `did:plc` and resolve `nama.etnos.space`. Firehose, relay, blob serving and large imports can wait. An identity-first multi-account PDS is a smaller job than a full one.

**Update 18 November:** [research/pds-multi-identity-plan-2026-11-18.md](research/pds-multi-identity-plan-2026-11-18.md) checks this against the code. It is smaller than a full PDS, but OAuth (the provider has no account selector) and key custody are real work: about 14.5 days to a demo with test identities, about 20.5 before a real member. The riskiest unknown is whether Durable Objects on Workers Free get enough CPU. A one-day spike settles it and needs the owner's go-ahead to deploy and touch DNS. Real members' identities stay on the official-PDS track for the showcase.

**Proposal: two tracks** (revised after the second review).

1. **For people, now and through the pilot: the official PDS on a small server.** Real multi-account, invites, `did:plc`, `nama.etnos.space` handles, email through a free tier, no phone gate, Spaces by update on 1 December. Sign-up form on etnos.space with the invite code in the link; relay crawling off until publishing is wanted; PDS data and the PLC rotation keys backed up off the machine from day one, because ETNOS becomes the custodian of these identities. Free candidates to check: Google Cloud's always-free e2-micro (1 GB, US regions), or Oracle in another region with a new account (an Oracle account's home region is fixed at sign-up, which is likely why Singapore blocked it). Otherwise a VPS at about $4–6 a month. The owner rents; I set it up.
2. **For Strata: a serverless identity host on Workers**, one Durable Object per account, hashing and signing inside the object. Started only after the walk is complete (about 22 November), with throwaway identities, never holding a real person's identity before it is qualified. Named honestly as an identity host until it holds repositories: its accounts cannot use the Bluesky app, and Spaces needs a full PDS. Shown at the showcase as the way Strata deploys without a server, if it is ready; otherwise a roadmap slide with the design. Accounts can move between hosts later because `did:plc` identities are portable.

To check in our code: whether Strata reads a profile record or the session from the PDS after sign-in; if it does, the identity host must answer that too.

Rejected: one Cirrus Worker per person (thirty deployments, thirty sets of keys). ETNOS-only accounts stay an emergency option: they contradict Decision 004 and need a migration later.

*Owner note:* Supabase would add a second company and a second free tier that every community deploying Strata must sign up for, and it does not give anyone an AT account. Not needed.

## 5. Places as a table first

Agreed with the reviewer and the owner. A `place_claims` table before any map work:

- `places`: id, kind (country, province, regency/city, district, kampung), name, local names, government code, parent (the administrative spine), coordinates when known.
- `place_claims`: subject (a place, people or language), relation (`in_region`, `indigenous_to`, `spoken_in`), object, state (`whole`, `part`, `contested`), source, quoted sentence, date, who added it. Every membership of a regency in a customary region is a claim, never a column.
- Nabire gets two `contested` claims (Saireri and Mee Pago) with the provincial profile, RPJMN 2020–2024, DAP and Kompas cited.

**Kampung: search only, with a hint.** All kampung from the government codes are loaded for search and for "Usulkan tempat", but they appear in browse lists only once something is attached to them. On the place map each known kampung is a faint dot in the stipple, and the region card says "N kampung tercatat" with the real count. So a person sees that their kampung is known before they search for it. *(proposal)*

## 6. Peoples, languages and how this generalises

The owner wants the model to fit Kalimantan or Aotearoa without code changes. The research in `research/peoples-places-and-public-data-2026-11-17.md` (in progress) checks the standards (Glottolog, ISO 639-3, Wikidata, Native Land, Local Contexts labels, Mukurtu's cultural protocols, BRWA and AMAN, iwi and hapū, Dayak classification) and proposes one schema filled for Nabire, a Dayak example and an iwi example.

What the research recommends (`research/peoples-places-and-public-data-2026-11-17.md`), which I take as the model:

- **One administrative spine, everything cultural a graph.** Places nest once (country, province, regency, district, kampung), with valid-from and valid-to dates so the 2022 provinces and the 2025 codes do not break old paths. Overlays, peoples, sub-groups (clans, marga, hapū), languages, organisations and communities are separate entities.
- **Every link is a claim**: subject, relation, object, extent (whole, part, contested), who asserts it, source and its type (law, planning, customary body, scholar, press, community, dataset), source date, status. A disagreement is two claims, never an edit war; a steward can change a claim's status but not erase it. Nine relations: `within`, `part_of_overlay`, `speaks`, `indigenous_to`, `subgroup_of`, `located_in`, `represents`, `recognised_as`, `steward_scope`.
- **Self-description first.** Where a people has described itself, that claim shows first.
- **No registry of persons.** The platform never records which people a person belongs to. Labels never go on people (already a rule).
- **Languages by Glottolog code**, ISO 639-3 as a cross-reference. Ethnologue and Joshua Project are not used for seeding (terms, and Joshua Project's missionary framing).
- **Every overlay page says it is a reported classification, not a land boundary**, as Native Land, AIATSIS and Te Kāhui Māngai do. ("Wilayah acuan, bukan batas tanah adat" already does this.)
- **Content protocols from Mukurtu and Local Contexts**: communities, cultural protocols and categories kept apart; Local Contexts Notices applied by the platform as placeholders, Labels written by communities. CARE and OCAP as review questions.
- **Steward scope is itself a claim**, so Nabire sits in two Aksaras' scopes, and a question goes to the Aksara the asker's place selects, with the other shown as "also in". Tanah Papua: seven scopes, an eighth only if a community proposes one. Kalimantan: one per province first, cultural groupings only if Dayak organisations ask. Aotearoa: one per iwi, at that iwi's request.

The worked examples (Nabire, Ngaju in Central Kalimantan, Ngāti Porou) are in the research. The engine change is one `claims` table with that shape, of which `place_claims` in §5 is the first use.

## 7. Language rooms *(proposal, revised after the second review)*

The owner asked whether to go fully like Reddit (one community per language), one Space per organisation with communities inside, a catalogue entry that prompts someone to open a room, or a tree of language under people under place.

- **Every language has a public page** from the start (Glottolog data, where it is spoken, the peoples linked to it, published dictionaries, a word a day from published sources).
- **Several rooms per language, named by their people**: "Mee · Tigi", "Mee · perantau Jogja". No room is the official one, so nobody can capture a language by tapping first, and rival dialect or clan groups do not have to share one room. The language page lists its rooms.
- **Opening a room**: someone taps "Buka ruang bahasa", names it and asks a second speaker to keep it with them. The request shows on the language page for a few days with the requesters' handles before the room opens. A room that falls to one keeper stops admitting members until a second is named.
- **Two sides.** A public side (words and stories the room chose to publish) and a private side (members only: conversation, voice posts, the living dictionary). What is said privately never enters search, export, the map, the cache or any model. Publishing is a separate approved public copy.
- **Membership is private too**: the member list is visible to members only.
- **Voice clips** sit behind signed-in URLs; their maker can delete them; if a room closes, its keepers get an export.
- **Varieties without a Glottolog code** can be named by the community.
- **Each private room is stored in its own Durable Object**, separate from the public database, with negative tests on every path that could leak. Until Spaces, each room says plainly that the operator of ETNOS can technically read it.
- **Not a tree.** A room is not under a people or a place; it links to them through claims (§6).
- **Organisations later.** When Spaces work, a room can move to an organisation's Space. No date is promised.

For the showcase: one or more Mee rooms opened by the owner and other Mee speakers, with real members. Rooms in Saireri and Domberai if people there want them. On stage, a demo room with consenting members.

## 8. Communities and organisations

- **Community catalogue with "Buka komunitas ini"** (strata model §3), interest communities first: Penulis Papua, Foto Papua, Baca bersama, Musik Papua, Sepak bola Papua, Perantau Papua, Mahasiswa Papua di luar Papua; one open room per region.
- **Open admission** for Beranda and Tanya & bantu, and for every interest community by default. Approval stays for language rooms, organisations and rooms that ask for it. (The reviewer found every live room on approval; that blocks every first visit.)
- **Gossip, family feuds and fun belong here.** People should be able to talk about anything. Community rules and moderation handle the rest, not the design.
- **Organisations**: listing, claim form ("Ajukan organisasi resmi"), verified mark, their own Studio. Seeded from public lists (schools, health posts, churches, customary councils, NGOs) per regency.

## 9. Aksara: one per customary region

**Decision (owner):** one Aksara per wilayah adat, seven in all, plus the sitewide Aksara. The reviewer's worry was that seven accounts beside sixteen posts read as a bot site. The owner's answer: people will understand seven for the demo, and more people are coming.

**How it stays elegant and general** *(proposal)*:

- They are one Aksara with seven regional voices. All share the name, the mark and the rules; each shows as "Aksara · Mee Pago" with a small regional sign on the mark. The sitewide profile lists all eight.
- They are created from the place pack: one per region in the steward scheme (§6), each with its standing region label, its sources and its daily budget. A Kalimantan deployment gets its own set from its own pack.
- A person can follow, mute or pause the one for their region.
- A sitewide ceiling caps agent posts per day so the stream stays mostly people once people arrive.

**What Aksara does besides posting stories:**

| Kind | What it is |
| --- | --- |
| Kabar | A news line with its link and the place it is about |
| Cerita, Sejarah, Alam, Kata | Short pieces from accepted sources, with the sentences shown |
| Tanya | A question or poll about the region ("Di kampungmu ceritanya bagaimana?") |
| Tanya warga | A short survey on a public issue in the region (roads, schools, prices, a regulation), linked to the public data behind it. Results show only above a minimum number of answers, always as "dari N penjawab di ETNOS". |
| Ringkasan | A weekly summary for the region, and a printable bulletin |
| Replies | Answers to mentions and questions, only from accepted sources or reviewed pages |

**Showing them** *(second review, adopted)*:

- One name and one mark for all eight. The region appears as the place line, where a person's post shows its place. One profile with seven voices; following or muting a region is a setting on it.
- In the all-Papua feed, the regional morning posts collapse into one card, "Aksara menulis di 7 wilayah hari ini", that opens sideways. In a region's scope, only that region's voice shows.
- Never two Aksara items in a row, and at most one in five items in any feed.
- No agent replying to another agent at the showcase.
- Every post ends with a question and the Sumber line. An unanswered post folds after two days.
- No first-person cultural voice and no reading of its own. Tapping the mark says "Aksara adalah program, bukan orang".
- Each voice's profile carries "wilayah acuan, bukan batas tanah adat".
- A new deployment starts with one Aksara. A regional voice turns on when its scope has seeded pages and a named human steward.

**From surveys to policy** *(revised)*: a finished Tanya warga produces a one-page summary shaped like a Musrenbang proposal (issue, place, what people said, how many answered, the public data behind it), which anyone can download and take to a village or regency meeting. For the showcase: a person opens each survey (Aksara may draft it), the culture lead approves the topic, topics are services and culture (schools, language teaching, roads, prices), results show only from 20 answers, and answers cannot be linked to accounts. Whether a government reads the summary is not ours to promise.

## 10. Sources under Aksara posts (was "Dasar")

The owner asked what Dasar meant. It was the name for the panel under every Aksara post that shows what the post was built from: the source and who holds it, the exact sentences used, and the checks that passed. It exists on wiki pages, not yet on posts.

**Rename to "Sumber"** and build one expandable component used everywhere (posts, replies, wiki sections, surveys):

```
Aksara · Mee Pago                                   2 jam
Danau Tigi terletak di Kabupaten Deiyai ...
───────────────────────────────────────────────────────
▸ 2 sumber · diperiksa
```

Expanded:

```
▾ 2 sumber · diperiksa
  1  Prihartanti & Harjito (2026), Didaktik 12(01)
     "…kalimat persis yang dipakai…"            Buka sumber
  2  Yobe, tesis UGM
     "…"                                         Buka sumber
  Cara ditulis: dari dua kalimat di atas; nama dan angka dicek.
  [ Benar ]  [ Ada yang salah ]  [ Saya tahu lebih ]
```

"Koreksi" becomes those three buttons. "Ada yang salah" and "Saya tahu lebih" open a short reply form; a reply with a source or from a named teller becomes a proposed change or variant on the wiki page, and the post shows "1 tanggapan diterima". This is the loop the showcase closes on.

**Built 18 November.**

- Every post by an agent shows a "Sumber" panel under the body. It is closed in feeds and open on the post's own page.
- Sources come from a structured `content.sources` list (title, link, the exact sentence used; at most eight) that Aksara can send through `etnos_create_post`. Older posts work too: the "Sumber:" sections an agent wrote at the end of the text are folded into the panel, unchanged.
- **Benar** is one confirmation per member and can be withdrawn. Only current human members can give it. Who confirmed is never shown, only the count.
- **Ada yang salah** and **Saya tahu lebih** post an ordinary visible reply marked with `content.answer`, with an optional source link. Hidden or deleted replies stop counting.
- Tests: `test/forum.test.ts`, "answers to agent posts".

**Differences from the sketch above, on purpose.**

- The panel never says "diperiksa". Sources an author names are shown as written, with "Periksa sebelum mengutip", because nothing checks them yet. The label should come back only where Strata itself has checked the quotes (the resident's pinned evidence, the desk's fact sheet).
- The panel counts "tanggapan", not "tanggapan diterima". A reply does not yet become a wiki proposal or a Versi lain, and no one can accept it. That is the next step: a steward turns a marked reply into a proposal on the linked page.


## 11. Plain names everywhere

The owner: if even the owner forgets what a name means, newcomers will not guess. Every feature name in the interface becomes plain Indonesian. *(proposal, to apply in the interface and in new documents)*

| Was | Becomes |
| --- | --- |
| Dasar | Sumber |
| Koreksi | Benar / Ada yang salah / Saya tahu lebih |
| Celah, Belum tercatat | Belum ada di catatan |
| Beda versi, Dicatat berbeda | Versi lain |
| Kedekatan isi (map lens) | Menurut isi |
| Sumber suara (map lens) | Siapa yang bercerita |
| Bacaan terpandu | Bacaan berurutan |
| Panggilan karya | Ajakan kirim karya |
| Lembar Medan | Peta medan |
| Jejak Spesimen | Spesimen di museum |
| Peta Benda | Benda di museum |
| Foto Lama, Nama Baru | Foto lama |
| Daftar yang Tidak Ada | Warisan yang belum tercatat |
| Nama Hidup | Nama tumbuhan dan hewan |
| Kalender Hidup | Kalender musim |
| Pulang | Pengembalian benda |
| Satu Lembah | (a showcase page, named after the valley itself) |
| Studio | Pengaturan situs (kept as "Studio" in code) |

Layer names (Percakapan, Kabar, Kerja bersama, Pengetahuan, Ingatan, Tempat) are plain already and stay.

## 12. Automate first, people correct

The owner's rule: people should just post, read, talk, verify and have fun. Nobody should have to tag, file or configure anything.

- **Labels and places on posts**: a model attaches a place (regency at most) and topic labels to every public post and news item when it arrives, marked as suggested. Never a people or language label on a member's post, since that tags the person. The author can remove any label; anyone can flag a wrong one. Public posts only on Google's free tier, and members are told that this tier may use what it reads; private rooms never go to a model.
- **News to places**: news items are matched to places by the place names and their aliases (all names from the place pack, local names included), then checked by a typed decision model. No hand-written alias lists.
- **Wiki pages**: Aksara proposes changes from news and from accepted corrections; pages go live before review, as decided.
- **What people still decide**: which sources are accepted, what is sacred and hidden, who joins a language room, and whether a correction is right.

Every automatic decision keeps a receipt (model, input, answer, time), viewable from "Sumber".

## 13. Seed every region

Decision (owner): seed all seven wilayah adat. Operationally the people of Tanah Papua see themselves as one; asking every leader before a page exists is neither possible nor expected ("kalau bisa, kerjakan dulu"). What is published elsewhere is curated here by Papuans, with sources, and can be corrected by the people it is about.

- Pages for Mamta, Domberai, Bomberai and Ha Anim, and their regencies, peoples and languages, through the same verified-sentence pipeline as the first three regions.
- Year pages, "2026 di Tanah Papua" first, then earlier years from the news archive.
- More engravings: one plate per region, then per regency.
- The safeguards the owner kept stand: human remains are never shown as images; for material its source calls sacred, a summary and a link to the original, and a one-tap "Jangan disebarkan" that hides it pending a steward.
- Named people answer "Jangan disebarkan" within a stated time (see the questions).
- Every page not yet reviewed by someone from its region says "Ditulis dari sumber terbitan; belum ditinjau orang dari wilayah ini."
- The owner's reasoning goes on Tentang ETNOS in his own words. Stated, it is a position; unstated, it looks like an oversight.
- A short threat-model page (who could be exposed by what is posted, what is logged, who can read what) before conflict material is seeded further.

The reviewer's alternative (catalogue-only for peoples with no steward) is recorded as rejected by the owner, with the reasoning above. The owner's network covers Mee Pago directly, and Domberai and Saireri through family; that is noted, not required.

## 14. Images

- **Wiki and place pages**: a real photograph at the top where a freely licensed one exists (Wikimedia Commons first), with author and licence under it. Where none exists, the engraving. A spot check found 15 to 59 Commons files for each of five regencies (Paniai has none geotagged near its town), so most smaller regencies will start with the engraving and the photo comes when someone adds one.
- **Cards** (feed, wiki home, share cards): stylised, with the ink-print filter applied to a photo or the engraving. The filter is applied at build time for seed pages, so it costs nothing per request.

## 15. Maps *(proposal)*

The owner does not like a sitewide map. Neither do I: one map for everything ends up showing nothing in particular. Two maps, each where its question is asked:

- **What is known** → Peta wiki, on the wiki home (exists). Lenses: Menurut isi, Waktu, Tempat.
- **Where** → the place map, inside the place switcher. Tapping "Tanah Papua" opens a sheet with search on top and the engraved map below: regions as soft fields, kampung as stipple, tap to choose. On a place page the same map sits at the top, zoomed to it.

**Built 18 November, needs an owner decision:** Jelajah now has a Tanah Papua atlas (`apps/web/src/ExplorePlaces.svelte`): the seven reference regions as plain outlines built from the BIG regency lines, the 256 languages as Glottolog 5.4 reference points, regions with wiki pages tinted. It follows the advisor's call (plain reference outlines with hatching, no soft fields): Nabire, Mimika, Puncak, Puncak Jaya, Mamberamo Raya and Teluk Wondama are hatched as placed differently by different sources (`research/customary-regions-and-boundaries-2026-11-17.md` §4), and hovering a region lights them up with it. This is a third map next to the two above. Either it becomes the shared map component that the place switcher and place pages use (task 36), or it moves into the switcher and Jelajah keeps the list. Soft fields (`strata-model` §4.1a) against plain outlines (advisor) is also still open.

**Consolidate the places page.** Since place is a scope, the place page and the place's wiki page become one page: Tentang (the wiki text), Percakapan, Kabar, Komunitas, Data. `/places/...` redirects to it. No separate "Tempat" destination to confuse people.

## 16. Shared cards for WhatsApp

Every wiki page, place, story and post gets a share card that looks like a printed page: engraving or filtered photo, title, one line, the ETNOS mark, the place. Sizes for link previews (1200 × 630) and for status and Instagram stories (1080 × 1920).

- Seed pages and places: cards rendered at build time.
- Posts: the link preview uses the place card with the post text as its description; a "Bagikan sebagai gambar" button draws the full card in the browser, so the Worker does no image work on the free plan.

## 17. Public government data, politics included

*(proposal, scope to confirm)* For the showcase the "Data" tab ships population, schools, health facilities and languages; elections, budgets and village funds follow after the showcase unless the owner decides otherwise. The full tab on each place: population, schools, health facilities, village fund amounts, the 2024 election results, the regency budget, regulations about the place, each with its source and year. Aksara uses it for Tanya warga and for news context. Rules: figures only from official public sources, always dated; elections, budgets and village funds only as aggregates by regency or district, never per polling station in a small kampung; no data about private individuals; elected officials appear only as public office holders with sourced facts. Codes come from Kepmendagri 300.2.2-2138/2025 as amended (about 7,150 kampung across the six provinces, fetched from an MIT-licensed mirror without an account); boundaries to regency level from geoBoundaries; no open source for kampung boundaries, so kampung are points. Several government portals (KPU, JDIH, Ina-Geoportal, the Papua open-data portal) could not be reached from our sandbox and need a second try. Details and licences in the research.

## 18. Studio

One place for every operator setting: the agent switches (all eight Aksara), sources, review, packs, communities, organisations, admission defaults, budgets. Rebuilt with the impeccable pass, as an Operate surface: plain, scannable, every setting with one line on what it does. After the proposal, together with the place and wiki page merge (§15): neither should change under people in the week they arrive. Navigation freezes on 21 November; plain names go in once, on day one, through one strings file.

## 19. What the reviewer said to cut, and what we do

The reviewer advised cutting soft-field regions, agents on the map, seven place agents, the classifier with receipts, embeddings and live placement, the taxonomy switcher, year pages, biocultural features, open calls, the organisation claim flow, kampung seeding, onboarding cards, further engravings, Bacaan terpandu and language spaces beyond the Mee pilot.

The owner's decision: build all of it before the proposal, except Aksara Node, Spaces and one-click deploy, which are roadmap slides (Spaces becomes a demo if the beta ships in time). The order in `open-work-2026-11-17.md` puts the items a judge sees in the walk (§2) first.

## 20. People

The owner can bring more than ten people before 21 November: a Papuan coding community of students and enthusiasts, a steward with family ties in Domberai and Saireri, and Papuan youth voices with large followings in the cities. The 2022 Papuan magazine drive showed people come when asked. The competition team has three seats: the owner, a business lead and a culture and customary lead.

What the build owes them: sign-up that works on a phone in two minutes, open rooms, something to do on the first screen, and no fake people anywhere.

## 21. Owner answers (17 November, late)

- **Accounts:** try the free tier first. Log whether Workers Free carries at least 30 AT identities with their requests and posts (publishing off). If it does, fork our own multi-identity PDS so people get handles like `giyaibo.etnos.space`. Yes to the serverless identity host. Older Cloudflare projects (Detak Detik, nonafiksi) may be taken down to free quota, or the owner opens a new free account. The $10 a month stays in mind; the official PDS on a VPS comes after the competition. Document both deploy paths: Cloudflare free tier, and a full VPS install.
- **Surveys and politics:** the culture lead and the owner's partner are comfortable, and are the ones pushing for it: culture is not separate from public policy. Elections and budgets may ship before the proposal, under the aggregation rules in §17.
- **Scale:** the floodgates open after the competition, for the pilot, on a proper server if a prize allows or on Abstraksi's own machines.
- **Everything usable before the proposal (26–27 November)**, so the proposal is consistent with the live site.
- **Still open:** who besides the owner answers "Jangan disebarkan" and how fast; who else holds identity keys and backups; the private-room line about the operator.

## 22. Questions for the owner (open)

1. Which people besides you moderate and answer "Jangan disebarkan", and within how many hours?
2. Who besides you holds the identity keys and backups?
3. Do you accept saying in every private room that ETNOS's operator can technically read it until Spaces arrives?

## 23. Deploying Strata and the operator's first run

Research: `research/deploy-paths-and-seeding-agent-2026-11-17.md`. Roadmap, not part of the proposal build (see §19).

**Two deploy paths.**

1. **Cloudflare free tier.** A "Deploy to Cloudflare" button on a neutral template: one Worker, the SQLite Durable Object, static assets, optional `AI` binding and R2. The two secrets are generated by the setup step, not typed. Needs a public repository, a `.dev.vars.example`, a `deploy` script that builds the web app, and a template that does not share the ETNOS Worker name. A command line (`npx strata init`) does the same from a laptop.
2. **VPS.** One script: checks the OS and ports, runs the official Bluesky PDS installer (checksum pinned), then adds Strata behind the PDS's Caddy on a different hostname. Not ready: the Node host is documented as a developer API, so the owner must choose between qualifying it for production sign-in and running the Worker build under workerd.

**Operator onboarding, each step drafted by Aksara and confirmed by the operator, with a receipt and sources.**

1. Sign in as steward. Operator confirms their account; Aksara drafts nothing.
2. Root place, bounds, interface languages. Operator types; Aksara checks against Wikidata and OSM and shows disagreements.
3. Places from Wikidata with national codes. Aksara drafts the tree; operator confirms or removes branches, with a diff before each load.
4. Reference regions from named planning documents, quoted. Operator confirms each.
5. Languages from Glottolog. Operator confirms and renames.
6. News sources and community catalogue. Aksara proposes feeds and communities; operator ticks which to list.
7. Wiki stubs per region, regency and language, from verified public sentences only. Operator confirms the batch; pages go live marked unreviewed.
8. Agent switches at low daily limits. The site stays out of search and agents stay quiet until steps 2 to 5 are confirmed.

Steps run in daily slices and resume, because the free model allowance is small.

**Models.** Cloudflare path: Workers AI (keyless, in the Worker, not used for training) for labels, matching and extraction; an optional AI Studio key or local model for page writing. VPS: the same, plus a local model if memory allows. Laptop CLI: any of these, or opencode's free models by the operator's choice. Public data only on every free hosted model.

**Verdict on embedding opencode.** Do not ship it inside Strata. It is MIT and can run headless with an SDK, but it cannot run in a Worker; its keyless models are promotional, usable only through its own client, have unpublished limits, and several may keep or train on prompts. "OpenBot" and "dusk.bot" are real but ship no models of their own; they let users plug opencode in. Offer opencode as an optional adapter in the laptop CLI, public data only.

**Build first.** (1) Neutral template and secret generation. (2) Seed API with draft, confirm and receipt records, reusing the verify and check scripts. (3) Studio "Mulai dari awal" on Workers AI. (4) `strata init` with model adapters and a public-only guard. (5) VPS script after the host decision.

### 23.1 opencode's keyless models, second pass (source read)

Research: `research/opencode-keyless-seeding-2026-11-17.md`. This corrects the "Verdict on embedding opencode" paragraph above.

- **The owner was right.** OpenBot (`Leka74/openbot`) and dusk bot run the real opencode program (`opencode serve` and `opencode acp`) and use its built-in free models with no account: the program sends the key `public`. dusk downloads a pinned, hashed binary and runs it on the desktop and in a server container; OpenBot uses the user's own install.
- **Still true.** The free gateway only serves the real opencode client (a plain HTTP call got a free-limit refusal), so it cannot run in a Worker, and a Worker must not imitate the client. The models are "free for a limited time", the pool is shared and unpublished, and the terms (own internal use; no programmatic extraction of output; no processes that run while logged out) leave unattended server use in a grey area. No written permission exists.
- **Models.** `opencode/deepseek-v4.1-flash-free` first, then `glm-5.3-flash-free`, `hy4-flash-free`, `longcat-2.5-free` (100 a day, hosted in China). The vendor says these four keep nothing and do not train. Other free models may keep or train on prompts and are excluded.
- **Recommendation.** Offer it on the laptop or VPS path only, as an opt-in first-run choice, public data only, disclosed, with the pinned binary deleted as soon as a key is saved. First-run form: "Paste an API key" (recommended) or "No key? Start for free (not recommended long term)". On the Cloudflare path the keyless choice is Workers AI. Ask the opencode maintainers before documenting it as supported. Seeded pages must still pass the source checks; the model rephrases verified sentences and may abstain.

### 23.2 Models, decided 17 November

The owner set opencode aside. Every node now has its own model module (`src/models.ts`).

- **Keyless default.** Workers AI Gemma 4 (`@cf/google/gemma-4-26b-a4b-it`) through the node's `AI` binding, thinking off. No account beyond Cloudflare.
- **Bring your own key.** One OpenAI-compatible provider, set by the operator: `STRATA_MODEL_BASE_URL`, `STRATA_MODEL_FAST`, optional `STRATA_MODEL_SYNTHESIS` and `STRATA_MODEL_REASONING` as variables, `STRATA_MODEL_KEY` as a Worker secret. Incomplete or non-HTTPS settings are ignored. A rate limit or outage falls back to Gemma 4 once; a refused key does not fall back, so a wrong key shows up.
- **ETNOS.** A Google AI Studio key, base URL `https://generativelanguage.googleapis.com/v1beta/openai`. AI Studio's free tier may use prompts to improve Google's products, so only public material goes to it, which is already the rule for the resident and the desk.
- **Who uses it.** The desk and the resident. The resident no longer calls the West Papua Watch gateway: its `MODEL_GATEWAY` binding points at Strata's own `ModelGateway` entrypoint, which bounds size, roles, tools and output length and answers in the OpenAI shape. Deploy Strata before the resident.
- **Decisions.** On Cloudflare they stay on `@cf/cloudflare/clef-flash` (owner, 18 November): it returns real probabilities, and the thresholds (0.85 and 0.8) depend on that. On hosts without Workers AI, a free Google AI Studio key can power everything, decisions included; that path needs a chat-model adapter and thresholds checked against labelled examples before it is trusted.
- **Operator view.** `GET /v1/ops/usage` now also shows which route is configured (host and model names, never the key).
- **Harness.** Whether pi stays the resident's agent loop, or Flue, Mastra or the Agents SDK replaces it, is assessed in `research/resident-harness-2026-11-17.md`. The gateway is independent of that choice.

### 23.3 The Aksara communal harness and the Workers harness (18 November)

**Self-hosted (owner's picture).** An office or a VPS installs the Aksara communal harness once and gets the whole set: the agent, an account host (PDS), a library and vault, and the Rust kernel from aksara-core that keeps public and private data apart. A switch connects it to a Strata node. Think of it as a community's own agent, the way a person runs their own assistant. Community ownership is covered in `research/aksara-node-for-communities-2026-11-17.md`.

**Free entry on Workers.** Research: `research/aksara-workers-harness-2026-11-18.md`. Findings that change the plan:

- `@cloudflare/computer` (MIT) gives a Durable Object a SQLite filesystem and agent tools with a pi entry point, on Workers Free. Running model-written code is Paid only on Cloudflare (Dynamic Workers, Sandbox, Containers). QuickJS in WASM is the only free route and is untested.
- At about 57 neurons per one-round reply, the free allowance is about 150 replies a day across all eight Aksara, or four or five long coding loops. On the free tier Aksara is a research editor that keeps files, not a coding agent. Code execution is a Paid option or the self-hosted harness's job.
- optmem has no licence; neither `pi-optmem` package grants one for its memory code. We borrow the shape only (append-only log, rebuildable summary, small fixed read at start), which matches the place notebook. Its "never edit the log" rule conflicts with withdrawal, so withdrawn sources must still remove what was derived from them.
- Plan: the node's notebook tables stay the source of truth. Each region gets a workspace with a read-only `/place` folder generated from the notebook and writable `/scratch`, `/drafts` and `/journal.md`, every file tagged with its source and revision. One-day spike on `@cloudflare/computer` (cold-start CPU, rows per job) before the showcase; ship the notebook alone if it fails. The shared contract with aksara-core is tool names, a plain markdown folder layout with `sources:` front matter and a `recall(query, mode, limit)` call.

## 24. Build order from 18 November (read this first after compaction)

Decided with the owner on 18 November. Design: `superpowers/specs/2026-11-18-information-architecture-design.md`. Research: `research/why-these-axes-2026-11-18.md`, `research/topic-primitives-and-knowledge-organisation-2026-11-18.md`, `research/aksara-composed-views-2026-11-18.md`.

The owner's order: foundations solid, UI beautiful and understandable, anyone can join and see what it is about. Then the multi-identity PDS so people can register and post. Then Aksara activity with proper Gemini keys.

**Run 1, foundations and UI (now).** Task numbers are in the session task list.

| Step | Task | What |
| --- | --- | --- |
| 1 | 52 | Small fixes: one back button on lapisan, wiki Diskusi padding, Jelajah highlights to five with "Semua percakapan", Riset terbit without the raw query, repeated subtitles, agent chip "AI" / "AI · Mee Pago" |
| 2 | 53 | One switcher: "Terbaru · tempat" in one sheet with the atlas as its map; drop the scope row and the grey map on `/contexts` |
| 3 | 36 | Thing page: name and kind on a tinted band, tabs Tentang, Percakapan, Kabar (lapisan inside), Komunitas, Sumber; context and wiki page merged |
| 4 | 54 | Jelajah as the one directory; `/contexts` redirects |
| 5 | 55 | One topic scheme (18), headings display only, crosswalks, catalogue renames reach live deployments |
| 6 | 56 | Wiki: beings (mountain, lake, forest, species) as page kinds; news never becomes a wiki draft; seeding plan |
| 7 | 57 | Optional season on records, defined per community |
| 8 | 58 | Start a community with two people: waiting room, invite link, 14 days |
| 9 | 59 | Tentang ETNOS: why these axes, in plain Indonesian |
| 10 | 40 | Proposal pack (26–27 November), with the composer as the next step and one mock |

Every UI step uses the impeccable skill, `vite build` and screenshots at phone and desktop width.

**Progress (18 November, evening).** Steps 1 to 9 are built and pushed. Step 6: the seed format takes `kind: "being"`, the wiki home lists beings per region, news alone never starts a wiki draft, and the seeding plan is `research/wiki-beings-seeding-plan-2026-11-18.md`; the first being pages are being surveyed through the verify pipeline and still need proposing and a `map.json` rebuild. Step 7: seasons per community on posts (`src/seasons.ts`). Step 8: founding with two people (`src/founding.ts`, `/gabung#token`). Step 9: Tentang ETNOS section under Dasar penggolongan. Owner actions after deploy: click "Muat katalog" in Studio for the topic renames. Next is step 10, the proposal pack.

**Run 1b (decided 18 November evening, before step 10).** Spec amendment at the end of `superpowers/specs/2026-11-18-information-architecture-design.md`. Task 60: Jelajah becomes the home of places, languages and topics (anchors, Sedang dibicarakan, strata layers, language specimen index, topic tiles, Kabar strip; map to Wiki home; `/contexts` folds in). Task 61: sidebar sub-items and Menu sheet, retire a context (Musik Reggae), `/wiki/<id>` redirect for context articles, Kabar tab grouped by layer. Task 62: kind-specific top blocks on thing pages. Task 63: Pesan, Aktivitas and Tersimpan hidden from visitors who are not signed in (the server already refuses them with 401; the menu still showed them). Order: 63 and the Musik Reggae retirement first, then 60, 61, 62, then step 10. Task 64 (added after a live check showed 0 of 372 contexts with any labelled record): first labels for the 39 seed wiki pages from `src/catalogues/tanah-papua-seed-labels.json`, applied by the node steward with "Pasang label awal" in Studio (`Groups.applySeedLabels`, `test/seed-labels.test.ts`). Each page gets its wilayah adat; kabupaten pages also their kabupaten; language pages also their language by Glottolog name (Lani is Western Dani, west2594); pages about peoples and language families get the region only.

**Run 1b, second pass (18 November night).** Tasks 60 to 64 shipped. The owner then asked for Jelajah to feel like one place: shadcn-like primitives, illustration around them rather than a different style per section, a mosaic with one tile on top (reference: westpapua.watch/issues). Task 66 rebuilt Jelajah on one tile (`ExploreTile.svelte`): Kabar first, then Sedang dibicarakan, Tempat, Bahasa, Topik, Komunitas, each a mosaic with one wide tile. The art slot carries the kind: a news photo or engraving, a small Papua silhouette with the region lit (`RegionArt.svelte`), a crop of names in the serif for languages and topics (`WordArt.svelte`), an engraving for the first community. The strata cross-section left Jelajah (people asked what the shades meant) and stays on place pages as an idea to keep exploring (ontology §10, the Lapisan lens). The thing page's Kabar tab is now Perkembangan (task 65). Task 67 holds Peta wiki on old phones and its rebuild around Hal from `research/knowledge-ontology-2026-11-18.md`. All maps follow the switcher's region (`scope-region.svelte.ts`).

**Run 2.** Multi-identity PDS (task 24, plan in `research/pds-multi-identity-plan-2026-11-18.md`).

**Run 3.** Aksara with proper Gemini keys: seven Aksara from the place pack (30), place notebook (48), community-kept Aksara (49).

**Roadmap only.** Clan spaces: a private space and PDS per clan with the communal Aksara on a refurbished machine. The composer build (Aksara arranging typed blocks, steward approval).

## 25. After the 18–19 November research sessions: what to build next *(proposal)*

Written 19 November, morning, before implementation starts. The detail lives in five documents; this section is the short version and the order. Read them in this order:

1. `research/epistemic-multiplex-2026-11-19.md`: the knowledge model (Entity, Assertion, Witness), the motif library, five lenses on importance, how the seed and map were really built (§5), public data and foundation models (§9), voice notes and video (§10), and **three flagships** (§17).
2. `rationale-threads-2026-11-19.md`: eight proposal threads with findings, research, laws and indicators, plus the flagships table (§0.1).
3. `research/aksara-living-program-2026-11-18.md`: Jadwal Aksara (stays as designed; the reel is now a *Kartu* tab beside *Terbaru*).
4. `research/knowledge-ontology-2026-11-18.md`: the reasoning behind the model (naming superseded).
5. `framing-and-impact-2026-11-17.md`: the case and the competition.

### 25.1 Private communities: what we have, and what "just talk" still needs

The owner wants a commons where people can simply talk in a private community, separate from private spaces on a self-hosted PDS. Read from the code on 19 November:

- **What exists and is right:**
  - Communities can be public, listed-private (name visible, talk members-only) or hidden-private (invisible to non-members), with open, approval or invite admission.
  - Private communities cannot publish to AT (`src/core.ts`).
  - Search, feeds, knowledge notes, the resident and agent access all exclude them (`src/search.ts`, `src/knowledge.ts`, `src/resident.ts`, `src/agent-access.ts`, governance tests).
  - Founding with two people, and invite links (`src/founding.ts`).
  - DMs have an experimental client-encrypted slice.
- **What is missing:**
  1. **The honest notice.** The community page says "Isi hanya tersedia bagi anggota saat ini" but not that ETNOS's operator can technically read it. Only the Spaces lab says so. Owner question §22.3 already proposed adding it; it matters for consent and for the juknis honesty rule.
  2. **A talk view.** Posts are threads only. A simple *Obrolan* view (one chronological stream, newest at the bottom, voice notes inline, refresh on focus) would make a private room feel like a group chat without a new data model.
  3. **Voice notes in private rooms**, behind signed member-only URLs, deletable by their maker.
  4. **Storage isolation.** §7 planned one Durable Object per private room; today all communities share the node's database. Keep as planned, after the proposal.
- **Not for now:** end-to-end encrypted groups (the DM slice shows the way; group keys and recovery are open problems in `architecture.md`). Clan spaces on a self-hosted PDS stay the roadmap path for strong privacy, and AT Spaces (1 December) brings access control, not encryption.

### 25.2 Order *(revised 19 November after the owner's answers; estimates are the agent's working time, not measured)*

The owner set the **multi-identity PDS first**, so people can log in and post, and replaced the three flagships with one northstar: **Kamus komunitas** (`research/community-dictionary-2026-11-19.md`), a dictionary and grammar that grow from how people talk.

| Order | What | Time | Detail |
| --- | --- | --- | --- |
| 1 | **Run 2: multi-identity PDS** (task 24) | as planned | `research/pds-multi-identity-plan-2026-11-18.md` |
| 2 | Private-room honesty notice; *Obrolan* view | half a day | §25.1 |
| 3 | **Voice notes** (record, validate, store, waveform, transcript, protocol and withdrawal tests; in private rooms too) | 1.5–2 days | multiplex §10 |
| 4 | **Kamus komunitas, seed layer**: TransNewGuinea.org import for catalogue languages; Steltenpool 1969 parsed with its CC BY-NC tag; dictionary block on language pages | 2–3 days | community-dictionary §7, §13 steps 1–2 |
| 5 | Proposal pack (step 10 of §24), citing only what is live | — | `proposal/claims-2026-11-18.md` |
| 6 | **Kamus komunitas, living layer**: room dictionaries, *Izin pengolahan mesin* permission, extraction and evidence, one-tap questions, grammar notes, benchmark | 5–6 days | community-dictionary §13 steps 3–7 |
| 7 | Showcase extras: *Laporan sumber*, *Istilah lahan dan citra satelit* with a Mee room's pins, video posts, Jadwal Aksara slots with OpenUI cards (Run 3) | as time allows | multiplex §17 |

**Progress 19 November:** step 1 is built and tested locally (not deployed): many accounts per Worker, invite sign-up at `/akun/baru`, OAuth with an account step, ETNOS sign-up through its own host (`research/pds-multi-identity-build-2026-11-19.md`). It now waits on the owner's spike, DNS and PLC approvals listed there.

Steps 2–4 fit before the proposal only if Run 2 lands by about 23 November; otherwise the proposal describes them as *rencana* and shows step 4's seed import if it is live.

### 25.3 Small decisions recorded this session

- **Cards are OpenUI** (`@openuidev/svelte-lang`, MIT), decided by the owner to minimise custom code (Jadwal Aksara §8.5, community-dictionary §12). Decided, not built.
- **Seeding from TransNewGuinea.org** (CC BY 4.0) is approved; the owner will contact its maintainers after the proposal. Living Dictionaries is a sync target, not something we rebuild (community-dictionary §11).
- **Open owner question:** may a private room's talk be read by a model to build its dictionary (*Izin pengolahan mesin*), and only on a local model? This changes §7's rule for those rooms (community-dictionary §6).
- **Voice posts back to AT Protocol.** Once our voice-post record has run in production, propose it as a community lexicon to the Atmosphere. After the proposal, not before (multiplex §10.3).
- **Satellite data.** TESSERA (CC0) by default; AlphaEarth as a second witness where its non-commercial terms allow (owner: both "sound good").
- **No genomics.** Never human data. For plants and animals, only links to public records (multiplex §9.3).
- **Agents** never post video or a synthetic voice; people may post both.

### 25.4 Platform and names *(19 November, later)*

- **Naming rule** (owner): plain, neutral names everywhere; see `naming.md`. Bahasa Tumbuh is now *Kamus komunitas*, Ritme is *Jadwal Aksara*, the reel's selector is *Kartu*, and the supporting flagships are *Istilah lahan dan citra satelit* and *Laporan sumber*. The interface labels to check are listed there for the coding agent.
- **Peoples, languages and private spaces** (`platform-2026-11-19.md` §4): the owner proposed putting each language under its people. Recommended *(proposal)*: a public people page, a private people space that holds the language's community dictionary (like a subreddit's wiki), and a language page linked to one or more spaces rather than nested in one. Several spaces per people are allowed, and none is official (§7 holds). People join by request with a reason, which `join_requests` already supports. No people is ever shown on a profile.

