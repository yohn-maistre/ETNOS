<script lang="ts">
  // Peta Kata (/wiki/peta-kata, alias /peta-kata): one basic concept at a time, shown as the word for it in each
  // language of Tanah Papua at that language's point on the map. Words come from published wordlists (CC BY 4.0,
  // not yet checked by speakers) and from public community Kamus entries. Languages without data stay on the map
  // as faint rings, and nothing is filled in for them. A tap opens the language; up to three languages can be
  // compared side by side. Data loads per concept and per language, so a phone fetches only what it shows.
  // Papuan Voices forms are CC BY-NC 4.0: each one carries the visible label NC_LABEL wherever it is shown, and on
  // the map its word is set in italics with the same label in the legend.
  import { onMount, tick } from 'svelte'
  import { ArrowUpRight, Check, ChevronDown, Link2, Plus, Search, Square, Volume2, X } from '@lucide/svelte'
  import { request } from './api'
  import { fold } from './stage-layouts.ts'
  import PetaKataMap, { type WordPoint } from './PetaKataMap.svelte'
  import atlas from './papua-atlas.json'
  import LocalContextsNotices from './LocalContextsNotices.svelte'
  import { licenceLabel } from './licence.ts'
  import './styles/observatorium.css'
  import JelajahCrumbs from './JelajahCrumbs.svelte'

  type Concept = { key: string; id: string; english: string; concepticon: number; leipzigJakarta: number | null; count: number }
  type Lang = { code: string; slug: string; name: string; glottologName: string; family: string; concepts: number; community: { id: string; title: string } | null }
  type Dataset = { key: string; name: string; citation: string; url: string; licence: string; nonCommercial?: boolean }
  type Word = { lang: string; concept: string; form: string; value?: string; dataset: string; licence?: string; nc?: true; ref: number; variety?: string; param: string; row: string }
  const NC_LABEL = 'CC BY-NC 4.0 · tidak untuk penggunaan komersial'
  type CommunityWord = { id: string; lang: string; communityId: string; communityTitle: string; lemma: string; gloss: string; pos: string; state: 'checked' | 'seed' | 'proposed'; voice: { id: string; url: string; durationMs: number; speaker: string } | null }
  type Lookup = { concept: { key: string; id: string; english: string } | null; refs: string[]; words: Word[]; community: CommunityWord[] }
  type LangData = { language: Lang; refs: string[]; words: Word[]; community: CommunityWord[] }

  const REGIONS: [string, string][] = [
    ['domberai', 'Domberai'], ['bomberai', 'Bomberai'], ['saireri', 'Saireri'], ['mamta-tabi', 'Mamta / Tabi'],
    ['meepago', 'Mee Pago'], ['la-pago', 'La Pago'], ['ha-anim', 'Ha Anim'],
  ]
  const REGION_NAME: Record<string, string> = Object.fromEntries(REGIONS)
  const FEATURED = ['air', 'api', 'rumah', 'babi', 'matahari', 'batu', 'burung', 'kasuari', 'sagu', 'pisang', 'kepala', 'makan', 'satu', 'dua']
  const atlasLangs = atlas.langs as [string, number, number, string][]
  const POINT_BY_SLUG = new Map(atlasLangs.map(([slug, x, y, region]) => [slug, { x, y, region }]))

  let concepts = $state<Concept[]>([])
  let languages = $state<Lang[]>([])
  let datasets = $state<Dataset[]>([])
  let indexError = $state('')
  let conceptKey = $state('air')
  let lookups = $state<Record<string, Lookup>>({})
  let lookupError = $state('')
  let region = $state('')
  let selected = $state('')
  let compare = $state<string[]>([])
  let langData = $state<Record<string, LangData>>({})
  let langError = $state('')
  let view = $state<'peta' | 'makna'>('peta')
  let pickerOpen = $state(false)
  let conceptQuery = $state('')
  let showAllWords = $state(false)
  let showLangAll = $state(false)
  let showAllRows = $state(false)
  let addQuery = $state('')
  let playingId = $state<string | null>(null)
  let audio: HTMLAudioElement | null = null
  let card = $state<HTMLElement>()

  const conceptByKey = $derived(new Map(concepts.map((c) => [c.key, c])))
  const concept = $derived(conceptByKey.get(conceptKey) ?? null)
  const lookup = $derived(lookups[conceptKey] ?? null)
  const langByCode = $derived(new Map(languages.map((l) => [l.code, l])))
  const datasetByKey = $derived(new Map(datasets.map((d) => [d.key, d])))

  // The three families with the most languages get a colour each; every other family shares a neutral grey.
  const familySlots = $derived.by(() => {
    const n = new Map<string, number>()
    for (const l of languages) if (l.family) n.set(l.family, (n.get(l.family) ?? 0) + 1)
    return new Map([...n].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f], i) => [f, i + 1]))
  })

  const wordsByLang = $derived.by(() => {
    const m = new Map<string, Word[]>()
    for (const w of lookup?.words ?? []) m.set(w.lang, [...(m.get(w.lang) ?? []), w])
    return m
  })
  const communityByLang = $derived.by(() => {
    const m = new Map<string, CommunityWord[]>()
    for (const w of lookup?.community ?? []) m.set(w.lang, [...(m.get(w.lang) ?? []), w])
    return m
  })

  const points = $derived.by<WordPoint[]>(() =>
    languages.flatMap((l) => {
      const at = POINT_BY_SLUG.get(l.slug)
      if (!at) return []
      const com = communityByLang.get(l.code)?.[0], pub = wordsByLang.get(l.code)?.[0]
      const form = com?.lemma ?? show(pub?.form ?? '')
      return [{ code: l.code, name: l.name, x: at.x, y: at.y, region: at.region, slot: familySlots.get(l.family) ?? 0, form, richness: l.concepts, nc: !com && !!pub?.nc }]
    }),
  )
  const withWord = $derived(points.filter((p) => p.form).length)
  const inRegion = $derived(region ? points.filter((p) => p.region === region) : points)

  const legend = $derived.by(() => {
    const counts = [0, 0, 0, 0]
    let none = 0
    for (const p of inRegion) { if (p.form) counts[p.slot]!++; else none++ }
    const names = [...familySlots.entries()].sort((a, b) => a[1] - b[1]).map(([f]) => f)
    return { rows: [...names.map((f, i) => ({ slot: i + 1, label: 'Rumpun ' + f, count: counts[i + 1]! })), { slot: 0, label: 'Rumpun lain', count: counts[0]! }], none }
  })

  // The list under the map: every language that has a word for this concept, community words first.
  const rows = $derived.by(() => {
    const codes = new Set([...wordsByLang.keys(), ...communityByLang.keys()])
    const out = [...codes].map((code) => ({ lang: langByCode.get(code), code, words: wordsByLang.get(code) ?? [], community: communityByLang.get(code) ?? [] }))
    const regionOf = (code: string) => POINT_BY_SLUG.get(langByCode.get(code)?.slug ?? '')?.region ?? ''
    return out
      .filter((r) => !region || regionOf(r.code) === region)
      .sort((a, b) => Number(!b.community.length) - Number(!a.community.length) || (a.lang?.name ?? a.code).localeCompare(b.lang?.name ?? b.code, 'id'))
  })

  const selectedLang = $derived(selected ? langByCode.get(selected) ?? null : null)
  const selectedData = $derived(selected ? langData[selected] ?? null : null)

  const conceptMatches = $derived.by(() => {
    const q = fold(conceptQuery.trim())
    if (!q) return concepts
    return concepts.filter((c) => fold(c.id).includes(q) || fold(c.english).includes(q))
  })
  const featured = $derived.by(() => {
    const list = FEATURED.map((k) => conceptByKey.get(k)).filter((c): c is Concept => !!c)
    if (concept && !list.includes(concept)) list.unshift(concept)
    return list
  })
  const addMatches = $derived.by(() => {
    const q = fold(addQuery.trim())
    if (q.length < 2) return []
    return languages.filter((l) => !compare.includes(l.code) && (fold(l.name).includes(q) || fold(l.glottologName).includes(q))).slice(0, 6)
  })

  // Rows of the comparison table: concepts that at least one compared language has.
  const compareRows = $derived.by(() => {
    const ready = compare.map((c) => langData[c]).filter((d): d is LangData => !!d)
    if (!ready.length) return []
    const byLang = ready.map((d) => {
      const m = new Map<string, { text: string; nc: boolean }[]>()
      for (const w of d.words) m.set(w.concept, [...(m.get(w.concept) ?? []), { text: show(w.form), nc: !!w.nc }])
      for (const w of d.community) {
        const c = concepts.find((x) => fold(w.gloss).startsWith(fold(x.id)))
        if (c) m.set(c.key, [{ text: w.lemma, nc: false }, ...(m.get(c.key) ?? [])])
      }
      return m
    })
    return concepts
      .filter((c) => byLang.some((m) => m.has(c.key)))
      .map((c) => ({ concept: c, cells: byLang.map((m) => m.get(c.key) ?? []) }))
  })

  const fmt = (n: number) => n.toLocaleString('id-ID')
  const refText = (refs: string[], i: number) => refs[i] ?? ''
  const sourceLine = (w: Word, refs: string[]) => {
    const d = datasetByKey.get(w.dataset)
    const ref = refText(refs, w.ref)
    return [d ? `${d.name} (${d.licence})` : w.dataset, ref ? 'dari ' + ref : ''].filter(Boolean).join(', ')
  }
  const show = (form: string) => form.replace(/_/g, ' ')
  const detailLine = (w: Word, refs: string[]) =>
    [w.variety ? `Nama ragam di sumber ${w.variety}` : '', w.value && w.value !== w.form ? `Ditulis “${w.value}” di sumber` : '', sourceLine(w, refs)].filter(Boolean).join(' · ')
  const familyLine = (l: Lang | null | undefined, code: string) => {
    const reg = REGION_NAME[POINT_BY_SLUG.get(l?.slug ?? '')?.region ?? ''] ?? ''
    return [l?.family ? 'Rumpun ' + l.family : 'Rumpun belum diklasifikasikan', reg].filter(Boolean).join(' · ') || code
  }

  function syncUrl() {
    try {
      const url = new URL(location.href)
      const set = (k: string, v: string) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k))
      set('konsep', conceptKey === 'air' ? '' : conceptKey)
      set('bahasa', selected)
      set('banding', compare.join(','))
      set('wilayah', region)
      set('tampilan', view === 'makna' ? 'makna' : '')
      for (const old of ['concept', 'q', 'view', 'rumpun']) url.searchParams.delete(old)
      history.replaceState(history.state, '', url)
    } catch { /* convenience only */ }
  }

  async function loadConcept(key: string) {
    lookupError = ''
    if (lookups[key]) return
    try {
      const r = await request<Lookup>(`/v1/peta-kata?concept=${encodeURIComponent(key)}`, undefined, undefined, true)
      lookups = { ...lookups, [r.concept?.key ?? key]: r }
      if (r.concept && r.concept.key !== conceptKey) conceptKey = r.concept.key
    } catch (e) {
      lookupError = e instanceof Error ? e.message : 'Kata untuk konsep ini belum dapat dimuat.'
    }
  }

  async function loadLang(code: string) {
    langError = ''
    if (langData[code]) return
    try {
      const r = await request<LangData>(`/v1/peta-kata/bahasa/${encodeURIComponent(code)}`, undefined, undefined, true)
      langData = { ...langData, [code]: r }
    } catch (e) {
      langError = e instanceof Error ? e.message : 'Kata untuk bahasa ini belum dapat dimuat.'
    }
  }

  function pickConcept(key: string) {
    conceptKey = key
    pickerOpen = false
    conceptQuery = ''
    showAllWords = false
    void loadConcept(key)
    syncUrl()
  }

  async function pickLanguage(code: string, scroll = false) {
    selected = selected === code && !scroll ? '' : code
    showLangAll = false
    syncUrl()
    if (selected) {
      void loadLang(selected)
      if (scroll) { await tick(); card?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }) }
    }
  }

  function toggleCompare(code: string) {
    if (compare.includes(code)) compare = compare.filter((c) => c !== code)
    else if (compare.length < 3) { compare = [...compare, code]; void loadLang(code) }
    addQuery = ''
    syncUrl()
  }

  function setRegion(slug: string) {
    region = region === slug ? '' : slug
    syncUrl()
  }

  function setView(next: 'peta' | 'makna') {
    view = next
    syncUrl()
  }

  function openFromMakna(n: number) {
    const c = concepts.find((x) => x.leipzigJakarta === n)
    view = 'peta'
    if (c) pickConcept(c.key)
    else syncUrl()
    scrollTo({ top: 0, behavior: 'auto' })
  }

  // The address keeps the concept, language, comparison and region, so a copied link opens the same view.
  let shared = $state(false)
  let sharedTimer: ReturnType<typeof setTimeout> | undefined
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href)
      shared = true
      clearTimeout(sharedTimer)
      sharedTimer = setTimeout(() => (shared = false), 2400)
    } catch { /* clipboard refused: the address bar still holds the link */ }
  }

  function play(w: CommunityWord) {
    if (!w.voice) return
    if (playingId === w.voice.id && audio) { audio.pause(); playingId = null; return }
    audio?.pause()
    const a = new Audio(w.voice.url)
    audio = a
    playingId = w.voice.id
    a.onended = a.onerror = () => { if (playingId === w.voice?.id) playingId = null }
    void a.play().catch(() => { playingId = null })
  }

  onMount(() => {
    document.title = 'Peta Kata · Ensiklopedia · ETNOS'
    const sp = new URLSearchParams(location.search)
    const tampilan = sp.get('tampilan') ?? sp.get('view') ?? ''
    if (['makna', 'semantik', 'kelompok', 'koleksifikasi'].includes(tampilan)) view = 'makna'
    const w = sp.get('wilayah') ?? ''
    if (REGION_NAME[w]) region = w
    const initial = sp.get('konsep') ?? sp.get('concept') ?? 'air'
    conceptKey = initial
    const b = sp.get('bahasa') ?? ''
    const cmp = (sp.get('banding') ?? '').split(',').filter((c) => /^[a-z0-9]{8}$/.test(c)).slice(0, 3)
    compare = cmp
    for (const c of cmp) void loadLang(c)
    if (/^[a-z0-9]{8}$/.test(b)) { selected = b; void loadLang(b) }

    request<{ concepts: Concept[]; languages: Lang[]; datasets: Dataset[] }>('/v1/peta-kata/concepts', undefined, undefined, true)
      .then((r) => { concepts = r.concepts; languages = r.languages; datasets = r.datasets })
      .catch((e) => { indexError = e instanceof Error ? e.message : 'Daftar bahasa belum dapat dimuat.' })
    void loadConcept(initial)
    return () => audio?.pause()
  })
