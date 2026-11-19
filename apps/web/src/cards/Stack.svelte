<script lang="ts">
  // Holds up to three cards, one under another. Each child renders through OpenUI's renderNode.
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  let { props, renderNode }: ComponentRenderProps<{ children: unknown[] }> = $props()
</script>

<div class="stack">
  {#each props.children as child, i (i)}{@render renderNode(child)}{/each}
</div>

<style>
  .stack { display: grid; gap: 4px; }
</style>
