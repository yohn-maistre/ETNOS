<script lang="ts">
  // The knowledge map in three dimensions: entries of the public graph placed so that entries which are
  // connected or often mentioned together sit close, and each large group gets its own part of the space.
  // Drag sideways to turn it, drag up or down with a mouse to tilt it, tap an entry to open its panel.
  // The engine follows the earlier wiki map (KnowledgeMap.svelte): one canvas, a loop that stops when
  // nothing moves, no idle turning on phones or slow devices, and a lower pixel ratio there.
  import { onMount } from 'svelte'
  import { prefersReducedMotion } from 'svelte/motion'
  import { Minus, Pause, Play, Plus } from '@lucide/svelte'

  type Node = { id: string; class: string; title: string; regions: string[]; x: number; y: number; cluster: number; degree: number; witnesses: number; gaps: string[] }
  type Edge = { source: string; target: string; logical: string }
  type Comention = { a: string; b: string; weight: number }
  let {
    nodes,
    statements,
    comentions,
    lens,
    region = '',
    colorOf,
    selected = $bindable(''),
    label,
  }: { nodes: Node[]; statements: Edge[]; comentions: Comention[]; lens: string; region?: string; colorOf: (n: Node) => string; selected?: string; label: string } = $props()

  const missingPage = (n: Node) => n.gaps.includes('belum-ada-halaman')
  const index = $derived(new Map(nodes.map((n, i) => [n.id, i])))
  const links = $derived.by(() => {
    const out: { a: number; b: number; w: number; strong: boolean; disputed: boolean }[] = []
    const max = Math.max(1, ...comentions.map((c) => c.weight))
    for (const c of comentions) { const a = index.get(c.a), b = index.get(c.b); if (a !== undefined && b !== undefined) out.push({ a, b, w: c.weight / max, strong: false, disputed: false }) }
    for (const s of statements) { const a = index.get(s.source), b = index.get(s.target); if (a !== undefined && b !== undefined) out.push({ a, b, w: 1, strong: true, disputed: s.logical === 'disputed' }) }
    return out
  })

  // A deterministic force layout in 3D, worked out once. It starts from the published 2D layout and gives
  // each group its own depth, then pulls linked entries together and pushes all entries apart.
  const hash = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 1000) / 1000 }
  const layout = $derived.by(() => {
    const n = nodes.length, clusters = [...new Set(nodes.map((d) => d.cluster))].sort((a, b) => a - b)
    // Each group gets a direction on a sphere (golden-angle spiral), so groups separate in every axis.
    const dir = new Map(clusters.map((c, k) => {
      const t = Math.acos(1 - (2 * (k + 0.5)) / clusters.length), p = k * 2.39996
      return [c, [Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)] as const]
    }))
    const pos = nodes.map((d) => { const v = dir.get(d.cluster)!; return [d.x * 0.6 + v[0] * 0.5, d.y * 0.6 + v[1] * 0.5, v[2] * 0.7 + (hash(d.id) - 0.5) * 0.2] })
    const step = (iter: number) => 0.06 * (1 - iter / 260)
    for (let it = 0; it < 260; it++) {
      const f = pos.map(() => [0, 0, 0])
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], dz = pos[i][2] - pos[j][2], d2 = dx * dx + dy * dy + dz * dz + 0.01
        const k = 0.0035 / d2
        f[i][0] += dx * k; f[i][1] += dy * k; f[i][2] += dz * k; f[j][0] -= dx * k; f[j][1] -= dy * k; f[j][2] -= dz * k
      }
      for (const l of links) {
        const a = pos[l.a], b = pos[l.b], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001
        const k = (l.strong ? 0.12 : 0.03 * l.w) * (d - (l.strong ? 0.18 : 0.3)) / d
        f[l.a][0] += dx * k; f[l.a][1] += dy * k; f[l.a][2] += dz * k; f[l.b][0] -= dx * k; f[l.b][1] -= dy * k; f[l.b][2] -= dz * k
      }
      for (let i = 0; i < n; i++) {
        const v = dir.get(nodes[i].cluster)!
        for (let d = 0; d < 3; d++) {
          const pull = (v[d] * 0.65 - pos[i][d]) * 0.02 - pos[i][d] * 0.008
          pos[i][d] += Math.max(-0.08, Math.min(0.08, (f[i][d] + pull))) * (step(it) / 0.06)
        }
      }
    }
    // Centre and scale so the cloud fills the unit sphere; a few far entries may sit just outside it.
    const c = [0, 1, 2].map((d) => pos.reduce((s, p) => s + p[d], 0) / Math.max(1, n))
    for (const p of pos) for (let d = 0; d < 3; d++) p[d] -= c[d]
    const radii = pos.map((p) => Math.hypot(p[0], p[1], p[2])).sort((a, b) => a - b), r90 = radii[Math.floor(radii.length * 0.9)] || 1
    return pos.map((p) => p.map((v) => v / r90) as [number, number, number])
  })

  let canvas = $state<HTMLCanvasElement>(),
    hovered = $state(-1),
    spinning = $state(false),
    zoom = $state(1)
  let rotY = 0.5, rotX = 0.22, W = 0, H = 0, raf = 0, lowEnd = false, idleUntil = 0,
    drag: [number, number] | null = null, moved = 0, proj: [number, number, number, number, number][] = []

  onMount(() => {
    lowEnd = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 2) <= 4
    spinning = !lowEnd && !prefersReducedMotion.current
  })

  function css(name: string) { return canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : '#888' }
  function wake() { if (!raf && canvas) raf = requestAnimationFrame(frame) }
  function frame() {
    raf = 0
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const fg = css('--foreground'), bg = css('--background'), family = getComputedStyle(canvas).fontFamily || 'sans-serif'
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(lowEnd ? 1.5 : 2, devicePixelRatio || 1)
    if (rect.width !== W || rect.height !== H) { W = rect.width; H = rect.height; canvas.width = W * dpr; canvas.height = H * dpr }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const turning = spinning && !drag && performance.now() > idleUntil && !prefersReducedMotion.current
    if (turning) rotY += 0.0018
    const s = Math.min(W, H) * 0.4 * zoom, cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX)
    proj = layout.map(([x, y, z], i) => {
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx, f = 3.4 / (3.4 + z2)
      return [W / 2 + x1 * s * f, H / 2 + y1 * s * f, z2, f, i]
    })
    ctx.clearRect(0, 0, W, H)
    const sel = selected ? index.get(selected) ?? -1 : -1, focus = sel >= 0 ? new Set([sel, ...links.filter((l) => l.a === sel || l.b === sel).map((l) => (l.a === sel ? l.b : l.a))]) : null
    const inRegion = (i: number) => !region || nodes[i].regions.includes(region)
    const quiet = (i: number) => (focus && !focus.has(i)) || (lens === 'celah' && !missingPage(nodes[i])) || !inRegion(i)
    // Lines first: co-mentions faint, statements stronger, the selected entry's links in the text colour.
    ctx.lineCap = 'round'
    for (const l of links) {
      const a = proj[l.a], b = proj[l.b], hot = sel >= 0 && (l.a === sel || l.b === sel)
      if (focus && !hot) ctx.globalAlpha = 0.04
      else ctx.globalAlpha = hot ? 0.75 : l.strong ? 0.32 : 0.05 + 0.18 * l.w
      ctx.strokeStyle = fg; ctx.lineWidth = hot ? 1.4 : l.strong ? 1.1 : 0.6
      ctx.setLineDash(l.disputed ? [4, 3] : [])
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
    }
    ctx.setLineDash([])
    // Entries from back to front, so nearer ones cover farther ones.
    const order = [...proj].sort((a, b) => b[2] - a[2])
    for (const [x, y, z, f, i] of order) {
      const n = nodes[i], big = i === sel || i === hovered
      const rad = (3 + Math.min(7, Math.sqrt(n.witnesses) * 1.4)) * (0.7 + 0.4 * f) * (big ? 1.5 : 1)
      ctx.globalAlpha = quiet(i) ? 0.14 : Math.max(0.45, Math.min(1, 0.7 - z * 0.3))
      ctx.fillStyle = colorOf(n); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill()
      ctx.lineWidth = big ? 2 : 1.1; ctx.strokeStyle = big ? fg : bg; ctx.stroke()
      if (lens === 'celah' && missingPage(n) && inRegion(i)) { ctx.globalAlpha = 1; ctx.lineWidth = 2.5; ctx.strokeStyle = '#e0a83a'; ctx.beginPath(); ctx.arc(x, y, rad + 2.5, 0, Math.PI * 2); ctx.stroke() }
    }
    // Labels: the selected and hovered entry, then the best-connected entries nearest the viewer, skipping overlaps.
    const size = W < 520 ? 13 : 14
    ctx.globalAlpha = 1; ctx.font = `600 ${size}px ${family}`; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
    const placed: [number, number, number, number][] = [], max = W < 520 ? 7 : 12
    const wanted = [sel, hovered, ...order.slice().reverse().filter(([, , z]) => z < 0.4).map((p) => p[4]).sort((a, b) => nodes[b].degree - nodes[a].degree)]
    let count = 0
    for (const i of wanted) {
      if (i < 0 || (count >= max && i !== sel && i !== hovered)) continue
      if (placed.length && quiet(i) && i !== sel && i !== hovered) continue
      const [x, y, , f] = proj[i], text = nodes[i].title, w = ctx.measureText(text).width, rad = (3 + Math.min(7, Math.sqrt(nodes[i].witnesses) * 1.4)) * (0.7 + 0.4 * f)
      let lx = x + rad + 5
      if (lx + w > W - 6) lx = x - rad - 5 - w
      const box: [number, number, number, number] = [lx - 3, y - size * 0.7, w + 6, size * 1.4]
      if (placed.some((b) => box[0] < b[0] + b[2] && b[0] < box[0] + box[2] && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) continue
      placed.push(box); if (i !== sel && i !== hovered) count++
      ctx.strokeStyle = bg; ctx.lineWidth = 4; ctx.strokeText(text, lx, y); ctx.fillStyle = fg; ctx.fillText(text, lx, y)
    }
    // Keep drawing only while something moves; a still map costs nothing.
    if (turning || drag) raf = requestAnimationFrame(frame)
    else if (spinning && !prefersReducedMotion.current) setTimeout(wake, Math.max(0, idleUntil - performance.now()) + 16)
  }
  $effect(() => {
    if (!canvas) return
    const ro = new ResizeObserver(() => wake())
    ro.observe(canvas)
    return () => { cancelAnimationFrame(raf); raf = 0; ro.disconnect() }
  })
  // Any change of view, selection, hover or lens draws again.
  $effect(() => { void [layout, lens, region, selected, hovered, spinning, zoom, colorOf]; wake() })

  function pick(e: PointerEvent) {
    const r = canvas!.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top
    let best = -1, bd = e.pointerType === 'touch' ? 22 : 14
    for (const [px, py, z, , i] of proj) { const d = Math.hypot(px - x, py - y) + z * 2; if (d < bd) { bd = d; best = i } }
    return best
  }
  function down(e: PointerEvent) { drag = [e.clientX, e.clientY]; moved = 0; idleUntil = performance.now() + 4000; if (e.pointerType === 'mouse') canvas!.setPointerCapture(e.pointerId) }
  function move(e: PointerEvent) {
    if (drag) {
      const dx = e.clientX - drag[0], dy = e.clientY - drag[1]
      moved += Math.abs(dx) + Math.abs(dy)
      // The map turns with the finger: dragging right brings the left side to the front.
      rotY -= dx * 0.006
      // Touch keeps vertical moves for scrolling the page; a mouse can also tilt.
      if (e.pointerType === 'mouse') rotX = Math.max(-1.3, Math.min(1.3, rotX + dy * 0.006))
      drag = [e.clientX, e.clientY]; idleUntil = performance.now() + 4000; wake(); return
    }
    if (e.pointerType === 'mouse') hovered = pick(e)
  }
  function up(e: PointerEvent) {
    if (drag && moved < 8) { const i = pick(e); selected = i >= 0 ? nodes[i].id : '' }
    drag = null; idleUntil = performance.now() + 4000; wake()
  }
  // A plain wheel scrolls the page; with Ctrl or Cmd (and trackpad pinch) it zooms.
  function wheel(e: WheelEvent) { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoom = Math.max(0.6, Math.min(3, zoom * Math.exp(-e.deltaY * 0.004))) }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') rotY += 0.12
    else if (e.key === 'ArrowRight') rotY -= 0.12
    else if (e.key === 'ArrowUp') rotX = Math.max(-1.3, rotX - 0.12)
    else if (e.key === 'ArrowDown') rotX = Math.min(1.3, rotX + 0.12)
    else if (e.key === '+' || e.key === '=') zoom = Math.min(3, zoom * 1.2)
    else if (e.key === '-') zoom = Math.max(0.6, zoom / 1.2)
    else return
    e.preventDefault(); idleUntil = performance.now() + 4000; wake()
  }
  const hoverNode = $derived(hovered >= 0 ? nodes[hovered] : null)
