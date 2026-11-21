<script lang="ts">
  // Datasets under Riset dan data on an entry page: public datasets about this place, language, topic or thing, grouped by kind
  // (docs/observatory/data-observatory-2026-11-20.md §5.2 and §11). The list is read live, so a record that is
  // withdrawn, or that no longer points to a public thing, drops out at once.
  import DatasetRow from './DatasetRow.svelte'
  import { KIND, listDatasets, type Dataset } from './datasets.ts'

  let { slug, title, thing = '' }: { slug: string; title: string; thing?: string } = $props()
  let rows = $state<Dataset[] | null>(null),
    failed = $state(false)
  $effect(() => {
    const abort = new AbortController()
    rows = null
    failed = false
    listDatasets(thing ? { thing } : { context: slug }, abort.signal)
      .then((r) => { if (!abort.signal.aborted) rows = r })
      .catch(() => { if (!abort.signal.aborted) failed = true })
    return () => abort.abort()
  })
  const groups = $derived.by(() => {
    const out = new Map<string, Dataset[]>()
    for (const d of rows ?? []) out.set(d.kind, [...(out.get(d.kind) ?? []), d])
    return [...out.entries()].sort((a, b) => (KIND[a[0]] ?? a[0]).localeCompare(KIND[b[0]] ?? b[0], 'id'))
  })
</script>

<div class="td">
  {#if rows === null && !failed}<p class="td-note" role="status">Memuat data…</p>
  {:else if failed}<p class="td-note">Data tentang {title} belum dapat dimuat. <a href="/wiki/data">Buka katalog data</a></p>
  {:else if rows?.length}
    <p class="td-lede">Dataset ini memuat keterangan tentang {title}. Berkasnya tetap di situs penerbit, dan semua catatannya masih usulan yang belum ditinjau pengelola.</p>
    {#each groups as [kind, list] (kind)}<section class="td-group" aria-label={KIND[kind] ?? kind}>
        <h2>{KIND[kind] ?? kind} <span>{list.length}</span></h2>
        <div>{#each list as d (d.id)}<DatasetRow dataset={d} kind={false} />{/each}</div>
      </section>{/each}
  {:else}<p class="td-note">Belum ada dataset tentang {title} di katalog. <a href="/wiki/data">Lihat semua dataset</a></p>{/if}
</div>

<style>
  .td { --gutter: 24px; padding: 6px 24px 24px; }
  @media (max-width: 767px) { .td { --gutter: 16px; padding-inline: 16px; } }
  .td-lede { margin: 12px 0 4px; max-width: 62ch; font-size: 14.5px; line-height: 1.5; color: var(--muted-foreground); }
  .td-group { display: grid; padding-top: 18px; }
  .td-group h2 { margin: 0 0 8px; font-size: 15px; font-weight: 650; }
  .td-group h2 span { margin-left: 4px; font-weight: 500; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .td-note { margin: 0; padding: 26px 0 8px; font-size: 14px; color: var(--muted-foreground); }
  .td-note a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
</style>
