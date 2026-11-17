# ETNOS for the showcase: what it is and how we build it

17 November 2026, night. A brainstorm with the owner, written down as one plan. It answers the outside review (`research/advisor-review-2026-11-17.md`), records the owner's decisions of 17 November, and settles the open design questions it can. Where it disagrees with `direction-2026-11-16.md` or `strata-model-2026-11-17.md`, this document wins for the showcase build. The build list lives in `open-work-2026-11-17.md`.

Status: **draft for the owner**. Sections marked *proposal* are my calls with reasons; the owner can overturn any of them. Questions only the owner can answer are at the end.

## 1. Dates

- Polish and first people: until Saturday 21 November.
- Proposal upload: about a week after the old 18–19 November date. Exact date still to confirm.
- Showcase: 4–5 December. AT Protocol permissioned data ("Spaces") public beta expected around 1 December (to be checked).
- Pilot: January 2027, for as many people as we can carry, across all of Tanah Papua.

The owner's position: everything on the list gets built before the proposal goes in, not cut. Aksara Node stays a roadmap slide. I agree to try, with one condition: we build in an order where the showcase story is complete after each step, so that if a risky item slips (the serverless PDS above all), nothing else is left half done.

## 2. What ETNOS is, in one paragraph *(proposal)*

ETNOS is a social app for Tanah Papua where people talk, share news, and keep what is known about their places, peoples and languages. It opens already full: every region, regency and language has a page written from public sources, with the sources shown. AI stewards, one per customary region, post a little each day from those sources and ask people what they know; people answer, correct and add their own accounts, and the record keeps both. Language communities can have private rooms that stay theirs. It runs on Strata, an open engine any place-tied community can deploy for itself.

**What leads at the showcase.** The direction document named two things: **Cerita** (stories of Tanah Papua on one map, with sources, and the people a story belongs to say what it means) and **Ruang bahasa** (a private room for each language where people talk in it). The owner had forgotten the first; it was Cerita. The rest (the Strata model, the populated wiki, the map, the seeded communities) is how those two work, not a third headline.

**The demo in one walk** *(proposal)*:

1. Open etnos.space on a phone. Place set to Mee Pago. The feed has posts from people and from Aksara · Mee Pago.
2. Aksara · Mee Pago posts the morning story (Koyeidaba, or another the owner chooses) with its sources folded underneath. A Mee member replies with how their family tells it. That reply becomes a variant on the story's page.
3. Tap the region: the Mee Pago page, with a photo, its regencies, peoples, languages, news, and open questions. Nabire shows both Mee Pago and Saireri, with who says which.
4. Tap Bahasa Mee: the public language page, then the private room (members only), where a word is marked and added to the living dictionary with a voice clip.
5. Share a story card to WhatsApp. It looks like a printed page.
6. Close on the map of everything known, and the printed A4 bulletin with an elder's correction on it.

The Strata model (layers, places, columns) is the explanation slide after the walk, not the opening.

## 3. Thirty people on the free tier

**Where we are.** The site is one Worker in front of one SQLite Durable Object that holds everything. The browser does not poll the server; requests come only from navigation and actions. Observability is turned off, so we have no measured CPU time or row counts.

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

## 4. Accounts: the full AT experience

The owner wants every person to have a real AT account from the start, without signing up at Bluesky first. Today ETNOS sends new people to bsky.social. Running the official PDS needs a VM; the Oracle free tier had no capacity in Singapore.

What already exists: `packages/pds` is an attributed fork of Cirrus (MIT) running on Workers with a SQLite Durable Object and R2, tested locally against the official OAuth client. It hosts **one identity per deployment**. Making it host many accounts is the work.

**Proposal: a multi-account Strata PDS on Workers**, for ETNOS and as the easy deployment path for other communities (beside the official PDS on a VM, which stays supported):

- One Durable Object per account (repository, keys, sessions), plus one directory object for handles, invites and account creation.
- Handles as `nama.etnos.space`, resolved by the Worker at `/.well-known/atproto-did`.
- `did:plc` identities, so people can move their account to another host later.
- Sign-up on etnos.space itself: name, handle, password, and an invite or open mode. The person never sees "Bluesky" unless they want to.
- Posts can appear in the Bluesky app once the relay crawls us, but public AT publishing stays off until the owner turns it on.

