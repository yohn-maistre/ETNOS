<script module lang="ts">
  export type ThingTab = 'tentang' | 'percakapan' | 'perkembangan' | 'komunitas' | 'sumber'
</script>

<script lang="ts">
  // One page per thing (a place, a language or a topic). The name and kind sit on the engraved band, tinted by kind
  // so places, languages and topics read differently at a glance. Five tabs hold everything about the thing:
  // Tentang is its wiki article, Percakapan its posts (labelled with it or linking to its article), Perkembangan the layers
  // from today down to the archive, Komunitas the rooms and organisations, Sumber the basis and published research.
  import { untrack, type Snippet } from 'svelte'
  import { SvelteURLSearchParams } from 'svelte/reactivity'
  import { ArrowUpRight, BookOpen, Building2, PenLine } from '@lucide/svelte'
  import LandscapePrint from './LandscapePrint.svelte'
  import CoreSample from './CoreSample.svelte'
  import Literature from './Literature.svelte'
  import PostCard from './PostCard.svelte'
  import PlaceCommunities, { type PlaceCommunity } from './PlaceCommunities.svelte'
  import WikiSourceNotes from './WikiSourceNotes.svelte'
  import ThingTop from './ThingTop.svelte'
  import { communityArtwork } from './site-branding'
  import { markdown } from './markdown'
  import { orderedParents } from './context-tree'
  import { loadMap } from './observatory'
  import { request, type Auth, type Community, type Post, type WikiPage } from './api'

  type Ref = { id: string; slug: string; title: string; kind?: string }
  type Thing = {
    id: string
    slug: string
    title: string
    kind: string
    facet?: string
    description?: string
    aliases?: string[]
    family?: { basis: string; sources: { title: string; url: string }[] } | null
    parents?: Ref[]
    children?: Ref[]
    childCount?: number
    groups: { id: string; title: string }[]
    communities?: PlaceCommunity[]
    pages: { id: string; title: string }[]
    newsPlaces?: string[]
  }
  let {
    thing,
    kindLabel,
    blurb,
    posts,
    works,
    auth,
    communities,
    canVote,
    initialTab = 'tentang',
    onError,
    onCompose,
    onStartCommunity,
    stewardTools,
  }: {
    thing: Thing
    kindLabel: string
    blurb: string
    posts: Post[]
    works: { id: string; title: string; state: string; updated: number; sponsor: { title: string } }[]
    auth: Auth
    communities: Community[]
    canVote: (communityId: string) => boolean
    initialTab?: ThingTab
    onError: (message: string) => void
    onCompose?: (place?: { id: string; title: string }) => void
    onStartCommunity?: () => void
    stewardTools?: Snippet
  } = $props()

  const uid = $props.id()
  const tabs: [ThingTab, string][] = [
    ['tentang', 'Tentang'],
    ['percakapan', 'Percakapan'],
    ['perkembangan', 'Perkembangan'],
    ['komunitas', 'Komunitas'],
    ['sumber', 'Sumber'],
  ]
  // The first tab comes from the route; later changes come from the effect below. (A svelte-ignore comment
  // here would be stripped by script preprocessing, so the initial read goes through untrack.)
  let tab = $state<ThingTab>(untrack(() => initialTab))
  $effect(() => {
    tab = initialTab
  })
  function choose(next: ThingTab) {
    tab = next
    // The tab is part of the address so it can be shared, without adding a step to Back.
    const url = new URL(location.href)
    if (next === 'tentang') url.searchParams.delete('tab')
    else url.searchParams.set('tab', next)
    url.pathname = '/contexts/' + encodeURIComponent(thing.slug)
    history.replaceState(history.state, '', url)
  }
  function keys(e: KeyboardEvent) {
    const i = tabs.findIndex(([t]) => t === tab)
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = tabs[(i + step + tabs.length) % tabs.length][0]
    choose(next)
    document.getElementById(uid + '-tab-' + next)?.focus()
  }

  const ink = $derived(thing.kind === 'language' ? 'language' : thing.kind === 'topic' ? 'topic' : 'place')
  const artwork = $derived(communityArtwork(thing.id))
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  // The thing's own article: the labelled wiki page whose title carries the thing's name ("Wilayah adat Mee Pago").
  // Pages written before labels existed are found on the public wiki map by the same rule.
  let mapped = $state<{ id: string; title: string } | null>(null)
  $effect(() => {
    const name = norm(thing.title)
    mapped = null
    if (thing.pages.some((p) => norm(p.title).includes(name))) return
    let live = true
    loadMap().then((data) => {
      if (!live || !data) return
      const hit = data.nodes.find((n) => n.k === 'page' && n.href?.startsWith('/wiki/') && norm(n.t).endsWith(name) && (thing.kind === 'language' ? n.kind === 'language' : thing.kind === 'topic' || n.kind === 'region' || n.kind === 'regency'))
      if (hit?.href) mapped = { id: hit.href.slice('/wiki/'.length), title: hit.t }
    })
    return () => {
      live = false
    }
  })
  const home = $derived(thing.pages.find((p) => norm(p.title).includes(norm(thing.title))) ?? mapped)
  const related = $derived(thing.pages.filter((p) => p.id !== home?.id))

  let article = $state<WikiPage | null>(null),
    articleState = $state<'idle' | 'loading' | 'failed'>('idle'),
    linked = $state<Post[]>([])
  $effect(() => {
    const id = home?.id,
      abort = new AbortController()
    article = null
    linked = []
    if (!id) return
    articleState = 'loading'
    request<WikiPage>('/v1/wiki/' + id, undefined, abort.signal, true)
      .then((page) => {
        if (abort.signal.aborted) return
        article = page
        articleState = 'idle'
      })
      .catch(() => {
        if (!abort.signal.aborted) articleState = 'failed'
      })
    // Posts that link to the article count as conversation about the thing too.
    request<{ items: Post[] }>(
      '/v1/feed/page?' + new SvelteURLSearchParams({ roots: 'true', links: JSON.stringify([location.origin + '/wiki/' + id]) }),
      undefined,
      abort.signal,
      true,
    )
      .then((page) => {
        if (!abort.signal.aborted) linked = page.items
      })
      .catch(() => {})
    return () => abort.abort()
  })
  const conversation = $derived.by(() => {
    const seen = new Set<string>()
    return [...posts.filter((p) => !p.parent_id), ...linked]
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      .sort((a, b) => b.created - a.created)
  })
  const rooms = $derived((thing.communities?.length ?? 0) + thing.groups.length)
  const childHeading = $derived(
    thing.children?.every((c) => c.kind === 'place') ? 'Kabupaten & kota' : thing.facet === 'institution-kind' ? 'Jenis lembaga' : 'Di dalamnya',
  )
