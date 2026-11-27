/** Local Contexts Notices and Labels for the collections that ETNOS shows (docs/decisions/local-contexts-2026-11-28.md).
 *
 * The rule: Labels (TK Labels, BC Labels) are applied only by communities, through a project on the Local
 * Contexts Hub. Institutions and researchers apply Notices. So ETNOS holds two different things for a collection:
 * - Notices that ETNOS ships (`SHIPPED`) or that the node operator adds in Studio, from the four Notices that an
 *   institution may apply.
 * - The ID of a Local Contexts Hub project that the operator enters, so the page can link to the Labels that a
 *   community attached there. ETNOS never chooses, stores or shows a Label of its own. The Hub's API needs an
 *   account key (it answered "Authentication not provided." on 27 November 2026), so only the ID is stored and the
 *   page links to the project.
 *
 * Every collection here is public data, so the list is public. Only the node operator changes it. */
import { Fault, type EtnosCore } from './core.ts'
import { text } from './commons.ts'

export type NoticeKind = 'attribution-incomplete' | 'open-to-collaborate' | 'tk' | 'bc'
export const NOTICES: Record<NoticeKind, { name: string; url: string; text: string }> = {
  'attribution-incomplete': {
    name: 'Attribution Incomplete Notice',
    url: 'https://localcontexts.org/notice/attribution-incomplete/',
    text: 'Daftar ini dikumpulkan oleh peneliti dari luar, dan nama orang atau komunitas yang memberi kata-katanya belum dicatat lengkap. Komunitas asal dapat melengkapi atau membetulkannya.',
  },
  'open-to-collaborate': {
    name: 'Open to Collaborate Notice',
    url: 'https://localcontexts.org/notice/open-to-collaborate/',
    text: 'ETNOS terbuka untuk bekerja sama dengan komunitas asal tentang cara data ini dicatat, dirawat dan dibagikan.',
  },
  tk: {
    name: 'TK Notice',
    url: 'https://localcontexts.org/notice/tk-notice/',
    text: 'Koleksi ini mungkin memuat pengetahuan tradisional yang punya aturan adat tentang siapa yang boleh memakai dan membagikannya.',
  },
  bc: {
    name: 'BC Notice',
    url: 'https://localcontexts.org/notice/bc-notice/',
    text: 'Data ini berasal dari tanah, air atau makhluk hidup yang terikat dengan hak masyarakat adat setempat.',
  },
}
export const NOTICE_KINDS = Object.keys(NOTICES) as NoticeKind[]

/** The collections ETNOS shows, with the Notices that ETNOS applies to each. Keys match the wordlist datasets
 * (seed/kamus/tanah-papua-wordlists.json) and the Ekari seed's source key. */
export const SHIPPED: { key: string; title: string; kind: 'dataset' | 'service'; notices: NoticeKind[] }[] = [
  { key: 'etnos', title: 'ETNOS', kind: 'service', notices: ['open-to-collaborate'] },
  { key: 'tng', title: 'TransNewGuinea.org', kind: 'dataset', notices: ['attribution-incomplete'] },
  { key: 'abvd', title: 'Austronesian Basic Vocabulary Database', kind: 'dataset', notices: ['attribution-incomplete'] },
  { key: 'berry1987', title: 'Berry & Berry 1987', kind: 'dataset', notices: ['attribution-incomplete'] },
  { key: 'papuanvoices', title: 'Papuan Voices', kind: 'dataset', notices: [] },
  { key: 'steltenpool1969', title: 'Steltenpool 1969', kind: 'dataset', notices: ['attribution-incomplete'] },
]
const BY_KEY = new Map(SHIPPED.map((c) => [c.key, c]))
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export const hubProjectUrl = (id: string) => 'https://localcontextshub.org/projects/' + id + '/'

export type CollectionView = {
  key: string
  title: string
  kind: 'dataset' | 'service'
  notices: { kind: NoticeKind; name: string; url: string; text: string; by: 'etnos' | 'operator' }[]
  /** A Hub project that a community or the operator linked; its Labels are shown on the Hub. */
  hub: { projectId: string; url: string } | null
}

export class LocalContexts {
  private store: EtnosCore
  private operator: (actorId: string) => boolean
  constructor(store: EtnosCore, o: { operator: (actorId: string) => boolean }) {
    this.store = store
    this.operator = o.operator
  }

  private row(key: string) {
    return this.store.get<{ project_id: string; notices: string }>('SELECT project_id,notices FROM local_contexts_collections WHERE collection=?', key)
  }

  view(key: string): CollectionView {
    const c = BY_KEY.get(key)
    if (!c) throw new Fault(404, 'Not found')
    const r = this.row(key), extra = r ? (JSON.parse(r.notices) as NoticeKind[]) : []
    const notices = [...c.notices.map((k) => ({ kind: k, ...NOTICES[k], by: 'etnos' as const })), ...extra.filter((k) => NOTICES[k] && !c.notices.includes(k)).map((k) => ({ kind: k, ...NOTICES[k], by: 'operator' as const }))]
    return { key: c.key, title: c.title, kind: c.kind, notices, hub: r?.project_id ? { projectId: r.project_id, url: hubProjectUrl(r.project_id) } : null }
  }

  list() {
    return { collections: SHIPPED.map((c) => this.view(c.key)), about: 'https://localcontexts.org/notices/about-the-notices/' }
  }

  /** The node operator links a Hub project, or clears it with an empty string, and adds Notices that ETNOS does
   * not ship. A Label is never accepted here: Labels come from communities through the Hub. */
  set(actorId: string, key: string, body: { hubProjectId?: unknown; notices?: unknown; labels?: unknown }) {
    if (!this.operator(actorId)) throw new Fault(403, 'Only the node operator changes Local Contexts settings')
    if (!BY_KEY.has(key)) throw new Fault(404, 'Not found')
    if (body.labels !== undefined) throw new Fault(400, 'Labels are applied by communities on the Local Contexts Hub; link its project instead')
    const r = this.row(key)
    let project = r?.project_id ?? '', notices = r ? (JSON.parse(r.notices) as NoticeKind[]) : []
    if (body.hubProjectId !== undefined) {
      const id = text(body.hubProjectId, 64, true).trim().toLowerCase()
      if (id && !UUID.test(id)) throw new Fault(400, 'A Local Contexts Hub project ID looks like 8-4-4-4-12 hexadecimal characters')
      project = id
    }
    if (body.notices !== undefined) {
      if (!Array.isArray(body.notices) || body.notices.some((n) => typeof n !== 'string' || !NOTICES[n as NoticeKind])) throw new Fault(400, 'Unknown Notice')
      notices = [...new Set(body.notices as NoticeKind[])]
    }
    const s = this.store
    s.tx(() => {
      s.run('INSERT INTO local_contexts_collections(collection,project_id,notices,updated,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(collection) DO UPDATE SET project_id=excluded.project_id,notices=excluded.notices,updated=excluded.updated,updated_by=excluded.updated_by', key, project, JSON.stringify(notices), s.clock(), actorId)
      s.audit(actorId, 'local-contexts.set', key)
    })
    return this.view(key)
  }
}
