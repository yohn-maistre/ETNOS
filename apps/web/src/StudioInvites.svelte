<script lang="ts">
  // Studio, Undangan: the operator makes invitation links and works through the request queue (src/oauth.ts).
  // A link's code is shown once, right after it is made; the node keeps only its hash.
  import { Copy, Link2, Plus, Check, X } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import StudioTabs from './StudioTabs.svelte'
  import ContentSkeleton from './ContentSkeleton.svelte'
  import { request, relativeDate, type Auth } from './api'
  import { notify } from './notifications.svelte'

  type Invitation = { id: string; created: number; expires: number; revoked: number; used_at: number | null; uses: number; maxUses: number }
  type InviteRequest = { id: string; name: string; contact: string; reason: string; created: number; state: 'pending' | 'approved'; decided: number | null }
  type Made = { id: string; url: string; expires: number; maxUses: number }

  let { auth }: { auth: Auth } = $props()
  let invitations = $state<Invitation[] | null>(null),
    requests = $state<InviteRequest[]>([]),
    error = $state(''),
    busy = $state(false),
    days = $state('7'),
    uses = $state('1'),
    made = $state<Made | null>(null),
    approved = $state<Record<string, string>>({})

  const date = (t: number) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  function status(i: Invitation) {
    if (i.revoked) return 'Dicabut'
    if (i.uses >= i.maxUses) return 'Sudah dipakai habis'
    if (i.expires <= Date.now()) return 'Kedaluwarsa'
    return 'Aktif'
  }
  async function load() {
    error = ''
    try {
      const [a, b] = await Promise.all([
        request<{ invitations: Invitation[] }>('/auth/enrollment-invites'),
        request<{ requests: InviteRequest[] }>('/auth/invite-requests'),
      ])
      invitations = a.invitations
      requests = b.requests
    } catch (e) {
      error = e instanceof Error ? e.message : 'Undangan belum dapat dimuat.'
    }
  }
  $effect(() => {
    if (auth.steward) void load()
  })
  async function act(fn: () => Promise<void>) {
    if (busy) return
    busy = true
    try {
      await fn()
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Permintaan belum berhasil.')
    } finally {
      busy = false
    }
  }
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      notify('Tautan disalin.')
    } catch {
      notify('Tautan belum dapat disalin. Pilih teksnya lalu salin sendiri.')
    }
  }
  const create = () =>
    act(async () => {
      made = await request<Made>('/auth/enrollment-invites', { days: Number(days), uses: Number(uses) })
    })
  const revoke = (i: Invitation) => act(async () => { await request('/auth/enrollment-invites/' + i.id + '/revoke', {}) })
  const approve = (r: InviteRequest) =>
    act(async () => {
      const link = await request<Made>('/auth/invite-requests/' + r.id + '/approve', {})
      approved = { ...approved, [r.id]: link.url }
    })
  const decline = (r: InviteRequest) => act(async () => { await request('/auth/invite-requests/' + r.id + '/decline', {}) })
  const pending = $derived(requests.filter((r) => r.state === 'pending'))
</script>

