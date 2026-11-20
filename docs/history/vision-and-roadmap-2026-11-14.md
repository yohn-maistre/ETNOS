# Vision, ideas and roadmap

14 November 2026. Agreed with the owner in the BUDAYA GO! planning session. This is a record of direction and ideas. Nothing here is shipped until the [feature ledger](../foundation/feature-ledger.md) says so. See also the [build plan](../competition/budaya-go-plan-2026-11-14.md) and [design direction](../product/design-direction-2026-11-14.md).

## The whole system

Three layers, described in the [README](../../README.md#how-it-fits-together): the public square on the surface, shared knowledge in the middle, and private originals in custody underneath. Things move up a layer only when a person decides. Use the layer names quietly, as a way to draw the system. They are not a slogan.

ETNOS today is a managed site with a managed steward and seeded public sources. That is the pilot. Institution-run Aksara Nodes and hosted accounts come after, through real partnerships.

## Decisions

- **Everything in the stream is a post.** Votes, replies, threads and saves stay. Findings, gaps and page cards differ by small marks only.
- **Reply, vote, save and share stay as icons.** Check buttons on findings keep their words.
- **Places are destinations. Explore is personal.** Explore shows news, threads, things to check and pages from the places you follow, and everything when you follow none.
- **You choose your places in the app.** Never inferred from where your account is hosted. The choice is private.
- **Many squares, one engine, portable accounts.** ETNOS is Papua's square. Strata is what other peoples deploy for their own, with their own name, art, languages, sources and rules. Accounts work across squares. Squares reading each other's public posts depends on AT publishing, which is off today.
- **Nothing Papua-specific is hardcoded in the engine.** Place names, the news desk and cover art become deployment settings.
- **Aksara's posts are typed blocks.** A source list, a claim check, a poll proposal, a comparison, a gap, a page draft. The app renders each with a real component wired to a real action. No free-form generated interface, and no mockups.
- **Aksara's visible work is the seed, and it must be true.** People arrive, watch it work on their knowledge and get invited in. Cap its volume, label it, and show receipts.

## Journey: first visit to first contribution

```mermaid
flowchart LR
  A["Arrive, read without an account"] --> B["Pick places you care about"]
  B --> C["Explore: news, threads and pages for those places"]
  C --> D["Join with a Bluesky account"]
  D --> E["Post, reply, vote"]
  D --> F["Check an Aksara finding"]
  D --> G["Ask @aksara a question"]
  F --> H["Finding becomes a reviewed page"]
  G --> H
  C --> I["See a gap"]
  I --> J["Tell your story, or take it as public work"]
  J --> H
  H --> K["Page shows whose voices it rests on"]
  K --> C
```

## Journey: a community sets up

```mermaid
flowchart LR
  A["Operator deploys Strata"] --> B["Guided conversation with Aksara"]
  B --> C["Where is this place? Which sources do you trust? What must I never touch?"]
  C --> D["Aksara proposes a plan: places, sources, starter pages, opening questions"]
  D --> E{"Operator approves?"}
  E -- "changes" --> C
  E -- "yes" --> F["Aksara seeds: sources registered, findings posted, drafts await review"]
  F --> G["People check, correct and add"]
```

## Roadmap to January 2027

```mermaid
gantt
  dateFormat YYYY-MM-DD
  axisFormat %d %b
  section Proposal (18-19 Nov)
  Bug fixes and one consistent UI system      :a1, 2026-11-14, 2d
  New tokens, bigger covers                   :a2, after a1, 1d
  Findings as posts with check buttons        :a3, after a1, 2d
  Wiki home modules                           :a4, after a2, 2d
  Place page with strata cut and linked news  :a5, after a2, 2d
  section Showcase (4-5 Dec)
  Guided setup with Aksara                    :b1, 2026-11-19, 6d
  Claim reactions and recorded differences    :b2, 2026-11-20, 6d
  Weekly summary and printable bulletin       :b3, 2026-11-25, 5d
  Private spaces, Spaces beta retest          :b4, 2026-12-01, 4d
  section Pilot (January 2027)
  Organisations and their Aksara              :c1, 2026-12-06, 20d
  Voice stories                               :c2, 2026-12-10, 20d
  Aksara Node bundle with account hosting     :c3, 2026-12-15, 35d
  Second square deployed by another community :c4, 2027-01-05, 20d
```

Dates are targets, not commitments.

## Ideas worth building

### It would be a pity not to

- **A public "what Aksara did today" log** for each community, in plain words.
- **A receipt on every Aksara post:** what it read, which model ran, and on whose permission. One tap.
- **"Ceritakan" by voice.** Record a story on a phone. Aksara transcribes it and the teller approves the text before anything is posted. Meta's Omnilingual ASR is a candidate for low-resource languages; its licence, language coverage and where audio is processed all need checking first. Voice from a protected community must never leave that community's custody without consent.
- **A weekly printable bulletin** for church notice boards and kampung boards. The sitewide Aksara drafts it, a human editor approves it, and it is posted as a downloadable one-page PDF.
- **A shareable card** for every wiki page and place, with the print and the voice bar.
- **Follow a gap** and be told when someone fills it.
- **An in-app "Tentang ETNOS" page** with the same status labels as the README.

### Wilder

- **The cover print comes into focus.** A place's lower layers render as coarse pixels and sharpen as sources and stories are added.
- **Disagreement on a timeline.** Where accounts differ, show who said what and when.
- **A steward you can fork.** A new community copies another's Aksara setup, with its sources, rules and tone, and adjusts it.
- **Elders' line.** A phone number to call and leave a story. No app needed.
- **The news engine moves into Strata** so any community can register its own trusted sources and get a local news desk.

### Later, with partners

- Institution-run Aksara Nodes holding archives, language corpora, artefact scans and datasets, with reviewed public copies published to the wiki.
- Organisations verified by domain, each with an Aksara that answers questions and takes public work in the open.
- Collections and research datasets shown on place pages.
- A typed knowledge graph (entities, records, statements, perspectives) following the Knowledge Recovery Pipeline. Categories remain lenses over sources.
- A Pasar community type for local sellers, with disclosed paid placement kept out of conversation and knowledge.

## Guardrails that hold across all of this

- People decide. No model gets the last word.
- Measure community value, never agent activity.
- A community is not automatically one institution, one voice or one representative.
- The right not to digitise is part of sovereignty.
- Coverage is labelled *belum terindeks*, never as a score.
