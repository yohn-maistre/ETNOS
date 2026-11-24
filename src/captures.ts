/**
 * 3D captures (.spz Gaussian Splats, .ply, .glb), async Video-to-Splat jobs
 * (Modal.com free-tier GPU worker), and clickable 3D spatial pins (W4).
 *
 * Honors docs/plan/saluran-2026-11-22.md §4:
 * - Direct bring-a-capture (.spz / .ply / .glb from Scaniverse, KIRI, Polycam)
 * - Multi-view video-to-splat queue (no single-image generative hallucination)
 * - Strict magic-byte container validation, read-time community access control,
 *   and HMAC-SHA256 verified worker callbacks.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { Fault, type EtnosCore } from './core.ts'
import type { VoiceBucket } from './voice.ts'

export const CAPTURE_MAX_BYTES_SQLITE = 3 * 1024 * 1024
export const CAPTURE_MAX_BYTES_R2 = 16 * 1024 * 1024

export type CaptureFormat = 'spz' | 'ply' | 'glb' | 'video-job'
export type CaptureState = 'queued' | 'processing' | 'ready' | 'failed'

export type CaptureRow = {
  id: string
  owner_id: string
  community_id: string
  entry_slug: string | null
  title: string
  summary: string
  format: CaptureFormat
  state: CaptureState
  splat_count: number
  bytes: Uint8Array | null
  r2_key: string | null
  size: number
  source_video_url: string | null
  error: string | null
  created: number
  updated: number
}

export type CaptureView = {
  id: string
  viewerId: string
  communityId: string
  entrySlug: string | null
  title: string
  summary: string
  format: CaptureFormat
  state: CaptureState
  splatCount: number
  size: number
  fileUrl: string | null
  error: string | null
  created: number
  updated: number
  canManage: boolean
}

export type SpatialPinView = {
  id: string
  targetId: string
  x: number
  y: number
  z: number
  label: string
  note: string
  kamusWord: string
  voiceClipId: string | null
  authorName: string
  created: number
  canDelete: boolean
}

type PinRow = {
  id: string
  target_id: string
  community_id: string | null
  author_id: string
  x: number
  y: number
  z: number
  label: string
  note: string
  kamus_word: string
  voice_clip_id: string | null
  created: number
  author_name: string
}

const clean = (raw: unknown, max: number) =>
  typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, max) : ''

/** Magic-byte check for 3D capture formats: .glb (glTF binary), .spz (gzipped Niantic SPZ), .ply (Stanford PLY). */
export function inspect3dCapture(bytes: Uint8Array, maxBytes = CAPTURE_MAX_BYTES_SQLITE): { format: 'glb' | 'spz' | 'ply'; mime: string } {
  if (bytes.length < 16 || bytes.length > maxBytes) {
    throw new Fault(400, `Berkas 3D maksimal ${Math.round(maxBytes / (1024 * 1024))} MB`)
  }
  const b = Buffer.from(bytes)
  // GLB: "glTF" (0x46546c67 LE)
  if (b[0] === 0x67 && b[1] === 0x6c && b[2] === 0x54 && b[3] === 0x46) {
    return { format: 'glb', mime: 'model/gltf-binary' }
  }
  // SPZ: gzip stream (1F 8B) containing Niantic SPZ header
  if (b[0] === 0x1f && b[1] === 0x8b) {
    return { format: 'spz', mime: 'application/octet-stream' }
  }
  // PLY: starts with "ply\n" or "ply\r\n"
  const head = b.subarray(0, 6).toString('latin1')
  if (head.startsWith('ply\n') || head.startsWith('ply\r\n')) {
    return { format: 'ply', mime: 'application/octet-stream' }
  }
  throw new Fault(400, 'Format 3D tidak didukung. Gunakan berkas .spz, .ply, atau .glb.')
}

export function signSplatWebhook(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

export function verifySplatWebhook(secret: string, body: string, signature: string | null): boolean {
  if (!secret || !signature) return false
  const expected = signSplatWebhook(secret, body)
  const cleanSig = signature.trim().toLowerCase()
  if (expected.length !== cleanSig.length) return false
  return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(cleanSig, 'utf8'))
}

export class Captures3d {
  private s: EtnosCore
  private bucket?: VoiceBucket
  private workerUrl?: string
  private workerSecret?: string

