<script lang="ts" module>
  export type LembagaGroup = {
    id: string
    title: string
    description: string
    kind: 'collective' | 'institution'
    visibility: 'public' | 'hidden-private'
    sponsorship: string
    spaces: import('./api').Community[]
    hiddenSpaces?: number
    contexts: { id: string; slug: string; title: string; kind: string; facet?: string }[]
    profile?: {
      about: string
      contacts: { label: string; value: string }[]
      website: string
      recognition: { by: string; source: string }[]
      hideCount: boolean
      logo: string | null
    }
    jenis?: { id: string; slug: string; title: string } | null
    entry?: string | null
    canManage?: boolean
  }
</script>

<script lang="ts">
  // A lembaga page with two voices (docs/plan/one-page-system-2026-11-21.md §5). "Dari lembaga ini" is what the
  // lembaga says about itself, edited by its stewards. "Di ensiklopedia" is the entry it claimed, with the reviewed
  // Tentang and facts from the entry API; the lembaga cannot edit it here, only through the normal review. A claim
  // links the two once the node operator approves it. The Kios sits in the rail on wide screens.
  import type { Snippet } from 'svelte'
  import { Globe, LockKeyhole, ArrowUpRight, BookOpen, Pencil, Link2, Check, X } from '@lucide/svelte'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Switch } from '$lib/components/ui/switch/index.js'
  import Choice from './Choice.svelte'
  import KiosBlock from './KiosBlock.svelte'
  import { request, initials, relativeDate, type Auth } from './api'
  import { avatarTone } from './avatar-tone'
  import { loadEntry, loadIndex, type Entry, type IndexEntry } from './entri'
  import { JENIS } from './lembaga-jenis.ts'
  import { prepareImage } from './media'

  type Claim = { id: string; group: { id: string; title: string }; entry: string | null; proposal: { title: string; description: string; placeId: string | null } | null; state: string; created: number }
  type Ctx = { id: string; slug: string; title: string; kind: string; facet?: string }
  let { group, auth, onChanged, actions, onCreateOffer }: { group: LembagaGroup; auth: Auth; onChanged: () => void; actions?: Snippet; onCreateOffer?: () => void } = $props()
  const uid = $props.id()

  let entry = $state<Entry | null>(null),
    claims = $state<Claim[]>([]),
    queue = $state<Claim[]>([]),
    editing = $state(false),
    claiming = $state(false),
    busy = $state(false),
    problem = $state(''),
    contexts = $state<Ctx[]>([]),
    lembagaEntries = $state<IndexEntry[]>([])
  // Edit form
  let about = $state(''),
    jenis = $state(''),
    website = $state(''),
    hideCount = $state(false),
    contactRows = $state<{ label: string; value: string }[]>([]),
    recognitionRows = $state<{ by: string; source: string }[]>([]),
    placeId = $state('')
  // Claim form
  let claimMode = $state<'existing' | 'new'>('new'),
    claimEntry = $state(''),
    claimTitle = $state(''),
    claimDescription = $state(''),
    claimPlace = $state('')

  const profile = $derived(group.profile ?? { about: '', contacts: [], website: '', recognition: [], hideCount: false, logo: null })
  const steward = $derived(!!group.canManage)
  const operator = $derived(!!auth.steward)
  const pending = $derived(claims.find((c) => c.state === 'pending') ?? queue.find((c) => c.group.id === group.id) ?? null)
  const places = $derived(group.contexts.filter((c) => c.kind === 'place' || c.kind === 'region'))
  const placeChoices = $derived(contexts.filter((c) => c.kind === 'place' || c.kind === 'region'))
  const jenisChoices = $derived(JENIS.map((j) => ({ ...j, id: contexts.find((c) => c.slug === j.slug && c.facet === 'institution-kind')?.id ?? '' })).filter((j) => j.id))
  const kindLine = $derived([group.jenis?.title ?? (group.kind === 'institution' ? 'Lembaga' : 'Kelompok'), group.visibility === 'public' ? 'Publik' : 'Tertutup'].join(' · '))

  $effect(() => {
    const slug = group.entry,
      abort = new AbortController()
    entry = null
    if (slug) loadEntry(slug, abort.signal).then((e) => { if (!abort.signal.aborted) entry = e }).catch(() => {})
    return () => abort.abort()
  })
  $effect(() => {
    const id = group.id,
      mine = steward,
      op = operator
    claims = []
    queue = []
    if (mine) request<Claim[]>('/v1/groups/' + id + '/claims', undefined, undefined, true).then((c) => (claims = c)).catch(() => {})
    if (op) request<Claim[]>('/v1/entry-claims', undefined, undefined, true).then((c) => (queue = c)).catch(() => {})
  })
  async function loadContexts() {
    if (!contexts.length) contexts = await request<Ctx[]>('/v1/contexts', undefined, undefined, true).catch(() => [])
  }
  async function openEdit() {
    problem = ''
    about = profile.about
    website = profile.website
    hideCount = profile.hideCount
    contactRows = profile.contacts.length ? profile.contacts.map((c) => ({ ...c })) : [{ label: '', value: '' }]
    recognitionRows = profile.recognition.map((r) => ({ ...r }))
    jenis = group.jenis?.id ?? ''
    placeId = ''
    editing = true
    await loadContexts()
  }
  async function openClaim() {
    problem = ''
    claimTitle = group.title
    claimDescription = group.description
    claimPlace = places[0]?.id ?? ''
    claimEntry = ''
    claiming = true
    await loadContexts()
    lembagaEntries = (await loadIndex().catch(() => null))?.entries.filter((e) => e.kind === 'lembaga') ?? []
    claimMode = lembagaEntries.length ? 'existing' : 'new'
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return
    busy = true
    problem = ''
    try {
      await fn()
    } catch (e) {
      problem = e instanceof Error ? e.message : 'Belum tersimpan.'
    } finally {
      busy = false
    }
  }
  const saveProfile = () =>
    run(async () => {
      await request('/v1/groups/' + group.id + '/profile', {
        about,
        website: website.trim(),
        hideCount,
        contacts: contactRows.filter((c) => c.label.trim() && c.value.trim()),
        recognition: recognitionRows.filter((r) => r.by.trim() || r.source.trim()),
      })
      if (group.visibility === 'public' && jenis !== (group.jenis?.id ?? '')) await request('/v1/groups/' + group.id + '/jenis', { contextId: jenis || null })
      if (placeId) await request('/v1/groups/' + group.id + '/contexts', { contextId: placeId })
      editing = false
      onChanged()
    })
  const removePlace = (id: string) => run(async () => { await request('/v1/groups/' + group.id + '/contexts', { contextId: id, remove: true }); onChanged() })
  async function pickLogo(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    await run(async () => {
      const image = await prepareImage(file, { side: 512, bytes: 120 * 1024 })
      await request('/v1/groups/' + group.id + '/logo', { bytes: image.encoded })
      onChanged()
    })
  }
  const sendClaim = () =>
    run(async () => {
      const body = claimMode === 'existing' ? { entry: claimEntry } : { listing: { title: claimTitle, description: claimDescription, placeId: claimPlace || null } }
      await request('/v1/groups/' + group.id + '/claims', body)
      claiming = false
      claims = await request<Claim[]>('/v1/groups/' + group.id + '/claims', undefined, undefined, true)
    })
  const decide = (id: string, approve: boolean) =>
    run(async () => {
      await request('/v1/entry-claims/' + id + '/decide', { approve })
      queue = queue.filter((c) => c.id !== id)
      onChanged()
    })
  const release = () =>
    run(async () => {
      await request('/v1/groups/' + group.id + '/claims/release', {})
      onChanged()
    })
  const link = (v: string) => (/^https:\/\//.test(v) ? v : /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v) ? 'mailto:' + v : /^\+?[0-9][0-9\s-]{6,}$/.test(v) ? 'tel:' + v.replace(/[\s-]/g, '') : '')
  const plain = (md: string) => md.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim()
  const excerpt = (md: string) => { const t = plain(md); return t.length > 420 ? t.slice(0, 400).replace(/\s+\S*$/, '') + '…' : t }
</script>

<header class="lb-head">
  <div class="lb-id">
    {#if profile.logo}<img class="lb-logo" src={profile.logo} alt={'Logo ' + group.title} width="64" height="64" />{:else}<span class="lb-logo avatar-tinted" style={avatarTone(group.id)} aria-hidden="true">{initials(group.title)}</span>{/if}
    <div>
      <h1>{group.title}</h1>
      <p class="lb-kind">{kindLine}</p>
    </div>
  </div>
  {#if group.description}<p class="lb-lede">{group.description}</p>{/if}
  {#if places.length}<div class="lb-places">{#each places as p (p.id)}<a href={'/wiki/' + p.slug}>{p.title}</a>{/each}</div>{/if}
  {#if steward || actions}<div class="lb-actions">
      {#if steward}<Button variant="outline" onclick={openEdit}><Pencil size={14} />Ubah profil</Button>{/if}
      {@render actions?.()}
    </div>{/if}
</header>

<KiosBlock owner={{ kind: 'group', id: group.id }} inline onCreate={onCreateOffer} />

<section class="lb-voice" aria-labelledby={uid + '-own'}>
  <h2 id={uid + '-own'}>Dari lembaga ini</h2>
  <p class="lb-who">Ditulis oleh pengelola {group.title}.</p>
  {#if profile.about}<div class="lb-about">{#each profile.about.split(/\n{2,}/) as para, i (i)}<p>{para}</p>{/each}</div>
  {:else if steward}<p class="lb-empty">Belum ada tulisan dari lembaga ini. Pilih Ubah profil untuk menulis tentang lembaga, kegiatan dan cara menghubungi.</p>{/if}

  {#if profile.contacts.length || profile.website}<dl class="lb-facts" aria-label="Kontak">
      {#each profile.contacts as c, i (i)}<div><dt>{c.label}</dt><dd>{#if link(c.value)}<a href={link(c.value)} rel="noreferrer">{c.value}</a>{:else}{c.value}{/if}</dd></div>{/each}
      {#if profile.website}<div><dt>Situs web</dt><dd><a href={profile.website} target="_blank" rel="noreferrer">{profile.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}<ArrowUpRight size={13} aria-hidden="true" /></a></dd></div>{/if}
    </dl>{/if}

  {#if profile.recognition.length}<div class="lb-claims">
      <h3>Pengakuan</h3>
      <ul>{#each profile.recognition as r, i (i)}<li>Lembaga ini menyatakan diakui oleh {r.by}. <a href={r.source} target="_blank" rel="noreferrer">Lihat sumbernya<ArrowUpRight size={12} aria-hidden="true" /></a></li>{/each}</ul>
      <p>ETNOS tidak memeriksa atau memberi pengakuan. Setiap pernyataan di sini memakai sumber yang dipilih lembaga.</p>
    </div>{/if}

  <div class="lb-rooms">
    <h3>Komunitas</h3>
    {#each group.spaces as s (s.id)}<a class="lb-room" href={'/communities/' + s.id}>
        <span class="cx-avatar sage small avatar-tinted" style={avatarTone(s.id)} aria-hidden="true">{initials(s.title)}</span>
        <span><strong>{s.title}</strong><small>{#if s.visibility === 'public'}<Globe size={12} aria-hidden="true" />Publik{:else}<LockKeyhole size={12} aria-hidden="true" />Khusus anggota{/if}</small></span>
      </a>{/each}
    {#if group.hiddenSpaces}<p class="lb-hidden"><LockKeyhole size={14} aria-hidden="true" />{group.spaces.length ? 'Lembaga ini juga punya' : 'Lembaga ini punya'} {group.hiddenSpaces} komunitas tertutup. Isinya hanya untuk anggota, dan namanya tidak ditampilkan.</p>{/if}
    {#if !group.spaces.length && !group.hiddenSpaces}<p class="lb-empty">Belum ada komunitas yang terbuka untuk umum.</p>{/if}
  </div>
  {#if steward}<p class="lb-empty">Situs lembaga dengan alamat sendiri di etnos.space belum tersedia.</p>{/if}
</section>

<section class="lb-voice lb-encyclopedia" aria-labelledby={uid + '-ens'}>
  <h2 id={uid + '-ens'}>Di ensiklopedia</h2>
  {#if group.entry}
    <p class="lb-who">Bagian ini disusun lewat tinjauan biasa. Lembaga tidak mengubahnya sendiri.</p>
    {#if entry}
      <a class="lb-entry" href={'/wiki/' + encodeURIComponent(entry.slug)}>
        <span><strong>{entry.title}</strong><small>{entry.kindLabel}{entry.sub ? ' · ' + entry.sub.label : ''}{entry.place ? ' · ' + entry.place.title : ''}</small></span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </a>
      {#if entry.article}<div class="lb-article">
          <p>{excerpt(entry.article.text)}</p>
          <p class="lb-by">{entry.article.review === 'unreviewed' ? 'Belum ditinjau' : entry.article.reviewer ? 'Ditinjau ' + entry.article.reviewer.name : 'Diterima'} · {relativeDate(entry.article.created)} · {entry.article.citations.length} sumber</p>
        </div>
      {:else}<p class="lb-empty">{entry.description || 'Belum ada tulisan yang sudah diperiksa tentang ' + entry.title + '.'}</p>{/if}
      {#if entry.facts.length}<dl class="lb-facts">{#each entry.facts as f (f.label)}<div><dt>{f.label}</dt><dd>{f.value}</dd></div>{/each}</dl>{/if}
      <div class="lb-row-actions">
        <Button variant="outline" size="sm" href={'/wiki/' + encodeURIComponent(entry.slug)}><BookOpen size={15} />Buka entri</Button>
        {#if steward || operator}<Button variant="ghost" size="sm" disabled={busy} onclick={release}>Lepaskan entri</Button>{/if}
      </div>
    {/if}
  {:else if pending}
    <div class="lb-pending" role="status">
      <p><strong>Permintaan menunggu persetujuan pengelola situs.</strong> {pending.entry ? 'Entri ' + pending.entry : 'Entri baru ' + (pending.proposal?.title ?? '')} akan terhubung dengan lembaga ini setelah disetujui.</p>
      {#if operator}<div class="lb-row-actions">
          <Button size="sm" disabled={busy} onclick={() => decide(pending!.id, true)}><Check size={15} />Setujui</Button>
          <Button variant="outline" size="sm" disabled={busy} onclick={() => decide(pending!.id, false)}><X size={15} />Tolak</Button>
        </div>{:else if steward}<Button variant="ghost" size="sm" disabled={busy} onclick={release}>Tarik permintaan</Button>{/if}
    </div>
  {:else if steward && group.visibility === 'public'}
    <p class="lb-empty">Lembaga ini belum terhubung dengan entri ensiklopedia. Hubungkan dengan entri yang sudah ada, atau minta entri baru. Isi entri tetap diperiksa lewat tinjauan biasa.</p>
    <div class="lb-row-actions"><Button variant="outline" size="sm" onclick={openClaim}><Link2 size={15} />Hubungkan ke entri</Button></div>
  {:else}<p class="lb-empty">Lembaga ini belum terhubung dengan entri ensiklopedia.</p>{/if}
  {#if problem && !editing && !claiming}<p class="lb-problem" role="alert">{problem}</p>{/if}
</section>

<Dialog.Root bind:open={editing}>
  <Dialog.Content class="platform-dialog lb-dialog">
    <Dialog.Header>
      <Dialog.Title>Ubah profil lembaga</Dialog.Title>
      <Dialog.Description>Bagian ini tampil sebagai Dari lembaga ini. Isi ensiklopedia tidak berubah dari sini.</Dialog.Description>
    </Dialog.Header>
    <form class="cx-form lb-form" onsubmit={(e) => { e.preventDefault(); void saveProfile() }}>
      <div class="lb-logo-field">
        {#if profile.logo}<img class="lb-logo" src={profile.logo} alt="" width="56" height="56" />{:else}<span class="lb-logo avatar-tinted" style={avatarTone(group.id)} aria-hidden="true">{initials(group.title)}</span>{/if}
        <label class="lb-file">Ganti logo atau foto<input type="file" accept="image/jpeg,image/png,image/webp" onchange={pickLogo} disabled={busy} /></label>
      </div>
      {#if group.visibility === 'public'}<Label for={uid + '-jenis'}>Jenis lembaga</Label>
        <Choice id={uid + '-jenis'} bind:value={jenis} items={[{ value: '', label: 'Belum dipilih' }, ...jenisChoices.map((j) => ({ value: j.id, label: j.title }))]} />{/if}
      <Label for={uid + '-about'}>Tentang lembaga</Label>
      <Textarea id={uid + '-about'} bind:value={about} rows={6} maxlength={4000} placeholder="Siapa kalian, apa yang kalian kerjakan dan di mana." />
      <fieldset class="lb-rows">
        <legend>Kontak</legend>
        {#each contactRows as c, i (i)}<div class="lb-pair">
            <Input aria-label="Jenis kontak" bind:value={c.label} maxlength={40} placeholder="Kantor, telepon, surel" />
            <Input aria-label="Isi kontak" bind:value={c.value} maxlength={200} placeholder="Alamat atau nomor" />
            <Button type="button" variant="ghost" size="sm" aria-label="Hapus kontak" onclick={() => (contactRows = contactRows.filter((_, j) => j !== i))}><X size={15} /></Button>
          </div>{/each}
        {#if contactRows.length < 6}<Button type="button" variant="ghost" size="sm" onclick={() => (contactRows = [...contactRows, { label: '', value: '' }])}>Tambah kontak</Button>{/if}
      </fieldset>
      <Label for={uid + '-web'}>Situs web</Label>
      <Input id={uid + '-web'} type="url" bind:value={website} maxlength={2048} placeholder="https://" />
      <fieldset class="lb-rows">
        <legend>Pengakuan</legend>
        <p class="lb-hint">Tulis siapa yang mengakui lembaga ini, misalnya dewan adat, dengan tautan ke suratnya atau beritanya. Pengakuan tanpa sumber tidak disimpan.</p>
        {#each recognitionRows as r, i (i)}<div class="lb-pair">
            <Input aria-label="Diakui oleh" bind:value={r.by} maxlength={120} placeholder="Diakui oleh" />
            <Input aria-label="Tautan sumber" type="url" bind:value={r.source} maxlength={2048} placeholder="https://" />
            <Button type="button" variant="ghost" size="sm" aria-label="Hapus pengakuan" onclick={() => (recognitionRows = recognitionRows.filter((_, j) => j !== i))}><X size={15} /></Button>
          </div>{/each}
        {#if recognitionRows.length < 5}<Button type="button" variant="ghost" size="sm" onclick={() => (recognitionRows = [...recognitionRows, { by: '', source: '' }])}>Tambah pengakuan</Button>{/if}
      </fieldset>
      {#if group.visibility === 'public'}<fieldset class="lb-rows">
          <legend>Tempat</legend>
          {#each places as p (p.id)}<div class="lb-held"><span>{p.title}</span><Button type="button" variant="ghost" size="sm" disabled={busy} onclick={() => removePlace(p.id)}>Lepas</Button></div>{/each}
          <Choice aria-label="Tambah tempat" bind:value={placeId} items={[{ value: '', label: 'Tambah tempat' }, ...placeChoices.filter((c) => !places.some((p) => p.id === c.id)).map((c) => ({ value: c.id, label: c.title }))]} />
        </fieldset>{/if}
      <label class="lb-switch"><Switch bind:checked={hideCount} /><span><strong>Sembunyikan jumlah komunitas tertutup</strong><small>Tanpa ini, halaman menyebut berapa komunitas tertutup yang dimiliki lembaga, tanpa namanya.</small></span></label>
      {#if problem}<p class="lb-problem" role="alert">{problem}</p>{/if}
      <div class="lb-dialog-actions"><Button type="button" variant="ghost" onclick={() => (editing = false)}>Batal</Button><Button type="submit" disabled={busy}>Simpan</Button></div>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={claiming}>
  <Dialog.Content class="platform-dialog lb-dialog">
    <Dialog.Header>
      <Dialog.Title>Hubungkan ke entri</Dialog.Title>
      <Dialog.Description>Pengelola situs memeriksa permintaan ini. Setelah disetujui, entri menampilkan Dikelola oleh {group.title}. Satu entri hanya dikelola satu lembaga.</Dialog.Description>
    </Dialog.Header>
    <form class="cx-form lb-form" onsubmit={(e) => { e.preventDefault(); void sendClaim() }}>
      {#if lembagaEntries.length}<div class="lb-modes" role="radiogroup" aria-label="Pilihan entri">
          <button type="button" role="radio" aria-checked={claimMode === 'existing'} onclick={() => (claimMode = 'existing')}>Entri yang sudah ada</button>
          <button type="button" role="radio" aria-checked={claimMode === 'new'} onclick={() => (claimMode = 'new')}>Entri baru</button>
        </div>{/if}
      {#if claimMode === 'existing'}
        <Label for={uid + '-entry'}>Entri lembaga</Label>
        <Choice id={uid + '-entry'} bind:value={claimEntry} required items={[{ value: '', label: 'Pilih entri' }, ...lembagaEntries.map((e) => ({ value: e.slug, label: e.title }))]} />
      {:else}
        <p class="lb-hint">Entri baru tampil di ensiklopedia sebagai entri lembaga dengan nama, keterangan singkat dan tempatnya. Tulisan lengkapnya ditulis dan diperiksa seperti entri lain.</p>
        <Label for={uid + '-ct'}>Nama entri</Label>
        <Input id={uid + '-ct'} bind:value={claimTitle} maxlength={100} required />
        <Label for={uid + '-cd'}>Keterangan singkat</Label>
        <Textarea id={uid + '-cd'} bind:value={claimDescription} rows={3} maxlength={600} required />
        <Label for={uid + '-cp'}>Tempat</Label>
        <Choice id={uid + '-cp'} bind:value={claimPlace} items={[{ value: '', label: 'Belum dipilih' }, ...placeChoices.map((c) => ({ value: c.id, label: c.title }))]} />
      {/if}
      {#if problem}<p class="lb-problem" role="alert">{problem}</p>{/if}
      <div class="lb-dialog-actions"><Button type="button" variant="ghost" onclick={() => (claiming = false)}>Batal</Button><Button type="submit" disabled={busy || (claimMode === 'existing' ? !claimEntry : !claimTitle.trim() || !claimDescription.trim())}>Kirim permintaan</Button></div>
    </form>
  </Dialog.Content>
</Dialog.Root>

<style>
  .lb-head { display: grid; gap: 12px; padding: 24px var(--gutter, 24px) 20px; border-bottom: 1px solid var(--border); }
  .lb-id { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .lb-id > div { min-width: 0; }
  .lb-logo { display: inline-grid; place-items: center; flex: none; width: 64px; height: 64px; border-radius: 16px; object-fit: cover; font-size: 20px; font-weight: 800; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  h1 { margin: 0; font-size: 24px; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; overflow-wrap: anywhere; }
  .lb-kind { margin: 4px 0 0; font-size: 13.5px; color: var(--muted-foreground); }
  .lb-lede { margin: 0; font-size: 15px; line-height: 1.55; max-width: 68ch; }
  .lb-places { display: flex; flex-wrap: wrap; gap: 6px; }
  .lb-places a { display: inline-flex; align-items: center; min-height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; font-size: 13px; color: var(--foreground); text-decoration: none; }
  .lb-places a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .lb-actions, .lb-row-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .lb-voice { display: grid; gap: 12px; padding: 26px var(--gutter, 24px) 24px; border-bottom: 1px solid var(--border); }
  .lb-voice h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.15; }
  .lb-voice h3 { margin: 6px 0 0; font-size: 14px; font-weight: 650; }
  .lb-who { margin: -6px 0 0; font-size: 13.5px; color: var(--muted-foreground); }
  .lb-about p, .lb-article p { margin: 0 0 10px; font-size: 15px; line-height: 1.55; max-width: 68ch; }
  .lb-about p:last-child { margin-bottom: 0; }
  .lb-empty { margin: 0; font-size: 14.5px; line-height: 1.5; color: var(--muted-foreground); max-width: 68ch; }
  .lb-facts { display: grid; margin: 0; }
  .lb-facts > div { display: grid; gap: 2px; padding: 10px 0; border-top: 1px solid var(--border); }
  .lb-facts > div:last-child { border-bottom: 1px solid var(--border); }
  @media (min-width: 640px) { .lb-facts > div { grid-template-columns: 150px minmax(0, 1fr); gap: 16px; } }
  .lb-facts dt { font-size: 13.5px; color: var(--muted-foreground); }
  .lb-facts dd { margin: 0; font-size: 15px; line-height: 1.5; overflow-wrap: anywhere; }
  .lb-facts a, .lb-claims a { color: inherit; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in oklab, currentColor 35%, transparent); display: inline-flex; align-items: center; gap: 3px; }
  .lb-claims { display: grid; gap: 6px; }
  .lb-claims ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; font-size: 14.5px; line-height: 1.45; }
  .lb-claims p { margin: 0; font-size: 13px; color: var(--muted-foreground); }
  .lb-rooms { display: grid; }
  .lb-room { display: flex; align-items: center; gap: 12px; min-height: 56px; margin: 0 calc(var(--gutter, 24px) * -1); padding: 6px var(--gutter, 24px); color: inherit; text-decoration: none; }
  .lb-room:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .lb-room > span:last-child { display: grid; min-width: 0; }
  .lb-room strong { font-size: 15.5px; font-weight: 700; overflow-wrap: anywhere; }
  .lb-room small { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted-foreground); }
  .lb-hidden { display: flex; gap: 8px; align-items: flex-start; margin: 8px 0 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .lb-hidden :global(svg) { flex: none; margin-top: 2px; }
  .lb-entry { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 16px; background: color-mix(in oklab, var(--foreground) 3%, transparent); color: inherit; text-decoration: none; }
  .lb-entry:hover { background: color-mix(in oklab, var(--foreground) 6%, transparent); }
  .lb-entry > span { display: grid; gap: 2px; min-width: 0; }
  .lb-entry strong { font-size: 16px; font-weight: 700; }
  .lb-entry small { font-size: 13.5px; color: var(--muted-foreground); }
  .lb-by { font-size: 13.5px !important; color: var(--muted-foreground); }
  .lb-pending { display: grid; gap: 10px; padding: 14px 16px; border-radius: 16px; background: color-mix(in oklab, var(--brand) 8%, transparent); }
  .lb-pending p { margin: 0; font-size: 14.5px; line-height: 1.5; }
  .lb-problem { margin: 0; font-size: 14px; color: var(--destructive); }
  .lb-form { display: grid; gap: 10px; }
  .lb-rows { display: grid; gap: 8px; margin: 0; padding: 0; border: 0; }
  .lb-rows legend { margin-bottom: 6px; font-size: 14px; font-weight: 500; }
  .lb-pair { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) auto; gap: 6px; }
  .lb-held { display: flex; align-items: center; justify-content: space-between; min-height: 40px; font-size: 14.5px; }
  .lb-hint { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .lb-logo-field { display: flex; align-items: center; gap: 12px; }
  .lb-logo-field .lb-logo { width: 56px; height: 56px; }
  .lb-file { position: relative; display: inline-flex; align-items: center; min-height: 40px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; font-size: 14px; font-weight: 550; cursor: pointer; }
  .lb-file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .lb-file:focus-within { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .lb-switch { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
  .lb-switch span { display: grid; gap: 2px; }
  .lb-switch strong { font-size: 14.5px; font-weight: 600; }
  .lb-switch small { font-size: 13px; color: var(--muted-foreground); }
  .lb-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
  .lb-modes { display: inline-flex; gap: 6px; }
  .lb-modes button { min-height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; background: none; color: var(--foreground); font: inherit; font-size: 13.5px; font-weight: 550; cursor: pointer; }
  .lb-modes button[aria-checked='true'] { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  :global(.lb-dialog) { max-height: 90dvh; overflow-y: auto; }
  @media (max-width: 639px) {
    .lb-head, .lb-voice { --gutter: 16px; }
    h1 { font-size: 22px; }
    .lb-pair { grid-template-columns: minmax(0, 1fr) auto; }
    .lb-pair > :global(:first-child) { grid-column: 1 / -1; }
  }
</style>
