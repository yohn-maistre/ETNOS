<script lang="ts" module>
  import type { Lens } from './stage-layouts.ts'
  /**
   * The lens the map opens with. My call (20 November 2026, kept on 21 November): size and pace, as the design of
   * record proposes (world model doc §9), because it explains itself and shows at a glance which kinds of things are
   * not recorded yet. A link can still pick a lens with ?lens=.
   */
  export const DEFAULT_LENS: Lens = 'skala'
</script>

<script lang="ts">
  // The knowledge map with its controls, in two sizes. On the /wiki front it is compact: lens choice, search, the
  // stage and the legend, with a button to open it on its own full-screen page. On /wiki/peta it fills the screen
  // with the same parts plus the filters beside the stage. Both read the same public files; the map lens loads its
  // points only when it is first chosen.
  import { onMount } from 'svelte'
  import { Maximize2, Search, X, MapPinned, Dot } from '@lucide/svelte'
  import MapStage from './MapStage.svelte'
  import { appearance } from './appearance.svelte'
  import { BANDS, bandOf } from './world-scale.ts'
  import { LENSES, LENS_LABEL, fold, isLens, linksOf, pathRings, type StageNode } from './stage-layouts.ts'
  import { loadAtlas, loadAtlasLangs } from './explore-data'
  import { project } from './terrain.ts'

  type Node = StageNode & { regions: string[]; gaps: string[]; context?: string | null }
  type Graph = { counts: { entities: number; excerpts: number }; nodes: Node[]; statements: { source: string; target: string; logical: string }[]; comentions: { a: string; b: string; weight: number }[] }
  type PlacePoint = { slug: string; title: string; facet: string; latitude: number; longitude: number }
  let {
    graph,
    mode = 'compact',
    region = '',
    selected = $bindable(''),
    lens = $bindable(DEFAULT_LENS),
  }: { graph: Graph; mode?: 'compact' | 'full'; region?: string; selected?: string; lens?: Lens } = $props()

  let fit = $state<'full' | 'data'>('full'),
    gaps = $state(false),
    hidden = $state(new Set<string>()),
    query = $state(''),
    threeD = $state(true),
    fullMap = $state(false),
    places = $state<Record<string, PlacePoint> | null>(null),
    langs = $state<Map<string, [number, number]> | null>(null),
    landforms = $state<Record<string, { latitude: number; longitude: number }> | null>(null),
    rings = $state<{ key: string; rings: [number, number][][] }[]>([])

  const full = $derived(mode === 'full')
  const dark = $derived(appearance.theme === 'dark')
  const links = $derived(linksOf(graph.nodes, graph.statements, graph.comentions ?? []))
  const counts = $derived(new Map(BANDS.map((b) => [b.key, graph.nodes.filter((n) => n.world?.level?.band === b.key).length])))
  const empty = $derived(BANDS.filter((b) => !counts.get(b.key)))
  const matches = $derived.by(() => {
    const q = fold(query.trim())
    if (q.length < 2) return null
    return new Set(graph.nodes.filter((n) => fold(n.title).includes(q)).map((n) => n.id))
  })

  // Points of the map lens: kabupaten, kota, provinces and customary regions at their BIG reference point, languages
  // at their Glottolog point, landforms at their Wikidata point. Groups of people have no point and wait in the tray.
  const coordReady = $derived(!!(places && langs && landforms))
  const coordOf = $derived.by(() => {
    if (!places || !langs || !landforms) return null
    const P = places, Lg = langs, Lf = landforms
    return (n: Node): [number, number] | null => {
      if (n.class === 'bahasa' && n.context) return Lg.get(n.context) ?? null
      const p = n.context ? P[n.context] : undefined
      if (p) return project(p.latitude, p.longitude)
      const f = Lf[n.id]
      return f ? project(f.latitude, f.longitude) : null
    }
  })
  // The full MapLibre map, handed the same points as plain markers.
  const mapPlaces = $derived.by(() => {
    if (!places || !langs || !landforms) return []
    const out: { name: string; latitude: number; longitude: number; href: string; color: string }[] = []
    for (const n of graph.nodes) {
      if (hidden.has(n.world?.level?.band ?? '')) continue
      const b = bandOf(n.world?.level?.code), color = b ? (dark ? b.dark : b.light) : '#8a8a8a'
      const href = n.context ? '/wiki/' + n.context : '/wiki/peta?focus=' + n.id
      const p = n.context ? places[n.context] : undefined
      if (p && (p.facet === 'regency' || p.facet === 'city')) out.push({ name: n.title, latitude: p.latitude, longitude: p.longitude, href, color })
      const lf = landforms[n.id]
      if (lf) out.push({ name: n.title, latitude: lf.latitude, longitude: lf.longitude, href, color })
    }
    return out
  })
  const PAPUA: [[number, number], [number, number]] = [[129.5, -9.3], [141.2, 0.2]]
  let lastReadyLens = $state<Lens>(DEFAULT_LENS)
  $effect(() => {
    if (lens !== 'peta' || coordReady) lastReadyLens = lens
  })
  let coordsRequested = false
  function ensureCoords() {
    if (coordsRequested) return
    coordsRequested = true
    void fetch('/observatory/places.json').then((r) => (r.ok ? r.json() : null)).then((d) => (places = d?.places ?? {})).catch(() => (places = {}))
    void fetch('/observatory/landforms.json').then((r) => (r.ok ? r.json() : null)).then((d) => (landforms = d?.points ?? {})).catch(() => (landforms = {}))
    void loadAtlasLangs().then((l) => (langs = new Map(l.map((x) => [x[0], [x[1], x[2]] as [number, number]])))).catch(() => (langs = new Map()))
    void loadAtlas().then((a) => (rings = a ? Object.entries((a as unknown as { regions: Record<string, { d: string }> }).regions).map(([key, r]) => ({ key, rings: pathRings(r.d) })) : [])).catch(() => {})
  }
  $effect(() => {
    if (lens === 'peta') ensureCoords()
  })
  const stageLens = $derived(lens === 'peta' && !coordReady ? lastReadyLens : lens)

  function choose(next: Lens) {
    lens = next
    if (next !== 'peta') fullMap = false
    if (full) return
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
    const i = LENSES.indexOf(lens), step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = LENSES[(i + step + LENSES.length) % LENSES.length]
    choose(next)
    ;(e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(`[data-lens="${next}"]`)?.focus()
  }
  function searchKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && matches?.size) { e.preventDefault(); selected = [...matches][0] }
    if (e.key === 'Escape' && query) { e.preventDefault(); e.stopPropagation(); query = '' }
  }
  onMount(() => {
    // Preload map coordinates quietly so Hubungan -> Peta animates in one smooth flight with zero wait.
    ensureCoords()
    if (full) return
    const asked = new URLSearchParams(location.search).get('lens')
    if (isLens(asked)) lens = asked
    if (matchMedia('(max-width: 559px)').matches) fit = 'data'
  })
  const fullHref = $derived('/wiki/peta' + (() => { const p = new URLSearchParams(); if (lens !== DEFAULT_LENS) p.set('lens', lens); if (selected) p.set('focus', selected); const s = p.toString(); return s ? '?' + s : '' })())

  const LEDE: Record<Lens, string> = {
    skala: 'Setiap titik adalah satu hal yang tercatat. Makin ke kanan makin besar ukurannya, makin ke atas makin lama hal itu berubah, dan makin ke belakang makin tinggi tingkatnya.',
    tingkat: 'Hal yang tercatat dikelompokkan menurut tingkat dalam Integrative Levels Classification, dari materi sampai pengetahuan. Lingkaran putus-putus menandai tingkat yang belum punya catatan.',
    bidang: 'Hal yang tercatat dikelompokkan menurut bidang ilmu yang biasa mempelajarinya. Pengelompokan ini masih aturan dari tingkatnya dan belum dicocokkan dengan topik OpenAlex.',
    kebutuhan: 'Hal dikelompokkan menurut kebutuhan yang dipenuhinya, misalnya pangan, obat atau bahan. Belum ada pernyataan yang diperiksa tentang kegunaan, sehingga semua hal masih menunggu di luar kelompok.',
    hubungan: 'Hal yang sering disebut bersama dalam sumber berada berdekatan. Garis tebal adalah pernyataan yang sudah diperiksa, dan garis tipis adalah sebutan bersama.',
    peta: 'Titik kabupaten dan kota diambil dari garis batas BIG, titik bahasa dari Glottolog, dan titik bentang alam dari Wikidata. Hal yang belum punya titik dikumpulkan di samping peta.',
  }
