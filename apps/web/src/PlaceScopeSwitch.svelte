<script lang="ts">
  // One control for what Beranda shows: the feed (Terbaru, Komunitasku, Mengikuti) and the place.
  // Regions come first on a small map and in a list; any regency, city or kampung by search.
  import { ChevronDown, Check, Search } from '@lucide/svelte'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import AtlasMap from './AtlasMap.svelte'
  import { request } from './api'
  import { placeScope, setPlaceScope } from './place-scope.svelte'
  import { scopeRegions } from './scope-region.svelte'
  import { homeFilter, setHomeFilter, type HomeKind, type HomeSort } from './home-filter.svelte'
  type Feed = 'new' | 'mine' | 'following'
  let {
    onChange,
    feed,
    onFeedChange,
  }: { onChange?: () => void; feed?: Feed; onFeedChange?: (mode: Feed) => void } = $props()
  const scoped = scopeRegions()
  type Ctx = { id: string; slug: string; title: string; kind: string; facet?: string; parents?: string[]; active?: number }
  const feeds: [Feed, string, string][] = [
    ['new', 'Terbaru', 'Posting terbaru dari semua orang.'],
    ['mine', 'Komunitasku', 'Posting dari komunitas yang saya ikuti.'],
    ['following', 'Mengikuti', 'Posting dari orang yang saya ikuti.'],
  ]
  const kinds: [HomeKind, string][] = [
    ['all', 'Semua'],
    ['aksara', 'Aksara'],
    ['kerja', 'Kerja'],
  ]
  const sorts: [HomeSort, string][] = [
    ['new', 'Terbaru'],
    ['discussed', 'Paling dibahas'],
  ]
  let programs = $state<{ id: string; label: string }[]>([])
  $effect(() => {
    if (!open || programs.length) return
    request<{ programs?: { id: string; label: string }[] }>('/v1/aksara/jadwal')
      .then((r) => (programs = r.programs ?? []))
      .catch(() => {})
  })
  function pick(patch: Parameters<typeof setHomeFilter>[0]) {
    setHomeFilter(patch)
    onChange?.()
  }
  const filterLabel = $derived(
    homeFilter.kind === 'aksara'
      ? (programs.find((p) => p.id === homeFilter.program)?.label ?? 'Aksara')
      : homeFilter.kind === 'kerja'
        ? 'Kerja'
        : '',
  )
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
  const feedLabel = $derived((feeds.find(([m]) => m === feed)?.[1] ?? 'Terbaru') + (filterLabel ? ' · ' + filterLabel : ''))
  const feedHint = $derived(feeds.find(([m]) => m === feed)?.[2] ?? '')
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
      <Dialog.Description>Tempat yang dipilih ikut menampilkan isi dari tempat di bawahnya. Pilihan disimpan di perangkat ini.</Dialog.Description>
    </Dialog.Header>
    {#if feed}<div class="view-options">
        <div class="view-feed" role="radiogroup" aria-labelledby="view-feed-label">
          <span id="view-feed-label" class="view-label">Isi Beranda</span>
          <div class="view-choices">
            {#each feeds as [mode, label] (mode)}<button type="button" role="radio" aria-checked={feed === mode} onclick={() => pickFeed(mode)}><i aria-hidden="true"></i>{label}</button>{/each}
          </div>
          <p class="view-hint">{feedHint}</p>
        </div>
      <div class="view-filter">
        <div role="radiogroup" aria-labelledby="view-kind-label">
          <span id="view-kind-label" class="view-label">Jenis posting</span>
          <div class="view-choices">
            {#each kinds as [kind, label] (kind)}<button type="button" role="radio" aria-checked={homeFilter.kind === kind} onclick={() => pick({ kind })}><i aria-hidden="true"></i>{label}</button>{/each}
          </div>
        </div>
        {#if homeFilter.kind === 'aksara' && programs.length}<div role="radiogroup" aria-labelledby="view-program-label">
            <span id="view-program-label" class="view-label">Program Aksara</span>
            <div class="view-choices">
              <button type="button" role="radio" aria-checked={!homeFilter.program} onclick={() => pick({ program: '' })}><i aria-hidden="true"></i>Semua</button>
              {#each programs as p (p.id)}<button type="button" role="radio" aria-checked={homeFilter.program === p.id} onclick={() => pick({ program: p.id })}><i aria-hidden="true"></i>{p.label}</button>{/each}
            </div>
          </div>{/if}
        <div role="radiogroup" aria-labelledby="view-sort-label">
          <span id="view-sort-label" class="view-label">Urutan</span>
          <div class="view-choices">
            {#each sorts as [sort, label] (sort)}<button type="button" role="radio" aria-checked={homeFilter.sort === sort} onclick={() => pick({ sort })}><i aria-hidden="true"></i>{label}</button>{/each}
          </div>
        </div>
      </div>
    </div>{/if}
    <div class="place-pick">
      <span class="view-label">Tempat</span>
      <label class="place-scope-search"><Search size={16} /><input bind:value={query} placeholder="Cari kabupaten, kota atau kampung" aria-label="Cari tempat" /></label>
      <div class="place-body" class:searching={!!query.trim()}>
        {#if !query.trim() && regions.length}<div class="place-map"><AtlasMap {regions} selected={placeScope.slug} within={scoped.list} labels={false} onpick={choose} /></div>{/if}
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
      </div>
    </div>
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
  :global(.place-scope-dialog) { max-width: 460px; max-height: 92dvh; overflow: auto; gap: 12px; }
  :global(.place-scope-dialog [data-slot='dialog-description']) { font-size: 13px; line-height: 1.45; }
  .view-label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: var(--muted-foreground); }
  /* What the feed shows: a radio choice, not tabs. The sort control will sit beside it. */
  .view-options { display: flex; flex-wrap: wrap; gap: 12px 24px; padding-bottom: 12px; border-bottom: 1px solid var(--commons-hairline, var(--border)); }
  .view-feed { flex: 1 1 260px; min-width: 0; }
  .view-filter { flex: 1 1 100%; display: grid; gap: 12px; }
  .view-choices { display: flex; flex-wrap: wrap; gap: 6px; }
  .view-choices button { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 14px 0 10px; border: 1px solid var(--border); border-radius: 999px; font-size: 14px; color: var(--foreground); cursor: pointer; }
  .view-choices button i { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid var(--muted-foreground); box-sizing: border-box; }
  .view-choices button[aria-checked='true'] { border-color: var(--foreground); font-weight: 600; }
  .view-choices button[aria-checked='true'] i { border: 4px solid var(--foreground); }
  .view-choices button:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .view-choices button:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; }
  .view-hint { margin: 6px 0 0; font-size: 13px; line-height: 1.4; color: var(--muted-foreground); }
  .place-pick { display: grid; gap: 0; min-height: 0; }
  .place-scope-search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; min-height: 40px; color: var(--muted-foreground); }
  .place-scope-search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; }
  .place-body { display: grid; grid-template-columns: 128px minmax(0, 1fr); gap: 12px; align-items: start; margin-top: 8px; }
  .place-body.searching { grid-template-columns: minmax(0, 1fr); }
  .place-map { padding-top: 6px; overflow: hidden; }
  .place-scope-list { list-style: none; margin: 0; padding: 0; display: grid; }
  .place-scope-list button { all: unset; box-sizing: border-box; width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; min-height: 40px; padding: 0 8px; border-radius: 8px; font-size: 14px; cursor: pointer; }
  .place-scope-list button:hover, .place-scope-list button[aria-pressed='true'] { background: var(--muted); }
  .place-scope-list button[aria-pressed='true'] { font-weight: 600; }
  .place-scope-list button:focus-visible { outline: 2px solid var(--foreground); outline-offset: -2px; }
  .place-scope-note { padding: 10px 8px; font-size: 14px; color: var(--muted-foreground); }
</style>
