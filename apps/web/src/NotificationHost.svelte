<script lang="ts">
  import { Toaster } from '@yusufceng1z/ding-svelte'
  import { appearance } from './appearance.svelte'
  import { configureNotifications } from './notifications.svelte'

  // Top-center on phones (clear of the thumb dock), bottom-center on wider screens.
  let compact = $state(
    typeof matchMedia === 'function' && matchMedia('(max-width: 767px)').matches,
  )
  $effect(() => {
    const query = matchMedia('(max-width: 767px)')
    const update = () => (compact = query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  })
  $effect(() => configureNotifications())
</script>

<div class="etnos-feedback">
  <Toaster
    position={compact ? 'top-center' : 'bottom-center'}
    theme={appearance.theme}
    labels={{ region: 'Notifikasi', dismiss: 'Tutup notifikasi' }}
  />
</div>
