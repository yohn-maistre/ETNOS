<script lang="ts">
  // One row of a Jelajah list, in the register of the Threads and X explore lists: a heavy title, a quiet meta
  // line, an optional thumbnail on the right, and a hover fill that runs to the edges of the column.
  // Put rows inside a `ul.open-list`.
  import type { Snippet } from 'svelte'
  let { title, meta = '', text = '', href, image = null, art }: { title: string; meta?: string; text?: string; href: string; image?: string | null; art?: Snippet } = $props()
</script>

<li class="row">
  <a {href} class:thumb={!!image || !!art}>
    <span class="copy">
      <strong>{title}</strong>
      {#if text}<span class="text">{text}</span>{/if}
      {#if meta}<span class="meta">{meta}</span>{/if}
    </span>
    {#if image}<span class="art" aria-hidden="true"><img src={image} alt="" loading="lazy" decoding="async" /></span>
    {:else if art}<span class="art" aria-hidden="true">{@render art()}</span>{/if}
  </a>
</li>

<style>
  .row { list-style: none; }
  a { display: grid; grid-template-columns: minmax(0, 1fr); align-items: center; gap: 0 16px; margin: 0 calc(var(--gutter, 16px) * -1); padding: 14px var(--gutter, 16px); color: inherit; text-decoration: none; transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  a.thumb { grid-template-columns: minmax(0, 1fr) 76px; }
  .copy { display: grid; gap: 4px; min-width: 0; }
  strong { font-size: 16px; font-weight: 700; line-height: 1.3; letter-spacing: -0.012em; text-wrap: pretty; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .text { font-size: 14.5px; line-height: 1.4; color: color-mix(in oklab, var(--foreground) 78%, transparent); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .meta { font-size: 13.5px; line-height: 1.35; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .art { position: relative; width: 76px; height: 76px; border-radius: 14px; overflow: hidden; background: var(--secondary); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  .art :global(img) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  a:focus-visible { outline: 2px solid var(--ring, var(--foreground)); outline-offset: -2px; border-radius: 12px; }
  @media (prefers-reduced-motion: reduce) { a { transition: none; } }
</style>
