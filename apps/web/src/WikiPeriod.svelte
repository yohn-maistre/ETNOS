<script lang="ts">
  // The period a page is about. Everyone sees the line; a steward of the page's
  // community can set or clear it. The engine checks reviewer rights on save.
  import { request } from './api'
  import { periodLabel, type Period } from './period'
  let { pageId, time, steward }: { pageId: string; time: Period | null; steward: boolean } = $props()
  const uid = $props.id()
  let current = $state<Period | null>(null)
  let editing = $state(false)
  let busy = $state(false)
  let status = $state('')
  let from = $state(''),
    to = $state(''),
    precision = $state<Period['precision']>('year'),
    note = $state('')
  $effect(() => {
    void pageId
    current = time
    editing = false
    status = ''
  })
  function open() {
    from = current ? String(current.from) : ''
    to = current && current.to !== current.from ? String(current.to) : ''
    precision = current?.precision ?? 'year'
    note = current?.note ?? ''
    status = ''
    editing = true
  }
  async function save(remove = false) {
    const a = Number(from),
      b = to.trim() === '' ? a : Number(to)
    if (!remove && (from.trim() === '' || !Number.isInteger(a) || !Number.isInteger(b) || a > b)) {
      status = 'Isi tahun dengan angka bulat. Tahun awal tidak boleh setelah tahun akhir.'
      return
    }
    busy = true
    status = ''
    try {
      const r = await request<{ time: Period | null }>('/v1/wiki/' + pageId + '/time', remove ? { remove: true } : { from: a, to: b, precision, note })
      current = r.time
      editing = false
    } catch {
      status = 'Masa belum tersimpan. Periksa tahunnya, lalu coba lagi.'
    } finally {
      busy = false
    }
  }
</script>

{#if current || steward}
  <section class="wiki-period" aria-label="Masa yang dibahas">
    {#if !editing}
      <p>
        {#if current}Tentang masa <strong>{periodLabel(current)}</strong>{current.note ? ' · ' + current.note : ''}.
          <a href="/lini-masa">Lihat di lini masa</a>
        {:else}Halaman ini belum punya masa, jadi belum tampil di lini masa.{/if}
        {#if steward}<button type="button" onclick={open}>{current ? 'Ubah' : 'Tetapkan masa'}</button>{/if}
      </p>
    {:else}
      <form onsubmit={(e) => { e.preventDefault(); void save() }}>
        <label for={uid + '-from'}>Dari tahun
          <input id={uid + '-from'} inputmode="numeric" bind:value={from} placeholder="1962" />
        </label>
        <label for={uid + '-to'}>Sampai tahun
          <input id={uid + '-to'} inputmode="numeric" bind:value={to} placeholder="sama" />
        </label>
        <label for={uid + '-precision'}>Ketelitian
          <select id={uid + '-precision'} bind:value={precision}>
            <option value="year">Tahun</option>
            <option value="decade">Dasawarsa</option>
            <option value="century">Abad</option>
            <option value="millennium">Ribuan tahun</option>
            <option value="deep">Masa purba</option>
          </select>
        </label>
        <label class="wide" for={uid + '-note'}>Catatan singkat
          <input id={uid + '-note'} bind:value={note} maxlength="200" placeholder="Misalnya: menurut arsip gereja" />
        </label>
        <p class="hint">Tahun sebelum Masehi ditulis dengan tanda minus, misalnya -1500.</p>
        <div class="actions">
          <button type="submit" class="primary" disabled={busy}>Simpan</button>
          <button type="button" disabled={busy} onclick={() => (editing = false)}>Batal</button>
          {#if current}<button type="button" disabled={busy} onclick={() => save(true)}>Hapus masa</button>{/if}
        </div>
        {#if status}<p class="hint" role="status">{status}</p>{/if}
      </form>
    {/if}
  </section>
{/if}

<style>
  .wiki-period { padding: 12px 0; border-top: 1px solid var(--reading-line); font-size: 14px; line-height: 1.55; color: var(--muted-foreground); }
  p { margin: 0; }
  strong { color: var(--foreground); font-weight: 600; }
  a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  button { min-height: 36px; padding: 0 12px; margin-left: 6px; border: 1px solid var(--border); border-radius: 999px; background: none; color: var(--foreground); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  button:hover { border-color: var(--brand); color: var(--brand); }
  button.primary { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  button:disabled { opacity: .5; cursor: default; }
  form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  label { display: grid; gap: 4px; font-size: 12px; font-weight: 600; color: var(--foreground); min-width: 0; }
  input, select { min-height: 40px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; font-weight: 400; min-width: 0; width: 100%; }
  .wide, .hint, .actions { grid-column: 1 / -1; }
  .hint { font-size: 12px; }
  .actions button { margin: 0 6px 0 0; }
  @media (max-width: 520px) { form { grid-template-columns: 1fr 1fr; } }
</style>
