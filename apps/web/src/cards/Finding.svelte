<script lang="ts">
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import Frame from './Frame.svelte'
  import type { CardSource } from './Sources.svelte'
  let { props }: ComponentRenderProps<{ title: string; summary: string; points?: string[]; sources: CardSource[] }> = $props()
</script>

<Frame kind="Temuan" title={props.title} sources={props.sources}>
  <p>{props.summary}</p>
  {#if props.points?.length}<ul class="points">{#each props.points as p, i (i)}<li>{p}</li>{/each}</ul>{/if}
</Frame>

<style>
  p { margin: 0; }
  .points { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
</style>
