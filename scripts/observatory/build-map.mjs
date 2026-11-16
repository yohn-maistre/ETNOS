// Build the observatory layout from the wiki seed: nodes, typed edges, embeddings, UMAP.
import { readFileSync, writeFileSync } from 'node:fs';
import { pipeline } from '@huggingface/transformers';
import { UMAP } from 'umap-js';
const R = '/home/user/strata/seed';
const regions = { meepago: 'Mee Pago', saireri: 'Saireri', 'la-pago': 'La Pago' };
const nodes = [], edges = [], byKey = new Map();
const add = (key, n) => { if (byKey.has(key)) return byKey.get(key); n.i = nodes.length; nodes.push(n); byKey.set(key, n.i); return n.i; };
const link = (a, b, k) => { if (a !== b) edges.push([a, b, k]); };
const plain = (t) => t.replace(/^#+ .*$/gm, '').replace(/\[[\d,\s]+\]/g, '').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
const fold = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();
const pubOf = (url) => /wikipedia/.test(url) ? 'Wikipedia' : new URL(url).hostname.replace(/^www\./, '');
for (const [slug, name] of Object.entries(regions)) {
  const r = add('r:' + slug, { k: 'region', reg: slug, t: 'Wilayah adat ' + name, x: '', y: null });
  const survey = JSON.parse(readFileSync(`${R}/wiki/${slug}.json`, 'utf8'));
  const pages = JSON.parse(readFileSync(`${R}/wiki/pages/${slug}.json`, 'utf8'));
  const quoteSrc = new Map();
  for (const p of survey.pages) for (const s of p.sources) {
    const si = add('s:' + s.url, { k: 'source', reg: slug, t: s.title, x: (s.publisher || pubOf(s.url)) + (s.licence ? ' · ' + s.licence : ''), y: /wikipedia/.test(s.url) ? null : (s.year && s.year < 2026 ? s.year : null), u: s.url });
    for (const q of s.quotes) {
      const qi = add('q:' + fold(q.text), { k: 'passage', reg: slug, t: q.text, x: s.title, y: nodes[si].y, sec: q.section });
      link(qi, si, 'from'); quoteSrc.set(fold(q.text), qi);
    }
  }
  for (const p of pages) {
    const pi = add('p:' + slug + ':' + p.slug, { k: 'page', reg: slug, t: p.title, x: plain(p.text).slice(0, 420), y: null, kind: p.kind, slug: p.slug });
    link(pi, r, 'part');
    for (const c of p.citations) if (byKey.has('s:' + c)) link(pi, byKey.get('s:' + c), 'cites');
    for (const b of p.basis) { const qi = quoteSrc.get(fold(b.text)); if (qi !== undefined) link(pi, qi, 'rests'); }
  }
  const cat = JSON.parse(readFileSync(`${R}/sources/${slug}.json`, 'utf8'));
  for (const s of cat.sources) {
    const key = 'c:' + fold(s.title).slice(0, 80);
    const ci = add(key, { k: 'catalogue', reg: byKey.has(key) ? 'shared' : slug, t: s.title, x: s.summary, y: s.year || null, a: (s.authors || []).join(', '), kind: s.kind, sens: s.sensitivity, acc: s.access, u: (s.where || '').match(/https?:\/\/\S+/)?.[0]?.replace(/[;,)]$/, '') || '' });
    if (nodes[ci].reg !== slug && nodes[ci].reg !== 'shared') nodes[ci].reg = 'shared';
    for (const a of s.about || []) { const pk = 'p:' + slug + ':' + a; if (byKey.has(pk)) link(ci, byKey.get(pk), 'about'); }
  }
}
console.log('nodes', nodes.length, 'edges', edges.length);
const embed = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8' });
const texts = nodes.map((n) => 'passage: ' + (n.t + '. ' + (n.k === 'passage' ? '' : n.x || '')).slice(0, 900));
const vecs = [];
for (let i = 0; i < texts.length; i += 32) {
  const out = await embed(texts.slice(i, i + 32), { pooling: 'mean', normalize: true });
  for (let j = 0; j < out.dims[0]; j++) vecs.push(Array.from(out.data.slice(j * 384, (j + 1) * 384)));
}
// Seeded random so the layout is stable between runs.
let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const umap = new UMAP({ nComponents: 3, nNeighbors: 14, minDist: 0.25, random: rand });
const pos = umap.fit(vecs);
const lo = [0, 1, 2].map((d) => Math.min(...pos.map((p) => p[d]))), hi = [0, 1, 2].map((d) => Math.max(...pos.map((p) => p[d])));
const P = pos.map((p) => p.map((v, d) => +(((v - lo[d]) / (hi[d] - lo[d])) * 2 - 1).toFixed(3)));
const out = { built: new Date().toISOString().slice(0, 10), model: 'multilingual-e5-small (q8), UMAP 3D, seed 7', nodes: nodes.map((n, i) => ({ ...n, p: P[i] })), edges };
writeFileSync(process.argv[2], JSON.stringify(out));
console.log('written', JSON.stringify(out).length, 'bytes');
