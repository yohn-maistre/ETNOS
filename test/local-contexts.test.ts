import test from 'node:test'
import assert from 'node:assert/strict'
import { Etnos } from '../src/store.ts'
import { api } from '../src/api.ts'
import { SHIPPED } from '../src/local-contexts.ts'
import wordlists from '../seed/kamus/tanah-papua-wordlists.json' with { type: 'json' }

type View = { key: string; notices: { kind: string; name: string; url: string; text: string; by: string }[]; hub: { projectId: string; url: string } | null }

test('every wordlist dataset is a collection; outside lists carry Attribution Incomplete and ETNOS carries Open to Collaborate', () => {
  const keys = new Set(SHIPPED.map((c) => c.key))
  for (const d of (wordlists as unknown as { datasets: { key: string }[] }).datasets) assert.ok(keys.has(d.key), d.key)
  assert.deepEqual(SHIPPED.find((c) => c.key === 'etnos')!.notices, ['open-to-collaborate'])
  for (const k of ['tng', 'abvd', 'berry1987', 'steltenpool1969']) assert.deepEqual(SHIPPED.find((c) => c.key === k)!.notices, ['attribution-incomplete'])
})

test('Local Contexts: public list, operator-only changes, Hub project IDs only, never a Label from ETNOS', async () => {
  const s = new Etnos(':memory:', 'https://lc.example')
  try {
    const steward = s.provision('did:web:steward.example', 'Node steward'), member = s.provision('did:web:member.example', 'Member')
    const handle = api(s, { stewardDid: steward.actor.did })
    const call = (path: string, init: RequestInit = {}) => handle(new Request('https://lc.example' + path, init))
    const post = (path: string, token: string, body: unknown) => call(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(body) })

    const list = (await (await call('/v1/local-contexts')).json()) as { collections: View[] }
    const tng = list.collections.find((c) => c.key === 'tng')!
    assert.equal(tng.notices[0]!.name, 'Attribution Incomplete Notice')
    assert.equal(tng.notices[0]!.url, 'https://localcontexts.org/notice/attribution-incomplete/')
    assert.match(tng.notices[0]!.text, /belum dicatat lengkap/)
    assert.equal(tng.hub, null)

    const id = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
    assert.equal((await post('/v1/local-contexts/tng', member.token, { hubProjectId: id })).status, 403)
    assert.equal((await post('/v1/local-contexts/tng', steward.token, { hubProjectId: 'not-an-id' })).status, 400)
    assert.equal((await post('/v1/local-contexts/tng', steward.token, { labels: ['TK Attribution'] })).status, 400, 'ETNOS never applies a Label')
    assert.equal((await post('/v1/local-contexts/tng', steward.token, { notices: ['tk-attribution'] })).status, 400, 'only the four Notices')
    assert.equal((await post('/v1/local-contexts/nope', steward.token, { hubProjectId: id })).status, 404)

    const set = (await (await post('/v1/local-contexts/tng', steward.token, { hubProjectId: id.toUpperCase(), notices: ['tk'] })).json()) as View
    assert.deepEqual(set.hub, { projectId: id, url: 'https://localcontextshub.org/projects/' + id + '/' })
    assert.deepEqual(set.notices.map((n) => [n.kind, n.by]), [['attribution-incomplete', 'etnos'], ['tk', 'operator']])
    const cleared = (await (await post('/v1/local-contexts/tng', steward.token, { hubProjectId: '' })).json()) as View
    assert.equal(cleared.hub, null)
    assert.equal(cleared.notices.length, 2)
  } finally { s.close() }
})
