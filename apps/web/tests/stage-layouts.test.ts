import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BOX, FIELDS, NEEDS, bidangLayout, fieldOf, fold, hubunganLayout, isLens, kebutuhanLayout, linksOf, pathRings, petaLayout, skalaLayout, tingkatLayout, type StageNode } from '../src/stage-layouts.ts'
import { ILC } from '../src/world-scale.ts'

const world = (code: string, size: [number, number], pace: [number, number]) => ({ size: { lo: size[0], hi: size[1], basis: 'rule' }, pace: { lo: pace[0], hi: pace[1], basis: 'rule' }, level: { code, band: '', basis: 'rule' } })
const nodes: StageNode[] = [
  { id: 'bahasa-mee', class: 'bahasa', title: 'Bahasa Mee', witnesses: 4, world: world('q', [3, 5], [10, 12]), cluster: 1, x: 0.2, y: 0.1 },
  { id: 'suku-mee', class: 'kelompok', title: 'Suku Mee', witnesses: 2, world: world('s', [3, 5], [10, 12]), cluster: 1, x: 0.25, y: 0.12 },
  { id: 'kabupaten-paniai', class: 'tempat', title: 'Kabupaten Paniai', witnesses: 6, world: world('t', [4, 5], [9, 11]), cluster: 2, x: -0.4, y: 0.3 },
  { id: 'danau-paniai', class: 'tempat', title: 'Danau Paniai', witnesses: 1, world: world('i', [3.5, 4.5], [11, 13]), cluster: 2, x: -0.5, y: -0.2 },
  { id: 'tanpa-tingkat', class: 'tempat', title: 'Tanpa tingkat', witnesses: 0, cluster: 3 },
]

test('every lens gives one finite position per node, the same on every run', () => {
  const links = linksOf(nodes, [{ source: 'suku-mee', target: 'kabupaten-paniai' }], [{ a: 'bahasa-mee', b: 'suku-mee', weight: 3 }])
  const all = [skalaLayout(nodes), tingkatLayout(nodes, 1.9), bidangLayout(nodes, 0.8), kebutuhanLayout(nodes, 1.9), hubunganLayout(nodes, links)]
  for (const l of all) {
    assert.equal(l.pos.length, nodes.length)
    for (const p of l.pos) for (const v of p) assert.ok(Number.isFinite(v))
  }
  assert.deepEqual(hubunganLayout(nodes, links).pos, hubunganLayout(nodes, links).pos)
  assert.deepEqual(skalaLayout(nodes).pos, skalaLayout(nodes).pos)
})

test('the size and pace box puts level on z, so a language and a group of the same size and pace separate', () => {
  const { pos } = skalaLayout(nodes)
  for (const p of pos) { assert.ok(Math.abs(p[0]) <= BOX[0] + 1e-9); assert.ok(Math.abs(p[1]) <= BOX[1] + 1e-9); assert.ok(Math.abs(p[2]) <= BOX[2] + 1e-9) }
  const z = (code: string) => ((ILC.indexOf(code) / (ILC.length - 1)) * 2 - 1) * BOX[2]
  assert.equal(pos[0][2], z('q'))
  assert.equal(pos[1][2], z('s'))
  assert.ok(pos[1][2] > pos[0][2])
})

test('cluster lenses keep empty groups and put the rest in a tray', () => {
  const t = tingkatLayout(nodes, 1.9)
  assert.equal(t.groups.filter((g) => !g.tray).length, 7)
  assert.equal(t.groups.find((g) => g.tray)?.count, 1)
  const k = kebutuhanLayout(nodes, 1.9)
  assert.equal(k.groups.filter((g) => !g.tray).length, NEEDS.length)
  assert.ok(k.groups.filter((g) => !g.tray).every((g) => g.count === 0))
  assert.equal(k.groups.find((g) => g.tray)?.count, nodes.length)
})

test('every level class has one field of science', () => {
  for (const code of ILC) assert.equal(FIELDS.filter((f) => f.classes.includes(code)).length, 1, code)
  assert.equal(fieldOf('q')?.key, 'humaniora')
  assert.equal(fieldOf(null), undefined)
})

test('the map lens projects points and gathers the rest in a tray beside or below the map', () => {
  const at = (n: StageNode): [number, number] | null => (n.id === 'danau-paniai' ? [300, 400] : n.id === 'kabupaten-paniai' ? [310, 420] : null)
  const wide = petaLayout(nodes, at, [0, 0, 1000, 800], 1.9), tall = petaLayout(nodes, at, [0, 0, 1000, 800], 0.8)
  const tray = wide.groups.find((g) => g.tray)!
  assert.equal(tray.count, 3)
  assert.ok(tray.center[0] > 1 && tall.groups[0].center[1] < -0.8)
  assert.ok(Math.abs(wide.pos[3][0] - (300 - 500) * wide.scale) < 1e-9)
  assert.ok(Math.abs(wide.pos[3][1] + (400 - 400) * wide.scale) < 1e-9)
})

test('outlines, search folding and lens names', () => {
  assert.deepEqual(pathRings('M0 0L10 0L10 10ZM20 20L30 20L30 30Z'), [[[0, 0], [10, 0], [10, 10]], [[20, 20], [30, 20], [30, 30]]])
  assert.equal(fold('Énarotali'), 'enarotali')
  assert.ok(isLens('peta') && !isLens('globe'))
})
