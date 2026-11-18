# Wiki pages for mountains, lakes, forests and species: seeding plan

18 November 2026. Run 1 step 6 (task 56). Decision in `docs/superpowers/specs/2026-11-18-information-architecture-design.md`: more-than-human beings are wiki page kinds, not functional contexts.

## Why

A Mee elder starts from the land. The mountain, the lake and the forest are naitai (mother), and every clan has an origin story tied to them. Strata's functional axes (place, language, topic) cannot hold that without labelling people or turning a lake into a feed filter. A wiki page can. The page sits under its region, is linked from posts like any other page, and gathers what is known about the being with sources.

## What is built

- Seed pages take a new `kind: "being"` beside `region`, `regency`, `people` and `language`. The format is otherwise unchanged (`seed/wiki/<region>.json` surveys, `seed/wiki/pages/<region>.json` pages).
- `scripts/observatory/build-map.mjs` already passes `kind` through to `map.json`.
- The wiki home card for each region lists beings first, in a row labelled Alam, before Suku and Bahasa (`apps/web/src/WikiPlaces.svelte`). The row is hidden until a region has such a page.
- The wiki home domain tabs no longer read as nature against culture: Alam became "Tanah, air dan langit", and "Budaya dan bahasa" became "Adat, kepercayaan dan bahasa" (`apps/web/src/observatory.ts`).
- News alone never starts a wiki draft. A `knowledge-draft` job abstains unless one evidence source is read for review or indexing (`src/resident.ts`, test "news alone does not start a Wiki page").

## Candidates

Pages need an open, citable source. These have Wikipedia articles in Indonesian or English; each must pass the verifier before a page is written. The list is a starting point and the region's stewards decide what stays.

| Region | Being | Notes for the page |
| --- | --- | --- |
| Mee Pago | Danau Paniai | Paniai lakes; the Wissel lakes name from the 1936 sighting belongs in history with its source |
| Mee Pago | Danau Tigi | Deiyai; the engraving on ETNOS is drawn from it |
| Mee Pago | Danau Tage | Paniai |
| Mee Pago | Puncak Jaya (Nemangkawi) | Sacred to the Amungme in published sources; mining and conflict attributed to named sources |
| Saireri | Teluk Cenderawasih | Bay and national park |
| Saireri | Hiu paus di Kwatisore | Only if a source places whale sharks there by name |
| La Pago | Lembah Baliem and Sungai Baliem | Valley and river as two pages or one, per the sources |
| La Pago | Danau Habbema | Inside Lorentz |
| La Pago | Gunung Trikora | |
| Shared | Cenderawasih (burung) | Species page; region links where sources name the region |
| Shared | Buah merah (Pandanus conoideus) | Highlands food plant |

## Rules for these pages

1. Same pipeline as the 39 seed pages: survey with copied sentences, `scripts/verify-wiki-seed.py --prune`, write only from kept sentences, `scripts/check-wiki-pages.ts`, then `scripts/propose-wiki-pages.ts` as hidden drafts for steward review.
2. Origin stories and sacred places: only what is already published, attributed to the source and the people it comes from. Nothing restricted, no reconstruction from memory, no model-written lore. A page may say that a clan holds an origin story about the lake without telling it. Telling it is for the clan, later, under its own protocol (clan spaces on the roadmap).
3. Mining, conflict and displacement figures are attributed to their source, and disagreeing figures are all given, as in the existing seed.
4. Species pages name the local names only when a source gives them.
5. Titles use the name in common Indonesian use, with other names in the first line when a source gives them.

## Next

- Survey and verify the candidates above (helper task, background).
- Rebuild `apps/web/public/observatory/map.json` once pages are proposed, so the Alam row and Peta wiki show them.
- After the showcase: a page kind for stories (task 28, Cerita with variants) and a way for a community to mark a page as held by a clan (Local Contexts TK Clan label), which is the bridge to clan spaces.
