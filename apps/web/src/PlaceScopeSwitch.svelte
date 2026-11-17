<script lang="ts">
  // Choose the place the feed and wiki show. Regions first, then any regency, city or kampung by search.
  import { MapPin, ChevronDown, Check, Search } from '@lucide/svelte'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { request } from './api'
  import { placeScope, setPlaceScope } from './place-scope.svelte'
  let { onChange }: { onChange?: () => void } = $props()
  type Ctx = { id: string; slug: string; title: string; kind: string; facet?: string; parents?: string[]; active?: number }
  let open = $state(false), query = $state(''), all = $state<Ctx[]>([]), loaded = $state(false)
  $effect(() => {
    if (!open || loaded) return
    request<Ctx[]>('/v1/contexts').then((rows) => { all = rows; loaded = true }).catch(() => { loaded = true })
  })
  const regions = $derived(all.filter((c) => c.kind === 'region' && c.facet !== 'province' && !c.parents?.length))
  const matches = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return all.filter((c) => (c.kind === 'place' || c.kind === 'region') && c.title.toLowerCase().includes(q)).slice(0, 30)
  })
  function choose(c: { slug: string; title: string }) {
    setPlaceScope(c)
    open = false
    query = ''
    onChange?.()
  }
</script>

<button class="place-scope" onclick={() => (open = true)} aria-label={'Tempat: ' + placeScope.title + '. Ganti tempat'}>
  <MapPin size={15} /><span>{placeScope.title}</span><ChevronDown size={14} />
</button>

<Dialog.Root bind:open>
  <Dialog.Content class="place-scope-dialog">
    <Dialog.Header>
      <Dialog.Title>Pilih tempat</Dialog.Title>
      <Dialog.Description>Beranda dan wiki akan menampilkan isi dari tempat ini dan tempat di bawahnya. Pilihan hanya disimpan di perangkat ini.</Dialog.Description>
    </Dialog.Header>
    <label class="place-scope-search"><Search size={16} /><input bind:value={query} placeholder="Cari kabupaten, kota atau kampung" aria-label="Cari tempat" /></label>
    <ul class="place-scope-list">
      {#if !query.trim()}
        <li><button onclick={() => choose({ slug: '', title: 'Tanah Papua' })} aria-pressed={!placeScope.slug}>Tanah Papua{#if !placeScope.slug}<Check size={15} />{/if}</button></li>
        {#if regions.length}<li class="place-scope-group">Wilayah adat</li>{/if}
        {#each regions as r (r.id)}<li><button onclick={() => choose(r)} aria-pressed={placeScope.slug === r.slug}>{r.title}{#if placeScope.slug === r.slug}<Check size={15} />{/if}</button></li>{/each}
        {#if !loaded}<li class="place-scope-note">Memuat tempat…</li>{/if}
      {:else}
        {#each matches as c (c.id)}<li><button onclick={() => choose(c)} aria-pressed={placeScope.slug === c.slug}>{c.title}{#if placeScope.slug === c.slug}<Check size={15} />{/if}</button></li>{/each}
        {#if loaded && !matches.length}<li class="place-scope-note">Tempat itu belum ada di katalog.</li>{/if}
      {/if}
    </ul>
  </Dialog.Content>
</Dialog.Root>

<style>
  .place-scope { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; background: var(--card); color: var(--foreground); font: inherit; font-size: 14px; cursor: pointer; max-width: 220px; }
  .place-scope span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .place-scope:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; }
  :global(.place-scope-dialog) { max-width: 440px; }
  .place-scope-search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; color: var(--muted-foreground); }
  .place-scope-search input { flex: 1; border: 0; outline: none; background: transparent; color: var(--foreground); font: inherit; }
  .place-scope-list { list-style: none; margin: 0; padding: 0; max-height: 55vh; overflow: auto; display: grid; }
  .place-scope-list button { all: unset; box-sizing: border-box; width: 100%; display: flex; justify-content: space-between; align-items: center; min-height: 44px; padding: 0 8px; border-radius: 8px; cursor: pointer; }
  .place-scope-list button:hover, .place-scope-list button[aria-pressed='true'] { background: var(--muted); }
  .place-scope-list button:focus-visible { outline: 2px solid var(--foreground); outline-offset: -2px; }
  .place-scope-group { padding: 12px 8px 4px; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted-foreground); }
  .place-scope-note { padding: 10px 8px; font-size: 14px; color: var(--muted-foreground); }
</style>
