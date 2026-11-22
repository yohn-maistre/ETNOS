<script lang="ts">
  // Public schedule of Aksara's regular posts: when each program runs and where its latest post is.
  import { CalendarClock } from '@lucide/svelte'
  import { request, relativeDate } from './api'
  import { setHomeFilter } from './home-filter.svelte'
  import ContentSkeleton from './ContentSkeleton.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  type Program = { id: string; label: string; at: string; skill: string; days: number[] | null; latest: { id: string; path: string; created: number } | null }
  let programs = $state<Program[]>([]),
    loading = $state(true),
    failed = $state(false)
  const does: Record<string, string> = {
    'source-digest': 'Aksara merangkum kabar terbaru dari sumber yang sudah dipantau dan menautkan setiap sumbernya.',
    'research-question': 'Aksara mengajukan satu pertanyaan yang bisa dijawab dengan sumber, lalu mengundang warga menjawabnya.',
    'knowledge-draft': 'Aksara menulis draf Ensiklopedia dari sumber yang baru masuk, dan draf itu menunggu tinjauan orang.',
  }
  const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
  const when = (p: Program) => (p.days ? p.days.map((d) => dayNames[d - 1]).join(', ') : 'Setiap hari')
  $effect(() => {
    request<{ programs?: Program[] }>('/v1/aksara/jadwal')
      .then((r) => (programs = r.programs ?? []))
      .catch(() => (failed = true))
      .finally(() => (loading = false))
  })
</script>

<div class="jadwal-page">
<div class="cx-page-head"><h1>Jadwal Aksara</h1></div>
<p class="jadwal-intro">Aksara menulis posting tetap pada jam berikut. Semua jam memakai Waktu Indonesia Timur (WIT). Setiap posting memuat sumbernya dan diberi tanda bahwa penulisnya AI.</p>
{#if loading}<ContentSkeleton />
{:else if failed}<div class="etnos-nodata"><h2>Jadwal belum bisa dimuat</h2><p>Coba muat ulang halaman ini sebentar lagi.</p></div>
{:else if !programs.length}<div class="etnos-nodata"><CalendarClock size={26} /><h2>Belum ada program</h2><p>Jadwal akan tampil di sini setelah Aksara dijadwalkan.</p></div>
{:else}<ul class="jadwal-list">
    {#each programs as p (p.id)}<li>
      <div class="jadwal-time"><strong>{p.at}</strong><small>WIT</small></div>
      <div class="jadwal-body">
        <h2>{p.label}</h2>
        <p>{does[p.skill] ?? 'Aksara menulis satu posting pada jam ini.'}</p>
        <p class="jadwal-meta">{when(p) + (p.latest ? ' · posting terakhir ' + relativeDate(p.latest.created) : '')}</p>
        <div class="jadwal-actions">
          {#if p.latest}<Button href={p.latest.path} variant="outline" size="sm">Lihat posting terakhir</Button>{/if}
          <Button href="/" variant="ghost" size="sm" onclick={() => setHomeFilter({ kind: 'aksara', program: p.id, sort: 'new' })}>Semua posting program ini</Button>
        </div>
      </div>
    </li>{/each}
  </ul>{/if}
</div>

<style>
  .jadwal-page { padding-inline: 16px; padding-bottom: 24px; }
  .jadwal-page :global(.cx-page-head) { padding-inline: 0; }
  .jadwal-intro { margin: 0 0 16px; font-size: 15px; line-height: 1.55; color: var(--muted-foreground); max-width: 60ch; }
  .jadwal-list { list-style: none; margin: 0; padding: 0; }
  .jadwal-list li { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 16px; padding: 14px 0; border-top: 1px solid var(--commons-hairline, var(--border)); }
  .jadwal-time { display: grid; align-content: start; }
  .jadwal-time strong { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .jadwal-time small { font-size: 12px; color: var(--muted-foreground); }
  .jadwal-body h2 { margin: 0 0 4px; font-size: 17px; font-weight: 700; }
  .jadwal-body p { margin: 0; font-size: 15px; line-height: 1.5; }
  .jadwal-body .jadwal-meta { margin-top: 6px; font-size: 13px; color: var(--muted-foreground); }
  .jadwal-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
</style>
