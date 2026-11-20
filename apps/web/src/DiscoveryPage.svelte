<script lang="ts">
  // Jelajah: what people are talking about first, then communities and topics, places, news and languages.
  // Each section has the same shape: a heading with a heavy rule above it, at most one or two headline cards
  // (ExploreTile), and the rest as open rows with hairlines (ExploreRow), the way the Kabar list reads in the
  // Beranda rail. Places are a row to swipe through, languages and topics are set in type alone. Colours are the
  // kinds' accents from the reader's palette. Every section follows the place chosen in the switcher.
  import { onMount } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import ExploreTile from './ExploreTile.svelte'
  import ExploreRow from './ExploreRow.svelte'
  import ExploreTalked from './ExploreTalked.svelte'
  import RegionArt, { type Atlas } from './RegionArt.svelte'
  import LandscapePrint from './LandscapePrint.svelte'
  import { request, type Auth, type Community } from './api'
  import { beginRequest } from './network.svelte'
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
    // The page-level loads count for the app's loading line; the lists they fill are shared and quiet on their own.
    const done = beginRequest()
    const settle = (p: Promise<unknown>) => p.catch(() => {})
    void Promise.allSettled([
      settle(loadContexts().then((all) => (contexts = all)).catch(() => (failed = true))),
      settle(request<Community[]>('/v1/communities', undefined, abort.signal, true).then((all) => (communities = all.filter((c) => c.visibility === 'public')))),
      settle(loadMap().then((d) => (map = d))),
      settle(loadAtlasLangs().then((l) => (langs = l))),
      settle(loadAtlas().then((a) => (atlas = a))),
    ]).then(done)
    return () => {
      abort.abort()
      done()
    }
  })

  // News follows the switcher. The public news port is a separate service; when it is down the section says so.
  let news = $state<NewsItem[] | null>(null),
    newsSource = $state(''),
    newsFailed = $state(false)
  $effect(() => {
    const place = placeScope.slug,
      abort = new AbortController(),
      done = beginRequest()
    news = null
    newsFailed = false
    fetch('/v1/news?limit=7' + (place ? '&place=' + encodeURIComponent(place) : ''), { credentials: 'omit', signal: abort.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: NewsItem[]; source?: { name: string } }>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        news = (d.items ?? []).slice(0, 6)
        newsSource = d.source?.name ?? ''
      })
      .catch(() => {
        if (abort.signal.aborted) return
        news = []
        newsFailed = true
      })
      .finally(done)
    return () => abort.abort()
  })
  const newsDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '')
  const newsMeta = (i: NewsItem) => [newsDate(i.publishedAt), i.sourceCount ? i.sourceCount + ' sumber' : ''].filter(Boolean).join(' · ')

  const bySlug = $derived(new Map(contexts.map((c) => [c.slug, c])))
  const focus = $derived(placeScope.slug ? (regionsOf(placeScope.slug, contexts, langs)[0] ?? '') : '')
  // The chosen region comes first, as the wide tile.
  const first = <T extends { slug: string }>(list: T[]) => (focus ? [...list.filter((x) => x.slug === focus), ...list.filter((x) => x.slug !== focus)] : list)
  const strata = $derived(first(buildStrata(contexts, langs, map)))

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

  const ROOMS_SHOWN = 10
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
    ['dibicarakan', 'Dibicarakan'],
    ['komunitas', 'Komunitas'],
    ['topik', 'Topik'],
    ['tempat', 'Tempat'],
    ['kabar', 'Kabar'],
    ['bahasa', 'Bahasa'],
  ]
  // The section bar scrolls inside the page: no navigation, no reload. The address keeps the section in its
  // hash through replaceState, so a shared link still lands in the right place and Back leaves Jelajah in one step.
  let current = $state('')
  function jump(e: MouseEvent, id: string) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(history.state, '', location.pathname + location.search + '#' + id)
    current = id
    ;(e.currentTarget as HTMLElement).scrollIntoView({ inline: 'center', block: 'nearest', behavior: calm ? 'auto' : 'smooth' })
  }
  onMount(() => {
    // The last section whose top has passed under the bars is the current one.
    let frame = 0
    const spy = () => {
      frame = 0
      let now = ''
      for (const [id] of anchors) if ((document.getElementById(id)?.getBoundingClientRect().top ?? 1e9) <= 150) now = id
      current = now
    }
    const onScroll = () => { frame ||= requestAnimationFrame(spy) }
    addEventListener('scroll', onScroll, { passive: true })
    spy()
    return () => {
      removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  })
  const fallbackPrint = siteBranding.welcomeArtworks[0] ?? null
  const TEMPAT_BLURB = 'Tujuh wilayah adat dan kabupaten serta kota di dalamnya.'
</script>

<div class="jelajah">
  <nav class="jelajah-anchors" aria-label="Bagian Jelajah">
    {#each anchors as [id, label]}<a href={'#' + id} aria-current={current === id ? 'location' : undefined} onclick={(e) => jump(e, id)}>{label}</a>{/each}
  </nav>

  {#if failed}<p class="jelajah-note" role="alert">Daftar tempat, bahasa dan topik belum dapat dimuat. Coba muat ulang halaman.</p>{/if}

  <section id="dibicarakan" class="jelajah-section" aria-labelledby="dibicarakan-title">
    <div class="jelajah-head"><h2 id="dibicarakan-title">Sedang dibicarakan{#if focus} di {placeScope.title}{/if}</h2></div>
    <ExploreTalked recorded={contexts} {within} {communities} />
  </section>

  <section id="komunitas" class="jelajah-section" aria-labelledby="komunitas-title">
    <div class="jelajah-head">
      <h2 id="komunitas-title">Komunitas</h2>
      <a href="/communities">Semua komunitas <ArrowUpRight size={14} /></a>
    </div>
    {#if communities.length}
      <div class="room-covers">
        {#each communities.slice(0, 2) as c, i (c.id)}{@const print = communityArtwork(c.id)}<ExploreTile tone="room" href={'/communities/' + c.id} title={c.title} meta={admission[c.admission] ?? ''}>
            {#snippet art()}{#if print}<span class="crop" style={'--y:' + (i ? '22%' : '34%')}><LandscapePrint artwork={print} decorative /></span>{/if}{/snippet}
          </ExploreTile>{/each}
      </div>
      {#if communities.length > 2}<ul class="open-list cols">
          {#each communities.slice(2, ROOMS_SHOWN) as c (c.id)}<ExploreRow title={c.title} text={c.description} meta={admission[c.admission] ?? ''} href={'/communities/' + c.id} />{/each}
        </ul>{/if}
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
    <p class="jelajah-links"><a href="/groups">Organisasi</a><a href="/offers">Penawaran</a><a href="/work">Kerja publik</a></p>
  </section>

  <section id="topik" class="jelajah-section" aria-labelledby="topik-title">
    <div class="jelajah-head"><h2 id="topik-title">Topik</h2></div>
    {#if topics.length}
      <p class="jelajah-lede">Topik dipakai sebagai label pada posting dan halaman wiki.</p>
      <ul class="topic-set">
        {#each allTopics ? topics : topics.slice(0, TOPICS_FIRST) as t (t.slug)}<li>
            <a href={'/contexts/' + t.slug}>
              <strong>{t.title}</strong>
              <span>{(t.children.length ? t.children.slice(0, 6).map((c) => c.title) : describe(t.slug)).join(', ')}</span>
            </a>
          </li>{/each}
      </ul>
      {#if topics.length > TOPICS_FIRST}<button type="button" class="jelajah-more" aria-expanded={allTopics} onclick={() => (allTopics = !allTopics)}>
          {allTopics ? 'Tampilkan lebih sedikit' : 'Semua ' + topics.length + ' topik'}
        </button>{/if}
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="tempat" class="jelajah-section" aria-labelledby="tempat-title">
    <div class="jelajah-head">
      <h2 id="tempat-title">Tempat</h2>
      <a href="/wiki#wp-places">Peta di Wiki <ArrowUpRight size={14} /></a>
    </div>
    <p class="jelajah-lede">{TEMPAT_BLURB}</p>
    {#if strata.length}<ul class="place-scroll" aria-label="Wilayah adat">
        {#each strata as s (s.slug)}<li>
            <a href={s.href}>
              <span class="place-map" aria-hidden="true">{#if atlas}<RegionArt {atlas} lit={[s.slug]} />{/if}</span>
              <strong>{s.title}</strong>
              <span class="place-meta">{s.places.length} kabupaten dan kota<br />{s.languages} bahasa</span>
            </a>
          </li>{/each}
      </ul>
      <p class="jelajah-foot">Wilayah adat di sini dipakai sebagai acuan dan tidak menunjukkan batas tanah adat.</p>
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="kabar" class="jelajah-section" aria-labelledby="kabar-title">
    <div class="jelajah-head">
      <h2 id="kabar-title">Kabar{#if placeScope.slug} {placeScope.title}{/if}</h2>
      <a href="/news">Semua kabar <ArrowUpRight size={14} /></a>
    </div>
    {#if news === null}<p class="jelajah-note" role="status">Memuat kabar…</p>
    {:else if news.length}
      {@const [lead, ...rest] = news}
      <div class="news-bento">
        <ExploreTile tone="news" href={'/news/' + lead.id} title={lead.title} text={lead.summary ?? ''} meta={newsMeta(lead)}>
          {#snippet art()}
            {#if lead.image}<img src={lead.image} alt="" loading="lazy" decoding="async" />
            {:else if fallbackPrint}<LandscapePrint artwork={fallbackPrint} decorative />{/if}
          {/snippet}
        </ExploreTile>
        {#if rest.length}<ul class="open-list">
            {#each rest as item (item.id)}<ExploreRow title={item.title} meta={newsMeta(item)} href={'/news/' + item.id} image={item.image} />{/each}
          </ul>{/if}
      </div>
      {#if newsSource}<p class="jelajah-foot">Dirangkum dari {newsSource}.</p>{/if}
    {:else}<p class="jelajah-note">{newsFailed ? 'Kabar belum dapat dimuat saat ini.' : 'Belum ada kabar untuk tempat ini.'} <a href="/news">Buka halaman Kabar</a></p>{/if}
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
        {#if languageGroup.languages.length > 14}<button type="button" class="jelajah-more" aria-expanded={allLanguages} onclick={() => (allLanguages = !allLanguages)}>
            {allLanguages ? 'Tampilkan lebih sedikit' : 'Semua ' + languageGroup.languages.length + ' bahasa di ' + languageGroup.title}
          </button>{/if}
      </div>
      <p class="jelajah-foot">Nama dan titik acuan dari <a href="https://glottolog.org" rel="noreferrer" target="_blank">Glottolog</a> (CC BY 4.0). Titik acuan tidak menunjukkan batas wilayah bahasa.</p>
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
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
    --gutter: 16px;
    padding-bottom: 48px;
  }
  :global(.dark) .jelajah {
    --tone-place: color-mix(in oklab, #1f4e8c 52%, white);
    --tone-language: color-mix(in oklab, #9a6b1f 62%, white);
    --tone-topic: color-mix(in oklab, #3d6a3f 58%, white);
    --tone-news: color-mix(in oklab, #1e6a72 58%, white);
    --tone-room: color-mix(in oklab, #5b4b8a 55%, white);
  }
  /* The section bar shares the top bar's surface, so the two read as one header. */
  .jelajah-anchors {
    position: sticky;
    top: 56px;
    z-index: 5;
    display: flex;
    gap: 22px;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 0 var(--gutter);
    background: color-mix(in srgb, var(--page-ground, var(--background)) 94%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--commons-hairline, var(--border));
  }
  .jelajah-anchors::-webkit-scrollbar { display: none; }
  .jelajah-anchors a { flex: none; display: inline-flex; align-items: center; min-height: 44px; border-bottom: 2px solid transparent; margin-bottom: -1px; font-size: 14px; font-weight: 550; color: var(--muted-foreground); text-decoration: none; transition: color 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .jelajah-anchors a:hover { color: var(--foreground); }
  .jelajah-anchors a[aria-current='location'] { color: var(--foreground); border-bottom-color: var(--foreground); }

  /* One rhythm: a heavy rule, the heading, then the content, all on the same left edge. */
  .jelajah-section { padding: 56px var(--gutter) 0; scroll-margin-top: 104px; }
  .jelajah-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-top: 12px; margin-bottom: 14px; border-top: 2px solid var(--foreground); }
  .jelajah-head h2 { margin: 0; font-size: 26px; font-weight: 700; line-height: 1.15; letter-spacing: -0.025em; text-wrap: balance; }
  .jelajah-head a { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; font-size: 13.5px; color: var(--muted-foreground); text-decoration: none; white-space: nowrap; }
  .jelajah-head a:hover { color: var(--foreground); }
  .jelajah-lede { margin: 0 0 16px; font-size: 14.5px; line-height: 1.5; color: var(--muted-foreground); max-width: 62ch; }
  .jelajah-note { margin: 0; font-size: 14px; line-height: 1.55; color: var(--muted-foreground); }
  .jelajah > .jelajah-note { margin: 16px var(--gutter) 0; }
  .jelajah-note a, .jelajah-foot a { color: inherit; text-underline-offset: 3px; }
  .jelajah-foot { margin: 14px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--muted-foreground); max-width: 62ch; }

  /* Open lists: rows with hairlines, in two columns when there is room (ExploreRow draws the rows). */
  :global(.open-list) { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--commons-hairline, var(--border)); }
  .jelajah-section > :global(.open-list.cols), .jelajah-section > .room-covers + :global(.open-list) { margin-top: 18px; }

  /* Kabar: one headline, the rest as rows. */
  .news-bento { display: grid; gap: 14px; }
  .news-bento > :global(.cover) { min-height: 280px; }
  .news-bento > :global(.cover h3) { font-size: 19px; }
  .news-bento > :global(.open-list) { align-self: start; }

  /* Komunitas: two headline covers, then rows. */
  .room-covers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .room-covers > :global(.cover) { min-height: 220px; }
  .room-covers > :global(.cover .tile-body) { background: var(--card); }
  .crop { position: absolute; inset: 0; }
  .crop :global(.landscape-print) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% var(--y, 50%); }
  .jelajah-links { display: flex; flex-wrap: wrap; gap: 4px 20px; margin: 16px 0 0; font-size: 14px; }
  .jelajah-links a { color: var(--muted-foreground); text-underline-offset: 3px; min-height: 32px; display: inline-flex; align-items: center; }
  .jelajah-links a:hover { color: var(--foreground); }

  /* Topik: names and their branches in type, nothing around them. */
  .topic-set { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
  .topic-set li { border-top: 1px solid var(--commons-hairline, var(--border)); }
  .topic-set a { display: grid; gap: 4px; padding: 12px 0 14px; color: inherit; text-decoration: none; }
  .topic-set strong { font-family: var(--font-editorial, serif); font-size: 21px; font-weight: 500; line-height: 1.15; letter-spacing: -0.01em; color: var(--tone-topic); overflow-wrap: anywhere; }
  .topic-set span { font-size: 13px; line-height: 1.45; color: var(--muted-foreground); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .topic-set a:hover strong { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }

  /* Tempat: regions to swipe through, each with its own small map. */
  .place-scroll { list-style: none; display: flex; gap: 18px; margin: 0 calc(var(--gutter) * -1); padding: 2px var(--gutter) 6px; overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: var(--gutter); scrollbar-width: none; overscroll-behavior-x: contain; }
  .place-scroll::-webkit-scrollbar { display: none; }
  .place-scroll li { flex: none; width: 132px; scroll-snap-align: start; --ink: var(--tone-place); }
  .place-scroll a { display: grid; gap: 3px; color: inherit; text-decoration: none; }
  .place-map { position: relative; display: block; aspect-ratio: 4 / 3; border-radius: 10px; overflow: hidden; background: color-mix(in oklab, var(--tone-place) 11%, var(--background)); margin-bottom: 7px; }
  .place-scroll strong { font-size: 15px; font-weight: 600; line-height: 1.3; }
  .place-meta { font-size: 12.5px; line-height: 1.4; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .place-scroll a:hover strong { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }

  /* Bahasa: a picker of regions and one specimen, set in type with a hairline above it. */
  .lang-picker { display: flex; gap: 20px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--commons-hairline, var(--border)); }
  .lang-picker::-webkit-scrollbar { display: none; }
  .lang-picker button { flex: none; display: inline-flex; align-items: baseline; gap: 6px; min-height: 40px; padding: 0; margin-bottom: -1px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--muted-foreground); font: inherit; font-size: 14px; font-weight: 550; cursor: pointer; }
  .lang-picker button span { font-size: 12px; font-weight: 400; font-variant-numeric: tabular-nums; }
  .lang-picker button:hover { color: var(--foreground); }
  .lang-picker button[aria-pressed='true'] { color: var(--foreground); border-bottom-color: var(--tone-language); }
  .lang-specimen { padding-top: 18px; }
  .lang-specimen ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: baseline; max-height: 168px; overflow: hidden; font-family: var(--font-editorial, serif); font-size: clamp(22px, 3.4vw, 28px); line-height: 1.5; color: var(--tone-language); }
  .lang-specimen.open ul { max-height: none; }
  .lang-specimen li { white-space: nowrap; }
  .lang-specimen li:not(:last-child)::after { content: '·'; padding: 0 0.4em; opacity: 0.4; }
  .lang-specimen a { color: inherit; text-decoration: none; }
  .lang-specimen a:hover { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
  .lang-specimen:not(.open):has(.jelajah-more) ul { mask-image: linear-gradient(to bottom, black 65%, transparent); }

  /* A text button that opens the rest of a set in place. */
  .jelajah-more { margin: 12px 0 0; min-height: 44px; padding: 0; border: 0; background: none; color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; cursor: pointer; }
  .jelajah-more:hover { text-decoration-thickness: 2px; }
  .jelajah a:focus-visible, .jelajah button:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; border-radius: 6px; }

  @media (min-width: 768px) {
    .jelajah { --gutter: 24px; }
    .jelajah-anchors { top: 72px; }
    .jelajah-section { scroll-margin-top: 124px; padding-top: 64px; }
    .jelajah-head h2 { font-size: 30px; }
    .news-bento { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 32px; }
    .news-bento > :global(.cover) { min-height: 360px; }
    .news-bento > :global(.cover h3) { font-size: 23px; }
    .room-covers { gap: 14px; }
    .room-covers > :global(.cover) { min-height: 260px; }
    :global(.open-list.cols), :global(.talked-list) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 40px; }
    .topic-set { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0 28px; }
    .place-scroll li { width: 168px; }
  }
  @media (prefers-reduced-motion: reduce) { .jelajah-anchors a { transition: none; } }
</style>
