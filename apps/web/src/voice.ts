/**
 * Client-side voice recording, waveform peak extraction, audio file import
 * (including WhatsApp .opus/.ogg/.m4a), and upload helpers for ETNOS W2.
 */
import { request, type VoiceAttachment } from './api'

export const VOICE_MAX_BYTES = 768 * 1024
export const VOICE_MAX_MS = 180_000

export type VoiceDraft = {
  key: string
  blob: Blob
  previewUrl: string
  durationMs: number
  peaks: number[]
  speaker: string
  language: string
  transcript: string
  protocol: 'community' | 'public' | 'restricted'
  uploaded?: VoiceAttachment
}

export function pickAudioMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/webm',
  ]
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m
    } catch {
      /* ignore */
    }
  }
  return ''
}

export function formatDuration(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function resamplePeaks(raw: number[], target = 36): number[] {
  if (!raw.length) return Array.from({ length: target }, () => 18)
  if (raw.length <= target) {
    const out: number[] = []
    for (let i = 0; i < target; i++) {
      const idx = Math.min(raw.length - 1, Math.floor((i / target) * raw.length))
      out.push(Math.max(6, Math.min(100, Math.round(raw[idx]))))
    }
    return out
  }
  const step = raw.length / target
  const out: number[] = []
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * step)
    const end = Math.max(start + 1, Math.floor((i + 1) * step))
    let peak = 0
    for (let j = start; j < end && j < raw.length; j++) peak = Math.max(peak, raw[j])
    out.push(Math.max(6, Math.min(100, Math.round(peak))))
  }
  return out
}

export async function analyzeAudioBlob(blob: Blob): Promise<{ durationMs: number; peaks: number[] }> {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return { durationMs: 2000, peaks: resamplePeaks([]) }
    const ctx = new AudioCtx()
    try {
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
      const ch = buf.getChannelData(0)
      const bars = 36
      const block = Math.max(1, Math.floor(ch.length / bars))
      const peaks: number[] = []
      for (let i = 0; i < bars; i++) {
        let max = 0
        const start = i * block
        const end = Math.min(ch.length, start + block)
        for (let j = start; j < end; j += Math.max(1, Math.floor((end - start) / 200))) {
          const v = Math.abs(ch[j])
          if (v > max) max = v
        }
        peaks.push(Math.max(6, Math.min(100, Math.round(max * 100))))
      }
      return { durationMs: Math.max(300, Math.round(buf.duration * 1000)), peaks }
    } finally {
      await ctx.close().catch(() => {})
    }
  } catch {
    return { durationMs: 2000, peaks: resamplePeaks([]) }
  }
}

export async function prepareVoiceFile(file: File): Promise<VoiceDraft> {
  if (file.size > VOICE_MAX_BYTES) {
    throw new Error(`Berkas suara terlalu besar (maksimal ${Math.round(VOICE_MAX_BYTES / 1024)} KB).`)
  }
  const { durationMs, peaks } = await analyzeAudioBlob(file)
  if (durationMs > VOICE_MAX_MS) {
    throw new Error('Durasi rekaman suara maksimal 3 menit.')
  }
  return {
    key: crypto.randomUUID(),
    blob: file,
    previewUrl: URL.createObjectURL(file),
    durationMs,
    peaks,
    speaker: '',
    language: '',
    transcript: '',
    protocol: 'community',
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export async function uploadVoiceDraft(communityId: string, draft: VoiceDraft): Promise<VoiceAttachment> {
  if (draft.uploaded) return draft.uploaded
  const bytes = await blobToBase64(draft.blob)
  const uploaded = await request<VoiceAttachment>('/v1/voice', {
    communityId,
    bytes,
    durationMs: draft.durationMs,
    peaks: draft.peaks,
    speaker: draft.speaker.trim(),
    language: draft.language.trim(),
    transcript: draft.transcript.trim(),
    protocol: draft.protocol,
    consentPublic: draft.protocol === 'public',
  })
  draft.uploaded = uploaded
  return uploaded
}

/** Reads any audio file forwarded via the PWA Share Target service worker cache. */
export async function consumeSharedVoice(): Promise<{ file: File; title?: string; text?: string } | null> {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open('etnos-share-intake')
    const metaRes = await cache.match('/__share_meta__')
    const audioRes = await cache.match('/__share_audio__')
    if (!audioRes) return null
    const meta = metaRes ? ((await metaRes.json()) as { name?: string; title?: string; text?: string }) : {}
    const blob = await audioRes.blob()
    await cache.delete('/__share_meta__')
    await cache.delete('/__share_audio__')
    const file = new File([blob], meta.name || 'titip-suara.ogg', { type: blob.type || 'audio/ogg' })
    return { file, title: meta.title, text: meta.text }
  } catch {
    return null
  }
}
