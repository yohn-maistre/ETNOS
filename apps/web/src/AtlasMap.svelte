<script lang="ts">
  // The seven customary regions as a small map for choosing a place. The list beside it is the accessible route;
  // the map repeats it for pointer users, so it is hidden from assistive technology.
  import { onMount } from 'svelte'
  type Shape = { d: string; x: number; y: number }
  type Atlas = { box: number[]; regions: Record<string, Shape>; contested: { slug: string; regions: string[]; d: string }[] }
  let { regions, selected, onpick }: { regions: { slug: string; title: string }[]; selected: string; onpick: (r: { slug: string; title: string }) => void } = $props()
  let atlas = $state<Atlas | null>(null),
    over = $state<string | null>(null)
  onMount(() => {
    import('./papua-atlas.json').then((m) => (atlas = m.default as unknown as Atlas)).catch(() => {})
  })
</script>

{#if atlas}<svg class="atlas-pick" viewBox={atlas.box.join(' ')} aria-hidden="true">
    {#each regions as r (r.slug)}{@const shape = atlas.regions[r.slug]}{#if shape}<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions --><g
          class="pick-region"
          class:on={selected === r.slug}
          class:hover={over === r.slug}
          onclick={() => onpick(r)}
          onpointerenter={() => (over = r.slug)}
          onpointerleave={() => (over = null)}><path d={shape.d} /></g>{/if}{/each}
    <g class="pick-labels">
      {#each regions as r (r.slug)}{@const shape = atlas.regions[r.slug]}{#if shape}<text x={shape.x} y={shape.y} class:on={selected === r.slug}>{r.title}</text>{/if}{/each}
    </g>
  </svg>{/if}

<style>
  .atlas-pick { display: block; width: 100%; height: auto; overflow: visible; touch-action: manipulation; }
  .pick-region { cursor: pointer; }
  .pick-region path {
    fill: var(--muted);
    stroke: var(--foreground);
    stroke-opacity: 0.4;
    stroke-width: 1;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
    transition: fill 160ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pick-region.hover path { fill: color-mix(in oklab, var(--brand) 22%, var(--background)); }
  .pick-region.on path { fill: color-mix(in oklab, var(--brand) 42%, var(--background)); stroke: var(--brand); stroke-opacity: 1; stroke-width: 1.6; }
  .pick-labels { pointer-events: none; }
  .pick-labels text {
    font-family: var(--font-editorial);
    font-size: 40px;
    text-anchor: middle;
    fill: var(--foreground);
    paint-order: stroke;
    stroke: var(--background);
    stroke-width: 7px;
    stroke-linejoin: round;
  }
  .pick-labels text.on { font-weight: 600; }
  @media (prefers-reduced-motion: reduce) {
    .pick-region path { transition: none; }
  }
</style>
