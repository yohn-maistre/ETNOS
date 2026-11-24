<script lang="ts">
  import { onMount } from 'svelte'
  import { Volume2, Square, Search, BookOpen } from '@lucide/svelte'
  import { request } from './api'
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

  const REGION_NAMES: Record<string, string> = {
    domberai: 'Domberai',
    bomberai: 'Bomberai',
    saireri: 'Saireri',
    'mamta-tabi': 'Mamta / Tabi',
    meepago: 'Mee Pago',
    'la-pago': 'La Pago',
    'ha-anim': 'Ha Anim',
  }

  let concepts = $state<AtlasConcept[]>([])
  let activeConcept = $state<AtlasConcept | null>(null)
  let query = $state('')
  let words = $state<AtlasWord[]>([])
  let selectedSlug = $state<string | null>(null)
  let loading = $state(true)
  let error = $state('')
  let playingId = $state<string | null>(null)
  let audioEl: HTMLAudioElement | null = null

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

  const visibleWords = $derived(
    selectedSlug ? words.filter((w) => w.languageSlug === selectedSlug) : words,
  )

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

  onMount(() => {
    const sp = new URLSearchParams(location.search)
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
    void loadLookup({ q: query.trim() })
  }

  function pickConcept(c: AtlasConcept) {
    query = ''
    void loadLookup({ concept: String(c.n) })
  }
</script>

<section class="peta-kata-page">
  <header class="pk-head">
    <div>
      <h1>Peta Kata Tanah Papua</h1>
      <p>
        Pilih konsep dasar dari daftar Leipzig-Jakarta atau cari kata sendiri untuk melihat dan mendengar padanannya di berbagai bahasa Papua. Hanya kata publik dan tidak sensitif dari kamus komunitas serta sumber tertulis berlisensi yang tampil di sini.
      </p>
    </div>
    <form class="pk-search" onsubmit={submitSearch}>
      <label class="sr-only" for="pk-search-input">Cari kata atau makna</label>
      <Search size={16} aria-hidden="true" />
      <input
        id="pk-search-input"
        type="search"
        bind:value={query}
        placeholder="Cari makna atau kata (mis. air, api, rumah)…"
      />
      <button type="submit">Cari</button>
    </form>
  </header>

  {#if concepts.length}
    <div class="pk-chips" role="list" aria-label="Konsep dasar Leipzig-Jakarta">
      {#each concepts.slice(0, 32) as c (c.n)}
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
        {@const hits = wordsBySlug.get(slug)}
        {#if hits?.length}
          {@const hasVoice = hits.some((w) => !!w.voice)}
          <g
            class="pk-hit"
            class:selected={selectedSlug === slug}
            class:voiced={hasVoice}
            role="button"
            tabindex="0"
            aria-label={`${hits[0].languageName}: ${hits[0].lemma}`}
            onclick={() => (selectedSlug = selectedSlug === slug ? null : slug)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                selectedSlug = selectedSlug === slug ? null : slug
              }
            }}
          >
            <circle cx={x} cy={y} r={selectedSlug === slug ? 14 : 10} class="pk-hit-halo" />
            <circle cx={x} cy={y} r={5.5} class="pk-hit-dot" />
            <text x={x + 9} y={y + 4} class="pk-hit-word">{hits[0].lemma}</text>
          </g>
        {:else}
          <circle cx={x} cy={y} r={2.2} class="pk-lang-dot" />
        {/if}
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
        Komunitas bahasa bisa menambahkan kata dan rekaman suara lewat tab Kamus di ruang komunitasnya.
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
            <div class="pk-card-meta">
              {#if w.languageSlug}
                <a href={'/wiki/' + w.languageSlug}>{w.languageName}</a>
              {:else}
                <span>{w.languageName}</span>
              {/if}
              {#if w.communityId}
                <span>· <a href={'/communities/' + w.communityId + '?tab=kamus'}><BookOpen size={12} />{w.communityTitle}</a></span>
              {:else}
                <span>· {w.source.replace(/^seed:/, '')}</span>
              {/if}
              {#if w.licence}<span>· {w.licence}</span>{/if}
            </div>
          </div>
          {#if w.voice}
            <button
              type="button"
              class="pk-play"
              class:playing={playingId === w.voice.id}
              aria-label={`Putar pelafalan ${w.lemma}`}
              onclick={() => playVoice(w)}
            >
              {#if playingId === w.voice.id}
                <Square size={15} />Stop
              {:else}
                <Volume2 size={15} />Dengar
              {/if}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .peta-kata-page { max-width: 960px; margin: 0 auto; padding: 18px 16px 64px; display: flex; flex-direction: column; gap: 16px; }
  .pk-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 14px; }
  .pk-head h1 { margin: 4px 0 6px; font-size: 24px; line-height: 1.2; font-weight: 800; }
  .pk-head p { margin: 0; max-width: 58ch; font-size: 14px; color: var(--muted-foreground); line-height: 1.5; }
  .pk-search { display: flex; align-items: center; gap: 6px; padding: 4px 6px 4px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); min-width: min(100%, 300px); }
  .pk-search input { flex: 1; border: 0; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; outline: none; min-width: 0; }
  .pk-search button { padding: 7px 12px; border: 0; border-radius: 8px; background: var(--foreground); color: var(--background); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .pk-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .pk-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border: 1px solid var(--border); border-radius: 999px; background: var(--background); color: var(--foreground); font: inherit; font-size: 13px; cursor: pointer; }
  .pk-chip small { font-size: 11px; color: var(--muted-foreground); }
  .pk-chip.has-data { border-color: color-mix(in oklab, var(--brand) 38%, var(--border)); }
  .pk-chip.active { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .pk-chip.active small { color: var(--background); opacity: 0.8; }
  .pk-atlas-wrap { border: 1px solid var(--border); border-radius: 14px; background: var(--surface, var(--card)); padding: 12px; }
  .pk-atlas { width: 100%; height: auto; max-height: 400px; display: block; }
  .pk-region { fill: color-mix(in oklab, var(--foreground) 7%, var(--background)); stroke: var(--border); stroke-width: 1.4; }
  .pk-region-label { font-size: 18px; font-weight: 700; fill: var(--muted-foreground); opacity: 0.65; text-anchor: middle; pointer-events: none; }
  .pk-lang-dot { fill: var(--muted-foreground); opacity: 0.32; }
  .pk-hit { cursor: pointer; outline: none; }
  .pk-hit-halo { fill: color-mix(in oklab, var(--brand) 22%, transparent); }
  .pk-hit-dot { fill: var(--brand); stroke: var(--background); stroke-width: 1.5; }
  .pk-hit.voiced .pk-hit-dot { fill: #0d9488; }
  .pk-hit.voiced .pk-hit-halo { fill: color-mix(in oklab, #0d9488 26%, transparent); }
  .pk-hit.selected .pk-hit-dot { stroke: var(--foreground); stroke-width: 2.5; }
  .pk-hit-word { font-size: 18px; font-weight: 800; fill: var(--foreground); paint-order: stroke; stroke: var(--background); stroke-width: 4px; stroke-linejoin: round; }
  .pk-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 8px; font-size: 12px; color: var(--muted-foreground); }
  .pk-legend span { display: inline-flex; align-items: center; gap: 5px; }
  .pk-legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; }
  .pk-legend .dot.plain { background: var(--muted-foreground); opacity: 0.45; }
  .pk-legend .dot.match { background: var(--brand); }
  .pk-legend .dot.voiced { background: #0d9488; }
  .pk-clear { margin-left: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--background); color: var(--foreground); padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer; }
  .pk-results-head { display: flex; justify-content: space-between; align-items: baseline; }
  .pk-results-head h2 { margin: 0; font-size: 18px; font-weight: 800; }
  .pk-results-head small { font-weight: 500; color: var(--muted-foreground); }
  .pk-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
  .pk-card { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 13px 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--background); }
  .pk-card-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .pk-card-top { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .pk-lemma { font-size: 17px; font-weight: 800; }
  .pk-pos { font-size: 11px; font-style: italic; color: var(--muted-foreground); }
  .pk-state { font-size: 10.5px; font-weight: 600; padding: 1px 7px; border-radius: 999px; background: var(--muted); color: var(--muted-foreground); }
  .pk-gloss { margin: 0; font-size: 13.5px; color: var(--foreground); }
  .pk-card-meta { display: flex; flex-wrap: wrap; gap: 4px; font-size: 12px; color: var(--muted-foreground); }
  .pk-card-meta a { color: var(--brand); text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
  .pk-card-meta a:hover { text-decoration: underline; }
  .pk-play { flex: none; display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface, var(--muted)); color: var(--foreground); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .pk-play.playing { background: #0d9488; border-color: #0d9488; color: #fff; }
  .pk-status, .pk-empty { padding: 16px; border: 1px dashed var(--border); border-radius: 12px; font-size: 14px; color: var(--muted-foreground); }
</style>
