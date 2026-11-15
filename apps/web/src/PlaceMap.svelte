<script lang="ts">
  import type { ContextNode } from './context-tree'
  import { request } from './api'

  type Shape = { slug: string; title: string; d: string; x: number; y: number }
  type SiteMap = {
    zoom: number
    width: number
    height: number
    tiles: { x: number; y: number; left: number; top: number }[]
    places: Shape[]
    west?: number
    east?: number
    north?: number
  }
  type Quake = { at: string; magnitude: number; depthKm: number | null; latitude: number; longitude: number; where: string; felt: string }
  type Indexed = ContextNode & { indexed?: number }

  let { nodes }: { nodes: Indexed[] } = $props()
  let map = $state<SiteMap | null>(null)
  let over = $state<string | null>(null)

  // The outlines are this deployment's own file. A node whose catalogue has none of
  // these slugs draws no map at all.
  $effect(() => {
    import('./site-map.json').then((m) => (map = m.default as SiteMap)).catch(() => {})
  })

  // Recent earthquakes from BMKG, drawn where they happened. Shown only when the feed answers.
  let quakes = $state<Quake[]>([])
  $effect(() => {
    const abort = new AbortController()
    request<{ items: Quake[] }>('/v1/ambient/quakes', undefined, abort.signal, true)
      .then((r) => (quakes = r.items ?? []))
      .catch(() => {})
    return () => abort.abort()
  })
  const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
  const point = (q: Quake) => {
    if (!map || map.west === undefined || map.east === undefined || map.north === undefined) return null
    const scale = map.width / (map.east - map.west)
    return { x: (q.longitude - map.west) * scale, y: ((scale * 180) / Math.PI) * (mercator(map.north) - mercator(q.latitude)) }
  }
  const dots = $derived(quakes.flatMap((q) => { const p = point(q); return p && p.y >= 0 && p.y <= (map?.height ?? 0) ? [{ ...q, ...p }] : [] }))
  const day = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const bySlug = $derived(new Map(nodes.map((n) => [n.slug, n])))
  const shapes = $derived((map?.places ?? []).filter((p) => bySlug.has(p.slug)))
  const count = (slug: string) => bySlug.get(slug)?.indexed ?? 0
  const current = $derived(over ? shapes.find((p) => p.slug === over) : undefined)
  const tile = (t: { x: number; y: number }) =>
    `https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/${map!.zoom}/${t.y}/${t.x}.jpg`
</script>

{#if map && shapes.length}
  <figure class="place-map">
    <svg viewBox="0 0 {map.width} {map.height}" role="group" aria-label="Peta kabupaten dan kota">
      <defs>
        <pattern id="pm-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <line x1="0" y1="0" x2="0" y2="7" />
        </pattern>
      </defs>
      <g class="pm-tiles" aria-hidden="true">
        {#each map.tiles as t (t.x + '/' + t.y)}
          <image href={tile(t)} x={t.left} y={t.top} width="256.5" height="256.5" />
        {/each}
      </g>
      {#each shapes as p (p.slug)}
        <a
          href={'/contexts/' + p.slug}
          class:indexed={count(p.slug) > 0}
          aria-label={p.title + (count(p.slug) ? ', ' + count(p.slug) + ' terindeks' : '')}
          onpointerenter={() => (over = p.slug)}
          onpointerleave={() => (over = null)}
          onfocus={() => (over = p.slug)}
          onblur={() => (over = null)}
        >
          <path d={p.d} />
        </a>
      {/each}
      <g class="pm-quakes" aria-hidden="true">
        {#each dots as q (q.at)}<circle cx={q.x} cy={q.y} r={4 + (q.magnitude - 3) * 3.5} />{/each}
      </g>
    </svg>
    <figcaption>
      <p class="pm-now" aria-live="polite">
        {#if current}<strong>{current.title}</strong>
          {count(current.slug) ? count(current.slug) + ' terindeks' : 'Belum ada yang diindeks'}
        {:else}Pilih kabupaten atau kota. Arsiran menandai tempat yang sudah punya halaman, komunitas atau organisasi.{/if}
      </p>
      {#if dots.length}<p class="pm-quake">
          <span class="pm-ring" aria-hidden="true"></span>
          Gempa terakhir di sekitar sini: M{dots[0].magnitude.toLocaleString('id-ID')}, {day(dots[0].at)}, {dots[0].where}{dots[0].depthKm !== null ? ', kedalaman ' + dots[0].depthKm + ' km' : ''}.
          {dots.length > 1 ? dots.length + ' gempa tercatat di peta.' : ''}
          <a href="https://www.bmkg.go.id/gempabumi/gempabumi-terkini" rel="noreferrer" target="_blank">Sumber: BMKG</a>
        </p>{/if}
      <p class="pm-credit">
        Medan: <a href="https://maps.eox.at" rel="noreferrer" target="_blank">Terrain Light</a>, data © OpenStreetMap
        contributors dan lainnya, rendering © EOX. Garis kabupaten: Badan Informasi Geospasial, disederhanakan. Bukan
        batas tanah adat.
      </p>
    </figcaption>
  </figure>
{/if}

<style>
  .place-map { margin: 0 0 8px; padding: 0 24px 12px; border-bottom: 1px solid var(--reading-line); }
  svg { display: block; width: 100%; height: auto; border-radius: 12px; background: var(--muted); }
  .pm-tiles { filter: grayscale(1); }
  :global(.dark) .pm-tiles { filter: grayscale(1) invert(0.9) contrast(0.95) brightness(0.72); }
  path { fill: transparent; stroke: var(--foreground); stroke-opacity: 0.55; stroke-width: 1; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  pattern line { stroke: var(--foreground); stroke-opacity: 0.6; stroke-width: 1.4; }
  .indexed path { fill: url(#pm-hatch); }
  a { cursor: pointer; outline: none; }
  a:hover path, a:focus-visible path { stroke: var(--brand); stroke-opacity: 1; stroke-width: 2; fill: color-mix(in oklab, var(--brand) 22%, transparent); }
  .pm-quakes circle { fill: none; stroke: var(--foreground); stroke-width: 1.5; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; pointer-events: none; }
  .pm-quake { font-size: 13px; line-height: 1.5; color: var(--muted-foreground); }
  .pm-quake a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  .pm-ring { display: inline-block; width: 10px; height: 10px; margin-right: 4px; border: 1.5px dashed var(--foreground); border-radius: 50%; vertical-align: -1px; }
  figcaption { display: grid; gap: 4px; padding-top: 8px; }
  p { margin: 0; }
  .pm-now { min-height: 2.9em; font-size: 14px; color: var(--muted-foreground); }
  .pm-now strong { color: var(--foreground); font-weight: 600; margin-right: 6px; }
  .pm-credit { font-size: 11px; line-height: 1.45; color: var(--muted-foreground); }
  .pm-credit a { color: inherit; text-decoration: underline; }
  @media (max-width: 640px) {
    .place-map { padding-inline: 16px; }
  }
</style>
