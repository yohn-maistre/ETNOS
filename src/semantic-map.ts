/** Peta Semantik Papua: Papuan Colexification Graph + Multilingual Semantic Map.
 *
 * Combines two complementary views of how languages of Tanah Papua organize core meaning:
 * 1. Real Papuan colexifications: pairs of Leipzig-Jakarta 100 concepts expressed by the SAME
 *    lemma in public, non-sensitive community Kamus entries or published licensed seed wordlists
 *    (e.g. Ekari `noyawü` = makan/minum, `buna` = hitam/tua, `kipo` = tangan/kaki, `wagii` = membuat/memukul).
 * 2. Semantic concept space: Workers AI `@cf/baai/bge-m3` multilingual embeddings (when `embedTexts`
 *    is available) with a deterministic zero-AI semantic-domain + trigram + colexification fallback,
 *    indexed via `src/vector-index.ts`, projected to 2D via deterministic PCA, and grouped via `leiden()`.
 *
 * Hard privacy invariant:
 * - Only public communities (`c.visibility = 'public'`), non-sensitive entries (`e.sensitive = 0`),
 *   non-restricted voice clips, and published seed lexicons are ever read.
 * - Private rooms, sensitive words, and rejected/withdrawn claims NEVER enter colexifications or embeddings. */

import conceptsFile from '../seed/kamus/leipzig-jakarta-100.json' with { type: 'json' }
import tanahPapua from './catalogues/tanah-papua.json' with { type: 'json' }
import { EtnosCore } from './core.ts'
import { norm, type KamusLexicon } from './kamus.ts'
import { leiden, type WeightedEdge } from './knowledge-graph.ts'
import { buildIndex, normalise, search as vectorSearch } from './vector-index.ts'

export type Embedder = (texts: string[]) => Promise<number[][] | null>

export type SemanticNodeSample = {
  lemma: string
  languageCode: string
  languageName: string
  origin: 'community' | 'seed'
}

export type SemanticNode = {
  n: number
  id: string
  english: string
  wordClass: string
  x: number
  y: number
  cluster: number
  domain: string
  wordsCount: number
  voiceCount: number
  colexDegree: number
  samples: SemanticNodeSample[]
}

export type ColexExample = {
  lemma: string
  languageCode: string
  languageName: string
  gloss: string
  origin: 'community' | 'seed'
}

export type SemanticEdge = {
  source: number
  target: number
  kind: 'colexification' | 'semantic'
  weight: number
  examples: ColexExample[]
}

export type SemanticCluster = {
  id: number
  label: string
  color: string
  count: number
}

export type SemanticMapResponse = {
  mode: 'bge-m3' | 'deterministic'
  source: string
  licence: string
  stats: {
    concepts: number
    colexificationEdges: number
    semanticEdges: number
    clusters: number
    languagesUsed: number
    publicEntriesUsed: number
  }
  clusters: SemanticCluster[]
  nodes: SemanticNode[]
  edges: SemanticEdge[]
}

type ConceptRow = {
  n: number
  concepticon: number
  gloss: string
  english: string
  id: string
  class: string
}

const CONCEPTS = conceptsFile.concepts as ConceptRow[]

const LANG_NAME_BY_CODE = new Map<string, string>()
for (const e of tanahPapua.entries as Array<{ slug: string; title: string; kind: string; aliases?: string[] }>) {
  if (e.kind !== 'language') continue
  const alias = (e.aliases ?? []).find((a) => a.startsWith('glottocode:'))
  if (alias) LANG_NAME_BY_CODE.set(alias.slice(11), e.title)
}

// Function words that occur inside explanatory glosses ("di dalam rumah", "yang ini") and would cause noisy colexification pairs.
const COLEX_STOP = new Set([
  'di',
  'di dalam',
  'ke',
  'dari',
  'ini',
  'itu',
  'apa',
  'siapa',
  'tidak',
  'bukan',
  'dan',
  'atau',
  'yang',
  'untuk',
  'pada',
  'in',
  'this',
  'what',
  'who',
  'not',
  'one',
  'far',
  'yesterday',
])

