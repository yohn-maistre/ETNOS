# What Strata is

The whole picture, in one place. Every agent and contributor should read this first. Written 19 November 2026 from the owner's description and checked against the code that day. Status words follow `proposal/claims-2026-11-18.md`: **live** (deployed on etnos.space), **built** (merged and tested, not yet deployed), **planned** (designed, not built), **idea** (not yet designed). Names follow `naming.md`.

## 1. The short version

Strata is a social network for a region and its peoples. People post, comment, vote, run polls, announce events, share photos and links, and join communities, much as they would on Reddit or Threads. The difference is what the network is organised around. Every post, community and page can be tied to a place, a people, a language or a topic. Underneath the conversation sits a shared wiki, written from cited sources, which researchers can also use as data. A small staff of AI assistants (Aksara) does the library work: gathering news, finding sources, drafting wiki pages and asking people questions. They work under rules each community sets, and they can be switched off.

ETNOS (etnos.space) is the first deployment, for Tanah Papua. The software is open source (AGPL-3.0), so another region can run its own.

A comparison that works for most people: **Reddit and Threads, organised around a place and its people, with a shared wiki and assistants that act as librarians.**

## 2. It is a social platform first

The conversation is what keeps the platform alive. People come back because their friends, family, church, school, office and village are there, not because of the wiki. The wiki, the dictionary and the observatory are useful only because people are already talking.

So everything people normally post belongs here:

- art, music, stories and photos;
- events, programmes, workshops and church or village gatherings;
- scholarships, jobs, calls for proposals and announcements;
- sport, politics, tech, education, local news and gossip.

Arguments and family matters belong here too, in the communities where people choose to have them. Organisations and government offices post announcements and answer questions in public. Nobody has to think about culture or preservation to use it.

What exists in the code today. Rows marked **built** are in the code and tests; before the proposal calls them live, check them on etnos.space and add them to the claims ledger (`docs/status.md` is older than the code on polls and events).

| What people can do | Status | Where in the code |
| --- | --- | --- |
| Post text, with Markdown, titles, content warnings and inline images | built | `src/forum.ts`, `src/post-content.ts`, `src/media.ts` |
| Comment, vote, bookmark, follow people | built | `src/core.ts`, `src/social.ts` |
| Run polls (two to six options, closing within 30 days) | built | `src/forum.ts` |
| Announce events, with "going" and "interested" | built | `src/forum.ts` |
| Share YouTube and Vimeo videos as cards, without loading the player until asked | built | `src/video.ts` |
| Share links from supported publishers with a preview card (Wikipedia, Antara, Jubi, Suara Papua, GitHub and others) | built | `src/link-preview.ts` |
| Post offers and requests (things, services, help) | built | `src/offerings.ts` |
| Public communities, and private ones that are listed or hidden; join openly, by request with a written reason, or by invitation | live | `src/core.ts`, `join_requests` |
| Organisations and institutions with their own spaces, and calls for help or work | built | `src/groups.ts`, `src/public-work.ts` |
| Local news from many publishers, grouped by story and sorted by place | built | `src/news.ts`, `src/clustering.ts` |
| Sign in with an existing Bluesky or AT Protocol account | live | `src/oauth.ts` |
| A new account hosted by ETNOS itself, several identities per person | planned, first in the build order | `research/pds-multi-identity-plan-2026-11-18.md` |
| Voice notes | planned | `research/epistemic-multiplex-2026-11-19.md` §10 |
| Uploaded video | planned | same |
| Direct messages | experimental | `src/dm.ts` |

## 3. Organised around places and peoples

Most social platforms are organised around people and their followers. Strata is organised around where people are from and what they share:

- **Places**, from province down to regency and named features (mountains, lakes, rivers, forests). Each has a page with its wiki article, its conversation, its news and its communities. **built**
- **Languages and topics**, each with the same kind of page. **built**
- **Peoples (suku).** Planned as pages of their own, with private spaces that hold a people's language work (`platform-2026-11-19.md` §4).
- **Labels.** Posts, pages, communities and works carry labels for places, languages and topics. Labels are never attached to people: the platform does not record anyone's ethnicity or clan. **live**
- **Living things.** Plants and animals get their own pages under the region where they live. **built**, pages in progress

This is what makes the feed useful locally ("what is happening in Paniai this week") and what makes the record useful to researchers ("everything recorded about this valley, by whom").

## 4. The shared record: wiki and observatory

The wiki holds what is known about each place, people, language, being and practice. Each sentence comes from a cited source. The first pages were written only from source sentences that were checked word by word against the original. **live**

Three things set it apart from an ordinary wiki:

1. **Who said it is part of the record.** A statement from a 1960s ethnography, a government report, a community member and a satellite measurement are all kept, each labelled with its source and kind. Where they disagree, both versions stand side by side. (Model: `research/epistemic-multiplex-2026-11-19.md`.)
2. **The wiki grows from conversation.** When people correct something, answer a question from Aksara, or post about a practice in a public community, that can become a proposed change, which people review. Nobody has to learn how to edit a wiki to contribute. Those who want to can still edit it directly.
3. **It is also an observatory.** The record is structured (entities, statements, sources), so researchers can analyse it. Examples: what a place's record is organised around, which knowledge rests on a single source, where outsiders' and residents' accounts differ, what is missing. Computed data is published openly under a licence and in standard formats. **planned**

