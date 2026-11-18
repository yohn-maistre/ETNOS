<script lang="ts">
  // Jelajah's place section. An atlas of the seven customary regions (reference regions, not customary land
  // boundaries) with every catalogued language as a Glottolog reference point, then the same regions as a list.
  import { onMount } from 'svelte'
  import { ArrowUpRight, Hash } from '@lucide/svelte'
  import { loadMap, type MapData } from './observatory'
  import { request } from './api'
  type Ctx = { id: string; slug: string; title: string; kind: string; facet: string; parents?: string[] }
  type Atlas = {
    box: number[]
    sources: string[]
    regions: Record<string, { d: string; x: number; y: number }>
    contested: { slug: string; regions: string[]; d: string }[]
    langs: [string, number, number, string | null][]
  }
  let map = $state<MapData | null>(null),
    atlas = $state<Atlas | null>(null),
    contexts = $state<Ctx[]>([]),
    over = $state<string | null>(null)
  onMount(() => {
    const abort = new AbortController()
    void loadMap().then((d) => (map = d))
    import('./papua-atlas.json').then((m) => (atlas = m.default as unknown as Atlas)).catch(() => {})
    request<Ctx[]>('/v1/contexts', undefined, abort.signal, true)
      .then((all) => (contexts = all))
      .catch(() => {})
    return () => abort.abort()
  })
  const pages = $derived(map?.nodes.filter((n) => n.k === 'page' && n.href) ?? [])
  const regions = $derived(
    contexts
      .filter((c) => c.facet === 'customary-region')
      .map((c) => {
        const own = pages.filter((p) => p.reg === c.slug)
        const home = own.find((p) => p.kind === 'region' && p.t.startsWith('Wilayah adat')) ?? own.find((p) => p.kind === 'region')
        return {
          slug: c.slug,
          title: c.title.replace(/^Meepago$/, 'Mee Pago'),
          href: home?.href ?? '/contexts/' + c.slug,
          pages: own.length,
          peoples: own.filter((p) => p.kind === 'people').map((p) => p.t.replace(/^Suku /, '')),
          regencies: contexts.filter((x) => x.kind === 'place' && x.parents?.includes(c.id)).length,
          languages: atlas?.langs.filter((l) => l[3] === c.slug).length ?? 0,
        }
      })
      .sort((a, b) => b.pages - a.pages || b.languages - a.languages),
  )
  const current = $derived(over ? regions.find((r) => r.slug === over) : undefined)
  const count = (kind: string, facet: string | null = null) => contexts.filter((c) => c.kind === kind && (facet === null || c.facet === facet)).length
  const topics = $derived(contexts.filter((c) => c.kind === 'topic' && !c.facet))
  const stats = (r: (typeof regions)[number]) =>
    [r.pages ? r.pages + ' halaman wiki' : 'Belum ada halaman wiki', r.languages + ' bahasa', r.regencies + ' kabupaten/kota'].join(' · ')
</script>

