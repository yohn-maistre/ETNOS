<script lang="ts">
  // The front of the wiki, built from the knowledge model's public graph (observatory/knowledge/graph.json):
  // the map of how places, peoples and languages connect, what is still unknown, and the large groups the
  // connections fall into. The graph holds only checked public sources, so nothing private reaches this page.
  import { onMount } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import EntityPanel from './EntityPanel.svelte'

  type Node = { id: string; class: string; title: string; context?: string; regions: string[]; x: number; y: number; cluster: number; degree: number; witnesses: number; gaps: string[] }
  type Edge = { source: string; target: string; predicate: string; logical: string }
  type Comention = { a: string; b: string; weight: number }
  type Cluster = { cluster: number; size: number; role: string; label: string; top: string[]; byClass: Record<string, number> }
  type Coverage = { region: string; title: string; entities: number; contexts: number; contextsWithoutPage: { slug: string; title: string }[] }
  type Graph = { counts: { entities: number; statements: number; excerpts: number; clusters: number }; nodes: Node[]; statements: Edge[]; comentions: Comention[]; clusters: Cluster[]; questions: { a: string; b: string; question: string }[]; gaps: { coverage: Coverage[]; languagesWithoutEntity: number; languagesTotal: number; singleSourceStatements: number } }
  let { region = '' }: { region?: string } = $props()

  let graph = $state<Graph | null>(null),
    lens = $state<'jaringan' | 'celah'>('jaringan'),
    hover = $state<Node | null>(null),
    narrow = $state(false),
    selected = $state('')
  const byId = $derived(new Map((graph?.nodes ?? []).map((n) => [n.id, n])))
  const CLASS: Record<string, string> = { tempat: 'Tempat', bahasa: 'Bahasa', kelompok: 'Masyarakat' }
  const href = (n: Node | undefined) => (n?.context ? '/contexts/' + n.context : '/wiki?q=' + encodeURIComponent(n?.title ?? ''))
  // Layout coordinates run from -1 to 1 on both axes. On a phone the map turns upright, so labels stay readable.
  const W = $derived(narrow ? 560 : 1000), H = $derived(narrow ? 820 : 560), PAD = 30
  const FONT = 19
  // The layout clamps outliers to the edge, so each axis mixes the value with its rank. Order is kept and the edges stop piling up.
  const spread = $derived.by(() => {
    const nodes = graph?.nodes ?? [], out = new Map<string, { x: number; y: number }>()
    const rank = (key: 'x' | 'y', other: 'x' | 'y') => {
      const sorted = [...nodes].sort((a, b) => a[key] - b[key] || a[other] - b[other]), m = new Map<string, number>()
      sorted.forEach((n, i) => m.set(n.id, 0.35 * ((n[key] + 1) / 2) + 0.65 * (i / Math.max(1, sorted.length - 1))))
      return m
    }
    const rx = rank('x', 'y'), ry = rank('y', 'x')
    for (const n of nodes) out.set(n.id, { x: rx.get(n.id)!, y: ry.get(n.id)! })
    return out
  })
  const px = (n: Node) => PAD + (narrow ? spread.get(n.id)!.y : spread.get(n.id)!.x) * (W - PAD * 2)
  const py = (n: Node) => PAD + (narrow ? spread.get(n.id)!.x : spread.get(n.id)!.y) * (H - PAD * 2)
  const r = (n: Node) => (narrow ? 4.5 : 3) + Math.min(9, Math.sqrt(n.witnesses) * 1.6)
  // Label the best-connected entries first and skip any label that would overlap one already placed.
  const labelled = $derived.by(() => {
    const placed: { x: number; y: number; w: number; h: number }[] = [], out = new Set<string>()
    for (const n of [...(graph?.nodes ?? [])].sort((a, b) => b.degree - a.degree)) {
      if (out.size >= (narrow ? 8 : 12) || n.degree < 2) break
      const box = { x: px(n) + r(n) + 4, y: py(n) - FONT, w: n.title.length * FONT * 0.56, h: FONT * 1.4 }
      if (box.x + box.w > W) box.x = px(n) - r(n) - 4 - box.w
      if (placed.some((b) => box.x < b.x + b.w && b.x < box.x + box.w && box.y < b.y + b.h && b.y < box.y + box.h)) continue
      placed.push(box); out.add(n.id)
    }
    return out
  })
  const leftOf = (n: Node) => px(n) + r(n) + 4 + n.title.length * FONT * 0.56 > W
  const missingPage = (n: Node) => n.gaps.includes('belum-ada-halaman')
  const sections = $derived((graph?.clusters ?? []).filter((c) => c.size >= 5).sort((a, b) => b.size - a.size))
  const coverage = $derived((graph?.gaps.coverage ?? []).filter((c) => c.contextsWithoutPage.length).sort((a, b) => b.contextsWithoutPage.length - a.contextsWithoutPage.length))
  const regionTitles = $derived(new Map((graph?.gaps.coverage ?? []).map((c) => [c.region, c.title])))
  // A plain click opens the entry's panel; a modified click still follows the link.
  const pick = (n: Node) => (e: MouseEvent) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); selected = n.id }
  const ROLE: Record<string, string> = { inti: 'Banyak terhubung', 'dasar-tipis': 'Sumber masih sedikit', khusus: 'Kelompok khusus', 'baru-atau-memudar': 'Baru muncul' }

  onMount(async () => {
    const mq = matchMedia('(max-width: 600px)'), sync = () => (narrow = mq.matches)
    sync(); mq.addEventListener('change', sync)
    try { const res = await fetch('/observatory/knowledge/graph.json'); if (res.ok) graph = await res.json() } catch { graph = null }
  })
