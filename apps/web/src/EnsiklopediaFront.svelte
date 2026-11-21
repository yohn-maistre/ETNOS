<script lang="ts">
  // The Ensiklopedia front at /wiki (docs/plan/one-page-system-2026-11-21.md §3a), top to bottom: search inside the
  // place scope, a state card with what is waiting and three quick actions, the kind grid with one live number on
  // each tile, the knowledge map as one card that opens /wiki/peta, and rows with Lihat semua. Every number comes
  // from /v1/entri, the public knowledge graph file, the viewer records or the reader's own Periksa queues; a tile
  // or row without an honest number or without anything to show leaves the number or the row out.
  import { onMount } from 'svelte'
  import { Amphora, ArrowUpRight, BookA, ChevronRight, Clock, Database, Ellipsis, Landmark, Languages, MapPin, MessageCircleQuestionMark, Mountain, Network, PawPrint, Plus, Search, Tags, UsersRound, CalendarDays, FileText } from '@lucide/svelte'
  import type { Auth, Community, Membership } from './api'
  import { request } from './api'
  import { KIND_NAME, inScope, loadIndex, shortCount, type EntryIndex, type IndexEntry } from './entri'
  import { placeScope } from './place-scope.svelte'
  import { appearance } from './appearance.svelte'
  import { BANDS } from './world-scale.ts'
  import { LENSES, LENS_LABEL } from './stage-layouts.ts'
  import { KIND_LABEL, SHOWCASE, loadViewerObjects, viewerHref, viewerListHref, type ViewerObject } from './viewer-data.ts'
  import { MAP_NAME, OBSERVATORY_NAME, VIEWER_NAME } from './observatory-name.ts'
  import './styles/observatorium.css'

  let { auth, memberships = [], communities = [] }: { auth: Auth; memberships?: Membership[]; communities?: Community[] } = $props()
  type GNode = { id: string; title: string; x: number; y: number; class: string; world?: { level?: { band: string } | null } }
  type Graph = { counts: { entities: number; statements: number }; nodes: GNode[]; statements: { source: string; target: string }[]; questions: { a: string; b: string; question: string }[] }

  let index = $state<EntryIndex | null>(null),
    failed = $state(false),
    graph = $state<Graph | null>(null),
    objects = $state<ViewerObject[]>([]),
    waiting = $state<{ id: string; title: string; n: number }[] | null>(null),
    query = $state(''),
    more = $state(false)

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
  const unwritten = $derived(scoped.filter((e) => !e.article && e.kind !== 'halaman'))
  const bySlug = $derived(new Map((index?.entries ?? []).map((e) => [e.slug, e])))
  const questions = $derived((graph?.questions ?? []).filter((q) => { const a = bySlug.get(q.a), b = bySlug.get(q.b); return !scope || (a && inScope(a, scope)) || (b && inScope(b, scope)) }))
  const waitingTotal = $derived((waiting ?? []).reduce((n, w) => n + w.n, 0))

  const dark = $derived(appearance.theme === 'dark')
  const band = (key: string) => { const b = BANDS.find((x) => x.key === key); return b ? (dark ? b.dark : b.light) : 'var(--muted-foreground)' }
  // A tile's tint is the level band its entries carry on the knowledge map, so the colour means the same thing in both
  // places (DESIGN.md, the Graphite Rule). Lainnya stays neutral.
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
    { href: '/wiki/data', label: 'Data', icon: Database, n: index?.datasets ?? 0 },
    { href: '/wiki/peta', label: MAP_NAME, icon: Network, n: 0 },
  ])

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const results = $derived.by(() => {
    const q = norm(query.trim())
    if (q.length < 2 || !index) return []
    const hits = index.entries.filter((e) => norm(e.title).includes(q))
    // Titles that start with the words come first, then entries inside the scope, then the rest.
    return hits.sort((a, b) => Number(norm(b.title).startsWith(q)) - Number(norm(a.title).startsWith(q)) || Number(inScope(b, scope)) - Number(inScope(a, scope)) || a.title.localeCompare(b.title, 'id')).slice(0, 12)
  })

  const showcase = $derived([...objects].sort((a, b) => SHOWCASE.indexOf(a.kind) - SHOWCASE.indexOf(b.kind)))
  const KIND_RANK = ['tempat', 'bahasa', 'bentang-alam', 'suku', 'makhluk', 'benda', 'topik']
  const gaps = $derived([...unwritten].sort((a, b) => KIND_RANK.indexOf(a.kind) - KIND_RANK.indexOf(b.kind) || a.title.localeCompare(b.title, 'id')))
  const checked = $derived(scoped.filter((e) => e.reviewed).sort((a, b) => (b.reviewed?.at ?? 0) - (a.reviewed?.at ?? 0)))
  const near = $derived(scope ? scoped.filter((e) => e.slug !== scope).sort((a, b) => Number(b.article) - Number(a.article) || KIND_RANK.indexOf(a.kind) - KIND_RANK.indexOf(b.kind) || a.title.localeCompare(b.title, 'id')) : [])
  const words = $derived(index?.words ?? [])
  const when = (ms: number) => new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const sub = (e: IndexEntry) => e.sub ?? KIND_NAME[e.kind] ?? ''
  // The map preview: every point of the knowledge graph in its default layout, coloured by level band.
  // The graph file keeps x and y between -1 and 1.
  const px = (v: number) => 12 + ((v + 1) / 2) * 376, py = (v: number) => 10 + ((v + 1) / 2) * 100
  const pts = $derived((graph?.nodes ?? []).map((n) => ({ x: px(n.x), y: py(n.y), c: band(n.world?.level?.band ?? '') })))
  const at = $derived(new Map((graph?.nodes ?? []).map((n) => [n.id, n])))