// Conceptual domains for deterministic semantic coordinates and cluster fallback labelling.
const DOMAIN_DEFS: Array<{ key: string; label: string; concepts: Set<string> }> = [
  {
    key: 'alam',
    label: 'Alam & Unsur',
    concepts: new Set([
      'api', 'air', 'asap', 'tanah', 'batu', 'pasir', 'garam', 'angin', 'hujan', 'bintang', 'malam', 'bayangan', 'kayu', 'daun', 'akar', 'rumput', 'abu', 'awan',
    ]),
  },
  {
    key: 'tubuh',
    label: 'Tubuh & Hidup',
    concepts: new Set([
      'hidung', 'mulut', 'lidah', 'gigi', 'mata', 'telinga', 'rambut', 'tangan', 'kaki', 'lengan', 'paha', 'lutut', 'leher', 'dada', 'pusar', 'kulit', 'daging', 'darah', 'tulang', 'hati', 'tanduk', 'ekor', 'sayap', 'telur', 'tulang', 'susu', 'kuku',
    ]),
  },
  {
    key: 'makhluk',
    label: 'Makhluk Hidup',
    concepts: new Set([
      'burung', 'ikan', 'anjing', 'kutu', 'lalat', 'semut', 'ular', 'cacing',
    ]),
  },
  {
    key: 'gerak',
    label: 'Gerak & Tindakan',
    concepts: new Set([
      'pergi', 'datang', 'lari', 'terbang', 'berdiri', 'duduk', 'jatuh', 'memikul', 'mengambil', 'memberi', 'membuat', 'memukul', 'menggiling', 'mengikat', 'mengisap', 'mengunyah', 'menggigit', 'meniup (angin)', 'membakar', 'bersembunyi', 'mencuci', 'memotong',
    ]),
  },
  {
    key: 'makan-indera',
    label: 'Makan & Indera',
    concepts: new Set([
      'makan', 'minum', 'melihat', 'mendengar', 'tahu', 'tertawa', 'menangis', 'tidur', 'mati', 'berkata', 'nama',
    ]),
  },
  {
    key: 'sifat',
    label: 'Sifat & Ukuran',
    concepts: new Set([
      'besar', 'kecil', 'panjang', 'lebar', 'tebal', 'berat', 'keras', 'baru', 'tua', 'baik', 'pahit', 'manis', 'hitam', 'merah', 'putih', 'kuning', 'hijau', 'panas', 'dingin', 'penuh', 'kering', 'basah', 'dekat', 'jauh',
    ]),
  },
  {
    key: 'orang-benda',
    label: 'Orang, Rumah & Benda',
    concepts: new Set([
      'anak', 'orang', 'ibu', 'ayah', 'rumah', 'pintu', 'tali', 'jalan', 'api', 'nama', 'kemarin', 'hari', 'satu', 'dua',
    ]),
  },
]

const CLUSTER_PALETTE = [
  '#0f766e', // teal
  '#b45309', // amber
  '#2563eb', // blue
  '#9333ea', // purple
  '#be123c', // rose
  '#15803d', // green
  '#4f46e5', // indigo
  '#c2410c', // orange
]

function domainOf(conceptId: string, wordClass: string): string {
  const lower = conceptId.toLowerCase()
  for (const d of DOMAIN_DEFS) {
    if (d.concepts.has(lower)) return d.key
  }
  if (wordClass === 'Verb') return 'gerak'
  if (wordClass === 'Adjective') return 'sifat'
  if (wordClass === 'Noun') return 'orang-benda'
  return 'tugas'
}

function primarySenses(gloss: string | undefined): string[] {
  if (!gloss) return []
  return gloss
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .split(/[;,/]/)
    .map((s) => s.trim().replace(/^to\s+/, ''))
    .filter((s) => s.length >= 2)
}

function senseMatchesTerm(sense: string, term: string): boolean {
  if (sense === term) return true
  const words = sense.split(/\s+/)
  if (words.length > 2) return false
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, 'iu').test(sense)
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function broadGlossMatch(gloss: string, terms: string[]): boolean {
  const g = gloss.toLowerCase()
  for (const t of terms) {
    if (!t) continue
    if (new RegExp(`(^|[^\\p{L}])${escapeRe(t)}($|[^\\p{L}])`, 'iu').test(g)) return true
  }
  return false
}

