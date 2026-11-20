<script lang="ts">
  // A light locator map for story and place pages: terrain tiles, a dot and a white label chip per place.
  // One SVG and a few cached JPEG tiles, no map library. The full interactive map stays for the observatory.
  import TerrainTiles from './TerrainTiles.svelte'
  import { TERRAIN_CREDIT, project } from './terrain.ts'

  type Place = { name: string; latitude: number | null; longitude: number | null; href?: string }
  let { places, label = 'Peta lokasi', aspect = 16 / 10 }: { places: Place[]; label?: string; aspect?: number } = $props()
  let width = $state(0)

  const points = $derived(
    places
      .filter((p) => p.latitude !== null && p.longitude !== null && p.longitude! >= 124 && p.longitude! <= 155 && p.latitude! >= -12 && p.latitude! <= 3)
      .map((p) => ({ ...p, at: project(p.latitude!, p.longitude!) })),
  )
  // Fit the points with room around them; never closer than about two degrees across, so a single place
  // still shows its coast and mountains.
  const box = $derived.by((): [number, number, number, number] => {
    const xs = points.map((p) => p.at[0]), ys = points.map((p) => p.at[1])
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2
    let w = Math.max(760, (Math.max(...xs) - Math.min(...xs)) * 1.5 + 260)
    let h = Math.max((Math.max(...ys) - Math.min(...ys)) * 1.5 + 200, w / aspect)
    w = Math.max(w, h * aspect)
    h = w / aspect
    return [cx - w / 2, cy - h / 2, w, h]
  })
  // Sizes below are in CSS pixels, converted to the SVG's units.
  const unit = $derived(width ? box[2] / width : 1)
  // Each label sits below its dot, or above it when that would overlap a label already placed; if both
  // overlap, the label is left out (the place names are also listed above the map).
  const labels = $derived.by(() => {
    const fs = 12.5 * unit, h = fs * 1.75, placed: [number, number, number, number][] = []
    return points.map((p) => {
      const w = p.name.length * fs * 0.58 + 16 * unit, x = p.at[0] - w / 2
      for (const y of [p.at[1] + 9 * unit, p.at[1] - 9 * unit - h]) {
        if (placed.some((b) => x < b[0] + b[2] && b[0] < x + w && y < b[1] + b[3] && b[1] < y + h)) continue
        placed.push([x, y, w, h])
        return { ...p, x, y, w, h, fs }
      }
      return { ...p, x, y: 0, w, h, fs, hidden: true }
    })
  })
</script>

{#if points.length}
  <figure class="locator" bind:clientWidth={width} style:aspect-ratio={aspect}>
    <svg viewBox={box.join(' ')} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label + ': ' + points.map((p) => p.name).join(', ')}>
      {#if width}<TerrainTiles {box} px={width} />{/if}
      {#each labels as l (l.name)}<circle cx={l.at[0]} cy={l.at[1]} r={5 * unit} stroke-width={2 * unit} />{/each}
      {#each labels as l (l.name)}{#if !('hidden' in l)}<g class="pin">
          <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={l.h / 2} />
          <text x={l.at[0]} y={l.y + l.fs * 1.22} font-size={l.fs}>{l.name}</text>
        </g>{/if}{/each}
    </svg>
    <figcaption>{TERRAIN_CREDIT}</figcaption>
  </figure>
{/if}

<style>
  .locator { position: relative; margin: 0; width: 100%; overflow: hidden; border-radius: 16px; background: color-mix(in oklab, var(--foreground) 6%, var(--background)); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  svg { display: block; width: 100%; height: 100%; }
  circle { fill: #1f4e8c; stroke: #ffffff; }
  rect { fill: #ffffff; fill-opacity: 0.94; }
  text { fill: #171717; font-weight: 600; text-anchor: middle; }
  figcaption { position: absolute; right: 8px; bottom: 6px; padding: 1px 6px; border-radius: 6px; background: color-mix(in oklab, var(--background) 78%, transparent); font-size: 10.5px; color: var(--muted-foreground); }
</style>
