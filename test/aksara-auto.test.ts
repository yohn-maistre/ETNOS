import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Etnos } from '../src/store.ts'
import { AgentAccess } from '../src/agent-access.ts'
import { Resident } from '../src/resident.ts'
import { Wiki } from '../src/wiki.ts'
import { Groups } from '../src/groups.ts'
import { Periksa } from '../src/periksa.ts'
import { api } from '../src/api.ts'
import { nodeModels, OPENROUTER_OPENAI_BASE, validKeyInput, defaultModel } from '../src/models.ts'
import { parseJadwal } from '../src/jadwal.ts'

const WIKI_EXTRACT =
  'Kabupaten Jayapura adalah salah satu kabupaten di Provinsi Papua, Indonesia. ' +
  'Ibu kota kabupaten ini terletak di Sentani yang berada di tepi Danau Sentani. ' +
  'Wilayah ini merupakan bagian dari wilayah adat Mamta dan memiliki 19 distrik serta lebih dari 139 kampung. ' +
  'Bahasa Sentani dan beberapa bahasa daerah lain dituturkan oleh masyarakat setempat.'

const WIKI_RESPONSE = {
  query: {
    pages: {
      '12345': {
        title: 'Kabupaten Jayapura',
        fullurl: 'https://id.wikipedia.org/wiki/Kabupaten_Jayapura',
        extract: WIKI_EXTRACT,
      },
    },
  },
}

const NEWS_FEED = {
  items: [
    {
      id: 901,
      title: { id: 'Festival Danau Sentani kembali digelar di Kabupaten Jayapura' },
      summary: { id: 'Warga dari berbagai kampung di Kabupaten Jayapura menampilkan perahu hias dan tarian adat di tepi Danau Sentani.' },
      latest_report_at: '2026-11-24T01:00:00Z',
      source_count: 3,
      places: [{ name: 'Jayapura', slug: 'jayapura', latitude: -2.59, longitude: 140.52 }],
    },
  ],
  pagination: { has_more: false },
  selection: { total: 1 },
  place_options: [{ slug: 'jayapura', name: 'Jayapura' }],
}

