<script lang="ts">
  // One tile for everything on Jelajah: news, conversations, places, languages, topics and communities share the
  // same card, type and states, so a newcomer learns one shape. What changes is the art at the top: a photo, a
  // small map, a crop of names or an engraving. A tile is a link, or a button when it opens something in place.
  import type { Snippet } from 'svelte'
  import { ArrowUpRight, ChevronDown } from '@lucide/svelte'

  let {
    title,
    text = '',
    meta = '',
    href,
    onclick,
    pressed,
    wide = false,
    tone = 'place',
    bare = false,
    art,
  }: {
    title: string
    text?: string
    meta?: string
    href?: string
    onclick?: () => void
    pressed?: boolean
    wide?: boolean
    tone?: 'place' | 'language' | 'topic' | 'news' | 'room'
    /** No art: for a tile whose only picture would repeat what the text says. */
    bare?: boolean
    art?: Snippet
  } = $props()
</script>

{#snippet inner()}
  {#if art && !bare}<div class="tile-art" aria-hidden="true">{@render art()}</div>{/if}
  <div class="tile-body">
    <h3>{title}</h3>
    {#if text}<p>{text}</p>{/if}
    <span class="tile-meta"
      ><span>{meta}</span>{#if href}<ArrowUpRight size={16} />{:else}<ChevronDown size={16} class="tile-chevron" />{/if}</span
    >
  </div>
{/snippet}

{#if href}<a class="tile" class:wide data-tone={tone} {href}>{@render inner()}</a>
{:else}<button type="button" class="tile" class:wide data-tone={tone} aria-expanded={pressed} {onclick}>{@render inner()}</button>{/if}

<style>
  .tile {
    --ink: var(--brand);
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--card);
    color: var(--card-foreground, var(--foreground));
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition:
      border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .tile[data-tone='language'] { --ink: oklch(0.5 0.13 42); }
  .tile[data-tone='topic'] { --ink: oklch(0.47 0.09 158); }
  :global(.dark) .tile[data-tone='language'] { --ink: oklch(0.78 0.11 55); }
  :global(.dark) .tile[data-tone='topic'] { --ink: oklch(0.74 0.1 158); }
  .tile:hover { border-color: color-mix(in oklab, var(--foreground) 28%, var(--border)); box-shadow: 0 6px 18px -10px rgb(0 0 0 / 0.35); }
  .tile:hover h3 { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  .tile:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  .tile[aria-expanded='true'] { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
  .tile-art {
    position: relative;
    height: 96px;
    overflow: hidden;
    background: color-mix(in oklab, var(--ink) 9%, var(--card));
    border-bottom: 1px solid var(--border);
  }
  .wide .tile-art { height: 168px; }
  .tile-art :global(img) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .tile-body { display: flex; flex: 1; flex-direction: column; gap: 4px; padding: 12px 12px 10px; }
  .tile h3 { margin: 0; font-size: 15px; font-weight: 650; line-height: 1.3; letter-spacing: -0.005em; overflow-wrap: anywhere; text-wrap: balance; }
  .wide h3 { font-size: 19px; }
  .tile p { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .tile-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 6px; font-size: 12.5px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .tile-meta :global(svg) { flex: none; }
  .tile[aria-expanded='true'] :global(.tile-chevron) { transform: rotate(180deg); }
  @media (min-width: 768px) {
    .tile-art { height: 120px; }
    .wide .tile-art { height: 200px; }
    .tile-body { padding: 14px 16px 12px; }
    .wide h3 { font-size: 22px; }
  }
  @media (prefers-reduced-motion: reduce) { .tile { transition: none; } }
</style>
