// The Percakapan name matcher (src/tentang-match.ts). Every entry here is a fixture.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchNames, nameIndex, normName, searchNames, suggestions, type NameEntry } from '../src/tentang-match.ts'

const e = (slug: string, title: string, label: string, names = [title]): NameEntry => ({ slug, title, kind: 'tempat', label, names })
const list = [
  e('paniai', 'Paniai', 'Kabupaten', ['Paniai', 'Kabupaten Paniai']),
  e('danau-paniai', 'Danau Paniai', 'Danau'),
  e('puncak-jaya', 'Puncak Jaya', 'Kabupaten', ['Puncak Jaya', 'Kabupaten Puncak Jaya']),
  e('puncak-jaya--tempat', 'Puncak Jaya', 'Gunung'),
  e('bahasa-ekari', 'Ekari', 'Bahasa', ['Bahasa Ekari']),
  { slug: 'kesehatan', title: 'Kesehatan', kind: 'topik', label: 'Topik', names: [] },
]
const index = nameIndex(list)

test('names match whole words, without case or accents, and the longest name wins', () => {
  assert.equal(normName('  Danau-Paníai! '), 'danau paniai')
  const m = matchNames('Pagi ini di DANAU PANIAI, lalu ke kota Paniai. Paniaiku bukan nama.', index)
  assert.deepEqual(m.map((x) => [x.text, x.entries.map((y) => y.slug)]), [['DANAU PANIAI', ['danau-paniai']], ['Paniai', ['paniai']]])
  assert.deepEqual(matchNames('Kabupaten Puncak Jaya', index).map((x) => x.entries.map((y) => y.slug)), [['puncak-jaya']])
})

test('one name with two entries comes back once with both, so the author picks', () => {
  const m = matchNames('Salju di Puncak Jaya makin tipis.', index)
  assert.equal(m.length, 1)
  assert.deepEqual(m[0].entries.map((x) => x.label), ['Kabupaten', 'Gunung'])
})

test('links, mentions and entries without names are never matched', () => {
  assert.deepEqual(matchNames('Lihat https://etnos.space/wiki/danau-paniai dan @paniai', index), [])
  assert.deepEqual(matchNames('[tulisan](/wiki/danau-paniai) soal kesehatan', index), [])
  assert.deepEqual(matchNames('[Danau Paniai](/wiki/x)', index).map((x) => x.text), ['Danau Paniai'])
  assert.deepEqual(matchNames('Kami belajar bahasa Ekari', index).map((x) => x.entries[0].slug), ['bahasa-ekari'])
  assert.deepEqual(matchNames('Ekari saja', index), [], 'a language is matched with the word bahasa in front')
})

test('suggestions skip what is already tagged, repeat nothing and stop at the limit', () => {
  const text = 'Danau Paniai, Danau Paniai, Paniai, Puncak Jaya, bahasa Ekari'
  assert.deepEqual(suggestions(text, index, ['paniai']).map((x) => x.text), ['Danau Paniai', 'Puncak Jaya', 'bahasa Ekari'])
  const half = suggestions('Puncak Jaya', index, ['puncak-jaya--tempat'])
  assert.deepEqual(half[0].entries.map((x) => x.slug), ['puncak-jaya'], 'a tagged half of an ambiguous name leaves the other')
  assert.equal(suggestions(text, index, [], 1).length, 1)
})

test('the picker finds a title first, then other names, including topics', () => {
  assert.deepEqual(searchNames('pan', list).map((x) => x.slug), ['paniai', 'danau-paniai'])
  assert.deepEqual(searchNames('kese', list).map((x) => x.slug), ['kesehatan'])
  assert.deepEqual(searchNames('ekari', list).map((x) => x.slug), ['bahasa-ekari'])
  assert.deepEqual(searchNames('   ', list), [])
})
