// Terrain under the small maps: plain image tiles from the basemap server, placed in the same coordinate space
// as the site's map data (site-map.json and papua-atlas.json are Web Mercator pixels at zoom 7, offset by the
// tile grid in site-map.json). No map library and no script beyond this arithmetic, so a page of thumbnails
// costs a few small JPEGs that the browser caches and shares between them.
import { BASEMAPS, type BasemapId } from './map-basemaps.ts'

// The site map's first zoom-7 tile is (109, 63), drawn at left -185.5 and top -165, so its origin in global
// zoom-7 pixels is (109 * 256 + 185.5, 63 * 256 + 165).
const ORIGIN_X = 109 * 256 + 185.5
const ORIGIN_Y = 63 * 256 + 165
const WORLD = 256 * 2 ** 7

/** Latitude and longitude to the site map's coordinates (zoom-7 Web Mercator pixels). */
export function project(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * WORLD
  const s = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD
  return [x - ORIGIN_X, y - ORIGIN_Y]
}

export type Tile = { href: string; x: number; y: number; size: number }

/**
 * The tiles that cover a box in site coordinates when it is drawn `px` CSS pixels wide.
 * The zoom follows the drawn size, capped by the basemap and at 1.5 device pixels per CSS pixel to save data.
 */
export function tilesFor(box: [number, number, number, number], px: number, base: BasemapId = 'atlas'): Tile[] {
  const basemap = BASEMAPS.find((b) => b.id === base) ?? BASEMAPS[0]
  const density = Math.min(1.5, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)
  const z = Math.max(3, Math.min(basemap.maxZoom, 9, Math.round(7 + Math.log2(Math.max(1, px) * density / box[2]))))
  const size = 256 * 2 ** (7 - z)
  const [x0, y0, w, h] = box
  const fromX = Math.floor((x0 + ORIGIN_X) / size), toX = Math.floor((x0 + w + ORIGIN_X) / size)
  const fromY = Math.floor((y0 + ORIGIN_Y) / size), toY = Math.floor((y0 + h + ORIGIN_Y) / size)
  const out: Tile[] = []
  for (let ty = fromY; ty <= toY; ty++)
    for (let tx = fromX; tx <= toX; tx++)
      out.push({
        href: basemap.tiles.replace('{z}', String(z)).replace('{x}', String(tx)).replace('{y}', String(ty)),
        x: tx * size - ORIGIN_X,
        y: ty * size - ORIGIN_Y,
        size,
      })
  return out
}

export const TERRAIN_CREDIT = 'Terrain © EOX · OpenStreetMap contributors'
