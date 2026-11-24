/**
 * Voice notes & oral language recordings (W2: Titip Suara + Kamus pronunciation).
 *
 * Every clip validates its audio container magic bytes (WebM/Opus, Ogg/Opus,
 * MP4/M4A/AAC, MP3), enforces strict size/duration/rate ceilings, checks
 * current community read access and cultural protocol ('restricted' = members
 * only even in public rooms) on every read, supports HTTP Range seeking, and
 * deletes immediately when withdrawn or when its parent post is deleted.
 *
 * Storage is dual-mode: uses an optional R2 bucket when bound in Cloudflare
 * Workers, falling back cleanly to bounded SQLite BLOB storage in dev/tests
 * or nodes without R2.
 */
import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { Fault, type EtnosCore } from './core.ts'

const kamusNorm = (w: string) => w.toLowerCase().normalize('NFC').replace(/^[-']+|[-']+$/g, '')

export const VOICE_MAX_BYTES_SQLITE = 768 * 1024
export const VOICE_MAX_BYTES_R2 = 2 * 1024 * 1024
export const VOICE_MAX_DURATION_MS = 180_000
const DAY = 86_400_000

export type VoiceProtocol = 'community' | 'public' | 'restricted'

export type VoiceBucket = {
  put: (key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>
  get: (key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null>
  delete: (key: string) => Promise<unknown>
}

export type VoiceView = {
  id: string
  url: string
  mime: string
  size: number
  durationMs: number
  peaks: number[]
  speaker: string
  language: string
  transcript: string
  consentPublic: boolean
  protocol: VoiceProtocol
  created: number
  canEdit: boolean
}

type VoiceRow = {
  id: string
  owner_id: string
  community_id: string
  post_id: string | null
  kamus_norm: string | null
  bytes: Uint8Array | null
  r2_key: string | null
  mime: string
  size: number
  duration_ms: number
  peaks: string
  speaker: string
  language: string
  transcript: string
  consent_public: number
  protocol: VoiceProtocol
  created: number
}

/**
 * Inspects raw audio container magic bytes. Never trusts caller MIME strings.
 * Accepts WebM/EBML (Opus), Ogg (Opus/Vorbis), MP4/M4A/3GP (AAC), and MP3.
 */
export function inspectAudio(bytes: Uint8Array, maxBytes = VOICE_MAX_BYTES_SQLITE): { mime: string; ext: string } {
  if (bytes.length < 32 || bytes.length > maxBytes) {
    throw new Fault(400, `Rekaman suara maksimal ${Math.round(maxBytes / 1024)} KB`)
  }
  const b = Buffer.from(bytes)
  // 1. WebM / Matroska EBML header: 1A 45 DF A3
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return { mime: 'audio/webm', ext: 'webm' }
  }
  // 2. Ogg container: "OggS" (WhatsApp .opus/.ogg & Firefox MediaRecorder)
  if (b.toString('latin1', 0, 4) === 'OggS') {
    const head = b.subarray(0, Math.min(b.length, 256)).toString('latin1')
    if (head.includes('OpusHead') || head.includes('vorbis')) {
      return { mime: 'audio/ogg', ext: 'ogg' }
    }
    throw new Fault(400, 'Berkas Ogg harus berisi audio Opus atau Vorbis')
  }
  // 3. ISO BMFF / MP4 / M4A / 3GP: bytes 4..8 === "ftyp" (iOS Safari & WhatsApp .m4a)
  if (b.length >= 12 && b.toString('latin1', 4, 8) === 'ftyp') {
    const brand = b.toString('latin1', 8, 12)
    if (/^(M4A |M4B |mp42|isom|iso2|iso5|3gp4|3gp5|3g2a|qt  )$/.test(brand)) {
      return { mime: 'audio/mp4', ext: 'm4a' }
    }
  }
  // 4. MP3: ID3v2 tag or MPEG audio frame sync (FF FB / FF F3 / FF F2 / FF FA)
  if (
    b.toString('latin1', 0, 3) === 'ID3' ||
    (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0x00)
  ) {
    return { mime: 'audio/mpeg', ext: 'mp3' }
  }
  throw new Fault(400, 'Format suara tidak didukung. Gunakan rekaman browser, Ogg/Opus, M4A, atau MP3.')
}

function parsePeaks(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const out: number[] = []
  for (const v of raw.slice(0, 64)) {
    const n = Number(v)
    if (!Number.isFinite(n)) continue
    out.push(Math.max(2, Math.min(100, Math.round(n))))
  }
  return out
}

function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, max)
}

