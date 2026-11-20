// Build seed/kamus/id-words.json from text already in this repo. No network.
// Run from the repo root:  node scripts/kamus/build-id-words.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const BUILT = '2026-11-20';

const walk = (dir, test, out = []) => {
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) { if (n !== 'node_modules') walk(p, test, out); }
    else if (test(p)) out.push(p);
  }
  return out;
};

const files = [
  ...walk('seed/wiki', (p) => p.endsWith('.json') && !p.endsWith('.receipts.json') && !p.endsWith('.verify.json')),
  ...walk('src/catalogues', (p) => p.endsWith('.json')),
  ...walk('apps/web/src', (p) => p.endsWith('.svelte')),
  'docs/voice.md',
].sort();

// Text extractors ---------------------------------------------------------
const SKIP_KEYS = /^(id|url|href|src|slug|hash|sha|sha256|kind|type|key|path|file|image|license|licence|source|sources|doi|isbn|lang|code|glottocode|iso|date|updated|created|at|ref|refs)$/i;
const jsonStrings = (v, out = [], key = '') => {
  if (typeof v === 'string') { if (!SKIP_KEYS.test(key) && !/^https?:|^[\w./-]+\.(json|md|png|jpg|svg)$/.test(v)) out.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => jsonStrings(x, out, key));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) jsonStrings(x, out, k);
  return out;
};
const svelteStrings = (src) => {
  const out = [];
  const script = [...src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const markup = src.replace(/<script[^>]*>[\s\S]*?<\/script>/g, ' ').replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ');
  // text nodes (drop {expressions} and tags)
  out.push(...markup.replace(/\{[^{}]*\}/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').split(/<[^>]*>/));
  // visible attributes
  for (const m of markup.matchAll(/\b(?:placeholder|title|aria-label|alt|label)="([^"{}]*)"/g)) out.push(m[1]);
  // string literals with a space in script and in {expressions}
  for (const code of [...script, ...[...markup.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1])])
    for (const m of code.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) if (/\s/.test(m[2]) && !/[=<>;{}:]|\w-\w|\.\w/.test(m[2])) out.push(m[2]);
  return out;
};
const textOf = (p) => {
  const raw = readFileSync(p, 'utf8');
  if (p.endsWith('.json')) return jsonStrings(JSON.parse(raw));
  if (p.endsWith('.svelte')) return svelteStrings(raw);
  return [raw.replace(/```[\s\S]*?```/g, ' ')];
};

// Tokenise: letters, keep internal hyphens and apostrophes ------------------
const TOKEN = /\p{L}+(?:['’-]\p{L}+)*/gu;
// Small English stoplist: the repo text mixes English into the UI and docs; these
// would mislead a finder that is asking "is this Indonesian?".
const EN = new Set(`the and for with that this from are was were you your our their its not but can will have has had been being what when where which who how all any each more most other some such than then them they there these those into onto over under about after before between because while also only just very per via out off own same too both few new one two three first last next see use used using make made get set let may might must should would could does did done here yes no an or of to in on at by as is it be if we us me my he she his her do up so a i`.split(/\s+/));

const IDM = new Set('yang dan di ke dari untuk dengan ini itu adalah tidak pada akan atau bisa dalam juga sudah belum kami kita anda saya kamu mereka ada oleh agar karena sebagai lebih saat jika bagi para tentang ketika sebuah harus dapat semua setiap'.split(' '));
const counts = new Map();
let strings = 0, droppedStrings = 0;
for (const p of files) {
  for (const t of textOf(p)) {
    // chunks with digits (hashes, ids, dates) are not words
    const chunks = t.split(/\s+/).filter((c) => !/\p{N}/u.test(c));
    const toks = chunks.join(' ').match(TOKEN) ?? [];
    const low = toks.map((w) => w.toLowerCase().replace(/’/g, "'"));
    let id = 0, en = 0;
    for (const w of low) { if (IDM.has(w)) id++; else if (EN.has(w) && w.length > 1) en++; }
    strings++;
    // mixed or English strings: keep only if clearly Indonesian
    if (en > id) { droppedStrings++; continue; }
    for (const w of low) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
}

// Ekari lemmas to drop (both printed and modern spelling)
const ekari = JSON.parse(readFileSync('seed/kamus/ekari.json', 'utf8'));
const lemmas = new Set();
for (const e of ekari.entries) {
  lemmas.add(e.lemma.toLowerCase());
  if (e.modern) lemmas.add(e.modern.toLowerCase());
  for (const v of e.variants ?? []) lemmas.add(v.form.toLowerCase());
}

// Papuan Malay function words (marked separately; kept even if they are also Ekari forms)
// Papuan Malay function words and forms that are not standard Indonesian.
const PM = ['sa', 'ko', 'kam', 'dong', 'torang', 'kitong', 'kamong', 'dorang', 'su', 'pu', 'pung', 'tra', 'trada', 'tara', 'pi', 'de',
  'mo', 'nanti', 'macam', 'baru', 'blum', 'lai', 'kasi', 'trus', 'dolo', 'sonde', 'kitorang', 'ju', 'to', 'tau'].sort();

let seenOnce = 0, dropEkari = 0, dropShort = 0, dropEn = 0, dropCode = 0;
const indonesian = [];
for (const [w, n] of [...counts].sort((a, b) => a[0].localeCompare(b[0], 'id'))) {
  if (n < 2) { seenOnce++; continue; }
  if (w.length < 2) { dropShort++; continue; }
  if (EN.has(w)) { dropEn++; continue; }
  if (lemmas.has(w)) { dropEkari++; continue; }
  if (PM.includes(w)) continue; // listed under papuanMalay instead
  indonesian.push(w);
}

const out = { built: BUILT, from: files.map((f) => relative(root, f)), indonesian, papuanMalay: PM };
writeFileSync('seed/kamus/id-words.json', JSON.stringify(out) + '\n');
console.error(JSON.stringify({ strings, droppedStrings, files: files.length, tokensTypes: counts.size, seenOnce, dropShort, dropEn, dropEkari, indonesian: indonesian.length, papuanMalay: PM.length }));
