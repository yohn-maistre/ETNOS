/**
 * Checks a value against one of the JSON Schemas in `schemas/` (draft 2020-12). Only the keywords those schemas
 * use are read: type, properties, required, additionalProperties, enum, const, items, minItems, maxItems,
 * uniqueItems, minLength, maxLength, pattern, minimum, maximum, $ref to `#/$defs/…`, oneOf and description.
 * Any other keyword in a schema is an error, so a schema never asks for a rule this checker skips.
 *
 * Messages are plain Indonesian with the path of the value, because operators and stewards read them.
 */
export type Schema = Record<string, unknown>
export type SchemaProblem = { path: string; message: string }

const KNOWN = new Set(['$schema', '$id', '$defs', '$comment', 'title', 'description', 'examples', 'default', 'type', 'properties', 'required', 'additionalProperties', 'enum', 'const', 'items', 'minItems', 'maxItems', 'uniqueItems', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum', '$ref', 'oneOf'])
const typeName: Record<string, string> = { string: 'teks', integer: 'bilangan bulat', number: 'angka', boolean: 'true atau false', array: 'daftar', object: 'kumpulan kunci', null: 'kosong (null)' }

function typeOf(v: unknown) {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number'
  return typeof v
}
const fits = (v: unknown, t: string) => {
  const actual = typeOf(v)
  return actual === t || (t === 'number' && actual === 'integer')
}
const at = (path: string, k: string | number) => (typeof k === 'number' ? `${path}[${k}]` : path ? `${path}.${k}` : k)
const show = (v: unknown) => (typeof v === 'string' ? JSON.stringify(v) : String(v))

export function check(root: Schema, value: unknown): SchemaProblem[] {
  const problems: SchemaProblem[] = []
  const target = (ref: string): Schema => {
    const m = /^#\/\$defs\/([A-Za-z0-9_-]+)$/.exec(ref)
    const t = m && (root.$defs as Record<string, Schema> | undefined)?.[m[1]]
    if (!t) throw Error('Unknown schema reference ' + ref)
    return t
  }
  const resolve = (s: Schema): Schema => (typeof s.$ref === 'string' && Object.keys(s).length === 1 ? resolve(target(s.$ref)) : s)
  const walk = (raw: Schema, v: unknown, path: string, out: SchemaProblem[]) => {
    const s = raw,
      where = path || 'berkas'
    for (const k of Object.keys(s)) if (!KNOWN.has(k)) throw Error('Schema keyword not supported: ' + k)
    // $ref applies beside the schema's own keywords, as in draft 2020-12.
    if (typeof s.$ref === 'string') {
      const before = out.length
      walk(target(s.$ref), v, path, out)
      if (out.length > before && Object.keys(s).every((k) => k === '$ref' || k === 'description')) return
    }
    if (s.type !== undefined) {
      const types = Array.isArray(s.type) ? (s.type as string[]) : [s.type as string]
      if (!types.some((t) => fits(v, t))) return void out.push({ path: where, message: `${where} harus berupa ${types.map((t) => typeName[t] ?? t).join(' atau ')}.` })
    }
    if (s.const !== undefined && v !== s.const) out.push({ path: where, message: `${where} harus ${show(s.const)}.` })
    if (Array.isArray(s.enum) && !s.enum.includes(v as never)) out.push({ path: where, message: `${where} harus salah satu dari ${s.enum.map(show).join(', ')}.` })
    if (typeof v === 'string') {
      const length = [...v].length
      if (typeof s.minLength === 'number' && length < s.minLength) out.push({ path: where, message: s.minLength === 1 ? `${where} tidak boleh kosong.` : `${where} paling sedikit ${s.minLength} karakter.` })
      if (typeof s.maxLength === 'number' && length > s.maxLength) out.push({ path: where, message: `${where} paling banyak ${s.maxLength} karakter.` })
      if (typeof s.pattern === 'string' && !new RegExp(s.pattern, 'u').test(v)) out.push({ path: where, message: `${where} tidak sesuai format${typeof s.description === 'string' ? ': ' + s.description : '.'}` })
    }
    if (typeof v === 'number') {
      if (typeof s.minimum === 'number' && v < s.minimum) out.push({ path: where, message: `${where} paling kecil ${s.minimum}.` })
      if (typeof s.maximum === 'number' && v > s.maximum) out.push({ path: where, message: `${where} paling besar ${s.maximum}.` })
    }
    if (Array.isArray(v)) {
      if (typeof s.minItems === 'number' && v.length < s.minItems) out.push({ path: where, message: `${where} paling sedikit berisi ${s.minItems}.` })
      if (typeof s.maxItems === 'number' && v.length > s.maxItems) out.push({ path: where, message: `${where} paling banyak berisi ${s.maxItems}.` })
      if (s.uniqueItems === true && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) out.push({ path: where, message: `${where} memuat isi yang sama dua kali.` })
      if (s.items && typeof s.items === 'object') v.forEach((x, i) => walk(s.items as Schema, x, at(path, i), out))
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, unknown>,
        props = (s.properties ?? {}) as Record<string, Schema>
      for (const r of (s.required ?? []) as string[]) if (!Object.hasOwn(o, r)) out.push({ path: at(path, r), message: `${at(path, r)} wajib diisi.` })
      for (const [k, x] of Object.entries(o)) {
        if (Object.hasOwn(props, k)) walk(props[k], x, at(path, k), out)
        else if (s.additionalProperties === false) out.push({ path: at(path, k), message: `${at(path, k)} tidak dikenal di berkas ini.` })
        else if (s.additionalProperties && typeof s.additionalProperties === 'object') walk(s.additionalProperties as Schema, x, at(path, k), out)
      }
    }
    if (Array.isArray(s.oneOf)) {
      const branches = (s.oneOf as Schema[]).map(resolve)
      // A branch whose `const` properties all match is the one meant, so its own problems are the useful ones.
      const meant = v && typeof v === 'object' && !Array.isArray(v)
        ? branches.filter((b) => {
            const consts = Object.entries((b.properties ?? {}) as Record<string, Schema>).filter(([, p]) => p.const !== undefined)
            return consts.length > 0 && consts.every(([k, p]) => (v as Record<string, unknown>)[k] === p.const)
          })
        : []
      if (meant.length === 1) walk(meant[0], v, path, out)
      else {
        const passing = branches.filter((b) => {
          const tmp: SchemaProblem[] = []
          walk(b, v, path, tmp)
          return !tmp.length
        })
        if (passing.length !== 1) out.push({ path: where, message: `${where} tidak cocok dengan bentuk yang dikenal.` })
      }
    }
  }
  walk(root, value, '', problems)
  return problems
}