function safePeaks(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : []
  } catch {
    return []
  }
}

function toView(r: VoiceRow, viewer: string | undefined, isSteward: boolean): VoiceView {
  return {
    id: r.id,
    url: '/v1/voice/' + r.id,
    mime: r.mime,
    size: r.size,
    durationMs: r.duration_ms,
    peaks: safePeaks(r.peaks),
    speaker: r.speaker,
    language: r.language,
    transcript: r.transcript,
    consentPublic: !!r.consent_public,
    protocol: r.protocol,
    created: r.created,
    canEdit: !!viewer && (viewer === r.owner_id || isSteward),
  }
}

export class Voice {
  private s: EtnosCore
  private bucket?: VoiceBucket
  constructor(s: EtnosCore, bucket?: VoiceBucket) {
    this.s = s
    this.bucket = bucket
  }

  private maxBytes(): number {
    return this.bucket ? VOICE_MAX_BYTES_R2 : VOICE_MAX_BYTES_SQLITE
  }

  private isSteward(actor: string | undefined, communityId: string): boolean {
    if (!actor) return false
    const m = this.s.membership(actor, communityId)
    return !!m && this.s.actor(actor).kind === 'human' && (m.role === 'owner' || m.role === 'moderator')
  }

  private canViewClip(actor: string | undefined, row: VoiceRow): boolean {
    const c = this.s.community(row.community_id)
    if (!this.s.canRead(actor, c)) return false
    // Cultural protocol 'restricted': only active members may hear the clip, even in a public community.
    if (row.protocol === 'restricted' && (!actor || !this.s.membership(actor, row.community_id))) {
      return false
    }
    if (row.post_id) {
      try {
        const post = this.s.getPost(actor, row.post_id)
        if (post.deleted) return false
      } catch {
        return false
      }
      return true
    }
    if (row.kamus_norm) {
      return true
    }
    // Unattached draft: only owner within 24h.
    return !!actor && actor === row.owner_id && this.s.clock() - row.created < DAY
  }

