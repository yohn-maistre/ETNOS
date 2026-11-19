<script lang="ts" module>
  export type MapRegion = { slug: string; title: string; href: string; count?: number }
</script>

<script lang="ts">
  // The seven customary regions as one large map. With counts, each region is shaded by how much it holds (the
  // legend says what is counted), so the shade means something a reader can check. Each region links to its page;
  // the list beside or below the map is the accessible route, so the map itself is hidden from assistive tech.
  import type { Atlas } from './RegionArt.svelte'

  let {
    atlas,
    regions,
    focus = [],
    unit = '',
  }: { atlas: Atlas; regions: MapRegion[]; focus?: string[]; unit?: string } = $props()
  const max = $derived(Math.max(1, ...regions.map((r) => r.count ?? 0)))
  // 12% for none, up to 78% of the ink for the most.
  const shade = (r: MapRegion) => (r.count === undefined ? 24 : r.count ? Math.round(30 + (48 * r.count) / max) : 12)
</script>

<div class="papua-map" aria-hidden="true">
  <svg viewBox={atlas.box.join(' ')} preserveAspectRatio="xMidYMid meet">
    {#each regions as r (r.slug)}{@const shape = atlas.regions[r.slug]}{#if shape}<a href={r.href} tabindex="-1" aria-label={r.title} class:lit={focus.includes(r.slug)} style={'--shade:' + shade(r) + '%'}><path d={shape.d} /></a>{/if}{/each}
    {#each regions as r (r.slug)}{@const shape = atlas.regions[r.slug]}{#if shape}<text x={shape.x} y={shape.y}>{r.title}{#if r.count !== undefined}<tspan x={shape.x} dy="1.6em" class="count">{r.count} {unit}</tspan>{/if}</text>{/if}{/each}
  </svg>
</div>

<style>
  .papua-map { position: relative; border-radius: 16px; overflow: hidden; background: color-mix(in oklab, var(--ink, var(--brand)) 7%, var(--card)); border: 1px solid var(--border); padding: 10px; }
  svg { display: block; width: 100%; height: auto; }
  path {
    fill: color-mix(in oklab, var(--ink, var(--brand)) var(--shade, 24%), var(--card));
    stroke: color-mix(in oklab, var(--ink, var(--brand)) 60%, transparent);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    stroke-linejoin: round;
    transition: fill 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  a:hover path { fill: color-mix(in oklab, var(--ink, var(--brand)) 62%, var(--card)); }
  a.lit path { stroke: var(--foreground); stroke-width: 2; }
  text { font-family: var(--font-editorial, serif); font-size: 34px; text-anchor: middle; fill: var(--foreground); paint-order: stroke; stroke: var(--card); stroke-width: 6px; stroke-linejoin: round; pointer-events: none; }
  .count { font-family: var(--font-sans, sans-serif); font-size: 24px; fill: var(--muted-foreground); }
  /* On a phone the map is about a third of its drawn size; larger labels keep the names readable. */
  @media (max-width: 600px) { text { font-size: 46px; stroke-width: 8px; } .count { font-size: 32px; } }
  @media (prefers-reduced-motion: reduce) { path { transition: none; } }
</style>
