// P3: Lembaga, komunitas dan Kios (docs/plan/one-page-system-2026-11-21.md §5 to §7). Every name here is a fixture.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Etnos, LocalDatabase } from '../src/store.ts'
import { Groups } from '../src/groups.ts'
import { Founding } from '../src/founding.ts'
import { Kamus } from '../src/kamus.ts'
import { kamusLexicon } from '../src/kamus-data.ts'
import { Offerings } from '../src/offerings.ts'
import { Lembaga } from '../src/lembaga.ts'
import { Kios } from '../src/kios.ts'
import { activeRules, brokenRule, phrasePattern } from '../src/kios-rules.ts'
import { migrations, migrate, schemaVersion } from '../src/schema.ts'
import { api } from '../src/api.ts'

function world() {
  const s = new Etnos(':memory:', 'https://lembaga.example', () => Date.parse('2026-11-21T00:00:00Z'))
  const admin = s.provision('did:web:admin.example', 'Operator fixture'),
    steward = s.provision('did:web:steward.example', 'Steward fixture'),
    other = s.provision('did:web:other.example', 'Other steward fixture'),
    visitor = s.provision('did:web:visitor.example', 'Visitor fixture')
  const groups = new Groups(s, { stewardDid: admin.actor.did })
  const ctx = (slug: string, title: string, kind: 'place' | 'region' | 'topic' | 'language', facet = '', aliases: string[] = []) =>
    groups.createContext(admin.actor.id, { slug, title, kind, facet, description: 'Fixture', language: 'id', aliases })
  const region = ctx('wilayah-fixture', 'Wilayah Fixture', 'region', 'customary-region'),
    town = ctx('kota-fixture', 'Kota Fixture', 'place', 'regency'),
    mee = ctx('bahasa-ekari', 'Ekari', 'language', '', ['glottocode:ekar1243']),
    malay = ctx('bahasa-papuan-malay', 'Papuan Malay', 'language', '', ['glottocode:papu1250']),
    kopi = ctx('kopi-fixture', 'Kopi', 'topic'),
    root = ctx('lembaga', 'Lembaga', 'topic', 'institution-kind'),
    adat = ctx('dewan-adat', 'Adat', 'topic', 'institution-kind')
  groups.linkContext(admin.actor.id, town.id, region.id)
  groups.linkContext(admin.actor.id, adat.id, root.id)
  const handler = api(s, { stewardDid: admin.actor.did })
  const call = async (token: string | null, path: string, body?: unknown) => {
    const r = await handler(new Request(s.base + path, body === undefined ? { headers: token ? { authorization: 'Bearer ' + token } : {} } : { method: 'POST', headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json' }, body: JSON.stringify(body) }))
    return { status: r.status, body: (await r.json().catch(() => null)) as any }
  }
  const kamus = new Kamus(s, kamusLexicon(), { operator: (id) => id === admin.actor.id })
  return { s, admin, steward, other, visitor, groups, region, town, mee, malay, kopi, adat, handler, call, kamus, founding: new Founding(s), lembaga: new Lembaga(s, groups), kios: new Kios(s, groups) }
}

test('existing language labels migrate to "bahasa yang dipakai" and keep their Kamus; other labels stay topics', () => {
  const db = new LocalDatabase()
  try {
    db.exec('CREATE TABLE strata_migrations(version INTEGER PRIMARY KEY)')
    for (let i = 0; i < migrations.findIndex((m) => m.includes('ADD COLUMN role')); i++) { db.exec(migrations[i]); db.run('INSERT INTO strata_migrations VALUES(?)', i + 1) }
    db.run("INSERT INTO actors(id,did,name,kind) VALUES('a','did:web:a.example','Fixture','human')")
    db.run("INSERT INTO communities(id,title,description,visibility) VALUES('c','Fixture','Fixture','public')")
    db.run(`INSERT INTO contexts(id,slug,title,kind,description,language,aliases,created,active) VALUES('lang','bahasa-ekari','Ekari','language','x','id','["glottocode:ekar1243"]',0,1),('topic','kopi','Kopi','topic','x','id','[]',0,1)`)
    db.run("INSERT INTO community_contexts VALUES('c','lang','a',1),('c','topic','a',2)")
    migrate(db)
    assert.equal(db.get<{ n: number }>('SELECT MAX(version) n FROM strata_migrations')!.n, schemaVersion)
    assert.deepEqual(db.all<{ context_id: string; role: string }>('SELECT context_id,role FROM community_contexts ORDER BY context_id').map((r) => [r.context_id, r.role]), [['lang', 'language'], ['topic', 'about']])
    assert.throws(() => db.run("UPDATE community_contexts SET role='other'"), /CHECK/)
    migrate(db) // a second run changes nothing
    assert.equal(db.all('SELECT 1 FROM community_contexts').length, 2)
  } finally {
    db.close()
  }
})

test('creation takes Tentang apa, Bahasa yang dipakai and Dikelola oleh in one step; a non-Indonesian language switches the Kamus on', () => {
  const w = world()
  try {
    const g = w.groups.create(w.steward.actor.id, 'Lembaga fixture', 'Fixture', 'institution', 'public')
    const c = w.founding.found(w.steward.actor.id, { title: 'Petani kopi fixture', description: 'Fixture', visibility: 'public', about: [w.kopi.id, w.town.id], languages: [w.mee.id, w.malay.id], groupId: g.id }, w.groups)
    assert.deepEqual(w.groups.communityContexts(c.id), [], 'still forming: stored hidden, so nothing shows yet')
    assert.deepEqual(w.s.all<{ role: string }>('SELECT role FROM community_contexts WHERE community_id=? ORDER BY role', c.id).map((r) => r.role), ['about', 'about', 'language', 'language'])
    assert.equal(w.kamus.settings(c.id).language, 'ekar1243', 'Mee switches it on; Papuan Malay never does')
    assert.equal(w.groups.communityGroup(undefined, c.id)?.id, g.id)
    assert.equal(w.groups.read(undefined, g.id).hiddenSpaces, 0, 'a forming community is not counted')

    const malayOnly = w.founding.found(w.steward.actor.id, { title: 'Obrolan fixture', description: 'Fixture', visibility: 'public', languages: [w.malay.id] }, w.groups)
    assert.equal(w.kamus.settings(malayOnly.id).language, '')
    const aboutMee = w.s.createCommunity(w.steward.actor.id, 'Belajar Mee fixture', 'Fixture', 'public')
    w.groups.labelCommunity(w.steward.actor.id, aboutMee.id, w.mee.id, false, 'about')
    assert.equal(w.kamus.settings(aboutMee.id).language, '', 'a community about a language does not get a Kamus from that')
    w.groups.labelCommunity(w.steward.actor.id, aboutMee.id, w.mee.id, false, 'language')
    assert.equal(w.kamus.settings(aboutMee.id).language, 'ekar1243', 'stewards switch it later in the settings')
    assert.throws(() => w.groups.labelCommunity(w.steward.actor.id, aboutMee.id, w.kopi.id, false, 'language'), /Only a language/)
  } finally {
    w.s.close()
  }
})

test('a hidden community takes no labels at creation, and only a steward of the lembaga may put a community under it', () => {
  const w = world()
  try {
    const before = w.s.all('SELECT 1 FROM communities').length
    assert.throws(() => w.founding.found(w.steward.actor.id, { title: 'Rahasia fixture', description: 'x', visibility: 'hidden-private', languages: [w.mee.id] }, w.groups), /Hidden communities/)
    const g = w.groups.create(w.other.actor.id, 'Lembaga lain fixture', 'Fixture', 'institution', 'public')
    assert.throws(() => w.founding.found(w.steward.actor.id, { title: 'Bukan milik fixture', description: 'x', visibility: 'public', groupId: g.id }, w.groups), /steward required/)
    assert.equal(w.s.all('SELECT 1 FROM communities').length, before, 'a refused creation leaves nothing behind')
  } finally {
    w.s.close()
  }
})

test('the creation route and the community page carry the three fields', async () => {
  const w = world()
  try {
    const g = (await w.call(w.steward.token, '/v1/groups', { title: 'Lembaga fixture', description: 'Fixture', kind: 'institution', visibility: 'public' })).body
    const made = await w.call(w.steward.token, '/v1/communities', { title: 'Kopi fixture', description: 'x', visibility: 'public', admission: 'open', forming: true, about: [w.kopi.id], languages: [w.mee.id], groupId: g.id })
    assert.equal(made.status, 200)
    const mine = await w.call(w.steward.token, '/v1/my-lembaga')
    assert.deepEqual(mine.body.map((x: { id: string }) => x.id), [g.id])
    // The second person opens it; the labels and the lembaga then show to everyone.
    const link = made.body.token
    await w.call(w.visitor.token, '/v1/founding/accept', { token: link })
    const page = (await w.call(null, '/v1/communities/' + made.body.id)).body
    assert.deepEqual(page.contexts.map((c: { slug: string; role: string }) => [c.slug, c.role]), [['kopi-fixture', 'about'], ['bahasa-ekari', 'language']])
    assert.equal(page.group.id, g.id)
    assert.equal((await w.call(w.visitor.token, '/v1/communities/' + made.body.id + '/group', { groupId: null })).status, 403)
    assert.equal((await w.call(w.steward.token, '/v1/communities/' + made.body.id + '/group', { groupId: null })).status, 200)
    assert.equal((await w.call(null, '/v1/communities/' + made.body.id)).body.group, null)
  } finally {
    w.s.close()
  }
})

test('a steward asks to claim; only the operator approves; an entry has at most one lembaga and a lembaga one entry', async () => {
  const w = world()
  try {
    const a = (await w.call(w.steward.token, '/v1/groups', { title: 'Dewan Adat Fixture', description: 'Fixture', kind: 'institution', visibility: 'public' })).body
    const b = (await w.call(w.other.token, '/v1/groups', { title: 'Lembaga Saingan Fixture', description: 'Fixture', kind: 'institution', visibility: 'public' })).body
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + a.id + '/jenis', { contextId: w.adat.id })).status, 200)
    assert.equal((await w.call(w.visitor.token, '/v1/groups/' + a.id + '/claims', { listing: { title: 'Dewan Adat Fixture', description: 'Fixture' } })).status, 403)
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + a.id + '/claims', { entry: 'kota-fixture' })).status, 400, 'a place is not a lembaga entry')
    const asked = await w.call(w.steward.token, '/v1/groups/' + a.id + '/claims', { listing: { title: 'Dewan Adat Fixture', description: 'Lembaga adat fixture.', placeId: w.town.id } })
    assert.equal(asked.status, 200)
    assert.equal(asked.body.state, 'pending')
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + a.id + '/claims', { listing: { title: 'Lagi', description: 'x' } })).status, 409, 'one request waits at a time')
    assert.equal((await w.call(w.steward.token, '/v1/entry-claims/' + asked.body.id + '/decide', { approve: true })).status, 403, 'a steward cannot approve')
    assert.equal((await w.call(w.steward.token, '/v1/entry-claims')).status, 403)
    assert.equal((await w.call(w.admin.token, '/v1/entry-claims')).body.length, 1)
    const ok = await w.call(w.admin.token, '/v1/entry-claims/' + asked.body.id + '/decide', { approve: true })
    assert.equal(ok.status, 200)
    const slug = ok.body.entry
    assert.equal(slug, 'lembaga-dewan-adat-fixture')

    const entry = (await w.call(null, '/v1/entri/' + slug)).body
    assert.equal(entry.kind, 'lembaga')
    assert.deepEqual(entry.managedBy, { id: a.id, title: 'Dewan Adat Fixture' })
    assert.equal(entry.sub.label, 'Adat')
    assert.equal(entry.place.slug, 'kota-fixture', 'the listing sits in its place')
    assert.equal((await w.call(null, '/v1/groups/' + a.id)).body.entry, slug)

    // A second lembaga cannot take the same entry, at request or at approval.
    assert.equal((await w.call(w.other.token, '/v1/groups/' + b.id + '/claims', { entry: slug })).status, 409)
    const id = randomUUID()
    w.s.run("INSERT INTO entry_claims(id,group_id,entry_slug,state,requested_by,created) VALUES(?,?,?,'pending',?,1)", id, b.id, slug, w.other.actor.id)
    assert.equal((await w.call(w.admin.token, '/v1/entry-claims/' + id + '/decide', { approve: true })).status, 409)
    assert.throws(() => w.s.run("UPDATE entry_claims SET state='approved' WHERE id=?", id), /UNIQUE/)
    // Nor can the first lembaga claim a second entry.
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + a.id + '/claims', { listing: { title: 'Kedua', description: 'x' } })).status, 409)

    // A lembaga that turns hidden stops being named on the entry.
    w.s.run("UPDATE groups SET visibility='hidden-private' WHERE id=?", a.id)
    assert.equal((await w.call(null, '/v1/entri/' + slug)).body.managedBy, null)
    w.s.run("UPDATE groups SET visibility='public' WHERE id=?", a.id)
    // Releasing frees the entry for another lembaga.
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + a.id + '/claims/release', {})).status, 200)
    assert.equal((await w.call(null, '/v1/entri/' + slug)).body.managedBy, null)
    w.s.run("UPDATE entry_claims SET state='declined' WHERE id=?", id)
    const again = await w.call(w.other.token, '/v1/groups/' + b.id + '/claims', { entry: slug })
    assert.equal((await w.call(w.admin.token, '/v1/entry-claims/' + again.body.id + '/decide', { approve: true })).body.state, 'approved')
  } finally {
    w.s.close()
  }
})

