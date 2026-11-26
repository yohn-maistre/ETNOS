<script lang="ts">
  // Peta Bahasa & Semantik Tanah Papua (/wiki/peta-kata, alias /peta-kata):
  // Shares the exact interactive Canvas stage, 3D orbit controls, sunflower cluster discs, segmented lens bar,
  // interactive bottom legend, and full-screen option of Peta Pengetahuan (KnowledgeExplorer / MapStage).
  import { onMount } from 'svelte'
  import {
    ArrowUpRight,
    BookOpen,
    ChevronDown,
    ChevronRight,
    Maximize2,
    Search,
    Sparkles,
    Square,
    Volume2,
    X,
  } from '@lucide/svelte'
  import { request } from './api'
  import { loadIndex, type EntryIndex } from './entri'
  import { fold, pathRings } from './stage-layouts.ts'
  import { appearance } from './appearance.svelte'
  import LanguageStage, { type AtlasPoint, type LangLens, type SemLink, type SemPoint } from './LanguageStage.svelte'
  import atlas from './papua-atlas.json'
  import './styles/observatorium.css'

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
    z: number
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
    languages: { code: string; name: string; entries: number }[]
    clusters: SemanticCluster[]
    nodes: SemanticNode[]
    edges: SemanticEdge[]
  }

  const LENS_TABS: { key: LangLens; label: string }[] = [
    { key: 'peta', label: 'Peta bahasa' },
    { key: 'rumpun', label: 'Rumpun bahasa' },
    { key: 'semantik', label: 'Ruang semantik 3D' },
    { key: 'kelompok', label: 'Kelompok makna' },
  ]

  const LENS_LEDE: Record<LangLens, string> = {
    peta: '256 titik bahasa Tanah Papua dari Glottolog di atas tujuh wilayah adat. Pilih konsep dasar untuk melihat padanan kata dan rekaman suaranya.',
    rumpun: 'Ke-256 bahasa yang sama dikelompokkan menurut rumpun bahasa Glottolog. Bahasa yang punya kata untuk konsep terpilih tetap menyala di dalam rumpunnya.',
    semantik: '100 konsep dasar dalam ruang semantik 3D yang bisa diputar. Garis hijau solid adalah koleksifikasi nyata (satu kata Papua menyatukan dua makna), garis putus-putus adalah kedekatan semantik.',
    kelompok: 'Konsep dasar yang sama ditata ke dalam kelompok makna Leiden. Ketuk satu titik untuk menyorot jembatan koleksifikasi antar kelompok.',
  }

  const REGIONS: { slug: string; label: string }[] = [
    { slug: '', label: 'Semua Papua' },
    { slug: 'domberai', label: 'Domberai' },
    { slug: 'bomberai', label: 'Bomberai' },
    { slug: 'saireri', label: 'Saireri' },
    { slug: 'mamta-tabi', label: 'Mamta / Tabi' },
    { slug: 'meepago', label: 'Mee Pago' },
    { slug: 'la-pago', label: 'La Pago' },
    { slug: 'ha-anim', label: 'Ha Anim' },
  ]
  const REGION_NAME = new Map(REGIONS.map((r) => [r.slug, r.label]))

  const FAMILY_PALETTE_LIGHT = ['#0f766e', '#2563eb', '#b45309', '#9333ea', '#be123c', '#15803d', '#4f46e5', '#64748b']
  const FAMILY_PALETTE_DARK = ['#2dd4bf', '#60a5fa', '#fbbf24', '#c084fc', '#fb7185', '#4ade80', '#818cf8', '#94a3b8']

  let lens = $state<LangLens>('peta')
  let fullScreen = $state(false)
  let threeD = $state(true)
  let region = $state('')
  let filterQuery = $state('')
  let hiddenFamilies = $state(new Set<string>())
  let hiddenClusters = $state(new Set<string>())
  let onlyWithWords = $state(false)
  let colexOnly = $state(false)
  let semLangCode = $state('')

  let index = $state<EntryIndex | null>(null)
  let concepts = $state<AtlasConcept[]>([])
  let showAllConcepts = $state(false)
  let activeConcept = $state<AtlasConcept | null>(null)
  let wordSearch = $state('')
  let words = $state<AtlasWord[]>([])
  let loadingWords = $state(true)
  let wordsError = $state('')

  let selectedAtlas = $state('')
  let selectedSem = $state('')

  let semData = $state<SemanticMapData | null>(null)
  let semLoading = $state(false)
  let semError = $state('')

  let playingId = $state<string | null>(null)
  let audioEl: HTMLAudioElement | null = null

  const dark = $derived(appearance.theme === 'dark')
  const isSemantic = $derived(lens === 'semantik' || lens === 'kelompok')

  const atlasRegionsRaw = Object.entries(atlas.regions as Record<string, { d: string; x: number; y: number }>)
  const atlasRings = atlasRegionsRaw.map(([key, r]) => ({
    key,
    label: REGION_NAME.get(key) ?? key,
    x: r.x,
    y: r.y,
    rings: pathRings(r.d),
  }))
  const atlasBox = atlas.box as [number, number, number, number]
  const atlasLangsRaw = atlas.langs as [string, number, number, string][]

  const langEntryBySlug = $derived.by(() => {
    const m = new Map<string, { title: string; familyKey: string; familyLabel: string; article: boolean }>()
    for (const e of index?.entries ?? []) {
      if (e.kind !== 'bahasa') continue
      m.set(e.slug, {
        title: e.title,
        familyKey: e.subKey || 'lainnya',
        familyLabel: e.sub || 'Lainnya & isolat',
        article: e.article,
      })
    }
    return m
  })

  const wordsBySlug = $derived.by(() => {
    const m = new Map<string, AtlasWord[]>()
    for (const w of words) {
      if (!w.languageSlug) continue
      m.set(w.languageSlug, [...(m.get(w.languageSlug) ?? []), w])
    }
    return m
  })

  // Top 6 families + "Lainnya & isolat" bucket so 256 languages stay crisp and legible in both map & sunflower discs.
  const topFamilyKeys = $derived.by(() => {
    const counts = new Map<string, { key: string; label: string; count: number }>()
    for (const [slug] of atlasLangsRaw) {
      const meta = langEntryBySlug.get(slug)
      const k = meta?.familyKey || 'lainnya'
      const l = meta?.familyLabel || 'Lainnya & isolat'
      const prev = counts.get(k)
      if (prev) prev.count++
      else counts.set(k, { key: k, label: l, count: 1 })
    }
    const sorted = [...counts.values()]
      .filter((x) => x.key !== 'lainnya')
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'id'))
    return sorted.slice(0, 6)
  })

  const topFamilySet = $derived(new Set(topFamilyKeys.map((f) => f.key)))

  const atlasPoints = $derived.by<AtlasPoint[]>(() =>
    atlasLangsRaw.map(([slug, x, y, reg]) => {
      const meta = langEntryBySlug.get(slug)
      const rawKey = meta?.familyKey || 'lainnya'
      const bucketKey = topFamilySet.has(rawKey) ? rawKey : 'lainnya'
      const bucketLabel = topFamilySet.has(rawKey) ? (meta?.familyLabel ?? 'Lainnya & isolat') : 'Lainnya & isolat'
      const hits = wordsBySlug.get(slug)
      return {
        id: slug,
        title: meta?.title ?? slug.replace(/^bahasa-/, '').replace(/-/g, ' '),
        familyKey: bucketKey,
        familyLabel: meta?.familyLabel ?? bucketLabel,
        region: reg,
        x,
        y,
        hasArticle: meta?.article ?? false,
        word: hits?.[0]?.lemma,
        hasVoice: hits?.some((w) => !!w.voice) ?? false,
      }
    }),
  )

  const atlasFamilies = $derived.by(() => {
    const pal = dark ? FAMILY_PALETTE_DARK : FAMILY_PALETTE_LIGHT
    const counts = new Map<string, number>()
    for (const p of atlasPoints) counts.set(p.familyKey, (counts.get(p.familyKey) ?? 0) + 1)
    const out = topFamilyKeys.map((f, idx) => ({
      key: f.key,
      label: f.label,
      color: pal[idx % (pal.length - 1)]!,
      count: counts.get(f.key) ?? 0,
    }))
    const otherCount = counts.get('lainnya') ?? 0
    if (otherCount > 0) {
      out.push({ key: 'lainnya', label: 'Lainnya & isolat', color: pal[pal.length - 1]!, count: otherCount })
    }
    return out
  })

  const atlasPointById = $derived(new Map(atlasPoints.map((p) => [p.id, p])))
  const selectedAtlasPoint = $derived(selectedAtlas ? atlasPointById.get(selectedAtlas) ?? null : null)

  // Semantic points & links (optionally filtered to a specific language)
  const semNodesFiltered = $derived.by(() => {
    if (!semData) return []
    if (!semLangCode) return semData.nodes
    return semData.nodes.map((n) => ({
      ...n,
      samples: n.samples.filter((s) => s.languageCode === semLangCode),
    }))
  })

  const semByN = $derived(new Map(semNodesFiltered.map((n) => [n.n, n])))
  const semById = $derived(new Map(semNodesFiltered.map((n) => [String(n.n), n])))
  const semClusterColor = $derived(new Map((semData?.clusters ?? []).map((c) => [c.id, c.color])))
  const semClusterLabel = $derived(new Map((semData?.clusters ?? []).map((c) => [c.id, c.label])))

  const semPoints = $derived<SemPoint[]>(
    semNodesFiltered.map((n) => ({
      id: String(n.n),
      n: n.n,
      title: n.id,
      english: n.english,
      x: n.x,
      y: n.y,
      z: n.z ?? 0,
      cluster: n.cluster,
      colexDegree: n.colexDegree,
      wordsCount: n.wordsCount,
    })),
  )

  const semLinks = $derived.by<SemLink[]>(() => {
    if (!semData) return []
    const idxByN = new Map(semNodesFiltered.map((n, i) => [n.n, i]))
    const out: SemLink[] = []
    for (const e of semData.edges) {
      if (semLangCode && e.kind === 'colexification' && !e.examples.some((ex) => ex.languageCode === semLangCode)) continue
      const a = idxByN.get(e.source)
      const b = idxByN.get(e.target)
      if (a === undefined || b === undefined) continue
      out.push({ a, b, kind: e.kind, weight: e.weight })
    }
    return out
  })

  const selectedSemNode = $derived(selectedSem ? semById.get(selectedSem) ?? null : null)

  const semConnections = $derived.by(() => {
    if (!semData || !selectedSemNode) {
      return {
        colex: [] as { node: SemanticNode; edge: SemanticEdge }[],
        semantic: [] as { node: SemanticNode; edge: SemanticEdge }[],
      }
    }
    const targetN = selectedSemNode.n
    const colex: { node: SemanticNode; edge: SemanticEdge }[] = []
    const semantic: { node: SemanticNode; edge: SemanticEdge }[] = []
    for (const edge of semData.edges) {
      if (edge.source !== targetN && edge.target !== targetN) continue
      if (semLangCode && edge.kind === 'colexification' && !edge.examples.some((ex) => ex.languageCode === semLangCode)) continue
      const other = semByN.get(edge.source === targetN ? edge.target : edge.source)
      if (!other) continue
      if (edge.kind === 'colexification') colex.push({ node: other, edge })
      else semantic.push({ node: other, edge })
    }
    colex.sort((a, b) => b.edge.weight - a.edge.weight)
    semantic.sort((a, b) => b.edge.weight - a.edge.weight)
    return { colex, semantic }
  })

  const topColexHighlights = $derived.by(() => {
    if (!semData) return []
    return semData.edges
      .filter((e) => e.kind === 'colexification' && e.examples.length && (!semLangCode || e.examples.some((ex) => ex.languageCode === semLangCode)))
      .slice(0, 8)
      .map((e) => ({ edge: e, a: semByN.get(e.source), b: semByN.get(e.target) }))
      .filter((x): x is { edge: SemanticEdge; a: SemanticNode; b: SemanticNode } => !!x.a && !!x.b)
  })

  // Live canvas search highlights
  const matches = $derived.by(() => {
    const q = fold(filterQuery.trim())
    if (q.length < 2) return null
    if (!isSemantic) {
      return new Set(
        atlasPoints
          .filter((p) =>
            fold(p.title).includes(q) ||
            fold(p.familyLabel).includes(q) ||
            fold(REGION_NAME.get(p.region) ?? p.region).includes(q) ||
            (p.word && fold(p.word).includes(q)),
          )
          .map((p) => p.id),
      )
    }
    return new Set(
      semNodesFiltered
        .filter((n) =>
          fold(n.id).includes(q) ||
          fold(n.english).includes(q) ||
          n.samples.some((s) => fold(s.lemma).includes(q) || fold(s.languageName).includes(q)),
        )
        .map((n) => String(n.n)),
    )
  })

  const visibleWords = $derived.by(() => {
    let rows = words
    if (selectedAtlas) rows = rows.filter((w) => w.languageSlug === selectedAtlas)
    if (region) {
      rows = rows.filter((w) => {
        const pt = w.languageSlug ? atlasPointById.get(w.languageSlug) : undefined
        return !pt || pt.region === region
      })
    }
    if (hiddenFamilies.size) {
      rows = rows.filter((w) => {
        const pt = w.languageSlug ? atlasPointById.get(w.languageSlug) : undefined
        return !pt || !hiddenFamilies.has(pt.familyKey)
      })
    }
    return rows
  })

  async function loadLookup(params: { concept?: string; q?: string }) {
    loadingWords = true
    wordsError = ''
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
      wordsError = e instanceof Error ? e.message : 'Peta kata belum dapat dimuat.'
    } finally {
      loadingWords = false
    }
  }

  async function loadSemantic() {
    if (semData || semLoading) return
    semLoading = true
    semError = ''
    try {
      const data = await request<SemanticMapData>('/v1/peta-kata/semantic', undefined, undefined, true)
      semData = data
      const richest = [...data.nodes].sort((a, b) => b.colexDegree - a.colexDegree || b.wordsCount - a.wordsCount)[0]
      if (!selectedSem && richest) selectedSem = String(richest.n)
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
    if (audioEl) { audioEl.pause(); audioEl = null }
    const a = new Audio(w.voice.url)
    audioEl = a
    playingId = w.voice.id
    a.onended = () => { if (playingId === w.voice?.id) playingId = null }
    a.onerror = () => { if (playingId === w.voice?.id) playingId = null }
    void a.play().catch(() => { playingId = null })
  }

  function chooseLens(next: LangLens) {
    lens = next
    try {
      const url = new URL(location.href)
      if (next === 'peta') url.searchParams.delete('tampilan')
      else url.searchParams.set('tampilan', next)
      history.replaceState(history.state, '', url)
    } catch { /* convenience */ }
  }

  function toggleLegend(key: string) {
    if (!isSemantic) {
      const next = new Set(hiddenFamilies)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      hiddenFamilies = next
    } else {
      const next = new Set(hiddenClusters)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      hiddenClusters = next
    }
  }

  function onFilterKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && filterQuery) {
      e.preventDefault()
      filterQuery = ''
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (matches?.size) {
        const first = [...matches][0]!
        if (isSemantic) selectedSem = first
        else selectedAtlas = first
      } else if (!isSemantic && filterQuery.trim()) {
        wordSearch = filterQuery.trim()
        void loadLookup({ q: wordSearch })
      }
    }
  }

  function pickConcept(c: AtlasConcept) {
    wordSearch = ''
    selectedAtlas = ''
    void loadLookup({ concept: String(c.n) })
  }

  function openConceptInAtlas(node: SemanticNode) {
    wordSearch = ''
    selectedAtlas = ''
    chooseLens('peta')
    void loadLookup({ concept: String(node.n) })
  }

  function portal(node: HTMLElement) {
    document.body.appendChild(node)
    return { destroy() { node.remove() } }
  }

  function onWindowKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && fullScreen) {
      e.preventDefault()
      fullScreen = false
    }
  }

  $effect(() => {
    if (isSemantic && !semData && !semLoading) void loadSemantic()
  })

  onMount(() => {
    document.title = 'Peta Bahasa & Semantik · Ensiklopedia · ETNOS'
    const sp = new URLSearchParams(location.search)
    const rawView = sp.get('tampilan') ?? sp.get('view') ?? ''
    if (rawView === 'rumpun' || rawView === 'semantik' || rawView === 'kelompok') lens = rawView
    else if (rawView === 'koleksifikasi') { lens = 'semantik'; colexOnly = true }

    const initRegion = sp.get('wilayah') ?? ''
    if (REGIONS.some((r) => r.slug === initRegion)) region = initRegion

    const initFamily = sp.get('rumpun') ?? ''
    const initConcept = sp.get('concept') ?? ''
    const initQ = sp.get('q') ?? ''
    if (initQ) { filterQuery = initQ; wordSearch = initQ }

    void loadIndex().then((i) => {
      index = i
      if (initFamily && topFamilySet.has(initFamily)) {
        // Focus just the requested family by hiding the others
        const others = new Set(atlasFamilies.map((f) => f.key).filter((k) => k !== initFamily))
        if (others.size) hiddenFamilies = others
      }
    }).catch(() => {})

    void request<{ concepts: AtlasConcept[] }>('/v1/peta-kata/concepts', undefined, undefined, true)
      .then((r) => { concepts = r.concepts })
      .catch(() => {})
    void loadLookup(initQ ? { q: initQ } : { concept: initConcept || 'air' })
    // Preload semantic data quietly so switching to Ruang semantik 3D is instant
    void loadSemantic()

    return () => { audioEl?.pause() }
  })
