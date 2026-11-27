<script lang="ts">
  // Ruang makna, the second view of Peta Kata: the 100 Leipzig-Jakarta concepts placed by meaning in a space that
  // can be turned, or grouped into Leiden clusters. Solid lines are colexifications found in the wordlists and
  // public Kamus entries (one form in one language for two concepts); dashed lines are closeness in meaning.
  // Loaded only when the reader opens this view.
  import { onMount } from 'svelte'
  import { ArrowUpRight, Sparkles } from '@lucide/svelte'
  import { request } from './api'
  import { fold } from './stage-layouts.ts'
  import LanguageStage, { type LangLens, type SemLink, type SemPoint } from './LanguageStage.svelte'

  let { onOpenConcept, query = '' }: { onOpenConcept: (leipzigJakarta: number) => void; query?: string } = $props()

  type SemanticNodeSample = { lemma: string; languageCode: string; languageName: string; origin: 'community' | 'seed' }
  type SemanticNode = {
    n: number; id: string; english: string; wordClass: string; x: number; y: number; z: number; cluster: number
    domain: string; wordsCount: number; voiceCount: number; colexDegree: number; samples: SemanticNodeSample[]
  }
  type ColexExample = { lemma: string; languageCode: string; languageName: string; gloss: string; origin: 'community' | 'seed' }
  type SemanticEdge = { source: number; target: number; kind: 'colexification' | 'semantic'; weight: number; examples: ColexExample[] }
  type SemanticCluster = { id: number; label: string; color: string; count: number }
  type SemanticMapData = {
    mode: 'bge-m3' | 'deterministic'; source: string; licence: string
    stats: { concepts: number; colexificationEdges: number; semanticEdges: number; clusters: number; languagesUsed: number; publicEntriesUsed: number }
    languages: { code: string; name: string; entries: number }[]
    clusters: SemanticCluster[]; nodes: SemanticNode[]; edges: SemanticEdge[]
  }

  let lens = $state<LangLens>('semantik')
  let threeD = $state(true)
  let hidden = $state(new Set<string>())
  let colexOnly = $state(false)
  let langCode = $state('')
  let data = $state<SemanticMapData | null>(null)
  let error = $state('')
  let selected = $state('')

  const nodes = $derived.by(() => {
    if (!data) return []
    if (!langCode) return data.nodes
    return data.nodes.map((n) => ({ ...n, samples: n.samples.filter((s) => s.languageCode === langCode) }))
  })
  const byN = $derived(new Map(nodes.map((n) => [n.n, n])))
  const byId = $derived(new Map(nodes.map((n) => [String(n.n), n])))
  const clusterColor = $derived(new Map((data?.clusters ?? []).map((c) => [c.id, c.color])))
  const clusterLabel = $derived(new Map((data?.clusters ?? []).map((c) => [c.id, c.label])))
  const points = $derived<SemPoint[]>(nodes.map((n) => ({ id: String(n.n), n: n.n, title: n.id, english: n.english, x: n.x, y: n.y, z: n.z ?? 0, cluster: n.cluster, colexDegree: n.colexDegree, wordsCount: n.wordsCount })))
  const links = $derived.by<SemLink[]>(() => {
    if (!data) return []
    const idx = new Map(nodes.map((n, i) => [n.n, i]))
    const out: SemLink[] = []
    for (const e of data.edges) {
      if (langCode && e.kind === 'colexification' && !e.examples.some((x) => x.languageCode === langCode)) continue
      const a = idx.get(e.source), b = idx.get(e.target)
      if (a !== undefined && b !== undefined) out.push({ a, b, kind: e.kind, weight: e.weight })
    }
    return out
  })
  const node = $derived(selected ? byId.get(selected) ?? null : null)
  const connections = $derived.by(() => {
    const colex: { node: SemanticNode; edge: SemanticEdge }[] = [], near: { node: SemanticNode; edge: SemanticEdge }[] = []
    if (!data || !node) return { colex, near }
    for (const edge of data.edges) {
      if (edge.source !== node.n && edge.target !== node.n) continue
      if (langCode && edge.kind === 'colexification' && !edge.examples.some((x) => x.languageCode === langCode)) continue
      const other = byN.get(edge.source === node.n ? edge.target : edge.source)
      if (!other) continue
      ;(edge.kind === 'colexification' ? colex : near).push({ node: other, edge })
    }
    colex.sort((a, b) => b.edge.weight - a.edge.weight)
    near.sort((a, b) => b.edge.weight - a.edge.weight)
    return { colex, near }
  })
  const matches = $derived.by(() => {
    const q = fold(query.trim())
    if (q.length < 2) return null
    return new Set(nodes.filter((n) => fold(n.id).includes(q) || fold(n.english).includes(q) || n.samples.some((s) => fold(s.lemma).includes(q))).map((n) => String(n.n)))
  })

  function toggle(key: string) {
    const next = new Set(hidden)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    hidden = next
  }

  onMount(() => {
    request<SemanticMapData>('/v1/peta-kata/semantic', undefined, undefined, true)
      .then((d) => {
        data = d
        const richest = [...d.nodes].sort((a, b) => b.colexDegree - a.colexDegree || b.wordsCount - a.wordsCount)[0]
        if (richest) selected = String(richest.n)
      })
      .catch((e) => { error = e instanceof Error ? e.message : 'Ruang makna belum dapat dimuat.' })
  })
