<script lang="ts" module>
  export type Atlas = { box: number[]; regions: Record<string, { d: string; x: number; y: number }>; contested: { slug: string; regions: string[]; d: string }[] }
</script>

<script lang="ts">
  // A small Papua silhouette with one or more regions lit: the picture on a place tile. Plain SVG paths, no
  // filters, so a row of them stays cheap on an old phone.
  let { atlas, lit = [] }: { atlas: Atlas; lit?: string[] } = $props()
</script>

<svg class="region-art" viewBox={atlas.box.join(' ')} preserveAspectRatio="xMidYMid meet">
  {#each Object.entries(atlas.regions) as [slug, shape] (slug)}<path d={shape.d} class:lit={lit.includes(slug)} />{/each}
</svg>

<style>
  .region-art { position: absolute; inset: 8px 10px; width: calc(100% - 20px); height: calc(100% - 16px); }
  path { fill: color-mix(in oklab, var(--foreground) 10%, transparent); stroke: color-mix(in oklab, var(--foreground) 22%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
  path.lit { fill: var(--ink, var(--brand)); stroke: var(--ink, var(--brand)); }
</style>
