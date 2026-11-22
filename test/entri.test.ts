import test from 'node:test'
import assert from 'node:assert/strict'
import { Etnos } from '../src/store.ts'
import { Groups } from '../src/groups.ts'
import { Wiki } from '../src/wiki.ts'
import { KnowledgeModel, type KnowledgeSeed } from '../src/knowledge-model.ts'
import { Datasets } from '../src/datasets.ts'
import { Kamus } from '../src/kamus.ts'
import { kamusLexicon } from '../src/kamus-data.ts'
import { api } from '../src/api.ts'
import { readEntry, entryIndex, catalogue, resolve, type ViewerRecord } from '../src/entri.ts'
import { storeSource } from '../src/entri-store.ts'

// Synthetic places, pages and things: invented names, never real places, people or records.
const seed: KnowledgeSeed = {
  version: 1,
  entities: [
    { slug: 'kabupaten-tanjung-uji', class: 'tempat', title: 'Kabupaten Tanjung Uji', description: 'Synthetic', aliases: [], context: 'tanjung-uji', origin: 'catalogue' },
    { slug: 'danau-uji', class: 'tempat', title: 'Danau Uji', description: 'Danau sintetis.', aliases: [], context: null, origin: 'catalogue' },
    { slug: 'gunung-uji', class: 'tempat', title: 'Gunung Uji', description: 'Gunung sintetis.', aliases: [], context: null, origin: 'catalogue' },
    { slug: 'suku-uji', class: 'kelompok', title: 'Suku Uji', description: 'Kelompok sintetis.', aliases: [], context: null, origin: 'catalogue' },
  ],
  witnesses: [], mentions: [], assertions: [],
}
const records: ViewerRecord[] = [
  { id: 'bentang-gunung-uji', kind: 'landform', title: 'Gunung Uji', subtitle: 'Gunung', summary: 'Relief sintetis.', thumb: null, entry: { slug: 'gunung-uji', class: 'tempat', landform: true }, taxonomy: null, facts: [{ label: 'Ketinggian', value: '1.234 m' }] },
  { id: 'burung-uji', kind: 'species', title: 'Burung uji', subtitle: 'Avis uji', summary: 'Burung sintetis.', thumb: '/t.jpg', entry: { slug: 'burung-uji', class: 'makhluk', title: 'Burung uji', scientificName: 'Avis uji' }, taxonomy: [{ rank: 'kingdom', name: 'Animalia' }, { rank: 'class', name: 'Aves' }, { rank: 'genus', name: 'Avis' }, { rank: 'species', name: 'Avis uji' }], facts: [] },
  { id: 'suara-burung-uji', kind: 'audio', title: 'Suara burung uji', subtitle: 'Avis uji', summary: 'Rekaman sintetis.', thumb: null, entry: { slug: 'burung-uji' }, taxonomy: null, facts: [] },
  { id: 'kapak-danau-uji', kind: 'model', title: 'Danau Uji', subtitle: null, summary: 'Benda sintetis yang namanya sama dengan sebuah tempat.', thumb: null, entry: { slug: 'danau-uji', class: 'benda', title: 'Danau Uji' }, taxonomy: null, facts: [] },
]

