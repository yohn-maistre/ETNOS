<script lang="ts">
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import Frame from './Frame.svelte'
  import type { CardSource } from './Sources.svelte'
  let { props }: ComponentRenderProps<{ title: string; events: { year: string; text: string }[]; sources: CardSource[] }> = $props()
</script>

<Frame kind="Garis waktu" title={props.title} sources={props.sources}>
  <ol>{#each props.events.slice(0, 8) as e, i (i)}<li><span>{e.year}</span><p>{e.text}</p></li>{/each}</ol>
</Frame>

<style>
  ol { margin: 0; padding: 0; list-style: none; display: grid; gap: 0; }
  li { display: grid; grid-template-columns: 56px 1fr; gap: 10px; padding: 6px 0; border-top: 1px solid var(--border); }
  li:first-child { border-top: 0; }
  span { font-weight: 600; font-variant-numeric: tabular-nums; }
  p { margin: 0; }
</style>
