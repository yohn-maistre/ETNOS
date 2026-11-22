/**
 * Situs (docs/plan/one-page-system-2026-11-21.md §8): a lembaga's own website, built only from what the lembaga
 * already shows in public. A Situs is a `situs.yaml` draft (template, theme, navigation, typed blocks) plus
 * published versions. Publishing copies what the blocks point at into a snapshot, so a page view never asks a
 * PDS or anything private; the page is rendered from that snapshot (src/situs-render.ts).
 *
 * Boundaries, each tested in test/situs.test.ts:
 * - Only a public lembaga has a Situs, and only its stewards edit it. Only the node operator switches `situs_aktif`;
 *   without it a steward can draft and preview but not publish. Payment for a Situs happens outside ETNOS.
 * - Content comes from public communities of the lembaga only (never listed-private or hidden-private), from posts
 *   by its active members that are not hidden, deleted, content-warned or offers. This is checked when the draft
 *   is saved, when it is published and again on every page view: anything that is no longer public, or a post
 *   whose text changed since publishing, drops out of the page until the next publish.
 * - The address name follows the handle rules of the identity host and its reserved list (one shared list), so
 *   `<name>.etnos.space` can serve the Situs once the owner switches the subdomains on (src/situs-dispatch.ts).
 */
import { Fault, type EtnosCore } from './core.ts'
import type { Groups } from './groups.ts'
import type { Lembaga, Contact } from './lembaga.ts'
import type { Kios } from './kios.ts'
import { contentOf } from './post-content.ts'
import { check } from './schema-check.ts'
import { stringify } from './yaml.ts'
import { checkHandle } from '../packages/pds/src/host/handles.ts'
import situsSchema from '../schemas/situs.schema.json' with { type: 'json' }
import lembagaSchema from '../schemas/lembaga.schema.json' with { type: 'json' }
import { BLOCK_LABELS, type BlockType, type FontId, type TemplateId } from './situs-theme.ts'

// situs.yaml and lembaga.yaml as types (the JSON Schemas in schemas/ are the rule; these follow them).
export type SitusBlock =
  | { id: string; type: 'hero'; title?: string; text?: string; image?: 'cover' | 'logo' | 'none' }
  | { id: string; type: 'tentang' | 'publikasi' | 'komunitas' | 'kios' | 'kontak'; title?: string }
  | { id: string; type: 'kegiatan'; title?: string; limit?: number }
  | { id: string; type: 'galeri'; title?: string; images: string[] }
export type SitusConfig = {
  version: 1
  name?: string
  template: TemplateId
  theme: { primary: string; accent: string; fonts: FontId }
  navigation?: { block: string; label: string }[]
  blocks: SitusBlock[]
}
export type ImageRef = { ref: string; url?: string; alt?: string }
export type LembagaFile = {
  version: 1
  id?: string
  name: string
  kind: 'institution' | 'collective'
  jenis?: string | null
  description?: string
  about?: string
  logo?: ImageRef | null
  cover?: ImageRef | null
  places?: string[]
  languages?: string[]
  contacts?: { email?: string[]; whatsapp?: string; phone?: string[]; links?: { label: string; url: string }[]; other?: { label: string; value: string }[] }
  recognition?: { by: string; source: string }[]
  communities?: string[] | null
}

/** What a page shows, copied at publish time. Every list is filtered again when the page is viewed. */
export type Snapshot = {
  lembaga: {
    id: string
    title: string
    kind: string
    jenis: string | null
    description: string
    about: string
    logo: boolean
    cover: Picture | null
    places: { slug: string; title: string }[]
    languages: { slug: string; title: string }[]
    contacts: Contact[]
    website: string
    whatsapp: string
  }
  posts: { id: string; revision: number; title: string; excerpt: string; created: number; community: { id: string; title: string }; image: Picture | null }[]
  gallery: Picture[]
  communities: { id: string; title: string; description: string }[]
  entry: { slug: string; title: string } | null
  pages: { id: string; title: string }[]
  kios: { whatsapp: string; items: { id: string; title: string; price: number | null; unit: string; place: string | null }[] } | null
}
export type Picture = { id: string; alt: string; width: number; height: number }
export type SitusPage = { name: string; config: SitusConfig; snapshot: Snapshot; version: number | null; published: number | null; draft: boolean }

