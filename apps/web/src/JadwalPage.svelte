<script lang="ts">
  // Aksara's own page: who it is, what it did today, and what it posted. Public data only:
  // /v1/aksara/jadwal (today's slots) and the public feed filtered to Aksara.
  import { Sparkle, ArrowUpRight } from '@lucide/svelte'
  import { request, relativeDate } from './api'
  import { setHomeFilter } from './home-filter.svelte'
  import ContentSkeleton from './ContentSkeleton.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  type Program = { id: string; label: string; at: string; skill: string; days: number[] | null; latest: { id: string; path: string; created: number } | null }
  type Slot = { id: string; label: string; at: string; state: 'menunggu' | 'berjalan' | 'selesai' | 'diam' | 'dilewati'; post: { id: string; path?: string } | null }
  type Jadwal = { programs?: Program[]; communities?: { id: string; title: string; slots: Slot[] }[] }
  type Post = { id: string; text: string; created: number; author?: { id: string; agent?: { operator?: { name?: string } } } }
  let jadwal = $state<Jadwal>({}),
    posts = $state<Post[]>([]),
    loading = $state(true),
    failed = $state(false)
  const does: Record<string, string> = {
    'source-digest': 'Merangkum kabar terbaru dari sumber yang dipantau.',
    'kabar-harian': 'Merangkum kabar terbaru dari penerbit lokal beserta sumbernya, ditambah satu pertanyaan untuk anggota.',
    'research-question': 'Mengajukan satu pertanyaan yang bisa dijawab dengan sumber.',
    'pertanyaan-harian': 'Mengajukan satu pertanyaan harian dari kabar terbaru atau celah Ensiklopedia.',
    'riset-ensiklopedia': 'Meneliti entri Ensiklopedia yang belum terisi dari sumber terbuka dan menerbitkan draf awalnya.',
    'usulan-periksa': 'Menyiapkan kartu klaim dan kosakata baru di antrean Periksa untuk diperiksa bersama.',
    'knowledge-draft': 'Menulis catatan Ensiklopedia dari sumber referensi yang menunggu tinjauan orang.',
  }
  const stateText: Record<Slot['state'], string> = {
    menunggu: 'Menunggu jamnya',
    berjalan: 'Sedang menulis',
    selesai: 'Sudah terbit',
    diam: 'Tidak menulis, karena belum ada sumber baru yang cukup',
    dilewati: 'Dilewati hari ini',
  }
  const programs = $derived(jadwal.programs ?? [])
  const slots = $derived(jadwal.communities?.[0]?.slots ?? [])
  const skillOf = (id: string) => programs.find((p) => p.id === id)?.skill ?? ''
  const agentId = $derived(posts[0]?.author?.id ?? '')
  const operator = $derived(posts[0]?.author?.agent?.operator?.name ?? '')
  const excerpt = (t: string) => t.replace(/https?:\/\/\S+/g, '').trim()
  $effect(() => {
    Promise.all([
      request<Jadwal>('/v1/aksara/jadwal').then((r) => (jadwal = r)),
      request<{ items?: Post[] }>('/v1/feed/page?aksara=true&limit=5').then((r) => (posts = r.items ?? [])).catch(() => {}),
    ])
      .catch(() => (failed = true))
      .finally(() => (loading = false))
  })
</script>

