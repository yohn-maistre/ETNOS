import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { Etnos } from '../src/store.ts'
import { api } from '../src/api.ts'
import { inspectAudio, type VoiceBucket } from '../src/voice.ts'

/** Builds minimal valid audio containers matching magic-byte inspection. */
function makeOggOpus(size = 128): Buffer {
  const b = Buffer.alloc(size, 0x22)
  b.write('OggS', 0, 'latin1')
  b.write('OpusHead', 28, 'latin1')
  return b
}

function makeWebm(size = 128): Buffer {
  const b = Buffer.alloc(size, 0x11)
  b[0] = 0x1a; b[1] = 0x45; b[2] = 0xdf; b[3] = 0xa3
  return b
}

function makeM4a(size = 128): Buffer {
  const b = Buffer.alloc(size, 0x33)
  b.write('ftypM4A ', 4, 'latin1')
  return b
}

function makeMp3(size = 128): Buffer {
  const b = Buffer.alloc(size, 0x44)
  b.write('ID3', 0, 'latin1')
  return b
}

test('inspectAudio accepts WebM, Ogg/Opus, M4A, MP3 and rejects spoofed or oversized payloads', () => {
  assert.equal(inspectAudio(makeWebm()).mime, 'audio/webm')
  assert.equal(inspectAudio(makeOggOpus()).mime, 'audio/ogg')
  assert.equal(inspectAudio(makeM4a()).mime, 'audio/mp4')
  assert.equal(inspectAudio(makeMp3()).mime, 'audio/mpeg')

  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
  assert.throws(() => inspectAudio(svg), /Format suara tidak didukung/)

  const badOgg = Buffer.alloc(64, 0)
  badOgg.write('OggS', 0, 'latin1')
  assert.throws(() => inspectAudio(badOgg), /Opus atau Vorbis/)

  assert.throws(() => inspectAudio(makeWebm(20)), /maksimal/)
})

