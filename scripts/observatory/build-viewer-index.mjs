// Builds src/catalogues/tanah-papua-viewer-index.json from the viewer records in
// apps/web/public/observatory/viewer/objects.json, so the server can say which entry each record belongs to
// without bundling the records themselves. Run it after build-viewer-seed.mjs (that script calls it at the end).
//
// A record is media on one entry (docs/plan/one-page-system-2026-11-21.md §2):
// - a landform record is about a thing of the knowledge model (its `about`), and belongs to that entry;
// - a species record is its own entry of the kind makhluk, unless ENTRY below names another;
// - a 3D object or image set is its own entry of the kind benda;
// - a recording of an animal belongs to the animal, named in ENTRY;
// - a dataset record belongs to no entry (it is listed under Riset dan data instead).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const objects = JSON.parse(readFileSync(join(ROOT, 'apps/web/public/observatory/viewer/objects.json'), 'utf8')).objects

/** Records whose entry is not the record itself. Values are an entry slug, or an entry of its own. */
const ENTRY = {
  'spesimen-nokdiak-tubingen': { slug: 'nokdiak-naroten' },
  'suara-cikukua-tanduk': { slug: 'cikukua-tanduk', class: 'makhluk', title: 'Cikukua tanduk', scientificName: 'Philemon buceroides' },
}
const CLASS = { species: 'makhluk', model: 'benda', images: 'benda', audio: 'makhluk' }

const records = objects.map((o) => {
  const own = ENTRY[o.id]
  let entry = null
  if (o.kind === 'dataset') entry = null
  else if (o.kind === 'landform' && o.about?.length) entry = { slug: o.about[0], class: 'tempat', landform: true }
  else if (own && !own.class) entry = { slug: own.slug }
  else if (own) entry = { slug: own.slug, class: own.class, title: own.title, scientificName: own.scientificName }
  else entry = { slug: o.id, class: CLASS[o.kind], title: o.title, scientificName: o.species?.scientificName }
  return {
    id: o.id,
    kind: o.kind,
    title: o.title,
    subtitle: o.subtitle ?? null,
    summary: o.summary,
    thumb: o.thumb ?? null,
    entry,
    taxonomy: o.species?.taxonomy ?? null,
    facts: (o.facts ?? []).map((f) => ({ label: f.label, value: f.value })),
  }
})
const out = join(ROOT, 'src/catalogues/tanah-papua-viewer-index.json')
writeFileSync(out, JSON.stringify({ version: 1, about: 'Built by scripts/observatory/build-viewer-index.mjs from the viewer records. Which entry each record of the Penampil belongs to.', records }, null, 1) + '\n')
console.log('viewer index:', records.length, 'records')