</script>

<div class="obs ef">
  <header class="obs-section obs-top ef-top">
    <h1>{OBSERVATORY_NAME}</h1>
    <form class="ef-search" role="search" onsubmit={(e) => { e.preventDefault(); if (results[0]) location.assign(results[0].href) }}>
      <label class="obs-search"><Search size={18} aria-hidden="true" /><input bind:value={query} type="search" aria-label={'Cari di ' + OBSERVATORY_NAME} placeholder="Cari tempat, bahasa, suku atau topik" autocomplete="off" /></label>
    </form>
    {#if query.trim().length >= 2}<div class="ef-results" aria-live="polite">
        {#if results.length}<ul class="obs-rows">
            {#each results as e (e.slug)}<li><a class="obs-row" href={e.href}><span class="obs-row-main"><span class="obs-row-title">{e.title}</span><span class="obs-row-meta">{KIND_NAME[e.kind] ?? ''}{e.sub && e.sub !== KIND_NAME[e.kind] ? ' · ' + e.sub : ''}{e.article ? '' : ' · belum ada tulisan'}</span></span><ArrowUpRight size={16} aria-hidden="true" /></a></li>{/each}
          </ul>{:else if index}<p class="obs-note">Belum ada entri dengan nama itu.</p>{/if}
        <p class="obs-foot"><a href={'/find?q=' + encodeURIComponent(query.trim())}>Cari "{query.trim()}" di posting dan komunitas</a></p>
      </div>{/if}
  </header>

  {#if !query.trim() || query.trim().length < 2}
    <section class="ef-state" aria-labelledby="ef-state-title">
      <h2 id="ef-state-title" class="sr-only">Keadaan {OBSERVATORY_NAME}</h2>
      {#if index}<dl class="ef-figures">
          <div><dt>Entri di {placeScope.title}</dt><dd>{shortCount(scoped.length)}</dd></div>
          <div><dt>Belum ada tulisan</dt><dd>{shortCount(unwritten.length)}</dd></div>
          {#if waiting && waitingTotal}<div><dt>Menunggu jawaban Anda</dt><dd>{shortCount(waitingTotal)}</dd></div>
          {:else if questions.length}<div><dt>Pertanyaan dari peta</dt><dd>{shortCount(questions.length)}</dd></div>{/if}
        </dl>{:else if failed}<p class="obs-note">Angka {OBSERVATORY_NAME} belum dapat dimuat. Coba muat ulang halaman ini.</p>
      {:else}<div class="ef-figures-hold" aria-hidden="true"></div>{/if}
      {#if auth.actor}<div class="ef-actions">
          {#if waiting?.length}<a href={'/communities/' + waiting[0].id}><span class="ef-act-icon"><MessageCircleQuestionMark size={18} aria-hidden="true" /></span><span>Jawab</span></a>{/if}
          <a href="/wiki/notes/new"><span class="ef-act-icon"><Plus size={18} aria-hidden="true" /></span><span>Tambah</span></a>
          <a href={'/people/' + auth.actor.id}><span class="ef-act-icon"><Clock size={18} aria-hidden="true" /></span><span>Riwayat</span></a>
        </div>
        {#if waiting?.length}<p class="ef-state-note">{waiting[0].n} pertanyaan menunggu di {waiting[0].title}{waiting.length > 1 ? ', dan ' + (waitingTotal - waiting[0].n) + ' lagi di komunitas lain' : ''}.</p>{/if}
      {:else}<a class="ef-login" href="/login">Masuk untuk membantu<ChevronRight size={16} aria-hidden="true" /></a>{/if}
    </section>

    <nav class="ef-kinds" aria-label="Jenis entri">
      <ul>
        {#each TILES as t (t.kind)}{@const n = count(t.kind)}<li><a href={'/wiki/jenis/' + t.kind}>
              <span class="ef-tile" style={`--tone:${band(t.band)}`}><t.icon size={22} aria-hidden="true" />{#if n}<span class="ef-badge">{shortCount(n)}</span>{/if}</span>
              <span class="ef-tile-label">{KIND_NAME[t.kind]}</span>
            </a></li>{/each}
        <li><button type="button" aria-expanded={more} aria-controls="ef-more" onclick={() => (more = !more)}>
            <span class="ef-tile neutral"><Ellipsis size={22} aria-hidden="true" /></span>
            <span class="ef-tile-label">Lainnya</span>
          </button></li>
      </ul>
      {#if more}<ul class="ef-more" id="ef-more">
          {#each others as o (o.href)}<li><a href={o.href}><o.icon size={18} aria-hidden="true" /><span>{o.label}</span>{#if o.n}<small>{shortCount(o.n)}</small>{/if}</a></li>{/each}
        </ul>{/if}
    </nav>

    {#if graph}<section class="ef-map" aria-labelledby="ef-map-title">
        <a class="ef-map-main" href="/wiki/peta">
          <svg viewBox="0 0 400 120" aria-hidden="true">
            {#each graph.statements as s, i (i)}{@const a = at.get(s.source)}{@const b = at.get(s.target)}{#if a && b}<line x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)} />{/if}{/each}
            {#each pts as p, i (i)}<circle cx={p.x} cy={p.y} r="2.6" fill={p.c} />{/each}
          </svg>
          <span class="ef-map-text"><strong id="ef-map-title">{MAP_NAME}</strong><small>{graph.counts.entities} hal dan {graph.counts.statements} hubungan yang bersumber</small></span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>
        <div class="ef-lenses" aria-label="Buka peta dengan lensa">
          {#each LENSES as l (l)}<a href={'/wiki/peta?lens=' + l}>{LENS_LABEL[l]}</a>{/each}
        </div>
      </section>{/if}

    {#if showcase.length}<section class="obs-section ef-row" aria-labelledby="ef-view-title">
        <div class="obs-head"><h2 id="ef-view-title">Benda, spesies dan bentang alam</h2><a class="obs-more" href={viewerHref(showcase[0].id) + '?semua=1'}>Lihat semua</a></div>
        <ul class="ef-cards">
          {#each showcase as o (o.id)}<li><a href={viewerListHref(o.id, 'semua')}>
                {#if o.thumb}<img src={o.thumb} alt="" loading="lazy" width="148" height="148" />{:else}<span class="ef-card-blank" aria-hidden="true">{KIND_LABEL[o.kind]}</span>{/if}
                <strong>{o.title}</strong><small>{KIND_LABEL[o.kind]}</small>
              </a></li>{/each}
        </ul>
        <p class="obs-foot">Dibuka di {VIEWER_NAME}, dengan sumber dan lisensi setiap catatan.</p>
      </section>{/if}

    {#if gaps.length || questions.length}<section class="obs-section ef-row" aria-labelledby="ef-gap-title">
        <div class="obs-head"><h2 id="ef-gap-title">Belum diketahui</h2><a class="obs-more" href="/wiki/jenis/semua?status=belum">Lihat semua</a></div>
        <ul class="obs-rows">
          {#each questions.slice(0, 2) as q (q.a + q.b)}{@const e = bySlug.get(q.a)}<li><a class="obs-row" href={e?.href ?? '/wiki/peta?focus=' + encodeURIComponent(q.a)}><MessageCircleQuestionMark size={18} aria-hidden="true" /><span class="obs-row-main"><span class="obs-row-title">{q.question}</span><span class="obs-row-meta">Saran dari peta, belum tentu ada hubungannya</span></span></a></li>{/each}
          {#each gaps.slice(0, 4) as e (e.slug)}<li><a class="obs-row" href={e.href}><FileText size={18} aria-hidden="true" /><span class="obs-row-main"><span class="obs-row-title">{e.title}</span><span class="obs-row-meta">{sub(e)} · belum ada tulisan</span></span><ArrowUpRight size={16} aria-hidden="true" /></a></li>{/each}
        </ul>
      </section>{/if}

    {#if checked.length}<section class="obs-section ef-row" aria-labelledby="ef-checked-title">
        <div class="obs-head"><h2 id="ef-checked-title">Baru diperiksa</h2>{#if checked.length > 4}<a class="obs-more" href="/wiki/jenis/semua?status=diperiksa">Lihat semua</a>{/if}</div>
        <ul class="obs-rows">
          {#each checked.slice(0, 4) as e (e.slug)}<li><a class="obs-row" href={e.href}><span class="obs-row-main"><span class="obs-row-title">{e.title}</span><span class="obs-row-meta">{sub(e)} · diperiksa {e.reviewed?.by ? 'oleh ' + e.reviewed.by + ' ' : ''}{e.reviewed ? when(e.reviewed.at) : ''}</span></span><ArrowUpRight size={16} aria-hidden="true" /></a></li>{/each}
        </ul>
      </section>{/if}

    {#if near.length}<section class="obs-section ef-row" aria-labelledby="ef-near-title">
        <div class="obs-head"><h2 id="ef-near-title">Di sekitar {placeScope.title}</h2><a class="obs-more" href={'/wiki/jenis/semua?di=' + encodeURIComponent(scope)}>Lihat semua</a></div>
        <ul class="obs-rows">
          {#each near.slice(0, 5) as e (e.slug)}<li><a class="obs-row" href={e.href}><span class="obs-row-main"><span class="obs-row-title">{e.title}</span><span class="obs-row-meta">{sub(e)}{e.article ? '' : ' · belum ada tulisan'}</span></span><ArrowUpRight size={16} aria-hidden="true" /></a></li>{/each}
        </ul>
      </section>{/if}

    {#if words.length}<section class="obs-section ef-row" aria-labelledby="ef-words-title">
        <div class="obs-head"><h2 id="ef-words-title">Kata minggu ini</h2><a class="obs-more" href="/wiki/jenis/kamus">Lihat semua</a></div>
        <ul class="obs-rows">
          {#each words.slice(0, 5) as w (w.communityId + w.lemma)}<li><a class="obs-row" href={'/communities/' + w.communityId + '?tab=kamus'}><span class="obs-row-main"><span class="obs-row-title">{w.lemma}</span><span class="obs-row-meta">{w.gloss} · {w.languageName}</span></span></a></li>{/each}
        </ul>
      </section>{/if}
  {/if}
</div>

<style>
  .ef { padding-bottom: 12px; }
  .ef-top { gap: 12px; padding-bottom: 8px; }
  .ef-top h1 { margin: 0; font-size: 30px; font-weight: 800; line-height: 1.08; letter-spacing: -0.025em; }
  .ef-results { display: grid; gap: 8px; }
  .ef-results .obs-rows { margin-top: 4px; }

  .ef-state { display: grid; gap: 14px; margin: 8px var(--gutter) 6px; padding: 16px 18px; border: 1px solid var(--border); border-radius: 18px; background: color-mix(in oklab, var(--foreground) 2.5%, var(--background)); }
  .ef-figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 12px; margin: 0; }
  .ef-figures > div { display: grid; gap: 2px; min-width: 0; }
  .ef-figures dt { order: 2; font-size: 13px; line-height: 1.3; color: var(--muted-foreground); }
  .ef-figures dd { order: 1; margin: 0; font-size: 24px; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .ef-figures-hold { height: 52px; border-radius: 10px; background: color-mix(in oklab, var(--foreground) 5%, transparent); }
  .ef-actions { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border); }
  .ef-actions a { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-height: 64px; padding: 6px 4px; border-radius: 12px; color: var(--foreground); font-size: 14px; font-weight: 600; text-decoration: none; }
  .ef-actions a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ef-act-icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 999px; background: var(--foreground); color: var(--background); }
  .ef-state-note { margin: -4px 0 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .ef-login { display: inline-flex; align-items: center; gap: 4px; justify-self: start; min-height: 40px; padding: 0 16px; border-radius: 999px; background: var(--foreground); color: var(--background); font-size: 14.5px; font-weight: 650; text-decoration: none; }
  .ef-login:hover { background: color-mix(in oklab, var(--foreground) 88%, var(--background)); }

  .ef-kinds { padding: 18px var(--gutter) 22px; }
  .ef-kinds > ul { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 8px; margin: 0; padding: 0; list-style: none; }
  /* Nine tiles: three rows of three on a phone, one row on a wider column. */
  @media (min-width: 600px) { .ef-kinds > ul { grid-template-columns: repeat(9, minmax(0, 1fr)); gap: 8px 2px; } .ef-tile { width: 50px; height: 50px; border-radius: 14px; } .ef-tile-label { font-size: 12.5px; } .ef-badge { right: -10px; } }
  .ef-kinds > ul a, .ef-kinds > ul button { all: unset; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 7px; width: 100%; padding: 4px 2px; border-radius: 14px; cursor: pointer; text-align: center; }
  .ef-kinds > ul a:hover .ef-tile, .ef-kinds > ul button:hover .ef-tile { background: color-mix(in oklab, var(--tone, var(--foreground)) 20%, var(--background)); }
  .ef-kinds > ul a:focus-visible, .ef-kinds > ul button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .ef-tile { position: relative; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px; background: color-mix(in oklab, var(--tone) 13%, var(--background)); color: var(--tone); }
  .ef-tile.neutral { --tone: var(--muted-foreground); background: color-mix(in oklab, var(--foreground) 6%, var(--background)); color: var(--foreground); }
  .ef-badge { position: absolute; top: -7px; right: -12px; min-width: 22px; padding: 1px 6px; border: 2px solid var(--background); border-radius: 999px; background: var(--foreground); color: var(--background); font-size: 11.5px; font-weight: 700; line-height: 16px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ef-tile-label { font-size: 13.5px; font-weight: 600; line-height: 1.25; color: var(--foreground); }
  .ef-more { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; margin: 16px 0 0; padding: 14px 0 0; border-top: 1px solid var(--border); list-style: none; }
  .ef-more a { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 12px; border: 1px solid var(--border); border-radius: 12px; color: var(--foreground); font-size: 14.5px; font-weight: 600; text-decoration: none; }
  .ef-more a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ef-more small { margin-left: auto; font-size: 12.5px; font-weight: 600; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .ef-more :global(svg) { flex: none; color: var(--muted-foreground); }

  .ef-map { display: grid; gap: 10px; margin: 0 var(--gutter) 22px; padding: 12px; border: 1px solid var(--border); border-radius: 18px; }
  .ef-map-main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px 8px; align-items: center; color: inherit; text-decoration: none; }
  .ef-map-main svg { grid-column: 1 / -1; width: 100%; height: auto; aspect-ratio: 10 / 3; border-radius: 12px; background: color-mix(in oklab, var(--foreground) 3%, var(--background)); }
  .ef-map-main line { stroke: color-mix(in oklab, var(--foreground) 22%, transparent); stroke-width: 0.6; vector-effect: non-scaling-stroke; }
  .ef-map-text { display: grid; gap: 2px; padding-left: 4px; }
  .ef-map-text strong { font-size: 17px; font-weight: 750; letter-spacing: -0.012em; }
  .ef-map-text small { font-size: 13.5px; color: var(--muted-foreground); }
  .ef-map-main > :global(svg:last-child) { margin-right: 4px; color: var(--muted-foreground); }
  .ef-map-main:hover strong { text-decoration: underline; text-underline-offset: 3px; }
  .ef-lenses { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 2px; }
  .ef-lenses a { flex: none; display: inline-flex; align-items: center; min-height: 34px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; color: var(--foreground); font-size: 13.5px; font-weight: 550; text-decoration: none; white-space: nowrap; }
  .ef-lenses a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }

  .ef-cards { display: flex; gap: 12px; margin: 0 calc(var(--gutter) * -1); padding: 2px var(--gutter) 4px; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; scroll-padding-inline: var(--gutter); list-style: none; }
  .ef-cards li { flex: none; width: 148px; scroll-snap-align: start; }
  .ef-cards a { display: grid; gap: 4px; color: inherit; text-decoration: none; }
  .ef-cards img, .ef-card-blank { width: 148px; height: 148px; border-radius: 16px; object-fit: cover; background: var(--secondary); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  .ef-card-blank { display: grid; place-items: center; font-size: 13px; font-weight: 600; color: var(--muted-foreground); }
  .ef-cards strong { margin-top: 4px; font-size: 14.5px; font-weight: 700; line-height: 1.3; overflow-wrap: anywhere; }
  .ef-cards small { font-size: 13px; color: var(--muted-foreground); }
  .ef-cards a:hover strong { text-decoration: underline; text-underline-offset: 3px; }
  .ef-cards a:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 3px; border-radius: 16px; }
  @media (max-width: 640px) { .ef-state { margin-inline: var(--gutter); } .ef-figures dd { font-size: 22px; } }
</style>
