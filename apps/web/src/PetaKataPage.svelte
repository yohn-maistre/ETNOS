<script lang="ts">
  import { onMount } from 'svelte'
  import {
    Volume2,
    Square,
    Search,
    BookOpen,
    ChevronRight,
    Map as MapIcon,
    Network,
    ChevronDown,
    Sparkles,
    ArrowUpRight,
  } from '@lucide/svelte'
  import { request } from './api'
  import * as Tabs from '$lib/components/ui/tabs'
  import atlas from './papua-atlas.json'

  type AtlasConcept = {
    n: number
    concepticon: number
    gloss: string
    english: string
    id: string
    wordClass: string
    count: number
    voiceCount: number
  }
  type AtlasWord = {
    id: string
    languageCode: string
    languageSlug: string | null
    languageName: string
    communityId: string | null
    communityTitle: string
    lemma: string
    gloss: string
    pos: string
    state: 'checked' | 'seed' | 'proposed'
    source: string
    licence: string
    origin: 'community' | 'seed'
    voice: { id: string; url: string; durationMs: number; speaker: string } | null
  }
  type SemanticNodeSample = {
    lemma: string
    languageCode: string
    languageName: string
    origin: 'community' | 'seed'
  }
  type SemanticNode = {
    n: number
    id: string
    english: string
    wordClass: string
    x: number
    y: number
    cluster: number
    domain: string
    wordsCount: number
    voiceCount: number
    colexDegree: number
    samples: SemanticNodeSample[]
  }
  type ColexExample = {
    lemma: string
    languageCode: string
    languageName: string
    gloss: string
    origin: 'community' | 'seed'
  }
  type SemanticEdge = {
    source: number
    target: number
    kind: 'colexification' | 'semantic'
    weight: number
    examples: ColexExample[]
  }
  type SemanticCluster = {
    id: number
    label: string
    color: string
    count: number
  }
  type SemanticMapData = {
    mode: 'bge-m3' | 'deterministic'
    source: string
    licence: string
    stats: {
      concepts: number
      colexificationEdges: number
      semanticEdges: number
      clusters: number
      languagesUsed: number
      publicEntriesUsed: number
    }
    clusters: SemanticCluster[]
    nodes: SemanticNode[]
    edges: SemanticEdge[]
  }

  const REGION_NAMES: Record<string, string> = {
    domberai: 'Domberai',
    bomberai: 'Bomberai',
    saireri: 'Saireri',
    'mamta-tabi': 'Mamta / Tabi',
    meepago: 'Mee Pago',
    'la-pago': 'La Pago',
    'ha-anim': 'Ha Anim',
  }

  let view = $state<'geografis' | 'semantik'>('geografis')
  let concepts = $state<AtlasConcept[]>([])
  let showAllConcepts = $state(false)
  let activeConcept = $state<AtlasConcept | null>(null)
  let query = $state('')
  let words = $state<AtlasWord[]>([])
  let selectedSlug = $state<string | null>(null)
  let loading = $state(true)
  let error = $state('')
  let playingId = $state<string | null>(null)
  let audioEl: HTMLAudioElement | null = null

  // Semantic map state
  let semData = $state<SemanticMapData | null>(null)
  let semLoading = $state(false)
  let semError = $state('')
  let semFilter = $state<'all' | 'colex'>('all')
  let semCluster = $state<number | null>(null)
  let semSelectedN = $state<number | null>(null)
  let semHoveredN = $state<number | null>(null)

  const atlasRegions = Object.entries(atlas.regions as Record<string, { d: string; x: number; y: number }>)
  const atlasLangs = atlas.langs as [string, number, number, string][]
  const viewBox = (atlas.box as number[]).join(' ')

  const wordsBySlug = $derived.by(() => {
    const m = new Map<string, AtlasWord[]>()
    for (const w of words) {
      if (!w.languageSlug) continue
      m.set(w.languageSlug, [...(m.get(w.languageSlug) ?? []), w])
    }
    return m
  })

  // Deterministic simple vertical nudge so adjacent language callouts on the map never collide.
  const mapHits = $derived.by(() => {
    const raw: Array<{ slug: string; x: number; y: number; hits: AtlasWord[]; hasVoice: boolean; labelY: number }> = []
    for (const [slug, x, y] of atlasLangs) {
      const hits = wordsBySlug.get(slug)
      if (!hits?.length) continue
      raw.push({ slug, x, y, hits, hasVoice: hits.some((w) => !!w.voice), labelY: y })
    }
    raw.sort((a, b) => a.y - b.y || a.x - b.x)
    const placed: Array<{ x: number; y: number }> = []
    for (const item of raw) {
      let ly = item.y
      for (let step = 0; step < 6; step++) {
        const collides = placed.some((p) => Math.abs(p.x - item.x) < 72 && Math.abs(p.y - ly) < 18)
        if (!collides) break
        ly += step % 2 === 0 ? -18 : 20
      }
      item.labelY = ly
      placed.push({ x: item.x, y: ly })
    }
    return raw
  })

  const visibleWords = $derived(
    selectedSlug ? words.filter((w) => w.languageSlug === selectedSlug) : words,
  )

  const semByN = $derived(new Map((semData?.nodes ?? []).map((n) => [n.n, n])))
  const clusterColor = $derived(new Map((semData?.clusters ?? []).map((c) => [c.id, c.color])))
  const clusterLabel = $derived(new Map((semData?.clusters ?? []).map((c) => [c.id, c.label])))

  const semSx = (v: number) => 420 + v * 365
  const semSy = (v: number) => 270 + v * 222

  const semFocusN = $derived(semHoveredN ?? semSelectedN)
  const semSelectedNode = $derived(semSelectedN !== null ? semByN.get(semSelectedN) ?? null : null)

  const semVisibleEdges = $derived.by(() => {
    if (!semData) return []
    return semData.edges.filter((e) => {
      if (semFilter === 'colex' && e.kind !== 'colexification') return false
      if (semCluster !== null) {
        const a = semByN.get(e.source)
        const b = semByN.get(e.target)
        if (a?.cluster !== semCluster && b?.cluster !== semCluster) return false
      }
      return true
    })
  })

  const semNodeConnections = $derived.by(() => {
    if (!semData || semSelectedN === null) return { colex: [] as Array<{ node: SemanticNode; edge: SemanticEdge }>, semantic: [] as Array<{ node: SemanticNode; edge: SemanticEdge }> }
    const colex: Array<{ node: SemanticNode; edge: SemanticEdge }> = []
    const semantic: Array<{ node: SemanticNode; edge: SemanticEdge }> = []
    for (const edge of semData.edges) {
      if (edge.source !== semSelectedN && edge.target !== semSelectedN) continue
      const otherN = edge.source === semSelectedN ? edge.target : edge.source
      const other = semByN.get(otherN)
      if (!other) continue
      if (edge.kind === 'colexification') colex.push({ node: other, edge })
      else semantic.push({ node: other, edge })
    }
    colex.sort((a, b) => b.edge.weight - a.edge.weight)
    semantic.sort((a, b) => b.edge.weight - a.edge.weight)
    return { colex, semantic }
  })

  const semFocusNeighbors = $derived.by(() => {
    const s = new Set<number>()
    if (semFocusN === null || !semData) return s
    s.add(semFocusN)
    for (const e of semVisibleEdges) {
      if (e.source === semFocusN) s.add(e.target)
      else if (e.target === semFocusN) s.add(e.source)
    }
    return s
  })

  const topColexHighlights = $derived.by(() => {
    if (!semData) return []
    return semData.edges
      .filter((e) => e.kind === 'colexification' && e.examples.length)
      .slice(0, 8)
      .map((e) => ({
        edge: e,
        a: semByN.get(e.source),
        b: semByN.get(e.target),
      }))
      .filter((x): x is { edge: SemanticEdge; a: SemanticNode; b: SemanticNode } => !!x.a && !!x.b)
  })

  async function loadLookup(params: { concept?: string; q?: string }) {
    loading = true
    error = ''
    selectedSlug = null
    try {
      const qs = new URLSearchParams()
      if (params.concept) qs.set('concept', params.concept)
      if (params.q) qs.set('q', params.q)
      const res = await request<{ concept: AtlasConcept | null; query: string; words: AtlasWord[] }>(
        `/v1/peta-kata?${qs.toString()}`,
        undefined,
        undefined,
        true,
      )
      activeConcept = res.concept
      words = res.words
    } catch (e) {
      error = e instanceof Error ? e.message : 'Peta kata belum dapat dimuat.'
    } finally {
      loading = false
    }
  }

  async function loadSemantic() {
    if (semData || semLoading) return
    semLoading = true
    semError = ''
    try {
      const data = await request<SemanticMapData>('/v1/peta-kata/semantic', undefined, undefined, true)
      semData = data
      // Pre-select the most richly colexified concept so the inspector opens with real Papuan insight immediately.
      const richest = [...data.nodes].sort((a, b) => b.colexDegree - a.colexDegree || b.wordsCount - a.wordsCount)[0]
      semSelectedN = richest?.n ?? data.nodes[0]?.n ?? null
    } catch (e) {
      semError = e instanceof Error ? e.message : 'Peta semantik belum dapat dimuat.'
    } finally {
      semLoading = false
    }
  }

  function playVoice(w: AtlasWord) {
    if (!w.voice) return
    if (playingId === w.voice.id && audioEl) {
      audioEl.pause()
      playingId = null
      return
    }
    if (audioEl) {
      audioEl.pause()
      audioEl = null
    }
    const a = new Audio(w.voice.url)
    audioEl = a
    playingId = w.voice.id
    a.onended = () => {
      if (playingId === w.voice?.id) playingId = null
    }
    a.onerror = () => {
      if (playingId === w.voice?.id) playingId = null
    }
    void a.play().catch(() => {
      playingId = null
    })
  }

  $effect(() => {
    if (view === 'semantik' && !semData && !semLoading) {
      void loadSemantic()
    }
  })

  onMount(() => {
    document.title = 'Peta Kata & Semantik · Ensiklopedia · ETNOS'
    const sp = new URLSearchParams(location.search)
    const initView = sp.get('tampilan') ?? sp.get('view') ?? ''
    if (initView === 'semantik') view = 'semantik'
    const initConcept = sp.get('concept') ?? ''
    const initQ = sp.get('q') ?? ''
    query = initQ
    void request<{ concepts: AtlasConcept[] }>('/v1/peta-kata/concepts', undefined, undefined, true)
      .then((r) => {
        concepts = r.concepts
      })
      .catch(() => {})
    void loadLookup(initQ ? { q: initQ } : { concept: initConcept || 'air' })
    return () => {
      audioEl?.pause()
    }
  })

  function submitSearch(e: Event) {
    e.preventDefault()
    if (!query.trim()) return
    view = 'geografis'
    void loadLookup({ q: query.trim() })
  }

  function pickConcept(c: AtlasConcept) {
    query = ''
    void loadLookup({ concept: String(c.n) })
  }

  function openInGeo(node: SemanticNode) {
    query = ''
    view = 'geografis'
    void loadLookup({ concept: String(node.n) })
  }