test('voice-only posts stream with Range support, honor restricted protocol, and disappear on post delete', async () => {
  const s = new Etnos(':memory:', 'https://etnos.example.org')
  try {
    const owner = s.provision('did:web:owner.example', 'Mama Yuliana')
    const member = s.provision('did:web:member.example', 'Yose')
    const outsider = s.provision('did:web:outsider.example', 'Tamu')
    const room = s.createCommunity(owner.actor.id, 'Ruang Enarotali', 'Ruang publik', 'public', false, 'open')
    s.join(member.actor.id, room.id)

    const handler = api(s)
    const audio = makeOggOpus(256)

    // Upload a public/community clip and a culturally restricted clip.
    const up1 = await handler(new Request(s.base + '/v1/voice', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + owner.token },
      body: JSON.stringify({
        communityId: room.id,
        bytes: audio.toString('base64'),
        durationMs: 4200,
        peaks: [10, 45, 90, 30],
        speaker: 'Mama Yuliana',
        protocol: 'community',
      }),
    }))
    assert.equal(up1.status, 200)
    const clip1 = (await up1.json()) as { id: string; url: string; mime: string }
    assert.equal(clip1.mime, 'audio/ogg')

    const up2 = await handler(new Request(s.base + '/v1/voice', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + owner.token },
      body: JSON.stringify({
        communityId: room.id,
        bytes: makeM4a(200).toString('base64'),
        durationMs: 3100,
        protocol: 'restricted',
      }),
    }))
    assert.equal(up2.status, 200)
    const clip2 = (await up2.json()) as { id: string; protocol: string }
    assert.equal(clip2.protocol, 'restricted')

    // Create a voice-only post (empty text!) carrying both clips.
    const postRes = await handler(new Request(s.base + '/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + owner.token },
      body: JSON.stringify({
        communityId: room.id,
        text: '',
        voiceIds: [clip1.id, clip2.id],
        requestKey: randomUUID(),
      }),
    }))
    assert.equal(postRes.status, 200)
    const post = (await postRes.json()) as { id: string; revision: number; voice: { id: string }[] }
    assert.equal(post.voice.length, 2)

    // Outsider sees the community clip on the post, NEVER the restricted clip.
    const outsiderPost = await handler(new Request(s.base + '/v1/posts/' + post.id, {
      headers: { authorization: 'Bearer ' + outsider.token },
    }))
    const outsiderView = (await outsiderPost.json()) as { voice: { id: string }[] }
    assert.deepEqual(outsiderView.voice.map((v) => v.id), [clip1.id])

    // Outsider gets 404 on restricted audio bytes; member gets 200 and 206 Range.
    const restrictedDenied = await handler(new Request(s.base + '/v1/voice/' + clip2.id, {
      headers: { authorization: 'Bearer ' + outsider.token },
    }))
    assert.equal(restrictedDenied.status, 404)

    const memberRange = await handler(new Request(s.base + '/v1/voice/' + clip1.id, {
      headers: { authorization: 'Bearer ' + member.token, range: 'bytes=0-31' },
    }))
    assert.equal(memberRange.status, 206)
    assert.equal(memberRange.headers.get('content-range'), 'bytes 0-31/256')
    assert.equal(memberRange.headers.get('x-content-type-options'), 'nosniff')
    assert.equal((await memberRange.arrayBuffer()).byteLength, 32)

    // Member helps write transcript ("Bantu tulis").
    const txRes = await handler(new Request(s.base + '/v1/voice/' + clip1.id + '/transcript', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
      body: JSON.stringify({ transcript: 'Selamat pagi dari Enarotali' }),
    }))
    assert.equal(txRes.status, 200)
    assert.equal(((await txRes.json()) as { transcript: string }).transcript, 'Selamat pagi dari Enarotali')

    // Deleting the post immediately removes voice clips from read paths.
    const delRes = await handler(new Request(s.base + '/v1/posts/' + post.id + '/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + owner.token },
      body: JSON.stringify({ revision: post.revision }),
    }))
    assert.equal(delRes.status, 200)
    const afterDelete = await handler(new Request(s.base + '/v1/voice/' + clip1.id, {
      headers: { authorization: 'Bearer ' + member.token },
    }))
    assert.equal(afterDelete.status, 404)
  } finally {
    s.close()
  }
})

