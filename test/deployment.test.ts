// P6: etnos.yaml (docs/plan/one-page-system-2026-11-21.md §9). Every name here is a fixture.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { Etnos } from '../src/store.ts'
import { Offerings } from '../src/offerings.ts'
import { api } from '../src/api.ts'
import { parse, stringify } from '../src/yaml.ts'
import { check } from '../src/schema-check.ts'
import { DEFAULT_KIOS_RULES } from '../src/kios-rules.ts'
import etnosSchema from '../schemas/etnos.schema.json' with { type: 'json' }

function world() {
  let now = Date.parse('2026-11-22T00:00:00Z')
  const s = new Etnos(':memory:', 'https://etnos.example', () => (now += 1000))
  const admin = s.provision('did:web:admin.example', 'Operator fixture'),
    steward = s.provision('did:web:steward.example', 'Steward fixture')
  const handler = api(s, { stewardDid: admin.actor.did, catalogue: 'tanah-papua', enrollmentMode: 'invite', sources: ['https://kabar.example'] })
  const call = async (token: string | null, path: string, body?: unknown) => {
    const headers: Record<string, string> = token ? { authorization: 'Bearer ' + token } : {}
    const r = await handler(new Request(s.base + path, body === undefined ? { headers } : { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) }))
    return { status: r.status, body: (await r.json()) as any }
  }
  return { s, admin, steward, call }
}

test('etnos.yaml: only the operator reads, checks and applies it', async () => {
  const w = world()
  try {
    for (const t of [null, w.steward.token]) {
      assert.ok([401, 403].includes((await w.call(t, '/v1/deployment/etnos-yaml')).status))
      assert.ok([401, 403].includes((await w.call(t, '/v1/deployment/etnos-yaml/check', { text: 'version: 1\nname: X\n' })).status))
      assert.ok([401, 403].includes((await w.call(t, '/v1/deployment/etnos-yaml/apply', { text: 'version: 1\nname: X\n' })).status))
    }
    const view = await w.call(w.admin.token, '/v1/deployment/etnos-yaml')
    assert.equal(view.status, 200)
    assert.deepEqual(check(etnosSchema, parse(view.body.text)), [], 'the current file follows the schema')
    assert.equal(view.body.file.catalogue, 'tanah-papua')
    assert.equal(view.body.file.enrollment, 'invite')
    assert.deepEqual(view.body.file.news.sources, ['https://kabar.example'])
    assert.equal(view.body.file.operator.did, 'did:web:admin.example')
    assert.deepEqual(view.body.file.kios.rules, DEFAULT_KIOS_RULES)
  } finally {
    w.s.close()
  }
})

test('etnos.yaml: the example file follows the schema', () => {
  const v = parse(readFileSync(new URL('../etnos.example.yaml', import.meta.url), 'utf8')) as any
  assert.deepEqual(check(etnosSchema, v), [])
  assert.equal(v.rootPlace, 'Q3845')
  assert.deepEqual(v.kios.rules, DEFAULT_KIOS_RULES, 'the example carries the rules in force')
})

test('etnos.yaml: secrets are refused whole, with a plain message', async () => {
  const w = world()
  try {
    const base = (await w.call(w.admin.token, '/v1/deployment/etnos-yaml')).body.text as string
    for (const text of [
      base.replace('model:\n', 'model:\n  apiKey: abc\n'),
      base + 'token: abc\n',
      base.replace('provider: workers-ai', 'provider: sk-ant-abcdefghijklmnop'),
      'version: 1\nname: X\npassword: [broken\n',
    ]) {
      const r = await w.call(w.admin.token, '/v1/deployment/etnos-yaml/check', { text })
      assert.equal(r.status, 200)
      assert.equal(r.body.ok, false)
      assert.ok(r.body.secret, text)
      assert.match(r.body.errors[0].message, /tidak menyimpan rahasia/)
      assert.equal((await w.call(w.admin.token, '/v1/deployment/etnos-yaml/apply', { text })).status, 400)
    }
    assert.equal(w.s.all('SELECT 1 FROM deployment_settings').length, 0, 'nothing was stored')
  } finally {
    w.s.close()
  }
})

test('etnos.yaml: check lists changes by kind; apply stores only the safe ones', async () => {
  const w = world()
  try {
    const cur = (await w.call(w.admin.token, '/v1/deployment/etnos-yaml')).body.file
    const bad = await w.call(w.admin.token, '/v1/deployment/etnos-yaml/check', { text: stringify({ ...cur, rootPlace: 'Papua' }) })
    assert.equal(bad.body.ok, false)
    assert.equal(bad.body.errors[0].path, 'rootPlace')
    const regex = await w.call(w.admin.token, '/v1/deployment/etnos-yaml/check', { text: stringify({ ...cur, kios: { rules: [{ key: 'x', label: 'X', words: ['(a+)+$'] }] } }) })
    assert.equal(regex.body.ok, false, 'a Kios rule is words, never a pattern')
    const next = {
      ...cur,
      name: 'ETNOS Fixture',
      rootPlace: 'Q3845',
      regionLanguages: ['ekar1243'],
      catalogue: 'lain',
      model: { ...cur.model, fast: 'model-fixture' },
      operator: { ...cur.operator, email: 'pengelola@contoh.example' },
      kios: { rules: [...cur.kios.rules, { key: 'senjata', label: 'Senjata tidak boleh dijual (fixture).', words: ['senapan', '(jual|dijual) parang'] }] },
    }
    const text = stringify(next)
    const checked = await w.call(w.admin.token, '/v1/deployment/etnos-yaml/check', { text })
    assert.equal(checked.body.ok, true)
    const by = Object.fromEntries(checked.body.changes.map((c: any) => [c.path, c.how]))
    assert.deepEqual(by, { name: 'apply', rootPlace: 'apply', regionLanguages: 'apply', catalogue: 'deploy', 'model.fast': 'model', 'operator.email': 'apply', 'kios.rules': 'apply' })
    const applied = await w.call(w.admin.token, '/v1/deployment/etnos-yaml/apply', { text })
    assert.equal(applied.status, 200)
    assert.deepEqual(applied.body.notApplied.map((c: any) => c.path).sort(), ['catalogue', 'model.fast'])
    const after = (await w.call(w.admin.token, '/v1/deployment/etnos-yaml')).body.file
    assert.equal(after.name, 'ETNOS Fixture')
    assert.equal(after.rootPlace, 'Q3845')
    assert.equal(after.catalogue, 'tanah-papua', 'a deploy setting is shown, not changed')
    assert.equal(after.operator.email, 'pengelola@contoh.example')
    assert.equal(after.operator.did, 'did:web:admin.example')
    // The new Kios rule is in force at once.
    assert.deepEqual((await w.call(w.steward.token, '/v1/kios/rules')).body.map((r: any) => r.key), ['satwa', 'alkohol', 'tanah', 'senjata'])
    const room = w.s.createCommunity(w.steward.actor.id, 'Pasar fixture', 'x', 'public', false, 'open')
    assert.throws(() => new Offerings(w.s).create(w.steward.actor.id, { communityId: room.id, text: 'Dijual parang tajam', content: {}, kind: 'offer', requestKey: randomUUID() }), (e: { status?: number }) => e.status === 422)
    // A file without a setting leaves it as it is.
    const short = await w.call(w.admin.token, '/v1/deployment/etnos-yaml/check', { text: 'version: 1\nname: ETNOS Fixture\n' })
    assert.deepEqual(short.body.changes, [])
  } finally {
    w.s.close()
  }
})
