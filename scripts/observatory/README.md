# Knowledge map prototype

Builds the "Peta Pengetahuan" prototype from the wiki seed: pages, verified sentences, cited sources and catalogued sources as dots, placed by text similarity, with typed threads between them.

```bash
mkdir -p /tmp/obs && cd /tmp/obs && npm init -y && npm i @huggingface/transformers@3 umap-js
cp /path/to/strata/scripts/observatory/build-map.mjs . && node build-map.mjs map.json
python3 -c "t=open('/path/to/strata/scripts/observatory/map-template.html').read();d=open('map.json').read();open('peta.html','w').write(t.replace('__DATA__',d.replace('</','<\\\\/')))"
```

- Embeddings: `Xenova/multilingual-e5-small` (q8), run locally, 384 dimensions. A stand-in until the 200-item test in `docs/research/knowledge-graph-sota-2026-11-16.md` picks the production model.
- Layout: UMAP in 3D with a fixed seed. "Lapisan waktu" keeps two axes from meaning and sets height from the year a source was written.
- Only public seed files are read. Nothing private goes into a layout.

## On the site

`apps/web/public/observatory/map.json` is the layout the wiki home reads (`apps/web/src/KnowledgeMap.svelte`). Rebuild it with the steps above and copy the output there. Domains and cultural forms come from keyword lists in `build-map.mjs` (pages are tagged from their whole text, up to four domains; other items from title and lead, up to three) (the embedding is a fallback for domains only); "when it happened" years are years named in the text. Both are rough and say so in the panel. The planned replacement is the classifier with receipts and a nightly job, as in `docs/knowledge/knowledge-map-design-2026-11-16.md`.

## Knowledge portal (things, statements, clusters, gaps)

`build-knowledge-portal.ts` builds the observatory's static files from the knowledge model's public view (`/v1/knowledge-model/export`, or the shipped seed imported in memory when no `--from` is given). It writes `apps/web/public/observatory/knowledge/`:

- `graph.json`: entities with layout, Leiden cluster, role, voices, Hill numbers and gaps; typed statements; co-mentions; clusters; the null model; link suggestions phrased as questions; coverage per customary region.
- `excerpts.json`: the verified excerpts behind every node and statement, with their witnesses.
- `similar.json` and `index.json` (only with `--vectors`): nearest entities by evidence, sentences close to an entity that do not name it, and the int8 IVF index (`src/vector-index.ts`).

Only commons witnesses (the verified seed sources and the catalogue) go into these files. Statements resting on community posts are served live by the API, where withdrawal is checked on every read.

```bash
node scripts/observatory/build-knowledge-portal.ts --export-only /tmp/obs/export.json
cp scripts/observatory/embed-knowledge.mjs /tmp/obs/ && (cd /tmp/obs && node embed-knowledge.mjs export.json vectors.json)
node scripts/observatory/build-knowledge-portal.ts --vectors /tmp/obs/vectors.json
```

The same input gives byte-identical files (fixed seed 20261119; `test/knowledge-portal.test.ts`).
