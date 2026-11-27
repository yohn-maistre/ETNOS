<script lang="ts">
  // The page an invitation link opens: /gabung?kode=… (src/oauth.ts, enrollment_invitations). The code is kept for
  // this tab and dropped from the address bar, then sent only in a request body. One link serves both ways in: a new
  // account on the ETNOS account server, or an existing Bluesky account.
  import { onMount } from 'svelte'
  import { ArrowUpRight, LoaderCircle, MailOpen } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Field, FieldLabel, FieldDescription } from '$lib/components/ui/field/index.js'
  import { Checkbox } from '$lib/components/ui/checkbox/index.js'
  import { ApiError, request, type Actor } from './api'
  import InviteRequestForm from './InviteRequestForm.svelte'

  let { actor }: { actor: Actor | null } = $props()
  const KEY = 'etnos-invite-pending'
  let code = $state(''),
    phase = $state<'loading' | 'valid' | 'invalid' | 'none'>('loading'),
    expires = $state(0),
    hostInvites = $state(false),
    handle = $state(''),
    busy = $state<'' | 'host' | 'bluesky'>(''),
    error = $state(''),
    minimumAge = $state(18),
    ageConfirmed = $state(false)

  onMount(() => {
    const fromQuery = new URLSearchParams(location.search).get('kode') ?? ''
    let kept = ''
    try {
      if (fromQuery) sessionStorage.setItem(KEY, fromQuery)
      kept = sessionStorage.getItem(KEY) ?? ''
    } catch {
      kept = fromQuery
    }
    if (fromQuery) history.replaceState(history.state, '', location.pathname)
    code = fromQuery || kept
    if (!code) return void (phase = 'none')
    Promise.all([
      request<{ valid: boolean; expires?: number }>('/auth/invite-check', { invitation: code }, undefined, true),
      request<{ hostInvites?: boolean; minimumAge?: number }>('/auth/options', undefined, undefined, true).catch(() => ({ hostInvites: false, minimumAge: 18 })),
    ])
      .then(([check, options]) => {
        hostInvites = !!options.hostInvites
        minimumAge = options.minimumAge ?? 18
        expires = check.expires ?? 0
        phase = check.valid ? 'valid' : 'invalid'
      })
      .catch(() => (phase = 'invalid'))
  })
  const until = $derived(expires ? new Date(expires).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

  async function start(provider: 'host' | 'bluesky') {
    if (busy) return
    busy = provider
    error = ''
    try {
      const result = await request<{ authorizationUrl: string }>('/auth/start', {
        mode: 'signup',
        ageConfirmed,
        invitation: code,
        ...(provider === 'host' ? { provider: 'host' } : handle.trim() ? { handle: handle.trim() } : {}),
        returnTo: '/mulai',
      })
      location.assign(result.authorizationUrl)
    } catch (e) {
      busy = ''
      error =
        e instanceof ApiError && e.status === 403
          ? 'Undangan ini sudah tidak berlaku. Minta tautan baru kepada pengelola.'
          : e instanceof ApiError && e.status === 400
            ? 'Nama akun belum ditemukan. Tulis lengkap, misalnya nama.bsky.social.'
            : 'Belum dapat dilanjutkan. Coba lagi sebentar.'
    }
  }
</script>

<section class="join-invite" aria-labelledby="join-invite-title">
  {#if phase === 'loading'}
    <p class="join-note" role="status">Memeriksa undangan…</p>
  {:else if actor}
    <h1 id="join-invite-title">Kamu sudah masuk</h1>
    <p>Kamu masuk sebagai {actor.name}. Undangan ini dapat dipakai orang lain yang kamu ajak.</p>
    <Button variant="outline" href="/">Ke Beranda</Button>
  {:else if phase === 'valid'}
    <span class="join-mark" aria-hidden="true"><MailOpen size={20} /></span>
    <h1 id="join-invite-title">Kamu diundang ke ETNOS</h1>
    <p>ETNOS sedang diuji oleh kelompok kecil. Undangan ini berlaku sampai {until}. Pilih cara bergabung.</p>
    <label class="join-age"><Checkbox bind:checked={ageConfirmed} /><span>Usiaku {minimumAge} tahun atau lebih</span></label>
    <div class="join-ways">
      {#if hostInvites}
        <article class="join-way">
          <h2>Buat akun ETNOS</h2>
          <p>Nama akunmu akan berakhiran .etnos.space. Akun ini juga dapat dipakai di aplikasi AT Protocol lain.</p>
          <Button class="w-full" disabled={!!busy || !ageConfirmed} onclick={() => start('host')}>
            {#if busy === 'host'}<LoaderCircle class="animate-spin" />{/if}Buat akun ETNOS<ArrowUpRight size={16} />
          </Button>
        </article>
      {/if}
      <article class="join-way">
        <h2>Pakai akun Bluesky</h2>
        <form onsubmit={(e) => { e.preventDefault(); void start('bluesky') }}>
          <Field>
            <FieldLabel for="join-handle">Nama akun Bluesky</FieldLabel>
            <Input id="join-handle" bind:value={handle} placeholder="nama.bsky.social" autocomplete="username" autocapitalize="none" spellcheck={false} />
            <FieldDescription>Belum punya akun Bluesky? Kosongkan kolom ini untuk membuat akun di Bluesky.</FieldDescription>
          </Field>
          <Button type="submit" variant={hostInvites ? 'outline' : 'default'} class="w-full" disabled={!!busy || !ageConfirmed}>
            {#if busy === 'bluesky'}<LoaderCircle class="animate-spin" />{/if}Lanjutkan dengan Bluesky<ArrowUpRight size={16} />
          </Button>
        </form>
      </article>
    </div>
    {#if error}<p class="join-error" role="alert">{error}</p>{/if}
    <p class="join-note">Kata sandimu tetap di penyedia akunmu. Komunitas privat tetap memerlukan persetujuan komunitasnya.</p>
  {:else}
    {#if phase === 'invalid'}
      <h1 id="join-invite-title">Undangan ini tidak berlaku</h1>
      <p>Tautan sudah lewat waktunya, sudah dipakai habis, atau dicabut oleh pengelola. Kamu dapat meminta undangan baru di bawah ini.</p>
    {:else}
      <h1 id="join-invite-title">Bergabung dengan ETNOS</h1>
      <p>ETNOS dibuka dengan undangan selama masa uji. Semua yang publik tetap dapat dibaca tanpa akun.</p>
    {/if}
    <div class="join-request"><InviteRequestForm /></div>
    <a class="join-note" href="/explore">Tetap membaca tanpa masuk</a>
  {/if}
</section>

<style>
  .join-invite { display: grid; justify-items: start; gap: 14px; max-width: 620px; margin: 0 auto; padding: 40px 24px 56px; }
  .join-mark { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; color: var(--brand); background: color-mix(in oklab, var(--brand) 12%, var(--background)); }
  h1 { margin: 4px 0 0; font-size: 30px; font-weight: 800; line-height: 1.12; letter-spacing: -0.02em; text-wrap: balance; }
  p { margin: 0; font-size: 15px; line-height: 1.6; max-width: 60ch; }
  .join-ways { display: grid; gap: 12px; width: 100%; margin-top: 4px; }
  .join-way { display: flex; flex-direction: column; gap: 12px; padding: 18px; border: 1px solid var(--border); border-radius: 14px; background: var(--card); }
  .join-way h2 { margin: 0; font-size: 17px; font-weight: 700; }
  .join-way > p { flex: 1; font-size: 14px; color: var(--muted-foreground); }
  .join-way form { display: grid; gap: 12px; }
  .join-request { width: 100%; padding: 18px; border: 1px solid var(--border); border-radius: 14px; background: var(--card); }
  .join-age { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 500; }
  .join-note { font-size: 14px; color: var(--muted-foreground); }
  .join-error { font-size: 14px; color: var(--destructive); }
  @media (min-width: 760px) { .join-ways:has(.join-way + .join-way) { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 640px) { .join-invite { padding: 28px 16px 40px; } h1 { font-size: 26px; } }
</style>
