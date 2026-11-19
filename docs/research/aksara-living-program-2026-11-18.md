# Ritme: how Aksara keeps the commons alive

18 November 2026. Design research; no code changed. It answers the owner's request for a recurring, generalisable programme for the agents that act as Strata's librarians: proactive posts, mentions, visible collaboration between regional voices, persistent memory on one key, and a reel of synthesised knowledge. Marks: *(proposal)* for suggestions the owner can overturn, *(not measured)* for estimates, *(to verify)* for open checks. Sources are at the end. It builds on `resident-harness-2026-11-17.md`, `aksara-workers-harness-2026-11-18.md`, `aksara-composed-views-2026-11-18.md`, `knowledge-graph-sota-2026-11-16.md`, sections 9 and 23 of `../showcase-plan-2026-11-17.md`, and sections 9 and 10 of `../framing-and-impact-2026-11-17.md`.

> **Scope, added the same evening.** The owner's read: this note runs ahead of the competition goal. Treat it as the long-term shape of Aksara's work, not the showcase build. For the showcase, only section 11's first rows matter, and only what runs by 26 November counts as *berjalan*. An earlier draft proposed **Tanya ETNOS**, a search-style "AI Mode" for the commons. **The owner dropped it:** people can already tag the main Aksara, which covers the same need without a second surface. (The "AI Mode" mention in the owner's message meant his pasted note had come from Google's AI Mode, not a request to build one.) The knowledge-object questions raised in section 10 moved to **[knowledge-ontology-2026-11-18.md](knowledge-ontology-2026-11-18.md)**, and from there to **[epistemic-multiplex-2026-11-19.md](epistemic-multiplex-2026-11-19.md)**.

> **Updated 19 November.** Ritme stays as designed. Four changes: (1) **the reel is a selector, not a separate surface** (section 8): a *Temuan* option beside *Terbaru* on Beranda, showing agents' composed cards; no full-screen vertical reel for the showcase, because its visual design is the risky part. (2) **People can now post voice notes and short videos**, as on Threads; agents still never post video or a synthetic voice (section 8.6). (3) **New card kinds from public data**: weather and season, landscape change, forest sounds (section 8.3). (4) Motif outputs from the multiplex note feed the existing slots (section 4.5).

## 1. The idea in one paragraph

Most platforms that add an AI add a chatbot that waits to be asked. The owner's idea is different: **a commons with a staff.** A small team of librarians (one Aksara with a voice per region) keeps a public, sourced rhythm of work: the morning news by place, a story, a question, what changed in the wiki today, a longer finding when one is ready, and a weekly and monthly summary. They answer when tagged, hand questions to the people who know, and do the quiet upkeep a library needs. All of it is visible, sourced, budgeted and correctable. The rhythm is data, not code, so any community (a Kalimantan deployment, a church synod, a partner in Aotearoa running its own node) can load its own. We call the rhythm **Ritme**.

What makes it more than a content machine: everything Aksara makes is a question to the community as well as an answer, and what people answer settles into the record. The platform cares for the knowledge; the people own it.

## 2. What exists today, and what is missing

Read from the code on `main` (18 November, morning) and the latest docs.

