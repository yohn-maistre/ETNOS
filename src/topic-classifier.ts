/** Cross-community Topic Classification & Semantic Search over public posts.
 *
 * Architecture:
 * - Uses Workers AI `@cf/baai/bge-m3` multilingual embeddings when `embedTexts` is configured,
 *   with a deterministic zero-AI Indonesian/Papuan-Malay lexical + trigram vector fallback so
 *   public discovery always works offline and without any LLM.
 * - Persists quantised int8 vectors (1 KB/post for 1024-dim) in `public_post_vectors`, a
 *   rebuildable projection table.
 * - Runs IVF + spherical k-means++ nearest-neighbor search using `src/vector-index.ts`.
 *
 * Hard privacy & authority invariants:
 * - Private communities (`visibility != 'public'`), archived communities (`archived != 0`),
 *   hidden posts, deleted posts, warning posts, and replies NEVER enter embeddings or vectors.
 * - Every read rechecks current community visibility, archive status, and post hidden/deleted
 *   flags in SQL before returning results; withdrawn/hidden/private items vanish immediately. */

import { EtnosCore, Fault, type Post } from './core.ts'
import type { Embedder } from './semantic-map.ts'
import { buildIndex, normalise, quantise, search as vectorSearch } from './vector-index.ts'

export type PostView = ReturnType<EtnosCore['postViews']>[number]

export type TopicPrototype = {
  slug: string
  title: string
  description: string
  keywords: string[]
}

export type ClassifiedTopic = {
  slug: string
  title: string
  score: number
}

export type SemanticPostHit = {
  post: PostView
  communityTitle: string
  score: number
  topics: ClassifiedTopic[]
  sameCommunity?: boolean
}

