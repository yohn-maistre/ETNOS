# Communities, lembaga and spaces: the site hierarchy, private dictionaries and shared checking

*19 November 2026. Status marks: **built** (in the code), **proposal** (not built), **alpha** (built by someone else, unstable).*

Related: [platform-2026-11-19.md §4](platform-2026-11-19.md) (peoples, languages and private spaces), [research/community-dictionary-2026-11-19.md](research/community-dictionary-2026-11-19.md) (the dictionary pipeline), [showcase-plan-2026-11-17.md §25](showcase-plan-2026-11-17.md) (build order), [strata-model-2026-11-17.md](strata-model-2026-11-17.md) (Entity, Assertion, Witness).

## 1. The flagship

**Talk in a community becomes structured knowledge that the community owns.**

- A language community talks as usual. Its Aksara reads the talk (only with the room's *Izin pengolahan mesin*), proposes words, senses, examples and grammar notes, and members confirm them with one swipe. The result is a dictionary and a grammar sketch, browsable by context of use, that belong to the community and can be published word by word.
- The same pipeline works for every kind of knowledge: plants and their uses, places and their names, events and their dates, songs, recipes, customary rules. Each becomes Entities with Assertions and Witnesses (the knowledge model).
- On the map, those entities cluster, and lenses (language, place, time, topic) show how a people's knowledge connects and where the gaps are.

This is what we lead with for BUDAYA GO! 2026 and beyond: it is the part no other platform does, it serves the people who speak the language first, and it rests on the data-sovereignty design (private by default, the community holds its records, AT Protocol for portability).

## 2. The site hierarchy

```
Deployment (ETNOS, run by an operator)
├── Public entities: Tempat · Bahasa · Masyarakat (people) · Topik · Makhluk (beings)
│     each one page with Wiki, Kabar, Diskusi and the map
└── Lembaga (organisation)                       groups table, kind 'institution' or 'collective'   built
      ├── public profile page                     proposal
      └── Komunitas (one or more)                 spaces table links group → community             built
            visibility: public · listed-private · hidden-private                                    built
            ├── Diskusi · Wiki · Media · Polling · Penawaran   (tabs)                              built
            ├── Kamus (dictionary)        private by default, entries can be published              proposal
            ├── Tata bahasa (grammar)     private by default, notes can be published                proposal
            └── Periksa (shared checking) strip at the top of the community page                    proposal
```

What already exists in the code:
- `groups` with kind `collective` or `institution`, visibility `public` or `hidden-private`, and roles owner, steward and member.
- `spaces` links a group to its communities (one group, many communities). So "a lembaga with several communities" is already the data model; it needs pages and an interface.
- `communities` with visibility `public`, `listed-private` (listed, content for members) and `hidden-private` (invite only, never listed), and admission `open`, `approval` or `invite`.
- Public entities (`contexts`: place, region, topic, language) link to communities and records through labels.

What to add *(proposal)*:
1. **Lembaga page.** A public page for a group with its description, its public communities, and a count of its private ones (or nothing, if the lembaga chooses). Recognition by a customary body is shown only as a sourced claim.
2. **Pages inside a community can differ in visibility.** A private community may keep a public *Tentang* page and publish chosen dictionary entries to the public language page. A public community may keep one members-only page (for example a draft grammar). The rule: a page is never more public than its community chooses, and published copies are approved derivatives (AGENTS.md).
3. **Masyarakat (people) as a page kind**, per platform §4.4.

## 3. Where private things live

| Mode | Who holds the data | Who can read | When |
| --- | --- | --- | --- |
| **Operator-hosted Strata community** | The deployment (ETNOS) | Members, and technically the operator. The interface says so | **Built** |
| **Operator-hosted AT Protocol space** | Members' records on their own PDS accounts (on the ETNOS multi-identity PDS); the space authority's DID also on the ETNOS PDS | Members with a space credential; the PDS operator can still read it | **Alpha** upstream; being built on our PDS (worker) |
| **The community's own PDS** | A PDS the lembaga runs (Aksara Node, a mini PC, or its own Cloudflare account) | Members; the lembaga's chosen operator | Proposal (the PDS is built to run self-hosted, see `packages/pds`) |

None of these is end-to-end encryption. AT Protocol spaces give access control, not confidentiality.

## 4. AT Protocol spaces: how they work *(alpha, August 2026)*

From the Spaces alpha announcement ([atproto.com/blog/atproto-spaces-alpha](https://atproto.com/blog/atproto-spaces-alpha), 20 Aug 2026) and the draft spec ([proposals 0016](https://github.com/bluesky-social/proposals/blob/main/0016-permissioned-data/README.md)). Bluesky's own words: not for production, no backups, schema not final; full launch planned "later in 2026". Our direction doc records a public beta from 1 December 2026 on the reference PDS (not re-confirmed in this pass).

- **Identity.** A space is `(authority DID, space type, key)`, written `at://{authority}/space/{type}/{key}`. The space type is a Lexicon; it is also what an app asks permission for.
- **Who manages it.** The authority is any DID. **An individual account can be the authority**, and so can a dedicated DID made for the space. The authority's PDS is the space host. Deleting the authority account deletes its spaces.
- **Membership.** A space has a policy:
  - `personalspace` (only the authority);
  - `memberspace` (a member list kept by the PDS, with read and write flags);
  - `managedspace` (access decided by an outside service).
  Roles and nested groups are not in the spec. A third-party design, the Arbiter ([zicklag.leaflet.pub](https://zicklag.leaflet.pub/3mjrvb5pul224)), models roles and channels as spaces inside spaces.
- **Where records live.** Each member's records for a space stay on **that member's own PDS**, in a per-space repository. The space is the sum of its members' records.
- **Reading.** The member's PDS issues a short delegation; the space host turns it into a space credential (a short-lived token signed by the authority) that other services accept.
- **Sync.** There is no firehose for spaces. A service that needs the data is notified and pulls from each member's PDS.
- **Other implementations.** rsky (Blacksky) is aligning with the spec ([rsky#319](https://github.com/blacksky-algorithms/rsky/pull/319), open). Roomy keeps private data off-protocol for now.

**What our own trial found** ([labs/spaces](../labs/spaces/README.md), official alpha snapshot of 29 Oct 2026, three synthetic accounts):
- A community maps onto a `memberspace`; members write to their own PDS.
- Private records did not show up on public read endpoints; a private blob was readable only with a space credential.
- **A credential lasts 600 seconds and still worked right after the member was removed.** Removal is not instant. This matters for safety in sensitive communities and must be handled (short credentials, our own check at read time) before any real community uses it.

### 4.1 How ETNOS maps onto it *(proposal)*

- **A lembaga holds a dedicated authority DID, not a person's DID.** Stewards change; a person can leave or die; the space must stay with the lembaga. The lembaga's stewards (Strata group roles) act for that DID. A person may still create a personal space for a small group of their own.
- **One `memberspace` per private community.** Membership in the Strata community and in the space move together (join, leave, removal).
- **Host-managed mode:** the authority DID lives on the ETNOS multi-identity PDS. **Own-PDS mode:** it lives on the lembaga's PDS, which becomes the space host; members' records stay on their own PDS wherever that is.
- **Strata stays the store of record until spaces reach beta.** Private communities mirror into a space behind a per-community flag, for testing only. Nothing sensitive goes into the alpha.
- **Removal is checked at read time by Strata too**, not only by credential expiry (see the trial above).
- **Withdrawal** deletes the record from the member's space repository and from every Strata derivative, as it does today.

*Build note, 19 November:* host-managed and own-PDS modes are built on our PDS (`packages/pds/src/host/spaces.ts`), with removal checked at read time. Tests and limits are in `research/pds-multi-identity-build-2026-11-19.md` §9.

## 5. The private dictionary and grammar *(proposal)*

A lembaga adat runs a private language community. People talk as usual. Two pages grow beside Diskusi: **Kamus** and **Tata bahasa**.

**What Aksara does** (only with *Izin pengolahan mesin* on, per the dictionary doc §6):

1. **Find candidates.** From each new post or transcript, a model returns candidate words and names in a fixed JSON shape: the form, the sentence it came from, a proposed gloss, a proposed part of speech, and whether it looks like a name (person, place, clan, plant, animal, object). This is the named-entity step.
   - On public communities: Workers AI or the operator's keyed model, as Aksara works now.
   - On private communities: by default a model on a machine the lembaga trusts (Aksara Node). Workers AI only if the stewards choose it.
   - **No training on the fly.** The owner's instinct is right: a general LLM already proposes parts of speech and glosses well for big languages. For Papuan languages it is much weaker, so every tag is a proposal until members confirm it. A small model (GLiNER multi, 209M, Apache 2.0, or a LoRA on a small LLM) is tuned later, from the confirmed entries, with the community's training permission. No Papuan language is known to be covered by GLiNER today.
2. **Group by context, not alphabet.** Each word's example sentences are embedded (bge-m3 on Workers AI handles 100+ languages) and clustered. Each cluster becomes a **sense**, named by its context of use: *di kebun*, *di hutan*, *di rumah*, *upacara adat*, *gereja*, *keluarga*, *jual beli*. A sense always shows its example sentences, who said them (as members choose), and the seed source if there is one.
3. **Ask members to check.** New senses, glosses and names go to the Periksa queue (section 6).
4. **Draft grammar notes** from recurring affixes and patterns, each with its examples, marked as a draft until a member accepts it.

**What people see.**
- **Kamus** opens by context: a grid of contexts (Kebun, Hutan, Rumah, Adat, Tubuh, Alam, Keluarga…) with counts, then words in that context, then a word's senses with examples and voice clips. Search and A–Z are there too.
- Each entry shows its state: *usulan* (proposed), *diperiksa* (checked by members), *diterbitkan* (published to the public language page).
- **Tata bahasa** is a short sketch, section by section, each note with its examples.

Data model: the knowledge model's Entity (the word), Assertions (a sense, a gloss, a part of speech), and Witnesses (the sentences, the seed sources). Nothing new beyond a `context` field on senses.

## 6. Periksa: one checking primitive for every kind of knowledge *(built 19 November: `src/periksa.ts`, `apps/web/src/PeriksaDeck.svelte`, tests in `test/periksa.test.ts`)*

What is built: members propose claims (`POST /v1/communities/{id}/claims`), the deck reads the next ten cards for a member (`GET /v1/communities/{id}/periksa`), answers go to `POST /v1/claims/{id}/answer` (`yes`, `no`, `other` with text, or `null` to take an answer back), and the proposer or a steward withdraws a claim with `POST /v1/claims/{id}/withdraw`. Stewards set the number of agreeing members with `POST /v1/communities/{id}/periksa` (1 to 9, default 2), and existing claims follow the new number at once. Aksara cannot propose claims through this route yet; that will go through its mandate, like its posts.

One reusable component that asks members whether a claim is right. Used for dictionary senses, grammar notes, wiki statements, place names, dates, plant uses: anything shaped as an Assertion.

**Where.** A strip at the top of the community page: "**7 hal menunggu diperiksa** · Mulai". It opens:
- on phones, fullscreen;
- on desktop, a centred dialog over a blurred backdrop.

**The card.** One claim at a time, written plainly:
- the statement ("*Ugee* artinya 'ubi jalar', dipakai di kebun");
- the evidence (one or two example sentences, the seed source, a voice clip if there is one);
- who proposed it (a member, or Aksara, labelled as AI).

**The answers.**
- Swipe right or press **Benar** (→ key).
- Swipe left or press **Salah** (← key).
- **Jawaban lain**: type a correction (↑ key or the button). It becomes a new proposal with the person as its author.
- **Lewati**: I don't know (↓ key or the button). Skipping is never counted as a vote.
Buttons are always visible; swiping is a shortcut, never the only way. Each card says what "Benar" means for that kind of claim (Common Voice's lesson: people disagree when the question is vague).

**Deciding.** Per community, a claim is settled when it reaches a small quorum (default 2 agreeing members, set by stewards). A split result does not fail the claim: it opens a variant (another dialect, another sense) for stewards to look at. One vote per person per claim; changing your mind replaces your vote. Withdrawing a vote or a post removes its weight.

**Limits.** At most a few cards per person per day by default, so checking stays light. Aksara's own claims never count as votes.

**Reuse.** It builds on the existing "Benar" answer on agent posts (`src/forum.ts`) and replaces task #46 (the wiki review deck). The component takes a list of claims and an answer callback, so any page can open it.

## 7. Build order *(proposal)*

1. Multi-identity PDS wired into ETNOS (worker, in progress).
2. Spaces on our PDS behind a flag, one test community mirrored (worker).
3. Lembaga page, and community pages with their own visibility.
4. Periksa component and its endpoint (claims, votes, quorum), first fed by wiki statements and Aksara posts.
5. Kamus and Tata bahasa pages on a seeded public language (Mee, from Steltenpool and TransNewGuinea.org), then on a private test community with *Izin pengolahan mesin*.
6. Candidate extraction and context grouping in Aksara's daily schedule.
7. Map lenses and clusters over the confirmed entries.

## 8. Owner decisions *(19 November)*

The owner accepted every proposal in this document:
1. A claim is settled when **2 members agree**, and stewards can raise that number.
2. A lembaga's public page shows **how many private communities** it has, without their names.
3. Kamus starts with **one fixed list of contexts** for every language (Kebun, Hutan, Rumah, Adat, Tubuh, Alam, Keluarga, Gereja, Jual beli), and a community can add its own.
4. The checking strip and dialog are called **Periksa**.

Small labels above headings are allowed where they fit the layout, but they should be used sparingly.
