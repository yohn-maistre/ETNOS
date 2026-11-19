<script lang="ts">
  // Loads the knowledge seed (places, peoples, languages and checked public excerpts) into this node once.
  // Only a node steward can load it; loading twice adds nothing, because existing entries are skipped.
  import { onMount } from 'svelte'
  import { request } from './api'

  type Summary = { entities: number; assertions: number; excerpts: number }
  let summary = $state<Summary | null>(null),
    busy = $state(false),
    note = $state(''),
    error = $state('')

  async function load() { try { summary = await request<Summary>('/v1/knowledge-model', undefined, undefined, true) } catch { summary = null } }
  async function seed() {
    if (busy) return
    busy = true; error = ''; note = ''
    try {
      const r = await request<{ entities: number; assertions: number; excerpts: number; present: number }>('/v1/knowledge-model/seed', {})
      note = r.entities + ' entri, ' + r.assertions + ' pernyataan dan ' + r.excerpts + ' kutipan dimuat.' + (r.present ? ' ' + r.present + ' entri sudah ada dan dilewati.' : '')
      await load()
    } catch (e) { error = e instanceof Error ? e.message : 'Data awal belum dimuat.' } finally { busy = false }
  }
  onMount(load)
</script>

{#if summary}<section class="ks" aria-labelledby="ks-title">
    <h3 id="ks-title">Data awal pengetahuan</h3>
    <p>{summary.entities ? 'Node ini memuat ' + summary.entities + ' entri, ' + summary.assertions + ' pernyataan dan ' + summary.excerpts + ' kutipan.' : 'Peta pengetahuan masih kosong. Data awal berisi tempat, masyarakat dan bahasa di Tanah Papua, dengan kutipan dari sumber publik yang sudah diperiksa.'}</p>
    {#if !summary.entities}<button type="button" onclick={seed} disabled={busy}>{busy ? 'Memuat…' : 'Muat data awal'}</button>{/if}
    {#if note}<p class="ks-note" role="status">{note}</p>{/if}
    {#if error}<p class="commons-alert" role="status">{error}</p>{/if}
  </section>{/if}

<style>
  .ks { display: grid; gap: 8px; margin-top: 16px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; }
  .ks h3 { margin: 0; font-size: 15px; font-weight: 600; }
  .ks p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--muted-foreground); }
  .ks button { justify-self: start; min-height: 40px; padding: 0 16px; border: 0; border-radius: 10px; background: var(--brand); color: var(--brand-foreground, #fff); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .ks button:disabled { opacity: 0.55; cursor: default; }
</style>