</script>

<article class="thing" data-ink={ink} aria-labelledby={uid + '-name'}>
  <header class="thing-cover">
    {#if artwork}<LandscapePrint {artwork} decorative />{/if}
    <div class="thing-name">
      <span class="thing-kind">{kindLabel}</span>
      <h1 id={uid + '-name'}>{thing.title}</h1>
    </div>
  </header>
  {#if thing.parents?.length}<p class="thing-parents">
      Bagian dari
      {#each orderedParents(thing.parents) as p, i (p.id)}{#if i}<span aria-hidden="true">·</span>{/if}<a href={'/contexts/' + p.slug}>{p.title}</a>{/each}
    </p>{/if}

  <div class="thing-tabs section-tab-scroll" role="tablist" aria-label={'Tentang ' + thing.title} tabindex="-1" onkeydown={keys}>
    {#each tabs as [value, label] (value)}<button
        role="tab"
        id={uid + '-tab-' + value}
        aria-selected={tab === value}
        aria-controls={uid + '-panel'}
        tabindex={tab === value ? 0 : -1}
        onclick={() => choose(value)}
        >{label}{#if value === 'percakapan' && conversation.length}<span>{conversation.length}</span>{:else if value === 'komunitas' && rooms}<span>{rooms}</span>{/if}</button
      >{/each}
  </div>

  <div class="thing-panel" id={uid + '-panel'} role="tabpanel" aria-labelledby={uid + '-tab-' + tab}>
    {#if tab === 'tentang'}
      <!-- A language's catalogue sentence names its family from Glottolog; the facts block below says the same. -->
      {#if blurb && !(thing.kind === 'language' && /^Rumpun .+ menurut Glottolog/.test(blurb))}<p class="thing-blurb">{blurb}</p>{/if}
      {#snippet chips()}
        {#if thing.children?.length}<section class="thing-children" aria-labelledby={uid + '-children'}>
            <h2 id={uid + '-children'}>{childHeading} <span>{thing.childCount ?? thing.children.length}</span></h2>
            <div class="thing-chips">{#each thing.children as c (c.id)}<a href={'/contexts/' + c.slug}>{c.title}</a>{/each}</div>
          </section>{/if}
      {/snippet}
      {#if ['place', 'region', 'language', 'topic'].includes(thing.kind)}<ThingTop {thing} fallback={chips} />{:else}{@render chips()}{/if}
      {#if home}
        {#if article?.revision}<section class="thing-article" aria-label={'Halaman wiki ' + article.title}>
            <div class="wiki-body wiki-serif post-markdown">{@html markdown(article.revision.text, [], 'thing-' + article.id)}</div>
            <WikiSourceNotes citations={article.revision.citations} />
            <p class="thing-article-foot">
              <a href={'/wiki/' + article.id + '?view=riwayat'}><BookOpen size={15} />Riwayat, tinjauan dan usulan di Wiki<ArrowUpRight size={14} /></a>
            </p>
          </section>
        {:else if articleState === 'loading'}<p class="thing-note" role="status">Memuat halaman…</p>
        {:else}<p class="thing-note">Halaman {home.title} belum dapat dimuat. <a href={'/wiki/' + home.id + '?view=riwayat'}>Buka di Wiki</a></p>{/if}
      {:else}<div class="thing-empty">
          <p>Belum ada halaman tentang {thing.title}.</p>
          <a class="thing-action" href={auth.actor ? '/wiki/notes/new' : '/login'}><PenLine size={15} />Mulai tulis di Wiki</a>
        </div>{/if}
      {#if related.length}<section class="thing-related" aria-labelledby={uid + '-related'}>
          <h2 id={uid + '-related'}>Halaman terkait</h2>
          {#each related as p (p.id)}<a href={'/wiki/' + p.id}><BookOpen size={16} /><span>{p.title}</span><ArrowUpRight size={15} /></a>{/each}
        </section>{/if}
    {:else if tab === 'percakapan'}
      <div class="thing-compose">
        {#if auth.actor && onCompose}<button type="button" class="thing-action" onclick={() => onCompose?.({ id: thing.id, title: thing.title })}><PenLine size={15} />Tulis tentang {thing.title}</button>
        {:else}<a class="thing-action" href="/login"><PenLine size={15} />Masuk untuk menulis</a>{/if}
      </div>
      {#each conversation as post (post.id)}<PostCard
          {post}
          community={communities.find((c) => c.id === post.community_id)}
          loggedIn={!!auth.actor}
          canVote={canVote(post.community_id)}
          {onError}
        />{/each}
      {#if !conversation.length}<p class="thing-note">Belum ada percakapan tentang {thing.title}.</p>{/if}
    {:else if tab === 'perkembangan'}
      {@render stewardTools?.()}
      <CoreSample context={{ ...thing, pages: related }} {posts} {works} {auth} {onCompose} embedded />
    {:else if tab === 'komunitas'}
      <PlaceCommunities communities={thing.communities ?? []} title={thing.title} onStart={onStartCommunity} />
      {#if thing.groups.length}<section class="thing-related" aria-labelledby={uid + '-groups'}>
          <h2 id={uid + '-groups'}>Organisasi</h2>
          {#each thing.groups as g (g.id)}<a href={'/groups/' + g.id}><Building2 size={16} /><span>{g.title}</span><ArrowUpRight size={15} /></a>{/each}
        </section>{/if}
    {:else}
      {#if thing.family}<section class="thing-basis" aria-labelledby={uid + '-basis'}>
          <h2 id={uid + '-basis'}>Dasar label</h2>
          <p>{thing.family.basis}</p>
          <ul>
            {#each thing.family.sources as src (src.url)}<li><a href={src.url} target="_blank" rel="noreferrer">{src.title}</a></li>{/each}
            <li><a href="/tentang#about-basis">Semua dasar label di ETNOS</a></li>
          </ul>
        </section>{/if}
      {#if thing.facet !== 'topic-group'}<Literature slug={thing.slug} title={thing.title} />{/if}
      {#if !thing.family && thing.facet === 'topic-group'}<p class="thing-note">Belum ada sumber untuk {thing.title}.</p>{/if}
    {/if}
  </div>
</article>

<style>
  .thing { --paper: #f4f0e5; }
  .thing[data-ink='language'] { --brand: oklch(0.5 0.13 42); }
  .thing[data-ink='topic'] { --brand: oklch(0.47 0.09 158); }
  .thing-cover { position: relative; height: clamp(170px, 30vw, 250px); overflow: hidden; background: var(--paper); }
  .thing-cover :global(.landscape-print) { width: 100%; height: 190%; object-fit: cover; object-position: 50% 62%; display: block; }
  .thing-name { position: absolute; left: 16px; right: 16px; bottom: 14px; display: grid; justify-items: start; gap: 6px; }
  .thing-kind,
  .thing-name h1 { background: var(--paper); color: #1a211e; border-radius: 6px; }
  .thing-kind { padding: 2px 8px; font-size: 12.5px; font-weight: 600; color: var(--brand); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand) 45%, transparent); }
  .thing-name h1 {
    margin: 0;
    padding: 0 10px;
    max-width: 100%;
    font-family: var(--font-editorial);
    font-weight: 400;
    font-size: clamp(30px, 6vw, 42px);
    line-height: 1.15;
    letter-spacing: -0.5px;
    overflow-wrap: anywhere;
    text-wrap: balance;
  }
  .thing-parents { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 0; padding: 12px 24px 0; font-size: 13px; color: var(--muted-foreground); }
  .thing-parents a { display: inline-flex; align-items: center; min-height: 40px; color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--foreground) 35%, transparent); }
  .thing-tabs {
    display: flex;
    gap: 2px;
    margin-top: 10px;
    padding: 0 16px;
    overflow-x: auto;
    border-bottom: 1px solid var(--reading-line, var(--border));
    scrollbar-width: none;
  }
  .thing-tabs::-webkit-scrollbar { display: none; }
  .thing-tabs button {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 46px;
    padding: 0 10px;
    font-size: 14px;
    color: var(--muted-foreground);
    white-space: nowrap;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }
  .thing-tabs button:hover { color: var(--foreground); }
  .thing-tabs button[aria-selected='true'] { color: var(--foreground); font-weight: 600; border-bottom-color: var(--brand); }
  .thing-tabs button:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; border-radius: 4px; }
  .thing-tabs span { font-size: 12.5px; font-weight: 500; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .thing-panel { min-height: 40vh; }
  .thing-blurb { margin: 0; padding: 18px 24px 0; font-size: 16px; line-height: 1.55; color: var(--foreground); max-width: 68ch; }
  .thing-children { padding: 18px 24px 4px; }
  .thing-children h2,
  .thing-related h2,
  .thing-basis h2 { margin: 0 0 10px; font-size: 15px; font-weight: 600; }
  .thing-children h2 span { margin-left: 4px; font-weight: 500; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .thing-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .thing-chips a { display: inline-flex; align-items: center; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border); color: var(--foreground); text-decoration: none; font-size: 14px; }
  .thing-chips a:hover { border-color: var(--brand); }
  .thing-chips a:focus-visible, .thing-related a:focus-visible, .thing-action:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
  .thing-article { margin-top: 8px; }
  .thing-article .wiki-body { padding: 0 28px; }
  .thing-article-foot { margin: 0; padding: 4px 28px 24px; font-size: 13px; }
  .thing-article-foot a { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: var(--muted-foreground); text-decoration: none; }
  .thing-article-foot a:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .thing-related { display: grid; padding: 20px 24px; border-top: 1px solid var(--reading-line, var(--border)); }
  .thing-related a { display: flex; align-items: center; gap: 10px; min-height: 46px; color: var(--foreground); text-decoration: none; border-bottom: 1px solid var(--reading-line, var(--border)); }
  .thing-related a span { flex: 1; min-width: 0; }
  .thing-related a :global(svg:last-child) { color: var(--muted-foreground); }
  .thing-related a:hover span { text-decoration: underline; text-underline-offset: 3px; }
  .thing-note { margin: 0; padding: 32px 24px; font-size: 14px; color: var(--muted-foreground); }
  .thing-note a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  .thing-empty { display: grid; justify-items: start; gap: 12px; padding: 24px; }
  .thing-empty p { margin: 0; font-size: 15px; color: var(--muted-foreground); }
  .thing-compose { padding: 16px 24px; border-bottom: 1px solid var(--reading-line, var(--border)); }
  .thing-action {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 999px;
    background: var(--foreground);
    color: var(--background);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .thing-basis { padding: 20px 24px; }
  .thing-basis p { margin: 0 0 10px; font-size: 14px; line-height: 1.55; max-width: 68ch; }
  .thing-basis ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; }
  .thing-basis a { display: inline-flex; min-height: 36px; align-items: center; font-size: 14px; color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--foreground) 35%, transparent); }
  @media (max-width: 767px) {
    .thing-parents, .thing-blurb, .thing-children, .thing-related, .thing-basis, .thing-compose { padding-inline: 16px; }
    .thing-empty, .thing-note { padding-inline: 16px; }
    .thing-tabs { padding-inline: 4px; gap: 0; }
    .thing-tabs button { flex: 1 0 auto; justify-content: center; padding: 0 7px; font-size: 13.5px; }
    .thing-article .wiki-body, .thing-article-foot { padding-inline: 20px; }
  }
</style>
