<script lang="ts">
  // Ensiklopedia home at /wiki: search + 7 Wilayah Adat scope strip, editorial Embla visual carousel
  // (3D models, species, photos, Peta Kata), live completion progress bar, spacious 4x2 category bento grid,
  // Peta Pengetahuan + Peta Kata + Katalog Data discovery cards, and tabbed bottom explorer.
  import { onMount } from 'svelte'
  import {
    Amphora,
    ArrowUpRight,
    BookA,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    Clock,
    Compass,
    Database,
    FileText,
    Landmark,
    Languages,
    MapPin,
    MessageCircleQuestionMark,
    Mountain,
    Network,
    PawPrint,
    Plus,
    Search,
    Tags,
    UsersRound,
  } from '@lucide/svelte'
  import type { Auth, Community, Membership } from './api'
  import { request } from './api'
  import { KIND_NAME, inScope, loadIndex, shortCount, type EntryIndex, type IndexEntry } from './entri'
  import { placeScope, setPlaceScope } from './place-scope.svelte'
  import { appearance } from './appearance.svelte'
  import { BANDS } from './world-scale.ts'
  import { LENSES, LENS_LABEL } from './stage-layouts.ts'
  import { KIND_LABEL, SHOWCASE, loadViewerObjects, viewerHref, viewerListHref, type ViewerObject } from './viewer-data.ts'
  import { MAP_NAME, OBSERVATORY_NAME, VIEWER_NAME } from './observatory-name.ts'
  import { Progress } from '$lib/components/ui/progress'
  import * as Tabs from '$lib/components/ui/tabs'
  import { ShowcaseCarousel, type CarouselSlide } from '$lib/components/ui/carousel'
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
    more = $state(false),
    feedTab = $state<'gaps' | 'checked' | 'words' | 'near'>('gaps')

  onMount(() => {
    document.title = OBSERVATORY_NAME + ' · ETNOS'
    const abort = new AbortController()
    loadIndex().then((i) => (index = i)).catch(() => (failed = true))
    fetch('/observatory/knowledge/graph.json', { signal: abort.signal }).then((r) => (r.ok ? r.json() : null)).then((g) => (graph = g)).catch(() => {})
    void loadViewerObjects().then((o) => (objects = o))
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

  const dark = $derived(appearance.theme === 'dark')
  const band = (key: string) => { const b = BANDS.find((x) => x.key === key); return b ? (dark ? b.dark : b.light) : 'var(--muted-foreground)' }
  const count = (k: string) => (k === 'kamus' ? (index?.kamus ?? []).reduce((n, x) => n + x.entries, 0) : index?.counts[k] ?? 0)
  const TILES = [
    { kind: 'tempat', icon: MapPin, band: 'masyarakat-aturan' },
    { kind: 'bahasa', icon: Languages, band: 'bahasa-ritus' },
    { kind: 'suku', icon: UsersRound, band: 'masyarakat-aturan' },
    { kind: 'makhluk', icon: PawPrint, band: 'makhluk-hidup' },
    { kind: 'bentang-alam', icon: Mountain, band: 'batuan-bumi' },
    { kind: 'benda', icon: Amphora, band: 'buatan-pengetahuan' },
    { kind: 'lembaga', icon: Landmark, band: 'masyarakat-aturan' },
    { kind: 'kamus', icon: BookA, band: 'bahasa-ritus' },
  ]
  const others = $derived([
    { href: '/wiki/jenis/topik', label: KIND_NAME.topik, icon: Tags, n: count('topik') },
    ...(count('peristiwa') ? [{ href: '/wiki/jenis/peristiwa', label: KIND_NAME.peristiwa, icon: CalendarDays, n: count('peristiwa') }] : []),
    ...(count('halaman') ? [{ href: '/wiki/jenis/halaman', label: KIND_NAME.halaman, icon: FileText, n: count('halaman') }] : []),
  ])

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
      title: 'Peta Kata & Semantik Papua',
      subtitle: '256 bahasa · dengar kata dasar dan jejaring koleksifikasi makna',
      badge: 'Atlas bahasa',
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

  const px = (v: number) => 12 + ((v + 1) / 2) * 376, py = (v: number) => 10 + ((v + 1) / 2) * 100
  const pts = $derived((graph?.nodes ?? []).map((n) => ({ x: px(n.x), y: py(n.y), c: band(n.world?.level?.band ?? '') })))
  const at = $derived(new Map((graph?.nodes ?? []).map((n) => [n.id, n])))

  $effect(() => {
    if (feedTab === 'near' && !near.length) feedTab = 'gaps'
  })
</script>

<div class="obs ef">
  <header class="obs-section obs-top ef-top">
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
        <input bind:value={query} type="search" aria-label={'Cari di ' + OBSERVATORY_NAME} placeholder="Cari tempat, bahasa, suku, spesies, atau topik" autocomplete="off" />
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

    <nav class="ef-bento" aria-label="Kategori Ensiklopedia">
      <ul class="ef-bento-grid">
        {#each TILES as t (t.kind)}
          {@const n = count(t.kind)}
          <li>
            <a class="ef-bento-tile" href={'/wiki/jenis/' + t.kind} style={`--tone:${band(t.band)}`}>
              <span class="ef-bento-icon"><t.icon size={20} aria-hidden="true" /></span>
              <span class="ef-bento-text">
                <strong>{KIND_NAME[t.kind]}</strong>
                <small>{n ? shortCount(n) + ' entri' : 'Buka'}</small>
              </span>
            </a>
          </li>
        {/each}
      </ul>
      {#if others.length}
        <div class="ef-more-bar">
          <button type="button" class="ef-more-toggle" aria-expanded={more} aria-controls="ef-more" onclick={() => (more = !more)}>
            <span>Kategori lain ({others.length})</span>
            <ChevronDown size={15} class={more ? 'rot' : ''} aria-hidden="true" />
          </button>
          {#if more}
            <ul class="ef-more" id="ef-more">
              {#each others as o (o.href)}
                <li>
                  <a href={o.href}>
                    <o.icon size={16} aria-hidden="true" />
                    <span>{o.label}</span>
                    {#if o.n}<small>{shortCount(o.n)}</small>{/if}
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </nav>

    <section class="ef-tools" aria-label="Peta dan katalog terbuka">
      {#if graph}
        <div class="ef-map">
          <a class="ef-map-main" href="/wiki/peta">
            <svg viewBox="0 0 400 120" aria-hidden="true">
              {#each graph.statements as s, i (i)}{@const a = at.get(s.source)}{@const b = at.get(s.target)}{#if a && b}<line x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)} />{/if}{/each}
              {#each pts as p, i (i)}<circle cx={p.x} cy={p.y} r="2.6" fill={p.c} />{/each}
            </svg>
            <span class="ef-map-text">
              <strong id="ef-map-title">{MAP_NAME}</strong>
              <small>{graph.counts.entities} hal dan {graph.counts.statements} hubungan yang bersumber</small>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
          <div class="ef-lenses-wrap">
            <div class="ef-lenses" aria-label="Buka peta dengan lensa">
              {#each LENSES as l (l)}
                <a href={'/wiki/peta?lens=' + l}>{LENS_LABEL[l]}</a>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <div class="ef-tool-pair">
        <a class="ef-tool-card teal" href="/wiki/peta-kata">
          <span class="ef-tool-icon"><Compass size={20} aria-hidden="true" /></span>
          <span class="ef-tool-body">
            <strong>Peta Kata & Semantik</strong>
            <small>256 bahasa Papua · 100 konsep dasar, suara & koleksifikasi</small>
          </span>
          <ArrowUpRight size={16} class="ef-tool-go" aria-hidden="true" />
        </a>
        <a class="ef-tool-card slate" href="/wiki/data">
          <span class="ef-tool-icon"><Database size={20} aria-hidden="true" /></span>
          <span class="ef-tool-body">
            <strong>Katalog Data</strong>
            <small>{index?.datasets ? `${shortCount(index.datasets)} dataset terbuka` : 'Dataset terbuka'} · tabel, sumber & lisensi</small>
          </span>
          <ArrowUpRight size={16} class="ef-tool-go" aria-hidden="true" />
        </a>
      </div>
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
                    <a class="obs-row" href={'/communities/' + w.communityId + '?tab=kamus'}>
                      <span class="obs-row-main">
                        <span class="obs-row-title">{w.lemma}</span>
                        <span class="obs-row-meta">{w.gloss} · {w.languageName}</span>
                      </span>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </li>
                {/each}
              </ul>
              <p class="ef-tab-foot"><a href="/wiki/jenis/kamus">Buka semua kamus komunitas</a></p>
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

  .ef-bento { display: grid; gap: 10px; padding: 0 var(--gutter) 18px; }
  .ef-bento-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  @media (min-width: 600px) {
    .ef-bento-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; }
  }
  .ef-bento-tile {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 10px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--background);
    color: var(--foreground);
    text-decoration: none;
    height: 100%;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .ef-bento-tile:hover {
    background: color-mix(in oklab, var(--tone) 7%, var(--background));
    border-color: color-mix(in oklab, var(--tone) 32%, var(--border));
  }
  .ef-bento-icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: color-mix(in oklab, var(--tone) 13%, var(--background));
    color: var(--tone);
  }
  .ef-bento-text { display: grid; gap: 1px; min-width: 0; }
  .ef-bento-text strong { font-size: 13px; font-weight: 700; line-height: 1.2; }
  .ef-bento-text small { font-size: 11.5px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }

  .ef-more-bar { display: grid; gap: 8px; }
  .ef-more-toggle {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--muted-foreground);
    font: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .ef-more-toggle:hover { color: var(--foreground); background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ef-more-toggle :global(svg.rot) { transform: rotate(180deg); }
  .ef-more { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .ef-more a { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 11px; color: var(--foreground); font-size: 13.5px; font-weight: 600; text-decoration: none; }
  .ef-more a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ef-more small { font-size: 12px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }

  .ef-tools { display: grid; gap: 10px; padding: 0 var(--gutter) 18px; min-width: 0; }
  .ef-map { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 18px; min-width: 0; }
  .ef-map-main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px 8px; align-items: center; color: inherit; text-decoration: none; }
  .ef-map-main svg { grid-column: 1 / -1; width: 100%; height: auto; aspect-ratio: 10 / 3; border-radius: 12px; background: color-mix(in oklab, var(--foreground) 3%, var(--background)); }
  .ef-map-main line { stroke: color-mix(in oklab, var(--foreground) 22%, transparent); stroke-width: 0.6; vector-effect: non-scaling-stroke; }
  .ef-map-text { display: grid; gap: 2px; padding-left: 4px; }
  .ef-map-text strong { font-size: 16.5px; font-weight: 750; letter-spacing: -0.012em; }
  .ef-map-text small { font-size: 13px; color: var(--muted-foreground); }
  .ef-map-main > :global(svg:last-child) { margin-right: 4px; color: var(--muted-foreground); }
  .ef-map-main:hover strong { text-decoration: underline; text-underline-offset: 3px; }

  .ef-lenses-wrap { position: relative; min-width: 0; overflow: hidden; }
  .ef-lenses-wrap::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 34px;
    background: linear-gradient(to right, transparent, var(--background));
    pointer-events: none;
  }
  .ef-lenses { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 2px 34px 2px 2px; }
  .ef-lenses a { flex: none; display: inline-flex; align-items: center; min-height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; color: var(--foreground); font-size: 13px; font-weight: 550; text-decoration: none; white-space: nowrap; }
  .ef-lenses a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }

  .ef-tool-pair { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 560px) {
    .ef-tool-pair { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .ef-tool-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 14px;
    border: 1px solid var(--border);
    border-radius: 16px;
    color: var(--foreground);
    text-decoration: none;
    background: var(--background);
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .ef-tool-card.teal { --accent: #0f766e; }
  .ef-tool-card.slate { --accent: #475569; }
  :global(.dark) .ef-tool-card.teal { --accent: #2dd4bf; }
  :global(.dark) .ef-tool-card.slate { --accent: #94a3b8; }
  .ef-tool-card:hover {
    background: color-mix(in oklab, var(--accent) 6%, var(--background));
    border-color: color-mix(in oklab, var(--accent) 32%, var(--border));
  }
  .ef-tool-icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: color-mix(in oklab, var(--accent) 13%, var(--background));
    color: var(--accent);
  }
  .ef-tool-body { display: grid; gap: 2px; flex: 1; min-width: 0; }
  .ef-tool-body strong { font-size: 15px; font-weight: 750; line-height: 1.25; }
  .ef-tool-body small { font-size: 12.5px; line-height: 1.35; color: var(--muted-foreground); }
  .ef-tool-card :global(.ef-tool-go) { flex: none; color: var(--muted-foreground); }

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
  .ef-explorer :global(.ef-tab-pane) { display: grid; gap: 10px; }
  .ef-tab-foot { margin: 2px 0 0; font-size: 13.5px; }
  .ef-tab-foot a { color: var(--brand, var(--foreground)); font-weight: 600; text-decoration: none; }
  .ef-tab-foot a:hover { text-decoration: underline; text-underline-offset: 3px; }
</style>
