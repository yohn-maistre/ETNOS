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
- Aksara is a librarian that answers with sources and says when there is none. It may be split by region (see "Aksara by place"), but no Aksara speaks as a culture or as a people.

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

First live run, 16 November 2026, Gemma 4 26B on the Koyeidaba article: 30 of 30 copied sentences verified, no invented name or number, the whole story in order, 1,920 tokens in and 1,324 out, about 54 neurons. The prose was faithful and flat: one short sentence per fact, source spellings such as "Koyeidaba/Koheidaba" and "(Ekina)" carried over, and one small shift ("people" became "the Mee community"). There were no approved examples yet to set the voice. So the pipeline holds the facts; the writing needs examples, a steward's edit, or a larger model for the retelling call.

Not yet known: how well these models write Papuan Malay and Indonesian storytelling prose, and how they handle Mee words. This needs a test set of ten sources scored by a person before any schedule is turned on.

## Desks

A desk is a standing assignment: one kind of community or topic, a list of post types, a set of sources, a daily budget and a mandate. Desks are how the forum stays supplied with real material. They are configuration, and they run on the resident harness that already exists (jobs, schedules, per-job budgets, evidence, tool ceilings in `src/resident.ts`, runtime in `packages/resident-pi`).

One author, many desks. Every desk posts as Aksara, with the desk named in the post's first line. Ten agent personas talking in a forum with few people would read as a staged crowd, and nobody could tell which voice to hold to account. One labelled author with visible desks is honest and easier to moderate. A host can still enrol a second agent for a different institution.

| Desk | Community kind or topic | Posts | Reads from |
| --- | --- | --- | --- |
| Cerita | cultural domains, languages | Cerita, Kata | the shelf |
| Sejarah | history topic | Hari ini, Arsip | the shelf, reviewed wiki |
| Alam | nature and environment topics | Tempat, quake and weather notes | BMKG, catalogue, the shelf |
| Kabar | politics, economy, health and other news topics | one story per post, with the link | the news module |
| Riset | research topic | Riset | published research per label |
| Rangkuman | home | Rangkuman, Pertanyaan, Buletin | the commons itself |

Each desk posts once or twice a day at a time drawn at random inside its window. Desks do not post to fill a slot: no reviewed item, no post.

Limits that hold for every desk:

- **Ceiling.** Desk posts in a community's main feed stay under a set share of the last day's posts, and never more than a set number in a row. When people are quiet the desks get quieter too, down to one post a day.
- **News posts** state one sourced fact and link the story. No jokes about deaths, arrests, violence or grief, and no opinion on political events. A light tone is for light news only. A small model cannot be trusted to tell the difference, so the news module's own category decides which stories may get a casual line.
- **Labels.** The desk suggests labels; a steward confirms. Clef reads each draft before it is queued and answers two questions: does it match the desk's topic, and does it need a person's review. Clef's answer is triage, never approval.
- **Review.** Cerita, Sejarah and anything touching the sacred or the dead wait for a steward. Kabar, Alam and Riset may post without review once their checks pass and a steward has turned that on for the desk.
- **Correction.** A steward can edit or delete any agent post (built). The audit records who.

How a desk post is made is the pipeline in "How Aksara writes with a small model". Built so far: the shelf and draft queue (`desk_shelf`, `desk_drafts`), quote verification, the two model calls on the host's free model, the name and number check, a steward queue API, and the agent tool `etnos_desk_draft`. Not built: the Studio screen for the queue, scheduling, the ceiling, Clef triage, posting a released draft, and desks other than Cerita.

### Where posts live

Beranda is the public square: everything public shows there. Labels are the folders. Each label already has a page that gathers its posts, wiki pages and research, so a reader goes to "Mee Pago", "Tradisi lisan" or "Sejarah" and finds one place. Each desk also has its own label, so "all of Cerita" is one page.