// Canonical cross-community Topic prototypes aligned with Tanah Papua starter topics.
export const TOPIC_PROTOTYPES: TopicPrototype[] = [
  {
    slug: 'kerja-beasiswa',
    title: 'Kerja dan usaha',
    description: 'Lowongan kerja, beasiswa kuliah, hibah, pelatihan keterampilan, UMKM, koperasi, karier dan peluang usaha di Tanah Papua.',
    keywords: ['lowongan', 'kerja', 'beasiswa', 'hibah', 'pelatihan', 'magang', 'karier', 'usaha', 'umkm', 'koperasi', 'daftar', 'rekrutmen', 'gaji', 'cpns', 'lpdp'],
  },
  {
    slug: 'jalan-listrik-internet',
    title: 'Jalan, listrik & internet',
    description: 'Jalan raya, jembatan, penerbangan pesawat perintis, kapal Pelni, pelabuhan, listrik PLN, air bersih, sinyal seluler dan internet.',
    keywords: ['jalan', 'jembatan', 'pesawat', 'bandara', 'penerbangan', 'kapal', 'pelni', 'pelabuhan', 'listrik', 'pln', 'mati lampu', 'sinyal', 'internet', 'jaringan', 'starlink', 'telkomsel', 'air bersih', 'transportasi', 'tiket', 'bagasi', 'titip'],
  },
  {
    slug: 'iklim-bencana',
    title: 'Iklim, musim dan bencana',
    description: 'Cuaca, hujan deras, banjir, longsor, gempa bumi, kebakaran hutan, musim angin, gelombang tinggi dan perubahan iklim.',
    keywords: ['cuaca', 'hujan', 'banjir', 'longsor', 'gempa', 'kebakaran', 'angin', 'gelombang', 'ombak', 'iklim', 'bencana', 'musim', 'kemarau', 'bmkg'],
  },
  {
    slug: 'layanan-kesehatan',
    title: 'Kesehatan',
    description: 'Puskesmas, rumah sakit, klinik, posyandu, malaria, imunisasi, obat, tenaga medis, gizi anak dan kesehatan masyarakat.',
    keywords: ['kesehatan', 'puskesmas', 'rumah sakit', 'rsud', 'dokter', 'perawat', 'obat', 'malaria', 'sakit', 'posyandu', 'imunisasi', 'vaksin', 'gizi', 'stunting', 'klinik', 'medis'],
  },
  {
    slug: 'sekolah-universitas',
    title: 'Pendidikan',
    description: 'Sekolah dasar, SMP, SMA, guru, kampus, universitas, mahasiswa, asrama, kurikulum, literasi dan belajar mengajar.',
    keywords: ['sekolah', 'guru', 'siswa', 'murid', 'kampus', 'universitas', 'uncen', 'unipa', 'mahasiswa', 'kuliah', 'asrama', 'belajar', 'pendidikan', 'kurikulum', 'ujian', 'skripsi'],
  },
  {
    slug: 'adat-hukum',
    title: 'Adat dan hukum',
    description: 'Dewan adat, tanah ulayat, hukum adat, hak masyarakat adat, marga, suku, musyawarah adat, denda adat dan penyelesaian sengketa.',
    keywords: ['adat', 'ulayat', 'tanah adat', 'marga', 'suku', 'ondoafi', 'kepala suku', 'dewan adat', 'hukum', 'hak', 'sengketa', 'masyarakat adat', 'musyawarah', 'peraturan', 'otsus', 'indigenous'],
  },
  {
    slug: 'kehidupan-bersama',
    title: 'Kehidupan bersama',
    description: 'Pemerintahan kampung, distrik, kabupaten, provinsi, kebijakan publik, layanan warga, pembangunan daerah, APBD dan urusan bersama.',
    keywords: ['pemerintah', 'pemda', 'kampung', 'distrik', 'kabupaten', 'provinsi', 'kebijakan', 'pembangunan', 'apbd', 'layanan', 'warga', 'publik', 'kantor', 'dinas', 'bupati', 'gubernur'],
  },
  {
    slug: 'alam-hidup',
    title: 'Alam hidup',
    description: 'Hutan Papua, satwa endemik, cenderawasih, nokdiak, kanguru pohon, kuskus, laut, terumbu karang, tumbuhan obat dan konservasi alam.',
    keywords: ['hutan', 'satwa', 'burung', 'cenderawasih', 'nokdiak', 'kanguru', 'ikan', 'laut', 'karang', 'tumbuhan', 'pohon', 'flora', 'fauna', 'spesies', 'konservasi', 'endemi', 'ekosistem', 'sungai', 'danau', 'gunung'],
  },
  {
    slug: 'makanan',
    title: 'Pangan dan masakan',
    description: 'Sagu, papeda, ubi jalar, keladi, pinang, kebun, berkebun, berburu, melaut, ikan bakar, pasar tradisional dan masakan sehari-hari.',
    keywords: ['sagu', 'papeda', 'ubi', 'keladi', 'pinang', 'kebun', 'masak', 'masakan', 'makanan', 'pangan', 'ikan kuah', 'bakar batu', 'barapen', 'pasar', 'kopi', 'cokelat', 'kakao', 'panen'],
  },
  {
    slug: 'tradisi-lisan',
    title: 'Tradisi lisan',
    description: 'Bahasa daerah Papua, kosakata, kamus, cerita rakyat, dongeng, lagu tradisional, tarian, pantun, sejarah lisan dan pelestarian bahasa.',
    keywords: ['bahasa', 'kamus', 'kata', 'pelafalan', 'penutur', 'cerita rakyat', 'dongeng', 'lagu', 'tari', 'tarian', 'tifa', 'sejarah', 'lisan', 'aksara', 'terjemahan', 'dialek', 'linguistik'],
  },
  {
    slug: 'pengetahuan-tradisional',
    title: 'Pengetahuan tradisional',
    description: 'Noken, ukiran kayu, perahu tradisional, honai, rumah adat, kerajinan tangan, pengobatan herbal dan teknologi lokal.',
    keywords: ['noken', 'ukir', 'ukiran', 'perahu', 'honai', 'kerajinan', 'anyaman', 'kulit kayu', 'kapak batu', 'herbal', 'tradisional', 'warisan', 'museum', 'artefak'],
  },
  {
    slug: 'teknologi',
    title: 'Teknologi dan komputer',
    description: 'Aplikasi, pemrograman, ponsel, perangkat lunak, open source, AI, komputer, jaringan lokal dan inovasi digital.',
    keywords: ['teknologi', 'aplikasi', 'hp', 'ponsel', 'laptop', 'komputer', 'kode', 'coding', 'program', 'server', 'open source', 'digital', 'ai', 'model', 'software', 'web'],
  },
  {
    slug: 'riset-data',
    title: 'Riset & data',
    description: 'Penelitian ilmiah, sensus, peta, data terbuka, jurnal, arsip, ensiklopedia, verifikasi sumber dan dokumentasi lapangan.',
    keywords: ['riset', 'penelitian', 'data', 'dataset', 'peta', 'jurnal', 'arsip', 'ensiklopedia', 'wiki', 'sumber', 'referensi', 'statistik', 'survei', 'dokumentasi', 'peneliti'],
  },
  {
    slug: 'buku-tulisan',
    title: 'Buku & tulisan',
    description: 'Buku, puisi, esai, novel, karya sastra, desain, fotografi, musik, seni rupa dan karya kreatif anggota.',
    keywords: ['buku', 'puisi', 'esai', 'tulisan', 'karya', 'musik', 'foto', 'fotografi', 'desain', 'gambar', 'lukis', 'seni', 'kreatif', 'lagu', 'band', 'podcast'],
  },
  {
    slug: 'film',
    title: 'Film & layar',
    description: 'Film dokumenter, sinema, video, YouTube, pembuat film dan tayangan cerita dari Papua.',
    keywords: ['film', 'dokumenter', 'video', 'youtube', 'sinema', 'kamera', 'sutradara', 'layar', 'nonton', 'tayangan'],
  },
  {
    slug: 'olahraga',
    title: 'Olahraga dan permainan',
    description: 'Sepak bola, Persipura, liga, turnamen, lari, futsal, basket, tinju dan permainan rakyat.',
    keywords: ['bola', 'sepak bola', 'persipura', 'futsal', 'turnamen', 'pertandingan', 'olahraga', 'lari', 'stadion', 'tim', 'klub', 'pemain', 'gol'],
  },
  {
    slug: 'pemuda',
    title: 'Pemuda',
    description: 'Komunitas anak muda, kegiatan sukarelawan, organisasi pemuda, diskusi kampus, acara lokal dan suara generasi muda.',
    keywords: ['pemuda', 'anak muda', 'komunitas', 'relawan', 'acara', 'kegiatan', 'diskusi', 'nongkrong', 'festival', 'pemudi', 'generasi'],
  },
]

