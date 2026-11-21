<script lang="ts">
  // The full-screen viewer (Penampil) at `/wiki/lihat/:id`. One shell for every record: the body in the middle is
  // chosen by the kind of media and loaded only when it is opened (3D object, species, landform, images, sound,
  // dataset), and the panel beside it holds what the record is, its facts, and every source with its licence.
  // Esc or the back button closes it.
  import { onMount } from 'svelte'
  import { ArrowUpRight, X } from '@lucide/svelte'
  import { readDataset } from './datasets.ts'
  import { KIND_LABEL, loadViewerObjects, viewerHref, type ViewerObject } from './viewer-data.ts'
  import { OBSERVATORY_NAME, VIEWER_NAME } from './observatory-name.ts'
  import './styles/viewer.css'

  let { id }: { id: string } = $props()
  let object = $state<ViewerObject | null>(null),
    all = $state<ViewerObject[]>([]),
    phase = $state<'loading' | 'ready' | 'missing'>('loading'),
    titles = $state<Map<string, string>>(new Map()),
    home = $state<HTMLAnchorElement>()

  const BODY = {
    model: () => import('./viewer/ModelBody.svelte'),
    species: () => import('./viewer/SpeciesBody.svelte'),
    landform: () => import('./viewer/LandformBody.svelte'),
    images: () => import('./viewer/ImagesBody.svelte'),
    audio: () => import('./viewer/AudioBody.svelte'),
    dataset: () => import('./viewer/DatasetBody.svelte'),
  }
  const related = $derived(object ? (object.related ?? []).map((r) => all.find((o) => o.id === r)).filter((o): o is ViewerObject => !!o) : [])

  onMount(() => {
    const abort = new AbortController()
    void (async () => {
      all = await loadViewerObjects()
      let found = all.find((o) => o.id === id) ?? null
      if (!found && id.startsWith('data-')) {
        // Any dataset of the catalogue opens here too, with its record as the panel and no table preview.
        const d = await readDataset(id.slice(5), abort.signal).catch(() => null)
        if (d) found = { id, kind: 'dataset', title: d.title, subtitle: d.publisher, summary: d.description, checked: d.checked ?? '', dataset: { id: d.id }, datasets: [d.id], sources: [{ title: d.title, url: d.landingPage, publisher: d.publisher, licence: { name: d.licence, url: d.licenceUrl ?? undefined } }] }
      }
      if (abort.signal.aborted) return
      object = found
      phase = found ? 'ready' : 'missing'
      if (found?.about?.length) {
        const g = await fetch('/observatory/knowledge/graph.json', { signal: abort.signal }).then((r) => r.json()).catch(() => null)
        if (g) titles = new Map((g.nodes as { id: string; title: string }[]).map((n) => [n.id, n.title]))
      }
    })()
    const root = document.documentElement, before = root.style.overflow
    root.style.overflow = 'hidden'
    return () => { abort.abort(); root.style.overflow = before }
  })
  $effect(() => { if (object) document.title = object.title + ' · ' + VIEWER_NAME + ' · ETNOS' })
  function close() {
    if (history.state?.etnosDepth > 0) history.back()
    else home?.click()
  }
  function keydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || e.defaultPrevented) return
    if (e.target instanceof Element && e.target.closest('input,textarea')) return
    e.preventDefault()
    close()
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
        {#await BODY[object.kind]()}<div class="vw-hold" role="status">Memuat tampilan</div>
        {:then m}<m.default {object} />
        {:catch}<div class="vw-hold">Tampilan ini belum dapat dimuat. Coba muat ulang halaman.</div>{/await}
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

        {#if object.about?.length || related.length || object.datasets?.length}<section>
            <h2>Terkait</h2>
            <div class="vw-links">
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
</div>
