# Observatory

> **New observatory redesign (20 November 2026).** The documents in this folder replace the current wiki front and knowledge map with a full observatory: a model of a people's whole world, a starter dataset built from public sources for any deployment, a catalogue of datasets and artifacts with a viewer for each kind of data, access tiers, and two deployment profiles. Read them before changing the wiki, the knowledge map, the knowledge model or deployment setup. **Remove this notice, and the matching notices in the [project README](../../README.md) and [docs/README.md](../README.md), after the redesign is implemented.**

This folder holds the design of the observatory: how knowledge, datasets and artifacts about a place are modelled, seeded, shown and shared. Earlier designs of the knowledge map are in [knowledge/](../knowledge/README.md), and the research behind the knowledge model is in [research/](../research/).

## Read in this order

| Order | Document | What you get | Status |
| --- | --- | --- | --- |
| 1 | [world-model-and-starter-data-2026-11-20.md](world-model-and-starter-data-2026-11-20.md) | The model of a people's world: things placed by size, pace and level of organisation (Integrative Levels Classification), statements with depth (Berkes) and voice, published schemes as lenses (OCM, IDS and Concepticon, OpenAlex, nature's contributions to people, UU 5/2017, Marble), crosswalks by embeddings, relations as a typed hypergraph, synthesis notes, pre-computed embeddings, the starter build from keyless sources, onboarding with one profile file, and the knowledge map as a constellation. | current design, not built |
| 2 | [data-observatory-2026-11-20.md](data-observatory-2026-11-20.md) | The observatory beyond the wiki: what belongs in it, three access tiers (open, community, controlled, following the Five Safes), the dataset record (DCAT 3, Croissant, RO-Crate, Satu Data Indonesia), viewers for each modality, access as code (ODRL, Local Contexts, AT Protocol), the edge and server deployment profiles, Aksara as librarian, use cases and app views. | current design, not built |

## Assets

- [peta-pengetahuan-prototipe.html](../assets/peta-pengetahuan-prototipe.html): a working prototype of the knowledge map with four arrangements (size and pace, level, field of science, need). Open it in a browser. Its 71 items are design examples with rough positions, not ETNOS data.
- [skala-dunia-2026-11-20.svg](../assets/skala-dunia-2026-11-20.svg): the same design examples drawn as a size and pace chart.

## How this relates to earlier documents

- The knowledge model in [epistemic-multiplex-2026-11-19.md](../research/epistemic-multiplex-2026-11-19.md) and the code in `src/knowledge-model.ts` stay the core. The world model adds coordinates, depth, schemes and relation families to it.
- The knowledge map design in [knowledge-map-design-2026-11-16.md](../knowledge/knowledge-map-design-2026-11-16.md) and the keyword domains in `scripts/observatory/build-map.mjs` are replaced by the constellation and the scheme lenses once the redesign is built.
- The 18 post topics in [topic-primitives-and-knowledge-organisation-2026-11-18.md](../research/topic-primitives-and-knowledge-organisation-2026-11-18.md) keep their job for posts and communities. They are not used to classify knowledge.
