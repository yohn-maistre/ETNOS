<script lang="ts">
  // Pengaturan: push notifications on this device (src/push.ts). Off until the person turns them on.
  import { Bell, BellOff } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { disablePush, enablePush, pushState, type PushState } from './push'
  import { notify } from './notifications.svelte'

  let status = $state<PushState | null>(null),
    busy = $state(false)
  $effect(() => {
    void pushState().then((s) => (status = s)).catch(() => (status = 'unsupported'))
  })
  async function toggle() {
    if (busy || !status) return
    busy = true
    try {
      if (status === 'on') {
        await disablePush()
        status = 'off'
      } else {
        status = await enablePush()
        if (status === 'on') notify('Notifikasi menyala di perangkat ini.')
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Notifikasi belum dapat dinyalakan.')
    } finally {
      busy = false
    }
  }
  const hint = $derived(
    status === 'unsupported'
      ? 'Browser ini belum mendukung notifikasi. Di iPhone dan iPad, tambahkan ETNOS ke Layar Utama lalu buka dari sana.'
      : status === 'unavailable'
        ? 'Notifikasi belum dipasang di node ini.'
        : status === 'denied'
          ? 'Notifikasi diblokir untuk ETNOS di browser ini. Izinkan lewat pengaturan situs di browser, lalu coba lagi.'
          : 'Kabar singkat saat ada balasan untuk postinganmu, saat kamu disebut, atau saat ada pertanyaan Kamus tentang postinganmu. Isi postingan tidak ikut dikirim.',
  )
</script>

<section class="push-preference" aria-label="Notifikasi di perangkat ini">
  <div class="cx-between">
    <Label>Notifikasi di perangkat ini</Label>
    {#if status === 'on' || status === 'off'}
      <Button variant="outline" aria-pressed={status === 'on'} disabled={busy} onclick={toggle}>
        {#if status === 'on'}<Bell size={16} />Menyala{:else}<BellOff size={16} />Mati{/if}
      </Button>
    {/if}
  </div>
  {#if status}<p class="cx-hint">{hint}</p>{/if}
</section>

<style>
  .push-preference { display: grid; gap: 6px; padding: 12px 16px 4px; }
</style>
