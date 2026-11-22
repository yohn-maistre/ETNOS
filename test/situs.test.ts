// P5: Situs, a lembaga's own website (docs/plan/one-page-system-2026-11-21.md §8). Every name here is a fixture.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Etnos } from '../src/store.ts'
import { Groups } from '../src/groups.ts'
import { Lembaga } from '../src/lembaga.ts'
import { Kios } from '../src/kios.ts'
import { Media } from '../src/media.ts'
import { Offerings } from '../src/offerings.ts'
import { Situs, validConfig, type SitusConfig } from '../src/situs.ts'
import { renderSitus } from '../src/situs-render.ts'
import { SITUS_CSS } from '../src/situs-style.ts'
import { dispatchSubdomain, type DispatchDeps } from '../src/situs-dispatch.ts'
import { FONTS, PALETTE, TEMPLATES } from '../src/situs-theme.ts'
import { RESERVED_LABELS } from '../packages/pds/src/host/handles.ts'
import { parse } from '../src/yaml.ts'
import { check } from '../src/schema-check.ts'
import { api } from '../src/api.ts'
import situsSchema from '../schemas/situs.schema.json' with { type: 'json' }
import lembagaSchema from '../schemas/lembaga.schema.json' with { type: 'json' }
import { image } from './media-fixture.ts'

