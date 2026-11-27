<script lang="ts">
  // Studio, Laporan: every report on the node for its operator (src/reports.ts). Post reports also stay with
  // the community's moderators; a decision here closes them there too. Reporters are not named.
  import { Flag } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import StudioTabs from './StudioTabs.svelte'
  import ContentSkeleton from './ContentSkeleton.svelte'
  import { request, relativeDate, type Auth } from './api'
  import { notify } from './notifications.svelte'

  type Item = { id: string; source: 'post' | 'operator'; kind: 'post' | 'profile' | 'community'; label: string; href: string; reason: string; state: 'open' | 'resolved' | 'dismissed'; created: number; decision: string | null }
  let { auth }: { auth: Auth } = $props()
  let items = $state<Item[] | null>(null),
    error = $state(''),
    busy = $state(false)
  async function load() {
    error = ''
    try {
      items = (await request<{ reports: Item[] }>('/v1/operator/reports')).reports
    } catch (e) {
      error = e instanceof Error ? e.message : 'Laporan belum dapat dimuat.'
    }
  }
  $effect(() => {
    if (auth.steward) void load()
  })
  async function decide(item: Item, state: 'resolved' | 'dismissed') {
    if (busy) return
    busy = true
    try {
      await request('/v1/operator/reports/' + item.id + '/decide', { source: item.source, state, decision: '' })
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Keputusan belum tersimpan.')
    } finally {
      busy = false
    }
  }
  const open = $derived((items ?? []).filter((i) => i.state === 'open'))
  const closed = $derived((items ?? []).filter((i) => i.state !== 'open').slice(0, 30))
</script>

{#snippet row(i: Item)}
  <article class="sr-row">
    <div class="sr-main">
      <a href={i.href}><Flag size={14} />{i.label}</a>
      <p>{i.reason}</p>
      <small>{relativeDate(i.created)}{i.state === 'resolved' ? ' · ditangani' : i.state === 'dismissed' ? ' · diabaikan' : ''}</small>
    </div>
    {#if i.state === 'open'}
      <div class="sr-actions">
        <Button variant="outline" size="sm" disabled={busy} onclick={() => decide(i, 'resolved')}>Sudah ditangani</Button>
        <Button variant="ghost" size="sm" disabled={busy} onclick={() => decide(i, 'dismissed')}>Abaikan</Button>
      </div>
    {/if}
  </article>
{/snippet}

<div class="studio-page studio-reports">
  <StudioTabs current="reports" operator={auth.steward} />
  {#if !auth.steward}
    <section class="etnos-nodata"><h1>Laporan</h1><p>Halaman ini hanya untuk pengelola ETNOS.</p></section>
  {:else if error}
    <section class="etnos-nodata"><h1>Laporan</h1><p>{error}</p><Button variant="outline" onclick={load}>Coba lagi</Button></section>
  {:else if !items}
    <ContentSkeleton />
  {:else}
    <div class="commons-page-head">
      <div>
        <h1>Laporan</h1>
        <p class="cx-hint">Laporan posting, profil dan komunitas dari seluruh node. Laporan posting juga terlihat oleh moderator komunitasnya. Nama pelapor tidak ditampilkan.</p>
      </div>
    </div>
    <section class="sr-section" aria-labelledby="sr-open">
      <h2 id="sr-open">Terbuka{open.length ? ' (' + open.length + ')' : ''}</h2>
      {#if !open.length}<p class="sr-empty">Tidak ada laporan yang terbuka.</p>{/if}
      {#each open as i (i.source + i.id)}{@render row(i)}{/each}
    </section>
    {#if closed.length}
      <section class="sr-section" aria-labelledby="sr-closed">
        <h2 id="sr-closed">Sudah diputuskan</h2>
        {#each closed as i (i.source + i.id)}{@render row(i)}{/each}
      </section>
    {/if}
  {/if}
</div>

<style>
  .studio-reports { padding-bottom: 48px; }
  .sr-section { padding: 20px var(--studio-gutter, 24px) 8px; display: grid; gap: 4px; max-width: 880px; }
  .sr-section h2 { font-size: 1.05rem; font-weight: 650; margin: 0 0 8px; }
  .sr-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .sr-main { display: grid; gap: 4px; min-width: 0; flex: 1 1 280px; }
  .sr-main a { display: inline-flex; align-items: center; gap: 6px; font-weight: 650; font-size: 15.5px; color: var(--foreground); }
  .sr-main p { margin: 0; font-size: 14.5px; line-height: 1.5; overflow-wrap: anywhere; }
  .sr-main small { color: var(--muted-foreground); font-size: 13px; }
  .sr-actions { display: flex; gap: 8px; align-items: start; }
  .sr-empty { margin: 0; color: var(--muted-foreground); font-size: 14.5px; }
  @media (max-width: 767px) { .sr-section { padding-inline: 16px; } }
</style>
