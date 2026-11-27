<script lang="ts" module>
  export type WordPoint = {
    code: string
    name: string
    x: number
    y: number
    region: string
    /** 1 to 3 for the three largest families, 0 for every other family. */
    slot: number
    /** The first form for the chosen concept; empty when the language has none. */
    form: string
    /** Concepts this language has in the lists; 0 means no data at all. */
    richness: number
  }
</script>

<script lang="ts">
  // Peta Kata's map: every Tanah Papua language as a point at its Glottolog location, over the seven wilayah adat.
  // A language with a form for the chosen concept is a filled point in its family colour with the form beside it;
  // a language without one is a faint ring. Labels are placed greedily and skipped where they would overlap, so
  // the list below the map stays the full and accessible view. Taps pick the nearest point within 22px.
  import { prefersReducedMotion } from 'svelte/motion'

  type Atlas = { box: number[]; regions: Record<string, { d: string; x: number; y: number }>; contested?: { slug: string; d: string }[] }
  let {
    atlas,
    points,
    focus = '',
    selected = '',
    compare = [],
    regionNames,
    onpick,
  }: {
    atlas: Atlas
    points: WordPoint[]
    focus?: string
    selected?: string
    compare?: string[]
    regionNames: Record<string, string>
    onpick: (code: string) => void
  } = $props()

  let width = $state(0)
  let svg = $state<SVGSVGElement>()

  // The whole island, measured from the region shapes, with a small margin.
  function bounds(d: string[]): [number, number, number, number] {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const s of d) {
      const n = s.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
      for (let i = 0; i + 1 < n.length; i += 2) {
        x0 = Math.min(x0, n[i]!); x1 = Math.max(x1, n[i]!); y0 = Math.min(y0, n[i + 1]!); y1 = Math.max(y1, n[i + 1]!)
      }
    }
    return [x0, y0, x1, y1]
  }
  const island = $derived(bounds(Object.values(atlas.regions).map((r) => r.d)))
  const ASPECT = $derived((island[2] - island[0]) / (island[3] - island[1]))

  // The view box for the focused region, padded and widened to the map's aspect so nothing is cut.
  const target = $derived.by(() => {
    let [x0, y0, x1, y1] = island
    if (focus && atlas.regions[focus]) {
      const inRegion = points.filter((p) => p.region === focus)
      const b = bounds([atlas.regions[focus]!.d])
      x0 = Math.min(b[0], ...inRegion.map((p) => p.x)); x1 = Math.max(b[2], ...inRegion.map((p) => p.x))
      y0 = Math.min(b[1], ...inRegion.map((p) => p.y)); y1 = Math.max(b[3], ...inRegion.map((p) => p.y))
    }
    const pad = Math.max(x1 - x0, y1 - y0) * 0.05
    x0 -= pad; x1 += pad; y0 -= pad; y1 += pad
    let w = x1 - x0, h = y1 - y0
    if (w / h < ASPECT) { const nw = h * ASPECT; x0 -= (nw - w) / 2; w = nw } else { const nh = w / ASPECT; y0 -= (nh - h) / 2; h = nh }
    return [x0, y0, w, h] as [number, number, number, number]
  })

  let view = $state<[number, number, number, number]>([0, 0, 1, 1])
  let frame = 0
  $effect(() => {
    const to = target
    const from = view
    cancelAnimationFrame(frame)
    if (prefersReducedMotion.current || from[2] === 1) { view = to; return }
    const start = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 420)
      const e = 1 - Math.pow(1 - k, 4)
      view = from.map((v, i) => v + (to[i]! - v) * e) as [number, number, number, number]
      if (k < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  })

  // Pixels per map unit, so marks and labels keep the same size on screen at every zoom.
  const scale = $derived(width ? width / view[2] : 1)
  const u = (px: number) => px / scale

  const compareSet = $derived(new Set(compare))
  const ordered = $derived(
    [...points].sort((a, b) => Number(!!a.form) - Number(!!b.form) || Number(a.code === selected) - Number(b.code === selected)),
  )

  // Greedy labels: the chosen and compared languages first, then languages with more data, right of the point or
  // else left of it; any label that would overlap another, or a point, is left out.
  const labels = $derived.by(() => {
    const fs = width < 520 ? 12 : 13
    const placed: { x: number; y: number; w: number; h: number }[] = []
    const out: { code: string; text: string; x: number; y: number; anchor: 'start' | 'end'; strong: boolean }[] = []
    const [vx, vy, vw, vh] = view
    const visible = points.filter((p) => p.form && p.x >= vx && p.x <= vx + vw && p.y >= vy && p.y <= vy + vh)
    const rank = (p: WordPoint) => (p.code === selected ? 0 : compareSet.has(p.code) ? 1 : 2)
    visible.sort((a, b) => rank(a) - rank(b) || b.richness - a.richness || a.name.localeCompare(b.name, 'id'))
    const dots = points.map((p) => ({ x: p.x * scale, y: p.y * scale }))
    for (const p of visible) {
      const text = p.form.length > 16 ? p.form.slice(0, 15) + '…' : p.form
      const w = text.length * fs * 0.56 + 4, h = fs + 4
      const px = p.x * scale, py = p.y * scale
      for (const side of ['start', 'end'] as const) {
        const x = side === 'start' ? px + 7 : px - 7 - w
        const box = { x, y: py - h / 2, w, h }
        if (box.x < vx * scale || box.x + box.w > (vx + vw) * scale) continue
        const hitsLabel = placed.some((b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y)
        const hitsDot = dots.some((d) => d.x > box.x - 2 && d.x < box.x + box.w + 2 && d.y > box.y && d.y < box.y + box.h)
        if (hitsLabel || (hitsDot && rank(p) === 2)) continue
        placed.push(box)
        out.push({ code: p.code, text, x: side === 'start' ? p.x + u(7) : p.x - u(7), y: p.y, anchor: side, strong: rank(p) < 2 })
        break
      }
    }
    return { list: out, fs }
  })

  function pick(e: PointerEvent) {
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const mx = view[0] + ((e.clientX - r.left) / r.width) * view[2]
    const my = view[1] + ((e.clientY - r.top) / r.height) * view[3]
    let best = '', bestD = u(22) ** 2
    for (const p of points) {
      const d = (p.x - mx) ** 2 + (p.y - my) ** 2
      if (d < bestD) { bestD = d; best = p.code }
    }
    if (best) onpick(best)
  }
</script>

<div class="pkm" bind:clientWidth={width} style:aspect-ratio={ASPECT}>
  <!-- The list under the map carries the same words for keyboards and screen readers. -->
  <svg
    bind:this={svg}
    viewBox={view.join(' ')}
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Peta titik bahasa Tanah Papua. Daftar kata di bawah peta memuat isi yang sama."
    onpointerup={pick}
  >
    <g class="land">
      {#each Object.entries(atlas.regions) as [slug, r] (slug)}<path d={r.d} class:dim={!!focus && focus !== slug} />{/each}
      {#each atlas.contested ?? [] as c (c.slug)}<path d={c.d} class:dim={!!focus} />{/each}
    </g>
    {#if !focus && width >= 520}
      <g class="region-names" style:font-size={u(width < 520 ? 11 : 12) + 'px'}>
        {#each Object.entries(atlas.regions) as [slug, r] (slug)}<text x={r.x} y={r.y}>{regionNames[slug] ?? slug}</text>{/each}
      </g>
    {/if}
    <g class="pts">
      {#each ordered as p (p.code)}
        {@const big = p.code === selected || compareSet.has(p.code)}
        {#if p.form}
          <circle cx={p.x} cy={p.y} r={u(big ? 6.5 : 4.5)} class="dot f{p.slot}" class:sel={p.code === selected} class:cmp={compareSet.has(p.code) && p.code !== selected} style:stroke-width={u(1.5) + 'px'} />
        {:else}
          <circle cx={p.x} cy={p.y} r={u(big ? 5.5 : 3.2)} class="ring" class:sel={p.code === selected} style:stroke-width={u(big ? 2 : 1.2) + 'px'} />
        {/if}
      {/each}
    </g>
    <g class="labels" style:font-size={u(labels.fs) + 'px'} style:stroke-width={u(3.5) + 'px'}>
      {#each labels.list as l (l.code)}<text x={l.x} y={l.y} text-anchor={l.anchor} dominant-baseline="central" class:strong={l.strong}>{l.text}</text>{/each}
    </g>
  </svg>
</div>

<style>
  .pkm { position: relative; border-radius: 16px; overflow: hidden; background: color-mix(in oklab, var(--foreground) 3%, var(--background)); box-shadow: inset 0 0 0 1px var(--border); touch-action: manipulation; }
  svg { display: block; width: 100%; height: 100%; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .land path { fill: color-mix(in oklab, var(--foreground) 5%, var(--background)); stroke: color-mix(in oklab, var(--foreground) 22%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; stroke-linejoin: round; transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  .land path.dim { opacity: 0.45; }
  .region-names text { fill: var(--muted-foreground); text-anchor: middle; font-weight: 600; opacity: 0.55; pointer-events: none; }
  .dot { stroke: var(--background); }
  .dot.f0 { fill: var(--pk-other); }
  .dot.f1 { fill: var(--pk-f1); }
  .dot.f2 { fill: var(--pk-f2); }
  .dot.f3 { fill: var(--pk-f3); }
  .dot.sel { stroke: var(--foreground); }
  .dot.cmp { stroke: var(--foreground); stroke-dasharray: 2 1.5; }
  .ring { fill: none; stroke: color-mix(in oklab, var(--foreground) 32%, transparent); }
  .ring.sel { stroke: var(--foreground); }
  .labels text { fill: var(--foreground); font-weight: 560; paint-order: stroke; stroke: color-mix(in oklab, var(--foreground) 3%, var(--background)); stroke-linejoin: round; pointer-events: none; }
  .labels text.strong { font-weight: 750; }
  @media (prefers-reduced-motion: reduce) { .land path { transition: none; } }
</style>
