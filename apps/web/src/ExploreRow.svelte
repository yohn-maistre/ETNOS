<script lang="ts">
  // One open row of a Jelajah list: title, a small meta line and an optional thumbnail, separated from the next
  // row by a hairline. The same shape as the Kabar list in the Beranda rail. Put rows inside a `ul.open-list`.
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
  .row { border-bottom: 1px solid var(--commons-hairline, var(--border)); }
  a { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; gap: 0 14px; padding: 13px 0; color: inherit; text-decoration: none; }
  a.thumb { grid-template-columns: minmax(0, 1fr) 52px; }
  .copy { display: grid; gap: 3px; min-width: 0; }
  strong { font-size: 15.5px; font-weight: 600; line-height: 1.35; letter-spacing: -0.005em; text-wrap: balance; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .text { font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .meta { font-size: 12.5px; line-height: 1.4; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .art { position: relative; width: 52px; height: 52px; border-radius: 10px; overflow: hidden; background: var(--secondary); }
  .art :global(img) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  a:hover strong { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  a:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; border-radius: 6px; }
</style>