| Piece | Today | Missing for Ritme |
| --- | --- | --- |
| Resident runtime | `packages/resident-pi`: pi-durable in a Durable Object, one bounded job at a time (8,192-token context, 600 output tokens, 3 turns, 6 tool calls) | Long-lived regional sessions; a startup read; a journal |
| Scheduling | `StrataNode.alarm()` wakes the resident and discovery; per-community config allows 1–5 jobs a day at intervals of at least 60 minutes | Named slots at set local times; per-region budgets; a sitewide ceiling |
| Skills | `source-digest`, `research-question`, `knowledge-draft`, `thread-reply` | Kabar pagi, Sedang dibicarakan, Temuan, Hari ini di Wiki, weekly and monthly summaries, upkeep |
| Story desk | `src/desk.ts`: copy then retell, quotes verified word for word; kinds `cerita`, `kata`, `tempat`, `riset`, `arsip` | Used by a schedule rather than by hand |
| Mentions | `createMentionPost`, routing to an Aksara identity; `mentions_enabled` defaults to off | Memory of the place when answering; handing off between regions |
| News | `src/news.ts` reads clustered stories from the West Papua Watch API with a `sourceCount` per story and places | A trending rule; the engine moving into Strata (owner's plan) |
| What people talk about | `Groups.talked(days)` ranks places, languages and topics by public posts, threads and people | A digest that links threads without retelling people |
| Sources panel | "Sumber" under every agent post; Benar, Ada yang salah, Saya tahu lebih | A reply becoming a wiki proposal (next step in the showcase plan) |
| Memory | Transcript of one thread only | Place notebook (task 48), journal, rebuildable summaries |
| Regional voices | Planned: seven from the place pack (task 30) | Co-authoring, cross-checking, handoff |
| Composed views | Researched: typed JSON specs from a fixed catalogue | Cards for the reel |
| Outside agents | Agent gate: enrolled agents with keys, short tokens, MCP, a named operator | A rota slot for an outside librarian |
| Feed rules | Planned: never two Aksara items in a row, at most one in five, morning posts collapse into one card | Built |

So the parts are mostly there. What is missing is the **rhythm**, the **memory**, and the **rules that keep a staff from turning into a bot farm**.

## 3. What Grok on X and Meta AI on Threads teach us

- **Tagging works, and people use it as an arbiter.** A study of three months of `@grok` mentions found Grok replied to about 62% of posts that prompted it, and that people cast it as a truth arbiter in disputes. *Lesson:* Aksara must answer from sources or say clearly that it cannot, and it must hand contested cultural questions to people rather than rule on them.
- **Trending summaries built from chatter alone mislead.** X's Grok-written Stories summarise trending topics in Explore, and were reported to draw on conversations on X rather than the article text. *Lesson:* when Aksara summarises a trending story, it shows **what the sources say** and **what people here are saying** as two separate, labelled parts, and the first comes from the articles themselves.
- **A hidden prompt change becomes a public crisis.** In May 2025, xAI blamed an unauthorised edit to the `@grok` reply prompt for unprompted political answers. It then began publishing Grok's system prompts on GitHub with a changelog. *Lesson:* Aksara's prompts, Ritme and skills live in the repository, change only through review, and are shown on a public "Cara Aksara bekerja" page with their history. Strata's mandates already make authority explicit; prompts should be equally explicit.
- **People need an off switch.** Threads users can tag `@meta.ai` for a public reply. Users found they could not block the account, and the backlash was immediate; Meta pointed to muting and "Not interested". *Lesson:* follow, mute, pause **and block** for every Aksara voice, as section 9 of the showcase plan already says.
- **Answer in the asker's language, with citations.** Meta AI on Threads runs on Muse Spark with live web search and cited sources, and answers in the language of the question. *Lesson:* Aksara answers in Indonesian or Papuan Malay as asked, and never in a Papuan language it does not hold sources for.
- **Personal memory is the wrong memory for a commons.** Grok remembers each user's past chats. *Lesson:* **Aksara remembers places, not people.** Its memory is the place notebook and its own journal. It keeps no profile of anyone, beyond what is public on a person's own page.
- **Scheduled tasks are the pattern, but private.** Grok can run recurring prompts on a schedule and notify one user. Ritme is the same idea made **public and communal**: one schedule per place, visible to everyone, its output open to correction.

## 4. Ritme: the programme

### 4.1 The shape (generalisable)

A Ritme is a list of **slots**. Each slot names *when*, *what*, *where*, *which gates* and *how much*. It lives in the place pack as data, so a new deployment edits a file, not code.

```yaml
# place-pack/ritme.yaml (proposal)
version: 1
timezone: Asia/Jayapura
ceilings:
  agent_share_of_feed: 0.2        # at most one in five items
  posts_per_voice_per_day: 4
  neurons_per_day: 8000           # leave 20% of the free allowance for replies
voices: from-pack                  # one per top-level region, plus the sitewide voice
slots:
  - id: kabar-pagi
    at: "06:30"
    skill: kabar
    scope: each-region
    gate: { min_independent_sources: 3, window_hours: 24 }
    max_items: 3
  - id: cerita
    at: "08:00"
    skill: desk.cerita
    scope: each-region
    gate: { verified_quotes: 2 }
  - id: sedang-dibicarakan
    at: "12:30"
    skill: digest.talked
    scope: sitewide
    gate: { min_threads: 3, min_people: 5, exclude: [keluarga, duka, warning] }
  - id: soal-hari-ini
    at: "16:00"
    skill: card.question
    scope: each-region
  - id: hari-ini-di-wiki
    at: "19:30"
    skill: digest.wiki
    scope: each-region
    gate: { min_changes: 1 }
  - id: temuan
    when: ready                    # only when a finding passes its checks
    skill: research.finding
    scope: each-region
    max_per_week: 2
  - id: ringkasan-mingguan
    at: "sun 18:00"
    skill: digest.week
    scope: each-region
  - id: denyut-budaya
    at: "month-end"
    skill: report.pulse
    scope: each-region
  - id: upkeep
    every: "6h"
    skill: library.upkeep
    scope: each-region
    visible: worklog               # no posts; entries in the public work log
```

Rules that apply to every slot:

1. **A slot with nothing good to say stays silent.** Gates are minimums, not quotas; an empty morning is better than filler.
2. **Every post carries its sources** in the Sumber panel and ends with a question.
3. **Feed share is enforced at read time:** never two agent items in a row, at most one in five, and the regional morning posts collapse into one card in the all-Papua view.
4. **Budgets are reserved before a call**, through the existing ModelGateway reservation, so a runaway job cannot spend tomorrow's allowance.
5. **The schedule is public.** "Cara Aksara bekerja" shows today's Ritme, what ran, what was skipped and why.

### 4.1a Voice in the rhythm *(added 19 November)*

Some slots invite answers by voice, because many people would rather speak than type, and because a voice answer in a Papuan language is the most valuable witness the commons can receive:

- **Soal hari ini** carries a *Jawab dengan suara* button. A voice answer is a post like any other, with its protocol and training-permission flags.
- **Cerita** ends with *Ceritakan versimu*, which opens the recorder.
- **Kata** cards play the voice clip a language room chose to publish.
- **Hari ini di wiki** counts voice answers that became accepted variants, by language.

Aksara never transcribes a voice note into a public post without the speaker's choice, and never reads anything aloud in a synthetic voice.

### 4.2 The staff: roles, not more accounts

One Aksara per region, wearing different hats. The hat shows as the post's kind label, not as a separate account.

| Role | Indonesian label | What it does | Built on |
| --- | --- | --- | --- |
| News desk | **Kabar** | Morning news by place from clustered stories | `news.ts`, then the in-Strata engine |
| Storyteller | **Cerita, Kata, Tempat, Arsip** | Short sourced pieces | `desk.ts` (exists) |
| Librarian | **Pustaka** (work log only) | Link checks, source withdrawals, stale claims, gap lists, proposals from accepted replies | wiki proposals, discovery |
| Questioner | **Tanya, Soal Hari Ini** | Questions, polls and cards (framing doc §10) | polls, card engine |
| Researcher | **Temuan** | Longer findings across sources and data, with composed cards | composer catalogue |
| Host | **Balasan** | Answers mentions, welcomes newcomers, hands questions to people and other regions | `thread-reply` |

### 4.3 Proactive posts the owner asked for

**Kabar pagi: trending news by evidence, not by clicks** *(proposal)*

- A story qualifies when it has at least three **independent** publishers in 24 hours (from the cluster's `sourceCount`, deduplicated by publisher) and names a place in the region.
- Rank qualifying stories by independent sources, then by recency. Engagement is not an input, matching the published ranking rule.
- The post has two labelled parts: **Apa kata sumber** (two or three sentences, each traceable to a linked article) and **Di ETNOS** (links to threads already discussing it, with counts, never a retelling of what individuals said).
- Up to three items per region, collapsed into one card sitewide.
- Political news is allowed on the platform under the existing aggregation rules, and left out of the showcase walk.

**Sedang dibicarakan: what people are talking about**

- Built on `talked()`: places, languages and topics ranked by threads and distinct people in public communities.
- Aksara names the topic, links the busiest threads and adds sourced context from the wiki ("Yang sudah tercatat tentang ini"). It does **not** summarise or quote individuals, and it skips family news, funerals and content-warned threads.
- Minimums (for example three threads and five people) prevent spotlighting one person's post.

**Hari ini di Wiki and Temuan: the longer pieces**

- **Hari ini di Wiki** every evening: new pages, accepted corrections and variants, and newly opened questions, each linked, with thanks to contributors who agreed to be named.
- **Temuan** (finding) only when ready: a longer piece synthesising several sources, data and accepted variants around one question ("Apa yang diketahui tentang perahu di Danau Paniai?"). Each sentence is tied to a source or a variant; a composed card (a timeline, map or comparison) may accompany it. At most two a week per region.

### 4.4 Mentions: tagging Aksara

- Mentions are on by default once a voice has a named human steward (today they default to off).
- **Answer, hand off, or ask.** Aksara answers from the notebook and accepted sources; if the question belongs to another region it hands off visibly ("Saya teruskan ke Aksara · Mee Pago"); if nothing is recorded, it says so and offers to open the question to the community as a card.
- **Never the arbiter of culture.** For contested or customary questions, Aksara shows what each source and each accepted variant says, and invites people who know to answer.
- **Language:** reply in the asker's language (Indonesian or Papuan Malay); never generate text in a Papuan language.
- **Rate limits** per person and per thread, and a fold for unanswered agent replies after two days, as already planned.

### 4.5 Fed by the knowledge model *(added 19 November)*

The analyses in `epistemic-multiplex-2026-11-19.md` give the slots better material without new slots:

| Slot | New input | Source |
| --- | --- | --- |
| Soal hari ini | Predicted links turned into questions; thin, single-voice entities | Motifs M8, M9, M15 |
| Temuan | A gap closed; a constellation changed; outsiders' and tellers' salience compared | M2–M5, M8, M16 |
| Hari ini di wiki | New assertions by voice, so the tellers' layer visibly grows | Voice lens |
| Denyut (monthly) | Vitality list, voice comparison, strategic diagram per region | Five lenses |
| Kabar pagi | Weather and season by place; *Siaga* for heavy rain | Open-Meteo (multiplex note §9) |
| Upkeep | Landscape change flagged for a place, queued as a question to its people | Satellite embeddings, M21 |

## 5. Showing collaboration without a bot farm

The owner wants visible collaboration between regional voices, as a calculated display that invites people in, and explicitly not ten agents talking over each other. Four patterns do this, each with a function people can see:

| Pattern | What people see | Why it is not noise |
| --- | --- | --- |
| **Rapat pagi** (morning meeting) | One card each morning: every regional voice proposes one item; the sitewide voice picks the front page and says why in one line. People can react and suggest. | One card instead of eight posts; shows editorial judgement in the open |
| **Ditulis bersama** (co-authored) | One post written by two voices about a place both cover (Nabire: Mee Pago and Saireri), with each region's sources side by side and "who says which" where they differ | Turns a contested place into a respectful, sourced comparison |
| **Diperiksa oleh** (cross-checked) | A line under a post: "Kutipan diperiksa oleh Aksara · La Pago". A second voice re-runs the quote check before posting. | A real safety step, borrowed from multi-agent compare-and-refine, shown as one line |
| **Serah terima** (handoff) | "Saya teruskan ke Aksara · Saireri" in a reply, then that voice answers | Shows routing and regional humility |

Kept from the showcase plan: no agent replying to another agent in a thread. Collaboration shows as co-authorship, checking and handoff, never as a conversation between bots.

**Region categories generalise.** The voices come from the place pack's top level: seven wilayah adat for Tanah Papua; the provinces or customary regions a Kalimantan deployment chooses; for a partner elsewhere in the Pacific, whatever regions *that partner* defines on *its own* node. ETNOS does not run voices for other peoples. *(Positioning note from the framing doc: export the engine, do not expand ETNOS.)*

**Outside librarians.** Through the agent gate, an institution's agent (Claude Code, Hermes or another harness with a mandate and a named operator) can take a Ritme slot for its own community, for example a school's weekly "Kabar sekolah". This is the agents-doing-public-work demo from the framing doc, with a schedule.

## 6. Persistent agents with memory, on one key

### 6.1 One key, many voices

- **One model credential per deployment**, held only by the ModelGateway (a Workers AI binding by default; the operator's Gemini key once added, as decided for Run 3). No voice ever sees the key.
- **Every call is reserved and metered** against the voice's daily budget and the sitewide ceiling. This is the existing reservation pattern, extended with a `voice` field.
- Switching providers changes one gateway setting, not eight agents.

### 6.2 Long-lived voices on pi-durable

Today each job is a fresh, bounded conversation. The proposal keeps pi and the place notebook (as the harness research recommends) and adds a **shift**:

| Layer | What it holds | Where | Rule |
| --- | --- | --- | --- |
| Procedural | Ritme, skills, prompts, region label | repository and place pack | changes by review only; shown publicly |
| Semantic | Place notebook: facts with sources, accepted variants, open questions | StrataNode SQLite (truth) | every fact resolves to a live source at read time; withdrawal removes what was derived |
| Episodic | **Journal**: what the voice did, read, skipped and learned, with source ids | the voice's Workspace (`/journal.md`, append-only) | never stores instructions taken from posts; prunable on withdrawal |
| Working | One job's transcript | pi-durable, compacted | discarded after the job |
| Summaries | Rebuildable notes (`/memory/*.md`) from notebook and journal | Workspace | regenerated, never canonical |

Each voice is one Durable Object with a `@cloudflare/computer` Workspace (Workers Free supports the filesystem and tools; code execution needs Paid). The folder layout from the Workspace research: read-only `/place` generated from the notebook, writable `/scratch`, `/drafts`, `/journal.md`.

**A shift** *(proposal)*:

1. **Wake** on the node alarm at the first slot of the day.
2. **Startup read**, small and fixed: today's Ritme, the last N journal entries, the region summary, open tasks and questions, mentions waiting.
3. **Run the due slots**, each as a pi task with its own budget, writing drafts to `/drafts` and passing them through the desk checks.
4. **Publish or abstain** through Strata's existing authority and mandate checks.
5. **Write the journal**: what ran, what was skipped and why, sources read, questions raised.
6. **Sleep** until the next slot. Mentions wake the voice between slots as child tasks that read the same memory.

**Safety properties**

- **Posts are data, never instructions.** Text from posts and sources can fill drafts, never change the Ritme, prompts or mandates.
- **No memory of people.** The journal records sources and records, not profiles.
- **Withdrawal wins.** A withdrawn source or a moderated post removes derived summaries and journal references on the next rebuild.
- **pi-durable is marked Experimental.** Pin exact versions, as now.

### 6.3 Budget *(not measured)*

- On Workers AI Free, the harness research estimates about 150 one-round replies a day across all eight voices.
- A full Ritme day per region (three Kabar items, one Cerita, one question, the evening wiki digest, about ten replies) is roughly 15 to 20 model calls, so about 120 to 160 calls a day for eight voices. That only fits Free if the sitewide voice carries the heavy work and quiet regions skip slots.
- With the operator's own key, the limit becomes money instead of neurons. Measure tokens per slot for a week on two regions before switching on all eight; the gateway already meters this.
- *Before the showcase:* run two regions (Mee Pago and Saireri) plus the sitewide voice. Turn on the rest as each gains a named steward and seeded pages, as already decided.

## 7. "Before people join": a fortnight of public work

The owner wants the site fully active before people arrive. *(proposal)*

- **Two weeks of Ritme in public** before the wider invitation, with the close friends already planned carrying the human side.
- Label it honestly on the Tentang page: "Aksara mulai bekerja pada … Ini catatan kerjanya." The work log becomes evidence of a living system.
- In the proposal, **report agent activity and human activity separately.** Agent posts are not users; counting them as such would fail the juknis's honesty rule.

## 8. The reel: Temuan, and the feed's rails

**What "reel" means here** *(clarified 19 November)*: a stream of **cards that agents compose from a fixed catalogue of Strata components** (charts, timelines, maps, comparisons, word cards, questions), each carrying its sources. Agents fill typed specs; they never write code, HTML, video or audio. People's own posts, including voice notes and videos, stay in the ordinary feed.

### 8.1 Should synthesis go in the main feed?

Both, with a clear split:

- **Beranda (Terbaru · tempat) stays people-first.** At most one agent item in five; the morning card; anything a person has replied to or confirmed.
- **The reel holds synthesis in volume.** That way the main feed never feels like a bot site, and the synthesis still has a home where people can dive in.

### 8.2 A selector, not a new surface *(revised 19 November)*

On Beranda, a selector beside the existing sort: **Terbaru · Temuan** (and later **Kerja** for public work and open calls). *Terbaru* is people first, as now; *Temuan* shows only composed cards, newest and best-evidenced first, in the same list layout as posts. No full-screen vertical reel for the showcase: its visual design is the risky part and it can come later once the cards prove themselves. A place page gets the same selector, filtered to that place.

### 8.3 What a reel card is

Every card is a **composed view**: a small typed JSON spec from the fixed catalogue, rendered by Strata's own Svelte components, carrying its sources. The model fills a form; it never writes code or HTML. That is the composed-views decision, and it keeps the reel safe on the free tier.

| Card | Example | Primitive |
| --- | --- | --- |
| **Temuan** | "Tiga sumber menyebut … ; satu versi keluarga menyebut …" | text + sources + variants |
| **Angka** | One figure, with its source and date (official data beside what people reported) | stat |
| **Garis waktu** | A place's events across a century | timeline |
| **Peta berubah** | What changed on a place's map this month | map |
| **Bandingkan** | Two sources that disagree, side by side | comparison |
| **Kata** | A word a language room chose to publish, with its voice clip | word card |
| **Arsip** | A public-domain archive photo with "Ini di mana?" | archive card |
| **Kabar terkumpul** | A clustered story: what the sources say, what people here say | cluster |
| **Pertanyaan** | An open question or a card from the framing doc's §10 primitives | question |
| **Cuaca dan musim** *(new)* | This month's rainfall and temperature for a place beside what people say marks the season | stat + season *(Open-Meteo, CC BY 4.0)* |
| **Lanskap berubah** *(new)* | "The land here changed between 2019 and 2024. What happened?" with before/after imagery where licensed | map + question *(satellite embeddings; multiplex note M21)* |
| **Suara hutan** *(new)* | Species heard in a recording someone chose to share, under the names people gave them | sound card *(Perch 2.0, opt-in; M23)* |
| **Suara warga** *(new)* | A person's voice answer that became an accepted variant, with transcript | voice card *(with the speaker's permission)* |

Actions on every card: **Benar · Ada yang salah · Saya tahu lebih**, Simpan ke Noken, Bagikan ke WhatsApp, Buka sumber.

### 8.4 Reel rules

- **Published ranking:** freshness, relevance to the chosen place, evidence strength (independent sources, accepted variants), and diversity of layers. No engagement prediction, consistent with the existing ranking rule.
- **Finite at the top, deep below.** After today's cards, "Kamu sudah melihat semua temuan hari ini". Scrolling on continues into **Gali**: older layers, back through time (framing doc §10).
- **Agents post no video and no synthetic voice.** Cards may embed a person's clip with that person's permission. People themselves may post voice notes and short videos (section 8.6).

### 8.5 Cards are OpenUI *(decided by the owner, 19 November)*

- The owner chose **OpenUI** (Thesys, MIT) to minimise fragile custom code. The model writes OpenUI Lang using only components we register with zod schemas; the prompt is generated from that library; the parser and renderer do not depend on a hosted service.
- Svelte: `@openuidev/svelte-lang` (MIT, Svelte 5) supports OpenUI Lang 0.5; 1.0 features need the React renderer for now. Server-side validation with `@openuidev/lang-core` before a view is stored; data still comes from Strata's viewer-checked resolvers. No OpenUI Cloud or gateway.
- This replaces the earlier plan for our own zod spec in json-render shape (`aksara-composed-views-2026-11-18.md`). Details: `bahasa-tumbuh-2026-11-19.md` §12.
- Status: decided, not built. New card kinds from this session (*Cuaca dan musim*, *Lanskap berubah*, *Suara hutan*, *Suara warga*, *Kata*, and Bahasa Tumbuh's one-tap questions) are components in the same library.

### 8.6 Voice and video from people *(added 19 November)*

The owner now wants Threads-style multimodal posting: voice notes as a first-class post component, and short videos. This supersedes the earlier "no original video" line for people's posts; it does not change what agents may do.

- **Voice first.** A voice note is recorded in the browser, validated and stripped of metadata like images today, shown with a waveform, and transcribed in the background (Whisper for Indonesian and Papuan Malay; Omnilingual ASR or the community's "bantu tulis" for Papuan languages). About 1.5–2 days of work; the one multimodal piece that can be live by 25 November.
- **Video second.** Up to 60 seconds at first, via Cloudflare Stream or R2 with compression on the phone, with captions from the transcript and an audio-only fallback. About 2 days more.
- **Rules.** Protocol and training-permission flags on every post; no voiceprints or face recognition; PP 17/2025 duties before video opens to everyone.
- **Where they show.** In *Terbaru*, on place pages, and as *Versi lain* when a voice answer is accepted. Full technical path, costs and AT Protocol notes: multiplex note §10.

## 9. Asking Aksara: tagging is enough

There is no separate search or "AI Mode" surface. To ask the commons something, people tag the main Aksara (or a regional voice) in a post or thread, as section 4 describes. Two ideas from the dropped draft survive inside mentions:

- **Answers show their layers:** what sources say (cited), what people here have said (linked threads and accepted variants), and what is not known yet.
- **Thin answers become questions to the community.** When the commons has little, Aksara says so and offers to turn the question into a public card for that place, so not-knowing becomes work the librarians and the community can fill.

## 10. The ontology note the owner shared

A summary from another assistant proposed applied ontologies, a four-tier cyclical model, hypergraphs, temporal modelling, sensory media and negative competency questions. Checked against the sources:

- **The four-tier model is real but misattributed.** Wang, Hsieh and Lai (Social Sciences, 23 December 2025) describe individual tacit (K1), individual explicit (K2), community tribal (K3) and community cultural knowledge (K4) as a bidirectional cycle, with an agentic architecture. It is about the **Paiwan of Taiwan**, not Papua. The Paniai and noken examples in the note were added by its writer.
- **OntoKG** (April 2026) is real. It routes properties as intrinsic or relational to build a typed graph from Wikidata.
- **ATR4CH** (November 2025) is real. It extracts hypotheses and evidence from heritage texts about authenticity debates. Whether it links competing hypotheses explicitly is not clear from the abstract.
- The Papuan cosmology studies the note cites are *(to verify)*; read them before citing.

The deeper question the note raised (what the things in a people's knowledge are, and how the map should show them) is answered in **[knowledge-ontology-2026-11-18.md](knowledge-ontology-2026-11-18.md)**, including how seeding from published sources fits with the rule against a generated first-person voice.

What to take, and what not to:

- **Take negative competency questions, and make them tests.** A written list of things Aksara must never infer, enforced in code and tested. For example: never connect a *Jangan disebarkan* item to a public answer; never infer a person's clan or marga from a name; never present a region as a land boundary; never put a colonial exonym before a people's own name; never write in a Papuan language. This fits the repository's rule that boundary changes need tests.
- **Take n-ary events and provenance, which we mostly have.** CIDOC CRM is already the export target, every source has a `perspective` tag, and seasons per community exist (`src/seasons.ts`). Events as hubs are worth adopting in the notebook schema.
- **Take the K1–K4 lens for page structure.** K1 maps to voice, video and Karya; K2 to Pengetahuan; K3 to community protocols, labels and access; K4 to the people's own framing.
- **Push back on one recommendation.** The note suggests using a people's cosmology (K4) as an alignment prompt so the AI explains practices "within the community's own worldview". That is exactly the first-person cultural voice the showcase plan rules out. K4 should come only from tellers, shown as their accounts, never generated by Aksara.

## 11. Showcase slice and order *(proposal; estimates not measured)*

Fits Run 3 of the showcase plan (Aksara with proper keys, seven voices, place notebook).

| Order | Piece | Days |
| --- | --- | --- |
| 1 | Ritme file, slot runner on the node alarm, budgets, feed-share rule at read time | 3 |
| 2 | Kabar pagi (three-source gate, two labelled parts) and Sedang dibicarakan | 2 |
| 3 | Journal and startup read for two voices (Mee Pago, Saireri) plus sitewide | 3 |
| 4 | Mentions on with handoff | 1 |
| 5 | Hari ini di Wiki; Rapat pagi card; one co-authored Nabire post | 2 |
| 6 | *Temuan* selector on Beranda with four card kinds (Temuan, Angka, Bandingkan, Kabar terkumpul), then Cuaca dan musim | 3 |
| 6a | Voice notes from people, and *Jawab dengan suara* on Soal hari ini *(added 19 November)* | 2 |
| 7 | Negative competency tests (first ten) | 1 |
| 8 | Cara Aksara bekerja page: Ritme, prompts, changelog, work log | 1 |

About 17 working days as first estimated; in the agent's own working time, closer to 10–12 *(revised 19 November, not measured)*, so it still overlaps the proposal week. **For the proposal, only what is running by 26 November counts as *berjalan*;** the rest is *rencana*. OpenUI and the other five voices are January work.

## 12. Open questions for the owner

1. Should the morning card publish at the same local time in every region, or follow each region's own rhythm?
2. Which threshold makes a story "trending": three independent publishers, or more?
2a. When a voice answer is transcribed, does the transcript publish with it by default, or only after the speaker checks it? *(Recommended: only after the speaker checks it.)*
3. Do we name contributors in "Hari ini di Wiki" by default, or only with consent? *(Recommended: consent.)*
4. Which outside institution could take the first Ritme slot through the agent gate?

## 13. Sources

Read 18 November 2026.

- Grok replies and roles: <https://arxiv.org/html/2602.11286>, <https://arxiv.org/pdf/2602.11286>
- Stories on X by Grok: <https://techcrunch.com/2024/05/03/x-launches-stories-on-x-delivering-news-summarized-by-grok-ai>
- Grok system prompts published after an unauthorised edit: <https://www.nbcnews.com/news/amp/rcna207222>, <https://techcrunch.com/?p=3007866>, <https://www.gigazine.net/gsc_news/en/20250519-xai-grok-system-prompts-github>
- Grok memory and tasks: <https://www.macrumors.com/2025/04/17/grok-ai-chatbot-gains-memory-feature/>, <https://www.eweek.com/de/news/grok-cheat-sheet-complete-guide/>
- Meta AI on Threads: <https://www.socialmediatoday.com/news/meta-ai-chatbot-begins-testing-on-threads/820051/>, <https://clawdbytes.pages.dev/article/2026-05-13-meta-wont-let-you-block-its-ai-account-on-threads.html>, <https://www.taiwannews.com.tw/zh/news/6372720>, <https://neuronfeed.com/news/threads-tests-meta-ai-integration-mimicking-x-s-grok-functionality>
- OpenUI: <https://awesome.ecosyste.ms/projects/github.com%2Fthesysdev%2Fopenui>, <https://aicoolies.com/tools/openui-thesys>, <https://capitalandcompute.net/md/what-is-openui.md>
- Ontology note: Wang, Hsieh and Lai (2025) <https://www.mdpi.com/2076-0760/15/1/7>; OntoKG <https://arxiv.org/abs/2604.02618>; ATR4CH <https://arxiv.org/abs/2511.10354>
- In this repository: `src/resident.ts`, `src/resident-contract.ts`, `src/worker.ts` (alarm), `src/desk.ts`, `src/news.ts`, `src/groups.ts` (`talked`), `packages/resident-pi/`, and the research notes named at the top.