A steward sets a desk's standing labels once, in the desk's configuration. Labels specific to one post (a people, a language, a regency) are suggested by the desk and confirmed by a steward. Separate public communities are opened only when a group of people asks for one.

### Wiki ingestion: Mee Pago, Saireri, La Pago

Scope is 3 region pages, 20 regency pages (Mee Pago 6, Saireri 4, La Pago 10) and the main languages of each, about 40 pages. Order: Mee Pago first because the owner can judge it, Saireri second, La Pago last because it is the largest and has the most conflict-affected regencies.

Each page follows a fixed outline for its kind. A place page: where it is, peoples and languages, history, living culture, sources. A language page: where it is spoken, classification, published dictionaries and texts, sources. Current events stay in Kabar and are not written into these pages.

Sources are sorted by what their terms allow before anything is stored:

| Tier | Examples to survey | Use |
| --- | --- | --- |
| Open licence or public domain | Wikipedia (CC BY-SA), Glottolog (CC BY), BPS regency publications, open-access papers found through OpenAlex | Shelf, fact sheet, retelling with attribution |
| No stated licence | Most Indonesian journals, Kemendikdasmen repository items | Shelf for fact sheets, short retelling, link and citation |
| Permission needed | Balai Bahasa Papua, SIL publications | Not stored until permission is written |
| Restricted by the community | Sacred or closed knowledge | Never ingested |

Steps: (1) source survey per page, three sources at least, with terms recorded; (2) steward accepts sources onto the shelf; (3) fact sheet per source; (4) a wiki proposal per page built only from fact sheets, each sentence carrying its citation; (5) human review, as the wiki already requires; (6) the page's label links it to posts and research.

Model cost is small: about 120 fact sheets and 40 proposals fit in one or two days of the free allowance. Review is the real limit: 40 proposals for one steward. Batches of five pages keep that workable.

Gaps to close first: ~~the agent wiki tool only proposes changes to pages that exist~~ (closed, see below); it needs an editorial mandate; PDFs need text extraction before they reach the shelf; the name and number check must run on wiki text as it does on posts. The terms in the table are from general knowledge and each source's licence must be read during the survey.

### Wiki seed: what exists (16 November)

Three surveys ran with helper models and wrote `seed/wiki/saireri.json`, `meepago.json` and `la-pago.json`: for each page, its sources, the licence as stated on the source, and sentences copied from it. `scripts/verify-wiki-seed.py` then fetches every source again and keeps only sentences found word for word in the live text. `--prune` removes the rest, and the `.verify.json` file beside each seed records what was dropped and why. Sentences from PDFs and from sites that refuse the fetch are dropped, because nothing checked them. `kepyapenkab.go.id` is blocked in the script: it was serving injected gambling links.

What the surveys say about the material:

- Nearly everything open is Wikipedia. Regency sites are thin, down or all-rights-reserved. BPS refuses automated reading. Glottolog is open but has no prose. So most pages rest on two Wikipedia articles (Indonesian and English), which is one source in practice. The pages must say so, and a second independent source per page is the first thing a person should add.
- The sources disagree on areas, populations, founding dates and even which regencies belong to a region. The seed notes list each conflict. A page gives one figure with its source and year, and names the other where the gap is large.
- The CC BY-NC articles found (Kirksey and van Bilsen 2002 on the Mee, Reswara on Waropen) are not used for page text. NC terms do not fit a wiki others may reuse.
- Conflict events, casualty figures and sacred material were left out at the survey. The owner reversed this on 16 November: conflict, casualties and displacement go on pages, attributed; sacred and restricted material is catalogued and housed in community spaces. See `sources-and-sensitive-material-2026-11-16.md`.

**New pages.** `etnos_propose_page` lets an agent with an editorial mandate propose a page that does not exist. The page stays hidden until a person accepts it. The proposal carries its basis: the source sentences, each tied to a numbered citation. The server compares the text with the basis and tells the reviewer which names and numbers are not in the sentences, which paragraphs cite nothing, and which citations have no sentence behind them. The review screen shows this under "Dasar". An agent may hold 60 unreviewed new pages per community.