  constructor(store: EtnosCore, options: { bucket?: VoiceBucket; workerUrl?: string; workerSecret?: string } = {}) {
    this.s = store
    this.bucket = options.bucket
    this.workerUrl = options.workerUrl
    this.workerSecret = options.workerSecret
  }

  private maxBytes() {
    return this.bucket ? CAPTURE_MAX_BYTES_R2 : CAPTURE_MAX_BYTES_SQLITE
  }

  private isSteward(actor: string | undefined, communityId: string): boolean {
    if (!actor) return false
    const m = this.s.membership(actor, communityId)
    return !!m && this.s.actor(actor).kind === 'human' && (m.role === 'owner' || m.role === 'moderator')
  }

  private toView(r: CaptureRow, viewer?: string): CaptureView {
    return {
      id: r.id,
      viewerId: 'cap-' + r.id,
      communityId: r.community_id,
      entrySlug: r.entry_slug,
      title: r.title,
      summary: r.summary,
      format: r.format,
      state: r.state,
      splatCount: r.splat_count,
      size: r.size,
      fileUrl: r.state === 'ready' ? `/v1/captures/${r.id}/file` : null,
      error: r.error,
      created: r.created,
      updated: r.updated,
      canManage: !!viewer && (viewer === r.owner_id || this.isSteward(viewer, r.community_id)),
    }
  }

  /** Direct upload of a .spz, .ply, or .glb capture from Scaniverse, KIRI Engine, or Polycam. */
  async upload(
    actor: string,
    input: { communityId: string; title: string; summary?: unknown; entrySlug?: unknown; bytes: string; splatCount?: unknown },
  ): Promise<CaptureView> {
    const communityId = clean(input.communityId, 100)
    const title = clean(input.title, 140)
    if (!communityId || !title) throw new Fault(400, 'Komunitas dan judul benda 3D wajib diisi')
    const summary = clean(input.summary, 1000)
    const entrySlug = clean(input.entrySlug, 120) || null
    const maxBytes = this.maxBytes()
    const encoded = typeof input.bytes === 'string' ? input.bytes.trim() : ''
    if (!encoded || encoded.length > Math.ceil(maxBytes / 3) * 4 + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new Fault(400, 'Data berkas 3D tidak valid')
    }
    const bytes = Buffer.from(encoded, 'base64')
    if (bytes.toString('base64') !== encoded) throw new Fault(400, 'Data berkas 3D tidak valid')
    const { format, mime } = inspect3dCapture(bytes, maxBytes)
    const splatCount = Number.isSafeInteger(Number(input.splatCount)) && Number(input.splatCount) >= 0 ? Number(input.splatCount) : 0

    const prepared = this.s.tx(() => {
      this.s.requireMember(actor, communityId)
      if (this.s.actor(actor).kind !== 'human') throw new Fault(403, 'Hanya anggota manusia yang dapat mengunggah benda 3D')
      const now = this.s.clock()
      const total = this.s.get<{ size: number; n: number }>('SELECT COALESCE(SUM(size),0) size,COUNT(*) n FROM captures_3d WHERE bytes IS NOT NULL')!
      if (!this.bucket && (total.n >= 200 || total.size + bytes.length > 64 * 1024 * 1024)) {
        throw new Fault(429, 'Penyimpanan 3D sementara penuh')
      }
      const id = randomUUID()
      return { id, now, r2Key: this.bucket ? `captures/${communityId}/${id}.${format}` : null }
    })

    if (this.bucket && prepared.r2Key) {
      await this.bucket.put(prepared.r2Key, bytes, { httpMetadata: { contentType: mime } })
    }

    const row = this.s.tx(() => {
      this.s.requireMember(actor, communityId)
      this.s.run(
        `INSERT INTO captures_3d(id,owner_id,community_id,entry_slug,title,summary,format,state,splat_count,bytes,r2_key,size,source_video_url,error,created,updated)
         VALUES(?,?,?,?,?,?,?,'ready',?,?,?,?,NULL,NULL,?,?)`,
        prepared.id,
        actor,
        communityId,
        entrySlug,
        title,
        summary,
        format,
        splatCount,
        prepared.r2Key ? null : bytes,
        prepared.r2Key,
        bytes.length,
        prepared.now,
        prepared.now,
      )
      this.s.audit(actor, 'capture3d.upload', prepared.id)
      return this.s.get<CaptureRow>('SELECT * FROM captures_3d WHERE id=?', prepared.id)!
    })
    return this.toView(row, actor)
  }

