<script lang="ts">
  // One dataset record (docs/observatory/data-observatory-2026-11-20.md §11): what it holds, who publishes it under
  // which licence, its files with size and checksum, the things it is about, how to cite it, and its metadata as
  // schema.org Dataset with the Croissant core. The files stay with the publisher; this page links to them.
  import { ArrowUpRight, Copy, Download, Maximize2 } from '@lucide/svelte'
  import { KIND, bytes, day, languageName, period, readDataset, thingHref, type Dataset } from './datasets.ts'
  import { datasetViewerHref } from './viewer-data.ts'
  import { VIEWER_NAME } from './observatory-name.ts'
  import './styles/observatorium.css'

  let { id }: { id: string } = $props()
  let d = $state<Dataset | null>(null),
    phase = $state<'loading' | 'missing' | 'failed' | 'ready'>('loading'),
    copied = $state(false)

  async function load(target: string, signal?: AbortSignal) {
    phase = 'loading'
    try {
      const row = await readDataset(target, signal)
      if (signal?.aborted) return
      d = row
      phase = 'ready'
    } catch (e) {
      if (signal?.aborted) return
      phase = e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 404 ? 'missing' : 'failed'
    }
  }
  $effect(() => {
    const abort = new AbortController()
    void load(id, abort.signal)
    return () => abort.abort()
  })

  const when = $derived(d ? period(d.temporal) : '')
  const metadataUrl = $derived(d?.jsonld ? URL.createObjectURL(new Blob([JSON.stringify(d.jsonld, null, 2)], { type: 'application/ld+json' })) : '')
  $effect(() => { const u = metadataUrl; return () => { if (u) URL.revokeObjectURL(u) } })
  async function copy() {
    if (!d?.citation) return
    try { await navigator.clipboard.writeText(d.citation); copied = true; setTimeout(() => (copied = false), 2000) } catch { copied = false }
  }
</script>