  /** Uploads a bounded voice recording. Uses R2 when bound, else SQLite BLOB. */
  async upload(
    actor: string,
    input: {
      communityId: string
      bytes: string
      durationMs?: unknown
      peaks?: unknown
      speaker?: unknown
      language?: unknown
      transcript?: unknown
      consentPublic?: unknown
      protocol?: unknown
    },
  ): Promise<VoiceView> {
    const maxBytes = this.maxBytes()
    const communityId = cleanText(input.communityId, 100)
    if (!communityId) throw new Fault(400, 'Komunitas wajib dipilih')
    const encoded = typeof input.bytes === 'string' ? input.bytes.trim() : ''
    if (!encoded || encoded.length > Math.ceil(maxBytes / 3) * 4 + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new Fault(400, 'Data rekaman suara tidak valid')
    }
    const bytes = Buffer.from(encoded, 'base64')
    if (bytes.toString('base64') !== encoded) throw new Fault(400, 'Data rekaman suara tidak valid')
    const { mime, ext } = inspectAudio(bytes, maxBytes)

    const rawDuration = Number(input.durationMs ?? 0)
    const durationMs = Number.isFinite(rawDuration) && rawDuration >= 200
      ? Math.min(VOICE_MAX_DURATION_MS, Math.round(rawDuration))
      : 1000
    if (rawDuration > VOICE_MAX_DURATION_MS) {
      throw new Fault(400, 'Durasi rekaman maksimal 3 menit')
    }

    const peaks = parsePeaks(input.peaks)
    const speaker = cleanText(input.speaker, 120)
    const language = cleanText(input.language, 60)
    const transcript = cleanText(input.transcript, 2000)
    const rawProtocol = typeof input.protocol === 'string' ? input.protocol : 'community'
    if (!['community', 'public', 'restricted'].includes(rawProtocol)) {
      throw new Fault(400, 'Pilihan batas dengar tidak valid')
    }
    let protocol = rawProtocol as VoiceProtocol
    const consentPublic = input.consentPublic === true ? 1 : 0

    // Validate membership, actor kind, publication mode, and storage ceilings inside transaction before R2 write.
    const prepared = this.s.tx(() => {
      this.s.requireMember(actor, communityId)
      if (this.s.actor(actor).kind !== 'human') throw new Fault(403, 'Hanya anggota manusia yang dapat mengunggah suara')
      const comm = this.s.community(communityId)
      if (comm.publication !== 'local') throw new Fault(409, 'Rekaman suara belum tersedia untuk ruang AT')
      if (comm.visibility !== 'public' && protocol === 'public') protocol = 'community'
      const now = this.s.clock()
      // Clean expired unattached drafts older than 24h.
      this.s.run('DELETE FROM voice_clips WHERE post_id IS NULL AND kamus_norm IS NULL AND created<?', now - DAY)
      const usage = this.s.get<{ size: number; n: number; hourly: number; drafts: number }>(
        'SELECT COALESCE(SUM(size),0) size,COUNT(*) n,COALESCE(SUM(CASE WHEN created>? THEN 1 ELSE 0 END),0) hourly,COALESCE(SUM(CASE WHEN post_id IS NULL AND kamus_norm IS NULL THEN 1 ELSE 0 END),0) drafts FROM voice_clips WHERE owner_id=? AND created>?',
        now - 3_600_000,
        actor,
        now - DAY,
      )!
      const total = this.s.get<{ size: number; n: number }>(
        'SELECT COALESCE(SUM(size),0) size,COUNT(*) n FROM voice_clips WHERE bytes IS NOT NULL',
      )!
      if (usage.n >= 40 || usage.hourly >= 20 || usage.drafts >= 12) {
        throw new Fault(429, 'Batas unggah rekaman suara hari ini tercapai')
      }
      if (!this.bucket && (total.n >= 2000 || total.size + bytes.length > 64 * 1024 * 1024)) {
        throw new Fault(429, 'Penyimpanan rekaman suara sementara sudah penuh')
      }
      const id = randomUUID()
      return { id, now, r2Key: this.bucket ? `voice/${communityId}/${id}.${ext}` : null }
    })

    if (this.bucket && prepared.r2Key) {
      await this.bucket.put(prepared.r2Key, bytes, { httpMetadata: { contentType: mime } })
    }

    const row = this.s.tx(() => {
      // Re-verify membership after any async R2 put.
      this.s.requireMember(actor, communityId)
      this.s.run(
        `INSERT INTO voice_clips(id,owner_id,community_id,post_id,kamus_norm,bytes,r2_key,mime,size,duration_ms,peaks,speaker,language,transcript,consent_public,protocol,created)
         VALUES(?,?,?,NULL,NULL,?,?,?,?,?,?,?,?,?,?,?,?)`,
        prepared.id,
        actor,
        communityId,
        prepared.r2Key ? null : bytes,
        prepared.r2Key,
        mime,
        bytes.length,
        durationMs,
        JSON.stringify(peaks),
        speaker,
        language,
        transcript,
        protocol === 'public' ? consentPublic : 0,
        protocol,
        prepared.now,
      )
      this.s.audit(actor, 'voice.upload', prepared.id)
      return this.s.get<VoiceRow>('SELECT * FROM voice_clips WHERE id=?', prepared.id)!
    })

    return toView(row, actor, this.isSteward(actor, communityId))
  }

  /** Attaches up to 2 unattached voice clips to a newly created post. */
  attachToPost(actor: string, postId: string, ids: string[]) {
    this.s.tx(() => {
      if (!ids.length) return
      if (ids.length > 2 || new Set(ids).size !== ids.length) {
        throw new Fault(400, 'Pilih maksimal dua rekaman suara per posting')
      }
      const post = this.s.getPost(actor, postId)
      if (post.author_id !== actor || this.s.actor(actor).kind !== 'human' || post.uri) {
        throw new Fault(403, 'Hanya penulis posting lokal yang dapat melampirkan suara')
      }
      this.s.requireMember(actor, post.community_id)
      const existing = this.s.get<{ n: number }>('SELECT COUNT(*) n FROM voice_clips WHERE post_id=?', postId)!.n
      if (existing + ids.length > 2) throw new Fault(409, 'Rekaman suara sudah terlampir')
      for (const id of ids) {
        const draft = this.s.get<VoiceRow>('SELECT * FROM voice_clips WHERE id=?', id)
        if (
          !draft ||
          draft.owner_id !== actor ||
          draft.community_id !== post.community_id ||
          draft.post_id ||
          draft.kamus_norm ||
          this.s.clock() - draft.created >= DAY
        ) {
          throw new Fault(404, 'Rekaman suara tidak tersedia')
        }
        this.s.run('UPDATE voice_clips SET post_id=? WHERE id=?', postId, id)
      }
    })
  }

