# BUDAYA GO! 2026: audit, build plan and vision

14 November 2026. Written after reading the planning docs and the owner's brief, checking the code, and screenshotting etnos.space at 1440px and 390px. It covers what's true now, what we can build before the proposal upload (18–19 Nov) and the showcase (4–5 Dec), and the longer vision for the deck. **Planning only.** Nothing here is shipped until the [feature ledger](../foundation/feature-ledger.md) says so.

## 1. Verified ground truth

| Claim in the brief | What the repo says | Consequence |
| --- | --- | --- |
| Spaces is implemented | **No.** `labs/spaces` is a real probe against the official alpha using synthetic accounts. The forum still uses ETNOS's own storage. The lexicon is `org.example.strata.post` and `ETNOS_PUBLISHING_ENABLED=false` in both wrangler profiles. The only remote branches are `main` and `feat/connected-oauth`, both already merged. | The proposal may claim a *tested Spaces experiment* and a *plan for the 1 Dec beta*, not Spaces-backed communities. If unpushed Spaces work exists on a laptop, push it before we write the deck. |
| News isn't joined to contexts | Correct, but **the join is cheap.** The West Papua Watch API behind `/v1/news` already accepts `place=<slug>` (verified live: `place=nabire` works), and each item carries `places[]` with slugs such as `nabire`, `papua-tengah` and `kampung-sima`. `contexts.aliases` exists and is empty. | Map each context to WPW place slugs. No schema change. Meepago → `nabire, paniai, deiyai, dogiyai, intan-jaya, mimika`. |
| Notes aren't a `record_contexts` kind | Correct. The CHECK constraint allows only `post, group, wiki, work`. | Adding `note` needs a table-rebuild migration and the boundary tests in AGENTS.md. Before judging, show notes through their linked page or community instead. |
| Polls are public | **No, already aggregate-only.** `core.ts` returns `COUNT(*)` per option plus a `mine` flag. No voter list reaches the API. | Add a minimum-n display rule and "dari N penjawab di ETNOS" labelling. Small UI work. |
| `commons_events` / `knowledge_history` unknown | `commons_events(community, actor, kind, artifact_kind, artifact_id, revision, created)` is a per-community change log. `knowledge_history` stores full note revisions. | A "what changed" timeline (*Waktu*) is buildable from existing data. |
| Page-level provenance computable | Yes. `wiki_revisions.perspective`, author and reviewer actor kinds, and citations are all there. | The voice spectrum can start honest and page-level. |
| Real hosted resident run | Not shown. It needs the owner signed in to Studio. The assistant has no owner session and must not bypass auth. | Owner action (§3, A6). |

### What the live site shows (14 Nov)

- **Content is the biggest risk, more than any missing feature.** There is one public Wiki page, whose body is just "Asal Usul". There are two contexts (Meepago, plus Musik Reggae with the test description "Skibidipapap"). Meepago says *"Belum ada percakapan tentang Meepago"* while a Nabire story leads the front page. "Suara komunitas" is empty. A beautiful observatory over empty data still looks empty.
- **Bugs:**
  - On first load, the Home right rail shows "Kabar belum dapat dimuat" even though `/explore` loads the same news.
  - The desktop Explore lead story renders with no image: `GET /v1/news/1453/image` returned 404, but it rendered on mobile moments later, which suggests an image-proxy cache miss or race.
  - CSP blocks an inline `data:` woff2 font and the Cloudflare Insights beacon. Either allow them or turn Web Analytics off in the dashboard.
  - The Explore chip row clips at "Tem…" on desktop, with no scroll affordance.
  - Test copy is live: "Jadi dulu ituhhh…" on the Wiki page and "Skibidipapap" on the reggae topic.
- **Wasted space:** the right rail repeats the same five communities on every page. That's the most valuable desktop real estate we have.
- **Repo hygiene:** `docs/evidence/project-lineage.json` holds private-repository metadata and is now public. Removing it from HEAD doesn't remove it from history. **Owner decision needed.**

## 2. Design direction: make the name literal

*ETNOS* means layers. Today the UI is calm, warm paper with a serif for the Wiki: tidy, but it could be any product. The signature should be **the cross-section**, used consistently:

- **The context page *is* a cross-section.** Don't build nine tabs (Kabar, Obrolan, Suara, Bacaan, Catatan, Halaman, Celah, Kerja, Tawaran), which won't fit on a phone. Stack three bands, top to bottom, like sediment:
  1. **Permukaan / Sekarang** (live): Kabar · Obrolan · Suara · Tawaran
  2. **Sedang terbentuk** (forming): Catatan · Celah · Kerja
  3. **Lapisan tetap** (settled, reviewed): Halaman · Bacaan

  Scrolling down is literally digging from today toward reviewed knowledge. That fixes mobile reading order, needs no tab bar, and gives the deck a one-line story: *setiap tempat punya lapisannya.*