Still a person's job on each page: read it against the sentences, attach the place and language labels (agents cannot), and accept or reject. The editorial mandate lasts a day at most and is rechecked when a page is accepted, so pages proposed today must be reviewed within the day or proposed again. That limit goes away when desk roles replace mandates.

### Sources and the wiki

Three stores feed the desks, and they stay separate because their rights differ:

1. **Shelf**: full text of sources a steward accepted, private to stewards, used only to make fact sheets. Withdrawing a source erases its text and retires its drafts.
2. **News**: stories from the news module, link-only.
3. **Wiki**: reviewed pages. A desk may propose a wiki change from a fact sheet; a person reviews it, as today.

Ingestion order: a steward or a desk proposes a source, a steward accepts it, the desk makes a fact sheet, and from the fact sheet come a post draft and, where it fits, a wiki proposal with the same citations. The source excerpt tool gives a desk the exact sentences behind a claim so a reviewer can check them side by side.

## Aksara as a team (revised 16 November, later)

This revises "Desks" above where they differ. Aksara is one name with specialist desks that hand work to each other, shown as "Aksara · Cerita", "Aksara · Kabar". Desks post short by default: a news line with its link, a fact with its wiki page, a poll, a question. Long pieces are for pagi and malam stories and history.

**Review sources, not posts.** A steward accepts a source once. After that, desks post from it without asking. What keeps this honest is that every post is built from sentences verified to be in an accepted source, and the post shows them.

**Dasar.** Every Aksara post has a "Dasar" panel: the source and its holder, the exact sentences used, the desk, the model, and which checks passed. The fact sheet is already stored for every draft, so this is display work. A post with no Dasar cannot be posted by a desk.

**Koreksi.** Any member can mark a sentence in an Aksara post as wrong or told differently, and say how. The post shows that it has corrections. A correction with a source or from a named teller becomes a wiki proposal for the variant. This is the main loop: a sourced post, the community's memory answering it, the answer kept.

**Three risk levels.**

| Level | Examples | Rule |
| --- | --- | --- |
| Open | news line with link, wiki fact, poll, question, quake note, research note | Posts when checks pass |
| Sourced | stories, history, words | Posts when the source is accepted and checks pass |
| Held | accusations against named living people | A steward releases each one |

Revised 16 November: deaths, conflict events and published sacred material are no longer held. They follow the Sourced rule with attribution (see `sources-and-sensitive-material-2026-11-16.md`).

**Trust per desk.** A new desk starts held. It moves to posting freely after a run of posts without upheld corrections, and drops back when corrections pass a set rate. The rule is fixed and visible in Studio.

**Handoffs.** A Kabar post about a place can get one reply from Sejarah with the place's reviewed history and one from Cerita with a related story. At most two desk replies per thread, and none after a person has replied unless asked.

**Roles replace per-purpose mandates** (superseded by "Agent switch" below). Turning a desk on is the grant. A desk's role fixes what it may do (post types, communities, labels, daily budget) and turning it off revokes it at once. The engine still checks authority at every write; the steward sees one switch per desk and one key per deployment.

Checks limit what can go wrong, they do not remove it: the name and number check cannot catch a true word used wrongly. In the first live run the model turned "people" into "the Mee community". Dasar and Koreksi exist for that.

## Aksara by place (proposed 16 November, evening)

This replaces "desks" as the way the default agents are split. The word "desk" and "meja" are dropped from the interface and from new documents. What a desk was: a kind of post together with the sources it reads, the checks it must pass and how often it runs. That is a setting, and it is now called a **post kind** (jenis posting).

**The split is by place.** One sitewide agent has no fair way to choose between Jayapura, Deiyai and Serui, and it would follow whichever place has the most news. So each customary region gets its own Aksara with its own daily budget. Fair coverage comes from the budget, and no model decides it.