/** Deterministic 96-dim feature vector combining conceptual domain, grammatical class, character trigrams, and Papuan colexification neighborhood. */
function deterministicVectors(
  concepts: ConceptRow[],
  conceptSamples: Map<number, SemanticNodeSample[]>,
  colexAdj: Map<number, Map<number, number>>,
): Float32Array[] {
  const DIMS = 96
  const DOMAIN_OFFSET = 0 // 8 slots
  const CLASS_OFFSET = 8 // 4 slots
  const TRIGRAM_OFFSET = 12 // 84 hashed trigram slots
  const TRIGRAM_SLOTS = DIMS - TRIGRAM_OFFSET

  const domainKeys = [...DOMAIN_DEFS.map((d) => d.key), 'tugas']
  const classes = ['Noun', 'Verb', 'Adjective', 'Other']

  const base = concepts.map((c) => {
    const v = new Float32Array(DIMS)
    const dIdx = Math.max(0, domainKeys.indexOf(domainOf(c.id, c.class)))
    v[DOMAIN_OFFSET + (dIdx % 8)] += 2.4
    const cIdx = classes.indexOf(c.class)
    v[CLASS_OFFSET + (cIdx >= 0 ? cIdx : 3)] += 1.2

    const sampleText = (conceptSamples.get(c.n) ?? [])
      .slice(0, 6)
      .map((s) => s.lemma)
      .join(' ')
    const text = ` ${c.id.toLowerCase()} ${c.english.toLowerCase()} ${sampleText.toLowerCase()} `
    for (let i = 0; i <= text.length - 3; i++) {
      const tri = text.slice(i, i + 3)
      if (!/[a-z]/.test(tri)) continue
      let h = 2166136261
      for (let k = 0; k < tri.length; k++) {
        h ^= tri.charCodeAt(k)
        h = Math.imul(h, 16777619)
      }
      const slot = TRIGRAM_OFFSET + ((h >>> 0) % TRIGRAM_SLOTS)
      v[slot] += 0.45
    }
    return normalise(v)
  })

  // Blend 1-hop Papuan colexification neighbors so Papuan conceptual links shape the semantic geometry.
  const indexByN = new Map(concepts.map((c, idx) => [c.n, idx]))
  return concepts.map((c, i) => {
    const blended = new Float32Array(base[i]!)
    const nbrs = colexAdj.get(c.n)
    if (nbrs && nbrs.size) {
      for (const [otherN, w] of nbrs) {
        const j = indexByN.get(otherN)
        if (j === undefined) continue
        const alpha = Math.min(0.45, 0.22 * w)
        const other = base[j]!
        for (let d = 0; d < DIMS; d++) blended[d] += alpha * other[d]!
      }
    }
    return normalise(blended)
  })
}

