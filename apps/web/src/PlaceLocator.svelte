<script lang="ts">
  // Where a place or language sits, on a light locator map (terrain image tiles and one SVG, no map library).
  // Kabupaten and kota show their reference point from the simplified BIG outlines; a province shows the points of
  // its kabupaten and kota; a customary region shows its generalised outline, which is a planning reference and not
  // a customary land boundary; a language shows its Glottolog reference point. A thing without any of these says so.
  // The full interactive map lives on the observatory front only.
  import { onMount } from 'svelte'
  import LocatorMap from './LocatorMap.svelte'
  import { loadAtlas, loadAtlasLangs, type AtlasLang } from './explore-data'
  import { unproject } from './terrain.ts'
  import type { Atlas } from './RegionArt.svelte'

  type PlacePoint = { slug: string; title: string; facet: string; latitude: number; longitude: number }
  let { thing }: { thing: { slug: string; title: string; kind: string; facet?: string; children?: { slug: string; title: string }[] } } = $props()

  let places = $state<Record<string, PlacePoint> | null>(null),
    atlas = $state<Atlas | null>(null),
    langs = $state<AtlasLang[] | null>(null),
    ready = $state(false)
  onMount(() => {
    const jobs: Promise<unknown>[] = [fetch('/observatory/places.json').then((r) => (r.ok ? r.json() : null)).then((d) => (places = d?.places ?? {})).catch(() => (places = {}))]
    if (thing.kind === 'language') jobs.push(loadAtlasLangs().then((l) => (langs = l)).catch(() => (langs = [])))
    if (thing.facet === 'customary-region') jobs.push(loadAtlas().then((a) => (atlas = a)))
    void Promise.all(jobs).finally(() => (ready = true))
  })

  const view = $derived.by(() => {
    if (!ready) return null
    if (thing.kind === 'language') {
      const at = langs?.find((l) => l[0] === thing.slug)
      if (!at) return { points: [], area: '', note: '' }
      const [lat, lon] = unproject(at[1], at[2])
      return { points: [{ name: thing.title, latitude: lat, longitude: lon }], area: '', note: 'Titik acuan bahasa ini diambil dari Glottolog dan tidak menandai batas wilayah tuturnya.' }
    }
    const children = (thing.children ?? []).map((c) => places?.[c.slug]).filter((p): p is PlacePoint => !!p && (p.facet === 'regency' || p.facet === 'city')).map((p) => ({ name: p.title, latitude: p.latitude, longitude: p.longitude, href: '/wiki/' + p.slug }))
    if (thing.facet === 'customary-region') {
      const shape = atlas?.regions[thing.slug]
      return { points: shape ? [] : children, area: shape?.d ?? '', note: shape ? 'Garis ini adalah wilayah acuan dari RPJMN 2020–2024 yang disederhanakan, dan tidak sama dengan batas tanah adat.' : 'Titik ini adalah kabupaten dan kota di wilayah acuan ini.' }
    }
    if (thing.facet === 'province') return { points: children, area: '', note: 'Titik ini adalah kabupaten dan kota di provinsi ini, diambil dari garis batas BIG yang disederhanakan.' }
    const own = places?.[thing.slug]
    if (own) return { points: [{ name: thing.title, latitude: own.latitude, longitude: own.longitude }], area: '', note: 'Titik ini menandai bagian tengah wilayahnya menurut garis batas BIG yang disederhanakan, dan tidak menunjuk lokasi tertentu.' }
    return { points: [], area: '', note: '' }
  })
</script>

{#if view}
  <section class="pl" aria-label={'Letak ' + thing.title}>
    {#if view.points.length || view.area}
      <LocatorMap places={view.points} area={view.area} label={'Letak ' + thing.title} aspect={16 / 9} />
      <p>{view.note}</p>
    {:else}<p class="pl-none">Belum ada titik peta untuk {thing.title}. Titik akan ditambahkan setelah ada sumber yang bisa diperiksa.</p>{/if}
  </section>
{/if}

<style>
  .pl { display: grid; gap: 8px; padding: 18px 24px 4px; }
  .pl p { margin: 0; max-width: 62ch; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .pl-none { padding: 12px 14px; border-radius: 12px; border: 1px dashed var(--border); }
  @media (max-width: 767px) { .pl { padding-inline: 16px; } }
</style>