</script>

<div class="kx" class:kx-full={full}>
  {#if !full}<div class="obs-head">
      <h2 id="obs-map-title">Peta pengetahuan</h2>
      <a class="kx-full-link" href={fullHref}><Maximize2 size={15} aria-hidden="true" />Layar penuh</a>
    </div>{/if}

  <div class="kx-controls">
    <div class="obs-pills kx-lenses" role="radiogroup" aria-label="Susunan peta" tabindex="-1" onkeydown={lensKeys}>
      {#each LENSES as value (value)}<button type="button" role="radio" data-lens={value} aria-checked={lens === value} tabindex={lens === value ? 0 : -1} onclick={() => choose(value)}>{LENS_LABEL[value]}</button>{/each}
    </div>
    <label class="obs-search kx-search">
      <Search size={16} aria-hidden="true" />
      <input type="search" bind:value={query} onkeydown={searchKey} placeholder="Cari tempat, bahasa atau suku" aria-label="Cari di peta pengetahuan" autocomplete="off" />
      {#if query}<button type="button" class="kx-clear" onclick={() => (query = '')} aria-label="Hapus pencarian"><X size={15} /></button>{/if}
    </label>
  </div>

  <p class="obs-lede kx-lede">{LEDE[lens]}{' '}Ketuk titik untuk membuka penjelasannya.</p>
  {#if matches}<p class="kx-found" role="status">{matches.size ? matches.size + ' hal cocok. Tekan Enter untuk membuka yang pertama.' : 'Tidak ada hal yang cocok dengan pencarian ini.'}</p>{/if}

  <div class="kx-tools">
    {#if lens === 'skala'}<div class="obs-pills" role="radiogroup" aria-label="Rentang sumbu">
        <button type="button" role="radio" aria-checked={fit === 'full'} onclick={() => (fit = 'full')}>Seluruh skala</button>
        <button type="button" role="radio" aria-checked={fit === 'data'} onclick={() => (fit = 'data')}>Bagian yang terisi</button>
      </div>{/if}
    {#if lens === 'peta'}<button type="button" class="obs-toggle" aria-pressed={fullMap} disabled={!coordReady} onclick={() => (fullMap = !fullMap)}>{#if fullMap}<Dot size={16} aria-hidden="true" />Kembali ke titik{:else}<MapPinned size={15} aria-hidden="true" />Buka peta lengkap{/if}</button>{/if}
    <button type="button" class="obs-toggle" aria-pressed={gaps} onclick={() => (gaps = !gaps)}><span class="ring" aria-hidden="true"></span>Tandai yang belum punya halaman</button>
  </div>

  <div class="kx-stage">
    {#if lens === 'peta' && fullMap}{#await import('./TerrainMap.svelte')}<div class="obs-skeleton map" aria-hidden="true"></div>{:then m}<m.default places={mapPlaces} focus={PAPUA} compact height={full ? 640 : 460} label="Peta tempat dan bentang alam di Tanah Papua" />{/await}
    {:else}<MapStage nodes={graph.nodes} {links} lens={stageLens} bind:selected bind:threeD {hidden} {gaps} {region} {matches} {fit} coordOf={coordOf} {rings} ringOf={(n) => n.regions[0] ?? null} height={full ? 'fill' : 'compact'} label={'Peta pengetahuan dengan ' + graph.counts.entities + ' hal. Daftar semua hal ada di bawah peta.'} />{/if}
    {#if lens === 'peta' && !coordReady}<p class="kx-wait" role="status">Memuat titik peta</p>{/if}
  </div>

  <ul class="obs-legend" aria-label="Tingkat, menurut warna">
    {#each BANDS as b (b.key)}{@const n = counts.get(b.key) ?? 0}<li><button type="button" aria-pressed={!hidden.has(b.key)} disabled={!n} onclick={() => toggle(b.key)} title={n ? (hidden.has(b.key) ? 'Tampilkan ' : 'Sembunyikan ') + b.label : 'Belum ada yang tercatat'}><span class="dot" style:background={dark ? b.dark : b.light}></span>{b.label} <small>{n}</small></button></li>{/each}
  </ul>
  <p class="obs-foot">
    {graph.counts.entities} hal tercatat dari {graph.counts.excerpts} kutipan sumber publik.
    {#if empty.length}Belum ada catatan di {empty.length} dari {BANDS.length} tingkat, yang ditandai dengan garis putus-putus.{/if}
    Ukuran dan lama berubah masih perkiraan dari aturan umum, sehingga setiap titik diletakkan di dalam rentang perkiraannya.
  </p>
</div>

<style>
  .kx { display: grid; gap: 14px; min-width: 0; }
  .kx-full-link { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; color: var(--foreground); font-size: 13.5px; font-weight: 600; text-decoration: none; }
  .kx-full-link:hover { background: var(--row-hover); }
  .kx-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; min-width: 0; }
  .kx-lenses { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; max-width: 100%; }
  .kx-lenses::-webkit-scrollbar { display: none; }
  .kx-search { flex: 1 1 220px; max-width: 360px; border-radius: 999px; }
  .kx-search input { min-height: 40px; font-size: 15px; }
  .kx-search input::-webkit-search-cancel-button { display: none; }
  .kx-clear { display: grid; place-items: center; width: 32px; height: 32px; margin-right: -6px; border: 0; border-radius: 999px; background: none; color: var(--muted-foreground); cursor: pointer; }
  .kx-clear:hover { background: var(--row-hover); color: var(--foreground); }
  .kx-lede { min-height: 3.1em; }
  .kx-found { margin: -6px 0 0; font-size: 13.5px; color: var(--muted-foreground); }
  .kx-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-height: 44px; }
  .kx-tools :global(.obs-toggle:disabled) { opacity: 0.5; cursor: default; }
  .kx-stage { position: relative; min-width: 0; }
  .kx-full { display: flex; flex-direction: column; gap: 12px; height: 100%; min-height: 0; }
  .kx-full .kx-stage { flex: 1 1 auto; min-height: 320px; border-radius: 16px; overflow: hidden; }
  .kx-full > :not(.kx-stage) { flex: none; }
  .kx-wait { position: absolute; left: 50%; top: 14px; transform: translateX(-50%); margin: 0; padding: 6px 12px; border-radius: 999px; background: var(--background); border: 1px solid var(--border); font-size: 13px; }
  .kx :global(.obs-skeleton.map) { height: 440px; }
  @media (max-width: 640px) {
    .kx-search { max-width: none; flex-basis: 100%; }
    .kx-lenses { margin-inline: calc(var(--gutter, 16px) * -1); padding-inline: var(--gutter, 16px); border: 0; border-radius: 0; }
    .kx-lenses button { border: 1px solid var(--border); }
    .kx-lenses button[aria-checked='true'] { border-color: var(--foreground); }
  }
  @media (pointer: coarse) { .kx :global(.obs-pills button), .kx :global(.obs-toggle), .kx :global(.obs-legend button), .kx-full-link { min-height: 44px; } }
</style>
