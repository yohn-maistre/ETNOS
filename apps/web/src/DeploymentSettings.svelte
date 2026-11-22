<script lang="ts">
  // Studio, Pengaturan: the deployment as etnos.yaml (src/deployment.ts). The operator reads and downloads the
  // current file, pastes or chooses an edited copy, checks it and applies the settings this page can change.
  import { Download, FileUp, Check, CircleAlert, ArrowRight } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import StudioTabs from './StudioTabs.svelte'
  import ContentSkeleton from './ContentSkeleton.svelte'
  import { request, type Auth } from './api'
  import { notify } from './notifications.svelte'

  type How = 'apply' | 'deploy' | 'model' | 'fixed'
  type Change = { path: string; from: unknown; to: unknown; how: How }
  type Checked = { ok: boolean; errors: { path: string; message: string }[]; secret: string | null; changes: Change[] }

  let { auth }: { auth: Auth } = $props()
  let current = $state<{ text: string } | null>(null)
  let error = $state('')
  let draft = $state('')
  let checked = $state<Checked | null>(null)
  let busy = $state(false)

  const groups: { how: How; title: string; note: string }[] = [
    { how: 'apply', title: 'Berlaku dari sini', note: 'Disimpan saat kamu menekan Terapkan.' },
    { how: 'deploy', title: 'Diatur saat deploy', note: 'Ubah di pengaturan Worker lalu deploy ulang. Panduan pengelola menjelaskan caranya.' },
    { how: 'model', title: 'Diubah di Agen & koneksi', note: 'Penyedia, nama model dan kuncinya diatur di tab Agen & koneksi.' },
    { how: 'fixed', title: 'Belum bisa diubah', note: 'Versi berkas dan bahasa antarmuka tetap untuk saat ini.' },
  ]
  const labels: Record<string, string> = {
    name: 'Nama', description: 'Keterangan', origin: 'Alamat', rootPlace: 'Wilayah utama', uiLanguage: 'Bahasa antarmuka',
    regionLanguages: 'Bahasa daerah', catalogue: 'Katalog', enrollment: 'Pendaftaran', 'news.sources': 'Sumber berita',
    'model.provider': 'Penyedia model', 'model.fast': 'Model cepat', 'model.synthesis': 'Model sintesis',
    'operator.name': 'Nama pengelola', 'operator.email': 'Surel pengelola', 'operator.url': 'Situs web pengelola',
    'operator.did': 'DID pengelola', 'kios.rules': 'Aturan Kios', version: 'Versi berkas',
  }
  const show = (v: unknown) =>
    v === null || v === '' ? 'kosong'
    : Array.isArray(v) ? (v.length ? (typeof v[0] === 'object' ? v.length + ' aturan' : v.join(', ')) : 'kosong')
    : String(v)

  async function load() {
    error = ''
    try {
      current = await request<{ text: string }>('/v1/deployment/etnos-yaml')
    } catch (e) {
      error = e instanceof Error ? e.message : 'Pengaturan belum dapat dimuat.'
    }
  }
  $effect(() => {
    if (auth.steward) load()
  })

  function download() {
    if (!current) return
    const url = URL.createObjectURL(new Blob([current.text], { type: 'application/yaml' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'etnos.yaml'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function choose(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    if (file.size > 200_000) return notify('Berkas terlalu besar. Paling banyak 200 KB.')
    draft = await file.text()
    checked = null
    await runCheck()
  }
  async function runCheck() {
    if (busy || !draft.trim()) return
    busy = true
    try {
      checked = await request<Checked>('/v1/deployment/etnos-yaml/check', { text: draft })
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Berkas belum dapat diperiksa.')
    } finally {
      busy = false
    }
  }
  async function apply() {
    if (busy) return
    busy = true
    try {
      const r = await request<{ applied: Change[] }>('/v1/deployment/etnos-yaml/apply', { text: draft })
      notify(r.applied.length === 1 ? 'Satu pengaturan diterapkan.' : r.applied.length + ' pengaturan diterapkan.')
      await load()
      checked = await request<Checked>('/v1/deployment/etnos-yaml/check', { text: draft })
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Pengaturan belum dapat diterapkan.')
    } finally {
      busy = false
    }
  }
  const applicable = $derived(checked?.changes.filter((c) => c.how === 'apply').length ?? 0)
</script>

<div class="studio-page deployment-settings">
  <StudioTabs current="settings" />
  {#if !auth.steward}
    <section class="etnos-nodata"><h1>Pengaturan ETNOS</h1><p>Halaman ini hanya untuk pengelola ETNOS.</p></section>
  {:else if error}
    <section class="etnos-nodata"><h1>Pengaturan ETNOS</h1><p>{error}</p><Button variant="outline" onclick={load}>Coba lagi</Button></section>
  {:else if !current}
    <ContentSkeleton />
  {:else}
    <div class="commons-page-head">
      <div>
        <h1>Pengaturan ETNOS</h1>
        <p class="cx-hint">Seluruh pengaturan ETNOS ini dalam satu berkas etnos.yaml. Berkas ini tidak memuat kunci atau kata sandi.</p>
      </div>
      <Button variant="outline" onclick={download}><Download size={16} />Unduh etnos.yaml</Button>
    </div>

    <section class="ds-section" aria-labelledby="ds-current">
      <h2 id="ds-current">Berkas saat ini</h2>
      <pre class="ds-file" aria-label="Isi etnos.yaml saat ini">{current.text}</pre>
    </section>

    <section class="ds-section" aria-labelledby="ds-edit">
      <h2 id="ds-edit">Periksa berkas yang sudah diubah</h2>
      <p class="cx-hint">Tempel isi berkas atau pilih berkasnya. Perubahan baru disimpan setelah kamu memeriksa dan menekan Terapkan.</p>
      <Textarea class="ds-input" rows={10} spellcheck={false} bind:value={draft} oninput={() => (checked = null)} placeholder="version: 1" aria-label="Isi etnos.yaml yang sudah diubah" />
      <div class="ds-actions">
        <Button onclick={runCheck} disabled={busy || !draft.trim()}><Check size={16} />Periksa</Button>
        <label class="ds-file-pick"><FileUp size={16} />Pilih berkas<input type="file" accept=".yaml,.yml,text/yaml,application/yaml" onchange={choose} /></label>
        <button type="button" class="ds-link" onclick={() => { draft = current?.text ?? ''; checked = null }}>Mulai dari berkas saat ini</button>
      </div>

      {#if checked}
        <div class="ds-result" role="status">
          {#if !checked.ok}
            <div class="ds-errors">
              <p class="ds-errors-head"><CircleAlert size={18} />{checked.secret ? 'Berkas ini tidak dipakai.' : 'Berkas ini belum bisa dipakai.'}</p>
              <ul>
                {#each checked.errors as e}<li>{#if e.path && !checked.secret}<code>{e.path}</code> {/if}{e.message}</li>{/each}
              </ul>
            </div>
          {:else if !checked.changes.length}
            <p class="ds-same">Berkas ini sama dengan pengaturan sekarang. Tidak ada yang berubah.</p>
          {:else}
            {#each groups as g}
              {@const list = checked.changes.filter((c) => c.how === g.how)}
              {#if list.length}
                <div class="ds-group">
                  <h3>{g.title}</h3>
                  <p class="cx-hint">{g.note}</p>
                  <ul>
                    {#each list as c}
                      <li>
                        <span class="ds-label">{labels[c.path] ?? c.path}</span>
                        <span class="ds-diff"><span class="ds-from">{show(c.from)}</span><ArrowRight size={14} aria-label="menjadi" /><span class="ds-to">{show(c.to)}</span></span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            {/each}
            <div class="ds-actions">
              <Button onclick={apply} disabled={busy || !applicable}>{applicable ? 'Terapkan ' + applicable + ' perubahan' : 'Tidak ada yang bisa diterapkan di sini'}</Button>
            </div>
          {/if}
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .deployment-settings { padding-bottom: 48px; }
  .ds-section { padding: 20px var(--studio-gutter, 24px) 8px; display: grid; gap: 12px; max-width: 880px; }
  .ds-section h2 { font-size: 1.05rem; font-weight: 650; margin: 0; }
  .ds-file {
    margin: 0; padding: 16px; border-radius: 12px;
    background: var(--muted); border: 1px solid var(--border);
    font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 2;
  }
  :global(.ds-input) { font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; min-height: 200px; max-height: 360px; overflow: auto; field-sizing: fixed; }
  .ds-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
  .ds-file-pick {
    position: relative; display: inline-flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 14px;
    border: 1px solid var(--border); border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;
  }
  .ds-file-pick:focus-within { outline: 2px solid var(--foreground); outline-offset: 2px; }
  .ds-file-pick input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .ds-link { background: none; border: 0; padding: 8px 0; font: inherit; font-size: 14px; color: var(--muted-foreground); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .ds-link:hover { color: var(--foreground); }
  .ds-result { display: grid; gap: 20px; margin-top: 8px; }
  .ds-errors { border: 1px solid color-mix(in oklab, var(--destructive) 45%, var(--border)); background: color-mix(in oklab, var(--destructive) 7%, var(--background)); border-radius: 12px; padding: 14px 16px; }
  .ds-errors-head { display: flex; align-items: center; gap: 8px; font-weight: 650; margin: 0 0 8px; }
  .ds-errors ul { margin: 0; padding-left: 20px; display: grid; gap: 6px; font-size: 14.5px; }
  .ds-errors code { font-size: 13px; }
  .ds-same { margin: 0; }
  .ds-group h3 { font-size: 15px; font-weight: 650; margin: 0 0 2px; }
  .ds-group ul { list-style: none; margin: 10px 0 0; padding: 0; border-top: 1px solid var(--border); }
  .ds-group li { display: grid; gap: 4px; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14.5px; }
  .ds-label { font-weight: 600; }
  .ds-diff { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; color: var(--muted-foreground); overflow-wrap: anywhere; }
  .ds-to { color: var(--foreground); }
  @media (min-width: 640px) { .ds-group li { grid-template-columns: 180px minmax(0, 1fr); gap: 16px; } }
  @media (max-width: 767px) { .ds-section { padding-inline: 16px; } }
</style>
