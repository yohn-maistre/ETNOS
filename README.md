# ETNOS

A public square for Papua that remembers.

Talk about anything. Politics, reggae, church, football, land, the price of pinang at the market. Read the week's news with every publisher credited. When something matters, write it down together so the next person can find it.

**[etnos.space](https://etnos.space)** is live. Anyone can read. Join with a Bluesky account.

<p align="center">
  <img src="docs/assets/etnos-community-desktop.jpg" alt="A community page on ETNOS, with an ink-print landscape of the Papuan highlands as its cover and tabs for discussion, wiki, media, polls and offers." width="70%">
  &nbsp;
  <img src="docs/assets/etnos-thread-mobile.jpg" alt="A long post written in Papuan Malay, open on a phone." width="23%">
</p>

## Why

Culture is happening right now. It's the argument under a post, the song everyone shares this week, the meeting at the church hall on Saturday. Most of it scrolls past and disappears.

We want to keep it, and keep it alive. Every place and every language deserves a record its own people write, check and correct. That record should grow sharper over time, reaching further back into the past with every account someone adds.

There's more news than anyone can read. People want help connecting it. What happened? Who does it touch? What do we still not know? AI makes that work possible at a scale we never had. People stay in charge of what it means.

## Aksara, the steward

Any community can invite Aksara, an AI participant that works in the open.

It shares what it finds in the community feed and asks people to check it. Tag `@aksara` in a post and it answers in the thread with its sources. It writes wiki pages from sentences it has checked against their sources. A community chooses whether those pages wait for review or go live marked "not yet reviewed".

A person grants its permissions, its budget and its time limit. Its work log is public. A steward can pause it at any moment. It never gets the last word.

## What we are building toward

Talk in a community becomes knowledge the community owns. A lembaga adat runs a private language community; people talk as usual; Aksara proposes words, their senses by context of use and grammar notes; members check each one with a swipe; the community decides what to publish. The same works for plants, places, events and customs, and the map shows how it all connects. See [docs/communities-spaces-2026-11-19.md](docs/communities-spaces-2026-11-19.md).

## What you can do today

- Join communities, post, reply, run polls, share photos and links.
- Read Papua news by topic and place, with every publisher credited.
- Grow the wiki. A community chooses review before publishing, or publishing first with review after. Every page shows its sources, its history, its author and whether a person has reviewed it.
- Ask `@aksara` a question and get a cited answer.
- Post offers and requests, then mark them done.
- Turn a need into *kerja publik*, public work that someone can pick up.

## What's ready and what's coming

| | |
| --- | --- |
| **Live now** | Communities with public and members-only spaces. Posts, replies, polls, media, search and bookmarks. Moderation and reports. Bluesky sign-in. The wiki with review and history. The news desk. Source feeds with per-source rights. Working notes. Offers and requests. `@aksara` questions. The steward studio. A read-only connector for outside AI agents. |
| **Still being tested** | A recorded live run of the hosted steward, with its receipt. Encrypted direct messages. Grouping related sources automatically. |
| **In the lab** | [AT Protocol Spaces](labs/spaces/README.md), the protocol's upcoming private-data feature, tried against its official alpha with test accounts. The live forum keeps private communities in its own storage for now. We'll test again when the public beta opens on 1 December. An [experimental account host](packages/pds/README.md) built from Cirrus. |
| **Next** | A page for every place and language that brings its news, talk, polls and wiki together. Gaps the community can choose to fill. A bar on each wiki page showing whose voices it rests on. Room for two accounts to stand side by side when people remember things differently. A weekly "what this means for us" summary. |

Poll results show totals only. The app never shows who chose what.

## How it fits together

What a place knows settles in layers, like rock. That's where the name Strata comes from, and it's how the system is arranged.

<p align="center"><img src="docs/assets/strata-layers.svg" alt="A cross-section of ground with six layers, from the surface down: Percakapan (conversation), Kabar (news), Kerja bersama (public work), Pengetahuan (knowledge), Ingatan (memory) and Tempat (place). Communities and institutions are columns through every layer. Aksara is drawn as groundwater moving between them." width="100%"></p>

| Layer | What lives there | Pace |
| --- | --- | --- |
| Percakapan | Posts, threads, art, writing, polls | Hours |
| Kabar | News and events, every publisher credited | Days |
| Kerja bersama | Public work, decisions, what institutions do | Months |
| Pengetahuan | Wiki pages, research, sources, the map | Years |
| Ingatan | Stories, languages, history, practice | Generations |
| Tempat | Land, water, terrain, living things | Deep time |

People live at the surface and reach down. Communities and institutions are columns that pass through every layer. Aksara carries material between layers, with its sources: a news story becomes a wiki change, a wiki fact becomes a question to members. A new deployment starts at the bedrock with its places and builds upward. The full model is in [docs/strata-model-2026-11-17.md](docs/strata-model-2026-11-17.md).

Three kinds of participant share the square. **People.** **Organisations** such as churches, schools, NGOs and government offices. **Aksara**, which always answers to one of the first two.

**ETNOS** is the place, at etnos.space. **Strata** is the engine in this repository. Anyone can deploy it for their own region or people. In Indonesian the word also means a university degree. S1, S2, S3. We like that too. **Aksara** is the steward, and the node an institution runs to keep its archives under its own roof.

## For the judges: where ETNOS comes from

ETNOS has been growing for a few years. This repository is its newest chapter.

- **2023.** The idea and the name.
- **March 2025.** [Saireri ETNOS](https://github.com/yohn-maistre/saireri-etnos). Our first community forum experiments on the fediverse, with web clients built on [Photon](https://github.com/Xyphyn/photon).
- **March 2026.** [Honai Metro](https://github.com/yohn-maistre/honai-metro), a Papua-themed client for [PieFed](https://codeberg.org/rimu/pyfedi), forked from Photon. On 17 March it [learned Bahasa Indonesia and got a Papuan look](https://github.com/yohn-maistre/honai-metro/commit/ff77dbab9f86238e24710c1d932c0081cc3985bb) ("gave photon a tan and taught it bahasa 🏠🌿"). On 25 March it gained a [Papua wiki and a provincial dashboard](https://github.com/yohn-maistre/honai-metro/commit/af0af053ecfcabd737c74ac1bd2b9a52c2934a6b).
- **October 2026.** Strata. ETNOS moved from ActivityPub to the AT Protocol, so people own their accounts and can take them anywhere. The engine was rebuilt around shared knowledge and an accountable steward. Honai's interface came along and lives on in [`apps/web`](apps/web).

Same community, same wiki, same Papuan look. Each step gave it a sturdier home. Thank you to the Photon and PieFed projects, whose work we built on.

## Principles

1. People decide. Aksara drafts, sums up and asks. A person can review, correct or revert anything it writes.
2. Every AI action is labelled, limited and logged.
3. Sources get credit. A source shared as headlines only stays headlines only.
4. Private stays private, including counts, search results and suggestions built from private content.
5. Local words and named accounts stay as they are. Disagreement can be recorded.
6. Everything works with the AI switched off.

## How it's built

TypeScript on Cloudflare Workers, with SQLite in Durable Objects. The same engine runs locally on Node. The web app is Svelte 5. Sign-in uses the AT Protocol's official OAuth. Aksara runs as an optional resident behind a small contract, with mandates, budgets and a scheduler.

## Run it locally

You need Node 24.19 or newer.

```sh
npm ci --ignore-scripts
npm run check && npm test
npm run demo      # creates synthetic data in an empty database
npm start         # http://127.0.0.1:7342
```

Build the web app with `npm ci --prefix apps/web --ignore-scripts`, then `npm run build:ui`. The full developer and operator guide is in [docs/engineering.md](docs/engineering.md).

## Read more

- [Status](docs/status.md) and the [feature ledger](docs/foundation/feature-ledger.md)
- [Architecture](docs/architecture.md), [security](SECURITY.md) and [sign-in](AUTH.md)
- [Foundation](docs/foundation/README.md) and [knowledge landscape research](docs/research/knowledge-observatory-2026-11-12.md)
- [Direction: lived culture, Cerita and language spaces](docs/direction-2026-11-16.md). Where this is going. Not built yet.
- [Knowledge organisation](docs/knowledge-organisation-2026-11-15.md): label families and what they were adapted from
- [BUDAYA GO! 2026 plan](docs/budaya-go-plan-2026-11-14.md) and [design direction](docs/design-direction-2026-11-14.md)

## License

[AGPL-3.0-only](LICENSE). If you run a changed version of Strata for other people, share your changes. Third-party notices are in [`apps/web/licenses`](apps/web/licenses) and [`packages/pds/LICENSE.cirrus`](packages/pds/LICENSE.cirrus).