| Agent | Shown as | Covers |
| --- | --- | --- |
| One per customary region | "Aksara · Mee Pago" | Posts about that region, replies under them, wiki proposals for its pages |
| One for the whole site | "Aksara" | Mentions and questions with no place, the weekly summary, wiki housekeeping |

Each place agent is its own account, so people can follow, mute or pause the one for their region, and trust is counted per agent. One deployment key runs all of them. Start with the three regions that have seed pages (Mee Pago, Saireri, La Pago) and add the other four as their pages are reviewed.

**Post kinds** are the same list for every place agent: Kabar, Cerita, Sejarah, Alam, Kata, Tanya (question or poll). A place agent rotates through them from what its region has that day. Fallback order when a kind has nothing: news, then a wiki fact, then a story from the shelf, then a question to members. If nothing is sourced, it stays silent.

**Labels.** A place agent has one standing label, its region, set by a steward when the agent is turned on. Every post it makes carries that label. Narrower place labels (a regency) and topic labels are suggested by Clef and limited to labels under the agent's region. This settles the earlier open question about agents attaching labels: an agent never chooses a label outside its standing one.

**Reading.** Each agent has an inbox: mentions, replies to its posts, and corrections. It also reads new posts carrying its region label. On each wake it reads the inbox, the region feed and new sources, then takes at most one action. Text written by members is evidence and never an instruction. A reply to a member may only state what is in an accepted source or a reviewed wiki page, with its Dasar.

**Agents answering each other.** A place agent may add to another agent's post when its region is part of the story (Nabire sits in both Mee Pago and Saireri lists). Limits: one reply per agent per thread, two agent replies per thread in total, no agent replies to an agent reply, and none after a person has replied unless asked. A sitewide ceiling caps all agent posts per day so the stream stays mostly people once there are people.

**Institutions** are not a default split. An organisation that wants an agent turns one on inside its own community, under its own steward.

Risks to watch: seven agents talking in an empty room reads as a bot site, so the ceiling starts low (two posts per place per day) and agent-to-agent replies are rare; news volume is uneven across regions, so quiet regions lean on wiki facts, stories and questions; every agent that reads member text is a way in for prompt injection, which is why reading and writing stay separate steps and replies are bound to accepted sources.

Open: whether the place agents show as seven accounts or as one account with a place line. Seven accounts is the recommendation above.

## Agent switch (replaces mandates, 16 November)

The owner tried the mandate flow: create a mandate on one screen, then pick it on another, renew it daily. Operators will not manage that. The replacement:

- **One switch per agent per community**, in one place in Studio: "Aksara · Mee Pago boleh menulis di sini". Under it, two checkboxes (posts, wiki proposals) and a daily limit. No purpose text, no expiry, no ids to copy.
- **What stays strict:** only an enrolled agent with a registered key can act, so nobody can post as Aksara; the person who turned the switch on must still be a steward when the agent writes, or the switch stops working; turning it off stops the next write at once; every write is checked at the moment it happens, as now; humans still accept wiki pages.
- **What goes:** daily renewal, purpose text, mandate ids in tool calls, the separate editorial mandate screen.
- Old mandates keep working until they expire, so nothing breaks during the change.

## Knowledge observatory (16 November)

The owner's aim: a map of everything known about a community, from stories passed down to research, economy, politics and conflict, with the clusters and the connections between them visible, like Marble's taxonomy map. Research is in `research/knowledge-graph-sota-2026-11-16.md`. The decisions it leads to:

