import test from 'node:test'
import assert from 'node:assert/strict'
import { Etnos } from '../src/store.ts'
import { api } from '../src/api.ts'
import { SUKU, SUKU_SOURCE, withSuku, sukuDescription } from '../src/suku.ts'
import knowledgeSeed from '../src/catalogues/tanah-papua-knowledge-seed.json' with { type: 'json' }
import tanahPapua from '../src/catalogues/tanah-papua.json' with { type: 'json' }
import type { KnowledgeSeed } from '../src/knowledge-model.ts'

const seed = knowledgeSeed as KnowledgeSeed
const slugs = new Set((tanahPapua.entries as { slug: string }[]).map((e) => e.slug))

test('the peoples seed holds names, places and links from the Wikipedia list only', () => {
  assert.ok(SUKU.size > 250)
  assert.equal(SUKU_SOURCE.title, 'Daftar suku bangsa di Papua')
  assert.match(SUKU_SOURCE.revision, /^\d+$/)
  for (const p of SUKU.values()) {
    assert.match(p.title, /^Suku /)
    for (const s of [...p.provinces, ...p.regencies]) assert.ok(slugs.has(s), p.title + ' ' + s)
    assert.ok(p.provinces.length, 'every people is listed under a province of Tanah Papua')
    if (p.wikipedia) assert.match(p.wikipedia.url, /^https:\/\/id\.wikipedia\.org\/wiki\//)
    if (p.language) assert.ok(slugs.has(p.language.slug))
    // Only the stub sentence that ETNOS writes; no text from the articles.
    assert.match(sukuDescription(p), /^Tercantum dalam Daftar suku bangsa di Papua di Wikipedia bahasa Indonesia, di bawah /)
  }
  // The Papua Nugini section of the list is left out.
  assert.ok(!SUKU.has('suku-huli') && !SUKU.has('suku-enga'))
  // The nine peoples already in the knowledge seed are marked and are not added twice.
  const existing = [...SUKU.values()].filter((p) => p.existing).map((p) => p.slug).sort()
  assert.deepEqual(existing, seed.entities.filter((e) => e.class === 'kelompok').map((e) => e.slug).sort())
  const merged = withSuku(seed)
  assert.equal(new Set(merged.entities.map((e) => e.slug)).size, merged.entities.length)
})

test('peoples show as suku entries before and after the seed import, and the import keeps a steward edit', async () => {
  const s = new Etnos(':memory:', 'https://suku.example')
  try {
    const steward = s.provision('did:web:steward.example', 'Node steward')
    const handle = api(s, { stewardDid: steward.actor.did, catalogue: 'tanah-papua' })
    const call = (path: string, init: RequestInit = {}) => handle(new Request('https://suku.example' + path, init))
    const post = (path: string) => call(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + steward.token }, body: '{}' })
    assert.equal((await post('/v1/contexts/catalogue')).status, 200)
    const count = async () => ((await (await call('/v1/entri')).json()) as { entries: { kind: string }[] }).entries.filter((e) => e.kind === 'suku').length
    const before = await count()
    assert.ok(before >= SUKU.size, 'peoples from the list are entries without an import')
    assert.equal((await post('/v1/knowledge-model/seed')).status, 200)
    assert.equal(await count(), before, 'importing adds no second entry')
    const stored = s.get<{ n: number }>("SELECT count(*) n FROM km_entities WHERE class='kelompok'")!.n
    assert.ok(stored >= SUKU.size)

    const sarmi = (await (await call('/v1/entri/suku-berik')).json()) as { kind: string; facts: { label: string; value: string; href?: string }[]; place: { slug: string } | null; article: unknown }
    assert.equal(sarmi.kind, 'suku')
    assert.equal(sarmi.article, null)
    assert.equal(sarmi.place?.slug, 'sarmi')
    assert.match(sarmi.facts.find((f) => f.label === 'Tercantum di')!.value, /Kabupaten Sarmi/)
    assert.equal(sarmi.facts.find((f) => f.label === 'Sumber')!.href, 'https://id.wikipedia.org/wiki/Suku_Berik')
    assert.equal(sarmi.facts.find((f) => f.label === 'Bahasa')!.href, '/wiki/bahasa-berik')
    const berik = (await (await call('/v1/entri/bahasa-berik')).json()) as { facts: { label: string; value: string; href?: string }[]; related: { slug: string }[] }
    assert.equal(berik.facts.find((f) => f.label === 'Suku')!.href, '/wiki/suku-berik')
    assert.ok(berik.related.some((r) => r.slug === 'suku-berik'))
    // A people whose article does not exist yet links to the list itself.
    const missing = [...SUKU.values()].find((p) => !p.wikipedia && !p.existing)!
    const stub = (await (await call('/v1/entri/' + missing.slug)).json()) as { facts: { label: string; href?: string }[] }
    assert.equal(stub.facts.find((f) => f.label === 'Sumber')!.href, SUKU_SOURCE.url)

    // A steward's edit survives a later import; a description that the seed shipped is replaced by a fix.
    s.run("UPDATE km_entities SET description='Ditulis steward (fixture).' WHERE slug='suku-berik'")
    const shipped = s.get<{ description: string }>("SELECT description FROM km_entities WHERE slug='suku-borai'")!.description
    const fixed = withSuku(seed)
    for (const e of fixed.entities) { if (e.slug === 'suku-berik' || e.slug === 'suku-borai') { e.previous = [shipped]; e.description = 'Perbaikan data (fixture).' } }
    const { KnowledgeModel } = await import('../src/knowledge-model.ts')
    const { Groups } = await import('../src/groups.ts')
    new KnowledgeModel(s, new Groups(s, { stewardDid: steward.actor.did })).importSeed(steward.actor.id, fixed)
    assert.equal(s.get<{ description: string }>("SELECT description FROM km_entities WHERE slug='suku-berik'")!.description, 'Ditulis steward (fixture).')
    assert.equal(s.get<{ description: string }>("SELECT description FROM km_entities WHERE slug='suku-borai'")!.description, 'Perbaikan data (fixture).')
  } finally { s.close() }
})
