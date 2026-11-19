<script lang="ts">
  // One switch for Aksara across every public community the operator looks after. On sets Aksara up where it is
  // new (30-day permissions that renew while it stays on, questions through @aksara, the daily schedule) and wakes
  // a paused one; off pauses it everywhere. Each community shows what Aksara did today and anything that stopped it.
  import { onMount } from 'svelte'
  import { Switch } from '$lib/components/ui/switch/index.js'
  import { request } from './api'

  type Room = { id: string; title: string; configured: boolean; enabled: boolean; ready: boolean; reason: string | null; expires: number | null; mine: boolean; jobsToday: number; dailyLimit: number | null }
  type Overview = { budget: { modelCalls: number }; provider: string | null; model: { keyless: string | null; keyed: { host: string; fast: string } | null } | null; communities: Room[] }
  let { onChanged }: { onChanged?: () => void } = $props()
  let view = $state<Overview | null>(null),
    busy = $state(false),
    error = $state(''),
    skipped = $state<{ title: string; reason?: string }[]>([])
  const on = $derived(!!view?.communities.some((c) => c.enabled && c.mine))
  const date = (t: number) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

  async function load() {
    try { view = await request<Overview>('/v1/resident/overview') } catch (e) { error = e instanceof Error ? e.message : 'Status Aksara belum dapat dimuat.' }
  }
  onMount(load)
  async function toggle(next: boolean) {
    if (busy) return
    busy = true
    error = ''
    try {
      const r = await request<{ results: { title: string; state: string; reason?: string }[] }>('/v1/resident/all', { enabled: next, requestKey: crypto.randomUUID() })
      skipped = r.results.filter((x) => x.state === 'dilewati')
      await load()
      onChanged?.()
    } catch (e) { error = e instanceof Error ? e.message : 'Belum dapat diubah.' } finally { busy = false }
  }
</script>

{#if view}
  <section class="aksara-switch" aria-label="Aksara">
    <div class="as-head">
      <div>
        <h2>Aksara</h2>
        <p>{on ? 'Aktif. Aksara bekerja sendiri sesuai jadwal dan menjawab saat disebut.' : 'Dijeda. Aksara tidak membuat tugas baru.'}</p>
      </div>
      <Switch checked={on} disabled={busy || !view.communities.length} onCheckedChange={(v) => toggle(v)} aria-label={on ? 'Jeda Aksara' : 'Aktifkan Aksara'} />
    </div>
    <dl class="as-facts">
      <div><dt>Model</dt><dd>{view.model?.keyed ? view.model.keyed.fast + ' · ' + view.model.keyed.host : (view.model?.keyless ?? 'Belum ada model') + ' · tanpa kunci'}</dd></div>
      <div><dt>Batas harian</dt><dd>{view.budget.modelCalls} panggilan model untuk seluruh situs</dd></div>
    </dl>
    {#if view.communities.length}<ul class="as-rooms">
        {#each view.communities as c (c.id)}<li>
            <span class="as-dot" class:live={c.enabled && c.ready} aria-hidden="true"></span>
            <div>
              <strong>{c.title}</strong>
              <small>{#if !c.configured}Belum disiapkan{:else if !c.mine}Dijalankan operator lain{:else if !c.enabled}Dijeda{:else if !c.ready}{c.reason ?? 'Belum dapat bekerja'}{:else}{c.jobsToday} dari {c.dailyLimit} tugas hari ini{#if c.expires}{' · izin diperpanjang otomatis sebelum ' + date(c.expires)}{/if}{/if}</small>
            </div>
          </li>{/each}
      </ul>{:else}<p class="as-note">Belum ada komunitas publik yang kamu kelola.</p>{/if}
    {#if skipped.length}<p class="as-note">Dilewati: {skipped.map((s) => s.title + (s.reason ? ' (' + s.reason + ')' : '')).join(', ')}.</p>{/if}
    {#if error}<p class="commons-alert" role="status">{error}</p>{/if}
    <p class="as-note">Semua yang ditulis Aksara diberi label AI dan sumber, dan dapat dihapus atau dikoreksi. Usulan Wiki tetap ditinjau manusia.</p>
  </section>
{/if}

<style>
  .aksara-switch { display: grid; gap: 14px; padding: 16px; margin: 0 0 18px; border: 1px solid var(--border); border-radius: 16px; background: var(--card); }
  .as-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  h2 { margin: 0; font-size: 18px; font-weight: 600; }
  .as-head p { margin: 4px 0 0; font-size: 14px; line-height: 1.5; color: var(--muted-foreground); max-width: 52ch; }
  .as-facts { display: flex; flex-wrap: wrap; gap: 8px 28px; margin: 0; }
  .as-facts div { display: grid; gap: 2px; }
  dt { font-size: 12.5px; color: var(--muted-foreground); }
  dd { margin: 0; font-size: 14px; font-weight: 550; overflow-wrap: anywhere; }
  .as-rooms { margin: 0; padding: 0; list-style: none; display: grid; }
  .as-rooms li { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid var(--border); }
  .as-rooms div { display: grid; gap: 1px; min-width: 0; }
  strong { font-size: 14.5px; font-weight: 600; }
  small { font-size: 13px; color: var(--muted-foreground); }
  .as-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--border); }
  .as-dot.live { background: var(--brand); }
  .as-note { margin: 0; font-size: 13px; line-height: 1.5; color: var(--muted-foreground); }
</style>