</script>

{#if graph}
  <section class="wf-map" aria-labelledby="wf-map-title">
    <div class="wf-head">
      <h2 id="wf-map-title">Peta pengetahuan</h2>
      <div class="wf-lens" role="radiogroup" aria-label="Cara melihat peta">
        <button type="button" role="radio" aria-checked={lens === 'jaringan'} onclick={() => (lens = 'jaringan')}>Hubungan</button>
        <button type="button" role="radio" aria-checked={lens === 'celah'} onclick={() => (lens = 'celah')}>Yang belum diketahui</button>
      </div>
    </div>
    <p class="wf-dek">{graph.counts.entities} tempat, masyarakat dan bahasa, dihubungkan oleh {graph.counts.statements} pernyataan dari {graph.counts.excerpts} kutipan sumber publik. {lens === 'celah' ? 'Titik yang ditandai belum punya halaman wiki.' : 'Entri yang sering disebut bersama berada berdekatan. Garis tebal adalah pernyataan, garis tipis adalah sebutan bersama.'}</p>
    <div class="wf-canvas">
      <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={'Peta hubungan ' + graph.counts.entities + ' entri'}>
        <g class="wf-co">
          {#each graph.comentions ?? [] as e}{@const a = byId.get(e.a)}{@const b = byId.get(e.b)}{#if a && b}<line x1={px(a)} y1={py(a)} x2={px(b)} y2={py(b)} class:dim={!!region && !(a.regions.includes(region) || b.regions.includes(region))} />{/if}{/each}
        </g>
        <g class="wf-edges">
          {#each graph.statements as e}{@const a = byId.get(e.source)}{@const b = byId.get(e.target)}{#if a && b}<line x1={px(a)} y1={py(a)} x2={px(b)} y2={py(b)} class:dim={!!region && !(a.regions.includes(region) || b.regions.includes(region))} class:disputed={e.logical === 'disputed'} />{/if}{/each}
        </g>
        <g class="wf-nodes">
          {#each graph.nodes as n (n.id)}<a href={href(n)} aria-label={n.title} onclick={pick(n)} onpointerenter={() => (hover = n)} onpointerleave={() => (hover = null)} onfocus={() => (hover = n)} onblur={() => (hover = null)}>
              <circle cx={px(n)} cy={py(n)} r={r(n)} class={'c-' + n.class} class:gap={lens === 'celah' && missingPage(n)} class:quiet={lens === 'celah' && !missingPage(n)} />
            </a>{/each}
        </g>
        <g class="wf-labels" aria-hidden="true">
          {#each graph.nodes as n (n.id)}{#if labelled.has(n.id)}<text x={leftOf(n) ? px(n) - r(n) - 4 : px(n) + r(n) + 4} y={py(n) + FONT * 0.32} text-anchor={leftOf(n) ? 'end' : 'start'} font-size={FONT}>{n.title}</text>{/if}{/each}
        </g>
      </svg>
      {#if hover}<p class="wf-tip" aria-live="polite"><strong>{hover.title}</strong> · {CLASS[hover.class] ?? hover.class} · {hover.witnesses} sumber{missingPage(hover) ? ' · belum ada halaman' : ''}</p>{/if}
    </div>
    <ul class="wf-legend" aria-label="Keterangan warna">
      {#each Object.entries(CLASS) as [k, v]}<li><span class={'dot c-' + k}></span>{v}</li>{/each}
    </ul>
  </section>

  <section class="wf-unknown" aria-labelledby="wf-unknown-title">
    <h2 id="wf-unknown-title">Yang belum diketahui</h2>
    <div class="wf-cols">
      <div>
        <h3>Tempat yang belum punya halaman</h3>
        <ul class="wf-list">
          {#each coverage as c}<li><a href={'/contexts/' + c.region}><span class="wf-item">{c.title}</span><span class="wf-meta">{c.contextsWithoutPage.length} dari {c.contexts} tempat belum punya halaman</span></a></li>{/each}
          <li><span class="wf-item">Bahasa</span><span class="wf-meta">{graph.gaps.languagesWithoutEntity} dari {graph.gaps.languagesTotal} bahasa di katalog belum masuk peta</span></li>
        </ul>
      </div>
      <div>
        <h3>Pertanyaan yang bisa dijawab warga</h3>
        <ul class="wf-list">
          {#each graph.questions.slice(0, 5) as q}<li><a href={href(byId.get(q.a))}><span class="wf-item">{q.question}</span><span class="wf-meta">Saran dari peta, belum tentu ada hubungannya</span></a></li>{/each}
        </ul>
      </div>
    </div>
  </section>

  {#if sections.length}<section class="wf-groups" aria-labelledby="wf-groups-title">
      <h2 id="wf-groups-title">Kelompok besar dalam peta</h2>
      <div class="wf-grid">
        {#each sections as c}<article>
            <h3>{c.label}</h3>
            <p class="wf-meta">{c.size} entri · {ROLE[c.role] ?? c.role}</p>
            <ul class="wf-list compact">
              {#each c.top.slice(0, 6) as id}{@const n = byId.get(id)}{#if n}<li><a href={href(n)} onclick={pick(n)}><span class="wf-item">{n.title}</span><ArrowUpRight size={14} aria-hidden="true" /></a></li>{/if}{/each}
            </ul>
          </article>{/each}
      </div>
    </section>{/if}
  <EntityPanel bind:id={selected} nodes={byId} statements={graph.statements} comentions={graph.comentions ?? []} regionTitle={(r) => regionTitles.get(r) ?? r} />
{/if}

<style>
  .wf-map, .wf-unknown, .wf-groups { display: grid; gap: 12px; padding: 28px 24px 24px; border-top: 1px solid var(--border); }
  @media (max-width: 640px) { .wf-map, .wf-unknown, .wf-groups { padding: 22px 16px 20px; } }
  h2 { margin: 0; font-size: clamp(22px, 3vw, 28px); font-weight: 700; letter-spacing: -0.015em; line-height: 1.15; }
  h3 { margin: 0; font-size: 16px; font-weight: 650; line-height: 1.3; }
  .wf-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 10px; }
  .wf-lens { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--border); border-radius: 999px; }
  .wf-lens button { min-height: 34px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; color: var(--muted-foreground); font: inherit; font-size: 13.5px; font-weight: 550; cursor: pointer; }
  .wf-lens button[aria-checked='true'] { background: var(--foreground); color: var(--background); }
  .wf-lens button:focus-visible, .wf-list a:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .wf-dek { margin: 0; max-width: 68ch; font-size: 15px; line-height: 1.55; color: var(--muted-foreground); }
  .wf-canvas { position: relative; border-radius: 14px; background: color-mix(in oklab, var(--foreground) 3%, var(--background)); }
  svg { display: block; width: 100%; height: auto; }
  .wf-co line { stroke: color-mix(in oklab, var(--foreground) 9%, transparent); stroke-width: 0.6; }
  .wf-co line.dim { opacity: 0.3; }
  .wf-edges line { stroke: color-mix(in oklab, var(--foreground) 38%, transparent); stroke-width: 1.2; }
  .wf-edges line.disputed { stroke-dasharray: 4 3; }
  .wf-edges line.dim { opacity: 0.25; }
  circle { stroke: var(--background); stroke-width: 1.2; transition: opacity 0.2s, r 0.2s; cursor: pointer; }
  .c-tempat { fill: #4f7a5e; background: #4f7a5e; }
  .c-bahasa { fill: #a2643a; background: #a2643a; }
  .c-kelompok { fill: #5b6ea8; background: #5b6ea8; }
  circle.quiet { opacity: 0.22; }
  circle.gap { stroke: #e0a83a; stroke-width: 3; }
  a:hover circle, a:focus circle { stroke: var(--foreground); stroke-width: 2; }
  text { font-weight: 550; fill: var(--foreground); paint-order: stroke; stroke: var(--background); stroke-width: 3px; pointer-events: none; }
  .wf-tip { position: absolute; left: 12px; bottom: 10px; margin: 0; padding: 6px 10px; border-radius: 8px; background: var(--background); border: 1px solid var(--border); font-size: 13px; }
  .wf-legend { display: flex; flex-wrap: wrap; gap: 14px; margin: 0; padding: 0; list-style: none; font-size: 13px; color: var(--muted-foreground); }
  .wf-legend li { display: inline-flex; align-items: center; gap: 6px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; }
  .wf-cols { display: grid; gap: 24px; }
  @media (min-width: 760px) { .wf-cols { grid-template-columns: 1fr 1fr; gap: 40px; } }
  .wf-cols h3 { padding-bottom: 8px; }
  .wf-list { display: grid; margin: 0; padding: 0; list-style: none; }
  .wf-list li { border-top: 1px solid var(--border); }
  .wf-list li > a, .wf-list li > span:first-child, .wf-list li:has(> .wf-item) { display: grid; gap: 2px; padding: 10px 0; color: inherit; text-decoration: none; }
  .wf-list.compact li > a { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; }
  .wf-list a:hover .wf-item { text-decoration: underline; text-underline-offset: 3px; }
  .wf-item { font-size: 15px; font-weight: 550; line-height: 1.4; }
  .wf-meta { margin: 0; font-size: 13px; color: var(--muted-foreground); line-height: 1.4; }
  .wf-grid { display: grid; gap: 28px 40px; }
  @media (min-width: 640px) { .wf-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1100px) { .wf-grid { grid-template-columns: repeat(3, 1fr); } }
  .wf-grid article { display: grid; gap: 4px; align-content: start; }
  @media (prefers-reduced-motion: reduce) { circle { transition: none; } }
</style>