test('a hidden lembaga cannot claim, and its own part never reaches the public', async () => {
  const w = world()
  try {
    const h = (await w.call(w.steward.token, '/v1/groups', { title: 'Tersembunyi fixture', description: 'x', kind: 'collective', visibility: 'hidden-private' })).body
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + h.id + '/claims', { listing: { title: 'X fixture', description: 'x' } })).status, 400)
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + h.id + '/profile', { about: 'Rahasia fixture' })).status, 200)
    assert.equal((await w.call(null, '/v1/groups/' + h.id)).status, 404)
    assert.equal((await w.call(w.visitor.token, '/v1/groups/' + h.id)).status, 404)
    // A recognition is only stored with a source.
    const p = (await w.call(w.steward.token, '/v1/groups', { title: 'Publik fixture', description: 'x', kind: 'institution', visibility: 'public' })).body
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + p.id + '/profile', { recognition: [{ by: 'Dewan fixture' }] })).status, 400)
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + p.id + '/profile', { recognition: [{ by: 'Dewan fixture', source: 'https://example.org/surat' }], contacts: [{ label: 'Kantor', value: 'Jalan fixture' }] })).status, 200)
    assert.equal((await w.call(w.visitor.token, '/v1/groups/' + p.id + '/profile', { about: 'x' })).status, 403)
    const page = (await w.call(null, '/v1/groups/' + p.id)).body
    assert.equal(page.profile.recognition[0].source, 'https://example.org/surat')
    assert.equal(page.canManage, false)
  } finally {
    w.s.close()
  }
})

