<script lang="ts">
  // The knowledge map: a folded time band that opens into an explorer.
  // Data is a static layout file built offline (scripts/observatory). It holds only public items.
  import { onMount } from 'svelte'
  import { prefersReducedMotion } from 'svelte/motion'
  import { ArrowUpRight, Maximize2, Minimize2, Pause, Play, Search } from '@lucide/svelte'

  type Node = {
    k: 'region' | 'page' | 'source' | 'passage' | 'catalogue'
    reg: string
    t: string
    x?: string
    y?: number | null
    ya?: [number, number]
    a?: string
    kind?: string
    sens?: string
    acc?: string
    u?: string
    href?: string
    d?: string[]
    dg?: number
    f?: string
    v?: string
    p: [number, number, number]
  }
  type MapData = { built: string; model: string; domains: Record<string, string>; forms: Record<string, string>; nodes: Node[]; edges: [number, number, string][] }

  let { src = '/observatory/map.json' }: { src?: string } = $props()
  let data = $state<MapData | null>(null),
    failed = $state(false),
    open = $state(false),
    lens = $state<'makna' | 'waktu'>('makna'),
    clock = $state<'dicatat' | 'terjadi'>('dicatat'),
    colorBy = $state<'wilayah' | 'ranah' | 'bentuk' | 'suara'>('wilayah'),
    query = $state(''),
    selected = $state(-1),
    hovered = $state(-1),
    spinning = $state(true)

  const REGION: Record<string, [string, string]> = {
    meepago: ['Mee Pago', '#a8701c'],
    saireri: ['Saireri', '#2d6b78'],
    'la-pago': ['La Pago', '#55762c'],
    shared: ['Lebih dari satu wilayah', '#6a6f86'],
  }
  const DOMAIN_COLOR: Record<string, string> = {
    'alam-hidup': '#5f8a3a', 'hutan-tanah': '#7d6b39', 'laut-air': '#2f7a8a', 'iklim-musim': '#6f8fb0', langit: '#4a4f8f',
    pangan: '#b08a2e', kesehatan: '#3f9a7a', bahasa: '#8a5a9a', cerita: '#c27a3a', 'adat-hukum': '#9a6a4a',
    kepercayaan: '#7a7aa0', 'seni-teknologi': '#a8735c', sejarah: '#6b6b6b', 'kehidupan-bersama': '#4f7a6a',
  }
  const FORM_COLOR: Record<string, string> = {
    'tradisi-lisan': '#c27a3a', manuskrip: '#6b6b6b', 'adat-istiadat': '#9a6a4a', ritus: '#7a7aa0', 'pengetahuan-tradisional': '#5f8a3a',
    'teknologi-tradisional': '#7d6b39', seni: '#a8735c', bahasa: '#8a5a9a', 'permainan-rakyat': '#b08a2e', 'olahraga-tradisional': '#2f7a8a',
  }
  const VOICE: Record<string, [string, string]> = {
    ensiklopedia: ['Ensiklopedia', '#6a6f86'], pemerintah: ['Pemerintah', '#4f7a6a'], akademik: ['Akademik', '#8a5a9a'],
    kolonial: ['Kolonial', '#7d6b39'], misi: ['Misi', '#7a7aa0'], 'lsm-media': ['LSM dan media', '#2f7a8a'],
    aksara: ['Aksara', '#b08a2e'], komunitas: ['Komunitas', '#c27a3a'], lainnya: ['Lainnya', '#9a9a9a'],
  }
  const KIND: Record<Node['k'], string> = {
    region: 'Wilayah adat', page: 'Halaman wiki', passage: 'Kalimat sumber', source: 'Sumber yang dikutip', catalogue: 'Sumber tercatat',
  }
  const SIZE: Record<Node['k'], number> = { region: 7, page: 4.2, source: 3.4, catalogue: 3.2, passage: 1.6 }
  const NOW = new Date().getFullYear()

  onMount(() => {
    fetch(src)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: MapData) => (data = d))
      .catch(() => (failed = true))
  })

  const adj = $derived.by(() => {
    if (!data) return [] as [number, string][][]
    const a: [number, string][][] = data.nodes.map(() => [])
    for (const [x, y, k] of data.edges) { a[x].push([y, k]); a[y].push([x, k]) }
    return a
  })
  const firstYear = $derived(data ? Math.min(...data.nodes.map((n) => n.y ?? NOW), ...data.nodes.map((n) => n.ya?.[0] ?? NOW)) : 1850)
  const counts = $derived.by(() => {
    if (!data) return null
    const by = (k: Node['k']) => data!.nodes.filter((n) => n.k === k).length
    const recorded = data.nodes.filter((n) => n.k === 'catalogue' && n.y).map((n) => n.y!)
    return { pages: by('page'), passages: by('passage'), sources: by('source') + by('catalogue'), earliest: recorded.length ? Math.min(...recorded) : null }
  })
  function colorOf(n: Node) {
    if (colorBy === 'wilayah') return REGION[n.reg]?.[1] ?? '#6a6f86'
    if (colorBy === 'suara') return VOICE[n.v ?? 'lainnya']?.[1] ?? '#9a9a9a'
    if (colorBy === 'bentuk') return n.f ? FORM_COLOR[n.f] : 'var(--km-quiet)'
    return n.d?.[0] ? DOMAIN_COLOR[n.d[0]] : 'var(--km-quiet)'
  }
  const legend = $derived.by(() => {
    if (!data) return [] as [string, string][]
    if (colorBy === 'wilayah') return Object.values(REGION)
    if (colorBy === 'suara') return Object.values(VOICE)
    if (colorBy === 'bentuk') return Object.entries(data.forms).map(([k, v]) => [v, FORM_COLOR[k]] as [string, string])
    return Object.entries(data.domains).map(([k, v]) => [v, DOMAIN_COLOR[k]] as [string, string])
  })
  function matches(n: Node) {
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    return (n.t + ' ' + (n.x ?? '') + ' ' + (n.a ?? '') + ' ' + (n.y ?? '')).toLowerCase().includes(q)
  }

  // ---- The band: two clocks laid sideways. ----
  const BAND_W = 1000, UNDATED = 70, EARLY = 60, START = 1800
  // Years before 1800 share one narrow column on the left; undated items one on the right.
  const bx = (y: number) => (y < START ? 8 + ((y * 37) % (EARLY - 16)) : EARLY + ((y - START) / (NOW - START)) * (BAND_W - UNDATED - EARLY - 20))
  const hash = (i: number, salt: number) => { const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453; return v - Math.floor(v) }
  const bandTicks = $derived.by(() => {
    if (!data) return [] as { x: number; y: number; c: string; i: number }[]
    const out: { x: number; y: number; c: string; i: number }[] = []
    data.nodes.forEach((n, i) => {
      if (n.k === 'region') return
      const jx = hash(i, 3), jy = hash(i, 7)
      const happened = n.ya?.[0]
      out.push({ x: happened ? bx(happened) : BAND_W - UNDATED + 8 + jx * (UNDATED - 16), y: 22 + jy * 34, c: colorOf(n), i })
      out.push({ x: n.y ? bx(n.y) : BAND_W - UNDATED + 8 + jx * (UNDATED - 16), y: 86 + jy * 34, c: colorOf(n), i })
    })
    return out
  })
  const bandYears = [1850, 1900, 1950, 2000]
  const undatedCount = $derived(data ? data.nodes.filter((n) => n.k !== 'region' && !n.y).length : 0)

  // ---- The explorer canvas. ----
  let canvas = $state<HTMLCanvasElement>()
  let cur: [number, number, number][] = [],
    rotY = 0.6, rotX = 0.28, zoom = 1, W = 0, H = 0,
    proj: [number, number, number, number, number][] = [],
    raf = 0, drag: [number, number] | null = null, moved = 0
  // Time height: years before 1800 share the bottom strip; undated items sit in the top band.
  const timeH = (y: number | undefined | null) => (!y ? -1.1 : y < START ? 1.05 - 0.1 * ((y - 1500) / (START - 1500)) : 0.9 - 1.8 * ((y - START) / (NOW - START)))
  const regionPages = $derived.by(() => {
    if (!data) return new Map<number, number[]>()
    const m = new Map<number, number[]>()
    data.nodes.forEach((n, i) => { if (n.k === 'region') m.set(i, adj[i].map(([j]) => j).filter((j) => data!.nodes[j].k === 'page')) })
    return m
  })
  function targetOf(i: number): [number, number, number] {
    const n = data!.nodes[i], pages = regionPages.get(i)
    if (pages?.length) { const ps = pages.map((j) => target(data!.nodes[j])); return [0, 1, 2].map((d) => ps.reduce((a, p) => a + p[d], 0) / ps.length) as [number, number, number] }
    return target(n)
  }
  function target(n: Node): [number, number, number] {
    if (lens === 'makna') return n.p
    const y = clock === 'dicatat' ? n.y : n.ya?.[0]
    return [n.p[0], timeH(y) + (y ? 0 : n.p[1] * 0.06), n.p[2]]
  }
  function css(name: string) { return canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : '#888' }
  function resolve(c: string) { return c.startsWith('var(') ? css(c.slice(4, -1)) : c }
  function frame() {
    if (!canvas || !data) return
    const ctx = canvas.getContext('2d')!
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1)
    if (r.width !== W || r.height !== H) { W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const nodes = data.nodes
    if (cur.length !== nodes.length) cur = nodes.map((n) => [...n.p] as [number, number, number])
    const ease = prefersReducedMotion.current ? 1 : 0.12
    nodes.forEach((_, i) => { const t = targetOf(i); for (let d = 0; d < 3; d++) cur[i][d] += (t[d] - cur[i][d]) * ease })
    if (spinning && !drag && !prefersReducedMotion.current) rotY += 0.0016
    if (lens === 'waktu' && !drag) rotX += (0.06 - rotX) * 0.08
    const s = Math.min(W, H) * 0.38 * zoom, cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX)
    proj = cur.map(([x, y, z], i) => { const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx, f = 3.2 / (3.2 + z2); return [W / 2 + x1 * s * f, H / 2 + y1 * s * f, z2, f, i] })
    ctx.clearRect(0, 0, W, H)
    const focus = selected >= 0 ? new Set([selected, ...adj[selected].map(([j]) => j)]) : null
    const hit = query.trim() ? new Set(nodes.map((n, i) => (matches(n) ? i : -1)).filter((i) => i >= 0)) : null
    ctx.lineWidth = 0.5; ctx.strokeStyle = css('--border'); ctx.globalAlpha = focus || hit ? 0.25 : 0.6; ctx.beginPath()
    for (const [a, b, k] of data.edges) { if (k === 'from') continue; ctx.moveTo(proj[a][0], proj[a][1]); ctx.lineTo(proj[b][0], proj[b][1]) }
    ctx.stroke(); ctx.globalAlpha = 1
    if (focus) { ctx.lineWidth = 1; ctx.strokeStyle = css('--foreground'); ctx.beginPath(); for (const [j] of adj[selected]) { ctx.moveTo(proj[selected][0], proj[selected][1]); ctx.lineTo(proj[j][0], proj[j][1]) } ctx.stroke() }
    for (const [x, y, , f, i] of [...proj].sort((a, b) => b[2] - a[2])) {
      const n = nodes[i], dim = (focus && !focus.has(i)) || (hit && !hit.has(i))
      const rad = SIZE[n.k] * (0.7 + 0.5 * f) * (i === selected || i === hovered ? 1.7 : 1)
      ctx.globalAlpha = dim ? 0.1 : Math.max(0.35, Math.min(1, 0.55 + 0.4 * f))
      const col = resolve(colorOf(n)); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1.1; ctx.beginPath()
      if (n.k === 'source') { ctx.rect(x - rad, y - rad, rad * 2, rad * 2); ctx.fill() }
      else if (n.k === 'catalogue') { ctx.moveTo(x, y - rad * 1.2); ctx.lineTo(x + rad * 1.2, y); ctx.lineTo(x, y + rad * 1.2); ctx.lineTo(x - rad * 1.2, y); ctx.closePath(); n.sens === 'sacred' || n.sens === 'restricted' ? ctx.stroke() : ctx.fill() }
      else if (n.k === 'region') { ctx.lineWidth = 2; ctx.arc(x, y, rad, 0, 7); ctx.stroke() }
      else { ctx.arc(x, y, rad, 0, 7); ctx.fill() }
      if (n.sens === 'conflict' && !dim) { ctx.beginPath(); ctx.strokeStyle = css('--foreground'); ctx.lineWidth = 0.8; ctx.arc(x, y, rad * 2, 0, 7); ctx.stroke() }
    }
    ctx.globalAlpha = 1; ctx.fillStyle = css('--foreground'); ctx.font = '500 12px ' + (getComputedStyle(canvas).fontFamily || 'sans-serif'); ctx.textBaseline = 'middle'
    if (lens === 'waktu') {
      // Year marks along the left edge of the layers.
      ctx.fillStyle = css('--muted-foreground'); ctx.font = '11px ' + (getComputedStyle(canvas).fontFamily || 'sans-serif')
      for (const y of [1850, 1900, 1950, 2000]) { const t = timeH(y), y1 = t * cx, z2 = t * sx, f = 3.2 / (3.2 + z2); ctx.fillText(String(y), 6, H / 2 + y1 * s * f) }
      ctx.fillStyle = css('--foreground'); ctx.font = '500 12px ' + (getComputedStyle(canvas).fontFamily || 'sans-serif')
    }
    // Region labels: placed top to bottom with at least 16px between them so they never overlap.
    const labels = nodes.map((n, i) => (n.k === 'region' || i === selected ? { i, x: proj[i][0] + 10, y: proj[i][1], text: n.k === 'region' ? REGION[n.reg]?.[0] ?? n.t : short(n.t, 42) } : null)).filter((l): l is { i: number; x: number; y: number; text: string } => !!l).sort((a, b) => a.y - b.y)
    for (let k = 1; k < labels.length; k++) if (labels[k].y - labels[k - 1].y < 16 && Math.abs(labels[k].x - labels[k - 1].x) < 120) labels[k].y = labels[k - 1].y + 16
    for (const l of labels) ctx.fillText(l.text, l.x, l.y)
    raf = requestAnimationFrame(frame)
  }
  $effect(() => {
    if (open && canvas && data) { raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf) }
  })
  function pick(e: PointerEvent) {
    const r = canvas!.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top
    let best = -1, bd = 14
    for (const [px, py, , , i] of proj) { const d = Math.hypot(px - x, py - y) - (data!.nodes[i].k === 'passage' ? 0 : 3); if (d < bd) { bd = d; best = i } }
    return best
  }
  function down(e: PointerEvent) { canvas!.setPointerCapture(e.pointerId); drag = [e.clientX, e.clientY]; moved = 0 }
  function move(e: PointerEvent) {
    if (drag) { const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; moved += Math.abs(dx) + Math.abs(dy); rotY += dx * 0.006; rotX = Math.max(-1.4, Math.min(1.4, rotX + dy * 0.006)); drag = [e.clientX, e.clientY]; return }
    hovered = pick(e)
  }
  function up(e: PointerEvent) { if (drag && moved < 6) selected = pick(e); drag = null }
  function wheel(e: WheelEvent) { e.preventDefault(); zoom = Math.max(0.5, Math.min(5, zoom * Math.exp(-e.deltaY * 0.0015))) }
  const short = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t)

  // Opening and closing morph with a view transition where the browser has one.
  function toggle(next: boolean) {
    const go = () => { open = next; if (!next) selected = -1 }
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
    if (doc.startViewTransition && !prefersReducedMotion.current) doc.startViewTransition(go)
    else go()
  }
  // The open explorer is moved to <body> so no ancestor can clip or re-anchor the fixed layer.
  function portal(node: HTMLElement) { document.body.appendChild(node); return { destroy() { node.remove() } } }
  function key(e: KeyboardEvent) { if (e.key === 'Escape' && open) toggle(false) }
  let toggleButton = $state<HTMLButtonElement>()
  $effect(() => {
    if (!open) return
    const before = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    toggleButton?.focus()
    return () => { document.documentElement.style.overflow = before }
  })

  const sel = $derived(data && selected >= 0 ? data.nodes[selected] : null)
  const related = $derived.by(() => {
    if (!data || selected < 0) return null
    const group = (k: Node['k']) => adj[selected].map(([j]) => j).filter((j) => data!.nodes[j].k === k)
    return { passage: group('passage'), page: group('page'), source: group('source'), catalogue: group('catalogue') }
  })
  const earliestFor = $derived.by(() => {
    if (!related || !data) return null
    const ys = related.catalogue.map((j) => data!.nodes[j].y).filter((y): y is number => !!y)
    return ys.length ? Math.min(...ys) : null
  })
