<script lang="ts">
  // The full-screen viewer (Penampil) at `/wiki/lihat/:id`. One shell for every record: the body in the middle is
  // chosen by the kind of media and loaded only when it is opened (3D object, species, landform, images, sound,
  // dataset), and the panel beside it holds what the record is, its facts, and every source with its licence.
  // At the bottom a strip holds the list the reader came from (`?daftar=`): one line of thumbnails with a counter,
  // arrow keys or a swipe to step, and a grid with filters when the strip is pulled up. Stepping keeps the shell and
  // swaps only the body, and the address follows, so Back and sharing still work. Esc or the back button closes it.
  import { onMount, tick, untrack } from 'svelte'
  import { ArrowUpRight, AudioLines, Box, ChevronLeft, ChevronRight, Database, Image, LayoutGrid, Mountain, PawPrint, X } from '@lucide/svelte'
  import { readDataset } from './datasets.ts'
  import { KIND_LABEL, loadViewerObjects, viewerHref, viewerList, viewerListHref, type Kind, type ViewerObject } from './viewer-data.ts'
  import { loadEntry } from './entri'
  import { OBSERVATORY_NAME, VIEWER_NAME } from './observatory-name.ts'
  import './styles/viewer.css'

  let { id, list = '', grid = false }: { id: string; list?: string; grid?: boolean } = $props()
  let current = $state(untrack(() => id)),
    object = $state<ViewerObject | null>(null),
    all = $state<ViewerObject[]>([]),
    entryIds = $state<string[]>([]),
    phase = $state<'loading' | 'ready' | 'missing'>('loading'),
    titles = $state<Map<string, string>>(new Map()),
    open = $state(untrack(() => grid)),
    filter = $state<Kind | ''>(''),
    home = $state<HTMLAnchorElement>(),
    thumbs = $state<HTMLDivElement>()
  // A link inside the viewer to another record changes the route; follow it without leaving the shell.
  $effect(() => { const next = id; untrack(() => { if (next !== current) current = next }) })

  const ICON = { model: Box, species: PawPrint, landform: Mountain, images: Image, audio: AudioLines, dataset: Database }
  const BODY = {
    model: () => import('./viewer/ModelBody.svelte'),
    species: () => import('./viewer/SpeciesBody.svelte'),
    landform: () => import('./viewer/LandformBody.svelte'),
    images: () => import('./viewer/ImagesBody.svelte'),
    audio: () => import('./viewer/AudioBody.svelte'),
    dataset: () => import('./viewer/DatasetBody.svelte'),
  }
  const related = $derived(object ? (object.related ?? []).map((r) => all.find((o) => o.id === r)).filter((o): o is ViewerObject => !!o) : [])
  const items = $derived(viewerList(list, all, entryIds))
  const at = $derived(items.findIndex((o) => o.id === current))
  const kinds = $derived([...new Set(items.map((o) => o.kind))])
  const gridItems = $derived(filter ? items.filter((o) => o.kind === filter) : items)
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  onMount(() => {
    void loadViewerObjects().then((o) => (all = o))
    const root = document.documentElement, before = root.style.overflow
    root.style.overflow = 'hidden'
    return () => { root.style.overflow = before }
  })
  // An entry's own list is the entry's media, which the entry API knows.
  $effect(() => {
    const slug = list.startsWith('entri-') ? list.slice(6) : '', abort = new AbortController()
    entryIds = []
    if (slug) loadEntry(slug, abort.signal).then((e) => { if (!abort.signal.aborted) entryIds = e.media.map((m) => m.id) }).catch(() => {})
    return () => abort.abort()
  })
  $effect(() => {
    const want = current, abort = new AbortController()
    if (!all.length) return
    void (async () => {
      let found = all.find((o) => o.id === want) ?? null
      if (!found && want.startsWith('data-')) {
        // Any dataset of the catalogue opens here too, with its record as the panel and no table preview.
        const d = await readDataset(want.slice(5), abort.signal).catch(() => null)
        if (d) found = { id: want, kind: 'dataset', title: d.title, subtitle: d.publisher, summary: d.description, checked: d.checked ?? '', dataset: { id: d.id }, datasets: [d.id], sources: [{ title: d.title, url: d.landingPage, publisher: d.publisher, licence: { name: d.licence, url: d.licenceUrl ?? undefined } }] }
      }
      if (abort.signal.aborted) return
      object = found
      phase = found ? 'ready' : 'missing'
      if (found?.about?.length && !titles.size) {
        const g = await fetch('/observatory/knowledge/graph.json', { signal: abort.signal }).then((r) => r.json()).catch(() => null)
        if (g) titles = new Map((g.nodes as { id: string; title: string }[]).map((n) => [n.id, n.title]))
      }
    })()
    return () => abort.abort()
  })
  $effect(() => { if (object) document.title = object.title + ' · ' + VIEWER_NAME + ' · ETNOS' })
  // Keep the current thumbnail in view as the reader steps.
  $effect(() => {
    void at
    void tick().then(() => thumbs?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' }))
  })

  function show(next: string) {
    if (next === current) return
    current = next
    // Stepping replaces the address rather than adding to it, so Back still closes the viewer in one step.
    history.replaceState(history.state, '', viewerListHref(next, list))
  }
  function step(by: number) {
    if (items.length < 2) return
    const i = at < 0 ? 0 : (at + by + items.length) % items.length
    show(items[i].id)
  }
  function close() {
    if (open) { open = false; return }
    if (history.state?.etnosDepth > 0) history.back()
    else home?.click()
  }
  function keydown(e: KeyboardEvent) {
    if (e.defaultPrevented) return
    const target = e.target instanceof Element ? e.target : null
    if (target?.closest('input,textarea,select')) return
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    // Arrow keys belong to a body that has focus (turning a model, paging photos); elsewhere they step the list.
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !target?.closest('.vw-stage, [role="slider"]')) {
      e.preventDefault()
      step(e.key === 'ArrowRight' ? 1 : -1)
    }
  }
  // Pull the strip up to open the grid and down to close it; a short horizontal swipe on the bar steps the list.
  let drag: { x: number; y: number; id: number } | null = null
  function down(e: PointerEvent) {
    if ((e.target as Element).closest('button,a')) return
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  function up(e: PointerEvent) {
    if (!drag || drag.id !== e.pointerId) return
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y
    drag = null
    if (Math.abs(dy) > 36 && Math.abs(dy) > Math.abs(dx)) open = dy < 0
    else if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1)
  }
  const date = (iso: string) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return iso } }
  // Full screen sits on the body, above the app shell, as the wiki map did before (KnowledgeMap.svelte).
  function portal(node: HTMLElement) { document.body.appendChild(node); return { destroy() { node.remove() } } }
