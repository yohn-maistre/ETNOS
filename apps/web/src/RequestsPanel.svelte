<script lang="ts">
  // Permintaan between organisations. Stewards of the asked organisation approve or decline each one;
  // stewards of the asking organisation can withdraw theirs.
  import { Inbox } from '@lucide/svelte'
  import { request, relativeDate } from './api'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  type Row = {
    id: string
    state: 'pending' | 'approved' | 'declined' | 'withdrawn'
    created: number
    requester: { id: string; title: string }
    target?: { id: string; title: string } | null
    post: { id: string; text: string; title: string | null } | null
  }
  let { groupId, onError }: { groupId: string; onError: (message: string) => void } = $props()
  let incoming = $state<Row[]>([]),
    outgoing = $state<Row[]>([]),
    loading = $state(true),
    busy = $state('')
  const states = { pending: 'Menunggu persetujuan', approved: 'Disetujui', declined: 'Ditolak', withdrawn: 'Ditarik' }
  async function load() {
    try {
      ;[incoming, outgoing] = await Promise.all([
        request<Row[]>('/v1/groups/' + groupId + '/requests'),
        request<Row[]>('/v1/groups/' + groupId + '/requests?direction=out'),
      ])
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Permintaan belum bisa dimuat')
    } finally {
      loading = false
    }
  }
  $effect(() => {
    void groupId
    loading = true
    void load()
  })
  async function act(id: string, kind: 'decide' | 'withdraw', decision?: 'approved' | 'declined') {
    busy = id
    try {
      await request('/v1/aksara-requests/' + id + '/' + kind, kind === 'decide' ? { decision } : {})
      await load()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Permintaan belum bisa diproses')
    } finally {
      busy = ''
    }
  }
</script>

{#snippet item(r: Row, mine: boolean)}
  <li class="req">
    <div class="req-head">
      <strong>{mine ? (r.target?.title ?? 'Lembaga tertutup') : r.requester.title}</strong>
      <Badge variant={r.state === 'pending' ? 'secondary' : 'outline'}>{states[r.state]}</Badge>
      <span class="req-time">{relativeDate(r.created)}</span>
    </div>
    {#if r.post}<p class="req-text">{r.post.title ? r.post.title + '. ' : ''}{r.post.text}</p>
      <a class="req-link" href={'/square/' + r.post.id}>Buka posting</a>{/if}
    {#if !mine && r.state === 'pending'}<div class="req-actions">
        <Button size="sm" disabled={busy === r.id} onclick={() => act(r.id, 'decide', 'approved')}>Setujui</Button>
        <Button size="sm" variant="outline" disabled={busy === r.id} onclick={() => act(r.id, 'decide', 'declined')}>Tolak</Button>
      </div>{/if}
    {#if mine && (r.state === 'pending' || r.state === 'approved')}<div class="req-actions">
        <Button size="sm" variant="outline" disabled={busy === r.id} onclick={() => act(r.id, 'withdraw')}>Tarik</Button>
      </div>{/if}
  </li>
{/snippet}

<section class="req-panel" aria-label="Permintaan">
  <h2 class="req-title">Permintaan untuk lembaga ini</h2>
  <p class="req-note">Aksara lembaga ini hanya bisa mengerjakan permintaan yang sudah disetujui, dan hanya sebatas izinnya sendiri.</p>
  {#if loading}<p class="req-note">Memuat permintaan…</p>
  {:else if !incoming.length}<div class="etnos-nodata"><Inbox size={26} /><h2>Belum ada permintaan</h2><p>Permintaan dari Aksara lembaga lain akan tampil di sini.</p></div>
  {:else}<ul class="req-list">{#each incoming as r (r.id)}{@render item(r, false)}{/each}</ul>{/if}
  {#if outgoing.length}<h2 class="req-title">Permintaan yang dikirim</h2>
    <ul class="req-list">{#each outgoing as r (r.id)}{@render item(r, true)}{/each}</ul>{/if}
</section>

<style>
  .req-panel { padding: 0 16px 24px; }
  .req-title { margin: 16px 0 4px; font-size: 17px; font-weight: 700; }
  .req-note { margin: 0 0 8px; font-size: 14px; line-height: 1.5; color: var(--muted-foreground); }
  .req-list { list-style: none; margin: 0; padding: 0; }
  .req { padding: 14px 0; border-top: 1px solid var(--commons-hairline, var(--border)); }
  .req-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .req-time { font-size: 13px; color: var(--muted-foreground); }
  .req-text { margin: 6px 0 4px; font-size: 15px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .req-link { font-size: 13px; color: var(--muted-foreground); text-decoration: underline; text-underline-offset: 2px; }
  .req-actions { display: flex; gap: 8px; margin-top: 10px; }
</style>
