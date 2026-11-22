# One page system, lembaga, Kios, Situs and a Kamus that starts from nothing

*21 November 2026. Written with the owner's brain dump of the same day. Status marks: **built** (in the code), **proposal** (not built).*

**Decided by the owner (21 Nov, evening):** the one page system, Lembaga as the name, communities by topic and language, Kios, Situs, Percakapan as in section 4, the Kamus as in section 10 including Mode belajar, and the Ensiklopedia front in the superapp shape (section 3a). **Goal: all of it before the 26–27 Nov proposal upload**, built by one Opus worker at a time in the packages of section 13. **Still open:** two voices on the lembaga page, Situs pricing, the land-listing ban (section 12).

Related: [communities-spaces-2026-11-19.md](communities-spaces-2026-11-19.md) (site hierarchy, Periksa), [etnos-model-2026-11-17.md](etnos-model-2026-11-17.md) (layers and columns), [../research/mee-text-sources-2026-11-21.md](../research/mee-text-sources-2026-11-21.md) (coverage test, false friends), [../observatory/README.md](../observatory/README.md) (map and Penampil).

## 1. Why

The owner: "this is getting convoluted even for us. Imagine everyday users." Today the code has four ways to describe a thing in the world, and they overlap:

| Today | Table | What it holds |
| --- | --- | --- |
| Context page (`/contexts/<slug>`) | `contexts` (place, region, topic, language) | Places, regions, languages and topics, with tabs and labels |
| Wiki page (`/wiki/<slug>`) | `wiki_pages`, owned by a community | Reviewed articles |
| World-model entity | `km_entities` (12 classes: tempat, makhluk, kelompok, lembaga, orang, benda, bahasa, gagasan, praktik, peristiwa, musim, cerita) | The knowledge map, EntityPanel |
| Penampil record | `objects.json` (static) | 3D objects, species, landforms, media |

Organisations have three names on the site (Organisasi, Institusi, Kelompok), and "Sumber" holds research while datasets live under another tab.

## 2. First principles: four kinds of thing

Everything a person sees on ETNOS is one of four kinds:

1. **Entri.** Anything you can know about. A place, a wilayah adat, a language, a people, a species, a mountain, an object, an event, an idea, a practice, and also a lembaga as a subject. It has a kind and it never "belongs" to anyone. Internal name: entity. User-facing name: *halaman* or *entri*, never "thing".
2. **Akun.** Whoever acts: a person, a lembaga, an Aksara.
3. **Ruang.** Where people talk: komunitas, and direct messages. A ruang is owned by a person or a lembaga.
4. **Jejak.** What people and sources leave behind: posts, kabar, sources, datasets, photos, sound. A jejak lives in a ruang or a source, and it points at entries ("tentang").

Five relations connect them, and these give every hierarchy we need:

| Relation | From → to | Example | Exists today as |
| --- | --- | --- | --- |
| *tentang* | jejak → entri | A post about Danau Paniai | `record_contexts` (post, group, wiki, work) |
| *berpusat di* / *memakai bahasa* | ruang → entri | Petani Kopi Moanemani is in Dogiyai and writes in Mee | community labels |
| *adalah / mengelola* | akun (lembaga) → entri | The Dinas Kehutanan account claims the Dinas Kehutanan entry | not yet (proposal) |
| *bagian dari* and other typed links | entri → entri | Danau Paniai is part of Kabupaten Paniai; Ekari is spoken in Paniai; Paradisaea apoda lives in lowland forest | `km` statements, the place tree |
| *anggota* | akun → ruang, akun → lembaga | Memberships and roles | `memberships`, `groups` |

What this settles:

- **Not every entry has communities, and that is fine.** A section appears when something points at the entry. A species page has no Komunitas section until a community labels itself with it. Sections come from relations; the template never assumes them.
- **Different hierarchies are just different relation chains.** A place climbs Kampung › Distrik › Kabupaten › Provinsi › Tanah Papua, with wilayah adat as an overlay. A language climbs to its family through Glottolog, and a species to its genus and family through GBIF. One breadcrumb and one rail component draw them all.
- **Wiki is not a separate kind of page.** A reviewed article is the *Tentang* text of an entry. A community's internal notes (its own wiki) stay inside the community as *Catatan*, and they can be published to an entry with approval, as today's release rule says.
- **The Penampil record is not a separate kind either.** A 3D object or photo set is media on an entry, and the viewer opens any entry's media.

## 3. One entry page

**Built 21 November 2026 (P1)**, as an adapter over today's tables with no storage change: `GET /v1/entri/:slug` and `GET /v1/entri` (`src/entri.ts`, `src/entri-store.ts`), the page (`apps/web/src/EntryPage.svelte`), the Letak rail (`EntryRail.svelte`) and the client redirects (`entry-routes.ts`). The Kios block of the rail waits for P3.

**Which address wins (built).** The rule lives at the top of `src/entri.ts` and is tested in `test/entri.test.ts`:

