# Knowledge model and observatory: what was built

19 November 2026 · build note for the first slice in `epistemic-multiplex-2026-11-19.md` §15 and `knowledge-ontology-2026-11-18.md` §10–11. Status: **built and tested**. The API ships with the next ETNOS deploy. The seed is imported when the node steward calls `POST /v1/knowledge-model/seed` once. The static observatory files are in the repository.

## 1. What exists

| Piece | File | What it does |
| --- | --- | --- |
| Tables | `src/schema.ts` (migration `km_*`) | `km_entities` (Hal: twelve classes, slug, aliases, catalogue context, community scope, state, merges), `km_witnesses` (Saksi: kind, voice, licence, community, cited post and its revision, state), `km_excerpts`, `km_mentions`, `km_assertions` (Pernyataan: subject, predicate, entity or value, qualifiers, layer jejak/tuturan/tafsir, status, logical status, rank, visibility, training flag, community), `km_support` (assertion ↔ excerpt). |
| Model | `src/knowledge-model.ts` | Seed import, proposals, review, merges, citing a post as a witness, withdrawal, the read views (summary, list, entity profile, graph, export, review queue). |
| Predicates | same file | The ontology note's starter set (§5.3) as slugs in nine families. Three were added because the seed needed them: `mendiami`, `dituturkan-di`, `dituturkan-oleh`. Domain rules: membership and neighbourhood join groups only; kinship joins groups and living kinds only. |
| Seed | `scripts/build-knowledge-seed.ts` → `src/catalogues/tanah-papua-knowledge-seed.json` | Built from the verified seed quotes and the catalogue, with no network and no model. 110 entities, 97 witnesses, 624 excerpts, 793 mentions, 84 accepted and 32 proposed statements. |
| Graph measures | `src/knowledge-graph.ts` | Leiden, modularity, degree-preserving null model, Callon roles, Hill numbers, Adamic–Adar, seeded layout. Pure and reproducible. |
| Vector index | `src/vector-index.ts` | int8 IVF index over normalised embeddings in plain TypeScript (build, search, store, load); runs offline, in a Worker or in the browser. |
| Portal builder | `scripts/observatory/build-knowledge-portal.ts`, `embed-knowledge.mjs` | Static observatory files from the public view (§4). |

## 2. Rules, and where they are enforced

- **Every statement rests on an excerpt.** A proposal without one is refused. The support must be readable by the proposer **and** come from the statement's own community or from the commons, so a private community's witness can never support a statement elsewhere.
- **Read-time checks.** Every view is computed at read time. The community must still be public, or the reader a human member. The witness must be active. A cited post must exist, be neither hidden nor deleted, and still be at the revision that was cited. Both subject and object must be accepted entities in readable scopes. Agents see public scopes only.
- **Withdrawal.** A post's author can withdraw their own witness without a steward. Withdrawal blanks the excerpt text, drops its mentions, and takes every statement resting only on it out of every view and export at once. Re-importing the seed never revives a withdrawn witness.
- **Review.** Node-level items are reviewed by the node steward, community items by the community's stewards. Authority is checked at use time, including on replay. Revisions guard against two reviewers acting at once, and request keys make retries safe.
- **People.** Agents propose interpretation (*tafsir*) only, never with training permission, never a person, never a statement about a person.
- **Training.** `train` is off by default. The training export (`?train=1`) holds only public statements flagged for training.
- **Static files** (§4) contain only commons witnesses: the verified public seed sources and the catalogue. Anything resting on a community post stays in the live API, because a static file cannot take back what it holds.

Tests: `test/knowledge-model.test.ts` (seed once and idempotent, shipped seed imports cleanly, review revisions and replays with a demoted steward refused, private communities members-only with read-time visibility change, cross-community citation refused, withdrawal by the author and by post edit, hide and delete, guardrails, API auth), `test/knowledge-portal.test.ts` (no community witness in static files; byte-identical builds from the same input and from two fresh imports), `test/knowledge-graph.test.ts`, `test/vector-index.test.ts`.

## 3. API (public reads; writes need a signed-in human)

- `GET /v1/knowledge-model`: `{entities, assertions, excerpts, byClass, classes, voices, layers, predicates:[{slug,family,literal,added}]}`
- `GET /v1/knowledge-model/entities?class=&q=`: `[{slug,class,title,description,context,communityId,statements,excerpts,voices}]`
- `GET /v1/knowledge-model/entities/{slug}`: `{slug,class,title,description,aliases,origin,revision,communityId,context:{id,slug,title}|null,mergedFrom?,statements:[{id,subject:{slug,title,class},predicate,object|null,value,qualifiers,layer,logical,rank,origin,revision,voices,support:[excerpt]}],mentions:[excerpt],voices,diversity:{q0,q1,q2},gaps:{singleVoice,noTellers,fewSources}}`. An excerpt is `{id,digest,text,section,witness:{id,key,kind,title,url,publisher,licence,year,voice,communityId}}`. A merged slug returns the survivor with `mergedFrom`.
- `GET /v1/knowledge-model/graph[?public=1]`: what the reader may see: `{nodes, statements, comentions, witnesses}`.
- `GET /v1/knowledge-model/export[?train=1]`: the public view with excerpt texts (or the training subset).
- `GET /v1/knowledge-model/queue[?community=]`: proposals the caller may review, each with its live basis.
- `POST /v1/knowledge-model/seed` (node steward), `/entities`, `/entities/{slug}/review` `{decision:accept|reject,revision,requestKey}`, `/entities/{slug}/merge` `{into,revision,requestKey}`, `/assertions` `{communityId?,subject,predicate,object|value,support:[excerptId],layer?,visibility?,qualifiers?,requestKey}`, `/assertions/{id}/review` `{decision:accept|reject|withdraw|update,revision,logical?,rank?,note?,requestKey}`, `/witnesses/post` `{postId,requestKey}` (community steward), `/witnesses/{id}/withdraw` `{reason?,requestKey}`.

