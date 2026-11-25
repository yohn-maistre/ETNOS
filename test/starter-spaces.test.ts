import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Etnos } from '../src/store.ts'
import { fixture, did, origin, issuer } from './oauth-fixture.ts'

const newcomer = 'did:plc:yyyyyyyyyyyyyyyyyyyyyyyy'

function req(path: string, body?: unknown, cookie = '') {
  return new Request(origin + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      origin,
      ...(cookie ? { cookie } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

const cookiePart = (r: Response, name = '__Host-strata_flow') =>
  r.headers.getSetCookie().find((x) => x.startsWith(name + '='))!.split(';')[0]

const callback = (state: string) =>
  '/auth/callback?state=' + state + '&code=fixture&iss=' + encodeURIComponent(issuer)

test('steward bootstrap creates 7 open general starter spaces and auto-joins humans to Alun-Alun', async () => {
  const s = new Etnos(':memory:', origin)
  try {
    // 1. Steward logs in -> bootstraps 7 open starter spaces.
    const stewardFlow = await fixture(s, { enrollmentMode: 'open' }, did, 'steward.bsky.social', did)
    const startSteward = (await stewardFlow.auth.route(req('/auth/start', { handle: 'steward.bsky.social' })))!
    assert.equal(startSteward.status, 200)
    const signedSteward = (await stewardFlow.auth.route(req(callback(stewardFlow.state()), undefined, cookiePart(startSteward))))!
    assert.equal(signedSteward.status, 303)

    const listed = s.listCommunities()
    const titles = listed.map((c) => c.title).sort()
    assert.deepEqual(titles, [
      'Alun-Alun',
      'Kabar & Diskusi',
      'Karya & Kreatif',
      'Pasar & Titip',
      'Peluang & Karier',
      'Tanya & Bantu',
      'Tanya Langsung',
    ])
    for (const c of listed) {
      assert.equal(c.visibility, 'public')
      assert.equal(c.admission, 'open')
    }

    // 2. Newcomer signs up -> automatically becomes a member of Alun-Alun only.
    const userFlow = await fixture(s, { enrollmentMode: 'open' }, newcomer, 'warga.bsky.social', newcomer)
    const startUser = (await userFlow.auth.route(req('/auth/start', { mode: 'signup' })))!
    assert.equal(startUser.status, 200)
    const signedUser = (await userFlow.auth.route(req(callback(userFlow.state()), undefined, cookiePart(startUser))))!
    assert.equal(signedUser.status, 303)

    const user = s.get<{ id: string }>('SELECT id FROM actors WHERE did=?', newcomer)!
    const memberships = s.all<{ community_id: string; role: string; active: number }>(
      'SELECT community_id, role, active FROM memberships WHERE actor_id=?',
      user.id,
    )
    const square = s.get<{ community_id: string }>("SELECT community_id FROM starter_spaces WHERE slug='square'")!
    assert.equal(memberships.length, 1)
    assert.equal(memberships[0].community_id, square.community_id)
    assert.equal(memberships[0].role, 'member')
    assert.equal(memberships[0].active, 1)

    // 3. If the user voluntarily leaves Alun-Alun, signing in again does not force them back in.
    s.run('UPDATE memberships SET active=0 WHERE community_id=? AND actor_id=?', square.community_id, user.id)
    const reloginFlow = await fixture(s, { enrollmentMode: 'open' }, newcomer, 'warga.bsky.social', newcomer)
    const startAgain = (await reloginFlow.auth.route(req('/auth/start', { handle: 'warga.bsky.social' })))!
    assert.equal(startAgain.status, 200)
    await reloginFlow.auth.route(req(callback(reloginFlow.state()), undefined, cookiePart(startAgain)))
    const afterRelogin = s.get<{ active: number }>(
      'SELECT active FROM memberships WHERE community_id=? AND actor_id=?',
      square.community_id,
      user.id,
    )!
    assert.equal(afterRelogin.active, 0)
  } finally {
    s.close()
  }
})

test('archived communities are hidden from listCommunities and syncBootstrappedSpaces adds new starter rooms', async () => {
  const s = new Etnos(':memory:', origin)
  try {
    const steward = s.provision(did, 'Steward')
    const squareId = crypto.randomUUID()
    const cultureId = crypto.randomUUID()
    s.run(
      "INSERT INTO communities(id,title,description,visibility,automation,admission,publication,archived) VALUES(?,?,?,'public',0,'open','local',0)",
      squareId,
      'Alun-Alun',
      'Ruang umum.',
    )
    s.run("INSERT INTO memberships VALUES(?,?,'owner',1)", squareId, steward.actor.id)
    s.run("INSERT INTO starter_spaces VALUES('square',?)", squareId)

    s.run(
      "INSERT INTO communities(id,title,description,visibility,automation,admission,publication,archived) VALUES(?,?,?,'public',0,'open','local',1)",
      cultureId,
      'Budaya & bahasa',
      'Arsip lama.',
    )
    s.run("INSERT INTO memberships VALUES(?,?,'owner',1)", cultureId, steward.actor.id)
    s.run("INSERT INTO starter_spaces VALUES('culture',?)", cultureId)

    // Instantiating BrowserAuth triggers syncBootstrappedSpaces() on an already-bootstrapped node.
    await fixture(s, { enrollmentMode: 'open' }, did, 'steward.bsky.social', did)

    const listed = s.listCommunities(steward.actor.id)
    assert.equal(listed.some((c) => c.id === cultureId), false)
    assert.equal(listed.some((c) => c.title === 'Tanya Langsung'), true)
    assert.equal(listed.some((c) => c.title === 'Peluang & Karier'), true)
    assert.equal(listed.some((c) => c.title === 'Karya & Kreatif'), true)
    assert.equal(listed.some((c) => c.title === 'Pasar & Titip'), true)
    assert.equal(listed.length, 7)
  } finally {
    s.close()
  }
})