/** Deterministic 2D PCA via centered power iteration (2 principal components). Works cleanly for any vector dimensionality (96 or 1024). */
export function pca2d(vectors: ArrayLike<number>[]): Array<[number, number]> {
  const n = vectors.length
  if (!n) return []
  const dims = vectors[0]!.length
  const mean = new Float64Array(dims)
  for (let i = 0; i < n; i++) {
    const v = vectors[i]!
    for (let d = 0; d < dims; d++) mean[d] += v[d]!
  }
  for (let d = 0; d < dims; d++) mean[d] /= n

  const X: Float64Array[] = vectors.map((v) => {
    const row = new Float64Array(dims)
    for (let d = 0; d < dims; d++) row[d] = v[d]! - mean[d]!
    return row
  })

  const powerComponent = (deflate?: Float64Array): Float64Array => {
    let u = new Float64Array(dims)
    for (let d = 0; d < dims; d++) u[d] = Math.sin((d + 1) * (deflate ? 2.17 : 1.31)) + 0.15
    const normVec = (vec: Float64Array) => {
      let s = 0
      for (let d = 0; d < dims; d++) s += vec[d]! * vec[d]!
      const len = Math.sqrt(s) || 1
      for (let d = 0; d < dims; d++) vec[d] /= len
    }
    if (deflate) {
      let dot = 0
      for (let d = 0; d < dims; d++) dot += u[d]! * deflate[d]!
      for (let d = 0; d < dims; d++) u[d] -= dot * deflate[d]!
    }
    normVec(u)

    for (let iter = 0; iter < 32; iter++) {
      // w = X^T (X u)
      const xu = new Float64Array(n)
      for (let i = 0; i < n; i++) {
        let s = 0
        const row = X[i]!
        for (let d = 0; d < dims; d++) s += row[d]! * u[d]!
        xu[i] = s
      }
      const w = new Float64Array(dims)
      for (let i = 0; i < n; i++) {
        const coeff = xu[i]!
        const row = X[i]!
        for (let d = 0; d < dims; d++) w[d] += coeff * row[d]!
      }
      if (deflate) {
        let dot = 0
        for (let d = 0; d < dims; d++) dot += w[d]! * deflate[d]!
        for (let d = 0; d < dims; d++) w[d] -= dot * deflate[d]!
      }
      normVec(w)
      u = w
    }
    return u
  }

  const pc1 = powerComponent()
  const pc2 = powerComponent(pc1)

  const raw: Array<[number, number]> = X.map((row) => {
    let x = 0
    let y = 0
    for (let d = 0; d < dims; d++) {
      x += row[d]! * pc1[d]!
      y += row[d]! * pc2[d]!
    }
    return [x, y]
  })

  // Normalize cleanly to [-0.92, 0.92] so nodes fit comfortably inside the SVG viewport.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of raw) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  const coords: Array<[number, number]> = raw.map(([x, y]) => [
    Math.round((((x - minX) / spanX) * 1.84 - 0.92) * 1000) / 1000,
    Math.round((((y - minY) / spanY) * 1.84 - 0.92) * 1000) / 1000,
  ])

  // Gentle deterministic repulsion pass so two concepts never sit on top of each other.
  for (let pass = 0; pass < 14; pass++) {
    for (let i = 0; i < coords.length; i++) {
      for (let j = i + 1; j < coords.length; j++) {
        const dx = coords[j]![0] - coords[i]![0]
        const dy = coords[j]![1] - coords[i]![1]
        const dist = Math.hypot(dx, dy)
        const minDist = 0.115
        if (dist < minDist) {
          const ux = dist > 1e-5 ? dx / dist : Math.cos((i * 7 + j * 13) % 360)
          const uy = dist > 1e-5 ? dy / dist : Math.sin((i * 7 + j * 13) % 360)
          const push = (minDist - dist) * 0.42
          coords[i]![0] = Math.max(-0.94, Math.min(0.94, coords[i]![0] - ux * push))
          coords[i]![1] = Math.max(-0.94, Math.min(0.94, coords[i]![1] - uy * push))
          coords[j]![0] = Math.max(-0.94, Math.min(0.94, coords[j]![0] + ux * push))
          coords[j]![1] = Math.max(-0.94, Math.min(0.94, coords[j]![1] + uy * push))
        }
      }
    }
  }
  return coords.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000])
}

export class SemanticMap {
  private store: EtnosCore
  private lexicon: KamusLexicon
  private embedder?: Embedder
  private cached: { fingerprint: string; value: SemanticMapResponse } | null = null

  constructor(store: EtnosCore, lexicon: KamusLexicon, embedder?: Embedder) {
    this.store = store
    this.lexicon = lexicon
    this.embedder = embedder
  }

  private readPublicLexicon() {
    // Strictly public communities + non-sensitive + open/checked/seed entries only.
    const rows = this.store.all<{
      id: string
      community_id: string
      lemma: string
      norm: string
      gloss: string
      language: string | null
      updated: number
    }>(`
      SELECT e.id, e.community_id, e.lemma, e.norm, e.gloss, e.updated,
        COALESCE(NULLIF(ks.language, ''), (
          SELECT substr(a.value, 12) FROM community_contexts cc
          JOIN contexts ctx ON ctx.id = cc.context_id, json_each(ctx.aliases) a
          WHERE cc.community_id = c.id AND cc.role = 'language' AND ctx.kind = 'language' AND ctx.active = 1
            AND a.value LIKE 'glottocode:%' LIMIT 1
        )) language
      FROM kamus_entries e
      JOIN communities c ON c.id = e.community_id
      LEFT JOIN kamus_settings ks ON ks.community_id = c.id
      LEFT JOIN claims cl ON cl.id = e.claim_id
      WHERE c.visibility = 'public'
        AND COALESCE(c.archived, 0) = 0
        AND e.sensitive = 0
        AND e.gloss <> ''
        AND (cl.state IS NULL OR cl.state IN ('open', 'checked'))
        AND e.state IN ('seed', 'proposed')
      ORDER BY e.updated DESC
      LIMIT 2500
    `)

    const voices = this.store.all<{ community_id: string; kamus_norm: string }>(`
      SELECT v.community_id, v.kamus_norm
      FROM voice_clips v
      JOIN communities c ON c.id = v.community_id
      WHERE c.visibility = 'public'
        AND COALESCE(c.archived, 0) = 0
        AND v.kamus_norm IS NOT NULL AND v.kamus_norm <> ''
        AND v.protocol <> 'restricted'
    `)
    const voiceSet = new Set(voices.map((v) => `${v.community_id}:${v.kamus_norm}`))
    return { rows, voiceSet }
  }

