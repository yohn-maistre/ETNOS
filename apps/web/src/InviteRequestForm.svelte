<script lang="ts">
  // The plain "Minta undangan" form for the private alpha. Only the operator reads what is sent (src/oauth.ts,
  // invite_requests); no email is sent, and nothing here appears on any public page.
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import { Field, FieldGroup, FieldLabel, FieldDescription } from '$lib/components/ui/field/index.js'
  import { LoaderCircle, Send } from '@lucide/svelte'
  import { ApiError, request } from './api'

  let { compact = false }: { compact?: boolean } = $props()
  let name = $state(''),
    contact = $state(''),
    reason = $state(''),
    busy = $state(false),
    sent = $state(false),
    error = $state('')

  async function send(event: SubmitEvent) {
    event.preventDefault()
    if (busy) return
    busy = true
    error = ''
    try {
      await request('/auth/invite-requests', { name: name.trim(), contact: contact.trim(), reason: reason.trim() })
      sent = true
    } catch (e) {
      error =
        e instanceof ApiError && e.status === 429
          ? 'Terlalu banyak permintaan dari jaringan ini. Coba lagi nanti.'
          : e instanceof ApiError && e.status === 409
            ? 'Pendaftaran sedang terbuka, jadi kamu bisa langsung bergabung.'
            : 'Permintaan belum terkirim. Periksa isiannya, lalu coba lagi.'
    } finally {
      busy = false
    }
  }
</script>

<section class="invite-request" class:compact aria-labelledby="invite-request-title">
  {#if sent}
    <h2 id="invite-request-title">Permintaanmu sudah terkirim</h2>
    <p>Hanya pengelola ETNOS yang dapat membacanya. Jika disetujui, pengelola mengirim tautan undangan lewat kontak yang kamu tulis.</p>
  {:else}
    <h2 id="invite-request-title">Minta undangan</h2>
    <p>Tulis namamu dan cara menghubungimu. Pengelola akan mengirim tautan undangan jika masih ada tempat.</p>
    <form onsubmit={send}>
      <FieldGroup>
        <Field>
          <FieldLabel for="invite-request-name">Nama</FieldLabel>
          <Input id="invite-request-name" bind:value={name} maxlength={80} autocomplete="name" required />
        </Field>
        <Field>
          <FieldLabel for="invite-request-contact">Cara menghubungimu</FieldLabel>
          <Input id="invite-request-contact" bind:value={contact} maxlength={160} required />
          <FieldDescription>Misalnya nomor WhatsApp, akun Bluesky atau alamat surel.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="invite-request-reason">Alasan singkat</FieldLabel>
          <Textarea id="invite-request-reason" bind:value={reason} maxlength={600} rows={3} />
          <FieldDescription>Misalnya komunitas, tempat atau bahasa yang ingin kamu tulis.</FieldDescription>
        </Field>
        {#if error}<p role="alert" class="cx-form-error">{error}</p>{/if}
        <Button type="submit" disabled={busy || !name.trim() || !contact.trim()} class="w-full">
          {#if busy}<LoaderCircle class="animate-spin" />{:else}<Send size={16} />{/if}Kirim permintaan
        </Button>
        <FieldDescription>Hanya pengelola yang dapat membaca permintaan ini. Tidak ada surel yang dikirim.</FieldDescription>
      </FieldGroup>
    </form>
  {/if}
</section>

<style>
  .invite-request { display: grid; gap: 12px; }
  .invite-request h2 { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.25; }
  .invite-request.compact h2 { font-size: 17px; }
  .invite-request > p { margin: 0; font-size: 15px; line-height: 1.55; color: var(--muted-foreground); }
</style>
