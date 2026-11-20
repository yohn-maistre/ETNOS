<script lang="ts" module>
  export type Atlas = { box: number[]; regions: Record<string, { d: string; x: number; y: number }>; contested: { slug: string; regions: string[]; d: string }[] }
</script>

<script lang="ts">
  // A small Papua silhouette with one or more regions lit: the picture on a place tile. Plain SVG paths, no
  // filters, so a row of them stays cheap on an old phone.
  import TerrainTiles from './TerrainTiles.svelte'
  // terrain: draw the land under the regions (a few shared, cached tiles); px is how wide the art is drawn.
  let { atlas, lit = [], terrain = false, px = 168 }: { atlas: Atlas; lit?: string[]; terrain?: boolean; px?: number } = $props()
  // With terrain the tile frames the lit regions: a square around their outline with room for the coast.
  const frame = $derived.by((): [number, number, number, number] => {
    const nums = lit.flatMap((slug) => (atlas.regions[slug]?.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number))
    if (!terrain || nums.length < 4) return atlas.box as [number, number, number, number]
    const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1)
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
    const side = Math.max(320, (x1 - x0) * 1.35, (y1 - y0) * 1.35)
    return [(x0 + x1) / 2 - side / 2, (y0 + y1) / 2 - side / 2, side, side]
  })
</script>

<svg class="region-art" class:terrain viewBox={frame.join(' ')} preserveAspectRatio={terrain ? 'xMidYMid slice' : 'xMidYMid meet'}>
  {#if terrain}<TerrainTiles box={frame} {px} />{/if}
  {#each Object.entries(atlas.regions) as [slug, shape] (slug)}<path d={shape.d} class:lit={lit.includes(slug)} />{/each}
</svg>

<style>
  .region-art { position: absolute; inset: 8px 10px; width: calc(100% - 20px); height: calc(100% - 16px); }
  path { fill: color-mix(in oklab, var(--foreground) 10%, transparent); stroke: color-mix(in oklab, var(--foreground) 22%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
  path.lit { fill: var(--ink, var(--brand)); stroke: var(--ink, var(--brand)); }
  .terrain { inset: 0; width: 100%; height: 100%; }
  .terrain path { fill: transparent; stroke: rgb(23 23 23 / 0.28); }
  .terrain path.lit { fill: var(--brand); fill-opacity: 0.38; stroke: var(--brand); stroke-width: 2; }
  
</style>
