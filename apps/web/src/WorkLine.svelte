<script lang="ts">
  // The small status line under a work post. It names the organisation and, when another
  // organisation was asked, where that request stands.
  import { Building2 } from '@lucide/svelte'
  import type { WorkLabel } from './api'
  let { work }: { work: WorkLabel } = $props()
  const status = { diusulkan: 'Diusulkan', dikerjakan: 'Dikerjakan', selesai: 'Selesai', ditarik: 'Ditarik' }
  const asked = { pending: 'menunggu persetujuan', approved: 'disetujui', declined: 'ditolak', withdrawn: 'ditarik' }
</script>

<p class="work-line" data-status={work.status}>
  <span class="work-status">{status[work.status]}</span>
  <span class="work-sep" aria-hidden="true">·</span>
  <a href={'/groups/' + work.group.id}><Building2 size={13} aria-hidden="true" />{work.group.title}</a>
  {#if work.requestedOf && work.requestState}
    <span class="work-sep" aria-hidden="true">·</span>
    <span>Meminta bantuan <a href={'/groups/' + work.requestedOf.id}>{work.requestedOf.title}</a> · {asked[work.requestState]}</span>
  {:else if work.requestState}
    <span class="work-sep" aria-hidden="true">·</span>
    <span>Meminta bantuan organisasi lain · {asked[work.requestState]}</span>
  {/if}
</p>

<style>
  .work-line { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 12px 0 0; font-size: 13px; line-height: 1.4; color: var(--muted-foreground); }
  .work-line a { display: inline-flex; align-items: center; gap: 4px; color: inherit; text-decoration: underline; text-underline-offset: 2px; }
  .work-status { display: inline-flex; align-items: center; min-height: 24px; padding: 0 10px; border-radius: 999px; background: var(--muted); color: var(--foreground); font-weight: 600; }
  .work-line[data-status='selesai'] .work-status { background: color-mix(in oklab, var(--foreground) 10%, transparent); }
</style>