## 5. The assistants: Aksara

Aksara is the name of the platform's AI assistants. They act as the staff of the commons, closer to librarians than to influencers. **live** in part:

- They read news from many publishers, group it by story and place, and post short summaries with sources.
- They draft wiki pages and changes. Drafts are labelled as AI-written and appear only after a person accepts them, unless a community chooses otherwise. **live**
- They answer when tagged, and say nothing when they have no source. **live**
- They ask the community questions where the record is thin, and post findings as cards built from a fixed set of components (OpenUI). **planned** (`research/aksara-living-program-2026-11-18.md`)

Limits:
- Assistants never read private communities unless a community explicitly allows it.
- They never post video or a synthetic voice.
- They never label people.
- Stewards can switch them off at once. **live**

The platform works fully without them.

## 6. Learning and keeping culture by using it

A people's culture gets recorded mostly as a side effect of ordinary use:

- **A community dictionary** (*Kamus komunitas*). It is seeded from published wordlists and dictionaries (TransNewGuinea.org, Steltenpool 1969). It then grows from what speakers say in language communities and voice notes: new words, forms, examples and recordings, with grammar notes drafted from the same material. The community decides what is published. **planned**, the next large piece after accounts (`research/community-dictionary-2026-11-19.md`)
- **Seasons and calendars.** Communities name their own seasons and tag posts with them. **built**
- **Answers to questions.** Aksara asks short questions, people answer in text or by voice, and accepted answers become recorded versions with the speaker's permission. **planned**
- **Direct contribution.** People can add sources, write pages and upload works. **live** for sources and pages.

## 7. Cultural artifacts: what can be recorded

Today the record holds text, images, links and video cards. We plan to add more kinds of artifacts. Each keeps the rule already in the code: **the custodial original and its approved public copy are different records**, and access, consent and cultural protocols are checked when something is used or published.

| Kind | Examples | Status |
| --- | --- | --- |
| Text and stories | Posts, written stories, oral accounts written down | live |
| Images | Photos of objects, places, events; re-encoded on the phone without location metadata | live |
| Links and embedded video | Publisher articles, YouTube and Vimeo | live |
| Voice notes | Short recordings from people: a word, a song line, an answer | planned |
| Uploaded video | Short clips from people | planned |
| Official recordings | Audio and video from institutions, archives and researchers, with rights and consent recorded | idea |
| Archival photographs and scanned documents | Old photographs, manuscripts, letters, maps; ideally served with IIIF so archives can link them | idea |
| 3D models | Meshes from photogrammetry (glTF) and 3D Gaussian splats of objects (noken, carvings, tools) and sites (honai, gardens), viewable in the browser | idea |
| Geodata | Routes, garden plots and named landscape features drawn by the community, at the precision the community chooses | idea |
| Dictionary entries and grammar notes | Words with forms, meanings, examples and audio | planned |

Alongside the originals, Strata keeps **derived views**, each labelled as derived and traceable to its source:

- transcripts and translations;
- labels and metadata (Dublin Core, Local Contexts labels);
- entities and statements extracted for the knowledge model;
- clusters and other computed structure;
- embeddings and measurements from public data (satellite embeddings, weather, species detected in sound).

Derived views can be recomputed, corrected and withdrawn without touching the original.

## 8. Who owns what

- **Accounts.** Accounts are AT Protocol identities. People can take their posts and identity to another host. **live** for sign-in; ETNOS hosting is **planned**.
- **Private stays private.** Private communities never reach public records, search, notifications, exports or the assistants. **live**, with the tests listed in the claims ledger. Today the operator of a deployment can technically read private communities, and the interface must say so (`showcase-plan-2026-11-17.md` §25.1).
- **Communities decide** who joins, what is published, what machines may read and what may train models. Machine and training permissions are **planned**.
- **Researchers** use open, computed data. Access to anything private goes through the community (see the idea of research requests in §10).

## 9. Who it is for

| Who | What they get |
| --- | --- |
| Residents and diaspora | A feed of what is happening in their places; communities for church, school, clan, sport, music and work; a way to stay connected from Jayapura, Java or abroad |
| Artists, musicians, storytellers | A place to post work where people from home see it; calls for work; a record of their work tied to their place |
| Organisations and government offices | Announcements, events, programmes and scholarships that reach people by place; public questions and answers |
| Language communities | A dictionary and grammar that grow from use, owned by the community |
| Teachers and students | Local content (muatan lokal) material: recorded words, stories, seasons and places |
| Researchers | An open, sourced, structured record of a region, with computed data and a way to ask communities questions |
| Regional government (Dinas) | Reports on what is recorded and what is missing, for cultural planning (PPKD) |

## 10. What else to add: "we have all this, it would be a pity not to…"

