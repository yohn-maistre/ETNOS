# Information architecture: one page per thing, one directory, one switcher

18 November 2026. Brainstorm with the owner, approved in conversation the same day. Research behind it is in three notes: `docs/research/topic-primitives-and-knowledge-organisation-2026-11-18.md`, `docs/research/why-these-axes-2026-11-18.md` and `docs/research/aksara-composed-views-2026-11-18.md`. The build order lives in `docs/showcase-plan-2026-11-17.md` section 24.

## Why

The owner found pages that overlap. Mee Pago has a place page and a wiki page, each with its own conversation box under different rules. Jelajah and `/contexts` are two directories with three maps between them. Place, language and topic pages share one layout that opens with news, so a visitor cannot tell what page they are on. The owner also needs a research-backed answer when a judge asks why Strata organises around places, languages and topics, and whether anything is missing.

Success: anyone can join, see what ETNOS is about within one screen, and find a thing (a place, a language, a topic) in one obvious way.

## Decisions

**Foundations.**
- Place, language, topic and kind stay as Strata's functional axes. Language is separate from place. The basis is the convergence in `why-these-axes` (the circumstances tradition from Aristotle, Ranganathan, Dublin Core, Mukurtu and Local Contexts). Axes are fixed and values are each deployment's own.
- Kinship stays out of Strata's labels and is handled as custody and protocol. Clan spaces (a private space and PDS per clan, with the communal Aksara on a refurbished machine) go on the roadmap, not in this build.
- More-than-human beings (mountains, lakes, forests, species) become **wiki page kinds**, not functional contexts. A Mee elder starts from the land: the mountain, the lake and the forest as naitai (mother), and every clan's origin story. The wiki is how the more-than-human enters a social platform.
- Optional **season** on records, with each community defining its own seasons. Linear time stays as it is.
- One topic scheme: the 18-topic starter set from `topic-primitives` (the fourteen ranah plus Olahraga dan permainan, Teknologi dan komputer, Kerja dan usaha, Pendidikan). Group headings are display only. Check the headings for a nature and culture split and avoid it. UU 5/2017, UNESCO and disciplines are crosswalks. Every name carries its source. Catalogue renames must reach running deployments (today "Iman & gereja" is still live after the rename).

**Pages.**
- **Thing page** (place, language, topic). One page per thing, merging the context page and the thing's wiki page (task 36, widened).
  - The engraved band comes first, with the name and the kind word on it. Each kind has its own tint and engraving, so places, languages and topics look different at a glance. Colour is never the only signal.
  - Tabs: Tentang (the wiki article), Percakapan (posts labelled with the thing or linking to its page, one rule), Kabar (lapisan becomes a view inside it, grouped by layer with counts), Komunitas, Sumber (Riset terbit moves here, without the raw query).
  - The right rail stops repeating Kabar on thing pages.
  - One back button. Lapisan is no longer a sub-page.
- **Wiki page** for things that are not functional contexts: peoples, beings, events, stories. These keep Diskusi with proper padding.
- **Jelajah** is the one directory: regions, languages, topics, communities, organisations, wiki. `/contexts` redirects to it. The Percakapan section shows five posts and a "Semua percakapan" link to a list page that reuses the Kabar list.
- **One switcher.** On Beranda the header control reads "Terbaru · Mee Pago ▾" and opens one sheet: Terbaru, Komunitasku, Mengikuti on top, places below with the Jelajah atlas as its map. The separate place row goes. Jelajah and Wiki use the same control without the feed row. Two maps remain: the atlas (in the switcher) and Peta wiki. The grey map on `/contexts` goes; its earthquake rings can return on a place's Data tab later.
- **Tentang ETNOS** gets a short section on why these axes, from the judge-ready answer in `why-these-axes`, in plain Indonesian.

**Communities.** Starting a community makes a waiting room only the founder sees, plus an invite link to send on WhatsApp. It opens when one more person accepts and lapses after 14 days. The seeded community catalogue (task 34) sits on top of this.

**Agent chip.** "Agen · pendamping" is confusing. All agent posts carry a chip reading **AI**. A place agent reads **AI · Mee Pago**. Guest agents read **AI tamu**. My call: "AI Strata" would confuse ETNOS members who do not know the name Strata, and the author name already says Aksara.

**Wiki drafts.** News does not become a wiki draft. A wiki draft needs material that lasts (a place, a being, a people, a practice, a history). The pipeline rule changes accordingly.

**Aksara as composer.** Aksara arranges typed blocks Strata ships into views, and a steward approves them. No model-written code. It runs on Workers Free. For the proposal it appears as the next step with one mock; the build comes after 26–27 November.

## Approaches considered

1. **One generic page for every context (today).** Cheapest, and the source of the confusion: places, languages and topics look the same and the name is buried.
2. **Separate page types per kind.** Clear, but triples the code and drifts apart over time.
3. **One page skeleton, kind-specific band and top block (chosen).** Same tabs everywhere, different look and top content per kind, the way an encyclopedia uses one article frame with different infoboxes. The top block can later become a composed view, so Aksara's composer and the shipped pages use one mechanism.

## Non-goals for this run

Clan spaces and private PDS per clan; the multi-identity PDS (next run); Aksara with proper Gemini keys (after the PDS); the composer build; soft-field regions.

## Anti-goals

A page that leads with news before saying what it is. Two conversation boxes for the same thing. A third map. A topic scheme that splits nature from culture. Labels on people.

## Left to the builder

Engraving motifs for languages and topics (use the existing ink-print style; impeccable pass required). Exact tint tokens per kind in light and dark. Redirect details. Migration shape for catalogue renames. The season field's storage and UI.
