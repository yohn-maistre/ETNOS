# Direction: lived culture, Cerita, and language spaces

16 November 2026. Decided in conversation with the owner. This is the direction to build toward and to pitch for BUDAYA GO! 2026. It says what is decided, what is still open, and what is not built. Nothing here is a claim about the live site.

## Thesis

A culture stays alive when people use it every day. ETNOS is a community's public commons: a place to talk, keep what is known, and decide things together. Two things lead.

- **Cerita** (public). The stories of Tanah Papua are scattered across hundreds of books and papers. ETNOS brings them to one map with their sources, and the people a story belongs to say what it means.
- **Ruang bahasa** (private). A space for each language where people simply talk in it. The owner's language, Mee, is one of the largest in Tanah Papua and is still at risk. The other 250 or so have less room. Daily use in a new medium is the point. Collection is secondary and only with consent.

The forum, wiki, map, labels, Kabar and Aksara already exist. They become the supporting parts of these two.

## Cerita

One story is one wiki page of kind "cerita", with:

- the people and language it comes from, and the place on the map;
- the source: who wrote it down, when, from whom, and where to read it;
- variants, each with its own source or teller;
- readings ("yang bisa dipelajari"), each signed by a person. There is no single official meaning;
- a time on Lini masa, usually "deep".

How it reaches people:

- **Core sample.** A place page is a column of layers: cerita at the bottom, then history, research, Kabar, today. Start with Nabire.
- **Two posts a day.** Pagi: one story with its source, what the season or customary calendar says about this time of year, and something that happened on this day, with one question: "Di kampungmu ceritanya bagaimana?" Malam: something short to end the day on, such as a saying, a word, or a reading of the morning's story. Replies can become variants. Start with pagi every day and malam only when there is reviewed material; two a day is sixty reviewed items a month.
- **Weekly bulletin.** The week's posts on one A4 page that people can print or save as PDF, for noticeboards, churches and schools. First version is a print layout of a page on the site, which needs no attachments. File attachments on posts come after.
- **Cards.** A card is a normal Aksara post with a type label, a source line and a dithered band. People reply, save and correct it like any post. A few a day at most.

Rules:

- Aksara never tells a story from memory. It drafts from a retrieved source and a person reviews before it is published.
- A post is a synthesis in our own words, short, with the source named and linked. It is never a copy of the text.
- We catalogue, cite, summarise briefly and link. Full text only with permission. The Balai Bahasa Papua collections forbid quoting or reproducing without written permission, so we ask them.
- Some stories were published without the owners' consent, or are not for everyone. A community can mark a story and have it withdrawn. Local Contexts TK Labels are the standard to adopt; only communities apply them.
- Stories are tied to nature, seasons and daily life by default. People draw political readings themselves in replies.
- One Aksara, a librarian that answers with sources and says when there is none. No regional mascot bots speaking as a culture.

Known sources to start from: the ministry repository lists 1,106 items under "Cerita rakyat", including Manarmakeri (2004), Kurabesi (2016), Cerita Rakyat dari Tanah Papua (2007) and the Balai Bahasa Papua "Kumpulan Cerita Rakyat Papua" collections (2012, 2014, 2017, 2018). Research papers come through the OpenAlex panel.

How Aksara posts today: an agent signs in with its registered key, and a person must grant it a posting mandate for one community, with a purpose, an expiry and an hourly limit. Without a mandate it can read and cannot post. The test agent is enrolled as "Aksara" and has no mandate yet.

