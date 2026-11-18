<script lang="ts">
  // One tile for Jelajah in three shapes, so sections can differ in rhythm while sharing one card, one type scale
  // and one set of states:
  //   cover  the art fills the tile; title and meta sit in a small rounded strip at the bottom
  //   card   art on top, text below (for the swipeable row)
  //   row    a small square of art beside the text (for lists next to a cover)
  // A tile is a link, or a button when it opens something in place. Colour comes from the kind (tone), taken
  // from the reader's palette of accents.
  import type { Snippet } from 'svelte'
  import { ArrowUpRight, ChevronDown } from '@lucide/svelte'

  let {
    title,
    text = '',
    meta = '',
    href,
    onclick,
    pressed,
    shape = 'card',
    tone = 'place',
    art,
  }: {
    title: string
    text?: string
    meta?: string
    href?: string
    onclick?: () => void
    pressed?: boolean
    shape?: 'cover' | 'card' | 'row'
    tone?: 'place' | 'language' | 'topic' | 'news' | 'room'
    art?: Snippet
  } = $props()
</script>

{#snippet inner()}
  {#if art}<div class="tile-art" aria-hidden="true">{@render art()}</div>{/if}
  <div class="tile-body">
    <h3>{title}</h3>
    {#if text}<p>{text}</p>{/if}
    {#if meta || shape !== 'row'}<span class="tile-meta"
        ><span>{meta}</span>{#if shape !== 'row'}{#if href}<ArrowUpRight size={15} />{:else}<ChevronDown size={15} class="tile-chevron" />{/if}{/if}</span
      >{/if}
  </div>
{/snippet}

{#if href}<a class="tile {shape}" data-tone={tone} {href}>{@render inner()}</a>
{:else}<button type="button" class="tile {shape}" data-tone={tone} aria-expanded={pressed} {onclick}>{@render inner()}</button>{/if}

<style>
  .tile {
    --ink: var(--tone-place, var(--brand));
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--card);
    color: var(--card-foreground, var(--foreground));
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition:
      border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .tile[data-tone='language'] { --ink: var(--tone-language, var(--brand)); }
  .tile[data-tone='topic'] { --ink: var(--tone-topic, var(--brand)); }
  .tile[data-tone='news'] { --ink: var(--tone-news, var(--brand)); }
  .tile[data-tone='room'] { --ink: var(--tone-room, var(--brand)); }
  .tile:hover { border-color: color-mix(in oklab, var(--ink) 55%, var(--border)); }
  .tile:hover h3 { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  .tile:active { transform: scale(0.985); }
  .tile:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  .tile[aria-expanded='true'] { border-color: var(--ink); }
  .tile-art { position: relative; overflow: hidden; background: color-mix(in oklab, var(--ink) 14%, var(--card)); }
  .tile-art :global(img) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .tile-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .tile h3 { margin: 0; font-size: 15px; font-weight: 650; line-height: 1.3; letter-spacing: -0.005em; overflow-wrap: anywhere; text-wrap: balance; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .tile p { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .tile-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .tile-meta :global(svg) { flex: none; color: var(--ink); }
  .tile[aria-expanded='true'] :global(.tile-chevron) { transform: rotate(180deg); }

  /* cover: the art is the tile. */
  .cover { min-height: 200px; border-color: transparent; background: color-mix(in oklab, var(--ink) 14%, var(--card)); }
  .cover .tile-art { position: absolute; inset: 0; background: none; }
  .cover .tile-body {
    position: relative;
    margin: auto 8px 8px;
    padding: 10px 12px 9px;
    border-radius: 11px;
    background: color-mix(in oklab, var(--card) 94%, transparent);
    box-shadow: 0 4px 14px -8px rgb(0 0 0 / 0.45);
  }
  .cover .tile-meta { padding-top: 2px; }

  /* card: art on top, text below. */
  .card .tile-art { height: 92px; border-bottom: 1px solid var(--border); }
  .card .tile-body { flex: 1; padding: 11px 12px 10px; }
  .card .tile-meta { margin-top: auto; padding-top: 6px; }

  /* row: a small square of art beside the text. */
  .row { flex-direction: row; align-items: center; gap: 12px; padding: 8px; border-radius: 14px; }
  .row .tile-art { flex: none; width: 56px; height: 56px; border-radius: 10px; }
  .row h3 { font-size: 14.5px; -webkit-line-clamp: 2; line-clamp: 2; }
  .row p { -webkit-line-clamp: 1; line-clamp: 1; font-size: 13px; }

  @media (prefers-reduced-motion: reduce) { .tile { transition: none; } .tile:active { transform: none; } }
</style>
