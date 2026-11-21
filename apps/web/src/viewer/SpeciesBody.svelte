<script lang="ts">
  // A species: licensed photos, the places where it has been recorded in Tanah Papua (GBIF occurrences with an open
  // licence, rounded so that no exact nest or roost can be read from the map), and a recording when there is one.
  import { onMount } from 'svelte'
  import ImageBody from './ImageBody.svelte'
  import AudioBody from './AudioBody.svelte'
  import { loadMapLibre } from './maplibre.ts'
  import { BASEMAPS, OUTLINES } from '../map-basemaps.ts'
  import type { Occurrences, ViewerObject } from '../viewer-data.ts'

  let { object }: { object: ViewerObject } = $props()
  type View = 'foto' | 'sebaran' | 'suara'
  const views = $derived([...(object.photos?.length ? ['foto'] : []), ...(object.species?.occurrences ? ['sebaran'] : []), ...(object.audio ? ['suara'] : [])] as View[])
  const LABEL: Record<View, string> = { foto: 'Foto', sebaran: 'Sebaran', suara: 'Suara' }
  let view = $state<View>('foto'), host = $state<HTMLDivElement>(), mapPhase = $state<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  let map: any = null
  onMount(() => { view = views[0] ?? 'foto'; return () => map?.remove() })

  async function startMap() {
    const occ = object.species?.occurrences
    if (!occ || !host || map) return
    mapPhase = 'loading'
    try {
      const [lib, data] = await Promise.all([loadMapLibre(), fetch(occ.src).then((r) => r.json() as Promise<Occurrences>)])
      const atlas = BASEMAPS[0]
      map = new lib.Map({
        container: host,
        style: { version: 8, sources: {}, layers: [{ id: 'sp-bg', type: 'background', paint: { 'background-color': '#e9ecf5' } }] },
        bounds: [[129.2, -9.4], [141.3, 0.4]], fitBoundsOptions: { padding: 24 }, attributionControl: false, renderWorldCopies: false, dragRotate: false,
      })
      map.addControl(new lib.AttributionControl({ compact: true }), 'bottom-right')
      // The compact credit opens by itself; on a phone it would cover the map, so it starts closed there.
      if (innerWidth < 640) map.once('idle', () => host?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'))
      map.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right')
      map.on('load', () => {
        map.addSource('sp-base', { type: 'raster', tiles: [atlas.tiles], tileSize: 256, maxzoom: atlas.maxZoom, attribution: atlas.attribution + ' · ' + OUTLINES.attribution })
        map.addLayer({ id: 'sp-base', type: 'raster', source: 'sp-base' })
        map.addSource('sp-prov', { type: 'geojson', data: OUTLINES.provinces })
        map.addLayer({ id: 'sp-prov', type: 'line', source: 'sp-prov', paint: { 'line-width': 1, 'line-opacity': 0.7, 'line-color': '#6b6f7a' } })
        map.addSource('sp-occ', { type: 'geojson', attribution: 'Catatan keberadaan: GBIF.org', data: { type: 'FeatureCollection', features: data.points.map(([lon, lat, n]) => ({ type: 'Feature', properties: { n }, geometry: { type: 'Point', coordinates: [lon, lat] } })) } })
        map.addLayer({ id: 'sp-occ', type: 'circle', source: 'sp-occ', paint: { 'circle-color': '#067132', 'circle-opacity': 0.78, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.2, 'circle-radius': ['interpolate', ['linear'], ['get', 'n'], 1, 4.5, 10, 8, 50, 12] } })
        mapPhase = 'ready'
      })
    } catch { mapPhase = 'failed' }
  }
  $effect(() => { if (view === 'sebaran') void startMap(); else if (map) map.resize() })
  $effect(() => { if (view === 'sebaran' && map) requestAnimationFrame(() => map?.resize()) })
</script>

<div class="sp">
  {#if views.length > 1}<div class="vw-floating sp-views" role="tablist" aria-label="Tampilan spesies">
      {#each views as v (v)}<button type="button" role="tab" aria-selected={view === v} onclick={() => (view = v)}>{LABEL[v]}</button>{/each}
    </div>{/if}
  <div class="sp-pane" hidden={view !== 'foto'}>{#if object.photos?.length}<ImageBody photos={object.photos} label={'Foto ' + object.title} />{/if}</div>
  <div class="sp-pane sp-map" hidden={view !== 'sebaran'}>
    <div class="sp-host" bind:this={host} role="region" aria-label={'Peta catatan keberadaan ' + object.title + ' di Tanah Papua'}></div>
    {#if mapPhase === 'loading'}<p class="sp-wait" role="status">Memuat peta sebaran</p>{:else if mapPhase === 'failed'}<p class="sp-wait">Peta sebaran belum dapat dimuat.</p>{/if}
    {#if object.species?.occurrences}<p class="sp-note">Peta ini memuat {object.species.occurrences.shown.toLocaleString('id-ID')} dari {object.species.occurrences.total.toLocaleString('id-ID')} catatan GBIF di Tanah Papua, yaitu catatan yang berlisensi terbuka. {object.species.occurrences.rounding} <a href={object.species.occurrences.url} target="_blank" rel="noopener noreferrer">Lihat di GBIF</a></p>{/if}
  </div>
  {#if object.audio}<div class="sp-pane" hidden={view !== 'suara'}><AudioBody {object} /></div>{/if}
</div>

<style>
  .sp { position: relative; width: 100%; height: 100%; min-height: 320px; }
  .sp-pane { position: absolute; inset: 0; }
  .sp-pane[hidden] { display: none; }
  .sp-views { left: 12px; top: 12px; z-index: 3; }
  .sp-host { position: absolute; inset: 0; }
  .sp-wait { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; font-size: 14.5px; color: #3a4150; }
  .sp-note a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  .sp-note { position: absolute; left: 12px; top: 64px; max-width: min(460px, calc(100% - 24px)); margin: 0; padding: 7px 11px; border-radius: 10px; background: color-mix(in oklab, var(--background) 90%, transparent); backdrop-filter: blur(8px); border: 1px solid var(--border); font-size: 13px; line-height: 1.4; }
  .sp-map :global(.maplibregl-ctrl-top-right) { top: 56px; }
  @media (max-width: 640px) { .sp-note { top: auto; bottom: 36px; } }
</style>