<div class="obs">
  {#if phase === 'loading'}<div class="obs-section obs-top"><div class="obs-skeleton" aria-hidden="true"></div><p class="sr-only" role="status">Memuat dataset</p></div>
  {:else if phase === 'missing'}<div class="obs-section obs-top">
      <h1>Dataset ini tidak ditemukan</h1>
      <p class="obs-lede">Tautannya mungkin keliru, atau catatannya sudah ditarik dari katalog. <a href="/wiki/data">Buka katalog data</a></p>
    </div>
  {:else if phase === 'failed' || !d}<div class="obs-section obs-top">
      <p class="obs-note">Dataset ini belum dapat dimuat. <button type="button" class="obs-inline" onclick={() => load(id)}>Coba lagi</button></p>
    </div>
  {:else}
    <header class="obs-section obs-top">
      <p class="obs-row-meta">{KIND[d.kind] ?? d.kind} · {d.publisher}</p>
      <h1>{d.title}</h1>
      <p class="ds-desc">{d.description}</p>
      <p class="obs-foot">{d.checkedBySteward ? 'Catatan ini sudah ditinjau pengelola.' : 'Catatan ini masih usulan dan belum ditinjau pengelola.'}{d.checked ? ' Alamat, lisensi dan ukuran berkasnya diperiksa pada ' + day(d.checked) + '.' : ''}</p>
      <div class="ds-actions">
        <a class="ds-primary" href={d.landingPage} target="_blank" rel="noopener noreferrer">Buka di situs penerbit<ArrowUpRight size={15} aria-hidden="true" /></a>
        <a class="obs-toggle" href={datasetViewerHref(d.id)}><Maximize2 size={15} aria-hidden="true" />Buka di {VIEWER_NAME}</a>
        {#if metadataUrl}<a class="obs-toggle" href={metadataUrl} download={d.id + '.jsonld'}><Download size={15} aria-hidden="true" />Unduh metadata</a>{/if}
      </div>
    </header>

    <section class="obs-section" aria-labelledby="ds-facts">
      <h2 id="ds-facts">Keterangan</h2>
      <dl class="obs-facts">
        <div><dt>Penerbit</dt><dd>{#if d.publisherUrl}<a href={d.publisherUrl} target="_blank" rel="noopener noreferrer">{d.publisher}</a>{:else}{d.publisher}{/if}</dd></div>
        <div><dt>Lisensi</dt><dd>{#if d.licenceUrl}<a href={d.licenceUrl} target="_blank" rel="noopener noreferrer">{d.licence}</a>{:else}{d.licence}{/if}</dd></div>
        {#if d.version}<div><dt>Versi</dt><dd>{d.version}</dd></div>{/if}
        {#if d.issued}<div><dt>Terbit</dt><dd>{day(d.issued)}</dd></div>{/if}
        {#if d.modified}<div><dt>Diperbarui</dt><dd>{day(d.modified)}</dd></div>{/if}
        {#if when}<div><dt>Rentang waktu</dt><dd>{when}</dd></div>{/if}
        {#if d.spatial}<div><dt>Wilayah</dt><dd>{d.spatial}</dd></div>{/if}
        {#if d.languages.length}<div><dt>Bahasa keterangan</dt><dd>{d.languages.map(languageName).join(', ')}</dd></div>{/if}
        {#if d.keywords.length}<div><dt>Kata kunci</dt><dd>{d.keywords.join(', ')}</dd></div>{/if}
        <div><dt>Akses</dt><dd>Terbuka untuk semua orang, sesuai lisensinya</dd></div>
      </dl>
    </section>

    <section class="obs-section" aria-labelledby="ds-files">
      <h2 id="ds-files">Berkas</h2>
      <p class="obs-lede">Berkas ini ada di situs penerbit. Ukuran dan checksum membantu memastikan bahwa berkas yang diunduh sama dengan yang dicatat.</p>
      <div class="obs-rows">
        {#each d.distributions as f (f.url)}<a class="obs-row" href={f.url} target="_blank" rel="noopener noreferrer">
            <span class="obs-row-main">
              <span class="obs-row-title">{f.title}</span>
              <span class="obs-row-meta">{[f.format, bytes(f.byteSize)].filter(Boolean).join(' · ')}{f.checksum ? ' · ' + f.checksum.algorithm.toUpperCase() + ' ' + f.checksum.value.slice(0, 12) + '…' : ''}</span>
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>{/each}
      </div>
    </section>

    {#if d.about.length}<section class="obs-section" aria-labelledby="ds-about">
        <h2 id="ds-about">Tentang</h2>
        <p class="obs-lede">Dataset ini memuat keterangan tentang {d.about.length} hal di peta pengetahuan.</p>
        <div class="obs-chips">{#each d.about as t (t.slug)}<a href={thingHref(t)}>{t.title}</a>{/each}</div>
      </section>{/if}

    {#if d.structure.length}<section class="obs-section" aria-labelledby="ds-structure">
        <h2 id="ds-structure">Isi kolom</h2>
        <dl class="obs-facts">{#each d.structure as f (f.name)}<div><dt>{f.name}</dt><dd>{f.description || f.dataType}</dd></div>{/each}</dl>
      </section>{/if}

    {#if d.citation}<section class="obs-section" aria-labelledby="ds-cite">
        <div class="obs-head"><h2 id="ds-cite">Cara mengutip</h2><button type="button" class="obs-more" onclick={copy}><Copy size={15} aria-hidden="true" />{copied ? 'Tersalin' : 'Salin'}</button></div>
        <p class="ds-cite">{d.citation}</p>
      </section>{/if}

    <section class="obs-section" aria-labelledby="ds-meta">
      <h2 id="ds-meta">Metadata</h2>
      <p class="obs-lede">Metadata catatan ini mengikuti schema.org Dataset dan Croissant, sehingga bisa dibaca oleh mesin pencari dataset dan alat analisis data.</p>
      <p class="obs-foot">Alamat catatan untuk mesin adalah <code>/v1/datasets/{d.id}</code>.</p>
    </section>
  {/if}
</div>

<style>
  .ds-desc { margin: 0; max-width: 68ch; font-size: 16px; line-height: 1.55; }
  .ds-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding-top: 4px; }
  .ds-primary { display: inline-flex; align-items: center; gap: 6px; min-height: 42px; padding: 0 16px; border-radius: 10px; background: var(--foreground); color: var(--background); font-size: 14.5px; font-weight: 600; text-decoration: none; }
  .ds-primary:hover { background: color-mix(in oklab, var(--foreground) 88%, var(--background)); }
  .ds-cite { margin: 0; padding: 12px 14px; border-radius: 12px; background: color-mix(in oklab, var(--foreground) 4%, transparent); font-size: 14.5px; line-height: 1.55; overflow-wrap: anywhere; }
  code { font-size: 13px; overflow-wrap: anywhere; }
</style>
