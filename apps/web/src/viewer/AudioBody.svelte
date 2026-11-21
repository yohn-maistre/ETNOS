<script lang="ts">
  // A sound recording: the waveform is drawn from the file itself and can be tapped to jump, the player is the
  // browser's own, and the transcript sits below when there is one. A bird call has no transcript, and the body says so.
  import { onMount } from 'svelte'
  import { Pause, Play } from '@lucide/svelte'
  import type { ViewerObject } from '../viewer-data.ts'

  let { object }: { object: ViewerObject } = $props()
  const spec = $derived(object.audio!)
  let audio = $state<HTMLAudioElement>(), canvas = $state<HTMLCanvasElement>()
  let peaks = $state<number[]>([]), playing = $state(false), now = $state(0), duration = $state(0)
  let raf = 0

  onMount(() => {
    let dead = false
    void (async () => {
      try {
        const buf = await (await fetch(spec.src)).arrayBuffer()
        const ctx = new AudioContext(), data = await ctx.decodeAudioData(buf)
        void ctx.close()
        const ch = data.getChannelData(0), n = 160, step = Math.floor(ch.length / n), out: number[] = []
        for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step; j < (i + 1) * step; j += 16) m = Math.max(m, Math.abs(ch[j])); out.push(m) }
        const top = Math.max(0.01, ...out)
        if (!dead) peaks = out.map((v) => v / top)
      } catch { /* The player still works without the waveform. */ }
    })()
    return () => { dead = true; cancelAnimationFrame(raf) }
  })
  function draw() {
    if (!canvas || !peaks.length) return
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1)
    canvas.width = r.width * dpr; canvas.height = r.height * dpr
    const c = canvas.getContext('2d')!, fg = getComputedStyle(canvas).getPropertyValue('--foreground').trim(), w = r.width / peaks.length
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, r.width, r.height)
    const done = duration ? now / duration : 0
    peaks.forEach((p, i) => {
      const h = Math.max(2, p * (r.height - 8))
      c.globalAlpha = i / peaks.length <= done ? 0.9 : 0.25; c.fillStyle = fg
      c.fillRect(i * w + w * 0.2, (r.height - h) / 2, Math.max(1, w * 0.6), h)
    })
  }
  $effect(() => { void [peaks, now, duration]; draw() })
  function tick() { if (audio) now = audio.currentTime; if (playing) raf = requestAnimationFrame(tick) }
  function toggle() { if (!audio) return; if (audio.paused) void audio.play(); else audio.pause() }
  function seek(e: PointerEvent) { if (!audio || !duration || !canvas) return; const r = canvas.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * duration; now = audio.currentTime }
  const clock = (s: number) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0')
</script>

<div class="ab">
  <div class="ab-card">
    <p class="ab-what">{spec.place ?? ''}{spec.place && spec.recorded ? ' · ' : ''}{spec.recorded ?? ''}</p>
    <div class="ab-row">
      <button type="button" class="ab-play" onclick={toggle} aria-label={playing ? 'Jeda' : 'Putar rekaman'}>{#if playing}<Pause size={22} />{:else}<Play size={22} />{/if}</button>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <canvas bind:this={canvas} class="ab-wave" aria-hidden="true" onpointerdown={seek}></canvas>
      <span class="ab-time">{clock(now)} / {clock(duration || spec.seconds || 0)}</span>
    </div>
    <audio bind:this={audio} src={spec.src} preload="metadata" controls onplay={() => { playing = true; tick() }} onpause={() => (playing = false)} onended={() => (playing = false)} onloadedmetadata={() => (duration = audio?.duration ?? 0)} ontimeupdate={() => (now = audio?.currentTime ?? 0)}></audio>
    <div class="ab-text">
      <h3>Transkrip</h3>
      {#if spec.transcript}<p>{spec.transcript}</p>{:else}<p class="ab-none">Rekaman ini berisi suara burung tanpa ucapan, sehingga tidak ada transkrip.</p>{/if}
    </div>
  </div>
</div>

<style>
  .ab { display: grid; place-items: center; width: 100%; height: 100%; min-height: 320px; padding: 24px; background: color-mix(in oklab, var(--foreground) 4%, var(--background)); }
  .ab-card { display: grid; gap: 16px; width: min(640px, 100%); }
  .ab-what { margin: 0; font-size: 13.5px; color: var(--muted-foreground); }
  .ab-row { display: flex; align-items: center; gap: 14px; }
  .ab-play { flex: none; display: grid; place-items: center; width: 56px; height: 56px; border: 0; border-radius: 999px; background: var(--foreground); color: var(--background); cursor: pointer; }
  .ab-play:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 3px; }
  .ab-wave { flex: 1; min-width: 0; height: 64px; cursor: pointer; }
  .ab-time { flex: none; font-size: 13.5px; font-variant-numeric: tabular-nums; color: var(--muted-foreground); }
  audio { width: 100%; height: 40px; }
  .ab-text { display: grid; gap: 6px; padding-top: 14px; border-top: 1px solid var(--border); }
  .ab-text h3 { margin: 0; font-size: 13px; font-weight: 650; color: var(--muted-foreground); }
  .ab-text p { margin: 0; font-size: 15px; line-height: 1.55; }
  .ab-none { color: var(--muted-foreground); }
</style>
