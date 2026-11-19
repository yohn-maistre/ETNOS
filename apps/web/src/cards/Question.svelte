<script lang="ts">
  // Answers are not collected yet: a tap only tells the reader to answer in a reply.
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import { Button } from '$lib/components/ui/button/index.js'
  import Frame from './Frame.svelte'
  import type { CardSource } from './Sources.svelte'
  let { props }: ComponentRenderProps<{ question: string; options: string[]; sources?: CardSource[] }> = $props()
  let tapped = $state(false)
</script>

<Frame kind="Pertanyaan" sources={props.sources}>
  <p class="q">{props.question}</p>
  <div class="options">
    {#each props.options as o, i (i)}<Button variant="outline" size="sm" onclick={() => (tapped = true)}>{o}</Button>{/each}
  </div>
  {#if tapped}<p class="hint" role="status">Jawab di balasan</p>{/if}
</Frame>

<style>
  .q { margin: 0; font-family: var(--font-editorial, serif); font-size: 17px; line-height: 1.4; }
  .options { display: flex; flex-wrap: wrap; gap: 8px; }
  .options :global(button) { min-height: 36px; height: auto; white-space: normal; text-align: left; }
  .hint { margin: 0; font-size: 13.5px; color: var(--brand); font-weight: 600; }
</style>
