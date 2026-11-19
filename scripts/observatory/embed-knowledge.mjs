// Embeds the knowledge model's public entities and excerpts, offline, for the observatory's
// similarity index. Run where @huggingface/transformers is installed (see README.md):
//
//   node build-knowledge-portal.ts --export-only export.json   (in the repository)
//   node embed-knowledge.mjs export.json vectors.json          (in the embedding folder)
//   node build-knowledge-portal.ts --vectors vectors.json      (in the repository)
//
// Model: multilingual-e5-small (q8, 384 dimensions), the same stand-in the map already uses.
// Entities are embedded as "query: title. classes. aliases"; excerpts as "passage: text".
// Nothing is sent anywhere; the model runs locally.
import { readFileSync, writeFileSync } from 'node:fs';
import { pipeline } from '@huggingface/transformers';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('usage: node embed-knowledge.mjs export.json vectors.json');
const data = JSON.parse(readFileSync(input, 'utf8'));
const commons = new Set(data.witnesses.filter((w) => w.scope === 'commons').map((w) => w.key));
const items = [
  ...data.nodes.map((n) => ({ id: 'entity:' + n.id, text: `query: ${n.title}. ${n.class}.` })),
  ...(data.excerpts ?? []).filter((x) => commons.has(x.witness)).map((x) => ({ id: 'excerpt:' + x.digest, text: 'passage: ' + x.text.slice(0, 900) })),
];
const model = 'Xenova/multilingual-e5-small';
const embed = await pipeline('feature-extraction', model, { dtype: 'q8' });
const out = [];
for (let i = 0; i < items.length; i += 32) {
  const batch = items.slice(i, i + 32);
  const t = await embed(batch.map((b) => b.text), { pooling: 'mean', normalize: true });
  batch.forEach((b, j) => out.push({ id: b.id, vector: Array.from(t.data.slice(j * 384, (j + 1) * 384), (x) => Math.round(x * 1e4) / 1e4) }));
}
writeFileSync(output, JSON.stringify({ model, dims: 384, items: out }));
console.log(`${out.length} vectors`);
