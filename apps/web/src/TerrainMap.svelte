<script lang="ts">
  // Map setup adapted from the owner's West Papua Watch project.
  // maplibre-gl and its CSS are imported dynamically, only once the map
  // scrolls into view, so they never reach the main bundle.
  import { onMount } from 'svelte'
  import { appearance } from './appearance.svelte'
  import { BASEMAPS, OUTLINES, type BasemapId } from './map-basemaps.ts'

  type Place = {
    name: string
    latitude: number | null
    longitude: number | null
    href?: string
    color?: string
  }
  let {
    places,
    focus,
    height = 320,
    label = 'Peta wilayah',
    compact = false,
  }: {
    places: Place[]
    focus?: [[number, number], [number, number]]
    height?: number
    label?: string
    /** Many places: dots only, with the name shown on hover or focus. */
    compact?: boolean
  } = $props()

  const points = $derived(
    places.filter(
      (p) =>
        p.latitude !== null &&
        p.longitude !== null &&
        p.longitude >= 90 &&
        p.longitude <= 155 &&
        p.latitude >= -15 &&
        p.latitude <= 10,
    ),
  )
  const INDONESIA: [[number, number], [number, number]] = [
    [94, -11.5],
    [142, 6],
  ]
  let host: HTMLDivElement
  let canvas: HTMLDivElement
  let loaded = $state(false)
  let failed = $state(false)
  let picked: BasemapId | null = $state(null)
  const active: BasemapId = $derived(
    picked ?? (appearance.theme === 'dark' ? 'night' : 'atlas'),
  )
  let map: any = null
  let lib: any = null
  let markers: any[] = []

  const lineColor = (id: BasemapId) =>
    id === 'atlas' ? '#6b6f7a' : 'rgba(255,255,255,.75)'

  function bounds() {
    if (focus) return focus
    if (!points.length) return INDONESIA
    let [w, s, e, n] = [180, 90, -180, -90]
    for (const p of points) {
      w = Math.min(w, p.longitude!)
      e = Math.max(e, p.longitude!)
      s = Math.min(s, p.latitude!)
      n = Math.max(n, p.latitude!)
    }
    return [
      [w, s],
      [e, n],
    ] as [[number, number], [number, number]]
  }
  function fit(animate: boolean) {
    if (!map) return
    const b = bounds()
    const single = b[0][0] === b[1][0] && b[0][1] === b[1][1]
    if (single)
      map.jumpTo({ center: b[0], zoom: 6 })
    else
      map.fitBounds(b, {
        padding: { top: 56, bottom: 72, left: 40, right: 40 },
        maxZoom: 8,
        duration: animate ? 400 : 0,
      })
  }
  function drawMarkers() {
    for (const m of markers) m.remove()
    markers = []
    if (!map || !lib) return
    const brand =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--brand')
        .trim() || '#1f4e8c'
    for (const p of points) {
      const el = document.createElement(p.href ? 'a' : 'div')
      el.className = compact ? 'tm-place tm-compact' : 'tm-place'
      if (p.href) (el as HTMLAnchorElement).href = p.href
      if (compact) el.setAttribute('aria-label', p.name)
      const dot = document.createElement('i')
      dot.style.background = p.color ?? brand
      const name = document.createElement('span')
      name.textContent = p.name
      el.append(dot, name)
      markers.push(
        new lib.Marker({ element: el, anchor: compact ? 'center' : 'top', offset: compact ? [0, 0] : [0, -6] })
          .setLngLat([p.longitude!, p.latitude!])
          .addTo(map),
      )
    }
  }
  function applyBase(id: BasemapId) {
    if (!map || !map.getLayer('tm-prov')) return
    const b = BASEMAPS.find((x) => x.id === id)!
    if (map.getLayer('tm-base')) map.removeLayer('tm-base')
    if (map.getSource('tm-base')) map.removeSource('tm-base')
    map.addSource('tm-base', {
      type: 'raster',
      tiles: [b.tiles],
      tileSize: 256,
      maxzoom: b.maxZoom,
      attribution: b.attribution + ' · ' + OUTLINES.attribution,
    })
    map.addLayer({ id: 'tm-base', type: 'raster', source: 'tm-base' }, 'tm-prov')
    const c = lineColor(id)
    map.setPaintProperty('tm-prov', 'line-color', c)
    map.setPaintProperty('tm-kab', 'line-color', c)
  }
  $effect(() => {
    applyBase(active)
  })
  $effect(() => {
    // Re-fit and redraw when the story's places change.
    points
    if (loaded) {
      drawMarkers()
      fit(true)
    }
  })

  async function start() {
    try {
      const [{ default: maplibregl }] = await Promise.all([
        import('maplibre-gl'),
        import('maplibre-gl/dist/maplibre-gl.css'),
      ])
      lib = maplibregl
      map = new maplibregl.Map({
        container: canvas,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: 'tm-bg',
              type: 'background',
              paint: { 'background-color': '#e9ecf5' },
            },
          ],
        },
        center: [118, -2],
        zoom: 3,
        minZoom: 2,
        maxZoom: 14,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        renderWorldCopies: false,
        cooperativeGestures: true,
        locale: {
          'CooperativeGesturesHandler.WindowsHelpText':
            'Tahan Ctrl dan gulir untuk memperbesar peta',
          'CooperativeGesturesHandler.MacHelpText':
            'Tahan ⌘ dan gulir untuk memperbesar peta',
          'CooperativeGesturesHandler.MobileHelpText':
            'Gunakan dua jari untuk menggeser peta',
        },
      })
      map.addControl(
        new maplibregl.AttributionControl({ compact: false }),
        'bottom-right',
      )
      map.on('load', () => {
        map.addSource('tm-prov', { type: 'geojson', data: OUTLINES.provinces })
        map.addSource('tm-kab', { type: 'geojson', data: OUTLINES.kabupaten })
        map.addLayer({
          id: 'tm-kab',
          type: 'line',
          source: 'tm-kab',
          minzoom: 5,
          paint: { 'line-width': 0.6, 'line-opacity': 0.55, 'line-color': '#6b6f7a' },
        })
        map.addLayer({
          id: 'tm-prov',
          type: 'line',
          source: 'tm-prov',
          paint: { 'line-width': 1.1, 'line-opacity': 0.8, 'line-color': '#6b6f7a' },
        })
        applyBase(active)
        drawMarkers()
        fit(false)
        loaded = true
      })
      map.on('error', (e: any) => {
        if (!loaded && e?.error) failed = true
      })
    } catch {
      failed = true
    }
  }
  onMount(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect()
          start()
        }
      },
      { rootMargin: '240px' },
    )
    io.observe(host)
    return () => {
      io.disconnect()
      for (const m of markers) m.remove()
      map?.remove()
    }
  })
  const zoom = (d: number) => (d > 0 ? map?.zoomIn() : map?.zoomOut())
