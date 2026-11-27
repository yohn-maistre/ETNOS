<script lang="ts">
  // Studio, for the node operator: per collection, the ID of a Local Contexts Hub project and the Notices that the
  // operator adds beside the ones ETNOS ships. There is no field for a Label: Labels are applied only by
  // communities on the Hub, and the pages link to the project to show them (docs/decisions/local-contexts-2026-11-28.md).
  import { onMount } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import { request } from './api'
  import { reloadLocalContexts, type LcCollection } from './local-contexts.ts'

  const EXTRA: [string, string][] = [['attribution-incomplete', 'Attribution Incomplete Notice'], ['open-to-collaborate', 'Open to Collaborate Notice'], ['tk', 'TK Notice'], ['bc', 'BC Notice']]
  let rows = $state<LcCollection[] | null>(null), failed = $state(false)
  let ids = $state<Record<string, string>>({}), busy = $state(''), note = $state(''), error = $state('')

  async function load() {
    try {
      rows = (await request<{ collections: LcCollection[] }>('/v1/local-contexts', undefined, undefined, true)).collections
      ids = Object.fromEntries(rows.map((r) => [r.key, r.hub?.projectId ?? '']))
    } catch { failed = true }
  }
  const operatorNotices = (c: LcCollection) => c.notices.filter((n) => n.by === 'operator').map((n) => n.kind)
  async function save(c: LcCollection, notices = operatorNotices(c)) {
    if (busy) return
    busy = c.key; error = ''; note = ''
    try {
      const next = await request<LcCollection>('/v1/local-contexts/' + encodeURIComponent(c.key), { hubProjectId: (ids[c.key] ?? '').trim(), notices })
      rows = (rows ?? []).map((r) => (r.key === c.key ? next : r))
      reloadLocalContexts()
      note = 'Pengaturan Local Contexts untuk ' + c.title + ' disimpan.'
    } catch (e) { error = e instanceof Error ? e.message : 'Pengaturan belum tersimpan.' } finally { busy = '' }
  }
  function toggle(c: LcCollection, kind: string, on: boolean) {
    const now = operatorNotices(c)
    void save(c, on ? [...now, kind] : now.filter((k) => k !== kind))
  }
  onMount(load)
</script>

<section class="lcs" aria-labelledby="lcs-title">
  <h2 id="lcs-title">Local Contexts</h2>
  <p class="cx-hint">Notice dipasang oleh lembaga atau peneliti, jadi ETNOS memasangnya di sini. Label hanya dipasang oleh komunitas lewat <a href="https://localcontexts.org/labels/about-the-labels/" target="_blank" rel="noopener">Local Contexts Hub</a>. Kalau komunitas sudah membuat proyek di Hub untuk sebuah koleksi, tulis ID proyeknya di sini. Halaman ETNOS lalu menautkan ke proyek itu, dan label komunitas tampil di sana.</p>
  {#if failed}<p class="commons-alert" role="alert">Daftar koleksi belum dapat dimuat.</p>
  {:else if !rows}<p class="cx-hint">Memuat…</p>
  {:else}
    <ul>
      {#each rows as c (c.key)}
        {@const shipped = c.notices.filter((n) => n.by === 'etnos').map((n) => n.kind)}
        <li>
          <div class="lcs-head"><strong>{c.title}</strong><small>{c.kind === 'service' ? 'Layanan' : 'Dataset'}</small></div>
          <p class="lcs-notices">{#each c.notices as n (n.kind)}<a href={n.url} target="_blank" rel="noopener">{n.name}<ArrowUpRight size={12} aria-hidden="true" /></a>{:else}<span>Belum ada Notice.</span>{/each}</p>
          <fieldset class="lcs-extra" disabled={!!busy}>
            <legend>Notice tambahan dari pengelola</legend>
            {#each EXTRA.filter(([k]) => !shipped.includes(k)) as [k, label] (k)}
              <label><input type="checkbox" checked={operatorNotices(c).includes(k)} onchange={(e) => toggle(c, k, e.currentTarget.checked)} />{label}</label>
            {/each}
          </fieldset>
          <form class="lcs-form" onsubmit={(e) => { e.preventDefault(); void save(c) }}>
            <label for={'lcs-' + c.key}>ID proyek di Local Contexts Hub</label>
            <div class="lcs-field">
              <input id={'lcs-' + c.key} bind:value={ids[c.key]} placeholder="8-4-4-4-12 karakter, misalnya 3fa85f64-…" autocomplete="off" autocapitalize="off" spellcheck="false" />
              <button type="submit" class="lcs-save" disabled={!!busy || (ids[c.key] ?? '').trim() === (c.hub?.projectId ?? '')}>{busy === c.key ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
            {#if c.hub}<small><a href={c.hub.url} target="_blank" rel="noopener">Buka proyek di Hub<ArrowUpRight size={12} aria-hidden="true" /></a> Kosongkan kolom lalu simpan untuk melepas tautannya.</small>{/if}
          </form>
        </li>
      {/each}
    </ul>
    {#if note}<p class="cx-hint" role="status">{note}</p>{/if}
    {#if error}<p class="commons-alert" role="alert">{error}</p>{/if}
  {/if}
</section>

<style>
  .lcs { display: grid; gap: 10px; margin-top: 28px; }
  .lcs h2 { margin: 0; font-size: 18px; font-weight: 750; }
  .lcs p { margin: 0; }
  .lcs a { color: var(--foreground); text-underline-offset: 3px; }
  .lcs ul { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
  .lcs li { display: grid; gap: 10px; padding: 12px 14px; border: 1px solid var(--border); border-radius: 14px; min-width: 0; }
  .lcs-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .lcs-head small, .lcs-notices span, .lcs small { font-size: 13px; color: var(--muted-foreground); }
  .lcs-notices { display: flex; flex-wrap: wrap; gap: 6px; }
  .lcs-notices a { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 10px; border: 1px solid var(--border); border-radius: 999px; font-size: 12.5px; font-weight: 600; text-decoration: none; }
  .lcs-extra { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0; padding: 0; border: 0; font-size: 13.5px; }
  .lcs-extra legend { width: 100%; margin-bottom: 4px; font-size: 13px; color: var(--muted-foreground); }
  .lcs-extra label { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; }
  .lcs-form { display: grid; gap: 6px; }
  .lcs-form label { font-size: 14px; font-weight: 600; }
  .lcs-field { display: flex; gap: 6px; }
  .lcs-field input { flex: 1; min-width: 0; min-height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font-size: 14px; font-variant-numeric: tabular-nums; }
  .lcs-save { min-height: 40px; padding: 0 16px; border: 0; border-radius: 10px; background: var(--foreground); color: var(--background); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .lcs-save:disabled { opacity: 0.5; cursor: default; }
</style>
