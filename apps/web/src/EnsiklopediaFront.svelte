<script lang="ts">
  // The full Ensiklopedia index at /wiki, a page under Jelajah (owner, 28 November 2026): the crumb back to Jelajah,
  // search and the wilayah adat strip, the Embla carousel of 3D objects, species and Peta Kata, the progress line,
  // the kinds as cards with real glimpses (EnsiklopediaKinds.svelte), the Peta pengetahuan card, the tabbed rows,
  // and Katalog Data as a quiet link at the foot.
  import { onMount } from 'svelte'
  import { ArrowUpRight, ChevronRight, Clock, Database, FileText, MessageCircleQuestionMark, Plus, Search } from '@lucide/svelte'
  import type { Auth, Community, Membership } from './api'
  import { request } from './api'
  import { KIND_NAME, inScope, loadIndex, shortCount, type EntryIndex, type IndexEntry } from './entri'
  import { placeScope, setPlaceScope } from './place-scope.svelte'
  import { KIND_LABEL, SHOWCASE, loadViewerObjects, viewerHref, viewerListHref, type ViewerObject } from './viewer-data.ts'
  import { MAP_NAME, OBSERVATORY_NAME, VIEWER_NAME } from './observatory-name.ts'
  import { Progress } from '$lib/components/ui/progress'
  import * as Tabs from '$lib/components/ui/tabs'
  import { ShowcaseCarousel, type CarouselSlide } from '$lib/components/ui/carousel'
  import JelajahCrumbs from './JelajahCrumbs.svelte'
  import EnsiklopediaKinds from './EnsiklopediaKinds.svelte'
  import KnowledgeMapCard from './KnowledgeMapCard.svelte'
  import { loadGlimpse } from './glimpse-data.ts'
  import type { Glimpse } from './ensiklopedia-glimpse.ts'
  import { loadAtlas } from './explore-data'
  import type { Atlas } from './RegionArt.svelte'
  import './styles/observatorium.css'

  let { auth, memberships = [], communities = [] }: { auth: Auth; memberships?: Membership[]; communities?: Community[] } = $props()
  type GNode = { id: string; title: string; x: number; y: number; class: string; world?: { level?: { band: string } | null } }
  type Graph = { counts: { entities: number; statements: number }; nodes: GNode[]; statements: { source: string; target: string }[]; questions: { a: string; b: string; question: string }[] }

  const REGIONS: { slug: string; label: string; title: string }[] = [
    { slug: '', label: 'Semua Papua', title: 'Tanah Papua' },
    { slug: 'domberai', label: 'Domberai', title: 'Domberai' },
    { slug: 'bomberai', label: 'Bomberai', title: 'Bomberai' },
    { slug: 'saireri', label: 'Saireri', title: 'Saireri' },
    { slug: 'mamta-tabi', label: 'Mamta / Tabi', title: 'Mamta (Tabi)' },
    { slug: 'meepago', label: 'Mee Pago', title: 'Mee Pago' },
    { slug: 'la-pago', label: 'La Pago', title: 'La Pago' },
    { slug: 'ha-anim', label: 'Ha Anim', title: 'Ha Anim' },
  ]

  let index = $state<EntryIndex | null>(null),
    failed = $state(false),
    graph = $state<Graph | null>(null),
    objects = $state<ViewerObject[]>([]),
    waiting = $state<{ id: string; title: string; n: number }[] | null>(null),
    query = $state(''),
    feedTab = $state<'gaps' | 'checked' | 'words' | 'near'>('gaps'),
    glimpse = $state<Glimpse | null>(null),
    atlas = $state<Atlas | null>(null)

  onMount(() => {
    document.title = OBSERVATORY_NAME + ' · ETNOS'
    const abort = new AbortController()
    loadIndex().then((i) => (index = i)).catch(() => (failed = true))
    fetch('/observatory/knowledge/graph.json', { signal: abort.signal }).then((r) => (r.ok ? r.json() : null)).then((g) => (graph = g)).catch(() => {})
    void loadViewerObjects().then((o) => (objects = o))
    void loadGlimpse().then((g) => (glimpse = g))
    void loadAtlas().then((a) => (atlas = a))
    return () => abort.abort()
  })

  // Claims waiting for the reader in their communities' Periksa decks. Read per community, at use time.
  $effect(() => {
    const ids = auth.actor ? memberships.map((m) => m.community_id).slice(0, 12) : []
    if (!ids.length) { waiting = null; return }
    const abort = new AbortController()
    Promise.all(ids.map((id) => request<{ waiting: number }>('/v1/communities/' + id + '/periksa', undefined, abort.signal, true).then((q) => ({ id, n: q.waiting })).catch(() => ({ id, n: 0 }))))
      .then((rows) => { if (!abort.signal.aborted) waiting = rows.filter((r) => r.n > 0).map((r) => ({ ...r, title: communities.find((c) => c.id === r.id)?.title ?? 'Komunitas' })).sort((a, b) => b.n - a.n) })
    return () => abort.abort()
  })

  const scope = $derived(placeScope.slug)
  const scoped = $derived((index?.entries ?? []).filter((e) => inScope(e, scope)))
  const written = $derived(scoped.filter((e) => e.article || e.kind === 'halaman'))
  const unwritten = $derived(scoped.filter((e) => !e.article && e.kind !== 'halaman'))
  const writtenPct = $derived(scoped.length ? Math.round((written.length / scoped.length) * 100) : 0)
  const bySlug = $derived(new Map((index?.entries ?? []).map((e) => [e.slug, e])))
  const questions = $derived((graph?.questions ?? []).filter((q) => { const a = bySlug.get(q.a), b = bySlug.get(q.b); return !scope || (a && inScope(a, scope)) || (b && inScope(b, scope)) }))
  const waitingTotal = $derived((waiting ?? []).reduce((n, w) => n + w.n, 0))

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const results = $derived.by(() => {
    const q = norm(query.trim())
    if (q.length < 2 || !index) return []
    const hits = index.entries.filter((e) => norm(e.title).includes(q))
    return hits.sort((a, b) => Number(norm(b.title).startsWith(q)) - Number(norm(a.title).startsWith(q)) || Number(inScope(b, scope)) - Number(inScope(a, scope)) || a.title.localeCompare(b.title, 'id')).slice(0, 12)
  })

  const showcase = $derived([...objects].sort((a, b) => SHOWCASE.indexOf(a.kind) - SHOWCASE.indexOf(b.kind)))
  const heroSlides = $derived.by<CarouselSlide[]>(() => {
    const visual = showcase
      .filter((o) => !!o.thumb)
      .slice(0, 6)
      .map((o) => ({
        id: o.id,
        href: viewerListHref(o.id, 'semua'),
        title: o.title,
        subtitle: o.subtitle || KIND_LABEL[o.kind],
        badge: KIND_LABEL[o.kind],
        thumb: o.thumb,
        is3d: o.kind === 'model',
        kind: 'object' as const,
      }))
    const atlasSlide: CarouselSlide = {
      id: 'peta-kata-featured',
      href: '/wiki/peta-kata',
      title: 'Peta Kata',
      subtitle: '100 kata dasar dalam 188 bahasa Tanah Papua, beserta sumbernya',
      badge: 'Peta Kata',
      kind: 'atlas',
    }
    if (!visual.length) return [atlasSlide]
    return [visual[0], visual[1], atlasSlide, ...visual.slice(2)].filter((s): s is CarouselSlide => !!s)
  })

  const KIND_RANK = ['tempat', 'bahasa', 'bentang-alam', 'suku', 'makhluk', 'benda', 'topik']
  const gaps = $derived([...unwritten].sort((a, b) => KIND_RANK.indexOf(a.kind) - KIND_RANK.indexOf(b.kind) || a.title.localeCompare(b.title, 'id')))
  const checked = $derived(scoped.filter((e) => e.reviewed).sort((a, b) => (b.reviewed?.at ?? 0) - (a.reviewed?.at ?? 0)))
  const near = $derived(scope ? scoped.filter((e) => e.slug !== scope).sort((a, b) => Number(b.article) - Number(a.article) || KIND_RANK.indexOf(a.kind) - KIND_RANK.indexOf(b.kind) || a.title.localeCompare(b.title, 'id')) : [])
  const words = $derived(index?.words ?? [])
  const when = (ms: number) => new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const sub = (e: IndexEntry) => e.sub ?? KIND_NAME[e.kind] ?? ''

  $effect(() => {
    if (feedTab === 'near' && !near.length) feedTab = 'gaps'
  })
