<script lang="ts">
  // The Kamus tab of a language's entry page (/wiki/<slug>?tab=kamus), the one home of that language's words
  // (docs/plan/bahasa-consolidation-2026-11-28.md). Four parts, each with its source and state:
  // - words from the Kamus of public communities (never private ones, never words marked sensitive), with the
  //   community named; words that a community loaded from a published list are left out, as on Peta Kata;
  // - the basic wordlist from published datasets, not yet checked by speakers;
  // - other written sources of the language's seed, such as Steltenpool 1969 for Ekari, with their licence;
  // - the communities whose Kamus is in this language.
  // NonCommercial sources carry their label wherever they show (src/licence.ts on the server).
  import { ArrowUpRight, Search, Square, Volume2 } from '@lucide/svelte'
  import { request } from './api'
  import { licenceLabel, NC_LABEL } from './licence.ts'
  import LocalContextsNotices from './LocalContextsNotices.svelte'

  type Word = { concept: string; form: string; value?: string; dataset: string; licence?: string; nc?: true; ref: number; variety?: string; row: string }
  type Dataset = { key: string; name: string; citation: string; url: string; licence: string; nonCommercial?: boolean }
  type CommunityWord = { id: string; communityId: string; communityTitle: string; lemma: string; gloss: string; state: 'checked' | 'seed' | 'proposed'; voice: { id: string; url: string } | null }
  type LangData = { concepts: { key: string; id: string; english: string }[]; datasets: Dataset[]; refs: string[]; words: Word[]; community: CommunityWord[] }
  type SeedEntry = { lemma: string; old?: string; gloss: string; glossEn?: string; pos: string; page: number | null; source: string; licence: string }
  type Seed = { sources: { key: string; citation: string; url: string | null; licence: string }[]; total: number; matches: number; offset: number; entries: SeedEntry[] }
  type KamusRef = { communityId: string; title: string; entries: number }

  let { code, name, kamus = [] }: { code: string; name: string; kamus?: KamusRef[] } = $props()

  let data = $state<LangData | null>(null), failed = $state(false)
  let seed = $state<Seed | null>(null), seedMore = $state(false)
  let query = $state(''), seedQuery = $state('')
  let playing = $state<string | null>(null)
  let audio: HTMLAudioElement | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    const c = code, abort = new AbortController()
    data = null; failed = false; seed = null
    request<LangData>('/v1/peta-kata/bahasa/' + c, undefined, abort.signal, true).then((r) => { if (!abort.signal.aborted) data = r }).catch(() => { if (!abort.signal.aborted) failed = true })
    loadSeed(c, '', 0, abort.signal)
    return () => { abort.abort(); audio?.pause() }
  })
  function loadSeed(c: string, q: string, offset: number, signal?: AbortSignal) {
    request<Seed>(`/v1/peta-kata/bahasa/${c}/sumber?` + new URLSearchParams({ ...(q ? { q } : {}), ...(offset ? { offset: String(offset) } : { limit: '20' }) }), undefined, signal, true)
      .then((r) => { if (signal?.aborted) return; seed = offset && seed ? { ...r, entries: [...seed.entries, ...r.entries] } : r; seedMore = false })
      .catch(() => { seedMore = false })
  }
  // The search box filters every part; the written source is searched on the server because it is large.
  $effect(() => {
    const q = query.trim()
    clearTimeout(timer)
    timer = setTimeout(() => { if (q !== seedQuery) { seedQuery = q; loadSeed(code, q, 0) } }, 250)
    return () => clearTimeout(timer)
  })

  const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const q = $derived(fold(query.trim()))
  const show = (form: string) => form.replace(/_/g, ' ')
  const datasetBy = $derived(new Map((data?.datasets ?? []).map((d) => [d.key, d])))
  const rows = $derived.by(() => {
    if (!data) return []
    const by = new Map<string, Word[]>()
    for (const w of data.words) by.set(w.concept, [...(by.get(w.concept) ?? []), w])
    return data.concepts
      .map((c) => ({ concept: c, words: by.get(c.key) ?? [] }))
      .filter((r) => !q || fold(r.concept.id).includes(q) || fold(r.concept.english).includes(q) || r.words.some((w) => fold(show(w.form)).startsWith(q)))
  })
  const community = $derived((data?.community ?? []).filter((w) => !q || fold(w.lemma).startsWith(q) || fold(w.gloss).includes(q)))
  const books = $derived(kamus.filter((k) => k.entries > 0))
  const hasNc = $derived((data?.words ?? []).some((w) => w.nc))
  const seedTitle = (key: string) => (key === 'steltenpool1969' ? 'Kamus Steltenpool 1969' : seed?.sources.find((s) => s.key === key)?.citation ?? key)
  const lcKeys = $derived(['etnos', ...(data?.datasets ?? []).map((d) => d.key), ...(seed?.sources ?? []).map((s) => s.key)])
  const fmt = (n: number) => n.toLocaleString('id-ID')

  function play(w: CommunityWord) {
    if (!w.voice) return
    if (playing === w.voice.id && audio) { audio.pause(); playing = null; return }
    audio?.pause()
    const a = new Audio(w.voice.url)
    audio = a
    playing = w.voice.id
    a.onended = a.onerror = () => { if (playing === w.voice?.id) playing = null }
    void a.play().catch(() => { playing = null })
  }
