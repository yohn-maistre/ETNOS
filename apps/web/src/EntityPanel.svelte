<script lang="ts" module>
  import type { World } from './world-scale.ts'
  export type KNode = { id: string; class: string; title: string; context?: string | null; regions: string[]; degree: number; witnesses: number; excerpts?: number; voices?: Record<string, number>; gaps: string[]; world?: World }
  export type KEdge = { source: string; target: string; predicate: string; logical: string; voices?: string[]; support?: string[] }
  export type KComention = { a: string; b: string; weight: number }
</script>

<script lang="ts">
  // One entry of the knowledge map, read like a news cluster: what is said about it, who says it, what it is
  // mentioned with, and what is still missing. Everything here comes from the public graph and its checked excerpts.
  import * as Sheet from '$lib/components/ui/sheet/index.js'
  import { ArrowUpRight } from '@lucide/svelte'
  import { appearance } from './appearance.svelte'
  import { bandOf, sizeWords, paceWords, rangeWords, BASIS } from './world-scale.ts'
  import { listDatasets, KIND, type Dataset } from './datasets.ts'
  import { KIND_LABEL, objectsAbout, viewerHref, type ViewerObject } from './viewer-data.ts'

  type Witness = { key: string; kind: string; title: string; url?: string; publisher?: string; voice?: string }
  type Excerpt = { digest: string; witness: string; section: string; text: string; mentions: string[] }
  let {
    id = $bindable(''),
    nodes,
    statements,
    comentions,
    regionTitle,
    objects = [],
  }: { id: string; nodes: Map<string, KNode>; statements: KEdge[]; comentions: KComention[]; regionTitle: (region: string) => string; objects?: ViewerObject[] } = $props()
  const views = $derived(id ? objectsAbout(objects, id) : [])

  let excerpts = $state<Excerpt[] | null>(null),
    witnesses = $state<Map<string, Witness>>(new Map()),
    narrow = $state(false)
  const node = $derived(id ? nodes.get(id) : undefined)
  const CLASS: Record<string, string> = { tempat: 'Tempat', bahasa: 'Bahasa', kelompok: 'Masyarakat' }
  const VOICE: Record<string, string> = { ensiklopedia: 'ensiklopedia', pemerintah: 'pemerintah', penutur: 'penutur', peneliti: 'peneliti', warga: 'warga' }
  const href = (n: KNode) => (n.context ? '/contexts/' + n.context : '/wiki?q=' + encodeURIComponent(n.title))

  const partOf = $derived(node ? statements.filter((s) => s.source === node.id && s.predicate === 'bagian-dari').map((s) => nodes.get(s.target)).filter((n): n is KNode => !!n) : [])
  const contains = $derived(node ? statements.filter((s) => s.target === node.id && s.predicate === 'bagian-dari').map((s) => nodes.get(s.source)).filter((n): n is KNode => !!n) : [])
  const together = $derived.by(() => {
    if (!node) return []
    const linked = new Set([...partOf, ...contains].map((n) => n.id))
    return comentions
      .filter((c) => c.a === node.id || c.b === node.id)
      .map((c) => ({ n: nodes.get(c.a === node.id ? c.b : c.a), w: c.weight }))
      .filter((x): x is { n: KNode; w: number } => !!x.n && !linked.has(x.n.id))
      .sort((a, b) => b.w - a.w)
      .slice(0, 8)
  })
  const sources = $derived.by(() => {
    if (!node || !excerpts) return []
    const groups = new Map<string, Excerpt[]>()
    for (const e of excerpts) if (e.mentions.includes(node.id)) groups.set(e.witness, [...(groups.get(e.witness) ?? []), e])
    return [...groups.entries()].map(([key, list]) => ({ witness: witnesses.get(key) ?? { key, kind: 'document', title: key }, list })).sort((a, b) => b.list.length - a.list.length)
  })
  const voiceList = $derived(Object.keys(node?.voices ?? {}).map((v) => VOICE[v] ?? v))
  const gapLines = $derived.by(() => {
    if (!node) return []
    const out: string[] = []
    if (node.gaps.includes('belum-ada-halaman')) out.push('Belum ada halaman wiki.')
    if (node.gaps.includes('belum-ada-penutur')) out.push('Belum ada keterangan dari penutur atau warga setempat.')
    if (node.gaps.includes('satu-suara') && voiceList.length) out.push('Semua sumbernya berasal dari ' + voiceList[0] + '.')
    if (node.gaps.includes('sedikit-saksi')) out.push('Baru ' + node.witnesses + ' sumber yang menyebutnya.')
    if (node.gaps.includes('belum-ada-pernyataan')) out.push('Belum ada pernyataan yang menghubungkannya dengan entri lain.')
    return out
  })

  async function loadExcerpts() {
    if (excerpts) return
    try {
      const res = await fetch('/observatory/knowledge/excerpts.json')
      if (!res.ok) return
      const data = (await res.json()) as { witnesses: Record<string, Witness>; excerpts: Excerpt[] }
      witnesses = new Map(Object.values(data.witnesses).map((w) => [w.key, w]))
      excerpts = data.excerpts
    } catch { excerpts = [] }
  }
  $effect(() => { if (id) loadExcerpts() })
  $effect(() => {
    const mq = matchMedia('(max-width: 640px)'), sync = () => (narrow = mq.matches)
    sync(); mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  })
  const open = (n: KNode) => (id = n.id)

  // Size, pace and level, read as ranges in everyday units, with the basis of each value.
  const world = $derived(node?.world)
  const band = $derived(bandOf(world?.level?.code))
  const bases = $derived([...new Set([world?.size?.basis, world?.pace?.basis, world?.level?.basis].filter((b): b is string => !!b))])
  const notes = $derived([...new Set([world?.size?.note, world?.pace?.note, world?.level?.note].filter((n): n is string => !!n))])
  // Datasets about this thing, from the public catalogue.
  let data = $state<Dataset[] | null>(null)
  $effect(() => {
    const slug = id, abort = new AbortController()
    data = null
    if (!slug) return
    listDatasets({ thing: slug }, abort.signal).then((rows) => { if (!abort.signal.aborted) data = rows }).catch(() => { if (!abort.signal.aborted) data = [] })
    return () => abort.abort()
  })
