# Documents

> **Observatory redesign, phase 1 built (20 November 2026).** Read [observatory/](observatory/README.md) first if you work on the wiki, the knowledge map, the knowledge model, datasets or deployment setup. Its [build status](observatory/README.md#build-status) lists what phase 1 built (the observatory front, the size and pace chart, the data catalogue, the *Data* tab and place locator maps) and what phase 2 still has to build (the starter-data build, crosswalks, embeddings and access tiers beyond the open tier). Where these documents disagree with older knowledge-map documents, they win. Remove this notice when phase 2 is built.

This folder holds the plans, decisions, research and release records for ETNOS. Agents and new contributors start with [AGENTS.md](../AGENTS.md), which covers the rules, the way of working with the owner and where everything lives. The [project README](../README.md) is the shortest way in for everyone else. A brief for the launch video and other media is in [launch/video-brief.md](launch/video-brief.md). Documents sit in folders by subject, and a date in a file name shows when it was written. Read the "Which document wins" table before you trust an older plan.

## Start here

These documents give the whole project in reading order.

| Order | Document | What you get |
| --- | --- | --- |
| 1 | [what-etnos-is.md](plan/what-etnos-is.md) | The whole picture in plain words: a social platform organised around places and peoples, with a sourced wiki, Aksara and a community dictionary. It ends with a plain Indonesian paragraph for the proposal. |
| 2 | [one-page-system-2026-11-21.md](plan/one-page-system-2026-11-21.md) | Proposal: one entry page for every kind of thing, Lembaga with two voices, communities by topic and language, Kios, Situs at nama.etnos.space, YAML files, and a Kamus that starts from nothing. | proposal |
| [communities-spaces-2026-11-19.md](plan/communities-spaces-2026-11-19.md) | The flagship. Talk in a community becomes structured knowledge that the community owns. It also covers the site hierarchy, where private things live, AT Protocol spaces and Periksa. |
| 3 | [platform-2026-11-19.md](plan/platform-2026-11-19.md) | The building blocks that exist in code and those that are planned, and how peoples, languages and private spaces relate. |
| 4 | [etnos-model-2026-11-17.md](plan/etnos-model-2026-11-17.md) | The layers, columns and places that organise a deployment, and how one grows from nothing. |
| 5 | [framing-and-impact-2026-11-17.md](plan/framing-and-impact-2026-11-17.md) | Why ETNOS exists, who it helps, the evidence and numbers, the laws, and what the BUDAYA GO! guide asks for. |
| 6 | [showcase-plan-2026-11-17.md](plan/showcase-plan-2026-11-17.md) | What ETNOS is for the showcase and the build order. Section 25 says what to build next. |
| 7 | [lessons-2026-11-20.md](plan/lessons-2026-11-20.md) | The latest notes on design, the identity host, invites, deploys and working alongside helpers. |
| 8 | [observatory/](observatory/README.md) | The observatory redesign of 20 November: the model of a people's world, the starter dataset for any deployment, datasets with viewers, access tiers and two deployment profiles. |

## Rules for writing

- [voice.md](voice.md) sets how every public sentence is written: the answer first, everyday words, short complete sentences, no teasers, no closing summaries and no em dashes.
- [naming.md](naming.md) sets plain names that say what a thing is or does, and lists the renames of 18 and 19 November.
- [lessons-2026-11-20.md](plan/lessons-2026-11-20.md) collects what to remember about design, the identity host, invites and deploys.

## Which document wins

The plan of record decides what is built. Older dated plans stay as history. When two documents disagree, use the first one that applies in this table.

| Question | Document that decides |
| --- | --- |
| What do we build next, and in what order? | [showcase-plan §25](plan/showcase-plan-2026-11-17.md#25-after-the-1819-november-research-sessions-what-to-build-next-proposal) and [open-work](plan/open-work-2026-11-17.md) |
| How do we frame and tell the story? | [framing-and-impact](plan/framing-and-impact-2026-11-17.md) |
| What may the proposal claim, and where is each claim proven? | [claims-2026-11-18](competition/claims-2026-11-18.md) |
| What is the longer direction behind the showcase plan? | [direction-2026-11-16](plan/direction-2026-11-16.md) (the showcase plan wins where they differ) |
| Which architecture and product boundaries are frozen? | The decision records in [decisions/](decisions/README.md) |
| How does the visual design look today? | [lessons §Design](plan/lessons-2026-11-20.md#design) and [PRODUCT.md](../PRODUCT.md), not [design-direction-2026-11-14.md](product/design-direction-2026-11-14.md) |
| How is the knowledge model defined? | [epistemic-multiplex](research/epistemic-multiplex-2026-11-19.md), not [knowledge-ontology-2026-11-18.md](research/knowledge-ontology-2026-11-18.md) |
| How should the observatory, knowledge map, starter data and datasets work? | [observatory/](observatory/README.md), which extends the knowledge model and replaces the older knowledge-map designs |
| When are the dates? | [showcase-plan §1](plan/showcase-plan-2026-11-17.md#1-dates). It replaces the 4-5 December showcase date in earlier documents. |
| Which code is ours and which existed before? | [code-disclosure](competition/code-disclosure-2026-11-17.md) |
| What does the history of the project show? | [evidence/README.md](evidence/README.md) |

Statuses in the tables below mean the following. **Current** documents describe the plan or the code now. **History** documents record what happened on a date and are not updated. **Superseded** documents name the document that replaced them.

## plan/: the plan of record

The plan of record, the framing for the proposal, and the notes that guide the next build.

| Document | What it holds | Status |
| --- | --- | --- |
| [what-etnos-is.md](plan/what-etnos-is.md) | The whole picture of ETNOS in plain words, what is built, who it serves, extra ideas and the proposal paragraph in Indonesian. | current |
| [communities-spaces-2026-11-19.md](plan/communities-spaces-2026-11-19.md) | The flagship: talk becomes knowledge the community owns. Site hierarchy, private spaces on three hosting modes, AT Protocol spaces, private Kamus and Tata bahasa, Periksa, build order and owner decisions. | current |
| [platform-2026-11-19.md](plan/platform-2026-11-19.md) | What ETNOS gives a people, its building blocks in code and planned, and how peoples, languages and private spaces relate. | current |
| [etnos-model-2026-11-17.md](plan/etnos-model-2026-11-17.md) | Layers, columns, building upward from a place, social first, places as spine and overlays, organisations and their Aksara. | current |
| [framing-and-impact-2026-11-17.md](plan/framing-and-impact-2026-11-17.md) | The case for ETNOS: the owner's intent, what the juknis asks for, problem statements with evidence, impact and indicators, flagships, last-mile ideas, why AT Protocol, models, business, risks and the field. | current |
| [showcase-plan-2026-11-17.md](plan/showcase-plan-2026-11-17.md) | What ETNOS is for the showcase and how it is built: dates, free-tier load, accounts, places, language rooms, Aksara per region, plain names, seeding, deploy and build order. | current |
| [rationale-threads-2026-11-19.md](plan/rationale-threads-2026-11-19.md) | Eight threads of rationale for the proposal, each with findings, research, features, laws and indicators, and a regulatory map. | current |
| [open-work-2026-11-17.md](plan/open-work-2026-11-17.md) | Every planned item not yet built, with the document it comes from. Checked against the code on 17 November, so some items are built since. | current, partly out of date |
| [direction-2026-11-16.md](plan/direction-2026-11-16.md) | The longer direction: Cerita, language spaces, Aksara by place, wiki seed, labels and groups, order of work. | current; older than the showcase plan, which wins where they differ |
| [status.md](plan/status.md) | What the engine does today, by area. Most entries date from 1 to 15 November. | partly out of date; later receipts are in history/ |
| [lessons-2026-11-20.md](plan/lessons-2026-11-20.md) | Short notes for whoever works next: design register, appearance defaults, identity host, invites, deploys, shared tree. | current |
| [bahasa-consolidation-2026-11-28.md](plan/bahasa-consolidation-2026-11-28.md) | The language page as the home of its Kamus, one map-first Bahasa index, and which old addresses land where. | current |

## decisions/: accepted decisions

Architecture and product decisions that other documents must respect.

| Document | What it holds | Status |
| --- | --- | --- |
| [decision-001-product-and-runtime.md](decisions/decision-001-product-and-runtime.md) | What ETNOS is, where authority sits, the runtime boundary. | current |
| [decision-002-groups-knowledge-and-regional-surfaces.md](decisions/decision-002-groups-knowledge-and-regional-surfaces.md) | Durable groups, institutional work (PublicWork), regional surfaces. | current |
| [decision-003-forum-first-alpha.md](decisions/decision-003-forum-first-alpha.md) | Forum first, content scoped to communities. | current |
| [decision-004-at-account-hosting.md](decisions/decision-004-at-account-hosting.md) | Full AT accounts, hosted separately, with the options researched. | current |
| [decision-005-node-account-data-planes.md](decisions/decision-005-node-account-data-planes.md) | One node experience with explicit data boundaries and deployment profiles. | current |
| [decision-pilot-2026-11-03.md](decisions/decision-pilot-2026-11-03.md) | The public decision-model pilot: a steward button that triages a public post. | current for the pilot |
| [local-contexts-2026-11-28.md](decisions/local-contexts-2026-11-28.md) | Local Contexts: communities apply Labels on the Hub, ETNOS applies only Notices and stores a Hub project ID. | current |

## product/: product and design documents

How the product is shaped, organised and designed.

| Document | What it holds | Status |
| --- | --- | --- |
| [product-shape-2026-11-14.md](product/product-shape-2026-11-14.md) | Where everything lives, Aksara's limits, ranking, market. | current; earlier than etnos-model |
| [design-direction-2026-11-14.md](product/design-direction-2026-11-14.md) | One stream, Aksara in the stream, place and wiki pages. Its palette (Kabut), type pairing and ink-print cover are replaced by Grafit, Serat and cover-wash. | partly superseded by plan/lessons-2026-11-20.md (Design) |
| [commons-model-2026-11-15.md](product/commons-model-2026-11-15.md) | The commons model and regional Aksaras. | current proposal |
| [sitemap-and-communities-2026-11-15.md](product/sitemap-and-communities-2026-11-15.md) | Sitemap, community kinds and the seeding path. | current; directory parts superseded by product/information-architecture-design-2026-11-18.md |
| [information-architecture-design-2026-11-18.md](product/information-architecture-design-2026-11-18.md) | One page per thing, one directory (Jelajah), one switcher, one topic scheme. Moved here from the former superpowers/specs folder. | current |
| [post-first-design-2026-11-11.md](product/post-first-design-2026-11-11.md) | Posts first, readable knowledge, a closer public square. | current for the post-first rule; visual defaults superseded |
| [identity-and-commons-proposal.md](product/identity-and-commons-proposal.md) | Identity and a community-governed commons. | history; baseline frozen by decision-001 |
| [wiki-and-community-engagement-2026-11-03.md](product/wiki-and-community-engagement-2026-11-03.md) | Wiki and engagement design notes, poll privacy. | current as design notes |
| [writing-and-context-plan-2026-11-12.md](product/writing-and-context-plan-2026-11-12.md) | Writing, editing and community context. | history; delivered by history/writing-release-2026-11-12.md |
| [offers-and-writing-2026-11-12.md](product/offers-and-writing-2026-11-12.md) | Offers and requests, market rules. | history; built |
| [ranking-and-steward-demo-2026-11-12.md](product/ranking-and-steward-demo-2026-11-12.md) | Ranking from public signals only. | history; built |
| [piefed-parity.md](product/piefed-parity.md) | Forum behaviour borrowed from PieFed, as a delivery ledger. | current ledger |

## vision/: the long-horizon vision

Where ETNOS fits in the wider Abstraksi system. Direction, not the plan of record.

| Document | What it holds | Status |
| --- | --- | --- |
| [2026-11-27_conversable-situated-systems.md](vision/2026-11-27_conversable-situated-systems.md) | The four-layer loop across aksara-core and ETNOS, three sovereignty rings on AT Protocol spaces and `ts-mls`, sensor pods and room hardware, offline links, seven research tracks, bioregional packs and the open design constraints. | current vision |

## observatory/: the observatory redesign

The design of the observatory from 20 November: the model of a people's world, the starter dataset, the catalogue of datasets and artifacts, viewers, access and deployment.

| Document | What it holds | Status |
| --- | --- | --- |
| [README.md](observatory/README.md) | The redesign notice, reading order, how it relates to earlier documents, and the build status of phase 1 and phase 2. | current |
| [world-model-and-starter-data-2026-11-20.md](observatory/world-model-and-starter-data-2026-11-20.md) | Things placed by size, pace and level; depth and voice on statements; published schemes as lenses; crosswalks; relations; synthesis notes; embeddings; the starter build; onboarding; the knowledge map as a constellation. | current design; phase 1 built (coordinates, depth, size and pace chart) |
| [data-observatory-2026-11-20.md](observatory/data-observatory-2026-11-20.md) | Scope, access tiers, the dataset record, viewers for each modality, access as code, edge and server profiles, Aksara as librarian, use cases and app views. | current design; phase 1 built (dataset records, open tier, catalogue, *Data* tab) |

## knowledge/: wiki, knowledge map and sources

How knowledge is organised, mapped and sourced. The research behind the model is in research/.

| Document | What it holds | Status |
| --- | --- | --- |
| [knowledge-organisation-2026-11-15.md](knowledge/knowledge-organisation-2026-11-15.md) | Labels, label families, found themes, time, decision-model uses. | current |
| [knowledge-map-design-2026-11-16.md](knowledge/knowledge-map-design-2026-11-16.md) | The knowledge map: six coordinates, eight lenses, agents on the map, state-of-knowledge reports. | current design; later rebuilt around the knowledge model |
| [sources-and-sensitive-material-2026-11-16.md](knowledge/sources-and-sensitive-material-2026-11-16.md) | Source catalogue, Aksara digging for earlier sources, conflict and sacred material. | current |
| [connected-wiki-clustering-2026-11-12.md](knowledge/connected-wiki-clustering-2026-11-12.md) | Connected wiki and offline clustering checkpoint. | history |

## aksara/: agents and Aksara

How Aksara and other agents take part, with accountability. Jadwal Aksara and the Aksara node are in research/.

| Document | What it holds | Status |
| --- | --- | --- |
| [agent-institution-design-2026-11-03.md](aksara/agent-institution-design-2026-11-03.md) | Accountable agents, inbox rules, required negative tests. | current design |
| [agent-entrance-2026-11-03.md](aksara/agent-entrance-2026-11-03.md) | The agent gate: keys, short tokens, MCP. | current contract |
| [agent-seeding-and-clustering-2026-11-11.md](aksara/agent-seeding-and-clustering-2026-11-11.md) | Seeding assistants and clustering rules. | partly history; 12 November work is in knowledge/connected-wiki-clustering-2026-11-12.md |
| [requests-2026-11-20.md](aksara/requests-2026-11-20.md) | Work between organisations as posts, requests between Aksara, Jadwal page. | current; built |
| [steward-interaction-build-2026-11-12.md](aksara/steward-interaction-build-2026-11-12.md) | Asking Aksara, one responder per question. | history; built |
| [steward-interaction-release-2026-11-12.md](aksara/steward-interaction-release-2026-11-12.md) | Sourced thread replies, as released. | history |
| [resident-runtime-fix-2026-11-12.md](aksara/resident-runtime-fix-2026-11-12.md) | Repair of the resident runtime. | history |

## news/: news

Plans and ports for news. Today Kabar reads clusters from the West Papua Watch API.

| Document | What it holds | Status |
| --- | --- | --- |
| [news-transplant-plan-2026-11-20.md](news/news-transplant-plan-2026-11-20.md) | Plan to move the news engine into ETNOS: how it works, free-tier footprint, licences, steps. | current plan |
| [portable-commons-and-watch-plan-2026-11-11.md](news/portable-commons-and-watch-plan-2026-11-11.md) | Moving the news engine into ETNOS with one installer. | superseded in part by news/news-transplant-plan-2026-11-20.md |
| [alpha-news-and-video-2026-11-03.md](news/alpha-news-and-video-2026-11-03.md) | Bounded news and video-card ports. | current for the adapters until Kabar moves |

## accounts-and-hosting/: architecture, accounts and engineering

How accounts, nodes and hosting work, and notes for engineers. The multi-account identity host is in research/pds-multi-identity-build-2026-11-19.md.

| Document | What it holds | Status |
| --- | --- | --- |
| [architecture.md](accounts-and-hosting/architecture.md) | Custodial nodes and the AT commons. | current |
| [engineering.md](accounts-and-hosting/engineering.md) | Engineering notes. This was the repository README until 14 November. | current |
| [client-deployment-contract.md](accounts-and-hosting/client-deployment-contract.md) | Engine, clients and deployment profiles. | current |
| [cloudflare-profile.md](accounts-and-hosting/cloudflare-profile.md) | The Cloudflare profile. | current |
| [pds-hosting.md](accounts-and-hosting/pds-hosting.md) | Optional PDS hosting. | current; multi-account host is in research/pds-multi-identity-build-2026-11-19.md |
| [signup-2026-11-04.md](accounts-and-hosting/signup-2026-11-04.md) | Sign-up through a provider (Bluesky). | current for provider sign-up |
| [handle-portability-2026-11-04.md](accounts-and-hosting/handle-portability-2026-11-04.md) | ETNOS handles with an outside account provider. | history; test receipt |
| [serverless-reuse-review.md](accounts-and-hosting/serverless-reuse-review.md) | Which serverless code we reuse. Checked 1 November. | history |
| [language-choice.md](accounts-and-hosting/language-choice.md) | Why TypeScript. | history; decision taken |

## competition/: BUDAYA GO! and the demo

Documents written for the competition. The proposal itself is not in this repository.

| Document | What it holds | Status |
| --- | --- | --- |
| [claims-2026-11-18.md](competition/claims-2026-11-18.md) | Every proposal claim with its status (live, built, roadmap) and the code and test that prove it. Re-check on 25 November. Moved here from the former proposal/ folder. | current |
| [code-disclosure-2026-11-17.md](competition/code-disclosure-2026-11-17.md) | Which code we wrote and which existed before, with licences. The Photon notice is still missing from the licence files. | current, one open item |
| [budaya-go-plan-2026-11-14.md](competition/budaya-go-plan-2026-11-14.md) | Audit, build plan and demo script of 14 November. | superseded by plan/framing-and-impact-2026-11-17.md and plan/showcase-plan-2026-11-17.md |
| [demo-status-2026-11-15.md](competition/demo-status-2026-11-15.md) | What was left before the demo on 15 November. Its showcase date is wrong. | history; dates replaced by plan/showcase-plan-2026-11-17.md §1 |
| [competition-demo-rehearsal-2026-11-12.md](competition/competition-demo-rehearsal-2026-11-12.md) | Demo rehearsal. | history |
| [demo-release-next-2026-11-12.md](competition/demo-release-next-2026-11-12.md) | Remaining demo work on 12 November. | history |

## history/: releases, checkpoints and earlier plans

Receipts of what shipped on each date, implementation checkpoints and plans that later documents replaced. None of these is updated.

| Document | What it holds | Status |
| --- | --- | --- |
| [alpha-20.md](history/alpha-20.md) | The twenty-person alpha decision and preparation record. | history |
| [roadmap.md](history/roadmap.md) | The first public-square-first roadmap. | superseded by plan/showcase-plan-2026-11-17.md |
| [vision-and-roadmap-2026-11-14.md](history/vision-and-roadmap-2026-11-14.md) | Vision, ideas and a dated roadmap from 14 November. | superseded by plan/direction-2026-11-16.md |
| [next-2026-11-16.md](history/next-2026-11-16.md) | What came next on the night of 16 November. | superseded by plan/open-work-2026-11-17.md |
| [connected-preview.md](history/connected-preview.md) | OAuth and connected Honai checkpoint. | history; superseded by history/release-2026-11-01-etnos.md |
| [commons-implementation.md](history/commons-implementation.md) | Commons, activity and encrypted DM checkpoint. | history |
| [commons-next-implementation.md](history/commons-next-implementation.md) | Next-phase commons implementation, 3 November. | history |
| [forum-media-checkpoint.md](history/forum-media-checkpoint.md) | Conversation and media checkpoint. | history |
| [forum-rich-content-checkpoint.md](history/forum-rich-content-checkpoint.md) | Forum content and Spaces checkpoint. | history |
| [implementation-checkpoint-2026-11-11.md](history/implementation-checkpoint-2026-11-11.md) | Living commons implementation checkpoint. | history |
| [etnos-follow-through-2026-11-04.md](history/etnos-follow-through-2026-11-04.md) | What was delivered and what remained on 4 November. | history |
| [sharing-previews-2026-11-03.md](history/sharing-previews-2026-11-03.md) | Public sharing previews. | history |
| [shell-sorotan-2026-11-12.md](history/shell-sorotan-2026-11-12.md) | App progress, contextual rail and compact Sorotan. | history |
| [ui-reading-pass-2026-11-11.md](history/ui-reading-pass-2026-11-11.md) | Reading and layout pass. | history |
| [welcome-and-profile-2026-11-11.md](history/welcome-and-profile-2026-11-11.md) | Welcome, print artwork and profile refinement. | history |
| [writing-release-2026-11-12.md](history/writing-release-2026-11-12.md) | Adaptive writing and editing. | history |

Release receipts, by date:

- [release-2026-11-01-etnos](history/release-2026-11-01-etnos.md)
- [release-2026-11-03-commons](history/release-2026-11-03-commons.md)
- [release-2026-11-03-etnos](history/release-2026-11-03-etnos.md)
- [release-2026-11-03-friends](history/release-2026-11-03-friends.md)
- [release-2026-11-04-agents](history/release-2026-11-04-agents.md)
- [release-2026-11-04-navigation](history/release-2026-11-04-navigation.md)
- [release-2026-11-04-signup](history/release-2026-11-04-signup.md)
- [release-2026-11-04-ui-refinement](history/release-2026-11-04-ui-refinement.md)
- [release-2026-11-11-commons-checkpoint](history/release-2026-11-11-commons-checkpoint.md)
- [release-2026-11-12-commons-polish](history/release-2026-11-12-commons-polish.md)
- [release-2026-11-12-welcome-writing](history/release-2026-11-12-welcome-writing.md)

## research/: research notes

Notes that back the plans. Most are proposals with sources, and a few record what was built.

| Document | What it holds | Status |
| --- | --- | --- |
| [community-dictionary-2026-11-19.md](research/community-dictionary-2026-11-19.md) | The northstar: a dictionary and grammar that grow from how people talk, seeded from published sources, owned by the community. Pipeline, models, privacy, build plan and open questions. | current |
| [peta-kata-sources-2026-11-27.md](research/peta-kata-sources-2026-11-27.md) | The published wordlists behind Peta Kata: three CC BY 4.0 datasets, 187 languages by 100 concepts, how each form keeps its source, and the datasets that were checked and left out with their licences. | current; built |
| [epistemic-multiplex-2026-11-19.md](research/epistemic-multiplex-2026-11-19.md) | The knowledge model of Entity, Assertion and Witness, with its research programme and flagships. | current |
| [knowledge-model-build-2026-11-19.md](research/knowledge-model-build-2026-11-19.md) | What was built for the knowledge model: tables, rules, API, seed, graph measures and static observatory files. | current; built |
| [pds-multi-identity-build-2026-11-19.md](research/pds-multi-identity-build-2026-11-19.md) | What was built for the multi-account identity host, with tests, measurements, licences, spaces and self-hosting. | current; built |
| [pds-multi-identity-plan-2026-11-18.md](research/pds-multi-identity-plan-2026-11-18.md) | Plan for many identities on one Workers account host. | superseded by research/pds-multi-identity-build-2026-11-19.md |
| [aksara-living-program-2026-11-18.md](research/aksara-living-program-2026-11-18.md) | Jadwal Aksara: recurring public work, staff roles, the Kartu tab, and what was built on 19 November. | current; ahead of the competition goal |
| [aksara-node-for-communities-2026-11-17.md](research/aksara-node-for-communities-2026-11-17.md) | How an Aksara kept by a community works: two stewards, ETNOS-hosted first, a device later. | current |
| [aksara-workers-harness-2026-11-18.md](research/aksara-workers-harness-2026-11-18.md) | What Aksara's harness can run on Workers and what the free tier allows. | current |
| [aksara-composed-views-2026-11-18.md](research/aksara-composed-views-2026-11-18.md) | Aksara composing community views from typed components instead of code. | proposal |
| [resident-harness-2026-11-17.md](research/resident-harness-2026-11-17.md) | Pi versus Flue and Mastra for the resident, and the place notebook design. | current |
| [etnos-intelligence-catalogue-2026-11-12.md](research/etnos-intelligence-catalogue-2026-11-12.md) | Where models could help, by seam. | current |
| [knowledge-ontology-2026-11-18.md](research/knowledge-ontology-2026-11-18.md) | What the nodes are: Hal, Pernyataan, Rekaman, schemes as lenses. | superseded by research/epistemic-multiplex-2026-11-19.md for naming and analysis |
| [why-these-axes-2026-11-18.md](research/why-these-axes-2026-11-18.md) | Why place, language, topic and kind organise knowledge, with a judge-ready answer. | current |
| [topic-primitives-and-knowledge-organisation-2026-11-18.md](research/topic-primitives-and-knowledge-organisation-2026-11-18.md) | Which topics every deployment ships, and a starter set of 18. | current |
| [knowledge-graph-sota-2026-11-16.md](research/knowledge-graph-sota-2026-11-16.md) | Current methods for knowledge graphs and embedding maps. | current |
| [knowledge-observatory-2026-11-12.md](research/knowledge-observatory-2026-11-12.md) | A relational knowledge landscape, literature and UI options. | history |
| [algorithms-and-decision-models-2026-11-16.md](research/algorithms-and-decision-models-2026-11-16.md) | e-means, vector storage, live placement, decision models and receipts. | current |
| [ui-components-and-realtime-2026-11-16.md](research/ui-components-and-realtime-2026-11-16.md) | Svelte components, motion, live cursors, map rendering, products to learn from. | current |
| [wiki-beings-seeding-plan-2026-11-18.md](research/wiki-beings-seeding-plan-2026-11-18.md) | Mountains, lakes, forests and species as wiki page kinds. | current |
| [peoples-places-and-public-data-2026-11-17.md](research/peoples-places-and-public-data-2026-11-17.md) | How others model peoples and places, a claims schema, and public data to seed Papua. | current |
| [places-and-hierarchy-2026-11-16.md](research/places-and-hierarchy-2026-11-16.md) | Places, hierarchy, onboarding, first deployment, other platforms compared. | current |
| [customary-regions-and-boundaries-2026-11-17.md](research/customary-regions-and-boundaries-2026-11-17.md) | Where the seven wilayah adat come from and how sources place the edges. | current |
| [detak-detik-and-biocultural-sources-2026-11-16.md](research/detak-detik-and-biocultural-sources-2026-11-16.md) | Detak Detik reviewed, with species, terrain, museum objects and images as data. | current |
| [wpw-seed-inventory-2026-11-15.md](research/wpw-seed-inventory-2026-11-15.md) | What West Papua Watch holds that could seed knowledge. | current |
| [deploy-paths-and-seeding-agent-2026-11-17.md](research/deploy-paths-and-seeding-agent-2026-11-17.md) | Deploying on the Cloudflare free tier or a VPS, the operator's first run, models for seeding. | current |
| [opencode-keyless-seeding-2026-11-17.md](research/opencode-keyless-seeding-2026-11-17.md) | opencode's keyless models read from source, with terms and limits. | current; the owner set opencode aside |
| [free-tier-measurement-2026-11-17.md](research/free-tier-measurement-2026-11-17.md) | Measured: 30 people on Workers Free, what was fixed, what to watch. | current |
| [free-tier-llm-coverage-2026-11-16.md](research/free-tier-llm-coverage-2026-11-16.md) | Google AI Studio free tier and Workers AI against our workloads. | current |
| [serverless-pds-and-auth-2026-11-17.md](research/serverless-pds-and-auth-2026-11-17.md) | A multi-account PDS on Workers, free-plan CPU, Spaces, sign-up friction, fallbacks. | current |
| [advisor-review-2026-11-17.md](research/advisor-review-2026-11-17.md) | Two rounds of outside review of the platform and the showcase plan. | current |
| [2026-10-31-contextual-commons.md](research/2026-10-31-contextual-commons.md) | Contextual commons research. | history; refined by decisions/decision-002 |
| [2026-10-31-private-messaging.md](research/2026-10-31-private-messaging.md) | Private messaging research. | history |
| [2026-11-01-community-language-custody.md](research/2026-11-01-community-language-custody.md) | Language custody and the Mee pilot. | history |
| [2026-11-03-etnos-next-phase.md](research/2026-11-03-etnos-next-phase.md) | Findings for the next phase. | history; delivered on 3 November |

## foundation/, evidence/ and assets/

| Path | What it holds | Status |
| --- | --- | --- |
| [foundation/README.md](foundation/README.md) | The living-commons foundation of 11 to 14 November: the complete text, 38 decisions, the feature ledger and the execution plan. | history; kept whole |
| [foundation/feature-ledger.md](foundation/feature-ledger.md) | The full feature ledger, with a machine-readable copy in feature-ledger.json. | history |
| [foundation/execution-plan.md](foundation/execution-plan.md) | Build order, architecture, demo and infrastructure. | history |
| [evidence/README.md](evidence/README.md) | Project lineage and demonstration evidence as JSON records. | current |
| [assets/](assets/) | Images and diagrams that documents use. | current |

## Find by question

Each answer points to the document and the section that holds it.

| Question | Where the answer is |
| --- | --- |
| What is ETNOS, in plain words? | [what-etnos-is §1](plan/what-etnos-is.md#1-the-short-version) |
| What may the proposal claim, and where is each claim proven? | [claims-2026-11-18](competition/claims-2026-11-18.md) |
| What does the BUDAYA GO! guide ask for, and how is it scored? | [framing §3](plan/framing-and-impact-2026-11-17.md#3-what-the-competition-asks-for) |
| Which problem statements and numbers can we use? | [framing §4](plan/framing-and-impact-2026-11-17.md#4-the-problem) |
| Who benefits, and how will we know it works? | [framing §6](plan/framing-and-impact-2026-11-17.md#6-who-benefits-and-how-we-will-know) |
| Which laws and policies apply? | [rationale-threads §10](plan/rationale-threads-2026-11-19.md#10-regulatory-map) |
| Why AT Protocol? | [framing §12](plan/framing-and-impact-2026-11-17.md#12-why-at-protocol) |
| What do we build next? | [showcase-plan §25](plan/showcase-plan-2026-11-17.md#25-after-the-1819-november-research-sessions-what-to-build-next-proposal) |
| How does sign-up through our own host work? | [lessons §Technical](plan/lessons-2026-11-20.md#technical) and [pds build §8](research/pds-multi-identity-build-2026-11-19.md#8-live-deployment-19-november) |
| How are private spaces kept, and what are AT Protocol spaces? | [communities-spaces §3](plan/communities-spaces-2026-11-19.md#3-where-private-things-live) and [§4](plan/communities-spaces-2026-11-19.md#4-at-protocol-spaces-how-they-work-alpha-august-2026) |
| How will the community dictionary work? | [community-dictionary §4](research/community-dictionary-2026-11-19.md#4-how-it-works-proposal) |
| Which privacy rule lets a model read a private room? | [community-dictionary §6](research/community-dictionary-2026-11-19.md#6-the-privacy-question-this-raises) |
| How does Periksa check claims? | [communities-spaces §6](plan/communities-spaces-2026-11-19.md#6-periksa-one-checking-primitive-for-every-kind-of-knowledge-built-19-november-srcperiksats-appswebsrcperiksadecksvelte-tests-in-testperiksatestts) |
| How does Jadwal Aksara work, and what is built? | [living-program §4](research/aksara-living-program-2026-11-18.md#4-jadwal-aksara-the-programme) and [§14](research/aksara-living-program-2026-11-18.md#14-built-19-november) |
| How can a community keep its own Aksara? | [aksara-node §7](research/aksara-node-for-communities-2026-11-17.md#7-recommendation) |
| Which models does Aksara use, and what does it cost? | [showcase-plan §23.2](plan/showcase-plan-2026-11-17.md#232-models-decided-17-november) and [free-tier-llm §6](research/free-tier-llm-coverage-2026-11-16.md#6-recommended-routing) |
| What runs on the free tier? | [free-tier-measurement](research/free-tier-measurement-2026-11-17.md#capacity-plainly) and [showcase-plan §3](plan/showcase-plan-2026-11-17.md#3-thirty-people-on-the-free-tier) |
| How do photos, sound, 3D captures and dates feed the Ensiklopedia? | [saluran](plan/saluran-2026-11-22.md) |
| How do communities build a language from nothing, and what does the Kamus take from that? | [language-from-nothing](research/language-from-nothing-2026-11-21.md) and [one-page-system §10](plan/one-page-system-2026-11-21.md#10-kamus-how-any-language-community-starts-even-with-no-data) |
| How is knowledge modelled (entities, assertions, witnesses)? | [epistemic-multiplex §4](research/epistemic-multiplex-2026-11-19.md#4-the-model) |
| What are the knowledge map coordinates and lenses? | [knowledge-map §1](knowledge/knowledge-map-design-2026-11-16.md#1-six-coordinates-for-every-item) and [§3](knowledge/knowledge-map-design-2026-11-16.md#3-lenses) |
| How do we seed a new place? | [showcase-plan §23](plan/showcase-plan-2026-11-17.md#23-deploying-etnos-and-the-operators-first-run) and [public data, part 3](research/peoples-places-and-public-data-2026-11-17.md#part-3-public-data-to-seed-a-papua-deployment) |
| Which sources may be stored, by licence? | [direction](plan/direction-2026-11-16.md#wiki-ingestion-mee-pago-saireri-la-pago) |
| Which code is ours and which existed before? | [code-disclosure](competition/code-disclosure-2026-11-17.md) |
| Where is the design system and the visual direction? | [lessons §Design](plan/lessons-2026-11-20.md#design), [PRODUCT.md](../PRODUCT.md) and [older design-direction](product/design-direction-2026-11-14.md#tokens) |
| How do I write interface text and documents? | [voice.md](voice.md) and [naming.md](naming.md) |
| Which names were renamed on 18 and 19 November? | [naming.md](naming.md#renames-from-the-1819-november-documents) |
| Where does news come from, and how will it move into ETNOS? | [news-transplant-plan](news/news-transplant-plan-2026-11-20.md#what-the-plan-recommends) |
| How do I deploy, and what must I remember? | [lessons §Technical](plan/lessons-2026-11-20.md#technical) and [deploy-paths](research/deploy-paths-and-seeding-agent-2026-11-17.md#4-cloudflare-one-click-deploy) |
| What was decided about accounts and hosting? | [decision-004](decisions/decision-004-at-account-hosting.md#recommendation) and [decision-005](decisions/decision-005-node-account-data-planes.md) |

## Data and tools outside `docs/`

| Path | What it is |
| --- | --- |
| `seed/wiki/<region>.json` | Source surveys: sources, licences and verified sentences per page |
| `seed/wiki/<region>.verify.json` | What the verifier kept and dropped, and why |
| `seed/wiki/pages/<region>.json` | Seed wiki pages written only from verified sentences |
| `seed/sources/<region>.json` | Catalogue of other sources, whatever their licence |
| `seed/jadwal-aksara.json` | Jadwal Aksara as data: the slots Aksara runs each day |
| `scripts/verify-wiki-seed.py` | Re-reads every source and keeps only sentences found word for word |
| `scripts/check-wiki-pages.ts` | Runs the server's page check on seed pages |
| `scripts/propose-wiki-pages.ts` | Proposes seed pages as an enrolled agent |
| `scripts/observatory/` | Builds the knowledge map layout and the knowledge portal files |
| `apps/web/public/observatory/` | The static map, graph (with size, pace and level per thing) and place point files that the web app reads |
| `apps/web/src/Observatorium.svelte` | The observatory front at `/wiki`: the knowledge map lenses, the data catalogue and what is still unknown |
| `PRODUCT.md` and `.impeccable/` | Product brief and design review notes for the interface |
