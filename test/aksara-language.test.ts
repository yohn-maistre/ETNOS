import test from 'node:test'
import assert from 'node:assert/strict'
import { gateAksaraPost, indonesianOnly, looksEnglish } from '../src/aksara-voice.ts'

const id = 'Semenanjung Bomberai adalah sebuah semenanjung yang terletak di Papua Barat, di seberang selatan Semenanjung Doberai. [1]'
const en = 'Bomberai Peninsula (Indonesian: Semenanjung Bomberai) is located in the Western New Guinea region. It is south of the Bird\'s Head Peninsula, and Bintuni Bay separates the two peninsulas. [2]'

test('English paragraphs are recognised and Indonesian ones are kept', () => {
  assert.equal(looksEnglish(en), true)
  assert.equal(looksEnglish(id), false)
  assert.equal(looksEnglish('Sa baru tulis catatan awal tentang Danau Paniai dari sumber terbuka.'), false)
  const out = indonesianOnly(id + '\n\n' + en)
  assert.equal(out.text, id)
  assert.equal(out.dropped, true)
  assert.deepEqual(indonesianOnly(id), { text: id, dropped: false })
})

test('the post gate refuses an English post', () => {
  const post = 'Bintuni Bay separates the two peninsulas, and the Sebakor Bay lies to the west of the region.'
  assert.ok(gateAksaraPost(post, post, []).reasons.includes('berbahasa Inggris'))
})
