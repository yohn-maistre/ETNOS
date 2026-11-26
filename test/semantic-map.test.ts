import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Etnos } from '../src/store.ts'
import { api } from '../src/api.ts'
import { kamusLexicon } from '../src/kamus-data.ts'
import { SemanticMap, pca2d, pca3d } from '../src/semantic-map.ts'

test('SemanticMap extracts real Papuan colexifications, runs deterministic fallback, and honors privacy isolation', async () => {
  const s = new Etnos(':memory:', 'https://etnos.example')
  try {
    const owner = s.provision('did:plc:semowner2345672345672345', 'Pengurus')
    const pub = s.createCommunity(owner.actor.id, 'Bahasa Sentani', 'Kamus terbuka', 'public')
    const priv = s.createCommunity(owner.actor.id, 'Kamus Adat Rahasia', 'Privat', 'hidden-private')

    const now = s.clock()
    // Configure language codes via kamus_settings
    s.run(
      'INSERT OR REPLACE INTO kamus_settings(community_id, language, updated, updated_by) VALUES(?, ?, ?, ?)',
      pub.id,
      'sent1261',
      now,
      owner.actor.id,
    )
    s.run(
      'INSERT OR REPLACE INTO kamus_settings(community_id, language, updated, updated_by) VALUES(?, ?, ?, ?)',
      priv.id,
      'dani1287',
      now,
      owner.actor.id,
    )
    // Public non-sensitive colexification: "bu" = air; hujan
    s.run(
      `INSERT INTO kamus_entries(id, community_id, lemma, norm, gloss, pos, context, source, licence, state, sensitive, uses, speakers, examples, created, updated)
       VALUES(?, ?, 'bu', 'bu', 'air; hujan', 'N', '', 'komunitas', 'CC BY-SA 4.0', 'proposed', 0, 1, 1, '[]', ?, ?)`,
      crypto.randomUUID(),
      pub.id,
      now,
      now,
    )
    // Public SENSITIVE entry — MUST NEVER enter semantic map
    s.run(
      `INSERT INTO kamus_entries(id, community_id, lemma, norm, gloss, pos, context, source, licence, state, sensitive, uses, speakers, examples, created, updated)
       VALUES(?, ?, 'rahasia-suku', 'rahasia-suku', 'api; bintang; rumah', 'N', '', 'komunitas', 'CC BY-SA 4.0', 'proposed', 1, 1, 1, '[]', ?, ?)`,
      crypto.randomUUID(),
      pub.id,
      now,
      now,
    )
    // Private community entry — MUST NEVER enter semantic map
    s.run(
      `INSERT INTO kamus_entries(id, community_id, lemma, norm, gloss, pos, context, source, licence, state, sensitive, uses, speakers, examples, created, updated)
       VALUES(?, ?, 'rahasia-privat', 'rahasia-privat', 'api; air; tanah', 'N', '', 'komunitas', 'CC BY-SA 4.0', 'proposed', 0, 1, 1, '[]', ?, ?)`,
      crypto.randomUUID(),
      priv.id,
      now,
      now,
    )

    const sem = new SemanticMap(s, kamusLexicon())
    const out = await sem.build()

    assert.equal(out.mode, 'deterministic')
    assert.equal(out.nodes.length, 100)
    assert.ok(out.stats.colexificationEdges >= 10, 'Expected real colexifications from Ekari seed + public Kamus')
    assert.ok(out.stats.semanticEdges >= 40, 'Expected semantic nearest-neighbor edges')
    assert.ok(out.clusters.length >= 2 && out.clusters.length <= 20)

    // Coordinates are finite and bounded in [-1, 1] across all 3 dimensions
    for (const n of out.nodes) {
      assert.ok(Number.isFinite(n.x) && n.x >= -1 && n.x <= 1)
      assert.ok(Number.isFinite(n.y) && n.y >= -1 && n.y <= 1)
      assert.ok(Number.isFinite(n.z) && n.z >= -1 && n.z <= 1)
    }
    assert.ok(out.languages.length >= 2)

    // Verify public Sentani colexification ("bu": air <-> hujan) is present
    const serialized = JSON.stringify(out)
    assert.equal(serialized.includes('bu'), true)
    assert.equal(serialized.includes('buna'), true) // Ekari hitam <-> tua
    // Privacy & sensitivity isolation
    assert.equal(serialized.includes('rahasia-suku'), false)
    assert.equal(serialized.includes('rahasia-privat'), false)

    // Custom embedder switches mode to bge-m3 and routes through GET /v1/peta-kata/semantic
    const handler = api(s, {
      embedTexts: async (texts) =>
        texts.map((t, idx) => Array.from({ length: 24 }, (_, d) => Math.sin((idx + 1) * (d + 1) + t.length * 0.1))),
    })
    const res = await handler(new Request('https://etnos.example/v1/peta-kata/semantic'))
    assert.equal(res.status, 200)
    const body = (await res.json()) as { mode: string; nodes: unknown[]; edges: unknown[] }
    assert.equal(body.mode, 'bge-m3')
    assert.equal(body.nodes.length, 100)
    assert.ok(body.edges.length > 0)
  } finally {
    s.close()
  }
})

test('pca3d and pca2d are deterministic and produce finite bounded coordinates', () => {
  const vecs = Array.from({ length: 12 }, (_, i) => [Math.cos(i), Math.sin(i), (i % 3) * 0.5, i * 0.1])
  const a3 = pca3d(vecs)
  const b3 = pca3d(vecs)
  assert.deepEqual(a3, b3)
  assert.equal(a3.length, 12)
  for (const [x, y, z] of a3) {
    assert.ok(Number.isFinite(x) && x >= -1 && x <= 1)
    assert.ok(Number.isFinite(y) && y >= -1 && y <= 1)
    assert.ok(Number.isFinite(z) && z >= -1 && z <= 1)
  }
  const a2 = pca2d(vecs)
  assert.equal(a2.length, 12)
})
