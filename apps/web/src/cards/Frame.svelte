<script lang="ts">
  // The one frame every card shares: a kind label, a title, the body, and the sources at the foot.
  import type { Snippet } from 'svelte'
  import * as Card from '$lib/components/ui/card/index.js'
  import Sources, { type CardSource } from './Sources.svelte'
  let { kind, title, sources = [], children }: { kind: string; title?: string; sources?: CardSource[]; children: Snippet } = $props()
</script>

<Card.Root class="etnos-card" size="sm">
  <Card.Header>
    <span class="card-kind">{kind}</span>
    {#if title}<Card.Title class="card-title">{title}</Card.Title>{/if}
  </Card.Header>
  <Card.Content class="card-body">
    {@render children()}
    <Sources {sources} />
  </Card.Content>
</Card.Root>

<style>
  :global(.etnos-card) { margin: 12px 0 4px; border-radius: 14px; border: 1px solid var(--border); box-shadow: none; --tw-ring-shadow: 0 0 #0000; }
  .card-kind { font-size: 12.5px; font-weight: 600; color: var(--brand); }
  :global(.etnos-card .card-title) { font-family: var(--font-editorial, serif); font-size: 19px; font-weight: 500; line-height: 1.3; }
  :global(.etnos-card .card-body) { display: grid; gap: 10px; font-size: 14.5px; line-height: 1.55; }
</style>
