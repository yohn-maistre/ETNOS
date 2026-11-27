<script lang="ts">
  // Kamus komunitas: the words a community uses, from written sources and from its own conversations. Words found
  // in conversation become Periksa cards once Aksara suggests a meaning; members decide, and the entry follows the
  // card. Stewards turn machine reading on, pick the language and start each step by hand.
  import { Search, BookOpen, ChevronDown } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Switch } from '$lib/components/ui/switch/index.js'
  import { request } from './api'
  import KamusMine from './KamusMine.svelte'
  import KamusPrint from './KamusPrint.svelte'

  type Example = { postId: string; text: string }
  type Entry = { id: string; lemma: string; gloss: string; pos: string; context: string; source: string; licence: string; page: number | null; state: string; uses: number; speakers: number; examples: Example[]; claimId: string | null; variants?: { form: string; dialect: string }[]; dialect?: string; sensitive?: boolean }
  type Language = { id: string; name: string; sources: Record<string, { citation: string; licence: string; url: string | null }> }
  type View = { settings: { machineReading: boolean; language: string; languageName: string; languageSource: '' | 'label' | 'operator'; seeded: boolean }; contexts: string[]; languages: Language[]; counts: Record<string, number>; entries: Entry[] }
  let { communityId, title = '', steward = false, operator = false, member = false, visibility = 'public', onChanged }: { communityId: string; title?: string; steward?: boolean; operator?: boolean; member?: boolean; visibility?: string; onChanged?: () => void } = $props()
  // Kata saya (a member's own words), Cetak kamus and, for stewards, the suffix list and the export.
  let mode = $state<'kamus' | 'mine'>('kamus'),
    printing = $state(false),
    suffixes = $state<{ list: string[]; custom: boolean; learned: { suffix: string; checked: number }[] } | null>(null),
    suffixDraft = $state(''),
    suffixNote = $state('')
  const kamusBase = $derived('/v1/communities/' + encodeURIComponent(communityId) + '/kamus')
  async function loadSuffixes() { try { suffixes = await request(kamusBase + '/suffixes', undefined, undefined, true); suffixDraft = suffixes!.list.map((x) => '-' + x).join(' ') } catch { suffixes = null } }
  $effect(() => { if (steward && (settingsOpen || !total) && view?.settings.language && !suffixes) void loadSuffixes() })
  async function saveSuffixes(list: string[]) {
    suffixNote = ''
    try { suffixes = await request(kamusBase + '/suffixes', { suffixes: list }); suffixDraft = suffixes!.list.map((x) => '-' + x).join(' '); suffixNote = 'Daftar akhiran tersimpan.' } catch (e) { suffixNote = e instanceof Error ? e.message : 'Daftar akhiran belum tersimpan.' }
  }
  async function setSensitive(e: Entry, sensitive: boolean) {
    try { await request(kamusBase + '/' + encodeURIComponent(e.id) + '/sensitive', { sensitive }); e.sensitive = sensitive } catch (err) { error = err instanceof Error ? err.message : 'Belum tersimpan.' }
  }

  let view = $state<View | null>(null),
    q = $state(''),
    stateFilter = $state(''),
    context = $state(''),
    busy = $state(''),
    note = $state(''),
    error = $state(''),
    failed = $state(false),
    openId = $state<string | null>(null),
    settingsOpen = $state(false),
    limit = $state(80),
    writingId = $state<string | null>(null),
    draft = $state({ gloss: '', context: 'Lainnya' }),
    writeError = $state('')
  let timer: ReturnType<typeof setTimeout> | undefined

  const FILTERS: [string, string][] = [['', 'Semua'], ['candidate', 'Kata baru'], ['proposed', 'Menunggu pemeriksaan'], ['checked', 'Sudah diperiksa'], ['seed', 'Dari sumber tertulis']]
  const BADGE: Record<string, string> = { candidate: 'Kata baru', proposed: 'Menunggu pemeriksaan', checked: 'Sudah diperiksa', rejected: 'Ditolak anggota', split: 'Pendapat terbagi' }
  const language = $derived(view?.languages.find((l) => l.id === view?.settings.language) ?? null)
  const fmt = (n: number) => n.toLocaleString('id-ID')

  function sourceLabel(e: Entry) {
    if (e.source === 'room') return 'Ditemukan di percakapan'
    const key = e.source.replace(/^seed:/, '')
    const short = key === 'steltenpool1969' ? 'Steltenpool 1969' : key === 'tng' ? 'TransNewGuinea.org' : key === 'abvd' ? 'ABVD' : key === 'berry1987' ? 'Berry & Berry 1987' : key
    return e.page ? `${short}, hlm. ${e.page}` : short
  }

  async function load() {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (stateFilter) p.set('state', stateFilter)
    if (context) p.set('context', context)
    p.set('limit', String(limit))
    try {
      view = await request<View>(`/v1/communities/${encodeURIComponent(communityId)}/kamus${p.size ? '?' + p : ''}`, undefined, undefined, true)
      failed = false
    } catch { failed = true }
  }
  $effect(() => { void communityId; void stateFilter; void context; limit = 80; load() })
  function typed() { clearTimeout(timer); timer = setTimeout(() => { limit = 80; load() }, 250) }
  function more() { limit = Math.min(400, limit + 80); load() }
  const meta = (e: Entry) => [e.pos, e.context, sourceLabel(e), e.uses ? `Dipakai ${fmt(e.uses)} kali oleh ${fmt(e.speakers)} orang` : ''].filter(Boolean).join(' · ')

  async function act(step: 'settings' | 'seed' | 'scan' | 'describe', body: Record<string, unknown> = {}) {
    if (busy) return
    busy = step; note = ''; error = ''
    try {
      const r = await request<Record<string, number | boolean | string>>(`/v1/communities/${encodeURIComponent(communityId)}/kamus/${step}`, body)
      if (step === 'seed') note = r.added ? `${fmt(Number(r.added))} kata dimuat dari sumber tertulis.` : 'Semua kata dari sumber sudah ada di kamus.'
      if (step === 'scan') note = `${fmt(Number(r.posts))} tulisan dibaca. ${fmt(Number(r.candidates))} kata baru ditemukan, ${fmt(Number(r.matched))} kata cocok dengan sumber.`
      if (step === 'describe') note = Number(r.proposed) ? `Aksara mengusulkan ${r.proposed} arti. Kartunya ada di Periksa, di bagian atas halaman ini.` : 'Belum ada kata baru yang bisa diusulkan artinya.'
      await load()
      if (step === 'describe' && Number(r.proposed)) onChanged?.()
    } catch (e) { error = e instanceof Error ? e.message : 'Langkah ini belum berhasil. Coba lagi.' } finally { busy = '' }
  }

  async function sendMeaning(e: Entry) {
    if (busy || !draft.gloss.trim()) return
    busy = 'meaning'; writeError = ''
    try {
      await request(`/v1/communities/${encodeURIComponent(communityId)}/kamus/${encodeURIComponent(e.id)}/meaning`, { gloss: draft.gloss, context: draft.context })
      writingId = null; draft = { gloss: '', context: 'Lainnya' }
      await load(); onChanged?.()
    } catch (err) { writeError = err instanceof Error ? err.message : 'Arti belum terkirim. Coba lagi.' } finally { busy = '' }
  }
  const total = $derived(Object.values(view?.counts ?? {}).reduce((a, b) => a + b, 0))