**Fallback, decided now so it does not cost a day later:** if the multi-account PDS is not safe by the proposal date, people sign in with an ETNOS account (email link or passkey), stored in our own Durable Object, with a button later to create or connect an AT account that carries their posts over. Every post is stored so that this move is possible. The research in `research/serverless-pds-and-auth-2026-11-17.md` (in progress) decides between the two and covers Spaces, free-plan CPU limits, Bluesky's sign-up checks for Indonesia, and Supabase against Cloudflare-native options.

*Owner note:* Supabase would add a second company and a second free tier that every community deploying Strata must sign up for. Cloudflare-native keeps one account to deploy. I would only use it if the research shows something we cannot do on Workers.

## 5. Places as a table first

Agreed with the reviewer and the owner. A `place_claims` table before any map work:

- `places`: id, kind (country, province, regency/city, district, kampung), name, local names, government code, parent (the administrative spine), coordinates when known.
- `place_claims`: subject (a place, people or language), relation (`in_region`, `indigenous_to`, `spoken_in`), object, state (`whole`, `part`, `contested`), source, quoted sentence, date, who added it. Every membership of a regency in a customary region is a claim, never a column.
- Nabire gets two `contested` claims (Saireri and Mee Pago) with the provincial profile, RPJMN 2020–2024, DAP and Kompas cited.

**Kampung: search only, with a hint.** All kampung from the government codes are loaded for search and for "Usulkan tempat", but they appear in browse lists only once something is attached to them. On the place map each known kampung is a faint dot in the stipple, and the region card says "N kampung tercatat" with the real count. So a person sees that their kampung is known before they search for it. *(proposal)*

## 6. Peoples, languages and how this generalises

