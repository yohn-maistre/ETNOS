<script lang="ts">
  // Steward control card for AT Protocol Spaces (alpha) on a private community.
  import { ShieldAlert, RefreshCw, KeyRound } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { request } from './api'

  type AtSpaceView = {
    enabled: boolean
    state: 'active' | 'paused' | 'revoked' | null
    spaceUri: string | null
    authorityDid: string | null
    hostOrigin: string | null
    activeMembers: number
    revokedMembers: number
    updated: number | null
    notice: string
    canManage: boolean
  }

  let { communityId }: { communityId: string } = $props()
  let space = $state<AtSpaceView | null>(null),
    busy = $state(false),
    note = $state(''),
    error = $state('')

  async function load() {
    try {
      space = await request<AtSpaceView>(`/v1/communities/${encodeURIComponent(communityId)}/at-space`, undefined, undefined, true)
    } catch {
      space = null
    }
  }

  $effect(() => { void communityId; void load() })

  async function act(path: '' | '/sync' | '/revoke') {
    if (busy) return
    busy = true; note = ''; error = ''
    try {
      space = await request<AtSpaceView>(`/v1/communities/${encodeURIComponent(communityId)}/at-space${path}`, {})
      note = path === '' ? 'Ruang AT aktif dan anggota tersinkron.' : path === '/sync' ? 'Daftar anggota Ruang AT diperbarui.' : 'Ruang AT dinonaktifkan dan izin akses dicabut.'
    } catch (e) {
      error = e instanceof Error ? e.message : 'Belum tersimpan.'
    } finally {
      busy = false
    }
  }
</script>

{#if space}
  <div class="at-space-box">
    <div class="at-space-head">
      <strong><KeyRound size={15} /> Ruang AT (Uji coba)</strong>
      <span class="at-space-badge" class:at-on={space.enabled}>
        {space.enabled ? 'Aktif' : space.state === 'revoked' ? 'Dicabut' : 'Belum aktif'}
      </span>
    </div>
    <p class="cx-hint">{space.notice}</p>
    {#if space.spaceUri}
      <p class="at-space-uri"><code>{space.spaceUri}</code></p>
      <p class="cx-hint">Anggota tersinkron: {space.activeMembers} aktif{#if space.revokedMembers} · {space.revokedMembers} dicabut{/if}.</p>
    {/if}
    {#if space.canManage}
      <div class="at-space-actions">
        {#if !space.enabled}
          <Button size="sm" variant="outline" disabled={busy} onclick={() => act('')}>Aktifkan Ruang AT</Button>
        {:else}
          <Button size="sm" variant="outline" disabled={busy} onclick={() => act('/sync')}><RefreshCw size={13} /> Sinkronkan anggota</Button>
          <Button size="sm" variant="outline" disabled={busy} onclick={() => act('/revoke')}>Cabut Ruang AT</Button>
        {/if}
      </div>
    {/if}
    {#if note}<p class="cx-hint">{note}</p>{/if}
    {#if error}<p class="at-space-err"><ShieldAlert size={14} /> {error}</p>{/if}
  </div>
{/if}

<style>
  .at-space-box { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); display: grid; gap: 6px; }
  .at-space-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .at-space-head strong { display: inline-flex; align-items: center; gap: 6px; font-size: 0.9rem; }
  .at-space-badge { font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); }
  .at-space-badge.at-on { border-color: var(--accent); color: var(--accent); }
  .at-space-uri { margin: 0; font-size: 0.78rem; overflow-wrap: anywhere; }
  .at-space-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .at-space-err { margin: 0; display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; color: var(--destructive, #b42318); }
</style>
