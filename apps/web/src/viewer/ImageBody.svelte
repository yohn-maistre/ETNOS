<script lang="ts">
  // One image or a set of images that can be zoomed: the wheel or two fingers zoom at the pointer, a double tap
  // zooms in or out, dragging moves a zoomed image, and the arrows or the thumbnails change the image. Each image
  // shows its own maker and licence, because images in one set can come from different people.
  import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from '@lucide/svelte'
  import type { Photo } from '../viewer-data.ts'

  let { photos, label }: { photos: Photo[]; label: string } = $props()
  let at = $state(0), scale = $state(1), tx = $state(0), ty = $state(0), loaded = $state(false)
  let box = $state<HTMLDivElement>()
  const pointers = new Map<number, [number, number]>()
  let last: [number, number] | null = null, pinch = 0, lastTap = 0
  const photo = $derived(photos[at])

  function go(i: number) { at = (i + photos.length) % photos.length; reset(); loaded = false }
  function reset() { scale = 1; tx = 0; ty = 0 }
  function clampPan() {
    if (!box) return
    const w = box.clientWidth, h = box.clientHeight, mx = (w * (scale - 1)) / 2, my = (h * (scale - 1)) / 2
    tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty))
  }
  /** Zooms by a factor around a point given in pixels from the box centre. */
  function zoomAt(f: number, px = 0, py = 0) {
    const next = Math.max(1, Math.min(6, scale * f)), k = next / scale
    tx = px - (px - tx) * k; ty = py - (py - ty) * k; scale = next
    if (scale === 1) { tx = 0; ty = 0 }
    clampPan()
  }
  const local = (e: { clientX: number; clientY: number }): [number, number] => { const r = box!.getBoundingClientRect(); return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2] }
  function wheel(e: WheelEvent) { e.preventDefault(); const [x, y] = local(e); zoomAt(Math.exp(-e.deltaY * 0.0022), x, y) }
  function down(e: PointerEvent) {
    box!.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; pinch = 0
    const now = performance.now()
    if (pointers.size === 1 && now - lastTap < 300) { const [x, y] = local(e); if (scale > 1) reset(); else zoomAt(2.5, x, y) }
    lastTap = now
  }
  function move(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return
    pointers.set(e.pointerId, [e.clientX, e.clientY])
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), [x, y] = local({ clientX: (a[0] + b[0]) / 2, clientY: (a[1] + b[1]) / 2 })
      if (pinch) zoomAt(d / pinch, x, y)
      pinch = d; return
    }
    if (!last || scale === 1) return
    tx += e.clientX - last[0]; ty += e.clientY - last[1]; last = [e.clientX, e.clientY]; clampPan()
  }
  function up(e: PointerEvent) { pointers.delete(e.pointerId); if (!pointers.size) last = null; pinch = 0 }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' && photos.length > 1 && scale === 1) go(at - 1)
    else if (e.key === 'ArrowRight' && photos.length > 1 && scale === 1) go(at + 1)
    else if (e.key === '+' || e.key === '=') zoomAt(1.3)
    else if (e.key === '-') zoomAt(1 / 1.3)
    else if (e.key === '0') reset()
    else return
    e.preventDefault()
  }
</script>

<div class="ib">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div class="ib-frame" bind:this={box} class:zoomed={scale > 1} tabindex="0" role="application" aria-roledescription="gambar yang bisa diperbesar" aria-label={label + '. ' + photo.alt + '. Tambah dan kurang memperbesar, panah berganti gambar.'} onwheel={wheel} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onkeydown={key}>
    {#key photo.src}<img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} draggable="false" class:ready={loaded} onload={() => (loaded = true)} style:transform={`translate(${tx}px, ${ty}px) scale(${scale})`} />{/key}
  </div>
  <div class="vw-tools">
    <button type="button" onclick={() => zoomAt(1.4)} aria-label="Perbesar" title="Perbesar"><Plus size={16} /></button>
    <button type="button" onclick={() => zoomAt(1 / 1.4)} aria-label="Perkecil" title="Perkecil" disabled={scale === 1}><Minus size={16} /></button>
    <button type="button" onclick={reset} aria-label="Atur ulang tampilan" title="Atur ulang tampilan" disabled={scale === 1}><RotateCcw size={15} /></button>
  </div>
  {#if photos.length > 1}
    <button type="button" class="ib-nav ib-prev" onclick={() => go(at - 1)} aria-label="Gambar sebelumnya"><ChevronLeft size={20} /></button>
    <button type="button" class="ib-nav ib-next" onclick={() => go(at + 1)} aria-label="Gambar berikutnya"><ChevronRight size={20} /></button>
  {/if}
  <div class="ib-foot">
    <p class="ib-credit">{photo.note ? photo.note + ' ' : ''}Foto {photo.credit} · <a href={photo.licence.url ?? photo.url} target="_blank" rel="noopener noreferrer">{photo.licence.name}</a> · <a href={photo.url} target="_blank" rel="noopener noreferrer">sumber</a>{photos.length > 1 ? ' · ' + (at + 1) + ' dari ' + photos.length : ''}</p>
    {#if photos.length > 1}<div class="ib-thumbs" role="tablist" aria-label="Pilih gambar">
        {#each photos as p, i (p.src)}<button type="button" role="tab" aria-selected={i === at} aria-label={'Gambar ' + (i + 1) + ': ' + p.alt} onclick={() => go(i)}><img src={p.src} alt="" loading="lazy" /></button>{/each}
      </div>{/if}
  </div>
</div>

<style>
  .ib { position: relative; display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 320px; background: color-mix(in oklab, var(--foreground) 4%, var(--background)); }
  .ib-frame { position: relative; flex: 1; min-height: 0; overflow: hidden; display: grid; place-items: center; touch-action: none; cursor: zoom-in; }
  .ib-frame.zoomed { cursor: grab; }
  .ib-frame:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: -2px; }
  .ib-frame img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; user-select: none; opacity: 0; transition: opacity 0.25s ease-out; transform-origin: center; will-change: transform; }
  .ib-frame img.ready { opacity: 1; }
  .ib-nav { position: absolute; top: calc(50% - 40px); display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--border); border-radius: 999px; background: color-mix(in oklab, var(--background) 86%, transparent); backdrop-filter: blur(8px); color: var(--foreground); cursor: pointer; }
  .ib-nav:hover { background: var(--secondary); }
  .ib-prev { left: 12px; }
  .ib-next { right: 12px; }
  .ib-foot { display: grid; gap: 8px; padding: 10px 12px 12px; border-top: 1px solid var(--border); background: var(--background); }
  .ib-credit { margin: 0; font-size: 13px; line-height: 1.4; color: var(--muted-foreground); }
  .ib-credit a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  .ib-thumbs { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: thin; }
  .ib-thumbs button { flex: none; width: 56px; height: 56px; padding: 0; border: 2px solid transparent; border-radius: 12px; background: var(--secondary); overflow: hidden; cursor: pointer; }
  .ib-thumbs button[aria-selected='true'] { border-color: var(--foreground); }
  .ib-thumbs img { width: 100%; height: 100%; object-fit: cover; display: block; }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
</style>