  /** Attaches a voice recording as a native pronunciation clip for a Kamus word in this community. */
  attachToWord(actor: string, communityId: string, rawWord: string, clipId: string): VoiceView {
    const n = kamusNorm(cleanText(rawWord, 60))
    if (!n) throw new Fault(400, 'Kata wajib diisi')
    return this.s.tx(() => {
      this.s.requireMember(actor, communityId)
      if (this.s.actor(actor).kind !== 'human') throw new Fault(403, 'Hanya anggota manusia yang dapat merekam pelafalan')
      const clip = this.s.get<VoiceRow>('SELECT * FROM voice_clips WHERE id=?', clipId)
      if (
        !clip ||
        clip.owner_id !== actor ||
        clip.community_id !== communityId ||
        clip.post_id ||
        clip.kamus_norm ||
        this.s.clock() - clip.created >= DAY
      ) {
        throw new Fault(404, 'Rekaman suara tidak tersedia')
      }
      const count = this.s.get<{ n: number }>(
        'SELECT COUNT(*) n FROM voice_clips WHERE community_id=? AND kamus_norm=?',
        communityId,
        n,
      )!.n
      if (count >= 12) throw new Fault(429, 'Kata ini sudah memiliki cukup banyak rekaman pelafalan')
      this.s.run('UPDATE voice_clips SET kamus_norm=? WHERE id=?', n, clipId)
      this.s.audit(actor, 'kamus.voice.attach', clipId)
      const updated = this.s.get<VoiceRow>('SELECT * FROM voice_clips WHERE id=?', clipId)!
      return toView(updated, actor, this.isSteward(actor, communityId))
    })
  }

  /** Returns visible voice clips for a batch of post IDs, enforcing 'restricted' protocol per viewer. */
  forPosts(viewer: string | undefined, postIds: string[], memberCommunities: Set<string>): Map<string, VoiceView[]> {
    const out = new Map<string, VoiceView[]>()
    if (!postIds.length) return out
    const rows = this.s.all<VoiceRow>(
      'SELECT id,owner_id,community_id,post_id,kamus_norm,NULL bytes,r2_key,mime,size,duration_ms,peaks,speaker,language,transcript,consent_public,protocol,created FROM voice_clips WHERE post_id IN(SELECT value FROM json_each(?)) ORDER BY created ASC',
      JSON.stringify(postIds),
    )
    for (const r of rows) {
      if (!r.post_id) continue
      if (r.protocol === 'restricted' && !memberCommunities.has(r.community_id)) continue
      const list = out.get(r.post_id) ?? []
      list.push(toView(r, viewer, this.isSteward(viewer, r.community_id)))
      out.set(r.post_id, list)
    }
    return out
  }

  /** Returns visible pronunciation recordings for one Kamus word in a community. */
  forWord(viewer: string | undefined, communityId: string, rawWord: string): VoiceView[] {
    if (!this.s.canRead(viewer, this.s.community(communityId))) throw new Fault(404, 'Not found')
    const n = kamusNorm(cleanText(rawWord, 60))
    if (!n) return []
    const isMember = !!viewer && !!this.s.membership(viewer, communityId)
    const steward = this.isSteward(viewer, communityId)
    const rows = this.s.all<VoiceRow>(
      'SELECT id,owner_id,community_id,post_id,kamus_norm,NULL bytes,r2_key,mime,size,duration_ms,peaks,speaker,language,transcript,consent_public,protocol,created FROM voice_clips WHERE community_id=? AND kamus_norm=? ORDER BY created DESC LIMIT 12',
      communityId,
      n,
    )
    return rows.filter((r) => r.protocol !== 'restricted' || isMember).map((r) => toView(r, viewer, steward))
  }

  /** "Bantu tulis": lets any active community member add or refine a text transcript on a voice clip. */
  updateTranscript(actor: string, clipId: string, rawTranscript: unknown, rawLanguage?: unknown): VoiceView {
    const transcript = cleanText(rawTranscript, 2000)
    const language = rawLanguage === undefined ? undefined : cleanText(rawLanguage, 60)
    return this.s.tx(() => {
      const row = this.s.get<VoiceRow>('SELECT * FROM voice_clips WHERE id=?', clipId)
      if (!row || !this.canViewClip(actor, row)) throw new Fault(404, 'Not found')
      this.s.requireMember(actor, row.community_id)
      if (this.s.actor(actor).kind !== 'human') throw new Fault(403, 'Hanya anggota manusia yang dapat menulis transkrip')
      this.s.run(
        'UPDATE voice_clips SET transcript=?,language=COALESCE(?,language) WHERE id=?',
        transcript,
        language ?? null,
        clipId,
      )
      this.s.audit(actor, 'voice.transcript', clipId)
      const updated = this.s.get<VoiceRow>('SELECT * FROM voice_clips WHERE id=?', clipId)!
      return toView(updated, actor, this.isSteward(actor, row.community_id))
    })
  }