</script>

<svelte:window onkeydown={key} />

{#if data && counts}
  <section class="km" aria-label="Peta wiki">
    <header class="km-head">
      <div>
        <h2>Peta wiki</h2>
        <p>{counts.passages} kalimat sumber · {counts.pages} halaman · {counts.sources} sumber{counts.earliest ? ` · tercatat paling awal ${counts.earliest}` : ''}</p>
      </div>
      <button class="km-toggle" bind:this={toggleButton} onclick={() => toggle(!open)} aria-expanded={open}>
        {#if open}<Minimize2 size={15} />Tutup{:else}<Maximize2 size={15} />Buka peta{/if}
      </button>
    </header>
      <p class="km-caption">Setiap garis mewakili satu halaman, kalimat atau sumber. Baris atas memakai tahun yang disebut di dalamnya, baris bawah memakai tahun sumbernya ditulis.</p>
      <button class="km-band" onclick={() => toggle(true)} aria-label="Buka peta wiki">
        <span class="km-row-label" style="top: 0">Tahun peristiwa</span>
        <span class="km-row-label" style="top: 50%">Tahun dicatat</span>
        <svg viewBox="0 0 {BAND_W} 128" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" x2={BAND_W} y1="70" y2="70" class="km-rule" />
          {#each bandTicks as t (t.i + '-' + t.y)}<rect x={t.x} y={t.y} width="1.6" height="11" fill={t.c} opacity="0.75" />{/each}
        </svg>
        <span class="km-ticks" aria-hidden="true">
          <span style="left: 0">sebelum 1800</span>
          {#each bandYears as y}<span style="left: {(bx(y) / BAND_W) * 100}%">{y}</span>{/each}
          <span style="right: 0">{undatedCount} tanpa tahun</span>
        </span>
      </button>
  </section>
  {#if open}
    <div class="km km-open" use:portal role="dialog" aria-modal="true" aria-label="Peta wiki" style="view-transition-name: knowledge-map">
    <header class="km-head">
      <div>
        <h2>Peta wiki</h2>
        <p>{counts.passages} kalimat sumber · {counts.pages} halaman · {counts.sources} sumber{counts.earliest ? ` · tercatat paling awal ${counts.earliest}` : ''}</p>
      </div>
      <button class="km-toggle" bind:this={toggleButton} onclick={() => toggle(!open)} aria-expanded={open}>
        {#if open}<Minimize2 size={15} />Tutup{:else}<Maximize2 size={15} />Buka peta{/if}
      </button>
    </header>
      <div class="km-tools">
        <div class="km-seg" role="group" aria-label="Susunan">
          <button aria-pressed={lens === 'makna'} onclick={() => (lens = 'makna')}>Kedekatan isi</button>
          <button aria-pressed={lens === 'waktu'} onclick={() => (lens = 'waktu')}>Waktu</button>
        </div>
        {#if lens === 'waktu'}<div class="km-seg" role="group" aria-label="Jam">
            <button aria-pressed={clock === 'dicatat'} onclick={() => (clock = 'dicatat')}>Dicatat</button>
            <button aria-pressed={clock === 'terjadi'} onclick={() => (clock = 'terjadi')}>Terjadi</button>
          </div>{/if}
        <div class="km-seg" role="group" aria-label="Warna">
          <button aria-pressed={colorBy === 'wilayah'} onclick={() => (colorBy = 'wilayah')}>Wilayah</button>
          <button aria-pressed={colorBy === 'ranah'} onclick={() => (colorBy = 'ranah')}>Ranah</button>
          <button aria-pressed={colorBy === 'bentuk'} onclick={() => (colorBy = 'bentuk')}>Bentuk budaya</button>
          <button aria-pressed={colorBy === 'suara'} onclick={() => (colorBy = 'suara')}>Sumber suara</button>
        </div>
        <label class="km-search"><Search size={14} /><input bind:value={query} placeholder="Cari di peta" aria-label="Cari di peta" /></label>
        {#if !prefersReducedMotion.current}<button class="km-icon" onclick={() => (spinning = !spinning)} aria-label={spinning ? 'Hentikan putaran' : 'Putar'}>{#if spinning}<Pause size={15} />{:else}<Play size={15} />{/if}</button>{/if}
      </div>
      <div class="km-body">
        <div class="km-stage">
          <canvas bind:this={canvas} onpointerdown={down} onpointermove={move} onpointerup={up} onpointerleave={() => (hovered = -1)} onwheel={wheel} aria-label="Peta: titik adalah halaman, kalimat sumber dan sumber"></canvas>
          <p class="km-note">{lens === 'makna' ? 'Titik yang berdekatan memiliki isi yang mirip. Kedekatan ini tidak menunjukkan kategori budaya.' : (clock === 'dicatat' ? 'Tinggi menurut tahun sumber ditulis.' : 'Tinggi menurut tahun yang disebut dalam teks.') + ` Bawah: sebelum ${START}. Atas: ${NOW} dan tanpa tahun.`}</p>
        </div>
        <ul class="km-legend">{#each legend as [label, color]}<li><span style="background:{color}"></span>{label}</li>{/each}</ul>
        <aside class="km-panel" aria-live="polite">
          {#if sel && related}
            <h3>{sel.k === 'passage' ? '“' + short(sel.t, 220) + '”' : sel.t}</h3>
            <p class="km-meta">{KIND[sel.k]}{REGION[sel.reg] ? ', ' + REGION[sel.reg][0] : ''}</p>
            {#if sel.a || sel.y}<p class="km-meta">{[sel.a, sel.y].filter(Boolean).join(' · ')}</p>{/if}
            {#if sel.d?.length}<p class="km-chips">{#each sel.d as d}<span>{data.domains[d]}</span>{/each}{#if sel.f}<span>{data.forms[sel.f]}</span>{/if}{#if sel.v}<span>{VOICE[sel.v]?.[0]}</span>{/if}</p>{/if}
            {#if sel.k === 'passage'}<p class="km-meta">Dari {sel.x}</p>{:else if sel.x && sel.k !== 'region'}<p>{short(sel.x, 360)}</p>{/if}
            {#if sel.href}<a class="km-open-link" href={sel.href}>Buka halaman <ArrowUpRight size={14} /></a>{:else if sel.u}<a class="km-open-link" href={sel.u} target="_blank" rel="noreferrer">Buka sumber <ArrowUpRight size={14} /></a>{/if}
            {#each [['Bersandar pada kalimat', related.passage], ['Halaman', related.page], ['Sumber yang dikutip', related.source], ['Sumber lain yang tercatat', related.catalogue]] as [title, list]}
              {#if (list as number[]).length}<h4 class="km-section">{title} ({(list as number[]).length})</h4>
                <ul class="km-trace">{#each (list as number[]).slice(0, 12) as j}<li><button onclick={() => (selected = j)}>{short(data.nodes[j].t, 110)}{#if data.nodes[j].y}<small>{data.nodes[j].y}</small>{/if}</button></li>{/each}</ul>{/if}
            {/each}
            {#if sel.k === 'page'}<p class="km-meta">Sumber tercatat paling awal: {earliestFor ?? 'belum ditemukan'}</p>{/if}
          {:else}
            <p>Pilih sebuah titik untuk melihat halaman atau sumber yang diwakilinya beserta kalimat dan sumber yang mendasarinya.</p>
            <p class="km-meta">Ranah dan bentuk budaya ditandai otomatis dan masih kasar. Sebagian besar kalimat saat ini berasal dari Wikipedia.</p>
          {/if}
        </aside>
      </div>
    </div>
  {/if}
{:else if failed}
  <!-- The map is optional; the wiki works without it. -->
{/if}

<style>
  .km {
    --km-quiet: color-mix(in srgb, var(--muted-foreground) 70%, transparent);
    display: grid;
    gap: 12px;
    padding: 14px 0 6px;
  }
  .km-open {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: var(--background);
    padding: max(14px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(14px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
    overflow: auto;
    border: 0;
    grid-template-rows: auto auto 1fr;
  }
  .km-open .km-stage, .km-open .km-panel { height: calc(100dvh - 190px); }
  .km-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  .km-head h2 { margin: 0; font-family: var(--font-editorial, inherit); font-weight: 400; font-size: 24px; }
  .km-head p { margin: 2px 0 0; color: var(--muted-foreground); font-size: 13px; font-variant-numeric: tabular-nums; }
  .km-toggle, .km-icon { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: 999px; padding: 6px 12px; background: var(--card); color: var(--foreground); font-size: 13px; cursor: pointer; }
  .km-icon { padding: 6px 8px; }
  .km-caption { margin: 0; max-width: 70ch; font-size: 13px; line-height: 1.5; color: var(--muted-foreground); }
  .km-band { all: unset; position: relative; display: block; cursor: pointer; width: 100%; border-radius: 10px; padding-bottom: 22px; }
  .km-row-label { position: absolute; left: 0; z-index: 1; font-size: 12px; color: var(--muted-foreground); background: color-mix(in srgb, var(--background) 82%, transparent); padding: 0 4px 0 0; }
  .km-ticks { position: absolute; left: 0; right: 0; bottom: 0; height: 18px; font-size: 12px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .km-ticks span { position: absolute; bottom: 0; white-space: nowrap; }
  .km-band:focus-visible, .km-toggle:focus-visible, .km-seg button:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; }
  .km-band svg { display: block; width: 100%; height: 112px; }
  .km-band:hover rect { opacity: 1; }
  .km-rule { stroke: var(--border); }
  .km-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .km-seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border); border-radius: 999px; padding: 2px; background: var(--card); }
  .km-seg button { all: unset; cursor: pointer; padding: 4px 11px; border-radius: 999px; font-size: 13px; color: var(--muted-foreground); }
  .km-seg button[aria-pressed='true'] { background: var(--foreground); color: var(--background); }
  .km-search { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: 999px; padding: 4px 10px; background: var(--card); color: var(--muted-foreground); }
  .km-search input { border: 0; background: transparent; color: var(--foreground); font: inherit; font-size: 13px; width: 150px; outline: none; }
  .km-body { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; }
  .km-stage { position: relative; min-width: 0; height: min(72vh, 640px); }
  .km-stage canvas { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; border-radius: 10px; }
  .km-note { position: absolute; left: 8px; bottom: 4px; margin: 0; font-size: 12.5px; color: var(--muted-foreground); pointer-events: none; }
  .km-legend { grid-column: 1; grid-row: 2; list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--muted-foreground); }
  .km-legend li { display: flex; align-items: center; gap: 6px; }
  .km-legend span { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .km-panel { grid-column: 2; grid-row: 1 / span 2; min-width: 0; overflow: auto; height: min(72vh, 640px); display: grid; align-content: start; gap: 8px; font-size: 14px; }
  .km-panel h3 { margin: 0; font-family: var(--font-editorial, inherit); font-weight: 400; font-size: 20px; line-height: 1.25; text-wrap: balance; }
  .km-panel p { margin: 0; }
  .km-section { margin: 10px 0 2px; font-size: 13px; font-weight: 600; }
  .km-meta { font-size: 12.5px; color: var(--muted-foreground); }
  .km-chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .km-chips span { font-size: 12.5px; border: 1px solid var(--border); border-radius: 999px; padding: 1px 8px; color: var(--muted-foreground); }
  .km-open-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13.5px; text-decoration: underline; text-underline-offset: 3px; }
  .km-trace { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .km-trace button { all: unset; cursor: pointer; display: block; padding: 5px 0; border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent); font-size: 13px; line-height: 1.4; }
  .km-trace li:last-child button { border-bottom: 0; }
  .km-trace button:hover { text-decoration: underline; text-underline-offset: 3px; }
  .km-trace button:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; }
  .km-trace small { display: block; color: var(--muted-foreground); font-size: 12.5px; }
  @media (max-width: 860px) {
    .km-body { grid-template-columns: 1fr; }
    .km-stage, .km-open .km-stage { height: 62dvh; }
    .km-open .km-panel { height: auto; }
    .km-panel { grid-column: 1; grid-row: auto; height: auto; }
    .km-legend { grid-row: auto; }
    .km-band svg { height: 96px; }
  }
</style>