The owner wants the model to fit Kalimantan or Aotearoa without code changes. The research in `research/peoples-places-and-public-data-2026-11-17.md` (in progress) checks the standards (Glottolog, ISO 639-3, Wikidata, Native Land, Local Contexts labels, Mukurtu's cultural protocols, BRWA and AMAN, iwi and hapū, Dayak classification) and proposes one schema filled for Nabire, a Dayak example and an iwi example.

The shape I expect, to be checked against that research:

- **Four axes, each its own list**: places (administrative spine), regions (cultural overlays), peoples (and sub-groups, clans where public), languages (and dialects, from Glottolog).
- **Everything between them is a sourced claim** in `place_claims`, as above. No axis sits under another. A language does not live under a people, and a people does not live under a place, because the sources show them crossing: Mee is spoken in Paniai, Deiyai, Dogiyai and Nabire; Nabire sits in two regions. This is the "continuum, not a tree" of the strata model, made into a table.
- **A deployment's steward regions** are one overlay scheme marked as the one that gets an Aksara each. Tanah Papua: the seven wilayah adat. Aotearoa might choose iwi regions; Kalimantan might choose provinces or Dayak groupings. The pack decides; the engine does not know about wilayah adat.

## 7. Language rooms *(proposal)*

The owner asked whether to go fully like Reddit (one community per language), one Space per organisation with communities inside, a catalogue entry that prompts someone to open a room, or a tree of language under people under place.

My recommendation combines the first and third, and leaves the door open to the second:

- **Every language has a public page** from the start (Glottolog data, where it is spoken, the peoples linked to it, published dictionaries, a word a day from published sources). That is the catalogue the owner already has.
- **The page has one button: "Buka ruang bahasa ini".** The person who taps it asks to open the room and becomes its first keeper. The room opens when a second speaker joins as keeper, so no room has a single owner. Until then the page shows "Butuh satu penjaga lagi".
- **A language room has two sides.** A public side (words and stories the room chose to publish) and a private side (members only: conversation, voice posts, the living dictionary, unpublished entries). What is said privately never enters search, export, the map or any model. Publishing something is a separate, approved public copy.
- **Not a tree.** A language room is not under a people or a place, for the reasons in §6. The page links to the peoples and places through claims.
- **Organisations later.** When Spaces arrive, a room can be hosted in the Space of an organisation (a language institute, a church, a customary council) instead of ETNOS's. Until then ETNOS hosts it, and the room's keepers decide who joins. This is how "one Space per institution with communities inside" fits without making it the first step.

For the showcase: the Mee room, opened by the owner and one other Mee speaker, with real members. Two or three more opened by the owner's friends in Saireri and Domberai if they want them.

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

**From surveys to policy** *(proposal)*: a finished Tanya warga produces a one-page summary shaped like a Musrenbang proposal (issue, place, what people said, how many answered, the public data behind it), which anyone can download and take to a village or regency meeting. The feature is built and shown; whether a government reads it is not ours to promise.

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

- **Labels and places on posts**: a model suggests the place and topic labels for every post and news item when it arrives; they are attached at once and marked as suggested. Anyone can remove a wrong one with one tap; the author can always. Public posts only on Google's free tier; private rooms never go to a model.
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

The reviewer's alternative (catalogue-only for peoples with no steward) is recorded as rejected by the owner, with the reasoning above. The owner's network covers Mee Pago directly, and Domberai and Saireri through family; that is noted, not required.

## 14. Images

- **Wiki and place pages**: a real photograph at the top where a freely licensed one exists (Wikimedia Commons first), with author and licence under it. Where none exists, the engraving.
- **Cards** (feed, wiki home, share cards): stylised, with the ink-print filter applied to a photo or the engraving. The filter is applied at build time for seed pages, so it costs nothing per request.

## 15. Maps *(proposal)*

The owner does not like a sitewide map. Neither do I: one map for everything ends up showing nothing in particular. Two maps, each where its question is asked:

- **What is known** → Peta wiki, on the wiki home (exists). Lenses: Menurut isi, Waktu, Tempat.
- **Where** → the place map, inside the place switcher. Tapping "Tanah Papua" opens a sheet with search on top and the engraved map below: regions as soft fields, kampung as stipple, tap to choose. On a place page the same map sits at the top, zoomed to it.

**Consolidate the places page.** Since place is a scope, the place page and the place's wiki page become one page: Tentang (the wiki text), Percakapan, Kabar, Komunitas, Data. `/places/...` redirects to it. No separate "Tempat" destination to confuse people.

## 16. Shared cards for WhatsApp

Every wiki page, place, story and post gets a share card that looks like a printed page: engraving or filtered photo, title, one line, the ETNOS mark, the place. Sizes for link previews (1200 × 630) and for status and Instagram stories (1080 × 1920).

- Seed pages and places: cards rendered at build time.
- Posts: the link preview uses the place card with the post text as its description; a "Bagikan sebagai gambar" button draws the full card in the browser, so the Worker does no image work on the free plan.

## 17. Public government data, politics included

*(proposal, scope to confirm)* A "Data" tab on each place: population, schools, health facilities, village fund amounts, the 2024 election results, the regency budget, regulations about the place, each with its source and year. Aksara uses it for Tanya warga and for news context. Rules: figures only from official public sources, always dated; no data about private individuals; elected officials appear only as public office holders with sourced facts. The research (§6) lists the sources and their terms.

## 18. Studio

One place for every operator setting: the agent switches (all eight Aksara), sources, review, packs, communities, organisations, admission defaults, budgets. Rebuilt with the impeccable pass, as an Operate surface: plain, scannable, every setting with one line on what it does.

## 19. What the reviewer said to cut, and what we do

The reviewer advised cutting soft-field regions, agents on the map, seven place agents, the classifier with receipts, embeddings and live placement, the taxonomy switcher, year pages, biocultural features, open calls, the organisation claim flow, kampung seeding, onboarding cards, further engravings, Bacaan terpandu and language spaces beyond the Mee pilot.

The owner's decision: build all of it before the proposal, except Aksara Node, Spaces and one-click deploy, which are roadmap slides (Spaces becomes a demo if the beta ships in time). The order in `open-work-2026-11-17.md` puts the items a judge sees in the walk (§2) first.

## 20. People

The owner can bring more than ten people before 21 November: a Papuan coding community of students and enthusiasts, a steward with family ties in Domberai and Saireri, and Papuan youth voices with large followings in the cities. The 2022 Papuan magazine drive showed people come when asked. The competition team has three seats: the owner, a business lead and a culture and customary lead.

What the build owes them: sign-up that works on a phone in two minutes, open rooms, something to do on the first screen, and no fake people anywhere.

## 21. Questions for the owner

To be filled after the research and the second outside review.
