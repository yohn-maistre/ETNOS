<script lang="ts">
  // A still picture of Peta Kata for cards and previews: the seven wilayah adat as a quiet silhouette and every
  // catalogue language at its Glottolog point. A language with a form for the concept is a filled dot, one without
  // is a faint ring. `labels` names a few languages with their form next to their dot. It is a thumbnail, so it
  // takes no taps: the card around it is the link, and the live map is on Peta Kata.
  import papua from './papua-atlas.json'
  import type { Specimen } from './ensiklopedia-glimpse.ts'

  type Atlas = { regions: Record<string, { d: string }>; langs: [string, number, number, string][] }
  let { forms = null, codeOf = null, labels = [] }: { forms?: Map<string, string> | null; codeOf?: Map<string, string> | null; labels?: Specimen[] } = $props()

  const atlas = papua as unknown as Atlas
  // The island from the region shapes, with a small margin.
  const box = (() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const r of Object.values(atlas.regions)) {
      const n = r.d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
      for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]!); x1 = Math.max(x1, n[i]!); y0 = Math.min(y0, n[i + 1]!); y1 = Math.max(y1, n[i + 1]!) }
    }
    const pad = (x1 - x0) * 0.03
    return [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2] as const
  })()
  const points = $derived(atlas.langs.map(([slug, x, y]) => {
    const code = codeOf?.get(slug) ?? ''
    return { slug, x, y, on: !!(code && forms?.has(code)) }
  }))
  const at = new Map(atlas.langs.map(([slug, x, y]) => [slug, { x, y }]))
  const placed = $derived(labels.flatMap((l) => {
    const p = at.get(l.slug)
    return p ? [{ ...l, left: ((p.x - box[0]) / box[2]) * 100, top: ((p.y - box[1]) / box[3]) * 100 }] : []
  }))
</script>

<div class="pkg" style={`aspect-ratio:${box[2]} / ${box[3]}`}>
  <svg viewBox={box.join(' ')} aria-hidden="true">
    {#each Object.values(atlas.regions) as r, i (i)}<path d={r.d} />{/each}
    {#each points as p (p.slug)}<circle cx={p.x} cy={p.y} r={p.on ? 6.5 : 5} class:on={p.on} />{/each}
    {#each placed as l (l.code)}<circle class="mark" cx={l.left / 100 * box[2] + box[0]} cy={l.top / 100 * box[3] + box[1]} r="10" />{/each}
  </svg>
  {#each placed as l (l.code)}<span class="pkg-label" class:flip={l.left > 72} style={`left:${l.left}%;top:${l.top}%`}><b>{l.form}</b><small>{l.name}</small></span>{/each}
</div>

<style>
  .pkg { position: relative; width: 100%; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  path { fill: color-mix(in oklab, var(--foreground) 6%, transparent); stroke: color-mix(in oklab, var(--foreground) 14%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
  circle { fill: none; stroke: color-mix(in oklab, var(--foreground) 24%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; }
  circle.on { fill: color-mix(in oklab, var(--foreground) 46%, transparent); stroke: none; }
  circle.mark { fill: var(--foreground); stroke: var(--glimpse-ground, var(--background)); stroke-width: 2; }
  .pkg-label { position: absolute; display: grid; transform: translate(10px, -50%); padding: 1px 6px 2px; border-radius: 7px; background: color-mix(in oklab, var(--glimpse-ground, var(--background)) 86%, transparent); line-height: 1.1; white-space: nowrap; pointer-events: none; }
  .pkg-label.flip { transform: translate(calc(-100% - 10px), -50%); text-align: right; }
  .pkg-label b { font-size: 14.5px; font-weight: 750; letter-spacing: -0.01em; color: var(--foreground); }
  .pkg-label small { font-size: 11.5px; font-weight: 500; color: var(--muted-foreground); }
</style>