const PROTO_BY_SLUG = new Map(TOPIC_PROTOTYPES.map((t) => [t.slug, t]))
const DET_DIMS = 128

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hashFnv1a(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic 128-dim semantic vector: topic-prototype concept channels + word unigram/bigram + character trigram hashing. */
export function deterministicTextVector(raw: string): Float32Array {
  const text = normalizeText(raw)
  const v = new Float32Array(DET_DIMS)
  if (!text) return v

  // Channels 0..19: topic prototype lexical concept activations
  for (let i = 0; i < TOPIC_PROTOTYPES.length; i++) {
    const proto = TOPIC_PROTOTYPES[i]!
    let hits = 0
    for (const kw of proto.keywords) {
      if (kw.includes(' ')) {
        if (text.includes(kw)) hits += 2.2
      } else if (new RegExp(`(^| )${kw}`).test(text)) {
        hits += 1.4
      }
    }
    if (hits > 0) v[i % 20] += Math.min(4.5, hits)
  }

  // Channels 20..79: hashed word tokens (captures exact & stem lexical overlap across communities)
  const tokens = text.split(' ').filter((w) => w.length >= 3)
  for (const tok of tokens) {
    const slot = 20 + (hashFnv1a('w:' + tok) % 60)
    v[slot] += 1.0
    // Also hash 4-char prefix for Indonesian morphological sharing (e.g. belajar/pelajaran/mengajar -> simple root proximity)
    if (tok.length >= 5) {
      const stem = tok.replace(/^(me|mem|men|meng|ber|per|ter|di|ke|se)/, '')
      if (stem.length >= 3) {
        const sSlot = 20 + (hashFnv1a('s:' + stem.slice(0, 5)) % 60)
        v[sSlot] += 0.55
      }
    }
  }

  // Channels 80..127: hashed character trigrams (fuzzy matching for typos, Papuan loanwords & inflection)
  const padded = ` ${text.slice(0, 800)} `
  for (let i = 0; i <= padded.length - 3; i++) {
    const tri = padded.slice(i, i + 3)
    if (!/[a-z]/.test(tri)) continue
    const slot = 80 + (hashFnv1a('t:' + tri) % 48)
    v[slot] += 0.25
  }

  return normalise(v)
}

function lexicalTopicScores(raw: string): Map<string, number> {
  const text = normalizeText(raw)
  const scores = new Map<string, number>()
  if (!text) return scores
  for (const proto of TOPIC_PROTOTYPES) {
    let rawScore = 0
    for (const kw of proto.keywords) {
      if (kw.includes(' ')) {
        if (text.includes(kw)) rawScore += 0.34
      } else if (new RegExp(`(^| )${kw}( |$|s)`).test(text)) {
        rawScore += 0.28
      } else if (kw.length >= 5 && text.includes(kw)) {
        rawScore += 0.16
      }
    }
    if (rawScore > 0) {
      scores.set(proto.slug, Math.min(0.95, 0.32 + rawScore))
    }
  }
  return scores
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const len = Math.min(a.length, b.length)
  let s = 0
  for (let i = 0; i < len; i++) s += a[i]! * b[i]!
  return s
}

function postTextForEmbedding(text: string, contentRaw: string): string {
  let title = ''
  try {
    const parsed = JSON.parse(contentRaw || '{}') as { title?: string; peluang?: { organizer?: string; location?: string }; bagasi?: { from?: string; to?: string } }
    if (typeof parsed.title === 'string' && parsed.title.trim()) title = parsed.title.trim()
    if (parsed.peluang) title += ` ${parsed.peluang.organizer ?? ''} ${parsed.peluang.location ?? ''}`
    if (parsed.bagasi) title += ` titip bagasi ${parsed.bagasi.from ?? ''} ${parsed.bagasi.to ?? ''}`
  } catch {
    /* Ignore malformed content */
  }
  return `${title} ${text}`.replace(/\s+/g, ' ').trim().slice(0, 1000)
}

function blobToFloat32(blob: Uint8Array): Float32Array {
  const i8 = new Int8Array(blob.buffer, blob.byteOffset, blob.byteLength)
  return Float32Array.from(i8, (x) => x / 127)
}

function float32ToBlob(vec: Float32Array): Uint8Array {
  const q = quantise(normalise(vec))
  return new Uint8Array(q.buffer, q.byteOffset, q.byteLength)
}

export class TopicClassifier {
  private store: EtnosCore
  private embedder?: Embedder
  private protoVectorsAi: Map<string, Float32Array> | null = null
  private protoVectorsDet: Map<string, Float32Array>

  constructor(store: EtnosCore, embedder?: Embedder) {
    this.store = store
    this.embedder = embedder
    this.protoVectorsDet = new Map(
      TOPIC_PROTOTYPES.map((p) => [p.slug, deterministicTextVector(`${p.title} ${p.description} ${p.keywords.join(' ')}`)]),
    )
  }

  private async ensureProtoVectors(): Promise<{ mode: 'bge-m3' | 'deterministic'; map: Map<string, Float32Array> }> {
    if (this.embedder) {
      if (!this.protoVectorsAi) {
        try {
          const texts = TOPIC_PROTOTYPES.map((p) => `${p.title}: ${p.description}`)
          const embedded = await this.embedder(texts)
          if (embedded && embedded.length === TOPIC_PROTOTYPES.length && embedded[0] && embedded[0].length >= 16) {
            this.protoVectorsAi = new Map(
              TOPIC_PROTOTYPES.map((p, i) => [p.slug, normalise(embedded[i]!)]),
            )
          }
        } catch {
          this.protoVectorsAi = null
        }
      }
      if (this.protoVectorsAi) {
        return { mode: 'bge-m3', map: this.protoVectorsAi }
      }
    }
    return { mode: 'deterministic', map: this.protoVectorsDet }
  }

  private classifyWithVector(
    text: string,
    vec: Float32Array,
    mode: 'bge-m3' | 'deterministic',
    protoMap: Map<string, Float32Array>,
  ): ClassifiedTopic[] {
    const lex = lexicalTopicScores(text)
    const scored: ClassifiedTopic[] = []
    for (const proto of TOPIC_PROTOTYPES) {
      const pVec = protoMap.get(proto.slug)
      const sim = pVec && pVec.length === vec.length ? Math.max(0, dot(vec, pVec)) : 0
      const lexScore = lex.get(proto.slug) ?? 0
      const combined = mode === 'bge-m3'
        ? sim * 0.78 + lexScore * 0.28
        : Math.max(lexScore, sim * 0.72 + lexScore * 0.35)
      const threshold = mode === 'bge-m3' ? 0.43 : 0.38
      if (combined >= threshold) {
        scored.push({
          slug: proto.slug,
          title: proto.title,
          score: Math.round(Math.min(0.99, combined) * 100) / 100,
        })
      }
    }
    return scored.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug)).slice(0, 3)
  }

  /** Classify arbitrary public text into top cross-community topics (never writes to DB). */
  async classifyText(raw: string): Promise<{ mode: 'bge-m3' | 'deterministic'; topics: ClassifiedTopic[] }> {
    const text = raw.trim().slice(0, 1000)
    if (!text) return { mode: 'deterministic', topics: [] }
    const protos = await this.ensureProtoVectors()
    if (protos.mode === 'bge-m3' && this.embedder) {
      try {
        const res = await this.embedder([text])
        if (res?.[0] && res[0].length >= 16) {
          const vec = normalise(res[0])
          return { mode: 'bge-m3', topics: this.classifyWithVector(text, vec, 'bge-m3', protos.map) }
        }
      } catch {
        /* Fall through cleanly to deterministic classifier */
      }
    }
    const vec = deterministicTextVector(text)
    return { mode: 'deterministic', topics: this.classifyWithVector(text, vec, 'deterministic', this.protoVectorsDet) }
  }

  /** Lazily ensure currently visible public root posts have up-to-date vectors in `public_post_vectors`.
   *  Private communities, archived rooms, hidden/deleted posts, and warning posts are strictly excluded. */
  private async syncPublicPostVectors(): Promise<{
    mode: 'bge-m3' | 'deterministic'
    rows: Array<{ post_id: string; community_id: string; community_title: string; text: string; content: string; vector: Float32Array; topics: ClassifiedTopic[] }>
  }> {
    const protos = await this.ensureProtoVectors()
    const targetMode = protos.mode

    const visible = this.store.all<{
      id: string
      community_id: string
      community_title: string
      text: string
      content: string
      updated: number
      vec_blob: Uint8Array | null
      vec_mode: string | null
      vec_topics: string | null
      vec_updated: number | null
    }>(`
      SELECT p.id, p.community_id, c.title community_title, p.text, p.content,
        COALESCE(p.updated, p.created) updated,
        v.vector vec_blob, v.mode vec_mode, v.topics vec_topics, v.updated vec_updated
      FROM posts p
      JOIN communities c ON c.id = p.community_id
      LEFT JOIN public_post_vectors v ON v.post_id = p.id
      WHERE c.visibility = 'public'
        AND COALESCE(c.archived, 0) = 0
        AND p.parent_id IS NULL
        AND p.hidden = 0
        AND p.deleted = 0
      ORDER BY p.created DESC, p.id DESC
      LIMIT 300
    `)

    // Exclude posts with content warnings from automatic public indexing.
    const eligible = visible.filter((r) => {
      try {
        const c = JSON.parse(r.content || '{}') as { warning?: string }
        return !c.warning
      } catch {
        return true
      }
    })

    const stale = eligible.filter(
      (r) => !r.vec_blob || r.vec_mode !== targetMode || (r.vec_updated ?? 0) < r.updated,
    )

    let activeMode = targetMode
    if (stale.length) {
      const batch = stale.slice(0, 40)
      const texts = batch.map((r) => postTextForEmbedding(r.text, r.content))
      let vectors: Float32Array[] | null = null

      if (targetMode === 'bge-m3' && this.embedder) {
        try {
          const embedded = await this.embedder(texts)
          if (embedded && embedded.length === batch.length && embedded[0] && embedded[0].length >= 16) {
            vectors = embedded.map((e) => normalise(e))
          }
        } catch {
          vectors = null
        }
      }
      if (!vectors) {
        activeMode = 'deterministic'
        vectors = texts.map((t) => deterministicTextVector(t))
      }

      const now = this.store.clock()
      const useMap = activeMode === 'bge-m3' ? protos.map : this.protoVectorsDet
      this.store.tx(() => {
        for (let i = 0; i < batch.length; i++) {
          const r = batch[i]!
          const vec = vectors![i]!
          const topics = this.classifyWithVector(texts[i]!, vec, activeMode, useMap)
          const blob = float32ToBlob(vec)
          this.store.run(
            `INSERT INTO public_post_vectors(post_id, community_id, vector, dims, mode, topics, updated)
             VALUES(?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(post_id) DO UPDATE SET
               community_id = excluded.community_id,
               vector = excluded.vector,
               dims = excluded.dims,
               mode = excluded.mode,
               topics = excluded.topics,
               updated = excluded.updated`,
            r.id,
            r.community_id,
            blob,
            vec.length,
            activeMode,
            JSON.stringify(topics),
            Math.max(now, r.updated),
          )
          r.vec_blob = blob
          r.vec_mode = activeMode
          r.vec_topics = JSON.stringify(topics)
          r.vec_updated = Math.max(now, r.updated)
        }
      })
    }

    // Collect rows sharing the consistent active dimensionality.
    const rows: Array<{ post_id: string; community_id: string; community_title: string; text: string; content: string; vector: Float32Array; topics: ClassifiedTopic[] }> = []
    for (const r of eligible) {
      if (r.vec_blob && r.vec_mode === activeMode) {
        let topics: ClassifiedTopic[] = []
        try {
          topics = JSON.parse(r.vec_topics || '[]') as ClassifiedTopic[]
        } catch {
          topics = []
        }
        rows.push({
          post_id: r.id,
          community_id: r.community_id,
          community_title: r.community_title,
          text: r.text,
          content: r.content,
          vector: blobToFloat32(r.vec_blob),
          topics,
        })
      } else if (activeMode === 'deterministic') {
        // Compute in-memory for any overflow rows beyond the 40-item persistence batch.
        const txt = postTextForEmbedding(r.text, r.content)
        const vec = deterministicTextVector(txt)
        rows.push({
          post_id: r.id,
          community_id: r.community_id,
          community_title: r.community_title,
          text: r.text,
          content: r.content,
          vector: vec,
          topics: this.classifyWithVector(txt, vec, 'deterministic', this.protoVectorsDet),
        })
      }
    }

    return { mode: activeMode, rows }
  }

  private loadPublicPostViews(ids: string[]): Map<string, PostView> {
    if (!ids.length) return new Map()
    const placeholders = ids.map(() => '?').join(',')
    const posts = this.store.all<Post>(
      `SELECT p.* FROM posts p
       JOIN communities c ON c.id = p.community_id
       WHERE p.id IN (${placeholders})
         AND c.visibility = 'public'
         AND COALESCE(c.archived, 0) = 0
         AND p.hidden = 0
         AND p.deleted = 0`,
      ...ids,
    )
    const views = this.store.postViews(posts, undefined)
    return new Map(views.map((v) => [v.id, v]))
  }

  /** Cross-community semantic search over public root posts using `src/vector-index.ts` IVF + spherical k-means++. */
  async searchSemantic(opts: { query: string; topic?: string; limit?: number }): Promise<{
    query: string
    topic: string | null
    mode: 'bge-m3' | 'deterministic'
    suggestedTopics: ClassifiedTopic[]
    results: SemanticPostHit[]
  }> {
    const q = opts.query.trim()
    if (q.length > 160) throw new Fault(400, 'Search is limited to 160 characters')
    const topicFilter = opts.topic?.trim() || null
    const limit = Math.max(1, Math.min(20, opts.limit ?? 10))
    if (!q && !topicFilter) {
      return { query: '', topic: null, mode: 'deterministic', suggestedTopics: [], results: [] }
    }

    const { mode, rows } = await this.syncPublicPostVectors()
    if (!rows.length) {
      return { query: q, topic: topicFilter, mode, suggestedTopics: [], results: [] }
    }

    const filtered = topicFilter
      ? rows.filter((r) => r.topics.some((t) => t.slug === topicFilter))
      : rows

    if (!filtered.length) {
      const classified = q ? await this.classifyText(q) : { mode, topics: [] }
      return { query: q, topic: topicFilter, mode: classified.mode, suggestedTopics: classified.topics, results: [] }
    }

    // If browsing by topic only (no free-text query), rank by topic confidence.
    if (!q && topicFilter) {
      const picked = [...filtered]
        .sort((a, b) => {
          const sa = a.topics.find((t) => t.slug === topicFilter)?.score ?? 0
          const sb = b.topics.find((t) => t.slug === topicFilter)?.score ?? 0
          return sb - sa
        })
        .slice(0, limit)
      const viewMap = this.loadPublicPostViews(picked.map((r) => r.post_id))
      const results: SemanticPostHit[] = []
      for (const r of picked) {
        const post = viewMap.get(r.post_id)
        if (!post || post.deleted) continue
        const score = r.topics.find((t) => t.slug === topicFilter)?.score ?? 0.5
        results.push({ post, communityTitle: r.community_title, score, topics: r.topics })
      }
      const proto = PROTO_BY_SLUG.get(topicFilter)
      return {
        query: '',
        topic: topicFilter,
        mode,
        suggestedTopics: proto ? [{ slug: proto.slug, title: proto.title, score: 1 }] : [],
        results,
      }
    }

    // Embed query in matching space.
    let qVec: Float32Array | null = null
    let queryMode = mode
    if (mode === 'bge-m3' && this.embedder) {
      try {
        const res = await this.embedder([q])
        if (res?.[0] && res[0].length === filtered[0]!.vector.length) {
          qVec = normalise(res[0])
        }
      } catch {
        qVec = null
      }
    }
    if (!qVec) {
      queryMode = 'deterministic'
      qVec = deterministicTextVector(q)
    }

    // Ensure consistent dimensionality for IVF index.
    const candidates = filtered.map((r) => ({
      row: r,
      vec: r.vector.length === qVec!.length ? r.vector : deterministicTextVector(postTextForEmbedding(r.text, r.content)),
    }))

    const idx = buildIndex(
      candidates.map((c) => c.row.post_id),
      candidates.map((c) => c.vec),
      { lists: Math.max(1, Math.min(8, Math.round(Math.sqrt(candidates.length)))), seed: 19 },
    )
    const rawHits = vectorSearch(idx, qVec, Math.min(candidates.length, limit * 2), idx.lists.length)
    const rowById = new Map(candidates.map((c) => [c.row.post_id, c.row]))

    const minScore = queryMode === 'bge-m3' ? 0.36 : 0.24
    const topHits = rawHits.filter((h) => h.score >= minScore).slice(0, limit)
    const viewMap = this.loadPublicPostViews(topHits.map((h) => h.id))
    const results: SemanticPostHit[] = []
    for (const h of topHits) {
      const row = rowById.get(h.id)
      const post = viewMap.get(h.id)
      if (!row || !post || post.deleted) continue
      results.push({
        post,
        communityTitle: row.community_title,
        score: Math.round(h.score * 100) / 100,
        topics: row.topics,
      })
    }

    const protos = await this.ensureProtoVectors()
    const suggestedTopics = this.classifyWithVector(
      q,
      qVec,
      queryMode,
      queryMode === 'bge-m3' ? protos.map : this.protoVectorsDet,
    )

    return { query: q, topic: topicFilter, mode: queryMode, suggestedTopics, results }
  }

  /** Find semantically related public conversations across communities for a given public root post.
   *  Returns 404 if the post does not exist, is private, archived, hidden, or deleted. */
  async relatedPublic(postId: string, limit = 5): Promise<{
    postId: string
    mode: 'bge-m3' | 'deterministic'
    topics: ClassifiedTopic[]
    related: SemanticPostHit[]
  }> {
    const check = this.store.get<{ id: string; community_id: string }>(`
      SELECT p.id, p.community_id
      FROM posts p
      JOIN communities c ON c.id = p.community_id
      WHERE p.id = ?
        AND c.visibility = 'public'
        AND COALESCE(c.archived, 0) = 0
        AND p.parent_id IS NULL
        AND p.hidden = 0
        AND p.deleted = 0
    `, postId)
    if (!check) throw new Fault(404, 'Not found')

    const { mode, rows } = await this.syncPublicPostVectors()
    const anchor = rows.find((r) => r.post_id === postId)
    if (!anchor) return { postId, mode, topics: [], related: [] }

    const others = rows.filter((r) => r.post_id !== postId && r.vector.length === anchor.vector.length)
    if (!others.length) return { postId, mode, topics: anchor.topics, related: [] }

    const idx = buildIndex(
      others.map((r) => r.post_id),
      others.map((r) => r.vector),
      { lists: Math.max(1, Math.min(8, Math.round(Math.sqrt(others.length)))), seed: 23 },
    )
    const hits = vectorSearch(idx, anchor.vector, Math.min(others.length, limit * 3), idx.lists.length)
    const rowById = new Map(others.map((r) => [r.post_id, r]))

    const minScore = mode === 'bge-m3' ? 0.42 : 0.25
    const scored = hits
      .filter((h) => h.score >= minScore)
      .map((h) => {
        const row = rowById.get(h.id)!
        const sameCommunity = row.community_id === anchor.community_id
        // Slight boost for cross-community matches so inter-community bridges surface first.
        const rankScore = h.score + (sameCommunity ? 0 : 0.06)
        return { row, score: h.score, sameCommunity, rankScore }
      })
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, limit)

    const viewMap = this.loadPublicPostViews(scored.map((s) => s.row.post_id))
    const related: SemanticPostHit[] = []
    for (const item of scored) {
      const post = viewMap.get(item.row.post_id)
      if (!post || post.deleted) continue
      related.push({
        post,
        communityTitle: item.row.community_title,
        score: Math.round(item.score * 100) / 100,
        topics: item.row.topics,
        sameCommunity: item.sameCommunity,
      })
    }

    return { postId, mode, topics: anchor.topics, related }
  }
}