{#if regions.length}<section class="discovery-section explore-places" aria-labelledby="explore-places-title">
    <div class="discovery-section-head">
      <h2 id="explore-places-title">Tanah Papua</h2>
      <a href="/contexts">Peta lengkap <ArrowUpRight size={14} /></a>
    </div>
    {#if atlas}<figure class="papua-atlas" class:focused={!!over}>
        <svg viewBox={atlas.box.join(' ')} aria-hidden="true">
          {#each regions as r (r.slug)}{@const shape = atlas.regions[r.slug]}{#if shape}<a
                href={r.href}
                tabindex="-1"
                aria-label={r.title}
                class="atlas-region"
                class:written={r.pages > 0}
                class:on={over === r.slug}
                onpointerenter={() => (over = r.slug)}
                onpointerleave={() => (over = null)}><path d={shape.d} /></a>{/if}{/each}
          <defs>
            <pattern id="atlas-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
              <line x1="0" y1="0" x2="0" y2="9" />
            </pattern>
          </defs>
          <g class="atlas-contested">
            {#each atlas.contested as c (c.slug)}<path d={c.d} class:on={!!over && c.regions.includes(over)} />{/each}
          </g>
          <g class="atlas-langs">
            {#each atlas.langs as l (l[0])}<circle cx={l[1]} cy={l[2]} r="4" class:on={!!over && l[3] === over} />{/each}
          </g>
          <g class="atlas-labels">
            {#each regions as r (r.slug)}{@const shape = atlas.regions[r.slug]}{#if shape}<text x={shape.x} y={shape.y} class:on={over === r.slug}>{r.title}</text>{/if}{/each}
          </g>
        </svg>
        <figcaption>
          <p class="atlas-now">
            {#if current}<strong>{current.title}</strong> {stats(current)}
            {:else}{atlas.langs.length} bahasa di tujuh wilayah adat. Wilayah berwarna sudah punya halaman wiki. Arsiran menandai kabupaten yang ditempatkan di wilayah berbeda oleh sumber berbeda, seperti Nabire dan Mimika.{/if}
          </p>
          <p class="atlas-credit">
            Wilayah acuan dari RPJMN 2020–2024, bukan batas tanah adat. Garis dari Badan Informasi Geospasial, disederhanakan.
            Titik bahasa dari <a href="https://glottolog.org" rel="noreferrer" target="_blank">Glottolog 5.4</a> (CC BY 4.0) adalah titik acuan, bukan batas wilayah bahasa.
          </p>
        </figcaption>
      </figure>{/if}
    <ul class="explore-regions">
      {#each regions as r (r.slug)}<li>
          <a
            class="explore-region"
            class:empty={!r.pages}
            class:on={over === r.slug}
            href={r.href}
            onpointerenter={() => (over = r.slug)}
            onpointerleave={() => (over = null)}
            onfocus={() => (over = r.slug)}
            onblur={() => (over = null)}
          >
            <strong>{r.title}</strong>
            <span>{r.pages ? r.pages + ' halaman wiki' : 'Belum ada halaman wiki'}</span>
            <span>{atlas ? r.languages + ' bahasa · ' : ''}{r.regencies} kabupaten/kota</span>
            {#if r.peoples.length}<small>{r.peoples.join(', ')}</small>{/if}
          </a>
        </li>{/each}
    </ul>
    <p class="explore-place-links">
      <a href="/contexts">{count('region', 'province')} provinsi</a>
      <a href="/contexts">{count('place')} kabupaten dan kota</a>
      <a href="/contexts">{count('language')} bahasa</a>
    </p>
  </section>{/if}
{#if topics.length}<section class="discovery-section" aria-labelledby="explore-topics-title">
    <div class="discovery-section-head">
      <h2 id="explore-topics-title">Topik</h2>
      <a href="/topics">Semua <ArrowUpRight size={14} /></a>
    </div>
    <ul class="explore-topics">
      {#each topics as t (t.id)}<li><a href={'/contexts/' + t.slug}><Hash size={13} aria-hidden="true" />{t.title}</a></li>{/each}
    </ul>
  </section>{/if}

<style>
  .papua-atlas { margin: 0 0 18px; }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  .atlas-region { cursor: pointer; }
  .atlas-region path {
    fill: var(--muted);
    stroke: var(--foreground);
    stroke-opacity: 0.45;
    stroke-width: 1;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
    transition: fill 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .atlas-region.written path { fill: color-mix(in oklab, var(--brand) 26%, var(--background)); }
  .focused .atlas-region:not(.on) path { opacity: 0.55; }
  .atlas-region.on path { fill: color-mix(in oklab, var(--brand) 40%, var(--background)); stroke: var(--brand); stroke-opacity: 1; stroke-width: 1.6; }
  .atlas-contested { pointer-events: none; }
  .atlas-contested path { fill: url(#atlas-hatch); stroke: var(--foreground); stroke-opacity: 0.5; stroke-width: 1; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
  pattern line { stroke: var(--foreground); stroke-opacity: 0.45; stroke-width: 1.6; }
  .focused .atlas-contested path:not(.on) { opacity: 0.4; }
  .atlas-contested path.on { stroke: var(--brand); stroke-opacity: 1; }
  .atlas-langs { pointer-events: none; }
  .atlas-langs circle { fill: var(--foreground); fill-opacity: 0.7; transition: fill-opacity 180ms ease-out; }
  .focused .atlas-langs circle { fill-opacity: 0.18; }
  .focused .atlas-langs circle.on { fill-opacity: 1; }
  .atlas-labels { pointer-events: none; }
  .atlas-labels text {
    font-family: var(--font-editorial);
    font-size: 30px;
    text-anchor: middle;
    fill: var(--foreground);
    paint-order: stroke;
    stroke: var(--background);
    stroke-width: 5px;
    stroke-linejoin: round;
  }
  figcaption { display: grid; gap: 6px; padding-top: 10px; }
  figcaption p { margin: 0; }
  .atlas-now { min-height: 1.5em; font-size: 14px; line-height: 1.5; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .atlas-now strong { color: var(--foreground); font-weight: 600; margin-right: 6px; }
  .atlas-credit { font-size: 11px; line-height: 1.5; color: var(--muted-foreground); max-width: 72ch; }
  .atlas-credit a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
  @media (max-width: 600px) {
    .atlas-labels text { font-size: 40px; stroke-width: 7px; }
    .atlas-langs circle { r: 5; }
  }
  @media (prefers-reduced-motion: reduce) {
    .atlas-region path, .atlas-langs circle { transition: none; }
  }
</style>
