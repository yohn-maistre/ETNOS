<script lang="ts">
  // The observatory front of the wiki (docs/observatory/data-observatory-2026-11-20.md §11): the knowledge map with
  // its six lenses over the same points (KnowledgeExplorer.svelte), records to open in the full-screen viewer, the
  // catalogue of public datasets, what is still unknown, and the large groups in the network. Everything comes from
  // public files and public endpoints: the knowledge graph holds only checked commons sources, place points are
  // generalised BIG reference points, and dataset records are open-tier metadata.
  import { onMount, type Snippet } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import EntityPanel, { type KNode } from './EntityPanel.svelte'
  import KnowledgeExplorer from './KnowledgeExplorer.svelte'
  import DatasetRow from './DatasetRow.svelte'
  import { appearance } from './appearance.svelte'
  import { BANDS, bandOf, type World } from './world-scale.ts'
  import { listDatasets, type Dataset } from './datasets.ts'
  import { KIND_LABEL, loadViewerObjects, viewerHref, type ViewerObject } from './viewer-data.ts'

  type Node = KNode & { x: number; y: number; cluster: number; world?: World }
  type Edge = { source: string; target: string; predicate: string; logical: string }
  type Comention = { a: string; b: string; weight: number }
  type Cluster = { cluster: number; size: number; role: string; label: string; top: string[] }
  type Coverage = { region: string; title: string; entities: number; contexts: number; contextsWithoutPage: { slug: string; title: string }[] }
  type Graph = { counts: { entities: number; statements: number; excerpts: number; clusters: number }; nodes: Node[]; statements: Edge[]; comentions: Comention[]; clusters: Cluster[]; questions: { a: string; b: string; question: string }[]; gaps: { coverage: Coverage[]; languagesWithoutEntity: number; languagesTotal: number } }
  let { region = '', reading, more }: { region?: string; reading?: Snippet; more?: Snippet } = $props()

  let graph = $state<Graph | null>(null),
    failed = $state(false),
    selected = $state(''),
    datasets = $state<Dataset[] | null>(null),
    datasetsFailed = $state(false),
    objects = $state<ViewerObject[]>([])

  const byId = $derived(new Map((graph?.nodes ?? []).map((n) => [n.id, n])))
  const dark = $derived(appearance.theme === 'dark')
  const colorOf = $derived((n: { id: string }) => { const b = bandOf(byId.get(n.id)?.world?.level?.code); return b ? (dark ? b.dark : b.light) : '#8a8a8a' })
  const counts = $derived(new Map(BANDS.map((b) => [b.key, (graph?.nodes ?? []).filter((n) => n.world?.level?.band === b.key).length])))
  const sections = $derived((graph?.clusters ?? []).filter((c) => c.size >= 5).sort((a, b) => b.size - a.size))
  const coverage = $derived((graph?.gaps.coverage ?? []).filter((c) => c.contextsWithoutPage.length).sort((a, b) => b.contextsWithoutPage.length - a.contextsWithoutPage.length))
  const regionTitles = $derived(new Map((graph?.gaps.coverage ?? []).map((c) => [c.region, c.title])))
  const href = (n: Node | undefined) => (n?.context ? '/contexts/' + n.context : '/wiki?q=' + encodeURIComponent(n?.title ?? ''))
  const ROLE: Record<string, string> = { inti: 'Banyak terhubung', 'dasar-tipis': 'Sumber masih sedikit', khusus: 'Kelompok khusus', 'baru-atau-memudar': 'Baru muncul' }
  const pick = (n: Node) => (e: MouseEvent) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); selected = n.id }
  onMount(() => {
    const abort = new AbortController()
    fetch('/observatory/knowledge/graph.json', { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((g: Graph) => (graph = g))
      .catch(() => { if (!abort.signal.aborted) failed = true })
    listDatasets({}, abort.signal)
      .then((rows) => (datasets = rows))
      .catch(() => { if (!abort.signal.aborted) datasetsFailed = true })
    void loadViewerObjects().then((o) => (objects = o))
    return () => abort.abort()
  })

  // Datasets for the front: one of each kind first, so the list shows the range of what the catalogue holds.
  const featuredData = $derived.by(() => {
    if (!datasets) return []
    const seen = new Set<string>(), first: Dataset[] = [], rest: Dataset[] = []
    for (const d of datasets) (seen.has(d.kind) ? rest : (seen.add(d.kind), first)).push(d)
    return [...first, ...rest].slice(0, 4)
  })
  const SHOWCASE = ['model', 'species', 'landform', 'images', 'audio', 'dataset']
  const showcase = $derived([...objects].sort((x, y) => SHOWCASE.indexOf(x.kind) - SHOWCASE.indexOf(y.kind)))
</script>

<section class="obs-section obs-map" aria-labelledby="obs-map-title">
  {#if graph}
    <KnowledgeExplorer {graph} {region} bind:selected />
    <details class="obs-all">
      <summary>Daftar semua {graph.nodes.length} hal</summary>
      {#each BANDS.filter((b) => counts.get(b.key)) as b (b.key)}<div class="obs-all-group">
          <h3><span class="dot" style:background={dark ? b.dark : b.light}></span>{b.label}</h3>
          <ul>{#each graph.nodes.filter((n) => n.world?.level?.band === b.key).sort((x, y) => x.title.localeCompare(y.title, 'id')) as n (n.id)}<li><a href={href(n)} onclick={pick(n)}>{n.title}</a></li>{/each}</ul>
        </div>{/each}
    </details>
  {:else if failed}<h2 id="obs-map-title">Peta pengetahuan</h2><p class="obs-note">Peta pengetahuan belum dapat dimuat. Coba muat ulang halaman ini.</p>
  {:else}<h2 id="obs-map-title">Peta pengetahuan</h2><div class="obs-skeleton map" aria-hidden="true"></div><p class="sr-only" role="status">Memuat peta pengetahuan</p>{/if}
</section>

{#if showcase.length}<section class="obs-section" aria-labelledby="obs-view-title">
    <h2 id="obs-view-title">Benda, spesies dan bentang alam</h2>
    <p class="obs-lede">Buka satu catatan di layar penuh untuk memutar benda 3D, melihat foto dan sebaran spesies, atau menjelajahi relief gunung dan danau. Setiap catatan menyebut sumber dan lisensinya.</p>
    <div class="obs-rows">
      {#each showcase as o (o.id)}<a class="obs-row obs-view-row" href={viewerHref(o.id)}>
          <span class="obs-row-main"><span class="obs-row-title">{o.title}</span>{#if o.subtitle}<span class="obs-row-text">{o.subtitle}</span>{/if}<span class="obs-row-meta">{KIND_LABEL[o.kind]} · {o.sources[0]?.licence?.name ?? 'lisensi tercatat di sumber'}</span></span>
          {#if o.thumb}<img src={o.thumb} alt="" loading="lazy" width="76" height="76" />{/if}
        </a>{/each}
    </div>
  </section>{/if}

{@render reading?.()}

<section class="obs-section" aria-labelledby="obs-data-title">
  <div class="obs-head">
    <h2 id="obs-data-title">Katalog data</h2>
    {#if datasets?.length}<a class="obs-more" href="/wiki/data">Semua {datasets.length} dataset</a>{/if}
  </div>
  <p class="obs-lede">Dataset publik tentang bahasa, masyarakat dan lahan di Tanah Papua, lengkap dengan penerbit, lisensi dan cara mengutipnya.</p>
  {#if datasets === null && !datasetsFailed}<div class="obs-skeleton" aria-hidden="true"></div>
  {:else if datasetsFailed}<p class="obs-note">Katalog data belum dapat dimuat saat ini. <a href="/wiki/data">Buka katalog</a></p>
  {:else if featuredData.length}<div class="obs-rows">{#each featuredData as d (d.id)}<DatasetRow dataset={d} />{/each}</div>
    <p class="obs-foot">ETNOS hanya menyimpan keterangan dan tautannya, sedangkan berkasnya tetap di situs penerbit. Semua catatan ini masih usulan dan belum ditinjau pengelola.</p>
  {:else}<p class="obs-note">Belum ada dataset di katalog.</p>{/if}
</section>

{#if graph}
  <section class="obs-section" aria-labelledby="obs-unknown-title">
    <h2 id="obs-unknown-title">Yang belum diketahui</h2>
    <div class="obs-cols">
      <div>
        <h3>Tempat yang belum punya halaman</h3>
        <div class="obs-rows">
          {#each coverage as c (c.region)}<a class="obs-row" href={'/contexts/' + c.region}><span class="obs-row-main"><span class="obs-row-title">{c.title}</span><span class="obs-row-meta">{c.contextsWithoutPage.length} dari {c.contexts} tempat belum punya halaman</span></span><ArrowUpRight size={16} aria-hidden="true" /></a>{/each}
          <a class="obs-row" href="/explore#bahasa"><span class="obs-row-main"><span class="obs-row-title">Bahasa</span><span class="obs-row-meta">{graph.gaps.languagesWithoutEntity} dari {graph.gaps.languagesTotal} bahasa di katalog belum masuk peta</span></span><ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </div>
      <div>
        <h3>Pertanyaan yang bisa dijawab warga</h3>
        <div class="obs-rows">
          {#each graph.questions.slice(0, 5) as q (q.a + q.b)}<a class="obs-row" href={href(byId.get(q.a))}><span class="obs-row-main"><span class="obs-row-title">{q.question}</span><span class="obs-row-meta">Saran dari peta, belum tentu ada hubungannya</span></span></a>{/each}
        </div>
      </div>
    </div>
  </section>

{/if}

{@render more?.()}

{#if graph}
  {#if sections.length}<section class="obs-section" aria-labelledby="obs-groups-title">
      <h2 id="obs-groups-title">Kelompok besar dalam peta</h2>
      <p class="obs-lede">Hal dalam satu kelompok sering disebut bersama. Nama kelompok diambil dari dua hal yang paling banyak terhubung.</p>
      <div class="obs-groups">
        {#each sections as c (c.cluster)}<article>
            <h3>{c.label}</h3>
            <p class="obs-row-meta">{c.size} hal · {ROLE[c.role] ?? c.role}</p>
            <ul>
              {#each c.top.slice(0, 6) as id (id)}{@const n = byId.get(id)}{#if n}<li><a href={href(n)} onclick={pick(n)}><span class="dot" style:background={colorOf(n)}></span>{n.title}</a></li>{/if}{/each}
            </ul>
          </article>{/each}
      </div>
    </section>{/if}
  <EntityPanel bind:id={selected} nodes={byId} statements={graph.statements} comentions={graph.comentions ?? []} regionTitle={(r) => regionTitles.get(r) ?? r} {objects} />
{/if}

<style>
  .obs-view-row img { flex: none; width: 76px; height: 76px; border-radius: 14px; object-fit: cover; background: var(--secondary); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  .obs-skeleton.map { height: 440px; }
  .obs-all { border-top: 1px solid var(--border); padding-top: 4px; }
  .obs-all summary { display: flex; align-items: center; min-height: 44px; font-size: 14.5px; font-weight: 600; cursor: pointer; }
  .obs-all-group { display: grid; gap: 6px; padding: 12px 0; }
  .obs-all-group h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; }
  .obs-all ul { columns: 2 180px; column-gap: 20px; margin: 0; padding: 0; list-style: none; }
  .obs-all li { break-inside: avoid; }
  .obs-all a { display: inline-flex; min-height: 32px; align-items: center; font-size: 14.5px; color: inherit; text-decoration: none; }
  .obs-all a:hover { text-decoration: underline; text-underline-offset: 3px; }
  .obs-groups { display: grid; gap: 28px 36px; }
  @media (min-width: 720px) { .obs-groups { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .obs-groups article { display: grid; gap: 4px; align-content: start; min-width: 0; }
  .obs-groups ul { display: grid; margin: 6px 0 0; padding: 0; list-style: none; }
  .obs-groups li a { display: flex; align-items: center; gap: 10px; min-height: 40px; border-top: 1px solid var(--border); color: inherit; text-decoration: none; font-size: 15px; font-weight: 550; }
  .obs-groups li a:hover { text-decoration: underline; text-underline-offset: 3px; }
</style>