Measured locally on the full seed (Node, median): graph 6.7 ms, entity profile 5.5 ms, entity list 4.8 ms, summary 4.4 ms. That is close to the Free plan's 10 ms on Workers. The static files are the main path for the map, and the API serves profiles and review.

## 4. Static observatory files (`apps/web/public/observatory/knowledge/`)

- `graph.json` (113 KB):
  - `nodes[]`: `{id,class,title,context,regions[],x,y,cluster,degree,witnesses,excerpts,statements,voices,diversity:{q0,q1,q2},gaps[],pages[]}`. `gaps` uses `sedikit-saksi`, `satu-suara`, `belum-ada-penutur`, `belum-ada-pernyataan`, `belum-ada-halaman`.
  - `statements[]`: `{id,source,target,predicate,family,layer,logical,rank,origin,voices[],support[digest]}`.
  - `comentions[]`: `{a,b,weight,voices}`.
  - `clusters[]`: `{cluster,size,centrality,density,role,label,top[],byClass,voices,diversity}`.
  - `questions[]`: `{a,b,score,kind,question,status:"saran"}`.
  - `gaps`: `{coverage:[{region,title,entities,byClass,voices,contexts,contextsWithPage,contextsWithoutPage[]}],singleSourceStatements,languagesWithoutEntity,languagesTotal,voices}`.
  - Also `modularity`, `nullModel:{observed,nullMean,nullSd,z,samples}`, `method`, `counts`.
- `excerpts.json` (179 KB): `{witnesses:[{key,kind,title,url,publisher,licence,voice}],excerpts:[{digest,witness,section,text,mentions[]}]}`.
- `similar.json` (64 KB): per entity, `{entities:[{id,score}],unnamed:[{digest,score}]}`. `unnamed` lists sentences close to the entity's evidence that do not name it. For example, for Suku Mee it finds "Suku ini mendiami wilayah pegunungan Kabupaten Nabire…". These are suggestions for a reviewer, not links.
- `index.json` (371 KB): the int8 IVF index (`src/vector-index.ts`, `loadIndex` and `search`) over entity profiles and excerpts, model `Xenova/multilingual-e5-small`.

First results (seed 20261119): nine clusters, with modularity 0.605 against a null mean of 0.26 (z ≈ 50). The clusters follow the regions: Saireri around Biak, La Pago around Jayawijaya and Lembah Baliem, Mee Pago around Paniai, and a separate language cluster around Yahukimo. All 110 entities lack a teller's voice, and 71 have one voice only. Four of the seven customary regions have no seed page for any of their regencies. These are drafts on small data, as the multiplex note says.

## 5. What the UI could show (for the lead)

- **Peta (Jaringan lens)**:
  - Nodes from `graph.json` at `x,y`, coloured by `class` and sized by `witnesses`.
  - Statements as typed edges; co-mentions as faint edges. Dash `logical: "disputed"`.
  - Clusters as hulls labelled with `label`, and `role` as a small tag.
- **Celah lens**:
  - Nodes with `gaps` glow.
  - A coverage panel per region from `gaps.coverage`, with the contexts that have no page as links to start one.
  - Voices as a bar per region.
- **Entity drawer**:
  - `GET /v1/knowledge-model/entities/{slug}`: statements with voices and excerpts, a voice bar (`voices`), Hill numbers as "jumlah suara efektif", and the three gap flags.
  - "Mirip" from `similar.json`.
  - "Kalimat yang mungkin terkait" (`unnamed`), for stewards to propose a mention.
- **Pertanyaan**: `questions` as a list of suggestions, never as statements. Jadwal Aksara can read the same file.
- **Studio review queue**: `GET /v1/knowledge-model/queue`, with accept and reject buttons that send the shown `revision`.

## 6. Open questions for the owner (from the two notes, not decided here)

1. Licence for computed data (CC BY 4.0, or a Kaitiakitanga-style licence).
2. Which region goes first for the full first wave (recommended in the note: Mee Pago).
3. Whether voice layers may be shown publicly from day one.
4. Twelve classes as they are, or merge Lembaga into Kelompok, or add Penyakit dan Obat.
5. Whether Orang is allowed on the public commons, and for whom.
6. Which outside identifiers come first (Wikidata, Glottolog, GBIF, DAPOBUD).
7. Whether to migrate today's page kinds into Hal now, or run both side by side until the showcase.
8. **Izin pengolahan mesin**: whether community posts may be cited as witnesses at all before a machine-processing permission exists per community. The code requires a steward to cite a post; nothing is cited automatically.
9. The training flag: who may set `train` on a statement (today: whoever proposes it, humans only).

How to load the seed on ETNOS after deploy: the node steward signs in and calls `POST /v1/knowledge-model/seed` once with an empty JSON body. A Studio button is not built; the lead may add one.
