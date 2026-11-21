# One page system, lembaga, Kios, Situs and a Kamus that starts from nothing

*21 November 2026. A proposal written with the owner's brain dump of the same day. Status marks: **built** (in the code), **proposal** (not built). Nothing here is built yet. Owner decisions are marked **decided**; everything else is a recommendation waiting for a pick.*

Related: [communities-spaces-2026-11-19.md](communities-spaces-2026-11-19.md) (site hierarchy, Periksa), [strata-model-2026-11-17.md](strata-model-2026-11-17.md) (layers and columns), [../research/mee-text-sources-2026-11-21.md](../research/mee-text-sources-2026-11-21.md) (coverage test, false friends), [../observatory/README.md](../observatory/README.md) (map and Penampil).

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
- **The rail is the *Letak* navigator,** a general version of today's region stack (PlaceStrata, "Letak di antara wilayah adat"). It shows the entry's place in its chain with the current one open, then the communities, lembaga and Kios that point here, then graph neighbours. On phones it becomes one row of chips under the title. This answers "underutilising the rail".
- **The Ensiklopedia front is a superapp grid** (owner's Gojek idea, screenshots pending): one icon per kind (Tempat, Bahasa, Suku, Makhluk hidup, Bentang alam, Benda, Peristiwa, Lembaga) plus Peta, Data and Kamus, then a few cards such as *Belum diketahui*, *Baru diperiksa* and the compact map. The grid is the catalogue; the map and the Penampil are two ways of looking at it.
- **Penampil gets the catalogue too** (owner, after phase 2): a strip or drawer of the list you came from, with next and previous, so people browse without closing the viewer. Logged in #98.

### Migration path

`km_entities` already has the richest class list, so it becomes the one table. Every `contexts` row becomes an entity (place → tempat, region → tempat with an overlay flag, language → bahasa, topic → gagasan), and `record_contexts` points at entity slugs. `wiki_pages` that describe an entity become its Tentang revision history. Penampil records move from `objects.json` into entity media. This is the biggest piece of work here and it should come after the proposal upload (section 9).

## 4. Percakapan: how posts reach an entry

From cheapest and most accurate to most automatic. Steps 1 to 3 need no model and are enough for the showcase.

1. **The author tags it.** Typing a name in the composer suggests an entry, as @mentions do for people. The author decides.
2. **Inherited.** A post in a community labelled Dogiyai shows on Dogiyai. **Built** for community labels.
3. **Suggested by name match.** After a public post, a match against entry titles and aliases offers "Tandai *Danau Paniai*?" to the author. Deterministic, explainable, no model.
4. **Suggested by a decision model, later and only for public text.** [Gemini Decision 1](https://www.kdnuggets.com/introducing-gemini-decision-1-a-model-that-picks-answers-instead-of-writing-them) (launched 11 November 2026) is real. It answers closed questions such as yes/no, choice from 2 to 255 options, or a rubric score, in one pass with a calibrated confidence. It costs $0.10 per million input tokens and output is free. For 10,000 posts of about 400 tokens that is about $0.40. The fit: candidate entries come from name match and the existing vector index, then one yes/no per candidate ("Apakah tulisan ini membahas Danau Paniai?"). The result is shown as a suggestion that a person confirms. Limits:
   - Only text that is already public, under the owner's rule that no hosted model reads a private community.
   - The free tier in AI Studio may use content to improve Google's products, so use the paid tier, or accept the free tier only for public posts.
   - A local fallback is an embedding plus threshold on the operator's own machine.
   - Clustering belongs to Kabar (news clusters, #84), not to Percakapan.

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

An unclaimed listing (strata-model step 4: "institutions listed by kind and place, unclaimed until they claim them") is an entry without the first part. Claiming adds it. Recognition by a customary body stays a sourced claim, never a badge we grant.

## 6. Communities: creation, purpose, language

- **Founding already needs two people.** This is the quorum the owner remembered. The founder gets a waiting room and a link; the room opens when one more person accepts, and lapses after 14 days (`src/founding.ts`). **Built.** Keep it. A separate quorum (1 to 9) sets how many checks a Kamus answer needs (`claim_settings`). **Built.**
- **No "type" picker with Bahasa as one of the types.** The owner noticed the flaw: a community about farming or church or history can write in Mee. Two separate, optional fields at creation instead:
  - *Tentang apa / di mana:* entries the community centres on (topic, place, people).
  - *Bahasa yang dipakai:* the languages people write in.

  **The Kamus switches on from the second field**, whatever the topic. That is the flagship, "talk becomes knowledge", working in any community that writes in a Papuan language.
- *Dikelola oleh:* if the founder is a steward of a lembaga, they choose whether the community sits under it.
- **No marketplace community type.** Selling belongs to accounts (section 7).

## 7. Kios

The owner's second idea, and the right one: a person or a lembaga switches on *Kios*, and their open offers show as a small shop in their profile rail and on the place entries they sell in ("Kios di Wamena"). *Kios* is the everyday Papuan word for a small shop.

- **Already half built.** `offerings` holds offer or request, price, unit, place, status and expiry, and communities have a Penawaran tab. Kios is a view of an account's open offerings plus a toggle. Small work, big showcase: mama-mama Papua selling noken, pinang, sayur and kopi Moanemani, findable by place.
- **Listing only: no checkout and no payment.** People contact by Pesan or WhatsApp. This is simpler, and it is also what the law allows. [Permendag 31/2023](https://www.kemendag.go.id/berita/pojok-media/zulhas-resmi-berlakukan-permendag-312023) Pasal 21(3) forbids social-commerce platforms from facilitating payment transactions on their system.
- **House rules from day one:**
  - No protected wildlife or its parts. Cenderawasih feathers are the obvious case.
  - No alcohol.
  - **No land sales.** Tanah ulayat is the most contested thing in Papua, and a social platform listing land plots invites harm. The owner should confirm this rule.

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
- **In Strata or not.** The schema, renderer, templates and dispatcher go in Strata (AGPL), so any deployment can host sites for its own lembaga. Payment stays outside Strata. A deployment flag, *situs aktif*, is switched by the operator, at first after a QRIS transfer. A payment gateway (Xendit, Midtrans) needs a badan usaha and can wait.

## 9. YAML as the shape of everything

One family of small files, validated by JSON Schema. Forms in the interface write the same files, and export is the file itself:

| File | Holds |
| --- | --- |
| `strata.yaml` | A deployment: name, root place (Wikidata ID), languages, catalogues on, news sources, model provider |
| `lembaga.yaml` | A lembaga: profile, jenis, places, contacts, communities |
| `situs.yaml` | A Situs: template, theme, blocks that point at lembaga data |
| `kamus.csv` (CLDF columns) | A seed word list with source and licence per row |

A free model can draft any of these from a conversation, and a person reviews it before it is used. This is how "easy to set up for everyone else" becomes concrete: a new region's operator answers questions, and Aksara writes `strata.yaml`.

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

**Peer projects.** Overlap with [Kamus Mee](https://kamus.mee-mana.online/) is fine (owner). Link to it, and offer to exchange checked entries if they want.

## 11. Order

| When | What |
| --- | --- |
| Before the 26–27 Nov upload (video, deck) | Kamus in posts (tap any word, question underlines, the card, the notice card, *Artinya*) with real posts from Mee kids; the Lembaga rename and jenis sections; the Letak rail on entry pages; deck slides for Kios and Situs as the road ahead (mock-ups, not builds) |
| Before the 18–19 Dec showcase | The one-entry migration (section 3); the Ensiklopedia front grid; Kios on `offerings`; *Ucapkan*; *Kata hari ini* from a concept list and Penampil pictures; the Penampil catalogue drawer; Sketchfab models checked for licence |
| After | The Situs renderer and dispatcher; decision-model suggestions for public posts; `strata.yaml` onboarding by interview |

## 12. Questions for the owner

1. Lembaga as the one word (instead of Institusi or Organisasi)?
2. One lembaga page with two voices: their own part, and the reviewed encyclopedia part?
3. Situs pricing: Rp300rb once plus a yearly fee only for an own domain, or a subscription?
4. Kios: forbid land listings?
5. The Gojek screenshots, for the Ensiklopedia front.
