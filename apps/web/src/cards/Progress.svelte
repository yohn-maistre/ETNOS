<script lang="ts">
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import { Progress } from '$lib/components/ui/progress/index.js'
  import Frame from './Frame.svelte'
  import type { CardSource } from './Sources.svelte'
  import { fmt } from './chart-util'
  let { props }: ComponentRenderProps<{ label: string; value: number; max: number; note?: string; sources?: CardSource[] }> = $props()
  const max = $derived(props.max > 0 ? props.max : 1)
  const value = $derived(Math.min(Math.max(props.value, 0), max))
</script>

<Frame kind="Kemajuan" sources={props.sources}>
  <div class="row"><span class="label">{props.label}</span><strong>{fmt(value)} / {fmt(max)}</strong></div>
  <Progress {value} {max} aria-label={props.label} class="h-2 [&>div]:bg-[var(--brand)]" />
  {#if props.note}<p>{props.note}</p>{/if}
</Frame>

<style>
  .row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .label { min-width: 0; overflow-wrap: anywhere; }
  strong { font-variant-numeric: tabular-nums; white-space: nowrap; }
  p { margin: 0; font-size: 13.5px; color: var(--muted-foreground); }
</style>
