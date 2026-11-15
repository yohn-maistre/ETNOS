import { Fault } from './core.ts'
import tanahPapua from './catalogues/tanah-papua.json' with { type: 'json' }

/** One context a deployment ships. `parents` name other entries (or existing contexts) by slug. */
export type CatalogueEntry = {
  slug: string
  title: string
  kind: 'place' | 'region' | 'topic' | 'language'
  facet?: string
  description: string
  language: string
  aliases: string[]
  parents: string[]
}
export type Catalogue = {
  name: string
  version?: string
  sources: { title: string; url: string; [field: string]: string | undefined }[]
  notes: string[]
  entries: CatalogueEntry[]
}

/** Deployment catalogues bundled at build time. The engine knows none of their
 * places; a deployment picks one by name (STRATA_CATALOGUE) and a node steward loads it. */
const shipped: Record<string, Catalogue> = { 'tanah-papua': tanahPapua as Catalogue }
export const defaultCatalogue = 'tanah-papua'

export function catalogue(key = defaultCatalogue) {
  const value = Object.hasOwn(shipped, key) ? shipped[key] : undefined
  if (!value) throw new Fault(404, 'Catalogue not found')
  return { key, catalogue: value }
}

/** Public description of the deployment catalogue; it is shipped public data. */
export function catalogueSummary(key = defaultCatalogue) {
  const { catalogue: c } = catalogue(key)
  const kinds: Record<string, number> = {}
  for (const e of c.entries) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1
  return { key, name: c.name, version: c.version ?? null, entries: c.entries.length, kinds, sources: c.sources, notes: c.notes }
}
