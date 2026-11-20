<script lang="ts">
  // Terrain image tiles inside an SVG that uses the site map's coordinates. Put it first inside the <svg> so
  // shapes and labels draw on top. `px` is roughly how wide the SVG is drawn, which picks the tile zoom.
  import { tilesFor } from './terrain.ts'
  let { box, px }: { box: [number, number, number, number]; px: number } = $props()
  // Always the terrain layer: the night layer shows almost no land at these sizes. Dark themes dim it instead.
  const tiles = $derived(tilesFor(box, px, 'atlas'))
  // Each tile overlaps its neighbours by 0.4% so scaled edges never show a hairline seam.
</script>

<g class="terrain-tiles" aria-hidden="true">
  {#each tiles as t (t.href)}<image href={t.href} x={t.x} y={t.y} width={t.size * 1.004} height={t.size * 1.004} preserveAspectRatio="none" />{/each}
</g>

<style>
  .terrain-tiles { pointer-events: none; }
  image { image-rendering: auto; }
  :global(.dark) .terrain-tiles { filter: brightness(0.82) saturate(0.9); }
</style>
