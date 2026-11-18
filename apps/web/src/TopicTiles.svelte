<script lang="ts" module>
  // Topics as tiles that branch: each starter topic with its first sub-topics underneath. Typed props for reuse.
  export type TopicTile = { slug: string; title: string; children: { slug: string; title: string }[] }
</script>

<script lang="ts">
  // limit: branches shown per tile before "dan N lagi". current: the topic being read, marked where it appears.
  // dense: tiles with names only sit two or more to a row, even on a phone.
  let { tiles, limit = 3, current = '', dense = false }: { tiles: TopicTile[]; limit?: number; current?: string; dense?: boolean } = $props()
</script>

<ul class="topic-tiles" class:dense>
  {#each tiles as t (t.slug)}<li class="topic-tile">
      <a class="topic-name" href={'/contexts/' + t.slug} aria-current={t.slug === current ? 'page' : undefined}>{t.title}</a>
      {#if t.children.length}<ul class="topic-branches" aria-label={'Bagian dari ' + t.title}>
          {#each t.children.slice(0, limit) as c (c.slug)}<li><a href={'/contexts/' + c.slug} class:here={c.slug === current} aria-current={c.slug === current ? 'page' : undefined}>{c.title}</a></li>{/each}
          {#if t.children.length > limit}<li class="topic-rest">dan {t.children.length - limit} lagi</li>{/if}
        </ul>{/if}
    </li>{/each}
</ul>

<style>
  .topic-tiles {
    --ink: oklch(0.47 0.09 158);
    list-style: none;
    margin: 0;
    padding: 4px 16px 8px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
    gap: 1px;
  }
  .topic-tiles.dense { grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); }
  .dense .topic-tile { padding: 12px 12px 13px; }
  .dense .topic-name { font-size: 17px; }
  .topic-name[aria-current='page'] { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; text-decoration-color: var(--ink); }
  /* Each tile draws its own hairline into the 1px gap, so a short last row leaves no coloured hole. */
  .topic-tile { display: grid; align-content: start; gap: 6px; padding: 14px 14px 16px; background: color-mix(in oklab, var(--ink) 5%, var(--background)); box-shadow: 0 0 0 1px color-mix(in oklab, var(--ink) 22%, transparent); }
  .topic-tile:hover { background: color-mix(in oklab, var(--ink) 10%, var(--background)); }
  .topic-name { font-family: var(--font-editorial, inherit); font-size: 20px; line-height: 1.2; color: var(--foreground); text-decoration: none; min-height: 24px; }
  .topic-name:hover { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
  .topic-branches { list-style: none; margin: 0; padding: 0 0 0 12px; display: grid; gap: 2px; border-left: 1px solid color-mix(in oklab, var(--ink) 40%, transparent); }
  .topic-branches a { display: inline-block; padding-block: 3px; font-size: 13.5px; color: color-mix(in oklab, var(--ink) 70%, var(--foreground)); text-decoration: none; }
  .topic-branches a.here { color: var(--foreground); font-weight: 650; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; text-decoration-color: var(--ink); }
  .topic-branches a:hover { text-decoration: underline; text-underline-offset: 3px; }
  .topic-rest { font-size: 12.5px; color: var(--muted-foreground); padding-top: 2px; }
  .topic-tiles a:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px; }
  @media (min-width: 768px) { .topic-tiles { padding-inline: 24px; } }
  :global(.dark) .topic-tiles { --ink: oklch(0.74 0.1 158); }
</style>
