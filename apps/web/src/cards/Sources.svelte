<script lang="ts" module>
  export type CardSource = { title: string; url?: string; year?: number }
  /** Only web links open; anything else shows as plain text. */
  export const safeUrl = (u: string | undefined) => (u && /^https?:\/\//i.test(u) ? u : undefined)
</script>

<script lang="ts">
  import { ArrowUpRight } from '@lucide/svelte'
  let { sources = [] }: { sources?: CardSource[] } = $props()
</script>

{#if sources.length}
  <div class="card-sources">
    <span class="card-sources-label">{sources.length} sumber</span>
    <ul>
      {#each sources.slice(0, 6) as s, i (i)}<li>
          {#if safeUrl(s.url)}<a href={safeUrl(s.url)} target="_blank" rel="noopener noreferrer nofollow">{s.title}{#if s.year}, {s.year}{/if}<ArrowUpRight size={12} /></a>{:else}{s.title}{#if s.year}, {s.year}{/if}{/if}
        </li>{/each}
    </ul>
  </div>
{/if}

<style>
  .card-sources { display: grid; gap: 4px; padding-top: 10px; border-top: 1px solid var(--border); }
  .card-sources-label { font-size: 12.5px; font-weight: 600; color: var(--muted-foreground); }
  ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
  li { font-size: 13px; line-height: 1.45; color: var(--muted-foreground); }
  a { display: inline-flex; align-items: center; gap: 3px; min-height: 28px; color: var(--foreground); text-decoration: underline; text-decoration-color: var(--border); text-underline-offset: 3px; overflow-wrap: anywhere; }
  a:hover { text-decoration-color: currentColor; }
</style>
