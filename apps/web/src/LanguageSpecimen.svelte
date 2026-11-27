<script lang="ts" module>
  // Languages grouped by the region of their Glottolog reference point, as Grafit pills (DESIGN.md: no serif
  // word specimens). A few names per group show first; the rest open in place. Typed props for reuse.
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
  .specimen { display: grid; gap: 20px; padding: 4px 16px 8px; }
  .specimen-group h3 { margin: 0 0 8px; font-size: 13.5px; font-weight: 600; color: var(--muted-foreground); display: flex; gap: 8px; align-items: baseline; }
  .specimen-group h3 a { display: inline-flex; align-items: center; min-height: 32px; color: inherit; text-decoration: none; }
  .specimen-group h3 a:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .specimen-group h3 span { font-variant-numeric: tabular-nums; font-weight: 400; }
  .specimen-names { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .specimen-names a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; color: var(--foreground); font-size: 14px; font-weight: 550; text-decoration: none; white-space: nowrap; }
  .specimen-names a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .specimen-names a.here { background: var(--foreground); border-color: var(--foreground); color: var(--background); }
  .specimen-names a:focus-visible, .specimen-group h3 a:focus-visible, .specimen-toggle:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .specimen-more { padding: 0 4px; font-size: 13.5px; color: var(--muted-foreground); white-space: nowrap; }
  .specimen-toggle { justify-self: start; min-height: 44px; padding: 0 16px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .specimen-toggle:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .specimen-credit { margin: 0; font-size: 13px; line-height: 1.5; color: var(--muted-foreground); max-width: 66ch; }
  .specimen-credit a { color: inherit; text-underline-offset: 3px; }
  @media (min-width: 768px) { .specimen { padding-inline: 24px; } }
</style>
