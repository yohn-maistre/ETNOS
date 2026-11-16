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
- **Morning post.** Once a day Aksara posts one story with its source, something from today (a quake, a season, a date), and one question: "Di kampungmu ceritanya bagaimana?" Replies can become variants.
- **Cards.** A card is a normal Aksara post with a type label, a source line and a dithered band. People reply, save and correct it like any post. A few a day at most.

Rules:

- Aksara never tells a story from memory. It drafts from a retrieved source and a person reviews before it is published.
- We catalogue, cite, summarise briefly and link. Full text only with permission. The Balai Bahasa Papua collections forbid quoting or reproducing without written permission, so we ask them.
- Some stories were published without the owners' consent, or are not for everyone. A community can mark a story and have it withdrawn. Local Contexts TK Labels are the standard to adopt; only communities apply them.
- Stories are tied to nature, seasons and daily life by default. People draw political readings themselves in replies.
- One Aksara, a librarian that answers with sources and says when there is none. No regional mascot bots speaking as a culture.

Known sources to start from: the ministry repository lists 1,106 items under "Cerita rakyat", including Manarmakeri (2004), Kurabesi (2016), Cerita Rakyat dari Tanah Papua (2007) and the Balai Bahasa Papua "Kumpulan Cerita Rakyat Papua" collections (2012, 2014, 2017, 2018). Research papers come through the OpenAlex panel.

## Ruang bahasa

- Every language in the catalogue has a label page. A space for it opens when a few people who use the language ask for it. Until then the page shows how many more are needed. No 256 empty rooms.
- Onboarding asks which languages a person uses or wants to use. It does not ask for ethnicity. The answer is optional and private unless they choose to show it. Labels still never go on people.
- Declaring a language does not grant membership. Each space has at least two stewards who speak it, and they admit members.
- Voice posts matter here. Many languages have no settled spelling, and elders speak more easily than they type.
- What is said in a private space stays there. It never enters public search, export or any corpus. A space can decide to publish something; that is a separate approved public copy, and the original stays private.
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

## Other ideas weighed

- **Seasonal and customary calendar** (planting, fishing, ceremonies, next to quakes and weather). Good small addition to the morning post. Needs community input.
- **School pack** (stories and language as muatan lokal reading). Strong for teachers and judges. Comes out of Cerita.
- **Living dictionary from posts.** Part of Ruang bahasa, opt-in per space.
- **Voice map, 3D captures of objects and sites.** Later. They need recordings and fieldwork.
- **Online musyawarah and anonymous tallies for policy.** Second act. Less cultural for this competition.
- **Clan or family genealogy.** No. Privacy risk is too high.

## Order of work

1. Nabire core sample with a story layer and two or three real stories with citations.
2. Page kind "cerita" with source, variants and signed readings.
3. Morning post and cards.
4. Language question in onboarding and on-demand language spaces. Mee pilot.
5. Voice posts.
6. Setup chat and one-click deploy, tested on a fresh Cloudflare account.
7. Spaces test after 1 December.

## Sources

- UU 5/2017 tentang Pemajuan Kebudayaan, Pasal 5 (tradisi lisan as an object of cultural advancement).
- Repositori Kemendikdasmen, subject "Cerita rakyat": https://repositori.kemdikbud.go.id/view/subjects/PED007=2E5.type.html
- Local Contexts, TK Labels: https://localcontexts.org/labels/traditional-knowledge-labels/
- AT Protocol, "Getting Ready for the Spaces Public Beta", 13 Nov 2026: https://atproto.com/blog/getting-ready-for-the-spaces-public-beta
- Cirrus limitations: https://github.com/ascorbic/cirrus
- Cloudflare pricing pages for Workers, Durable Objects, D1 and Workers AI.
- OpenCode Zen models and terms: https://opencode.ai/docs/console/models/
- From memory, to re-check before citing: UNESCO (2003) "Language Vitality and Endangerment", factor 5, response to new domains and media; Fishman (1991) "Reversing Language Shift".
