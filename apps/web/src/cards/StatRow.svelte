<script lang="ts">
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import Frame from './Frame.svelte'
  import type { CardSource } from './Sources.svelte'
  let { props }: ComponentRenderProps<{ stats: { value: string; label: string }[]; sources: CardSource[] }> = $props()
</script>

<Frame kind="Beberapa angka" sources={props.sources}>
  <dl class="stats">
    {#each props.stats as s, i (i)}
      <div><dd>{s.value}</dd><dt>{s.label}</dt></div>
    {/each}
  </dl>
</Frame>

<style>
  .stats { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 14px 12px; }
  div { display: grid; gap: 2px; align-content: start; min-width: 0; }
  dd { margin: 0; order: 1; font-family: var(--font-editorial, serif); font-size: 30px; font-weight: 500; line-height: 1.1; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  dt { order: 2; font-size: 13.5px; color: var(--muted-foreground); line-height: 1.4; }
</style>
