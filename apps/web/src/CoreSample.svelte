<script lang="ts">
  // A place read as a core sample: newest material at the top, settled pages
  // lower down, and the archive layer honestly marked as not yet indexed.
  // Every item is a real public record; nothing here is a placeholder.
  import { ArrowLeft, ArrowUpRight } from '@lucide/svelte'
  import LandscapePrint from './LandscapePrint.svelte'
  import { communityArtwork } from './site-branding'
  import { newsDate, type NewsItem } from './news.svelte'
  import { placeNews, openWorkStates } from './place-layers'
  import { request, relativeDate, type Auth, type Post } from './api'
  let {
    context,
    posts,
    works,
    auth,
    onCompose,
    embedded = false,
  }: {
    context: { id: string; slug: string; title: string; pages: { id: string; title: string }[]; newsPlaces?: string[] }
    posts: Post[]
    works: { id: string; title: string; state: string; updated: number; sponsor: { title: string } }[]
    auth: Auth
    onCompose?: (place?: { id: string; title: string }) => void
    /** Inside a thing page's Kabar tab: no cover, no back link, and a short news list. */
    embedded?: boolean
  } = $props()
  type Reviewed = { id: string; updated: number; reviewer?: { name: string; kind: string } }
  const week = 7 * 86400000,
    stateLabel: Record<string, string> = { proposed: 'Diusulkan', adopted: 'Diadopsi', active: 'Berjalan', blocked: 'Terhambat' }
  const artwork = $derived(communityArtwork(context.id)),
    uid = $props.id()
  let news = $state<NewsItem[]>([]),
    newsPending = $state(true),
    newsFailed = $state(false),
    reviewed = $state<Map<string, Reviewed>>(new Map()),
    now = $state(Date.now())
  $effect(() => {
    const list = context.newsPlaces ?? [],
      abort = new AbortController()
    news = []
    newsFailed = false
    newsPending = list.length > 0
    now = Date.now()
    if (list.length)
      placeNews(list, abort.signal, 12).then((result) => {
        if (abort.signal.aborted) return
        news = result.items
        newsFailed = result.failed
        newsPending = false
      })
    // Reviewer and date for accepted pages come from public discovery only.
    request<Reviewed[]>('/v1/wiki/discover', undefined, abort.signal, true)
      .then((rows) => {
        if (!abort.signal.aborted) reviewed = new Map(rows.map((r) => [r.id, r]))
      })
      .catch(() => {})
    return () => abort.abort()
  })
  const recentNews = $derived(news.filter((n) => n.publishedAt && now - Date.parse(n.publishedAt) <= week)),
    recentPosts = $derived(posts.filter((p) => !p.parent_id && now - p.created <= week).slice(0, 6)),
    open = $derived(works.filter((w) => openWorkStates.has(w.state))),
    year = new Date().getFullYear()
  // On a thing page each layer shows three items and opens the rest in place, so a busy week stays short.
  const FIRST = 3
  let more = $state<Record<string, boolean>>({})
  const cut = <T,>(key: string, list: T[]) => (embedded && !more[key] ? list.slice(0, FIRST) : list)
  const firstLine = (text: string) => {
    const line = text.replace(/[#*_`>[\]]/g, '').split('\n').find((x) => x.trim()) ?? ''
    return line.length > 140 ? line.slice(0, 137).trimEnd() + '…' : line
  }
</script>

<article class="core-sample" class:embedded aria-labelledby={embedded ? undefined : 'core-title-' + uid} aria-label={embedded ? 'Ringkasan ' + context.title : undefined}>
  {#if !embedded}<header class="core-cover">
    {#if artwork}<LandscapePrint {artwork} decorative />{/if}
    <h1 id={'core-title-' + uid}><span class="sr-only">Ringkasan tempat </span>{context.title}</h1>
  </header>
  <nav class="core-back" aria-label="Navigasi ringkasan">
    <a href={'/wiki/' + encodeURIComponent(context.slug)}><ArrowLeft size={16} />Kembali ke {context.title}</a>
    <span>Ringkasan tempat</span>
  </nav>{/if}

  <section class="core-band" aria-labelledby={'core-week-' + uid}>
    <div class="core-depth dense" aria-hidden="true"><span class="core-tick">{year}</span></div>
    <div class="core-content">
      <h2 id={'core-week-' + uid}>Minggu ini{#if recentNews.length} <span class="core-count">{recentNews.length}</span>{/if}</h2>
      {#if newsPending}<p class="core-note" role="status">Memuat kabar…</p>{/if}
      {#each cut('news', recentNews) as item (item.id)}
        <a class="core-item" href={'/news/' + item.id}>
          <strong>{item.title}</strong>
          <small>{['Kabar', newsDate(item.publishedAt), item.sourceCount ? item.sourceCount + ' sumber' : ''].filter(Boolean).join(' · ')}</small>
        </a>
      {/each}
      {#if embedded && recentNews.length > FIRST && !more.news}<button type="button" class="core-more" onclick={() => (more.news = true)}>{recentNews.length - FIRST} kabar lagi minggu ini</button>{/if}
      {#if embedded && recentNews.length && (context.newsPlaces ?? []).length}<a class="core-more" href={'/news?place=' + encodeURIComponent(context.newsPlaces![0])}>Kabar lebih lama <ArrowUpRight size={14} /></a>{/if}
      {#each embedded ? [] : recentPosts as post (post.id)}
        <a class="core-item" href={'/square/' + post.id}>
          <strong>{firstLine(post.text) || 'Obrolan'}</strong>
          <small>Obrolan · {post.author?.name ?? 'Anggota'}{post.author?.kind === 'agent' ? ' · AI' : ''} · {relativeDate(post.created)}</small>
        </a>
      {/each}
      {#if !newsPending && !recentNews.length && !recentPosts.length}
        <p class="core-note">
          {newsFailed ? 'Kabar belum dapat dimuat.' : 'Belum ada kabar atau obrolan baru minggu ini.'}
          {#if (context.newsPlaces ?? []).length}<a href={'/news?place=' + encodeURIComponent(context.newsPlaces![0])}>Lihat kabar sebelumnya</a>{/if}
        </p>
      {/if}
    </div>
  </section>

  <section class="core-band" aria-labelledby={'core-work-' + uid}>
    <div class="core-depth mid" aria-hidden="true"></div>
    <div class="core-content">
      <h2 id={'core-work-' + uid}>Sedang dikerjakan{#if open.length} <span class="core-count">{open.length}</span>{/if}</h2>
      {#each cut('work', open) as w (w.id)}
        <a class="core-item" href={'/work/' + w.id}>
          <strong>{w.title}</strong>
          <small>Kerja publik · {stateLabel[w.state] ?? w.state} · {w.sponsor.title}</small>
        </a>
      {:else}
        <p class="core-note">Belum ada kerja publik yang terbuka di sini. <a href="/work">Lihat kerja publik</a></p>
      {/each}
      {#if embedded && open.length > FIRST && !more.work}<button type="button" class="core-more" onclick={() => (more.work = true)}>{open.length - FIRST} lagi</button>{/if}
    </div>
  </section>

  <section class="core-band" aria-labelledby={'core-pages-' + uid}>
    <div class="core-depth settled" aria-hidden="true"></div>
    <div class="core-content">
      <h2 id={'core-pages-' + uid}>Sudah ditinjau{#if context.pages.length} <span class="core-count">{context.pages.length}</span>{/if}</h2>
      {#each cut('pages', context.pages) as p (p.id)}
        {@const meta = reviewed.get(p.id)}
        <a class="core-item core-page" href={'/wiki/' + p.id}>
          <strong>{p.title}</strong>
          <small>Halaman{meta?.reviewer ? ' · ditinjau ' + meta.reviewer.name + ', ' + relativeDate(meta.updated) : ''}</small>
        </a>
      {:else}
        <p class="core-note">Belum ada halaman{embedded ? ' lain' : ''} yang ditinjau untuk {context.title}. <a href="/wiki">Buka Ensiklopedia</a></p>
      {/each}
      {#if embedded && context.pages.length > FIRST && !more.pages}<button type="button" class="core-more" onclick={() => (more.pages = true)}>{context.pages.length - FIRST} halaman lagi</button>{/if}
    </div>
  </section>

  <section class="core-band core-archive" aria-labelledby={'core-archive-' + uid}>
    <div class="core-depth coarse" aria-hidden="true"><span class="core-tick">dulu</span></div>
    <div class="core-content">
      <h2 id={'core-archive-' + uid}>Arsip dan cerita lama</h2>
      <p class="core-unindexed">Belum terindeks.</p>
      <p class="core-note">Tulisan lama, rekaman, foto dan cerita orang tua tentang {context.title} belum tercatat di sini. Cerita dan sumber yang ditambahkan akan muncul di bagian ini.</p>
      <div class="core-actions">
        {#if auth.actor && onCompose}<button type="button" class="core-chip primary" onclick={() => onCompose?.({ id: context.id, title: context.title })}>Ceritakan</button>
        {:else}<a class="core-chip primary" href="/login">Ceritakan</a>{/if}
        <a class="core-chip" href={auth.actor ? '/wiki/notes/new' : '/login'}>Tambahkan sumber <ArrowUpRight size={14} /></a>
      </div>
    </div>
  </section>
  <div class="core-tail" aria-hidden="true"></div>
</article>

<style>
  .core-sample { --paper: #f4f0e5; --ink: var(--brand); --surface: #fbfbf8; --core-text: #1a211e; --core-muted: #5a635e; background: var(--paper); color: var(--core-text); overflow: hidden; }
  :global(.dark) .core-sample { --paper: color-mix(in srgb, var(--brand) 10%, var(--background)); --surface: var(--card, var(--secondary)); --core-text: var(--foreground); --core-muted: var(--muted-foreground); }
  .core-cover { position: relative; height: clamp(150px, 26vw, 220px); overflow: hidden; background: #f4f0e5; }
  .core-cover :global(.landscape-print) { width: 100%; height: 200%; object-fit: cover; object-position: 50% 62%; display: block; }
  .core-cover h1 { position: absolute; left: 16px; bottom: 12px; margin: 0; padding: 0 10px; border-radius: 6px; background: #f4f0e5; color: #1a211e; font-family: var(--font-editorial); font-weight: 400; font-size: clamp(28px, 6vw, 38px); line-height: 1.15; letter-spacing: -.5px; max-width: calc(100% - 32px); overflow-wrap: anywhere; }
  .core-back { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 16px; border-bottom: 1px solid color-mix(in srgb, var(--ink) 45%, transparent); font-size: 13px; }
  .core-back a { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: var(--core-text); text-decoration: none; font-weight: 600; }
  .core-back a:hover { text-decoration: underline; }
  .core-back span { color: var(--core-muted); }
  .core-band { position: relative; display: grid; grid-template-columns: 56px minmax(0, 1fr); }
  .core-depth { position: relative; border-right: 1px solid var(--ink); color: var(--ink); }
  .core-depth.dense { background-image: radial-gradient(currentColor 1.1px, transparent 1.2px); background-size: 4px 4px; }
  .core-depth.mid { background-image: radial-gradient(color-mix(in srgb, currentColor 75%, transparent) 1.1px, transparent 1.2px); background-size: 7px 7px; }
  .core-depth.settled { background: color-mix(in srgb, var(--ink) 12%, var(--paper)); }
  .core-depth.coarse, .core-tail { background-image: linear-gradient(45deg, color-mix(in srgb, var(--ink) 26%, transparent) 25%, transparent 25%, transparent 75%, color-mix(in srgb, var(--ink) 26%, transparent) 75%), linear-gradient(45deg, color-mix(in srgb, var(--ink) 14%, transparent) 25%, transparent 25%, transparent 75%, color-mix(in srgb, var(--ink) 14%, transparent) 75%); background-size: 22px 22px; background-position: 0 0, 11px 11px; }
  .core-tick { position: absolute; left: 6px; top: 10px; padding: 0 3px; background: var(--paper); font-size: 11px; font-weight: 600; color: var(--ink); }
  .core-content { padding: 18px 16px 10px; min-width: 0; }
  .core-content h2 { margin: 0 0 10px; font-size: 12px; font-weight: 600; letter-spacing: .02em; color: var(--ink); }
  :global(.dark) .core-content h2, :global(.dark) .core-tick { color: color-mix(in srgb, var(--ink) 55%, var(--foreground)); }
  .core-item { display: block; min-height: 44px; margin-bottom: 10px; padding: 12px 14px; border-radius: 12px; background: var(--surface); color: var(--core-text); text-decoration: none; box-shadow: 0 1px 0 rgba(26, 33, 30, .06); }
  .core-item:hover strong { text-decoration: underline; }
  .core-item:focus-visible, .core-chip:focus-visible, .core-back a:focus-visible, .core-note a:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  .core-item strong { display: block; font-size: 14px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; text-wrap: pretty; }
  .core-item small { display: block; margin-top: 4px; font-size: 12px; color: var(--core-muted); }
  .core-page strong { font-family: var(--font-editorial); font-weight: 400; font-size: 19px; line-height: 1.25; }
  .core-note { margin: 0 0 12px; font-size: 14px; line-height: 1.55; color: var(--core-muted); }
  .core-note a { color: inherit; text-decoration: underline; text-underline-offset: 3px; display: inline-flex; min-height: 44px; align-items: center; }
  .core-unindexed { margin: 4px 0 8px; font-family: var(--font-editorial); font-size: 22px; line-height: 1.3; }
  .core-actions { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 18px; }
  .core-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--core-text) 25%, transparent); background: var(--surface); color: var(--core-text); font: inherit; font-size: 14px; font-weight: 500; text-decoration: none; cursor: pointer; }
  .core-chip.primary { background: var(--core-text); color: var(--paper); border-color: var(--core-text); }
  .core-tail { height: 120px; opacity: .9; color: var(--ink); }
  .embedded .core-tail { height: 40px; }
  .core-more { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; margin: -2px 0 8px; font-size: 13px; font-weight: 600; color: var(--core-text); text-decoration: underline; text-underline-offset: 3px; margin-right: 16px; }
  button.core-more { padding: 0; border: 0; background: none; font-family: inherit; cursor: pointer; }
  .core-more:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px; }
  .core-count { margin-left: 4px; font-weight: 400; color: var(--core-muted); font-variant-numeric: tabular-nums; }
  @media (min-width: 720px) { .core-band { grid-template-columns: 72px minmax(0, 1fr); } .core-content { padding-inline: 22px; } .core-back { padding-inline: 22px; } }
</style>