test('the hidden room count shows, or not at all if the lembaga chooses', async () => {
  const w = world()
  try {
    const g = w.groups.create(w.steward.actor.id, 'Lembaga fixture', 'x', 'institution', 'public')
    w.groups.createSpace(w.steward.actor.id, g.id, { title: 'Rahasia fixture', description: 'x', visibility: 'hidden-private' })
    assert.equal(w.groups.read(undefined, g.id).hiddenSpaces, 1)
    w.lembaga.setProfile(w.steward.actor.id, g.id, { hideCount: true })
    assert.equal(w.groups.read(undefined, g.id).hiddenSpaces, 0)
    assert.ok(!JSON.stringify((await w.call(null, '/v1/groups/' + g.id)).body).includes('Rahasia'))
  } finally {
    w.s.close()
  }
})

const offer = (communityId: string, patch: Record<string, unknown> = {}) => ({ communityId, text: 'Kopi bubuk fixture.', content: { title: 'Kopi fixture' }, kind: 'offer', price: 50000, unit: 'per bungkus', requestKey: randomUUID(), ...patch })

test('a Kios shows only open public offers, after its owner accepts the house rules', async () => {
  const w = world()
  try {
    const seller = w.steward
    const pub = w.s.createCommunity(seller.actor.id, 'Pasar fixture', 'x', 'public', false, 'open')
    const listed = w.s.createCommunity(seller.actor.id, 'Pasar anggota fixture', 'x', 'listed-private', false, 'approval')
    const hidden = w.s.createCommunity(seller.actor.id, 'Pasar rahasia fixture', 'x', 'hidden-private', false, 'invite')
    const o = new Offerings(w.s)
    const shown = o.create(seller.actor.id, offer(pub.id, { placeContextId: w.town.id }))
    o.create(seller.actor.id, offer(listed.id, { text: 'Rahasia anggota fixture', placeContextId: w.town.id }))
    o.create(seller.actor.id, offer(hidden.id, { text: 'Rahasia tersembunyi fixture', placeContextId: w.town.id }))
    o.create(seller.actor.id, offer(pub.id, { kind: 'request', text: 'Mencari fixture' }))

    assert.equal((await w.call(null, '/v1/kios/actor/' + seller.actor.id)).body.kios, null, 'closed: nothing for readers')
    assert.equal((await w.call(seller.token, '/v1/kios', { ownerKind: 'actor', ownerId: seller.actor.id, open: true })).status, 409, 'rules first')
    assert.equal((await w.call(w.visitor.token, '/v1/kios', { ownerKind: 'actor', ownerId: seller.actor.id, open: true, acceptRules: true })).status, 403)
    const opened = await w.call(seller.token, '/v1/kios', { ownerKind: 'actor', ownerId: seller.actor.id, open: true, acceptRules: true, whatsapp: '0812 3456 7890' })
    assert.equal(opened.status, 200)
    assert.equal(opened.body.kios.whatsapp, '6281234567890')

    for (const token of [null, w.visitor.token, seller.token]) {
      const k = (await w.call(token, '/v1/kios/actor/' + seller.actor.id)).body.kios
      assert.deepEqual(k.items.map((p: { id: string }) => p.id), [shown.id], 'public offers only, also for the seller')
      assert.ok(!JSON.stringify(k).includes('Rahasia'))
    }
    // "Kios di …": the place and every place above it, public only.
    for (const slug of ['kota-fixture', 'wilayah-fixture']) {
      const e = (await w.call(null, '/v1/entri/' + slug)).body
      assert.deepEqual(e.kios.map((x: { post: { id: string } }) => x.post.id), [shown.id], slug)
      assert.equal(e.kios[0].seller.id, seller.actor.id)
      assert.ok(!JSON.stringify(e).includes('Rahasia'))
    }
    // A closed Kios leaves the place too, and a visibility change is read at use time.
    await w.call(seller.token, '/v1/kios', { ownerKind: 'actor', ownerId: seller.actor.id, open: false })
    assert.deepEqual((await w.call(null, '/v1/entri/kota-fixture')).body.kios, [])
    await w.call(seller.token, '/v1/kios', { ownerKind: 'actor', ownerId: seller.actor.id, open: true })
    w.s.run("UPDATE communities SET visibility='listed-private' WHERE id=?", pub.id)
    assert.deepEqual((await w.call(null, '/v1/kios/actor/' + seller.actor.id)).body.kios.items, [])
    assert.deepEqual((await w.call(null, '/v1/entri/kota-fixture')).body.kios, [])
  } finally {
    w.s.close()
  }
})

