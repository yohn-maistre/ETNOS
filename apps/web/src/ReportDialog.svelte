<script lang="ts">
  // Report a profile or a community to the node operator (src/reports.ts). Posts use the dialog in PostCard.
  import { LoaderCircle } from '@lucide/svelte'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import { request } from './api'
  import { notify } from './notifications.svelte'

  let { open = $bindable(false), kind, target }: { open?: boolean; kind: 'profile' | 'community'; target: string } = $props()
  let reason = $state(''),
    busy = $state(false)
  async function send(e: SubmitEvent) {
    e.preventDefault()
    if (busy || !reason.trim()) return
    busy = true
    try {
      await request('/v1/reports', { kind, target, reason: reason.trim() })
      open = false
      reason = ''
      notify('Laporan dikirim kepada pengelola.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Laporan belum terkirim.')
    } finally {
      busy = false
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="platform-dialog">
    <Dialog.Header>
      <Dialog.Title>{kind === 'profile' ? 'Laporkan profil' : 'Laporkan komunitas'}</Dialog.Title>
      <Dialog.Description>Laporan hanya terlihat oleh pengelola ETNOS. Namamu tidak ditampilkan kepada yang dilaporkan.</Dialog.Description>
    </Dialog.Header>
    <form class="cx-form" onsubmit={send}>
      <Label for={'report-' + target}>Alasan laporan</Label>
      <Textarea id={'report-' + target} bind:value={reason} maxlength={2000} required placeholder="Apa yang perlu ditinjau?" />
      <Button type="submit" disabled={busy || !reason.trim()}>{#if busy}<LoaderCircle size={15} class="animate-spin" />{/if}Kirim laporan</Button>
    </form>
  </Dialog.Content>
</Dialog.Root>
