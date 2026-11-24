<script lang="ts">
  // One entry page for every kind (docs/plan/one-page-system-2026-11-21.md §3), read from /v1/entri/<slug>: a place,
  // a wilayah adat, a language, a topic, a people, a species, a landform, an object or a page. Four tabs at most:
  // Tentang (the reviewed article with the kind's own module and the label basis at the foot), Percakapan, Riset dan
  // data (published research and datasets) and Riwayat (revisions and how the page grew). The Letak rail sits in the
  // shell's side rail on wide screens and folds into one row of chips under the title on narrow ones.
  // A section shows only when there is something in it.
  import { onDestroy, untrack } from 'svelte'
  import { SvelteURLSearchParams } from 'svelte/reactivity'
  import { ArrowUpRight, BookOpen, CheckCircle2, ChevronDown, Clock, Expand, Link2, MapPin, PenLine, RotateCcw, Tag, Users } from '@lucide/svelte'
  import { Switch } from '$lib/components/ui/switch/index.js'
  import LandscapePrint from './LandscapePrint.svelte'
  import PlaceLocator from './PlaceLocator.svelte'
  import LanguageSpecimen, { type SpecimenGroup } from './LanguageSpecimen.svelte'
  import Literature from './Literature.svelte'
  import ThingData from './ThingData.svelte'
  import CoreSample from './CoreSample.svelte'
  import PostCard from './PostCard.svelte'
  import WikiSourceNotes from './WikiSourceNotes.svelte'
  import WikiViewerLinks from './WikiViewerLinks.svelte'
  import EntryRail from './EntryRail.svelte'
  import KiosPlace from './KiosPlace.svelte'
  import EntryStewardTools from './EntryStewardTools.svelte'
  import { communityArtwork } from './site-branding'
  import { markdown } from './markdown'
  import { languageName } from './wiki-diff'
  import { placeNews } from './place-layers'
  import { newsDate, type NewsItem } from './news.svelte'
  import { loadAtlasLangs, loadContexts, regionTitle, type Ctx } from './explore-data'
  import { request, relativeDate, ApiError, type Auth, type Community, type Post } from './api'
  import { loadEntry, type Entry } from './entri'
  import { entryRail } from './entry-rail.svelte'
  import { ENTRY_TABS, tabHref, type EntryTab } from './entry-routes.ts'
  import { loadViewerObjects, viewerHref, KIND_LABEL as RECORD_KIND, type ViewerObject } from './viewer-data.ts'
  import { OBSERVATORY_NAME } from './observatory-name.ts'

  let {
    slug,
    initialTab = 'tentang',
    auth,
    communities,
    canVote,
    onError,
    onCompose,
  }: {
    slug: string
    initialTab?: EntryTab
    auth: Auth
    communities: Community[]
    canVote: (communityId: string) => boolean
    onError: (message: string) => void
    onCompose?: (place?: { id: string; title: string }) => void
  } = $props()

  const uid = $props.id()
  let entry = $state<Entry | null>(null),
    phase = $state<'loading' | 'ready' | 'missing' | 'failed'>('loading'),
    tab = $state<EntryTab>(untrack(() => initialTab)),
    railOpen = $state(false),
    reload = $state(0),
    reviewBusy = $state(false)
  $effect(() => { tab = initialTab })
  async function reviewArticle(accept: boolean) {
    const revId = entry?.article?.id
    if (!revId || reviewBusy) return
    if (!accept && !confirm('Kembalikan perubahan ini ke revisi sebelumnya?')) return
    reviewBusy = true
    try {
      await request('/v1/wiki-revisions/' + encodeURIComponent(revId) + '/review', { accept })
      reload++
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Status tinjauan belum dapat diubah.')
    } finally {
      reviewBusy = false
    }
  }

  $effect(() => {
    const asked = slug, abort = new AbortController()
    void reload
    phase = 'loading'
    loadEntry(asked, abort.signal)
      .then((e) => {
        if (abort.signal.aborted) return
        entry = e
        phase = 'ready'
        // An older address (a page id, a context id, a thing's own slug) shows the entry's own address.
        if (e.slug !== asked) history.replaceState(history.state, '', tabHref(e.slug, untrack(() => tab), location.search) + location.hash)
      })
      .catch((err) => {
        if (abort.signal.aborted) return
        entry = null
        phase = err instanceof ApiError && err.status === 404 ? 'missing' : 'failed'
      })
    return () => abort.abort()
  })
  $effect(() => { entryRail.entry = entry })
  onDestroy(() => { entryRail.entry = null })
  $effect(() => { if (entry) document.title = entry.title + ' · ' + OBSERVATORY_NAME + ' · ETNOS' })

  function choose(next: EntryTab) {
    tab = next
    // The tab is part of the address so it can be shared, without adding a step to Back.
    if (entry) history.replaceState(history.state, '', tabHref(entry.slug, next, location.search))
  }
  function keys(e: KeyboardEvent) {
    const i = ENTRY_TABS.findIndex(([t]) => t === tab), step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = ENTRY_TABS[(i + step + ENTRY_TABS.length) % ENTRY_TABS.length][0]
    choose(next)
    document.getElementById(uid + '-tab-' + next)?.focus()
  }

  const ctx = $derived(entry?.source.context ?? null)
  const isPlaceCtx = $derived(!!ctx && (ctx.kind === 'place' || ctx.kind === 'region'))
  const listKey = $derived(entry ? 'entri-' + entry.slug : '')
  const viewerLink = (id: string) => viewerHref(id) + '?daftar=' + encodeURIComponent(listKey)

  // Media from the Penampil: the first photo of the entry's records as its picture, every record as a card.
  let records = $state<ViewerObject[]>([])
  $effect(() => {
    const ids = entry?.media.map((m) => m.id) ?? []
    records = []
    if (!ids.length) return
    let live = true
    void loadViewerObjects().then((all) => { if (live) records = ids.map((id) => all.find((o) => o.id === id)).filter((o): o is ViewerObject => !!o) })
    return () => { live = false }
  })
  const hero = $derived(records.flatMap((r) => (r.photos ?? []).slice(0, 1).map((p) => ({ record: r, photo: p })))[0] ?? null)
  const art = $derived(!hero && isPlaceCtx && ctx ? communityArtwork(ctx.id) : null)

  // Percakapan (docs/plan/one-page-system-2026-11-21.md §4): public opening posts that the author tagged with this
  // entry, that come from a community labelled with it, or that link to it, read from the server as an anonymous
  // reader would see them. A place's posts can include what sits inside it.
  let items = $state<Post[]>([]), total = $state(0), insideCount = $state(0), cursor = $state<string | null>(null),
    inside = $state(false), convoReload = $state(0), convoPhase = $state<'loading' | 'ready' | 'failed'>('loading'), more = $state(false)
  const convoUrl = (slug: string, next?: string) => '/v1/entri/' + encodeURIComponent(slug) + '/percakapan?' + new SvelteURLSearchParams({ ...(inside ? { inside: '1' } : {}), ...(next ? { cursor: next } : {}) })
  $effect(() => {
    const slug = entry?.slug, abort = new AbortController()
    void inside
    void convoReload
    if (!slug) return
    convoPhase = 'loading'
    request<{ items: Post[]; total: number; inside: number; nextCursor: string | null }>(convoUrl(slug), undefined, abort.signal, true)
      .then((r) => { if (abort.signal.aborted) return; items = r.items; total = r.total; insideCount = r.inside; cursor = r.nextCursor; convoPhase = 'ready' })
      .catch(() => { if (!abort.signal.aborted) { items = []; convoPhase = 'failed' } })
    return () => abort.abort()
  })
  async function loadMore() {
    if (!entry || !cursor || more) return
    more = true
    try {
      const r = await request<{ items: Post[]; nextCursor: string | null }>(convoUrl(entry.slug, cursor), undefined, undefined, true)
      items = [...items, ...r.items.filter((p) => !items.some((q) => q.id === p.id))]
      cursor = r.nextCursor
    } catch {
      onError('Posting berikutnya belum dapat dimuat.')
    } finally {
      more = false
    }
  }
  /** How a post reached this entry, in one short line. */
  function viaLine(p: Post) {
    const v = p.via?.[0]
    if (!v) return null
    if (v.source === 'community' && v.community) return { icon: Users, text: 'Dari komunitas ' + v.community.title + (v.entry ? ' di ' + v.entry.title : ''), href: '/communities/' + v.community.id }
    if (v.entry) return { icon: MapPin, text: 'Tentang ' + v.entry.title, href: '/wiki/' + encodeURIComponent(v.entry.slug) }
    if (v.source === 'link') return { icon: Link2, text: 'Menautkan halaman ini', href: '' }
    return { icon: Tag, text: 'Ditandai oleh penulis', href: '' }
  }
  const compose = () => entry && onCompose?.({ id: entry.slug, title: entry.title })

  // Kabar for a place, three newest.
  let news = $state<NewsItem[]>([])
  $effect(() => {
    const list = isPlaceCtx ? entry?.newsPlaces ?? [] : [], abort = new AbortController()
    news = []
    if (list.length) void placeNews(list, abort.signal, 3).then((r) => { if (!abort.signal.aborted) news = r.items })
    return () => abort.abort()
  })

  // A language: the other languages that share its Glottolog reference point.
  let group = $state<SpecimenGroup | null>(null)
  $effect(() => {
    const s = ctx?.kind === 'language' ? ctx.slug : ''
    group = null
    if (!s) return
    let live = true
    void Promise.all([loadContexts(), loadAtlasLangs()]).then(([all, langs]) => {
      if (!live) return
      const region = all.find((c) => c.slug === langs.find((l) => l[0] === s)?.[3])
      if (!region) return
      group = { slug: region.slug, title: regionTitle(region), languages: langs.filter((l) => l[3] === region.slug).map((l) => all.find((c) => c.slug === l[0])).filter((c): c is Ctx => !!c).sort((a, b) => a.title.localeCompare(b.title, 'id')).map((c) => ({ slug: c.slug, title: c.title })) }
    }).catch(() => {})
    return () => { live = false }
  })

  // Riwayat: revisions of the article, and the public work about a place, loaded when the tab opens.
  type Rev = { id: string; created: number; perspective: string; language: string; author?: { name: string; kind: string }; reviewer?: { name: string } | null; review?: string }
  let revisions = $state<Rev[] | null>(null), works = $state<{ id: string; title: string; state: string; updated: number; sponsor: { title: string }; contexts: { id: string }[] }[]>([])
  $effect(() => {
    const page = tab === 'riwayat' ? entry?.history?.pageId : undefined, id = tab === 'riwayat' ? ctx?.id : undefined, abort = new AbortController()
    revisions = null
    if (page) request<Rev[]>('/v1/wiki/' + page + '/history', undefined, abort.signal, true).then((r) => { if (!abort.signal.aborted) revisions = r }).catch(() => { if (!abort.signal.aborted) revisions = [] })
    if (id) request<typeof works>('/v1/work', undefined, abort.signal, true).then((r) => { if (!abort.signal.aborted) works = r.filter((w) => w.contexts.some((c) => c.id === id)) }).catch(() => {})
    return () => abort.abort()
  })

  const showBlurb = $derived(!!entry?.description && !(entry.kind === 'bahasa' && /^Rumpun .+ menurut Glottolog/.test(entry.description)) && entry.kind !== 'halaman')
  const kindLine = $derived(entry ? [entry.kindLabel, entry.sub && entry.sub.label !== entry.kindLabel ? entry.sub.label : ''].filter(Boolean).join(' · ') : '')
  const childHeading = $derived(entry?.kind === 'topik' ? 'Cabang' : entry?.children.every((c) => c.kind === 'tempat') ? 'Kabupaten dan kota' : 'Di dalamnya')
  const counts = $derived<Record<EntryTab, number>>({ tentang: 0, percakapan: total, riset: entry?.research.datasets.length ?? 0, riwayat: entry?.history?.revisions ?? 0 })
  const chips = $derived(entry ? [...entry.overlay.map((o) => ({ ...o, label: 'Wilayah adat ' + o.title })), ...entry.related.slice(0, 6).map((r) => ({ ...r, label: r.title }))] : [])
