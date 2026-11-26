<script lang="ts">
  // Rotatable 3D & 2D Canvas stage for Peta Bahasa & Semantik Papua.
  // Built on the exact same projection, sunflower cluster discs, 650ms cubic tweening, and floating glass tool
  // grammar as MapStage.svelte so Ensiklopedia's maps share one unmistakable visual and interaction language.
  import { onMount, untrack } from 'svelte'
  import { prefersReducedMotion } from 'svelte/motion'
  import { Box, Minus, Plus, RotateCcw } from '@lucide/svelte'
  import { appearance } from './appearance.svelte'
  import { clusterLayout, type Group, type StageNode, type Vec } from './stage-layouts.ts'

  export type LangLens = 'peta' | 'rumpun' | 'semantik' | 'kelompok'

  export type AtlasPoint = {
    id: string
    title: string
    familyKey: string
    familyLabel: string
    region: string
    x: number
    y: number
    hasArticle: boolean
    word?: string
    hasVoice?: boolean
  }

  export type SemPoint = {
    id: string
    n: number
    title: string
    english: string
    x: number
    y: number
    z: number
    cluster: number
    colexDegree: number
    wordsCount: number
  }

  export type SemLink = {
    a: number
    b: number
    kind: 'colexification' | 'semantic'
    weight: number
  }

  let {
    lens,
    atlasPoints = [],
    atlasFamilies = [],
    atlasRings = [],
    atlasBox = [90, 78, 1143, 938] as [number, number, number, number],
    semPoints = [],
    semLinks = [],
    semClusters = [],
    selected = $bindable(''),
    hidden = new Set<string>(),
    region = '',
    matches = null,
    colexOnly = false,
    onlyWithWords = false,
    threeD = $bindable(true),
    height = 'compact',
    label = 'Peta bahasa dan semantik Tanah Papua',
    onSelect,
  }: {
    lens: LangLens
    atlasPoints: AtlasPoint[]
    atlasFamilies: { key: string; label: string; color: string; count: number }[]
    atlasRings: { key: string; label: string; x: number; y: number; rings: [number, number][][] }[]
    atlasBox?: [number, number, number, number]
    semPoints: SemPoint[]
    semLinks: SemLink[]
    semClusters: { id: number; label: string; color: string; count: number }[]
    selected?: string
    hidden?: Set<string>
    region?: string
    matches?: Set<string> | null
    colexOnly?: boolean
    onlyWithWords?: boolean
    threeD?: boolean
    height?: 'compact' | 'fill'
    label?: string
    onSelect?: (id: string) => void
  } = $props()

  const DURATION = 650
  const D = 6

  const isSemanticLens = (l: LangLens) => l === 'semantik' || l === 'kelompok'
  const orbitable = (l: LangLens) => l === 'semantik' && threeD
  const homeCam = (l: LangLens) =>
    l === 'semantik' && threeD ? { yaw: 0.48, pitch: 0.24, persp: 1 } : { yaw: 0, pitch: 0, persp: 0 }

  let canvas = $state<HTMLCanvasElement>(),
    hovered = $state(-1),
    aspect = $state(1.8),
    coarse = $state(false)

  const shape = $derived(aspect >= 1.2 ? 1.85 : 0.85)
  const familyColor = $derived(new Map(atlasFamilies.map((f) => [f.key, f.color])))
  const clusterColor = $derived(new Map(semClusters.map((c) => [c.id, c.color])))

  const activeMode = $derived<'atlas' | 'semantic'>(isSemanticLens(lens) ? 'semantic' : 'atlas')

  const atlasLayouts = $derived.by(() => {
    const [x0, y0, x1, y1] = atlasBox
    const s = 2 / Math.max(x1 - x0, y1 - y0)
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const petaPos: Vec[] = atlasPoints.map((p) => [(p.x - cx) * s, -(p.y - cy) * s, 0])
    const stageNodes: StageNode[] = atlasPoints.map((p) => ({
      id: p.id,
      class: 'bahasa',
      title: p.title,
      witnesses: (p.hasVoice ? 6 : p.word ? 4 : p.hasArticle ? 2 : 1),
    }))
    const groups = atlasFamilies.map((f) => ({ key: f.key, label: f.label }))
    const familyById = new Map(atlasPoints.map((p) => [p.id, p.familyKey]))
    const rumpun = clusterLayout(stageNodes, groups, (n) => familyById.get(n.id) ?? null, shape, 'Lainnya')
    return {
      peta: { pos: petaPos, groups: [] as Group[], scale: s, offset: [cx, cy] as [number, number] },
      rumpun,
    }
  })

  const semLayouts = $derived.by(() => {
    const semPos: Vec[] = semPoints.map((p) => [p.x * 1.15, -p.y * 1.05, p.z * 1.1])
    const stageNodes: StageNode[] = semPoints.map((p) => ({
      id: p.id,
      class: 'konsep',
      title: p.title,
      witnesses: Math.max(1, p.colexDegree * 2 + p.wordsCount),
    }))
    const groups = semClusters.map((c) => ({ key: String(c.id), label: c.label }))
    const clusterById = new Map(semPoints.map((p) => [p.id, String(p.cluster)]))
    const kelompok = clusterLayout(stageNodes, groups, (n) => clusterById.get(n.id) ?? null, shape)
    return {
      semantik: { pos: semPos, groups: [] as Group[] },
      kelompok,
    }
  })

  function layoutOf(l: LangLens) {
    if (l === 'peta') return atlasLayouts.peta
    if (l === 'rumpun') return atlasLayouts.rumpun
    if (l === 'semantik') return semLayouts.semantik
    return semLayouts.kelompok
  }

  type Cam = { yaw: number; pitch: number; persp: number }
  type Fit = { scale: number; cx: number; cy: number }

  let W = 0, H = 0, raf = 0, dpr = 1
  let cur: Vec[] = [], from: Vec[] = [], goal: Vec[] = []
  let cam: Cam = homeCam(untrack(() => lens)), camFrom: Cam = cam, camGoal: Cam = cam
  let fitNow: Fit = { scale: 100, cx: 0, cy: 0 }, fitFrom: Fit = fitNow
  let t0 = 0, tweening = false, shown: LangLens = untrack(() => lens), prevLens: LangLens = shown, zoom = 1
  let drag: [number, number] | null = null, moved = 0
  let proj: [number, number, number, number][] = []

  const rot = (p: Vec, c: Cam): [number, number, number] => {
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch)
    const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy
    const y1 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp
    const f = 1 + c.persp * (D / (D + z2) - 1)
    return [x1 * f, y1 * f, z2]
  }

  function margins() {
    const narrow = W < 560
    return { l: 16, r: narrow ? 58 : 20, t: 32, b: 22 }
  }

  function fitFor(l: LangLens, pos: Vec[], c: Cam): Fit {
    const m = margins(), aw = Math.max(40, W - m.l - m.r), ah = Math.max(40, H - m.t - m.b)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    const add = (p: Vec) => {
      const r = rot(p, c)
      x0 = Math.min(x0, r[0]); x1 = Math.max(x1, r[0])
      y0 = Math.min(y0, r[1]); y1 = Math.max(y1, r[1])
    }
    if (orbitable(l)) {
      const R = Math.max(0.7, ...pos.map((p) => Math.hypot(p[0], p[1], p[2])))
      const k = D / (D - R * 0.42)
      x0 = y0 = -R * k * 0.92; x1 = y1 = R * k * 0.92
    } else if (l === 'peta') {
      const L = atlasLayouts.peta
      add([(atlasBox[0] - L.offset[0]) * L.scale, -(atlasBox[1] - L.offset[1]) * L.scale, 0])
      add([(atlasBox[2] - L.offset[0]) * L.scale, -(atlasBox[3] - L.offset[1]) * L.scale, 0])
    } else {
      pos.forEach(add)
      for (const g of layoutOf(l).groups) {
        add([g.center[0] - g.radius, g.center[1] - g.radius, 0])
        add([g.center[0] + g.radius, g.center[1] + g.radius + 0.16, 0])
      }
    }
    if (!Number.isFinite(x0)) return { scale: 120, cx: 0, cy: 0 }
    const w = Math.max(0.01, x1 - x0), h = Math.max(0.01, y1 - y0)
    return { scale: Math.min(aw / w, ah / h), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
  }

  const P = (p: Vec): [number, number, number, number] => {
    const r = rot(p, cam), m = margins(), s = fitNow.scale * zoom
    return [
      m.l + (W - m.l - m.r) / 2 + (r[0] - fitNow.cx) * s,
      m.t + (H - m.t - m.b) / 2 - (r[1] - fitNow.cy) * s,
      r[2],
      1,
    ]
  }

  const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

  function arrange(next: LangLens, jump: boolean) {
    const L = layoutOf(next)
    goal = L.pos
    camGoal = homeCam(next)
    const crossDataset = isSemanticLens(next) !== isSemanticLens(shown)
    if (jump || crossDataset || prefersReducedMotion.current || cur.length !== goal.length) {
      cur = goal.map((p) => [...p] as Vec)
      cam = camGoal
      prevLens = next
      shown = next
      zoom = 1
      fitNow = fitFor(next, goal, cam)
      tweening = false
      wake()
      return
    }
    from = cur.map((p) => [...p] as Vec)
    camFrom = { ...cam, yaw: wrap(cam.yaw) }
    fitFrom = fitNow
    prevLens = shown
    shown = next
    zoom = 1
    t0 = performance.now()
    tweening = true
    wake()
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
      for (let i = 0; i < cur.length; i++) {
        for (let d = 0; d < 3; d++) cur[i][d] = from[i][d] + (goal[i][d] - from[i][d]) * e
      }
      cam = {
        yaw: camFrom.yaw + (camGoal.yaw - camFrom.yaw) * e,
        pitch: camFrom.pitch + (camGoal.pitch - camFrom.pitch) * e,
        persp: camFrom.persp + (camGoal.persp - camFrom.persp) * e,
      }
      const to = fitFor(shown, goal, camGoal)
      fitNow = {
        scale: fitFrom.scale + (to.scale - fitFrom.scale) * e,
        cx: fitFrom.cx + (to.cx - fitFrom.cx) * e,
        cy: fitFrom.cy + (to.cy - fitFrom.cy) * e,
      }
      if (k >= 1) { tweening = false; prevLens = shown; fitNow = to }
    }
    const e = tweening ? ease(k) : 1
    const weight = (l: LangLens) => (l === shown ? e : 0) + (l === prevLens && tweening ? 1 - e : 0)
    draw(ctx, weight)
    if (tweening || drag) raf = requestAnimationFrame(frame)
  }

  function drawGroups(ctx: CanvasRenderingContext2D, groups: Group[], w: number, fg: string, muted: string, family: string, narrow: boolean) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    const centres = groups.map((g) => P(g.center))
    groups.forEach((g, i) => {
      const c = centres[i], e = P([g.center[0] + g.radius, g.center[1], g.center[2]]), r = Math.abs(e[0] - c[0])
      ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2)
      ctx.strokeStyle = fg; ctx.lineWidth = 1
      ctx.globalAlpha = (g.tray ? 0.2 : 0.12) * w
      if (g.tray) ctx.setLineDash([2, 3])
      ctx.stroke(); ctx.setLineDash([])
      const size = narrow ? 11 : 12
      ctx.font = `650 ${size}px ${family}`
      ctx.globalAlpha = 0.9 * w; ctx.fillStyle = fg
      const room = Math.max(2 * r + 18, Math.min(220, ...centres.filter((o, j) => j !== i && Math.abs(o[1] - c[1]) < 4).map((o) => Math.abs(o[0] - c[0]) - 8)))
      const lines: string[] = []
      for (const word of g.label.split(' ')) {
        const last = lines[lines.length - 1]
        if (last && ctx.measureText(last + ' ' + word).width <= room) lines[lines.length - 1] = last + ' ' + word
        else lines.push(word)
      }
      lines.forEach((t, k) => ctx.fillText(t, c[0], c[1] - r - 7 - (lines.length - 1 - k) * (size + 2)))
      ctx.font = `500 ${size - 1}px ${family}`; ctx.fillStyle = muted; ctx.globalAlpha = 0.85 * w
      ctx.fillText(String(g.count), c[0], c[1] + r + size + 5)
    })
    ctx.globalAlpha = 1
  }

  function draw(ctx: CanvasRenderingContext2D, weight: (l: LangLens) => number) {
    const fg = css('--foreground'), bg = css('--background'), muted = css('--muted-foreground'), brand = css('--brand') || '#14b8a6'
    const family = getComputedStyle(canvas!).fontFamily || 'sans-serif'
    const narrow = W < 560
    const dark = appearance.theme === 'dark'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    proj = cur.map((p) => P(p))

    if (activeMode === 'atlas') {
      const selIdx = selected ? atlasPoints.findIndex((p) => p.id === selected) : -1
      const selRegion = selIdx >= 0 ? atlasPoints[selIdx]!.region : ''
      const wP = weight('peta')
      const wR = weight('rumpun')

      // 1. Papua 7-Wilayah Adat map outlines
      if (wP > 0.01) {
        const L = atlasLayouts.peta
        ctx.lineJoin = 'round'
        for (const r of atlasRings) {
          ctx.beginPath()
          for (const ring of r.rings) {
            ring.forEach(([x, y], j) => {
              const q = P([(x - L.offset[0]) * L.scale, -(y - L.offset[1]) * L.scale, 0])
              if (j) ctx.lineTo(q[0], q[1])
              else ctx.moveTo(q[0], q[1])
            })
          }
          ctx.closePath()
          const lit = (region && r.key === region) || (!region && r.key === selRegion)
          ctx.globalAlpha = wP * (lit ? 0.16 : 0.05)
          ctx.fillStyle = lit ? brand : fg
          ctx.fill()
          ctx.globalAlpha = wP * (lit ? 0.85 : 0.28)
          ctx.strokeStyle = lit ? brand : fg
          ctx.lineWidth = lit ? 1.5 : 1
          ctx.stroke()
        }
        // Subtle region names
        ctx.font = `600 ${narrow ? 10 : 11}px ${family}`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        for (const r of atlasRings) {
          const q = P([(r.x - L.offset[0]) * L.scale, -(r.y - L.offset[1]) * L.scale, 0])
          ctx.fillStyle = region && r.key === region ? fg : muted
          ctx.globalAlpha = wP * (region && r.key !== region ? 0.28 : 0.65)
          ctx.fillText(r.label, q[0], q[1])
        }
      }

      // 2. Family sunflower discs
      if (wR > 0.01) {
        drawGroups(ctx, atlasLayouts.rumpun.groups, wR, fg, muted, family, narrow)
      }

      // 3. 256 Language dots
      const quiet = (i: number) => {
        const p = atlasPoints[i]!
        if (hidden.has(p.familyKey)) return true
        if (region && p.region !== region) return true
        if (onlyWithWords && !p.word) return true
        if (matches !== null && !matches.has(p.id)) return true
        return false
      }

      for (let i = 0; i < atlasPoints.length; i++) {
        const p = atlasPoints[i]!
        const [x, y] = proj[i]!
        const big = i === selIdx || i === hovered
        const hasWord = !!p.word
        const q = quiet(i) && !big
        const baseR = hasWord ? (narrow ? 4.8 : 5.5) : p.hasArticle ? 3.5 : 2.6
        const r = baseR * (big ? 1.45 : 1)
        const c = hasWord && p.hasVoice ? '#d97706' : hasWord ? '#14b8a6' : (familyColor.get(p.familyKey) ?? '#8a8a8a')

        if (hasWord && !q) {
          ctx.globalAlpha = big ? 0.34 : 0.22
          ctx.fillStyle = p.hasVoice ? '#d97706' : '#14b8a6'
          ctx.beginPath(); ctx.arc(x, y, r + 5.5, 0, Math.PI * 2); ctx.fill()
        }

        ctx.globalAlpha = q ? 0.12 : hasWord ? 0.98 : 0.86
        ctx.fillStyle = c
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        if (hasWord || big) {
          ctx.lineWidth = big ? 2 : 1.4
          ctx.strokeStyle = big ? fg : bg
          ctx.stroke()
        }
        if (matches && matches.has(p.id) && !big) {
          ctx.globalAlpha = 0.9; ctx.lineWidth = 1.5; ctx.strokeStyle = fg
          ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke()
        }
      }

      // 4. Crisp collision-avoiding word/language pills
      if (!tweening) {
        const fs = narrow ? 11.5 : 12.5
        ctx.font = `650 ${fs}px ${family}`
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
        const placed: [number, number, number, number][] = []
        const wanted = [
          selIdx,
          hovered,
          ...atlasPoints.map((p, i) => (p.word && !quiet(i) ? i : -1)).filter((i) => i >= 0),
          ...(matches ? atlasPoints.map((p, i) => (matches.has(p.id) ? i : -1)).filter((i) => i >= 0).slice(0, 10) : []),
        ]
        const seen = new Set<number>()
        for (const i of wanted) {
          if (i < 0 || seen.has(i)) continue
          seen.add(i)
          const p = atlasPoints[i]!
          const [x, y] = proj[i]!
          const text = p.word ? `${p.word} · ${p.title}` : p.title
          const tw = ctx.measureText(text).width
          const ph = 20, pw = tw + 14
          let lx = x + 10
          if (lx + pw > W - 8) lx = x - 10 - pw
          const box: [number, number, number, number] = [lx - 2, y - ph / 2 - 2, pw + 4, ph + 4]
          if (i !== selIdx && i !== hovered && placed.some((b) => box[0] < b[0] + b[2] && b[0] < box[0] + box[2] && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) continue
          placed.push(box)
          ctx.globalAlpha = 0.94
          ctx.fillStyle = dark ? 'rgba(18, 22, 26, 0.92)' : 'rgba(255, 255, 255, 0.94)'
          ctx.strokeStyle = i === selIdx ? '#14b8a6' : css('--border')
          ctx.lineWidth = i === selIdx ? 1.6 : 1
          ctx.beginPath()
          ctx.roundRect(lx, y - ph / 2, pw, ph, 10)
          ctx.fill(); ctx.stroke()
          ctx.fillStyle = fg
          ctx.fillText(text, lx + 7, y + 0.5)
        }
      }
      ctx.globalAlpha = 1
      return
    }

    // === SEMANTIC MODE (Ruang semantik 3D <-> Kelompok makna) ===
    const selIdx = selected ? semPoints.findIndex((p) => p.id === selected) : -1
    const focusIdx = hovered >= 0 ? hovered : selIdx
    const wS = weight('semantik')
    const wK = weight('kelompok')

    const visibleLinks = semLinks.filter((l) => !colexOnly || l.kind === 'colexification')
    const focusNeighbors = new Set<number>()
    if (focusIdx >= 0) {
      focusNeighbors.add(focusIdx)
      for (const l of visibleLinks) {
        if (l.a === focusIdx) focusNeighbors.add(l.b)
        else if (l.b === focusIdx) focusNeighbors.add(l.a)
      }
    }

    // 1. Cluster discs for Kelompok makna
    if (wK > 0.01) {
      drawGroups(ctx, semLayouts.kelompok.groups, wK, fg, muted, family, narrow)
    }

    // 2. Colexification & semantic edges
    ctx.lineCap = 'round'
    for (const l of visibleLinks) {
      const a = proj[l.a], b = proj[l.b]
      if (!a || !b) continue
      const isColex = l.kind === 'colexification'
      const hot = focusIdx >= 0 && (l.a === focusIdx || l.b === focusIdx)
      let alpha = 0
      if (hot && isColex) alpha = 0.95
      else if (hot) alpha = 0.55 * Math.max(wS, 0.7)
      else if (focusIdx >= 0) alpha = isColex ? 0.1 * Math.max(wS, 0.4) : 0.03 * wS
      else alpha = isColex ? 0.62 * Math.max(wS, 0.25) : 0.14 * wS
      if (alpha < 0.01) continue
      ctx.globalAlpha = alpha
      ctx.strokeStyle = isColex ? '#14b8a6' : fg
      ctx.lineWidth = hot ? (isColex ? 2.4 : 1.4) : isColex ? 1.5 : 0.7
      ctx.setLineDash(isColex ? [] : [3, 3])
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
    }
    ctx.setLineDash([])

    // 3. Depth-sorted 100 concepts
    const order = proj.map((_, i) => i).sort((a, b) => proj[b]![2] - proj[a]![2])
    const depthFade = cam.persp > 0.3
    const quiet = (i: number) => {
      const p = semPoints[i]!
      if (hidden.has(String(p.cluster))) return true
      if (colexOnly && p.colexDegree === 0) return true
      if (focusIdx >= 0 && !focusNeighbors.has(i)) return true
      if (matches !== null && !matches.has(p.id)) return true
      return false
    }

    const radius = (i: number) => (narrow ? 3.5 : 4) + Math.min(narrow ? 4.5 : 6, semPoints[i]!.colexDegree * 1.15)
    for (const i of order) {
      const p = semPoints[i]!
      const [x, y, z] = proj[i]!
      const big = i === selIdx || i === hovered
      const r = radius(i) * (big ? 1.45 : 1) * (depthFade ? 1 - z * 0.08 : 1)
      const color = clusterColor.get(p.cluster) ?? '#14b8a6'

      if (big) {
        ctx.globalAlpha = 0.28
        ctx.fillStyle = color
        ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = quiet(i) && !big ? 0.14 : depthFade ? Math.max(0.52, Math.min(1, 0.88 - z * 0.25)) : 0.94
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, r), 0, Math.PI * 2); ctx.fill()
      ctx.lineWidth = big ? 2 : 1.3; ctx.strokeStyle = big ? fg : bg; ctx.stroke()
      if (matches && matches.has(p.id) && !big) {
        ctx.globalAlpha = 0.9; ctx.lineWidth = 1.5; ctx.strokeStyle = fg
        ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke()
      }
    }

    // 4. Collision-avoiding concept labels
    if (!tweening) {
      const fs = narrow ? 11.5 : 12.5
      ctx.globalAlpha = 1; ctx.font = `600 ${fs}px ${family}`
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round'
      const max = shown === 'kelompok' ? (narrow ? 4 : 8) : narrow ? 10 : 18
      const placed: [number, number, number, number][] = []
      const wanted = [
        selIdx,
        hovered,
        ...(focusIdx >= 0 ? [...focusNeighbors] : []),
        ...(matches ? semPoints.map((p, i) => (matches.has(p.id) ? i : -1)).filter((i) => i >= 0).slice(0, 12) : []),
        ...order
          .slice()
          .reverse()
          .filter((i) => !quiet(i) && (!depthFade || proj[i]![2] < 0.45))
          .sort((a, b) => semPoints[b]!.colexDegree - semPoints[a]!.colexDegree || semPoints[b]!.wordsCount - semPoints[a]!.wordsCount),
      ]
      let count = 0
      const seen = new Set<number>()
      for (const i of wanted) {
        if (i < 0 || seen.has(i)) continue
        seen.add(i)
        const must = i === selIdx || i === hovered || (focusIdx >= 0 && focusNeighbors.has(i)) || (matches?.has(semPoints[i]!.id) ?? false)
        if (!must && count >= max) continue
        const [x, y] = proj[i]!, text = semPoints[i]!.title, tw = ctx.measureText(text).width, r = radius(i)
        let lx = x + r + 5
        if (lx + tw > W - 6) lx = x - r - 5 - tw
        const box: [number, number, number, number] = [lx - 3, y - fs * 0.7, tw + 6, fs * 1.4]
        if (placed.some((b) => box[0] < b[0] + b[2] && b[0] < box[0] + box[2] && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) continue
        placed.push(box)
        if (!must) count++
        ctx.strokeStyle = bg; ctx.lineWidth = 4; ctx.strokeText(text, lx, y)
        ctx.fillStyle = fg; ctx.fillText(text, lx, y)
      }
    }
    ctx.globalAlpha = 1
  }

  let firstDraw = true
  $effect(() => {
    void atlasLayouts; void semLayouts
    const next = lens
    if (firstDraw || !W) {
      if (W) firstDraw = false
      arrange(next, true)
      return
    }
    if (next !== shown || goal !== layoutOf(next).pos) arrange(next, false)
  })
  $effect(() => { void threeD; if (shown === 'semantik' && !firstDraw) arrange('semantik', false) })
  $effect(() => { void [selected, hovered, hidden, region, matches, colexOnly, onlyWithWords, appearance.theme, atlasPoints]; wake() })

  onMount(() => {
    const mq = matchMedia('(pointer: coarse)')
    coarse = mq.matches
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
        arrange(lens, true)
      } else if (tweening) {
        goal = layoutOf(shown).pos
        wake()
      } else {
        arrange(lens, true)
      }
    })
    if (canvas) ro.observe(canvas)
    return () => { cancelAnimationFrame(raf); raf = 0; ro.disconnect() }
  })

  function pickAt(e: PointerEvent) {
    const r = canvas!.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top
    let best = -1, bd = e.pointerType === 'touch' ? 22 : 14
    for (let i = 0; i < proj.length; i++) {
      const d = Math.hypot(proj[i]![0] - x, proj[i]![1] - y) + (cam.persp > 0.3 ? proj[i]![2] * 2 : 0)
      if (d < bd) { bd = d; best = i }
    }
    return best
  }
  function down(e: PointerEvent) {
    drag = [e.clientX, e.clientY]; moved = 0
    if (e.pointerType === 'mouse' || orbitable(shown)) canvas!.setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent) {
    if (drag) {
      const dx = e.clientX - drag[0], dy = e.clientY - drag[1]
      moved += Math.abs(dx) + Math.abs(dy)
      if (orbitable(shown) && !tweening) {
        cam = { ...cam, yaw: cam.yaw - dx * 0.007, pitch: Math.max(-1.45, Math.min(1.45, cam.pitch + dy * 0.006)) }
      }
      drag = [e.clientX, e.clientY]; wake(); return
    }
    if (e.pointerType === 'mouse') { const h = pickAt(e); if (h !== hovered) hovered = h }
  }
  function up(e: PointerEvent) {
    if (drag && moved < 8) {
      const i = pickAt(e)
      const nextId = activeMode === 'atlas'
        ? (i >= 0 ? (atlasPoints[i]?.id ?? '') : '')
        : (i >= 0 ? (semPoints[i]?.id ?? '') : '')
      selected = nextId
      onSelect?.(nextId)
    }
    drag = null; wake()
  }
  function wheel(e: WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault(); zoom = Math.max(0.6, Math.min(4, zoom * Math.exp(-e.deltaY * 0.004))); wake()
  }
  function zoomBy(f: number) { zoom = Math.max(0.6, Math.min(4, zoom * f)); wake() }
  function reset() { arrange(shown, false) }
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

  const tipAtlas = $derived(activeMode === 'atlas' && hovered >= 0 ? atlasPoints[hovered] : undefined)
  const tipSem = $derived(activeMode === 'semantic' && hovered >= 0 ? semPoints[hovered] : undefined)
  const turnable = $derived(lens === 'semantik' && threeD)
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  class="ls"
  class:fill={height === 'fill'}
  class:turn={turnable}
  class:hold={turnable}
  tabindex="0"
  role="application"
  aria-roledescription="peta bahasa dan semantik"
  aria-label={label}
  onkeydown={key}
