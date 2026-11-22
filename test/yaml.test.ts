// The YAML subset (src/yaml.ts) and the schema checker (src/schema-check.ts) behind etnos.yaml, lembaga.yaml and situs.yaml.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, stringify, YamlError } from '../src/yaml.ts'
import { check } from '../src/schema-check.ts'
import situsSchema from '../schemas/situs.schema.json' with { type: 'json' }
import lembagaSchema from '../schemas/lembaga.schema.json' with { type: 'json' }
import etnosSchema from '../schemas/etnos.schema.json' with { type: 'json' }

test('the YAML subset reads mappings, lists, quoted text, block text and comments', () => {
  const doc = parse(`# a comment
---
version: 1
name: "ETNOS: Tanah Papua" # trailing comment
plain: Tanah Papua
quote: 'it''s'
empty:
nothing: null
yes: true
count: 42
ratio: 0.5
flow: [ekar1243, "a, b", 3]
none: []
obj: {}
list:
  - satu
  - key: a
    other: b
  -
    - nested
compact:
- x
- y
text: |
  Baris satu.

  Baris tiga.
folded: >-
  satu
  dua
nest:
  deeper:
    value: "a\\nb"
`)
  assert.deepEqual(doc, {
    version: 1, name: 'ETNOS: Tanah Papua', plain: 'Tanah Papua', quote: "it's", empty: null, nothing: null, yes: true, count: 42, ratio: 0.5,
    flow: ['ekar1243', 'a, b', 3], none: [], obj: {}, list: ['satu', { key: 'a', other: 'b' }, ['nested']], compact: ['x', 'y'],
    text: 'Baris satu.\n\nBaris tiga.\n', folded: 'satu dua', nest: { deeper: { value: 'a\nb' } },
  })
  assert.equal(parse(''), null)
  assert.equal(parse('# only a comment\n'), null)
})

test('the YAML subset refuses what could mean two things, with the line number', () => {
  const bad: [string, RegExp][] = [
    ['a: 1\na: 2', /Baris 2: Kunci a ditulis dua kali/],
    ['a: &x 1', /Tanda &/],
    ['a: *x', /Tanda \*/],
    ['a: !!str 1', /Tanda !/],
    ['a: {b: 1}', /bukan di dalam \{ \}/],
    ['a:\n\tb: 1', /tab/],
    ['a: b: c', /titik dua/],
    ['a: 1\n  b: 2', /menjorok/],
    ['a: 1\n---\nb: 2', /satu dokumen/],
    ['- a\nb: 1', /Indentasi|tidak boleh dicampur/],
    ['__proto__: 1', /tidak dipakai/],
    ['a: "open', /tidak lengkap|penutup/],
  ]
  for (const [src, message] of bad) assert.throws(() => parse(src), (e: unknown) => e instanceof YamlError && message.test(e.message), src)
})

test('stringify writes the subset, and every value reads back unchanged', () => {
  const values: unknown[] = [
    { version: 1, name: 'Sanggar Fixture', tagline: 'yes', n: '42', t: 'true', colon: 'a: b', hash: 'a #b', lead: ' space', empty: '', none: null, list: [], obj: {}, nested: { a: [1, 2, { b: 'c', d: ['e'] }], deep: { x: { y: 'z' } } } },
    { text: 'Satu\nDua\n', exact: 'Satu\nDua', odd: 'x\n\n\n\ny', indented: '  a\nb', unicode: 'Danau Paniai · Ekari’s “kata”', quote: 'He said "hi"' },
    [{ id: 'hero', type: 'hero' }, ['a', 'b'], 'plain', 3.25, false],
  ]
  for (const v of values) assert.deepEqual(parse(stringify(v)), v)
  assert.match(stringify({ a: 1 }, ['situs.yaml (fixture)']), /^# situs\.yaml \(fixture\)\na: 1\n$/)
})

test('the schema checker reports problems with a path in plain Indonesian', () => {
  const ok = { version: 1, template: 'editorial', theme: { primary: 'hutan', accent: 'kunyit', fonts: 'newsreader' }, blocks: [{ id: 'hero', type: 'hero' }, { id: 'foto', type: 'galeri', images: [] }] }
  assert.deepEqual(check(situsSchema, ok), [])
  const problems = check(situsSchema, { ...ok, theme: { primary: 'pink', accent: 'kunyit', fonts: 'comic' }, extra: 1, blocks: [{ id: 'hero', type: 'hero', html: '<b>' }, { id: 'x', type: 'galeri' }, { id: 'y', type: 'script' }] })
  const messages = problems.map((p) => p.message).join('\n')
  assert.match(messages, /theme\.primary harus salah satu dari/)
  assert.match(messages, /theme\.fonts harus salah satu dari/)
  assert.match(messages, /extra tidak dikenal/)
  assert.match(messages, /blocks\[0\]\.html tidak dikenal/, 'no HTML in any block')
  assert.match(messages, /blocks\[1\]\.images wajib diisi/)
  assert.match(messages, /blocks\[2\] tidak cocok/)
  assert.throws(() => check({ type: 'string', format: 'email' }, 'x'), /not supported/)
  assert.deepEqual(check(lembagaSchema, { version: 1, name: 'Fixture', kind: 'institution', logo: null, cover: { ref: 'logo' } }), [])
  assert.match(check(lembagaSchema, { version: 1, name: 'Fixture', kind: 'institution', cover: { ref: 'javascript:alert(1)' } })[0].message, /cover tidak cocok/)
  assert.deepEqual(check(etnosSchema, { version: 1, name: 'ETNOS', rootPlace: 'Q3845', regionLanguages: ['ekar1243'], kios: { rules: [{ key: 'tanah', label: 'Fixture', words: ['(jual|sewa) tanah', 'shm'] }] } }), [])
  assert.match(check(etnosSchema, { version: 1, name: 'ETNOS', kios: { rules: [{ key: 'x', label: 'x', words: ['(a+)+$'] }] } })[0].message, /tidak sesuai format/, 'no regular expressions in house rules')
})