function world(o: { importSeed?: boolean } = {}) {
  const s = new Etnos(':memory:', 'https://entri.example', () => Date.parse('2026-11-21T00:00:00Z'))
  const steward = s.provision('did:web:steward.example', 'Node steward'), owner = s.provision('did:web:owner.example', 'Owner'), member = s.provision('did:web:member.example', 'Member')
  const groups = new Groups(s, { stewardDid: steward.actor.did }), wiki = new Wiki(s), model = new KnowledgeModel(s, groups)
  const datasets = new Datasets(s, groups, { datasets: { version: 1, datasets: [] }, things: [] })
  const kamus = new Kamus(s, kamusLexicon())
  const ctx = (slug: string, title: string, kind: 'place' | 'region' | 'topic' | 'language', facet = '', description = 'Synthetic', aliases: string[] = []) =>
    groups.createContext(steward.actor.id, { slug, title, kind, description, language: 'id', aliases, facet })
  const region = ctx('wilayah-uji', 'Wilayah Uji', 'region', 'customary-region'), province = ctx('provinsi-uji', 'Provinsi Uji', 'region', 'province')
  const regency = ctx('tanjung-uji', 'Tanjung Uji', 'place', 'regency'), lake = ctx('danau-uji', 'Danau Uji', 'place', 'regency')
  const language = ctx('bahasa-uji', 'Uji', 'language', '', 'Rumpun Uji Raya menurut Glottolog 5.3. Titik acuannya bukan batas wilayah bahasa.', ['glottocode:uji1234'])
  ctx('topik-uji', 'Topik uji', 'topic', 'topic-group', 'Kelompok topik: sintetis.')
  for (const child of [regency, lake]) { groups.linkContext(steward.actor.id, child.id, region.id); groups.linkContext(steward.actor.id, child.id, province.id) }
  const room = s.createCommunity(owner.actor.id, 'Ruang uji', 'Synthetic', 'public')
  const page = (title: string, text: string, labels: string[] = [], community = room.id) => {
    const p = wiki.create(owner.actor.id, community, title), d = wiki.propose(owner.actor.id, p.id, null, text, ['https://example.org/' + p.id], 'id', 'Komunitas')
    wiki.decide(owner.actor.id, d.id, d.digest, true)
    for (const l of labels) groups.attach(owner.actor.id, 'wiki', p.id, l)
    return p
  }
  const home = page('Kabupaten Tanjung Uji', 'Teks tentang kabupaten.', [regency.id, region.id])
  // A page about a lake labelled with the regency: it is the lake's article and puts the lake under the regency.
  const lakePage = page('Danau Uji', 'Teks tentang danau.', [regency.id, region.id])
  const loose = page('Catatan lepas uji', 'Teks yang belum menjadi bagian entri mana pun.')
  // A page in a room that later becomes hidden must never be an article, whatever its title.
  const closed = s.createCommunity(owner.actor.id, 'Ruang rahasia uji', 'Synthetic', 'public')
  const secret = page('Gunung Uji', 'Rahasia gunung yang tidak boleh tampil.', [], closed.id)
  groups.labelCommunity(owner.actor.id, closed.id, regency.id)
  s.run("UPDATE communities SET visibility='hidden-private' WHERE id=?", closed.id)
  const open = s.createCommunity(owner.actor.id, 'Petani uji', 'Komunitas sintetis', 'public')
  groups.labelCommunity(owner.actor.id, open.id, regency.id)
  groups.labelCommunity(owner.actor.id, open.id, language.id)
  s.setMember(owner.actor.id, closed.id, member.actor.id, true)
  if (o.importSeed !== false) model.importSeed(steward.actor.id, seed)
  const source = () => storeSource({ store: s, groups, wiki, model, datasets, kamus, seed, records })
  return { s, groups, wiki, model, datasets, kamus, source, steward: steward.actor.id, owner: owner.actor.id, member: member.actor.id, home, lakePage, loose, secret, room: room.id, closed: closed.id, open: open.id, regency, language }
}

test('one shape for a place: chain with wilayah adat beside it, its article, what sits inside, and who is here', async () => {
  const w = world()
  try {
    const e = (await readEntry(w.source(), 'tanjung-uji'))!
    assert.equal(e.slug, 'tanjung-uji'); assert.equal(e.kind, 'tempat'); assert.equal(e.sub?.label, 'Kabupaten'); assert.equal(e.redirect, false)
    assert.deepEqual(e.chain.map((c) => c.title), ['Tanah Papua', 'Provinsi Uji'])
    assert.deepEqual(e.overlay.map((r) => r.slug), ['wilayah-uji'])
    assert.equal(e.article?.title, 'Kabupaten Tanjung Uji'); assert.equal(e.history?.pageId, w.home.id)
    // The lake is not a context: its article's label puts it inside the regency.
    assert.ok(e.children.some((c) => c.slug === 'danau-uji--tempat'))
    assert.deepEqual(e.communities.map((c) => c.title), ['Petani uji'])
    assert.equal(e.research.literature, 'tanjung-uji')
  } finally { w.s.close() }
})

test('slug collisions resolve one way: contexts keep the bare slug, a shadowed thing gets slug--class, old ids redirect', async () => {
  const w = world()
  try {
    const src = w.source(), cat = await catalogue(src)
    assert.deepEqual(resolve(cat, 'danau-uji'), { slug: 'danau-uji', redirect: false })
    assert.deepEqual(resolve(cat, 'danau-uji--tempat'), { slug: 'danau-uji--tempat', redirect: false })
    // The object record named like the place and the lake gets its own address too.
    assert.deepEqual(resolve(cat, 'kapak-danau-uji'), { slug: 'danau-uji--benda', redirect: true })
    assert.deepEqual(resolve(cat, 'kabupaten-tanjung-uji'), { slug: 'tanjung-uji', redirect: true })
    assert.deepEqual(resolve(cat, w.home.id), { slug: 'tanjung-uji', redirect: true })
    assert.deepEqual(resolve(cat, w.regency.id), { slug: 'tanjung-uji', redirect: true })
    assert.deepEqual(resolve(cat, 'bentang-gunung-uji'), { slug: 'gunung-uji', redirect: true })
    assert.deepEqual(resolve(cat, 'suara-burung-uji'), { slug: 'burung-uji', redirect: true })
    for (const word of ['data', 'peta', 'lihat', 'jenis', 'notes', 'tidak-ada']) assert.equal(resolve(cat, word), null)
    const lake = (await readEntry(src, 'danau-uji--tempat'))!
    assert.equal(lake.kind, 'bentang-alam'); assert.equal(lake.sub?.key, 'danau'); assert.equal(lake.article?.title, 'Danau Uji')
    assert.deepEqual(lake.chain.map((c) => c.title), ['Tanah Papua', 'Provinsi Uji', 'Tanjung Uji'])
    // A page that describes nothing else yet is an entry of its own, at its id.
    const loose = (await readEntry(src, w.loose.id))!
    assert.equal(loose.kind, 'halaman'); assert.equal(loose.slug, w.loose.id); assert.equal(loose.redirect, false)
  } finally { w.s.close() }
})

