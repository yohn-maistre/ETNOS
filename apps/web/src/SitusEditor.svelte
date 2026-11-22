<script lang="ts">
  // The Situs editor (docs/plan/one-page-system-2026-11-21.md §8) at /groups/:id/situs. Stewards choose a
  // template and colours, order the blocks and fill them from what the lembaga already shows in public, preview
  // the saved draft, publish versions and download situs.yaml and lembaga.yaml. The node operator switches
  // situs_aktif here; without it a steward can draft and preview, not publish. The page itself is rendered by the
  // server (src/situs-render.ts); the preview frame shows exactly that page.
  import { untrack } from 'svelte'
  import { ArrowLeft, ArrowUp, ArrowDown, X, Plus, Download, ExternalLink, Check, RotateCcw, Eye, Globe } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Switch } from '$lib/components/ui/switch/index.js'
  import Choice from './Choice.svelte'
  import ContentSkeleton from './ContentSkeleton.svelte'
  import { request, type Auth } from './api'
  import { notify } from './notifications.svelte'

  type Block = { id: string; type: string; title?: string; text?: string; image?: 'cover' | 'logo' | 'none'; limit?: number; images?: string[] }
  type Config = { version: 1; name?: string; template: string; theme: { primary: string; accent: string; fonts: string }; navigation?: { block: string; label: string }[]; blocks: Block[] }
  type Picture = { id: string; alt: string; width: number; height: number; url: string; post_id: string }
  type State = {
    group: { id: string; title: string }
    name: string | null
    suggestedName: string
    draft: Config
    saved: boolean
    active: boolean
    published: number | null
    versions: { version: number; name: string; created: number; by: string }[]
    canManage: boolean
    canActivate: boolean
    sources: { pictures: Picture[]; communities: { id: string; title: string; description: string }[]; shownCommunities: string[] | null; cover: string | null; logo: boolean; posts: number; kios: boolean }
    choices: { templates: { id: string; label: string; note: string }[]; palette: { id: string; label: string; light: string; dark: string }[]; fonts: { id: string; label: string }[]; blocks: { type: string; label: string }[] }
  }
  let { groupId, auth }: { groupId: string; auth: Auth } = $props()
  const uid = $props.id()

  let st = $state<State | null>(null),
    error = $state(''),
    problem = $state(''),
    busy = $state(false),
    dirty = $state(false),
    open = $state<string | null>(null),
    view = $state<'draft' | 'published'>('draft'),
    pane = $state<'edit' | 'preview'>('edit'),
    frameKey = $state(0)
  // The form, a copy of the server state until Simpan draf.
  let name = $state(''),
    template = $state('editorial'),
    primary = $state('hutan'),
    accent = $state('kunyit'),
    fonts = $state('newsreader'),
    blocks = $state<(Block & { nav: boolean; navLabel: string })[]>([]),
    cover = $state<string | null>(null),
    shown = $state<string[] | null>(null)

  const host = typeof location === 'undefined' ? 'etnos.space' : location.host
  const label = (type: string) => st?.choices.blocks.find((b) => b.type === type)?.label ?? type
  const missingTypes = $derived(st ? st.choices.blocks.filter((b) => !blocks.some((x) => x.type === b.type)) : [])
  const address = $derived(st?.name ? '/situs/' + st.name : '')
  const previewSrc = $derived(address ? address + (view === 'draft' ? '?versi=draf' : '') + '#k' + frameKey : '')
  const status = $derived(!st ? '' : st.published ? 'Terbit, versi ' + st.published : st.active ? 'Aktif, belum terbit' : st.saved ? 'Draf, belum diaktifkan' : 'Belum dibuat')

  function fill(s: State) {
    st = s
    const d = s.draft
    name = s.name ?? s.suggestedName
    template = d.template
    primary = d.theme.primary
    accent = d.theme.accent
    fonts = d.theme.fonts
    blocks = d.blocks.map((b) => {
      const n = d.navigation?.find((x) => x.block === b.id)
      return { ...b, images: b.images ? [...b.images] : undefined, nav: !!n, navLabel: n?.label ?? b.title ?? label(b.type) }
    })
    cover = s.sources.cover
    shown = s.sources.shownCommunities ? [...s.sources.shownCommunities] : null
    dirty = false
  }
  async function load() {
    error = ''
    try {
      fill(await request<State>('/v1/groups/' + groupId + '/situs/state'))
    } catch (e) {
      error = e instanceof Error ? e.message : 'Situs belum dapat dimuat.'
    }
  }
  $effect(() => {
    void groupId
    void auth.actor?.id
    untrack(() => void load())
  })
  const touch = () => (dirty = true)
  function config(): Config {
    const clean = blocks.map(({ nav: _n, navLabel: _l, ...b }) => {
      const out: Block = { id: b.id, type: b.type }
      if (b.title?.trim()) out.title = b.title.trim()
      if (b.type === 'hero') {
        if (b.text?.trim()) out.text = b.text.trim()
        out.image = b.image ?? 'cover'
      }
      if (b.type === 'kegiatan') out.limit = b.limit ?? 6
      if (b.type === 'galeri') out.images = b.images ?? []
      return out
    })
    return {
      version: 1,
      template,
      theme: { primary, accent, fonts },
      navigation: blocks.filter((b) => b.nav && b.type !== 'hero').map((b) => ({ block: b.id, label: (b.navLabel || label(b.type)).trim().slice(0, 30) })),
      blocks: clean,
    }
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return
    busy = true
    problem = ''
    try {
      await fn()
    } catch (e) {
      problem = e instanceof Error ? e.message : 'Belum berhasil.'
    } finally {
      busy = false
    }
  }
  const saveNow = async () => {
    const body: Record<string, unknown> = { config: config(), cover, communities: shown }
    if (!st?.active) body.name = name.trim().toLowerCase()
    fill(await request<State>('/v1/groups/' + groupId + '/situs', body))
    frameKey++
  }
  const save = () => run(async () => { await saveNow(); notify('Draf disimpan.') })
  const publish = () =>
    run(async () => {
      if (dirty || !st?.saved) await saveNow()
      fill(await request<State>('/v1/groups/' + groupId + '/situs/publish', {}))
      view = 'published'
      frameKey++
      notify('Situs diterbitkan.')
    })
  const unpublish = () =>
    run(async () => {
      fill(await request<State>('/v1/groups/' + groupId + '/situs/unpublish', {}))
      view = 'draft'
      frameKey++
      notify('Situs ditarik. Alamatnya tidak menampilkan apa-apa lagi.')
    })
  const setActive = (active: boolean) =>
    run(async () => {
      fill(await request<State>('/v1/groups/' + groupId + '/situs/active', { active }))
      notify(active ? 'Situs diaktifkan. Pengelola lembaga bisa menerbitkannya.' : 'Situs dinonaktifkan. Versi yang terbit tetap tampil.')
    })
  const restore = (version: number) =>
    run(async () => {
      fill(await request<State>('/v1/groups/' + groupId + '/situs/restore', { version }))
      view = 'draft'
      frameKey++
      notify('Versi ' + version + ' menjadi draf.')
    })
  const download = (file: string, text: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/yaml' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: file })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const exportFiles = () =>
    run(async () => {
      const f = await request<{ name: string; situs: string; lembaga: string }>('/v1/groups/' + groupId + '/situs/export')
      download('situs.yaml', f.situs)
      download('lembaga.yaml', f.lembaga)
    })
  function move(i: number, by: number) {
    const j = i + by
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    blocks = next
    touch()
  }
  function add(type: string) {
    blocks = [...blocks, { id: type, type, nav: false, navLabel: label(type), ...(type === 'galeri' ? { images: [] } : {}), ...(type === 'kegiatan' ? { limit: 6 } : {}), ...(type === 'hero' ? { image: 'cover' as const } : {}) }]
    open = type
    touch()
  }
  function toggleImage(b: Block, id: string) {
    const ref = 'media:' + id
    b.images = b.images?.includes(ref) ? b.images.filter((x) => x !== ref) : [...(b.images ?? []), ref].slice(0, 24)
    touch()
  }
  function toggleCommunity(id: string) {
    const all = st?.sources.communities.map((c) => c.id) ?? []
    const now = shown ?? all
    shown = now.includes(id) ? now.filter((x) => x !== id) : [...now, id]
    if (shown.length === all.length && all.every((x) => shown!.includes(x))) shown = null
    touch()
  }
  const hint: Record<string, string> = {
    hero: 'Nama lembaga, kalimat pendek dan foto sampul atau logo.',
    tentang: 'Tulisan dari Ubah profil, dengan jenis, tempat dan bahasa.',
    kegiatan: 'Posting terbaru anggota di komunitas publik lembaga.',
    galeri: 'Foto pilihan dari posting publik lembaga.',
    publikasi: 'Entri ensiklopedia yang dikelola lembaga dan halaman dari komunitasnya.',
    komunitas: 'Komunitas publik lembaga.',
    kios: 'Penawaran di Kios lembaga, bila Kios dibuka.',
    kontak: 'Kontak dan situs web dari Ubah profil.',
  }
</script>

{#if error}<div class="etnos-card"><h1>Situs belum tersedia</h1><p role="alert" class="cx-hint">{error}</p><Button variant="outline" href={'/groups/' + groupId}>Kembali ke lembaga</Button></div>
{:else if !st}<ContentSkeleton />
{:else}
  <div class="se">
    <header class="se-head">
      <a class="se-back" href={'/groups/' + st.group.id}><ArrowLeft size={16} aria-hidden="true" />{st.group.title}</a>
      <div class="se-title">
        <h1>Situs</h1>
        <span class="se-status" class:live={!!st.published}>{status}</span>
      </div>
      <p class="se-lede">Situs adalah halaman web lembaga dengan alamat sendiri. Isinya diambil dari data publik lembaga di ETNOS, jadi tidak perlu ditulis dua kali.</p>
      {#if st.published && st.name}<a class="se-address" href={'/situs/' + st.name} target="_blank" rel="noreferrer"><Globe size={15} aria-hidden="true" />{host}/situs/{st.name}<ExternalLink size={13} aria-hidden="true" /></a>{/if}
    </header>

    {#if st.canActivate}
      <section class="se-operator" aria-labelledby={uid + '-op'}>
        <label class="se-switch">
          <Switch checked={st.active} disabled={busy || !st.saved} onCheckedChange={(v) => setActive(v)} aria-labelledby={uid + '-op'} />
          <span><strong id={uid + '-op'}>Situs aktif</strong><small>{st.saved ? 'Hanya pengelola ETNOS yang bisa mengubah ini. Pembayaran, bila ada, diatur di luar ETNOS. Bila dimatikan, versi yang sudah terbit tetap tampil.' : 'Lembaga ini belum menyimpan draf situs.'}</small></span>
        </label>
        {#if st.published}<Button variant="ghost" size="sm" disabled={busy} onclick={unpublish}>Tarik situs</Button>{/if}
      </section>
    {/if}
    {#if !st.active && st.canManage}<p class="se-note" role="status">Situs ini belum diaktifkan. Draf dan pratinjau bisa dipakai sekarang. Untuk menerbitkan, situs perlu diaktifkan oleh pengelola {host}.</p>{/if}

    <div class="se-panes" role="tablist" aria-label="Situs">
      <button role="tab" aria-selected={pane === 'edit'} onclick={() => (pane = 'edit')}>Atur</button>
      <button role="tab" aria-selected={pane === 'preview'} onclick={() => (pane = 'preview')}>Pratinjau</button>
    </div>

    <div class="se-grid">
      <div class="se-form" class:hide={pane !== 'edit'}>
        {#if st.canManage}
          <section class="se-sec" aria-labelledby={uid + '-addr'}>
            <h2 id={uid + '-addr'}>Alamat</h2>
            <div class="se-name">
              <span class="se-prefix" aria-hidden="true">{host}/situs/</span>
              <Input id={uid + '-name'} aria-label="Nama alamat" bind:value={name} oninput={touch} maxlength={20} disabled={st.active} autocomplete="off" spellcheck="false" />
            </div>
            <p class="se-hint">{st.active ? 'Nama alamat tidak bisa diubah setelah situs diaktifkan.' : '3 sampai 20 huruf kecil, angka atau tanda hubung. Nama yang sama bisa menjadi alamat ' + name + '.' + host.replace(/^www\./, '') + ' setelah fitur itu dinyalakan.'}</p>
          </section>

          <section class="se-sec" aria-labelledby={uid + '-look'}>
            <h2 id={uid + '-look'}>Tampilan</h2>
            <div class="se-templates" role="radiogroup" aria-label="Templat">
              {#each st.choices.templates as t (t.id)}
                <button type="button" role="radio" aria-checked={template === t.id} class="se-template" onclick={() => { template = t.id; touch() }}>
                  <span class="se-mini" data-t={t.id} aria-hidden="true"><i></i><i></i><i></i></span>
                  <span><strong>{t.label}</strong><small>{t.note}</small></span>
                  {#if template === t.id}<Check size={16} aria-hidden="true" />{/if}
                </button>
              {/each}
            </div>
            {#each [{ key: 'primary', title: 'Warna utama' }, { key: 'accent', title: 'Warna aksen' }] as row (row.key)}
              <div class="se-field">
                <span class="se-label" id={uid + '-' + row.key}>{row.title}</span>
                <div class="se-swatches" role="radiogroup" aria-labelledby={uid + '-' + row.key}>
                  {#each st.choices.palette as p (p.id)}
                    {@const on = (row.key === 'primary' ? primary : accent) === p.id}
                    <button type="button" role="radio" aria-checked={on} aria-label={p.label} title={p.label} class="se-swatch" style:--sw-l={p.light} style:--sw-d={p.dark} onclick={() => { if (row.key === 'primary') primary = p.id; else accent = p.id; touch() }}>{#if on}<Check size={14} aria-hidden="true" />{/if}</button>
                  {/each}
                </div>
              </div>
            {/each}
            <div class="se-field">
              <Label for={uid + '-fonts'}>Huruf</Label>
              <Choice id={uid + '-fonts'} bind:value={fonts} onchange={touch} items={st.choices.fonts.map((f) => ({ value: f.id, label: f.label }))} />
            </div>
          </section>

          <section class="se-sec" aria-labelledby={uid + '-blocks'}>
            <h2 id={uid + '-blocks'}>Blok</h2>
            <p class="se-hint">Urutan blok adalah urutan di situs. Blok tanpa isi tidak tampil.</p>
            <ol class="se-blocks">
              {#each blocks as b, i (b.id)}
                <li class="se-block" class:open={open === b.id}>
                  <div class="se-block-row">
                    <button type="button" class="se-block-name" aria-expanded={open === b.id} onclick={() => (open = open === b.id ? null : b.id)}>
                      <strong>{b.title?.trim() || label(b.type)}</strong><small>{hint[b.type]}</small>
                    </button>
                    <div class="se-block-tools">
                      <Button variant="ghost" size="icon" aria-label={'Naikkan ' + label(b.type)} disabled={i === 0} onclick={() => move(i, -1)}><ArrowUp size={16} /></Button>
                      <Button variant="ghost" size="icon" aria-label={'Turunkan ' + label(b.type)} disabled={i === blocks.length - 1} onclick={() => move(i, 1)}><ArrowDown size={16} /></Button>
                      <Button variant="ghost" size="icon" aria-label={'Hapus ' + label(b.type)} disabled={blocks.length === 1} onclick={() => { blocks = blocks.filter((x) => x.id !== b.id); touch() }}><X size={16} /></Button>
                    </div>
                  </div>
                  {#if open === b.id}
                    <div class="se-block-body">
                      <Label for={uid + b.id + '-t'}>Judul blok</Label>
                      <Input id={uid + b.id + '-t'} bind:value={b.title} oninput={touch} maxlength={80} placeholder={b.type === 'hero' ? st.group.title : label(b.type)} />
                      {#if b.type === 'hero'}
                        <Label for={uid + b.id + '-x'}>Kalimat pendek</Label>
                        <Textarea id={uid + b.id + '-x'} bind:value={b.text} oninput={touch} rows={2} maxlength={300} placeholder="Bila kosong, keterangan singkat lembaga yang dipakai." />
                        <Label for={uid + b.id + '-i'}>Gambar</Label>
                        <Choice id={uid + b.id + '-i'} value={b.image ?? 'cover'} onchange={(v) => { b.image = v as Block['image']; touch() }} items={[{ value: 'cover', label: 'Foto sampul' }, { value: 'logo', label: 'Logo' }, { value: 'none', label: 'Tanpa gambar' }]} />
                        {#if (b.image ?? 'cover') === 'cover'}
                          <span class="se-label">Foto sampul</span>
                          {#if st.sources.pictures.length}<div class="se-pics" role="radiogroup" aria-label="Foto sampul">
                              {#each st.sources.pictures as p (p.id)}<button type="button" role="radio" aria-checked={cover === p.id} class="se-pic" onclick={() => { cover = cover === p.id ? null : p.id; touch() }}><img src={p.url} alt={p.alt} loading="lazy" />{#if cover === p.id}<span class="se-tick"><Check size={14} /></span>{/if}</button>{/each}
                            </div>{:else}<p class="se-hint">Belum ada foto di posting publik lembaga. Foto sampul diambil dari foto yang dibagikan anggota di komunitas publik lembaga.</p>{/if}
                        {/if}
                      {:else if b.type === 'kegiatan'}
                        <Label for={uid + b.id + '-n'}>Jumlah posting</Label>
                        <Choice id={uid + b.id + '-n'} value={String(b.limit ?? 6)} onchange={(v) => { b.limit = Number(v); touch() }} items={[3, 6, 9, 12].map((n) => ({ value: String(n), label: n + ' posting terbaru' }))} />
                        <p class="se-hint">{st.sources.posts ? 'Posting yang disembunyikan, dihapus, atau diberi peringatan isi tidak pernah tampil.' : 'Belum ada posting publik dari anggota lembaga.'}</p>
                      {:else if b.type === 'galeri'}
                        <span class="se-label">Pilih foto ({b.images?.length ?? 0} dipilih)</span>
                        {#if st.sources.pictures.length}<div class="se-pics" role="group" aria-label="Foto galeri">
                            {#each st.sources.pictures as p (p.id)}{@const on = b.images?.includes('media:' + p.id)}<button type="button" aria-pressed={on} class="se-pic" onclick={() => toggleImage(b, p.id)}><img src={p.url} alt={p.alt} loading="lazy" />{#if on}<span class="se-tick"><Check size={14} /></span>{/if}</button>{/each}
                          </div>{:else}<p class="se-hint">Belum ada foto di posting publik lembaga.</p>{/if}
                      {:else if b.type === 'komunitas'}
                        <span class="se-label">Komunitas yang ditampilkan</span>
                        {#if st.sources.communities.length}<div class="se-checks">
                            {#each st.sources.communities as c (c.id)}<label class="se-check"><input type="checkbox" checked={(shown ?? st.sources.communities.map((x) => x.id)).includes(c.id)} onchange={() => toggleCommunity(c.id)} /><span>{c.title}</span></label>{/each}
                          </div>
                          <p class="se-hint">Komunitas khusus anggota dan komunitas tertutup tidak pernah tampil di situs.</p>
                        {:else}<p class="se-hint">Lembaga ini belum punya komunitas publik.</p>{/if}
                      {:else if b.type === 'kios'}
                        <p class="se-hint">{st.sources.kios ? 'Kios lembaga terbuka. Penawaran yang masih berlaku tampil di sini.' : 'Kios lembaga belum dibuka, jadi blok ini belum tampil.'}</p>
                      {/if}
                      {#if b.type !== 'hero'}<label class="se-check"><input type="checkbox" bind:checked={b.nav} onchange={touch} /><span>Tampilkan di navigasi</span></label>
                        {#if b.nav}<Input aria-label="Label navigasi" bind:value={b.navLabel} oninput={touch} maxlength={30} />{/if}{/if}
                    </div>
                  {/if}
                </li>
              {/each}
            </ol>
            {#if missingTypes.length}<div class="se-add">
                <span class="se-label">Tambah blok</span>
                <div class="se-add-row">{#each missingTypes as t (t.type)}<button type="button" class="se-chip" onclick={() => add(t.type)}><Plus size={14} aria-hidden="true" />{t.label}</button>{/each}</div>
              </div>{/if}
          </section>

          {#if problem}<p class="se-problem" role="alert">{problem}</p>{/if}
          <div class="se-actions">
            <span class="se-dirty" aria-live="polite">{dirty ? 'Ada perubahan yang belum disimpan.' : st.saved ? 'Draf tersimpan.' : ''}</span>
            <Button variant="outline" disabled={busy} onclick={save}>Simpan draf</Button>
            <Button disabled={busy || !st.active} onclick={publish}>{st.published ? 'Terbitkan versi baru' : 'Terbitkan'}</Button>
          </div>

          <section class="se-sec" aria-labelledby={uid + '-ver'}>
            <h2 id={uid + '-ver'}>Versi</h2>
            {#if st.versions.length}<ul class="se-versions">
                {#each st.versions as v (v.version)}<li>
                    <span><strong>Versi {v.version}</strong>{#if st.published === v.version}<span class="se-tag">Sedang tampil</span>{/if}<small>{new Date(v.created).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}{v.by ? ' oleh ' + v.by : ''}</small></span>
                    <Button variant="ghost" size="sm" disabled={busy} onclick={() => restore(v.version)}><RotateCcw size={14} />Jadikan draf</Button>
                  </li>{/each}
              </ul>
              {#if st.published}<div class="se-row-end"><Button variant="ghost" size="sm" disabled={busy} onclick={unpublish}>Tarik situs</Button></div>{/if}
            {:else}<p class="se-hint">Setiap kali situs diterbitkan, versi baru tersimpan di sini. Versi lama bisa dijadikan draf lagi.</p>{/if}
          </section>

          <section class="se-sec" aria-labelledby={uid + '-exp'}>
            <h2 id={uid + '-exp'}>Unduh berkas</h2>
            <p class="se-hint">situs.yaml berisi pengaturan situs, dan lembaga.yaml berisi data publik lembaga dengan alamat fotonya. Keduanya bisa dibawa ke tempat lain.</p>
            <Button variant="outline" disabled={busy} onclick={exportFiles}><Download size={15} />Unduh situs.yaml dan lembaga.yaml</Button>
          </section>
        {:else}<p class="se-hint">Hanya pengelola lembaga yang bisa mengubah situs ini.</p>{/if}
      </div>

      <div class="se-preview" class:hide={pane !== 'preview'}>
        <div class="se-preview-bar">
          <div class="se-seg" role="radiogroup" aria-label="Yang ditampilkan">
            <button type="button" role="radio" aria-checked={view === 'draft'} onclick={() => (view = 'draft')}>Draf</button>
            <button type="button" role="radio" aria-checked={view === 'published'} disabled={!st.published} onclick={() => (view = 'published')}>Terbit</button>
          </div>
          <span class="se-hint">{view === 'draft' ? (dirty ? 'Simpan draf untuk melihat perubahan.' : 'Draf yang terakhir disimpan.') : 'Yang dilihat pengunjung.'}</span>
          {#if address}<a class="se-open" href={address + (view === 'draft' ? '?versi=draf' : '')} target="_blank" rel="noreferrer" aria-label="Buka di tab baru"><Eye size={16} /></a>{/if}
        </div>
        {#if previewSrc && (st.saved || view === 'published')}
          {#key previewSrc}<iframe title={view === 'draft' ? 'Pratinjau draf situs' : 'Situs yang terbit'} src={previewSrc} loading="lazy"></iframe>{/key}
        {:else}<div class="se-empty"><p>Simpan draf pertama untuk melihat pratinjau.</p></div>{/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .se { --gutter: 24px; padding: 20px var(--gutter) 40px; container: se / inline-size; }
  .se-head { display: grid; gap: 10px; padding-bottom: 20px; }
  .se-back { display: inline-flex; align-items: center; gap: 6px; width: fit-content; min-height: 32px; font-size: 14px; color: var(--muted-foreground); text-decoration: none; }
  .se-back:hover { color: var(--foreground); }
  .se-title { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
  h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
  .se-status { display: inline-flex; align-items: center; min-height: 28px; padding: 0 12px; border-radius: 999px; background: color-mix(in oklab, var(--foreground) 6%, transparent); font-size: 13px; font-weight: 600; color: var(--muted-foreground); }
  .se-status.live { background: color-mix(in oklab, var(--brand) 14%, transparent); color: var(--foreground); }
  .se-lede { margin: 0; font-size: 15px; line-height: 1.55; max-width: 64ch; color: color-mix(in oklab, var(--foreground) 82%, transparent); }
  .se-address { display: inline-flex; align-items: center; gap: 6px; width: fit-content; font-size: 14.5px; font-weight: 600; color: var(--foreground); text-underline-offset: 3px; }
  .se-operator { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; margin-bottom: 16px; border-radius: 16px; background: color-mix(in oklab, var(--foreground) 3%, transparent); box-shadow: inset 0 0 0 1px var(--border); }
  .se-switch { display: flex; gap: 12px; align-items: flex-start; cursor: pointer; max-width: 62ch; }
  .se-switch span { display: grid; gap: 2px; }
  .se-switch strong { font-size: 15px; font-weight: 650; }
  .se-switch small { font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .se-note { margin: 0 0 16px; padding: 12px 16px; border-radius: 14px; background: color-mix(in oklab, var(--brand) 9%, transparent); font-size: 14.5px; line-height: 1.5; max-width: 72ch; }
  .se-panes { display: none; }
  .se-grid { display: grid; gap: 28px; }
  @container se (min-width: 980px) { .se-grid { grid-template-columns: minmax(360px, 440px) minmax(0, 1fr); align-items: start; } }
  .se-sec { display: grid; gap: 10px; justify-items: stretch; padding: 22px 0; border-top: 1px solid var(--border); }
  .se-sec h2 { margin: 0 0 2px; font-size: 17px; font-weight: 750; letter-spacing: -0.01em; }
  .se-hint { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .se-label { font-size: 14px; font-weight: 500; }
  .se-field { display: grid; gap: 8px; margin-top: 6px; }
  .se-name { display: flex; align-items: center; border: 1px solid var(--input, var(--border)); border-radius: 10px; padding-left: 12px; background: var(--background); }
  .se-name:focus-within { outline: 2px solid var(--ring, var(--brand)); outline-offset: 1px; }
  .se-prefix { font-size: 14px; color: var(--muted-foreground); white-space: nowrap; }
  .se-name :global(input) { border: 0; box-shadow: none; padding-left: 2px; outline: none; }
  .se-name :global(input:focus-visible) { box-shadow: none; outline: none; }
  .se-templates { display: grid; gap: 8px; }
  .se-template { display: grid; grid-template-columns: 56px minmax(0, 1fr) 16px; gap: 12px; align-items: center; padding: 12px; border: 1px solid var(--border); border-radius: 14px; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .se-template:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .se-template[aria-checked='true'] { border-color: var(--foreground); box-shadow: inset 0 0 0 1px var(--foreground); }
  .se-template span:nth-child(2) { display: grid; gap: 2px; }
  .se-template strong { font-size: 15px; font-weight: 700; }
  .se-template small { font-size: 13px; line-height: 1.4; color: var(--muted-foreground); }
  .se-mini { display: grid; gap: 3px; width: 56px; height: 44px; padding: 5px; border-radius: 8px; background: color-mix(in oklab, var(--foreground) 6%, transparent); }
  .se-mini i { display: block; border-radius: 2px; background: color-mix(in oklab, var(--foreground) 22%, transparent); }
  .se-mini[data-t='editorial'] { grid-template-rows: 1.6fr 0.5fr 0.5fr; }
  .se-mini[data-t='editorial'] i:nth-child(2) { width: 70%; background: color-mix(in oklab, var(--foreground) 45%, transparent); }
  .se-mini[data-t='lembaga'] { grid-template-rows: 0.9fr 1fr; grid-template-columns: 1.4fr 1fr; }
  .se-mini[data-t='lembaga'] i:first-child { grid-column: 1 / -1; background: color-mix(in oklab, var(--brand) 55%, transparent); }
  .se-swatches { display: flex; flex-wrap: wrap; gap: 8px; }
  .se-swatch { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 999px; border: 0; background: var(--sw-l); color: #fff; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12); }
  :global(.dark) .se-swatch { background: var(--sw-d); color: #111; }
  .se-swatch[aria-checked='true'] { outline: 2px solid var(--foreground); outline-offset: 2px; }
  .se-blocks { display: grid; margin: 0; padding: 0; list-style: none; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
  .se-block + .se-block { border-top: 1px solid var(--border); }
  .se-block.open { background: color-mix(in oklab, var(--foreground) 2.5%, transparent); }
  .se-block-row { display: flex; align-items: center; gap: 4px; padding-right: 6px; }
  .se-block-name { display: grid; gap: 1px; flex: 1; min-width: 0; padding: 12px 14px; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .se-block-name strong { font-size: 15px; font-weight: 650; }
  .se-block-name small { font-size: 12.5px; line-height: 1.35; color: var(--muted-foreground); }
  .se-block-name:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: -2px; }
  .se-block-tools { display: flex; flex: none; }
  .se-block-body { display: grid; gap: 8px; padding: 4px 14px 16px; }
  .se-pics { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 6px; }
  .se-pic { position: relative; aspect-ratio: 1; padding: 0; border: 0; border-radius: 10px; overflow: hidden; background: var(--muted); cursor: pointer; }
  .se-pic img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .se-pic[aria-checked='true'], .se-pic[aria-pressed='true'] { outline: 3px solid var(--foreground); outline-offset: -3px; }
  .se-tick { position: absolute; top: 6px; right: 6px; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 999px; background: var(--foreground); color: var(--background); }
  .se-checks { display: grid; gap: 4px; }
  .se-check { display: flex; align-items: center; gap: 10px; min-height: 40px; font-size: 14.5px; cursor: pointer; }
  .se-check input { width: 18px; height: 18px; accent-color: var(--foreground); }
  .se-add { display: grid; gap: 8px; margin-top: 8px; }
  .se-add-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .se-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 14px; border: 1px dashed var(--border); border-radius: 999px; background: none; color: inherit; font: inherit; font-size: 13.5px; font-weight: 550; cursor: pointer; }
  .se-chip:hover { border-style: solid; background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .se-actions { position: sticky; bottom: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; margin: 0 calc(var(--gutter) * -1); padding: 12px var(--gutter); background: color-mix(in oklab, var(--background) 92%, transparent); backdrop-filter: blur(12px); border-top: 1px solid var(--border); }
  .se-dirty { margin-right: auto; font-size: 13.5px; color: var(--muted-foreground); }
  .se-problem { margin: 0; font-size: 14px; color: var(--destructive); }
  .se-versions { display: grid; margin: 0; padding: 0; list-style: none; }
  .se-versions li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border); }
  .se-versions li:last-child { border-bottom: 1px solid var(--border); }
  .se-versions li > span { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
  .se-versions strong { font-size: 15px; font-weight: 650; }
  .se-versions small { flex-basis: 100%; font-size: 13px; color: var(--muted-foreground); }
  .se-tag { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: color-mix(in oklab, var(--brand) 14%, transparent); }
  .se-row-end { display: flex; justify-content: flex-start; }
  .se-sec > :global(a), .se-sec > :global(button) { justify-self: start; }
  .se-preview { display: grid; gap: 10px; }
  @container se (min-width: 980px) { .se-preview { position: sticky; top: 16px; } }
  .se-preview-bar { display: flex; align-items: center; gap: 12px; }
  .se-preview-bar .se-hint { flex: 1; }
  .se-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: color-mix(in oklab, var(--foreground) 6%, transparent); }
  .se-seg button { min-height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: none; color: var(--muted-foreground); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
  .se-seg button[aria-checked='true'] { background: var(--background); color: var(--foreground); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
  .se-seg button:disabled { opacity: 0.45; cursor: default; }
  .se-open { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 999px; color: var(--foreground); }
  .se-open:hover { background: color-mix(in oklab, var(--foreground) 6%, transparent); }
  iframe { width: 100%; height: min(78vh, 900px); border: 0; border-radius: 16px; background: var(--muted); box-shadow: inset 0 0 0 1px var(--border), 0 1px 0 var(--border); }
  .se-empty { display: grid; place-items: center; min-height: 240px; border-radius: 16px; border: 1px dashed var(--border); color: var(--muted-foreground); font-size: 14.5px; padding: 24px; text-align: center; }
  @container se (max-width: 979px) {
    .se-panes { position: sticky; top: 0; z-index: 3; display: flex; gap: 22px; margin: 0 calc(var(--gutter) * -1) 8px; padding: 0 var(--gutter); background: var(--background); border-bottom: 1px solid var(--border); }
    .se-panes button { min-height: 44px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--muted-foreground); font: inherit; font-size: 15px; font-weight: 550; cursor: pointer; }
    .se-panes button[aria-selected='true'] { color: var(--foreground); font-weight: 650; border-bottom-color: var(--foreground); }
    .hide { display: none; }
    iframe { height: 72vh; }
  }
  @media (max-width: 639px) { .se { --gutter: 16px; padding-top: 12px; } h1 { font-size: 22px; } }
</style>
