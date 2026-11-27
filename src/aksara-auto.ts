/**
 * Autonomous public librarian programs for Aksara (W1).
 *
 * Every program runs inside Resident's existing authority, mandate, daily-limit and
 * model-budget checks. It reads public communities and open public sources only,
 * verifies wiki prose against verbatim fetched sentences (src/desk.ts checkPage),
 * publishes to live-wiki when the community enables it (marked unreviewed until a
 * person reviews or reverts it), tags matching entries for Percakapan, and feeds
 * bite-sized verification cards into Periksa.
 */
import type { EtnosCore } from './core.ts'
import { Fault } from './core.ts'
import { Wiki } from './wiki.ts'
import { Periksa } from './periksa.ts'
import { Kamus } from './kamus.ts'
import { kamusLexicon } from './kamus-data.ts'
import { checkPage, type PageBasis } from './desk.ts'
import { publicNews, type NewsFeed, type NewsItem } from './news.ts'
import { redactPublicModelText } from './redaction.ts'
import type { Models } from './models.ts'
import type { AutonomousSkill } from './resident-contract.ts'
import { AKSARA_VOICE, SENSITIVE_RULE, DAILY_POSTS, gateAksaraPost, isSensitive, sourceLabel, tidyPost } from './aksara-voice.ts'
import concepts from '../seed/kamus/leipzig-jakarta-100.json' with { type: 'json' }

export const AUTONOMOUS_SKILLS: readonly AutonomousSkill[] = [
  'kabar-harian',
  'riset-ensiklopedia',
  'usulan-periksa',
  'pertanyaan-harian',
]

export const isAutonomousSkill = (skill: string): skill is AutonomousSkill =>
  (AUTONOMOUS_SKILLS as readonly string[]).includes(skill)

/** Legacy resident_jobs.skill value that satisfies the original SQLite CHECK constraint. */
export function legacySkillOf(skill: AutonomousSkill): 'source-digest' | 'research-question' | 'knowledge-draft' {
  if (skill === 'kabar-harian') return 'source-digest'
  if (skill === 'riset-ensiklopedia') return 'knowledge-draft'
  return 'research-question'
}

export type AutoDeps = {
  models?: () => Promise<Models | undefined>
  fetcher?: typeof fetch
  newsFetcher?: typeof fetch
}

export type AutoTarget = {
  communityId: string
  communityTitle: string
  agentId: string
  postingMandateId: string | null
  editorialMandateId: string | null
}

export type AutoCommitted = {
  resultKind: 'post' | 'wiki' | 'periksa'
  resultId: string
}

export type AutoPrepared = {
  model: string
  inputTokens: number
  outputTokens: number
  commit: () => AutoCommitted
}

type CtxRow = { id: string; slug: string; title: string; kind: string; facet: string; description: string }
type FetchedSource = { url: string; title: string; text: string; sentences: string[] }

const RESEARCH_HOSTS = new Set(['id.wikipedia.org', 'en.wikipedia.org'])
const UA = 'ETNOS/0.1 (https://etnos.space; open cultural commons)'
const MAX_FETCH_BYTES = 262144
const SEVEN_DAYS = 7 * 86400000
const THREE_DAYS = 3 * 86400000

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

