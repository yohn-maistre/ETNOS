import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { Etnos } from '../src/store.ts'
import { api } from '../src/api.ts'
import { inspect3dCapture, signSplatWebhook } from '../src/captures.ts'

function makeGlb(size = 64): Buffer {
  const b = Buffer.alloc(size, 0)
  b.write('glTF', 0, 'latin1')
  return b
}

function makeSpz(size = 64): Buffer {
  const b = Buffer.alloc(size, 0xaa)
  b[0] = 0x1f; b[1] = 0x8b
  return b
}

function makePly(): Buffer {
  return Buffer.from('ply\nformat ascii 1.0\nelement vertex 1\nproperty float x\nproperty float y\nproperty float z\nend_header\n0 0 0\n', 'latin1')
}

test('inspect3dCapture validates .glb, .spz, .ply magic bytes and rejects non-3D files', () => {
  assert.equal(inspect3dCapture(makeGlb()).format, 'glb')
  assert.equal(inspect3dCapture(makeSpz()).format, 'spz')
  assert.equal(inspect3dCapture(makePly()).format, 'ply')
  assert.throws(() => inspect3dCapture(Buffer.from('<html><script>alert(1)</script></html>')), /Format 3D tidak didukung/)
})

test('3D captures upload, isolate private rooms, verify HMAC splat callbacks, and support clickable 3D spatial pins', async () => {
  const s = new Etnos(':memory:', 'https://etnos.example.org')
  const secret = 'test-splat-webhook-secret-1234567890'
  try {
    const owner = s.provision('did:web:owner.example', 'Pengurus')
    const member = s.provision('did:web:member.example', 'Anggota')
    const outsider = s.provision('did:web:outsider.example', 'Tamu')

    const pub = s.createCommunity(owner.actor.id, 'Noken Papua', 'Publik', 'public', false, 'open')
    const priv = s.createCommunity(owner.actor.id, 'Arsip Privat', 'Privat', 'hidden-private', false, 'invite')
    s.join(member.actor.id, pub.id)

    const handler = api(s, { splatSecret: secret })

    // 1. Direct .spz upload in private room stays invisible to outsiders.
    const upPriv = await handler(new Request(s.base + '/v1/captures', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + owner.token },
      body: JSON.stringify({ communityId: priv.id, title: 'Ukiran Keluarga', bytes: makeSpz(96).toString('base64') }),
    }))
    assert.equal(upPriv.status, 200)
    const privCap = (await upPriv.json()) as { id: string; format: string; state: string }
    assert.equal(privCap.format, 'spz')
    assert.equal(privCap.state, 'ready')

    const outsiderFile = await handler(new Request(s.base + `/v1/captures/${privCap.id}/file`, {
      headers: { authorization: 'Bearer ' + outsider.token },
    }))
    assert.equal(outsiderFile.status, 404)

    // 2. Async Video-to-Splat job on public room + HMAC callback delivery.
    const queued = await handler(new Request(s.base + '/v1/captures/video', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
      body: JSON.stringify({ communityId: pub.id, title: 'Noken Anggrek', entrySlug: 'noken', videoUrl: 'https://example.org/noken.mp4', mode: 'fast' }),
    }))
    assert.equal(queued.status, 200)
    const job = (await queued.json()) as { id: string; state: string; viewerId: string }
    assert.equal(job.state, 'queued')

    // Forged callback is rejected with 403.
    const rawCb = JSON.stringify({ state: 'ready', splatCount: 12000, bytes: makeSpz(128).toString('base64') })
    const forged = await handler(new Request(s.base + `/v1/captures/${job.id}/callback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-etnos-signature': '0000' },
      body: rawCb,
    }))
    assert.equal(forged.status, 403)

    // Valid HMAC-signed callback transitions capture to ready with .spz bytes.
    const validSig = signSplatWebhook(secret, rawCb)
    const delivered = await handler(new Request(s.base + `/v1/captures/${job.id}/callback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-etnos-signature': validSig },
      body: rawCb,
    }))
    assert.equal(delivered.status, 200)
    const ready = (await delivered.json()) as { state: string; format: string; splatCount: number; fileUrl: string }
    assert.equal(ready.state, 'ready')
    assert.equal(ready.format, 'spz')
    assert.equal(ready.splatCount, 12000)

    const fileRes = await handler(new Request(s.base + ready.fileUrl))
    assert.equal(fileRes.status, 200)
    assert.equal(fileRes.headers.get('x-etnos-3d-format'), 'spz')

    // 3. Clickable 3D spatial pin attached to the capture (linking a Kamus word).
    const pinRes = await handler(new Request(s.base + `/v1/viewer/${job.viewerId}/pins`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
      body: JSON.stringify({ x: 0.25, y: 0.4, z: -0.1, label: 'Tali kulit kayu', kamusWord: 'agiyai', note: 'Serat kulit kayu genemo yang dipilin.' }),
    }))
    assert.equal(pinRes.status, 200)
    const pin = (await pinRes.json()) as { id: string; label: string; kamusWord: string }
    assert.equal(pin.kamusWord, 'agiyai')

    const pinsList = await handler(new Request(s.base + `/v1/viewer/${job.viewerId}/pins`))
    assert.equal(pinsList.status, 200)
    const pinsBody = (await pinsList.json()) as { pins: { id: string; label: string }[] }
    assert.equal(pinsBody.pins.length, 1)
    assert.equal(pinsBody.pins[0].label, 'Tali kulit kayu')
  } finally {
    s.close()
  }
})
