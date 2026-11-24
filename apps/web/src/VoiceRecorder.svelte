<script lang="ts">
  // Reusable inline voice recorder + phone/WhatsApp audio importer for posts and Kamus cards.
  import { onDestroy } from 'svelte'
  import { Mic, Square, Upload, Trash2, Play, Pause, LockKeyhole } from '@lucide/svelte'
  import {
    pickAudioMime,
    formatDuration,
    resamplePeaks,
    prepareVoiceFile,
    VOICE_MAX_BYTES,
    VOICE_MAX_MS,
    type VoiceDraft,
  } from './voice'

  let {
    draft = $bindable<VoiceDraft | null>(null),
    compact = false,
    allowProtocol = true,
    onReady,
    onError,
  }: {
    draft?: VoiceDraft | null
    compact?: boolean
    allowProtocol?: boolean
    onReady?: (clip: VoiceDraft) => void
    onError?: (message: string) => void
  } = $props()

  let recording = $state(false),
    elapsedMs = $state(0),
    livePeaks = $state<number[]>([]),
    playing = $state(false),
    audioEl = $state<HTMLAudioElement | null>(null),
    fileInput = $state<HTMLInputElement | null>(null)

  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let audioCtx: AudioContext | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let chunks: Blob[] = []
  let startedAt = 0

  function stopHardware() {
    if (timer) { clearInterval(timer); timer = null }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null }
    if (audioCtx) { void audioCtx.close().catch(() => {}); audioCtx = null }
  }

  onDestroy(() => {
    stopHardware()
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  })

  async function start() {
    if (recording) return
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.('Browser ini belum mendukung rekaman mikrofon. Gunakan unggah berkas suara.')
      return
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickAudioMime()
      chunks = []
      livePeaks = []
      elapsedMs = 0
      startedAt = Date.now()

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      let analyser: AnalyserNode | null = null
      let sampleBuf: Uint8Array<ArrayBuffer> | null = null
      if (AudioCtx) {
        audioCtx = new AudioCtx()
        const src = audioCtx.createMediaStreamSource(stream)
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        src.connect(analyser)
        sampleBuf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
      }

      recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 })
        : new MediaRecorder(stream)

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data)
      }
      recorder.onstop = () => {
        const finalDuration = Math.max(300, Date.now() - startedAt)
        const blob = new Blob(chunks, { type: recorder?.mimeType || mime || 'audio/webm' })
        stopHardware()
        recording = false
        if (blob.size > VOICE_MAX_BYTES) {
          onError?.(`Rekaman terlalu besar (${Math.round(blob.size / 1024)} KB). Maksimal ${Math.round(VOICE_MAX_BYTES / 1024)} KB.`)
          return
        }
        if (draft) URL.revokeObjectURL(draft.previewUrl)
        const created: VoiceDraft = {
          key: crypto.randomUUID(),
          blob,
          previewUrl: URL.createObjectURL(blob),
          durationMs: Math.min(VOICE_MAX_MS, finalDuration),
          peaks: resamplePeaks(livePeaks, 36),
          speaker: '',
          language: '',
          transcript: '',
          protocol: 'community',
        }
        draft = created
        onReady?.(created)
      }

      recorder.start(250)
      recording = true
      timer = setInterval(() => {
        elapsedMs = Date.now() - startedAt
        if (analyser && sampleBuf) {
          analyser.getByteTimeDomainData(sampleBuf)
          let max = 0
          for (let i = 0; i < sampleBuf.length; i++) {
            const amp = Math.abs(sampleBuf[i] - 128) / 128
            if (amp > max) max = amp
          }
          livePeaks = [...livePeaks.slice(-80), Math.max(8, Math.min(100, Math.round(max * 160)))]
        }
        if (elapsedMs >= VOICE_MAX_MS) stop()
      }, 150)
    } catch (e) {
      stopHardware()
      recording = false
      onError?.(e instanceof Error ? 'Izin mikrofon belum diberikan: ' + e.message : 'Mikrofon tidak dapat dibuka.')
    }
  }

  function stop() {
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }

  function discard() {
    if (audioEl) audioEl.pause()
    playing = false
    if (draft) URL.revokeObjectURL(draft.previewUrl)
    draft = null
  }

  async function pickFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    try {
      const prepared = await prepareVoiceFile(file)
      if (draft) URL.revokeObjectURL(draft.previewUrl)
      draft = prepared
      onReady?.(prepared)
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Berkas suara belum dapat dibaca.')
    } finally {
      if (fileInput) fileInput.value = ''
    }
  }

  function togglePlay() {
    if (!audioEl) return
    if (playing) { audioEl.pause(); playing = false }
    else { void audioEl.play(); playing = true }
  }
