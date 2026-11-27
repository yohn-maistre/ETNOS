// Loads the Peta Kata glimpse once per page: the language list and the forms of one concept (ensiklopedia-glimpse.ts).
import { request } from './api'
import { firstForms, pickSpecimen, type Glimpse, type GlimpseLang, type GlimpseWord } from './ensiklopedia-glimpse.ts'

let cache: Promise<Glimpse | null> | null = null
/** Peta Kata's languages and the forms of one concept. Both answers are edge-cached; a failure gives null. */
export function loadGlimpse(concept = 'air'): Promise<Glimpse | null> {
  cache ??= Promise.all([
    request<{ concepts: { key: string; id: string }[]; languages: GlimpseLang[] }>('/v1/peta-kata/concepts', undefined, undefined, true),
    request<{ concept: { key: string; id: string } | null; words: GlimpseWord[] }>('/v1/peta-kata?concept=' + encodeURIComponent(concept), undefined, undefined, true),
  ])
    .then(([index, lookup]) => {
      if (!lookup.concept) return null
      const forms = firstForms(lookup.words)
      return { concept: lookup.concept, languages: index.languages, forms, specimen: pickSpecimen(forms, index.languages) }
    })
    .catch(() => {
      cache = null
      return null
    })
  return cache
}