Ideas from this session, each built mostly from parts that already exist. All are **idea** status. Each is marked by how much it reuses: *small* (mostly existing parts), *medium*, or *large*.

1. **Opportunities board** *(small)*. Scholarships, jobs, grants and calls are among the most shared posts in Papua. Events and offers already have structured fields. An "opportunity" post type with a deadline, eligibility and a link, sorted by place and deadline, with a reminder, would make ETNOS useful every week, especially for students.
2. **Place calendar** *(small)*. Events, community seasons and public holidays in one calendar per place, exportable to phone calendars (ICS).
3. **Weekly digest by WhatsApp and email** *(small to medium)*. Most people in Papua live in WhatsApp. A weekly summary of a place's top posts, events and opportunities, with links back, brings people in without asking them to change habits. The founding flow already shares through WhatsApp.
4. **Works for low bandwidth** *(medium)*. Drafts and posts that queue offline and send when there is signal; small images by default; voice notes compressed on the phone. Connectivity in the highlands makes this a reason to use ETNOS over heavier apps.
5. **Translate this post** *(medium)*. A button that translates a public post between Indonesian, Papuan Malay and English, and later local languages through the community dictionary. It helps diaspora and researchers, and, with consent, gives the dictionary parallel examples.
6. **Recording session** *(medium)*. A guided mode for recording an elder or a performance properly: consent first, who is speaking (by role, as they choose), place and date, then transcript and review. It turns an ordinary voice note into an archive-quality record, and suits school assignments.
7. **Local Contexts labels on artifacts** *(medium)*. The Traditional Knowledge and Biocultural labels are an international standard for marking how a community wants something used. The documents already cite them; attaching them to uploads would make the rules visible to researchers and archives.
8. **Museum and archive holdings on place pages** *(medium)*. Many Papuan objects, photographs and recordings sit in museums and archives abroad with thin descriptions. Their public catalogue records can be linked to place and people pages, and communities can add what they know. This is the first step toward the *Pengembalian benda* (return of objects) work already named in the showcase plan.
9. **Research requests** *(medium)*. A researcher who wants to work with a community applies to its space, as people apply to join today: what they want, how the community benefits, and what will be published. The community approves or declines. This puts the Nagoya Protocol's consent and benefit-sharing into a form people can actually use.
10. **Citable data releases** *(small)*. Periodic snapshots of the open data and the dictionary on Zenodo, each with a DOI and in standard formats (CLDF for language data). Researchers can cite ETNOS, and the community's contribution shows up in publications.
11. **Credit for contributors** *(small)*. A record of what each person contributed (sources, answers, entries, reviews), shown on their profile if they choose, and printable for school, scholarship or job applications. It rewards the work without points or streaks.
12. **Classes as communities** *(small)*. A teacher opens a class community, sets tasks ("record three words for things in your garden"), and the results go through the same review as everything else. This links ETNOS to the local content curriculum.

Things we should **not** add, because they work against the rest:
- engagement-ranked feeds;
- streaks and points;
- public follower counts as a status signal;
- people or clan labels on profiles;
- face or voice recognition;
- anything that trains on private communities without that community's decision.

## 11. Where to read more

| Topic | Document |
| --- | --- |
| Building blocks, and peoples, languages and private spaces | `platform-2026-11-19.md` |
| Naming rule | `naming.md` |
| Build order for the showcase | `showcase-plan-2026-11-17.md` §25 |
| Knowledge model, research methods, public data, voice and video | `research/epistemic-multiplex-2026-11-19.md` |
| Community dictionary | `research/community-dictionary-2026-11-19.md` |
| Aksara's schedule and cards | `research/aksara-living-program-2026-11-18.md` |
| Rationale for the proposal, with laws | `rationale-threads-2026-11-19.md` |
| Problem, impact and positioning | `framing-and-impact-2026-11-17.md` |
| What we can claim in the proposal | `proposal/claims-2026-11-18.md` |

## 12. For the proposal, in Indonesian

A plain description to adapt. The final proposal keeps only what is **live** at submission.

> ETNOS adalah jejaring sosial untuk Tanah Papua. Orang bisa mengirim tulisan, foto, tautan dan video, membuat jajak pendapat dan acara, bergabung dengan komunitas umum maupun privat, dan mengikuti kabar dari tempat asalnya. Setiap kiriman, komunitas dan halaman bisa dikaitkan dengan tempat, bahasa atau topik, sehingga percakapan tersusun menurut wilayah. Di bawah percakapan ada wiki bersama yang ditulis dari sumber yang disebutkan, dan bisa dipakai peneliti sebagai data. Asisten AI bernama Aksara mengumpulkan kabar, mencari sumber, menyusun draf halaman wiki dan mengajukan pertanyaan kepada warga, menurut aturan yang ditetapkan tiap komunitas. Akun memakai AT Protocol, sehingga orang memegang identitas dan datanya sendiri. Perangkat lunaknya, Strata, terbuka (AGPL-3.0) dan bisa dijalankan wilayah lain.