</script>

<section class="peta-kata-page">
  <nav class="pk-crumb" aria-label="Jejak halaman">
    <a href="/wiki">Ensiklopedia</a>
    <ChevronRight size={14} aria-hidden="true" />
    <span>Peta Kata & Semantik</span>
  </nav>

  <header class="pk-head">
    <div class="pk-title-block">
      <h1>Peta Kata Tanah Papua</h1>
      <p>
        Bandingkan 100 konsep dasar Leipzig-Jakarta di 256 bahasa Tanah Papua, dengarkan pelafalannya, dan jelajahi bagaimana bahasa Papua menautkan makna melalui peta semantik serta koleksifikasi.
      </p>
    </div>

    <form class="pk-search" onsubmit={submitSearch}>
      <label class="sr-only" for="pk-search-input">Cari kata atau makna</label>
      <Search size={17} aria-hidden="true" />
      <input
        id="pk-search-input"
        type="search"
        bind:value={query}
        placeholder="Cari makna atau kata (mis. air, api, rumah, makan)…"
      />
      <button type="submit">Cari</button>
    </form>
  </header>

  <Tabs.Root bind:value={view}>
    <Tabs.List class="pk-tabs">
      <Tabs.Trigger value="geografis">
        <MapIcon size={15} aria-hidden="true" />
        <span>Peta Geografis</span>
      </Tabs.Trigger>
      <Tabs.Trigger value="semantik">
        <Network size={15} aria-hidden="true" />
        <span>Peta Semantik Papua</span>
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="geografis" class="pk-pane">
      {#if concepts.length}
        <div class="pk-chips-section">
          <div class="pk-chips-wrap" class:expanded={showAllConcepts}>
            <div class="pk-chips" class:expanded={showAllConcepts} role="list" aria-label="Konsep dasar Leipzig-Jakarta">
              {#each (showAllConcepts ? concepts : concepts.slice(0, 24)) as c (c.n)}
                <button
                  type="button"
                  class="pk-chip"
                  class:active={activeConcept?.n === c.n && !query}
                  class:has-data={c.count > 0}
                  onclick={() => pickConcept(c)}
                >
                  <span>{c.id}</span>
                  {#if c.count > 0}<small>{c.count}</small>{/if}
                </button>
              {/each}
            </div>
          </div>
          <button
            type="button"
            class="pk-expand-btn"
            aria-expanded={showAllConcepts}
            onclick={() => (showAllConcepts = !showAllConcepts)}
          >
            <span>{showAllConcepts ? 'Ringkas daftar konsep' : `Semua ${concepts.length} konsep`}</span>
            <ChevronDown size={14} class={showAllConcepts ? 'rot' : ''} aria-hidden="true" />
          </button>
        </div>
      {/if}

      <div class="pk-atlas-wrap">
        <svg class="pk-atlas" {viewBox} role="img" aria-label="Peta sebaran bahasa Tanah Papua">
          {#each atlasRegions as [slug, r] (slug)}
            <path class="pk-region" d={r.d}>
              <title>{REGION_NAMES[slug] ?? slug}</title>
            </path>
            <text class="pk-region-label" x={r.x} y={r.y}>{REGION_NAMES[slug] ?? slug}</text>
          {/each}
          {#each atlasLangs as [slug, x, y] (slug)}
            {#if !wordsBySlug.has(slug)}
              <circle cx={x} cy={y} r={2.2} class="pk-lang-dot" />
            {/if}
          {/each}
          {#each mapHits as item (item.slug)}
            {@const word = item.hits[0].lemma}
            {@const pillW = Math.max(36, Math.min(110, word.length * 7.2 + 14))}
            <g
              class="pk-hit"
              class:selected={selectedSlug === item.slug}
              class:voiced={item.hasVoice}
              role="button"
              tabindex="0"
              aria-label={`${item.hits[0].languageName}: ${word}`}
              onclick={() => (selectedSlug = selectedSlug === item.slug ? null : item.slug)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  selectedSlug = selectedSlug === item.slug ? null : item.slug
                }
              }}
            >
              <circle cx={item.x} cy={item.y} r={selectedSlug === item.slug ? 13 : 9} class="pk-hit-halo" />
              <circle cx={item.x} cy={item.y} r={5} class="pk-hit-dot" />
              {#if Math.abs(item.labelY - item.y) > 2}
                <line x1={item.x} y1={item.y} x2={item.x + 8} y2={item.labelY} class="pk-hit-stem" />
              {/if}
              <rect x={item.x + 8} y={item.labelY - 10} width={pillW} height="19" rx="9.5" class="pk-hit-pill" />
              <text x={item.x + 15} y={item.labelY + 3.5} class="pk-hit-word">{word}</text>
            </g>
          {/each}
        </svg>
        <div class="pk-legend">
          <span><i class="dot plain"></i>256 titik bahasa (Glottolog)</span>
          <span><i class="dot match"></i>Ada kata</span>
          <span><i class="dot voiced"></i>Ada rekaman suara</span>
          {#if selectedSlug}
            <button type="button" class="pk-clear" onclick={() => (selectedSlug = null)}>Tampilkan semua bahasa</button>
          {/if}
        </div>
      </div>

      {#if error}
        <p role="alert" class="pk-status">{error}</p>
      {:else if loading}
        <p class="pk-status">Memuat kata dari Tanah Papua…</p>
      {:else if !visibleWords.length}
        <div class="pk-empty">
          <p>
            Belum ada kata publik untuk <strong>{query || activeConcept?.id || 'pilihan ini'}</strong>.
            Komunitas bahasa dapat menambahkan kata dan rekaman suara lewat tab Kamus di ruang komunitasnya.
          </p>
        </div>
      {:else}
        <div class="pk-results-head">
          <h2>
            {#if activeConcept && !query}
              “{activeConcept.id}” <small>({activeConcept.english})</small>
            {:else}
              Hasil untuk “{query}”
            {/if}
          </h2>
          <span>{visibleWords.length} entri</span>
        </div>
        <ul class="pk-list">
          {#each visibleWords as w (w.id)}
            <li class="pk-card">
              <div class="pk-card-main">
                <div class="pk-card-top">
                  <strong class="pk-lemma">{w.lemma}</strong>
                  {#if w.pos}<span class="pk-pos">{w.pos}</span>{/if}
                  <span class="pk-state">{w.origin === 'seed' ? 'Sumber tertulis' : w.state === 'checked' ? 'Diperiksa komunitas' : 'Usulan'}</span>
                </div>
                <p class="pk-gloss">{w.gloss}</p>
                <div class="pk-meta">
                  <span>
                    <BookOpen size={13} aria-hidden="true" />
                    {#if w.languageSlug}
                      <a href={`/wiki/${w.languageSlug}`}>{w.languageName}</a>
                    {:else}
                      {w.languageName}
                    {/if}
                  </span>
                  {#if w.communityId}
                    <span>· <a href={`/communities/${w.communityId}`}>{w.communityTitle}</a></span>
                  {:else}
                    <span>· {w.source}{w.licence ? ` (${w.licence})` : ''}</span>
                  {/if}
                </div>
              </div>
              {#if w.voice}
                <button
                  type="button"
                  class="pk-play"
                  class:playing={playingId === w.voice.id}
                  aria-label={`Putar pelafalan ${w.lemma} dalam bahasa ${w.languageName}`}
                  onclick={() => playVoice(w)}
                >
                  {#if playingId === w.voice.id}
                    <Square size={15} />
                    <span>Henti</span>
                  {:else}
                    <Volume2 size={15} />
                    <span>Dengar</span>
                  {/if}
                </button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Tabs.Content>

    <Tabs.Content value="semantik" class="pk-pane">
      {#if semError}
        <p role="alert" class="pk-status">{semError}</p>
      {:else if semLoading || !semData}
        <p class="pk-status">Menyusun peta semantik dan koleksifikasi bahasa Papua…</p>
      {:else}
        <div class="sem-toolbar">
          <div class="sem-mode-pills" role="group" aria-label="Saring hubungan">
            <button type="button" class="sem-pill" aria-pressed={semFilter === 'all'} onclick={() => (semFilter = 'all')}>
              Semua hubungan
            </button>
            <button type="button" class="sem-pill" aria-pressed={semFilter === 'colex'} onclick={() => (semFilter = 'colex')}>
              Hanya koleksifikasi Papua ({semData.stats.colexificationEdges})
            </button>
          </div>
          <span class="sem-badge" title="Metode penempatan 2D">
            <Sparkles size={13} aria-hidden="true" />
            <span>{semData.mode === 'bge-m3' ? 'Embedding multilingual (bge-m3)' : 'Proyeksi leksikal-struktural'}</span>
          </span>
        </div>

        <div class="sem-clusters" role="group" aria-label="Kelompok makna Leiden">
          <button
            type="button"
            class="sem-cluster-pill"
            aria-pressed={semCluster === null}
            onclick={() => (semCluster = null)}
          >
            Semua kelompok ({semData.stats.concepts})
          </button>
          {#each semData.clusters as c (c.id)}
            <button
              type="button"
              class="sem-cluster-pill"
              aria-pressed={semCluster === c.id}
              onclick={() => (semCluster = semCluster === c.id ? null : c.id)}
            >
              <i class="sem-dot" style={`background:${c.color}`}></i>
              <span>{c.label}</span>
              <small>{c.count}</small>
            </button>
          {/each}
        </div>

        <div class="sem-canvas-wrap">
          <svg
            class="sem-svg"
            viewBox="0 0 840 540"
            role="img"
            aria-label="Peta semantik 100 konsep dasar dan koleksifikasi bahasa Papua"
          >
            <!-- Edges -->
            {#each semVisibleEdges as e, idx (idx)}
              {@const a = semByN.get(e.source)}
              {@const b = semByN.get(e.target)}
              {#if a && b}
                {@const isFocused = semFocusN !== null && (e.source === semFocusN || e.target === semFocusN)}
                {@const isDim = semFocusN !== null && !isFocused}
                <line
                  x1={semSx(a.x)}
                  y1={semSy(a.y)}
                  x2={semSx(b.x)}
                  y2={semSy(b.y)}
                  class="sem-edge"
                  class:colex={e.kind === 'colexification'}
                  class:focused={isFocused}
                  class:dim={isDim}
                />
              {/if}
            {/each}

            <!-- Nodes -->
            {#each semData.nodes as node (node.n)}
              {@const x = semSx(node.x)}
              {@const y = semSy(node.y)}
              {@const color = clusterColor.get(node.cluster) ?? '#0f766e'}
              {@const inCluster = semCluster === null || node.cluster === semCluster}
              {@const isSelected = semSelectedN === node.n}
              {@const isFocus = semFocusN === null || semFocusNeighbors.has(node.n)}
              {@const r = Math.min(11, 4.5 + node.colexDegree * 1.15)}
              {@const showLabel = isSelected || semHoveredN === node.n || node.colexDegree >= 2 || (semCluster !== null && inCluster)}
              <g
                class="sem-node"
                class:selected={isSelected}
                class:dim={!inCluster || !isFocus}
                role="button"
                tabindex="0"
                aria-label={`${node.id} (${node.english})`}
                onmouseenter={() => (semHoveredN = node.n)}
                onmouseleave={() => (semHoveredN = null)}
                onclick={() => (semSelectedN = node.n)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    semSelectedN = node.n
                  }
                }}
              >
                {#if isSelected}
                  <circle cx={x} cy={y} r={r + 7} fill={color} opacity="0.24" />
                {/if}
                <circle
                  cx={x}
                  cy={y}
                  {r}
                  fill={color}
                  stroke="var(--background)"
                  stroke-width={node.colexDegree > 0 ? 1.8 : 1.1}
                />
                {#if showLabel}
                  <text
                    x={x}
                    y={y - r - 5}
                    text-anchor="middle"
                    class="sem-label"
                    class:strong={isSelected || semHoveredN === node.n}
                  >
                    {node.id}
                  </text>
                {/if}
              </g>
            {/each}
          </svg>

          <div class="pk-legend">
            <span><i class="sem-line colex"></i>Koleksifikasi nyata (kata Papua yang sama menyatukan dua makna)</span>
            <span><i class="sem-line near"></i>Kedekatan semantik</span>
            <span>Ukuran titik = jumlah jembatan koleksifikasi</span>
          </div>
        </div>

        {#if semSelectedNode}
          <div class="sem-inspector">
            <div class="sem-insp-head">
              <div>
                <div class="sem-insp-title-row">
                  <h2>{semSelectedNode.id}</h2>
                  <span class="sem-insp-en">{semSelectedNode.english}</span>
                  <span
                    class="sem-insp-cluster"
                    style={`--c:${clusterColor.get(semSelectedNode.cluster) ?? '#0f766e'}`}
                  >
                    {clusterLabel.get(semSelectedNode.cluster) ?? 'Kelompok'}
                  </span>
                </div>
                {#if semSelectedNode.samples.length}
                  <p class="sem-insp-samples">
                    Contoh kata:
                    {#each semSelectedNode.samples.slice(0, 4) as s, i (s.languageCode + s.lemma)}
                      {#if i > 0}, {/if}
                      <strong>{s.lemma}</strong> ({s.languageName})
                    {/each}
                  </p>
                {/if}
              </div>
              <button type="button" class="sem-geo-btn" onclick={() => openInGeo(semSelectedNode)}>
                <span>Lihat di Peta Geografis</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>

            <div class="sem-insp-cols">
              <div class="sem-insp-col">
                <h3>Koleksifikasi di bahasa Papua ({semNodeConnections.colex.length})</h3>
                {#if semNodeConnections.colex.length}
                  <ul class="sem-bridge-list">
                    {#each semNodeConnections.colex as item (item.node.n)}
                      <li>
                        <button type="button" class="sem-bridge-card" onclick={() => (semSelectedN = item.node.n)}>
                          <span class="sem-bridge-pair">
                            <strong>{semSelectedNode.id}</strong> ↔ <strong>{item.node.id}</strong>
                          </span>
                          <span class="sem-bridge-words">
                            {#each item.edge.examples.slice(0, 3) as ex, idx (ex.languageCode + ex.lemma)}
                              {#if idx > 0} · {/if}
                              <em>{ex.lemma}</em> ({ex.languageName})
                            {/each}
                          </span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <p class="sem-empty-note">
                    Belum ada kata publik yang menautkan “{semSelectedNode.id}” dengan konsep dasar lain. Ketika komunitas menambah entri Kamus publik, jembatan koleksifikasi muncul otomatis di sini.
                  </p>
                {/if}
              </div>

              <div class="sem-insp-col">
                <h3>Konsep terdekat secara semantik ({semNodeConnections.semantic.length})</h3>
                {#if semNodeConnections.semantic.length}
                  <div class="sem-near-chips">
                    {#each semNodeConnections.semantic.slice(0, 8) as item (item.node.n)}
                      <button type="button" class="sem-near-chip" onclick={() => (semSelectedN = item.node.n)}>
                        <span>{item.node.id}</span>
                        <small>{Math.round(item.edge.weight * 100)}%</small>
                      </button>
                    {/each}
                  </div>
                {:else}
                  <p class="sem-empty-note">Pilih konsep lain di peta untuk melihat tetangga maknanya.</p>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        {#if topColexHighlights.length}
          <div class="sem-highlights">
            <h3>Contoh jembatan makna nyata di bahasa Papua</h3>
            <div class="sem-hi-grid">
              {#each topColexHighlights as hi (hi.a.n + '-' + hi.b.n)}
                <button type="button" class="sem-hi-card" onclick={() => (semSelectedN = hi.a.n)}>
                  <strong>{hi.a.id} ↔ {hi.b.id}</strong>
                  <small>
                    {hi.edge.examples.slice(0, 2).map((ex) => `${ex.lemma} (${ex.languageName})`).join(', ')}
                  </small>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <p class="sem-footnote">
          Dibangun dari {semData.stats.publicEntriesUsed.toLocaleString('id-ID')} entri kamus publik tidak sensitif & sumber tertulis berlisensi ({semData.stats.languagesUsed} bahasa) menggunakan daftar {semData.source} ({semData.licence}). Ruang komunitas privat dan kata sensitif tidak pernah masuk ke peta ini.
        </p>
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</section>

<style>
  .peta-kata-page {
    display: grid;
    gap: 16px;
    padding: 18px 20px 44px;
    min-width: 0;
  }
  .pk-crumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--muted-foreground);
  }
  .pk-crumb a {
    color: inherit;
    text-decoration: none;
  }
  .pk-crumb a:hover {
    color: var(--foreground);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .pk-head {
    display: grid;
    gap: 12px;
  }
  .pk-title-block h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .pk-title-block p {
    margin: 6px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--muted-foreground);
    max-width: 66ch;
  }
  .pk-search {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 5px 6px 5px 14px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--muted-foreground);
  }
  .pk-search:focus-within {
    border-color: var(--brand, var(--foreground));
  }
  .pk-search input {
    border: 0;
    background: transparent;
    color: var(--foreground);
    font: inherit;
    font-size: 15px;
    outline: none;
    flex: 1;
    min-width: 0;
    min-height: 36px;
  }
  .pk-search button {
    border: 0;
    background: var(--foreground);
    color: var(--background);
    border-radius: 10px;
    padding: 7px 14px;
    font: inherit;
    font-size: 13.5px;
    font-weight: 650;
    cursor: pointer;
    flex: none;
  }

  .peta-kata-page :global(.pk-tabs) {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    gap: 4px;
    margin-bottom: 12px;
  }
  .peta-kata-page :global(.pk-tabs [data-slot='tabs-trigger']) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .peta-kata-page :global(.pk-pane) {
    display: grid;
    gap: 14px;
    min-width: 0;
  }

  .pk-chips-section {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .pk-chips-wrap {
    position: relative;
    min-width: 0;
    overflow: hidden;
  }
  .pk-chips-wrap:not(.expanded)::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 34px;
    background: linear-gradient(to right, transparent, var(--background));
    pointer-events: none;
  }
  .pk-chips {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 2px 34px 2px 0;
  }
  .pk-chips.expanded {
    flex-wrap: wrap;
    overflow-x: visible;
    padding-right: 0;
  }
  .pk-chip {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted-foreground);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
  }
  .pk-chip.has-data {
    color: var(--foreground);
  }
  .pk-chip.active {
    background: var(--foreground);
    color: var(--background);
    border-color: var(--foreground);
  }
  .pk-chip small {
    font-size: 11px;
    opacity: 0.72;
  }
  .pk-expand-btn {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--muted-foreground);
    font: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .pk-expand-btn:hover {
    color: var(--foreground);
  }
  .pk-expand-btn :global(svg.rot) {
    transform: rotate(180deg);
  }

  .pk-atlas-wrap,
  .sem-canvas-wrap {
    border: 1px solid var(--border);
    border-radius: 16px;
    background: color-mix(in oklab, var(--foreground) 2.2%, var(--background));
    padding: 12px;
    display: grid;
    gap: 10px;
    min-width: 0;
  }
  .pk-atlas {
    width: 100%;
    height: auto;
    display: block;
  }
  .pk-region {
    fill: color-mix(in oklab, var(--foreground) 6%, var(--background));
    stroke: var(--border);
    stroke-width: 1.2;
  }
  .pk-region-label {
    font-size: 11px;
    fill: var(--muted-foreground);
    text-anchor: middle;
    pointer-events: none;
    font-weight: 600;
    opacity: 0.75;
  }
  .pk-lang-dot {
    fill: color-mix(in oklab, var(--foreground) 28%, transparent);
  }
  .pk-hit {
    cursor: pointer;
  }
  .pk-hit-halo {
    fill: color-mix(in oklab, var(--brand, #0f766e) 22%, transparent);
  }
  .pk-hit-dot {
    fill: var(--brand, #0f766e);
    stroke: var(--background);
    stroke-width: 1.5;
  }
  .pk-hit.voiced .pk-hit-dot {
    fill: #d97706;
  }
  .pk-hit.voiced .pk-hit-halo {
    fill: rgba(217, 119, 6, 0.25);
  }
  .pk-hit-stem {
    stroke: var(--border);
    stroke-width: 1;
  }
  .pk-hit-pill {
    fill: color-mix(in oklab, var(--background) 92%, var(--foreground));
    stroke: var(--border);
    stroke-width: 1;
  }
  .pk-hit.selected .pk-hit-pill {
    stroke: var(--brand, #0f766e);
    stroke-width: 1.6;
  }
  .pk-hit-word {
    font-size: 11.5px;
    font-weight: 700;
    fill: var(--foreground);
  }
  .pk-legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--muted-foreground);
  }
  .pk-legend .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 5px;
    vertical-align: middle;
  }
  .pk-legend .dot.plain {
    background: color-mix(in oklab, var(--foreground) 32%, transparent);
  }
  .pk-legend .dot.match {
    background: var(--brand, #0f766e);
  }
  .pk-legend .dot.voiced {
    background: #d97706;
  }
  .pk-clear {
    margin-left: auto;
    border: 1px solid var(--border);
    background: var(--background);
    color: var(--foreground);
    border-radius: 999px;
    padding: 3px 10px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .pk-results-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .pk-results-head h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 750;
  }
  .pk-results-head small {
    font-weight: 500;
    color: var(--muted-foreground);
  }
  .pk-results-head span {
    font-size: 13px;
    color: var(--muted-foreground);
  }
  .pk-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .pk-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--card);
  }
  .pk-card-main {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .pk-card-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .pk-lemma {
    font-size: 17px;
    font-weight: 750;
  }
  .pk-pos,
  .pk-state {
    font-size: 11.5px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--muted-foreground);
  }
  .pk-gloss {
    margin: 0;
    font-size: 14px;
  }
  .pk-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--muted-foreground);
  }
  .pk-meta span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .pk-meta a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .pk-play {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--background);
    color: var(--foreground);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    flex: none;
  }
  .pk-play.playing {
    background: var(--brand, #0f766e);
    color: #fff;
    border-color: var(--brand, #0f766e);
  }
  .pk-status,
  .pk-empty {
    margin: 0;
    padding: 16px;
    border: 1px dashed var(--border);
    border-radius: 14px;
    color: var(--muted-foreground);
    font-size: 14px;
  }

  /* Peta Semantik styles */
  .sem-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .sem-mode-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .sem-pill {
    padding: 5px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted-foreground);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .sem-pill[aria-pressed='true'] {
    background: var(--foreground);
    color: var(--background);
    border-color: var(--foreground);
  }
  .sem-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    font-size: 12px;
    color: var(--muted-foreground);
  }
  .sem-clusters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .sem-cluster-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--foreground);
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
  }
  .sem-cluster-pill[aria-pressed='true'] {
    border-color: var(--foreground);
    background: color-mix(in oklab, var(--foreground) 8%, transparent);
    font-weight: 650;
  }
  .sem-cluster-pill small {
    color: var(--muted-foreground);
    font-size: 11px;
  }
  .sem-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
  }
  .sem-svg {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 12px;
    background: color-mix(in oklab, var(--foreground) 2.5%, var(--background));
  }
  .sem-edge {
    stroke: color-mix(in oklab, var(--foreground) 18%, transparent);
    stroke-width: 1;
    stroke-dasharray: 3 3;
    transition: opacity 0.15s ease;
  }
  .sem-edge.colex {
    stroke: #14b8a6;
    stroke-width: 1.75;
    stroke-dasharray: none;
    opacity: 0.78;
  }
  .sem-edge.focused {
    stroke-width: 2.3;
    opacity: 1;
  }
  .sem-edge.dim {
    opacity: 0.1;
  }
  .sem-node {
    cursor: pointer;
    transition: opacity 0.15s ease;
  }
  .sem-node.dim {
    opacity: 0.22;
  }
  .sem-label {
    font-size: 11px;
    font-weight: 600;
    fill: var(--foreground);
    pointer-events: none;
    paint-order: stroke;
    stroke: var(--background);
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .sem-label.strong {
    font-size: 12.5px;
    font-weight: 800;
  }
  .sem-line {
    display: inline-block;
    width: 18px;
    height: 0;
    margin-right: 6px;
    vertical-align: middle;
  }
  .sem-line.colex {
    border-top: 2.5px solid #14b8a6;
  }
  .sem-line.near {
    border-top: 1.5px dashed color-mix(in oklab, var(--foreground) 45%, transparent);
  }

  .sem-inspector {
    display: grid;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--card);
  }
  .sem-insp-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .sem-insp-title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .sem-insp-title-row h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    text-transform: capitalize;
  }
  .sem-insp-en {
    font-size: 14px;
    color: var(--muted-foreground);
  }
  .sem-insp-cluster {
    font-size: 12px;
    font-weight: 650;
    padding: 2px 9px;
    border-radius: 999px;
    background: color-mix(in oklab, var(--c) 16%, var(--background));
    color: var(--c);
  }
  .sem-insp-samples {
    margin: 6px 0 0;
    font-size: 13.5px;
    color: var(--muted-foreground);
  }
  .sem-geo-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--foreground);
    color: var(--background);
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }
  .sem-insp-cols {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  @media (min-width: 640px) {
    .sem-insp-cols {
      grid-template-columns: 1.25fr 1fr;
    }
  }
  .sem-insp-col {
    display: grid;
    gap: 8px;
    align-content: start;
  }
  .sem-insp-col h3 {
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--muted-foreground);
  }
  .sem-bridge-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .sem-bridge-card {
    width: 100%;
    text-align: left;
    display: grid;
    gap: 2px;
    padding: 9px 11px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--background);
    color: var(--foreground);
    font: inherit;
    cursor: pointer;
  }
  .sem-bridge-card:hover {
    border-color: #14b8a6;
  }
  .sem-bridge-pair {
    font-size: 13.5px;
  }
  .sem-bridge-words {
    font-size: 12.5px;
    color: var(--muted-foreground);
  }
  .sem-near-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .sem-near-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--background);
    color: var(--foreground);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .sem-near-chip small {
    color: var(--muted-foreground);
    font-size: 11px;
  }
  .sem-empty-note {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--muted-foreground);
  }
  .sem-highlights {
    display: grid;
    gap: 8px;
  }
  .sem-highlights h3 {
    margin: 0;
    font-size: 14.5px;
    font-weight: 750;
  }
  .sem-hi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
    gap: 8px;
  }
  .sem-hi-card {
    display: grid;
    gap: 2px;
    text-align: left;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    color: var(--foreground);
    font: inherit;
    cursor: pointer;
  }
  .sem-hi-card:hover {
    border-color: #14b8a6;
  }
  .sem-hi-card strong {
    font-size: 13.5px;
    font-weight: 700;
  }
  .sem-hi-card small {
    font-size: 12px;
    color: var(--muted-foreground);
  }
  .sem-footnote {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--muted-foreground);
  }
</style>