</script>

{#if phase === 'loading' && !entry}<div class="ep-hold" aria-hidden="true"><div></div><div></div><div></div></div><p class="sr-only" role="status">Memuat halaman</p>
{:else if phase === 'missing'}<div class="ep-missing">
    <h1>Halaman ini belum ada</h1>
    <p>Belum ada entri dengan alamat ini di {OBSERVATORY_NAME}. Alamatnya mungkin keliru, atau halamannya sudah dipindah.</p>
    <p><a href="/wiki">Kembali ke {OBSERVATORY_NAME}</a></p>
  </div>
{:else if phase === 'failed' && !entry}<div class="ep-missing">
    <h1>Halaman belum dapat dimuat</h1>
    <p>Sambungan ke ETNOS terputus. <button type="button" class="ep-inline" onclick={() => reload++}>Coba lagi</button></p>
  </div>
{:else if entry}
  <article class="ep" aria-labelledby={uid + '-title'}>
    <header class="ep-head">
      {#if entry.chain.length}<nav class="ep-crumbs" aria-label="Letak halaman">
          {#each entry.chain as c, i (i)}{#if i}<span aria-hidden="true">›</span>{/if}{#if c.href}<a href={c.href}>{c.title}</a>{:else}<span>{c.title}</span>{/if}{/each}
        </nav>{/if}
      <h1 id={uid + '-title'}>{entry.title}</h1>
      <p class="ep-kind">{kindLine}{entry.aliases.length ? ' · ' + entry.aliases.slice(0, 2).join(', ') : ''}</p>
    </header>

    {#if hero}<a class="ep-hero" href={viewerLink(hero.record.id)}>
        <img src={hero.photo.src} alt={hero.photo.alt} width={hero.photo.width} height={hero.photo.height} />
        <span class="ep-hero-open"><Expand size={15} aria-hidden="true" />Buka di Penampil</span>
      </a>
      <p class="ep-credit">{hero.photo.credit} · {hero.photo.licence.name}</p>
    {:else if art}<div class="ep-cover" aria-hidden="true"><LandscapePrint artwork={art} decorative /></div>{/if}

    <div class="ep-chips">
      <button type="button" class="ep-chip ep-chip-main" aria-expanded={railOpen} aria-controls={uid + '-rail'} onclick={() => (railOpen = !railOpen)}>
        <MapPin size={15} aria-hidden="true" />Letak{#if entry.communities.length}<span>· {entry.communities.length} komunitas</span>{/if}<ChevronDown size={15} aria-hidden="true" />
      </button>
      {#if entry.managedBy}<a class="ep-chip ep-chip-managed" href={'/groups/' + entry.managedBy.id}><span>Dikelola oleh {entry.managedBy.title}</span></a>{/if}
      {#each chips as c (c.slug)}<a class="ep-chip" href={c.href}>{c.label}</a>{/each}
    </div>
    {#if railOpen}<div id={uid + '-rail'} class="ep-inline-rail"><EntryRail {entry} inline /></div>{/if}

    <div class="ep-tabs section-tab-scroll" role="tablist" aria-label={'Tentang ' + entry.title} tabindex="-1" onkeydown={keys}>
      {#each ENTRY_TABS as [value, label] (value)}<button role="tab" id={uid + '-tab-' + value} aria-selected={tab === value} aria-controls={uid + '-panel'} tabindex={tab === value ? 0 : -1} onclick={() => choose(value)}>{label}{#if counts[value]}<span>{counts[value]}</span>{/if}</button>{/each}
    </div>

    <div class="ep-panel" id={uid + '-panel'} role="tabpanel" aria-labelledby={uid + '-tab-' + tab}>
      {#if tab === 'tentang'}
        {#if showBlurb}<p class="ep-blurb">{entry.description}</p>{/if}
        {#if entry.facts.length || entry.localNames?.length}<dl class="ep-facts">
            {#each entry.localNames ?? [] as n (n.community.id + n.name)}<div><dt>Nama lokal</dt><dd><strong>{n.name}</strong> dalam bahasa {n.language}, menurut anggota <a href={'/communities/' + n.community.id}>{n.community.title}</a></dd></div>{/each}
            {#each entry.facts as f (f.label)}<div><dt>{f.label}</dt><dd>{#if f.href}<a href={f.href} target={f.href.startsWith('http') ? '_blank' : undefined} rel={f.href.startsWith('http') ? 'noreferrer' : undefined}>{f.value}{#if f.href.startsWith('http')}<ArrowUpRight size={13} aria-hidden="true" />{/if}</a>{:else}{f.value}{/if}</dd></div>{/each}
          </dl>{/if}

        {#if entry.article}<section class="ep-article" aria-label={'Halaman ' + entry.article.title}>
            {#if entry.article.review === 'unreviewed'}
              <div class="ep-review-bar" data-state="unreviewed" role="status">
                <span class="ep-review-text"><Clock size={15} aria-hidden="true" /><span><strong>Belum ditinjau manusia.</strong> {entry.article.author?.kind === 'agent' ? 'Ditulis oleh Aksara (AI) dari sumber terbuka.' : 'Terbit langsung sebelum ditinjau.'}</span></span>
                {#if auth.steward}<span class="ep-review-actions">
                    <button type="button" class="ep-review-ok" disabled={reviewBusy} onclick={() => void reviewArticle(true)}>Tandai sudah ditinjau</button>
                    <button type="button" class="ep-review-undo" disabled={reviewBusy} onclick={() => void reviewArticle(false)}><RotateCcw size={13} aria-hidden="true" />Kembalikan</button>
                  </span>{/if}
              </div>
            {:else}
              <div class="ep-review-bar" data-state="reviewed">
                <span class="ep-review-text"><CheckCircle2 size={15} aria-hidden="true" /><span><strong>Sudah ditinjau{entry.article.reviewer ? ' oleh ' + entry.article.reviewer.name : ''}.</strong>{entry.article.author?.kind === 'agent' ? ' Draf awal disusun dengan AI.' : ''}</span></span>
              </div>
            {/if}
            <p class="ep-byline">{languageName(entry.article.language)} · {relativeDate(entry.article.created)}{entry.article.author ? ' · ' + entry.article.author.name : ''}</p>
            <div class="wiki-body wiki-serif post-markdown">{@html markdown(entry.article.text, [], 'entri-' + entry.article.pageId)}</div>
            <WikiSourceNotes citations={entry.article.citations} />
            <WikiViewerLinks text={entry.article.text} exclude={entry.media.map((m) => m.id)} />
            <p class="ep-article-foot"><button type="button" class="ep-inline" onclick={() => choose('riwayat')}><BookOpen size={15} aria-hidden="true" />Riwayat dan usulan perubahan</button></p>
          </section>
        {:else}<div class="ep-empty">
            <p>Belum ada tulisan tentang {entry.title} yang sudah diperiksa.</p>
            <a class="ep-action" href={auth.actor ? '/wiki/notes/new' : '/login'}><PenLine size={15} aria-hidden="true" />{auth.actor ? 'Mulai tulis' : 'Masuk untuk menulis'}</a>
          </div>{/if}

        {#if ctx && (isPlaceCtx || ctx.kind === 'language')}<PlaceLocator thing={{ slug: ctx.slug, title: entry.title, kind: ctx.kind, facet: ctx.facet, children: entry.children }} />{/if}

        {#if records.length}<section class="ep-section" aria-labelledby={uid + '-media'}>
            <h2 id={uid + '-media'}>Di Penampil</h2>
            <div class="ep-media">
              {#each records as r (r.id)}<a class="ep-media-card" href={viewerLink(r.id)}>
                  {#if r.thumb}<img src={r.thumb} alt="" loading="lazy" width="76" height="76" />{:else}<span class="ep-media-icon" aria-hidden="true"><Expand size={20} /></span>{/if}
                  <span><strong>{r.kind === 'landform' ? 'Relief ' + r.title : r.kind === 'species' ? 'Foto dan sebaran' : r.title}</strong><small>{RECORD_KIND[r.kind]}{r.sources[0]?.licence ? ' · ' + r.sources[0].licence.name : ''}</small></span>
                </a>{/each}
            </div>
          </section>{/if}

        {#if news.length}<section class="ep-section" aria-labelledby={uid + '-news'}>
            <div class="ep-section-head"><h2 id={uid + '-news'}>Kabar</h2><a class="ep-more" href={'/news?place=' + encodeURIComponent(entry.newsPlaces[0])}>Semua kabar</a></div>
            <div class="ep-rows">{#each news as n (n.id)}<a class="ep-row" href={'/news/' + n.id}><span class="ep-row-title">{n.title}</span><span class="ep-row-meta">{[newsDate(n.publishedAt), n.sourceCount ? n.sourceCount + ' sumber' : ''].filter(Boolean).join(' · ')}</span></a>{/each}</div>
          </section>{/if}

        {#if entry.kios?.length}<div class="ep-section ep-kios"><KiosPlace items={entry.kios} place={entry.title} /></div>{/if}

        {#if group && group.languages.length > 1}<section class="ep-section ep-specimen" aria-labelledby={uid + '-langs'}>
            <h2 id={uid + '-langs'}>Bahasa lain dengan titik acuan di {group.title}</h2>
            <LanguageSpecimen groups={[group]} total={group.languages.length} current={ctx?.slug} open={group.languages.findIndex((l) => l.slug === ctx?.slug) >= 8} />
          </section>{/if}

        {#each entry.kamus.filter((k) => k.entries) as k (k.communityId)}<section class="ep-section" aria-labelledby={uid + '-kamus-' + k.communityId}>
            <div class="ep-section-head"><h2 id={uid + '-kamus-' + k.communityId}>Kamus {k.languageName}</h2><a class="ep-more" href={'/communities/' + k.communityId}>Buka kamus</a></div>
            <p class="ep-note">Kamus ini disusun di komunitas {k.title} dan memuat {k.entries.toLocaleString('id-ID')} kata.</p>
            {#if k.words.length}<dl class="ep-words">{#each k.words as w (w.lemma)}<div><dt>{w.lemma}</dt><dd>{w.gloss}</dd></div>{/each}</dl>{/if}
          </section>{/each}

        {#if entry.children.length}<section class="ep-section ep-children" aria-labelledby={uid + '-children'}>
            <h2 id={uid + '-children'}>{childHeading} <span class="ep-count">{entry.childCount}</span></h2>
            <div class="ep-chiplist">{#each entry.children as c (c.slug)}<a href={c.href}>{c.title}</a>{/each}</div>
          </section>{/if}


        {#if entry.basis}<section class="ep-basis" aria-labelledby={uid + '-basis'}>
            <h2 id={uid + '-basis'}>Dasar label</h2>
            <p>{entry.basis.basis}</p>
            <ul>
              {#each entry.basis.sources as s (s.url)}<li><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>{/each}
              <li><a href="/tentang#about-basis">Semua dasar label di ETNOS</a></li>
            </ul>
          </section>{/if}
      {:else if tab === 'percakapan'}
        {#if total || insideCount}<div class="ep-convo-bar">
            {#if items.length && auth.actor && onCompose}<button type="button" class="ep-action" onclick={compose}><PenLine size={15} aria-hidden="true" />Tulis tentang {entry.title}</button>
            {:else if items.length && !auth.actor}<a class="ep-action" href="/login"><PenLine size={15} aria-hidden="true" />Masuk untuk menulis</a>{:else}<span></span>{/if}
            {#if insideCount}<label class="ep-inside"><Switch bind:checked={inside} aria-describedby={uid + '-inside-note'} />{entry.kind === 'topik' ? 'Termasuk cabangnya' : 'Termasuk tempat di dalamnya'}</label>{/if}
          </div>
          <p class="ep-convo-note" id={uid + '-inside-note'}>{total.toLocaleString('id-ID')} posting publik tentang {entry.title}{inside ? ' dan ' + insideCount.toLocaleString('id-ID') + (entry.kind === 'topik' ? ' cabangnya' : ' tempat di dalamnya') : ''}. Posting dari komunitas privat tidak pernah tampil di sini.</p>{/if}
        {#each items as post (post.id)}{@const via = viaLine(post)}<div class="ep-post">
            {#if via}<p class="ep-via"><via.icon size={13} aria-hidden="true" />{#if via.href}<a href={via.href}>{via.text}</a>{:else}<span>{via.text}</span>{/if}</p>{/if}
            <PostCard {post} community={communities.find((c) => c.id === post.community_id)} loggedIn={!!auth.actor} canVote={canVote(post.community_id)} {onError} />
          </div>{/each}
        {#if cursor && items.length}<div class="ep-more-row"><button type="button" class="ep-more-button" disabled={more} onclick={loadMore}>{more ? 'Memuat…' : 'Tampilkan posting lain'}</button></div>{/if}
        {#if convoPhase === 'loading' && !items.length}<p class="ep-note ep-pad" role="status">Memuat percakapan…</p>
        {:else if convoPhase === 'failed'}<p class="ep-note ep-pad">Percakapan belum dapat dimuat. <button type="button" class="ep-inline" onclick={() => convoReload++}>Coba lagi</button></p>
        {:else if !items.length}<div class="ep-empty ep-convo-empty">
            <p class="ep-empty-title">Belum ada yang menulis tentang {entry.title}{inside ? ' atau tempat di dalamnya' : ''}.</p>
            <p>{ctx ? 'Posting publik yang ditandai dengan ' + entry.title + ', atau yang datang dari komunitas tentang ' + entry.title + ', akan tampil di sini.' : 'Posting publik yang ditandai dengan ' + entry.title + ' akan tampil di sini.'}</p>
            {#if auth.actor && onCompose}<button type="button" class="ep-action" onclick={compose}><PenLine size={15} aria-hidden="true" />Tulis tentang {entry.title}</button>
            {:else if !auth.actor}<a class="ep-action" href="/login"><PenLine size={15} aria-hidden="true" />Masuk untuk menulis</a>{/if}
          </div>{/if}
      {:else if tab === 'riset'}
        {#if entry.research.literature}<Literature slug={entry.research.literature} title={entry.title} />{/if}
        {#if ctx || entry.source.things.length}<ThingData slug={ctx?.slug ?? ''} thing={ctx ? '' : entry.source.things[0]} title={entry.title} />
        {:else}<p class="ep-note ep-pad">Belum ada riset atau dataset tentang {entry.title} di katalog. <a href="/wiki/data">Lihat katalog data</a></p>{/if}
      {:else}
        {#if entry.history}<section class="ep-section" aria-labelledby={uid + '-revs'}>
            <div class="ep-section-head"><h2 id={uid + '-revs'}>Revisi halaman</h2><a class="ep-more" href={'/wiki/' + entry.history.pageId + '?view=riwayat'}>Tinjauan dan usulan</a></div>
            {#if revisions === null}<p class="ep-note" role="status">Memuat riwayat…</p>
            {:else if revisions.length}<ol class="ep-revs">
                {#each revisions.slice(0, 12) as r (r.id)}<li><strong>{r.perspective}</strong><span>{[relativeDate(r.created), languageName(r.language), (r.author?.name ?? 'Kontributor') + (r.author?.kind === 'agent' ? ' (AI)' : ''), r.review === 'unreviewed' ? 'belum ditinjau' : r.review === 'reverted' ? 'dikembalikan' : r.reviewer ? 'ditinjau ' + r.reviewer.name : ''].filter(Boolean).join(' · ')}</span></li>{/each}
              </ol>{:else}<p class="ep-note">Riwayat belum dapat dimuat.</p>{/if}
          </section>{/if}
        {#if ctx}<CoreSample context={{ id: ctx.id, slug: ctx.slug, title: entry.title, pages: [], newsPlaces: entry.newsPlaces }} posts={items} {works} {auth} {onCompose} embedded />
          {#if auth.steward}<EntryStewardTools context={{ id: ctx.id, aliases: ctx.aliases }} title={entry.title} newsPlaces={entry.newsPlaces} {onError} onChanged={() => reload++} />{/if}
        {:else if !entry.history}<p class="ep-note ep-pad">Belum ada riwayat untuk {entry.title}. Riwayat mulai tercatat saat tulisan pertama diperiksa.</p>{/if}
      {/if}
    </div>
  </article>
{/if}

<style>
  .ep { --gutter: 24px; }
  @media (max-width: 767px) { .ep { --gutter: 16px; } }
  .ep-head { display: grid; gap: 6px; padding: 26px var(--gutter) 14px; }
  .ep-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; font-size: 13.5px; color: var(--muted-foreground); }
  .ep-crumbs a { display: inline-flex; align-items: center; min-height: 32px; color: inherit; text-decoration: none; }
  .ep-crumbs a:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .ep-head h1 { margin: 0; font-size: clamp(28px, 5.2vw, 36px); font-weight: 800; line-height: 1.08; letter-spacing: -0.025em; text-wrap: balance; overflow-wrap: anywhere; }
  .ep-kind { margin: 0; font-size: 14px; color: var(--muted-foreground); }
  .ep-hero { position: relative; display: block; margin: 0 var(--gutter); border-radius: 16px; overflow: hidden; background: var(--secondary); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  .ep-hero img { display: block; width: 100%; height: auto; max-height: 360px; object-fit: cover; }
  .ep-hero-open { position: absolute; right: 12px; bottom: 12px; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 14px; border-radius: 999px; background: color-mix(in oklab, var(--background) 88%, transparent); backdrop-filter: blur(8px); color: var(--foreground); font-size: 13.5px; font-weight: 600; }
  .ep-hero:hover .ep-hero-open { background: var(--background); }
  .ep-credit { margin: 6px var(--gutter) 0; font-size: 12.5px; color: var(--muted-foreground); }
  .ep-cover { height: 120px; margin: 0 var(--gutter); border-radius: 16px; overflow: hidden; background: #f4f0e5; }
  .ep-cover :global(.landscape-print) { width: 100%; height: 220%; object-fit: cover; object-position: 50% 62%; display: block; }
  .ep-chips { display: flex; gap: 8px; overflow-x: auto; padding: 14px var(--gutter) 2px; scrollbar-width: none; mask-image: linear-gradient(to right, #000 85%, transparent); }
  .ep-chips::-webkit-scrollbar { display: none; }
  .ep-chip-managed { max-width: min(78vw, 360px); }
  .ep-chip-managed span { overflow: hidden; text-overflow: ellipsis; }
  .ep-chip { all: unset; box-sizing: border-box; flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; font-size: 14px; color: var(--foreground); white-space: nowrap; cursor: pointer; }
  .ep-chip:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ep-chip-main { font-weight: 650; }
  .ep-chip-main span { font-weight: 450; color: var(--muted-foreground); }
  .ep-chip-main[aria-expanded='true'] :global(svg:last-child) { transform: rotate(180deg); }
  .ep-inline-rail { margin-top: 10px; border-top: 1px solid var(--border); }
  /* The shell's side rail shows the Letak rail from 1100px up (App.svelte); the chips are for narrower screens. */
  /* The shell hides its rail below 1360px; an entry's Letak rail is the page's navigator, so it stays from 1200px in a
     slightly narrower column (the main column is 640px and the sidebar about 256px). Below that the chips row takes over. */
  /* From 1200px the Letak rail beside the page lists the children too. */
  @media (min-width: 1200px) { .ep-chips, .ep-inline-rail, .ep-children, .ep-kios { display: none; } }
  @media (min-width: 1200px) and (max-width: 1359px) {
    :global(.cx-content-grid:has(.ep) > .cx-context) { display: block; top: 0; bottom: 0; width: 220px; }
    :global(.cx-content-grid:has(.ep) .context-scroll) { position: sticky; top: 88px; max-height: calc(100dvh - 104px); overflow-y: auto; overflow-x: hidden; padding: 4px 4px 20px; margin-inline: -4px; }
  }
  .ep-tabs { position: sticky; top: var(--sticky-top, 0px); z-index: 3; display: flex; gap: 2px; margin-top: 14px; padding: 0 calc(var(--gutter) - 10px); overflow-x: auto; border-bottom: 1px solid var(--border); background: color-mix(in oklab, var(--background) 92%, transparent); backdrop-filter: blur(10px); scrollbar-width: none; }
  .ep-tabs::-webkit-scrollbar { display: none; }
  .ep-tabs button { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 10px; font-size: 14.5px; color: var(--muted-foreground); white-space: nowrap; cursor: pointer; border-bottom: 4px solid transparent; border-radius: 0; margin-bottom: -1px; }
  .ep-tabs button:hover { color: var(--foreground); }
  .ep-tabs button[aria-selected='true'] { color: var(--foreground); font-weight: 700; border-bottom-color: var(--brand); }
  .ep-tabs button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: -4px; border-radius: 6px; }
  .ep-tabs span { font-size: 12.5px; font-weight: 500; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .ep-panel { min-height: 40vh; padding-bottom: 12px; }
  .ep-blurb { margin: 0; padding: 20px var(--gutter) 0; max-width: 68ch; font-size: 16px; line-height: 1.55; }
  .ep-facts { display: grid; margin: 16px var(--gutter) 0; }
  .ep-facts > div { display: grid; gap: 2px; padding: 10px 0; border-top: 1px solid var(--border); }
  .ep-facts > div:last-child { border-bottom: 1px solid var(--border); }
  @media (min-width: 640px) { .ep-facts > div { grid-template-columns: 150px minmax(0, 1fr); gap: 16px; } }
  .ep-facts dt { font-size: 13.5px; color: var(--muted-foreground); }
  .ep-facts dd { margin: 0; font-size: 15px; line-height: 1.5; overflow-wrap: anywhere; }
  .ep-facts a, .ep-basis a, .ep-note a { color: inherit; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in oklab, currentColor 35%, transparent); }
  .ep-facts a { display: inline-flex; align-items: center; gap: 3px; }
  .ep-section { display: grid; gap: 10px; padding: 24px var(--gutter) 4px; }
  .ep-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .ep-section h2, .ep-basis h2 { margin: 0; font-size: 18px; font-weight: 750; letter-spacing: -0.012em; }
  .ep-count { margin-left: 4px; font-size: 15px; font-weight: 500; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .ep-more { flex: none; display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; margin-right: -12px; border-radius: 999px; font-size: 14px; font-weight: 600; color: var(--brand, var(--foreground)); text-decoration: none; }
  .ep-more:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ep-specimen { padding-inline: 0; }
  .ep-specimen h2 { padding-inline: var(--gutter); }
  .ep-media { display: grid; gap: 10px; }
  @media (min-width: 560px) { .ep-media { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .ep-media-card { display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid var(--border); border-radius: 16px; color: inherit; text-decoration: none; min-width: 0; }
  .ep-media-card:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ep-media-card img, .ep-media-icon { flex: none; width: 64px; height: 64px; border-radius: 12px; object-fit: cover; background: var(--secondary); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  .ep-media-icon { display: grid; place-items: center; color: var(--muted-foreground); }
  .ep-media-card > span:last-child { display: grid; gap: 2px; min-width: 0; }
  .ep-media-card strong { font-size: 15px; font-weight: 700; line-height: 1.3; }
  .ep-media-card small { font-size: 13px; color: var(--muted-foreground); }
  .ep-rows { display: grid; }
  .ep-row { display: grid; gap: 3px; margin: 0 calc(var(--gutter) * -1); padding: 12px var(--gutter); border-top: 1px solid var(--border); color: inherit; text-decoration: none; }
  .ep-row:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ep-row-title { font-size: 15.5px; font-weight: 700; line-height: 1.3; }
  .ep-row-meta { font-size: 13.5px; color: var(--muted-foreground); }
  .ep-words { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin: 0; }
  .ep-words div { padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; }
  .ep-words dt { font-size: 15px; font-weight: 700; }
  .ep-words dd { margin: 0; font-size: 13.5px; color: var(--muted-foreground); }
  .ep-chiplist { display: flex; flex-wrap: wrap; gap: 8px; }
  .ep-chiplist a { display: inline-flex; align-items: center; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border); color: var(--foreground); text-decoration: none; font-size: 14px; }
  .ep-chiplist a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ep-article { margin-top: 18px; border-top: 1px solid var(--border); }
  .ep-review-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 14px; margin: 16px 28px 0; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); font-size: 13.5px; line-height: 1.45; }
  .ep-review-bar[data-state='unreviewed'] { background: color-mix(in oklab, var(--brand) 9%, var(--background)); border-color: color-mix(in oklab, var(--brand) 32%, var(--border)); }
  .ep-review-bar[data-state='reviewed'] { background: color-mix(in oklab, var(--foreground) 3%, var(--background)); color: var(--muted-foreground); }
  .ep-review-text { display: inline-flex; align-items: center; gap: 8px; }
  .ep-review-bar[data-state='reviewed'] strong { color: var(--foreground); font-weight: 600; }
  .ep-review-actions { display: flex; flex-wrap: wrap; gap: 6px; }
  .ep-review-ok, .ep-review-undo { display: inline-flex; align-items: center; gap: 5px; min-height: 34px; padding: 0 12px; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .ep-review-ok { border: 0; background: var(--foreground); color: var(--background); }
  .ep-review-undo { border: 1px solid var(--border); background: var(--background); color: var(--foreground); }
  .ep-review-ok:disabled, .ep-review-undo:disabled { opacity: 0.55; cursor: default; }
  .ep-byline { margin: 0; padding: 12px 28px 0; font-size: 13.5px; color: var(--muted-foreground); }
  .ep-article .wiki-body { padding: 0 28px; }
  .ep-article-foot { margin: 0; padding: 4px 28px 8px; }
  .ep-inline { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font-size: 14px; color: var(--muted-foreground); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
  .ep-inline:hover { color: var(--foreground); }
  .ep-empty { display: grid; justify-items: start; gap: 12px; margin-top: 18px; padding: 22px var(--gutter); border-top: 1px solid var(--border); }
  .ep-empty p { margin: 0; font-size: 15px; color: var(--muted-foreground); }
  .ep-action { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; min-height: 42px; padding: 0 16px; border-radius: 10px; background: var(--foreground); color: var(--background); font-size: 14px; font-weight: 600; cursor: pointer; }
  .ep-basis { display: grid; gap: 6px; margin-top: 20px; padding: 18px var(--gutter) 8px; border-top: 1px solid var(--border); }
  .ep-basis h2 { font-size: 14px; font-weight: 650; color: var(--muted-foreground); }
  .ep-basis p { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--muted-foreground); max-width: 68ch; }
  .ep-basis ul { margin: 0; padding: 0; list-style: none; display: grid; }
  .ep-basis a { display: inline-flex; align-items: center; min-height: 32px; font-size: 13.5px; color: var(--muted-foreground); }
  .ep-convo-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; padding: 16px var(--gutter) 6px; }
  .ep-inside { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; font-size: 14px; font-weight: 550; cursor: pointer; }
  .ep-convo-note { margin: 0; padding: 0 var(--gutter) 14px; font-size: 13px; line-height: 1.45; color: var(--muted-foreground); border-bottom: 1px solid var(--border); }
  .ep-post { border-bottom: 1px solid var(--border); }
  .ep-post :global(.cx-post) { border-bottom: 0; }
  .ep-via { display: flex; align-items: center; gap: 6px; margin: 0; padding: 12px var(--gutter) 0; font-size: 13px; color: var(--muted-foreground); }
  .ep-via a { color: inherit; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in oklab, currentColor 35%, transparent); }
  .ep-via a:hover { color: var(--foreground); }
  .ep-more-row { padding: 16px var(--gutter); }
  .ep-more-button { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px; border: 1px solid var(--border); border-radius: 999px; font-size: 13.5px; font-weight: 550; cursor: pointer; }
  .ep-more-button:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ep-convo-empty { margin-top: 0; border-top: 0; padding-top: 28px; }
  .ep-convo-empty p { max-width: 56ch; line-height: 1.5; }
  .ep-convo-empty .ep-empty-title { font-size: 17px; font-weight: 700; color: var(--foreground); letter-spacing: -0.01em; }
  .ep-note { margin: 0; font-size: 14.5px; line-height: 1.5; color: var(--muted-foreground); }
  .ep-pad { padding: 28px var(--gutter); }
  .ep-revs { margin: 0; padding: 0; list-style: none; display: grid; }
  .ep-revs li { display: grid; gap: 2px; padding: 10px 0; border-top: 1px solid var(--border); }
  .ep-revs strong { font-size: 15px; font-weight: 650; }
  .ep-revs span { font-size: 13.5px; color: var(--muted-foreground); }
  .ep-hold { display: grid; gap: 14px; padding: 28px 24px; }
  .ep-hold div { height: 22px; border-radius: 8px; background: color-mix(in oklab, var(--foreground) 6%, var(--background)); }
  .ep-hold div:first-child { width: 40%; height: 14px; }
  .ep-hold div:nth-child(2) { width: 70%; height: 34px; }
  .ep-hold div:last-child { height: 200px; border-radius: 16px; }
  .ep-missing { display: grid; gap: 10px; padding: 36px 24px; }
  .ep-missing h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
  .ep-missing p { margin: 0; font-size: 15px; color: var(--muted-foreground); }
  .ep-missing a { color: var(--foreground); }
  .ep a:focus-visible, .ep button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  @media (max-width: 767px) {
    .ep-head { padding-top: 18px; }
    .ep-byline, .ep-article .wiki-body, .ep-article-foot { padding-inline: 20px; }
    .ep-tabs button { flex: 1 0 auto; justify-content: center; padding: 0 6px; font-size: 14px; }
  }
  @media (prefers-reduced-motion: no-preference) { .ep-chip-main :global(svg:last-child) { transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1); } }
</style>