</script>

<!-- role="application" is a keyboard-operable widget: arrows turn the map, + and - zoom. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div class="kg" tabindex="0" role="application" aria-roledescription="peta tiga dimensi" aria-label={label} onkeydown={key}>
  <canvas
    bind:this={canvas}
    aria-hidden="true"
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={() => (drag = null)}
    onpointerleave={() => { hovered = -1; if (drag) drag = null }}
    onwheel={wheel}
  ></canvas>
  <div class="kg-tools">
    <button type="button" onclick={() => (zoom = Math.min(3, zoom * 1.25))} aria-label="Perbesar"><Plus size={16} /></button>
    <button type="button" onclick={() => (zoom = Math.max(0.6, zoom / 1.25))} aria-label="Perkecil"><Minus size={16} /></button>
    {#if !prefersReducedMotion.current}<button type="button" onclick={() => (spinning = !spinning)} aria-label={spinning ? 'Hentikan putaran' : 'Putar peta'}>{#if spinning}<Pause size={15} />{:else}<Play size={15} />{/if}</button>{/if}
  </div>
  {#if hoverNode}<p class="kg-tip" aria-hidden="true"><strong>{hoverNode.title}</strong> · {hoverNode.witnesses} sumber{missingPage(hoverNode) ? ' · belum ada halaman' : ''}</p>{/if}
</div>

<style>
  .kg { position: relative; border-radius: 14px; background: color-mix(in oklab, var(--foreground) 3%, var(--background)); overflow: hidden; }
  canvas { display: block; width: 100%; height: clamp(420px, 62vh, 600px); cursor: grab; touch-action: pan-y; }
  canvas:active { cursor: grabbing; }
  .kg:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .kg-tools { position: absolute; right: 10px; top: 10px; display: grid; gap: 6px; }
  .kg-tools button { display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--border); border-radius: 999px; background: color-mix(in oklab, var(--background) 86%, transparent); backdrop-filter: blur(8px); color: var(--foreground); cursor: pointer; }
  .kg-tools button:hover { background: var(--secondary); }
  .kg-tools button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .kg-tip { position: absolute; left: 12px; bottom: 10px; margin: 0; padding: 6px 10px; border-radius: 8px; background: var(--background); border: 1px solid var(--border); font-size: 13px; pointer-events: none; }
  @media (max-width: 640px) { canvas { height: 460px; } }
</style>