1. `notes`, `data`, `peta`, `lihat` and `jenis` are routes, never entries.
2. A wiki page id opens the entry whose article that page is, or the page on its own when it describes nothing else yet. The id stays an alias.
3. A context (place, region, language, topic) owns its slug.
4. A thing of the knowledge model that names a context is that context's entry, and its own slug becomes an alias. One whose slug a different context already holds gets `<slug>--<class>` (Puncak Jaya the mountain is `puncak-jaya--tempat`, beside the regency `puncak-jaya`).
5. A viewer record that is about no thing of the model is an entry of its own, with the same rule. Its id is an alias.

An entry's article is the labelled page with exactly its name (or its kind word in front, such as *Kabupaten Paniai*), else the only labelled page that starts with that kind word; for a thing or a record, a public page with exactly its title. Contexts choose first, so one page has one entry. Today `km_entities` is empty on etnos.space, so the adapter reads the public seed (`src/catalogues/tanah-papua-knowledge-seed.json`, the file behind `graph.json`) until rows are imported; stored rows then win.

One template for every kind. The URL stays under `/wiki/<slug>`, because Indonesians already read `/wiki/` as an encyclopedia address (id.wikipedia.org/wiki/…). `/contexts/<slug>` redirects there. The label on the page can say *Ensiklopedia* while the URL says wiki. The owner leans towards Ensiklopedia; the URL works for either name.

```
┌───────────────────────────────────────────────┬──────────────────────┐
│ Tanah Papua › Meepago › Paniai                │ LETAK                │
│ Danau Paniai                     Danau · Tempat│ ▸ Tanah Papua        │
│ [ foto / relief, tap → Penampil ]              │   ▸ Meepago (adat)   │
│ Tentang · Percakapan · Riset dan data · Riwayat│     ▾ Paniai         │
│                                                │       • Danau Paniai │
│ Tentang                                        │ KOMUNITAS DI SINI    │
│  article (reviewed) + fact box                 │ LEMBAGA TERKAIT      │
│  kind module: map, sebaran, Kamus, etc.        │ KIOS DI SINI         │
│  Yang belum diketahui                          │ TERKAIT (graph)      │
│  Dasar label (small, at the foot)              │                      │
└───────────────────────────────────────────────┴──────────────────────┘
```

- **Tabs, four at most:** Tentang · Percakapan · Riset dan data · Riwayat. *Riset dan data* merges today's Sumber (OpenAlex research) with Data (datasets), because both answer "where can I read or download more". *Komunitas* moves to the rail, since it is a list of places to go, not something to read.
- **Kind modules sit inside Tentang, never as new tabs:** a map and Kabar for places; public Kamus entries and the communities that write in it for languages; sebaran, photos, sound and *nama lokal* for species; relief and facts for landforms; the lembaga module for lembaga (section 5).
- **The rail is the *Letak* navigator,** a general version of today's region stack ("Letak di antara wilayah adat"). It shows the entry's place in its chain with the current one open, then the communities, lembaga and Kios that point here, then graph neighbours. On phones it becomes one row of chips under the title. This answers "underutilising the rail".
- **The Ensiklopedia front is a superapp grid,** and the Penampil gets its catalogue inside. Both are in section 3a.

### 3a. The Ensiklopedia front, shaped like a superapp

**Built 21 November 2026 (P1):** the front (`apps/web/src/EnsiklopediaFront.svelte`), kind pages with sub-kind circles (`KindPage.svelte`, `/wiki/jenis/<kind>`) and the Penampil strip (`Viewer.svelte`, `?daftar=`, `?semua=1`). The persistent bar for an unfinished task is not built. *Peristiwa* sits under *Lainnya* only once an entry of that kind exists, and *Kata minggu ini* shows only when a public Kamus has words checked in the last seven days (none today).

The owner shared three Gojek screens on 21 Nov. They are not a visual reference. They show an information hierarchy:

- **Everything is visible at the top,** and you go deeper by tapping.
- **Each entry point carries a small live fact:** "~7K", "50%", "30 mins".
- **A personal state card comes with three quick actions** (balance; Pay, History, More).
- **Below that are themed rows,** each with "See all".
- **One persistent bar** keeps an unfinished task within reach (the cart).

Today's /wiki does the opposite. It opens straight into the knowledge map and a search bar, which is deep and hard to act on.

The front, top to bottom:

1. **Search and the place scope** ("Tanah Papua" by default), as now.
2. **A state card for you:**
   - It says what is waiting nearby: "14 pertanyaan menunggu di Meepago".
   - It has three quick actions: *Jawab* (opens the Periksa deck), *Tambah* (an entry, a word, a photo) and *Riwayat* (what you added).
   - A visitor who is not logged in sees the same counts with "Masuk untuk membantu".
3. **The kind grid.**
   - It has eight tiles plus *Lainnya*: Tempat, Bahasa, Suku, Makhluk hidup, Bentang alam, Benda, Lembaga, Kamus, then Peristiwa, Data and Peta under Lainnya.
   - Each tile carries one live badge from real counts. Examples: "1.2K" entries, "+12" new words this week, "3" waiting for a check.
   - Tiles are plain icons from the site's set on tinted squares. There is no 3D clip art and no promotional colour.
