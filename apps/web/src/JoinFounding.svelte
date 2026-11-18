<script lang="ts">
  // The page a founding link opens. The token rides in the URL fragment, which never reaches the server;
  // it is kept for this tab across signing in, then sent in a request body.
  import { onMount } from 'svelte'
  import { Users } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { request, type Actor } from './api'

  let { actor, onJoined, onSignIn }: { actor: Actor | null; onJoined: (communityId: string) => void | Promise<void>; onSignIn: () => void } = $props()
  type Preview = { community: { id: string; title: string; description: string; visibility: string }; founder: { name: string }; forming: boolean; expires: number; member: boolean }
  const KEY = 'etnos-founding-pending'
  let token = $state(''),
    preview = $state<Preview | null>(null),
    phase = $state<'loading' | 'ready' | 'invalid'>('loading'),
    busy = $state(false),
    error = $state('')

  onMount(() => {
    const fromHash = location.hash.slice(1)
    let kept = ''
    try {
      if (fromHash) sessionStorage.setItem(KEY, fromHash)
      kept = sessionStorage.getItem(KEY) ?? ''
    } catch {
      kept = fromHash
    }
    // Drop the token from the address bar so it is not shared again by accident or kept in history.
    if (fromHash) history.replaceState(history.state, '', location.pathname + location.search)
    token = fromHash || kept
    if (!token) return void (phase = 'invalid')
    request<Preview>('/v1/founding/preview', { token })
      .then((p) => {
        preview = p
        phase = 'ready'
      })
      .catch(() => (phase = 'invalid'))
  })
  const until = $derived(preview ? new Date(preview.expires).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

  async function join() {
    if (busy || !preview) return
    busy = true
    error = ''
    try {
      await request('/v1/founding/accept', { token })
      try { sessionStorage.removeItem(KEY) } catch { /* nothing kept */ }
      await onJoined(preview.community.id)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Belum dapat bergabung.'
    } finally {
      busy = false
    }
  }
</script>

<section class="join-founding" aria-labelledby="join-title">
  {#if phase === 'loading'}
    <p class="join-note" role="status">Memeriksa tautan…</p>
  {:else if phase === 'invalid' || !preview}
    <h1 id="join-title">Tautan ini tidak berlaku</h1>
    <p>Tautan sudah lewat waktunya, sudah diganti, atau dibatalkan oleh pembuatnya. Minta tautan baru kepada orang yang mengirimnya.</p>
    <Button class="cx-button small" variant="outline" href="/communities">Lihat komunitas lain</Button>
  {:else}
    <span class="join-mark" aria-hidden="true"><Users size={20} /></span>
    <h1 id="join-title">{preview.community.title}</h1>
    {#if preview.community.description}<p class="join-description">{preview.community.description}</p>{/if}
    <p class="join-note">
      {preview.founder.name} mengajak Anda bergabung.
      {#if preview.forming}Komunitas ini baru terbuka setelah ada satu orang lagi yang bergabung. Setelah terbuka, komunitas ini {preview.community.visibility === 'public' ? 'bisa dibaca semua orang' : 'hanya bisa dibaca anggotanya'}.{/if}
      Tautan berlaku sampai {until}.
    </p>
    {#if preview.member}
      <Button class="cx-button primary" href={'/communities/' + preview.community.id}>Buka komunitas</Button>
    {:else if actor}
      <Button class="cx-button primary" disabled={busy} onclick={join}>Gabung sebagai {actor.name}</Button>
    {:else}
      <Button class="cx-button primary" onclick={onSignIn}>Masuk untuk bergabung</Button>
      <p class="join-note">Tautan ini tetap tersimpan di tab ini selama Anda masuk.</p>
    {/if}
    {#if error}<p class="join-error" role="alert">{error}</p>{/if}
  {/if}
</section>

<style>
  .join-founding { display: grid; justify-items: start; gap: 12px; max-width: 560px; margin: 0 auto; padding: 40px 24px 56px; }
  .join-mark { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; color: var(--brand); background: color-mix(in oklab, var(--brand) 12%, var(--background)); }
  h1 { margin: 4px 0 0; font-family: var(--font-editorial, inherit); font-weight: 400; font-size: 34px; line-height: 1.1; text-wrap: balance; }
  p { margin: 0; font-size: 15px; line-height: 1.6; max-width: 60ch; }
  .join-description { font-size: 16px; }
  .join-note { font-size: 14px; color: var(--muted-foreground); }
  .join-error { font-size: 14px; color: var(--destructive); }
  @media (max-width: 640px) { .join-founding { padding: 28px 20px 40px; } h1 { font-size: 28px; } }
</style>
