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

`apps/web/public/observatory/map.json` is the layout the wiki home reads (`apps/web/src/KnowledgeMap.svelte`). Rebuild it with the steps above and copy the output there. Domains and cultural forms come from keyword lists in `build-map.mjs` (pages are tagged from their whole text, up to four domains; other items from title and lead, up to three) (the embedding is a fallback for domains only); "when it happened" years are years named in the text. Both are rough and say so in the panel. The planned replacement is the classifier with receipts and a nightly job, as in `docs/knowledge-map-design-2026-11-16.md`.