type Row = { group_id: string; name: string; draft: string; active: number; activated_by: string | null; activated: number | null; published: number | null; updated: number; updated_by: string }
type VersionRow = { group_id: string; version: number; name: string; situs: string; lembaga: string; snapshot: string; created: number; created_by: string }
type EntryTitle = (slug: string) => string | null

const MAX_VERSIONS_LISTED = 20
/** The name space of Situs addresses; also the AT handle domain of the identity host. */
export const SITUS_ZONE = 'etnos.space'
const missing = (): never => {
  throw new Fault(404, 'Not found')
}
const plain = (md: string) =>
  md.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_>`~]/g, '').replace(/\s+/g, ' ').trim()
const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 20).replace(/\s+\S*$/, '') + '…' : t)
/** The suggested address name for a lembaga title: lowercase words joined by hyphens, cut to 20 characters. */
export const suggestName = (title: string) =>
  title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20).replace(/-+$/, '').replace(/-{2,}/g, '-')

/** The checks that need the lembaga's data, after the schema: block ids, navigation, images, at most one hero. */
function semantic(config: SitusConfig) {
  const ids = new Set<string>()
  for (const b of config.blocks) {
    if (ids.has(b.id)) throw new Fault(400, 'Nama blok ' + b.id + ' dipakai dua kali.')
    ids.add(b.id)
  }
  if (config.blocks.filter((b) => b.type === 'hero').length > 1) throw new Fault(400, 'Satu situs hanya punya satu blok pembuka.')
  for (const n of config.navigation ?? []) if (!ids.has(n.block)) throw new Fault(400, 'Navigasi menunjuk blok ' + n.block + ' yang tidak ada.')
}
export function validConfig(value: unknown): SitusConfig {
  const problems = check(situsSchema, value)
  if (problems.length) throw new Fault(400, problems.slice(0, 3).map((p) => p.message).join(' '))
  const config = value as SitusConfig
  semantic(config)
  return config
}

export class Situs {
  private s: EtnosCore
  private groups: Groups
  private lembaga: Lembaga
  private kios: Kios
  constructor(store: EtnosCore, groups: Groups, lembaga: Lembaga, kios: Kios) {
    this.s = store
    this.groups = groups
    this.lembaga = lembaga
    this.kios = kios
  }
  private row(groupId: string) {
    return this.s.get<Row>('SELECT * FROM situs WHERE group_id=?', groupId)
  }
  private operator(actorId: string | undefined) {
    if (!actorId) return false
    try {
      this.groups.nodeSteward(actorId)
      return true
    } catch {
      return false
    }
  }
  /** Stewards of a public lembaga manage its Situs; the operator may read it to decide activation. */
  private requireSteward(actorId: string, groupId: string) {
    this.groups.requireSteward(actorId, groupId)
    if (this.groups.group(groupId).visibility !== 'public') throw new Fault(400, 'Situs hanya untuk lembaga publik.')
  }
  private canManage(actorId: string | undefined, groupId: string) {
    if (!actorId) return false
    try {
      this.requireSteward(actorId, groupId)
      return true
    } catch {
      return false
    }
  }
  /** A name for the address, checked against the handle rules and the shared reserved list. */
  checkName(name: unknown, groupId?: string) {
    if (typeof name !== 'string') throw new Fault(400, 'Nama alamat wajib diisi.')
    const checked = checkHandle(name, SITUS_ZONE)
    if (!checked.ok) throw new Fault(400, checked.reason)
    const held = this.s.get<{ group_id: string }>('SELECT group_id FROM situs WHERE name=?', checked.label)
    if (held && held.group_id !== groupId) throw new Fault(409, 'Nama ini sudah dipakai lembaga lain.')
    return checked.label
  }
  /** A first draft from the lembaga's jenis: offices, schools, churches and adat councils get the Lembaga template. */
  defaultConfig(groupId: string): SitusConfig {
    const jenis = this.lembaga.jenis(groupId)?.slug ?? ''
    const office = ['dewan-adat', 'pemerintah', 'gereja', 'sekolah-universitas', 'layanan-kesehatan'].includes(jenis)
    return {
      version: 1,
      template: office ? 'lembaga' : 'editorial',
      theme: { primary: office ? 'biru' : 'hutan', accent: 'kunyit', fonts: office ? 'geist' : 'newsreader' },
      navigation: [
        { block: 'tentang', label: 'Tentang' },
        { block: 'kegiatan', label: 'Kegiatan' },
        { block: 'kontak', label: 'Kontak' },
      ],
      blocks: [
        { id: 'pembuka', type: 'hero', image: 'cover' },
        { id: 'tentang', type: 'tentang' },
        { id: 'kegiatan', type: 'kegiatan', limit: 6 },
        { id: 'galeri', type: 'galeri', images: [] },
        { id: 'komunitas', type: 'komunitas' },
        { id: 'kios', type: 'kios' },
        { id: 'kontak', type: 'kontak' },
      ],
    }
  }

  // What may appear: read live, as an anonymous reader would see it.

  /** Communities of the lembaga a Situs may show: public, open (not forming), bound to it. */
  publicCommunities(groupId: string) {
    return this.s.all<{ id: string; title: string; description: string }>(
      "SELECT c.id,c.title,c.description FROM spaces s JOIN communities c ON c.id=s.community_id WHERE s.group_id=? AND c.visibility='public' AND c.forming_until IS NULL ORDER BY s.created,s.id LIMIT 100",
      groupId,
    )
  }
  /** The communities the lembaga chose to show (lembaga.yaml `communities`), or every public one. */
  private shown(groupId: string) {
    const all = this.publicCommunities(groupId)
    const chosen = this.s.get<{ communities: string | null }>('SELECT communities FROM lembaga_profiles WHERE group_id=?', groupId)?.communities
    if (!chosen) return all
    const ids = JSON.parse(chosen) as string[]
    return all.filter((c) => ids.includes(c.id))
  }
  /** Root posts by active members in the shown public communities, newest first. */
  private posts(groupId: string, limit: number) {
    const ids = JSON.stringify(this.shown(groupId).map((c) => c.id))
    return this.s.all<{ id: string; revision: number; text: string; content: string; created: number; community_id: string; community_title: string }>(
      `SELECT p.id,p.revision,p.text,p.content,p.created,c.id community_id,c.title community_title FROM posts p JOIN communities c ON c.id=p.community_id
       JOIN spaces s ON s.community_id=c.id AND s.group_id=? JOIN group_members m ON m.group_id=s.group_id AND m.actor_id=p.author_id AND m.active=1
       WHERE c.id IN (SELECT value FROM json_each(?)) AND c.visibility='public' AND c.forming_until IS NULL AND p.parent_id IS NULL AND p.hidden=0 AND p.deleted=0
         AND COALESCE(json_extract(p.content,'$.warning'),'')='' AND NOT EXISTS(SELECT 1 FROM offerings o WHERE o.post_id=p.id)
       ORDER BY p.created DESC,p.id DESC LIMIT ?`,
      groupId, ids, limit,
    )
  }
  /** Photos a Situs may show: images of the posts above. The steward picks which ones go in a gallery. */
  pictures(groupId: string, limit = 120): (Picture & { post_id: string })[] {
    const posts = this.posts(groupId, 400)
    if (!posts.length) return []
    return this.s.all<Picture & { post_id: string }>(
      'SELECT m.id,m.alt,m.width,m.height,m.post_id FROM media m WHERE m.post_id IN (SELECT value FROM json_each(?)) ORDER BY m.created DESC,m.id LIMIT ?',
      JSON.stringify(posts.map((p) => p.id)), limit,
    )
  }
  private pages(groupId: string) {
    const ids = JSON.stringify(this.shown(groupId).map((c) => c.id))
    return this.s.all<{ id: string; title: string }>(
      'SELECT w.id,w.title FROM wiki_pages w WHERE w.community_id IN (SELECT value FROM json_each(?)) AND w.draft=0 AND w.revision_id IS NOT NULL ORDER BY w.title LIMIT 50',
      ids,
    )
  }
  private profileExtra(groupId: string) {
    return this.s.get<{ cover: string | null; communities: string | null; logo: Uint8Array | null }>('SELECT cover,communities,logo FROM lembaga_profiles WHERE group_id=?', groupId)
  }

  /** Everything a page shows, collected now. Used for a draft preview and frozen into a version on publish. */
  collect(groupId: string, config: SitusConfig, entryTitle: EntryTitle = () => null): Snapshot {
    const g = this.groups.group(groupId)
    if (g.visibility !== 'public') missing()
    const profile = this.lembaga.profile(groupId),
      extra = this.profileExtra(groupId),
      jenis = this.lembaga.jenis(groupId),
      contexts = this.groups.contextLinks('group', groupId) as { slug: string; title: string; kind: string }[]
    const pictures = this.pictures(groupId, 400),
      byId = new Map(pictures.map((p) => [p.id, p]))
    const kegiatan = config.blocks.find((b) => b.type === 'kegiatan') as { limit?: number } | undefined
    const posts = kegiatan ? this.posts(groupId, kegiatan.limit ?? 6) : []
    const firstImage = new Map<string, Picture>()
    for (const p of [...pictures].reverse()) firstImage.set(p.post_id, { id: p.id, alt: p.alt, width: p.width, height: p.height })
    const wanted = config.blocks.flatMap((b) => (b.type === 'galeri' ? b.images : [])).map((r) => r.slice(6))
    const pic = (p: Picture & { post_id?: string }): Picture => ({ id: p.id, alt: p.alt, width: p.width, height: p.height })
    const cover = extra?.cover && byId.get(extra.cover) ? pic(byId.get(extra.cover)!) : null
    const claimed = this.lembaga.claimedEntry(groupId)
    const kios = this.kios.view({ kind: 'group', id: groupId })
    return {
      lembaga: {
        id: g.id,
        title: g.title,
        kind: g.kind,
        jenis: jenis?.title ?? null,
        description: g.description,
        about: profile.about,
        logo: !!extra?.logo,
        cover,
        places: contexts.filter((c) => c.kind === 'place' || c.kind === 'region').map(({ slug, title }) => ({ slug, title })),
        languages: contexts.filter((c) => c.kind === 'language').map(({ slug, title }) => ({ slug, title })),
        contacts: profile.contacts,
        website: profile.website,
        whatsapp: kios?.open ? kios.whatsapp : '',
      },
      posts: posts.map((p) => {
        const c = contentOf(p.content),
          text = plain(p.text)
        return { id: p.id, revision: p.revision, title: clip(c.title?.trim() || text.split(/(?<=[.!?])\s/)[0] || 'Kabar', 120), excerpt: c.title ? clip(text, 280) : clip(text.slice(text.split(/(?<=[.!?])\s/)[0].length).trim(), 280), created: p.created, community: { id: p.community_id, title: p.community_title }, image: firstImage.get(p.id) ?? null }
      }),
      gallery: wanted.filter((id) => byId.has(id)).map((id) => pic(byId.get(id)!)),
      communities: this.shown(groupId).map((c) => ({ id: c.id, title: c.title, description: clip(c.description, 240) })),
      entry: claimed ? { slug: claimed, title: entryTitle(claimed) ?? claimed } : null,
      pages: this.pages(groupId),
      kios: kios?.open
        ? {
            whatsapp: kios.whatsapp,
            items: kios.items.map((i) => {
              const o = i.offering as { price: number | null; unit: string; place: { title: string } | null }
              return { id: i.id, title: clip((i.content as { title?: string }).title || plain(i.text), 100), price: o.price, unit: o.unit, place: o.place?.title ?? null }
            }),
          }
        : null,
    }
  }
  /**
   * The snapshot as it may be shown now. Each list keeps only what is still public: a lembaga that turned private
   * shows nothing, and a post that was hidden, deleted, warned, moved out or edited since publishing drops out.
   */
  private live(groupId: string, snap: Snapshot): Snapshot {
    const g = this.groups.group(groupId)
    if (g.visibility !== 'public') missing()
    const posts = new Map(this.posts(groupId, 1000).map((p) => [p.id, p.revision]))
    const pictures = new Set(this.pictures(groupId, 2000).map((p) => p.id))
    const communities = new Set(this.shown(groupId).map((c) => c.id))
    const pages = new Set(this.pages(groupId).map((p) => p.id))
    const extra = this.profileExtra(groupId)
    const kios = this.kios.view({ kind: 'group', id: groupId })
    const offers = new Set(kios?.open ? kios.items.map((i) => i.id) : [])
    const okPicture = (p: Picture | null) => (p && pictures.has(p.id) ? p : null)
    return {
      lembaga: { ...snap.lembaga, logo: snap.lembaga.logo && !!extra?.logo, cover: okPicture(snap.lembaga.cover), whatsapp: kios?.open ? snap.lembaga.whatsapp : '' },
      posts: snap.posts.filter((p) => posts.get(p.id) === p.revision).map((p) => ({ ...p, image: okPicture(p.image) })),
      gallery: snap.gallery.filter((p) => pictures.has(p.id)),
      communities: snap.communities.filter((c) => communities.has(c.id)),
      entry: snap.entry && this.lembaga.claimedEntry(groupId) === snap.entry.slug ? snap.entry : null,
      pages: snap.pages.filter((p) => pages.has(p.id)),
      kios: snap.kios && kios?.open ? { ...snap.kios, items: snap.kios.items.filter((i) => offers.has(i.id)) } : null,
    }
  }

  // Steward and operator actions

  /** The editor's view: the draft, the state, the versions, and what blocks can draw from. */
  state(actorId: string, groupId: string) {
    const operator = this.operator(actorId)
    if (!operator) this.requireSteward(actorId, groupId)
    else if (this.groups.group(groupId).visibility !== 'public') throw new Fault(400, 'Situs hanya untuk lembaga publik.')
    const r = this.row(groupId),
      g = this.groups.group(groupId)
    const versions = this.s.all<{ version: number; name: string; created: number; created_by: string }>('SELECT version,name,created,created_by FROM situs_versions WHERE group_id=? ORDER BY version DESC LIMIT ?', groupId, MAX_VERSIONS_LISTED)
    const extra = this.profileExtra(groupId)
    return {
      group: { id: g.id, title: g.title },
      name: r?.name ?? null,
      suggestedName: r ? r.name : this.freeName(g.title),
      draft: r ? (JSON.parse(r.draft) as SitusConfig) : this.defaultConfig(groupId),
      saved: !!r,
      active: !!r?.active,
      published: r?.published ?? null,
      versions: versions.map((v) => ({ ...v, by: this.s.get<{ name: string }>('SELECT name FROM actors WHERE id=?', v.created_by)?.name ?? '' })),
      canManage: this.canManage(actorId, groupId),
      canActivate: operator,
      sources: {
        pictures: this.pictures(groupId).map((p) => ({ ...p, url: '/v1/media/' + p.id })),
        communities: this.publicCommunities(groupId),
        shownCommunities: extra?.communities ? (JSON.parse(extra.communities) as string[]) : null,
        cover: extra?.cover ?? null,
        logo: !!extra?.logo,
        posts: this.posts(groupId, 12).length,
        kios: !!this.kios.view({ kind: 'group', id: groupId })?.open,
      },
    }
  }
  private freeName(title: string) {
    const base = suggestName(title)
    for (const candidate of [base, base.slice(0, 17) + '-2', base.slice(0, 17) + '-3']) {
      try {
        return this.checkName(candidate)
      } catch {
        /* try the next */
      }
    }
    return ''
  }
  /** Save the draft (situs.yaml) and, until the Situs is active, its address name. */
  save(actorId: string, groupId: string, b: { name?: unknown; config?: unknown; cover?: unknown; communities?: unknown }) {
    return this.s.tx(() => {
      this.requireSteward(actorId, groupId)
      const r = this.row(groupId)
      const config = b.config === undefined ? (r ? (JSON.parse(r.draft) as SitusConfig) : this.defaultConfig(groupId)) : validConfig(b.config)
      let name = r?.name
      if (b.name !== undefined && b.name !== r?.name) {
        if (r?.active) throw new Fault(409, 'Nama alamat tidak bisa diubah setelah situs diaktifkan. Minta pengelola ETNOS bila perlu diganti.')
        name = this.checkName(b.name, groupId)
      }
      if (!name) name = this.checkName(b.name ?? this.freeName(this.groups.group(groupId).title), groupId)
      // Images must be photos the lembaga shows in public now.
      const pictures = new Set(this.pictures(groupId, 2000).map((p) => p.id))
      for (const ref of config.blocks.flatMap((x) => (x.type === 'galeri' ? x.images : []))) if (!pictures.has(ref.slice(6))) throw new Fault(400, 'Foto ini tidak ada di posting publik lembaga.')
      const stored = { ...config, name }
      this.s.run(
        'INSERT INTO situs(group_id,name,draft,updated,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(group_id) DO UPDATE SET name=excluded.name,draft=excluded.draft,updated=excluded.updated,updated_by=excluded.updated_by',
        groupId, name, JSON.stringify(stored), this.s.clock(), actorId,
      )
      // Two lembaga.yaml fields that only the Situs uses today: the cover photo and the communities shown.
      if (b.cover !== undefined || b.communities !== undefined) {
        const extra = this.profileExtra(groupId)
        let cover = extra?.cover ?? null,
          communities = extra?.communities ?? null
        if (b.cover !== undefined) {
          if (b.cover !== null && (typeof b.cover !== 'string' || !pictures.has(b.cover))) throw new Fault(400, 'Foto sampul harus foto dari posting publik lembaga.')
          cover = b.cover as string | null
        }
        if (b.communities !== undefined) {
          if (b.communities === null) communities = null
          else {
            const ids = new Set(this.publicCommunities(groupId).map((c) => c.id))
            if (!Array.isArray(b.communities) || b.communities.length > 100 || b.communities.some((x) => typeof x !== 'string' || !ids.has(x))) throw new Fault(400, 'Pilih komunitas publik milik lembaga ini.')
            communities = JSON.stringify([...new Set(b.communities as string[])])
          }
        }
        this.s.run(
          'INSERT INTO lembaga_profiles(group_id,cover,communities,updated,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(group_id) DO UPDATE SET cover=excluded.cover,communities=excluded.communities,updated=excluded.updated,updated_by=excluded.updated_by',
          groupId, cover, communities, this.s.clock(), actorId,
        )
      }
      this.s.audit(actorId, 'situs.draft', groupId)
      return this.state(actorId, groupId)
    })
  }
  /** Only the node operator switches `situs_aktif`. Turning it off stops new publishing; the published page stays. */
  setActive(actorId: string, groupId: string, active: boolean) {
    return this.s.tx(() => {
      this.groups.nodeSteward(actorId)
      if (typeof active !== 'boolean') throw new Fault(400, 'Boolean required')
      const r = this.row(groupId) ?? missing()
      if (active && this.groups.group(groupId).visibility !== 'public') throw new Fault(400, 'Situs hanya untuk lembaga publik.')
      this.s.run('UPDATE situs SET active=?,activated_by=?,activated=? WHERE group_id=?', Number(active), actorId, this.s.clock(), r.group_id)
      this.s.audit(actorId, active ? 'situs.activate' : 'situs.deactivate', groupId)
      return this.state(actorId, groupId)
    })
  }
  /** Publish the draft as a new version. Needs `situs_aktif`, a public lembaga and a valid draft. */
  publish(actorId: string, groupId: string, entryTitle: EntryTitle = () => null) {
    return this.s.tx(() => {
      this.requireSteward(actorId, groupId)
      const r = this.row(groupId)
      if (!r) throw new Fault(409, 'Simpan draf situs lebih dulu.')
      if (!r.active) throw new Fault(403, 'Situs ini belum diaktifkan oleh pengelola ETNOS. Draf dan pratinjau tetap bisa dipakai.')
      const config = validConfig(JSON.parse(r.draft))
      const snapshot = this.collect(groupId, config, entryTitle)
      const version = (this.s.get<{ v: number | null }>('SELECT MAX(version) v FROM situs_versions WHERE group_id=?', groupId)?.v ?? 0) + 1
      this.s.run(
        'INSERT INTO situs_versions(group_id,version,name,situs,lembaga,snapshot,created,created_by) VALUES(?,?,?,?,?,?,?,?)',
        groupId, version, r.name, JSON.stringify(config), JSON.stringify(this.lembagaFile(groupId)), JSON.stringify(snapshot), this.s.clock(), actorId,
      )
      this.s.run('UPDATE situs SET published=? WHERE group_id=?', version, groupId)
      this.s.audit(actorId, 'situs.publish', groupId)
      return this.state(actorId, groupId)
    })
  }
  /** Take the page down. A steward or the operator may; the versions stay, so it can be published again. */
  unpublish(actorId: string, groupId: string) {
    return this.s.tx(() => {
      if (!this.operator(actorId)) this.requireSteward(actorId, groupId)
      this.row(groupId) ?? missing()
      this.s.run('UPDATE situs SET published=NULL WHERE group_id=?', groupId)
      this.s.audit(actorId, 'situs.unpublish', groupId)
      return this.state(actorId, groupId)
    })
  }
  /** Copy an earlier version's situs.yaml back into the draft. */
  restore(actorId: string, groupId: string, version: number) {
    const v = this.s.get<VersionRow>('SELECT * FROM situs_versions WHERE group_id=? AND version=?', groupId, version)
    if (!v) missing()
    return this.save(actorId, groupId, { config: JSON.parse(v!.situs) })
  }

  // Reading

  /** The group id behind an address name, if any lembaga holds it. */
  byName(name: string) {
    return this.s.get<{ group_id: string; published: number | null }>('SELECT group_id,published FROM situs WHERE name=?', name) ?? null
  }
  /** For the lembaga page: the address of a published Situs, and the state for stewards. */
  info(actorId: string | undefined, groupId: string) {
    const g = this.groups.group(groupId)
    if (g.visibility !== 'public' && !this.groups.role(actorId, groupId)) missing()
    const r = this.row(groupId)
    const manage = this.canManage(actorId, groupId) || this.operator(actorId)
    if (!r) return { name: null, published: false, active: false, saved: false, canManage: manage }
    return { name: r.published || manage ? r.name : null, published: !!r.published && g.visibility === 'public', active: manage ? !!r.active : undefined, saved: manage ? true : undefined, canManage: manage }
  }
  /**
   * A page by address name. The published version for everyone; `draft` shows the saved draft, collected now, to
   * its stewards and the operator only. Anyone else asking for the draft gets 404, as for an unknown name.
   */
  page(name: string, opts: { draft?: boolean; actorId?: string; entryTitle?: EntryTitle } = {}): SitusPage {
    const r = this.s.get<Row>('SELECT * FROM situs WHERE name=?', name) ?? missing()
    if (this.groups.group(r.group_id).visibility !== 'public') missing()
    if (opts.draft) {
      if (!this.canManage(opts.actorId, r.group_id) && !this.operator(opts.actorId)) missing()
      const config = validConfig(JSON.parse(r.draft))
      return { name: r.name, config, snapshot: this.live(r.group_id, this.collect(r.group_id, config, opts.entryTitle)), version: null, published: null, draft: true }
    }
    if (!r.published) missing()
    const v = this.s.get<VersionRow>('SELECT * FROM situs_versions WHERE group_id=? AND version=?', r.group_id, r.published) ?? missing()
    return { name: r.name, config: JSON.parse(v.situs) as SitusConfig, snapshot: this.live(r.group_id, JSON.parse(v.snapshot) as Snapshot), version: v.version, published: v.created, draft: false }
  }

  // Export

  /** lembaga.yaml from the lembaga's current data. Media references carry a full address so the file travels. */
  lembagaFile(groupId: string, origin = this.s.base): LembagaFile {
    const g = this.groups.group(groupId),
      profile = this.lembaga.profile(groupId),
      extra = this.profileExtra(groupId),
      contexts = this.groups.contextLinks('group', groupId) as { slug: string; kind: string }[]
    const kios = this.kios.view({ kind: 'group', id: groupId })
    const email = profile.contacts.filter((c) => /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(c.value)).map((c) => c.value)
    const phone = profile.contacts.filter((c) => /^\+?[0-9][0-9\s-]{6,}$/.test(c.value)).map((c) => c.value)
    const links = profile.contacts.filter((c) => /^https:\/\//.test(c.value)).map((c) => ({ label: c.label, url: c.value }))
    const other = profile.contacts.filter((c) => !email.includes(c.value) && !phone.includes(c.value) && !/^https:\/\//.test(c.value))
    if (profile.website) links.unshift({ label: 'Situs web', url: profile.website })
    const cover = extra?.cover ? this.s.get<{ alt: string }>('SELECT alt FROM media WHERE id=?', extra.cover) : null
    const file: LembagaFile = {
      version: 1,
      id: g.id,
      name: g.title,
      kind: g.kind,
      jenis: this.lembaga.jenis(groupId)?.slug ?? null,
      description: g.description,
      about: profile.about,
      logo: extra?.logo ? { ref: 'logo', url: origin + '/v1/groups/' + g.id + '/logo' } : null,
      cover: extra?.cover && cover ? { ref: 'media:' + extra.cover, url: origin + '/v1/media/' + extra.cover, alt: cover.alt } : null,
      places: contexts.filter((c) => c.kind === 'place' || c.kind === 'region').map((c) => c.slug),
      languages: contexts.filter((c) => c.kind === 'language').map((c) => c.slug),
      contacts: { email, ...(kios?.open && kios.whatsapp ? { whatsapp: kios.whatsapp } : {}), phone, links, other },
      recognition: profile.recognition,
      communities: extra?.communities ? (JSON.parse(extra.communities) as string[]) : null,
    }
    const problems = check(lembagaSchema, file)
    if (problems.length) throw new Fault(500, 'lembaga.yaml does not match its schema: ' + problems[0].message)
    return file
  }
  /** The two files a lembaga takes with it. */
  exportFiles(actorId: string, groupId: string) {
    this.requireSteward(actorId, groupId)
    const r = this.row(groupId),
      config = r ? (JSON.parse(r.draft) as SitusConfig) : this.defaultConfig(groupId)
    const stamp = new Date(this.s.clock()).toISOString().slice(0, 10)
    return {
      name: r?.name ?? suggestName(this.groups.group(groupId).title),
      situs: stringify(config, ['situs.yaml, draf situs ' + this.groups.group(groupId).title + ', diekspor ' + stamp + '.', 'Bentuknya: schemas/situs.schema.json di kode ETNOS (AGPL-3.0).']),
      lembaga: stringify(this.lembagaFile(groupId), ['lembaga.yaml, data publik ' + this.groups.group(groupId).title + ', diekspor ' + stamp + '.', 'Bentuknya: schemas/lembaga.schema.json di kode ETNOS (AGPL-3.0).']),
    }
  }
}

export const blockLabel = (t: BlockType) => BLOCK_LABELS[t]
