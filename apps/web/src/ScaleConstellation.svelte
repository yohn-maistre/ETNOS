<script lang="ts">
  // The knowledge map arranged by size and pace (docs/observatory/world-model-and-starter-data-2026-11-20.md §9):
  // size runs to the right, how long a thing takes to change runs upward, both on log scales, and the level of
  // organisation is the colour. On wide screens with a fine pointer the level is also depth, and dragging turns the
  // frame a little in the same direction as the network map (dragging right brings the left side to the front).
  // On phones and with reduced motion the chart is drawn flat. A thing has a range, so its point sits at a fixed
  // spot inside that range; the selected thing shows the whole range as a box.
  import { onMount } from 'svelte'
  import { prefersReducedMotion } from 'svelte/motion'
  import { appearance } from './appearance.svelte'
  import { BANDS, bandOf, place, sizeWords, paceWords, rangeWords, SIZE, PACE, SIZE_TICKS, PACE_TICKS, type World } from './world-scale.ts'

  type Node = { id: string; class: string; title: string; witnesses: number; gaps: string[]; world?: World }
  type Edge = { source: string; target: string }
  let {
    nodes,
    statements,
    selected = $bindable(''),
    hidden = new Set<string>(),
    gaps = false,
    region = '',
    regionOf = () => [],
    fit = 'full',
    label,
  }: {
    nodes: Node[]
    statements: Edge[]
    selected?: string
    hidden?: Set<string>
    gaps?: boolean
    region?: string
    regionOf?: (id: string) => string[]
    fit?: 'full' | 'data'
    label: string
  } = $props()

  const points = $derived(nodes.map((n) => ({ n, at: n.world ? place(n.id, n.world) : null, band: bandOf(n.world?.level?.code) })).filter((p) => p.at && p.band) as { n: Node; at: [number, number, number]; band: (typeof BANDS)[number] }[])
  const index = $derived(new Map(points.map((p, i) => [p.n.id, i])))
  const links = $derived(statements.map((s) => [index.get(s.source), index.get(s.target)]).filter(([a, b]) => a !== undefined && b !== undefined) as [number, number][])

  // The domain on each axis: the whole frame, or the part that holds things (with room around it).
  const domain = $derived.by((): { size: [number, number]; pace: [number, number] } => {
    if (fit === 'full' || !points.length) return { size: SIZE, pace: PACE }
    let s0 = Infinity, s1 = -Infinity, p0 = Infinity, p1 = -Infinity
    for (const { n } of points) {
      const w = n.world!
      if (w.size) { s0 = Math.min(s0, w.size.lo); s1 = Math.max(s1, w.size.hi) }
      if (w.pace) { p0 = Math.min(p0, w.pace.lo); p1 = Math.max(p1, w.pace.hi) }
    }
    if (!Number.isFinite(s0)) { s0 = SIZE[0]; s1 = SIZE[1] }
    return { size: [Math.floor(s0 - 0.4), Math.ceil(s1 + 0.4)], pace: [Math.floor(p0 - 0.4), Math.ceil(p1 + 0.4)] }
  })
  // Points are stored in full-frame units; a narrower domain stretches them. `view` moves toward `domain` in a tween.
  let view = { size: [...SIZE] as [number, number], pace: [...PACE] as [number, number] }, tween: { from: typeof view; t0: number } | null = null

  let canvas = $state<HTMLCanvasElement>(),
    hovered = $state(-1),
    flat = $state(true)
  let W = 0, H = 0, raf = 0, yaw = -0.32, pitch = 0.16, fitKey = '', scale = 1, drag: [number, number] | null = null, moved = 0, proj: [number, number, number][] = []
  const YAW = 0.75, PITCH = 0.35

  onMount(() => {
    const mq = matchMedia('(min-width: 760px) and (pointer: fine)')
    const sync = () => { flat = !mq.matches || prefersReducedMotion.current; wake() }
    sync(); mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  })

  function css(name: string) { return canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : '#888' }
  function wake() { if (!raf && canvas) raf = requestAnimationFrame(frame) }
  const ease = (k: number) => 1 - Math.pow(1 - k, 3)

  function frame(now: number) {
    raf = 0
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const fg = css('--foreground'), bg = css('--background'), muted = css('--muted-foreground'), family = getComputedStyle(canvas).fontFamily || 'sans-serif'
    const dark = appearance.theme === 'dark'
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1)
    if (rect.width !== W || rect.height !== H) { W = rect.width; H = rect.height; canvas.width = W * dpr; canvas.height = H * dpr }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    // Domain tween.
    let animating = false
    if (tween) {
      const k = prefersReducedMotion.current ? 1 : Math.min(1, (now - tween.t0) / 650), e = ease(k), d = domain
      view = { size: [tween.from.size[0] + (d.size[0] - tween.from.size[0]) * e, tween.from.size[1] + (d.size[1] - tween.from.size[1]) * e], pace: [tween.from.pace[0] + (d.pace[0] - tween.from.pace[0]) * e, tween.from.pace[1] + (d.pace[1] - tween.from.pace[1]) * e] }
      if (k >= 1) tween = null
      else animating = true
    }
    const narrow = W < 560
    const m = { l: narrow ? 92 : 96, r: narrow ? 16 : 28, t: 34, b: narrow ? 50 : 54 }
    const pw = W - m.l - m.r, ph = H - m.t - m.b
    const yw = flat ? 0 : yaw, pt = flat ? 0 : pitch
    // The frame is a box: x is size, y is pace, z is level, with depth a share of the smaller side. In 3D the box is
    // scaled once per canvas size so that it fits at every allowed turn, which keeps it still while it turns.
    const ax = pw / 2, ay = ph / 2, az = flat ? 0 : Math.min(ax, ay) * 0.38
    const raw = (x: number, y: number, z: number, a: number, b: number): [number, number, number] => {
      const X = x * ax, Y = y * ay, Z = z * az, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b)
      const x1 = X * ca + Z * sa, z1 = -X * sa + Z * ca, y1 = Y * cb - z1 * sb, z2 = Y * sb + z1 * cb
      const f = flat ? 1 : 1400 / (1400 + z2)
      return [x1 * f, y1 * f, z2]
    }
    const key = W + 'x' + H + (flat ? 'f' : 'd')
    if (key !== fitKey) {
      fitKey = key; scale = 1
      if (!flat) for (const a of [-YAW, 0, YAW]) for (const b of [-PITCH, 0, PITCH]) for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        const r = raw(x, y, z, a, b)
        scale = Math.min(scale, ax / Math.abs(r[0]), ay / Math.abs(r[1]))
      }
    }
    const P = (x: number, y: number, z: number): [number, number, number] => {
      const r = raw(x, y, z, yw, pt)
      return [m.l + ax + r[0] * scale, m.t + ay - r[1] * scale, r[2]]
    }
    // Full-frame units to the current view.
    const vxRaw = (s: number) => ((s - view.size[0]) / (view.size[1] - view.size[0])) * 2 - 1
    const vyRaw = (p: number) => ((p - view.pace[0]) / (view.pace[1] - view.pace[0])) * 2 - 1
    const vx = (u: number) => vxRaw(SIZE[0] + ((u + 1) / 2) * (SIZE[1] - SIZE[0])), vy = (u: number) => vyRaw(PACE[0] + ((u + 1) / 2) * (PACE[1] - PACE[0]))

    // Grid on the back wall, then the floor and left edges of the box in 3D.
    const zb = -1, span = Math.max(view.size[1] - view.size[0], view.pace[1] - view.pace[0])
    const minor = span < 7
    ctx.lineWidth = 1
    ctx.font = `500 ${narrow ? 11 : 12}px ${family}`
    ctx.fillStyle = muted
    for (const [s, text, major] of SIZE_TICKS) {
      const x = vxRaw(s)
      if (x < -1.001 || x > 1.001 || (!major && !minor)) continue
      const a = P(x, -1, zb), b = P(x, 1, zb)
      ctx.strokeStyle = fg; ctx.globalAlpha = major ? 0.1 : 0.055
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
      if (narrow && !major && span > 4) continue
      ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      const f = P(x, -1, zb)
      ctx.fillText(text, f[0], f[1] + 8)
    }
    for (const [p, text, major] of PACE_TICKS) {
      const y = vyRaw(p)
      if (y < -1.001 || y > 1.001 || (!major && !minor)) continue
      const a = P(-1, y, zb), b = P(1, y, zb)
      ctx.strokeStyle = fg; ctx.globalAlpha = major ? 0.1 : 0.055
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
      ctx.globalAlpha = 1; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
      const f = P(-1, y, zb)
      ctx.fillText(text, f[0] - 8, f[1])
    }
    ctx.font = `600 12px ${family}`; ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'; ctx.fillText('Lama berubah', 14, 20)
    ctx.textAlign = 'right'; ctx.fillText('Ukuran', W - m.r, H - 12)
    ctx.strokeStyle = fg; ctx.globalAlpha = 0.28
    const edge = (a: [number, number, number], b: [number, number, number]) => { const p = P(...a), q = P(...b); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke() }
    edge([-1, -1, zb], [1, -1, zb]); edge([-1, -1, zb], [-1, 1, zb])
    if (!flat) { ctx.globalAlpha = 0.16; edge([-1, -1, -1], [-1, -1, 1]); edge([1, -1, -1], [1, -1, 1]); edge([-1, -1, 1], [1, -1, 1]); edge([-1, 1, -1], [-1, 1, 1]) }
    ctx.globalAlpha = 1

    // Points, then the selected thing's range and links.
    const sel = selected ? index.get(selected) ?? -1 : -1
    const near = sel >= 0 ? new Set([sel, ...links.filter(([a, b]) => a === sel || b === sel).map(([a, b]) => (a === sel ? b : a))]) : null
    const inRegion = (i: number) => !region || regionOf(points[i].n.id).includes(region)
    const missing = (i: number) => points[i].n.gaps.includes('belum-ada-halaman')
    const quiet = (i: number) => hidden.has(points[i].band.key) || (near && !near.has(i)) || (gaps && !missing(i)) || !inRegion(i)
    proj = points.map((p) => P(vx(p.at[0]), vy(p.at[1]), p.at[2]))
    const color = (i: number) => (dark ? points[i].band.dark : points[i].band.light)

    if (sel >= 0) {
      const w = points[sel].n.world!, z = points[sel].at[2]
      if (w.size && w.pace) {
        const c = [P(vxRaw(w.size.lo), vyRaw(w.pace.lo), z), P(vxRaw(w.size.hi), vyRaw(w.pace.lo), z), P(vxRaw(w.size.hi), vyRaw(w.pace.hi), z), P(vxRaw(w.size.lo), vyRaw(w.pace.hi), z)]
        ctx.beginPath(); c.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath()
        ctx.fillStyle = color(sel); ctx.globalAlpha = 0.12; ctx.fill()
        ctx.strokeStyle = color(sel); ctx.globalAlpha = 0.7; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([])
      }
      ctx.strokeStyle = fg; ctx.lineWidth = 1.2
      for (const [a, b] of links) if (a === sel || b === sel) { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(proj[a][0], proj[a][1]); ctx.lineTo(proj[b][0], proj[b][1]); ctx.stroke() }
      ctx.globalAlpha = 1
    }
    const order = proj.map((_, i) => i).sort((a, b) => proj[b][2] - proj[a][2])
    const radius = (i: number) => (narrow ? 3 : 3.5) + Math.min(narrow ? 4 : 5, Math.sqrt(points[i].n.witnesses))
    for (const i of order) {
      const [x, y] = proj[i], big = i === sel || i === hovered, r = radius(i) * (big ? 1.4 : 1)
      ctx.globalAlpha = quiet(i) && !big ? 0.13 : 0.92
      ctx.fillStyle = color(i); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
      ctx.lineWidth = big ? 2 : 1.5; ctx.strokeStyle = big ? fg : bg; ctx.stroke()
      if (gaps && missing(i) && inRegion(i) && !hidden.has(points[i].band.key)) { ctx.globalAlpha = 1; ctx.lineWidth = 2.5; ctx.strokeStyle = '#e0a83a'; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, Math.PI * 2); ctx.stroke() }
    }
    // Labels: the selected and hovered thing, its neighbours, then the best-sourced things, skipping overlaps.
    const fs = narrow ? 12.5 : 13.5
    ctx.globalAlpha = 1; ctx.font = `600 ${fs}px ${family}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round'
    const placed: [number, number, number, number][] = [], max = narrow ? 4 : 9
    const wanted = [sel, hovered, ...(near ? [...near] : []), ...points.map((_, i) => i).filter((i) => !quiet(i)).sort((a, b) => points[b].n.witnesses - points[a].n.witnesses || points[a].n.id.localeCompare(points[b].n.id))]
    let count = 0
    for (const i of wanted) {
      if (i < 0 || placed.length >= max + 3 || (count >= max && i !== sel && i !== hovered)) continue
      const [x, y] = proj[i], text = points[i].n.title, w = ctx.measureText(text).width, r = radius(i)
      let lx = x + r + 5
      if (lx + w > W - 6) lx = x - r - 5 - w
      const box: [number, number, number, number] = [lx - 3, y - fs * 0.7, w + 6, fs * 1.4]
      if (placed.some((b) => box[0] < b[0] + b[2] && b[0] < box[0] + box[2] && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) continue
      placed.push(box); if (i !== sel && i !== hovered) count++
      ctx.strokeStyle = bg; ctx.lineWidth = 4; ctx.strokeText(text, lx, y); ctx.fillStyle = fg; ctx.fillText(text, lx, y)
    }
    if (animating || drag) raf = requestAnimationFrame(frame)
  }

  $effect(() => {
    if (!canvas) return
    const ro = new ResizeObserver(() => wake())
    ro.observe(canvas)
    return () => { cancelAnimationFrame(raf); raf = 0; ro.disconnect() }
  })
  // A new domain starts a tween from wherever the view is now.
  $effect(() => { void domain; tween = { from: { size: [...view.size], pace: [...view.pace] }, t0: performance.now() }; wake() })
  $effect(() => { void [points, selected, hovered, hidden, gaps, region, flat, appearance.theme]; wake() })

  function pick(e: PointerEvent) {
    const r = canvas!.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top
    let best = -1, bd = e.pointerType === 'touch' ? 20 : 12
    for (let i = 0; i < proj.length; i++) { const d = Math.hypot(proj[i][0] - x, proj[i][1] - y); if (d < bd) { bd = d; best = i } }
    return best
  }
  function down(e: PointerEvent) { drag = [e.clientX, e.clientY]; moved = 0; if (e.pointerType === 'mouse') canvas!.setPointerCapture(e.pointerId) }
  function move(e: PointerEvent) {
    if (drag) {
      const dx = e.clientX - drag[0], dy = e.clientY - drag[1]
      moved += Math.abs(dx) + Math.abs(dy)
      if (!flat) {
        // Same direction as the network map: dragging right brings the left side to the front.
        yaw = Math.max(-YAW, Math.min(YAW, yaw - dx * 0.006))
        if (e.pointerType === 'mouse') pitch = Math.max(-PITCH, Math.min(PITCH, pitch + dy * 0.004))
      }
      drag = [e.clientX, e.clientY]; wake(); return
    }
    if (e.pointerType === 'mouse') { const h = pick(e); if (h !== hovered) hovered = h }
  }
  function up(e: PointerEvent) {
    if (drag && moved < 8) { const i = pick(e); selected = i >= 0 ? points[i].n.id : '' }
    drag = null; wake()
  }
  function key(e: KeyboardEvent) {
    if (flat) return
    if (e.key === 'ArrowLeft') yaw = Math.min(YAW, yaw + 0.1)
    else if (e.key === 'ArrowRight') yaw = Math.max(-YAW, yaw - 0.1)
    else if (e.key === 'ArrowUp') pitch = Math.max(-PITCH, pitch - 0.08)
    else if (e.key === 'ArrowDown') pitch = Math.min(PITCH, pitch + 0.08)
    else return
    e.preventDefault(); wake()
  }
  const tip = $derived(hovered >= 0 ? points[hovered]?.n : undefined)
</script>

<!-- role="application": arrows turn the frame on wide screens. The list of all things sits below the chart. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div class="sc" class:flat tabindex="0" role="application" aria-roledescription="grafik ukuran dan waktu" aria-label={label} onkeydown={key}>
  <canvas bind:this={canvas} aria-hidden="true" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={() => (drag = null)} onpointerleave={() => { hovered = -1; drag = null }}></canvas>
  {#if tip?.world}<p class="sc-tip" aria-hidden="true"><strong>{tip.title}</strong>{#if tip.world.size} · {rangeWords(tip.world.size, sizeWords)}{/if}{#if tip.world.pace} · berubah dalam {rangeWords(tip.world.pace, paceWords)}{/if}</p>{/if}
</div>

<style>
  .sc { position: relative; border-radius: 16px; background: color-mix(in oklab, var(--foreground) 3%, var(--background)); overflow: hidden; }
  canvas { display: block; width: 100%; height: clamp(440px, 60vh, 580px); cursor: grab; touch-action: pan-y; }
  .flat canvas { cursor: default; height: 440px; }
  .sc:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .sc-tip { position: absolute; left: 12px; right: 12px; bottom: 10px; width: fit-content; max-width: calc(100% - 24px); margin: 0; padding: 6px 10px; border-radius: 8px; background: var(--background); border: 1px solid var(--border); font-size: 13px; pointer-events: none; }
</style>
