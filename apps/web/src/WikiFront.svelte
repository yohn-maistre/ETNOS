<script lang="ts">
  // The front of the wiki, built from the knowledge model's public graph (observatory/knowledge/graph.json):
  // the map of how places, peoples and languages connect, what is still unknown, and the large groups the
  // connections fall into. The graph holds only checked public sources, so nothing private reaches this page.
  import { onMount } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import EntityPanel from './EntityPanel.svelte'
  import KnowledgeGraph3D from './KnowledgeGraph3D.svelte'

  type Node = { id: string; class: string; title: string; context?: string; regions: string[]; x: number; y: number; cluster: number; degree: number; witnesses: number; gaps: string[] }
  type Edge = { source: string; target: string; predicate: string; logical: string }
  type Comention = { a: string; b: string; weight: number }
  type Cluster = { cluster: number; size: number; role: string; label: string; top: string[]; byClass: Record<string, number> }
  type Coverage = { region: string; title: string; entities: number; contexts: number; contextsWithoutPage: { slug: string; title: string }[] }
  type Graph = { counts: { entities: number; statements: number; excerpts: number; clusters: number }; nodes: Node[]; statements: Edge[]; comentions: Comention[]; clusters: Cluster[]; questions: { a: string; b: string; question: string }[]; gaps: { coverage: Coverage[]; languagesWithoutEntity: number; languagesTotal: number; singleSourceStatements: number } }
  let { region = '' }: { region?: string } = $props()

  let graph = $state<Graph | null>(null),
    lens = $state<'jaringan' | 'kelompok' | 'celah'>('jaringan'),
    selected = $state('')
  const byId = $derived(new Map((graph?.nodes ?? []).map((n) => [n.id, n])))
  const CLASS: Record<string, string> = { tempat: 'Tempat', bahasa: 'Bahasa', kelompok: 'Masyarakat' }
  const href = (n: Node | undefined) => (n?.context ? '/contexts/' + n.context : '/wiki?q=' + encodeURIComponent(n?.title ?? ''))
  const missingPage = (n: Node) => n.gaps.includes('belum-ada-halaman')
  const sections = $derived((graph?.clusters ?? []).filter((c) => c.size >= 5).sort((a, b) => b.size - a.size))
  // Colours: by class of entry, or by the large group it belongs to. Groups too small to list share one grey.
  const CLASS_COLOR: Record<string, string> = { tempat: '#4f7a5e', bahasa: '#a2643a', kelompok: '#5b6ea8' }
  const GROUP_COLOR = ['#4f7a5e', '#a2643a', '#5b6ea8', '#9a6a8a', '#2f7a8a', '#b08a2e', '#7d6b39', '#6a6f86', '#c27a5a']
  const groupColor = $derived(new Map(sections.map((c, k) => [c.cluster, GROUP_COLOR[k % GROUP_COLOR.length]])))
  const colorOf = $derived(lens === 'kelompok' ? (n: Node) => groupColor.get(n.cluster) ?? '#9a9a9a' : (n: Node) => CLASS_COLOR[n.class] ?? '#6a6f86')
  const coverage = $derived((graph?.gaps.coverage ?? []).filter((c) => c.contextsWithoutPage.length).sort((a, b) => b.contextsWithoutPage.length - a.contextsWithoutPage.length))
  const regionTitles = $derived(new Map((graph?.gaps.coverage ?? []).map((c) => [c.region, c.title])))
  // A plain click opens the entry's panel; a modified click still follows the link.
  const pick = (n: Node) => (e: MouseEvent) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); selected = n.id }
  const ROLE: Record<string, string> = { inti: 'Banyak terhubung', 'dasar-tipis': 'Sumber masih sedikit', khusus: 'Kelompok khusus', 'baru-atau-memudar': 'Baru muncul' }

  onMount(async () => {
    try { const res = await fetch('/observatory/knowledge/graph.json'); if (res.ok) graph = await res.json() } catch { graph = null }
  })
</script>

