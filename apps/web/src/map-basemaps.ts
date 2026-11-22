// Basemap choices for TerrainMap. Map setup adapted from the owner's West Papua Watch project.
//
// LICENCE NOTE for operators of other ETNOS instances: the EOX terrain and
// Sentinel-2 cloudless 2025 layers below are free for NON-COMMERCIAL use only
// (https://maps.eox.at/ terms). Replace the `tiles` and `attribution` values
// with a basemap whose licence fits your use. Nothing else needs to change.
export type BasemapId = 'atlas' | 'satellite' | 'night'
export type Basemap = {
  id: BasemapId
  label: string
  tiles: string
  attribution: string
  maxZoom: number
}
export const BASEMAPS: Basemap[] = [
  {
    id: 'atlas',
    label: 'Peta',
    tiles:
      'https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    attribution: 'Terrain © EOX · OpenStreetMap contributors · NASA / METI',
    maxZoom: 14,
  },
  {
    id: 'satellite',
    label: 'Satelit',
    tiles:
      'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    attribution: 'EOxCloudless · modified Copernicus Sentinel data 2025',
    maxZoom: 14,
  },
  {
    id: 'night',
    label: 'Malam',
    tiles:
      'https://tiles.maps.eox.at/wmts/1.0.0/blackmarble_3857/default/g/{z}/{y}/{x}.jpg',
    attribution: 'Black Marble composite · NASA Earth Observatory / EOX',
    maxZoom: 8,
  },
]
export const OUTLINES = {
  provinces: '/geo/provinsi.geojson',
  kabupaten: '/geo/kabupaten.geojson',
  attribution: 'Batas wilayah © Badan Informasi Geospasial',
}