  /** Deletes a voice clip immediately (owner or community steward). */
  async withdraw(actor: string, clipId: string): Promise<{ deleted: true; id: string }> {
    const r2Key = this.s.tx(() => {
      const row = this.s.get<VoiceRow>('SELECT * FROM voice_clips WHERE id=?', clipId)
      if (!row) throw new Fault(404, 'Not found')
      this.s.requireMember(actor, row.community_id)
      const steward = this.isSteward(actor, row.community_id)
      if (row.owner_id !== actor && !steward) throw new Fault(403, 'Hanya perekam atau pengurus yang dapat menghapus rekaman ini')
      this.s.run('DELETE FROM voice_clips WHERE id=?', clipId)
      this.s.invalidatePublicContext(row.community_id)
      this.s.audit(actor, 'voice.withdraw', clipId)
      return row.r2_key
    })
    if (this.bucket && r2Key) {
      await this.bucket.delete(r2Key).catch(() => {})
    }
    return { deleted: true, id: clipId }
  }

  /** Reads raw audio bytes for a clip after checking current read access (used by Whisper transcription). */
  async readBytesForMember(actor: string, clipId: string): Promise<{ row: VoiceRow; bytes: Uint8Array }> {
    const row = this.s.get<VoiceRow>('SELECT * FROM voice_clips WHERE id=?', clipId)
    if (!row || !this.canViewClip(actor, row)) throw new Fault(404, 'Not found')
    this.s.requireMember(actor, row.community_id)
    if (this.s.actor(actor).kind !== 'human') throw new Fault(403, 'Hanya anggota manusia yang dapat menjalankan transkrip')
    let bytes: Uint8Array | null = row.bytes ? new Uint8Array(row.bytes) : null
    if (!bytes && row.r2_key && this.bucket) {
      const obj = await this.bucket.get(row.r2_key)
      if (obj) bytes = new Uint8Array(await obj.arrayBuffer())
    }
    if (!bytes) throw new Fault(404, 'Not found')
    return { row, bytes }
  }

  /** Streams audio bytes with strict read-time access control and HTTP Range seeking support. */
  async response(actor: string | undefined, clipId: string, rangeHeader?: string | null): Promise<Response> {
    const row = this.s.get<VoiceRow>('SELECT * FROM voice_clips WHERE id=?', clipId)
    if (!row || !this.canViewClip(actor, row)) throw new Fault(404, 'Not found')
    let bytes: Uint8Array | null = row.bytes ? new Uint8Array(row.bytes) : null
    if (!bytes && row.r2_key && this.bucket) {
      const obj = await this.bucket.get(row.r2_key)
      if (obj) bytes = new Uint8Array(await obj.arrayBuffer())
    }
    if (!bytes) throw new Fault(404, 'Not found')

    const baseHeaders: Record<string, string> = {
      'content-type': row.mime,
      'accept-ranges': 'bytes',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'cross-origin-resource-policy': 'same-origin',
      'content-security-policy': "default-src 'none'; sandbox",
      'referrer-policy': 'no-referrer',
    }

    if (rangeHeader) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
      if (m) {
        const total = bytes.byteLength
        const start = m[1] ? Number(m[1]) : Math.max(0, total - Number(m[2] || 0))
        const end = m[2] ? Math.min(total - 1, Number(m[2])) : total - 1
        if (start >= 0 && start <= end && start < total) {
          const slice = bytes.subarray(start, end + 1)
          return new Response(new Uint8Array(slice), {
            status: 206,
            headers: {
              ...baseHeaders,
              'content-length': String(slice.byteLength),
              'content-range': `bytes ${start}-${end}/${total}`,
            },
          })
        }
        return new Response(null, {
          status: 416,
          headers: { ...baseHeaders, 'content-range': `bytes */${total}` },
        })
      }
    }

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: { ...baseHeaders, 'content-length': String(bytes.byteLength) },
    })
  }
}
