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
// Live page ids from the proposal receipts, so a dot can open its page.
for (const slug of Object.keys(regions)) {
  try { const rec = JSON.parse(readFileSync(`${R}/wiki/pages/${slug}.receipts.json`, 'utf8')); for (const [ps, r] of Object.entries(rec)) { const i = byKey.get('p:' + slug + ':' + ps); if (i !== undefined && r.pageId) nodes[i].href = '/wiki/' + r.pageId; } } catch {}
}
// When it is about: years named in the text (1500 to now). When it was recorded: the source year.
for (const n of nodes) {
  const ys = [...String(n.k === 'passage' ? n.t : (n.x || '') + ' ' + n.t).matchAll(/\b(1[5-9]\d\d|20[0-2]\d)\b/g)].map((m) => +m[1]).filter((y) => y <= 2026);
  if (ys.length) n.ya = [Math.min(...ys), Math.max(...ys)];
}
// Whose voice, from the kind of source.
const voiceOf = (n) => {
  const u = n.u || '';
  if (/wikipedia/.test(u)) return 'ensiklopedia';
  if (/\.go\.id|komnasham|kemendagri|bps\./.test(u)) return 'pemerintah';
  if (n.k === 'page' || n.k === 'region') return 'aksara';
  if (n.kind === 'mission-record') return 'misi';
  if (['expedition', 'archive-collection'].includes(n.kind) || (n.y && n.y < 1963 && n.kind !== 'ethnography')) return 'kolonial';
  if (['report', 'news-investigation'].includes(n.kind)) return 'lsm-media';
  if (['ethnography', 'thesis', 'article', 'grammar', 'dictionary', 'history', 'dataset'].includes(n.kind)) return 'akademik';
  return 'lainnya';
};
for (const n of nodes) n.v = voiceOf(n);
for (const n of nodes) if (n.k === 'passage') { const src = edges.find(([a, , k]) => a === n.i && k === 'from'); if (src) n.v = nodes[src[1]].v; }
const embed = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8' });
const texts = nodes.map((n) => 'passage: ' + (n.t + '. ' + (n.k === 'passage' ? '' : n.x || '')).slice(0, 900));
const vecs = [];
for (let i = 0; i < texts.length; i += 32) {
  const out = await embed(texts.slice(i, i + 32), { pooling: 'mean', normalize: true });
  for (let j = 0; j < out.dims[0]; j++) vecs.push(Array.from(out.data.slice(j * 384, (j + 1) * 384)));
}
// Domains and cultural forms, multi-label, by similarity to a short description of each.
// Rough and automatic: shown as such, corrected later by the classifier with receipts and by stewards.
const DOMAINS = {
  'alam-hidup': 'Alam hidup: spesies, burung, hewan, tumbuhan, keanekaragaman hayati, ekologi',
  'hutan-tanah': 'Hutan dan tanah: hutan, tanah, lahan, kebun, pegunungan, lembah, tanah adat',
  'laut-air': 'Laut, sungai dan danau: laut, pesisir, pulau, sungai, danau, ikan, perahu, teluk',
  'iklim-musim': 'Iklim dan musim: cuaca, hujan, musim, iklim, suhu',
  'langit': 'Langit: bintang, bulan, navigasi, kalender',
  'pangan': 'Pangan: sagu, ubi jalar, keladi, babi, pertanian, makanan, berkebun, berburu',
  'kesehatan': 'Kesehatan: penyakit, obat, rumah sakit, kesehatan',
  'bahasa': 'Bahasa: bahasa, dialek, penutur, kosakata, rumpun bahasa, tata bahasa',
  'cerita': 'Cerita: cerita rakyat, mitos, legenda, asal usul, tradisi lisan, lagu',
  'adat-hukum': 'Adat dan hukum: adat, klan, marga, kepala suku, maskawin, perkawinan, pertukaran, kekerabatan',
  'kepercayaan': 'Kepercayaan: agama, gereja, misi, roh, ritual, upacara, kepercayaan, Kristen, Islam',
  'seni-teknologi': 'Seni dan teknologi: ukiran, noken, rumah honai, alat, kapak batu, tari, musik, kerajinan',
  'sejarah': 'Sejarah: ekspedisi, Belanda, penjajahan, perang dunia, sejarah, tahun',
  'kehidupan-bersama': 'Kehidupan bersama: pemerintahan, kabupaten, distrik, penduduk, politik, konflik, kekerasan, pengungsi, tambang, ekonomi, pendidikan',
};
const FORMS = {
  'tradisi-lisan': 'Tradisi lisan: cerita, mitos, legenda yang dituturkan',
  'manuskrip': 'Manuskrip: naskah, catatan tertulis lama, arsip',
  'adat-istiadat': 'Adat istiadat: kebiasaan, aturan adat, perkawinan, kekerabatan',
  'ritus': 'Ritus: upacara, ritual, perayaan, pesta babi',
  'pengetahuan-tradisional': 'Pengetahuan tradisional: pengetahuan tentang alam, obat, tanaman, musim',
  'teknologi-tradisional': 'Teknologi tradisional: alat, rumah, perahu, kapak batu, noken',
  'seni': 'Seni: ukiran, tari, musik, lagu, lukisan',
  'bahasa': 'Bahasa: bahasa daerah, dialek, kosakata',
  'permainan-rakyat': 'Permainan rakyat: permainan anak',
  'olahraga-tradisional': 'Olahraga tradisional: lomba, perang-perangan',
  'bukan': 'Pemerintahan, statistik, penduduk, luas wilayah, berita, konflik, administrasi',
};
// The descriptions also embed domain labels for the fallback.
const labelVecs = async (o) => { const ks = Object.keys(o), out = await embed(ks.map((k) => 'query: ' + o[k]), { pooling: 'mean', normalize: true }); return ks.map((k, j) => [k, Array.from(out.data.slice(j * 384, (j + 1) * 384))]); };
const dot = (a, b) => { let x = 0; for (let i = 0; i < a.length; i++) x += a[i] * b[i]; return x; };
const D = await labelVecs(DOMAINS), F = await labelVecs(FORMS);
// Keyword lists first (Indonesian, English, Dutch); the embedding is only a fallback for domains.
const KW = {
  'alam-hidup': /\b(spesies|species|burung|bird|cenderawasih|kasuari|hewan|animal|fauna|flora|tumbuhan|plant|biodiversity|keanekaragaman|endemi|satwa|wildlife|ornitholog)/i,
  'hutan-tanah': /\b(hutan|forest|tanah|land|lahan|lembah|valley|gunung|mountain|pegunungan|puncak|highland|dataran tinggi|bukit|soil|kebun)/i,
  'laut-air': /\b(laut|sea|pesisir|coast|pantai|pulau|island|sungai|river|danau|lake|teluk|bay|ikan|fish|perahu|boat|kapal|maritim|maritime|meer)/i,
  'iklim-musim': /\b(iklim|climate|hujan|rain|musim|season|cuaca|weather|suhu|temperature|tropis|tropical)/i,
  'langit': /\b(bintang|star|rasi|constellation|bulan purnama|navigasi|navigation|orion|scorpio)/i,
  'pangan': /\b(sagu|sago|ubi|sweet potato|keladi|taro|babi|pig|pangan|food|makanan|pertanian|agricultur|bertani|farmer|petani|kebun|garden|berburu|hunt|singkong|cassava|pisang|banana)/i,
  'kesehatan': /\b(kesehatan|health|penyakit|disease|obat|medicin|rumah sakit|hospital|puskesmas|malaria|cacing|tapeworm|gizi|nutrition)/i,
  'bahasa': /\b(bahasa|language|dialek|dialect|penutur|speaker|kosakata|vocabular|tata bahasa|grammar|linguist|rumpun|kamus|dictionar|taal)/i,
  'cerita': /\b(cerita|story|mitos|myth|legenda|legend|asal.usul|origin|dongeng|tradisi lisan|oral|lagu|song|wor\b|koreri|manarmakeri)/i,
  'adat-hukum': /\b(adat|customary|klan|clan|marga|kepala suku|chief|maskawin|bride.?(price|wealth)|perkawinan|marriage|kekerabatan|kinship|pertukaran|exchange|hak ulayat|patrilineal|keret|moiety|paroh)/i,
  'kepercayaan': /\b(agama|religio|gereja|church|misi\b|mission|zending|roh|spirit|ritual|upacara|ceremon|kepercayaan|belief|kristen|christian|islam|muslim|katolik|catholic|protestan|sakral|sacred|mumi|mumm|ibadah)/i,
  'seni-teknologi': /\b(ukir|carv|noken|honai|rumah adat|alat|tool|kapak|axe|tari|dance|musik|music|kerajinan|craft|koteka|seni|art\b|anyaman|tifa|teknologi|technolog|internet|jalan|road|bandara|airport)/i,
  'sejarah': /\b(sejarah|history|historis|ekspedisi|expedition|belanda|dutch|nederland|kolonial|colonial|perang dunia|world war|jepang|japan|abad|century|zaman|era\b|1[5-9]\d\d)/i,
  'kehidupan-bersama': /\b(pemerintah|govern|kabupaten|regency|distrik|district|kecamatan|kampung|village|penduduk|population|jiwa|politik|politic|konflik|conflict|kekerasan|violen|tembak|shoot|pengungsi|displac|refugee|tambang|mine|mining|freeport|ekonomi|econom|pendidikan|educat|sekolah|school|undang.undang|law no|pemekaran|komnas|ham\b|human rights|polisi|police|tni|militer|military|luas wilayah|km)/i,
};
const FKW = {
  'tradisi-lisan': /\b(cerita|story|mitos|myth|legenda|legend|asal.usul|origin|dongeng|tradisi lisan|oral tradition|koreri|manarmakeri)/i,
  'manuskrip': /\b(naskah|manuscript|arsip|archive|catatan|memorie|verslag|laporan lama|dagboek|diary)/i,
  'adat-istiadat': /\b(adat|customary|maskawin|bride|perkawinan|marriage|kekerabatan|kinship|klan|clan|pertukaran|exchange|patrilineal)/i,
  'ritus': /\b(ritual|ritus|upacara|ceremon|pesta|feast|berkabung|mourning|wam mawe|inisiasi|initiation)/i,
  'pengetahuan-tradisional': /\b(pengetahuan tradisional|traditional knowledge|obat tradisional|navigasi|rasi bintang|musim|bertani|sagu|ubi jalar|bakar batu)/i,
  'teknologi-tradisional': /\b(kapak batu|stone axe|honai|rumah adat|perahu|canoe|noken|koteka|alat tradisional|tombak|spear|busur|bow\b|panah)/i,
  'seni': /\b(ukir|carv|tari|dance|lagu|song|musik|music|wor\b|lukis|seni|tifa)/i,
  'bahasa': /\b(bahasa|language|dialek|dialect|penutur|speaker|kosakata|grammar|tata bahasa|kamus|dictionar)/i,
  'permainan-rakyat': /\b(permainan|game|mainan)/i,
  'olahraga-tradisional': /\b(olahraga tradisional|perang.perangan|lomba perahu)/i,
};
nodes.forEach((n, i) => {
  if (n.k === 'region') return;
  const text = n.t + ' ' + (n.k === 'passage' ? '' : n.x || '');
  const hits = Object.entries(KW).map(([k, re]) => [k, (text.match(new RegExp(re.source, 'gi')) || []).length]).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  if (hits.length) n.d = hits.slice(0, 3).map(([k]) => k);
  else { const ds = D.map(([k, v]) => [k, dot(vecs[i], v)]).sort((a, b) => b[1] - a[1]); n.d = [ds[0][0]]; n.dg = 1; }
  const fh = Object.entries(FKW).map(([k, re]) => [k, (text.match(new RegExp(re.source, 'gi')) || []).length]).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  if (fh.length) n.f = fh[0][0];
});
// Seeded random so the layout is stable between runs.
let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const umap = new UMAP({ nComponents: 3, nNeighbors: 14, minDist: 0.25, random: rand });
const pos = umap.fit(vecs);
const lo = [0, 1, 2].map((d) => Math.min(...pos.map((p) => p[d]))), hi = [0, 1, 2].map((d) => Math.max(...pos.map((p) => p[d])));
const P = pos.map((p) => p.map((v, d) => +(((v - lo[d]) / (hi[d] - lo[d])) * 2 - 1).toFixed(3)));
const out = { built: new Date().toISOString().slice(0, 10), model: 'multilingual-e5-small (q8), UMAP 3D, seed 7', domains: Object.fromEntries(Object.entries(DOMAINS).map(([k, v]) => [k, v.split(':')[0]])), forms: Object.fromEntries(Object.entries(FORMS).filter(([k]) => k !== 'bukan').map(([k, v]) => [k, v.split(':')[0]])), nodes: nodes.map((n, i) => { const { i: _i, ...rest } = n; return { ...rest, p: P[i] }; }), edges };
writeFileSync(process.argv[2], JSON.stringify(out));
console.log('written', JSON.stringify(out).length, 'bytes');