</script>

<section class="kamus" aria-label="Kamus komunitas">
  {#if failed && !view}
    <p class="kamus-empty">Kamus belum bisa dimuat. <button class="kamus-link" type="button" onclick={load}>Coba lagi</button></p>
  {:else if view}
    <header class="kamus-head">
      <div>
        <h2>Kamus {view.settings.languageName || 'komunitas'}</h2>
        <p class="kamus-sum">
          {#if total}
            {fmt(view.counts.seed ?? 0)} kata dari sumber tertulis, {fmt(view.counts.candidate ?? 0)} kata baru dari percakapan, {fmt(view.counts.proposed ?? 0)} sudah diusulkan artinya.
          {:else}
            Kamus ini mengumpulkan kata yang dipakai anggota, lalu anggota memeriksa artinya bersama.
          {/if}
        </p>
      </div>
      {#if steward || operator}
        <Button variant="outline" size="sm" type="button" aria-expanded={settingsOpen} onclick={() => (settingsOpen = !settingsOpen)}>
          Atur kamus <ChevronDown size={14} class={settingsOpen ? 'kamus-flip' : ''} />
        </Button>
      {/if}
    </header>

    {#if member}
      <div class="kamus-modes" role="tablist" aria-label="Isi kamus">
        <button type="button" role="tab" aria-selected={mode === 'kamus'} onclick={() => (mode = 'kamus')}>Kamus komunitas</button>
        <button type="button" role="tab" aria-selected={mode === 'mine'} onclick={() => (mode = 'mine')}>Kata saya</button>
      </div>
    {/if}
    {#if mode === 'mine' && member}<KamusMine {communityId} />{:else}
    {#if total}
      <div class="kamus-actions">
        <Button variant="outline" size="sm" type="button" onclick={() => (printing = true)}>Cetak kamus</Button>
        {#if steward}<Button variant="outline" size="sm" href={kamusBase + '/export'} download>Unduh CSV</Button><Button variant="outline" size="sm" href={kamusBase + '/export?format=cldf'} download>Unduh CLDF</Button>{/if}
      </div>
    {/if}
    {#if (steward || operator) && (settingsOpen || !total)}
      <div class="kamus-panel">
        <label class="kamus-row">
          <span>
            <strong>Baca percakapan untuk mencari kata</strong>
            <small>Hanya tulisan anggota yang masih tampil yang dibaca. Tulisan Aksara tidak dihitung. Tulisan yang dihapus berhenti dihitung saat itu juga.</small>
          </span>
          <Switch checked={view.settings.machineReading} disabled={!!busy} onCheckedChange={(v) => act('settings', { machineReading: v })} />
        </label>
        {#if operator}
          <label class="kamus-row">
            <span><strong>Bahasa kamus</strong><small>{view.settings.languageSource === 'label' ? 'Diambil dari label bahasa komunitas ini. Pengelola node dapat menggantinya.' : 'Hanya pengelola node yang dapat mengubah bahasa. Kosongkan untuk memakai label bahasa komunitas.'}</small></span>
            <select class="kamus-select" value={view.settings.languageSource === 'operator' ? view.settings.language : ''} disabled={!!busy} onchange={(e) => act('settings', { language: e.currentTarget.value })}>
              <option value="">{view.settings.languageSource === 'label' ? 'Ikuti label (' + view.settings.languageName + ')' : 'Belum ada bahasa'}</option>
              {#each view.languages as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
            </select>
          </label>
        {:else}
          <p class="kamus-row"><span><strong>Bahasa {view.settings.languageName}</strong><small>{view.settings.languageSource === 'label' ? 'Diambil dari label bahasa komunitas ini.' : 'Ditetapkan oleh pengelola node.'} {view.settings.seeded ? '' : 'Belum ada sumber tertulis untuk bahasa ini, jadi kamus dimulai dari percakapan.'}</small></span></p>
        {/if}
        <div class="kamus-steps">
          <Button size="sm" variant="outline" type="button" disabled={!!busy || !view.settings.seeded} onclick={() => act('seed')}>{busy === 'seed' ? 'Memuat…' : 'Muat kata dari sumber'}</Button>
          <Button size="sm" variant="outline" type="button" disabled={!!busy || !view.settings.machineReading} onclick={() => act('scan')}>{busy === 'scan' ? 'Membaca…' : 'Cari kata baru'}</Button>
          <Button size="sm" type="button" disabled={!!busy || !view.settings.machineReading || visibility !== 'public' || !view.counts.candidate} onclick={() => act('describe')}>{busy === 'describe' ? 'Aksara sedang menulis…' : 'Minta Aksara mengusulkan arti'}</Button>
        </div>
        {#if visibility !== 'public'}<p class="kamus-hint">Komunitas ini tertutup. Model di server tidak membaca percakapannya, jadi Aksara tidak mengusulkan arti di sini.</p>
        {:else}<p class="kamus-hint">Aksara mengusulkan arti untuk lima kata sekali jalan. Setiap usulan menjadi kartu Periksa dan baru masuk kamus setelah anggota menjawab.</p>{/if}
        {#if steward && suffixes}
          <form class="kamus-suffixes" onsubmit={(e) => { e.preventDefault(); void saveSuffixes(suffixDraft.split(/[\s,]+/).filter(Boolean)) }}>
            <label for="kamus-suffixes"><strong>Akhiran yang dilepas saat mencocokkan kata</strong><small>Kata seperti owaya dicocokkan dengan owa setelah akhiran -ya dilepas, lalu ditanyakan kepada anggota sebagai "Bentuk dari owa?". Pisahkan dengan spasi.</small></label>
            <div><Input id="kamus-suffixes" bind:value={suffixDraft} autocomplete="off" /><Button size="sm" type="submit">Simpan</Button></div>
            {#if suffixes.learned.length}<p class="kamus-hint">Dari jawaban anggota: {#each suffixes.learned as l (l.suffix)}<button type="button" class="kamus-link" onclick={() => saveSuffixes([...suffixes!.list, l.suffix])}>Tambahkan -{l.suffix}</button> {/each}</p>{/if}
            {#if suffixNote}<p class="kamus-note" role="status">{suffixNote}</p>{/if}
          </form>
        {/if}
        {#if note}<p class="kamus-note" role="status">{note}</p>{/if}
        {#if error}<p class="kamus-error" role="alert">{error}</p>{/if}
      </div>
    {/if}

    {#if total}
      <div class="kamus-tools">
        <label class="kamus-search">
          <Search size={15} aria-hidden="true" />
          <Input bind:value={q} oninput={typed} placeholder="Cari kata atau arti" aria-label="Cari kata atau arti" />
        </label>
        <div class="kamus-chips" role="group" aria-label="Saring menurut keadaan">
          {#each FILTERS as [v, label] (v)}<button type="button" class:on={stateFilter === v} aria-pressed={stateFilter === v} onclick={() => (stateFilter = v)}>{label}</button>{/each}
        </div>
        <div class="kamus-chips" role="group" aria-label="Saring menurut konteks">
          <button type="button" class:on={context === ''} aria-pressed={context === ''} onclick={() => (context = '')}>Semua konteks</button>
          {#each view.contexts as c (c)}<button type="button" class:on={context === c} aria-pressed={context === c} onclick={() => (context = c)}>{c}</button>{/each}
        </div>
      </div>

      {#if view.entries.length}
        <ol class="kamus-list">
          {#each view.entries as e (e.id)}
            <li>
              <div class="kamus-entry">
                <div class="kamus-word">
                  <span class="kamus-lemma">{e.lemma}</span>
                  {#if BADGE[e.state]}<span class="kamus-state" data-state={e.state}>{BADGE[e.state]}</span>{/if}
                  {#if e.sensitive}<span class="kamus-state" data-state="sensitive">Jangan disebarkan</span>{/if}
                </div>
                <p class="kamus-gloss" class:clamp={openId !== e.id}>{#if e.gloss}{e.gloss}{:else}<span class="muted">Arti belum diusulkan</span>{/if}</p>
                <p class="kamus-meta">{meta(e)}{#if e.variants?.length} · Tulisan lain: {e.variants.map((v) => v.form + (v.dialect ? ' (' + v.dialect + ')' : '')).join(', ')}{/if}</p>
                {#if steward}<button class="kamus-link" type="button" onclick={() => setSensitive(e, !e.sensitive)}>{e.sensitive ? 'Boleh dibaca publik' : 'Tandai jangan disebarkan'}</button>{/if}
                {#if member && e.state === 'candidate' && writingId !== e.id}<button class="kamus-link" type="button" onclick={() => { writingId = e.id; draft = { gloss: '', context: 'Lainnya' }; writeError = '' }}>Tulis arti</button>{/if}
                {#if writingId === e.id}
                  <form class="kamus-write" onsubmit={(ev) => { ev.preventDefault(); sendMeaning(e) }}>
                    <Input bind:value={draft.gloss} maxlength={160} placeholder="Arti dalam bahasa Indonesia" aria-label={'Arti kata ' + e.lemma} />
                    <select class="kamus-select" bind:value={draft.context} aria-label="Konteks pemakaian">{#each view.contexts as c (c)}<option value={c}>{c}</option>{/each}</select>
                    <Button size="sm" type="submit" disabled={!!busy || !draft.gloss.trim()}>{busy === 'meaning' ? 'Mengirim…' : 'Kirim untuk diperiksa'}</Button>
                    <Button size="sm" variant="ghost" type="button" onclick={() => (writingId = null)}>Batal</Button>
                    <p class="kamus-hint">Arti ini menjadi kartu Periksa. Masuk kamus setelah anggota lain menjawab.</p>
                    {#if writeError}<p class="kamus-error" role="alert">{writeError}</p>{/if}
                  </form>
                {/if}
                {#if e.examples.length || e.gloss.length > 160}
                  <button class="kamus-link" type="button" aria-expanded={openId === e.id} onclick={() => (openId = openId === e.id ? null : e.id)}>{openId === e.id ? 'Tutup' : e.examples.length ? `Lihat ${e.examples.length} contoh kalimat` : 'Baca selengkapnya'}</button>
                  {#if openId === e.id && e.examples.length}<ul class="kamus-examples">{#each e.examples as x (x.postId)}<li>{x.text}</li>{/each}</ul>{/if}
                {/if}
              </div>
            </li>
          {/each}
        </ol>
        {#if view.entries.length >= limit && limit < 400}<Button variant="outline" size="sm" type="button" class="kamus-more" onclick={more}>Tampilkan lebih banyak</Button>
        {:else if view.entries.length >= 400}<p class="kamus-hint">Menampilkan 400 kata pertama. Pakai pencarian untuk kata lainnya.</p>{/if}
      {:else}
        <p class="kamus-empty">Tidak ada kata yang cocok dengan saringan ini.</p>
      {/if}

      {#if language}
        <footer class="kamus-sources">
          <BookOpen size={14} aria-hidden="true" />
          <div>
            {#each Object.entries(language.sources) as [k, s] (k)}<p>{#if s.url}<a href={s.url} target="_blank" rel="noopener">{s.citation}</a>{:else}{s.citation}{/if} Lisensi {s.licence}.</p>{/each}
            {#if language.sources.steltenpool1969}<p>Arti dari Steltenpool 1969 ditulis dengan ejaan lama dan disalin dari hasil pindai, jadi sebagian bisa keliru.</p>
            {:else}<p>Kata dari sumber tertulis berasal dari daftar kata terbitan dan belum diperiksa penutur. Artinya diambil dari nama konsep dalam daftar itu.</p>{/if}
            <p>Kata yang ditemukan di percakapan tidak dikirim ke sumber mana pun.</p>
          </div>
        </footer>
      {/if}
    {:else if !steward}
      <p class="kamus-empty">Kamus komunitas ini belum dimulai.</p>
    {/if}
    {/if}
    {#if visibility !== 'public'}<p class="kamus-hint">Komunitas ini tertutup. Kamusnya hanya terlihat oleh anggota, dan secara teknis oleh pengelola server ETNOS. Tidak ada kata yang tampil di halaman publik.</p>{/if}
  {/if}
</section>
{#if printing}<KamusPrint {communityId} {title} onClose={() => (printing = false)} />{/if}

<style>
  .kamus-modes { display: flex; gap: 6px; }
  .kamus-modes button { min-height: 40px; padding: 0 16px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .kamus-modes button[aria-selected='true'] { border-color: transparent; background: var(--foreground); color: var(--background); }
  .kamus-modes button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .kamus-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .kamus-suffixes { display: grid; gap: 8px; }
  .kamus-suffixes label { display: grid; gap: 3px; }
  .kamus-suffixes label small { color: var(--muted-foreground); font-size: 0.85rem; line-height: 1.45; }
  .kamus-suffixes div { display: flex; gap: 8px; }
  .kamus { display: grid; gap: 18px; padding: 12px 20px 28px; }
  @media (max-width: 560px) { .kamus { padding-inline: 16px; } }
  .kamus-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .kamus-head h2 { margin: 0; font-family: var(--cx-serif); font-size: 1.45rem; font-weight: 600; letter-spacing: -0.01em; text-wrap: balance; }
  .kamus-sum { margin: 6px 0 0; color: var(--muted-foreground); font-size: 0.92rem; max-width: 62ch; font-variant-numeric: tabular-nums; }
  :global(.kamus-flip) { transform: rotate(180deg); transition: transform 160ms ease-out; }
  .kamus-panel { display: grid; gap: 14px; padding: 16px; border-radius: 14px; background: color-mix(in oklab, var(--foreground) 4%, var(--background)); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 9%, transparent); }
  .kamus-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .kamus-row span { display: grid; gap: 3px; }
  .kamus-row strong { font-weight: 600; font-size: 0.95rem; }
  .kamus-row small { color: var(--muted-foreground); font-size: 0.82rem; max-width: 56ch; }
  .kamus-select { min-width: 9rem; height: 34px; padding: 0 10px; border-radius: 9px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font: inherit; font-size: 0.9rem; }
  .kamus-steps { display: flex; flex-wrap: wrap; gap: 8px; }
  .kamus-hint { margin: 0; color: var(--muted-foreground); font-size: 0.82rem; max-width: 64ch; }
  .kamus-note { margin: 0; font-size: 0.88rem; }
  .kamus-error { margin: 0; font-size: 0.88rem; color: var(--destructive); }
  .kamus-write { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 6px; }
  .kamus-write :global(input) { flex: 1 1 16rem; max-width: 24rem; }
  .kamus-write .kamus-hint, .kamus-write .kamus-error { flex-basis: 100%; }
  .kamus-tools { display: grid; gap: 10px; }
  .kamus-search { position: relative; display: block; max-width: 28rem; }
  .kamus-search :global(svg) { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--muted-foreground); pointer-events: none; }
  .kamus-search :global(input) { padding-left: 33px; }
  .kamus-chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
  .kamus-chips button { flex: none; height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--muted-foreground); font: inherit; font-size: 0.84rem; cursor: pointer; transition: background 140ms ease-out, color 140ms ease-out; }
  .kamus-chips button:hover { color: var(--foreground); background: color-mix(in oklab, var(--foreground) 5%, transparent); }
  .kamus-chips button.on { background: var(--foreground); border-color: var(--foreground); color: var(--background); }
  .kamus-chips button:focus-visible, .kamus-link:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .kamus-list { list-style: none; margin: 0; padding: 0; }
  .kamus-list > li { padding: 14px 0; border-top: 1px solid color-mix(in oklab, var(--foreground) 9%, transparent); }
  .kamus-list > li:last-child { border-bottom: 1px solid color-mix(in oklab, var(--foreground) 9%, transparent); }
  .kamus-entry { display: grid; gap: 4px; }
  .kamus-word { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; }
  .kamus-lemma { font-family: var(--cx-serif); font-size: 1.22rem; font-weight: 600; letter-spacing: -0.005em; }
  .kamus-state { font-size: 0.74rem; padding: 2px 8px; border-radius: 999px; background: color-mix(in oklab, var(--foreground) 7%, transparent); color: var(--muted-foreground); }
  .kamus-state[data-state='checked'] { background: color-mix(in oklab, #2f7d4f 16%, transparent); color: color-mix(in oklab, #2f7d4f 80%, var(--foreground)); }
  .kamus-state[data-state='proposed'] { background: color-mix(in oklab, #1f4e8c 14%, transparent); color: color-mix(in oklab, #1f4e8c 80%, var(--foreground)); }
  .kamus-state[data-state='rejected'] { text-decoration: line-through; }
  .kamus-state[data-state='sensitive'] { background: color-mix(in oklab, #b32228 13%, transparent); color: color-mix(in oklab, #b32228 80%, var(--foreground)); }
  .kamus-gloss { margin: 0; font-size: 0.98rem; max-width: 68ch; }
  .kamus-gloss.clamp { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; }
  :global(.kamus-more) { justify-self: start; }
  .kamus-gloss .muted { color: var(--muted-foreground); font-style: italic; }
  .kamus-meta { margin: 0; color: var(--muted-foreground); font-size: 0.82rem; font-variant-numeric: tabular-nums; }
  .kamus-link { justify-self: start; padding: 0; border: 0; background: none; color: var(--foreground); font: inherit; font-size: 0.84rem; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in oklab, var(--foreground) 35%, transparent); cursor: pointer; }
  .kamus-examples { margin: 4px 0 0; padding: 0 0 0 14px; display: grid; gap: 6px; border-left: 1px solid var(--border); list-style: none; }
  .kamus-examples li { font-size: 0.9rem; color: color-mix(in oklab, var(--foreground) 85%, var(--muted-foreground)); max-width: 66ch; }
  .kamus-empty { color: var(--muted-foreground); font-size: 0.92rem; }
  .kamus-sources { display: flex; gap: 10px; color: var(--muted-foreground); font-size: 0.8rem; }
  .kamus-sources :global(svg) { flex: none; margin-top: 3px; }
  .kamus-sources p { margin: 0 0 6px; max-width: 72ch; }
  .kamus-sources a { color: inherit; text-underline-offset: 3px; }
  @media (max-width: 560px) { .kamus-row { align-items: flex-start; } .kamus-head h2 { font-size: 1.3rem; } }
</style>
