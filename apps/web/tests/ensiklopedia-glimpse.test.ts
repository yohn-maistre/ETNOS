import test from 'node:test'
import assert from 'node:assert/strict'
import { firstForms, joinWords, pickSpecimen, sampleNames } from '../src/ensiklopedia-glimpse.ts'

const languages = [
  { code: 'biak1248', slug: 'bahasa-biak', name: 'Biak', concepts: 91 },
  { code: 'ekar1243', slug: 'bahasa-ekari', name: 'Ekari', concepts: 93 },
  { code: 'abun1252', slug: 'bahasa-abun', name: 'Abun', concepts: 80 },
  { code: 'nucl1632', slug: 'bahasa-sentani', name: 'Sentani', concepts: 70 },
]

test('the first attribution-licensed form of each language is kept; NonCommercial forms are left out', () => {
  const forms = firstForms([
    { lang: 'biak1248', form: 'war' }, { lang: 'biak1248', form: 'wār' },
    { lang: 'ekar1243', form: 'uwo', nc: true }, { lang: 'ekar1243', form: 'uwo_ka' },
    { lang: 'abun1252', form: 'sul', nc: true },
  ])
  assert.deepEqual([...forms], [['biak1248', 'war'], ['ekar1243', 'uwo ka']])
})

test('the specimen follows the spread over the island, then any other language with a form', () => {
  const forms = new Map([['abun1252', 'sul'], ['ekar1243', 'uwo'], ['biak1248', 'war'], ['xxxx0000', 'zz']])
  const s = pickSpecimen(forms, languages, 3)
  assert.deepEqual(s.map((x) => x.name), ['Biak', 'Ekari', 'Abun'])
  assert.deepEqual(s.map((x) => x.form), ['war', 'uwo', 'sul'])
  // A language without a form or outside the catalogue is never shown.
  assert.ok(!pickSpecimen(forms, languages, 9).some((x) => x.code === 'xxxx0000' || x.code === 'nucl1632'))
})

test('sample names put written entries first and drop the kind word', () => {
  const names = sampleNames([{ title: 'Suku Abun', article: false }, { title: 'Suku Amungme', article: true }, { title: 'Suku Arfak', article: false }], /^Suku\s+/, 2)
  assert.deepEqual(names, ['Amungme', 'Abun'])
  assert.equal(joinWords(['Burung', 'Mamalia', 'Kupu-kupu']), 'Burung, Mamalia dan Kupu-kupu')
  assert.equal(joinWords(['Danau']), 'Danau')
})