First story chosen: **Koyeidaba**, told by Mee people. Sources read: Prihartanti and Harjito (2026), "Peran Mitos Koyeidaba dalam Membentuk Pandangan Hidup Masyarakat Suku Mee Papua", Didaktik 12(01), from interviews in Kampung Topo, Nabire, November to December 2025 (https://journal.stkipsubang.ac.id/index.php/didaktik/article/view/10786); and Yobe, "Tinjauan Struktur Cerita Rakyat dalam Kehidupan Masyarakat Suku Mee", UGM thesis covering 30 Mee stories including Koyei and Terjadinya Danau Tigi (https://etd.repository.ugm.ac.id/penelitian/detail/29964). The article calls the story sacred. The owner is Mee and decides whether and how it is posted.

## Ruang bahasa

- Every language in the catalogue has a label page. A space for it opens when a few people who use the language ask for it. Until then the page shows how many more are needed. No 256 empty rooms.
- Onboarding asks which languages a person uses or wants to use. It does not ask for ethnicity. The answer is optional and private unless they choose to show it. Labels still never go on people.
- Declaring a language does not grant membership. Each space has at least two stewards who speak it, and they admit members.
- Voice posts matter here. Many languages have no settled spelling, and elders speak more easily than they type.
- What is said in a private space stays there. It never enters public search, export or any corpus. A space can decide to publish something; that is a separate approved public copy, and the original stays private.
- **Living dictionary.** Members mark a word in a post and add its meaning; the post is the example sentence and a voice clip can be attached. People build it, in spaces that choose to. No model is trained first: no existing model knows these languages, and a corpus only exists where a space has agreed to keep one. Word lists and counts can come later from that agreed material, confirmed by speakers.
- Pilot with one real space, Mee, with real speakers.

## Aksara Node

A node is what a community or team runs for itself: its own Aksara, its own files, and its private spaces. ETNOS is the public commons; a node is where a community keeps its own. They are one project with two halves, and `aksara-core/docs/integrations/etnos-handoff.md` already draws the line: Aksara owns private and institutional conversation, the library, memory, tasks and approvals; Strata owns community membership, public conversation, wiki review and agent mandates.

What exists in aksara-core today (surveyed 16 Nov 2026, alpha, Apache-2.0):

- **Agent harness.** A Mastra-based agent with checkpoint recovery, a read-only MCP gateway, and wiring for a local model server, Groq, OpenRouter and others.
- **Files.** A Rust and SQLite kernel that keeps original bytes with a hash per file, plus approvals and effect receipts, with tests.
- **Memory** with provenance, and a separate database per profile.

What does not exist there: anything AT Protocol (no PDS, DIDs or lexicons), any sync or federation, production sign-in and enrolment, real multi-user hosting, or server packaging beyond a test host.

So a node is three parts, and only two are ours to build:

1. The aksara-core host (harness, files, memory). Exists as alpha. Needs real sign-in and a way to enrol members.
2. A reference PDS beside it on the same machine, updated to the Spaces release. We run it; we do not write one.
3. The link to ETNOS. First step is the one the handoff doc proposes: Aksara reads ETNOS through MCP, read-only.

In Spaces terms a node could take the "Group Host" role, the service that holds a group's identity, membership and roles. That would let a community that registers a node create and govern its own private space, while people without a node use spaces hosted by ETNOS. This is untested; it depends on what the December beta ships.

The owner's intent is one download with one setup interface (command line, and a simple screen later) that brings up the host and the PDS together and registers the node as a group host. If bundling proves fragile, the fallback is a guide with the two kept separate. A node is for any community, institution, government office or small business that wants to run its own. Communities use it to enforce their own rules over their data, with Local Contexts TK Labels as the vocabulary.

Open questions: what hardware a node needs (aksara-core has no low-memory measurements), who holds the keys, how a node is backed up, and what happens to a space when its node goes offline.

## Accounts and private data

- Pilot: people sign in with an existing AT account (bsky.social, Eurosky, Northsky, Blacksky, selfhosted.social) and can take a `nama.etnos.space` handle.
- Atproto Spaces, the protocol for non-public data, goes to public beta on 1 December 2026 on the reference PDS and those providers. That is the route for private spaces across servers. Until we have tested it, private spaces stay inside the ETNOS node as they are now.
- Do not fork Cirrus into a multi-user PDS. It is single-user by design, and a fork would hold people's signing keys and miss Spaces.
- A self-hosted reference PDS on a small VPS when publishing is turned on.

## Hosting for others

- Default: a Cloudflare account and a one-click deploy or `npx create-strata`. The free plan allows 100,000 requests, 5 million rows read and 100,000 rows written a day.
- Keyless model: Workers AI, 10,000 neurons a day free. Enough for a setup chat. A busy Aksara needs the host's own key.
- OpenCode's free models only work inside the OpenCode app, so they are not an option.
- Setup is a chat with Aksara that drafts a catalogue file: area, languages, customary regions typed by the community with a source, topics, kinds, news feeds, quake source, literature words. A steward reviews and loads it. Nothing applies itself.
- Docker through workerd later, marked advanced.
- A catalogue needs alternate and contested names per label, and peoples and languages that cross a border must be able to exist in two deployments. West Papua and Papua New Guinea is the test case.

## Aksara's posts

Aksara posts on a schedule and when asked. Each post has one named type, one source rule and a place in the day. The type goes in the first line.

| Type | When | Source rule |
| --- | --- | --- |
| Cerita | pagi | A published telling or a recorded one with consent. Retold, cited, never copied. |
| Kata | pagi | A word from a published dictionary, or from a language space that agreed to share it. |
| Tempat | pagi | A catalogue place with its core sample. |
| Riset | pagi | One paper from the label's published research, in plain words, with the link. |
| Arsip | pagi | A public-domain photo, map or record, with its holder named. |
| Hari ini | reply under pagi | Customary calendar, season and this day in history. Only with a source for the date. |
| Rangkuman | malam | What the commons talked about today, with links to the threads. |
| Pertanyaan | malam | One question for members, usually the one the pagi post left open. |
| Jawaban | any time | A reply to a mention. |
| Buletin | weekly | The week's posts on one printable page. |

The pagi post is one thread. The opening post carries the lead piece and its source. Replies carry "Dulu dan sekarang" and "Hari ini". A date with a large anniversary can lead instead of sitting in a reply.

When there is no reviewed story for the morning, the order is Kata, Tempat, Riset, Arsip. When none of those is ready, Aksara does not post.

A steward keeps a queue in Studio: type, source, draft, state (draft, reviewed, posted, withdrawn). Stories and anything a community calls sacred need a steward's review before posting. A mandate names which types it covers.

Posts live in one public community and carry labels. A label page gathers them. Labels do not each get a community, because 366 empty rooms would read as a dead forum. A community is for a group of people with membership, such as a language space.

The engine does not let an agent attach labels. Aksara suggests labels and a steward confirms them. Suggestions for members' posts start from catalogue names and aliases in the text. Clef comes later, once there are confirmed examples to learn from.

First post: Koyeidaba, 16 November 2026, with labels still to be confirmed by a steward.

## How Aksara writes with a small model

The first Koyeidaba post was written by a large model working by hand. The standing system must work with a free small model, so the code does the planning and the model does one small job per call.

1. **Shelf.** A steward adds a source: a link, a PDF or pasted text, with its holder and terms. The engine stores the text. Nothing is fetched at write time.
2. **Fact sheet.** One call per source. The model copies the sentences that tell the story, word for word, as a numbered list. Code checks that each sentence is in the stored text and drops any that is not. Names and local words come from these sentences only.
3. **Draft.** One call. The model sees the checked sentences, the post type's fixed outline and two approved posts as examples. It writes each paragraph with the numbers of the sentences it used.
4. **Checks in code.** Every name, number and local word in the draft must appear in the fact sheet. Length, outline and the source line are fixed by the template. A draft that fails goes back once, then to the steward as failed.
5. **Review.** The steward sees draft and fact sheet side by side, edits, and approves. Approved posts become the examples for later drafts.
6. **Post.** At the scheduled time the engine posts the approved item under the mandate.

Aksara's own reading is a separate, optional paragraph, labelled as a reading and never checked in as fact. Replies to mentions use the same steps over search results from the commons and wiki. Wiki proposals already need human review.

Free model paths, checked 16 November 2026: Workers AI gives 10,000 neurons a day. Gemma 4 26B costs about 9,000 neurons per million input tokens and 27,000 per million output, so a three-call story job of roughly 12,000 tokens in and 2,400 out is near 175 neurons, about fifty jobs a day. Qwen 3.8 27B on Workers AI costs about seven times more per job. Groq's free plan lists Qwen 3.8 27B at 1,000 requests and 200,000 tokens a day, with 8,000 tokens a minute, so one call must stay small. The default is Gemma 4 26B on Workers AI with no key; a host can add a Groq or other key. Model names and limits change, so the setup reads them from the provider and does not hard-code them.

Not yet known: how well these models write Papuan Malay and Indonesian storytelling prose, and how they handle Mee words. This needs a test set of ten sources scored by a person before any schedule is turned on.

## News sources

Two paths exist today. Kabar reads the West Papua Watch engine. Studio also has an older per-community source list (ANTARA Papua is on it) that checks a feed and lets a steward turn a finding into a note. The plan is one path: move the Watch engine's ingest, clustering and story packets into Strata as an optional module, so a host can run news without a second deployment. Until then the older source list can stay paused.

## Agent gate hardening

Before more agents are admitted, test the gate as an attacker would: token replay and scope escalation, mandate reuse after expiry or revocation, posting across communities, request-key collisions, smuggled fields (media, polls, labels), rate limits, prompt injection through public posts, and key enrolment. Fix what is found and keep each case as a test. Agents also need a way to withdraw their own post under a current mandate; today only a steward can hide it.

## Other ideas weighed

- **Seasonal and customary calendar** (planting, fishing, ceremonies). Part of the morning post, next to this day in history. Needs community input.
- **School pack** (stories and language as muatan lokal reading). Strong for teachers and judges. Comes out of Cerita.
- **Voice map, 3D captures of objects and sites.** Later. They need recordings and fieldwork.
- **Online musyawarah.** Yes, after Cerita and language spaces. Anonymous voting in levels, results shown only above a minimum number of answers per group and always as "dari N penjawab di ETNOS", Polis-style deliberation, and an export shaped like a Musrenbang proposal. A verified organisation may ask a community a question if its steward admits it, and must post a public response before asking again.
- **Clan or family genealogy.** No. Privacy risk is too high.

## Carried over from earlier documents

Planned in earlier docs and still wanted. Not built unless noted.

- **On wiki pages:** one-tap claim reactions ("Saya tahu ini", "Versi saya beda", "Perlu sumber", "Jangan disebarkan"), differing accounts side by side, page kinds (orang, peristiwa, tempat, praktik, karya, lembaga, and now cerita), typed links between pages, rights and protocol per item.
- **Aksara's limits:** tiers for what it may do alone, with a veto window, with approval, or never; a public log of what it did each day; a receipt on each post; a correction ledger; a log of which agents read a community's pages; anyone can flag an Aksara post to hide it pending review.
- **Weekly "Apa artinya buat kita" card:** sources, who is affected, what is unknown, member posts and an open poll, approved by a person. Short audio for WhatsApp and radio.
- **Research:** literature-gap counts from OpenAlex, a "Tanya peneliti" week, plain-Indonesian paper summaries, citation export.
- **Found themes** from public posts once there are about 300, reviewed by a steward, through the existing offline clustering path.
- **Collections** of kept items, a low-bandwidth mode, a kampung gazetteer from names people type, a "Perantauan" branch for people living outside Papua.
- **Organisations:** domain-verified accounts (.go.id, .sch.id), feeding the regional culture plan (PPKD).
- **Market:** a Pasar community kind with flat-fee shop profiles. Payments wait for a provider.
- **Seeding:** seven regional rooms handed to local moderators.
- **Map:** our own terrain render from Copernicus DEM to drop the EOX dependency. BIG outlines stay, with credit.
- **Further out:** an elders' phone line, a Papuan Malay interface, a steward others can fork.

Rules that still hold:

- Add post types and filters, not pages.
- Say "belum terindeks", never "kosong", and no completeness scores.
- Labels never go on people.
- No red, no white-blue-red groupings, no motifs such as Asmat carving or noken without consent.
- The right not to digitise is part of sovereignty.
- The role that reads untrusted text never holds write power.
- No invented users, content or revenue.

Where earlier docs disagree, this document wins:

- Community kinds: the eleven formal names in the catalogue.
- Poll results: a minimum of 10 answers per group shown.
- There is no "Masyarakat adat" room kind and onboarding does not ask ethnicity. People gather by language, place or interest; a closed group is made by its own members.
- Aksara Node: the definition above, not a hardware box.

## Competition facts

- Rubric: cultural roots 25%, technical feasibility 25%, business model 20%, clarity and consistency of the proposal 30%.
- Dates in earlier docs: proposal 18 to 19 November, showcase 4 to 5 December, pilot January 2027. The owner says the proposal deadline moved a week later; confirm the exact date.
- The proposal may claim a tested Spaces experiment and a plan, not Spaces-backed communities.
- A hosted Aksara run needs the owner in Studio. Otherwise the demo is labelled "simulasi".
- Open owner decisions: which seed places and sources to use, and whether West Papua Watch stays the only news source.

## Order of work

1. Nabire core sample with a story layer and two or three real stories with citations.
2. Page kind "cerita" with source, variants and signed readings.
3. Pagi and malam posts, cards, and the weekly printable bulletin.
4. Language question in onboarding and on-demand language spaces. Mee pilot, with the living dictionary.
5. Voice posts.
6. Setup chat and one-click deploy, tested on a fresh Cloudflare account.
7. Spaces test after 1 December, then the node setup interface.
8. Online musyawarah.
9. Agent gate hardening, then the Watch engine as a Strata module.

Read this document before starting each piece of work.

## Sources

- UU 5/2017 tentang Pemajuan Kebudayaan, Pasal 5 (tradisi lisan as an object of cultural advancement).
- Repositori Kemendikdasmen, subject "Cerita rakyat": https://repositori.kemdikbud.go.id/view/subjects/PED007=2E5.type.html
- Local Contexts, TK Labels: https://localcontexts.org/labels/traditional-knowledge-labels/
- AT Protocol, "Getting Ready for the Spaces Public Beta", 13 Nov 2026: https://atproto.com/blog/getting-ready-for-the-spaces-public-beta
- Cirrus limitations: https://github.com/ascorbic/cirrus
- Cloudflare pricing pages for Workers, Durable Objects, D1 and Workers AI.
- OpenCode Zen models and terms: https://opencode.ai/docs/console/models/
- From memory, to re-check before citing: UNESCO (2003) "Language Vitality and Endangerment", factor 5, response to new domains and media; Fishman (1991) "Reversing Language Shift".
