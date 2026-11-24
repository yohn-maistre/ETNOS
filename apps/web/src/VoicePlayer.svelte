<script lang="ts">
  // Waveform voice player with 0.75x learner speed, speaker credit, cultural protocol badge,
  // and inline "Bantu tulis" community transcription.
  import { Play, Pause, LockKeyhole, PencilLine, Sparkles } from '@lucide/svelte'
  import { request, type VoiceAttachment } from './api'
  import { formatDuration, resamplePeaks } from './voice'

  let {
    clip,
    canHelpWrite = false,
    compact = false,
    onUpdated,
  }: {
    clip: VoiceAttachment
    canHelpWrite?: boolean
    compact?: boolean
    onUpdated?: (next: VoiceAttachment) => void
  } = $props()

  let audio = $state<HTMLAudioElement | null>(null),
    playing = $state(false),
    currentMs = $state(0),
    totalMs = $state(0),
    slow = $state(false),
    editing = $state(false),
    draftText = $state(''),
    busy = $state(false),
    note = $state('')

  const bars = $derived(resamplePeaks(clip.peaks, compact ? 22 : 36))
  const effectiveTotal = $derived(totalMs || clip.durationMs || 1000)
  const progress = $derived(Math.max(0, Math.min(1, currentMs / effectiveTotal)))

  function toggle() {
    if (!audio) return
    if (playing) { audio.pause(); playing = false }
    else { audio.playbackRate = slow ? 0.75 : 1; void audio.play(); playing = true }
  }

  function toggleSpeed() {
    slow = !slow
    if (audio) audio.playbackRate = slow ? 0.75 : 1
  }

  function seek(index: number) {
    if (!audio) return
    const ratio = (index + 0.5) / bars.length
    const sec = (effectiveTotal / 1000) * ratio
    if (Number.isFinite(sec)) {
      audio.currentTime = sec
      currentMs = sec * 1000
    }
  }

  async function saveTranscript() {
    if (busy) return
    busy = true; note = ''
    try {
      const updated = await request<VoiceAttachment>('/v1/voice/' + encodeURIComponent(clip.id) + '/transcript', {
        transcript: draftText.trim(),
      })
      clip.transcript = updated.transcript
      editing = false
      onUpdated?.(updated)
    } catch (e) {
      note = e instanceof Error ? e.message : 'Transkrip belum tersimpan.'
    } finally {
      busy = false
    }
  }

  async function autoTranscribe() {
    if (busy) return
    busy = true; note = ''
    try {
      const res = await request<VoiceAttachment | { empty?: boolean }>('/v1/voice/' + encodeURIComponent(clip.id) + '/transcribe', {
        language: clip.language || 'id',
      })
      if ('transcript' in res && res.transcript) {
        clip.transcript = res.transcript
        draftText = res.transcript
        onUpdated?.(res)
      } else {
        note = 'Tidak ada ucapan yang terdeteksi otomatis. Silakan gunakan Bantu tulis.'
      }
    } catch (e) {
      note = e instanceof Error ? e.message : 'Transkrip otomatis belum tersedia.'
    } finally {
      busy = false
    }
  }
</script>

