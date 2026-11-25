import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Etnos } from '../src/store.ts'
import { api } from '../src/api.ts'
import { TopicClassifier } from '../src/topic-classifier.ts'

test('TopicClassifier routes Indonesian posts to accurate topics and supports cross-community semantic search', async () => {
  const s = new Etnos(':memory:', 'https://etnos.example')
  try {
    const alice = s.provision('did:plc:topicalice23456723456723', 'Alice')
    const roomA = s.createCommunity(alice.actor.id, 'Alun-Alun', 'Obrolan umum', 'public')
    const roomB = s.createCommunity(alice.actor.id, 'Peluang & Karier', 'Beasiswa dan kerja', 'public')
    const roomC = s.createCommunity(alice.actor.id, 'Tanya & Bantu', 'Tanya jawab warga', 'public')

    const pBeasiswaA = s.createPost(
      alice.actor.id,
      roomA.id,
      'Ada info beasiswa LPDP dan pelatihan magang buat mahasiswa Papua tahun ini?',
    )
    const pBeasiswaB = s.createPost(
      alice.actor.id,
      roomB.id,
      'Pendaftaran beasiswa kuliah dan lowongan kerja koperasi UMKM dibuka sampai akhir bulan.',
    )
    const pListrik = s.createPost(
      alice.actor.id,
      roomC.id,
      'Listrik PLN padam sejak pagi dan sinyal internet seluler di distrik belum kembali.',
    )
    const pPangan = s.createPost(
      alice.actor.id,
      roomA.id,
      'Resep sagu papeda kuah kuning dan ubi bakar batu dari kebun kampung.',
    )

    const tc = new TopicClassifier(s)

    // 1. Direct text classification (zero-AI deterministic mode)
    const c1 = await tc.classifyText('Lowongan kerja dan beasiswa kuliah LPDP untuk pemuda')
    assert.equal(c1.mode, 'deterministic')
    assert.ok(c1.topics.some((t) => t.slug === 'kerja-beasiswa'))

    const c2 = await tc.classifyText('Listrik PLN mati lampu dan jaringan internet lambat')
    assert.ok(c2.topics.some((t) => t.slug === 'jalan-listrik-internet'))

    const c3 = await tc.classifyText('Sagu papeda dan hasil kebun ubi keladi di pasar')
    assert.ok(c3.topics.some((t) => t.slug === 'makanan'))

    // 2. Cross-community semantic search finds both scholarship posts across Alun-Alun and Peluang & Karier
    const sem = await tc.searchSemantic({ query: 'beasiswa kuliah magang lowongan kerja' })
    assert.ok(sem.results.length >= 2)
    const hitIds = sem.results.map((r) => r.post.id)
    assert.ok(hitIds.includes(pBeasiswaA.id))
    assert.ok(hitIds.includes(pBeasiswaB.id))
    assert.ok(sem.results[0]!.post.id === pBeasiswaA.id || sem.results[0]!.post.id === pBeasiswaB.id)

    // 3. Topic filter narrows semantic browse cleanly
    const byTopic = await tc.searchSemantic({ query: '', topic: 'jalan-listrik-internet' })
    assert.ok(byTopic.results.some((r) => r.post.id === pListrik.id))
    assert.equal(byTopic.results.some((r) => r.post.id === pPangan.id), false)

    // 4. Related public conversations prioritizes cross-community bridge (roomA -> roomB)
    const rel = await tc.relatedPublic(pBeasiswaA.id)
    assert.ok(rel.topics.some((t) => t.slug === 'kerja-beasiswa'))
    assert.ok(rel.related.length >= 1)
    assert.equal(rel.related[0]!.post.id, pBeasiswaB.id)
    assert.equal(rel.related[0]!.sameCommunity, false)
  } finally {
    s.close()
  }
})

test('TopicClassifier strictly isolates private communities, archived rooms, warnings, hidden and deleted posts', async () => {
  const s = new Etnos(':memory:', 'https://etnos.example')
  try {
    const owner = s.provision('did:plc:topicpriv234567234567234', 'Pengurus')
    const pub = s.createCommunity(owner.actor.id, 'Alun-Alun', 'Publik', 'public')
    const priv = s.createCommunity(owner.actor.id, 'Rapat Tertutup', 'Privat', 'hidden-private')
    const listedPriv = s.createCommunity(owner.actor.id, 'Koordinasi Internal', 'Privat', 'listed-private')

    const pPub = s.createPost(owner.actor.id, pub.id, 'Diskusi jaringan internet dan listrik PLN di kampung.')
    const pPriv = s.createPost(owner.actor.id, priv.id, 'Rahasia privat soal jaringan internet dan listrik PLN internal.')
    const pListed = s.createPost(owner.actor.id, listedPriv.id, 'Catatan tertutup listrik PLN dan internet.')
    const pWarn = s.createPost(owner.actor.id, pub.id, 'Laporan sensitif listrik PLN dan banjir.', undefined, undefined, {
      content: { warning: 'Kejadian berat' },
    })
    const pHidden = s.createPost(owner.actor.id, pub.id, 'Post tersembunyi tentang listrik PLN dan internet.')
    const pDeleted = s.createPost(owner.actor.id, pub.id, 'Post dihapus tentang listrik PLN dan internet.')

    // Hide and delete before searching
    s.run('UPDATE posts SET hidden = 1 WHERE id = ?', pHidden.id)
    s.run('UPDATE posts SET deleted = 1 WHERE id = ?', pDeleted.id)

    const handler = api(s)
    const searchRes = await handler(new Request('https://etnos.example/v1/search/semantic?q=' + encodeURIComponent('listrik PLN internet')))
    assert.equal(searchRes.status, 200)
    const body = (await searchRes.json()) as { results: Array<{ post: { id: string } }> }
    const ids = body.results.map((r) => r.post.id)

    assert.ok(ids.includes(pPub.id))
    assert.equal(ids.includes(pPriv.id), false)
    assert.equal(ids.includes(pListed.id), false)
    assert.equal(ids.includes(pWarn.id), false)
    assert.equal(ids.includes(pHidden.id), false)
    assert.equal(ids.includes(pDeleted.id), false)

    // Verify private/hidden/deleted posts never got stored in public_post_vectors
    const storedIds = s.all<{ post_id: string }>('SELECT post_id FROM public_post_vectors').map((r) => r.post_id)
    assert.deepEqual(storedIds, [pPub.id])

    // Related-public endpoint returns 404 for private, hidden, or deleted post IDs
    assert.equal((await handler(new Request(`https://etnos.example/v1/posts/${pPriv.id}/related-public`))).status, 404)
    assert.equal((await handler(new Request(`https://etnos.example/v1/posts/${pHidden.id}/related-public`))).status, 404)
    assert.equal((await handler(new Request(`https://etnos.example/v1/posts/${pDeleted.id}/related-public`))).status, 404)

    // Post withdrawn AFTER indexing disappears immediately from search & related-public
    s.run('UPDATE posts SET deleted = 1 WHERE id = ?', pPub.id)
    const afterDelete = await handler(new Request('https://etnos.example/v1/search/semantic?q=' + encodeURIComponent('listrik PLN internet')))
    const afterBody = (await afterDelete.json()) as { results: Array<{ post: { id: string } }> }
    assert.equal(afterBody.results.length, 0)
    assert.equal((await handler(new Request(`https://etnos.example/v1/posts/${pPub.id}/related-public`))).status, 404)
  } finally {
    s.close()
  }
})
