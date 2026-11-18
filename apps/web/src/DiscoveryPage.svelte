<script lang="ts">
  // Jelajah: news first, then what people are talking about, then places, languages, topics and communities.
  // Every section is the same mosaic of the same tile (ExploreTile): one wide tile, then two to a row on a phone
  // and three on a wide screen. Only the art at the top of a tile changes with the kind, so the page reads as one
  // place to browse and a newcomer learns a single shape. Every section follows the place chosen in the switcher.
  import { onMount } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import ExploreTile from './ExploreTile.svelte'
  import ExploreTalked from './ExploreTalked.svelte'
  import RegionArt, { type Atlas } from './RegionArt.svelte'
  import WordArt from './WordArt.svelte'
  import LandscapePrint from './LandscapePrint.svelte'
  import LanguageSpecimen from './LanguageSpecimen.svelte'
  import { request, type Auth, type Community } from './api'
  import { loadMap, type MapData } from './observatory'
  import { placeScope } from './place-scope.svelte'
  import { communityArtwork, siteBranding } from './site-branding'
  import type { NewsItem } from './news.svelte'
  import { buildStrata, loadAtlas, loadAtlasLangs, loadContexts, regionsOf, topicTiles, type AtlasLang, type Ctx } from './explore-data'

  let { auth }: { auth: Auth } = $props()
  let contexts = $state<Ctx[]>([]),
    communities = $state<Community[]>([]),
    map = $state<MapData | null>(null),
    langs = $state<AtlasLang[]>([]),
    atlas = $state<Atlas | null>(null),
    failed = $state(false)

  onMount(() => {
    const abort = new AbortController()
    loadContexts()
      .then((all) => (contexts = all))
      .catch(() => (failed = true))
    request<Community[]>('/v1/communities', undefined, abort.signal, true)
      .then((all) => (communities = all.filter((c) => c.visibility === 'public')))
      .catch(() => {})
    void loadMap().then((d) => (map = d))
    void loadAtlasLangs().then((l) => (langs = l))
    void loadAtlas().then((a) => (atlas = a))
    return () => abort.abort()
  })

  // News follows the switcher. The public news port is a separate service; when it is down the section says so.
  let news = $state<NewsItem[] | null>(null),
    newsSource = $state(''),
    newsFailed = $state(false)
  $effect(() => {
    const place = placeScope.slug,
      abort = new AbortController()
    news = null
    newsFailed = false
    fetch('/v1/news?limit=6' + (place ? '&place=' + encodeURIComponent(place) : ''), { credentials: 'omit', signal: abort.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: NewsItem[]; source?: { name: string } }>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        news = (d.items ?? []).slice(0, 5)
        newsSource = d.source?.name ?? ''
      })
      .catch(() => {
        if (abort.signal.aborted) return
        news = []
        newsFailed = true
      })
    return () => abort.abort()
  })
  const newsDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '')

  const bySlug = $derived(new Map(contexts.map((c) => [c.slug, c])))
  const focus = $derived(placeScope.slug ? (regionsOf(placeScope.slug, contexts, langs)[0] ?? '') : '')
  // The chosen region comes first, as the wide tile.
  const first = <T extends { slug: string }>(list: T[]) => (focus ? [...list.filter((x) => x.slug === focus), ...list.filter((x) => x.slug !== focus)] : list)
  const strata = $derived(first(buildStrata(contexts, langs, map)))
  const names = (list: { title: string }[], n = 3) =>
    list.length <= n ? list.map((x) => x.title).join(', ') : list.slice(0, n).map((x) => x.title).join(', ') + ' dan ' + (list.length - n) + ' lainnya'

  const languageTotal = $derived(contexts.filter((c) => c.kind === 'language').length)
  const languageGroups = $derived(
    strata
      .map((s) => ({
        slug: s.slug,
        title: s.title,
        languages: langs
          .filter((l) => l[3] === s.slug)
          .map((l) => bySlug.get(l[0]))
          .filter((c): c is Ctx => !!c)
          .sort((a, b) => a.title.localeCompare(b.title, 'id'))
          .map((c) => ({ slug: c.slug, title: c.title })),
      }))
      .filter((g) => g.languages.length),
  )
  let openLanguages = $state('')
  const shownLanguages = $derived(languageGroups.find((g) => g.slug === (openLanguages || focus)) ?? null)
  let languagePanel = $state<HTMLDivElement>()
  // The list opens under the tiles, so it is brought into view; a second tap on the same group closes it.
  function pickLanguages(slug: string) {
    const closing = shownLanguages?.slug === slug
    openLanguages = closing ? '-' : slug
    if (!closing) requestAnimationFrame(() => languagePanel?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }))
  }

  const TOPICS_FIRST = 5
  // A topic without branches shows the words of its own description, so the tile does not repeat its name.
  const describe = (slug: string) => {
    const d = (bySlug.get(slug)?.description ?? '').replace(/\.$/, '')
    const parts = d.split(/,\s*|\s+dan\s+/).map((x) => x.trim()).filter(Boolean)
    return parts.length ? parts.slice(0, 6) : [bySlug.get(slug)?.title ?? '']
  }
  const topics = $derived(topicTiles(contexts))
  let allTopics = $state(false)

  const ROOMS_FIRST = 5
  const admission: Record<string, string> = { open: 'Terbuka untuk bergabung', approval: 'Bergabung dengan persetujuan', invite: 'Dengan undangan' }

  // Everything under the chosen region, so the conversation tiles can follow the switcher too.
  const within = $derived.by(() => {
    if (!focus) return null
    const region = bySlug.get(focus)
    if (!region) return null
    const ids = new Set([region.id])
    for (const c of contexts) if (c.parents?.includes(region.id)) ids.add(c.id)
    for (const l of langs) if (l[3] === focus) { const c = bySlug.get(l[0]); if (c) ids.add(c.id) }
    return ids
  })
  // Arriving with a section in the address (an old /contexts or /topics link, or the menu), scroll there once
  // the places have loaded, since the page grows as its sections fill in.
  let arrived = false
  $effect(() => {
    if (arrived || !strata.length || !location.hash) return
    arrived = true
    requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView())
  })
  const anchors = [
    ['kabar', 'Kabar'],
    ['dibicarakan', 'Dibicarakan'],
    ['tempat', 'Tempat'],
    ['bahasa', 'Bahasa'],
    ['topik', 'Topik'],
    ['komunitas', 'Komunitas'],
  ]
  const fallbackPrint = siteBranding.welcomeArtworks[0] ?? null
