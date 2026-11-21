// Jenis lembaga (docs/plan/one-page-system-2026-11-21.md §5): the sections of the lembaga list, in this order,
// built on the catalogue's `institution-kind` labels. The slugs are the catalogue's; the titles follow it too, so a
// renamed catalogue entry still lands in its section.
export const JENIS: { slug: string; title: string }[] = [
  { slug: 'dewan-adat', title: 'Adat' },
  { slug: 'pemerintah', title: 'Pemerintah' },
  { slug: 'gereja', title: 'Agama' },
  { slug: 'sekolah-universitas', title: 'Pendidikan' },
  { slug: 'layanan-kesehatan', title: 'Kesehatan' },
  { slug: 'lsm', title: 'Masyarakat sipil' },
  { slug: 'usaha', title: 'Usaha dan koperasi' },
  { slug: 'media', title: 'Media' },
]
type Labelled = { contexts?: { slug: string; facet?: string }[] }
/** The jenis slug of a lembaga, from its labels, or '' when its stewards have not chosen one. */
export function jenisOf(group: Labelled) {
  return group.contexts?.find((c) => c.facet === 'institution-kind' && c.slug !== 'lembaga')?.slug ?? ''
}
/** The title of a jenis slug; an unknown one keeps its own title. */
export function jenisTitle(slug: string, fallback = '') {
  return JENIS.find((j) => j.slug === slug)?.title ?? fallback
}
/** Sections with at least one lembaga, in the fixed order, then those without a jenis under Lainnya. */
export function jenisSections<T extends Labelled>(groups: T[]) {
  const known = new Set(JENIS.map((j) => j.slug))
  const out = JENIS.map((j) => ({ slug: j.slug, title: j.title, items: groups.filter((g) => jenisOf(g) === j.slug) })).filter((s) => s.items.length)
  const rest = groups.filter((g) => !known.has(jenisOf(g)))
  if (rest.length) out.push({ slug: 'lainnya', title: out.length ? 'Lainnya' : '', items: rest })
  return out
}
