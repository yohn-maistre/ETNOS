<script lang="ts">
  // Where a community says it belongs: places, languages and kinds from the
  // deployment's catalogue. A steward of the community edits them here; the
  // labels are public and grant nothing.
  import { MapPin } from '@lucide/svelte'
  import { request } from './api'
  type Ctx = { id: string; slug: string; title: string; kind: string; facet?: string }
  let { communityId, steward, hidden }: { communityId: string; steward: boolean; hidden: boolean } = $props()
  const uid = $props.id()
  let labels = $state<Ctx[]>([]),
    all = $state<Ctx[]>([]),
    filter = $state(''),
    busy = $state(false),
    problem = $state('')
  $effect(() => {
    const id = communityId,
      abort = new AbortController()
    labels = []
    all = []
    filter = ''
    problem = ''
    request<{ contexts?: Ctx[] }>('/v1/communities/' + id, undefined, abort.signal, true)
      .then((c) => {
        if (!abort.signal.aborted) labels = c.contexts ?? []
      })
      .catch(() => {})
    return () => abort.abort()
  })
  const kindName = (c: Ctx) =>
    c.facet === 'institution-kind' ? 'Jenis lembaga' : c.kind === 'place' ? 'Kabupaten/kota' : c.kind === 'region' ? 'Wilayah' : c.kind === 'language' ? 'Bahasa' : 'Topik'
  const matches = $derived.by(() => {
    const q = filter.trim().toLowerCase()
    if (q.length < 2) return []
    const held = new Set(labels.map((l) => l.id))
    return all.filter((c) => !held.has(c.id) && c.title.toLowerCase().includes(q)).slice(0, 8)
  })
  async function loadAll() {
    if (all.length) return
    try {
      all = await request<Ctx[]>('/v1/contexts', undefined, undefined, true)
    } catch {
      problem = 'Daftar tempat belum dapat dimuat.'
    }
  }
  async function change(contextId: string, remove: boolean) {
    busy = true
    problem = ''
    try {
      labels = await request<Ctx[]>('/v1/communities/' + communityId + '/contexts', { contextId, remove })
      if (!remove) filter = ''
    } catch (error) {
      problem = error instanceof Error ? error.message : 'Belum tersimpan.'
    } finally {
      busy = false
    }
  }
</script>

{#if labels.length || (steward && !hidden)}
  <div class="community-places">
    {#if labels.length}
      <div class="cp-chips" aria-label="Komunitas ini ada di">
        {#each labels as c (c.id)}<a href={'/contexts/' + c.slug}>{#if c.kind === 'place' || c.kind === 'region'}<MapPin size={13} />{/if}{c.title}</a>{/each}
      </div>
    {/if}
    {#if steward && !hidden}
      <details ontoggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) void loadAll() }}>
        <summary>{labels.length ? 'Atur tempat dan jenis' : 'Tandai tempat dan jenis komunitas ini'}</summary>
        <div class="cp-edit">
          <label for={'cp-' + uid}>Cari tempat, bahasa atau jenis</label>
          <input id={'cp-' + uid} type="search" bind:value={filter} placeholder="Nabire, Mee, Sekolah…" autocomplete="off" />
          {#if matches.length}
            <ul>
              {#each matches as c (c.id)}
                <li><button type="button" disabled={busy} onclick={() => change(c.id, false)}><span>{c.title}</span><small>{kindName(c)}</small></button></li>
              {/each}
            </ul>
          {:else if filter.trim().length >= 2 && all.length}
            <p>Tidak ada yang cocok di katalog.</p>
          {/if}
          {#if labels.length}
            <ul class="cp-held" aria-label="Sudah ditandai">
              {#each labels as c (c.id)}
                <li><span>{c.title}</span><button type="button" disabled={busy} aria-label={'Lepas ' + c.title} onclick={() => change(c.id, true)}>Lepas</button></li>
              {/each}
            </ul>
          {/if}
          <p>Komunitas ini akan tampil di halaman tempat itu dan wilayah di atasnya. Paling banyak 10.</p>
          {#if problem}<p role="alert">{problem}</p>{/if}
        </div>
      </details>
    {/if}
  </div>
{/if}

<style>
  .community-places { margin-top: 12px; display: grid; gap: 6px; }
  .cp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .cp-chips a { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; font-size: 13px; color: var(--foreground); text-decoration: none; }
  .cp-chips a:hover { border-color: var(--brand); color: var(--brand); }
  details { font-size: 13px; }
  summary { cursor: pointer; color: var(--muted-foreground); min-height: 32px; display: inline-flex; align-items: center; }
  .cp-edit { display: grid; gap: 8px; max-width: 460px; padding: 8px 0 4px; }
  label { font-weight: 600; }
  input { min-height: 44px; padding: 0 12px; border: 1px solid var(--input); border-radius: 12px; background: var(--card); color: inherit; font: inherit; font-size: 16px; }
  input:focus-visible { outline: 2px solid var(--brand); outline-offset: 1px; }
  ul { list-style: none; margin: 0; padding: 0; border: 1px solid var(--reading-line); border-radius: 12px; overflow: hidden; }
  li + li { border-top: 1px solid var(--reading-line); }
  li button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; padding: 0 12px; background: none; border: 0; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  li button:hover { background: var(--secondary); }
  li small { color: var(--muted-foreground); }
  .cp-held li { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; padding-left: 12px; }
  .cp-held li button { width: auto; color: var(--muted-foreground); }
  p { margin: 0; color: var(--muted-foreground); }
</style>