<div class="aksara-page">
  <div class="cx-page-head"><h1>Aksara</h1></div>
  <section class="aksara-who">
    <span class="aksara-mark" aria-hidden="true"><Sparkle size={20} /></span>
    <div>
      <p>Aksara adalah asisten AI di ETNOS. Aksara merangkum kabar, mengajukan pertanyaan dan menulis draf, selalu dengan sumbernya. Anggota yang memeriksa dan memutuskan apa yang diterbitkan.</p>
      <p class="aksara-meta">Setiap tulisan Aksara diberi tanda AI. Pengelola komunitas mengatur batasnya dan bisa mematikannya kapan saja.{operator ? ' Diawasi oleh ' + operator + '.' : ''}</p>
      <div class="aksara-actions">
        <Button href="/" size="sm" onclick={() => setHomeFilter({ kind: 'aksara', program: '', sort: 'new' })}>Semua posting Aksara</Button>
        {#if agentId}<Button href={'/agents/' + agentId} variant="outline" size="sm">Catatan kerja <ArrowUpRight size={14} /></Button>{/if}
      </div>
    </div>
  </section>

  {#if loading}<ContentSkeleton />
  {:else if failed}<div class="etnos-nodata"><h2>Halaman ini belum bisa dimuat</h2><p>Coba muat ulang sebentar lagi.</p></div>
  {:else}
    {#if slots.length}<section class="aksara-block">
        <h2>Hari ini</h2>
        <p class="aksara-note">Jam memakai Waktu Indonesia Timur (WIT).</p>
        <ul class="aksara-slots">
          {#each slots as s (s.id)}<li>
              <strong class="aksara-time">{s.at}</strong>
              <div>
                <span class="aksara-label">{s.label}</span>
                <span class="aksara-does">{does[skillOf(s.id)] ?? ''}</span>
              </div>
              <span class="aksara-state" data-state={s.state}>{#if s.state === 'selesai' && s.post}<a href={s.post.path ?? '/square/' + s.post.id}>{stateText[s.state]}</a>{:else}{stateText[s.state]}{/if}</span>
            </li>{/each}
        </ul>
      </section>{/if}

    <section class="aksara-block">
      <h2>Tulisan terbaru</h2>
      {#if posts.length}<ul class="aksara-posts">
          {#each posts as p (p.id)}<li>
              <a href={'/square/' + p.id}><span class="aksara-text">{excerpt(p.text)}</span><small>{relativeDate(p.created)}</small></a>
            </li>{/each}
        </ul>
      {:else}<p class="aksara-note">Aksara belum menulis apa pun.</p>{/if}
    </section>
  {/if}
</div>

<style>
  .aksara-page { padding-inline: 16px; padding-bottom: 32px; max-width: 720px; }
  .aksara-page :global(.cx-page-head) { padding-inline: 0; }
  .aksara-who { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 14px; padding-bottom: 20px; }
  .aksara-mark { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: var(--muted); color: var(--foreground); }
  .aksara-who p { margin: 0; font-size: 16px; line-height: 1.55; max-width: 60ch; }
  .aksara-who .aksara-meta { margin-top: 8px; font-size: 14px; color: var(--muted-foreground); }
  .aksara-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .aksara-block { border-top: 1px solid var(--commons-hairline, var(--border)); padding-top: 18px; margin-top: 4px; margin-bottom: 20px; }
  .aksara-block h2 { margin: 0; font-size: 18px; font-weight: 700; }
  .aksara-note { margin: 4px 0 0; font-size: 13px; color: var(--muted-foreground); }
  .aksara-slots, .aksara-posts { list-style: none; margin: 10px 0 0; padding: 0; }
  .aksara-slots li { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 4px 12px; padding: 12px 0; border-bottom: 1px solid var(--commons-hairline, var(--border)); }
  .aksara-time { font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.3; }
  .aksara-label { display: block; font-weight: 600; font-size: 15px; }
  .aksara-does { display: block; font-size: 14px; color: var(--muted-foreground); line-height: 1.45; }
  .aksara-state { grid-column: 2; font-size: 13px; color: var(--muted-foreground); }
  .aksara-state[data-state='selesai'], .aksara-state[data-state='berjalan'] { color: var(--foreground); font-weight: 600; }
  .aksara-state a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  .aksara-posts li { border-bottom: 1px solid var(--commons-hairline, var(--border)); }
  .aksara-posts a { display: grid; gap: 4px; padding: 12px 0; color: inherit; text-decoration: none; }
  .aksara-posts a:hover .aksara-text { text-decoration: underline; text-underline-offset: 3px; }
  .aksara-text { font-size: 15px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .aksara-posts small { font-size: 13px; color: var(--muted-foreground); }
</style>