4. **One feature card,** the compact knowledge map: a small live preview with the lens pills. Tap it to open `/wiki/peta` full screen. The map stays a strong first-screen moment without being the whole page.
5. **Themed rows, each with *Lihat semua*:**
   - *Benda, spesies dan bentang alam* (Penampil cards);
   - *Belum diketahui* (gaps people can fill);
   - *Baru diperiksa*;
   - *Di sekitar [scope]*;
   - *Kata minggu ini* (from the Kamus).
6. **Sub-kind circles inside a kind page,** for example burung, kupu-kupu, pohon under Makhluk hidup, or gunung, danau, sungai under Bentang alam. They work like Gojek's food category circles.

**Penampil with its catalogue inside.** The owner liked the viewer and asked for "a small preview and an expandable thing".

- **A strip of thumbnails at the bottom of the viewer** comes from the list you arrived from (a row, a kind, a search, a map selection). It is collapsed to one line by default.
- **Swipe or use the arrow keys** to step through the list, with the counter "3 / 14".
- **Drag the strip up** to expand it into a full grid with filters, then tap to switch.
- **The viewer shell stays mounted while you step.** Only the body changes, and the lazy bodies already exist, so stepping costs no reload.
- **The address updates** (`/wiki/lihat/<id>?daftar=<list>`), so back and sharing keep working.

### Migration path

`km_entities` already has the richest class list, so it becomes the one table. Every `contexts` row becomes an entity (place → tempat, region → tempat with an overlay flag, language → bahasa, topic → gagasan), and `record_contexts` points at entity slugs. `wiki_pages` that describe an entity become its Tentang revision history. Penampil records move from `objects.json` into entity media. This is the biggest piece of work here and it should come after the proposal upload (section 9).

## 4. Percakapan: how posts reach an entry

From cheapest and most accurate to most automatic. Steps 1 to 3 need no model and are enough for the showcase. **Steps 1 to 3 and the tab are built (P4, 21 to 22 November)**; step 4 is designed below and not built.