  async build(): Promise<SemanticMapResponse> {
    const { rows, voiceSet } = this.readPublicLexicon()
    const fingerprint = `${rows.length}:${rows[0]?.updated ?? 0}:${voiceSet.size}:${this.embedder ? 'ai' : 'det'}`
    if (this.cached && this.cached.fingerprint === fingerprint) {
      return this.cached.value
    }

    const conceptMeta = CONCEPTS.map((c) => {
      const idLow = c.id.toLowerCase()
      const enLow = c.english.toLowerCase().replace(/^to\s+/, '')
      return {
        row: c,
        broadTerms: [idLow, enLow],
        strictTerms: [idLow, enLow].filter((t) => !COLEX_STOP.has(t)),
      }
    })

    const conceptSamples = new Map<number, SemanticNodeSample[]>()
    const conceptLangs = new Map<number, Set<string>>()
    const conceptVoices = new Map<number, number>()
    const languagesUsed = new Set<string>()
    const colexMap = new Map<string, { a: number; b: number; examples: ColexExample[]; langs: Set<string> }>()

    const recordItem = (item: {
      lemma: string
      normLemma: string
      glossId: string
      glossEn?: string
      languageCode: string
      languageName: string
      origin: 'community' | 'seed'
      hasVoice: boolean
    }) => {
      languagesUsed.add(item.languageCode)
      const combinedGloss = [item.glossId, item.glossEn ?? ''].filter(Boolean).join('; ')
      const strictSenses = [...primarySenses(item.glossId), ...primarySenses(item.glossEn)]
      const strictHits: number[] = []

      for (const cm of conceptMeta) {
        const n = cm.row.n
        if (broadGlossMatch(combinedGloss, cm.broadTerms)) {
          let lset = conceptLangs.get(n)
          if (!lset) {
            lset = new Set()
            conceptLangs.set(n, lset)
          }
          if (!lset.has(item.languageCode)) {
            lset.add(item.languageCode)
            const list = conceptSamples.get(n) ?? []
            if (list.length < 8) {
              list.push({
                lemma: item.lemma,
                languageCode: item.languageCode,
                languageName: item.languageName,
                origin: item.origin,
              })
              conceptSamples.set(n, list)
            }
          }
          if (item.hasVoice) {
            conceptVoices.set(n, (conceptVoices.get(n) ?? 0) + 1)
          }
        }

        if (
          cm.strictTerms.length &&
          strictSenses.length &&
          cm.strictTerms.some((t) => strictSenses.some((s) => senseMatchesTerm(s, t)))
        ) {
          strictHits.push(n)
        }
      }

      // Record clean colexifications (ignore hyper-polysemous >5 matches which are usually broad grammatical particles).
      if (strictHits.length >= 2 && strictHits.length <= 5) {
        for (let i = 0; i < strictHits.length; i++) {
          for (let j = i + 1; j < strictHits.length; j++) {
            const a = Math.min(strictHits[i]!, strictHits[j]!)
            const b = Math.max(strictHits[i]!, strictHits[j]!)
            const key = `${a}:${b}`
            let bucket = colexMap.get(key)
            if (!bucket) {
              bucket = { a, b, examples: [], langs: new Set() }
              colexMap.set(key, bucket)
            }
            bucket.langs.add(item.languageCode)
            if (
              bucket.examples.length < 6 &&
              !bucket.examples.some((ex) => ex.languageCode === item.languageCode && norm(ex.lemma) === item.normLemma)
            ) {
              bucket.examples.push({
                lemma: item.lemma,
                languageCode: item.languageCode,
                languageName: item.languageName,
                gloss: item.glossId || item.glossEn || '',
                origin: item.origin,
              })
            }
          }
        }
      }
    }

    // 1. Public non-sensitive community Kamus entries.
    for (const r of rows) {
      if (!r.language) continue
      const languageName = LANG_NAME_BY_CODE.get(r.language) ?? this.lexicon.seeds[r.language]?.language.name ?? r.language
      recordItem({
        lemma: r.lemma,
        normLemma: r.norm,
        glossId: r.gloss,
        languageCode: r.language,
        languageName,
        origin: 'community',
        hasVoice: voiceSet.has(`${r.community_id}:${r.norm}`),
      })
    }

    // 2. Published licensed seed lexicons.
    let seedCount = 0
    for (const [code, seed] of Object.entries(this.lexicon.seeds)) {
      const languageName = LANG_NAME_BY_CODE.get(code) ?? seed.language.name
      for (const e of seed.entries) {
        const lemma = (e.modern || e.lemma || '').trim()
        const glossId = (e.gloss_id || '').trim()
        const glossEn = (e.gloss_en || '').trim()
        if (!lemma || (!glossId && !glossEn)) continue
        seedCount++
        recordItem({
          lemma,
          normLemma: norm(lemma),
          glossId: glossId || glossEn,
          glossEn,
          languageCode: code,
          languageName,
          origin: 'seed',
          hasVoice: false,
        })
      }
    }

    // Build colexification adjacency for vector blending & graph clustering.
    const colexAdj = new Map<number, Map<number, number>>()
    const colexEdges: SemanticEdge[] = []
    for (const bucket of colexMap.values()) {
      // Weight increases with distinct languages and attested lemmas.
      const weight = Math.round((bucket.langs.size * 1.0 + Math.min(3, bucket.examples.length) * 0.25) * 100) / 100
      colexEdges.push({
        source: bucket.a,
        target: bucket.b,
        kind: 'colexification',
        weight,
        examples: bucket.examples,
      })
      if (!colexAdj.has(bucket.a)) colexAdj.set(bucket.a, new Map())
      if (!colexAdj.has(bucket.b)) colexAdj.set(bucket.b, new Map())
      colexAdj.get(bucket.a)!.set(bucket.b, weight)
      colexAdj.get(bucket.b)!.set(bucket.a, weight)
    }
    colexEdges.sort((a, b) => b.weight - a.weight || a.source - b.source || a.target - b.target)

    // 3. Embeddings: try Workers AI @cf/baai/bge-m3 first, fall back cleanly to deterministic semantic vectors.
    let mode: 'bge-m3' | 'deterministic' = 'deterministic'
    let vectors: Float32Array[] | null = null

    if (this.embedder) {
      try {
        const texts = CONCEPTS.map((c) => {
          const lemmas = (conceptSamples.get(c.n) ?? [])
            .slice(0, 4)
            .map((s) => `${s.languageName}: ${s.lemma}`)
            .join('; ')
          return lemmas ? `${c.id} (${c.english}, ${c.class}) — ${lemmas}` : `${c.id} (${c.english}, ${c.class})`
        })
        const embedded = await this.embedder(texts)
        if (embedded && embedded.length === CONCEPTS.length && embedded[0] && embedded[0].length >= 16) {
          vectors = embedded.map((row) => normalise(row))
          mode = 'bge-m3'
        }
      } catch {
        vectors = null
      }
    }

    if (!vectors) {
      vectors = deterministicVectors(CONCEPTS, conceptSamples, colexAdj)
    }

    // 4. Build IVF vector index (src/vector-index.ts) and find top-3 nearest semantic neighbors per concept.
    const ids = CONCEPTS.map((c) => String(c.n))
    const vIndex = buildIndex(ids, vectors, { lists: 8, seed: 42 })
    const semanticEdgeMap = new Map<string, SemanticEdge>()
    for (let i = 0; i < CONCEPTS.length; i++) {
      const c = CONCEPTS[i]!
      const hits = vectorSearch(vIndex, vectors[i]!, 5, 8)
      let added = 0
      for (const h of hits) {
        const otherN = Number(h.id)
        if (otherN === c.n) continue
        if (h.score < 0.42) continue
        const a = Math.min(c.n, otherN)
        const b = Math.max(c.n, otherN)
        const key = `${a}:${b}`
        if (colexMap.has(key)) continue
        if (!semanticEdgeMap.has(key)) {
          semanticEdgeMap.set(key, {
            source: a,
            target: b,
            kind: 'semantic',
            weight: h.score,
            examples: [],
          })
        }
        added++
        if (added >= 2) break
      }
    }
    const semanticEdges = [...semanticEdgeMap.values()].sort((a, b) => b.weight - a.weight || a.source - b.source)

    // 5. Run Leiden community detection on combined semantic + colexification graph.
    const weightedEdges: WeightedEdge[] = [
      ...colexEdges.map((e): WeightedEdge => [String(e.source), String(e.target), e.weight * 1.8]),
      ...semanticEdges.map((e): WeightedEdge => [String(e.source), String(e.target), Math.max(0.2, e.weight)]),
    ]
    const clusterMap = leiden(ids, weightedEdges, { resolution: 1.05, seed: 7 })

    // 6. Deterministic 2D PCA projection of concept embeddings.
    const coords = pca2d(vectors)

    const nodes: SemanticNode[] = CONCEPTS.map((c, i) => ({
      n: c.n,
      id: c.id,
      english: c.english,
      wordClass: c.class,
      x: coords[i]![0],
      y: coords[i]![1],
      cluster: clusterMap.get(String(c.n)) ?? 0,
      domain: domainOf(c.id, c.class),
      wordsCount: conceptLangs.get(c.n)?.size ?? 0,
      voiceCount: conceptVoices.get(c.n) ?? 0,
      colexDegree: colexAdj.get(c.n)?.size ?? 0,
      samples: conceptSamples.get(c.n) ?? [],
    }))

    // Summarize Leiden clusters with readable Indonesian domain labels.
    const clusterGroups = new Map<number, SemanticNode[]>()
    for (const node of nodes) {
      clusterGroups.set(node.cluster, [...(clusterGroups.get(node.cluster) ?? []), node])
    }
    const domainLabelMap = new Map<string, string>([
      ...DOMAIN_DEFS.map((d): [string, string] => [d.key, d.label]),
      ['tugas', 'Kata Tugas & Relasi'],
    ])
    const usedLabels = new Map<string, number>()
    const clusters: SemanticCluster[] = [...clusterGroups.entries()]
      .sort((a, b) => b[1].length - a[1].length || a[0] - b[0])
      .map(([cid, members], idx) => {
        // Pick majority conceptual domain in this Leiden cluster, fall back to top 2 concept names.
        const domCounts = new Map<string, number>()
        for (const m of members) domCounts.set(m.domain, (domCounts.get(m.domain) ?? 0) + 1)
        const topDom = [...domCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'tugas'
        let label = domainLabelMap.get(topDom) ?? 'Kelompok Makna'
        const seen = usedLabels.get(label) ?? 0
        usedLabels.set(label, seen + 1)
        if (seen > 0) {
          const topWords = [...members]
            .sort((a, b) => b.colexDegree - a.colexDegree || b.wordsCount - a.wordsCount)
            .slice(0, 2)
            .map((m) => m.id)
          label = topWords.length ? `${label} (${topWords.join(', ')})` : `${label} ${seen + 1}`
        }
        return {
          id: cid,
          label,
          color: CLUSTER_PALETTE[idx % CLUSTER_PALETTE.length]!,
          count: members.length,
        }
      })

    const value: SemanticMapResponse = {
      mode,
      source: conceptsFile.source,
      licence: conceptsFile.licence,
      stats: {
        concepts: nodes.length,
        colexificationEdges: colexEdges.length,
        semanticEdges: semanticEdges.length,
        clusters: clusters.length,
        languagesUsed: languagesUsed.size,
        publicEntriesUsed: rows.length + seedCount,
      },
      clusters,
      nodes,
      edges: [...colexEdges, ...semanticEdges],
    }

    this.cached = { fingerprint, value }
    return value
  }
}