<div class="studio-page studio-invites">
  <StudioTabs current="invites" operator={auth.steward} />
  {#if !auth.steward}
    <section class="etnos-nodata"><h1>Undangan</h1><p>Halaman ini hanya untuk pengelola ETNOS.</p></section>
  {:else if error}
    <section class="etnos-nodata"><h1>Undangan</h1><p>{error}</p><Button variant="outline" onclick={load}>Coba lagi</Button></section>
  {:else if !invitations}
    <ContentSkeleton />
  {:else}
    <div class="commons-page-head">
      <div>
        <h1>Undangan</h1>
        <p class="cx-hint">Satu tautan dapat dipakai untuk membuat akun ETNOS atau untuk masuk dengan akun Bluesky.</p>
      </div>
    </div>

    <section class="si-section" aria-labelledby="si-new">
      <h2 id="si-new">Buat tautan undangan</h2>
      <form class="si-form" onsubmit={(e) => { e.preventDefault(); void create() }}>
        <label>Berlaku<select bind:value={days}><option value="1">1 hari</option><option value="7">7 hari</option><option value="14">14 hari</option><option value="30">30 hari</option></select></label>
        <label>Untuk berapa orang<Input type="number" min="1" max="20" bind:value={uses} /></label>
        <Button type="submit" disabled={busy}><Plus size={16} />Buat tautan</Button>
      </form>
      {#if made}
        <div class="si-made" role="status">
          <p>Tautan ini hanya ditampilkan sekali. Salin dan kirim sendiri kepada orang yang kamu undang.</p>
          <div class="si-url"><code>{made.url}</code><Button variant="outline" onclick={() => copy(made!.url)}><Copy size={15} />Salin</Button></div>
          <p class="cx-hint">Berlaku sampai {date(made.expires)} untuk {made.maxUses} orang.</p>
        </div>
      {/if}
    </section>

    <section class="si-section" aria-labelledby="si-requests">
      <h2 id="si-requests">Permintaan undangan{pending.length ? ' (' + pending.length + ')' : ''}</h2>
      <p class="cx-hint">Hanya pengelola yang dapat membaca permintaan ini. Menyetujui membuat tautan untuk satu orang yang berlaku 14 hari. Menolak menghapus permintaan.</p>
      {#if !requests.length}<p class="si-empty">Belum ada permintaan.</p>{/if}
      {#each requests as r (r.id)}
        <article class="si-row">
          <div class="si-main">
            <h3>{r.name}</h3>
            <p class="si-contact">{r.contact}</p>
            {#if r.reason}<p>{r.reason}</p>{/if}
            <small>{relativeDate(r.created)}{r.state === 'approved' && r.decided ? ' · disetujui ' + relativeDate(r.decided) : ''}</small>
            {#if approved[r.id]}<div class="si-url"><code>{approved[r.id]}</code><Button variant="outline" onclick={() => copy(approved[r.id])}><Copy size={15} />Salin</Button></div>{/if}
          </div>
          <div class="si-actions">
            {#if r.state === 'pending'}
              <Button disabled={busy} onclick={() => approve(r)}><Check size={15} />Setujui</Button>
              <Button variant="ghost" disabled={busy} onclick={() => decline(r)}><X size={15} />Tolak</Button>
            {:else}
              <Button variant="ghost" disabled={busy} onclick={() => decline(r)}>Hapus</Button>
            {/if}
          </div>
        </article>
      {/each}
    </section>

    <section class="si-section" aria-labelledby="si-links">
      <h2 id="si-links">Tautan yang sudah dibuat</h2>
      {#if !invitations.length}<p class="si-empty">Belum ada tautan.</p>{/if}
      {#each invitations as i (i.id)}
        <article class="si-row">
          <div class="si-main">
            <h3><Link2 size={15} />{status(i)}</h3>
            <small>Dibuat {date(i.created)} · berlaku sampai {date(i.expires)} · dipakai {i.uses} dari {i.maxUses}</small>
          </div>
          {#if status(i) === 'Aktif'}<div class="si-actions"><Button variant="ghost" disabled={busy} onclick={() => revoke(i)}>Cabut</Button></div>{/if}
        </article>
      {/each}
    </section>
  {/if}
</div>

<style>
  .studio-invites { padding-bottom: 48px; }
  .si-section { padding: 20px var(--studio-gutter, 24px) 8px; display: grid; gap: 12px; max-width: 880px; }
  .si-section h2 { font-size: 1.05rem; font-weight: 650; margin: 0; }
  .si-form { display: flex; flex-wrap: wrap; align-items: end; gap: 12px 16px; }
  .si-form label { display: grid; gap: 6px; font-size: 14px; font-weight: 500; min-width: 140px; }
  .si-form select { min-height: 36px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--background); color: var(--foreground); font: inherit; }
  .si-made { display: grid; gap: 8px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--muted); }
  .si-made p { margin: 0; font-size: 14.5px; }
  .si-url { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
  .si-url code { flex: 1 1 240px; min-width: 0; padding: 8px 10px; border-radius: 8px; background: var(--background); border: 1px solid var(--border); font-size: 13px; overflow-wrap: anywhere; }
  .si-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .si-main { display: grid; gap: 4px; min-width: 0; flex: 1 1 280px; }
  .si-main h3 { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 15.5px; font-weight: 650; }
  .si-main p { margin: 0; font-size: 14.5px; line-height: 1.5; overflow-wrap: anywhere; }
  .si-contact { color: var(--foreground); }
  .si-main small { color: var(--muted-foreground); font-size: 13px; }
  .si-actions { display: flex; gap: 8px; align-items: start; }
  .si-empty { margin: 0; color: var(--muted-foreground); font-size: 14.5px; }
  @media (max-width: 767px) { .si-section { padding-inline: 16px; } }
</style>