<div class="vp-card" class:vp-compact={compact}>
  <audio
    bind:this={audio}
    src={clip.url}
    preload="none"
    onloadedmetadata={() => {
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        totalMs = Math.round(audio.duration * 1000)
      }
    }}
    ontimeupdate={() => { if (audio) currentMs = Math.round(audio.currentTime * 1000) }}
    onended={() => { playing = false; currentMs = 0 }}
  ></audio>

  <div class="vp-row">
    <button type="button" class="vp-play" onclick={toggle} aria-label={playing ? 'Jeda rekaman suara' : 'Putar rekaman suara'}>
      {#if playing}<Pause size={15} />{:else}<Play size={15} />{/if}
    </button>
    <div class="vp-wave" role="group" aria-label="Gelombang suara">
      {#each bars as height, i (i)}
        <button
          type="button"
          class="vp-bar"
          class:vp-passed={i / bars.length <= progress}
          style={`height:${Math.max(16, height)}%`}
          aria-label={`Lompat ke ${Math.round((i / bars.length) * 100)}%`}
          onclick={() => seek(i)}
        ></button>
      {/each}
    </div>
    <span class="vp-time">{formatDuration(playing ? currentMs : effectiveTotal)}</span>
    <button type="button" class="vp-speed" class:vp-slow={slow} onclick={toggleSpeed} title="Kecepatan putar">
      {slow ? '0.75×' : '1×'}
    </button>
  </div>

  {#if clip.speaker || clip.protocol === 'restricted' || (!compact && canHelpWrite)}
    <div class="vp-foot">
      {#if clip.speaker}<span class="vp-speaker">Suara: {clip.speaker}</span>{/if}
      {#if clip.protocol === 'restricted'}
        <span class="vp-lock"><LockKeyhole size={12} /> Khusus anggota</span>
      {/if}
      {#if !compact && canHelpWrite && !editing}
        <button type="button" class="vp-action" onclick={() => { draftText = clip.transcript; editing = true }}>
          <PencilLine size={12} /> {clip.transcript ? 'Sunting tulisan' : 'Bantu tulis'}
        </button>
        {#if !clip.transcript}
          <button type="button" class="vp-action" disabled={busy} onclick={autoTranscribe}>
            <Sparkles size={12} /> {busy ? 'Memproses...' : 'Transkrip ID'}
          </button>
        {/if}
      {/if}
    </div>
  {/if}

  {#if clip.transcript && !editing}
    <p class="vp-transcript">{clip.transcript}</p>
  {/if}

  {#if editing}
    <form class="vp-edit" onsubmit={(e) => { e.preventDefault(); void saveTranscript() }}>
      <textarea rows="2" maxlength="2000" placeholder="Tulis apa yang diucapkan dalam rekaman ini..." bind:value={draftText}></textarea>
      <div class="vp-edit-actions">
        <button type="button" onclick={() => (editing = false)}>Batal</button>
        <button type="submit" class="vp-save" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan tulisan'}</button>
      </div>
    </form>
  {/if}

  {#if note}<p class="vp-note">{note}</p>{/if}
</div>

<style>
  .vp-card { border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; background: color-mix(in srgb, var(--surface) 92%, var(--accent) 4%); display: grid; gap: 7px; margin-top: 8px; }
  .vp-compact { padding: 7px 10px; border-radius: 10px; margin-top: 0; }
  .vp-row { display: flex; align-items: center; gap: 8px; }
  .vp-play { width: 32px; height: 32px; border-radius: 999px; border: 0; background: var(--accent); color: var(--on-accent, #fff); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
  .vp-wave { flex: 1; height: 28px; display: flex; align-items: center; gap: 2px; }
  .vp-bar { flex: 1; border: 0; padding: 0; border-radius: 999px; background: color-mix(in srgb, var(--ink) 22%, transparent); cursor: pointer; min-height: 4px; transition: background 0.12s; }
  .vp-bar.vp-passed { background: var(--accent); }
  .vp-time { font-variant-numeric: tabular-nums; font-size: 0.78rem; color: var(--muted); flex: 0 0 auto; }
  .vp-speed { border: 1px solid var(--border); border-radius: 999px; background: var(--surface); color: var(--muted); font-size: 0.74rem; font-weight: 600; padding: 2px 7px; cursor: pointer; }
  .vp-speed.vp-slow { border-color: var(--accent); color: var(--accent); }
  .vp-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--muted); }
  .vp-speaker { font-weight: 600; color: var(--ink); }
  .vp-lock { display: inline-flex; align-items: center; gap: 4px; color: var(--accent); font-weight: 600; }
  .vp-action { display: inline-flex; align-items: center; gap: 4px; border: 0; background: transparent; color: var(--muted); font-size: 0.76rem; cursor: pointer; padding: 2px 4px; }
  .vp-action:hover { color: var(--ink); }
  .vp-transcript { margin: 0; font-size: 0.86rem; line-height: 1.45; color: var(--ink); border-left: 2px solid color-mix(in srgb, var(--accent) 45%, transparent); padding-left: 8px; }
  .vp-edit { display: grid; gap: 6px; }
  .vp-edit textarea { width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 6px 8px; font-size: 0.85rem; background: var(--surface); color: var(--ink); }
  .vp-edit-actions { display: flex; justify-content: flex-end; gap: 6px; }
  .vp-edit-actions button { border: 1px solid var(--border); border-radius: 8px; padding: 4px 10px; font-size: 0.8rem; background: var(--surface); color: var(--ink); cursor: pointer; }
  .vp-edit-actions .vp-save { background: var(--accent); color: var(--on-accent, #fff); border-color: transparent; }
  .vp-note { margin: 0; font-size: 0.78rem; color: var(--muted); }
</style>
