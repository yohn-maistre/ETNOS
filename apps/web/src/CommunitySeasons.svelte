<script lang="ts">
  // Stewards name the seasons their community uses (a wind, a harvest, a fishing time). Posts may then carry one.
  // A season is never deleted: retiring it keeps it on posts that already carry it.
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { request, type Season } from './api'

  let { communityId }: { communityId: string } = $props()
  let seasons = $state<Season[]>([]),
    name = $state(''),
    note = $state(''),
    busy = $state(false),
    error = $state('')

  $effect(() => {
    const id = communityId
    request<Season[]>(`/v1/communities/${id}/seasons`)
      .then((rows) => (seasons = rows))
      .catch(() => (seasons = []))
  })
  const active = $derived(seasons.filter((s) => !s.archived))
  const retired = $derived(seasons.filter((s) => s.archived))

  async function act(run: () => Promise<unknown>) {
    if (busy) return
    busy = true
    error = ''
    try {
      await run()
      seasons = await request<Season[]>(`/v1/communities/${communityId}/seasons`)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Belum tersimpan.'
    } finally {
      busy = false
    }
  }
  function add(e: SubmitEvent) {
    e.preventDefault()
    if (!name.trim()) return
    void act(async () => {
      await request(`/v1/communities/${communityId}/seasons`, { name, note })
      name = ''
      note = ''
    })
  }
  const setRetired = (s: Season, archived: boolean) => act(() => request(`/v1/communities/${communityId}/seasons/${s.id}`, { archived }))
</script>

<section class="community-seasons" aria-labelledby="cs-seasons">
  <h3 id="cs-seasons">Musim</h3>
  <p class="hint">Nama musim yang dipakai komunitas ini, misalnya musim angin barat atau musim panen. Anggota bisa memilih satu musim saat memposting. Paling banyak dua belas.</p>
  {#if active.length}
    <ul>
      {#each active as s (s.id)}
        <li>
          <span><strong>{s.name}</strong>{#if s.note}<small>{s.note}</small>{/if}</span>
          <Button variant="ghost" class="cx-button small" disabled={busy} onclick={() => setRetired(s, true)}>Hentikan</Button>
        </li>
      {/each}
    </ul>
  {/if}
  {#if active.length < 12}
    <form onsubmit={add}>
      <div class="field">
        <Label for="cs-season-name">Nama musim</Label>
        <Input id="cs-season-name" maxlength={60} bind:value={name} placeholder="Musim angin barat" />
      </div>
      <div class="field">
        <Label for="cs-season-note">Keterangan (opsional)</Label>
        <Input id="cs-season-note" maxlength={200} bind:value={note} placeholder="Kira-kira bulan apa, atau tandanya" />
      </div>
      <Button type="submit" class="cx-button small" disabled={busy || !name.trim()}>Tambah musim</Button>
    </form>
  {/if}
  {#if retired.length}
    <details>
      <summary>Musim yang dihentikan ({retired.length})</summary>
      <p class="hint">Tetap tampil di posting lama. Tidak bisa dipilih untuk posting baru.</p>
      <ul>
        {#each retired as s (s.id)}
          <li>
            <span><strong>{s.name}</strong></span>
            <Button variant="ghost" class="cx-button small" disabled={busy || active.length >= 12} onclick={() => setRetired(s, false)}>Pakai lagi</Button>
          </li>
        {/each}
      </ul>
    </details>
  {/if}
  {#if error}<p class="note error" role="alert">{error}</p>{/if}
</section>

<style>
  .community-seasons { display: grid; gap: 10px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  h3 { font-size: 15px; font-weight: 600; margin: 0; }
  .hint { margin: 0; font-size: 13px; line-height: 1.5; color: var(--muted-foreground); max-width: 60ch; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; }
  li { display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 44px; border-bottom: 1px solid var(--border); }
  li:last-child { border-bottom: 0; }
  li span { display: grid; gap: 2px; min-width: 0; }
  li strong { font-weight: 500; font-size: 14px; }
  li small { font-size: 13px; color: var(--muted-foreground); }
  form { display: grid; gap: 10px; padding-top: 4px; }
  form :global(button) { justify-self: start; }
  .field { display: grid; gap: 6px; }
  details summary { cursor: pointer; font-size: 14px; color: var(--muted-foreground); min-height: 32px; display: flex; align-items: center; }
  details[open] { display: grid; gap: 8px; }
  .note.error { margin: 0; font-size: 13px; color: var(--destructive); }
</style>