- **The voice spectrum** is a thin stacked bar under a page title showing whose voices it rests on. It reuses the same band language and the same five voice colours.
- **Voice palette:** earth and mineral tones, for example slate (external source), ochre (archive), clay (community), forest (knowledge holder) and indigo (institution), each with a text label so colour isn't the only signal. **Avoid red-white-blue groupings** (politically loaded in Papua), and don't decorate with specific community motifs such as Asmat carving or noken patterns without consent. Abstract geological texture is ours to use.
- **Typography:** extend the Wiki serif to context and page headings, and keep the sans for conversation. Reviewed things look settled and editorial; live things look like chat.
- **Empty layers invite instead of apologising.** For example: "Belum terindeks: belum ada halaman tentang Meepago. Mulai dari kabar ini →". Never show "kosong" and never a completeness percentage.
- **Motion:** layers settle in from the top on load (a short stagger), and the steward's progress line already exists. Respect `prefers-reduced-motion`.
- **Naming:** keep "Wiki" in the nav, because it's instantly understood in Indonesia, and use "Pengetahuan bersama" as the page heading (as now). Avoid "Observatory" in the UI. Call the place page by the place's own name, with "Penampang" as the visual.

## 3. What we can build, in priority order

Estimates assume the assistant builds and the owner deploys and records.

### A. Before the proposal upload (≈2 days)

| # | Item | Notes and feasibility |
| --- | --- | --- |
| A1 | **Fix the visible bugs** (§1) | Small. Do first. |
| A2 | **Context page v1 as the cross-section** | One new read endpoint composing existing, already permission-filtered queries: posts, wiki and work through `record_contexts`, offerings through `place_context_id`, polls among context posts, and news through the alias → WPW place map. **No migration.** Medium. |
| A3 | **Celah v1 (deterministic)** | Pure queries per context: a news item with no page, an unanswered question, a page with external sources only, a stale page, a poll closed with no summary. Each links to "Jadikan kerja publik". Small to medium. |
| A4 | **Wiki reading page redesign + voice spectrum** | Serif reading column, sources as sidenotes on desktop and inline on mobile, review stamp, page-level spectrum from `perspective`, citation kinds and actor kinds. "Belum ada suara komunitas: tambahkan ceritamu" when the spectrum is all external. Medium. |
| A5 | **Explore and Wiki home polish** | Replace the repeated community rail with "Di sekitarmu": contexts you follow, kept in local storage for visitors and never as a blocking location prompt. Context cards with a mini cross-section. Fix chip overflow. Medium. |
| A6 | **Real hosted steward run** (owner) | The owner signs in and goes to Studio → Penghuni → Ringkasan sumber, then asks one `@aksara` question in a public community. Keep the receipt. If it abstains, that's a valid outcome to show. Without this, label the demo "simulasi" on screen. |
| A7 | **Seed real content honestly** (owner and assistant) | 3–5 contexts (Meepago, Danau Tigi/Deiyai, Bahasa Mee, a Papua music topic, Jayapura), 3–4 Wiki pages from permitted public sources with real citations and reviewer, one or two real native polls, and a few posts by the owner's own account. The steward's drafts are labelled. No invented users. Remove the test copy. |
| A8 | **"Tentang ETNOS" page with maturity labels** | The README status table, inside the app. Proposal–product consistency is 30% of the score, and this is the cheapest way to earn it. Small. |
| A9 | **Poll honesty** | Hide per-option totals until n ≥ 5 (configurable), and always show "dari N penjawab di ETNOS". Small. |

### B. Before the showcase (by 4 Dec)

- **Epistemic reactions** on Wiki paragraphs: *Saya tahu ini · Versi saya beda · Perlu sumber · Jangan disebarkan*. Only reviewers see the counts. **"Jangan disebarkan" is the standout:** a community member can flag that something shouldn't circulate, it goes to review, and the steward may hide it pending a decision. That's Indigenous data sovereignty (the CARE principles) as a button. It needs a new table and access tests.
- **"Dicatat berbeda"** as a proposal outcome: two attributed accounts side by side, built on `perspective` and the existing `wiki-diff.ts`. One hand-built gold page with claim-level layers.
- **"Apa artinya buat kita" weekly card.** A structured draft from the steward that a human approves before it publishes. Sections: what happened (sources) · who is affected · what we don't know · what members said (linked posts) · an open question that becomes a real poll. It explains stakes and doesn't take positions.
- **Waktu / Penampang timeline** from `commons_events`, `knowledge_history`, Wiki revisions and news dates.
- **Bacaan from OpenAlex** (its metadata is CC0): a person attaches works to a context, and members respond with *setuju / beda / kurang konteks* (Tanggapan komunitas). Metadata and abstracts only, as licences allow.
- **Notes as context records:** the `record_contexts` migration plus its isolation tests.
- **Spaces beta probe on 1 Dec:** rerun the lab against the updated reference PDS and report what changed. One synthetic test community at most. Don't move real communities.

