// MapLibre for the viewer bodies, loaded only when a body needs a map, and the open elevation tiles used for relief.
// Terrain Tiles on the AWS Registry of Open Data (Mapzen's tiles, from SRTM, GMTED2010 and ETOPO1 among others)
// need no key; their attribution is required and is shown on every map that uses them.
export async function loadMapLibre() {
  const [{ default: maplibregl }] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
  return maplibregl
}
export const TERRAIN = {
  tiles: 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png',
  maxzoom: 15,
  attribution: 'Ketinggian: Terrain Tiles (Mapzen, AWS Open Data) dari SRTM dan GMTED2010 (USGS) serta ETOPO1 (NOAA)',
  page: 'https://registry.opendata.aws/terrain-tiles/',
}