function world() {
  let now = Date.parse('2026-11-22T00:00:00Z')
  const s = new Etnos(':memory:', 'https://situs.example', () => (now += 1000))
  const admin = s.provision('did:web:admin.example', 'Operator fixture'),
    steward = s.provision('did:web:steward.example', 'Steward fixture'),
    member = s.provision('did:web:member.example', 'Member fixture'),
    visitor = s.provision('did:web:visitor.example', 'Visitor fixture')
  const groups = new Groups(s, { stewardDid: admin.actor.did }),
    lembaga = new Lembaga(s, groups),
    kios = new Kios(s, groups),
    situs = new Situs(s, groups, lembaga, kios),
    media = new Media(s)
  const g = groups.create(steward.actor.id, 'Sanggar Fixture', 'Sanggar tari (fixture).', 'institution', 'public')
  groups.setMember(steward.actor.id, g.id, member.actor.id, true, 'member')
  const room = (title: string, visibility: 'public' | 'listed-private' | 'hidden-private') => {
    const c = groups.createSpace(steward.actor.id, g.id, { title, description: title + ' (fixture)', visibility })
    s.setMember(steward.actor.id, c.id, member.actor.id, true)
    return c
  }
  const open = room('Ruang terbuka fixture', 'public'),
    listed = room('Ruang anggota fixture', 'listed-private'),
    hidden = room('Ruang rahasia fixture', 'hidden-private')
  const post = (actor: string, communityId: string, text: string, opts: { title?: string; photo?: boolean; warning?: string } = {}) => {
    const photo = opts.photo ? media.upload(actor, communityId, image, 'Foto ' + text) : null
    const content = { ...(opts.title ? { title: opts.title } : {}), ...(opts.warning ? { warning: opts.warning } : {}) }
    const p = s.createPost(actor, communityId, text, undefined, undefined, { content, mediaIds: photo ? [photo.id] : [] })
    return { post: p, photo: photo?.id ?? null }
  }
  const handler = api(s, { stewardDid: admin.actor.did })
  const call = async (token: string | null, path: string, body?: unknown) => {
    const r = await handler(new Request(s.base + path, body === undefined ? { headers: token ? { authorization: 'Bearer ' + token } : {} } : { method: 'POST', headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json' }, body: JSON.stringify(body) }))
    const text = await r.text()
    let json: any = null
    try { json = JSON.parse(text) } catch { /* HTML */ }
    return { status: r.status, body: json, text, type: r.headers.get('content-type') ?? '' }
  }
  return { s, admin, steward, member, visitor, groups, lembaga, kios, situs, g, open, listed, hidden, post, call, media }
}
const config = (images: string[] = []): SitusConfig => ({
  version: 1,
  template: 'editorial',
  theme: { primary: 'hutan', accent: 'kunyit', fonts: 'newsreader' },
  navigation: [{ block: 'tentang', label: 'Tentang' }, { block: 'kegiatan', label: 'Kegiatan' }],
  blocks: [
    { id: 'pembuka', type: 'hero', image: 'cover' },
    { id: 'tentang', type: 'tentang' },
    { id: 'kegiatan', type: 'kegiatan', limit: 12 },
    { id: 'galeri', type: 'galeri', images },
    { id: 'komunitas', type: 'komunitas' },
    { id: 'kontak', type: 'kontak' },
  ],
})

test('the theme lists and the situs.yaml schema name the same choices', () => {
  const defs = situsSchema.$defs as Record<string, { enum?: string[] }>
  assert.deepEqual(defs.colour.enum, PALETTE.map((p) => p.id))
  assert.deepEqual(situsSchema.properties.template.enum, TEMPLATES.map((t) => t.id))
  assert.deepEqual(situsSchema.properties.theme.properties.fonts.enum, FONTS.map((f) => f.id))
  for (const f of FONTS) assert.match(SITUS_CSS, new RegExp('\\.f-' + f.id + '\\{'))
  for (const p of PALETTE) assert.match(SITUS_CSS, new RegExp('\\.p-' + p.id + '\\{'))
})

test('only stewards of a public lembaga edit its Situs, and no block carries HTML or script', async () => {
  const w = world()
  try {
    assert.equal((await w.call(w.visitor.token, '/v1/groups/' + w.g.id + '/situs', { name: 'sanggar-fixture' })).status, 403)
    assert.equal((await w.call(w.member.token, '/v1/groups/' + w.g.id + '/situs', { name: 'sanggar-fixture' })).status, 403, 'a member is not a steward')
    assert.equal((await w.call(null, '/v1/groups/' + w.g.id + '/situs/state')).status, 401)
    const saved = await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs', { name: 'sanggar-fixture', config: config() })
    assert.equal(saved.status, 200)
    assert.equal(saved.body.name, 'sanggar-fixture')
    assert.equal(saved.body.active, false)
    const bad = { ...config(), blocks: [{ id: 'x', type: 'tentang', html: '<script>alert(1)</script>' }] }
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs', { config: bad })).status, 400)
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs', { config: { ...config(), theme: { primary: '#ff00ff', accent: 'kunyit', fonts: 'geist' } } })).status, 400, 'colours come from the palette only')
    assert.throws(() => validConfig({ ...config(), navigation: [{ block: 'nowhere', label: 'X' }] }), /Navigasi/)
    assert.throws(() => validConfig({ ...config(), blocks: [{ id: 'a', type: 'hero' }, { id: 'b', type: 'hero' }] }), /satu blok pembuka/)
    // A hidden-private lembaga has no Situs.
    const secret = w.groups.create(w.steward.actor.id, 'Lembaga tertutup fixture', 'x', 'institution', 'hidden-private')
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + secret.id + '/situs', { name: 'tertutup-fixture' })).status, 400)
    assert.equal((await w.call(w.visitor.token, '/v1/groups/' + secret.id + '/situs')).status, 404)
  } finally {
    w.s.close()
  }
})