test('the public API answers the same shape and 404s for routes and unknown slugs', async () => {
  const w = world()
  try {
    const handle = api(w.s, {}), call = (p: string) => handle(new Request('https://entri.example' + p))
    const r = await call('/v1/entri/' + w.home.id)
    assert.equal(r.status, 200)
    const e = await r.json() as { slug: string; redirect: boolean; asked: string }
    assert.equal(e.slug, 'tanjung-uji'); assert.equal(e.redirect, true); assert.equal(e.asked, w.home.id)
    assert.equal((await call('/v1/entri/peta')).status, 404)
    assert.equal((await call('/v1/entri/tidak-ada')).status, 404)
    const index = await (await call('/v1/entri')).json() as { entries: { slug: string; kind: string }[]; counts: Record<string, number> }
    assert.ok(index.entries.some((x) => x.slug === 'tanjung-uji' && x.kind === 'tempat'))
  } finally { w.s.close() }
})

test('private rooms never shape a public entry: no hidden page as article, no hidden room, not even for a member', async () => {
  const w = world()
  try {
    const src = w.source()
    const mountain = (await readEntry(src, 'gunung-uji'))!
    assert.equal(mountain.article, null)
    assert.equal(mountain.kind, 'bentang-alam'); assert.equal(mountain.sub?.label, 'Gunung')
    assert.deepEqual(mountain.facts.map((f) => f.value), ['Gunung', '1.234 m'])
    const place = (await readEntry(src, 'tanjung-uji'))!
    assert.ok(!place.communities.some((c) => c.id === w.closed))
    const index = await entryIndex(src)
    const text = JSON.stringify(index) + JSON.stringify(place) + JSON.stringify(mountain)
    for (const forbidden of ['Rahasia gunung', 'Ruang rahasia uji', w.secret.id, w.closed]) assert.equal(text.includes(forbidden), false, forbidden)
    // A member of the hidden room asking through the API sees the same public page.
    const handle = api(w.s, {}), token = w.s.provision('did:web:reader.example', 'Reader')
    w.s.setMember(w.owner, w.closed, token.actor.id, true)
    const asMember = await (await handle(new Request('https://entri.example/v1/entri/gunung-uji', { headers: { authorization: 'Bearer ' + token.token } }))).json() as { article: unknown }
    assert.equal(asMember.article, null)
  } finally { w.s.close() }
})

test('the index counts real entries per kind and lists sub-kinds only where they exist', async () => {
  const w = world()
  try {
    const index = await entryIndex(w.source())
    assert.equal(index.counts.tempat, 4) // two regencies, one province, one wilayah adat
    assert.equal(index.counts['bentang-alam'], 2)
    assert.equal(index.counts.suku, 1)
    assert.equal(index.counts.makhluk, 1)
    assert.equal(index.counts.halaman, 1)
    assert.deepEqual(index.subs['bentang-alam'].map((s) => s.key).sort(), ['danau', 'gunung'])
    assert.deepEqual(index.subs.makhluk.map((s) => s.key), ['burung'])
    assert.equal(index.subs.suku, undefined)
    const lake = index.entries.find((x) => x.slug === 'danau-uji--tempat')!
    assert.deepEqual(lake.within.sort(), ['provinsi-uji', 'tanjung-uji', 'wilayah-uji'])
    assert.equal(lake.article, true)
  } finally { w.s.close() }
})

test('a language shows its family, its Glottolog code and the rooms that write in it; a species its taxonomy and media', async () => {
  const w = world()
  try {
    const src = w.source()
    const lang = (await readEntry(src, 'bahasa-uji'))!
    assert.equal(lang.kind, 'bahasa')
    assert.deepEqual(lang.chain.map((c) => c.title), ['Bahasa', 'Rumpun Uji Raya'])
    assert.deepEqual(lang.facts.map((f) => f.label), ['Rumpun', 'Glottolog'])
    assert.deepEqual(lang.communities.map((c) => c.title), ['Petani uji'])
    const bird = (await readEntry(src, 'burung-uji'))!
    assert.equal(bird.kind, 'makhluk'); assert.equal(bird.sub?.label, 'Burung')
    assert.deepEqual(bird.chain.map((c) => c.title), ['Makhluk hidup', 'Animalia', 'Aves', 'Avis'])
    assert.deepEqual(bird.media.map((m) => m.id), ['burung-uji', 'suara-burung-uji'])
    assert.deepEqual(bird.communities, [])
  } finally { w.s.close() }
})

test('a node that has not imported the knowledge seed reads the seed as its public commons; stored rows win once imported', async () => {
  const w = world({ importSeed: false })
  try {
    const before = await entryIndex(w.source())
    assert.ok(before.entries.some((x) => x.slug === 'suku-uji'))
    w.model.importSeed(w.steward, seed)
    w.s.run("UPDATE km_entities SET state='rejected' WHERE slug='suku-uji'")
    const after = await entryIndex(w.source())
    assert.equal(after.entries.some((x) => x.slug === 'suku-uji'), false)
  } finally { w.s.close() }
})
