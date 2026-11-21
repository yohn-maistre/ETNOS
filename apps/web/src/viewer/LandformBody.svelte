<script lang="ts">
  // A landform in relief: open elevation tiles under a satellite or terrain basemap, tilted so the shape of a
  // mountain, valley, lake or bay can be seen and turned. Tapping the map reads the height of that point from the
  // same elevation tiles. The point and the facts come from the record's sources.
  import { onMount } from 'svelte'
  import { Minus, Mountain, Plus, RotateCcw } from '@lucide/svelte'
  import { BASEMAPS, type BasemapId } from '../map-basemaps.ts'
  import { loadMapLibre, TERRAIN } from './maplibre.ts'
  import type { ViewerObject } from '../viewer-data.ts'

  let { object }: { object: ViewerObject } = $props()
  const spec = $derived(object.landform!)
  let host = $state<HTMLDivElement>(),
    phase = $state<'loading' | 'ready' | 'failed'>('loading'),
    base = $state<BasemapId>('satellite'),
    tall = $state(true),
    reading = $state('')
  let map: any = null

  function setBase(id: BasemapId) {
    base = id
    if (!map) return
    const b = BASEMAPS.find((x) => x.id === id)!
    if (map.getLayer('lf-base')) map.removeLayer('lf-base')
    if (map.getSource('lf-base')) map.removeSource('lf-base')
    map.addSource('lf-base', { type: 'raster', tiles: [b.tiles], tileSize: 256, maxzoom: b.maxZoom, attribution: b.attribution })
    map.addLayer({ id: 'lf-base', type: 'raster', source: 'lf-base' }, 'lf-shade')
  }
  function relief(on: boolean) { tall = on; map?.setTerrain({ source: 'lf-dem', exaggeration: on ? 1.8 : 1 }) }
  function home(animate = true) { map?.[animate ? 'easeTo' : 'jumpTo']({ center: spec.center, zoom: spec.zoom, pitch: spec.pitch, bearing: spec.bearing, duration: animate ? 700 : 0 }) }

  onMount(() => {
    let dead = false
    void loadMapLibre().then((lib) => {
      if (dead || !host) return
      map = new lib.Map({
        container: host,
        style: { version: 8, sources: {}, layers: [{ id: 'lf-bg', type: 'background', paint: { 'background-color': '#d9dde4' } }] },
        center: spec.center, zoom: spec.zoom, pitch: spec.pitch, bearing: spec.bearing,
        maxPitch: 80, attributionControl: false, renderWorldCopies: false,
      })
      map.addControl(new lib.AttributionControl({ compact: true }), 'bottom-right')
      // The compact credit opens by itself; on a phone it would cover the map, so it starts closed there.
      if (innerWidth < 640) map.once('idle', () => host?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'))
      map.on('load', () => {
        map.addSource('lf-dem', { type: 'raster-dem', tiles: [TERRAIN.tiles], tileSize: 256, maxzoom: TERRAIN.maxzoom, encoding: 'terrarium', attribution: TERRAIN.attribution })
        map.addSource('lf-shade-src', { type: 'raster-dem', tiles: [TERRAIN.tiles], tileSize: 256, maxzoom: TERRAIN.maxzoom, encoding: 'terrarium' })
        map.addLayer({ id: 'lf-shade', type: 'hillshade', source: 'lf-shade-src', paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#1d2433' } })
        setBase(base)
        map.setTerrain({ source: 'lf-dem', exaggeration: 1.8 })
        new lib.Marker({ color: '#e0a83a' }).setLngLat(spec.center).addTo(map)
        phase = 'ready'
      })
      map.on('click', (e: any) => {
        const h = map.queryTerrainElevation(e.lngLat)
        reading = h === null ? '' : 'Ketinggian titik yang diketuk sekitar ' + Math.round(h / (tall ? 1.8 : 1)).toLocaleString('id-ID') + ' m menurut data ketinggian Terrain Tiles.'
      })
      map.on('error', (e: any) => { if (phase === 'loading' && e?.error) phase = 'failed' })
    }).catch(() => (phase = 'failed'))
    return () => { dead = true; map?.remove(); map = null }
  })
</script>

<div class="lf">
  <div class="lf-map" bind:this={host} role="region" aria-label={'Relief ' + object.title + '. Seret untuk menggeser, klik kanan atau dua jari untuk memutar.'}></div>
  {#if phase === 'loading'}<div class="lf-wait" role="status">Memuat relief</div>{:else if phase === 'failed'}<div class="lf-wait">Peta relief belum dapat dimuat.</div>{/if}
  {#if phase === 'ready'}
    <div class="vw-tools">
      <button type="button" onclick={() => map?.zoomIn()} aria-label="Perbesar" title="Perbesar"><Plus size={16} /></button>
      <button type="button" onclick={() => map?.zoomOut()} aria-label="Perkecil" title="Perkecil"><Minus size={16} /></button>
      <button type="button" onclick={() => home()} aria-label="Atur ulang tampilan" title="Atur ulang tampilan"><RotateCcw size={15} /></button>
      <button type="button" aria-pressed={tall} onclick={() => relief(!tall)} aria-label="Tinggikan relief" title={tall ? 'Relief ditinggikan 1,8 kali' : 'Relief sesuai aslinya'}><Mountain size={15} /></button>
    </div>
    <div class="vw-floating lf-base" role="radiogroup" aria-label="Jenis peta">
      {#each BASEMAPS.filter((b) => b.id !== 'night') as b (b.id)}<button type="button" role="radio" aria-checked={base === b.id} onclick={() => setBase(b.id)}>{b.label}</button>{/each}
    </div>
    <p class="lf-read" aria-live="polite">{reading || (tall ? 'Relief ditinggikan 1,8 kali supaya bentuknya terlihat. Ketuk peta untuk membaca ketinggian.' : 'Relief sesuai aslinya. Ketuk peta untuk membaca ketinggian.')}</p>
  {/if}
</div>

<style>
  .lf { position: relative; width: 100%; height: 100%; min-height: 320px; background: #d9dde4; }
  .lf-map { position: absolute; inset: 0; }
  .lf-wait { position: absolute; inset: 0; display: grid; place-items: center; font-size: 14.5px; color: #3a4150; }
  .lf-base { left: 12px; top: 12px; }
  .lf-read { position: absolute; left: 12px; bottom: 12px; max-width: min(420px, calc(100% - 120px)); margin: 0; padding: 7px 11px; border-radius: 10px; background: color-mix(in oklab, var(--background) 90%, transparent); backdrop-filter: blur(8px); border: 1px solid var(--border); font-size: 13px; line-height: 1.4; }
  .lf :global(.maplibregl-ctrl-attrib) { font-size: 11px; }
</style>