test('address names follow the handle rules and the one shared reserved list', () => {
  const w = world()
  try {
    for (const name of ['situs', 'www', 'pds', 'api', 'aksara', 'wiki', 'kios', 'admin']) {
      assert.ok(RESERVED_LABELS.has(name), name)
      assert.throws(() => w.situs.save(w.steward.actor.id, w.g.id, { name }), /dipakai oleh sistem/, name)
    }
    for (const name of ['ab', '-abc', 'abc-', 'a.b', 'a--b', 'Sanggar Fixture', 'x'.repeat(21)]) assert.throws(() => w.situs.save(w.steward.actor.id, w.g.id, { name }), /Nama/, name)
    w.situs.save(w.steward.actor.id, w.g.id, { name: 'Sanggar-Fixture' })
    assert.equal(w.situs.state(w.steward.actor.id, w.g.id).name, 'sanggar-fixture', 'lowercased like a handle')
    const other = w.groups.create(w.steward.actor.id, 'Yayasan Fixture', 'x', 'institution', 'public')
    assert.throws(() => w.situs.save(w.steward.actor.id, other.id, { name: 'sanggar-fixture' }), /sudah dipakai/)
    assert.equal(w.situs.state(w.steward.actor.id, other.id).suggestedName, 'yayasan-fixture')
  } finally {
    w.s.close()
  }
})

test('only the operator switches situs_aktif; without it stewards draft and preview but cannot publish', async () => {
  const w = world()
  try {
    w.post(w.steward.actor.id, w.open.id, 'Latihan tari sore ini (fixture).')
    await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs', { name: 'sanggar-fixture', config: config() })
    const refused = await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs/publish', {})
    assert.equal(refused.status, 403)
    assert.match(refused.body.error, /belum diaktifkan/)
    const preview = await w.call(w.steward.token, '/v1/situs/sanggar-fixture/page?versi=draf')
    assert.equal(preview.status, 200)
    assert.match(preview.type, /text\/html/)
    assert.match(preview.text, /Pratinjau draf/)
    assert.equal((await w.call(w.visitor.token, '/v1/situs/sanggar-fixture/page?versi=draf')).status, 404, 'the draft is for stewards only')
    assert.equal((await w.call(null, '/v1/situs/sanggar-fixture/page')).status, 404, 'nothing published yet')
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs/active', { active: true })).status, 403, 'a steward cannot activate')
    assert.equal((await w.call(w.visitor.token, '/v1/groups/' + w.g.id + '/situs/active', { active: true })).status, 403)
    const on = await w.call(w.admin.token, '/v1/groups/' + w.g.id + '/situs/active', { active: true })
    assert.equal(on.status, 200)
    assert.equal(on.body.active, true)
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs', { name: 'nama-baru' })).status, 409, 'the name is fixed once active')
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs/publish', {})).status, 200)
    // Turning activation off stops new publishing but keeps the published page.
    await w.call(w.admin.token, '/v1/groups/' + w.g.id + '/situs/active', { active: false })
    assert.equal((await w.call(null, '/v1/situs/sanggar-fixture/page')).status, 200)
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs/publish', {})).status, 403)
  } finally {
    w.s.close()
  }
})

