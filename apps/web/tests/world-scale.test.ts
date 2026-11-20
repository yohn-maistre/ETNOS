import test from 'node:test'
import assert from 'node:assert/strict'
import { sizeWords, paceWords, rangeWords, place, bandOf, SIZE, PACE } from '../src/world-scale.ts'

test('size and pace read in everyday units', () => {
  assert.equal(sizeWords(4.67), '47 km')
  assert.equal(sizeWords(0), '1 m')
  assert.equal(sizeWords(-1.5), '3 cm')
  assert.equal(sizeWords(-3), '1 mm')
  assert.equal(sizeWords(6), '1.000 km')
  assert.equal(paceWords(Math.log10(86400)), '1 hari')
  assert.equal(paceWords(9.5), '100 tahun')
  assert.equal(paceWords(11), '3.200 tahun')
  assert.equal(paceWords(14), '3 juta tahun')
  assert.equal(rangeWords({ lo: 4.57, hi: 4.77 }, sizeWords), '37 sampai 59 km')
  assert.equal(rangeWords({ lo: 7, hi: 10 }, paceWords), '4 bulan sampai 320 tahun')
})

test('a thing is placed inside its own range, the same way every time', () => {
  const w = { size: { lo: 3.5, hi: 5.5, basis: 'rule' }, pace: { lo: 10, hi: 11, basis: 'rule' }, level: { code: 'q', band: 'bahasa-ritus', basis: 'rule' } }
  const a = place('bahasa-ekari', w)!, b = place('bahasa-ekari', w)!, c = place('bahasa-moni', w)!
  assert.deepEqual(a, b)
  assert.notDeepEqual(a, c)
  const toSize = (x: number) => SIZE[0] + ((x + 1) / 2) * (SIZE[1] - SIZE[0]), toPace = (y: number) => PACE[0] + ((y + 1) / 2) * (PACE[1] - PACE[0])
  for (const p of [a, c]) {
    assert.ok(toSize(p[0]) >= 3.5 && toSize(p[0]) <= 5.5)
    assert.ok(toPace(p[1]) >= 10 && toPace(p[1]) <= 11)
  }
  assert.equal(place('x', { size: null, pace: null, level: null }), null)
  assert.equal(bandOf('q')?.label, 'Bahasa dan ritus')
  assert.equal(bandOf('t')?.key, 'masyarakat-aturan')
})

test('site map coordinates turn back into latitude and longitude', async () => {
  const { project, unproject } = await import('../src/terrain.ts')
  const [x, y] = project(-3.92, 136.36)
  assert.deepEqual(unproject(x, y), [-3.92, 136.36])
})
