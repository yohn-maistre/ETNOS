<script lang="ts">
  // Jelajah, in the register of the Threads and X explore pages: today's news first, then what people are
  // talking about, topics, communities and organisations, places and languages. Each section has its own
  // component (washed news cards and rows with thumbnails, a talked-about list, topic pills, community rows with
  // avatars, a place scroller, language chips) inside one rhythm of headings, rows and hover fills.
  // Every section follows the place chosen in the switcher.
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
    fetch('/v1/news?limit=8' + (place ? '&place=' + encodeURIComponent(place) : ''), { credentials: 'omit', signal: abort.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: NewsItem[]; source?: { name: string } }>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        news = (d.items ?? []).slice(0, 7)
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

  const TOPICS_FIRST = 12
  // A topic without branches shows the words of its own description, so the tile does not repeat its name.
  const describe = (slug: string) => {
    const d = (bySlug.get(slug)?.description ?? '').replace(/\.$/, '')
    const parts = d.split(/,\s*|\s+dan\s+/).map((x) => x.trim()).filter(Boolean)
    return parts.length ? parts.slice(0, 6) : [bySlug.get(slug)?.title ?? '']
  }
  const topics = $derived(topicTiles(contexts))
  let allTopics = $state(false)

  const ROOMS_SHOWN = 6
  const LANGS_FIRST = 18
  // A community without a picture gets its initials on a tone of its own, stable for its id.
  const TONES = ['#1f4e8c', '#3d6a3f', '#9a6b1f', '#5b4b8a', '#1e6a72', '#b7775c']
  const toneOf = (id: string) => TONES[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TONES.length]
  const initials = (t: string) => t.replace(/&/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
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
    ['topik', 'Topik'],
    ['komunitas', 'Komunitas'],
    ['tempat', 'Tempat'],
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
  <nav class="jelajah-tabs" aria-label="Bagian Jelajah">
    {#each anchors as [id, label]}<a href={'#' + id} aria-current={current === id ? 'location' : undefined} onclick={(e) => jump(e, id)}><span>{label}</span></a>{/each}
  </nav>

  {#if failed}<p class="jelajah-note pad" role="alert">Daftar tempat, bahasa dan topik belum dapat dimuat. Coba muat ulang halaman.</p>{/if}

  <section id="kabar" class="jelajah-section" aria-labelledby="kabar-title">
    <div class="jelajah-head">
      <h2 id="kabar-title">Kabar hari ini{#if placeScope.slug} di {placeScope.title}{/if}</h2>
      <a href="/news">Semua kabar</a>
    </div>
    {#if news === null}<div class="news-skeleton" aria-hidden="true"><span></span><span></span><span></span></div><p class="sr-only" role="status">Memuat kabar</p>
    {:else if news.length}
      {@const [lead, ...rest] = news}
      <div class="news-top" class:solo={rest.length < 2}>
        <ExploreTile tone="news" href={'/news/' + lead.id} title={lead.title} text={lead.summary ?? ''} meta={newsMeta(lead)}>
          {#snippet art()}
            {#if lead.image}<img src={lead.image} alt="" loading="lazy" decoding="async" />
            {:else if fallbackPrint}<LandscapePrint artwork={fallbackPrint} decorative />{/if}
          {/snippet}
        </ExploreTile>
        {#if rest.length >= 2}<div class="news-side">
            {#each rest.slice(0, 2) as item (item.id)}<ExploreTile tone="news" href={'/news/' + item.id} title={item.title} meta={newsMeta(item)}>
                {#snippet art()}
                  {#if item.image}<img src={item.image} alt="" loading="lazy" decoding="async" />
                  {:else if fallbackPrint}<LandscapePrint artwork={fallbackPrint} decorative />{/if}
                {/snippet}
              </ExploreTile>{/each}
          </div>{/if}
      </div>
      {#if rest.length > 2}<ul class="open-list">
          {#each rest.slice(2) as item (item.id)}<ExploreRow title={item.title} meta={newsMeta(item)} href={'/news/' + item.id} image={item.image} />{/each}
        </ul>{/if}
      {#if newsSource}<p class="jelajah-foot">Setiap kabar meringkas beberapa liputan. Sumber aslinya tercantum di halaman kabar.</p>{/if}
    {:else}<p class="jelajah-note">{newsFailed ? 'Kabar belum dapat dimuat saat ini.' : 'Belum ada kabar untuk tempat ini.'} <a href="/news">Buka halaman Kabar</a></p>{/if}
  </section>

  <section id="dibicarakan" class="jelajah-section" aria-labelledby="dibicarakan-title">
    <div class="jelajah-head"><h2 id="dibicarakan-title">Sedang dibicarakan{#if focus} di {placeScope.title}{/if}</h2></div>
    <ExploreTalked recorded={contexts} {within} {communities} />
  </section>

  <section id="topik" class="jelajah-section" aria-labelledby="topik-title">
    <div class="jelajah-head"><h2 id="topik-title">Topik</h2></div>
    {#if topics.length}
      <p class="jelajah-lede">Label pada posting dan halaman wiki.</p>
      <ul class="pill-set">
        {#each allTopics ? topics : topics.slice(0, TOPICS_FIRST) as t (t.slug)}<li><a class="pill" href={'/wiki/' + t.slug} title={(t.children.length ? t.children.slice(0, 6).map((c) => c.title) : describe(t.slug)).join(', ')}>{t.title}</a></li>{/each}
        {#if topics.length > TOPICS_FIRST}<li><button type="button" class="pill ghost" aria-expanded={allTopics} onclick={() => (allTopics = !allTopics)}>{allTopics ? 'Lebih sedikit' : 'Semua ' + topics.length + ' topik'}</button></li>{/if}
      </ul>
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="komunitas" class="jelajah-section" aria-labelledby="komunitas-title">
    <div class="jelajah-head">
      <h2 id="komunitas-title">Komunitas dan lembaga</h2>
      <a href="/communities">Semua komunitas</a>
    </div>
    {#if communities.length}
      <ul class="people-list">
        {#each communities.slice(0, ROOMS_SHOWN) as c (c.id)}<li>
            <a href={'/communities/' + c.id}>
              <span class="avatar" style={'--tone:' + toneOf(c.id)} aria-hidden="true">{initials(c.title)}</span>
              <span class="who">
                <strong>{c.title}</strong>
                <span class="meta">Publik · {admission[c.admission] ?? 'Terbuka'}</span>
                {#if c.description}<span class="bio">{c.description}</span>{/if}
              </span>
              <span class="pill small" aria-hidden="true">Lihat</span>
            </a>
          </li>{/each}
      </ul>
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
    <ul class="pill-set quiet" aria-label="Lainnya">
      <li><a class="pill ghost" href="/groups">Organisasi</a></li>
      <li><a class="pill ghost" href="/offers">Penawaran</a></li>
      <li><a class="pill ghost" href="/work">Kerja publik</a></li>
    </ul>
  </section>

  <section id="tempat" class="jelajah-section" aria-labelledby="tempat-title">
    <div class="jelajah-head">
      <h2 id="tempat-title">Tempat</h2>
      <a href="/wiki#wp-places">Peta wilayah</a>
    </div>
    <p class="jelajah-lede">{TEMPAT_BLURB}</p>
    {#if strata.length}<ul class="place-scroll" aria-label="Wilayah adat">
        {#each strata as s (s.slug)}<li>
            <a href={s.href}>
              <span class="place-map" aria-hidden="true">{#if atlas}<RegionArt {atlas} lit={[s.slug]} terrain />{/if}</span>
              <strong>{s.title}</strong>
              <span class="place-meta">{s.places.length} kabupaten dan kota · {s.languages} bahasa</span>
            </a>
          </li>{/each}
      </ul>
      <p class="jelajah-foot">Wilayah adat di sini dipakai sebagai acuan dan tidak menunjukkan batas tanah adat.</p>
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="bahasa" class="jelajah-section" aria-labelledby="bahasa-title">
    <div class="jelajah-head"><h2 id="bahasa-title">Bahasa</h2></div>
    {#if languageGroup}
      <p class="jelajah-lede">{languageTotal} bahasa, dikelompokkan menurut wilayah titik acuannya di Glottolog.</p>
      <div class="segmented" role="group" aria-label="Pilih wilayah">
        {#each languageGroups as g (g.slug)}<button type="button" aria-pressed={languageGroup.slug === g.slug} onclick={() => { openLanguages = g.slug; allLanguages = false }}>{g.title}<span>{g.languages.length}</span></button>{/each}
      </div>
      <ul class="lang-list" aria-label={'Bahasa dengan titik acuan di ' + languageGroup.title}>
        {#each allLanguages ? languageGroup.languages : languageGroup.languages.slice(0, LANGS_FIRST) as l (l.slug)}<li><a href={'/wiki/' + l.slug}>{l.title}</a></li>{/each}
      </ul>
      {#if languageGroup.languages.length > LANGS_FIRST}<button type="button" class="pill ghost more" aria-expanded={allLanguages} onclick={() => (allLanguages = !allLanguages)}>
          {allLanguages ? 'Lebih sedikit' : 'Semua ' + languageGroup.languages.length + ' bahasa di ' + languageGroup.title}
        </button>{/if}
      <p class="jelajah-foot">Nama dan titik acuan dari <a href="https://glottolog.org" rel="noreferrer" target="_blank">Glottolog</a> (CC BY 4.0). Titik acuan tidak menunjukkan batas wilayah bahasa.</p>
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>
</div>

<style>
  .jelajah {
    --tone-place: #1f4e8c;
    --tone-news: #1e6a72;
    --gutter: 16px;
    --row-hover: color-mix(in oklab, var(--foreground) 4%, transparent);
    padding-bottom: 8px;
  }
  :global(.dark) .jelajah { --tone-place: color-mix(in oklab, #1f4e8c 52%, white); --tone-news: color-mix(in oklab, #1e6a72 58%, white); }

  /* Tabs, as on the X explore page: equal weight, a bold current label with a short rounded bar under it. */
  .jelajah-tabs { position: sticky; top: 56px; z-index: 5; display: flex; overflow-x: auto; scrollbar-width: none; background: color-mix(in srgb, var(--page-ground, var(--background)) 88%, transparent); backdrop-filter: blur(14px) saturate(1.2); border-bottom: 1px solid var(--border); }
  .jelajah-tabs::-webkit-scrollbar { display: none; }
  .jelajah-tabs a { flex: 1 0 auto; display: flex; justify-content: center; min-height: 52px; padding: 0 14px; color: var(--muted-foreground); font-size: 15px; font-weight: 550; text-decoration: none; transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .jelajah-tabs a span { position: relative; display: inline-flex; align-items: center; }
  .jelajah-tabs a:hover { background: var(--row-hover); color: var(--foreground); }
  .jelajah-tabs a[aria-current='location'] { color: var(--foreground); font-weight: 700; }
  .jelajah-tabs a[aria-current='location'] span::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 4px; border-radius: 999px; background: var(--brand, var(--foreground)); }
  .jelajah-tabs a:focus-visible { outline: 2px solid var(--ring, var(--foreground)); outline-offset: -2px; }

  /* One rhythm: a hairline between sections, a heavy heading, the section's own component. */
  .jelajah-section { padding: 28px var(--gutter) 24px; border-bottom: 1px solid var(--border); scroll-margin-top: 108px; }
  .jelajah-section:last-child { border-bottom: 0; }
  .jelajah-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  .jelajah-head h2 { margin: 0; font-size: 22px; font-weight: 800; line-height: 1.15; letter-spacing: -0.025em; text-wrap: balance; }
  .jelajah-head a { flex: none; display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; margin-right: -12px; border-radius: 999px; font-size: 14.5px; font-weight: 600; color: var(--brand, var(--foreground)); text-decoration: none; }
  .jelajah-head a:hover { background: var(--row-hover); }
  .jelajah-lede { margin: -6px 0 16px; font-size: 15px; line-height: 1.45; color: var(--muted-foreground); max-width: 60ch; }
  .jelajah-note { margin: 0; font-size: 15px; line-height: 1.5; color: var(--muted-foreground); }
  .jelajah-note.pad { padding: 16px var(--gutter) 0; }
  .jelajah-note a, .jelajah-foot a { color: inherit; text-underline-offset: 3px; }
  .jelajah-foot { margin: 16px 0 0; font-size: 13px; line-height: 1.5; color: var(--muted-foreground); max-width: 62ch; }
  :global(.open-list) { list-style: none; margin: 6px 0 0; padding: 0; }

  /* Kabar: a large washed lead, two smaller ones beside it, then rows with thumbnails. */
  .news-top { display: grid; gap: 10px; }
  .news-top > :global(.cover-wash) { --wash-min: 300px; --wash-title-max: 34px; }
  .news-side { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .news-side > :global(.cover-wash) { --wash-min: 190px; --wash-title-max: 17px; }
  .news-side :global(.cover-wash-title) { font-size: 17px !important; -webkit-line-clamp: 3; line-clamp: 3; }
  .news-skeleton { display: grid; gap: 10px; }
  .news-skeleton span { display: block; height: 76px; border-radius: 16px; background: var(--secondary); animation: pulse 1.4s ease-in-out infinite; }
  .news-skeleton span:first-child { height: 300px; }
  @keyframes pulse { 50% { opacity: 0.55; } }

  /* Pills: topics, quiet links and "more" buttons. */
  .pill-set { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; }
  .pill-set.quiet { margin-top: 16px; }
  .pill { display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px; border: 1px solid transparent; border-radius: 999px; background: var(--secondary); color: var(--foreground); font: inherit; font-size: 15px; font-weight: 600; text-decoration: none; cursor: pointer; transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .pill:hover { background: color-mix(in oklab, var(--foreground) 10%, var(--secondary)); }
  .pill.ghost { background: transparent; border-color: var(--border); }
  .pill.ghost:hover { background: var(--row-hover); border-color: color-mix(in oklab, var(--foreground) 22%, var(--border)); }
  .pill.small { min-height: 34px; padding: 0 16px; font-size: 14px; font-weight: 650; background: transparent; border-color: color-mix(in oklab, var(--foreground) 18%, var(--border)); }
  .pill.more { margin-top: 14px; }

  /* Komunitas dan lembaga: rows like follow suggestions, an avatar, name and a Lihat pill. */
  .people-list { list-style: none; margin: 0; padding: 0; }
  .people-list a { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: start; gap: 12px; margin: 0 calc(var(--gutter) * -1); padding: 12px var(--gutter); color: inherit; text-decoration: none; transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .people-list a:hover { background: var(--row-hover); }
  .people-list a:hover .pill.small { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .avatar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: color-mix(in oklab, var(--tone) 18%, var(--background)); color: color-mix(in oklab, var(--tone) 80%, var(--foreground)); font-size: 15px; font-weight: 750; letter-spacing: -0.02em; }
  :global(.dark) .avatar { background: color-mix(in oklab, var(--tone) 32%, var(--background)); color: color-mix(in oklab, var(--tone) 30%, white); }
  .who { display: grid; gap: 1px; min-width: 0; }
  .who strong { font-size: 16px; font-weight: 700; line-height: 1.3; letter-spacing: -0.01em; }
  .who .meta { font-size: 14px; color: var(--muted-foreground); }
  .who .bio { margin-top: 4px; font-size: 15px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .people-list .pill.small { align-self: center; }

  /* Tempat: regions to swipe through, each with its own map tile. */
  .place-scroll { list-style: none; display: flex; gap: 12px; margin: 0 calc(var(--gutter) * -1); padding: 2px var(--gutter) 6px; overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: var(--gutter); scrollbar-width: none; overscroll-behavior-x: contain; mask-image: linear-gradient(to right, black calc(100% - 40px), transparent); }
  .place-scroll::-webkit-scrollbar { display: none; }
  .place-scroll li { flex: none; width: 168px; scroll-snap-align: start; --ink: var(--tone-place); }
  .place-scroll a { display: grid; gap: 2px; color: inherit; text-decoration: none; border-radius: 16px; }
  .place-map { position: relative; display: block; aspect-ratio: 1; border-radius: 16px; overflow: hidden; background: color-mix(in oklab, var(--tone-place) 9%, var(--secondary)); margin-bottom: 8px; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 7%, transparent); transition: box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .place-scroll a:hover .place-map { box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 22%, transparent); }
  .place-scroll strong { font-size: 16px; font-weight: 700; line-height: 1.25; letter-spacing: -0.01em; }
  .place-meta { font-size: 13.5px; line-height: 1.4; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }

  /* Bahasa: a segmented row of regions, then the names in columns. */
  .segmented { display: flex; gap: 6px; margin: 0 calc(var(--gutter) * -1) 14px; padding: 0 var(--gutter); overflow-x: auto; scrollbar-width: none; }
  .segmented::-webkit-scrollbar { display: none; }
  .segmented button { flex: none; display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .segmented button span { font-size: 12.5px; font-weight: 500; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .segmented button:hover { background: var(--row-hover); }
  .segmented button[aria-pressed='true'] { background: var(--foreground); border-color: var(--foreground); color: var(--background); }
  .segmented button[aria-pressed='true'] span { color: color-mix(in oklab, var(--background) 70%, transparent); }
  .lang-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
  .lang-list a { display: block; padding: 9px 0; font-size: 15.5px; font-weight: 550; color: inherit; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-bottom: 1px solid color-mix(in oklab, var(--border) 70%, transparent); }
  .lang-list a:hover { color: var(--brand, var(--foreground)); }

  .jelajah a:focus-visible, .jelajah button:focus-visible { outline: 2px solid var(--ring, var(--foreground)); outline-offset: 2px; }

  @media (min-width: 640px) {
    .jelajah { --gutter: 20px; }
    .news-top:not(.solo) { grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); }
    .news-top > :global(.cover-wash) { --wash-min: 380px; --wash-title-max: 38px; }
    .news-side { grid-template-columns: minmax(0, 1fr); }
    .lang-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (min-width: 768px) {
    .jelajah-tabs { top: 72px; }
    .jelajah-section { scroll-margin-top: 128px; padding-top: 32px; }
    .jelajah-head h2 { font-size: 26px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .jelajah-tabs a, .pill, .people-list a, .place-map { transition: none; }
    .news-skeleton span { animation: none; }
  }
</style>
