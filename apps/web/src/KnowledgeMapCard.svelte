<script lang="ts">
  // The Peta pengetahuan card: every point of the public knowledge graph in its default layout, coloured by its
  // level band as on the map itself, with the count and the lens pills that open /wiki/peta?lens=. Shared by
  // Jelajah's Ensiklopedia section and the /wiki index. It loads graph.json when it is first drawn.
  import { onMount } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import { appearance } from './appearance.svelte'
  import { BANDS } from './world-scale.ts'
  import { LENSES, LENS_LABEL } from './stage-layouts.ts'
  import { MAP_NAME } from './observatory-name.ts'

  type GNode = { id: string; x: number; y: number; world?: { level?: { band: string } | null } }
  type Graph = { counts: { entities: number; statements: number }; nodes: GNode[]; statements: { source: string; target: string }[] }

  let graph = $state<Graph | null>(null)
  onMount(() => {
    const abort = new AbortController()
    fetch('/observatory/knowledge/graph.json', { signal: abort.signal }).then((r) => (r.ok ? r.json() : null)).then((g) => (graph = g)).catch(() => {})
    return () => abort.abort()
  })
  const dark = $derived(appearance.theme === 'dark')
  const band = (key: string) => { const b = BANDS.find((x) => x.key === key); return b ? (dark ? b.dark : b.light) : 'var(--muted-foreground)' }
  const px = (v: number) => 12 + ((v + 1) / 2) * 376, py = (v: number) => 10 + ((v + 1) / 2) * 100
  const at = $derived(new Map((graph?.nodes ?? []).map((n) => [n.id, n])))
</script>

{#if graph}
  <div class="kmc">
    <a class="kmc-main" href="/wiki/peta">
      <svg viewBox="0 0 400 120" aria-hidden="true">
        {#each graph.statements as s, i (i)}{@const a = at.get(s.source)}{@const b = at.get(s.target)}{#if a && b}<line x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)} />{/if}{/each}
        {#each graph.nodes as n (n.id)}<circle cx={px(n.x)} cy={py(n.y)} r="2.6" fill={band(n.world?.level?.band ?? '')} />{/each}
      </svg>
      <span class="kmc-text">
        <strong>{MAP_NAME}</strong>
        <small>{graph.counts.entities} hal dan {graph.counts.statements} hubungan yang bersumber</small>
      </span>
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
    <div class="kmc-lenses" aria-label="Buka peta dengan lensa">
      {#each LENSES as l (l)}<a href={'/wiki/peta?lens=' + l}>{LENS_LABEL[l]}</a>{/each}
    </div>
  </div>
{:else}
  <div class="kmc-hold" aria-hidden="true"></div>
{/if}

<style>
  .kmc { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 18px; min-width: 0; }
  .kmc-main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px 8px; align-items: center; color: inherit; text-decoration: none; border-radius: 12px; }
  .kmc-main svg { grid-column: 1 / -1; width: 100%; height: auto; aspect-ratio: 10 / 3; border-radius: 12px; background: color-mix(in oklab, var(--foreground) 3%, var(--background)); }
  .kmc-main line { stroke: color-mix(in oklab, var(--foreground) 22%, transparent); stroke-width: 0.6; vector-effect: non-scaling-stroke; }
  .kmc-text { display: grid; gap: 2px; padding-left: 4px; }
  .kmc-text strong { font-size: 16.5px; font-weight: 750; letter-spacing: -0.012em; }
  .kmc-text small { font-size: 13.5px; color: var(--muted-foreground); }
  .kmc-main > :global(svg:last-child) { margin-right: 4px; color: var(--muted-foreground); }
  .kmc-main:hover strong { text-decoration: underline; text-underline-offset: 3px; }
  .kmc-main:focus-visible, .kmc-lenses a:focus-visible { outline: 2px solid var(--ring, var(--foreground)); outline-offset: 2px; }
  .kmc-lenses { display: flex; gap: 6px; margin: 0 -12px; padding: 2px 12px; overflow-x: auto; scrollbar-width: none; mask-image: linear-gradient(to right, black calc(100% - 32px), transparent); }
  .kmc-lenses::-webkit-scrollbar { display: none; }
  .kmc-lenses a { flex: none; display: inline-flex; align-items: center; min-height: 34px; padding: 0 13px; border: 1px solid var(--border); border-radius: 999px; color: var(--foreground); font-size: 13.5px; font-weight: 550; text-decoration: none; white-space: nowrap; }
  .kmc-lenses a:last-child { margin-right: 24px; }
  .kmc-lenses a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .kmc-hold { height: 210px; border-radius: 18px; background: color-mix(in oklab, var(--foreground) 4%, transparent); }
</style>
