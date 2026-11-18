<script lang="ts">
  // Jelajah: the home of places, languages and topics. One page with in-page sections, each in its own form:
  // places as strata, languages as a type specimen, topics as branching tiles. Every section follows the
  // place chosen in the switcher. Communities and news stay short; their own pages hold the full lists.
  import { onMount } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import NewsSection from './NewsSection.svelte'
  import PlaceStrata, { type Stratum } from './PlaceStrata.svelte'
  import LanguageSpecimen, { type SpecimenGroup } from './LanguageSpecimen.svelte'
  import TopicTiles, { type TopicTile } from './TopicTiles.svelte'
  import ExploreTalked from './ExploreTalked.svelte'
  import { request, type Auth, type Community } from './api'
  import { loadMap, type MapData } from './observatory'
  import { contextTree } from './context-tree'
  import { placeScope } from './place-scope.svelte'

  let { auth }: { auth: Auth } = $props()
  type Ctx = { id: string; slug: string; title: string; kind: string; facet: string; parents?: string[]; indexed: number }
  let contexts = $state<Ctx[]>([]),
    communities = $state<Community[]>([]),
    map = $state<MapData | null>(null),
    langs = $state<[string, number, number, string | null][]>([]),
    failed = $state(false)

  onMount(() => {
    const abort = new AbortController()
    request<Ctx[]>('/v1/contexts', undefined, abort.signal, true)
      .then((all) => (contexts = all))
      .catch(() => (failed = true))
    request<Community[]>('/v1/communities', undefined, abort.signal, true)
      .then((all) => (communities = all.filter((c) => c.visibility === 'public')))
      .catch(() => {})
    void loadMap().then((d) => (map = d))
    import('./papua-atlas.json').then((m) => (langs = (m.default as unknown as { langs: typeof langs }).langs)).catch(() => {})
    return () => abort.abort()
  })

  // Coast at the top, highlands in the middle, the southern lowlands at the bottom.
  const ORDER = ['mamta-tabi', 'saireri', 'domberai', 'bomberai', 'meepago', 'la-pago', 'ha-anim']
  const bySlug = $derived(new Map(contexts.map((c) => [c.slug, c])))
  const byId = $derived(new Map(contexts.map((c) => [c.id, c])))
  const regionOf = (slug: string) => {
    const c = bySlug.get(slug)
    if (!c) return ''
    if (c.facet === 'customary-region') return c.slug
    for (const p of c.parents ?? []) {
      const parent = byId.get(p)
      if (parent?.facet === 'customary-region') return parent.slug
    }
    return langs.find((l) => l[0] === slug)?.[3] ?? ''
  }
  const focus = $derived(placeScope.slug ? regionOf(placeScope.slug) : '')
  const title = (c: { title: string }) => c.title.replace(/^Meepago$/, 'Mee Pago')

  const strata = $derived<Stratum[]>(
    ORDER.map((slug) => bySlug.get(slug))
      .filter((r): r is Ctx => !!r)
      .map((r) => ({
        slug: r.slug,
        title: title(r),
        href: '/contexts/' + r.slug,
        places: contexts
          .filter((c) => c.kind === 'place' && c.parents?.includes(r.id))
          .sort((a, b) => a.title.localeCompare(b.title, 'id'))
          .map((c) => ({ slug: c.slug, title: c.title })),
        languages: langs.filter((l) => l[3] === r.slug).length,
        pages: map?.nodes.filter((n) => n.k === 'page' && n.reg === r.slug).length ?? 0,
      })),
  )
  const languageTotal = $derived(contexts.filter((c) => c.kind === 'language').length)
  const specimen = $derived<SpecimenGroup[]>(
    strata
      .filter((s) => !focus || s.slug === focus)
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
  const tiles = $derived<TopicTile[]>(
    contextTree(contexts.map((c) => ({ ...c, description: '' }))).topics.map((b) => ({
      slug: b.node.slug,
      title: b.node.title,
      children: b.children.map((c) => ({ slug: c.slug, title: c.title })),
    })),
  )
  // Everything under the chosen region, so "Sedang dibicarakan" can follow the switcher too.
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
    ['tempat', 'Tempat'],
    ['bahasa', 'Bahasa'],
    ['topik', 'Topik'],
    ['kabar', 'Kabar'],
    ['komunitas', 'Komunitas'],
  ]
</script>

