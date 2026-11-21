<script lang="ts" module>
  // Languages as a type specimen: names set in the editorial serif, grouped by the region of their Glottolog
  // reference point. A few names per group show first; the rest open in place. Typed props for reuse.
  export type SpecimenGroup = { slug: string; title: string; languages: { slug: string; title: string }[] }
</script>

<script lang="ts">
  // current: the language being read, marked in its group on a language page. credit off when the page credits it.
  let { groups, total, open = false, current = '', credit = true }: { groups: SpecimenGroup[]; total: number; open?: boolean; current?: string; credit?: boolean } = $props()
  const FIRST = 8
  let all = $state(false)
  const showAll = $derived(open || all)
</script>

<div class="specimen">
  {#each groups as g (g.slug)}{@const shown = showAll ? g.languages : g.languages.slice(0, FIRST)}<section class="specimen-group" aria-labelledby={'lang-' + g.slug}>
      <h3 id={'lang-' + g.slug}><a href={'/wiki/' + g.slug}>{g.title}</a> <span>{g.languages.length}</span></h3>
      <ul class="specimen-names">
        {#each shown as l (l.slug)}<li><a href={'/wiki/' + l.slug} class:here={l.slug === current} aria-current={l.slug === current ? 'page' : undefined}>{l.title}</a></li>{/each}
        {#if !showAll && g.languages.length > FIRST}<li class="specimen-more">dan {g.languages.length - FIRST} lagi</li>{/if}
      </ul>
    </section>{/each}
  {#if !open && groups.some((g) => g.languages.length > FIRST)}<button class="specimen-toggle" aria-expanded={all} onclick={() => (all = !all)}>
      {all ? 'Tampilkan lebih sedikit' : 'Semua ' + total + ' bahasa'}
    </button>{/if}
  {#if credit}<p class="specimen-credit">Nama dan titik acuan dari <a href="https://glottolog.org" rel="noreferrer" target="_blank">Glottolog</a> (CC BY 4.0). Pengelompokan per wilayah mengikuti titik acuan, bukan batas wilayah bahasa.</p>{/if}
</div>

<style>
  .specimen { --ink: oklch(0.5 0.13 42); display: grid; gap: 22px; padding: 4px 16px 8px; }
  .specimen-group h3 { margin: 0 0 6px; font-size: 13px; font-weight: 600; color: var(--muted-foreground); display: flex; gap: 8px; align-items: baseline; }
  .specimen-group h3 a { color: inherit; text-decoration: none; }
  .specimen-group h3 a:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .specimen-group h3 span { font-variant-numeric: tabular-nums; font-weight: 400; }
  .specimen-names { list-style: none; margin: 0; padding: 0; max-width: 70ch; display: flex; flex-wrap: wrap; align-items: baseline; row-gap: 2px; font-family: var(--font-editorial, inherit); font-size: clamp(19px, 3.2vw, 23px); line-height: 1.45; color: var(--ink); }
  .specimen-names li { white-space: nowrap; overflow-wrap: normal; word-break: normal; }
  .specimen-names li:not(:last-child):not(.specimen-more)::after { content: '·'; padding: 0 0.42em; color: color-mix(in oklab, var(--ink) 45%, transparent); }
  .specimen-names a { color: inherit; text-decoration: none; padding-block: 4px; }
  .specimen-names a.here { color: var(--foreground); text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 5px; text-decoration-color: var(--ink); }
  .specimen-names a:hover { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
  .specimen-names a:focus-visible, .specimen-group h3 a:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px; }
  .specimen-more { margin-left: 2px; align-self: center; font-family: var(--font-sans, inherit); font-size: 13px; color: var(--muted-foreground); white-space: nowrap; }
  .specimen-toggle {
    justify-self: start;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid color-mix(in oklab, var(--ink) 40%, var(--border));
    border-radius: 999px;
    background: color-mix(in oklab, var(--ink) 6%, var(--background));
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .specimen-toggle:hover { background: color-mix(in oklab, var(--ink) 12%, var(--background)); }
  .specimen-toggle:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  .specimen-credit { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--muted-foreground); max-width: 66ch; }
  .specimen-credit a { color: inherit; text-underline-offset: 3px; }
  @media (min-width: 768px) { .specimen { padding-inline: 24px; } }
  :global(.dark) .specimen { --ink: oklch(0.78 0.11 55); }
</style>