</script>

<div class="obs ef">
  <header class="obs-section obs-top ef-top">
    <JelajahCrumbs home />
    <div class="ef-header-row">
      <h1>{OBSERVATORY_NAME}</h1>
      <div class="ef-quick-actions">
        {#if auth.actor}
          {#if waiting?.length}
            <a class="ef-pill-action primary" href={'/communities/' + waiting[0].id}>
              <MessageCircleQuestionMark size={15} aria-hidden="true" />
              <span>Jawab ({shortCount(waitingTotal)})</span>
            </a>
          {/if}
          <a class="ef-pill-action" href="/wiki/notes/new">
            <Plus size={15} aria-hidden="true" />
            <span>Tulis</span>
          </a>
          <a class="ef-pill-action icon-only" href={'/people/' + auth.actor.id} aria-label="Riwayat kontribusi" title="Riwayat">
            <Clock size={15} aria-hidden="true" />
          </a>
        {:else}
          <a class="ef-pill-action primary" href="/login">
            <span>Masuk</span>
            <ChevronRight size={15} aria-hidden="true" />
          </a>
        {/if}
      </div>
    </div>

    <form class="ef-search" role="search" onsubmit={(e) => { e.preventDefault(); if (results[0]) location.assign(results[0].href) }}>
      <label class="obs-search">
        <Search size={18} aria-hidden="true" />
        <input bind:value={query} type="search" aria-label={'Cari di ' + OBSERVATORY_NAME} placeholder="Cari tempat, bahasa atau suku" autocomplete="off" />
      </label>
    </form>

    {#if query.trim().length >= 2}
      <div class="ef-results" aria-live="polite">
        {#if results.length}
          <ul class="obs-rows">
            {#each results as e (e.slug)}
              <li>
                <a class="obs-row" href={e.href}>
                  <span class="obs-row-main">
                    <span class="obs-row-title">{e.title}</span>
                    <span class="obs-row-meta">{KIND_NAME[e.kind] ?? ''}{e.sub && e.sub !== KIND_NAME[e.kind] ? ' · ' + e.sub : ''}{e.article ? '' : ' · belum ada tulisan'}</span>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </li>
            {/each}
          </ul>
        {:else if index}
          <p class="obs-note">Belum ada entri dengan nama itu.</p>
        {/if}
        <p class="obs-foot"><a href={'/find?q=' + encodeURIComponent(query.trim())}>Cari "{query.trim()}" di posting dan komunitas</a></p>
      </div>
    {:else}
      <div class="ef-region-wrap">
        <div class="ef-regions" role="group" aria-label="Pilih wilayah adat">
          {#each REGIONS as r (r.slug)}
            <button
              type="button"
              class="ef-region-pill"
              aria-pressed={scope === r.slug}
              onclick={() => setPlaceScope({ slug: r.slug, title: r.title })}
            >
              {r.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </header>

  {#if !query.trim() || query.trim().length < 2}
    <section class="ef-hero" aria-label="Sorotan visual">
      <div class="ef-hero-head">
        <h2>Benda 3D, spesies & atlas</h2>
        {#if showcase.length}
          <a class="obs-more" href={viewerHref(showcase[0].id) + '?semua=1'}>Buka {VIEWER_NAME}</a>
        {/if}
      </div>
      <ShowcaseCarousel slides={heroSlides} label="Sorotan benda 3D, spesies, dan peta bahasa" />
    </section>

    <section class="ef-progress-card" aria-labelledby="ef-state-title">
      <h2 id="ef-state-title" class="sr-only">Keadaan {OBSERVATORY_NAME}</h2>
      {#if index}
        <div class="ef-progress-top">
          <strong>{shortCount(written.length)} dari {shortCount(scoped.length)} entri di {placeScope.title} tertulis</strong>
          <span class="ef-progress-pct">{writtenPct}%</span>
        </div>
        <Progress value={writtenPct} max={100} class="h-2" />
        <div class="ef-progress-meta">
          <span>{shortCount(unwritten.length)} menunggu tulisan</span>
          {#if waiting && waitingTotal}
            <span>· {shortCount(waitingTotal)} menunggu periksa Anda</span>
          {:else if questions.length}
            <span>· {shortCount(questions.length)} pertanyaan dari peta</span>
          {/if}
        </div>
      {:else if failed}
        <p class="obs-note">Angka {OBSERVATORY_NAME} belum dapat dimuat. Coba muat ulang halaman ini.</p>
      {:else}
        <div class="ef-figures-hold" aria-hidden="true"></div>
      {/if}
    </section>

    <section class="ef-kinds" aria-labelledby="ef-kinds-title">
      <h2 id="ef-kinds-title" class="sr-only">Isi {OBSERVATORY_NAME}</h2>
      <EnsiklopediaKinds {index} {glimpse} {objects} {atlas} set="semua" />
    </section>

    <section class="ef-tools" aria-label={MAP_NAME}>
      <KnowledgeMapCard />
    </section>

    {#if gaps.length || questions.length || checked.length || words.length || near.length}
      <section class="obs-section ef-explorer" aria-label="Jelajahi catatan">
        <Tabs.Root bind:value={feedTab}>
          <Tabs.List class="ef-tabs-list">
            <Tabs.Trigger value="gaps">Belum diketahui</Tabs.Trigger>
            {#if checked.length}<Tabs.Trigger value="checked">Baru diperiksa</Tabs.Trigger>{/if}
            {#if words.length}<Tabs.Trigger value="words">Kata minggu ini</Tabs.Trigger>{/if}
            {#if near.length}<Tabs.Trigger value="near">Di {placeScope.title}</Tabs.Trigger>{/if}
          </Tabs.List>

          <Tabs.Content value="gaps" class="ef-tab-pane">
            <ul class="obs-rows">
              {#each questions.slice(0, 2) as q (q.a + q.b)}
                {@const e = bySlug.get(q.a)}
                <li>
                  <a class="obs-row" href={e?.href ?? '/wiki/peta?focus=' + encodeURIComponent(q.a)}>
                    <MessageCircleQuestionMark size={18} aria-hidden="true" />
                    <span class="obs-row-main">
                      <span class="obs-row-title">{q.question}</span>
                      <span class="obs-row-meta">Saran dari peta, belum tentu ada hubungannya</span>
                    </span>
                  </a>
                </li>
              {/each}
              {#each gaps.slice(0, 5) as e (e.slug)}
                <li>
                  <a class="obs-row" href={e.href}>
                    <FileText size={18} aria-hidden="true" />
                    <span class="obs-row-main">
                      <span class="obs-row-title">{e.title}</span>
                      <span class="obs-row-meta">{sub(e)} · belum ada tulisan</span>
                    </span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </li>
              {/each}
            </ul>
            <p class="ef-tab-foot"><a href="/wiki/jenis/semua?status=belum">Lihat semua yang belum ditulis</a></p>
          </Tabs.Content>

          {#if checked.length}
            <Tabs.Content value="checked" class="ef-tab-pane">
              <ul class="obs-rows">
                {#each checked.slice(0, 6) as e (e.slug)}
                  <li>
                    <a class="obs-row" href={e.href}>
                      <span class="obs-row-main">
                        <span class="obs-row-title">{e.title}</span>
                        <span class="obs-row-meta">{sub(e)} · diperiksa {e.reviewed?.by ? 'oleh ' + e.reviewed.by + ' ' : ''}{e.reviewed ? when(e.reviewed.at) : ''}</span>
                      </span>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </li>
                {/each}
              </ul>
              {#if checked.length > 6}
                <p class="ef-tab-foot"><a href="/wiki/jenis/semua?status=diperiksa">Lihat semua yang sudah diperiksa</a></p>
              {/if}
            </Tabs.Content>
          {/if}

          {#if words.length}
            <Tabs.Content value="words" class="ef-tab-pane">
              <ul class="obs-rows">
                {#each words.slice(0, 6) as w (w.communityId + w.lemma)}
                  <li>
                    <a class="obs-row" href={w.languageSlug ? '/wiki/' + w.languageSlug + '?tab=kamus' : '/communities/' + w.communityId + '?tab=kamus'}>
                      <span class="obs-row-main">
                        <span class="obs-row-title">{w.lemma}</span>
                        <span class="obs-row-meta">{w.gloss} · {w.languageName}</span>
                      </span>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </li>
                {/each}
              </ul>
              <p class="ef-tab-foot"><a href="/wiki/jenis/kamus">Buka kamus semua bahasa</a></p>
            </Tabs.Content>
          {/if}

          {#if near.length}
            <Tabs.Content value="near" class="ef-tab-pane">
              <ul class="obs-rows">
                {#each near.slice(0, 6) as e (e.slug)}
                  <li>
                    <a class="obs-row" href={e.href}>
                      <span class="obs-row-main">
                        <span class="obs-row-title">{e.title}</span>
                        <span class="obs-row-meta">{sub(e)}{e.article ? '' : ' · belum ada tulisan'}</span>
                      </span>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </li>
                {/each}
              </ul>
              <p class="ef-tab-foot"><a href={'/wiki/jenis/semua?di=' + encodeURIComponent(scope)}>Lihat semua di {placeScope.title}</a></p>
            </Tabs.Content>
          {/if}
        </Tabs.Root>
      </section>
    {/if}
    <p class="ef-foot"><a href="/wiki/data"><Database size={15} aria-hidden="true" />Katalog Data{index?.datasets ? ' · ' + shortCount(index.datasets) + ' dataset terbuka' : ''}</a></p>
  {/if}
</div>

<style>
  .ef { padding-bottom: 20px; overflow-x: clip; }
  .ef-top { gap: 12px; padding-bottom: 10px; }
  .ef-top > * { min-width: 0; }
  .ef-header-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .ef-top h1 { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.08; letter-spacing: -0.025em; }
  .ef-quick-actions { display: flex; align-items: center; gap: 6px; }
  .ef-pill-action {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--background);
    color: var(--foreground);
    font-size: 13px;
    font-weight: 650;
    text-decoration: none;
    white-space: nowrap;
  }
  .ef-pill-action:hover { background: color-mix(in oklab, var(--foreground) 5%, transparent); }
  .ef-pill-action.primary { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .ef-pill-action.primary:hover { opacity: 0.9; }
  .ef-pill-action.icon-only { padding: 0 9px; }

  .ef-results { display: grid; gap: 8px; }
  .ef-results .obs-rows { margin-top: 4px; }

  .ef-region-wrap { position: relative; min-width: 0; overflow: hidden; margin: 0 calc(var(--gutter) * -1); }
  .ef-region-wrap::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 28px;
    background: linear-gradient(to right, transparent, var(--background));
    pointer-events: none;
  }
  .ef-regions { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 2px 32px 2px var(--gutter); }
  .ef-region-pill {
    flex: none;
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--muted-foreground);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
  }
  .ef-region-pill:hover { color: var(--foreground); background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ef-region-pill[aria-pressed='true'] { background: var(--foreground); color: var(--background); border-color: var(--foreground); }

  .ef-hero { display: grid; gap: 10px; padding: 8px var(--gutter) 16px; min-width: 0; }
  .ef-hero-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .ef-hero-head h2 { margin: 0; font-size: 17px; font-weight: 750; letter-spacing: -0.015em; }

  .ef-progress-card {
    display: grid;
    gap: 8px;
    margin: 0 var(--gutter) 16px;
    padding: 13px 15px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: color-mix(in oklab, var(--foreground) 2.2%, var(--background));
  }
  .ef-progress-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 13.5px; }
  .ef-progress-top strong { font-weight: 650; }
  .ef-progress-pct { font-weight: 750; font-variant-numeric: tabular-nums; color: var(--muted-foreground); }
  .ef-progress-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 12.5px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .ef-figures-hold { height: 44px; border-radius: 10px; background: color-mix(in oklab, var(--foreground) 5%, transparent); }

  .ef-kinds { padding: 4px var(--gutter) 20px; min-width: 0; }
  .ef-tools { padding: 0 var(--gutter) 18px; min-width: 0; }
  .ef-foot { margin: 0; padding: 18px var(--gutter) 0; border-top: 1px solid var(--border); }
  .ef-foot a { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; font-size: 14px; font-weight: 600; color: var(--muted-foreground); text-decoration: none; }
  .ef-foot a:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .ef-foot a:focus-visible { outline: 2px solid var(--ring, var(--foreground)); outline-offset: 2px; border-radius: 6px; }

  .ef-explorer { padding-top: 20px; }
  .ef-explorer :global(.ef-tabs-list) {
    display: flex;
    flex-wrap: wrap;
    width: fit-content;
    max-width: 100%;
    height: auto;
    gap: 4px;
    margin-bottom: 10px;
  }
  /* Tabs read as one Grafit pill group (DESIGN.md, Pills): hairline outline, the chosen one in ink. */
  .ef-explorer :global(.ef-tabs-list) { padding: 3px; border: 1px solid var(--border); border-radius: 999px; background: transparent; }
  .ef-explorer :global(.ef-tabs-list [role='tab']) { min-height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; box-shadow: none; color: var(--muted-foreground); font-size: 13.5px; font-weight: 550; }
  .ef-explorer :global(.ef-tabs-list [role='tab']:hover) { color: var(--foreground); }
  .ef-explorer :global(.ef-tabs-list [role='tab'][data-state='active']) { background: var(--foreground); color: var(--background); }
  .ef-explorer :global(.ef-tab-pane) { display: grid; gap: 10px; }
  .ef-tab-foot { margin: 2px 0 0; font-size: 13.5px; }
  .ef-tab-foot a { color: var(--brand, var(--foreground)); font-weight: 600; text-decoration: none; }
  .ef-tab-foot a:hover { text-decoration: underline; text-underline-offset: 3px; }
</style>
