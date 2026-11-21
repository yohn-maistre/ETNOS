<script lang="ts">
  // A dataset: the first rows of its table when a preview has been saved, then its licence and the files to download
  // from the publisher. ETNOS keeps only the record and the preview; the files stay on the publisher's site.
  import { onMount } from 'svelte'
  import { ArrowUpRight, Download } from '@lucide/svelte'
  import { bytes, readDataset, type Dataset } from '../datasets.ts'
  import type { Preview, ViewerObject } from '../viewer-data.ts'

  let { object }: { object: ViewerObject } = $props()
  let d = $state<Dataset | null>(null), preview = $state<Preview | null>(null), phase = $state<'loading' | 'ready' | 'failed'>('loading')
  onMount(() => {
    const abort = new AbortController(), spec = object.dataset!
    void Promise.all([
      readDataset(spec.id, abort.signal).catch(() => null),
      spec.preview ? fetch(spec.preview, { signal: abort.signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
    ]).then(([row, p]) => { if (abort.signal.aborted) return; d = row; preview = p; phase = row || p ? 'ready' : 'failed' })
    return () => abort.abort()
  })
</script>

<div class="db">
  {#if phase === 'loading'}<p class="db-note" role="status">Memuat dataset</p>
  {:else if phase === 'failed'}<p class="db-note">Dataset ini belum dapat dimuat.</p>
  {:else}
    {#if preview}<div class="db-table" role="region" aria-label="Pratinjau tabel" tabindex="-1">
        <table>
          <caption>{preview.rows.length} baris pertama dari {preview.total.toLocaleString('id-ID')} baris, disalin dari {preview.source} pada {preview.checked}</caption>
          <thead><tr>{#each preview.columns as c (c.key)}<th scope="col">{c.label}</th>{/each}</tr></thead>
          <tbody>{#each preview.rows as r, i (i)}<tr>{#each preview.columns as c (c.key)}<td>{r[c.key] ?? '–'}</td>{/each}</tr>{/each}</tbody>
        </table>
      </div>
    {:else}<p class="db-note">Pratinjau tabel belum tersedia untuk dataset ini. Berkasnya bisa diunduh dari penerbit.</p>{/if}
    {#if d}<div class="db-files">
        <p class="db-lic">Lisensi {#if d.licenceUrl}<a href={d.licenceUrl} target="_blank" rel="noopener noreferrer">{d.licence}</a>{:else}{d.licence}{/if} · {d.publisher}</p>
        <div class="db-links">
          {#each d.distributions.slice(0, 3) as f (f.url)}<a href={f.url} target="_blank" rel="noopener noreferrer"><Download size={15} aria-hidden="true" />{f.title}{f.byteSize ? ' · ' + bytes(f.byteSize) : ''}</a>{/each}
          <a href={d.landingPage} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={15} aria-hidden="true" />Situs penerbit</a>
        </div>
      </div>{/if}
  {/if}
</div>

<style>
  .db { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 320px; background: var(--background); }
  .db-note { margin: auto; padding: 24px; font-size: 14.5px; color: var(--muted-foreground); text-align: center; }
  .db-table { flex: 1; min-height: 0; overflow: auto; }
  table { width: max-content; min-width: 100%; border-collapse: collapse; font-size: 13.5px; font-variant-numeric: tabular-nums; }
  caption { caption-side: bottom; padding: 10px 14px; text-align: left; font-size: 13px; color: var(--muted-foreground); }
  th { position: sticky; top: 0; z-index: 1; padding: 10px 14px; background: color-mix(in oklab, var(--foreground) 5%, var(--background)); border-bottom: 1px solid var(--border); text-align: left; font-weight: 650; white-space: nowrap; }
  td { padding: 8px 14px; border-bottom: 1px solid var(--border); white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis; }
  tbody tr:hover td { background: color-mix(in oklab, var(--foreground) 3%, transparent); }
  .db-files { display: grid; gap: 10px; padding: 12px 14px 14px; border-top: 1px solid var(--border); }
  .db-lic { margin: 0; font-size: 13.5px; color: var(--muted-foreground); }
  .db-lic a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  .db-links { display: flex; flex-wrap: wrap; gap: 8px; }
  .db-links a { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; color: var(--foreground); font-size: 14px; font-weight: 550; text-decoration: none; }
  .db-links a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  a:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
</style>