</script>

<div class="lk">
  <header class="lk-top">
    <h2>Kamus {name}</h2>
    <p class="lk-count">
      {#if data}
        {[data.concepts.length ? fmt(data.concepts.length) + ' kata dasar dari daftar terbitan' : '', data.community.length ? fmt(data.community.length) + ' kata dari kamus komunitas' : '', seed?.total ? fmt(seed.total) + ' entri dari ' + seedTitle(seed.sources[0]?.key ?? '') : ''].filter(Boolean).join(' · ') || 'Belum ada kata untuk bahasa ini.'}
      {:else if failed}Kamus ini belum dapat dimuat. Coba muat ulang halaman.{:else}<span class="lk-skel" aria-hidden="true"></span>{/if}
    </p>
    {#if data && (data.concepts.length || data.community.length || seed?.total)}
      <label class="lk-search">
        <Search size={16} aria-hidden="true" />
        <input type="search" bind:value={query} placeholder="Cari kata atau artinya" aria-label={'Cari di Kamus ' + name} autocomplete="off" />
      </label>
    {/if}
  </header>

  {#if data}
    <section class="lk-part" aria-labelledby="lk-community">
      <div class="lk-head"><h3 id="lk-community">Dari kamus komunitas</h3></div>
      {#if community.length}
        <ul class="lk-rows">
          {#each community as w (w.id)}
            <li>
              <span class="lk-word">{w.lemma}</span>
              <span class="lk-gloss">{w.gloss}</span>
              <span class="lk-meta"><span class="lk-tag" data-state={w.state}>{w.state === 'checked' ? 'Diperiksa komunitas' : 'Usulan anggota'}</span>dari Kamus <a href={'/communities/' + w.communityId + '?tab=kamus'}>{w.communityTitle}</a></span>
              {#if w.voice}<button type="button" class="lk-play" aria-label={'Putar pelafalan ' + w.lemma} onclick={() => play(w)}>{#if playing === w.voice.id}<Square size={14} aria-hidden="true" />Berhenti{:else}<Volume2 size={14} aria-hidden="true" />Dengar{/if}</button>{/if}
            </li>
          {/each}
        </ul>
      {:else if q && data.community.length}
        <p class="lk-note">Tidak ada kata komunitas yang cocok dengan “{query.trim()}”.</p>
      {:else}
        <p class="lk-note">Belum ada kata dari komunitas publik untuk bahasa ini. Kata yang ditulis dan diperiksa anggota di Kamus komunitasnya akan tampil di sini, dengan nama komunitasnya.</p>
      {/if}
    </section>

    {#if data.concepts.length}
      <section class="lk-part" aria-labelledby="lk-published">
        <div class="lk-head"><h3 id="lk-published">Kata dasar dari daftar terbitan</h3><a class="lk-more" href={'/wiki/peta-kata?bahasa=' + code}>Buka di Peta Kata</a></div>
        <p class="lk-note">Kata ini disalin seperti tertulis di sumbernya dan belum diperiksa penutur.</p>
        {#if rows.length}
          <dl class="lk-list">
            {#each rows as r (r.concept.key)}
              <div>
                <dt>{r.concept.id}</dt>
                <dd>{#each r.words as w, i (w.row)}{i ? ', ' : ''}<span class:lk-nc={w.nc} title={(datasetBy.get(w.dataset)?.name ?? w.dataset) + (w.variety ? ', ' + w.variety : '')}>{show(w.form)}</span>{/each}</dd>
              </div>
            {/each}
          </dl>
        {:else}<p class="lk-note">Tidak ada kata dasar yang cocok dengan “{query.trim()}”.</p>{/if}
        <ul class="lk-cites">
          {#each data.datasets as d (d.key)}<li><a href={d.url} target="_blank" rel="noopener">{d.name}</a>, {licenceLabel(d.licence)}</li>{/each}
        </ul>
        {#if hasNc}<p class="lk-note"><span class="lk-nc">Kata miring</span> berasal dari Papuan Voices, {NC_LABEL}.</p>{/if}
      </section>
    {/if}

    {#if seed && seed.total}
      {@const src = seed.sources[0]}
      <section class="lk-part" aria-labelledby="lk-seed">
        <div class="lk-head"><h3 id="lk-seed">{seedTitle(src?.key ?? '')}</h3></div>
        {#if src}<p class="lk-note">{#if src.url}<a href={src.url} target="_blank" rel="noopener">{src.citation}</a>{:else}{src.citation}{/if} Lisensi {licenceLabel(src.licence)}. Kata ini belum diperiksa penutur.</p>{/if}
        {#if seed.entries.length}
          <ul class="lk-rows">
            {#each seed.entries as e, i (e.source + e.lemma + i)}
              <li>
                <span class="lk-word">{e.lemma}</span>
                <span class="lk-gloss">{e.gloss}</span>
                <span class="lk-meta">{[e.old ? 'ditulis ' + e.old + ' di sumber' : '', e.page ? 'hlm. ' + e.page : ''].filter(Boolean).join(' · ')}</span>
              </li>
            {/each}
          </ul>
          {#if seed.entries.length < seed.matches}
            <button type="button" class="lk-btn" disabled={seedMore} onclick={() => { seedMore = true; loadSeed(code, seedQuery, seed!.entries.length) }}>{seedMore ? 'Memuat…' : 'Tampilkan ' + Math.min(50, seed.matches - seed.entries.length) + ' lagi dari ' + fmt(seed.matches - seed.entries.length)}</button>
          {/if}
        {:else}<p class="lk-note">Tidak ada entri yang cocok dengan “{query.trim()}”.</p>{/if}
      </section>
    {/if}

    <section class="lk-part" aria-labelledby="lk-books">
      <div class="lk-head"><h3 id="lk-books">Kamus komunitas dalam bahasa ini</h3></div>
      {#if books.length}
        <ul class="lk-books">
          {#each books as k (k.communityId)}<li><a href={'/communities/' + k.communityId + '?tab=kamus'}><span>{k.title}</span><small>{fmt(k.entries)} kata</small><ArrowUpRight size={16} aria-hidden="true" /></a></li>{/each}
        </ul>
      {:else}
        <p class="lk-note">Belum ada komunitas publik yang menyusun kamus bahasa ini. Kamus dimulai di komunitas yang menulis dalam bahasa {name}, lalu kata yang diperiksa anggotanya tampil di halaman ini.</p>
      {/if}
    </section>

    <div class="lk-part"><LocalContextsNotices keys={lcKeys} /></div>
  {/if}
</div>

<style>
  .lk { display: grid; gap: 4px; padding-bottom: 12px; }
  .lk-top { display: grid; gap: 8px; padding: 20px var(--gutter) 4px; }
  .lk-top h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.15; }
  .lk-count { margin: 0; font-size: 14px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .lk-skel { display: inline-block; width: 60%; height: 14px; border-radius: 6px; background: var(--secondary); }
  .lk-search { display: flex; align-items: center; gap: 8px; height: 44px; margin-top: 6px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; color: var(--muted-foreground); }
  .lk-search:focus-within { border-color: color-mix(in oklab, var(--foreground) 40%, var(--border)); }
  .lk-search input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--foreground); font: inherit; font-size: 15px; outline: none; }
  .lk-part { display: grid; gap: 10px; padding: 22px var(--gutter) 4px; min-width: 0; }
  .lk-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .lk-head h3 { margin: 0; font-size: 18px; font-weight: 750; letter-spacing: -0.012em; }
  .lk-more { flex: none; display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; margin-right: -12px; border-radius: 999px; font-size: 14px; font-weight: 600; color: var(--brand, var(--foreground)); text-decoration: none; }
  .lk-more:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .lk-note { margin: 0; font-size: 14px; line-height: 1.5; color: var(--muted-foreground); }
  .lk-note a, .lk-meta a, .lk-cites a { color: inherit; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in oklab, currentColor 35%, transparent); }
  .lk-rows { display: grid; margin: 0 calc(var(--gutter) * -1); padding: 0; list-style: none; }
  .lk-rows li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 12px; padding: 12px var(--gutter); border-top: 1px solid var(--border); }
  .lk-rows li:first-child { border-top: 0; }
  .lk-word { font-size: 16px; font-weight: 700; overflow-wrap: anywhere; }
  .lk-gloss { grid-column: 1; font-size: 14.5px; line-height: 1.4; color: color-mix(in oklab, var(--foreground) 78%, var(--background)); }
  .lk-meta { grid-column: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 13px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .lk-meta:empty { display: none; }
  .lk-play { grid-column: 2; grid-row: 1 / span 2; align-self: center; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
  .lk-play:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .lk-tag { display: inline-flex; align-items: center; min-height: 22px; padding: 0 8px; border: 1px solid var(--border); border-radius: 999px; font-size: 12px; color: var(--muted-foreground); }
  .lk-tag[data-state='checked'] { border-color: transparent; background: color-mix(in oklab, var(--brand, var(--foreground)) 12%, var(--background)); color: var(--foreground); }
  .lk-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 0 20px; margin: 0; }
  .lk-list div { display: grid; grid-template-columns: minmax(84px, 40%) minmax(0, 1fr); gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
  .lk-list dt { font-size: 13.5px; color: var(--muted-foreground); }
  .lk-list dd { margin: 0; font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
  .lk-nc { font-style: italic; }
  .lk-cites { display: grid; gap: 4px; margin: 4px 0 0; padding: 0; list-style: none; font-size: 13px; color: var(--muted-foreground); }
  .lk-btn { justify-self: start; min-height: 40px; padding: 0 16px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .lk-btn:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .lk-btn:disabled { opacity: 0.6; cursor: default; }
  .lk-books { display: grid; margin: 0 calc(var(--gutter) * -1); padding: 0; list-style: none; }
  .lk-books a { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 10px; min-height: 52px; padding: 8px var(--gutter); color: var(--foreground); text-decoration: none; }
  .lk-books a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .lk-books span { font-size: 15.5px; font-weight: 700; }
  .lk-books small { font-size: 13.5px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .lk-books :global(svg) { color: var(--muted-foreground); }
  .lk-play:focus-visible, .lk-btn:focus-visible, .lk-books a:focus-visible, .lk-more:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: -2px; }
</style>