</script>

<svelte:window onkeydown={onWindowKey} />

<div class="obs pk-page">
  <header class="obs-section obs-top pk-top">
    <nav class="pk-crumb" aria-label="Jejak halaman">
      <a href="/wiki">Ensiklopedia</a>
      <ChevronRight size={14} aria-hidden="true" />
      <a href="/wiki/jenis/bahasa">Bahasa</a>
      <ChevronRight size={14} aria-hidden="true" />
      <span>Peta Bahasa & Semantik</span>
    </nav>

    <div class="obs-head">
      <h1>Peta Bahasa & Semantik</h1>
      <button type="button" class="pk-full-btn" onclick={() => (fullScreen = true)}>
        <Maximize2 size={15} aria-hidden="true" />
        <span>Layar penuh</span>
      </button>
    </div>

    <div class="pk-controls">
      <div class="obs-pills pk-lenses" role="radiogroup" aria-label="Susunan peta bahasa">
        {#each LENS_TABS as t (t.key)}
          <button
            type="button"
            role="radio"
            aria-checked={lens === t.key}
            onclick={() => chooseLens(t.key)}
          >
            {t.label}
          </button>
        {/each}
      </div>

      <label class="obs-search pk-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          bind:value={filterQuery}
          onkeydown={onFilterKeydown}
          placeholder={isSemantic ? 'Cari konsep atau kata Papua…' : 'Cari bahasa, rumpun, wilayah, atau kata…'}
          aria-label="Cari di peta bahasa"
          autocomplete="off"
        />
        {#if filterQuery}
          <button type="button" class="pk-clear-x" onclick={() => { filterQuery = ''; if (wordSearch) { wordSearch = ''; void loadLookup({ concept: String(activeConcept?.n ?? 'air') }) } }} aria-label="Hapus pencarian">
            <X size={15} />
          </button>
        {/if}
      </label>
    </div>

    <p class="obs-lede pk-lede">{LENS_LEDE[lens]}</p>
    {#if matches}
      <p class="pk-found" role="status">
        {matches.size ? `${matches.size} titik cocok di peta. Tekan Enter untuk memilih.` : 'Tidak ada titik yang cocok; tekan Enter untuk mencari di daftar kata.'}
      </p>
    {/if}

    <!-- Contextual filter tools -->
    <div class="pk-tools">
      {#if !isSemantic}
        <div class="pk-region-wrap">
          <div class="pk-regions" role="group" aria-label="Saring wilayah adat">
            {#each REGIONS as r (r.slug)}
              <button
                type="button"
                class="pk-reg-pill"
                aria-pressed={region === r.slug}
                onclick={() => (region = r.slug)}
              >
                {r.label}
              </button>
            {/each}
          </div>
        </div>
        <button type="button" class="obs-toggle" aria-pressed={onlyWithWords} onclick={() => (onlyWithWords = !onlyWithWords)}>
          Hanya yang punya kata ({words.length})
        </button>
      {:else}
        <button type="button" class="obs-toggle" aria-pressed={colexOnly} onclick={() => (colexOnly = !colexOnly)}>
          Hanya koleksifikasi Papua ({semData?.stats.colexificationEdges ?? 0})
        </button>
        {#if (semData?.languages.length ?? 0) > 1}
          <label class="pk-lang-select">
            <span class="sr-only">Saring bahasa</span>
            <select bind:value={semLangCode}>
              <option value="">Semua bahasa ({semData?.languages.length})</option>
              {#each semData?.languages ?? [] as l (l.code)}
                <option value={l.code}>{l.name} ({l.entries})</option>
              {/each}
            </select>
          </label>
        {/if}
        {#if semData}
          <span class="pk-mode-badge">
            <Sparkles size={13} aria-hidden="true" />
            <span>{semData.mode === 'bge-m3' ? 'Embedding multilingual (bge-m3)' : 'Proyeksi leksikal-struktural'}</span>
          </span>
        {/if}
      {/if}
    </div>

    {#if !isSemantic && concepts.length}
      <div class="pk-concepts">
        <div class="pk-chips-wrap" class:expanded={showAllConcepts}>
          <div class="pk-chips" class:expanded={showAllConcepts} role="list" aria-label="Konsep dasar Leipzig-Jakarta">
            {#each (showAllConcepts ? concepts : concepts.slice(0, 22)) as c (c.n)}
              <button
                type="button"
                class="pk-chip"
                class:active={activeConcept?.n === c.n && !wordSearch}
                class:has-data={c.count > 0}
                onclick={() => pickConcept(c)}
              >
                <span>{c.id}</span>
                {#if c.count > 0}<small>{c.count}</small>{/if}
              </button>
            {/each}
          </div>
        </div>
        <button type="button" class="pk-expand-btn" aria-expanded={showAllConcepts} onclick={() => (showAllConcepts = !showAllConcepts)}>
          <span>{showAllConcepts ? 'Ringkas konsep' : `Semua ${concepts.length} konsep`}</span>
          <ChevronDown size={14} class={showAllConcepts ? 'rot' : ''} aria-hidden="true" />
        </button>
      </div>
    {/if}
  </header>

  <!-- Main Stage (matches MapStage / KnowledgeExplorer) -->
  <section class="pk-stage-section" aria-label="Kanvas interaktif peta bahasa">
    {#if isSemantic && semError}
      <p role="alert" class="pk-status">{semError}</p>
    {:else if isSemantic && (semLoading || !semData)}
      <div class="obs-skeleton pk-stage-hold" aria-hidden="true"></div>
      <p class="pk-status">Menyusun ruang semantik 3D dan koleksifikasi bahasa Papua…</p>
    {:else if !fullScreen}
      <LanguageStage
        {lens}
        {atlasPoints}
        {atlasFamilies}
        {atlasRings}
        {atlasBox}
        {semPoints}
        {semLinks}
        semClusters={semData?.clusters ?? []}
        selected={isSemantic ? selectedSem : selectedAtlas}
        hidden={isSemantic ? hiddenClusters : hiddenFamilies}
        {region}
        {matches}
        {colexOnly}
        {onlyWithWords}
        bind:threeD
        label="Peta bahasa dan ruang semantik Tanah Papua"
        onSelect={(id) => { if (isSemantic) selectedSem = id; else selectedAtlas = id }}
      />
    {/if}

    <!-- Interactive Legend (identical grammar to KnowledgeExplorer) -->
    {#if !isSemantic}
      <ul class="obs-legend pk-legend" aria-label="Rumpun bahasa, menurut warna">
        {#each atlasFamilies as f (f.key)}
          <li>
            <button
              type="button"
              aria-pressed={!hiddenFamilies.has(f.key)}
              onclick={() => toggleLegend(f.key)}
            >
              <span class="dot" style:background={f.color}></span>
              {f.label} <small>{f.count}</small>
            </button>
          </li>
        {/each}
      </ul>
      <div class="pk-key-row">
        <span><i class="key-dot match"></i>Ada kata untuk konsep terpilih</span>
        <span><i class="key-dot voice"></i>Ada rekaman suara</span>
        {#if selectedAtlas}
          <button type="button" class="pk-reset-sel" onclick={() => (selectedAtlas = '')}>Tampilkan semua bahasa</button>
        {/if}
      </div>
    {:else if semData}
      <ul class="obs-legend pk-legend" aria-label="Kelompok makna Leiden">
        {#each semData.clusters as c (c.id)}
          <li>
            <button
              type="button"
              aria-pressed={!hiddenClusters.has(String(c.id))}
              onclick={() => toggleLegend(String(c.id))}
            >
              <span class="dot" style:background={c.color}></span>
              {c.label} <small>{c.count}</small>
            </button>
          </li>
        {/each}
      </ul>
      <div class="pk-key-row">
        <span><i class="key-line colex"></i>Koleksifikasi nyata (kata Papua yang sama)</span>
        <span><i class="key-line near"></i>Kedekatan semantik</span>
      </div>
    {/if}
  </section>

  <!-- Contextual Inspector & Detail Section -->
  {#if !isSemantic}
    <section class="obs-section pk-detail" aria-label="Daftar kata dan detail bahasa">
      {#if selectedAtlasPoint}
        <div class="pk-insp-card">
          <div class="pk-insp-head">
            <div>
              <h2>{selectedAtlasPoint.title}</h2>
              <p class="pk-insp-sub">
                {selectedAtlasPoint.familyLabel} · {REGION_NAME.get(selectedAtlasPoint.region) ?? selectedAtlasPoint.region}
              </p>
            </div>
            <div class="pk-insp-actions">
              <a class="pk-insp-link" href={`/wiki/${selectedAtlasPoint.id}`}>
                <span>Buka halaman bahasa</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <button type="button" class="pk-clear-x" onclick={() => (selectedAtlas = '')} aria-label="Tutup pilihan bahasa">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if wordsError}
        <p role="alert" class="pk-status">{wordsError}</p>
      {:else if loadingWords}
        <p class="pk-status">Memuat kata dari Tanah Papua…</p>
      {:else if !visibleWords.length}
        <div class="pk-empty">
          <p>
            Belum ada kata publik untuk <strong>{wordSearch || activeConcept?.id || 'pilihan ini'}</strong>{selectedAtlasPoint ? ` dalam bahasa ${selectedAtlasPoint.title}` : ''}.
            Komunitas bahasa dapat menambahkan kata dan rekaman suara lewat tab Kamus di ruang komunitasnya.
          </p>
        </div>
      {:else}
        <div class="obs-head">
          <h2>
            {#if activeConcept && !wordSearch}
              “{activeConcept.id}” <small>({activeConcept.english})</small>
            {:else}
              Hasil untuk “{wordSearch}”
            {/if}
          </h2>
          <span class="pk-count">{visibleWords.length} entri</span>
        </div>
        <ul class="pk-word-list">
          {#each visibleWords as w (w.id)}
            <li class="pk-word-card">
              <div class="pk-word-main">
                <div class="pk-word-top">
                  <strong class="pk-lemma">{w.lemma}</strong>
                  {#if w.pos}<span class="pk-tag">{w.pos}</span>{/if}
                  <span class="pk-tag">{w.origin === 'seed' ? 'Sumber tertulis' : w.state === 'checked' ? 'Diperiksa komunitas' : 'Usulan'}</span>
                </div>
                <p class="pk-gloss">{w.gloss}</p>
                <div class="pk-word-meta">
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
    </section>
  {:else if semData}
    <section class="obs-section pk-detail" aria-label="Detail konsep dan koleksifikasi">
      {#if selectedSemNode}
        <div class="pk-insp-card">
          <div class="pk-insp-head">
            <div>
              <div class="pk-sem-title-row">
                <h2 class="cap">{selectedSemNode.id}</h2>
                <span class="pk-sem-en">{selectedSemNode.english}</span>
                <span class="pk-sem-cluster" style={`--c:${semClusterColor.get(selectedSemNode.cluster) ?? '#14b8a6'}`}>
                  {semClusterLabel.get(selectedSemNode.cluster) ?? 'Kelompok'}
                </span>
              </div>
              {#if selectedSemNode.samples.length}
                <p class="pk-insp-sub">
                  Contoh kata:
                  {#each selectedSemNode.samples.slice(0, 5) as s, i (s.languageCode + s.lemma)}
                    {#if i > 0}, {/if}
                    <strong>{s.lemma}</strong> ({s.languageName})
                  {/each}
                </p>
              {/if}
            </div>
            <button type="button" class="pk-insp-link solid" onclick={() => openConceptInAtlas(selectedSemNode)}>
              <span>Lihat di Peta bahasa</span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </div>

          <div class="pk-sem-cols">
            <div class="pk-sem-col">
              <h3>Koleksifikasi di bahasa Papua ({semConnections.colex.length})</h3>
              {#if semConnections.colex.length}
                <ul class="pk-bridge-list">
                  {#each semConnections.colex as item (item.node.n)}
                    <li>
                      <button type="button" class="pk-bridge-card" onclick={() => (selectedSem = String(item.node.n))}>
                        <span><strong>{selectedSemNode.id}</strong> ↔ <strong>{item.node.id}</strong></span>
                        <small>
                          {#each item.edge.examples.slice(0, 3) as ex, idx (ex.languageCode + ex.lemma)}
                            {#if idx > 0} · {/if}
                            <em>{ex.lemma}</em> ({ex.languageName})
                          {/each}
                        </small>
                      </button>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="obs-note">Belum ada kata publik yang menautkan “{selectedSemNode.id}” dengan konsep dasar lain.</p>
              {/if}
            </div>

            <div class="pk-sem-col">
              <h3>Konsep terdekat secara semantik ({semConnections.semantic.length})</h3>
              {#if semConnections.semantic.length}
                <div class="pk-near-chips">
                  {#each semConnections.semantic.slice(0, 10) as item (item.node.n)}
                    <button type="button" class="pk-near-chip" onclick={() => (selectedSem = String(item.node.n))}>
                      <span>{item.node.id}</span>
                      <small>{Math.round(item.edge.weight * 100)}%</small>
                    </button>
                  {/each}
                </div>
              {:else}
                <p class="obs-note">Ketuk konsep lain di ruang 3D untuk melihat tetangga maknanya.</p>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      {#if topColexHighlights.length}
        <div class="pk-hi-block">
          <h3>Contoh jembatan makna nyata di bahasa Papua</h3>
          <div class="pk-hi-grid">
            {#each topColexHighlights as hi (hi.a.n + '-' + hi.b.n)}
              <button type="button" class="pk-hi-card" onclick={() => (selectedSem = String(hi.a.n))}>
                <strong>{hi.a.id} ↔ {hi.b.id}</strong>
                <small>{hi.edge.examples.slice(0, 2).map((ex) => `${ex.lemma} (${ex.languageName})`).join(', ')}</small>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <p class="obs-foot">
        Dibangun dari {semData.stats.publicEntriesUsed.toLocaleString('id-ID')} entri kamus publik tidak sensitif & sumber tertulis berlisensi ({semData.stats.languagesUsed} bahasa) menggunakan daftar {semData.source} ({semData.licence}). Ruang komunitas privat dan kata sensitif tidak pernah masuk ke peta ini.
      </p>
    </section>
  {/if}
</div>

<!-- Full-screen overlay (matches KnowledgeMapPage.svelte) -->
{#if fullScreen}
  <div class="pk-fs obs" use:portal role="dialog" aria-modal="true" aria-label="Peta Bahasa & Semantik layar penuh">
    <header class="pk-fs-bar">
      <button type="button" class="pk-fs-close" onclick={() => (fullScreen = false)}>
        <X size={18} aria-hidden="true" />
        <span>Tutup</span>
      </button>
      <h1>Peta Bahasa & Semantik</h1>
      <div class="obs-pills pk-lenses" role="radiogroup" aria-label="Susunan peta bahasa">
        {#each LENS_TABS as t (t.key)}
          <button type="button" role="radio" aria-checked={lens === t.key} onclick={() => chooseLens(t.key)}>{t.label}</button>
        {/each}
      </div>
    </header>
    <div class="pk-fs-stage">
      <LanguageStage
        {lens}
        {atlasPoints}
        {atlasFamilies}
        {atlasRings}
        {atlasBox}
        {semPoints}
        {semLinks}
        semClusters={semData?.clusters ?? []}
        selected={isSemantic ? selectedSem : selectedAtlas}
        hidden={isSemantic ? hiddenClusters : hiddenFamilies}
        {region}
        {matches}
        {colexOnly}
        {onlyWithWords}
        bind:threeD
        height="fill"
        label="Peta bahasa dan ruang semantik Tanah Papua layar penuh"
        onSelect={(id) => { if (isSemantic) selectedSem = id; else selectedAtlas = id }}
      />
    </div>
  </div>
{/if}

<style>
  .pk-page { padding-bottom: 24px; overflow-x: clip; }
  .pk-top { gap: 12px; padding-bottom: 10px; }
  .pk-top > * { min-width: 0; }
  .pk-crumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted-foreground); }
  .pk-crumb a { color: inherit; text-decoration: none; }
  .pk-crumb a:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .pk-full-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 13px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
  .pk-full-btn:hover { background: var(--row-hover); }

  .pk-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; min-width: 0; }
  .pk-lenses { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; max-width: 100%; }
  .pk-lenses::-webkit-scrollbar { display: none; }
  .pk-search { flex: 1 1 220px; border-radius: 999px; }
  .pk-search input { min-height: 40px; font-size: 15px; }
  .pk-clear-x { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 999px; background: transparent; color: var(--muted-foreground); cursor: pointer; }
  .pk-clear-x:hover { background: var(--row-hover); color: var(--foreground); }
  .pk-lede { min-height: 2.8em; }
  .pk-found { margin: -4px 0 0; font-size: 13px; color: var(--muted-foreground); }

  .pk-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: 38px; min-width: 0; }
  .pk-region-wrap { position: relative; min-width: 0; max-width: 100%; overflow: hidden; }
  .pk-region-wrap::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 26px; background: linear-gradient(to right, transparent, var(--background)); pointer-events: none; }
  .pk-regions { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 1px 28px 1px 0; }
  .pk-reg-pill { flex: none; min-height: 32px; padding: 0 11px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--muted-foreground); font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer; }
  .pk-reg-pill:hover { color: var(--foreground); background: var(--row-hover); }
  .pk-reg-pill[aria-pressed='true'] { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .pk-lang-select select { min-height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; background: var(--background); color: var(--foreground); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .pk-mode-badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--border); font-size: 12.5px; color: var(--muted-foreground); }

  .pk-concepts { display: grid; gap: 6px; min-width: 0; }
  .pk-chips-wrap { position: relative; min-width: 0; overflow: hidden; }
  .pk-chips-wrap:not(.expanded)::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 32px; background: linear-gradient(to right, transparent, var(--background)); pointer-events: none; }
  .pk-chips { display: flex; flex-wrap: nowrap; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 2px 32px 2px 0; }
  .pk-chips.expanded { flex-wrap: wrap; overflow-x: visible; padding-right: 0; }
  .pk-chip { flex: none; display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--muted-foreground); font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }
  .pk-chip.has-data { color: var(--foreground); }
  .pk-chip.active { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .pk-chip small { font-size: 11px; opacity: 0.72; }
  .pk-expand-btn { justify-self: start; display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--muted-foreground); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .pk-expand-btn:hover { color: var(--foreground); }
  .pk-expand-btn :global(svg.rot) { transform: rotate(180deg); }

  .pk-stage-section { display: grid; gap: 10px; padding: 6px var(--gutter) 18px; min-width: 0; }
  .pk-stage-hold { height: 460px; }
  .pk-legend { margin-top: 2px; }
  .pk-key-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 12.5px; color: var(--muted-foreground); }
  .key-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  .key-dot.match { background: #14b8a6; }
  .key-dot.voice { background: #d97706; }
  .key-line { display: inline-block; width: 18px; height: 0; margin-right: 6px; vertical-align: middle; }
  .key-line.colex { border-top: 2.5px solid #14b8a6; }
  .key-line.near { border-top: 1.5px dashed color-mix(in oklab, var(--foreground) 45%, transparent); }
  .pk-reset-sel { margin-left: auto; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--foreground); font: inherit; font-size: 12px; cursor: pointer; }

  .pk-detail { gap: 14px; }
  .pk-detail h2 { font-size: 20px; }
  .pk-detail h2 small { font-weight: 500; color: var(--muted-foreground); }
  .pk-count { font-size: 13px; color: var(--muted-foreground); }

  .pk-insp-card { display: grid; gap: 14px; padding: 15px 16px; border: 1px solid var(--border); border-radius: 16px; background: color-mix(in oklab, var(--foreground) 2.2%, var(--background)); }
  .pk-insp-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .pk-insp-head h2 { margin: 0; font-size: 19px; font-weight: 800; }
  .pk-insp-head h2.cap { text-transform: capitalize; }
  .pk-insp-sub { margin: 4px 0 0; font-size: 13.5px; color: var(--muted-foreground); }
  .pk-insp-actions { display: flex; align-items: center; gap: 6px; }
  .pk-insp-link { display: inline-flex; align-items: center; gap: 5px; min-height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font: inherit; font-size: 13px; font-weight: 650; text-decoration: none; cursor: pointer; }
  .pk-insp-link.solid { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .pk-insp-link:hover { opacity: 0.9; }

  .pk-word-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .pk-word-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid var(--border); border-radius: 14px; background: var(--background); }
  .pk-word-main { display: grid; gap: 4px; min-width: 0; }
  .pk-word-top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .pk-lemma { font-size: 17px; font-weight: 750; }
  .pk-tag { font-size: 11.5px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted-foreground); }
  .pk-gloss { margin: 0; font-size: 14px; }
  .pk-word-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted-foreground); }
  .pk-word-meta span { display: inline-flex; align-items: center; gap: 4px; }
  .pk-word-meta a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
  .pk-play { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; flex: none; }
  .pk-play.playing { background: var(--brand, #0f766e); color: #fff; border-color: var(--brand, #0f766e); }

  .pk-sem-title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .pk-sem-en { font-size: 14px; color: var(--muted-foreground); }
  .pk-sem-cluster { font-size: 12px; font-weight: 650; padding: 2px 9px; border-radius: 999px; background: color-mix(in oklab, var(--c) 16%, var(--background)); color: var(--c); }
  .pk-sem-cols { display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media (min-width: 640px) { .pk-sem-cols { grid-template-columns: 1.25fr 1fr; } }
  .pk-sem-col { display: grid; gap: 8px; align-content: start; }
  .pk-sem-col h3 { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--muted-foreground); }
  .pk-bridge-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .pk-bridge-card { width: 100%; text-align: left; display: grid; gap: 2px; padding: 9px 11px; border: 1px solid var(--border); border-radius: 12px; background: var(--background); color: var(--foreground); font: inherit; font-size: 13.5px; cursor: pointer; }
  .pk-bridge-card:hover { border-color: #14b8a6; }
  .pk-bridge-card small { font-size: 12.5px; color: var(--muted-foreground); }
  .pk-near-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .pk-near-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font: inherit; font-size: 13px; cursor: pointer; }
  .pk-near-chip small { color: var(--muted-foreground); font-size: 11px; }

  .pk-hi-block { display: grid; gap: 8px; }
  .pk-hi-block h3 { margin: 0; font-size: 14.5px; font-weight: 750; }
  .pk-hi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 8px; }
  .pk-hi-card { display: grid; gap: 2px; text-align: left; padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--background); color: var(--foreground); font: inherit; cursor: pointer; }
  .pk-hi-card:hover { border-color: #14b8a6; }
  .pk-hi-card strong { font-size: 13.5px; font-weight: 700; }
  .pk-hi-card small { font-size: 12px; color: var(--muted-foreground); }

  .pk-status, .pk-empty { margin: 0; padding: 14px 16px; border: 1px dashed var(--border); border-radius: 14px; color: var(--muted-foreground); font-size: 14px; }

  /* Full-screen dialog */
  .pk-fs { position: fixed; inset: 0; z-index: 45; display: flex; flex-direction: column; background: var(--background); color: var(--foreground); }
  .pk-fs-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; min-height: 60px; padding: 8px var(--gutter); border-bottom: 1px solid var(--border); }
  .pk-fs-bar h1 { margin: 0; font-size: 18px !important; margin-right: auto; }
  .pk-fs-close { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 13px 0 10px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .pk-fs-close:hover { background: var(--row-hover); }
  .pk-fs-stage { flex: 1; min-height: 0; }
</style>
