<script lang="ts">
  // Jelajah: news first, then what people are talking about, then places, languages, topics and communities.
  // One tile (ExploreTile) in three shapes, arranged differently per section so the page has a lead and a rhythm:
  // a lead story with a list beside it, a swipeable row, a map with its regions, one specimen with a picker, a
  // dense grid of topics, and two covers for communities. Colours are the kinds' accents from the reader's
  // palette. Every section follows the place chosen in the switcher.
  import { onMount } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import ExploreTile from './ExploreTile.svelte'
  import ExploreTalked from './ExploreTalked.svelte'
  import RegionArt, { type Atlas } from './RegionArt.svelte'
  import WordArt from './WordArt.svelte'
  import LandscapePrint from './LandscapePrint.svelte'
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
  const languageGroup = $derived(shownLanguages ?? languageGroups[0] ?? null)
  let allLanguages = $state(false)

  const TOPICS_FIRST = 8
  // A topic without branches shows the words of its own description, so the tile does not repeat its name.
  const describe = (slug: string) => {
    const d = (bySlug.get(slug)?.description ?? '').replace(/\.$/, '')
    const parts = d.split(/,\s*|\s+dan\s+/).map((x) => x.trim()).filter(Boolean)
    return parts.length ? parts.slice(0, 6) : [bySlug.get(slug)?.title ?? '']
  }
  const topics = $derived(topicTiles(contexts))
  let allTopics = $state(false)

  const ROOMS_FIRST = 6
  const admission: Record<string, string> = { open: 'Terbuka', approval: 'Perlu persetujuan', invite: 'Dengan undangan' }

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
      {@const [lead, ...rest] = news}
      <div class="news-bento">
        <ExploreTile
          shape="cover"
          tone="news"
          href={'/news/' + lead.id}
          title={lead.title}
          text={lead.summary ?? ''}
          meta={[newsDate(lead.publishedAt), lead.sourceCount ? lead.sourceCount + ' sumber' : ''].filter(Boolean).join(' · ')}
        >
          {#snippet art()}
            {#if lead.image}<img src={lead.image} alt="" loading="lazy" decoding="async" />
            {:else if fallbackPrint}<LandscapePrint artwork={fallbackPrint} decorative />{/if}
          {/snippet}
        </ExploreTile>
        {#if rest.length}<div class="news-list">
            {#each rest as item (item.id)}<ExploreTile
                shape="row"
                tone="news"
                href={'/news/' + item.id}
                title={item.title}
                meta={[newsDate(item.publishedAt), item.sourceCount ? item.sourceCount + ' sumber' : ''].filter(Boolean).join(' · ')}
              >
                {#snippet art()}{#if item.image}<img src={item.image} alt="" loading="lazy" decoding="async" />{:else}<span class="day">{newsDate(item.publishedAt).split(' ')[0]}</span>{/if}{/snippet}
              </ExploreTile>{/each}
          </div>{/if}
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
    {#if strata.length}<div class="place-bento">
        {#if atlas}<div class="place-map" aria-hidden="true">
            <svg viewBox={atlas.box.join(' ')} preserveAspectRatio="xMidYMid meet">
              {#each strata as s (s.slug)}{@const shape = atlas.regions[s.slug]}{#if shape}<a href={s.href} tabindex="-1" aria-label={s.title} class:lit={s.slug === focus}><path d={shape.d} /></a>{/if}{/each}
              {#each strata as s (s.slug)}{@const shape = atlas.regions[s.slug]}{#if shape}<text x={shape.x} y={shape.y}>{s.title}</text>{/if}{/each}
            </svg>
          </div>{/if}
        <div class="place-list">
          {#each strata as s (s.slug)}<ExploreTile shape="row" tone="place" href={s.href} title={s.title} text={s.places.length + ' kabupaten dan kota · ' + s.languages + ' bahasa'}>
              {#snippet art()}{#if atlas}<RegionArt {atlas} lit={[s.slug]} />{/if}{/snippet}
            </ExploreTile>{/each}
        </div>
      </div>
      <p class="jelajah-foot">Wilayah adat di sini dipakai sebagai acuan dan tidak menunjukkan batas tanah adat.</p>
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="bahasa" class="jelajah-section" aria-labelledby="bahasa-title">
    <div class="jelajah-head"><h2 id="bahasa-title">Bahasa</h2></div>
    {#if languageGroup}
      <p class="jelajah-lede">{languageTotal} bahasa, dikelompokkan menurut wilayah titik acuannya di Glottolog.</p>
      <div class="lang-picker" role="group" aria-label="Pilih wilayah">
        {#each languageGroups as g (g.slug)}<button type="button" aria-pressed={languageGroup.slug === g.slug} onclick={() => { openLanguages = g.slug; allLanguages = false }}>{g.title} <span>{g.languages.length}</span></button>{/each}
      </div>
      <div class="lang-specimen" class:open={allLanguages}>
        <ul aria-label={'Bahasa dengan titik acuan di ' + languageGroup.title}>
          {#each languageGroup.languages as l (l.slug)}<li><a href={'/contexts/' + l.slug}>{l.title}</a></li>{/each}
        </ul>
        {#if languageGroup.languages.length > 14}<button type="button" class="lang-all" aria-expanded={allLanguages} onclick={() => (allLanguages = !allLanguages)}>
            {allLanguages ? 'Tampilkan lebih sedikit' : 'Semua ' + languageGroup.languages.length + ' bahasa di ' + languageGroup.title}
          </button>{/if}
      </div>
      <p class="jelajah-foot">Nama dan titik acuan dari <a href="https://glottolog.org" rel="noreferrer" target="_blank">Glottolog</a> (CC BY 4.0). Titik acuan tidak menunjukkan batas wilayah bahasa.</p>
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="topik" class="jelajah-section" aria-labelledby="topik-title">
    <div class="jelajah-head"><h2 id="topik-title">Topik</h2></div>
    {#if topics.length}
      <p class="jelajah-lede">Topik dipakai sebagai label pada posting dan halaman wiki.</p>
      <div class="topic-grid">
        {#each allTopics ? topics : topics.slice(0, TOPICS_FIRST) as t (t.slug)}<ExploreTile
            shape="cover"
            tone="topic"
            href={'/contexts/' + t.slug}
            title={t.title}
            meta={t.children.length ? t.children.length + ' cabang' : ''}
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
    {#if communities.length}
      <div class="room-covers">
        {#each communities.slice(0, 2) as c, i (c.id)}{@const print = communityArtwork(c.id)}<ExploreTile shape="cover" tone="room" href={'/communities/' + c.id} title={c.title} meta={admission[c.admission] ?? ''}>
            {#snippet art()}{#if print}<span class="crop" style={'--y:' + (i ? '22%' : '34%')}><LandscapePrint artwork={print} decorative /></span>{/if}{/snippet}
          </ExploreTile>{/each}
      </div>
      {#if communities.length > 2}<div class="room-list">
          {#each communities.slice(2, ROOMS_FIRST) as c (c.id)}<ExploreTile shape="row" tone="room" href={'/communities/' + c.id} title={c.title} text={c.description}>
              {#snippet art()}<span class="initial">{c.title.slice(0, 1)}</span>{/snippet}
            </ExploreTile>{/each}
        </div>{/if}
    {/if}
    <p class="jelajah-links"><a href="/groups">Organisasi</a><a href="/offers">Penawaran</a><a href="/work">Kerja publik</a></p>
  </section>
</div>

<style>
  /* The kinds' colours: accents from the reader's palette (appearance.svelte.ts), lifted in dark mode. */
  .jelajah {
    --tone-place: #1f4e8c;
    --tone-language: #9a6b1f;
    --tone-topic: #3d6a3f;
    --tone-news: #1e6a72;
    --tone-room: #5b4b8a;
    padding-bottom: 24px;
  }
  :global(.dark) .jelajah {
    --tone-place: color-mix(in oklab, #1f4e8c 52%, white);
    --tone-language: color-mix(in oklab, #9a6b1f 62%, white);
    --tone-topic: color-mix(in oklab, #3d6a3f 58%, white);
    --tone-news: color-mix(in oklab, #1e6a72 58%, white);
    --tone-room: color-mix(in oklab, #5b4b8a 55%, white);
  }
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
  .jelajah-anchors a { flex: none; display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border-radius: 999px; font-size: 14px; font-weight: 550; color: var(--muted-foreground); text-decoration: none; }
  .jelajah-anchors a:hover { color: var(--foreground); background: var(--secondary); }
  .jelajah-section { padding-top: 36px; scroll-margin-top: 108px; }
  .jelajah-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 0 16px 8px; }
  .jelajah-head h2 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.015em; text-wrap: balance; }
  .jelajah-head a { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; font-size: 13.5px; color: var(--muted-foreground); text-decoration: none; white-space: nowrap; }
  .jelajah-head a:hover { color: var(--foreground); }
  .jelajah-lede { margin: 0 16px 14px; font-size: 14px; line-height: 1.5; color: var(--muted-foreground); max-width: 62ch; }
  .jelajah-note { margin: 0 16px; font-size: 14px; line-height: 1.55; color: var(--muted-foreground); }
  .jelajah-note a, .jelajah-foot a { color: inherit; text-underline-offset: 3px; }
  .jelajah-foot { margin: 12px 16px 0; font-size: 12.5px; line-height: 1.5; color: var(--muted-foreground); max-width: 62ch; }

  /* Kabar: a lead story, the rest as a list beside it. */
  .news-bento { display: grid; gap: 10px; padding: 0 16px; }
  .news-bento > :global(.cover) { min-height: 300px; }
  .news-bento > :global(.cover h3) { font-size: 19px; }
  .news-list { display: grid; gap: 8px; align-content: start; }
  .news-list .day { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--font-editorial, serif); font-size: 26px; color: var(--ink); }

  /* Dibicarakan: a row to swipe through (styles for ExploreTalked's strip). */
  :global(.explore-strip) { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(190px, 62%); gap: 10px; overflow-x: auto; padding: 2px 16px 6px; scroll-snap-type: x mandatory; scroll-padding-inline: 16px; scrollbar-width: none; overscroll-behavior-x: contain; }
  :global(.explore-strip::-webkit-scrollbar) { display: none; }
  :global(.explore-strip > *) { scroll-snap-align: start; }

  /* Tempat: the map is the lead; the regions are listed beside it. */
  .place-bento { display: grid; gap: 10px; padding: 0 16px; }
  .place-map { position: relative; border-radius: 16px; overflow: hidden; background: color-mix(in oklab, var(--tone-place) 10%, var(--card)); border: 1px solid var(--border); padding: 10px; }
  .place-map svg { display: block; width: 100%; height: auto; }
  .place-map path { fill: color-mix(in oklab, var(--tone-place) 22%, var(--card)); stroke: color-mix(in oklab, var(--tone-place) 55%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; stroke-linejoin: round; transition: fill 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .place-map a:hover path { fill: color-mix(in oklab, var(--tone-place) 48%, var(--card)); }
  .place-map a.lit path { fill: var(--tone-place); }
  .place-map text { font-family: var(--font-editorial, serif); font-size: 34px; text-anchor: middle; fill: var(--foreground); paint-order: stroke; stroke: color-mix(in oklab, var(--tone-place) 10%, var(--card)); stroke-width: 6px; stroke-linejoin: round; pointer-events: none; }
  .place-list { display: grid; gap: 8px; align-content: start; }

  /* Bahasa: one specimen, a picker to change region. */
  .lang-picker { display: flex; gap: 6px; overflow-x: auto; padding: 0 16px 10px; scrollbar-width: none; }
  .lang-picker::-webkit-scrollbar { display: none; }
  .lang-picker button { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; background: var(--card); color: var(--foreground); font: inherit; font-size: 13.5px; font-weight: 550; cursor: pointer; }
  .lang-picker button span { color: var(--muted-foreground); font-weight: 400; font-variant-numeric: tabular-nums; }
  .lang-picker button[aria-pressed='true'] { background: var(--tone-language); border-color: var(--tone-language); color: white; }
  .lang-picker button[aria-pressed='true'] span { color: rgb(255 255 255 / 0.8); }
  :global(.dark) .lang-picker button[aria-pressed='true'] { color: #1b1408; }
  :global(.dark) .lang-picker button[aria-pressed='true'] span { color: rgb(27 20 8 / 0.7); }
  .lang-specimen { position: relative; margin: 0 16px; padding: 16px 16px 14px; border-radius: 16px; background: color-mix(in oklab, var(--tone-language) 10%, var(--card)); border: 1px solid var(--border); }
  .lang-specimen ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 2px; max-height: 196px; overflow: hidden; font-family: var(--font-editorial, serif); font-size: clamp(21px, 3.4vw, 26px); line-height: 1.5; color: var(--tone-language); }
  .lang-specimen.open ul { max-height: none; }
  .lang-specimen li { white-space: nowrap; }
  .lang-specimen li:not(:last-child)::after { content: '·'; padding: 0 0.35em; opacity: 0.45; }
  .lang-specimen a { color: inherit; text-decoration: none; }
  .lang-specimen a:hover { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
  .lang-specimen:not(.open):has(.lang-all) ul { mask-image: linear-gradient(to bottom, black 70%, transparent); }
  .lang-all { margin-top: 10px; min-height: 40px; padding: 0 14px; border: 1px solid color-mix(in oklab, var(--tone-language) 45%, var(--border)); border-radius: 999px; background: var(--card); color: var(--foreground); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }

  /* Topik: a dense grid of small covers. */
  .topic-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 0 16px; }
  .topic-grid > :global(.cover) { min-height: 150px; }
  .topic-grid > :global(.cover .tile-art .word-art) { font-size: 21px; bottom: 40%; }
  .topic-grid > :global(.cover .tile-body), .room-covers > :global(.cover .tile-body) { background: var(--card); }

  /* Komunitas: two covers, then a list. */
  .room-covers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 0 16px; }
  .room-covers > :global(.cover) { min-height: 240px; }
  .crop { position: absolute; inset: 0; }
  .crop :global(.landscape-print) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% var(--y, 50%); }
  .room-list { display: grid; gap: 8px; padding: 10px 16px 0; }
  .initial { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--font-editorial, serif); font-size: 28px; color: var(--ink); }

  .jelajah-more { margin: 12px 16px 0; min-height: 44px; padding: 0 16px; border: 1px solid var(--border); border-radius: 999px; background: var(--card); color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .jelajah-more:hover { background: var(--secondary); }
  .jelajah-links { display: flex; flex-wrap: wrap; gap: 18px; margin: 14px 16px 0; font-size: 14px; }
  .jelajah-links a { color: var(--muted-foreground); text-underline-offset: 3px; min-height: 32px; display: inline-flex; align-items: center; }
  .jelajah-links a:hover { color: var(--foreground); }
  .jelajah a:focus-visible, .jelajah button:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; border-radius: 6px; }
  @media (min-width: 768px) {
    .jelajah-anchors { top: 72px; padding-inline: 20px; }
    .jelajah-section { scroll-margin-top: 128px; }
    .jelajah-head { padding-inline: 24px; }
    .jelajah-lede, .jelajah-note, .jelajah-foot, .jelajah-links, .lang-specimen, .jelajah-more { margin-inline: 24px; }
    .news-bento, .place-bento, .topic-grid, .room-covers, .room-list, .lang-picker { padding-inline: 24px; }
    :global(.explore-strip) { padding-inline: 24px; scroll-padding-inline: 24px; grid-auto-columns: 230px; }
    .news-bento { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
    .news-bento > :global(.cover) { min-height: 380px; }
    .news-bento > :global(.cover h3) { font-size: 23px; }
    .place-bento { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); align-items: start; }
    .topic-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .room-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (prefers-reduced-motion: reduce) { .place-map path { transition: none; } }
</style>