</script>

<div class="obs pk">
  <header class="obs-section obs-top pk-top">
    <JelajahCrumbs trail={[{ title: 'Bahasa', href: '/wiki/jenis/bahasa' }]} />
    <h1>Peta Kata</h1>
    <p class="obs-lede">Kata dasar dalam bahasa-bahasa Tanah Papua, di titik setiap bahasa. Kata diambil dari daftar kata terbitan dan dari kamus komunitas, dan sumber setiap kata dicantumkan.</p>
    <div class="pk-toprow">
      <div class="obs-pills" role="radiogroup" aria-label="Tampilan">
        <button type="button" role="radio" aria-checked={view === 'peta'} onclick={() => setView('peta')}>Peta kata</button>
        <button type="button" role="radio" aria-checked={view === 'makna'} onclick={() => setView('makna')}>Ruang makna</button>
      </div>
      <button type="button" class="pk-share" onclick={share} aria-label={shared ? 'Tautan disalin' : 'Salin tautan'}>{#if shared}<Check size={15} aria-hidden="true" />{:else}<Link2 size={15} aria-hidden="true" />{/if}<span class="pk-share-text">{shared ? 'Tautan disalin' : 'Salin tautan'}</span></button>
      <span class="sr-only" role="status">{shared ? 'Tautan halaman ini sudah disalin.' : ''}</span>
    </div>
  </header>

  {#if view === 'makna'}
    {#await import('./PetaKataMakna.svelte')}
      <section class="obs-section"><div class="obs-skeleton pk-hold-makna" aria-hidden="true"></div></section>
    {:then module}
      <module.default onOpenConcept={openFromMakna} />
    {/await}
  {:else}
    <section class="obs-section pk-concept" aria-labelledby="pk-concept-title">
      <div class="pk-picker">
        <div class="pk-scroller" role="group" aria-label="Pilih kata dasar">
          {#if concepts.length}
            {#each featured as c (c.key)}
              <button type="button" class="pk-pill" aria-pressed={c.key === conceptKey} onclick={() => pickConcept(c.key)}>{c.id}</button>
            {/each}
          {:else}
            {#each FEATURED.slice(0, 8) as k (k)}<span class="pk-pill pk-pill-ghost" aria-hidden="true">{k}</span>{/each}
          {/if}
        </div>
        <button type="button" class="pk-all" aria-expanded={pickerOpen} aria-controls="pk-all-concepts" onclick={() => (pickerOpen = !pickerOpen)} disabled={!concepts.length}>
          <span>Semua {concepts.length || 100} kata</span>
          <ChevronDown size={16} aria-hidden="true" class={pickerOpen ? 'pk-rot' : ''} />
        </button>
      </div>
      {#if pickerOpen}
        <div class="pk-panel" id="pk-all-concepts">
          <label class="obs-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" bind:value={conceptQuery} placeholder="Cari kata dasar, misalnya hujan" aria-label="Cari kata dasar" autocomplete="off" />
          </label>
          {#if conceptMatches.length}
            <ul class="pk-grid">
              {#each conceptMatches as c (c.key)}
                <li><button type="button" class="pk-pill" aria-pressed={c.key === conceptKey} onclick={() => pickConcept(c.key)}>{c.id}<small>{c.count}</small></button></li>
              {/each}
            </ul>
            <p class="obs-foot">Angka di samping kata adalah jumlah bahasa yang punya kata itu dalam data.</p>
          {:else}
            <p class="obs-note">Tidak ada kata dasar yang cocok. Daftar ini memuat 100 kata dasar, misalnya air, api dan rumah.</p>
          {/if}
        </div>
      {/if}

      <div class="pk-head">
        <h2 id="pk-concept-title">{concept?.id ?? lookup?.concept?.id ?? conceptKey} <small>{concept?.english ?? lookup?.concept?.english ?? ''}</small></h2>
        <p class="pk-count">
          {#if lookup && languages.length}
            Ada di {fmt(withWord)} dari {fmt(points.length)} bahasa. Titik pucat belum punya data untuk kata ini.
          {:else}
            <span class="pk-line-skel" aria-hidden="true"></span>
          {/if}
        </p>
      </div>

      <div class="pk-regions" role="group" aria-label="Perbesar ke wilayah adat">
        <button type="button" class="pk-pill pk-pill-sm" aria-pressed={!region} onclick={() => setRegion('')}>Semua wilayah</button>
        {#each REGIONS as [slug, label] (slug)}
          <button type="button" class="pk-pill pk-pill-sm" aria-pressed={region === slug} onclick={() => setRegion(slug)}>{label}</button>
        {/each}
      </div>

      <div class="pk-map" aria-busy={!lookup}>
        <PetaKataMap {atlas} {points} focus={region} {selected} {compare} onpick={(c) => pickLanguage(c)} />
        {#if indexError || lookupError}<p class="pk-map-note" role="alert">{indexError || lookupError}</p>{/if}
      </div>

      <ul class="pk-legend" aria-label="Arti warna titik">
        {#each legend.rows.filter((r) => r.count) as r (r.slot)}<li><i class="pk-dot f{r.slot}" aria-hidden="true"></i>{r.label} <small>{fmt(r.count)}</small></li>{/each}
        <li><i class="pk-ring" aria-hidden="true"></i>Belum ada data <small>{fmt(legend.none)}</small></li>
        {#if inRegion.some((p) => p.nc && p.form)}<li><span class="pk-nc-form">kata miring</span>Papuan Voices, {NC_LABEL}</li>{/if}
      </ul>

      <div class="pk-card-slot" bind:this={card}>
        {#if selectedLang}
          {@const pub = wordsByLang.get(selectedLang.code) ?? []}
          {@const com = communityByLang.get(selectedLang.code) ?? []}
          <article class="pk-card" aria-labelledby="pk-card-title">
            <div class="pk-card-head">
              <div>
                <h3 id="pk-card-title">{selectedLang.name}</h3>
                <p class="pk-meta">
                  {familyLine(selectedLang, selectedLang.code)}
                  {#if selectedLang.name !== selectedLang.glottologName} · Nama Glottolog {selectedLang.glottologName}{/if}
                </p>
              </div>
              <button type="button" class="pk-icon" aria-label="Tutup bahasa ini" onclick={() => pickLanguage(selectedLang.code)}><X size={18} /></button>
            </div>

            {#if com.length || pub.length}
              <ul class="pk-forms">
                {#each com as w (w.id)}
                  <li>
                    <span class="pk-form">{w.lemma}</span>
                    <span class="pk-tag" data-state={w.state}>{w.state === 'checked' ? 'Diperiksa komunitas' : 'Usulan anggota'}</span>
                    {#if w.voice}<button type="button" class="pk-play" aria-label={`Putar pelafalan ${w.lemma}`} onclick={() => play(w)}>{#if playingId === w.voice.id}<Square size={14} />Berhenti{:else}<Volume2 size={14} />Dengar{/if}</button>{/if}
                    <p class="pk-src">{w.gloss} · dari Kamus <a href={'/communities/' + w.communityId}>{w.communityTitle}</a></p>
                  </li>
                {/each}
                {#each pub as w (w.row)}
                  <li>
                    <span class="pk-form">{show(w.form)}</span>
                    <span class="pk-tag">Belum diperiksa penutur</span>
                    {#if w.nc}<span class="pk-tag pk-nc">{NC_LABEL}</span>{/if}
                    <p class="pk-src">{detailLine(w, lookup?.refs ?? [])}</p>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="obs-note">{selectedLang.concepts ? `Belum ada kata untuk “${concept?.id ?? conceptKey}” dalam bahasa ini. Bahasa ini punya ${selectedLang.concepts} dari 100 kata dasar dalam data.` : 'Belum ada kata dasar untuk bahasa ini dalam daftar terbitan yang dipakai. Penutur bisa menambahkannya lewat Kamus di komunitas bahasanya.'}</p>
            {/if}

            <div class="pk-actions">
              {#if selectedLang.concepts}
                <button type="button" class="pk-btn" aria-expanded={showLangAll} onclick={() => (showLangAll = !showLangAll)}>{showLangAll ? 'Tutup daftar kata' : `Semua ${selectedLang.concepts} kata`}</button>
              {/if}
              <button type="button" class="pk-btn" aria-pressed={compare.includes(selectedLang.code)} disabled={!compare.includes(selectedLang.code) && compare.length >= 3} onclick={() => toggleCompare(selectedLang.code)}>
                {compare.includes(selectedLang.code) ? 'Dibandingkan' : compare.length >= 3 ? 'Sudah tiga bahasa' : 'Bandingkan'}
              </button>
              {#if selectedLang.slug}<a class="pk-link" href={'/wiki/' + selectedLang.slug + '?tab=kamus'}>Kamus {selectedLang.name} <ArrowUpRight size={15} aria-hidden="true" /></a>{/if}
              {#if selectedLang.community}<a class="pk-link" href={'/communities/' + selectedLang.community.id}>{selectedLang.community.title} <ArrowUpRight size={15} aria-hidden="true" /></a>{/if}
            </div>
            {#if pub.length && selectedLang.community}
              <p class="obs-foot">Penutur bisa memeriksa dan membetulkan kata ini di Kamus komunitas {selectedLang.community.title}.</p>
            {:else if pub.length}
              <p class="obs-foot">Belum ada komunitas publik untuk bahasa ini. Kata ini bisa diperiksa penutur setelah komunitas bahasanya dibuat dan kamusnya dimulai.</p>
            {/if}

            {#if showLangAll}
              {#if selectedData}
                <ul class="pk-langlist">
                  {#each concepts as c (c.key)}
                    {@const ws = selectedData.words.filter((w) => w.concept === c.key)}
                    {#if ws.length}
                      <li><button type="button" class:on={c.key === conceptKey} onclick={() => pickConcept(c.key)}>{c.id}</button><span>{#each ws as w, i (w.row)}{i ? ', ' : ''}<span class:pk-nc-form={w.nc}>{show(w.form)}</span>{/each}</span></li>
                    {/if}
                  {/each}
                </ul>
                <p class="obs-foot">Semua kata ini dari daftar kata terbitan dan belum diperiksa penutur. Sumbernya {[...new Set(selectedData.words.map((w) => datasetByKey.get(w.dataset)?.name ?? w.dataset))].join(', ')}.</p>
                {#if selectedData.words.some((w) => w.nc)}<p class="obs-foot"><span class="pk-nc-form">Kata miring</span> berasal dari Papuan Voices, {NC_LABEL}.</p>{/if}
              {:else if langError}
                <p class="obs-note" role="alert">{langError}</p>
              {:else}
                <div class="obs-skeleton pk-hold-list" aria-hidden="true"></div>
              {/if}
            {/if}
          </article>
        {:else}
          <p class="pk-hint">Ketuk titik di peta, atau nama bahasa di daftar, untuk melihat kata dan sumbernya.</p>
        {/if}
      </div>
    </section>

    <section class="obs-section pk-compare" aria-labelledby="pk-compare-title">
      <div class="obs-head"><h2 id="pk-compare-title">Bandingkan bahasa</h2></div>
      {#if compare.length}
        <ul class="pk-chosen">
          {#each compare as code (code)}
            <li><span>{langByCode.get(code)?.name ?? code}</span><button type="button" class="pk-icon sm" aria-label={`Hapus ${langByCode.get(code)?.name ?? code} dari perbandingan`} onclick={() => toggleCompare(code)}><X size={15} /></button></li>
          {/each}
        </ul>
      {:else}
        <p class="obs-note">Pilih sampai tiga bahasa untuk melihat kata dasarnya berdampingan.</p>
      {/if}
      {#if compare.length < 3}
        <div class="pk-add">
          <label class="obs-search">
            <Plus size={16} aria-hidden="true" />
            <input type="search" bind:value={addQuery} placeholder="Tambah bahasa, misalnya Biak" aria-label="Tambah bahasa untuk dibandingkan" autocomplete="off" disabled={!languages.length} />
          </label>
          {#if addMatches.length}
            <ul class="pk-matches">
              {#each addMatches as l (l.code)}
                <li><button type="button" onclick={() => toggleCompare(l.code)}><span>{l.name}</span><small>{l.concepts ? `${l.concepts} kata` : 'belum ada data'}</small></button></li>
              {/each}
            </ul>
          {:else if addQuery.trim().length >= 2}
            <p class="obs-foot">Tidak ada bahasa dengan nama itu di katalog Tanah Papua.</p>
          {/if}
        </div>
      {/if}
      {#if compare.length}
        {#if compare.some((c) => !langData[c])}
          <div class="obs-skeleton pk-hold-list" aria-hidden="true"></div>
        {:else if compareRows.length}
          {@const visibleRows = showAllRows ? compareRows : compareRows.slice(0, 20)}
          <div class="pk-table-wrap">
            <table class="pk-table">
              <thead><tr><th scope="col">Kata dasar</th>{#each compare as code (code)}<th scope="col"><button type="button" class="pk-rowbtn pk-colbtn" onclick={() => pickLanguage(code, true)}>{langByCode.get(code)?.name ?? code}</button></th>{/each}</tr></thead>
              <tbody>
                {#each visibleRows as r (r.concept.key)}
                  <tr class:on={r.concept.key === conceptKey}>
                    <th scope="row"><button type="button" class="pk-rowbtn" onclick={() => pickConcept(r.concept.key)}>{r.concept.id}</button></th>
                    {#each r.cells as cell, i (compare[i])}<td>{#if cell.length}{#each cell as f, j (j)}{j ? ', ' : ''}<span class:pk-nc-form={f.nc}>{f.text}</span>{/each}{:else}<span class="pk-none">belum ada</span>{/if}</td>{/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          {#if compareRows.length > 20}
            <button type="button" class="pk-btn pk-more" onclick={() => (showAllRows = !showAllRows)}>{showAllRows ? 'Tampilkan 20 kata saja' : `Tampilkan semua ${compareRows.length} kata`}</button>
          {/if}
          <p class="obs-foot">Kata dari daftar kata terbitan, belum diperiksa penutur. Ketuk nama bahasa di kepala tabel untuk melihat sumber setiap kata.</p>
          {#if compareRows.some((r) => r.cells.some((c) => c.some((f) => f.nc)))}<p class="obs-foot"><span class="pk-nc-form">Kata miring</span> berasal dari Papuan Voices, {NC_LABEL}.</p>{/if}
        {:else}
          <p class="obs-note">Bahasa yang dipilih belum punya kata dasar dalam data.</p>
        {/if}
      {/if}
    </section>

    <section class="obs-section pk-words" aria-labelledby="pk-words-title">
      <div class="obs-head">
        <h2 id="pk-words-title">Semua kata untuk “{concept?.id ?? conceptKey}”</h2>
        {#if lookup}<span class="pk-count">{fmt(rows.length)} bahasa{region ? ' di ' + REGION_NAME[region] : ''}</span>{/if}
      </div>
      {#if lookupError}
        <p class="obs-note" role="alert">{lookupError}</p>
      {:else if !lookup}
        <ul class="obs-rows" aria-hidden="true">{#each Array(6) as _, i (i)}<li class="obs-row"><span class="pk-row-skel"></span></li>{/each}</ul>
      {:else if !rows.length}
        <p class="obs-note">Belum ada bahasa{region ? ' di ' + REGION_NAME[region] : ''} yang punya kata untuk “{concept?.id ?? conceptKey}” dalam data. Penutur bisa menambahkannya lewat Kamus di komunitas bahasanya.</p>
      {:else}
        <ul class="obs-rows pk-rows">
          {#each showAllWords ? rows : rows.slice(0, 24) as r (r.code)}
            <li>
              <button type="button" class="obs-row pk-row" class:sel={r.code === selected} onclick={() => pickLanguage(r.code, true)}>
                <span class="obs-row-main">
                  <span class="pk-row-top"><span class="obs-row-title">{r.lang?.name ?? r.code}</span><span class="pk-row-forms">{#each [...r.community.map((w) => ({ key: w.id, text: w.lemma, nc: false })), ...r.words.map((w) => ({ key: w.row, text: show(w.form), nc: !!w.nc }))] as f, i (f.key)}{i ? ', ' : ''}<span class:pk-nc-form={f.nc}>{f.text}</span>{/each}</span></span>
                  <span class="obs-row-meta">{familyLine(r.lang, r.code)} · {r.community.length ? 'Kamus komunitas' : [...new Set(r.words.map((w) => datasetByKey.get(w.dataset)?.name ?? w.dataset))].join(', ')}{#if r.words.some((w) => w.nc)} · {NC_LABEL}{/if}</span>
                </span>
                <i class="pk-dot f{familySlots.get(r.lang?.family ?? '') ?? 0}" aria-hidden="true"></i>
              </button>
            </li>
          {/each}
        </ul>
        {#if rows.length > 24}
          <button type="button" class="pk-btn pk-more" onclick={() => (showAllWords = !showAllWords)}>{showAllWords ? 'Tampilkan 24 bahasa saja' : `Tampilkan semua ${fmt(rows.length)} bahasa`}</button>
        {/if}
      {/if}
    </section>

    <footer class="obs-section pk-sources" aria-labelledby="pk-sources-title">
      <h2 id="pk-sources-title" class="pk-h3">Sumber</h2>
      <p class="obs-foot">Kata dari daftar kata terbitan disalin seperti tertulis di sumbernya dan belum diperiksa penutur. Kata dari kamus komunitas hanya diambil dari komunitas publik, tanpa kata yang ditandai jangan disebarkan. Nama konsep dalam bahasa Indonesia ditulis untuk ETNOS.</p>
      <ul class="pk-cites">
        {#each datasets as d (d.key)}<li><a href={d.url} target="_blank" rel="noopener">{d.citation}</a> Lisensi {licenceLabel(d.licence)}.</li>{/each}
        <li>Titik bahasa dari Glottolog 5.4 (CC BY 4.0). Titik itu menandai letak acuan, bukan batas wilayah bahasa.</li>
      </ul>
      <div class="pk-lc"><LocalContextsNotices keys={['etnos', ...datasets.map((d) => d.key)]} /></div>
    </footer>
  {/if}
</div>

<style>
  .pk { padding-bottom: 24px; overflow-x: clip; }
  .pk-top { gap: 12px; }
  .pk-toprow { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
  .pk-share { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; min-width: 140px; justify-content: center; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
  .pk-share:hover { background: var(--row-hover); }
  @media (max-width: 420px) { .pk-share { min-width: 44px; width: 44px; padding: 0; } .pk-share-text { display: none; } }

  .pk-concept { gap: 16px; }
  .pk-picker { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .pk-scroller { display: flex; gap: 6px; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; padding: 2px 24px 2px 0; mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); }
  .pk-scroller::-webkit-scrollbar { display: none; }
  .pk-pill { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 15px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; font-weight: 550; white-space: nowrap; cursor: pointer; }
  .pk-pill:hover { background: var(--row-hover); }
  .pk-pill[aria-pressed='true'] { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .pk-pill small { font-size: 12.5px; opacity: 0.65; font-variant-numeric: tabular-nums; }
  .pk-pill-ghost { color: transparent; background: color-mix(in oklab, var(--foreground) 5%, var(--background)); border-color: transparent; }
  .pk-pill-sm { min-height: 36px; padding: 0 13px; font-size: 13.5px; }
  .pk-all { flex: none; display: inline-flex; align-items: center; gap: 4px; min-height: 40px; padding: 0 12px 0 14px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .pk-all:hover { background: var(--row-hover); }
  .pk-all:disabled { color: var(--muted-foreground); cursor: default; }
  .pk-all :global(.pk-rot) { transform: rotate(180deg); }
  .pk-panel { display: grid; gap: 12px; padding: 14px; border: 1px solid var(--border); border-radius: 16px; background: color-mix(in oklab, var(--foreground) 2.5%, var(--background)); }
  .pk-grid { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; max-height: 320px; overflow-y: auto; }

  .pk-head { display: grid; gap: 4px; margin-top: 4px; }
  .pk-head h2 { font-size: 34px; }
  .pk-head h2 small { font-size: 16px; font-weight: 500; letter-spacing: 0; color: var(--muted-foreground); }
  @media (max-width: 767px) { .pk-head h2 { font-size: 30px; } }
  .pk-count { margin: 0; min-height: 1.4em; font-size: 14.5px; line-height: 1.4; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .pk-line-skel { display: inline-block; width: min(320px, 80%); height: 0.9em; border-radius: 6px; background: color-mix(in oklab, var(--foreground) 7%, var(--background)); vertical-align: middle; }

  .pk-regions { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 0 calc(var(--gutter) * -1); padding: 2px var(--gutter); }
  .pk-regions::-webkit-scrollbar { display: none; }
  .pk-map { position: relative; }
  .pk-map-note { position: absolute; left: 12px; right: 12px; bottom: 12px; margin: 0; padding: 10px 12px; border-radius: 12px; background: var(--background); box-shadow: 0 0 0 1px var(--border); font-size: 14px; color: var(--foreground); }

  .pk-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: -4px 0 0; padding: 0; list-style: none; font-size: 13.5px; color: var(--foreground); }
  .pk-legend li { display: inline-flex; align-items: center; gap: 7px; }
  .pk-legend small { font-size: 13px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .pk-dot { flex: none; width: 10px; height: 10px; border-radius: 50%; background: var(--pk-other); }
  .pk-dot.f1 { background: var(--pk-f1); }
  .pk-dot.f2 { background: var(--pk-f2); }
  .pk-dot.f3 { background: var(--pk-f3); }
  .pk-ring { flex: none; width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid color-mix(in oklab, var(--foreground) 35%, transparent); }

  .pk-card-slot { scroll-margin: 80px; }
  .pk-hint { margin: 0; padding: 14px 16px; border: 1px dashed var(--border); border-radius: 14px; font-size: 14.5px; line-height: 1.45; color: var(--muted-foreground); }
  .pk-card { display: grid; gap: 14px; padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: color-mix(in oklab, var(--foreground) 2.5%, var(--background)); }
  .pk-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .pk-card h3 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.015em; }
  .pk-meta { margin: 3px 0 0; font-size: 13.5px; line-height: 1.4; color: var(--muted-foreground); }
  .pk-icon { flex: none; display: grid; place-items: center; width: 44px; height: 44px; margin: -8px -8px 0 0; border: 0; border-radius: 999px; background: transparent; color: var(--muted-foreground); cursor: pointer; }
  .pk-icon:hover { background: var(--row-hover); color: var(--foreground); }
  .pk-icon.sm { width: 36px; height: 36px; margin: 0; }
  .pk-forms { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
  .pk-forms li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
  .pk-form { font-size: 24px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.15; overflow-wrap: anywhere; }
  .pk-tag { display: inline-flex; align-items: center; min-height: 24px; padding: 0 9px; border-radius: 999px; border: 1px solid var(--border); font-size: 12.5px; color: var(--muted-foreground); }
  .pk-lc { margin-top: 18px; }
  .pk-nc { color: var(--foreground); border-style: dashed; }
  .pk-nc-form { font-style: italic; }
  .pk-legend .pk-nc-form { font-weight: 600; }
  .pk-tag[data-state='checked'] { border-color: transparent; background: color-mix(in oklab, var(--brand, var(--foreground)) 12%, var(--background)); color: var(--foreground); }
  .pk-src { flex-basis: 100%; margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .pk-src a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  .pk-play { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; background: var(--background); color: var(--foreground); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
  .pk-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .pk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 16px; border: 1px solid var(--border); border-radius: 999px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .pk-btn:hover:not(:disabled) { background: color-mix(in oklab, var(--foreground) 4%, var(--background)); }
  .pk-btn[aria-pressed='true'] { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .pk-btn:disabled { color: var(--muted-foreground); cursor: default; }
  .pk-link { display: inline-flex; align-items: center; gap: 5px; min-height: 44px; padding: 0 6px; color: var(--foreground); font-size: 14px; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in oklab, currentColor 35%, transparent); }
  .pk-langlist { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; columns: 1; }
  @media (min-width: 640px) { .pk-langlist { grid-template-columns: 1fr 1fr; column-gap: 20px; } }
  .pk-langlist li { display: flex; align-items: baseline; gap: 10px; min-height: 40px; padding: 6px 0; border-top: 1px solid var(--border); font-size: 15px; }
  .pk-langlist button { flex: none; min-width: 84px; min-height: 28px; padding: 0; border: 0; background: none; color: var(--muted-foreground); font: inherit; font-size: 13.5px; text-align: left; cursor: pointer; }
  .pk-langlist button:hover, .pk-langlist button.on { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .pk-langlist span { font-weight: 650; overflow-wrap: anywhere; }

  .pk-compare { gap: 14px; }
  .pk-chosen { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .pk-chosen li { display: inline-flex; align-items: center; gap: 2px; min-height: 40px; padding: 0 2px 0 14px; border-radius: 999px; background: var(--foreground); color: var(--background); font-size: 14px; font-weight: 650; }
  .pk-chosen .pk-icon { color: inherit; }
  .pk-chosen .pk-icon:hover { background: color-mix(in oklab, var(--background) 18%, transparent); color: inherit; }
  .pk-add { display: grid; gap: 6px; max-width: 420px; }
  .pk-matches { display: grid; margin: 0; padding: 4px; list-style: none; border: 1px solid var(--border); border-radius: 12px; background: var(--background); }
  .pk-matches button { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 44px; padding: 0 10px; border: 0; border-radius: 8px; background: transparent; color: var(--foreground); font: inherit; font-size: 15px; text-align: left; cursor: pointer; }
  .pk-matches button:hover { background: var(--row-hover); }
  .pk-matches small { font-size: 13px; color: var(--muted-foreground); }
  .pk-table-wrap { overflow-x: auto; margin: 0 calc(var(--gutter) * -1); padding: 0 var(--gutter); }
  .pk-table { width: 100%; border-collapse: collapse; font-size: 15px; }
  .pk-table th, .pk-table td { padding: 8px 10px 8px 0; border-top: 1px solid var(--border); text-align: left; vertical-align: baseline; }
  .pk-table thead th { border-top: 0; font-size: 13.5px; font-weight: 700; color: var(--foreground); }
  .pk-table td { font-weight: 650; overflow-wrap: anywhere; min-width: 80px; }
  .pk-table tr.on th, .pk-table tr.on td { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .pk-rowbtn { min-height: 32px; padding: 0; border: 0; background: none; color: var(--muted-foreground); font: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer; }
  .pk-rowbtn:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .pk-colbtn { color: var(--foreground); font-weight: 700; font-size: 13.5px; }
  .pk-none { font-weight: 400; font-size: 13.5px; color: var(--muted-foreground); }
  .pk-more { justify-self: start; }

  .pk-row { width: calc(100% + var(--gutter) * 2); border: 0; background: transparent; font: inherit; text-align: left; cursor: pointer; }
  .pk-row:hover { background: var(--row-hover); }
  .pk-row.sel { background: color-mix(in oklab, var(--foreground) 6%, transparent); }
  .pk-row-top { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
  .pk-row-forms { font-size: 16px; font-weight: 500; overflow-wrap: anywhere; }
  .pk-row-skel { display: block; width: 100%; height: 38px; border-radius: 10px; background: color-mix(in oklab, var(--foreground) 5%, var(--background)); }
  .pk-hold-makna { height: 480px; }
  .pk-hold-list { height: 160px; }

  .pk-sources { gap: 10px; }
  .pk .pk-h3 { font-size: 16px; font-weight: 700; letter-spacing: -0.012em; }
  .pk-cites { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); max-width: 68ch; }
  .pk-cites a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  @media (prefers-reduced-motion: no-preference) { .pk-line-skel, .pk-row-skel { animation: obs-pulse 1.4s ease-in-out infinite alternate; } }
</style>