1. **The author tags it** (**built**). Typing a name in the composer suggests an entry, as @mentions do for people. The author decides.
2. **Inherited** (**built**). A post in a community labelled Dogiyai shows on Dogiyai. Only labels with the role `about` count since P3; a community that writes in Mee does not put its posts on the Mee language page. The Dibicarakan ranking follows the same rule now.
3. **Suggested by name match** (**built**). After a public post, a match against entry titles and aliases offers "Tandai *Danau Paniai*?" to the author. Deterministic, explainable, no model.
4. **Suggested by a decision model, later and only for public text.** [Gemini Decision 1](https://www.kdnuggets.com/introducing-gemini-decision-1-a-model-that-picks-answers-instead-of-writing-them) (launched 11 November 2026) is real. It answers closed questions such as yes/no, choice from 2 to 255 options, or a rubric score, in one pass with a calibrated confidence. It costs $0.10 per million input tokens and output is free. For 10,000 posts of about 400 tokens that is about $0.40. The fit: candidate entries come from name match and the existing vector index, then one yes/no per candidate ("Apakah tulisan ini membahas Danau Paniai?"). The result is shown as a suggestion that a person confirms. Limits:
   - Only text that is already public, under the owner's rule that no hosted model reads a private community.
   - The free tier in AI Studio may use content to improve Google's products, so use the paid tier, or accept the free tier only for public posts.
   - A local fallback is an embedding plus threshold on the operator's own machine.
   - Clustering belongs to Kabar (news clusters, #84), not to Percakapan.

**What is built (P4).**

- **Where tags live.** A tag on an entry that is a context (a place, a region, a language, a topic) is a `record_contexts` row with record kind `post`, the relation that section 2 names, so the older readers keep working. Any other entry (Danau Paniai and Puncak Jaya the mountain from the knowledge model, a species, an object, a page) is a row of the new `post_entries` table, keyed by the entry's address, because `record_contexts` can only point at a context. The row keeps the title and kind word for the post's chips. One module reads and writes both (`src/tentang.ts`). When contexts move into one entity table (the migration path above), `post_entries` already holds addresses.
- **Rules.** At most five tags per post across both. Only the human author of an opening post in a public community tags it, at posting or later with *Ubah tentang* in the post's menu (`POST /v1/posts/:id/tentang`). A post in a private community cannot be tagged. Deleting a post removes its tags.
- **The matcher** (`apps/web/src/tentang-match.ts`, shared by the composer and the server). It is case-insensitive, matches whole words, takes the longest name at each place, and skips links and mentions. A topic's name is an everyday word (Kesehatan, Sejarah), so topics are found only in the Tentang search. A language matches with *bahasa* in front, because many short language names are also Indonesian words (Itik, Sawi, Nabi) or names of peoples and places. A place also matches with its kind word in front (*Kabupaten Paniai*), and a one-word name that is everyday Indonesian (*Papua*, *Puncak*) or shorter than four letters matches only in that longer form. The names come from `GET /v1/tentang/names`.
- **In the composer** (`TentangPicker.svelte`). Chosen entries are pills, *Tentang* opens a search over every entry, and names found in the text are dashed pills with their kind under *Disebut di tulisan*. A name that two entries share shows both (*Puncak Jaya · Kabupaten* and *Puncak Jaya · Gunung*). Writing from an entry page starts the post with that entry.
- **"Tandai …?"** (`TandaiPrompt.svelte`, `GET /v1/posts/:id/tandai`). After a public opening post, one compact card asks about each name the post is not yet tagged with and that its community does not already give it, up to three, one at a time. A shared name asks the author to pick by kind. The server answers only the author; a private post gets no suggestions.
- **The Percakapan tab** (`GET /v1/entri/:slug/percakapan`). Public opening posts that are tagged, inherited or that link to the entry, newest first, twenty at a time, each with a line that says how it got there (*Ditandai oleh penulis*, *Dari komunitas …*, *Tentang Paniai*). *Termasuk tempat di dalamnya* adds the posts of the places and entries inside it (a wilayah adat shows its regencies). An empty tab invites the first post with the entry preset. Visibility, hiding and deletion are read when the tab is read, and the tab reads as an anonymous reader whoever asks, so a member never sees a private post there either. Tests: `test/percakapan.test.ts`.

**Step 4, designed and not built: how Gemini Decision 1 would check candidates.** Nothing in P4 calls a model, and no key is stored.

1. **Candidates come from what is built.** The name matcher gives candidates for each public post, and the vector index (`src/vector-index.ts`) can add the nearest entries for posts that name nothing. Only posts in public communities that are not hidden or deleted are read, and visibility is checked again right before the call.
2. **One closed question per candidate.** "Apakah tulisan ini membahas *Danau Paniai* (danau di Kabupaten Paniai)?" with the post's public text and title, yes or no. The entry's kind and place are in the question, so the regency and the mountain called Puncak Jaya are two separate questions.
3. **A threshold, then a person.** A yes above a set confidence (start at 0.8 and tune on a hand-checked sample) becomes the same "Tandai …?" card for the author, never a tag. Below it, nothing is shown. The author's answer is stored as the label for later tuning, and a declined candidate is not asked again.
4. **Cost and account.** The paid tier is used, so public text is not used to train the provider's models. The call runs from the server in a background job with a daily budget, like the Aksara jobs. A local embedding with a threshold on the operator's machine is the fallback.

## 5. Lembaga

**Name: Lembaga, not Institusi, and not Organisasi.** This is a push-back. In everyday Indonesian, *lembaga* covers all of these: Lembaga Masyarakat Adat, a dinas (lembaga pemerintah), a yayasan, a gereja or klasis, a school, a campus, a sanggar. *Institusi* sounds academic, and *Organisasi* sounds like a student club. The site currently says all three (App.svelte, CommunityDirectory.svelte, FeaturePages.svelte); this proposal makes them one word.

**Jenis lembaga** are sections on the Komunitas page, built from today's `institution-kind` facet: Adat · Pemerintah · Agama · Pendidikan · Kesehatan · Masyarakat sipil (yayasan, LSM, sanggar) · Usaha dan koperasi · Media.

**What a lembaga is in the data:** an akun with members and roles. It already exists as `groups` (kind `institution` or `collective`, roles owner, steward, member), and `spaces` links a group to its many communities. **Built.** A lembaga can hold:

- communities, public or private (**built** in data, needs pages);
- an Aksara, if it connects an Aksara Node;
- a Kios (section 7);
- a Situs (section 8);
- a claimed entry.

**One page, two voices.** A lembaga is both an actor and a subject of the encyclopedia. Mixing those lets a lembaga rewrite its own encyclopedia entry, a conflict of interest that Wikipedia fights constantly. Proposal: one URL with two clearly labelled parts.

- **Dari lembaga ini:** their own words, photos, communities, Kios, a link to their Situs. Editable by its stewards.
- **Di ensiklopedia:** reviewed facts with sources, edited through the normal review.

An unclaimed listing (etnos-model step 4: "institutions listed by kind and place, unclaimed until they claim them") is an entry without the first part. Claiming adds it. Recognition by a customary body stays a sourced claim, never a badge we grant.

**What is built (P3, 21 November).**

- **One word** (**built**). The interface says *Lembaga* everywhere. The data kinds stay `institution` and `collective`, and the form offers *Lembaga* or *Kelompok atau perkumpulan*.
- **Jenis lembaga** (**built**). Komunitas, then the Lembaga tab, shows one section per jenis that has a lembaga, in the order above, with a jump row. Lembaga without a jenis go under *Lainnya*, and a search lists them flat (`apps/web/src/lembaga-jenis.ts`). The catalogue titles are now Adat, Agama, Pendidikan, Masyarakat sipil and Usaha dan koperasi, and *Kesehatan* is the new jenis `layanan-kesehatan`, because the slug `kesehatan` is already a topic. Old titles stay in `previousTitles`. Stewards set the jenis on the lembaga page (`POST /v1/groups/:id/jenis`).
- **Two voices** (**built**, `LembagaPage.svelte`, `src/lembaga.ts`). *Dari lembaga ini* holds the lembaga's own text, a logo (WebP up to 128 KB), up to six contacts, a website, its public communities, its Kios and a note that the Situs is not available yet. Stewards edit it in one dialog (`lembaga_profiles`). Communities are listed only when public, or when the reader is a member. Hidden ones show as a count, and the lembaga can turn the count off (`hide_count`). A forming community is never counted. Recognition is written as "Lembaga ini menyatakan diakui oleh …" with an https source each, plus a line saying ETNOS does not check or grant recognition. *Di ensiklopedia* shows the claimed entry's card, the reviewed article excerpt and its facts, which change only through normal review.
- **Claiming** (**built**, `entry_claims`). A steward of a public lembaga asks either to link an existing *lembaga* entry or to create an unclaimed listing (`entry_listings`: title, description, jenis, place). The operator approves or declines on the lembaga page (`/v1/entry-claims`), and the request is checked again when it is decided. An approved claim shows *Dikelola oleh …* in the entry's Letak rail and chips. One entry has at most one lembaga, and one lembaga claims at most one entry. Both rules and the one-pending-request rule are unique indexes. Listings never write `km_entities`, so the seed stays intact. Tests are in `test/lembaga-kios.test.ts`.

## 6. Communities: creation, purpose, language

- **Founding already needs two people.** This is the quorum the owner remembered. The founder gets a waiting room and a link; the room opens when one more person accepts, and lapses after 14 days (`src/founding.ts`). **Built.** Keep it. A separate quorum (1 to 9) sets how many checks a Kamus answer needs (`claim_settings`). **Built.**
- **No "type" picker with Bahasa as one of the types.** The owner noticed the flaw: a community about farming or church or history can write in Mee. Two separate, optional fields at creation instead:
  - *Tentang apa / di mana:* entries the community centres on (topic, place, people).
  - *Bahasa yang dipakai:* the languages people write in.

  **The Kamus switches on from the second field**, whatever the topic. That is the flagship, "talk becomes knowledge", working in any community that writes in a Papuan language.
- *Dikelola oleh:* if the founder is a steward of a lembaga, they choose whether the community sits under it.
- **No marketplace community type.** Selling belongs to accounts (section 7).

**What is built (P3, 21 November).** The three fields appear at creation and in the community settings, from one component (`CommunityLabels.svelte`). The community page only displays them (`CommunityPlaces.svelte`), with an *Atur label* link for stewards.

- **Roles in the data.** `community_contexts.role` is `about` or `language`. The migration marks every existing label whose context has kind `language` as `language`, so communities that already had a language label keep their Kamus. A label sent without a role keeps the old behaviour.
- **Kamus.** The Kamus reads only `language` labels and skips the contact languages (Indonesian, Papuan Malay and their relatives). Choosing a Papuan language turns it on (`KamusAsk.on` through `kamus.settings`).
- **Hidden communities.** A hidden-private community still takes no public labels, including languages, and its Kamus language stays the operator's choice. The rule and its tests are unchanged.
- **Dikelola oleh.** It shows only to a steward of a lembaga and binds the community through `spaces`, in the same transaction as founding. In settings, the community owner or a steward of the lembaga can remove it.

## 7. Kios

The owner's second idea, and the right one: a person or a lembaga switches on *Kios*, and their open offers show as a small shop in their profile rail and on the place entries they sell in ("Kios di Wamena"). *Kios* is the everyday Papuan word for a small shop.

- **Already half built.** `offerings` holds offer or request, price, unit, place, status and expiry, and communities have a Penawaran tab. Kios is a view of an account's open offerings plus a toggle. Small work, big showcase: mama-mama Papua selling noken, pinang, sayur and kopi Moanemani, findable by place.
- **Listing only: no checkout and no payment.** People contact by Pesan or WhatsApp. This is simpler, and it is also what the law allows. [Permendag 31/2023](https://www.kemendag.go.id/berita/pojok-media/zulhas-resmi-berlakukan-permendag-312023) Pasal 21(3) forbids social-commerce platforms from facilitating payment transactions on their system.
- **House rules from day one:**
  - No protected wildlife or its parts. Cenderawasih feathers are the obvious case.
  - No alcohol.
  - **No land sales.** Tanah ulayat is the most contested thing in Papua, and a social platform listing land plots invites harm. The owner should confirm this rule.

**What is built (P3, 21 November).**

- **The switch** (**built**, `src/kios.ts`, `KiosBlock.svelte`). *Buka kios* is on a person's own profile and on a lembaga page, for its stewards. Opening it shows the house rules and an optional WhatsApp number, and nothing opens until the rules are accepted.
- **What a Kios shows.** A person's Kios lists their open offers. A lembaga's Kios lists its members' open offers in the lembaga's public communities. Only offers from public communities appear, read as an anonymous visitor would read them, so an offer from a private community never reaches a public Kios or its API.
- **Where it shows.** It sits in the profile or lembaga rail from 1360px and inline above the tabs below that.
- **Place entries** (**built**, `KiosPlace.svelte`). *Kios di …* lists open offers placed at the place or anywhere below it, from open Kios only. It sits in the Letak rail from 1200px and in *Tentang* below that, so the list never shows twice.
- **Listing only.** Contact is by *Kirim pesan* or a `wa.me` link, with "Pembayaran tidak lewat ETNOS".
- **House rules** live in one list in `src/kios-rules.ts` (`satwa`, `alkohol`, `tanah`). New offers, and edits to an offer or its post, are checked by keyword and refused with 422. Reporting uses the existing post reports. **The land rule waits for the owner:** delete the `tanah` line to remove it.

## 8. Situs: a lembaga's own website at nama.etnos.space

The owner's idea and the long Sonnet write-up agree on the core, and so do I. A Situs is **a presentation of the lembaga's existing public data**, not a second CMS. It is built from typed blocks (hero, tentang, kegiatan, galeri, publikasi, komunitas, kios, kontak), with no arbitrary HTML or JavaScript. It is published as a cached snapshot, so a page view never depends on a PDS being up.

Where I'd change the Sonnet write-up:

- **Pricing.** Rp50–100k a month does not match how yayasan buy websites in Papua. They pay once for "bikin website", then the site dies when the hosting lapses. The owner's Rp300rb is closer to real buying. What people pay for is the work, not the hosting: on Cloudflare a wildcard route plus Universal SSL makes the subdomain cost about nothing. Proposal:
  - **Gratis:** the lembaga page on etnos.space, made beautiful. Nobody needs to pay to exist.
  - **Situs, Rp300rb once:** `nama.etnos.space`, a template, colours and logo, a draft written with Aksara by interview, and one round of polish. It stays up as long as the lembaga is active; it never goes dark for non-payment.
  - **Own domain, yearly:** `yayasanbenihpapua.or.id` through [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/). 100 custom hostnames are included on the Free plan, then $0.10 each. The yearly price is the domain cost plus a small margin.
  - **Disponsori:** a foundation pays for ten lembaga. This is the Sonnet idea worth keeping.
  - **Always exportable** as `situs.yaml` plus media. No hostage content.
- **Honest sustainability.** 100 Situs is Rp30 juta. Useful, not a business on its own. The bigger lines stay the Aksara Node and sponsored activations; the Situs is the door to both. The Aksara interview gives a lembaga its first taste of having an agent.
- **The interview and the model rule.** A lembaga choosing to hand its own material to Aksara for a website is not a model reading a private community, but the interview should say which model reads it, and offer the local model where the deployment has one.
- **Routing.** One dispatcher for `*.etnos.space`:
  - `/.well-known/atproto-did` goes to the identity host, since the same name is also an AT handle;
  - everything else goes to the Situs renderer, or to the lembaga page if there is no Situs;
  - a reserved-names list protects pds, www, api and the like.

  Today the identity host answers every path on a handle hostname with a 404 except the DID file, so this dispatcher is new work.
- **In ETNOS or not.** The schema, renderer, templates and dispatcher go in ETNOS (AGPL), so any deployment can host sites for its own lembaga. Payment stays outside ETNOS. A deployment flag, *situs aktif*, is switched by the operator, at first after a QRIS transfer. A payment gateway (Xendit, Midtrans) needs a badan usaha and can wait.

## 9. YAML as the shape of everything

One family of small files, validated by JSON Schema. Forms in the interface write the same files, and export is the file itself:

| File | Holds |
| --- | --- |
| `etnos.yaml` | A deployment: name, root place (Wikidata ID), languages, catalogues on, news sources, model provider |
| `lembaga.yaml` | A lembaga: profile, jenis, places, contacts, communities |
| `situs.yaml` | A Situs: template, theme, blocks that point at lembaga data |
| `kamus.csv` (CLDF columns) | A seed word list with source and licence per row |

A free model can draft any of these from a conversation, and a person reviews it before it is used. This is how "easy to set up for everyone else" becomes concrete: a new region's operator answers questions, and Aksara writes `etnos.yaml`.

## 10. Kamus: how any language community starts, even with no data

**Decided:**
- the notice card;
- the *Artinya* field;
- *Ucapkan kata ini*;
- highlights in posts that ask rather than tell.

The Kamus must work for every Papuan language, not only Mee. Mee is the pilot.

### Where words come from

1. **The community's own writing.** Count words across its posts. No model is needed. A word used three or more times by two or more people that is not in the Kamus becomes a question: "Kata *X* sering dipakai di sini. Artinya apa?" This works for a language with zero published data.
2. **Existing lists, when they exist:**
   - Steltenpool 1969, already seeded, CC BY-NC.
   - Hubert Takimai's work. The owner is contacting his son Michael, and has bought the book; digitising it needs the family's or publisher's permission.
   - [PanLex](https://panlex.org/) is CC0 with 5,700 languages. Its API did not answer from here, so its Papuan coverage is still to check.
   - Wiktionary.
   - Lexibank and CLDF word lists, CC BY.
3. **A core concept list.** This is the strongest start for a language with nothing. Concepticon's concept lists (the Swadesh and Leipzig-Jakarta lists), as pictures where possible, become *Kata hari ini* questions that Aksara posts once a day: "Apa kata Mee untuk *hujan deras*?" They run in the reverse direction, from Indonesian to the local language, and answers arrive as ordinary replies.
4. **Pictures from the Penampil.** "Apa nama burung ini dalam bahasa Mee?" with a photo of a Cenderawasih kuning besar. The answer links the word to the species entry as a *nama lokal*. This joins the Observatorium and the Kamus: species pages fill with local names per language, which is exactly the knowledge that is missing.
5. **Parallel text from *Artinya*.** A post written in Mee with its own Indonesian translation is the best evidence there is (see below).

### Highlights in posts

- **Never every word.** Underlining every word makes posts unreadable and teaches nothing.
- **A dotted underline marks only an open question:** an unconfirmed seed match, a frequent unknown word, or a "Bentuk dari *ibo*?" stem match. At most one per sentence and three per post, most frequent first.
- **Every word can still be tapped.** Tap or long-press any word to get the card. If the word is not in the Kamus, the card says "Kata ini belum ada di kamus" with "Tulis arti". So a language with no data works on the first day.
- **The card** is a solid primary card, built with shadcn-svelte as the Kartu work does. It shows:
  - the question ("Artinya *besar*?");
  - Ya / Bukan / Tidak tahu;
  - word-class chips: benda, kerja, sifat, lainnya;
  - "Tulis arti";
  - "Ucapkan";
  - the source in small text.
- **Checked words carry no underline by default.** A *Mode belajar* toggle tints checked words by word class, which gives the owner's coloured highlights. It is opt-in, so posts stay clean for everyone else and learners get a reading aid.
- **Skip proper names.** As a first rule, skip capitalised words that are not at the start of a sentence.

### Word classes without a tagger

- **Do not run a POS tagger or an LLM over Mee.** No tagger exists for Papuan languages, and an LLM would be confidently wrong; the coverage test already showed false friends with a real dictionary.
- **Ask people instead,** with the chips.
- **Use the *Artinya* text as a projection trick.** Tag the Indonesian side, where good taggers exist and a small rule set even works. Then align Indonesian and Mee words across many posts by co-occurrence (a Dice count, with no machine learning). This yields candidate meanings and classes, offered as questions: "Artinya *rumah*? (kata benda)". This is annotation projection (Yarowsky and Ngai 2001). It is weak with five posts and useful with five hundred.
- **Learn suffixes from answers.** Each "Bentuk dari…" answer teaches the community's suffix list, which a steward can edit.

### The flow

1. **The notice card at the top of the community.** It appears once there are ten or more open questions: "12 kata baru minggu ini. Bantu periksa." It opens the full-screen swipe deck (`PeriksaDeck`, **built**). The deck gains a correction field, word class and "Ucapkan".
2. ***Artinya*.** Posts in a community with a non-Indonesian *Bahasa yang dipakai* get an optional second box, "Artinya dalam bahasa Indonesia", shown under the post as "Lihat artinya". This helps readers who do not speak the language, and it gives the Kamus its evidence.
3. ***Ucapkan kata ini*.** A clip of five seconds or less per word, with consent per clip and the same visibility as the Kamus entry. It depends on voice notes (#69, R2 storage).
4. **Export.** The community downloads its own Kamus as CSV or CLDF at any time.

### What is built (P2, 21 November)

The Kamus in posts is **built**: server in `src/kamus-ask.ts` (with `src/kamus-export.ts`), the shared tokenizer and matcher in `apps/web/src/kamus-text.ts`, tests in `test/kamus-ask.test.ts` and `test/kamus-text.test.ts`. No model reads anything; every step makes a question.

- **On or off.** The Kamus is on wherever a community has a language: today its language label with a glottocode, or the operator's choice (`KamusAsk.on`; since P3 it reads only *Bahasa yang dipakai* labels). Counting words across posts (frequent new words, *Artinya* alignment, the notice card) also needs the steward switch *Baca percakapan untuk mencari kata* in the Kamus tab, which is off by default. Matching the words of the post on screen does not.
- **Tokenizer and matcher** (**built**): numbers, links, mentions and capitalised words that do not start a sentence are skipped; headword, *tulisan lain* (Steltenpool variants are now kept), then one suffix off. Mee's suffixes (-kodo, -make, -ida, -iga, -ko, -ka, -ya) are the default; stewards edit the list, and checked *Bentuk dari* answers offer new suffixes. Contact-language words are never underlined. Markdown posts are read without link targets.
- **Underlines** (**built**): dotted, in the accent colour, only on open questions (a seed meaning, *Bentuk dari*, a meaning from translations, a frequent new word), at most one per sentence and three per post, most frequent first. Visitors see none. Every other word opens the card on tap.
- **The card** (**built**, `KamusCard.svelte`): a solid accent card with *Ya / Bukan / Tidak tahu*, word class chips, *Tulis arti*, *Simpan ke Kata saya* and the source with its licence. A source question becomes a Periksa claim (`claims.origin='source'`) the first time anyone answers it, and the member who opened it may answer it too; a written meaning becomes a member's proposal. Word classes follow the same quorum, counted per member (`kamus_classes`).
- **Kata saya and Kamus komunitas** (**built**): `kamus_mine` is private to the member and readable only while they can read the community. Entries carry headword, *tulisan lain*, gloss, definition, word class, domain (context), dialect, examples linked to posts, source and licence, status, and the *Jangan disebarkan* flag (`kamus_entries.sensitive`, stewards), which keeps an entry from visitors and from species pages.
- ***Artinya*** (**built**): the composer's optional second field, *Lihat artinya* under the post, *Tambahkan arti* for any member, edited by its writer and removed by its writer, the post's author or a steward (`kamus_artinya`). Dice alignment and the Indonesian class rules ask "Artinya *kebun*? (kata benda)".
- **Notice card and deck** (**built**, `KamusTop.svelte`, `PeriksaDeck` with `source="kamus"`): the card shows from ten open questions; the deck adds the correction field and word class chips. Since P3 the Periksa bar and this card are one notice with one *Periksa* button. The Kamus deck comes first, and its last screen offers the other claims waiting in Periksa.
- ***Mode belajar*** (**built**): a per-reader switch that tints checked words by class with a class letter (b, k, s, l) and a legend.
- ***Kata hari ini* and picture questions** (**built**): the Leipzig-Jakarta list (Concepticon `Tadmor-2009-100`, CC BY 4.0, `seed/kamus/leipzig-jakarta-100.json`) asked in Indonesian, and Penampil species with photos. A checked picture answer appears as *Nama lokal* on `/wiki/<slug>` only from a public community. The same word from two members counts as agreement.
- **Cetak kamus and export** (**built**): a print view of the checked Kamus for members, and CSV and a CLDF Dictionary zip for stewards, with source and licence per sense.
- **Not built.** *Ucapkan* and *Jawab dengan suara*: media storage holds only small WebP previews in the Durable Object, so voice needs R2 clips with the community's visibility, consent per clip and a named speaker (#69); every voice button stays hidden until then. *Kata hari ini* as a daily Aksara post (it shows as a card only). *Rekam daftar* and *Lomba kata*.

**Peer projects.** Overlap with [Kamus Mee](https://kamus.mee-mana.online/) is fine (owner). Link to it, and offer to exchange checked entries if they want.

## 11. Order

The owner wants everything before the 26–27 Nov upload. The order and the packages are in section 13. If time runs short, cut from the bottom of that list. The Kamus and the page system are what the video and the deck need most.

## 12. Questions for the owner

Answered on 21 Nov: Lembaga as the one word (yes), and the Gojek screenshots (section 3a). Still open:

1. One lembaga page with two voices: their own part, and the reviewed encyclopedia part?
2. Situs pricing: Rp300rb once plus a yearly fee only for an own domain, or a subscription?
3. Kios: forbid land listings?
4. DNS: a wildcard `*.etnos.space` record and Worker route for Situs. Under the standing rule, anything new with DNS needs the owner's confirmation before it is made.

## 13. Work packages

One Opus worker at a time, each on a coherent set (owner, 21 Nov). The lead session reviews screenshots, deploys, and keeps the docs and tasks current. Each package ends with checks, screenshots at 390 and 1280 in light and dark, a doc update, and a report. Deploys go through the lead.

| # | Package | Contents | Depends on |
| --- | --- | --- | --- |
| P1 | **Halaman dan Ensiklopedia** (**built** 21 Nov, see §3 and §3a) | One entry page for every kind at `/wiki/<slug>` with `/contexts/<slug>` redirecting; four tabs (Tentang, Percakapan, Riset dan data, Riwayat); the Letak rail, generalised from the region stack; kind modules inside Tentang; the Ensiklopedia front in the superapp shape (3a); the Penampil catalogue strip; the name moves to Ensiklopedia in `observatory-name.ts`. One API shape (`/v1/entri/:slug`) that reads today's tables through an adapter. **No destructive storage migration before the showcase.** | none |
| P2 | **Kamus in posts** (**built** 21 Nov, see §10, except voice) | The tokenizer and matcher (proper names skipped, suffix rules per language); question underlines; tap any word for the card; *Artinya* on posts; the notice card and the deck with correction, word class and Ucapkan; *Mode belajar*; questions from word frequency; *Kata hari ini* from a concept list; picture questions from Penampil species. Shaped by `docs/research/language-from-nothing-2026-11-21.md`. | P1 for species links (soft) |
| P3 | **Lembaga, komunitas dan Kios** (**built** 21 Nov, see §5, §6, §7) | Lembaga as the one word; jenis lembaga sections on the Komunitas page; the lembaga page (two voices if the owner agrees) with claiming an entry; community creation with *Tentang apa / di mana*, *Bahasa yang dipakai* (switches the Kamus on) and *Dikelola oleh*; Kios as a view of `offerings` with a toggle, place listing and house rules | P1 |
| P4 | **Percakapan** (**built** 21 to 22 Nov, see §4) | Entry tagging in the composer; inherited tags; "Tandai …?" suggestions by name match on public posts; the Percakapan tab on entries | P1 |
| P5 | **Situs** | The `situs.yaml` and `lembaga.yaml` schemas; the block renderer with two templates; a preview at `etnos.space/situs/<lembaga>`; the `*.etnos.space` dispatcher written and tested, switched on only after the owner confirms DNS | P3 |
| P6 | **etnos.yaml** | The deployment file and its schema; Studio reads and writes it | P5 schemas |
