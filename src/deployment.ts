/**
 * etnos.yaml (docs/plan/one-page-system-2026-11-21.md §9): one file that describes a deployment, shaped by
 * schemas/etnos.schema.json. Studio shows the current settings as this file, checks an edited copy and applies
 * the safe part. The file never holds a key, token or password; a copy that seems to is refused whole.
 *
 * Each setting is one of three kinds:
 * - applied here: name, description, root place, region languages, operator contact, the age to confirm at sign-up
 *   and the Kios house rules.
 *   These live in the `deployment_settings` table and take effect at once.
 * - set at deploy: origin, catalogue, enrollment, news sources and the operator DID. These are Worker settings
 *   (wrangler.jsonc vars, deploy/*.txt); the file shows them so an operator sees the whole deployment, and a
 *   change is listed with where to make it.
 * - changed in Studio, Agen & koneksi: the model provider and model names. The key itself is added there too.
 */
import { Fault, type EtnosCore } from './core.ts'
import type { Groups } from './groups.ts'
import { check } from './schema-check.ts'
import { parse, stringify, YamlError } from './yaml.ts'
import { DEFAULT_KIOS_RULES, type KiosRuleWords } from './kios-rules.ts'
import etnosSchema from '../schemas/etnos.schema.json' with { type: 'json' }

/** The age a new person confirms when joining (signup.minimumAge in etnos.yaml). */
export const DEFAULT_MINIMUM_AGE = 18
export function signupMinimumAge(s: EtnosCore): number {
  const row = s.get<{ value: string }>("SELECT value FROM deployment_settings WHERE key='signup.minimumAge'")
  const n = row ? Number(JSON.parse(row.value)) : NaN
  return Number.isInteger(n) && n >= 13 && n <= 99 ? n : DEFAULT_MINIMUM_AGE
}

export type EtnosFile = {
  version: 1
  name: string
  description?: string
  origin?: string
  rootPlace?: string | null
  uiLanguage?: 'id'
  regionLanguages?: string[]
  catalogue?: string
  enrollment?: 'open' | 'invite' | 'closed'
  news?: { sources?: string[] }
  model?: { provider?: string; fast?: string | null; synthesis?: string | null }
  operator?: { name?: string; email?: string; url?: string; did?: string }
  signup?: { minimumAge?: number }
  kios?: { rules?: KiosRuleWords[] }
}
/** What the Worker knows that this file shows but does not change. */
export type DeploymentInfo = {
  origin: string
  catalogue?: string
  enrollment?: 'open' | 'invite' | 'closed'
  sources?: string[]
  stewardDid?: string
  model?: { host: string; fast: string; synthesis: string } | null
}
export type How = 'apply' | 'deploy' | 'model' | 'fixed'
export type Change = { path: string; from: unknown; to: unknown; how: How }
export type CheckResult = { ok: boolean; errors: { path: string; message: string }[]; secret: string | null; changes: Change[] }

const APPLIED = ['name', 'description', 'rootPlace', 'regionLanguages', 'operator', 'signup.minimumAge', 'kios.rules'] as const
const how = (path: string): How =>
  path === 'operator.did' ? 'deploy'
  : /^(name|description|rootPlace|regionLanguages|operator\.|signup\.minimumAge|kios\.rules)/.test(path) ? 'apply'
  : /^(origin|catalogue|enrollment|news)/.test(path) ? 'deploy'
  : path.startsWith('model') ? 'model'
  : 'fixed'

/** A name or value that looks like a secret. The Kios rule `key` is the one field named key that is allowed. */
function findSecret(v: unknown, path: string): string | null {
  if (typeof v === 'string') return /^(sk-|sk_|ghp_|gho_|github_pat_|xox[abp]-|AKIA|AIza|eyJ)[A-Za-z0-9_-]{8,}/.test(v.trim()) ? path : null
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const s = findSecret(v[i], `${path}[${i}]`)
      if (s) return s
    }
    return null
  }
  if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      const p = path ? `${path}.${k}` : k
      const allowed = k === 'key' && /^kios\.rules\[\d+\]$/.test(path)
      if (!allowed && /token|password|passwd|secret|credential|private|api[_-]?key|(^|[_-])key$|^key/i.test(k)) return p
      const s = findSecret(x, p)
      if (s) return s
    }
  return null
}
/** The same check on raw text, for a file that does not parse: a line that names a secret. */
function secretLine(text: string): string | null {
  for (const line of text.split('\n')) {
    const m = /^\s*(?:-\s+)?([A-Za-z_][\w-]*)\s*:/.exec(line)
    if (m && m[1] !== 'key' && /token|password|passwd|secret|credential|private|api[_-]?key|(^|[_-])key$|^key/i.test(m[1])) return m[1]
    if (/\b(sk-|ghp_|github_pat_|xox[abp]-|AKIA)[A-Za-z0-9_-]{8,}/.test(line)) return line.split(':')[0].trim() || 'isi berkas'
  }
  return null
}

function flatten(v: unknown, path: string, out: Map<string, unknown>) {
  // Lists of values and the Kios rules compare whole, so a reordered list reads as one change.
  if (v && typeof v === 'object' && !Array.isArray(v) && path !== 'kios.rules') {
    for (const [k, x] of Object.entries(v)) flatten(x, path ? `${path}.${k}` : k, out)
    return
  }
  out.set(path, v)
}

export class Deployment {
  private s: EtnosCore
  private groups: Groups
  private info: () => DeploymentInfo
  constructor(s: EtnosCore, groups: Groups, info: () => DeploymentInfo) {
    this.s = s
    this.groups = groups
    this.info = info
  }

  private stored(): Map<string, unknown> {
    const rows = this.s.all<{ key: string; value: string }>('SELECT key,value FROM deployment_settings')
    return new Map(rows.map((r) => [r.key, JSON.parse(r.value)]))
  }