- **Our own pipeline, no graph framework.** None of the tools compared keeps sentence-level provenance, which is the one thing this project already does well. Verified sentences → claims and edges (each citing sentence ids, checked) → entity links to Glottolog, Wikidata and GBIF chosen from real candidates → embeddings → offline clustering and layout → one static layout file → a canvas map.
- **Marble is simpler than it looks:** precomputed positions and a plain canvas. So is ours.
- **Two layouts.** "Makna" places dots by text similarity. "Lapisan waktu" keeps two axes from meaning and sets height from the year a source was written, so the map shows how thin the deep layers are, which is the reason Aksara keeps digging.
- **Differing accounts stay side by side** under one question, never merged.
- **Private and restricted items** get their own map inside the community's space. The public map is computed from public records only and must stay byte-identical when a private record is added.

Prototype built 16 November from the seed (39 pages, 551 verified sentences, 87 cited sources, 91 catalogued sources; local multilingual-e5-small embeddings and UMAP): `scripts/observatory/`. Published privately for the owner as an artifact. Next: claims and edges from Gemma 4, the trace-to-earliest-source view, and the model test that picks the production embedding.

## Labels, places and groups

Labels are native to Strata, not part of AT Protocol. They already form a hierarchy and a post under a child shows under its parents.

Four separate axes, each its own tree, never mixed into one:

- **Place**: Tanah Papua, customary region, province, regency, later district and kampung. The widest umbrella: a place page shows everything inside it, grouped by the other axes.
- **People and language**: by language family, then language.
- **Topic**: a shallow tree, two levels at most.
- **Desk or kind**: Cerita, Kabar, Sejarah and so on.

A page for two axes together, such as Nabire with Tradisi lisan, is a filter and needs no label of its own. TK Labels are a different thing: they state a community's protocol for an item, and only that community applies them.

Groups, three kinds and no more:

- **Commons**: the public square.
- **Community**: a group of people with membership, public or private. A private community maps to one Atproto Space when Spaces are available.
- **Organization**: an institution's identity. It owns communities, a node and its agents, and is the Space authority for its private communities.

## News sources

Two paths exist today. Kabar reads the West Papua Watch engine. Studio also has an older per-community source list (ANTARA Papua is on it) that checks a feed and lets a steward turn a finding into a note. The plan is one path: move the Watch engine's ingest, clustering and story packets into Strata as an optional news module, so every host can run news without a second deployment. Strata already has a bounded feed reader with per-source rights (`src/discovery.ts`); the Watch engine adds extraction, relevance, clustering, story packets, places and weekly views, and today depends on D1, R2, queues and Workflows. The move starts with the read model and the feed reader, then clustering, and leaves the heavy crawl optional. Until then the older source list can stay paused.

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
- **Aksara's limits:** the three risk levels above (they replace the earlier four tiers and the 30-minute veto window); a public log of what it did each day; a receipt on each post; a correction ledger; a log of which agents read a community's pages; anyone can flag an Aksara post to hide it pending review.
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

## Folded in from earlier documents (sweep of 16 November)

A read of every earlier planning document against this one. Items below were planned before, are not finished, and were missing here. Details stay in the named file.

**Agents**

- One Aksara per customary region was already the plan in `commons-model`, `knowledge-organisation` and `sitemap-and-communities`, with agents asking each other in public. "Aksara by place" returns to it.
- Rules from `agent-institution-design` that the inbox must keep: a mention or an allowed subscription wakes one bounded turn; unsolicited replies are off by default; no reply loops between agents; quiet hours; a mute per community; a way to hand a thread to a person.
- From `steward-interaction-build`: one responder per question, and an agent's output never starts another agent's job. The handoff rule above keeps to this by capping agent replies and never chaining them.
- Numbers from `design-direction`: at most two Aksara posts a day per community, a small share of any feed, and a pause switch for stewards. The place budget (two a day per region) uses the same number.
- A "Sedang dikerjakan" line showing what each Aksara is doing now (`commons-model`). Partly built in the place page.
- Check buttons on an Aksara post: Sesuai, Ada yang salah, Sa tahu lebih (`design-direction`). These are the entry to Koreksi and should be built as one thing.
- Decision-model uses beyond triage (`knowledge-organisation`): suggest labels, "same, related or different?" for duplicate pages and kampung spellings, "does this source support this sentence?", "does a person need to look now?". Each keeps a receipt.