test('a lembaga Kios lists its members\' offers in its public communities', async () => {
  const w = world()
  try {
    const g = w.groups.create(w.steward.actor.id, 'Koperasi fixture', 'x', 'institution', 'public')
    const room = w.groups.createSpace(w.steward.actor.id, g.id, { title: 'Pasar koperasi fixture', description: 'x', visibility: 'public' })
    w.s.run("UPDATE communities SET admission='open' WHERE id=?", room.id)
    w.s.join(w.visitor.actor.id, room.id)
    const o = new Offerings(w.s)
    const mine = o.create(w.steward.actor.id, offer(room.id, { placeContextId: w.town.id }))
    o.create(w.visitor.actor.id, offer(room.id, { text: 'Bukan anggota lembaga fixture' }))
    assert.equal((await w.call(w.visitor.token, '/v1/kios', { ownerKind: 'group', ownerId: g.id, open: true, acceptRules: true })).status, 403)
    await w.call(w.steward.token, '/v1/kios', { ownerKind: 'group', ownerId: g.id, open: true, acceptRules: true })
    const k = (await w.call(null, '/v1/kios/group/' + g.id)).body.kios
    assert.deepEqual(k.items.map((p: { id: string }) => p.id), [mine.id])
    const e = (await w.call(null, '/v1/entri/kota-fixture')).body
    assert.equal(e.kios[0].seller.kind, 'group')
    assert.equal(e.kios[0].seller.id, g.id)
  } finally {
    w.s.close()
  }
})

