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
  /** Earlier wordings of the description that an import may replace. */
  previous?: string[]
  /** Earlier titles that an import may replace; a title a steward typed never matches. */
  previousTitles?: string[]
}
export type CatalogueFamily = { key: string; title: string; basis: string; sources: { title: string; url: string }[] }
export type Catalogue = {
  name: string
  version?: string
  sources: { title: string; url: string; [field: string]: string | undefined }[]
  notes: string[]
  entries: CatalogueEntry[]
  /** Label families and what each was adapted from. A context belongs to the family named by its facet, or by its kind when it has none. */
  /** The area this deployment is about, in degrees. Ambient data is filtered to it. */
  bounds?: { west: number; south: number; east: number; north: number }
  families?: CatalogueFamily[]
  familyAliases?: Record<string, string>
  /** Which labels get a published-research search, the area words added to it, and search terms per slug. */
  literature?: { scope: string; families: string[]; skip?: string[]; terms?: Record<string, string> }
  /** Forms of association offered when someone starts a community. Each slug is also an entry. */
  communityKinds?: { slug: string; title: string; description: string; examples: string[]; visibility: 'public' | 'listed-private'; admission: 'open' | 'approval' | 'invite' }[]
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
  return { key, name: c.name, version: c.version ?? null, entries: c.entries.length, kinds, sources: c.sources, notes: c.notes, communityKinds: c.communityKinds ?? [], families: c.families ?? [] }
}

/** What a context's family was adapted from, if the deployment catalogue says. */
export function contextFamily(context: { kind: string; facet?: string }, key = defaultCatalogue): CatalogueFamily | null {
  const { catalogue: c } = catalogue(key)
  const name = context.facet || context.kind,
    family = c.familyAliases?.[name] ?? name
  return c.families?.find((f) => f.key === family) ?? null
}