</script>

<svelte:window onkeydown={keydown} />

<div class="vw" use:portal role="dialog" aria-modal="true" aria-labelledby="vw-title">
  <header class="vw-bar">
    <button type="button" class="vw-close" onclick={close} aria-label="Tutup penampil"><X size={18} aria-hidden="true" /><span>Tutup</span></button>
    <p class="vw-crumb"><a href="/wiki" bind:this={home}>{OBSERVATORY_NAME}</a><span class="vw-sep" aria-hidden="true">/</span>{VIEWER_NAME}</p>
  </header>
  {#if phase === 'loading'}<div class="vw-empty" role="status">Memuat catatan</div>
  {:else if phase === 'missing' || !object}<div class="vw-empty">
      <h1 id="vw-title">Catatan ini tidak ditemukan</h1>
      <p>Tautannya mungkin keliru, atau catatannya sudah ditarik. <a href="/wiki">Kembali ke {OBSERVATORY_NAME}</a></p>
    </div>
  {:else}
    <div class="vw-main">
      <div class="vw-stage">
        {#key object.id}
          {#await BODY[object.kind]()}<div class="vw-hold" role="status">Memuat tampilan</div>
          {:then m}<m.default {object} />
          {:catch}<div class="vw-hold">Tampilan ini belum dapat dimuat. Coba muat ulang halaman.</div>{/await}
        {/key}
      </div>
      <aside class="vw-info" aria-label="Keterangan catatan">
        <p class="vw-kind">{KIND_LABEL[object.kind]}{object.subtitle ? ' · ' + object.subtitle : ''}</p>
        <h1 id="vw-title">{object.title}</h1>
        {#if object.species}<p class="vw-sci"><i>{object.species.scientificName}</i>{object.species.authorship ? ' ' + object.species.authorship : ''}</p>{/if}
        <p class="vw-summary">{object.summary}</p>

        {#if object.species}<section>
            <h2>Taksonomi</h2>
            <p class="vw-tax">{object.species.taxonomy.map((t) => t.name).join(' › ')}</p>
            <p class="vw-small">Menurut GBIF Backbone Taxonomy, nomor takson <a href={'https://www.gbif.org/species/' + object.species.gbif} target="_blank" rel="noopener noreferrer">{object.species.gbif}</a>.</p>
            {#each object.species.names as n (n.value)}<p class="vw-small">Nama dalam bahasa Indonesia {n.value} ({n.source}).</p>{/each}
            <p class="vw-small">{object.species.localNames}</p>
          </section>{/if}

        {#if object.facts?.length}<section>
            <h2>Keterangan</h2>
            <dl class="vw-facts">
              {#each object.facts as f (f.label)}<div><dt>{f.label}</dt><dd>{f.value}{#if f.source}{' '}<a class="vw-src" href={f.source.url} target="_blank" rel="noopener noreferrer">{f.source.title}</a>{/if}</dd></div>{/each}
            </dl>
          </section>{/if}

        {#if object.kind !== 'dataset' || object.about?.length || related.length || object.datasets?.length}<section>
            <h2>Terkait</h2>
            <div class="vw-links">
              {#if object.kind !== 'dataset'}<a href={'/wiki/' + encodeURIComponent(object.about?.[0] ?? object.id)}>Halaman di {OBSERVATORY_NAME}</a>{/if}
              {#each object.about ?? [] as a (a)}<a href={'/wiki/peta?lens=peta&focus=' + encodeURIComponent(a)}>{titles.get(a) ?? 'Hal terkait'} di peta pengetahuan</a>{/each}
              {#each related as r (r.id)}<a href={viewerHref(r.id)}>{KIND_LABEL[r.kind]}: {r.title}</a>{/each}
              {#each object.datasets ?? [] as d (d)}<a href={'/wiki/data/' + encodeURIComponent(d)}>Catatan dataset di katalog data</a>{/each}
            </div>
          </section>{/if}

        <section>
          <h2>Sumber dan lisensi</h2>
          <ul class="vw-sources">
            {#each object.sources as s (s.url + s.title)}<li>
                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<ArrowUpRight size={13} aria-hidden="true" /></a>
                <span>{[s.publisher, s.attribution].filter(Boolean).join(' · ')}</span>
                {#if s.licence}<span>Lisensi {#if s.licence.url}<a href={s.licence.url} target="_blank" rel="noopener noreferrer">{s.licence.name}</a>{:else}{s.licence.name}{/if}</span>{/if}
                {#if s.note}<span>{s.note}</span>{/if}
              </li>{/each}
          </ul>
          {#if object.checked}<p class="vw-small">Sumber, lisensi dan angka di halaman ini diperiksa pada {date(object.checked)}. Catatan ini belum ditinjau pengelola.</p>{/if}
        </section>
      </aside>
    </div>
  {/if}

  {#if items.length > 1}
    <section class="vw-strip" class:open aria-label="Daftar catatan">
      {#if open}<div class="vw-grid" id="vw-grid">
          {#if kinds.length > 1}<div class="vw-floating vw-filter" role="radiogroup" aria-label="Saring menurut jenis">
              <button type="button" role="radio" aria-checked={filter === ''} onclick={() => (filter = '')}>Semua</button>
              {#each kinds as k (k)}<button type="button" role="radio" aria-checked={filter === k} onclick={() => (filter = k)}>{KIND_LABEL[k]}</button>{/each}
            </div>{/if}
          <ul class="vw-cards">
            {#each gridItems as o (o.id)}<li><button type="button" class="vw-card" aria-current={o.id === current} onclick={() => { show(o.id); open = false }}>
                  {#if o.thumb}<img src={o.thumb} alt="" loading="lazy" width="96" height="96" />{:else}{@const Icon = ICON[o.kind]}<span class="vw-card-blank" aria-hidden="true"><Icon size={22} /></span>{/if}
                  <span><strong>{o.title}</strong><small>{KIND_LABEL[o.kind]}</small></span>
                </button></li>{/each}
          </ul>
        </div>{/if}
      <div class="vw-strip-bar" onpointerdown={down} onpointerup={up} onpointercancel={() => (drag = null)} role="group" aria-label="Langkah daftar">
        <span class="vw-grab" aria-hidden="true"></span>
        <button type="button" class="vw-step" onclick={() => step(-1)} aria-label="Catatan sebelumnya"><ChevronLeft size={18} aria-hidden="true" /></button>
        <span class="vw-count" aria-live="polite">{at >= 0 ? at + 1 + ' / ' + items.length : items.length + ' catatan'}</span>
        <button type="button" class="vw-step" onclick={() => step(1)} aria-label="Catatan berikutnya"><ChevronRight size={18} aria-hidden="true" /></button>
        <div class="vw-thumbs" bind:this={thumbs}>
          {#each items as o (o.id)}<button type="button" class="vw-thumb" aria-current={o.id === current} aria-label={o.title} title={o.title} onclick={() => show(o.id)}>
              {#if o.thumb}<img src={o.thumb} alt="" loading="lazy" width="44" height="44" />{:else}{@const Icon = ICON[o.kind]}<Icon size={18} aria-hidden="true" />{/if}
            </button>{/each}
        </div>
        <button type="button" class="vw-expand" aria-expanded={open} aria-controls="vw-grid" aria-label={open ? 'Tutup daftar' : 'Lihat semua catatan dalam daftar'} onclick={() => (open = !open)}><LayoutGrid size={16} aria-hidden="true" /><span>{open ? 'Tutup daftar' : 'Semua'}</span></button>
      </div>
    </section>
  {/if}
</div>
