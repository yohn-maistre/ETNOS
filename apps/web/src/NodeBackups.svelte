<script lang="ts">
  // Studio, Pengaturan: backups of the whole node (src/node-backup.ts). Operator only; the files hold private data,
  // so they are downloaded straight from the node and never get a public address.
  import { Download, DatabaseBackup, CircleAlert } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { request, relativeDate } from './api'
  import { notify } from './notifications.svelte'

  type Item = { id: string; size: number; created: number; rows: number }
  type Info = { configured: boolean; keepDays: number; last: Item | null; error: string | null; backups: Item[] }
  let info = $state<Info | null>(null),
    busy = $state(false),
    failed = $state(false)

  const size = (n: number) => (n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB')
  const when = (t: number) => new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  async function load() {
    failed = false
    try {
      info = await request<Info>('/v1/ops/backups', undefined, undefined, true)
    } catch {
      failed = true
    }
  }
  $effect(() => {
    void load()
  })
  async function backupNow() {
    if (busy) return
    busy = true
    try {
      await request('/v1/ops/backups', {})
      notify('Cadangan dibuat.')
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Cadangan belum berhasil dibuat.')
    } finally {
      busy = false
    }
  }
</script>

<section class="nb" aria-labelledby="nb-title">
  <h2 id="nb-title">Cadangan node</h2>
  {#if failed}
    <p class="cx-hint">Keadaan cadangan belum dapat dimuat.</p>
    <Button variant="outline" onclick={load}>Coba lagi</Button>
  {:else if info}
    <p class="cx-hint">
      {info.configured
        ? 'Seluruh isi node disalin setiap hari ke penyimpanan privat dan disimpan ' + info.keepDays + ' hari. Cadangan memuat data privat, jadi hanya pengelola yang dapat mengunduhnya.'
        : 'Penyimpanan cadangan harian belum dipasang di Worker ini. Kamu tetap dapat mengunduh salinan sekarang.'}
    </p>
    {#if info.last}
      <p class="nb-last"><DatabaseBackup size={17} />Cadangan terakhir {when(info.last.created)} ({relativeDate(info.last.created)}), {size(info.last.size)}</p>
    {:else if info.configured}
      <p class="nb-last"><DatabaseBackup size={17} />Belum ada cadangan.</p>
    {/if}
    {#if info.error}<p class="nb-error" role="alert"><CircleAlert size={16} />{info.error}</p>{/if}
    <div class="nb-actions">
      {#if info.configured}<Button onclick={backupNow} disabled={busy}><DatabaseBackup size={16} />{busy ? 'Membuat cadangan…' : 'Buat cadangan sekarang'}</Button>{/if}
      <Button variant="outline" href="/v1/ops/backups/download?id=now" download><Download size={16} />Unduh salinan sekarang</Button>
    </div>
    {#if info.backups.length}
      <ul class="nb-list">
        {#each info.backups as b (b.id)}
          <li><span>{when(b.created)}</span><span class="nb-size">{size(b.size)}</span><a href={'/v1/ops/backups/download?id=' + b.id} download><Download size={15} />Unduh</a></li>
        {/each}
      </ul>
    {/if}
    <p class="cx-hint">Pemulihan hanya untuk node yang masih kosong, misalnya setelah pindah ke akun Cloudflare baru. Langkahnya ada di panduan pindah akun.</p>
  {/if}
</section>

<style>
  .nb { padding: 20px var(--studio-gutter, 24px) 8px; display: grid; gap: 12px; max-width: 880px; }
  .nb h2 { font-size: 1.05rem; font-weight: 650; margin: 0; }
  .nb p { margin: 0; }
  .nb-last, .nb-error { display: flex; align-items: center; gap: 8px; font-size: 14.5px; }
  .nb-error { color: var(--destructive); }
  .nb-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .nb-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .nb-list li { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14.5px; }
  .nb-list li span:first-child { flex: 1; }
  .nb-size { color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .nb-list a { display: inline-flex; align-items: center; gap: 6px; color: var(--foreground); }
  @media (max-width: 767px) { .nb { padding-inline: 16px; } }
</style>