test('private voice clips stay isolated after member removal, respect cloud-transcribe consent, and support R2 + Kamus pronunciation', async () => {
  const s = new Etnos(':memory:', 'https://etnos.example.org')
  const r2Map = new Map<string, Uint8Array>()
  const bucket: VoiceBucket = {
    async put(key, value) { r2Map.set(key, new Uint8Array(value)) },
    async get(key) {
      const v = r2Map.get(key)
      return v ? { async arrayBuffer() { return new Uint8Array(v).buffer } } : null
    },
    async delete(key) { r2Map.delete(key) },
  }
  try {
    const owner = s.provision('did:web:owner.example', 'Pengurus')
    const member = s.provision('did:web:member.example', 'Penutur')
    const outsider = s.provision('did:web:outsider.example', 'Luar')
    const room = s.createCommunity(owner.actor.id, 'Bahasa Mee Privat', 'Ruang keluarga', 'hidden-private', false, 'invite')
    s.setMember(owner.actor.id, room.id, member.actor.id, true, 'member')

    const handler = api(s, {
      stewardDid: owner.actor.did,
      voiceBucket: bucket,
      transcribeVoice: async () => 'Transkrip percobaan',
    })

    // Hidden communities set Kamus language via node operator settings (no public labels).
    const langRes = await handler(new Request(s.base + `/v1/communities/${room.id}/kamus/settings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + owner.token },
      body: JSON.stringify({ language: 'ekar1243' }),
    }))
    assert.equal(langRes.status, 200)

    // Upload voice clip backed by R2 bucket.
    const up = await handler(new Request(s.base + '/v1/voice', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
      body: JSON.stringify({ communityId: room.id, bytes: makeWebm(180).toString('base64'), durationMs: 2400 }),
    }))
    assert.equal(up.status, 200)
    const clip = (await up.json()) as { id: string }
    assert.equal(r2Map.size, 1, 'audio stored in R2 bucket')

    // Attach to Kamus word "koyao".
    const att = await handler(new Request(s.base + `/v1/communities/${room.id}/kamus/voice`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
      body: JSON.stringify({ word: 'Koyao', clipId: clip.id }),
    }))
    assert.equal(att.status, 200)

    // Word card returns pronunciation clip for member, 404 for outsider.
    const wordOk = await handler(new Request(s.base + `/v1/communities/${room.id}/kamus/word?w=koyao`, {
      headers: { authorization: 'Bearer ' + member.token },
    }))
    assert.equal(wordOk.status, 200)
    const wordData = (await wordOk.json()) as { voices: { id: string }[] }
    assert.equal(wordData.voices.length, 1)
    assert.equal(wordData.voices[0].id, clip.id)

    const outsiderClip = await handler(new Request(s.base + '/v1/voice/' + clip.id, {
      headers: { authorization: 'Bearer ' + outsider.token },
    }))
    assert.equal(outsiderClip.status, 404)

    // A private room never sends audio to the cloud transcriber, with or without allowCloud.
    const blockedTx = await handler(new Request(s.base + '/v1/voice/' + clip.id + '/transcribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
      body: JSON.stringify({ language: 'id' }),
    }))
    assert.equal(blockedTx.status, 403)

    const stillBlockedTx = await handler(new Request(s.base + '/v1/voice/' + clip.id + '/transcribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
      body: JSON.stringify({ language: 'id', allowCloud: true }),
    }))
    assert.equal(stillBlockedTx.status, 403)

    // Removing the member immediately revokes access to the private voice clip.
    s.setMember(owner.actor.id, room.id, member.actor.id, false, 'member')
    const revokedRead = await handler(new Request(s.base + '/v1/voice/' + clip.id, {
      headers: { authorization: 'Bearer ' + member.token },
    }))
    assert.equal(revokedRead.status, 404)

    // Steward withdrawing the clip deletes both DB row and R2 object.
    const withdrawn = await handler(new Request(s.base + '/v1/voice/' + clip.id + '/withdraw', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + owner.token },
      body: JSON.stringify({}),
    }))
    assert.equal(withdrawn.status, 200)
    assert.equal(r2Map.size, 0, 'R2 object deleted on withdraw')
  } finally {
    s.close()
  }
})

test('cloud transcription: public clips in a public community only; restricted clips stay home', async () => {
  const s = new Etnos(':memory:', 'https://etnos.example.org')
  try {
    const owner = s.provision('did:web:owner.example', 'Pengurus')
    const member = s.provision('did:web:member.example', 'Penutur')
    const square = s.createCommunity(owner.actor.id, 'Bahasa Mee', 'Ruang terbuka', 'public', false, 'open')
    s.setMember(owner.actor.id, square.id, member.actor.id, true, 'member')
    let heard = 0
    const handler = api(s, { stewardDid: owner.actor.did, transcribeVoice: async () => { heard++; return 'Transkrip percobaan' } })
    const upload = async (protocol: string) => {
      const res = await handler(new Request(s.base + '/v1/voice', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
        body: JSON.stringify({ communityId: square.id, bytes: makeWebm(180).toString('base64'), durationMs: 2400, protocol }),
      }))
      assert.equal(res.status, 200)
      return ((await res.json()) as { id: string }).id
    }
    const transcribe = (id: string) => handler(new Request(s.base + '/v1/voice/' + id + '/transcribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
      body: JSON.stringify({ language: 'id', allowCloud: true }),
    }))
    const open = await transcribe(await upload('public'))
    assert.equal(open.status, 200)
    assert.equal(((await open.json()) as { transcript: string }).transcript, 'Transkrip percobaan')
    assert.equal((await transcribe(await upload('restricted'))).status, 403)
    assert.equal(heard, 1, 'the restricted clip never reached the transcriber')
  } finally {
    s.close()
  }
})
