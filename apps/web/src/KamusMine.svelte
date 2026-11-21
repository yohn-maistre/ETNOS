<script lang="ts">
  // Kata saya: a member's own glossary for this community. It holds the words they tapped, saved or wrote a meaning
  // for. Only they see it, and it never needs a check. The community's checked meaning shows beside it once there is one.
  import { Bookmark, Trash2 } from '@lucide/svelte'
  import { request } from './api'
  import { openWord } from './kamus-posts.svelte.ts'
  type Row = { norm: string; form: string; gloss: string; wordClass: string; saved: boolean; updated: number; kamus: { gloss: string; wordClass: string } | null; example: { postId: string; text: string } | null }
  let { communityId }: { communityId: string } = $props()
  let rows = $state<Row[] | null>(null),
    failed = $state(false),
    only = $state(false),
    editing = $state<string | null>(null),
    draft = $state(''),
    busy = $state(false)
  const base = $derived('/v1/communities/' + encodeURIComponent(communityId) + '/kamus/mine')
  async function load() { try { rows = await request<Row[]>(base, undefined, undefined, true); failed = false } catch { failed = true } }
  $effect(() => { void communityId; void load() })
  const shown = $derived((rows ?? []).filter((r) => !only || r.saved))
  async function save(r: Row, body: Record<string, unknown>) {
    if (busy) return
    busy = true
    try { await request(base, { form: r.form, ...body }); await load() } finally { busy = false }
  }
  const CLASS: Record<string, string> = { benda: 'kata benda', kerja: 'kata kerja', sifat: 'kata sifat', lainnya: 'lainnya' }
</script>

<div class="mine">
  <p class="mine-intro">Kata saya berisi kata yang kamu ketuk, simpan atau beri arti di komunitas ini. Hanya kamu yang melihatnya.</p>
  {#if failed}<p class="mine-empty">Kata saya belum bisa dimuat. <button type="button" class="mine-link" onclick={load}>Coba lagi</button></p>
  {:else if rows}
    {#if rows.length}
      <div class="mine-filter" role="group" aria-label="Saring">
        <button type="button" aria-pressed={!only} onclick={() => (only = false)}>Semua</button>
        <button type="button" aria-pressed={only} onclick={() => (only = true)}>Disimpan</button>
      </div>
      <ul class="mine-list">
        {#each shown as r (r.norm)}
          <li>
            <div class="mine-head">
              <button type="button" class="mine-word" onclick={(e) => openWord(communityId, r.form, r.example?.postId ?? null, e.currentTarget)}>{r.form}</button>
              {#if r.saved}<span class="mine-saved"><Bookmark size={13} aria-hidden="true" />Disimpan</span>{/if}
              <button type="button" class="mine-icon" aria-label={'Hapus ' + r.form + ' dari Kata saya'} disabled={busy} onclick={() => save(r, { remove: true })}><Trash2 size={15} /></button>
            </div>
            {#if r.kamus}<p class="mine-kamus">Kamus komunitas: <strong>{r.kamus.gloss}</strong>{r.kamus.wordClass ? ', ' + CLASS[r.kamus.wordClass] : ''}</p>{/if}
            {#if editing === r.norm}
              <form class="mine-edit" onsubmit={(e) => { e.preventDefault(); void save(r, { gloss: draft }).then(() => (editing = null)) }}>
                <input bind:value={draft} maxlength="160" aria-label={'Catatan arti untuk ' + r.form} placeholder="Catatan arti untuk kamu sendiri" />
                <button type="submit" disabled={busy}>Simpan</button>
              </form>
            {:else}
              <p class="mine-note">{#if r.gloss}Catatan kamu: {r.gloss}{:else}<span>Belum ada catatan.</span>{/if} <button type="button" class="mine-link" onclick={() => { editing = r.norm; draft = r.gloss }}>{r.gloss ? 'Ubah' : 'Tulis catatan'}</button></p>
            {/if}
            {#if r.example}<p class="mine-example">{r.example.text}</p>{/if}
          </li>
        {:else}<li class="mine-empty">Belum ada kata yang disimpan.</li>{/each}
      </ul>
    {:else}<p class="mine-empty">Belum ada kata. Ketuk kata di posting komunitas ini untuk melihat artinya, lalu simpan.</p>{/if}
  {/if}
</div>

<style>
  .mine { display: grid; gap: 14px; }
  .mine-intro, .mine-empty { margin: 0; color: var(--muted-foreground); font-size: 14.5px; line-height: 1.5; }
  .mine-filter { display: flex; gap: 6px; }
  .mine-filter button { min-height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 13.5px; font-weight: 550; cursor: pointer; }
  .mine-filter button[aria-pressed='true'] { border-color: transparent; background: var(--foreground); color: var(--background); }
  .mine-list { display: grid; margin: 0 -20px; padding: 0; list-style: none; }
  @media (max-width: 560px) { .mine-list { margin: 0 -16px; } }
  .mine-list > li { display: grid; gap: 4px; padding: 14px 20px; border-top: 1px solid var(--border); }
  @media (max-width: 560px) { .mine-list > li { padding-inline: 16px; } }
  .mine-head { display: flex; align-items: center; gap: 10px; }
  .mine-word { padding: 0; border: 0; background: none; color: var(--foreground); font: inherit; font-size: 17px; font-weight: 750; cursor: pointer; text-decoration: underline dotted var(--brand); text-decoration-thickness: 2px; text-underline-offset: 4px; }
  .mine-saved { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; color: var(--muted-foreground); }
  .mine-icon { display: inline-grid; place-items: center; width: 40px; height: 40px; margin-left: auto; border: 0; border-radius: 10px; background: none; color: var(--muted-foreground); cursor: pointer; }
  .mine-icon:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); color: var(--foreground); }
  .mine-kamus, .mine-note { margin: 0; font-size: 14.5px; line-height: 1.45; }
  .mine-note span { color: var(--muted-foreground); }
  .mine-example { margin: 2px 0 0; font-size: 13.5px; color: var(--muted-foreground); font-style: italic; }
  .mine-link { padding: 0; border: 0; background: none; color: var(--brand); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
  .mine-edit { display: flex; gap: 6px; }
  .mine-edit input { flex: 1; min-width: 0; min-height: 40px; padding: 0 10px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font: inherit; font-size: 16px; }
  .mine-edit button { min-height: 40px; padding: 0 14px; border: 0; border-radius: 10px; background: var(--foreground); color: var(--background); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  button:focus-visible, input:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
</style>