function setupFixture(options: { liveWiki?: boolean; withModel?: boolean; badModelFirst?: boolean } = {}) {
  let now = Date.parse('2026-11-24T05:00:00Z')
  const s = new Etnos(':memory:', 'https://etnos.example.org', () => now)
  const owner = s.provision('did:web:owner.example', 'Pengelola')
  const room = s.createCommunity(owner.actor.id, 'Ruang Mamta', 'Komunitas publik Mamta', 'public', true, 'open')
  const wiki = new Wiki(s)
  if (options.liveWiki !== false) wiki.setLive(owner.actor.id, room.id, true)
  const groups = new Groups(s, { stewardDid: owner.actor.did })
  const ctx = groups.createContext(owner.actor.id, { slug: 'kabupaten-jayapura', title: 'Jayapura', kind: 'place', facet: 'kabupaten', description: 'Kabupaten di Papua', language: 'id', aliases: ['Kabupaten Jayapura'] })
  groups.labelCommunity(owner.actor.id, room.id, ctx.id)

  const access = new AgentAccess(s, { stewardDid: owner.actor.did })
  const agent = access.enroll(owner.actor.id, { communityId: room.id, name: 'Aksara', role: 'steward', family: 'aksara' })
  access.admit(owner.actor.id, agent.agent_id)
  const posting = s.mandate(owner.actor.id, agent.agent_id, room.id, 'Kabar publik', now + 86400000, 10)
  const editorial = wiki.grant(owner.actor.id, agent.agent_id, room.id, 'Ensiklopedia', now + 86400000, 10)

  let modelCalls = 0
  const models = options.withModel
    ? async () => ({
        async chat() {
          modelCalls++
          if (options.badModelFirst && modelCalls === 1) {
            return { text: 'Kabupaten Jayapura didirikan oleh Kerajaan Atlantis pada tahun 9999.', model: 'mock-model', route: 'key' as const, inputTokens: 10, outputTokens: 10 }
          }
          return {
            text:
              'Kabupaten Jayapura adalah salah satu kabupaten di Provinsi Papua, Indonesia, dengan ibu kota di Sentani di tepi Danau Sentani [1].\n\n' +
              'Wilayah ini merupakan bagian dari wilayah adat Mamta dan memiliki 19 distrik serta lebih dari 139 kampung, dengan bahasa Sentani dituturkan oleh masyarakat setempat [1].',
            model: 'mock-gemini-flash',
            route: 'key' as const,
            inputTokens: 120,
            outputTokens: 60,
          }
        },
      })
    : undefined

  const researchFetcher: typeof fetch = (async () => new Response(JSON.stringify(WIKI_RESPONSE), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch
  const newsFetcher: typeof fetch = (async () => new Response(JSON.stringify(NEWS_FEED), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch

  const jadwal = parseJadwal({
    version: 1,
    timezone: 'Asia/Jayapura',
    slots: [
      { id: 'kabar-pagi', at: '06:30', skill: 'kabar-harian', label: 'Kabar pagi' },
      { id: 'riset', at: '14:00', skill: 'riset-ensiklopedia', label: 'Riset Ensiklopedia' },
    ],
  })

  const resident = new Resident(s, access, undefined, jadwal, { models, fetcher: researchFetcher, newsFetcher })
  resident.configure(owner.actor.id, {
    communityId: room.id,
    agentId: agent.agent_id,
    postingMandateId: posting,
    editorialMandateId: editorial.id,
    enabled: true,
    dailyLimit: 12,
    intervalMinutes: 120,
    mentionsEnabled: true,
    announceKnowledge: true,
    requestKey: randomUUID(),
  })

  return { s, owner, room, ctx, wiki, groups, access, agent, resident, getModelCalls: () => modelCalls, setNow: (t: number) => { now = t }, researchFetcher, newsFetcher, models }
}

test('OpenRouter keys auto-select openrouter.ai, send referer headers, prefer :free models and fall back on 402/408', async () => {
  const parsed = validKeyInput({ key: 'sk-or-v1-1234567890abcdef' })
  assert.equal(parsed?.baseUrl, OPENROUTER_OPENAI_BASE)
  assert.equal(defaultModel(['openai/gpt-5', 'google/gemma-3-27b-it:free', 'deepseek/deepseek-r1:free']), 'google/gemma-3-27b-it:free')

  const seenHeaders: Record<string, string>[] = []
  let aiCalls = 0
  const fallbackAi = { run: async () => { aiCalls++; return { response: 'dari gemma cadangan', usage: { prompt_tokens: 4, completion_tokens: 3 } } } }

  for (const status of [402, 408]) {
    const fetcher = (async (_url: string, init: RequestInit) => {
      seenHeaders.push(init.headers as Record<string, string>)
      return new Response('{}', { status })
    }) as unknown as typeof fetch
    const m = nodeModels({ ETNOS_MODEL_BASE_URL: OPENROUTER_OPENAI_BASE, ETNOS_MODEL_KEY: 'sk-or-v1-test', ETNOS_MODEL_FAST: 'google/gemma-3-27b-it:free', AI: fallbackAi }, fetcher)!
    const reply = await m.chat({ purpose: 'fast', messages: [{ role: 'user', content: 'halo' }], maxTokens: 50 })
    assert.equal(reply.route, 'keyless')
    assert.equal(reply.text, 'dari gemma cadangan')
  }
  assert.equal(aiCalls, 2)
  assert.equal(seenHeaders[0]['HTTP-Referer'], 'https://etnos.space')
  assert.equal(seenHeaders[0]['X-Title'], 'ETNOS')
})

test('riset-ensiklopedia fetches Wikipedia, verifies via checkPage (with repair), publishes live-wiki marked unreviewed, tags context and seeds Periksa', async () => {
  const f = setupFixture({ liveWiki: true, withModel: true, badModelFirst: true })
  try {
    const job = await f.resident.runNow(f.owner.actor.id, f.room.id, 'riset-ensiklopedia', randomUUID())
    assert.equal(job.state, 'succeeded')
    assert.equal(job.result_kind, 'wiki')
    assert.equal(job.result_id, 'kabupaten-jayapura')
    assert.equal(f.getModelCalls(), 2, 'bad draft triggered one repair pass that passed checkPage')

    // Live wiki page is published immediately, linked to context, and marked unreviewed + agent-authored.
    const pages = f.wiki.discover()
    assert.equal(pages.length, 1)
    assert.equal(pages[0].title, 'Jayapura')
    assert.equal(pages[0].review, 'unreviewed')
    assert.equal(pages[0].authorKind, 'agent')
    assert.equal(pages[0].reviewer, null)

    const linked = f.s.get('SELECT 1 FROM record_contexts WHERE record_kind=? AND record_id=? AND context_id=?', 'wiki', pages[0].id, f.ctx.id)
    assert.ok(linked, 'wiki page is linked to target context so /wiki/<slug> renders it')

    // Announcement post was created and Periksa claims were seeded.
    const posts = f.s.all<{ text: string }>('SELECT text FROM posts WHERE community_id=? AND author_id=?', f.room.id, f.agent.agent_id)
    assert.equal(posts.length, 1)
    assert.ok(posts[0].text.includes('/wiki/kabupaten-jayapura'))

    const claims = new Periksa(f.s).list(f.owner.actor.id, f.room.id, 'open')
    assert.ok(claims.length >= 1, 'Periksa deck received verification cards from basis quotes')
    assert.equal(claims[0].origin, 'agent')

    // A steward reviewing the revision flips it cleanly to reviewed.
    f.wiki.review(f.owner.actor.id, pages[0].revision_id, true)
    assert.equal(f.wiki.read(pages[0].id).revision?.review, 'reviewed')

    // Second run does not repeat the same context within 7 days.
    const second = await f.resident.runNow(f.owner.actor.id, f.room.id, 'riset-ensiklopedia', randomUUID())
    assert.equal(second.state, 'abstained')
  } finally {
    f.s.close()
  }
})

test('kabar-harian posts live clustered news with place context tags and deduplicates within 72 hours', async () => {
  const f = setupFixture({ withModel: false })
  try {
    const first = await f.resident.runNow(f.owner.actor.id, f.room.id, 'kabar-harian', randomUUID())
    assert.equal(first.state, 'succeeded')
    assert.equal(first.result_kind, 'post')
    const post = f.s.get<{ text: string }>('SELECT text FROM posts WHERE id=?', first.result_id!)!
    assert.ok(post.text.includes('Festival Danau Sentani'))
    assert.ok(post.text.includes('https://westpapua.watch/story/?id=901'))

    const ctxLink = f.s.get('SELECT 1 FROM record_contexts WHERE record_kind=? AND record_id=? AND context_id=?', 'post', first.result_id!, f.ctx.id)
    assert.ok(ctxLink, 'post tagged with place context for Percakapan')

    // Repeating immediately skips the already-posted story.
    const repeat = await f.resident.runNow(f.owner.actor.id, f.room.id, 'kabar-harian', randomUUID())
    assert.equal(repeat.state, 'abstained')
  } finally {
    f.s.close()
  }
})

test('usulan-periksa and pertanyaan-harian work without RSS feeds and private communities stay strictly isolated', async () => {
  const f = setupFixture({ withModel: false })
  try {
    await f.resident.runNow(f.owner.actor.id, f.room.id, 'riset-ensiklopedia', randomUUID())
    const qJob = await f.resident.runNow(f.owner.actor.id, f.room.id, 'pertanyaan-harian', randomUUID())
    assert.equal(qJob.state, 'succeeded')
    assert.equal(qJob.result_kind, 'post')

    const pJob = await f.resident.runNow(f.owner.actor.id, f.room.id, 'usulan-periksa', randomUUID())
    assert.equal(pJob.state, 'succeeded')
    assert.equal(pJob.result_kind, 'periksa')

    // Flipping community to hidden-private immediately blocks autonomous runs.
    f.s.run("UPDATE communities SET visibility='hidden-private',admission='invite' WHERE id=?", f.room.id)
    await assert.rejects(() => f.resident.runNow(f.owner.actor.id, f.room.id, 'kabar-harian', randomUUID()))
  } finally {
    f.s.close()
  }
})

test('POST /v1/resident/run-now executes immediately for stewards and rejects non-stewards', async () => {
  const f = setupFixture({ withModel: false })
  try {
    const outsider = f.s.provision('did:web:outsider.example', 'Orang lain')
    const member = f.s.provision('did:web:member.example', 'Anggota biasa')
    f.s.join(member.actor.id, f.room.id)
    const handler = api(f.s, { agentAccess: f.access, newsFetcher: f.newsFetcher, researchFetcher: f.researchFetcher })

    const hidden = await handler(new Request(f.s.base + '/v1/resident/run-now', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + outsider.token },
      body: JSON.stringify({ communityId: f.room.id, skill: 'kabar-harian', requestKey: randomUUID() }),
    }))
    assert.equal(hidden.status, 404)

    const denied = await handler(new Request(f.s.base + '/v1/resident/run-now', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + member.token },
      body: JSON.stringify({ communityId: f.room.id, skill: 'kabar-harian', requestKey: randomUUID() }),
    }))
    assert.equal(denied.status, 403)

    const ok = await handler(new Request(f.s.base + '/v1/resident/run-now', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + f.owner.token },
      body: JSON.stringify({ communityId: f.room.id, skill: 'kabar-harian', requestKey: randomUUID() }),
    }))
    assert.equal(ok.status, 200)
    const body = (await ok.json()) as { state: string; skill: string; result_kind: string }
    assert.equal(body.state, 'succeeded')
    assert.equal(body.skill, 'kabar-harian')
    assert.equal(body.result_kind, 'post')
  } finally {
    f.s.close()
  }
})
