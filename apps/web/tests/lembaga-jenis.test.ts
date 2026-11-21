import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jenisSections, jenisOf, JENIS } from '../src/lembaga-jenis.ts'

const g = (id: string, slug?: string) => ({ id, contexts: slug ? [{ slug: 'nabire', facet: 'regency' }, { slug, facet: 'institution-kind' }] : [] })

test('jenis lembaga sections keep a fixed order and show only those with a lembaga', () => {
  assert.deepEqual(JENIS.map((j) => j.title), ['Adat', 'Pemerintah', 'Agama', 'Pendidikan', 'Kesehatan', 'Masyarakat sipil', 'Usaha dan koperasi', 'Media'])
  const s = jenisSections([g('a', 'media'), g('b', 'dewan-adat'), g('c'), g('d', 'dewan-adat')])
  assert.deepEqual(s.map((x) => [x.title, x.items.map((i) => i.id)]), [['Adat', ['b', 'd']], ['Media', ['a']], ['Lainnya', ['c']]])
  assert.deepEqual(jenisSections([g('c')]).map((x) => x.title), [''], 'no jenis anywhere: one list without a heading')
  assert.equal(jenisOf({ contexts: [{ slug: 'lembaga', facet: 'institution-kind' }] }), '', 'the root is not a jenis')
})
