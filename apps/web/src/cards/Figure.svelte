<script lang="ts">
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import Frame from './Frame.svelte'
  import type { CardSource } from './Sources.svelte'
  let { props }: ComponentRenderProps<{ value: string; label: string; date?: string; note?: string; sources: CardSource[] }> = $props()
</script>

<Frame kind="Angka" sources={props.sources}>
  <div class="figure">
    <strong>{props.value}</strong>
    <span>{props.label}{#if props.date}{' · ' + props.date}{/if}</span>
  </div>
  {#if props.note}<p>{props.note}</p>{/if}
</Frame>

<style>
  .figure { display: grid; gap: 2px; }
  strong { font-family: var(--font-editorial, serif); font-size: 40px; font-weight: 500; line-height: 1.1; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
  span { font-size: 13.5px; color: var(--muted-foreground); }
  p { margin: 0; }
</style>
