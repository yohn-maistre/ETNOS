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
