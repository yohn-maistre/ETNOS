// The public layout file behind Peta wiki, read once and shared by the map and the wiki home sections.
export type MapNode = { k: 'region' | 'page' | 'source' | 'passage' | 'catalogue'; reg: string; t: string; x?: string; y?: number | null; ya?: [number, number]; href?: string; d?: string[]; f?: string; v?: string; kind?: string; slug?: string; p: [number, number, number] }
export type MapData = { built: string; model: string; domains: Record<string, string>; forms: Record<string, string>; nodes: MapNode[]; edges: [number, number, string][] }
let pending: Promise<MapData | null> | null = null
export function loadMap(src = '/observatory/map.json'): Promise<MapData | null> {
  pending ??= fetch(src).then((r) => (r.ok ? (r.json() as Promise<MapData>) : null)).catch(() => null)
  return pending
}
/** Region slugs that read as highlands, for choosing an engraving. */
export const highlandRegions = new Set(['meepago', 'la-pago'])
