<script lang="ts">
  // A place's cover and cross-section. Every label is a real count from the
  // page's own data; the lowest layer stays "belum terindeks" until custody
  // records exist. Counts describe what is indexed here, never a people.
  import LandscapePrint from './LandscapePrint.svelte'
  import { communityArtwork } from './site-branding'
  import { newsDate, type NewsItem } from './news.svelte'
  import { placeNews, corePath } from './place-layers'
  let {
    contextId,
    slug,
    title,
    places,
    posts,
    pages,
    works,
  }: {
    contextId: string
    slug: string
    title: string
    places: string[]
    posts: number
    pages: number
    works: number
  } = $props()
  const artwork = $derived(communityArtwork(contextId))
  const uid = $props.id()
  let items = $state<NewsItem[]>([]),
    pending = $state(true),
    failed = $state(false)
  $effect(() => {
    const list = places,
      abort = new AbortController()
    items = []
    failed = false
    pending = list.length > 0
    if (!list.length) return
    placeNews(list, abort.signal).then((result) => {
      if (abort.signal.aborted) return
      items = result.items
      failed = result.failed
      pending = false
    })
    return () => abort.abort()
  })
  const today = $derived(
    pending
      ? 'Hari ini: memuat kabar'
      : [items.length ? items.length + ' kabar' : '', posts ? posts + ' obrolan' : '']
          .filter(Boolean)
          .join(', ') || 'belum ada kabar atau obrolan',
  )
</script>

