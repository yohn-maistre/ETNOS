<script lang="ts">
  // One dataset in a list: its title, who publishes it, its licence and period, and the start of its description.
  import { ArrowUpRight } from '@lucide/svelte'
  import { KIND, period, type Dataset } from './datasets.ts'
  let { dataset, kind = true }: { dataset: Dataset; kind?: boolean } = $props()
  const when = $derived(period(dataset.temporal))
</script>

<a class="ds-row" href={'/wiki/data/' + dataset.id}>
  <span class="ds-main">
    <strong>{dataset.title}</strong>
    <span class="ds-desc">{dataset.description}</span>
    <span class="ds-meta">{kind ? (KIND[dataset.kind] ?? dataset.kind) + ' · ' : ''}{dataset.publisher} · {dataset.licence}{when ? ' · ' + when : ''}</span>
  </span>
  <ArrowUpRight size={16} aria-hidden="true" />
</a>

<style>
  .ds-row { display: flex; align-items: flex-start; gap: 12px; margin: 0 calc(var(--gutter, 24px) * -1); padding: 14px var(--gutter, 24px); color: inherit; text-decoration: none; border-top: 1px solid var(--border); }
  .ds-row:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ds-row:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: -2px; }
  .ds-row :global(svg) { flex: none; margin-top: 3px; color: var(--muted-foreground); }
  .ds-main { display: grid; gap: 3px; min-width: 0; flex: 1; }
  strong { font-size: 16px; font-weight: 700; line-height: 1.3; letter-spacing: -0.012em; }
  .ds-desc { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 14.5px; line-height: 1.4; color: color-mix(in oklab, var(--foreground) 78%, transparent); }
  .ds-meta { font-size: 13.5px; line-height: 1.35; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
</style>