  /** The deployment's name as people see it, for page titles and the Situs top strip. */
  name(): string {
    const v = this.s.get<{ value: string }>("SELECT value FROM deployment_settings WHERE key='name'")
    return v ? (JSON.parse(v.value) as string) : 'ETNOS'
  }

  /** For the public privacy page: the name, the operator's contact as set in etnos.yaml, and the sign-up age. */
  publicInfo() {
    const f = this.current()
    return { name: f.name, operator: { name: f.operator?.name ?? '', email: f.operator?.email ?? '', url: f.operator?.url ?? '' }, minimumAge: signupMinimumAge(this.s) }
  }

  current(): EtnosFile {
    const st = this.stored(), i = this.info()
    const operator = (st.get('operator') as EtnosFile['operator']) ?? {}
    const file: EtnosFile = {
      version: 1,
      name: (st.get('name') as string) ?? 'ETNOS',
      description: (st.get('description') as string) ?? '',
      origin: i.origin,
      rootPlace: (st.get('rootPlace') as string | null) ?? null,
      uiLanguage: 'id',
      regionLanguages: (st.get('regionLanguages') as string[]) ?? [],
      ...(i.catalogue ? { catalogue: i.catalogue } : {}),
      ...(i.enrollment ? { enrollment: i.enrollment } : {}),
      news: { sources: i.sources ?? [] },
      model: { provider: i.model?.host ?? 'workers-ai', fast: i.model?.fast ?? null, synthesis: i.model?.synthesis ?? null },
      operator: { name: operator.name ?? '', email: operator.email ?? '', url: operator.url ?? '', did: i.stewardDid ?? '' },
      signup: { minimumAge: (st.get('signup.minimumAge') as number) ?? DEFAULT_MINIMUM_AGE },
      kios: { rules: (st.get('kios.rules') as KiosRuleWords[]) ?? DEFAULT_KIOS_RULES },
    }
    return file
  }

  text(): string {
    const stamp = new Date(this.s.clock()).toISOString().slice(0, 10)
    return stringify(this.current(), [
      'etnos.yaml, pengaturan ' + this.current().name + ', diekspor ' + stamp + '.',
      'Bentuknya: schemas/etnos.schema.json di kode ETNOS (AGPL-3.0).',
      'Berkas ini tidak pernah memuat kunci, token atau kata sandi.',
    ])
  }

  view(actorId: string) {
    this.groups.nodeSteward(actorId)
    return { text: this.text(), file: this.current() }
  }

  check(actorId: string, text: unknown): CheckResult {
    this.groups.nodeSteward(actorId)
    if (typeof text !== 'string' || text.length > 200_000) throw new Fault(400, 'Tempel isi etnos.yaml, paling banyak 200 KB.')
    const refuse = (path: string): CheckResult => ({ ok: false, secret: path, changes: [], errors: [{ path, message: 'Berkas ini memuat sesuatu yang tampak seperti kunci, token atau kata sandi (' + path + '). etnos.yaml tidak menyimpan rahasia. Hapus baris itu lalu periksa lagi. Kunci model ditambahkan di Studio, Agen & koneksi.' }] })
    let value: unknown
    try {
      value = parse(text)
    } catch (e) {
      const line = secretLine(text)
      if (line) return refuse(line)
      if (e instanceof YamlError) return { ok: false, secret: null, changes: [], errors: [{ path: '', message: e.message }] }
      throw e
    }
    const secret = findSecret(value, '')
    if (secret) return refuse(secret)
    const errors = check(etnosSchema, value)
    if (errors.length) return { ok: false, secret: null, errors, changes: [] }
    const before = new Map<string, unknown>(), after = new Map<string, unknown>()
    flatten(this.current(), '', before)
    flatten(value, '', after)
    const changes: Change[] = []
    for (const path of new Set([...before.keys(), ...after.keys()])) {
      // A setting left out of the file stays as it is.
      if (!after.has(path)) continue
      const a = before.get(path), b = after.get(path)
      if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) changes.push({ path, from: a ?? null, to: b ?? null, how: how(path) })
    }
    return { ok: true, secret: null, errors: [], changes }
  }

  /** Apply the settings this page can change; list the rest with where to change them. */
  apply(actorId: string, text: unknown) {
    const result = this.check(actorId, text)
    if (!result.ok) throw new Fault(400, result.errors[0]?.message ?? 'Berkas ini belum bisa dipakai.')
    const file = parse(text as string) as EtnosFile
    const applied = result.changes.filter((c) => c.how === 'apply')
    if (applied.length)
      this.s.tx(() => {
        const put = (key: string, value: unknown) =>
          this.s.run('INSERT INTO deployment_settings(key,value,updated,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated,updated_by=excluded.updated_by', key, JSON.stringify(value), this.s.clock(), actorId)
        const touched = new Set(applied.map((c) => (c.path.startsWith('operator.') ? 'operator' : c.path)))
        for (const key of APPLIED) {
          if (!touched.has(key)) continue
          if (key === 'operator') {
            const o = { ...(this.current().operator ?? {}), ...(file.operator ?? {}) }
            put('operator', { name: o.name ?? '', email: o.email ?? '', url: o.url ?? '' })
          } else if (key === 'kios.rules') put(key, file.kios?.rules ?? DEFAULT_KIOS_RULES)
          else if (key === 'signup.minimumAge') put(key, file.signup?.minimumAge ?? DEFAULT_MINIMUM_AGE)
          else put(key, (file as Record<string, unknown>)[key])
        }
        this.s.audit(actorId, 'deployment.settings', [...touched].join(','))
      })
    return { applied, notApplied: result.changes.filter((c) => c.how !== 'apply') }
  }
}