</script>

<div
  class="tm"
  class:tm-ready={loaded}
  class:tm-dark={active !== 'atlas'}
  style:height={height + 'px'}
  bind:this={host}
  role="group"
  aria-label={label}
>
  <div class="tm-canvas" bind:this={canvas}></div>
  {#if !loaded}<div class="tm-hold" aria-hidden="true">
      {#if failed}<span>Peta belum bisa dimuat</span>{/if}
    </div>{/if}
  {#if loaded}
    <div class="tm-pill" role="group" aria-label="Jenis peta">
      {#each BASEMAPS as b}<button
          type="button"
          aria-pressed={active === b.id}
          onclick={() => (picked = b.id)}>{b.label}</button
        >{/each}
    </div>
    <div class="tm-zoom">
      <button type="button" aria-label="Perbesar" onclick={() => zoom(1)}
        >+</button
      >
      <button type="button" aria-label="Perkecil" onclick={() => zoom(-1)}
        >−</button
      >
    </div>
  {/if}
</div>

<style>
  .tm {
    position: relative;
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--muted);
  }
  .tm-canvas,
  .tm-hold {
    position: absolute;
    inset: 0;
  }
  .tm-hold {
    display: grid;
    place-items: center;
    font-size: 12px;
    color: var(--muted-foreground);
    background: var(--muted);
  }
  .tm-pill,
  .tm-zoom {
    position: absolute;
    z-index: 2;
    display: flex;
    background: #fff;
    color: #2b2d35;
    border-radius: 999px;
    box-shadow: 0 1px 6px rgba(20, 22, 30, 0.22);
    padding: 3px;
    gap: 2px;
  }
  .tm-pill {
    top: 10px;
    left: 10px;
  }
  .tm-zoom {
    right: 10px;
    bottom: 44px;
    flex-direction: column;
    border-radius: 14px;
    padding: 2px;
  }
  .tm-pill button,
  .tm-zoom button {
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12px;
    min-height: 32px;
    min-width: 32px;
    padding: 0 12px;
    border-radius: 999px;
    cursor: pointer;
  }
  .tm-zoom button {
    font-size: 18px;
    padding: 0;
    border-radius: 12px;
  }
  .tm-pill button[aria-pressed='true'] {
    background: #2b2d35;
    color: #fff;
  }
  .tm-pill button:focus-visible,
  .tm-zoom button:focus-visible {
    outline: 2px solid var(--ring, #1f4e8c);
    outline-offset: 1px;
  }
  .tm :global(.tm-place) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    text-decoration: none;
    pointer-events: auto;
  }
  .tm :global(.tm-place i) {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(20, 22, 30, 0.3);
  }
  .tm :global(.tm-place span) {
    background: #fff;
    color: #2b2d35;
    font-size: 11px;
    line-height: 1;
    padding: 4px 7px;
    border-radius: 999px;
    white-space: nowrap;
    box-shadow: 0 1px 4px rgba(20, 22, 30, 0.22);
  }
  /* MapLibre places markers with position: absolute, which also anchors the hidden name below. */
  .tm :global(.tm-compact) {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
  }
  .tm :global(.tm-compact span) {
    position: absolute;
    top: 22px;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease-out;
  }
  .tm :global(.tm-compact:hover span),
  .tm :global(.tm-compact:focus-visible span) {
    opacity: 1;
  }
  .tm :global(.tm-compact:hover),
  .tm :global(.tm-compact:focus-visible) {
    z-index: 3;
  }
  .tm :global(.tm-compact:focus-visible) {
    outline: 2px solid var(--ring, #1f4e8c);
    outline-offset: 2px;
    border-radius: 999px;
  }
  .tm :global(.maplibregl-ctrl-attrib) {
    background: rgba(255, 255, 255, 0.78);
    font-size: 9px;
    line-height: 1.3;
    border-radius: 8px 0 0 0;
    color: #2b2d35;
  }
  .tm :global(.maplibregl-ctrl-attrib a) {
    color: inherit;
  }
  .tm :global(.maplibregl-ctrl-bottom-right) {
    right: 0;
    bottom: 0;
  }
</style>