</script>

<section class="obs-section pkr" aria-label="Ruang makna">
  <p class="obs-lede">Seratus konsep dasar disusun menurut kedekatan maknanya. Garis tegas menghubungkan dua konsep yang memakai kata yang sama dalam satu bahasa. Garis putus-putus menghubungkan konsep yang maknanya berdekatan.</p>
  <div class="pkr-tools">
    <div class="obs-pills" role="radiogroup" aria-label="Susunan ruang makna">
      <button type="button" role="radio" aria-checked={lens === 'semantik'} onclick={() => (lens = 'semantik')}>Ruang 3D</button>
      <button type="button" role="radio" aria-checked={lens === 'kelompok'} onclick={() => (lens = 'kelompok')}>Kelompok makna</button>
    </div>
    <button type="button" class="obs-toggle" aria-pressed={colexOnly} onclick={() => (colexOnly = !colexOnly)}>Hanya kata yang sama ({data?.stats.colexificationEdges ?? 0})</button>
    {#if (data?.languages.length ?? 0) > 1}
      <label class="pkr-select">
        <span class="sr-only">Saring bahasa</span>
        <select bind:value={langCode}>
          <option value="">Semua bahasa ({data?.languages.length})</option>
          {#each [...(data?.languages ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'id')) as l (l.code)}<option value={l.code}>{l.name} ({l.entries})</option>{/each}
        </select>
      </label>
    {/if}
  </div>

  {#if error}
    <p role="alert" class="pkr-status">{error}</p>
  {:else if !data}
    <div class="obs-skeleton pkr-hold" aria-hidden="true"></div>
    <p class="sr-only" role="status">Memuat ruang makna</p>
  {:else}
    <LanguageStage
      {lens}
      atlasPoints={[]}
      atlasFamilies={[]}
      atlasRings={[]}
      semPoints={points}
      semLinks={links}
      semClusters={data.clusters}
      {selected}
      {hidden}
      {matches}
      {colexOnly}
      bind:threeD
      label="Ruang makna konsep dasar"
      onSelect={(id) => (selected = id)}
    />
    <ul class="obs-legend" aria-label="Kelompok makna">
      {#each data.clusters as c (c.id)}
        <li><button type="button" aria-pressed={!hidden.has(String(c.id))} onclick={() => toggle(String(c.id))}><span class="dot" style:background={c.color}></span>{c.label} <small>{c.count}</small></button></li>
      {/each}
    </ul>
    <div class="pkr-key">
      <span><i class="line colex"></i>Kata yang sama dalam satu bahasa</span>
      <span><i class="line near"></i>Makna berdekatan</span>
      <span class="pkr-mode"><Sparkles size={13} aria-hidden="true" />{data.mode === 'bge-m3' ? 'Disusun dengan embedding multibahasa (bge-m3)' : 'Disusun dari kelompok makna dan kata yang sama'}</span>
    </div>

    {#if node}
      <div class="pkr-card">
        <div class="pkr-head">
          <div>
            <h2 class="pkr-title">{node.id} <small>{node.english}</small></h2>
            <p class="pkr-cluster" style={`--c:${clusterColor.get(node.cluster) ?? 'var(--muted-foreground)'}`}>{clusterLabel.get(node.cluster) ?? ''}</p>
          </div>
          <button type="button" class="pkr-open" onclick={() => onOpenConcept(node.n)}>Lihat di peta <ArrowUpRight size={15} aria-hidden="true" /></button>
        </div>
        {#if node.samples.length}
          <p class="pkr-samples">{#each node.samples.slice(0, 5) as s, i (s.languageCode + s.lemma)}{i > 0 ? ', ' : ''}<strong>{s.lemma}</strong> ({s.languageName}){/each}</p>
        {/if}
        <div class="pkr-cols">
          <div>
            <h3>Kata yang sama untuk konsep lain ({connections.colex.length})</h3>
            {#if connections.colex.length}
              <ul class="pkr-list">
                {#each connections.colex.slice(0, 8) as item (item.node.n)}
                  <li><button type="button" onclick={() => (selected = String(item.node.n))}><span><strong>{node.id}</strong> dan <strong>{item.node.id}</strong></span><small>{item.edge.examples.slice(0, 3).map((x) => `${x.lemma} (${x.languageName})`).join(' · ')}</small></button></li>
                {/each}
              </ul>
            {:else}
              <p class="obs-foot">Belum ada bahasa dalam data yang memakai satu kata untuk “{node.id}” dan konsep dasar lain.</p>
            {/if}
          </div>
          <div>
            <h3>Konsep yang maknanya dekat ({connections.near.length})</h3>
            {#if connections.near.length}
              <div class="obs-chips">{#each connections.near.slice(0, 10) as item (item.node.n)}<button type="button" onclick={() => (selected = String(item.node.n))}>{item.node.id}</button>{/each}</div>
            {:else}
              <p class="obs-foot">Ketuk konsep lain di ruang makna untuk melihat konsep yang dekat.</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
    <p class="obs-foot">Disusun dari {data.stats.publicEntriesUsed.toLocaleString('id-ID')} kata dalam {data.stats.languagesUsed} bahasa, dari daftar kata terbitan dan kamus komunitas publik, dengan daftar konsep {data.source} ({data.licence}). Komunitas tertutup dan kata yang ditandai jangan disebarkan tidak dipakai.</p>
  {/if}
</section>

<style>
  .pkr-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .pkr-select select { min-height: 44px; max-width: 100%; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; }
  .pkr-hold { height: 420px; }
  .pkr-status { margin: 0; padding: 14px 16px; border: 1px dashed var(--border); border-radius: 14px; color: var(--muted-foreground); }
  .pkr-key { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; font-size: 13px; color: var(--muted-foreground); }
  .pkr-key span { display: inline-flex; align-items: center; gap: 6px; }
  .line { display: inline-block; width: 18px; height: 0; }
  .line.colex { border-top: 2.5px solid #14b8a6; }
  .line.near { border-top: 1.5px dashed color-mix(in oklab, var(--foreground) 45%, transparent); }
  .pkr-card { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: color-mix(in oklab, var(--foreground) 2.5%, var(--background)); }
  .pkr-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .pkr .pkr-title { font-size: 22px; }
  .pkr-title small { font-size: 15px; font-weight: 500; color: var(--muted-foreground); }
  .pkr-cluster { margin: 4px 0 0; font-size: 13.5px; font-weight: 650; color: var(--c); }
  .pkr-open { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border: 0; border-radius: 999px; background: var(--foreground); color: var(--background); font: inherit; font-size: 14px; font-weight: 650; cursor: pointer; }
  .pkr-samples { margin: 0; font-size: 14.5px; line-height: 1.5; }
  .pkr-cols { display: grid; gap: 16px; }
  @media (min-width: 640px) { .pkr-cols { grid-template-columns: 1.2fr 1fr; } }
  .pkr-cols h3 { margin: 0 0 8px; font-size: 13.5px; font-weight: 700; color: var(--muted-foreground); }
  .pkr-list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .pkr-list button { display: grid; gap: 2px; width: 100%; min-height: 44px; padding: 9px 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; text-align: left; cursor: pointer; }
  .pkr-list button:hover { background: var(--row-hover); }
  .pkr-list small { font-size: 13px; color: var(--muted-foreground); }
</style>
