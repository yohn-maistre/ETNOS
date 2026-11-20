<script lang="ts">
  // The data catalogue (Katalog data, docs/observatory/data-observatory-2026-11-20.md §11): every public dataset
  // record, filtered by kind and by a search over title, publisher and keywords. Records hold metadata and links;
  // the files stay with their publishers.
  import { onMount } from 'svelte'
  import { Search } from '@lucide/svelte'
  import DatasetRow from './DatasetRow.svelte'
  import { KIND, listDatasets, type Dataset } from './datasets.ts'
  import './styles/observatorium.css'

  let all = $state<Dataset[] | null>(null),
    failed = $state(false),
    query = $state(''),
    kind = $state('')
  const kinds = $derived([...new Set((all ?? []).map((d) => d.kind))].sort((a, b) => (KIND[a] ?? a).localeCompare(KIND[b] ?? b, 'id')))
  const shown = $derived.by(() => {
    const q = query.trim().toLocaleLowerCase('id')
    return (all ?? []).filter((d) => (!kind || d.kind === kind) && (!q || [d.title, d.publisher, d.description, ...d.keywords, ...d.about.map((t) => t.title)].join(' ').toLocaleLowerCase('id').includes(q)))
  })
  const unchecked = $derived((all ?? []).filter((d) => !d.checkedBySteward).length)

  async function load() {
    failed = false
    try { all = await listDatasets() } catch { failed = true }
  }
  onMount(() => { void load() })
</script>

<div class="obs">
  <header class="obs-section obs-top">
    <h1>Katalog data</h1>
    <p class="obs-lede">Katalog ini mendaftar dataset publik tentang Tanah Papua beserta penerbit, lisensi dan cara mengutipnya, sedangkan berkasnya tetap di situs penerbit.</p>
    <label class="obs-search"><Search size={18} aria-hidden="true" /><input bind:value={query} type="search" aria-label="Cari dataset" placeholder="Cari judul, penerbit atau kata kunci" /></label>
    {#if kinds.length > 1}<div class="obs-chips" role="group" aria-label="Jenis data">
        <button type="button" aria-pressed={!kind} onclick={() => (kind = '')}>Semua</button>
        {#each kinds as k (k)}<button type="button" aria-pressed={kind === k} onclick={() => (kind = kind === k ? '' : k)}>{KIND[k] ?? k}<small>{(all ?? []).filter((d) => d.kind === k).length}</small></button>{/each}
      </div>{/if}
  </header>
  <section class="obs-section" aria-label="Daftar dataset">
    {#if all === null && !failed}<div class="obs-skeleton" aria-hidden="true"></div><p class="sr-only" role="status">Memuat katalog</p>
    {:else if failed}<p class="obs-note">Katalog belum dapat dimuat. <button type="button" class="obs-inline" onclick={load}>Coba lagi</button></p>
    {:else if shown.length}
      <p class="obs-row-meta" role="status">{shown.length === all?.length ? shown.length + ' dataset' : shown.length + ' dari ' + all?.length + ' dataset'}</p>
      <div class="obs-rows">{#each shown as d (d.id)}<DatasetRow dataset={d} kind={!kind} />{/each}</div>
    {:else if all?.length}<p class="obs-note">Tidak ada dataset yang cocok. Coba kata lain atau pilih Semua.</p>
    {:else}<p class="obs-note">Belum ada dataset di katalog.</p>{/if}
    {#if unchecked}<p class="obs-foot">{unchecked === all?.length ? 'Semua catatan' : unchecked + ' catatan'} di katalog ini masih usulan dan belum ditinjau pengelola. Alamat, lisensi dan ukuran berkasnya diperiksa saat catatan dibuat.</p>{/if}
  </section>
</div>

