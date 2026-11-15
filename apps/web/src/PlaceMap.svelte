<script lang="ts">
  import type { ContextNode } from './context-tree'

  type Shape = { slug: string; title: string; d: string; x: number; y: number }
  type SiteMap = {
    zoom: number
    width: number
    height: number
    tiles: { x: number; y: number; left: number; top: number }[]
    places: Shape[]
  }
  type Indexed = ContextNode & { indexed?: number }

  let { nodes }: { nodes: Indexed[] } = $props()
  let map = $state<SiteMap | null>(null)
  let over = $state<string | null>(null)

  // The outlines are this deployment's own file. A node whose catalogue has none of
  // these slugs draws no map at all.
  $effect(() => {
    import('./site-map.json').then((m) => (map = m.default as SiteMap)).catch(() => {})
  })

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
    </svg>
    <figcaption>
      <p class="pm-now" aria-live="polite">
        {#if current}<strong>{current.title}</strong>
          {count(current.slug) ? count(current.slug) + ' terindeks' : 'Belum ada yang diindeks'}
        {:else}Pilih kabupaten atau kota. Arsiran menandai tempat yang sudah punya halaman, komunitas atau organisasi.{/if}
      </p>
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
