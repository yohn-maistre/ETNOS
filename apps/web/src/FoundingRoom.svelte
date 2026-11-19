<script lang="ts">
  // The founder's waiting room: the community opens when one more person accepts the link, and lapses after
  // 14 days. Until then only the founder sees it, whatever it was set to become.
  import { Copy, Check, MessageCircle, RefreshCw } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js'
  import { request, type Community } from './api'
  import { knownLink, rememberLink, forgetLink, linkFor } from './founding-links'

  let { community, onChanged }: { community: Community; onChanged: () => void | Promise<void> } = $props()
  let token = $state<string | null>(null),
    copied = $state(false),
    busy = $state(false),
    confirmWithdraw = $state(false),
    error = $state('')
  $effect(() => {
    token = knownLink(community.id)
  })
  const lapsed = $derived((community.forming_until ?? 0) <= Date.now())
  const until = $derived(new Date(community.forming_until ?? 0).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }))
  const becomes = $derived(community.founding_visibility === 'public' ? 'publik' : 'khusus anggota')
  const url = $derived(token ? linkFor(token) : '')
  const message = $derived(`Saya membuat komunitas "${community.title}" di ETNOS. Komunitas ini baru terbuka kalau ada satu orang lagi yang bergabung. Bergabunglah lewat tautan ini: ${url}`)

  async function renew() {
    if (busy) return
    busy = true
    error = ''
    try {
      const r = await request<{ token: string }>(`/v1/communities/${community.id}/founding-link`, {})
      rememberLink(community.id, r.token)
      token = r.token
      copied = false
    } catch (e) {
      error = e instanceof Error ? e.message : 'Tautan belum dapat dibuat.'
    } finally {
      busy = false
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      copied = true
      setTimeout(() => (copied = false), 2400)
    } catch {
      error = 'Salin tautan secara manual dari kotak di atas.'
    }
  }
  async function withdraw() {
    busy = true
    error = ''
    try {
      await request(`/v1/communities/${community.id}/founding-withdraw`, {})
      forgetLink(community.id)
      confirmWithdraw = false
      await onChanged()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Belum dapat dibatalkan.'
    } finally {
      busy = false
    }
  }
</script>

<section class="founding-room" aria-labelledby="founding-title">
  {#if lapsed}
    <h2 id="founding-title">Komunitas ini tidak jadi dibuka</h2>
    <p>Belum ada orang kedua yang bergabung dalam 14 hari, atau pembuatannya dibatalkan. Komunitas ini tetap hanya terlihat oleh Anda dan tidak bisa diisi lagi. Anda bisa memulai komunitas baru kapan saja.</p>
  {:else}
    <h2 id="founding-title">Menunggu satu orang lagi</h2>
    <p>Sekarang hanya Anda yang bisa melihat komunitas ini. Kirim tautan ke satu orang. Setelah ia bergabung, komunitas terbuka dan menjadi {becomes}. Tautan berlaku sampai {until}.</p>
    {#if token}
      <label class="founding-link">
        <span class="sr-only">Tautan undangan</span>
        <input readonly value={url} onfocus={(e) => e.currentTarget.select()} />
      </label>
      <div class="founding-actions">
        <Button class="cx-button primary small" href={'https://wa.me/?text=' + encodeURIComponent(message)} target="_blank" rel="noopener">
          <MessageCircle size={15} />Kirim lewat WhatsApp
        </Button>
        <Button class="cx-button small" variant="outline" onclick={copy}>
          {#if copied}<Check size={15} />Tersalin{:else}<Copy size={15} />Salin tautan{/if}
        </Button>
      </div>
      <p class="founding-note">Tautan ini bisa dipakai lebih dari satu orang. Buat tautan baru bila tautan lama sudah tersebar terlalu jauh.
        <button class="founding-inline" disabled={busy} onclick={renew}><RefreshCw size={13} />Buat tautan baru</button></p>
    {:else}
      <div class="founding-actions">
        <Button class="cx-button primary small" disabled={busy} onclick={renew}>Buat tautan undangan</Button>
      </div>
      <p class="founding-note">Tautan lama, bila ada, berhenti berlaku saat tautan baru dibuat.</p>
    {/if}
    <button class="founding-inline muted" disabled={busy} onclick={() => (confirmWithdraw = true)}>Batalkan komunitas ini</button>
  {/if}
  {#if error}<p class="founding-error" role="alert">{error}</p>{/if}
</section>

<AlertDialog.Root bind:open={confirmWithdraw}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Batalkan komunitas ini?</AlertDialog.Title>
      <AlertDialog.Description>Tautan berhenti berlaku dan komunitas tidak akan dibuka. Tulisan yang sudah Anda buat di sini tetap hanya terlihat oleh Anda.</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Kembali</AlertDialog.Cancel>
      <AlertDialog.Action disabled={busy} onclick={withdraw}>Batalkan komunitas</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  .founding-room {
    display: grid;
    gap: 10px;
    margin: 16px 0 4px;
    padding: 16px 18px 18px;
    border: 1px solid color-mix(in oklab, var(--brand) 35%, var(--border));
    border-radius: 16px;
    background: color-mix(in oklab, var(--brand) 6%, var(--background));
  }
  h2 { margin: 0; font-size: 17px; font-weight: 600; }
  p { margin: 0; font-size: 14px; line-height: 1.55; max-width: 62ch; }
  .founding-link input {
    width: 100%;
    box-sizing: border-box;
    min-height: 40px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--background);
    color: var(--foreground);
    font: 13px/1.2 var(--font-mono, ui-monospace, monospace);
    text-overflow: ellipsis;
  }
  .founding-link input:focus-visible { outline: 2px solid var(--foreground); outline-offset: 1px; }
  .founding-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .founding-note { font-size: 13px; color: var(--muted-foreground); }
  .founding-inline {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 4px;
    color: var(--foreground);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    min-height: 40px;
  }
  .founding-inline.muted { justify-self: start; margin: 2px 0 0; font-size: 13px; color: var(--muted-foreground); }
  .founding-inline:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; border-radius: 4px; }
  .founding-inline:disabled { opacity: 0.5; cursor: default; }
  .founding-error { color: var(--destructive); font-size: 13px; }
</style>
