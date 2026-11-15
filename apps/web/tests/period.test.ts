import test from 'node:test'
import assert from 'node:assert/strict'
import { periodLabel, bandOf } from '../src/period.ts'

test('a period reads plainly at each precision', () => {
  assert.equal(periodLabel({ from: 1969, to: 1969, precision: 'year' }), '1969')
  assert.equal(periodLabel({ from: 1855, to: 1898, precision: 'year' }), '1855–1898')
  assert.equal(periodLabel({ from: 1960, to: 1969, precision: 'decade' }), '1960-an')
  assert.equal(periodLabel({ from: 1801, to: 1900, precision: 'century' }), 'abad ke-19')
  assert.equal(periodLabel({ from: -1499, to: -999, precision: 'millennium' }), '1.500 SM–1.000 SM')
  assert.equal(periodLabel({ from: -37974, to: -37974, precision: 'deep' }, 2026), 'sekitar 40.000 tahun lalu')
})

test('a period falls in the band of its first year', () => {
  assert.equal(bandOf(2026), 'kini')
  assert.equal(bandOf(1999), 'abad-20')
  assert.equal(bandOf(1500), 'sebelum-1900')
  assert.equal(bandOf(1499), 'sebelum-1500')
  assert.equal(bandOf(-40000), 'purba')
})