</script>

<div class="vr-box" class:vr-compact={compact}>
  {#if recording}
    <div class="vr-live">
      <span class="vr-dot" aria-hidden="true"></span>
      <span class="vr-time">{formatDuration(elapsedMs)}</span>
      <div class="vr-bars" aria-hidden="true">
        {#each livePeaks.slice(-24) as p, idx (idx)}
          <span style={`height:${Math.max(18, p)}%`}></span>
        {/each}
      </div>
      <button type="button" class="vr-stop" onclick={stop} aria-label="Hentikan rekaman">
        <Square size={14} /> Selesai
      </button>
    </div>
  {:else if draft}
    <div class="vr-preview">
      <audio bind:this={audioEl} src={draft.previewUrl} onended={() => (playing = false)}></audio>
      <button type="button" class="vr-play" onclick={togglePlay} aria-label={playing ? 'Jeda rekaman' : 'Putar rekaman'}>
        {#if playing}<Pause size={15} />{:else}<Play size={15} />{/if}
      </button>
      <div class="vr-bars vr-static" aria-hidden="true">
        {#each draft.peaks as p, idx (idx)}
          <span style={`height:${Math.max(14, p)}%`}></span>
        {/each}
      </div>
      <span class="vr-time">{formatDuration(draft.durationMs)}</span>
      <button type="button" class="vr-trash" onclick={discard} aria-label="Hapus rekaman">
        <Trash2 size={14} />
      </button>
    </div>
    {#if !compact}
      <div class="vr-meta">
        <input
          type="text"
          maxlength="120"
          placeholder="Nama pembicara (opsional, misalnya: Mama Yuliana)"
          bind:value={draft.speaker}
        />
        {#if allowProtocol}
          <label class="vr-proto">
            <input
              type="checkbox"
              checked={draft.protocol === 'restricted'}
              onchange={(e) => {
                if (draft) draft.protocol = (e.currentTarget as HTMLInputElement).checked ? 'restricted' : 'community'
              }}
            />
            <LockKeyhole size={13} />
            <span>Hanya anggota komunitas ini yang boleh mendengar</span>
          </label>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="vr-idle">
      <button type="button" class="vr-rec" onclick={start}>
        <Mic size={15} /> {compact ? 'Rekam pelafalan' : 'Rekam suara'}
      </button>
      <button type="button" class="vr-up" onclick={() => fileInput?.click()}>
        <Upload size={14} /> Unggah audio
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept="audio/ogg,audio/opus,audio/webm,audio/mp4,audio/mpeg,.ogg,.opus,.webm,.m4a,.mp3"
        hidden
        onchange={(e) => void pickFile(e.currentTarget.files)}
      />
      <small class="vr-hint">Maks. 3 menit · Ogg/Opus, WebM, M4A, MP3</small>
    </div>
  {/if}
</div>

<style>
  .vr-box { border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; background: color-mix(in srgb, var(--surface) 88%, var(--accent) 4%); display: grid; gap: 8px; }
  .vr-compact { padding: 8px 10px; border-radius: 10px; }
  .vr-idle, .vr-live, .vr-preview { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .vr-rec, .vr-stop, .vr-up, .vr-play, .vr-trash { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; font-size: 0.84rem; font-weight: 600; cursor: pointer; border: 1px solid var(--border); padding: 6px 12px; background: var(--surface); color: var(--ink); }
  .vr-rec { background: var(--accent); color: var(--on-accent, #fff); border-color: transparent; }
  .vr-stop { background: #b42318; color: #fff; border-color: transparent; }
  .vr-play { width: 32px; height: 32px; padding: 0; justify-content: center; background: var(--accent); color: var(--on-accent, #fff); border-color: transparent; }
  .vr-trash { width: 30px; height: 30px; padding: 0; justify-content: center; color: var(--muted); }
  .vr-dot { width: 9px; height: 9px; border-radius: 50%; background: #d92d20; animation: vrpulse 1s ease-in-out infinite; }
  @keyframes vrpulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }
  .vr-time { font-variant-numeric: tabular-nums; font-size: 0.82rem; color: var(--muted); min-width: 36px; }
  .vr-bars { flex: 1; min-width: 90px; height: 26px; display: flex; align-items: center; gap: 2px; }
  .vr-bars span { flex: 1; border-radius: 999px; background: var(--accent); opacity: 0.72; min-height: 3px; }
  .vr-hint { font-size: 0.76rem; color: var(--muted); }
  .vr-meta { display: grid; gap: 6px; }
  .vr-meta input[type='text'] { width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-size: 0.84rem; background: var(--surface); color: var(--ink); }
  .vr-proto { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--muted); cursor: pointer; }
</style>