test('publish makes a new version each time; unpublish takes the page down; an old version comes back as the draft', async () => {
  const w = world()
  try {
    w.post(w.steward.actor.id, w.open.id, 'Pentas pertama (fixture).')
    w.situs.save(w.steward.actor.id, w.g.id, { name: 'sanggar-fixture', config: config() })
    w.situs.setActive(w.admin.actor.id, w.g.id, true)
    assert.equal(w.situs.publish(w.steward.actor.id, w.g.id).published, 1)
    w.situs.save(w.steward.actor.id, w.g.id, { config: { ...config(), template: 'lembaga' } })
    const draftPage = await w.call(w.steward.token, '/v1/situs/sanggar-fixture/page?versi=draf')
    assert.match(draftPage.text, /class="t-lembaga/)
    assert.match((await w.call(null, '/v1/situs/sanggar-fixture/page')).text, /class="t-editorial/, 'readers see the published version, not the draft')
    const second = w.situs.publish(w.steward.actor.id, w.g.id)
    assert.equal(second.published, 2)
    assert.deepEqual(second.versions.map((v: { version: number }) => v.version), [2, 1])
    assert.match((await w.call(null, '/v1/situs/sanggar-fixture/page')).text, /class="t-lembaga/)
    w.situs.restore(w.steward.actor.id, w.g.id, 1)
    assert.equal(w.situs.state(w.steward.actor.id, w.g.id).draft.template, 'editorial')
    assert.equal((await w.call(w.visitor.token, '/v1/groups/' + w.g.id + '/situs/unpublish', {})).status, 403)
    assert.equal((await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs/unpublish', {})).status, 200)
    assert.equal((await w.call(null, '/v1/situs/sanggar-fixture/page')).status, 404)
    assert.deepEqual((await w.call(null, '/v1/situs/sanggar-fixture')).body, { groupId: w.g.id, published: false })
    // The operator may take a page down too.
    w.situs.publish(w.steward.actor.id, w.g.id)
    w.situs.unpublish(w.admin.actor.id, w.g.id)
    assert.equal((await w.call(null, '/v1/situs/sanggar-fixture/page')).status, 404)
  } finally {
    w.s.close()
  }
})

test('private community content never appears, checked at save, at publish and at every view', async () => {
  const w = world()
  try {
    const pub = w.post(w.member.actor.id, w.open.id, 'Kegiatan terbuka fixture. Semua boleh baca.', { photo: true })
    const members = w.post(w.member.actor.id, w.listed.id, 'Catatan anggota fixture.', { photo: true })
    const secret = w.post(w.member.actor.id, w.hidden.id, 'Rahasia fixture.', { photo: true })
    const warned = w.post(w.member.actor.id, w.open.id, 'Peringatan fixture.', { warning: 'Isi sensitif' })
    w.s.run("UPDATE communities SET admission='open' WHERE id=?", w.open.id)
    w.s.join(w.visitor.actor.id, w.open.id)
    w.post(w.visitor.actor.id, w.open.id, 'Tulisan orang luar fixture.')
    const before = w.situs.pictures(w.g.id).map((p) => p.id)
    assert.deepEqual(before, [pub.photo], 'only photos of public posts by members are offered')
    assert.throws(() => w.situs.save(w.steward.actor.id, w.g.id, { name: 'sanggar-fixture', config: config([`media:${members.photo}`]) }), /posting publik/)
    assert.throws(() => w.situs.save(w.steward.actor.id, w.g.id, { name: 'sanggar-fixture', config: config([`media:${secret.photo}`]) }), /posting publik/)
    assert.throws(() => w.situs.save(w.steward.actor.id, w.g.id, { cover: secret.photo }), /posting publik/)
    w.situs.save(w.steward.actor.id, w.g.id, { name: 'sanggar-fixture', config: config([`media:${pub.photo}`]), cover: pub.photo })
    w.situs.setActive(w.admin.actor.id, w.g.id, true)
    w.situs.publish(w.steward.actor.id, w.g.id)
    const html = (await w.call(null, '/v1/situs/sanggar-fixture/page')).text
    assert.match(html, /Kegiatan terbuka fixture/)
    assert.match(html, new RegExp('/v1/media/' + pub.photo))
    assert.match(html, /Ruang terbuka fixture/)
    for (const hiddenText of ['Catatan anggota fixture', 'Rahasia fixture', 'Ruang anggota fixture', 'Ruang rahasia fixture', 'Peringatan fixture', 'Tulisan orang luar fixture', members.photo!, secret.photo!])
      assert.ok(!html.includes(hiddenText), hiddenText)
    const stored = w.s.get<{ snapshot: string }>('SELECT snapshot FROM situs_versions WHERE group_id=?', w.g.id)!.snapshot
    for (const hiddenText of ['Catatan anggota', 'Rahasia', 'Ruang anggota', 'Ruang rahasia', members.photo!, secret.photo!]) assert.ok(!stored.includes(hiddenText), 'snapshot: ' + hiddenText)
    assert.ok(!stored.includes(warned.post.id))

    // After publishing: the post is hidden, so it drops out of the page and its photo with it, without a republish.
    w.s.hidePost(w.steward.actor.id, pub.post.id)
    const after = (await w.call(null, '/v1/situs/sanggar-fixture/page')).text
    assert.ok(!after.includes('Kegiatan terbuka fixture'))
    assert.ok(!after.includes(pub.photo!))
    // The open room turns private: its name leaves the page too.
    w.s.run("UPDATE communities SET visibility='listed-private' WHERE id=?", w.open.id)
    assert.ok(!(await w.call(null, '/v1/situs/sanggar-fixture/page')).text.includes('Ruang terbuka fixture'))
    // The lembaga turns hidden-private: the page is gone.
    w.s.run("UPDATE groups SET visibility='hidden-private' WHERE id=?", w.g.id)
    assert.equal((await w.call(null, '/v1/situs/sanggar-fixture/page')).status, 404)
    assert.equal((await w.call(null, '/v1/situs/sanggar-fixture')).status, 404)
  } finally {
    w.s.close()
  }
})

test('an edited post leaves the page until the next publish, and offers stay in the Kios block only', async () => {
  const w = world()
  try {
    const p = w.post(w.member.actor.id, w.open.id, 'Teks pertama fixture.')
    const o = new Offerings(w.s).create(w.member.actor.id, { communityId: w.open.id, text: 'Noken fixture.', content: { title: 'Noken fixture' }, kind: 'offer', price: 150000, unit: 'buah', requestKey: randomUUID() })
    w.kios.set(w.steward.actor.id, { kind: 'group', id: w.g.id }, { open: true, acceptRules: true, whatsapp: '081234567890' })
    w.situs.save(w.steward.actor.id, w.g.id, { name: 'sanggar-fixture', config: { ...config(), blocks: [...config().blocks, { id: 'kios', type: 'kios' }] } })
    w.situs.setActive(w.admin.actor.id, w.g.id, true)
    w.situs.publish(w.steward.actor.id, w.g.id)
    const html = (await w.call(null, '/v1/situs/sanggar-fixture/page')).text
    assert.match(html, /Teks pertama fixture/)
    assert.match(html, /Noken fixture/)
    assert.match(html, /Rp150\.000/)
    assert.match(html, /wa\.me\/6281234567890/)
    assert.equal(html.match(/Noken fixture/g)!.length, 1, 'the offer is not also an activity')
    w.s.run("UPDATE posts SET text='Teks kedua fixture.',revision=revision+1 WHERE id=?", p.post.id)
    const after = (await w.call(null, '/v1/situs/sanggar-fixture/page')).text
    assert.ok(!after.includes('Teks pertama fixture'))
    assert.ok(!after.includes('Teks kedua fixture'), 'the new text waits for a publish')
    w.s.run("UPDATE offerings SET status='withdrawn' WHERE post_id=?", o.id)
    assert.ok(!(await w.call(null, '/v1/situs/sanggar-fixture/page')).text.includes('Noken fixture'))
  } finally {
    w.s.close()
  }
})

test('the page escapes what the lembaga wrote and carries no script or inline style', async () => {
  const w = world()
  try {
    w.s.run("UPDATE groups SET title=?,description=? WHERE id=?", 'Sanggar <script>alert(1)</script> fixture', '"><img src=x onerror=alert(1)>', w.g.id)
    w.lembaga.setProfile(w.steward.actor.id, w.g.id, { about: 'Paragraf satu <b>tebal</b>.\n\nParagraf dua.', contacts: [{ label: 'Surel', value: 'halo@sanggar.example' }, { label: 'Telepon', value: '+62 812 3456 7890' }, { label: 'Catatan', value: 'javascript:alert(1)' }], website: 'https://sanggar.example' })
    w.situs.save(w.steward.actor.id, w.g.id, { name: 'sanggar-fixture', config: config() })
    const page = w.situs.page('sanggar-fixture', { draft: true, actorId: w.steward.actor.id })
    const html = renderSitus(page, { origin: 'https://situs.example', canonical: 'https://situs.example/situs/sanggar-fixture', siteName: 'ETNOS', styleVersion: 'x' })
    assert.ok(!/<script/i.test(html))
    assert.ok(!/<[^>]*\son[a-z]+=/i.test(html.replace(/"[^"]*"/g, '""')), 'no event handler attributes')
    assert.ok(!/ style=/i.test(html), 'no inline styles, so the CSP needs no unsafe-inline')
    assert.ok(!html.includes('href="javascript:'))
    assert.match(html, /Sanggar &lt;script&gt;alert\(1\)&lt;\/script&gt; fixture/)
    assert.match(html, /&lt;b&gt;tebal&lt;\/b&gt;/)
    assert.match(html, /href="mailto:halo@sanggar\.example"/)
    assert.match(html, /href="tel:\+6281234567890"/)
    assert.match(html, /Bagian dari ETNOS/)
    assert.match(html, /href="https:\/\/situs\.example\/groups\//, 'the link back to the lembaga page')
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/, 'a draft is never indexed')
  } finally {
    w.s.close()
  }
})

test('export gives situs.yaml and lembaga.yaml that read back and match their schemas', async () => {
  const w = world()
  try {
    const pub = w.post(w.member.actor.id, w.open.id, 'Foto pentas (fixture).', { photo: true })
    w.lembaga.setProfile(w.steward.actor.id, w.g.id, { about: 'Tentang sanggar fixture.', contacts: [{ label: 'Surel', value: 'halo@sanggar.example' }, { label: 'Instagram', value: 'https://instagram.example/sanggar' }, { label: 'Kantor', value: 'Jalan Fixture 1' }], website: 'https://sanggar.example' })
    w.situs.save(w.steward.actor.id, w.g.id, { name: 'sanggar-fixture', config: config([`media:${pub.photo}`]), cover: pub.photo, communities: [w.open.id] })
    assert.equal((await w.call(w.visitor.token, '/v1/groups/' + w.g.id + '/situs/export')).status, 403)
    const files = (await w.call(w.steward.token, '/v1/groups/' + w.g.id + '/situs/export')).body
    const situs = parse(files.situs) as Record<string, unknown>,
      lembaga = parse(files.lembaga) as Record<string, any>
    assert.deepEqual(check(situsSchema, situs), [])
    assert.deepEqual(check(lembagaSchema, lembaga), [])
    assert.equal(situs.name, 'sanggar-fixture')
    assert.equal(lembaga.name, 'Sanggar Fixture')
    assert.deepEqual(lembaga.contacts.email, ['halo@sanggar.example'])
    assert.deepEqual(lembaga.contacts.links.map((l: { url: string }) => l.url), ['https://sanggar.example/', 'https://instagram.example/sanggar'])
    assert.deepEqual(lembaga.contacts.other, [{ label: 'Kantor', value: 'Jalan Fixture 1' }])
    assert.equal(lembaga.cover.ref, 'media:' + pub.photo)
    assert.equal(lembaga.cover.url, 'https://situs.example/v1/media/' + pub.photo)
    assert.deepEqual(lembaga.communities, [w.open.id])
    assert.ok(!files.lembaga.includes(w.hidden.id) && !files.lembaga.includes('Ruang rahasia'))
  } finally {
    w.s.close()
  }
})

test('the subdomain dispatcher is off by default, passes the DID file to the identity host and 404s reserved names', async () => {
  const calls: string[] = []
  const deps = (over: Partial<DispatchDeps> = {}): DispatchDeps => ({
    enabled: true,
    zone: 'etnos.space',
    origin: 'https://etnos.space',
    identity: async (r) => { calls.push('identity ' + new URL(r.url).host); return new Response('did:plc:fixture') },
    page: async (name) => { calls.push('page ' + name); return name === 'sanggar-fixture' ? new Response('<html>situs</html>') : null },
    lembaga: async (name) => { calls.push('lembaga ' + name); return name === 'yayasan-fixture' ? 'group-fixture' : null },
    css: () => new Response('css'),
    asset: async (p) => new Response('font ' + p),
    image: async (p) => new Response('image ' + p),
    ...over,
  })
  const go = (url: string, over?: Partial<DispatchDeps>, init?: RequestInit) => dispatchSubdomain(new Request(url, init), deps(over))
  assert.equal(await go('https://sanggar-fixture.etnos.space/', { enabled: false }), null, 'off: the caller handles the host as before')
  assert.equal(await go('https://etnos.space/'), null, 'the main host is not a subdomain')
  assert.equal(await go('https://other.example/'), null)

  calls.length = 0
  const did = (await go('https://someone.etnos.space/.well-known/atproto-did'))!
  assert.equal(await did.text(), 'did:plc:fixture')
  assert.deepEqual(calls, ['identity someone.etnos.space'], 'the DID file goes to the identity host and nothing else runs')
  assert.equal((await go('https://someone.etnos.space/.well-known/atproto-did', { identity: undefined }))!.status, 404)

  for (const name of ['pds', 'api', 'situs', 'aksara', 'admin']) assert.equal((await go(`https://${name}.etnos.space/`))!.status, 404, name)
  const www = (await go('https://www.etnos.space/wiki?q=1'))!
  assert.equal(www.status, 301)
  assert.equal(www.headers.get('location'), 'https://etnos.space/wiki?q=1')
  assert.equal((await go('https://a.b.etnos.space/'))!.status, 404, 'only first-level names')
  assert.equal((await go('https://x.etnos.space/'))!.status, 404, 'too short to be a name')

  assert.equal(await (await go('https://sanggar-fixture.etnos.space/'))!.text(), '<html>situs</html>')
  const fallback = (await go('https://yayasan-fixture.etnos.space/'))!
  assert.equal(fallback.status, 302)
  assert.equal(fallback.headers.get('location'), 'https://etnos.space/groups/group-fixture')
  assert.equal((await go('https://nobody-fixture.etnos.space/'))!.status, 404)
  assert.equal((await go('https://sanggar-fixture.etnos.space/v1/me'))!.status, 404, 'the API is not reachable there')
  assert.equal((await go('https://sanggar-fixture.etnos.space/situs/other'))!.status, 404)
  assert.equal((await go('https://sanggar-fixture.etnos.space/', undefined, { method: 'POST', body: 'x' }))!.status, 405)
  assert.equal(await (await go('https://sanggar-fixture.etnos.space/situs/_/situs.css'))!.text(), 'css')
  assert.equal(await (await go('https://sanggar-fixture.etnos.space/fonts/situs/geist.woff2'))!.text(), 'font /fonts/situs/geist.woff2')
  const id = randomUUID()
  assert.equal(await (await go('https://sanggar-fixture.etnos.space/v1/media/' + id))!.text(), 'image /v1/media/' + id)
})

test('a published page on a subdomain names that host as its canonical address', async () => {
  const w = world()
  try {
    w.situs.save(w.steward.actor.id, w.g.id, { name: 'sanggar-fixture', config: config() })
    w.situs.setActive(w.admin.actor.id, w.g.id, true)
    w.situs.publish(w.steward.actor.id, w.g.id)
    assert.match((await w.call(null, '/v1/situs/sanggar-fixture/page')).text, /rel="canonical" href="https:\/\/situs\.example\/situs\/sanggar-fixture"/)
    assert.match((await w.call(null, '/v1/situs/sanggar-fixture/page?alamat=sub')).text, /rel="canonical" href="https:\/\/sanggar-fixture\.situs\.example\/"/)
  } finally {
    w.s.close()
  }
})
