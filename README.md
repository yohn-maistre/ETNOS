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

It shares what it finds in the community feed and asks people to check it. Tag `@aksara` in a post and it answers in the thread with its sources. It drafts wiki pages, and those pages wait for a person to review them.

A person grants its permissions, its budget and its time limit. Its work log is public. A steward can pause it at any moment. It never gets the last word.

## What you can do today

- Join communities, post, reply, run polls, share photos and links.
- Read Papua news by topic and place, with every publisher credited.
- Grow the wiki through proposals. A person reviews each change. Every page shows its sources, its history, its author and its reviewer.
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

## Three names

**ETNOS** is the place, at etnos.space.

**Strata** is the engine in this repository. Knowledge settles in layers, like rock: today's talk on top, older records and oral history underneath. In Indonesian it also means a university degree. S1, S2, S3. We like that too.

**Aksara** is the steward, and the node an institution can run to keep its private archives under its own roof.

## For the judges: where ETNOS comes from

ETNOS has been growing for a few years. This repository is its newest chapter.

- **2023.** The idea and the name.
- **March 2025.** [Saireri ETNOS](https://github.com/yohn-maistre/saireri-etnos). Our first community forum experiments on the fediverse, with web clients built on [Photon](https://github.com/Xyphyn/photon).
- **March 2026.** [Honai Metro](https://github.com/yohn-maistre/honai-metro), a Papua-themed client for [PieFed](https://codeberg.org/rimu/pyfedi), forked from Photon. On 17 March it [learned Bahasa Indonesia and got a Papuan look](https://github.com/yohn-maistre/honai-metro/commit/ff77dbab9f86238e24710c1d932c0081cc3985bb) ("gave photon a tan and taught it bahasa 🏠🌿"). On 25 March it gained a [Papua wiki and a provincial dashboard](https://github.com/yohn-maistre/honai-metro/commit/af0af053ecfcabd737c74ac1bd2b9a52c2934a6b).
- **October 2026.** Strata. ETNOS moved from ActivityPub to the AT Protocol, so people own their accounts and can take them anywhere. The engine was rebuilt around shared knowledge and an accountable steward. Honai's interface came along and lives on in [`apps/web`](apps/web).

Same community, same wiki, same Papuan look. Each step gave it a sturdier home. Thank you to the Photon and PieFed projects, whose work we built on.

## Principles

1. People decide. Aksara drafts, sums up and asks. A person accepts every wiki change.
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
- [BUDAYA GO! 2026 plan](docs/budaya-go-plan-2026-11-14.md) and [design direction](docs/design-direction-2026-11-14.md)

## License

[AGPL-3.0-only](LICENSE). If you run a changed version of Strata for other people, share your changes. Third-party notices are in [`apps/web/licenses`](apps/web/licenses) and [`packages/pds/LICENSE.cirrus`](packages/pds/LICENSE.cirrus).