</script>

<Sheet.Root open={!!node} onOpenChange={(v) => { if (!v) id = '' }}>
  <Sheet.Content side={narrow ? 'bottom' : 'right'} class="entity-panel">
    {#if node}
      <Sheet.Header class="ep-head">
        <p class="ep-meta">{CLASS[node.class] ?? node.class}{node.regions[0] ? ' · ' + regionTitle(node.regions[0]) : ''} · {node.witnesses} sumber · {node.excerpts ?? 0} kutipan</p>
        <Sheet.Title class="ep-title">{node.title}</Sheet.Title>
        <Sheet.Description class="ep-desc">{voiceList.length ? 'Disebut oleh sumber ' + voiceList.join(' dan ') + '.' : 'Belum ada sumber.'}</Sheet.Description>
      </Sheet.Header>
      <div class="ep-body">
        {#if world && (world.size || world.pace || world.level)}<section>
            <h3>Ukuran dan waktu</h3>
            <ul class="ep-rows ep-world">
              {#if world.size}<li><span class="ep-k">Ukuran</span><span>sekitar {rangeWords(world.size, sizeWords)}</span></li>{/if}
              {#if world.pace}<li><span class="ep-k">Lama berubah</span><span>sekitar {rangeWords(world.pace, paceWords)}</span></li>{/if}
              {#if world.level && band}<li><span class="ep-k">Tingkat</span><span class="ep-band"><span class="ep-dot" style:background={appearance.theme === 'dark' ? band.dark : band.light}></span>{band.label} (ILC {world.level.code})</span></li>{/if}
            </ul>
            <p class="ep-note">{bases.length === 1 && bases[0] === 'rule' ? 'Semua angka ini perkiraan dari aturan umum dan belum diukur. Peninjau bisa mengoreksinya.' : 'Dasar angka ini adalah ' + bases.map((b) => BASIS[b] ?? b).join(' dan ') + '.'}</p>
            {#if notes.length}<details class="ep-basis"><summary>Aturan yang dipakai</summary><ul>{#each notes as n (n)}<li>{n}</li>{/each}</ul></details>{/if}
          </section>{/if}
        {#if views.length}<section>
            <h3>Lihat di layar penuh</h3>
            <ul class="ep-data">
              {#each views as v (v.id)}<li><a href={viewerHref(v.id)} class="ep-view">{#if v.thumb}<img src={v.thumb} alt="" width="44" height="44" loading="lazy" />{/if}<span class="ep-view-text"><span>{v.title}</span><small>{KIND_LABEL[v.kind]}{v.subtitle ? ' · ' + v.subtitle : ''}</small></span></a></li>{/each}
            </ul>
          </section>{/if}
        {#if data?.length}<section>
            <h3>Data tentang {node.title}</h3>
            <ul class="ep-data">
              {#each data.slice(0, 5) as d (d.id)}<li><a href={'/wiki/data/' + d.id}><span>{d.title}</span><small>{KIND[d.kind] ?? d.kind} · {d.licence}</small></a></li>{/each}
            </ul>
            {#if data.length > 5}<a class="ep-more" href="/wiki/data">Lihat semua di katalog data</a>{/if}
          </section>{/if}
        {#if partOf.length || contains.length}<section>
            <h3>Hubungan</h3>
            <ul class="ep-rows">
              {#each partOf as n}<li><button type="button" onclick={() => open(n)}><span class="ep-k">Bagian dari</span><span>{n.title}</span></button></li>{/each}
              {#if contains.length}<li class="ep-wrap"><span class="ep-k">Mencakup</span><span class="ep-chips">{#each contains as n}<button type="button" onclick={() => open(n)}>{n.title}</button>{/each}</span></li>{/if}
            </ul>
          </section>{/if}
        {#if together.length}<section>
            <h3>Sering disebut bersama</h3>
            <div class="ep-chips">{#each together as t}<button type="button" onclick={() => open(t.n)}>{t.n.title}</button>{/each}</div>
          </section>{/if}
        <section>
          <h3>Kutipan sumber</h3>
          {#if !excerpts}<p class="ep-note">Memuat kutipan…</p>
          {:else if !sources.length}<p class="ep-note">Belum ada kutipan yang menyebut entri ini.</p>
          {:else}{#each sources.slice(0, 6) as s}<article class="ep-source">
                <p class="ep-src">{#if s.witness.url}<a href={s.witness.url} target="_blank" rel="noopener noreferrer">{s.witness.title}<ArrowUpRight size={13} aria-hidden="true" /></a>{:else}{s.witness.title}{/if}{#if s.witness.publisher}<span> · {s.witness.publisher}</span>{/if}</p>
                {#each s.list.slice(0, 2) as e}<blockquote>{e.text}</blockquote>{/each}
                {#if s.list.length > 2}<p class="ep-note">dan {s.list.length - 2} kutipan lain dari sumber ini</p>{/if}
              </article>{/each}
            {#if sources.length > 6}<p class="ep-note">dan {sources.length - 6} sumber lain</p>{/if}{/if}
        </section>
        {#if gapLines.length}<section>
            <h3>Yang belum diketahui</h3>
            <ul class="ep-gaps">{#each gapLines as g}<li>{g}</li>{/each}</ul>
          </section>{/if}
      </div>
      <Sheet.Footer class="ep-foot">
        <a class="ep-open" href={href(node)}>{node.context ? 'Buka halaman ' + node.title : 'Cari ' + node.title + ' di wiki'}<ArrowUpRight size={15} aria-hidden="true" /></a>
      </Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>

<style>
  :global(.entity-panel[data-side='right']) { width: min(460px, 92vw) !important; max-width: 460px !important; }
  :global(.entity-panel[data-side='bottom']) { max-height: 86dvh; border-radius: 18px 18px 0 0; }
  :global(.entity-panel) { gap: 0 !important; }
  :global(.ep-head) { padding: 22px 22px 14px !important; gap: 6px !important; border-bottom: 1px solid var(--border); }
  .ep-meta { margin: 0; padding-right: 32px; font-size: 13px; color: var(--muted-foreground); }
  :global(.ep-title) { font-size: 26px !important; font-weight: 750 !important; letter-spacing: -0.025em; line-height: 1.1; }
  :global(.ep-desc) { font-size: 14px; }
  .ep-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 4px 22px 18px; }
  section { display: grid; gap: 8px; padding: 16px 0; border-bottom: 1px solid var(--border); }
  section:last-child { border-bottom: 0; }
  h3 { margin: 0; font-size: 13px; font-weight: 650; color: var(--muted-foreground); }
  .ep-rows { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .ep-rows li > button, .ep-wrap { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; width: 100%; padding: 0; border: 0; background: none; color: inherit; font: inherit; font-size: 15px; text-align: left; cursor: pointer; }
  .ep-rows li > button:hover span:last-child { text-decoration: underline; text-underline-offset: 3px; }
  .ep-k { min-width: 84px; font-size: 13px; color: var(--muted-foreground); }
  .ep-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .ep-chips button { min-height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: inherit; font: inherit; font-size: 13.5px; cursor: pointer; }
  .ep-chips button:hover { background: color-mix(in oklab, var(--foreground) 6%, transparent); }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .ep-source { display: grid; gap: 6px; padding: 4px 0 8px; }
  .ep-src { margin: 0; font-size: 13.5px; font-weight: 600; }
  .ep-src a { display: inline-flex; align-items: center; gap: 3px; color: inherit; text-decoration: underline; text-decoration-color: color-mix(in oklab, currentColor 30%, transparent); text-underline-offset: 3px; }
  .ep-src span { font-weight: 400; color: var(--muted-foreground); }
  blockquote { margin: 0; padding: 2px 0 2px 12px; border-left: 2px solid var(--border); font-size: 14.5px; line-height: 1.55; }
  .ep-note { margin: 0; font-size: 13px; color: var(--muted-foreground); }
  .ep-gaps { display: grid; gap: 4px; margin: 0; padding-left: 18px; font-size: 14.5px; line-height: 1.5; }
  .ep-world li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 15px; }
  .ep-world .ep-k { min-width: 96px; }
  .ep-band { display: inline-flex; align-items: center; gap: 7px; }
  .ep-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .ep-basis summary { min-height: 32px; display: flex; align-items: center; font-size: 13px; color: var(--muted-foreground); cursor: pointer; }
  .ep-basis ul { display: grid; gap: 4px; margin: 4px 0 0; padding-left: 18px; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .ep-data { display: grid; margin: 0; padding: 0; list-style: none; }
  .ep-data a { display: grid; gap: 2px; padding: 8px 0; border-top: 1px solid var(--border); color: inherit; text-decoration: none; }
  .ep-data li:first-child a { border-top: 0; }
  .ep-data a span { font-size: 15px; font-weight: 600; line-height: 1.35; }
  .ep-data a:hover span { text-decoration: underline; text-underline-offset: 3px; }
  .ep-data small { font-size: 13px; color: var(--muted-foreground); }
  .ep-data a.ep-view { display: flex; align-items: center; gap: 12px; }
  .ep-view img { flex: none; width: 44px; height: 44px; border-radius: 10px; object-fit: cover; background: var(--secondary); }
  .ep-view-text { display: grid; gap: 2px; min-width: 0; }
  .ep-more { font-size: 13.5px; color: var(--brand, var(--foreground)); }
  :global(.ep-foot) { padding: 14px 22px calc(14px + env(safe-area-inset-bottom)) !important; border-top: 1px solid var(--border); }
  .ep-open { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 42px; padding: 0 16px; border-radius: 10px; background: var(--foreground); color: var(--background); font-size: 14.5px; font-weight: 600; text-decoration: none; }
</style>