</script>

<div class="jelajah">
  <nav class="jelajah-anchors" aria-label="Bagian Jelajah">
    {#each anchors as [id, label]}<a href={'#' + id}>{label}</a>{/each}
  </nav>

  {#if failed}<p class="jelajah-note" role="alert">Daftar tempat, bahasa dan topik belum dapat dimuat. Coba muat ulang halaman.</p>{/if}

  <section id="kabar" class="jelajah-section" aria-labelledby="kabar-title">
    <div class="jelajah-head">
      <h2 id="kabar-title">Kabar{#if placeScope.slug} {placeScope.title}{/if}</h2>
      <a href="/news">Semua kabar <ArrowUpRight size={14} /></a>
    </div>
    {#if news === null}<p class="jelajah-note" role="status">Memuat kabar…</p>
    {:else if news.length}
      <div class="explore-mosaic">
        {#each news as item, i (item.id)}<ExploreTile
            bare={i > 0 && !item.image}
            wide={i === 0}
            tone="news"
            href={'/news/' + item.id}
            title={item.title}
            text={i === 0 ? (item.summary ?? '') : ''}
            meta={[newsDate(item.publishedAt), item.sourceCount ? item.sourceCount + ' sumber' : ''].filter(Boolean).join(' · ')}
          >
            {#snippet art()}
              {#if item.image}<img src={item.image} alt="" loading="lazy" decoding="async" />
              {:else if fallbackPrint}<LandscapePrint artwork={fallbackPrint} decorative />{/if}
            {/snippet}
          </ExploreTile>{/each}
      </div>
      {#if newsSource}<p class="jelajah-foot">Dirangkum dari {newsSource}.</p>{/if}
    {:else}<p class="jelajah-note">{newsFailed ? 'Kabar belum dapat dimuat saat ini.' : 'Belum ada kabar untuk tempat ini.'} <a href="/news">Buka halaman Kabar</a></p>{/if}
  </section>

  <section id="dibicarakan" class="jelajah-section" aria-labelledby="dibicarakan-title">
    <div class="jelajah-head"><h2 id="dibicarakan-title">Sedang dibicarakan{#if focus} di {placeScope.title}{/if}</h2></div>
    <ExploreTalked recorded={contexts} {within} {atlas} {langs} />
  </section>

  <section id="tempat" class="jelajah-section" aria-labelledby="tempat-title">
    <div class="jelajah-head">
      <h2 id="tempat-title">Tempat</h2>
      <a href="/wiki">Peta di Wiki <ArrowUpRight size={14} /></a>
    </div>
    <p class="jelajah-lede">Tujuh wilayah adat dan kabupaten serta kota di dalamnya.</p>
    {#if strata.length}<div class="explore-mosaic">
        {#each strata as s, i (s.slug)}<ExploreTile
            wide={i === 0}
            tone="place"
            href={s.href}
            title={s.title}
            text={names(s.places)}
            meta={s.places.length + ' kabupaten dan kota · ' + s.languages + ' bahasa'}
          >
            {#snippet art()}{#if atlas}<RegionArt {atlas} lit={[s.slug]} />{/if}{/snippet}
          </ExploreTile>{/each}
      </div>
      <p class="jelajah-foot">Wilayah adat di sini dipakai sebagai acuan dan tidak menunjukkan batas tanah adat.</p>
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="bahasa" class="jelajah-section" aria-labelledby="bahasa-title">
    <div class="jelajah-head"><h2 id="bahasa-title">Bahasa</h2></div>
    {#if languageGroups.length}
      <p class="jelajah-lede">{languageTotal} bahasa, dikelompokkan menurut wilayah titik acuannya. Pilih wilayah untuk melihat semua namanya.</p>
      <div class="explore-mosaic">
        {#each languageGroups as g, i (g.slug)}<ExploreTile
            wide={i === 0}
            tone="language"
            title={g.title}
            meta={g.languages.length + ' bahasa'}
            pressed={shownLanguages?.slug === g.slug}
            onclick={() => pickLanguages(g.slug)}
          >
            {#snippet art()}<WordArt words={g.languages.slice(0, 18).map((l) => l.title)} />{/snippet}
          </ExploreTile>{/each}
      </div>
      {#if shownLanguages}<div class="jelajah-panel" bind:this={languagePanel}><LanguageSpecimen groups={[shownLanguages]} total={shownLanguages.languages.length} open /></div>
      {:else}<p class="jelajah-foot">Nama dan titik acuan dari <a href="https://glottolog.org" rel="noreferrer" target="_blank">Glottolog</a> (CC BY 4.0).</p>{/if}
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="topik" class="jelajah-section" aria-labelledby="topik-title">
    <div class="jelajah-head"><h2 id="topik-title">Topik</h2></div>
    {#if topics.length}
      <p class="jelajah-lede">Topik dipakai sebagai label pada posting dan halaman wiki.</p>
      <div class="explore-mosaic">
        {#each allTopics ? topics : topics.slice(0, TOPICS_FIRST) as t, i (t.slug)}<ExploreTile
            wide={i === 0}
            tone="topic"
            href={'/contexts/' + t.slug}
            title={t.title}
            text={t.children.length ? (bySlug.get(t.slug)?.description ?? '') : ''}
            meta={t.children.length ? t.children.length + ' cabang' : 'Topik'}
          >
            {#snippet art()}<WordArt words={t.children.length ? t.children.slice(0, 6).map((c) => c.title) : describe(t.slug)} />{/snippet}
          </ExploreTile>{/each}
      </div>
      {#if topics.length > TOPICS_FIRST}<button type="button" class="jelajah-more" aria-expanded={allTopics} onclick={() => (allTopics = !allTopics)}>
          {allTopics ? 'Tampilkan lebih sedikit' : 'Semua ' + topics.length + ' topik'}
        </button>{/if}
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="komunitas" class="jelajah-section" aria-labelledby="komunitas-title">
    <div class="jelajah-head">
      <h2 id="komunitas-title">Komunitas</h2>
      <a href="/communities">Semua komunitas <ArrowUpRight size={14} /></a>
    </div>
    {#if communities.length}<div class="explore-mosaic">
        {#each communities.slice(0, ROOMS_FIRST) as c, i (c.id)}{@const print = communityArtwork(c.id)}<ExploreTile
            wide={i === 0}
            bare={i > 0}
            tone="room"
            href={'/communities/' + c.id}
            title={c.title}
            text={c.description}
            meta={admission[c.admission] ?? ''}
          >
            {#snippet art()}{#if print}<LandscapePrint artwork={print} decorative />{/if}{/snippet}
          </ExploreTile>{/each}
      </div>{/if}
    <p class="jelajah-links"><a href="/groups">Organisasi</a><a href="/offers">Penawaran</a><a href="/work">Kerja publik</a></p>
  </section>
</div>

<style>
  .jelajah { padding-bottom: 24px; }
  /* The section rail shares the top bar's surface, so the two read as one header. */
  .jelajah-anchors {
    position: sticky;
    top: 56px;
    z-index: 5;
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 6px 12px;
    background: color-mix(in srgb, var(--page-ground, var(--background)) 94%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--commons-hairline, var(--border));
  }
  .jelajah-anchors::-webkit-scrollbar { display: none; }
  .jelajah-anchors a {
    flex: none;
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 550;
    color: var(--muted-foreground);
    text-decoration: none;
  }
  .jelajah-anchors a:hover { color: var(--foreground); background: var(--secondary); }
  .jelajah-section { padding-top: 32px; scroll-margin-top: 108px; }
  .jelajah-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 0 16px 8px; }
  .jelajah-head h2 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.015em; text-wrap: balance; }
  .jelajah-head a { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; font-size: 13.5px; color: var(--muted-foreground); text-decoration: none; white-space: nowrap; }
  .jelajah-head a:hover { color: var(--foreground); }
  .jelajah-lede { margin: 0 16px 12px; font-size: 14px; line-height: 1.5; color: var(--muted-foreground); max-width: 62ch; }
  .jelajah-note { margin: 0 16px; font-size: 14px; line-height: 1.55; color: var(--muted-foreground); }
  .jelajah-note a, .jelajah-foot a { color: inherit; text-underline-offset: 3px; }
  .jelajah-foot { margin: 10px 16px 0; font-size: 12.5px; line-height: 1.5; color: var(--muted-foreground); max-width: 62ch; }
  /* The mosaic: one wide tile, then two to a row; three to a row on a wide screen, the wide tile taking two. */
  :global(.explore-mosaic) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 0 16px; }
  :global(.explore-mosaic > .wide) { grid-column: 1 / -1; }
  /* A last tile left alone in its row takes the row, so the mosaic never ends on a hole. */
  :global(.explore-mosaic > :last-child:nth-child(2n)) { grid-column: 1 / -1; }
  .jelajah-panel { margin: 12px 16px 0; padding: 16px 0 12px; border: 1px solid var(--border); border-radius: 14px; background: var(--card); }
  .jelajah-panel :global(.specimen) { padding-inline: 16px; }
  .jelajah-more {
    margin: 12px 16px 0;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--card);
    color: var(--foreground);
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .jelajah-more:hover { background: var(--secondary); }
  .jelajah-links { display: flex; flex-wrap: wrap; gap: 18px; margin: 14px 16px 0; font-size: 14px; }
  .jelajah-links a { color: var(--muted-foreground); text-underline-offset: 3px; min-height: 32px; display: inline-flex; align-items: center; }
  .jelajah-links a:hover { color: var(--foreground); }
  .jelajah a:focus-visible, .jelajah-more:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; border-radius: 6px; }
  @media (min-width: 768px) {
    .jelajah-anchors { top: 72px; padding-inline: 20px; }
    .jelajah-section { scroll-margin-top: 128px; }
    .jelajah-head { padding-inline: 24px; }
    .jelajah-lede, .jelajah-note, .jelajah-foot, .jelajah-links { margin-inline: 24px; }
    :global(.explore-mosaic) { padding-inline: 24px; gap: 12px; }
    .jelajah-panel, .jelajah-more { margin-inline: 24px; }
    .jelajah-panel :global(.specimen) { padding-inline: 20px; }
  }
  @media (min-width: 1000px) {
    :global(.explore-mosaic) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    :global(.explore-mosaic > .wide) { grid-column: span 2; }
    :global(.explore-mosaic > :last-child:nth-child(2n):not(.wide)) { grid-column: auto; }
    :global(.explore-mosaic > :last-child:nth-child(3n + 1):not(:first-child)) { grid-column: span 2; }
  }
</style>
