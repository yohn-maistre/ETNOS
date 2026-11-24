import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Etnos } from '../src/store.ts'
import { api } from '../src/api.ts'

test('AT Spaces bridge is private-only, syncs active members, revokes atomically on removal, and stays hidden from outsiders', async () => {
  const s = new Etnos(':memory:', 'https://etnos.example.org')
  try {
    const owner = s.provision('did:web:owner.example', 'Pengurus')
    const member = s.provision('did:web:member.example', 'Anggota')
    const outsider = s.provision('did:web:outsider.example', 'Tamu')

    const pub = s.createCommunity(owner.actor.id, 'Publik', 'Ruang publik', 'public', false, 'open')
    const priv = s.createCommunity(owner.actor.id, 'Privat', 'Ruang keluarga', 'hidden-private', false, 'invite')
    s.setMember(owner.actor.id, priv.id, member.actor.id, true, 'member')

    const handler = api(s)

    // Public community refuses AT Space activation.
    const pubFail = await handler(new Request(s.base + `/v1/communities/${pub.id}/at-space`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + owner.token },
      body: JSON.stringify({}),
    }))
    assert.equal(pubFail.status, 409)

    // Outsider gets 404 on private AT Space status.
    const hidden = await handler(new Request(s.base + `/v1/communities/${priv.id}/at-space`, {
      headers: { authorization: 'Bearer ' + outsider.token },
    }))
    assert.equal(hidden.status, 404)

    // Non-steward member cannot enable AT Space.
    const memberFail = await handler(new Request(s.base + `/v1/communities/${priv.id}/at-space`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
      body: JSON.stringify({}),
    }))
    assert.equal(memberFail.status, 403)

    // Steward enables AT Space -> both owner and member synced.
    const enabled = await handler(new Request(s.base + `/v1/communities/${priv.id}/at-space`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + owner.token },
      body: JSON.stringify({}),
    }))
    assert.equal(enabled.status, 200)
    const space = (await enabled.json()) as { enabled: boolean; spaceUri: string; activeMembers: number; revokedMembers: number }
    assert.equal(space.enabled, true)
    assert.ok(space.spaceUri.startsWith('at://did:web:owner.example/space/com.atproto.memberspace/'))
    assert.equal(space.activeMembers, 2)
    assert.equal(space.revokedMembers, 0)

    // Removing the member in ETNOS atomically revokes their AT Space member row!
    s.setMember(owner.actor.id, priv.id, member.actor.id, false, 'member')
    const afterRemoval = await handler(new Request(s.base + `/v1/communities/${priv.id}/at-space`, {
      headers: { authorization: 'Bearer ' + owner.token },
    }))
    const updated = (await afterRemoval.json()) as { activeMembers: number; revokedMembers: number }
    assert.equal(updated.activeMembers, 1)
    assert.equal(updated.revokedMembers, 1)

    // Removed member immediately gets 404 reading AT Space status.
    const removedRead = await handler(new Request(s.base + `/v1/communities/${priv.id}/at-space`, {
      headers: { authorization: 'Bearer ' + member.token },
    }))
    assert.equal(removedRead.status, 404)

    // Steward revoking AT Space marks remaining members revoked.
    const revoked = await handler(new Request(s.base + `/v1/communities/${priv.id}/at-space/revoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + owner.token },
      body: JSON.stringify({}),
    }))
    assert.equal(revoked.status, 200)
    const revokedView = (await revoked.json()) as { enabled: boolean; state: string; activeMembers: number; revokedMembers: number }
    assert.equal(revokedView.enabled, false)
    assert.equal(revokedView.state, 'revoked')
    assert.equal(revokedView.activeMembers, 0)
    assert.equal(revokedView.revokedMembers, 2)
  } finally {
    s.close()
  }
})