function cleanProse(text: string): string {
  return redactPublicModelText(stripThinking(text))
    .text
    .replace(/\u2014|\u2013/g, ', ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown | null> {
  let parsed: URL
  try { parsed = new URL(url) } catch { return null }
  if (parsed.protocol !== 'https:' || !RESEARCH_HOSTS.has(parsed.hostname)) return null
  let res: Response
  try {
    res = await fetcher(parsed.href, {
      headers: { accept: 'application/json', 'user-agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })
  } catch { return null }
  if (!res.ok || !res.body) { await res.body?.cancel().catch(() => {}); return null }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > MAX_FETCH_BYTES) { await reader.cancel(); return null }
      chunks.push(part.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) { bytes.set(c, offset); offset += c.length }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown } catch { return null }
}

/** Splits plain encyclopedia prose into clean, standalone verbatim sentences. */
export function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  const raw = cleaned.split(/(?<=[.!?])\s+(?=[A-Z\u00C0-\u024F0-9"“])/)
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of raw) {
    const s = part.trim()
    if (s.length < 35 || s.length > 520) continue
    if (s.split(/\s+/).length < 6) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length >= 14) break
  }
  return out
}

function papuaSearchTerm(ctx: CtxRow): string {
  const title = ctx.title.trim()
  if (ctx.kind === 'language') return /^bahasa\s/i.test(title) ? title : `Bahasa ${title}`
  if ((ctx.facet === 'regency' || ctx.facet === 'kabupaten') && !/^kabupaten\s/i.test(title)) return `Kabupaten ${title}`
  if ((ctx.facet === 'city' || ctx.facet === 'kota') && !/^kota\s/i.test(title)) return `Kota ${title}`
  if (ctx.facet === 'province' || ctx.facet === 'provinsi') return title
  return title
}

async function fetchWikipedia(lang: 'id' | 'en', term: string, ctx: CtxRow, fetcher: typeof fetch): Promise<FetchedSource | null> {
  const host = `${lang}.wikipedia.org`
  const queryExtract = async (title: string): Promise<FetchedSource | null> => {
    const url = `https://${host}/w/api.php?action=query&prop=extracts|info&inprop=url&explaintext=1&exintro=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`
    const data = await fetchJson(url, fetcher) as { query?: { pages?: Record<string, { missing?: string; title?: string; fullurl?: string; extract?: string }> } } | null
    const pages = data?.query?.pages
    if (!pages) return null
    const page = Object.values(pages)[0]
    if (!page || 'missing' in page || !page.extract || !page.fullurl) return null
    const extract = page.extract.trim()
    if (extract.length < 120) return null
    // Guard against unrelated homonyms: require Papua/Nugini/Irian or matching facet word in the extract or title.
    const check = (page.title + ' ' + extract).toLowerCase()
    const relevant = /(papua|nugini|new guinea|irian|cendrawasih|cenderawasih|jayapura|merauke|nabire|manokwari|sorong|fakfak|biak|wamena|timika|paniai|melanesia|austronesia|trans-new guinea)/i.test(check)
    if (!relevant && ctx.kind !== 'topic') return null
    const sentences = splitSentences(extract)
    if (sentences.length < 2) return null
    return { url: page.fullurl, title: page.title ?? title, text: extract.slice(0, 4500), sentences }
  }

  const direct = await queryExtract(term)
  if (direct) return direct

  // Fallback: MediaWiki search scoped with Papua for disambiguation.
  const searchQuery = lang === 'en' && ctx.kind === 'language'
    ? `${ctx.title} language Papua`
    : `${term} Papua`
  const searchUrl = `https://${host}/w/api.php?action=query&list=search&srlimit=3&format=json&srsearch=${encodeURIComponent(searchQuery)}`
  const found = await fetchJson(searchUrl, fetcher) as { query?: { search?: { title: string }[] } } | null
  for (const hit of found?.query?.search ?? []) {
    const result = await queryExtract(hit.title)
    if (result) return result
  }
  return null
}

/** Community's public place/region/language contexts (about labels). */
function communityPlaces(store: EtnosCore, communityId: string): CtxRow[] {
  return store.all<CtxRow>(
    `SELECT c.id,c.slug,c.title,c.kind,c.facet,c.description
     FROM community_contexts l
     JOIN contexts c ON c.id=l.context_id
     WHERE l.community_id=? AND c.active=1
     ORDER BY CASE c.kind WHEN 'place' THEN 0 WHEN 'region' THEN 1 WHEN 'language' THEN 2 ELSE 3 END, c.title`,
    communityId,
  )
}

/** Attaches up to 3 active public place/region/language contexts to an Aksara post so Percakapan tabs light up. */
function tagPostContexts(store: EtnosCore, postId: string, communityId: string, agentId: string, textBody: string, extraCtxIds: string[] = []) {
  const now = store.clock()
  const ids = new Set<string>(extraCtxIds)
  if (ids.size < 3) {
    const hay = textBody.toLowerCase()
    const places = store.all<{ id: string; title: string; slug: string }>(
      "SELECT id,title,slug FROM contexts WHERE active=1 AND kind IN ('place','region') ORDER BY length(title) DESC LIMIT 200",
    )
    for (const p of places) {
      if (ids.size >= 3) break
      const name = p.title.toLowerCase()
      if (name.length < 4 || name === 'papua' || name === 'puncak') continue
      if (hay.includes(name)) ids.add(p.id)
    }
  }
  for (const ctxId of [...ids].slice(0, 3)) {
    store.run("INSERT OR IGNORE INTO record_contexts VALUES('post',?,?,?,?)", postId, ctxId, agentId, now)
  }
  if (ids.size) store.invalidatePublicContext(communityId)
}

async function readNews(fetcher: typeof fetch, placeSlug?: string): Promise<NewsItem[]> {
  const params = new URLSearchParams({ limit: '12' })
  if (placeSlug) params.set('place', placeSlug)
  const res = await publicNews(fetcher, params)
  if (!res.ok) return []
  const feed = (await res.json()) as NewsFeed
  return feed.available && Array.isArray(feed.items) ? feed.items : []
}

function recentAgentPosts(store: EtnosCore, communityId: string, agentId: string, sinceMs: number): string[] {
  return store
    .all<{ text: string }>(
      'SELECT text FROM posts WHERE community_id=? AND author_id=? AND created>? AND deleted=0 ORDER BY created DESC LIMIT 40',
      communityId,
      agentId,
      store.clock() - sinceMs,
    )
    .map((r) => r.text)
}

type Voiced = { text: string; model: string; inputTokens: number; outputTokens: number }

/** Refuses a program run once Aksara already wrote DAILY_POSTS posts in this community in the last 24 hours. */
function checkDailyPosts(store: EtnosCore, communityId: string, agentId: string) {
  const n = store.get<{ n: number }>('SELECT count(*) n FROM posts WHERE community_id=? AND author_id=? AND parent_id IS NULL AND created>? AND deleted=0', communityId, agentId, store.clock() - 86400000)!.n
  if (n >= DAILY_POSTS) throw new Fault(422, 'Aksara sudah cukup menulis di komunitas ini hari ini')
}

/**
 * Writes one short post in Aksara's voice. The model gets one retry with the gate's
 * reasons; after that the deterministic fallback is used if it passes the gate.
 * Returns an empty text when nothing passes, so the caller stays quiet.
 */
async function writeVoiced(
  models: Models | undefined,
  reserveModel: () => void,
  o: { task: string; data: unknown; basis: string; recent: string[]; sensitive?: boolean; fallback: string; maxChars?: number },
): Promise<Voiced> {
  let model = 'model-free'
  let inputTokens = 0
  let outputTokens = 0
  if (models) {
    let reasons: string[] = []
    for (let attempt = 0; attempt < 2; attempt++) {
      reserveModel()
      const reply = await models.chat({
        purpose: 'fast',
        maxTokens: 300,
        temperature: 0.5,
        messages: [
          { role: 'system', content: AKSARA_VOICE + ' ' + o.task + (o.sensitive ? ' ' + SENSITIVE_RULE : '') },
          { role: 'user', content: JSON.stringify(o.data) + (reasons.length ? '\n\nTulisan sebelumnya ditolak karena ' + reasons.join('; ') + '. Tulis ulang.' : '') },
        ],
      })
      model = reply.model
      inputTokens += reply.inputTokens
      outputTokens += reply.outputTokens
      const text = tidyPost(cleanProse(reply.text))
      const gate = gateAksaraPost(text, o.basis, o.recent, o.maxChars)
      if (gate.ok) return { text, model, inputTokens, outputTokens }
      reasons = gate.reasons
    }
    model += ':fallback'
  }
  const fallback = tidyPost(o.fallback)
  const ok = gateAksaraPost(fallback, o.basis, o.recent, o.maxChars).ok
  return { text: ok ? fallback : '', model: models ? model : 'model-free', inputTokens, outputTokens }
}

/** 1. Kabar harian: one news story per post, written in Aksara's voice, with the story as a link card. */
async function runKabarHarian(
  store: EtnosCore,
  target: AutoTarget,
  deps: AutoDeps,
  reserveModel: () => void,
): Promise<AutoPrepared> {
  checkDailyPosts(store, target.communityId, target.agentId)
  const fetcher = deps.newsFetcher ?? deps.fetcher ?? fetch
  const labels = communityPlaces(store, target.communityId)
  const placeLabels = labels.filter((l) => l.kind === 'place' || l.kind === 'region')

  let items: NewsItem[] = []
  for (const p of placeLabels.slice(0, 2)) {
    const found = await readNews(fetcher, p.slug)
    if (found.length) { items = found; break }
  }
  if (!items.length) items = await readNews(fetcher)

  const recent = recentAgentPosts(store, target.communityId, target.agentId, THREE_DAYS)
  const postedUrls = new Set(
    store
      .all<{ url: string | null }>("SELECT json_extract(content,'$.url') url FROM posts WHERE community_id=? AND author_id=? AND created>? AND deleted=0", target.communityId, target.agentId, store.clock() - THREE_DAYS)
      .map((r) => r.url ?? ''),
  )
  const fresh = items.filter((item) => !postedUrls.has(item.url) && !recent.some((t) => t.includes(item.url) || t.includes(item.title.slice(0, 40))))
  if (!fresh.length) throw new Fault(422, 'Belum ada kabar baru untuk ditulis hari ini')

  // One story: multi-source clusters first, then the freshest. A heavy story is only chosen when nothing lighter is new.
  const ranked = [...fresh].sort((a, b) => (b.sourceCount - a.sourceCount) || (Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0))
  const story = ranked.find((c) => !isSensitive(c.title, c.summary)) ?? ranked[0]
  const sensitive = isSensitive(story.title, story.summary)
  const places = story.places.map((p) => p.name).slice(0, 4)
  const basis = [story.title, story.summary, ...places, target.communityTitle].join(' ')

  const voiced = await writeVoiced(await deps.models?.(), reserveModel, {
    task: sensitive
      ? 'Tulis tentang satu berita di bawah.'
      : 'Tulis tentang satu berita di bawah. Ceritakan intinya dengan kata-katamu sendiri, lalu kalau cocok tutup dengan satu pertanyaan ringan untuk orang yang tinggal di tempat itu. Tautan berita akan tampil sebagai kartu di bawah postingan, jadi jangan menulis "baca selengkapnya".',
    data: { komunitas: target.communityTitle, judul: story.title, ringkasan: story.summary.slice(0, 600), tempat: places, jumlahSumber: story.sourceCount },
    basis,
    recent,
    sensitive,
    fallback: sensitive ? `${story.title}. Sa taruh laporannya di bawah.` : `${story.title}. Ko tahu perkembangannya di sana?`,
  })
  if (!voiced.text) throw new Fault(422, 'Tulisan kabar belum lolos pemeriksaan mutu')

  return {
    model: voiced.model === 'model-free' ? 'model-free:kabar-harian' : voiced.model,
    inputTokens: voiced.inputTokens,
    outputTokens: voiced.outputTokens,
    commit: () => {
      const created = store.createPost(target.agentId, target.communityId, voiced.text, undefined, target.postingMandateId ?? undefined, { content: { url: story.url } })
      tagPostContexts(store, created.id, target.communityId, target.agentId, `${voiced.text} ${story.title}`, placeLabels.slice(0, 1).map((p) => p.id))
      return { resultKind: 'post', resultId: created.id }
    },
  }
}

/** Picks the next active public context without a published wiki article, skipping entries tried in the last 7 days. */
export function pickResearchTarget(store: EtnosCore, communityId: string): CtxRow | null {
  const cutoff = store.clock() - SEVEN_DAYS
  const labels = communityPlaces(store, communityId)
  const scopeIds = labels.map((l) => l.id)

  // Candidate query: active public contexts of kind region/place/language that have no published wiki page attached
  // and no recent research attempt in this community.
  const candidates = store.all<CtxRow & { in_scope: number }>(
    `SELECT c.id,c.slug,c.title,c.kind,c.facet,c.description,
      CASE
        WHEN c.id IN (SELECT value FROM json_each(?)) THEN 1
        WHEN EXISTS(SELECT 1 FROM context_parents p WHERE p.context_id=c.id AND p.parent_id IN (SELECT value FROM json_each(?))) THEN 1
        ELSE 0
      END in_scope
     FROM contexts c
     WHERE c.active=1
       AND c.kind IN ('region','place','language')
       AND NOT EXISTS(
         SELECT 1 FROM record_contexts rc
         JOIN wiki_pages w ON w.id=rc.record_id
         JOIN communities cm ON cm.id=w.community_id
         WHERE rc.record_kind='wiki' AND rc.context_id=c.id AND cm.visibility='public' AND w.draft=0 AND w.revision_id IS NOT NULL
       )
       AND NOT EXISTS(
         SELECT 1 FROM wiki_pages w
         WHERE w.community_id=? AND lower(w.title)=lower(c.title) AND (w.revision_id IS NOT NULL OR w.draft=0)
       )
       AND NOT EXISTS(
         SELECT 1 FROM aksara_research_log l
         WHERE l.community_id=? AND l.target_slug=c.slug AND l.attempted>?
       )
     ORDER BY in_scope DESC,
       CASE c.kind WHEN 'region' THEN 0 WHEN 'place' THEN 1 ELSE 2 END,
       CASE c.facet
         WHEN 'customary-region' THEN 0 WHEN 'wilayah-adat' THEN 0
         WHEN 'province' THEN 1 WHEN 'provinsi' THEN 1
         WHEN 'regency' THEN 2 WHEN 'kabupaten' THEN 2
         WHEN 'city' THEN 3 WHEN 'kota' THEN 3
         ELSE 4
       END,
       c.title
     LIMIT 12`,
    JSON.stringify(scopeIds),
    JSON.stringify(scopeIds),
    communityId,
    communityId,
    cutoff,
  )
  return candidates[0] ?? null
}

/** 2. Riset Ensiklopedia: fetches verified public sources for an empty entry, writes & checks prose, publishes to live-wiki, and queues Periksa cards. */
async function runRisetEnsiklopedia(
  store: EtnosCore,
  target: AutoTarget,
  deps: AutoDeps,
  reserveModel: () => void,
): Promise<AutoPrepared> {
  const fetcher = deps.fetcher ?? fetch
  const ctx = pickResearchTarget(store, target.communityId)
  if (!ctx) throw new Fault(422, 'Semua entri utama dalam cakupan komunitas ini sudah memiliki halaman atau baru diperiksa')

  const term = papuaSearchTerm(ctx)
  const sources: FetchedSource[] = []
  const idWiki = await fetchWikipedia('id', term, ctx, fetcher)
  if (idWiki) sources.push(idWiki)
  if (sources.length === 0 || (idWiki && idWiki.sentences.length < 4)) {
    const enWiki = await fetchWikipedia('en', ctx.title, ctx, fetcher)
    if (enWiki && !sources.some((s) => s.url === enWiki.url)) sources.push(enWiki)
  }

  if (!sources.length) {
    store.tx(() => {
      store.run(
        'INSERT INTO aksara_research_log(community_id,target_slug,status,page_id,attempted) VALUES(?,?,?,NULL,?) ON CONFLICT(community_id,target_slug) DO UPDATE SET status=excluded.status,attempted=excluded.attempted',
        target.communityId,
        ctx.slug,
        'no-source',
        store.clock(),
      )
    })
    throw new Fault(422, `Belum ditemukan sumber terbuka yang dapat diverifikasi untuk ${ctx.title}`)
  }

  const citations = sources.map((s) => s.url)
  const basis: PageBasis[] = []
  sources.forEach((src, idx) => {
    for (const sentence of src.sentences.slice(0, 7)) {
      basis.push({ source: idx + 1, text: sentence.slice(0, 680) })
    }
  })

  const models = await deps.models?.()
  let articleText = ''
  let usedModel = 'model-free:verbatim-seed'
  let inputTokens = 0
  let outputTokens = 0

  if (models) {
    const buildMessages = (repair?: string[]) => [
      {
        role: 'system' as const,
        content:
          'Kamu adalah Aksara, penyusun draf awal Ensiklopedia ETNOS. ' +
          'Tulis artikel ensiklopedia singkat (2 sampai 4 paragraf) dalam bahasa Indonesia yang jelas, netral, dan tanpa tanda pisah panjang (em dash). ' +
          'Gunakan HANYA fakta dari kalimat sumber bernomor di bawah. Setiap paragraf wajib diakhiri nomor sumber seperti [1] atau [1,2]. ' +
          'Setiap nama diri dan angka harus sama persis dengan yang ada di kalimat sumber. Jangan menambah fakta, tanggal, atau tautan di luar sumber.',
      },
      {
        role: 'user' as const,
        content:
          `Judul entri: ${ctx.title} (${ctx.kind}${ctx.facet ? ' / ' + ctx.facet : ''})\n\n` +
          'Kalimat sumber terverifikasi:\n' +
          basis.map((b, i) => `${i + 1}. [sumber ${b.source}] ${b.text}`).join('\n') +
          (repair?.length
            ? `\n\nDraf sebelumnya gagal pemeriksaan karena ada kata/angka di luar sumber (${repair.join(', ')}) atau paragraf tanpa rujukan [1]. Tulis ulang tanpa kata tersebut dan pastikan setiap paragraf diakhiri [1] atau [2].`
            : ''),
      },
    ]

    reserveModel()
    const reply = await models.chat({
      purpose: 'synthesis',
      maxTokens: 1200,
      temperature: 0.15,
      messages: buildMessages(),
    })
    usedModel = reply.model
    inputTokens += reply.inputTokens
    outputTokens += reply.outputTokens
    const candidate = cleanProse(reply.text).replace(/https?:\/\/\S+/g, '').trim()
    const check = checkPage(candidate, basis, citations.length, citations)
    if (check.ok && candidate.length >= 120) {
      articleText = candidate
    } else {
      // Retry once with exact checkPage feedback.
      reserveModel()
      const retry = await models.chat({
        purpose: 'synthesis',
        maxTokens: 1200,
        temperature: 0.1,
        messages: buildMessages([...check.unknown.slice(0, 12), ...(check.uncited ? ['paragraf tanpa [1]'] : [])]),
      })
      usedModel = retry.model
      inputTokens += retry.inputTokens
      outputTokens += retry.outputTokens
      const candidate2 = cleanProse(retry.text).replace(/https?:\/\/\S+/g, '').trim()
      const check2 = checkPage(candidate2, basis, citations.length, citations)
      if (check2.ok && candidate2.length >= 120) {
        articleText = candidate2
      }
    }
  }

  // Deterministic verbatim fallback if model-free or if verification rejected model prose.
  if (!articleText) {
    const grouped = sources.map((src, idx) => `${src.sentences.slice(0, 3).join(' ')} [${idx + 1}]`)
    articleText = grouped.join('\n\n')
    usedModel = models ? `${usedModel}:verbatim-fallback` : 'model-free:verbatim-seed'
  }

  const wiki = new Wiki(store)
  const periksa = new Periksa(store)
  const pageTitle = ctx.title
  const link = `${store.base}/wiki/${ctx.slug}`

  // The entry is shared at most once a day, and only within the daily post limit, so a run of
  // interval drafts never fills the feed. The page itself is published either way.
  let announce: Voiced | null = null
  const announcedToday = store.get(
    "SELECT 1 FROM posts WHERE community_id=? AND author_id=? AND deleted=0 AND created>? AND json_extract(content,'$.url') LIKE ?",
    target.communityId, target.agentId, store.clock() - 20 * 3600000, `${store.base}/wiki/%`,
  )
  let underCap = true
  try { checkDailyPosts(store, target.communityId, target.agentId) } catch { underCap = false }
  if (target.postingMandateId && !announcedToday && underCap) {
    const facts = basis.slice(0, 4).map((b) => b.text)
    const voiced = await writeVoiced(models, reserveModel, {
      task:
        'Sa baru menulis catatan awal Ensiklopedia dari sumber terbuka, dan belum ada orang yang memeriksanya. ' +
        'Tulis posting singkat yang menyebut satu hal menarik dari fakta di bawah dengan kata-katamu sendiri (jangan menyalin kalimat sumber), ' +
        'lalu minta orang yang tahu dari tempat itu untuk menambah atau membetulkan. Kartu entri akan tampil di bawah postingan.',
      data: { entri: ctx.title, jenis: ctx.kind, fakta: facts },
      basis: [ctx.title, ...facts].join(' '),
      recent: recentAgentPosts(store, target.communityId, target.agentId, SEVEN_DAYS),
      fallback: `Sa baru tulis catatan awal tentang ${ctx.title} dari sumber terbuka, dan belum ada yang periksa. Kalau ko tahu dari tempat itu, tolong tambah atau betulkan.`,
    })
    inputTokens += voiced.inputTokens
    outputTokens += voiced.outputTokens
    if (voiced.text) announce = voiced
  }

  return {
    model: usedModel,
    inputTokens,
    outputTokens,
    commit: () => {
      const proposed = wiki.proposePage(
        target.agentId,
        target.communityId,
        pageTitle,
        {
          text: articleText,
          citations,
          language: 'id',
          perspective: 'Draf awal otomatis dari sumber terbuka, belum ditinjau manusia',
        },
        target.editorialMandateId ?? undefined,
        basis,
      )

      // Link the wiki page directly to the target Ensiklopedia context so /wiki/<slug> picks it up right away.
      store.run("INSERT OR IGNORE INTO record_contexts VALUES('wiki',?,?,?,?)", proposed.pageId, ctx.id, target.agentId, store.clock())
      store.run(
        'INSERT INTO aksara_research_log(community_id,target_slug,status,page_id,attempted) VALUES(?,?,?,?,?) ON CONFLICT(community_id,target_slug) DO UPDATE SET status=excluded.status,page_id=excluded.page_id,attempted=excluded.attempted',
        target.communityId,
        ctx.slug,
        'live' in proposed && proposed.live ? 'published' : 'proposed',
        proposed.pageId,
        store.clock(),
      )
      store.invalidatePublicContext(target.communityId)

      // Share the new live entry as a short post with the entry as its card.
      const isLive = 'live' in proposed && proposed.live
      if (isLive && announce && target.postingMandateId) {
        try {
          const sources = citations
            .filter((url) => /^https?:\/\//.test(url))
            .slice(0, 4)
            .map((url) => ({ title: sourceLabel(url), url }))
          const post = store.createPost(target.agentId, target.communityId, announce.text, undefined, target.postingMandateId, {
            content: { url: link, ...(sources.length ? { sources } : {}) },
          })
          tagPostContexts(store, post.id, target.communityId, target.agentId, announce.text, [ctx.id])
        } catch {
          // Posting budget or mandate limit must not roll back a valid wiki entry.
        }
      }

      // Seed up to 2 verification cards into Periksa from the verified basis quotes.
      for (const q of basis.slice(0, 2)) {
        const statement = q.text.length > 440 ? q.text.slice(0, 437) + '...' : q.text
        const exists = store.get('SELECT 1 FROM claims WHERE community_id=? AND lower(statement)=lower(?) AND state<>?', target.communityId, statement, 'withdrawn')
        if (exists) continue
        try {
          periksa.proposeAsAgent(target.agentId, target.communityId, {
            kind: ctx.kind === 'language' ? 'word' : 'place',
            subject: ctx.title.slice(0, 120),
            statement,
            evidence: [{ text: `Dari ${citations[q.source - 1] ?? 'sumber terbuka'}` }],
          })
        } catch {
          break
        }
      }

      return {
        resultKind: 'wiki',
        resultId: isLive ? ctx.slug : proposed.pageId,
      }
    },
  }
}

/** 3. Usulan Periksa: fills the community's Periksa swipe deck with Kata hari ini or unverified wiki claims. */
async function runUsulanPeriksa(
  store: EtnosCore,
  target: AutoTarget,
): Promise<AutoPrepared> {
  const openCount = store.get<{ n: number }>("SELECT count(*) n FROM claims WHERE community_id=? AND state='open'", target.communityId)!.n
  if (openCount >= 15) throw new Fault(422, 'Antrean Periksa komunitas ini masih cukup penuh')

  const periksa = new Periksa(store)
  const kamus = new Kamus(store, kamusLexicon())
  const lang = kamus.settings(target.communityId)

  type DraftClaim = { kind: 'word' | 'wiki'; subject: string; statement: string; evidenceText: string }
  const drafts: DraftClaim[] = []

  if (lang.language) {
    const conceptList = (concepts as { concepts?: { id: string; id_gloss?: string; gloss?: string }[] }).concepts ?? []
    for (const c of conceptList) {
      if (drafts.length >= 3) break
      const indo = (c.id_gloss || c.gloss || '').trim()
      if (!indo) continue
      if (store.get('SELECT 1 FROM claims WHERE community_id=? AND subject=? AND state<>?', target.communityId, indo, 'withdrawn')) continue
      drafts.push({
        kind: 'word',
        subject: indo.slice(0, 120),
        statement: `Apakah kamu tahu kata dalam bahasa ${lang.languageName} untuk "${indo}"? Pilih Jawaban lain untuk menuliskannya.`,
        evidenceText: `Daftar kosakata inti Concepticon (${c.id})`,
      })
    }
  }

  if (drafts.length < 3) {
    const pages = store.all<{ id: string; title: string; text: string; citations: string }>(
      `SELECT w.id,w.title,r.text,r.citations
       FROM wiki_pages w
       JOIN wiki_revisions r ON r.id=w.revision_id
       LEFT JOIN wiki_reviews rv ON rv.revision_id=r.id
       WHERE w.community_id=? AND w.draft=0
       ORDER BY CASE WHEN rv.state='unreviewed' THEN 0 ELSE 1 END, r.created DESC
       LIMIT 8`,
      target.communityId,
    )
    for (const p of pages) {
      if (drafts.length >= 3) break
      const clean = p.text.replace(/\[[\d,\s]+\]/g, '').replace(/[#*_`]/g, '')
      const sentences = splitSentences(clean)
      const cites = (JSON.parse(p.citations) as string[])[0] ?? `${store.base}/wiki/${p.id}`
      let fromPage = 0
      for (const s of sentences) {
        if (drafts.length >= 3 || fromPage >= 2) break
        if (store.get('SELECT 1 FROM claims WHERE community_id=? AND lower(statement)=lower(?) AND state<>?', target.communityId, s, 'withdrawn')) continue
        drafts.push({
          kind: 'wiki',
          subject: p.title.slice(0, 120),
          statement: s.slice(0, 480),
          evidenceText: `Halaman Ensiklopedia ${p.title} (${cites})`,
        })
        fromPage++
      }
    }
  }

  if (!drafts.length) throw new Fault(422, 'Belum ada bahan klaim baru untuk kartu Periksa hari ini')

  return {
    model: 'model-free:periksa-deck',
    inputTokens: 0,
    outputTokens: 0,
    commit: () => {
      let added = 0
      for (const d of drafts) {
        try {
          periksa.proposeAsAgent(target.agentId, target.communityId, {
            kind: d.kind,
            subject: d.subject,
            statement: d.statement,
            evidence: [{ text: d.evidenceText }],
          })
          added++
        } catch {
          break
        }
      }
      if (!added) throw new Fault(422, 'Belum ada bahan klaim baru untuk kartu Periksa hari ini')
      return { resultKind: 'periksa', resultId: target.communityId }
    },
  }
}

/** 4. Pertanyaan harian: posts one grounded question about an unreviewed entry, a place gap, or fresh news. */
async function runPertanyaanHarian(
  store: EtnosCore,
  target: AutoTarget,
  deps: AutoDeps,
  reserveModel: () => void,
): Promise<AutoPrepared> {
  checkDailyPosts(store, target.communityId, target.agentId)
  const recent = recentAgentPosts(store, target.communityId, target.agentId, THREE_DAYS)
  const labels = communityPlaces(store, target.communityId)
  const placeIds = labels.filter((l) => l.kind === 'place' || l.kind === 'region').map((l) => l.id)

  // Prefer an unreviewed wiki page not recently posted about, else an unwritten place entry, else fresh news.
  const pages = store.all<{ id: string; title: string; text: string; slug: string | null }>(
    `SELECT w.id,w.title,r.text,
       (SELECT c.slug FROM record_contexts rc JOIN contexts c ON c.id=rc.context_id WHERE rc.record_kind='wiki' AND rc.record_id=w.id AND c.active=1 LIMIT 1) slug
     FROM wiki_pages w
     JOIN wiki_revisions r ON r.id=w.revision_id
     LEFT JOIN wiki_reviews rv ON rv.revision_id=r.id
     WHERE w.community_id=? AND w.draft=0
     ORDER BY CASE WHEN rv.state='unreviewed' THEN 0 ELSE 1 END, r.created DESC
     LIMIT 6`,
    target.communityId,
  )
  const postedUrls = new Set(
    store
      .all<{ url: string | null }>("SELECT json_extract(content,'$.url') url FROM posts WHERE community_id=? AND author_id=? AND created>? AND deleted=0", target.communityId, target.agentId, store.clock() - THREE_DAYS)
      .map((r) => r.url ?? ''),
  )
  const freshPage = pages.find((p) => !postedUrls.has(`${store.base}/wiki/${p.slug ?? p.id}`) && !recent.some((r) => r.includes(p.title))) ?? null
  const gap = !freshPage ? pickResearchTarget(store, target.communityId) : null
  const fetcher = deps.newsFetcher ?? deps.fetcher ?? fetch
  const news = !freshPage && !gap ? await readNews(fetcher, labels[0]?.slug) : []
  const topNews = news.find((n) => !isSensitive(n.title, n.summary) && !postedUrls.has(n.url) && !recent.some((r) => r.includes(n.url) || r.includes(n.title.slice(0, 40))))

  let topicTitle = ''
  let sourceLink = ''
  let contextSnippet = ''
  let tagIds: string[] = placeIds.slice(0, 1)

  if (freshPage) {
    topicTitle = freshPage.title
    sourceLink = `${store.base}/wiki/${freshPage.slug ?? freshPage.id}`
    contextSnippet = freshPage.text.replace(/\[[\d,\s]+\]/g, '').slice(0, 600)
  } else if (gap) {
    topicTitle = gap.title
    sourceLink = `${store.base}/wiki/${gap.slug}`
    contextSnippet = gap.description || `${gap.title} belum memiliki catatan lokal di Ensiklopedia.`
    tagIds = [gap.id]
  } else if (topNews) {
    topicTitle = topNews.title
    sourceLink = topNews.url
    contextSnippet = topNews.summary.slice(0, 600)
  } else {
    throw new Fault(422, 'Belum ada topik pertanyaan baru untuk hari ini')
  }

  const pageCitations = freshPage
    ? (JSON.parse(store.get<{ citations: string }>('SELECT r.citations FROM wiki_pages w JOIN wiki_revisions r ON r.id=w.revision_id WHERE w.id=?', freshPage.id)?.citations ?? '[]') as string[])
        .filter((u) => /^https?:\/\//.test(u) && !u.startsWith(store.base))
        .slice(0, 4)
        .map((url) => ({ title: sourceLabel(url), url }))
    : []

  const voiced = await writeVoiced(await deps.models?.(), reserveModel, {
    task: topNews
      ? 'Tulis satu pertanyaan ringan tentang berita di bawah untuk orang yang tinggal di tempat itu. Sebut dulu intinya dalam satu kalimat, lalu tanya satu hal yang bisa dijawab dari pengalaman sehari-hari.'
      : 'Catatan Ensiklopedia di bawah masih tipis. Cari satu hal yang belum ada di catatan itu (misalnya nama lokal, cara orang memakainya, cerita asal-usulnya, musim, atau siapa yang paling tahu), ' +
        'lalu tanyakan hal itu secara spesifik kepada orang yang tahu dari tempat itu. Jangan bertanya umum seperti "apa yang ko tahu tentang ini". Kartu entri akan tampil di bawah postingan.',
    data: { komunitas: target.communityTitle, topik: topicTitle, catatan: contextSnippet },
    basis: [topicTitle, contextSnippet, target.communityTitle].join(' '),
    recent,
    fallback: topNews
      ? `${topicTitle}. Ko tahu perkembangannya di sana?`
      : `Catatan tentang ${topicTitle} di Ensiklopedia masih tipis. Kalau ko tahu nama lokalnya atau ceritanya dari tempat itu, tulis di sini.`,
  })
  if (!voiced.text) throw new Fault(422, 'Pertanyaan hari ini belum lolos pemeriksaan mutu')

  return {
    model: voiced.model === 'model-free' ? 'model-free:pertanyaan-harian' : voiced.model,
    inputTokens: voiced.inputTokens,
    outputTokens: voiced.outputTokens,
    commit: () => {
      const created = store.createPost(target.agentId, target.communityId, voiced.text, undefined, target.postingMandateId ?? undefined, {
        content: { url: sourceLink, ...(pageCitations.length ? { sources: pageCitations } : {}) },
      })
      tagPostContexts(store, created.id, target.communityId, target.agentId, voiced.text, tagIds)
      return { resultKind: 'post', resultId: created.id }
    },
  }
}

export async function runAutonomousSkill(
  store: EtnosCore,
  skill: AutonomousSkill,
  target: AutoTarget,
  deps: AutoDeps,
  reserveModel: () => void,
): Promise<AutoPrepared> {
  if (store.community(target.communityId).visibility !== 'public') {
    throw new Fault(403, 'Autonomous Aksara programs run on public communities only')
  }
  if (skill === 'kabar-harian') return runKabarHarian(store, target, deps, reserveModel)
  if (skill === 'riset-ensiklopedia') return runRisetEnsiklopedia(store, target, deps, reserveModel)
  if (skill === 'usulan-periksa') return runUsulanPeriksa(store, target)
  return runPertanyaanHarian(store, target, deps, reserveModel)
}