### C. Vision and roadmap (the deck, not the demo)

- **Private communities on Spaces:** members' data lives in their own PDS, and poll ballots sit in a Space. Not E2EE. Credential lifetime is 600 s in the alpha.
- **Aksara nodes:** open-source, hardware-agnostic boxes (harness plus optional PDS) for a sanggar, a church, a school, a dinas or a museum, with private custody and reviewed public derivatives.
- **Institution identity through domains** (`.go.id`, `.sch.id`, `.desa.id`, `.or.id`) as AT handles, after checking each registry's rules. **Konsultasi publik** with signed "Tanggapan resmi".
- **PPKD lens:** a regency's cross-section can *feed* its Pokok Pikiran Kebudayaan Daerah under UU 5/2017. Pitch it as evidence, not a replacement. Verify the details in the law before using them in the deck.
- **Warta ETNOS:** a weekly one-page PDF per community for church bulletins and kampung boards, drafted by the steward and approved by an editor.
- **Steward as a document:** mandate, memory, permissions and log, portable across runtimes so a community can fork its steward. Hermes would be a second adapter beside Pi. Keep the rule that the role reading untrusted text never holds write power.
- **Language commons terms:** "terms, not prices." Reciprocity through Kerja publik. Communities can say no.
- **A Melayu Papua interface option**, written and checked by Papuan speakers ("Tong pu kabar"). Strongly rooted and fun, but it needs i18n plumbing first.
- **Kamu kenal ini?** Archive photo identification, after a protocol/permission layer exists.

### What I'd cut or defer

- **The Peta view** before judging. `NewsMap` exists, but the cross-section is more original and more on-thesis.
- **A global graph:** agreed, no.
- **Claim-level provenance everywhere:** only one gold page.
- **Hermes before judging, language licensing and local-offer monetisation:** roadmap only.

## 4. The demo story: one place, one week

**"Meepago, minggu ini."**

1. Open etnos.space without signing in. Explore shows Meepago in "Di sekitarmu".
2. On the **Meepago cross-section**, the top band holds a real ANTARA/WPW story about Nabire's forest programme (Kampung Sima and Wanggar Pantai) with the publisher credited, a few member posts, and a live poll.
3. Sign in with Bluesky and ask `@aksara`: *"Apa artinya program ini buat kampung-kampung di sekitar?"* A queued state turns into a cited reply (a real run, or labelled simulation).
4. The middle band shows a **Celah**: "1 kabar, belum ada halaman tentang KEE Sima–Wanggar". Turn it into Kerja publik, and the steward drafts a Catatan.
5. A human reviews it into a **Halaman**. Its voice spectrum is honestly almost all external source, with an invitation for community accounts. A member adds an account, and the bar changes.
6. Someone presses **"Versi saya beda"**, and the page records the difference instead of overwriting it.
7. Close on **Tentang ETNOS**: what's live, what's being tested, what's next, and Spaces on 1 Dec.

## 5. Rubric mapping

| Criterion | Weight | Our strongest evidence |
| --- | --- | --- |
| Cultural roots | 25% | Living culture as current talk, attributed accounts, "dicatat berbeda", "Jangan disebarkan", no universal ontology, local terms |
| Technical feasibility | 25% | A real deployed engine, 145 tests, AT OAuth, a bounded steward with receipts, permission-filtered derived data, a real Spaces probe |
| Business model | 20% | Aksara node setup, hosting and maintenance services; institutional hosting (dinas, sekolah, gereja, LSM); PPKD support; grants. Honest about scale: no invented users or revenue. |
| Proposal clarity and consistency | 30% | README status table = in-app Tentang page = deck. Each claim links to code or a receipt. |

## 6. Owner decisions needed

1. Is there unpushed Spaces work? If so, push it. If not, the deck says "experiment + beta plan".
2. `project-lineage.json` in a public repo: remove it from HEAD, rewrite history, or keep it?
3. Deploys: run `wrangler deploy` yourself, or save a Cloudflare API token to this environment so the assistant can deploy.
4. Content: which 3–5 places, languages and topics to seed, and which real sources we may cite.
5. Approve the three-band cross-section in place of nine tabs.
