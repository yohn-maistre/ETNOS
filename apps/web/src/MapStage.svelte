<script lang="ts">
  // The knowledge map as one stage: one canvas, one set of points, and an arrangement per lens. Choosing a lens only
  // changes where the points should be; they travel there in about 650 ms (with reduced motion they jump). Every
  // layout is computed once (stage-layouts.ts), each frame only interpolates, and the loop stops when nothing moves.
  // The renderer is the same plain canvas projection as the earlier 3D network map, so no 3D library is loaded.
  // Size and pace can be turned all the way round; the network can be turned as before; the other lenses lie flat.
  import { onMount, untrack } from 'svelte'
  import { prefersReducedMotion } from 'svelte/motion'
  import { Box, Minus, Plus, RotateCcw } from '@lucide/svelte'
  import { appearance } from './appearance.svelte'
  import { BANDS, ILC, PACE, PACE_TICKS, SIZE, SIZE_TICKS, bandOf, paceWords, rangeWords, sizeWords } from './world-scale.ts'
  import {
    BOX, LENS_LABEL, bidangLayout, dataDomain, hubunganLayout, kebutuhanLayout, petaLayout, skalaLayout, tingkatLayout,
    type Group, type Layout, type Lens, type StageLink, type StageNode, type Vec,
  } from './stage-layouts.ts'

  type Node = StageNode & { regions: string[]; gaps: string[] }
  let {
    nodes,
    links,
    lens,
    selected = $bindable(''),
    hidden = new Set<string>(),
    gaps = false,
    region = '',
    matches = null,
    fit = 'full',
    threeD = $bindable(true),
    coordOf = null,
    rings = [],
    ringOf = () => null,
    label,
    height = 'compact',
  }: {
    nodes: Node[]
    links: StageLink[]
    lens: Lens
    selected?: string
    hidden?: Set<string>
    gaps?: boolean
    region?: string
    /** Ids that match the search, or null when there is no search. */
    matches?: Set<string> | null
    fit?: 'full' | 'data'
    threeD?: boolean
    /** A point in the site map's pixels for the map lens, or null; the lens waits until this is given. */
    coordOf?: ((n: Node) => [number, number] | null) | null
    /** Region outlines in the same pixels, with a key that a selected thing can light up. */
    rings?: { key: string; rings: [number, number][][] }[]
    ringOf?: (n: Node) => string | null
    label: string
    height?: 'compact' | 'fill'
  } = $props()

  const ATLAS: [number, number, number, number] = [90, 78, 1143, 938]
  const DURATION = 650
  const index = $derived(new Map(nodes.map((n, i) => [n.id, i])))

  let canvas = $state<HTMLCanvasElement>(),
    hovered = $state(-1),
    aspect = $state(1.8),
    coarse = $state(false)

  // Layouts, computed once per input. The cluster and map lenses depend on the stage's shape only coarsely.
  const shape = $derived(aspect >= 1.2 ? 1.9 : 0.8)
  const layouts = $derived.by((): Partial<Record<Lens, Layout & { scale?: number; offset?: [number, number] }>> => ({
    skala: skalaLayout(nodes, fit === 'data' ? dataDomain(nodes) : undefined),
    tingkat: tingkatLayout(nodes, shape),
    bidang: bidangLayout(nodes, shape),
    kebutuhan: kebutuhanLayout(nodes, shape),
    hubungan: hubunganLayout(nodes, links),
    ...(coordOf ? { peta: petaLayout(nodes, coordOf, ATLAS, shape) } : {}),
  }))
  const domain = $derived(fit === 'data' ? dataDomain(nodes) : { size: SIZE, pace: PACE })

  // Camera: yaw turns around the vertical axis, pitch tilts, persp blends from flat (0) to perspective (1).
  type Cam = { yaw: number; pitch: number; persp: number }
  type Fit = { scale: number; cx: number; cy: number }
  const orbitable = (l: Lens) => (l === 'skala' && threeD) || l === 'hubungan'
  const homeCam = (l: Lens): Cam => (l === 'skala' && threeD ? { yaw: -0.78, pitch: 0.3, persp: 1 } : l === 'hubungan' ? { yaw: 0.5, pitch: 0.22, persp: 1 } : { yaw: 0, pitch: 0, persp: 0 })
  const D = 6

  let W = 0, H = 0, raf = 0, dpr = 1
  let cur: Vec[] = [], from: Vec[] = [], goal: Vec[] = []
  let cam: Cam = homeCam('skala'), camFrom: Cam = cam, camGoal: Cam = cam
  let fitNow: Fit = { scale: 100, cx: 0, cy: 0 }, fitFrom: Fit = fitNow
  let t0 = 0, tweening = false, shown: Lens = untrack(() => lens), prevLens: Lens = shown, zoom = 1
  let drag: [number, number] | null = null, moved = 0
  let proj: [number, number, number, number][] = []

  const rot = (p: Vec, c: Cam): [number, number, number] => {
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch)
    const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy
    const y1 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp
    const f = 1 + c.persp * (D / (D + z2) - 1)
    return [x1 * f, y1 * f, z2]
  }
  function margins(l: Lens) {
    const narrow = W < 560
    // On a phone the round tools take the right edge, so the drawing keeps clear of them.
    if (l === 'skala') return threeD ? { l: narrow ? 64 : 92, r: narrow ? 60 : 84, t: 40, b: narrow ? 52 : 64 } : { l: narrow ? 86 : 96, r: narrow ? 60 : 30, t: 38, b: narrow ? 50 : 54 }
    return { l: 16, r: narrow ? 60 : 16, t: 36, b: 20 }
  }
  /** Scale and centre that fit a lens in the stage. Lenses that turn are fitted to a sphere, so turning never zooms. */
  function fitFor(l: Lens, pos: Vec[], c: Cam): Fit {
    const m = margins(l), aw = Math.max(40, W - m.l - m.r), ah = Math.max(40, H - m.t - m.b)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    const add = (p: Vec) => { const r = rot(p, c); x0 = Math.min(x0, r[0]); x1 = Math.max(x1, r[0]); y0 = Math.min(y0, r[1]); y1 = Math.max(y1, r[1]) }
    if (orbitable(l)) {
      const R = l === 'skala' ? Math.hypot(...BOX) : Math.max(0.5, ...pos.map((p) => Math.hypot(...p)))
      const k = D / (D - R * 0.45)
      x0 = y0 = -R * k * 0.86; x1 = y1 = R * k * 0.86
    } else if (l === 'skala') {
      add([-BOX[0], -BOX[1], 0]); add([BOX[0], BOX[1], 0])
    } else {
      pos.forEach(add)
      for (const g of layouts[l]?.groups ?? []) { add([g.center[0] - g.radius, g.center[1] - g.radius, 0]); add([g.center[0] + g.radius, g.center[1] + g.radius + 0.16, 0]) }
      if (l === 'peta') { const L = layouts.peta!; add([(ATLAS[0] - L.offset![0]) * L.scale!, -(ATLAS[1] - L.offset![1]) * L.scale!, 0]); add([(ATLAS[2] - L.offset![0]) * L.scale!, -(ATLAS[3] - L.offset![1]) * L.scale!, 0]) }
    }
    const w = Math.max(0.01, x1 - x0), h = Math.max(0.01, y1 - y0)
    return { scale: Math.min(aw / w, ah / h), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
  }
  let mCur = { l: 16, r: 16, t: 36, b: 20 }
  const P = (p: Vec): [number, number, number, number] => {
    const r = rot(p, cam), m = mCur, s = fitNow.scale * zoom
    return [m.l + (W - m.l - m.r) / 2 + (r[0] - fitNow.cx) * s, m.t + (H - m.t - m.b) / 2 - (r[1] - fitNow.cy) * s, r[2], 1]
  }

  const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
  /** Starts moving every point to the lens's layout. With reduced motion, or on first draw, the points jump. */
  function arrange(next: Lens, jump: boolean) {
    const L = layouts[next]
    if (!L) return
    goal = L.pos
    camGoal = homeCam(next)
    if (jump || prefersReducedMotion.current || cur.length !== goal.length) {
      cur = goal.map((p) => [...p] as Vec); cam = camGoal; prevLens = next; shown = next; zoom = 1
      fitNow = fitFor(next, goal, cam); mCur = margins(next); tweening = false; wake(); return
    }
    from = cur.map((p) => [...p] as Vec)
    camFrom = { ...cam, yaw: wrap(cam.yaw) }
    fitFrom = fitNow
    prevLens = shown; shown = next; zoom = 1
    t0 = performance.now(); tweening = true; wake()
  }

  function css(name: string) { return canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : '#888' }
  function wake() { if (!raf && canvas) raf = requestAnimationFrame(frame) }

  function frame(now: number) {
    raf = 0
    if (!canvas || !W) return
    const ctx = canvas.getContext('2d')!
    let k = 1
    if (tweening) {
      k = Math.min(1, (now - t0) / DURATION)
      const e = ease(k)
      for (let i = 0; i < cur.length; i++) for (let d = 0; d < 3; d++) cur[i][d] = from[i][d] + (goal[i][d] - from[i][d]) * e
      cam = { yaw: camFrom.yaw + (camGoal.yaw - camFrom.yaw) * e, pitch: camFrom.pitch + (camGoal.pitch - camFrom.pitch) * e, persp: camFrom.persp + (camGoal.persp - camFrom.persp) * e }
      const to = fitFor(shown, goal, camGoal)
      fitNow = { scale: fitFrom.scale + (to.scale - fitFrom.scale) * e, cx: fitFrom.cx + (to.cx - fitFrom.cx) * e, cy: fitFrom.cy + (to.cy - fitFrom.cy) * e }
      const a = margins(prevLens), b = margins(shown)
      mCur = { l: a.l + (b.l - a.l) * e, r: a.r + (b.r - a.r) * e, t: a.t + (b.t - a.t) * e, b: a.b + (b.b - a.b) * e }
      if (k >= 1) { tweening = false; prevLens = shown; fitNow = to }
    }
    if (!tweening) mCur = margins(shown)
    // How much of each lens's furniture to draw: the arriving lens fades in, the leaving one fades out.
    const e = tweening ? ease(k) : 1
    const weight = (l: Lens) => (l === shown ? e : 0) + (l === prevLens && tweening ? 1 - e : 0)
    draw(ctx, weight)
    if (tweening || drag) raf = requestAnimationFrame(frame)
  }

  function draw(ctx: CanvasRenderingContext2D, weight: (l: Lens) => number) {
    const fg = css('--foreground'), bg = css('--background'), muted = css('--muted-foreground'), brand = css('--brand') || fg
    const family = getComputedStyle(canvas!).fontFamily || 'sans-serif'
    const dark = appearance.theme === 'dark', narrow = W < 560
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    proj = cur.map((p) => P(p))
    const sel = selected ? index.get(selected) ?? -1 : -1
    const near = sel >= 0 ? new Set([sel, ...links.filter((l) => l.strong && (l.a === sel || l.b === sel)).map((l) => (l.a === sel ? l.b : l.a))]) : null
    const band = (i: number) => bandOf(nodes[i].world?.level?.code)
    const color = (i: number) => { const b = band(i); return b ? (dark ? b.dark : b.light) : '#8a8a8a' }
    const off = (i: number) => hidden.has(band(i)?.key ?? '')
    const missing = (i: number) => nodes[i].gaps.includes('belum-ada-halaman')
    const inRegion = (i: number) => !region || nodes[i].regions.includes(region) || nodes[i].context === region
    const quiet = (i: number) => off(i) || (near && !near.has(i)) || (gaps && !missing(i)) || !inRegion(i) || (matches !== null && !matches.has(nodes[i].id))

    // The size and pace box, its grid and its axis labels.
    const wS = weight('skala')
    if (wS > 0.01) drawBox(ctx, wS, fg, muted, family, narrow)
    // Region outlines of the map lens.
    const wP = weight('peta')
    if (wP > 0.01 && layouts.peta) {
      const L = layouts.peta, lit = sel >= 0 ? ringOf(nodes[sel]) : null
      ctx.lineJoin = 'round'
      for (const r of rings) {
        ctx.beginPath()
        for (const ring of r.rings) ring.forEach(([x, y], j) => { const q = P([(x - L.offset![0]) * L.scale!, -(y - L.offset![1]) * L.scale!, 0]); if (j) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]) })
        ctx.closePath()
        const on = r.key === lit
        ctx.globalAlpha = wP * (on ? 0.14 : 0.045); ctx.fillStyle = on ? brand : fg; ctx.fill()
        ctx.globalAlpha = wP * (on ? 0.9 : 0.32); ctx.strokeStyle = on ? brand : fg; ctx.lineWidth = on ? 1.6 : 1; ctx.stroke()
      }
    }
    // Lines: the whole network in its lens, elsewhere only the selected thing's statements.
    const wH = weight('hubungan')
    ctx.lineCap = 'round'
    for (const l of links) {
      const a = proj[l.a], b = proj[l.b], hot = sel >= 0 && (l.a === sel || l.b === sel)
      let alpha = 0
      if (hot && l.strong) alpha = 0.7
      else if (hot) alpha = 0.45 * wH
      else if (sel >= 0) alpha = 0.04 * wH
      else alpha = wH * (l.strong ? 0.3 : 0.05 + 0.16 * l.w)
      if (alpha < 0.01) continue
      ctx.globalAlpha = alpha; ctx.strokeStyle = fg; ctx.lineWidth = hot ? 1.4 : l.strong ? 1.1 : 0.6
      ctx.setLineDash(l.disputed ? [4, 3] : [])
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
    }
    ctx.setLineDash([])
    // Group rings and labels of the cluster lenses and the map's tray.
    for (const l of ['tingkat', 'bidang', 'kebutuhan', 'peta'] as Lens[]) {
      const w = weight(l)
      if (w > 0.01) drawGroups(ctx, layouts[l]?.groups ?? [], w, fg, muted, family, narrow)
    }
    // The selected thing's range in the size and pace lens.
    if (sel >= 0 && wS > 0.01) {
      const w = nodes[sel].world, z = cur[sel][2]
      if (w?.size && w.pace) {
        const X = (v: number) => (((v - domain.size[0]) / (domain.size[1] - domain.size[0])) * 2 - 1) * BOX[0]
        const Y = (v: number) => (((v - domain.pace[0]) / (domain.pace[1] - domain.pace[0])) * 2 - 1) * BOX[1]
        const c = [P([X(w.size.lo), Y(w.pace.lo), z]), P([X(w.size.hi), Y(w.pace.lo), z]), P([X(w.size.hi), Y(w.pace.hi), z]), P([X(w.size.lo), Y(w.pace.hi), z])]
        ctx.beginPath(); c.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath()
        ctx.fillStyle = color(sel); ctx.globalAlpha = 0.12 * wS; ctx.fill()
        ctx.strokeStyle = color(sel); ctx.globalAlpha = 0.7 * wS; ctx.setLineDash([4, 3]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([])
      }
    }
    // Points from back to front.
    const order = proj.map((_, i) => i).sort((a, b) => proj[b][2] - proj[a][2])
    const radius = (i: number) => (narrow ? 3 : 3.4) + Math.min(narrow ? 4 : 5.5, Math.sqrt(nodes[i].witnesses) * 1.15)
    const depthFade = cam.persp > 0.3
    for (const i of order) {
      const [x, y, z] = proj[i], big = i === sel || i === hovered, r = radius(i) * (big ? 1.45 : 1) * (depthFade ? 1 - z * 0.06 : 1)
      ctx.globalAlpha = quiet(i) && !big ? 0.12 : depthFade ? Math.max(0.55, Math.min(1, 0.85 - z * 0.25)) : 0.92
      ctx.fillStyle = color(i); ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, r), 0, Math.PI * 2); ctx.fill()
      ctx.lineWidth = big ? 2 : 1.3; ctx.strokeStyle = big ? fg : bg; ctx.stroke()
      if (gaps && missing(i) && inRegion(i) && !off(i)) { ctx.globalAlpha = 1; ctx.lineWidth = 2.5; ctx.strokeStyle = '#e0a83a'; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, Math.PI * 2); ctx.stroke() }
      if (matches && matches.has(nodes[i].id) && !big) { ctx.globalAlpha = 0.9; ctx.lineWidth = 1.5; ctx.strokeStyle = fg; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke() }
    }
    // Labels: the selected and hovered thing, its neighbours, search matches, then the best-sourced, skipping overlaps.
    const fs = narrow ? 12.5 : 13.5
    ctx.globalAlpha = 1; ctx.font = `600 ${fs}px ${family}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round'
    const clusterLens = shown === 'tingkat' || shown === 'bidang' || shown === 'kebutuhan'
    const max = tweening ? 0 : clusterLens ? (narrow ? 2 : 4) : narrow ? 5 : 10
    const placed: [number, number, number, number][] = []
    const wanted = [sel, hovered, ...(near ? [...near] : []), ...(matches ? [...matches].map((id) => index.get(id) ?? -1).slice(0, 12) : []),
      ...order.slice().reverse().filter((i) => !quiet(i) && (!depthFade || proj[i][2] < 0.5)).sort((a, b) => nodes[b].witnesses - nodes[a].witnesses || nodes[a].id.localeCompare(nodes[b].id))]
    let count = 0
    for (const i of wanted) {
      if (i < 0) continue
      const must = i === sel || i === hovered || (near?.has(i) ?? false) || (matches?.has(nodes[i].id) ?? false)
      if (!must && count >= max) continue
      const [x, y] = proj[i], text = nodes[i].title, w = ctx.measureText(text).width, r = radius(i)
      let lx = x + r + 5
      if (lx + w > W - 6) lx = x - r - 5 - w
      const box: [number, number, number, number] = [lx - 3, y - fs * 0.7, w + 6, fs * 1.4]
      if (placed.some((b) => box[0] < b[0] + b[2] && b[0] < box[0] + box[2] && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) continue
      placed.push(box)
      if (!must) count++
      ctx.strokeStyle = bg; ctx.lineWidth = 4; ctx.strokeText(text, lx, y); ctx.fillStyle = fg; ctx.fillText(text, lx, y)
    }
    ctx.globalAlpha = 1
  }

  function drawGroups(ctx: CanvasRenderingContext2D, groups: Group[], w: number, fg: string, muted: string, family: string, narrow: boolean) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    const centres = groups.map((g) => P(g.center))
    groups.forEach((g, i) => {
      const c = centres[i], e = P([g.center[0] + g.radius, g.center[1], g.center[2]]), r = Math.abs(e[0] - c[0])
      ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2)
      ctx.strokeStyle = fg; ctx.lineWidth = 1
      if (!g.count) { ctx.setLineDash([3, 4]); ctx.globalAlpha = 0.35 * w } else { ctx.globalAlpha = (g.tray ? 0.18 : 0.1) * w; if (g.tray) ctx.setLineDash([2, 3]) }
      ctx.stroke(); ctx.setLineDash([])
      const size = narrow ? 11.5 : 12.5
      ctx.font = `650 ${size}px ${family}`
      ctx.globalAlpha = (g.count ? 0.92 : 0.6) * w; ctx.fillStyle = g.count ? fg : muted
      // A name wider than the room beside its neighbours wraps onto more lines.
      const room = Math.max(2 * r + 16, Math.min(260, ...centres.filter((o, j) => j !== i && Math.abs(o[1] - c[1]) < 4).map((o) => Math.abs(o[0] - c[0]) - 8)))
      const lines: string[] = []
      for (const word of g.label.split(' ')) {
        const last = lines[lines.length - 1]
        if (last && ctx.measureText(last + ' ' + word).width <= room) lines[lines.length - 1] = last + ' ' + word
        else lines.push(word)
      }
      lines.forEach((t, k) => ctx.fillText(t, c[0], c[1] - r - 7 - (lines.length - 1 - k) * (size + 2)))
      ctx.font = `500 ${size - 1}px ${family}`; ctx.fillStyle = muted; ctx.globalAlpha = 0.9 * w
      ctx.fillText(g.count ? String(g.count) : 'belum ada', c[0], c[1] + r + size + 5)
    })
    ctx.globalAlpha = 1
  }

  /** The box of the size and pace lens. Labels sit on the edges that face the reader, so they stay readable at any turn. */
  function drawBox(ctx: CanvasRenderingContext2D, w: number, fg: string, muted: string, family: string, narrow: boolean) {
    const [bx, by, bz] = BOX
    const X = (v: number) => (((v - domain.size[0]) / (domain.size[1] - domain.size[0])) * 2 - 1) * bx
    const Y = (v: number) => (((v - domain.pace[0]) / (domain.pace[1] - domain.pace[0])) * 2 - 1) * by
    const line = (a: Vec, b: Vec, alpha: number) => { const p = P(a), q = P(b); ctx.globalAlpha = alpha * w; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke() }
    // How much a face looks toward the reader (0 edge-on, 1 facing): rotate its normal and read the depth part.
    const facing = (n: Vec) => Math.abs(rot(n, { ...cam, persp: 0 })[2])
    const farther = (a: Vec, b: Vec) => (rot(a, cam)[2] > rot(b, cam)[2] ? a : b)
    const span = Math.max(domain.size[1] - domain.size[0], domain.pace[1] - domain.pace[0]), minor = span < 7
    ctx.strokeStyle = fg; ctx.lineWidth = 1
    const zBack = farther([0, 0, bz], [0, 0, -bz])[2], xBack = farther([bx, 0, 0], [-bx, 0, 0])[0], yBack = farther([0, by, 0], [0, -by, 0])[1]
    const fz = facing([0, 0, 1]), fx = facing([1, 0, 0]), fy = facing([0, 1, 0])
    for (const [s, , major] of SIZE_TICKS) {
      const x = X(s)
      if (x < -bx - 0.001 || x > bx + 0.001 || (!major && !minor)) continue
      const a = major ? 0.11 : 0.055
      line([x, -by, zBack], [x, by, zBack], a * fz)
      line([x, yBack, -bz], [x, yBack, bz], a * fy)
    }
    for (const [p, , major] of PACE_TICKS) {
      const y = Y(p)
      if (y < -by - 0.001 || y > by + 0.001 || (!major && !minor)) continue
      const a = major ? 0.11 : 0.055
      line([-bx, y, zBack], [bx, y, zBack], a * fz)
      line([xBack, y, -bz], [xBack, y, bz], a * fx)
    }
    for (let k = 0; k < ILC.length; k += 4) { const z = ((k / (ILC.length - 1)) * 2 - 1) * bz; line([xBack, -by, z], [xBack, by, z], 0.04 * fx); line([-bx, yBack, z], [bx, yBack, z], 0.04 * fy) }
    // The twelve edges of the box, faint.
    for (const [sy, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) line([-bx, sy * by, sz * bz], [bx, sy * by, sz * bz], 0.2 * Math.max(fz, fy, 0.5))
    for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) line([sx * bx, -by, sz * bz], [sx * bx, by, sz * bz], 0.2 * Math.max(fz, fx, 0.5))
    if (cam.persp > 0.05 || Math.abs(cam.yaw) > 0.05) for (const [sx, sy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) line([sx * bx, sy * by, -bz], [sx * bx, sy * by, bz], 0.2 * Math.max(fx, fy))

    // Edges for labels: the size edge lowest on screen, the pace edge furthest left, the level edge lowest on screen.
    const c0 = P([0, 0, 0])
    const pick = (cands: [Vec, Vec][], score: (m: [number, number, number, number]) => number) => {
      let best = cands[0], bs = -Infinity
      for (const e of cands) { const m = P([(e[0][0] + e[1][0]) / 2, (e[0][1] + e[1][1]) / 2, (e[0][2] + e[1][2]) / 2]); const s = score(m); if (s > bs) { bs = s; best = e } }
      return best
    }
    const fsz = narrow ? 11 : 12
    // Labels are queued with a priority and drawn from the most important down; one that would touch a label
    // already drawn is left out, so axis titles, ends and ticks never print over each other at any angle.
    const queue: { p: Vec; text: string; out: [number, number]; strong: boolean; prio: number; dist: number }[] = []
    const labelAt = (p: Vec, text: string, out: [number, number], strong = false, prio = strong ? 3 : 1, dist = 10) => queue.push({ p, text, out, strong, prio, dist })
    const outward = (e: [Vec, Vec]): [number, number] => { const m = P([(e[0][0] + e[1][0]) / 2, (e[0][1] + e[1][1]) / 2, (e[0][2] + e[1][2]) / 2]); return [m[0] - c0[0], m[1] - c0[1]] }
    // Size along x.
    const sEdge = pick([[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sy, sz]) => [[-bx, sy * by, sz * bz], [bx, sy * by, sz * bz]] as [Vec, Vec]), (m) => m[1] - m[2] * 0.01)
    const sOut = outward(sEdge)
    const sLen = Math.hypot(P(sEdge[0])[0] - P(sEdge[1])[0], P(sEdge[0])[1] - P(sEdge[1])[1])
    for (const [s, text, major] of SIZE_TICKS) {
      const x = X(s)
      if (x < -bx - 0.001 || x > bx + 0.001 || (!major && (!minor || sLen < 420))) continue
      labelAt([x, sEdge[0][1], sEdge[0][2]], text, [sOut[0] * 0.15, Math.sign(sOut[1] || 1)], false, major ? 1.5 : 1)
    }
    labelAt([0, sEdge[0][1], sEdge[0][2]], 'Ukuran', [0, Math.sign(sOut[1] || 1)], true, 3, 28)
    // Pace along y.
    const pEdge = pick([[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => [[sx * bx, -by, sz * bz], [sx * bx, by, sz * bz]] as [Vec, Vec]), (m) => -m[0] - m[2] * 0.01)
    const pOut = outward(pEdge)
    for (const [p, text, major] of PACE_TICKS) {
      const y = Y(p)
      if (y < -by - 0.001 || y > by + 0.001 || (!major && !minor)) continue
      labelAt([pEdge[0][0], y, pEdge[0][2]], text, [Math.sign(pOut[0] || -1), pOut[1] * 0.05], false, major ? 1.5 : 1)
    }
    labelAt([pEdge[0][0], by, pEdge[0][2]], 'Lama berubah', [Math.sign(pOut[0] || -1) * 0.2, -1], true)
    // Level along z, only when the box is turned enough to show depth.
    const lEdge = pick([[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sy]) => [[sx * bx, sy * by, -bz], [sx * bx, sy * by, bz]] as [Vec, Vec]), (m) => m[1] + m[0] * 0.3)
    const a = P(lEdge[0]), b = P(lEdge[1]), lLen = Math.hypot(a[0] - b[0], a[1] - b[1])
    if (lLen > 70) {
      const lOut = outward(lEdge), dir: [number, number] = [Math.sign(lOut[0] || 1), Math.sign(lOut[1] || 1) * 0.4]
      const zOf = (code: string) => ((ILC.indexOf(code) / (ILC.length - 1)) * 2 - 1) * bz
      BANDS.forEach((bd, i) => {
        const end = i === 0 || i === BANDS.length - 1
        if (!end && lLen < 260) return
        labelAt([lEdge[0][0], lEdge[0][1], (zOf(bd.classes[0]) + zOf(bd.classes[bd.classes.length - 1])) / 2], bd.label, dir, false, end ? 2 : 1)
      })
      const back = P([lEdge[0][0], lEdge[0][1], bz])[2] > P([lEdge[0][0], lEdge[0][1], -bz])[2] ? bz : -bz
      labelAt([lEdge[0][0], lEdge[0][1], back * 1.12], 'Tingkat', dir, true, 2.5)
    }
    const taken: [number, number, number, number][] = []
    for (const l of queue.sort((x, y) => y.prio - x.prio)) {
      const q = P(l.p), len = Math.hypot(...l.out) || 1, ox = l.out[0] / len, oy = l.out[1] / len
      ctx.font = `${l.strong ? 650 : 500} ${l.strong ? 12 : fsz}px ${family}`
      const tw = ctx.measureText(l.text).width, th = (l.strong ? 12 : fsz) + 2
      const align = ox > 0.35 ? 'left' : ox < -0.35 ? 'right' : 'center', base = oy > 0.35 ? 'top' : oy < -0.35 ? 'bottom' : 'middle'
      const x = q[0] + ox * l.dist, y = q[1] + oy * l.dist
      const x0 = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2, y0 = base === 'top' ? y : base === 'bottom' ? y - th : y - th / 2
      const r: [number, number, number, number] = [x0 - 3, y0 - 2, x0 + tw + 3, y0 + th + 2]
      if (r[0] < 2 || r[2] > W - 2 || taken.some((t) => r[0] < t[2] && r[2] > t[0] && r[1] < t[3] && r[3] > t[1])) continue
      taken.push(r)
      ctx.textAlign = align; ctx.textBaseline = base; ctx.fillStyle = l.strong ? fg : muted; ctx.globalAlpha = w
      ctx.fillText(l.text, x, y)
    }
    ctx.globalAlpha = 1; ctx.textBaseline = 'middle'
  }

  // Inputs: a new lens moves the points; new data or a new frame size jumps to the current lens.
  let firstDraw = true
  $effect(() => {
    void layouts
    const next = lens
    if (!layouts[next]) return
    if (firstDraw || !W) {
      if (W) firstDraw = false
      arrange(next, true)
      return
    }
    if (next !== shown || goal !== layouts[next]!.pos) arrange(next, false)
  })
  $effect(() => { void threeD; if (shown === 'skala' && !firstDraw) arrange('skala', false) })
  $effect(() => { void [selected, hovered, hidden, gaps, region, matches, appearance.theme, rings]; wake() })

  onMount(() => {
    const mq = matchMedia('(pointer: coarse)')
    coarse = mq.matches
    // Phones start flat; a button turns on 3D.
    if (matchMedia('(max-width: 640px)').matches || coarse) threeD = false
    const ro = new ResizeObserver(() => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(coarse ? 1.75 : 2, devicePixelRatio || 1)
      if (rect.width === W && rect.height === H) return
      const hadSize = W > 0
      W = rect.width; H = rect.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      aspect = H ? W / H : 1.8
      if (!hadSize || firstDraw) {
        if (W > 0) firstDraw = false
        if (layouts[lens]) arrange(lens, true)
      } else if (tweening) {
        // Keep the active 650ms lens transition running smoothly instead of teleporting on a minor toolbar height change.
        if (layouts[shown]) goal = layouts[shown]!.pos
        wake()
      } else if (layouts[lens]) {
        arrange(lens, true)
      }
    })
    if (canvas) ro.observe(canvas)
    return () => { cancelAnimationFrame(raf); raf = 0; ro.disconnect() }
  })

  function pickAt(e: PointerEvent) {
    const r = canvas!.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top
    let best = -1, bd = e.pointerType === 'touch' ? 22 : 13
    for (let i = 0; i < proj.length; i++) { const d = Math.hypot(proj[i][0] - x, proj[i][1] - y) + (cam.persp > 0.3 ? proj[i][2] * 2 : 0); if (d < bd) { bd = d; best = i } }
    return best
  }
  function down(e: PointerEvent) {
    drag = [e.clientX, e.clientY]; moved = 0
    if (e.pointerType === 'mouse' || (orbitable(shown) && shown === 'skala')) canvas!.setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent) {
    if (drag) {
      const dx = e.clientX - drag[0], dy = e.clientY - drag[1]
      moved += Math.abs(dx) + Math.abs(dy)
      if (orbitable(shown) && !tweening) {
        // Dragging right brings the left side to the front, as on the earlier network map.
        cam = { ...cam, yaw: cam.yaw - dx * 0.007 }
        if (e.pointerType === 'mouse' || shown === 'skala') cam.pitch = Math.max(-1.45, Math.min(1.45, cam.pitch + dy * 0.006))
      }
      drag = [e.clientX, e.clientY]; wake(); return
    }
    if (e.pointerType === 'mouse') { const h = pickAt(e); if (h !== hovered) hovered = h }
  }
  function up(e: PointerEvent) {
    if (drag && moved < 8) { const i = pickAt(e); selected = i >= 0 ? nodes[i].id : '' }
    drag = null; wake()
  }
  function wheel(e: WheelEvent) { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoom = Math.max(0.6, Math.min(4, zoom * Math.exp(-e.deltaY * 0.004))); wake() }
  function zoomBy(f: number) { zoom = Math.max(0.6, Math.min(4, zoom * f)); wake() }
  function reset() { if (layouts[shown]) arrange(shown, false) }
  function key(e: KeyboardEvent) {
    const o = orbitable(shown)
    if (o && e.key === 'ArrowLeft') cam = { ...cam, yaw: cam.yaw + 0.12 }
    else if (o && e.key === 'ArrowRight') cam = { ...cam, yaw: cam.yaw - 0.12 }
    else if (o && e.key === 'ArrowUp') cam = { ...cam, pitch: Math.max(-1.45, cam.pitch - 0.1) }
    else if (o && e.key === 'ArrowDown') cam = { ...cam, pitch: Math.min(1.45, cam.pitch + 0.1) }
    else if (e.key === '+' || e.key === '=') zoom = Math.min(4, zoom * 1.2)
    else if (e.key === '-') zoom = Math.max(0.6, zoom / 1.2)
    else if (e.key === '0') return reset()
    else return
    e.preventDefault(); wake()
  }
  const tip = $derived(hovered >= 0 ? nodes[hovered] : undefined)
  const turnable = $derived(lens === 'hubungan' || (lens === 'skala' && threeD))
</script>

<!-- role="application": arrows turn the frame where it can turn, + and - zoom, 0 resets. The list of all things sits beside the map. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div class="ms" class:fill={height === 'fill'} class:turn={turnable} class:hold={lens === 'skala' && threeD} tabindex="0" role="application" aria-roledescription="peta pengetahuan" aria-label={label + ' Susunan sekarang: ' + LENS_LABEL[lens] + '.'} onkeydown={key}>
  <canvas bind:this={canvas} aria-hidden="true" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={() => (drag = null)} onpointerleave={() => (hovered = -1)} onwheel={wheel}></canvas>
  <div class="ms-tools">
    <button type="button" onclick={() => zoomBy(1.25)} aria-label="Perbesar" title="Perbesar"><Plus size={16} /></button>
    <button type="button" onclick={() => zoomBy(1 / 1.25)} aria-label="Perkecil" title="Perkecil"><Minus size={16} /></button>
    <button type="button" onclick={reset} aria-label="Atur ulang tampilan" title="Atur ulang tampilan"><RotateCcw size={15} /></button>
    {#if lens === 'skala'}<button type="button" class="ms-3d" aria-pressed={threeD} onclick={() => (threeD = !threeD)} title={threeD ? 'Tampilkan datar' : 'Putar 3D'}><Box size={15} aria-hidden="true" /><span>{threeD ? 'Datar' : 'Putar 3D'}</span></button>{/if}
  </div>
  {#if tip}<p class="ms-tip" aria-hidden="true"><strong>{tip.title}</strong>{#if lens === 'skala' && tip.world?.size} · {rangeWords(tip.world.size, sizeWords)}{/if}{#if lens === 'skala' && tip.world?.pace} · berubah dalam {rangeWords(tip.world.pace, paceWords)}{/if}{#if lens !== 'skala'} · {tip.witnesses} sumber{/if}</p>{/if}
</div>

<style>
  .ms { position: relative; border-radius: 16px; background: color-mix(in oklab, var(--foreground) 3%, var(--background)); overflow: hidden; min-width: 0; }
  canvas { display: block; width: 100%; height: clamp(440px, 62vh, 600px); touch-action: pan-y; }
  .fill { height: 100%; border-radius: 0; }
  .fill canvas { height: 100%; }
  .turn canvas { cursor: grab; }
  .turn canvas:active { cursor: grabbing; }
  /* The turnable size and pace box takes every finger move; the page still scrolls outside it. */
  .hold canvas { touch-action: none; }
  .ms:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .ms-tools { position: absolute; right: 10px; top: 10px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .ms-tools button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 36px; height: 36px; padding: 0; border: 1px solid var(--border); border-radius: 999px; background: color-mix(in oklab, var(--background) 86%, transparent); backdrop-filter: blur(8px); color: var(--foreground); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .ms-tools .ms-3d { padding: 0 12px; }
  .ms-tools .ms-3d[aria-pressed='true'] { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .ms-tools button:hover { background: var(--secondary); }
  .ms-tools .ms-3d[aria-pressed='true']:hover { background: color-mix(in oklab, var(--foreground) 88%, var(--background)); }
  .ms-tools button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  @media (pointer: coarse) { .ms-tools button { min-width: 44px; height: 44px; } .ms-tools { gap: 4px; } }
  .ms-tip { position: absolute; left: 12px; bottom: 10px; max-width: calc(100% - 24px); margin: 0; padding: 6px 10px; border-radius: 8px; background: var(--background); border: 1px solid var(--border); font-size: 13px; pointer-events: none; }
  @media (max-width: 640px) { canvas { height: 460px; } .fill canvas { height: 100%; } }
</style>
