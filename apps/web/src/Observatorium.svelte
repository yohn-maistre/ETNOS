<script lang="ts" module>
  export type Lens = 'skala' | 'hubungan' | 'peta'
  /**
   * The lens the front opens with. My call (20 November 2026): size and pace, as the design of record proposes
   * (world model doc §9), because it explains itself and shows at a glance which kinds of things are not recorded
   * yet. To open on the network map instead, set this to 'hubungan'. A link can still pick a lens with ?lens=.
   */
  export const DEFAULT_LENS: Lens = 'skala'
</script>

<script lang="ts">
  // The observatory front of the wiki (docs/observatory/data-observatory-2026-11-20.md §11): the knowledge map in
  // three lenses over the same things (size and pace, the network of statements, and the map of places), the
  // catalogue of public datasets, what is still unknown, and the large groups in the network. Everything comes from
  // public files and public endpoints: the knowledge graph holds only checked commons sources, place points are
  // generalised BIG reference points, and dataset records are open-tier metadata.
  import { onMount, type Snippet } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import EntityPanel, { type KNode } from './EntityPanel.svelte'
  import KnowledgeGraph3D from './KnowledgeGraph3D.svelte'
  import ScaleConstellation from './ScaleConstellation.svelte'
  import DatasetRow from './DatasetRow.svelte'
  import { appearance } from './appearance.svelte'
  import { BANDS, bandOf, type World } from './world-scale.ts'
  import { listDatasets, type Dataset } from './datasets.ts'
  import { loadAtlasLangs } from './explore-data'
  import { unproject } from './terrain.ts'

  type Node = KNode & { x: number; y: number; cluster: number; world?: World }
  type Edge = { source: string; target: string; predicate: string; logical: string }
  type Comention = { a: string; b: string; weight: number }
  type Cluster = { cluster: number; size: number; role: string; label: string; top: string[] }
  type Coverage = { region: string; title: string; entities: number; contexts: number; contextsWithoutPage: { slug: string; title: string }[] }
  type Graph = { counts: { entities: number; statements: number; excerpts: number; clusters: number }; nodes: Node[]; statements: Edge[]; comentions: Comention[]; clusters: Cluster[]; questions: { a: string; b: string; question: string }[]; gaps: { coverage: Coverage[]; languagesWithoutEntity: number; languagesTotal: number } }
  type PlacePoint = { slug: string; title: string; facet: string; latitude: number; longitude: number }
  let { region = '', reading, more }: { region?: string; reading?: Snippet; more?: Snippet } = $props()

  const LENSES: [Lens, string][] = [['skala', 'Ukuran dan waktu'], ['hubungan', 'Hubungan'], ['peta', 'Peta']]
  let graph = $state<Graph | null>(null),
    failed = $state(false),
    lens = $state<Lens>(DEFAULT_LENS),
    fit = $state<'full' | 'data'>('full'),
    gaps = $state(false),
    hidden = $state(new Set<string>()),
    selected = $state(''),
    datasets = $state<Dataset[] | null>(null),
    datasetsFailed = $state(false),
    places = $state<Record<string, PlacePoint> | null>(null),
    langs = $state<Map<string, [number, number]> | null>(null)

  const byId = $derived(new Map((graph?.nodes ?? []).map((n) => [n.id, n])))
  const dark = $derived(appearance.theme === 'dark')
  const colorOf = $derived((n: { id: string }) => { const b = bandOf(byId.get(n.id)?.world?.level?.code); return b ? (dark ? b.dark : b.light) : '#8a8a8a' })
  const counts = $derived(new Map(BANDS.map((b) => [b.key, (graph?.nodes ?? []).filter((n) => n.world?.level?.band === b.key).length])))
  const empty = $derived(BANDS.filter((b) => !counts.get(b.key)))
  const sections = $derived((graph?.clusters ?? []).filter((c) => c.size >= 5).sort((a, b) => b.size - a.size))
  const coverage = $derived((graph?.gaps.coverage ?? []).filter((c) => c.contextsWithoutPage.length).sort((a, b) => b.contextsWithoutPage.length - a.contextsWithoutPage.length))
  const regionTitles = $derived(new Map((graph?.gaps.coverage ?? []).map((c) => [c.region, c.title])))
  const href = (n: Node | undefined) => (n?.context ? '/contexts/' + n.context : '/wiki?q=' + encodeURIComponent(n?.title ?? ''))
  const ROLE: Record<string, string> = { inti: 'Banyak terhubung', 'dasar-tipis': 'Sumber masih sedikit', khusus: 'Kelompok khusus', 'baru-atau-memudar': 'Baru muncul' }
  const pick = (n: Node) => (e: MouseEvent) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); selected = n.id }
  // Things hidden by the legend drop out of every lens.
  const shown = $derived((graph?.nodes ?? []).filter((n) => !hidden.has(n.world?.level?.band ?? '')))

  // Points for the map lens: kabupaten and kota at their BIG reference point, languages at their Glottolog point.
  // Provinces and customary regions are areas; the map draws them as outlines, not as points.
  const mapPlaces = $derived.by(() => {
    if (!places || !langs) return []
    const out: { name: string; latitude: number; longitude: number; href: string; color: string }[] = []
    for (const n of shown) {
      if (!n.context) continue
      const p = places[n.context]
      if (n.class === 'tempat' && p && (p.facet === 'regency' || p.facet === 'city')) out.push({ name: n.title, latitude: p.latitude, longitude: p.longitude, href: '/contexts/' + n.context, color: colorOf(n) })
      const at = n.class === 'bahasa' ? langs.get(n.context) : undefined
      if (at) { const [lat, lon] = unproject(at[0], at[1]); out.push({ name: n.title, latitude: lat, longitude: lon, href: '/contexts/' + n.context, color: colorOf(n) }) }
    }
    return out
  })
  const PAPUA: [[number, number], [number, number]] = [[129.5, -9.3], [141.2, 0.2]]

  function choose(next: Lens) {
    lens = next
    try {
      const url = new URL(location.href)
      if (next === DEFAULT_LENS) url.searchParams.delete('lens')
      else url.searchParams.set('lens', next)
      history.replaceState(history.state, '', url)
    } catch { /* The address is a convenience. */ }
  }
  function toggle(key: string) {
    const next = new Set(hidden)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    hidden = next
  }
  function lensKeys(e: KeyboardEvent) {
    const i = LENSES.findIndex(([l]) => l === lens), step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = LENSES[(i + step + LENSES.length) % LENSES.length][0]
    choose(next)
    ;(e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(`[data-lens="${next}"]`)?.focus()
  }

  onMount(() => {
    const asked = new URLSearchParams(location.search).get('lens')
    if (asked === 'skala' || asked === 'hubungan' || asked === 'peta') lens = asked
    // On a phone the whole scale squeezes every point into one corner, so the chart opens on the part that holds things.
    if (matchMedia('(max-width: 559px)').matches) fit = 'data'
    const abort = new AbortController()
    fetch('/observatory/knowledge/graph.json', { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((g: Graph) => (graph = g))
      .catch(() => { if (!abort.signal.aborted) failed = true })
    listDatasets({}, abort.signal)
      .then((rows) => (datasets = rows))
      .catch(() => { if (!abort.signal.aborted) datasetsFailed = true })
    return () => abort.abort()
  })
  // The map lens needs the place points and the language points; both load only when it is first opened.
  $effect(() => {
    if (lens !== 'peta' || places) return
    void fetch('/observatory/places.json').then((r) => (r.ok ? r.json() : null)).then((d) => (places = d?.places ?? {})).catch(() => (places = {}))
    void loadAtlasLangs().then((l) => (langs = new Map(l.map((x) => [x[0], [x[1], x[2]] as [number, number]])))).catch(() => (langs = new Map()))
  })

  // Datasets for the front: one of each kind first, so the list shows the range of what the catalogue holds.
  const featuredData = $derived.by(() => {
    if (!datasets) return []
    const seen = new Set<string>(), first: Dataset[] = [], rest: Dataset[] = []
    for (const d of datasets) (seen.has(d.kind) ? rest : (seen.add(d.kind), first)).push(d)
    return [...first, ...rest].slice(0, 4)
  })
  const LEDE: Record<Lens, string> = {
    skala: 'Setiap titik adalah satu hal yang tercatat. Makin ke kanan makin besar ukurannya, makin ke atas makin lama hal itu berubah, dan warnanya menunjukkan tingkatnya.',
    hubungan: 'Hal yang sering disebut bersama dalam sumber berada berdekatan. Garis tebal adalah pernyataan yang sudah diperiksa, dan garis tipis adalah sebutan bersama.',
    peta: 'Titik kabupaten dan kota diambil dari garis batas BIG, dan titik bahasa dari titik acuan Glottolog. Titik itu hanya penanda wilayah dan tidak menunjuk lokasi tertentu.',
  }
</script>

<section class="obs-section obs-map" aria-labelledby="obs-map-title">
  <div class="obs-head">
    <h2 id="obs-map-title">Peta pengetahuan</h2>
    <div class="obs-pills" role="radiogroup" aria-label="Cara melihat peta" tabindex="-1" onkeydown={lensKeys}>
      {#each LENSES as [value, label] (value)}<button type="button" role="radio" data-lens={value} aria-checked={lens === value} tabindex={lens === value ? 0 : -1} onclick={() => choose(value)}>{label}</button>{/each}
    </div>
  </div>
  <p class="obs-lede">{LEDE[lens]}{#if graph && lens !== 'peta'}{' '}Ketuk titik untuk membuka penjelasannya.{/if}</p>
  {#if graph}
    {#if lens !== 'peta'}<div class="obs-tools">
        {#if lens === 'skala'}<div class="obs-pills" role="radiogroup" aria-label="Rentang sumbu">
            <button type="button" role="radio" aria-checked={fit === 'full'} onclick={() => (fit = 'full')}>Seluruh skala</button>
            <button type="button" role="radio" aria-checked={fit === 'data'} onclick={() => (fit = 'data')}>Bagian yang terisi</button>
          </div>{/if}
        <button type="button" class="obs-toggle" aria-pressed={gaps} onclick={() => (gaps = !gaps)}><span class="ring" aria-hidden="true"></span>Tandai yang belum punya halaman</button>
      </div>{/if}
    <div class="obs-stage">
      {#if lens === 'skala'}<ScaleConstellation nodes={graph.nodes} statements={graph.statements} bind:selected {hidden} {gaps} {region} {fit} regionOf={(id) => byId.get(id)?.regions ?? []} label={'Grafik ukuran dan lama berubah untuk ' + graph.counts.entities + ' hal. Daftar semua hal ada di bawah grafik.'} />
      {:else if lens === 'hubungan'}<KnowledgeGraph3D nodes={shown} statements={graph.statements} comentions={graph.comentions ?? []} lens={gaps ? 'celah' : 'jaringan'} {region} {colorOf} bind:selected label={'Peta hubungan ' + graph.counts.entities + ' hal. Daftar semua hal ada di bawah peta.'} />
      {:else}{#await import('./TerrainMap.svelte')}<div class="obs-skeleton map" aria-hidden="true"></div>{:then m}<m.default places={mapPlaces} focus={PAPUA} compact height={460} label="Peta tempat dan bahasa di Tanah Papua" />{/await}{/if}
    </div>
    <ul class="obs-legend" aria-label="Tingkat, menurut warna">
      {#each BANDS as b (b.key)}{@const n = counts.get(b.key) ?? 0}<li><button type="button" aria-pressed={!hidden.has(b.key)} disabled={!n} onclick={() => toggle(b.key)} title={n ? (hidden.has(b.key) ? 'Tampilkan ' : 'Sembunyikan ') + b.label : 'Belum ada yang tercatat'}><span class="dot" style:background={dark ? b.dark : b.light}></span>{b.label} <small>{n}</small></button></li>{/each}
    </ul>
    <p class="obs-foot">
      {graph.counts.entities} hal tercatat dari {graph.counts.excerpts} kutipan sumber publik.
      {#if empty.length}Belum ada catatan di {empty.length} dari {BANDS.length} tingkat, yang ditandai dengan garis putus-putus.{/if}
      Ukuran dan lama berubah masih perkiraan dari aturan umum, sehingga setiap titik diletakkan di dalam rentang perkiraannya.
    </p>
    <details class="obs-all">
      <summary>Daftar semua {graph.nodes.length} hal</summary>
      {#each BANDS.filter((b) => counts.get(b.key)) as b (b.key)}<div class="obs-all-group">
          <h3><span class="dot" style:background={dark ? b.dark : b.light}></span>{b.label}</h3>
          <ul>{#each graph.nodes.filter((n) => n.world?.level?.band === b.key).sort((x, y) => x.title.localeCompare(y.title, 'id')) as n (n.id)}<li><a href={href(n)} onclick={pick(n)}>{n.title}</a></li>{/each}</ul>
        </div>{/each}
    </details>
  {:else if failed}<p class="obs-note">Peta pengetahuan belum dapat dimuat. Coba muat ulang halaman ini.</p>
  {:else}<div class="obs-skeleton map" aria-hidden="true"></div><p class="sr-only" role="status">Memuat peta pengetahuan</p>{/if}
</section>

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
  <EntityPanel bind:id={selected} nodes={byId} statements={graph.statements} comentions={graph.comentions ?? []} regionTitle={(r) => regionTitles.get(r) ?? r} />
{/if}

<style>
  .obs-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .obs-stage { min-width: 0; }
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