{#if graph}
  <section class="wf-map" aria-labelledby="wf-map-title">
    <div class="wf-head">
      <h2 id="wf-map-title">Peta pengetahuan</h2>
      <div class="wf-lens" role="radiogroup" aria-label="Cara melihat peta">
        <button type="button" role="radio" aria-checked={lens === 'jaringan'} onclick={() => (lens = 'jaringan')}>Hubungan</button>
        <button type="button" role="radio" aria-checked={lens === 'kelompok'} onclick={() => (lens = 'kelompok')}>Kelompok</button>
        <button type="button" role="radio" aria-checked={lens === 'celah'} onclick={() => (lens = 'celah')}>Belum diketahui</button>
      </div>
    </div>
    <p class="wf-dek">{graph.counts.entities} tempat, masyarakat dan bahasa, dihubungkan oleh {graph.counts.statements} pernyataan dari {graph.counts.excerpts} kutipan sumber publik. {lens === 'celah' ? 'Titik yang ditandai belum punya halaman wiki.' : lens === 'kelompok' ? 'Warna menunjukkan kelompok besar. Entri satu kelompok sering disebut bersama.' : 'Entri yang sering disebut bersama berada berdekatan. Garis tebal adalah pernyataan, garis tipis adalah sebutan bersama.'} Geser untuk memutar peta, ketuk titik untuk membuka entri.</p>
    <KnowledgeGraph3D nodes={graph.nodes} statements={graph.statements} comentions={graph.comentions ?? []} {lens} {region} {colorOf} bind:selected label={'Peta hubungan ' + graph.counts.entities + ' entri. Daftar entri ada di bagian Kelompok besar dalam peta.'} />
    <ul class="wf-legend" aria-label="Keterangan warna">
      {#if lens === 'kelompok'}{#each sections as c}<li><span class="dot" style:background={groupColor.get(c.cluster)}></span>{c.label}</li>{/each}
      {:else}{#each Object.entries(CLASS) as [k, v]}<li><span class="dot" style:background={CLASS_COLOR[k]}></span>{v}</li>{/each}{/if}
    </ul>
  </section>

  <section class="wf-unknown" aria-labelledby="wf-unknown-title">
    <h2 id="wf-unknown-title">Yang belum diketahui</h2>
    <div class="wf-cols">
      <div>
        <h3>Tempat yang belum punya halaman</h3>
        <ul class="wf-list">
          {#each coverage as c}<li><a href={'/contexts/' + c.region}><span class="wf-item">{c.title}</span><span class="wf-meta">{c.contextsWithoutPage.length} dari {c.contexts} tempat belum punya halaman</span></a></li>{/each}
          <li><span class="wf-item">Bahasa</span><span class="wf-meta">{graph.gaps.languagesWithoutEntity} dari {graph.gaps.languagesTotal} bahasa di katalog belum masuk peta</span></li>
        </ul>
      </div>
      <div>
        <h3>Pertanyaan yang bisa dijawab warga</h3>
        <ul class="wf-list">
          {#each graph.questions.slice(0, 5) as q}<li><a href={href(byId.get(q.a))}><span class="wf-item">{q.question}</span><span class="wf-meta">Saran dari peta, belum tentu ada hubungannya</span></a></li>{/each}
        </ul>
      </div>
    </div>
  </section>

  {#if sections.length}<section class="wf-groups" aria-labelledby="wf-groups-title">
      <h2 id="wf-groups-title">Kelompok besar dalam peta</h2>
      <div class="wf-grid">
        {#each sections as c}<article>
            <h3>{c.label}</h3>
            <p class="wf-meta">{c.size} entri · {ROLE[c.role] ?? c.role}</p>
            <ul class="wf-list compact">
              {#each c.top.slice(0, 6) as id}{@const n = byId.get(id)}{#if n}<li><a href={href(n)} onclick={pick(n)}><span class="wf-item">{n.title}</span><ArrowUpRight size={14} aria-hidden="true" /></a></li>{/if}{/each}
            </ul>
          </article>{/each}
      </div>
    </section>{/if}
  <EntityPanel bind:id={selected} nodes={byId} statements={graph.statements} comentions={graph.comentions ?? []} regionTitle={(r) => regionTitles.get(r) ?? r} />
{/if}

<style>
  .wf-map, .wf-unknown, .wf-groups { display: grid; gap: 12px; padding: 28px 24px 24px; border-top: 1px solid var(--border); }
  @media (max-width: 640px) { .wf-map, .wf-unknown, .wf-groups { padding: 22px 16px 20px; } }
  h2 { margin: 0; font-size: clamp(22px, 3vw, 28px); font-weight: 700; letter-spacing: -0.015em; line-height: 1.15; }
  h3 { margin: 0; font-size: 16px; font-weight: 650; line-height: 1.3; }
  .wf-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 10px; }
  .wf-lens { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--border); border-radius: 999px; }
  .wf-lens button { min-height: 34px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; color: var(--muted-foreground); font: inherit; font-size: 13.5px; font-weight: 550; cursor: pointer; }
  .wf-lens button[aria-checked='true'] { background: var(--foreground); color: var(--background); }
  .wf-lens button:focus-visible, .wf-list a:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .wf-dek { margin: 0; max-width: 68ch; font-size: 15px; line-height: 1.55; color: var(--muted-foreground); }
  .wf-legend { display: flex; flex-wrap: wrap; gap: 14px; margin: 0; padding: 0; list-style: none; font-size: 13px; color: var(--muted-foreground); }
  .wf-legend li { display: inline-flex; align-items: center; gap: 6px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; }
  .wf-cols { display: grid; gap: 24px; }
  @media (min-width: 760px) { .wf-cols { grid-template-columns: 1fr 1fr; gap: 40px; } }
  .wf-cols h3 { padding-bottom: 8px; }
  .wf-list { display: grid; margin: 0; padding: 0; list-style: none; }
  .wf-list li { border-top: 1px solid var(--border); }
  .wf-list li > a, .wf-list li > span:first-child, .wf-list li:has(> .wf-item) { display: grid; gap: 2px; padding: 10px 0; color: inherit; text-decoration: none; }
  .wf-list.compact li > a { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; }
  .wf-list a:hover .wf-item { text-decoration: underline; text-underline-offset: 3px; }
  .wf-item { font-size: 15px; font-weight: 550; line-height: 1.4; }
  .wf-meta { margin: 0; font-size: 13px; color: var(--muted-foreground); line-height: 1.4; }
  .wf-grid { display: grid; gap: 28px 40px; }
  @media (min-width: 640px) { .wf-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1100px) { .wf-grid { grid-template-columns: repeat(3, 1fr); } }
  .wf-grid article { display: grid; gap: 4px; align-content: start; }
</style>