test('house rules: one list, a keyword check on offers and edits', () => {
  const R = activeRules()
  assert.deepEqual(R.map((r) => r.key), ['satwa', 'alkohol', 'tanah'])
  assert.equal(brokenRule(R, 'Noken hias bulu Cenderawasih')?.key, 'satwa')
  assert.equal(brokenRule(R, 'Sopi asli kampung')?.key, 'alkohol')
  assert.equal(brokenRule(R, 'Dijual tanah 20x30 dekat jalan')?.key, 'tanah')
  assert.equal(brokenRule(R, 'Kopi Moanemani', 'Noken anggrek', 'per ikat'), null)
  assert.equal(brokenRule(R, 'Pinang muda, sayur gedi, ubi'), null)
  // The phrase form keeps what the old patterns matched, on whole words only.
  for (const t of ['Whiskey impor', 'kavpling murah', 'sewa   lahan', 'lahan siap bangun', 'ada SHM'])
    assert.ok(brokenRule(R, t), t)
  for (const t of ['birokrasi kampung', 'nurani', 'tanah liat untuk gerabah']) assert.equal(brokenRule(R, t), null, t)
  assert.equal(phrasePattern('(jual'), null)
  assert.equal(phrasePattern('a.*'), null)
  const w = world()
  try {
    const room = w.s.createCommunity(w.steward.actor.id, 'Pasar fixture', 'x', 'public', false, 'open'),
      o = new Offerings(w.s)
    assert.throws(() => o.create(w.steward.actor.id, offer(room.id, { text: 'Bulu cenderawasih asli' })), (e: { status?: number }) => e.status === 422)
    assert.throws(() => o.create(w.steward.actor.id, offer(room.id, { content: { title: 'Miras' } })), (e: { status?: number }) => e.status === 422)
    assert.equal(w.s.all('SELECT 1 FROM offerings').length, 0)
  } finally {
    w.s.close()
  }
})
