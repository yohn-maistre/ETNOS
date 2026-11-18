<script lang="ts">
  // One control for what Beranda shows: the feed (Terbaru, Komunitasku, Mengikuti) and the place.
  // Regions come first on a small map and in a list; any regency, city or kampung by search.
  import { ChevronDown, Check, Search } from '@lucide/svelte'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import AtlasMap from './AtlasMap.svelte'
  import { request } from './api'
  import { placeScope, setPlaceScope } from './place-scope.svelte'
  type Feed = 'new' | 'mine' | 'following'
  let {
    onChange,
    feed,
    onFeedChange,
  }: { onChange?: () => void; feed?: Feed; onFeedChange?: (mode: Feed) => void } = $props()
  type Ctx = { id: string; slug: string; title: string; kind: string; facet?: string; parents?: string[]; active?: number }
  const feeds: [Feed, string][] = [
    ['new', 'Terbaru'],
    ['mine', 'Komunitasku'],
    ['following', 'Mengikuti'],
  ]
  let open = $state(false),
    query = $state(''),
    all = $state<Ctx[]>([]),
    loaded = $state(false)
  $effect(() => {
    if (!open || loaded) return
    request<Ctx[]>('/v1/contexts')
      .then((rows) => {
        all = rows
        loaded = true
      })
      .catch(() => {
        loaded = true
      })
  })
  const name = (title: string) => title.replace(/^Meepago$/, 'Mee Pago')
  const regions = $derived(
    all
      .filter((c) => c.kind === 'region' && c.facet !== 'province' && !c.parents?.length)
      .map((c) => ({ ...c, title: name(c.title) })),
  )
  const matches = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return all.filter((c) => (c.kind === 'place' || c.kind === 'region') && c.title.toLowerCase().includes(q)).slice(0, 30)
  })
  const feedLabel = $derived(feeds.find(([m]) => m === feed)?.[1] ?? 'Terbaru')
  function choose(c: { slug: string; title: string }) {
    setPlaceScope({ slug: c.slug, title: name(c.title) })
    open = false
    query = ''
    onChange?.()
  }
  function pickFeed(mode: Feed) {
    if (mode !== feed) onFeedChange?.(mode)
  }
</script>

<button
  class="surface-switch view-switch"
  onclick={() => (open = true)}
  aria-label={(feed ? feedLabel + ', ' : '') + name(placeScope.title) + '. Ganti tampilan'}
>
  <span class="vs-text">{#if feed}<small>{feedLabel}<span aria-hidden="true"> · </span></small>{/if}<strong>{name(placeScope.title)}</strong></span><ChevronDown size={14} />
</button>

<Dialog.Root bind:open>
  <Dialog.Content class="place-scope-dialog">
    <Dialog.Header>
      <Dialog.Title>{feed ? 'Tampilan Beranda' : 'Pilih tempat'}</Dialog.Title>
      <Dialog.Description>Tempat yang dipilih ikut menampilkan isi dari tempat di bawahnya. Pilihan ini hanya disimpan di perangkat ini.</Dialog.Description>
    </Dialog.Header>
    {#if feed}<div class="view-feeds" role="group" aria-label="Linimasa">
        {#each feeds as [mode, label] (mode)}<button aria-pressed={feed === mode} onclick={() => pickFeed(mode)}>{label}</button>{/each}
      </div>{/if}
    {#if !query.trim() && regions.length}<AtlasMap {regions} selected={placeScope.slug} onpick={choose} />{/if}
    <label class="place-scope-search"><Search size={16} /><input bind:value={query} placeholder="Cari kabupaten, kota atau kampung" aria-label="Cari tempat" /></label>
    <ul class="place-scope-list">
      {#if !query.trim()}
        <li><button onclick={() => choose({ slug: '', title: 'Tanah Papua' })} aria-pressed={!placeScope.slug}>Tanah Papua{#if !placeScope.slug}<Check size={15} />{/if}</button></li>
        {#each regions as r (r.id)}<li><button onclick={() => choose(r)} aria-pressed={placeScope.slug === r.slug}>Wilayah adat {r.title}{#if placeScope.slug === r.slug}<Check size={15} />{/if}</button></li>{/each}
        {#if !loaded}<li class="place-scope-note">Memuat tempat…</li>{/if}
      {:else}
        {#each matches as c (c.id)}<li><button onclick={() => choose(c)} aria-pressed={placeScope.slug === c.slug}>{c.title}{#if placeScope.slug === c.slug}<Check size={15} />{/if}</button></li>{/each}
        {#if loaded && !matches.length}<li class="place-scope-note">Tempat itu belum ada di katalog.</li>{/if}
      {/if}
    </ul>
  </Dialog.Content>
</Dialog.Root>

<style>
  .view-switch { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; max-width: 100%; font-weight: 600; cursor: pointer; }
  .vs-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vs-text small { font: inherit; }
  .vs-text small span { margin-inline: 0.35em; color: var(--muted-foreground); }
  .vs-text strong { font-weight: inherit; }
  @media (max-width: 767px) {
    .vs-text { display: grid; line-height: 1.15; text-align: left; }
    .vs-text small { font-size: 12px; font-weight: 500; color: var(--muted-foreground); }
    .vs-text small span { display: none; }
    .vs-text strong { font-size: 15px; overflow: hidden; text-overflow: ellipsis; }
  }
  .view-switch :global(svg) { flex: none; color: var(--muted-foreground); }
  .view-switch:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; border-radius: 6px; }
  :global(.place-scope-dialog) { max-width: 460px; max-height: 92dvh; overflow: auto; }
  .view-feeds { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 12px; background: var(--muted); }
  .view-feeds button { all: unset; box-sizing: border-box; min-height: 40px; display: grid; place-items: center; border-radius: 9px; font-size: 14px; color: var(--muted-foreground); cursor: pointer; }
  .view-feeds button[aria-pressed='true'] { background: var(--background); color: var(--foreground); font-weight: 600; box-shadow: 0 1px 2px color-mix(in oklab, var(--foreground) 12%, transparent); }
  .view-feeds button:focus-visible { outline: 2px solid var(--foreground); outline-offset: -2px; }
  .place-scope-search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; color: var(--muted-foreground); }
  .place-scope-search input { flex: 1; border: 0; outline: none; background: transparent; color: var(--foreground); font: inherit; }
  .place-scope-list { list-style: none; margin: 0; padding: 0; display: grid; }
  .place-scope-list button { all: unset; box-sizing: border-box; width: 100%; display: flex; justify-content: space-between; align-items: center; min-height: 44px; padding: 0 8px; border-radius: 8px; cursor: pointer; }
  .place-scope-list button:hover, .place-scope-list button[aria-pressed='true'] { background: var(--muted); }
  .place-scope-list button:focus-visible { outline: 2px solid var(--foreground); outline-offset: -2px; }
  .place-scope-note { padding: 10px 8px; font-size: 14px; color: var(--muted-foreground); }
</style>
