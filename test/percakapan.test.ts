// P4: Percakapan (docs/plan/one-page-system-2026-11-21.md §4, src/tentang.ts). Every place, page, person and post
// here is a fixture with an invented name; none is a real place or record.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Strata } from '../src/store.ts'
import { Groups } from '../src/groups.ts'
import { Wiki } from '../src/wiki.ts'
import { Forum } from '../src/forum.ts'
import { api } from '../src/api.ts'

function world() {
  let now = Date.parse('2026-11-21T00:00:00Z')
  const s = new Strata(':memory:', 'https://percakapan.example', () => (now += 1000))
  const admin = s.provision('did:web:admin.example', 'Operator fixture'),
    author = s.provision('did:web:author.example', 'Penulis fixture'),
    other = s.provision('did:web:other.example', 'Pembaca fixture'),
    insider = s.provision('did:web:insider.example', 'Anggota fixture')
  const groups = new Groups(s, { stewardDid: admin.actor.did }), wiki = new Wiki(s), forum = new Forum(s)
  const ctx = (slug: string, title: string, kind: 'place' | 'region' | 'topic' | 'language', facet = '') =>
    groups.createContext(admin.actor.id, { slug, title, kind, facet, description: 'Fixture', language: 'id', aliases: [] })
  const regency = ctx('tanjung-uji', 'Tanjung Uji', 'place', 'regency'), kampung = ctx('kampung-uji', 'Kampung Lumut Uji', 'place'),
    peak = ctx('puncak-uji', 'Puncak Uji', 'place', 'regency'), lang = ctx('bahasa-uji', 'Ujian', 'language'), topic = ctx('topik-uji', 'Kesehatan Uji', 'topic'),
    far = ctx('pulau-jauh-uji', 'Pulau Jauh Uji', 'place', 'regency')
  groups.linkContext(admin.actor.id, kampung.id, regency.id)
  const open = s.createCommunity(author.actor.id, 'Ruang terbuka fixture', 'Fixture', 'public'),
    labelled = s.createCommunity(admin.actor.id, 'Petani uji fixture', 'Fixture', 'public'),
    shut = s.createCommunity(author.actor.id, 'Ruang tertutup fixture', 'Fixture', 'listed-private'),
    later = s.createCommunity(author.actor.id, 'Ruang yang nanti ditutup fixture', 'Fixture', 'public')
  for (const c of [open, later]) s.setMember(author.actor.id, c.id, other.actor.id, true)
  for (const who of [author, other]) s.setMember(admin.actor.id, labelled.id, who.actor.id, true)
  s.setMember(author.actor.id, shut.id, insider.actor.id, true)
  groups.labelCommunity(admin.actor.id, labelled.id, regency.id, false, 'about')
  groups.labelCommunity(admin.actor.id, labelled.id, lang.id, false, 'language')
  // A lake that is no context: a public page titled with its name and labelled with the regency puts it there.
  const page = (title: string, labels: string[]) => {
    const p = wiki.create(author.actor.id, open.id, title), d = wiki.propose(author.actor.id, p.id, null, 'Teks fixture.', ['https://example.org/' + p.id], 'id', 'Komunitas')
    wiki.decide(author.actor.id, d.id, d.digest, true)
    for (const l of labels) groups.attach(author.actor.id, 'wiki', p.id, l)
    return p
  }
  const lake = page('Danau Lumut Uji', [regency.id]), mountain = page('Puncak Uji', [])
  const handler = api(s, { stewardDid: admin.actor.did })
  const call = async (token: string | null, path: string, body?: unknown) => {
    const r = await handler(new Request(s.base + path, body === undefined ? { headers: token ? { authorization: 'Bearer ' + token } : {} } : { method: 'POST', headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json' }, body: JSON.stringify(body) }))
    return { status: r.status, body: (await r.json().catch(() => null)) as any }
  }
  const post = async (token: string, communityId: string, text: string, extra: Record<string, unknown> = {}) => {
    const r = await call(token, '/v1/posts', { communityId, text, requestKey: randomUUID(), ...extra })
    assert.equal(r.status, 200, JSON.stringify(r.body))
    return r.body
  }
  return { s, admin, author, other, insider, groups, forum, regency, kampung, peak, lang, topic, far, open, labelled, shut, later, lake, mountain, call, post }
}
const slugsOf = (r: { body: { items: { id: string }[] } }) => r.body.items.map((p) => p.id)

test('the author tags a post with up to five entries, sees them as chips, and can change or remove them', async () => {
  const w = world()
  const p = await w.post(w.author.token, w.open.id, 'Cerita dari kampung.', { tentang: ['kampung-uji', w.lake.id, w.regency.id] })
  assert.deepEqual(p.contexts.map((c: { slug: string }) => c.slug).sort(), ['kampung-uji', 'tanjung-uji'])
  assert.deepEqual(p.entries, [{ slug: w.lake.id, title: 'Danau Lumut Uji', label: 'Danau' }], 'an entry that is no context has its own row')
  // Six is one too many, and a refused list leaves no post behind.
  const before = w.s.all('SELECT id FROM posts').length
  const six = await w.call(w.author.token, '/v1/posts', { communityId: w.open.id, text: 'Terlalu banyak', requestKey: randomUUID(), tentang: ['kampung-uji', w.lake.id, 'tanjung-uji', 'puncak-uji', 'bahasa-uji', 'topik-uji'] })
  assert.equal(six.status, 400)
  const unknown = await w.call(w.author.token, '/v1/posts', { communityId: w.open.id, text: 'Tidak ada', requestKey: randomUUID(), tentang: ['tidak-ada-uji'] })
  assert.equal(unknown.status, 404)
  assert.equal(w.s.all('SELECT id FROM posts').length, before)
  // Change: keep one, add one; then remove all.
  const changed = await w.call(w.author.token, `/v1/posts/${p.id}/tentang`, { entries: [w.lake.id, 'topik-uji'] })
  assert.equal(changed.status, 200)
  assert.deepEqual(changed.body.tags.map((t: { slug: string }) => t.slug), ['topik-uji', w.lake.id])
  const read = await w.call(null, '/v1/posts/' + p.id)
  assert.deepEqual(read.body.contexts.map((c: { slug: string }) => c.slug), ['topik-uji'])
  const cleared = await w.call(w.author.token, `/v1/posts/${p.id}/tentang`, { entries: [] })
  assert.deepEqual(cleared.body.tags, [])
  assert.equal(w.s.all("SELECT 1 FROM record_contexts WHERE record_kind='post' AND record_id=?", p.id).length + w.s.all('SELECT 1 FROM post_entries WHERE post_id=?', p.id).length, 0)
  // Only the author, only in public, only the opening post.
  assert.equal((await w.call(w.other.token, `/v1/posts/${p.id}/tentang`, { entries: ['kampung-uji'] })).status, 403)
  assert.equal((await w.call(null, `/v1/posts/${p.id}/tentang`, { entries: ['kampung-uji'] })).status, 401)
  const reply = await w.post(w.author.token, w.open.id, 'Balasan', { parentId: p.id })
  assert.equal((await w.call(w.author.token, `/v1/posts/${reply.id}/tentang`, { entries: ['kampung-uji'] })).status, 400)
  const secret = await w.post(w.author.token, w.shut.id, 'Rahasia di Danau Lumut Uji')
  assert.equal((await w.call(w.author.token, `/v1/posts/${secret.id}/tentang`, { entries: ['kampung-uji'] })).status, 400)
  assert.equal((await w.call(w.author.token, '/v1/posts', { communityId: w.shut.id, text: 'x', requestKey: randomUUID(), tentang: ['kampung-uji'] })).status, 400)
  assert.equal((await w.call(w.other.token, `/v1/posts/${secret.id}/tentang`, { entries: [] })).status, 404, 'no hint that a private post exists')
})

test('Percakapan lists tagged and inherited public posts, newest first, with their source and paging', async () => {
  const w = world()
  const tagged = await w.post(w.author.token, w.open.id, 'Satu', { tentang: ['tanjung-uji'] })
  const inherited = await w.post(w.other.token, w.labelled.id, 'Dua, dari komunitas yang berlabel')
  const linking = await w.post(w.author.token, w.open.id, 'Tiga', { content: { url: 'https://percakapan.example/wiki/tanjung-uji' } })
  await w.post(w.author.token, w.open.id, 'Tidak tentang apa pun')
  const r = await w.call(null, '/v1/entri/tanjung-uji/percakapan')
  assert.equal(r.status, 200)
  assert.deepEqual(slugsOf(r), [linking.id, inherited.id, tagged.id])
  assert.equal(r.body.total, 3)
  assert.deepEqual(r.body.items.map((p: { via: { source: string }[] }) => p.via[0].source), ['link', 'community', 'author'])
  assert.deepEqual(r.body.items[1].via[0].community, { id: w.labelled.id, title: 'Petani uji fixture' })
  // A language label is not "tentang": the community writes in it, which is not the same as being about it.
  assert.deepEqual(slugsOf(await w.call(null, '/v1/entri/bahasa-uji/percakapan')), [])
  // Paging.
  const first = await w.call(null, '/v1/entri/tanjung-uji/percakapan?limit=2')
  assert.equal(first.body.items.length, 2)
  const rest = await w.call(null, '/v1/entri/tanjung-uji/percakapan?limit=2&cursor=' + first.body.nextCursor)
  assert.deepEqual(slugsOf(rest), [tagged.id])
  assert.equal(rest.body.nextCursor, null)
  assert.equal((await w.call(null, '/v1/entri/tanjung-uji/percakapan?cursor=zz!')).status, 400)
  assert.equal((await w.call(null, '/v1/entri/tidak-ada-uji/percakapan')).status, 404)
})

test('places inside roll up only behind the toggle, and say where each post came from', async () => {
  const w = world()
  const own = await w.post(w.author.token, w.open.id, 'Kabupaten', { tentang: ['tanjung-uji'] })
  const village = await w.post(w.author.token, w.open.id, 'Kampung', { tentang: ['kampung-uji'] })
  const lake = await w.post(w.author.token, w.open.id, 'Danau', { tentang: [w.lake.id] })
  await w.post(w.author.token, w.open.id, 'Tempat lain', { tentang: ['pulau-jauh-uji'] })
  const plain = await w.call(null, '/v1/entri/tanjung-uji/percakapan')
  assert.deepEqual(slugsOf(plain), [own.id])
  assert.equal(plain.body.inside, 2, 'the kampung and the lake sit inside')
  const all = await w.call(null, '/v1/entri/tanjung-uji/percakapan?inside=1')
  assert.deepEqual(slugsOf(all), [lake.id, village.id, own.id])
  assert.deepEqual(all.body.items.map((p: { via: { entry: { title: string } | null }[] }) => p.via[0].entry?.title ?? null), ['Danau Lumut Uji', 'Kampung Lumut Uji', null])
  // The lake's own page has it as its own post, by its address or its older one.
  assert.deepEqual(slugsOf(await w.call(null, '/v1/entri/' + w.lake.id + '/percakapan')), [lake.id])
})

test('private posts never reach an entry, its count or a member who reads it; a later change of visibility is read now', async () => {
  const w = world()
  const before = await w.post(w.author.token, w.later.id, 'Tadinya publik', { tentang: ['tanjung-uji', w.lake.id] })
  await w.post(w.author.token, w.shut.id, 'Rahasia tentang Tanjung Uji')
  // A private room cannot tag; a private room labelled by a raw row (a fixture of a bad write) still never shows.
  w.s.run("INSERT INTO community_contexts(community_id,context_id,issuer_id,created,role) VALUES(?,?,?,?, 'about')", w.shut.id, w.regency.id, w.admin.actor.id, 0)
  const pub = await w.call(w.insider.token, '/v1/entri/tanjung-uji/percakapan?inside=1')
  assert.deepEqual(slugsOf(pub), [before.id])
  const search = async () => JSON.stringify((await w.call(w.insider.token, '/v1/search?q=' + encodeURIComponent('Tadinya publik'))).body ?? {})
  assert.ok((await search()).includes(before.id), 'found while public')
  w.s.run("UPDATE communities SET visibility='listed-private' WHERE id=?", w.later.id)
  for (const token of [null, w.author.token, w.insider.token]) {
    const r = await w.call(token, '/v1/entri/tanjung-uji/percakapan?inside=1')
    assert.deepEqual(slugsOf(r), [])
    assert.equal(r.body.total, 0)
  }
  assert.deepEqual(slugsOf(await w.call(w.author.token, '/v1/entri/' + w.lake.id + '/percakapan')), [])
  w.s.run("UPDATE communities SET visibility='hidden-private' WHERE id=?", w.later.id)
  assert.equal((await w.call(null, '/v1/entri/tanjung-uji/percakapan')).body.total, 0)
  // Search does not list it for anyone outside either.
  assert.ok(!(await search()).includes(before.id))
})

test('a deleted or hidden post leaves the entry; a restored one comes back', async () => {
  const w = world()
  const gone = await w.post(w.author.token, w.open.id, 'Akan dihapus', { tentang: ['tanjung-uji', w.lake.id] })
  const hidden = await w.post(w.author.token, w.open.id, 'Akan disembunyikan', { tentang: ['tanjung-uji'] })
  assert.deepEqual(slugsOf(await w.call(null, '/v1/entri/tanjung-uji/percakapan')), [hidden.id, gone.id])
  assert.equal((await w.call(w.author.token, `/v1/posts/${gone.id}/delete`, { revision: gone.revision })).status, 200)
  assert.equal(w.s.all('SELECT 1 FROM post_entries WHERE post_id=?', gone.id).length, 0, 'tags go with the post')
  w.forum.moderate(w.author.actor.id, hidden.id, { action: 'hide', reason: 'Fixture' })
  assert.deepEqual(slugsOf(await w.call(null, '/v1/entri/tanjung-uji/percakapan')), [])
  assert.deepEqual(slugsOf(await w.call(null, '/v1/entri/' + w.lake.id + '/percakapan')), [])
  w.forum.moderate(w.author.actor.id, hidden.id, { action: 'restore', reason: 'Fixture' })
  assert.deepEqual(slugsOf(await w.call(null, '/v1/entri/tanjung-uji/percakapan')), [hidden.id])
})

test('"Tandai …?" is offered only to the author of a public post, skips what is tagged or inherited, and gives both entries of a shared name', async () => {
  const w = world()
  const p = await w.post(w.author.token, w.open.id, 'Kami naik ke Puncak Uji lalu turun ke Danau Lumut Uji dan Kampung Lumut Uji. Soal Kesehatan Uji juga.', { tentang: ['kampung-uji'] })
  const r = await w.call(w.author.token, `/v1/posts/${p.id}/tandai`)
  assert.equal(r.status, 200)
  assert.deepEqual(r.body.suggestions.map((x: { text: string }) => x.text), ['Puncak Uji', 'Danau Lumut Uji'], 'the kampung is tagged and a topic is never matched')
  assert.deepEqual(r.body.suggestions[0].entries.map((e: { slug: string; label: string }) => [e.slug, e.label]).sort(), [[w.mountain.id, 'Gunung'], ['puncak-uji', 'Kabupaten']].sort())
  // Inherited: a post in a community labelled Tanjung Uji is not asked about Tanjung Uji.
  const q = await w.post(w.other.token, w.labelled.id, 'Pasar di Tanjung Uji ramai.')
  assert.deepEqual((await w.call(w.other.token, `/v1/posts/${q.id}/tandai`)).body.suggestions, [])
  // Someone else, a visitor, a private post: nothing.
  assert.equal((await w.call(w.other.token, `/v1/posts/${p.id}/tandai`)).status, 403)
  assert.equal((await w.call(null, `/v1/posts/${p.id}/tandai`)).status, 401)
  const secret = await w.post(w.author.token, w.shut.id, 'Rahasia di Danau Lumut Uji')
  assert.deepEqual((await w.call(w.author.token, `/v1/posts/${secret.id}/tandai`)).body.suggestions, [])
  assert.equal((await w.call(w.insider.token, `/v1/posts/${secret.id}/tandai`)).status, 403)
  assert.equal((await w.call(w.other.token, `/v1/posts/${secret.id}/tandai`)).status, 404)
  // A full post is not asked again.
  const full = await w.post(w.author.token, w.open.id, 'Puncak Uji', { tentang: ['kampung-uji', 'tanjung-uji', 'bahasa-uji', 'topik-uji', 'pulau-jauh-uji'] })
  assert.deepEqual((await w.call(w.author.token, `/v1/posts/${full.id}/tandai`)).body.suggestions, [])
})

test('the names list matches places and landforms, languages with "bahasa", and never topics', async () => {
  const w = world()
  const r = await w.call(null, '/v1/tentang/names')
  const by = new Map(r.body.entries.map((e: { slug: string }) => [e.slug, e]))
  const names = (slug: string) => (by.get(slug) as { names: string[] }).names
  assert.deepEqual(names('tanjung-uji'), ['Tanjung Uji', 'Kabupaten Tanjung Uji'])
  assert.deepEqual(names('bahasa-uji'), ['Bahasa Ujian'])
  assert.deepEqual(names('topik-uji'), [])
  assert.deepEqual((by.get('topik-uji') as { search: string[] }).search, ['Kesehatan Uji'], 'a topic can still be found in the picker')
  assert.deepEqual(names(w.mountain.id), ['Puncak Uji'])
})