<div class="place-cover">
  {#if artwork}<LandscapePrint {artwork} decorative />{/if}
</div>
<a class="place-strata-open" href={corePath(slug)} aria-label={'Buka inti lapisan ' + title}>
<svg
  class="place-strata"
  viewBox="0 0 680 168"
  preserveAspectRatio="none"
  aria-hidden="true"
  focusable="false"
>
  <defs>
    <pattern id={'ps-dense-' + uid} width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" /></pattern>
    <pattern id={'ps-mid-' + uid} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.1" opacity=".75" /></pattern>
    <pattern id={'ps-coarse-' + uid} width="16" height="16" patternUnits="userSpaceOnUse"><rect x="1" y="1" width="6" height="6" opacity=".34" /><rect x="9" y="9" width="6" height="6" opacity=".2" /></pattern>
  </defs>
  <rect class="ps-paper" width="680" height="168" />
  <path d="M0 0 H680 V30 C560 38 470 24 340 31 C220 37 110 26 0 33 Z" fill={'url(#ps-dense-' + uid + ')'} />
  <path d="M0 33 C110 26 220 37 340 31 C470 24 560 38 680 30 V70 C540 78 430 62 300 71 C190 78 90 66 0 73 Z" fill={'url(#ps-mid-' + uid + ')'} />
  <path class="ps-settled" d="M0 73 C90 66 190 78 300 71 C430 62 540 78 680 70 V112 C560 118 420 104 320 113 C200 122 100 108 0 116 Z" />
  <path d="M0 116 C100 108 200 122 320 113 C420 104 560 118 680 112 V168 H0 Z" fill={'url(#ps-coarse-' + uid + ')'} />
  <path class="ps-line" d="M0 33 C110 26 220 37 340 31 C470 24 560 38 680 30" />
  <path class="ps-line" d="M0 73 C90 66 190 78 300 71 C430 62 540 78 680 70" />
  <path class="ps-line dashed" d="M0 116 C100 108 200 122 320 113 C420 104 560 118 680 112" />
</svg>
<span class="place-strata-hint" aria-hidden="true">Buka inti lapisan</span>
</a>
<ul class="place-strata-key" aria-label={'Penampang ' + title}>
  <li><span>Hari ini</span>{pending ? 'memuat kabar' : today}</li>
  <li><span>Sedang dikerjakan</span>{works ? works + ' kerja publik' : 'belum ada kerja publik'}</li>
  <li><span>Sudah ditinjau</span>{pages ? pages + ' halaman' : 'belum ada halaman'}</li>
  <li class="unindexed"><span>Arsip dan cerita lama</span>belum terindeks</li>
</ul>

{#if places.length}
  <section class="place-news" aria-labelledby={'place-news-' + uid}>
    <header>
      <h2 id={'place-news-' + uid}>Kabar</h2>
      <a href={'/news?place=' + encodeURIComponent(places[0])}>Lihat semua</a>
    </header>
    {#if pending}<p class="place-news-note" role="status">Memuat kabar…</p>
    {:else if failed}<p class="place-news-note">Kabar belum dapat dimuat. Coba lagi sebentar.</p>
    {:else if !items.length}<p class="place-news-note">Belum ada kabar terindeks untuk {title}.</p>
    {:else}
      <ol>
        {#each items as item (item.id)}
          <li>
            <a href={'/news/' + item.id}>
              <div>
                <strong>{item.title}</strong>
                <small>
                  {[newsDate(item.publishedAt), item.places?.find((x) => places.includes(x.slug))?.name, item.sourceCount ? item.sourceCount + ' sumber' : '']
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </div>
              {#if item.image}<img src={item.image} alt="" loading="lazy" decoding="async" onerror={(e) => ((e.currentTarget as HTMLImageElement).hidden = true)} />{/if}
            </a>
          </li>
        {/each}
      </ol>
      <p class="place-news-credit">Dari West Papua Watch. Setiap kabar mencantumkan penerbitnya.</p>
    {/if}
  </section>
{/if}

<style>
  .place-cover { height: clamp(150px, 26vw, 240px); overflow: hidden; background: #f4f0e5; }
  .place-cover :global(.landscape-print) { width: 100%; height: 190%; object-fit: cover; object-position: 50% 62%; display: block; }
  .place-strata { display: block; width: 100%; height: clamp(96px, 16vw, 150px); color: var(--brand); fill: currentColor; }
  .ps-paper { fill: #f4f0e5; }
  .place-strata-open { position: relative; display: block; color: var(--brand); text-decoration: none; }
  .place-strata-open:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; }
  .place-strata-hint { position: absolute; right: 12px; bottom: 10px; min-height: 32px; display: inline-flex; align-items: center; padding: 0 12px; border-radius: 999px; background: #f4f0e5; color: #1a211e; font-size: 13px; font-weight: 600; box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand) 40%, transparent); }
  .place-strata-open:hover .place-strata-hint { box-shadow: 0 0 0 2px var(--brand); }
  .ps-settled { fill: color-mix(in srgb, var(--brand) 12%, #f4f0e5); }
  .ps-line { fill: none; stroke: currentColor; stroke-width: 1; vector-effect: non-scaling-stroke; }
  .ps-line.dashed { stroke-dasharray: 4 4; }
  .place-strata-key { list-style: none; margin: 0; padding: 14px 24px 4px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; font-size: 13px; line-height: 1.4; color: var(--foreground); }
  .place-strata-key span { display: block; font-size: 12px; color: var(--muted-foreground); }
  .place-strata-key .unindexed { color: var(--muted-foreground); }
  .place-news { padding: 8px 24px 4px; border-bottom: 1px solid var(--reading-line); }
  .place-news header { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 0 4px; }
  .place-news h2 { margin: 0; font-size: 17px; font-weight: 600; }
  .place-news header a { font-size: 13px; color: var(--muted-foreground); min-height: 32px; display: inline-flex; align-items: center; }
  .place-news ol { list-style: none; margin: 0; padding: 0; }
  .place-news li + li { border-top: 1px solid var(--reading-line); }
  .place-news li a { display: flex; gap: 14px; align-items: center; justify-content: space-between; padding: 12px 0; color: inherit; text-decoration: none; min-height: 44px; }
  .place-news li a:hover strong { text-decoration: underline; }
  .place-news strong { display: block; font-size: 15px; font-weight: 600; line-height: 1.35; text-wrap: pretty; }
  .place-news small { display: block; margin-top: 4px; font-size: 12px; color: var(--muted-foreground); }
  .place-news img { width: 64px; height: 64px; flex: none; object-fit: cover; border-radius: 10px; }
  .place-news-note, .place-news-credit { margin: 0; padding: 10px 0 14px; font-size: 13px; color: var(--muted-foreground); }
  @media (max-width: 640px) {
    .place-strata-key { grid-template-columns: repeat(2, minmax(0, 1fr)); padding-inline: 16px; }
    .place-news { padding-inline: 16px; }
  }
</style>
