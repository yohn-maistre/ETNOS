<script lang="ts" module>
  // Places as a cross-section of strata: one engraved layer per customary region, coast at the top and the
  // southern lowlands at the bottom, with its kabupaten resting inside the layer. Typed props so the same block
  // can sit on Jelajah and, later, at the top of a place page or in a composed view.
  export type Stratum = {
    slug: string
    title: string
    href: string
    places: { slug: string; title: string }[]
    languages: number
    pages: number
  }
</script>

<script lang="ts">
  let { strata, focus = '' }: { strata: Stratum[]; focus?: string } = $props()
  // A gentle ridge line per layer, each with its own phase so the layers read as rock, not stripes.
  function ridge(i: number) {
    const amp = 5 + (i % 3) * 2,
      phase = i * 1.7,
      pts: string[] = []
    for (let x = 0; x <= 400; x += 20) pts.push(`${x},${(14 + Math.sin(x / 46 + phase) * amp + Math.sin(x / 17 + phase * 2) * 1.6).toFixed(1)}`)
    return { fill: `M0,28 L${pts.join(' L')} L400,28 Z`, line: `M${pts.join(' L')}` }
  }
</script>

<ol class="strata" class:focused={!!focus}>
  {#each strata as s, i (s.slug)}{@const r = ridge(i)}<li class="stratum" class:on={focus === s.slug} style={`--depth:${i}`}>
      <svg class="stratum-ridge" viewBox="0 0 400 28" preserveAspectRatio="none" aria-hidden="true"><path class="ridge-fill" d={r.fill} /><path class="ridge-line" d={r.line} /></svg>
      <div class="stratum-body">
        <a class="stratum-name" href={s.href}>{s.title}</a>
        <p class="stratum-meta">
          {s.places.length} kabupaten dan kota · {s.languages} bahasa{#if s.pages} · {s.pages} halaman wiki{/if}
        </p>
        {#if s.places.length}<ul class="stratum-places" aria-label={'Kabupaten dan kota di ' + s.title}>
            {#each s.places as p (p.slug)}<li><a href={'/contexts/' + p.slug}>{p.title}</a></li>{/each}
          </ul>{/if}
      </div>
    </li>{/each}
</ol>

<style>
  .strata { list-style: none; margin: 0; padding: 0; display: grid; }
  .stratum {
    --layer: color-mix(in oklab, var(--brand) calc(7% + var(--depth) * 3.2%), var(--background));
    --hatch: color-mix(in oklab, var(--brand) 16%, transparent);
    position: relative;
    margin-top: -16px;
    color: var(--foreground);
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .stratum:first-child { margin-top: 0; }
  .stratum-ridge { display: block; width: 100%; height: 22px; }
  .stratum-ridge .ridge-fill { fill: var(--layer); }
  .stratum-ridge .ridge-line { fill: none; stroke: color-mix(in oklab, var(--brand) 55%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .stratum-body {
    margin-top: -1px;
    padding: 2px 16px 26px;
    background:
      repeating-linear-gradient(-38deg, transparent 0 9px, var(--hatch) 9px 10px) right / 34% 100% no-repeat,
      var(--layer);
  }
  .stratum-name {
    display: inline-block;
    font-family: var(--font-editorial, inherit);
    font-size: clamp(24px, 4.4vw, 30px);
    line-height: 1.15;
    letter-spacing: -0.01em;
    color: var(--foreground);
    text-decoration: none;
    min-height: 44px;
    padding-top: 6px;
  }
  .stratum-name:hover { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 5px; }
  .stratum-meta { margin: 0 0 10px; font-size: 13px; color: color-mix(in oklab, var(--brand) 40%, var(--foreground)); font-variant-numeric: tabular-nums; }
  .stratum-places { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; max-width: 66ch; }
  .stratum-places a {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 11px;
    border-radius: 999px;
    font-size: 13.5px;
    color: var(--foreground);
    text-decoration: none;
    background: color-mix(in oklab, var(--background) 72%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--brand) 26%, transparent);
  }
  .stratum-places a:hover { background: var(--background); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--brand) 60%, transparent); }
  .stratum a:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; border-radius: 6px; }
  .strata.focused .stratum:not(.on) { opacity: 0.5; }
  .strata.focused .stratum:not(.on):hover, .strata.focused .stratum:not(.on):focus-within { opacity: 1; }
  @media (min-width: 768px) { .stratum-body { padding: 4px 24px 22px; } }
  @media (prefers-reduced-motion: reduce) { .stratum { transition: none; } }
</style>
