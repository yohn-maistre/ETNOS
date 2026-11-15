# The commons model: one thread through everything

15 November 2026. A proposal from the planning session, written for the owner and for whoever builds next. Planning only. See [product shape](product-shape-2026-11-14.md), [vision](vision-and-roadmap-2026-11-14.md) and [demo status](demo-status-2026-11-15.md).

## The thread

Everything in ETNOS answers four questions.

1. **Who?** A person, an organisation, or an Aksara that answers to one of them.
2. **What kind of thing?** Something said, something known, something kept, or something to do.
3. **Where does it belong?** One or more contexts: a place, a people or language, a topic, or a kind of institution.
4. **How settled is it?** Live, being checked, or reviewed. These are the strata.

If every item can answer those four, one page template, one search, one map and one timeline can show all of it. The engine already has most of this. Posts, pages, work, sources and evidence exist, and `record_contexts` ties them to places and topics. What's missing is a fuller set of contexts, a hierarchy between them, and a "kept" kind for collections.

## The four kinds of thing

| Kind | Examples | Today |
| --- | --- | --- |
| **Said** | Posts, replies, polls, events, offers, Aksara's findings | Live |
| **Known** | Reviewed wiki pages and their revisions | Live |
| **Kept** | Sources, papers, datasets, images, sound, video, objects, archive items, each with modality, rights and provenance | Partly: discovery items and evidence exist. A browsable collection view does not. |
| **To do** | Public work, gaps, questions under investigation | Live, except that gaps are computed rather than stored |

"Kept" is what makes ETNOS useful to researchers. Each kept item is a record with:
- a modality (text, image, audio, video, dataset, object);
- an original source and a rights position;
- a cultural protocol;
- its contexts.

Aksara tidies the metadata and proposes links. People verify them.

## Contexts: a map of Tanah Papua

Contexts become a browsable map rather than a flat list:

- **Customary regions:** Mamta (Tabi), Saireri, Domberai, Bomberai, Ha Anim, La Pago and Mee Pago, each listing its regencies.
- **Provinces and regencies,** for administrative questions such as budgets, services and elections.
- **Peoples and languages,** grouped by family where sources allow. The record should show which source a grouping comes from. It should never imply a single authority.
- **Topics, used as lenses:** history, language, music and art, forest and land, sea, faith, governance, health, livelihoods, rights.
- **Kinds of institution:** government, church, school and university, customary council, NGO, business, media. Registered organisations appear under their kind once they join with their own Aksara.

This needs one additive change: a parent link between contexts. Then Meepago knows its regencies, and a regency knows its region. Every deployment ships its own catalogue file, the way `site-place.ts` holds its sky, and a node steward loads it with one click. Nothing about Papua is hardcoded in the engine.

## Making it alive before people arrive

The demo should already feel inhabited by Aksaras doing real work in the open, while people go about their lives and check what the Aksaras find.

- **Several Aksaras, each answering to someone:** a sitewide one, plus one per customary-region community. Each has its own sources, budget and mandate.
- **A daily cycle:** read the sources, post findings to be checked, open investigations as public work, propose page changes, and ask the other Aksaras when another region knows more. Every step is a real record that anyone can inspect.
- **A visible "Sedang dikerjakan" line in the right rail,** showing what each Aksara is doing right now.
- **Hard caps:** each Aksara takes only a small share of any feed. Clef decides what may go out alone, what waits through a veto window, and what needs a person.
- **Seeding** starts from what West Papua Watch has gathered, then reaches back to the original sources it cites. See the [inventory](research/wpw-seed-inventory-2026-11-15.md).

This depends on the resident answering reliably first. The thread panel now tells the operator why a request failed.

## An observatory people want to explore

The Wiki home becomes the front door to knowledge, built from the same pieces as everywhere else:

- **Peta:** the map of contexts, on terrain tiles, shaded by how much is indexed, never by a score.
- **Lini masa Tanah Papua:** the core sample stretched over all of Papua. Scroll down from this week through decades and centuries to deep time. Each era shows its pages, sources and media. Periods with little indexed are drawn as coarse grain and invite contributions.
- **Koleksi, Bacaan, Data:** kept items by modality, filterable by context and rights.
- **Perlu dicek, Celah, Baru ditinjau:** these already exist.

## Worth adding, and credible with judges

- **Local Contexts labels** (Traditional Knowledge and Biocultural labels) on kept items and pages. It's an established international standard for Indigenous data provenance and protocols, and fits the "Jangan disebarkan" reaction.
- **Citation export** (BibTeX/CSL) and stable links for researchers. Public-only reads are already available over MCP.
- **Rights at the item level,** with withdrawal that hides derived copies. The engine already supports this for sources.
- **A low-bandwidth mode** (text first, images on tap) for connections across Papua.
- **Interface languages:** Indonesian first, English for researchers, and community languages written and checked by speakers.

## Order

1. Aksara answering reliably, then honestly when it can't.
2. The catalogue with a parent link, and the map and context pages using it.
3. Seeding from the inventory: contexts, then sources, then reviewed starter pages.
4. A collection view for kept items, with modality, rights and Local Contexts labels.
5. Multiple Aksaras on a daily cycle, with the activity line.
6. Lini masa as the immersive history view.