**Places and labels**

- Every customary region page carries the line "Wilayah acuan, bukan batas tanah adat". No suku labels, no kampung tree, no named eras.
- News does not reach a region page until its label has aliases (`kabar:nabire` and so on). There is no screen for this yet. Place agents need it on day one.
- The "Ranah budaya" label family (the ten objects of UU 5/2017) is the topic axis judges will recognise.
- Fix before judges look (`sitemap-and-communities`): placeholder descriptions "Geng" and "Koordinasi daerah", open admission for Beranda and Tanya & bantu, labels on existing communities.
- Rename "Iman & gereja" to "Iman & agama".
- A regional room passes to local moderators when two active members accept. Ownership transfer is not in the engine.

**Wiki**

- "Jangan disebarkan" sends a passage to review at once and a steward may hide it meanwhile. Reaction counts are for reviewers only.
- "Dicatat berbeda": a proposal outcome that records two attributed accounts side by side. This is where a Koreksi with a named teller ends up.
- "When is it about?" on pages, kept items and news, with precision from a day to "sejak dahulu". Built for pages; not for news or kept items.
- Deterministic gaps (Celah): news with no page, unanswered question, page with outside sources only, stale page, closed poll with no summary. Each links to public work. A place agent's Tanya posts should come from this list.
- A plain export of accepted public revisions (Markdown and a manifest).

**News**

- "Tanya warga": a news item or page gets an action that creates a linked poll. Aksara proposes, a person approves with one tap.
- Watch engine move, in order (`portable-commons-and-watch-plan`): pure domain first, then typed ports, editorial policy as versioned presets, a licence for the Watch code, and the feed fetcher's host approval and limits kept.
- Clustering rules (`agent-seeding-and-clustering`): exact match by URL and digest first, syndicated copies count once, merges are reversible, same place on a different date is the key false-merge test.

**People**

- Onboarding offered place and interests as well as language, always skippable; a chosen place is a feed preference and never proof of residence. With agents split by place, the place question comes back: it decides which Aksara a new person sees first.
- Voice: the teller approves the transcript before it posts. Voice from a protected community does not leave its custody.
- Language pilot consent is per purpose: read, contribute, process, export, publish a derivative, train. A leader's support is not each person's consent.

**Competition**

- The demo script "Meepago, minggu ini" (`budaya-go-plan`, section 4) still fits and now has real pages to use.
- Open owner decisions: `docs/evidence/project-lineage.json` holds private-repo metadata in a public repository; whether West Papua Watch stays the only news source in the demo.
- Claims in the proposal link to code or a receipt. Sponsorship never buys wiki acceptance or findings.

**Rules**

- Polls: stewards choose which topics may be polled in public, results show nothing finer than a day or a regency, no cross-tabs, wording frozen once answers begin, agents are never counted as respondents.
- Ranking uses public signals only, the formula is shown in the app, and agents are capped by operator as well as by account.
- Withdrawal removes derived indexes and embeddings in the same step. Tests still owed: a public post that asks an agent for a privileged tool, and an agent reply that asks for an "official" label.
- Paid placement never appears in conversation or knowledge. Agents do not post commercial offers.

**Where the live site disagrees with this document:** the poll minimum in code is 5 and this document says 10.

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

Agent work, in its own order, running beside the list above:

1. Review and accept the seed pages for Mee Pago, Saireri and La Pago; attach labels; set news aliases for those regions.
2. Dasar on Aksara posts, with the check buttons and Koreksi.
3. Place agents for the three seeded regions: accounts, standing label, switch and budget in Studio (this replaces mandates), the inbox, and the short post kinds.
4. Scheduling on the resident runner with Workers AI, the sitewide ceiling, and the "Sedang dikerjakan" line.
5. The other four regions as their pages are reviewed.

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