>
  <canvas
    bind:this={canvas}
    aria-hidden="true"
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={() => (drag = null)}
    onpointerleave={() => (hovered = -1)}
    onwheel={wheel}
  ></canvas>

  <div class="ls-tools">
    <button type="button" onclick={() => zoomBy(1.25)} aria-label="Perbesar" title="Perbesar"><Plus size={16} /></button>
    <button type="button" onclick={() => zoomBy(1 / 1.25)} aria-label="Perkecil" title="Perkecil"><Minus size={16} /></button>
    <button type="button" onclick={reset} aria-label="Atur ulang tampilan" title="Atur ulang tampilan"><RotateCcw size={15} /></button>
    {#if lens === 'semantik'}
      <button
        type="button"
        class="ls-3d"
        aria-pressed={threeD}
        onclick={() => (threeD = !threeD)}
        title={threeD ? 'Tampilkan datar' : 'Putar 3D'}
      >
        <Box size={15} aria-hidden="true" />
        <span>{threeD ? 'Datar' : 'Putar 3D'}</span>
      </button>
    {/if}
  </div>

  {#if tipAtlas}
    <p class="ls-tip" aria-hidden="true">
      <strong>{tipAtlas.title}</strong>
      {#if tipAtlas.word} · <em>{tipAtlas.word}</em>{/if}
      · {tipAtlas.familyLabel}
    </p>
  {:else if tipSem}
    <p class="ls-tip" aria-hidden="true">
      <strong>{tipSem.title}</strong> ({tipSem.english})
      {#if tipSem.colexDegree} · {tipSem.colexDegree} jembatan koleksifikasi{/if}
    </p>
  {/if}
</div>

<style>
  .ls { position: relative; border-radius: 16px; background: color-mix(in oklab, var(--foreground) 3%, var(--background)); overflow: hidden; min-width: 0; }
  canvas { display: block; width: 100%; height: clamp(440px, 60vh, 580px); touch-action: pan-y; }
  .fill { height: 100%; border-radius: 0; }
  .fill canvas { height: 100%; }
  .turn canvas { cursor: grab; }
  .turn canvas:active { cursor: grabbing; }
  .hold canvas { touch-action: none; }
  .ls:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .ls-tools { position: absolute; right: 10px; top: 10px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .ls-tools button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 36px; height: 36px; padding: 0; border: 1px solid var(--border); border-radius: 999px; background: color-mix(in oklab, var(--background) 86%, transparent); backdrop-filter: blur(8px); color: var(--foreground); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .ls-tools .ls-3d { padding: 0 12px; }
  .ls-tools .ls-3d[aria-pressed='true'] { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .ls-tools button:hover { background: var(--secondary); }
  .ls-tools .ls-3d[aria-pressed='true']:hover { background: color-mix(in oklab, var(--foreground) 88%, var(--background)); }
  .ls-tools button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  @media (pointer: coarse) { .ls-tools button { min-width: 44px; height: 44px; } .ls-tools { gap: 4px; } }
  .ls-tip { position: absolute; left: 12px; bottom: 10px; max-width: calc(100% - 24px); margin: 0; padding: 6px 10px; border-radius: 8px; background: var(--background); border: 1px solid var(--border); font-size: 13px; pointer-events: none; }
  @media (max-width: 640px) { canvas { height: 420px; } .fill canvas { height: 100%; } }
</style>