<div class="jelajah">
  <nav class="jelajah-anchors" aria-label="Bagian Jelajah">
    {#each anchors as [id, label]}<a href={'#' + id}>{label}</a>{/each}
  </nav>

  {#if failed}<p class="jelajah-note" role="alert">Daftar tempat, bahasa dan topik belum dapat dimuat. Coba muat ulang halaman.</p>{/if}

  <section id="dibicarakan" class="jelajah-section" aria-labelledby="dibicarakan-title">
    <div class="jelajah-head"><h2 id="dibicarakan-title">Sedang dibicarakan{#if focus} di {placeScope.title}{/if}</h2></div>
    <ExploreTalked recorded={contexts} {within} />
  </section>

  <section id="tempat" class="jelajah-section" aria-labelledby="tempat-title">
    <div class="jelajah-head">
      <h2 id="tempat-title">Tempat</h2>
      <a href="/wiki">Peta di Wiki <ArrowUpRight size={14} /></a>
    </div>
    <p class="jelajah-lede">Tujuh wilayah adat dan kabupaten di dalamnya. Wilayah ini wilayah acuan, bukan batas tanah adat.</p>
    {#if strata.length}<PlaceStrata {strata} {focus} />{:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="bahasa" class="jelajah-section" aria-labelledby="bahasa-title">
    <div class="jelajah-head"><h2 id="bahasa-title">Bahasa</h2></div>
    {#if specimen.length}<LanguageSpecimen groups={specimen} total={focus ? specimen[0]?.languages.length ?? 0 : languageTotal} open={!!focus} />{:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="topik" class="jelajah-section" aria-labelledby="topik-title">
    <div class="jelajah-head"><h2 id="topik-title">Topik</h2></div>
    {#if tiles.length}<TopicTiles {tiles} />{:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </section>

  <section id="kabar" class="jelajah-section jelajah-news">
    <NewsSection compact />
  </section>

  <section id="komunitas" class="jelajah-section" aria-labelledby="komunitas-title">
    <div class="jelajah-head">
      <h2 id="komunitas-title">Komunitas</h2>
      <a href="/communities">Semua komunitas <ArrowUpRight size={14} /></a>
    </div>
    {#if communities.length}<ul class="jelajah-rooms">
        {#each communities as c (c.id)}<li><a href={'/communities/' + c.id}>{c.title}</a></li>{/each}
      </ul>{/if}
    <p class="jelajah-links"><a href="/groups">Organisasi</a><a href="/offers">Penawaran</a><a href="/work">Kerja publik</a></p>
  </section>
</div>

<style>
  .jelajah { padding-bottom: 24px; }
  .jelajah-anchors {
    position: sticky;
    top: 56px;
    z-index: 5;
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 8px 12px;
    background: color-mix(in oklab, var(--reading-surface, var(--background)) 94%, transparent);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--reading-line, var(--border));
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
  .jelajah-anchors a:focus-visible { outline: 2px solid var(--foreground); outline-offset: 1px; }
  .jelajah-section { padding-top: 28px; scroll-margin-top: 108px; }
  .jelajah-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 0 16px 10px; }
  .jelajah-head h2 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.015em; text-wrap: balance; }
  .jelajah-head a { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; font-size: 13.5px; color: var(--muted-foreground); text-decoration: none; white-space: nowrap; }
  .jelajah-head a:hover { color: var(--foreground); }
  .jelajah-lede { margin: -4px 16px 12px; font-size: 14px; line-height: 1.55; color: var(--muted-foreground); max-width: 62ch; }
  .jelajah-note { margin: 0 16px; font-size: 14px; color: var(--muted-foreground); }
  .jelajah-news { padding-inline: 16px; }
  .jelajah-news :global(.news-section) { margin: 0; }
  .jelajah-rooms { list-style: none; margin: 0; padding: 0 16px; display: flex; flex-wrap: wrap; gap: 8px; }
  .jelajah-rooms a {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid var(--commons-hairline, var(--border));
    font-size: 14.5px;
    font-weight: 550;
    color: var(--foreground);
    text-decoration: none;
  }
  .jelajah-rooms a:hover { background: var(--secondary); }
  .jelajah-links { display: flex; flex-wrap: wrap; gap: 18px; margin: 14px 16px 0; font-size: 14px; }
  .jelajah-links a { color: var(--muted-foreground); text-underline-offset: 3px; min-height: 32px; display: inline-flex; align-items: center; }
  .jelajah-links a:hover { color: var(--foreground); }
  .jelajah a:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; border-radius: 6px; }
  @media (min-width: 768px) {
    .jelajah-anchors { top: 72px; padding-inline: 20px; }
    .jelajah-section { scroll-margin-top: 128px; }
    .jelajah-head { padding-inline: 24px; }
    .jelajah-lede, .jelajah-note { margin-inline: 24px; }
    .jelajah-rooms { padding-inline: 24px; }
    .jelajah-links { margin-inline: 24px; }
    .jelajah-news { padding-inline: 24px; }
  }
</style>