  /** Queues an async Video-to-3D Gaussian Splat job on the configured Modal GPU worker. */
  async queueVideoJob(
    actor: string,
    input: { communityId: string; title: string; summary?: unknown; entrySlug?: unknown; videoUrl: string; mode?: unknown },
    fetcher: typeof fetch = fetch,
  ): Promise<CaptureView> {
    const communityId = clean(input.communityId, 100)
    const title = clean(input.title, 140)
    const summary = clean(input.summary, 1000)
    const entrySlug = clean(input.entrySlug, 120) || null
    const videoUrl = clean(input.videoUrl, 1500)
    const mode = input.mode === 'high' ? 'high' : 'fast'
    let parsedUrl: URL
    try {
      parsedUrl = new URL(videoUrl)
      if (parsedUrl.protocol !== 'https:') throw new Error()
    } catch {
      throw new Fault(400, 'Alamat video harus berupa tautan HTTPS yang valid')
    }
    if (!communityId || !title) throw new Fault(400, 'Komunitas dan judul benda 3D wajib diisi')

    const row = this.s.tx(() => {
      this.s.requireMember(actor, communityId)
      if (this.s.actor(actor).kind !== 'human') throw new Fault(403, 'Hanya anggota manusia yang dapat memulai pemindaian video')
      if (this.s.community(communityId).visibility !== 'public') {
        throw new Fault(403, 'Video dari ruang privat tidak dikirim ke pekerja GPU luar; unggah berkas .spz/.glb langsung.')
      }
      const id = randomUUID()
      const now = this.s.clock()
      this.s.run(
        `INSERT INTO captures_3d(id,owner_id,community_id,entry_slug,title,summary,format,state,splat_count,bytes,r2_key,size,source_video_url,error,created,updated)
         VALUES(?,?,?,?,?,?,'video-job','queued',0,NULL,NULL,0,?,NULL,?,?)`,
        id,
        actor,
        communityId,
        entrySlug,
        title,
        summary,
        parsedUrl.href,
        now,
        now,
      )
      this.s.audit(actor, 'capture3d.queue_video', id)
      return this.s.get<CaptureRow>('SELECT * FROM captures_3d WHERE id=?', id)!
    })

    if (this.workerUrl) {
      try {
        const callbackUrl = `${this.s.base}/v1/captures/${row.id}/callback`
        const res = await fetcher(this.workerUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jobId: row.id, videoUrl: parsedUrl.href, callbackUrl, mode }),
          signal: AbortSignal.timeout(15000),
        })
        if (res.ok) {
          this.s.tx(() => this.s.run("UPDATE captures_3d SET state='processing',updated=? WHERE id=?", this.s.clock(), row.id))
        }
      } catch {
        // Leave in queued state so operator/retry can inspect honestly.
      }
    }
    const fresh = this.s.get<CaptureRow>('SELECT * FROM captures_3d WHERE id=?', row.id)!
    return this.toView(fresh, actor)
  }

  /** Receives HMAC-SHA256 signed reconstruction results from packages/splat-worker. */
  async handleCallback(captureId: string, rawBody: string, signature: string | null): Promise<CaptureView> {
    if (!this.workerSecret || !verifySplatWebhook(this.workerSecret, rawBody, signature)) {
      throw new Fault(403, 'Invalid webhook signature')
    }
    let payload: { state?: string; bytes?: string; splatCount?: number; error?: string }
    try {
      payload = JSON.parse(rawBody) as { state?: string; bytes?: string; splatCount?: number; error?: string }
    } catch {
      throw new Fault(400, 'Invalid JSON')
    }
    const existing = this.s.get<CaptureRow>('SELECT * FROM captures_3d WHERE id=?', captureId)
    if (!existing) throw new Fault(404, 'Not found')

    if (payload.state === 'failed') {
      const msg = clean(payload.error, 400) || 'Rekonstruksi 3D gagal.'
      this.s.tx(() => this.s.run("UPDATE captures_3d SET state='failed',error=?,updated=? WHERE id=?", msg, this.s.clock(), captureId))
      return this.toView(this.s.get<CaptureRow>('SELECT * FROM captures_3d WHERE id=?', captureId)!)
    }

    const encoded = typeof payload.bytes === 'string' ? payload.bytes.trim() : ''
    const bytes = Buffer.from(encoded, 'base64')
    const { format, mime } = inspect3dCapture(bytes, this.maxBytes())
    const r2Key = this.bucket ? `captures/${existing.community_id}/${captureId}.${format}` : null
    if (this.bucket && r2Key) {
      await this.bucket.put(r2Key, bytes, { httpMetadata: { contentType: mime } })
    }
    const splatCount = Number.isSafeInteger(Number(payload.splatCount)) ? Number(payload.splatCount) : 0
    this.s.tx(() => {
      this.s.run(
        "UPDATE captures_3d SET format=?,state='ready',splat_count=?,bytes=?,r2_key=?,size=?,error=NULL,updated=? WHERE id=?",
        format,
        splatCount,
        r2Key ? null : bytes,
        r2Key,
        bytes.length,
        this.s.clock(),
        captureId,
      )
    })
    return this.toView(this.s.get<CaptureRow>('SELECT * FROM captures_3d WHERE id=?', captureId)!)
  }

  list(viewer: string | undefined, filters: { communityId?: string; entrySlug?: string } = {}): CaptureView[] {
    const where = ["(c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))"]
    const args: (string | number | null)[] = [viewer ?? null]
    if (filters.communityId) {
      where.push('x.community_id=?')
      args.push(filters.communityId)
    }
    if (filters.entrySlug) {
      where.push('x.entry_slug=?')
      args.push(filters.entrySlug)
    }
    const rows = this.s.all<CaptureRow>(
      `SELECT x.id,x.owner_id,x.community_id,x.entry_slug,x.title,x.summary,x.format,x.state,x.splat_count,NULL bytes,x.r2_key,x.size,x.source_video_url,x.error,x.created,x.updated
       FROM captures_3d x
       JOIN communities c ON c.id=x.community_id
       WHERE ${where.join(' AND ')}
       ORDER BY x.created DESC LIMIT 60`,
      ...args,
    )
    return rows.map((r) => this.toView(r, viewer))
  }

  read(viewer: string | undefined, captureId: string): CaptureView & { pins: SpatialPinView[] } {
    const row = this.s.get<CaptureRow>(
      'SELECT id,owner_id,community_id,entry_slug,title,summary,format,state,splat_count,NULL bytes,r2_key,size,source_video_url,error,created,updated FROM captures_3d WHERE id=?',
      captureId,
    )
    if (!row || !this.s.canRead(viewer, this.s.community(row.community_id))) throw new Fault(404, 'Not found')
    return { ...this.toView(row, viewer), pins: this.pinsFor(viewer, 'cap-' + row.id) }
  }

  async fileResponse(viewer: string | undefined, captureId: string): Promise<Response> {
    const row = this.s.get<CaptureRow>('SELECT * FROM captures_3d WHERE id=?', captureId)
    if (!row || row.state !== 'ready' || !this.s.canRead(viewer, this.s.community(row.community_id))) {
      throw new Fault(404, 'Not found')
    }
    let bytes: Uint8Array | null = row.bytes ? new Uint8Array(row.bytes) : null
    if (!bytes && row.r2_key && this.bucket) {
      const obj = await this.bucket.get(row.r2_key)
      if (obj) bytes = new Uint8Array(await obj.arrayBuffer())
    }
    if (!bytes) throw new Fault(404, 'Not found')
    const mime = row.format === 'glb' ? 'model/gltf-binary' : 'application/octet-stream'
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'content-type': mime,
        'content-length': String(bytes.byteLength),
        'x-etnos-3d-format': row.format,
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
        'referrer-policy': 'no-referrer',
      },
    })
  }

  /** Lists clickable 3D spatial pins for any Penampil object ID (built-in or cap-<id>). */
  pinsFor(viewer: string | undefined, targetId: string): SpatialPinView[] {
    const target = clean(targetId, 140)
    if (!target) return []
    const rows = this.s.all<PinRow>(
      `SELECT p.*, a.name author_name
       FROM capture_pins p
       JOIN actors a ON a.id=p.author_id
       LEFT JOIN communities c ON c.id=p.community_id
       WHERE p.target_id=?
         AND (p.community_id IS NULL OR c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))
       ORDER BY p.created ASC LIMIT 40`,
      target,
      viewer ?? null,
    )
    return rows.map((r) => ({
      id: r.id,
      targetId: r.target_id,
      x: r.x,
      y: r.y,
      z: r.z,
      label: r.label,
      note: r.note,
      kamusWord: r.kamus_word,
      voiceClipId: r.voice_clip_id,
      authorName: r.author_name,
      created: r.created,
      canDelete: !!viewer && (viewer === r.author_id || (!!r.community_id && this.isSteward(viewer, r.community_id))),
    }))
  }

  /** Places a clickable 3D spatial pin on any Penampil 3D object or uploaded capture. */
  addPin(
    actor: string,
    targetId: string,
    input: { x: unknown; y: unknown; z: unknown; label: unknown; note?: unknown; kamusWord?: unknown; voiceClipId?: unknown; communityId?: unknown },
  ): SpatialPinView {
    const target = clean(targetId, 140)
    const label = clean(input.label, 80)
    const note = clean(input.note, 500)
    const kamusWord = clean(input.kamusWord, 60)
    const voiceClipId = clean(input.voiceClipId, 100) || null
    const x = Number(input.x), y = Number(input.y), z = Number(input.z)
    if (!target || !label) throw new Fault(400, 'Label titik 3D wajib diisi')
    if (![x, y, z].every((n) => Number.isFinite(n) && Math.abs(n) <= 100)) {
      throw new Fault(400, 'Koordinat 3D tidak valid')
    }
    return this.s.tx(() => {
      if (this.s.actor(actor).kind !== 'human') throw new Fault(403, 'Hanya anggota manusia yang dapat menandai benda 3D')
      let communityId: string | null = clean(input.communityId, 100) || null
      if (target.startsWith('cap-')) {
        const cap = this.s.get<CaptureRow>('SELECT * FROM captures_3d WHERE id=?', target.slice(4))
        if (!cap || !this.s.canRead(actor, this.s.community(cap.community_id))) throw new Fault(404, 'Not found')
        this.s.requireMember(actor, cap.community_id)
        communityId = cap.community_id
      } else if (communityId) {
        this.s.requireMember(actor, communityId)
      }
      const existingCount = this.s.get<{ n: number }>('SELECT COUNT(*) n FROM capture_pins WHERE target_id=?', target)!.n
      if (existingCount >= 30) throw new Fault(429, 'Maksimal 30 titik penanda per benda 3D')
      const id = randomUUID()
      const now = this.s.clock()
      this.s.run(
        'INSERT INTO capture_pins(id,target_id,community_id,author_id,x,y,z,label,note,kamus_word,voice_clip_id,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
        id,
        target,
        communityId,
        actor,
        x,
        y,
        z,
        label,
        note,
        kamusWord,
        voiceClipId,
        now,
      )
      this.s.audit(actor, 'capture3d.pin.add', id)
      return this.pinsFor(actor, target).find((p) => p.id === id)!
    })
  }

  deletePin(actor: string, pinId: string): { deleted: true } {
    return this.s.tx(() => {
      const row = this.s.get<{ id: string; author_id: string; community_id: string | null }>(
        'SELECT id,author_id,community_id FROM capture_pins WHERE id=?',
        pinId,
      )
      if (!row) throw new Fault(404, 'Not found')
      const allowed = row.author_id === actor || (!!row.community_id && this.isSteward(actor, row.community_id))
      if (!allowed) throw new Fault(403, 'Hanya pembuat penanda atau pengurus yang dapat menghapusnya')
      this.s.run('DELETE FROM capture_pins WHERE id=?', pinId)
      this.s.audit(actor, 'capture3d.pin.delete', pinId)
      return { deleted: true }
    })
  }

  async withdraw(actor: string, captureId: string): Promise<{ deleted: true }> {
    const r2Key = this.s.tx(() => {
      const row = this.s.get<CaptureRow>('SELECT * FROM captures_3d WHERE id=?', captureId)
      if (!row) throw new Fault(404, 'Not found')
      this.s.requireMember(actor, row.community_id)
      if (row.owner_id !== actor && !this.isSteward(actor, row.community_id)) {
        throw new Fault(403, 'Hanya pengunggah atau pengurus yang dapat menghapus benda 3D ini')
      }
      this.s.run('DELETE FROM capture_pins WHERE target_id=?', 'cap-' + captureId)
      this.s.run('DELETE FROM captures_3d WHERE id=?', captureId)
      this.s.audit(actor, 'capture3d.withdraw', captureId)
      return row.r2_key
    })
    if (this.bucket && r2Key) {
      await this.bucket.delete(r2Key).catch(() => {})
    }
    return { deleted: true }
  }
}
