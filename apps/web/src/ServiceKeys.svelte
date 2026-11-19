<script lang="ts">
  // Keys for outside services other than the model. Same rules as the model key: checked with the service
  // before it is kept, stored in the node, never shown again (last four characters only).
  import { onMount } from 'svelte'
  import { Eye, EyeOff, ArrowUpRight } from '@lucide/svelte'
  import { request } from './api'

  type Row = { id: string; label: string; use: string; link: string; key: { source: 'studio' | 'github'; last4: string | null; added: number | null } | null }
  let rows = $state<Row[] | null>(null),
    editing = $state(''),
    input = $state(''),
    show = $state(false),
    busy = $state(false),
    note = $state(''),
    error = $state('')
  const date = (t: number) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

  async function load() {
    try { rows = (await request<{ services: Row[] }>('/v1/ops/service-keys', undefined, undefined, true)).services } catch { rows = null }
  }
  function open(id: string) { editing = id; input = ''; show = false; note = ''; error = '' }
  async function save(row: Row) {
    if (busy || input.trim().length < 8) return
    busy = true; error = ''; note = ''
    try {
      await request('/v1/ops/service-keys', { service: row.id, key: input.trim() })
      editing = ''; input = ''; note = 'Kunci ' + row.label + ' diterima.'
      await load()
    } catch (e) { error = e instanceof Error ? e.message : 'Kunci belum tersimpan.' } finally { busy = false }
  }
  async function remove(row: Row) {
    if (busy || !confirm('Hapus kunci ' + row.label + ' dari Studio?')) return
    busy = true; error = ''
    try { await request('/v1/ops/service-keys', { service: row.id, remove: true }); note = 'Kunci ' + row.label + ' dihapus.'; await load() } catch (e) { error = e instanceof Error ? e.message : 'Kunci belum terhapus.' } finally { busy = false }
  }
  onMount(load)
</script>

{#if rows?.length}<section class="sk" aria-labelledby="sk-title">
    <h3 id="sk-title">Kunci layanan lain</h3>
    <ul>
      {#each rows as row (row.id)}<li>
          {#if editing === row.id}<form class="sk-form" autocomplete="off" onsubmit={(e) => { e.preventDefault(); void save(row) }}>
              <label for={'sk-' + row.id}>{row.label}</label>
              <div class="sk-field">
                <input id={'sk-' + row.id} type={show ? 'text' : 'password'} bind:value={input} autocomplete="off" autocapitalize="off" spellcheck="false" data-1p-ignore data-lpignore="true" onpaste={(e) => { e.preventDefault(); input = (e.clipboardData?.getData('text') ?? '').trim() }} />
                <button type="button" onclick={() => (show = !show)} aria-label={show ? 'Sembunyikan kunci' : 'Tampilkan kunci'} aria-pressed={show}>{#if show}<EyeOff size={16} />{:else}<Eye size={16} />{/if}</button>
              </div>
              <small>Diperiksa ke {row.label} sebelum disimpan. <a href={row.link} target="_blank" rel="noopener noreferrer">Buat kunci<ArrowUpRight size={12} /></a></small>
              <div class="sk-actions"><button type="submit" class="sk-save" disabled={busy || input.trim().length < 8}>{busy ? 'Memeriksa…' : 'Periksa & simpan'}</button><button type="button" onclick={() => (editing = '')}>Batal</button></div>
            </form>{:else}<div class="sk-row">
              <div><strong>{row.label}</strong><small>{row.use} {row.key ? (row.key.source === 'studio' ? '••••' + row.key.last4 + (row.key.added ? ' · ditambahkan ' + date(row.key.added) : '') : 'Dari GitHub.') : 'Belum ada kunci.'}</small></div>
              <div class="sk-actions"><button type="button" onclick={() => open(row.id)}>{row.key ? 'Ganti' : 'Tambah'}</button>{#if row.key?.source === 'studio'}<button type="button" onclick={() => remove(row)} disabled={busy}>Hapus</button>{/if}</div>
            </div>{/if}
        </li>{/each}
    </ul>
    {#if note}<p class="sk-note" role="status">{note}</p>{/if}
    {#if error}<p class="commons-alert" role="status">{error}</p>{/if}
  </section>{/if}

<style>
  .sk { display: grid; gap: 8px; margin-top: 16px; }
  .sk h3 { margin: 0; font-size: 15px; font-weight: 600; }
  .sk ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .sk-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; }
  .sk-row > div:first-child { display: grid; gap: 2px; min-width: 0; }
  .sk-row small, .sk-form small, .sk-note { font-size: 13px; color: var(--muted-foreground); line-height: 1.45; }
  .sk-form { display: grid; gap: 8px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; }
  .sk-form label { font-size: 14px; font-weight: 600; }
  .sk-field { display: flex; gap: 6px; }
  .sk-field input { flex: 1; min-width: 0; min-height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font-size: 14px; font-family: var(--font-mono, ui-monospace, monospace); }
  .sk-field button, .sk-actions button:not(.sk-save) { display: inline-grid; place-items: center; min-width: 40px; min-height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; cursor: pointer; }
  .sk-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .sk-save { min-height: 40px; padding: 0 16px; border: 0; border-radius: 10px; background: var(--brand); color: var(--brand-foreground, #fff); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .sk-save:disabled { opacity: 0.55; cursor: default; }
  .sk-form a { display: inline-flex; align-items: center; gap: 2px; color: var(--foreground); text-underline-offset: 3px; }
  .sk p { margin: 0; }
</style>
