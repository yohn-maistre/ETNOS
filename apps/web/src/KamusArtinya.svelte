<script lang="ts">
  // Artinya: the Indonesian translation of a post in a Kamus community, folded under the post. The author writes one
  // in the composer; any member can add one to someone else's post, with their name on it. A translation is edited
  // by its writer and removed by its writer, the post's author or a steward. Translations are also the Kamus's best
  // evidence: they are counted against the post's words to suggest meanings, which members then check.
  import { ChevronDown, Languages } from '@lucide/svelte'
  import { request } from './api'
  import { refreshAnnotations } from './kamus-posts.svelte.ts'
  type Item = { id: string; author: { id: string; name: string }; byPostAuthor: boolean; text: string; canEdit: boolean; canRemove: boolean }
  let { postId, count = 0, member = false, viewer = '' }: { postId: string; count?: number; member?: boolean; viewer?: string } = $props()

  let open = $state(false),
    items = $state<Item[] | null>(null),
    writing = $state(false),
    draft = $state(''),
    busy = $state(false),
    error = $state('')
  const id = $props.id()
  const mine = $derived(items?.find((i) => i.author.id === viewer) ?? null)

  async function load() {
    try { items = await request<Item[]>('/v1/posts/' + encodeURIComponent(postId) + '/artinya', undefined, undefined, true); error = '' } catch { error = 'Terjemahan belum bisa dimuat.' }
  }
  async function toggle() { open = !open; if (open && !items) await load() }
  async function startWriting() { if (!items) await load(); open = true; writing = true; draft = mine?.text ?? '' }
  async function save() {
    if (!draft.trim() || busy) return
    busy = true; error = ''
    try { items = await request<Item[]>('/v1/posts/' + encodeURIComponent(postId) + '/artinya', { text: draft }); writing = false; refreshAnnotations() } catch (e) { error = e instanceof Error ? e.message : 'Terjemahan belum tersimpan.' } finally { busy = false }
  }
  async function remove(i: Item) {
    if (busy) return
    busy = true; error = ''
    try { items = await request<Item[]>('/v1/posts/' + encodeURIComponent(postId) + '/artinya/remove', { authorId: i.author.id }); refreshAnnotations() } catch (e) { error = e instanceof Error ? e.message : 'Terjemahan belum terhapus.' } finally { busy = false }
  }
  const shown = $derived(items?.length ?? count)
</script>

{#if shown || member}
  <div class="artinya">
    <div class="artinya-bar">
      {#if shown}<button type="button" class="artinya-toggle" aria-expanded={open} aria-controls={id} onclick={toggle}><Languages size={15} aria-hidden="true" />{open ? 'Sembunyikan artinya' : 'Lihat artinya'}<ChevronDown size={14} aria-hidden="true" class={open ? 'artinya-flip' : ''} /></button>{/if}
      {#if member && !writing && !mine && (!shown || open)}<button type="button" class="artinya-add" onclick={startWriting}>Tambahkan arti</button>{/if}
    </div>
    {#if open || writing}
      <div class="artinya-body" {id}>
        {#each items ?? [] as i (i.id)}
          <div class="artinya-item">
            <p lang="id">{i.text}</p>
            <small>{i.byPostAuthor ? 'Ditulis oleh penulis posting' : 'Ditambahkan oleh ' + i.author.name}{#if i.canEdit}{' · '}<button type="button" onclick={() => { writing = true; draft = i.text }}>Ubah</button>{/if}{#if i.canRemove}{' · '}<button type="button" onclick={() => remove(i)} disabled={busy}>Hapus</button>{/if}</small>
          </div>
        {:else}{#if !writing}<p class="artinya-empty">Belum ada terjemahan.</p>{/if}{/each}
        {#if writing}
          <form class="artinya-form" onsubmit={(e) => { e.preventDefault(); void save() }}>
            <label for={id + '-t'}>Artinya dalam bahasa Indonesia</label>
            <textarea id={id + '-t'} bind:value={draft} rows="3" maxlength="4000"></textarea>
            <div><button type="button" onclick={() => { writing = false }}>Batal</button><button type="submit" class="artinya-save" disabled={busy || !draft.trim()}>Simpan</button></div>
          </form>
        {/if}
        {#if error}<p class="artinya-error" role="alert">{error}</p>{/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .artinya { margin-top: 8px; }
  .artinya-bar { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
  .artinya-toggle, .artinya-add { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 2px; border: 0; background: none; color: var(--muted-foreground); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
  .artinya-toggle:hover, .artinya-add:hover { color: var(--foreground); }
  .artinya-toggle :global(.artinya-flip) { transform: rotate(180deg); }
  .artinya-body { display: grid; gap: 10px; margin-top: 4px; padding: 12px 14px; border-radius: 14px; background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .artinya-item p { margin: 0; font-size: 15px; line-height: 1.55; white-space: pre-wrap; }
  .artinya-item small, .artinya-empty { font-size: 13px; color: var(--muted-foreground); }
  .artinya-item small button { padding: 0; border: 0; background: none; color: inherit; font: inherit; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
  .artinya-empty { margin: 0; }
  .artinya-form { display: grid; gap: 6px; }
  .artinya-form label { font-size: 13.5px; font-weight: 600; }
  .artinya-form textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font: inherit; font-size: 16px; resize: vertical; }
  .artinya-form div { display: flex; justify-content: flex-end; gap: 8px; }
  .artinya-form button { min-height: 40px; padding: 0 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; cursor: pointer; }
  .artinya-form .artinya-save { border-color: transparent; background: var(--foreground); color: var(--background); font-weight: 600; }
  .artinya-form button:disabled { opacity: 0.55; }
  .artinya-error { margin: 0; font-size: 13.5px; color: var(--destructive, #b3261e); }
  button:focus-visible, textarea:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
</style>
