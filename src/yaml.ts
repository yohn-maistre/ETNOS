/**
 * A small, strict YAML subset for the ETNOS files (etnos.yaml, lembaga.yaml, situs.yaml; see
 * docs/plan/one-page-system-2026-11-21.md §9). It reads block mappings, block sequences, plain and quoted scalars,
 * one-line flow sequences of scalars, `[]`, `{}`, `|` and `>` block text, and comments. Anchors, aliases, tags,
 * flow mappings with content, complex keys and several documents are refused with a plain message, so a file
 * always means one thing. `stringify` writes only this subset, so every exported file reads back unchanged.
 *
 * Written here instead of adding a dependency: the files are small and regular, and the subset keeps the parser
 * short enough to read.
 */
export class YamlError extends Error {
  line: number
  constructor(line: number, message: string) {
    super(line ? `Baris ${line}: ${message}` : message)
    this.line = line
  }
}

type Line = { no: number; indent: number; text: string; raw: string }
const KEY = /^([A-Za-z0-9_][A-Za-z0-9_.-]*|"(?:[^"\\]|\\.)*"|'(?:[^']|'')*')[ \t]*:(?:[ \t]+(.*)|)$/
const MAX_DEPTH = 32

function indentOf(raw: string, no: number) {
  const m = /^( *)/.exec(raw)!
  if (raw[m[1].length] === '\t') throw new YamlError(no, 'Pakai spasi untuk indentasi, bukan tab.')
  return m[1].length
}
/** The part of a line before a comment. `#` starts a comment at the line start or after a space, outside quotes. */
function uncomment(s: string) {
  let quote = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quote) {
      if (quote === '"' && c === '\\') i++
      else if (c === quote) {
        if (quote === "'" && s[i + 1] === "'") i++
        else quote = ''
      }
    } else if (c === '#' && (i === 0 || s[i - 1] === ' ' || s[i - 1] === '\t')) return s.slice(0, i).trimEnd()
    else if ((c === '"' || c === "'") && (i === 0 || /[\s[,:-]/.test(s[i - 1]))) quote = c
  }
  return s.trimEnd()
}

function unquoteDouble(s: string, no: number) {
  try {
    return JSON.parse(s.replace(/\\x([0-9a-fA-F]{2})/g, '\\u00$1').replace(/\\\//g, '/').replace(/\t/g, '\\t')) as string
  } catch {
    throw new YamlError(no, 'Teks dalam tanda kutip ganda tidak lengkap.')
  }
}
function scalar(src: string, no: number): unknown {
  const s = src.trim()
  if (s === '') return null
  if (s.startsWith('"')) {
    const end = closing(s, '"')
    if (end !== s.length - 1) throw new YamlError(no, 'Ada teks setelah tanda kutip penutup.')
    return unquoteDouble(s, no)
  }
  if (s.startsWith("'")) {
    const end = closing(s, "'")
    if (end !== s.length - 1) throw new YamlError(no, 'Ada teks setelah tanda kutip penutup.')
    return s.slice(1, -1).replace(/''/g, "'")
  }
  if (s === '[]') return []
  if (s === '{}') return {}
  if (s.startsWith('[')) return flow(s, no)
  if (s.startsWith('{')) throw new YamlError(no, 'Tulis pasangan kunci dan nilai di baris masing-masing, bukan di dalam { }.')
  if (/^[&*!%@`|>]/.test(s)) throw new YamlError(no, 'Tanda ' + s[0] + ' tidak dipakai di berkas ini. Beri tanda kutip jika ini teks.')
  if (/^(?:null|Null|NULL|~)$/.test(s)) return null
  if (/^(?:true|True|TRUE)$/.test(s)) return true
  if (/^(?:false|False|FALSE)$/.test(s)) return false
  if (/^[-+]?(?:0|[1-9][0-9]*)$/.test(s)) {
    const n = Number(s)
    return Number.isSafeInteger(n) ? n : s
  }
  if (/^[-+]?(?:0|[1-9][0-9]*)?\.[0-9]+(?:[eE][-+]?[0-9]+)?$/.test(s) || /^[-+]?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?[eE][-+]?[0-9]+$/.test(s)) return Number(s)
  if (/:(\s|$)/.test(s)) throw new YamlError(no, 'Teks yang memuat titik dua dan spasi perlu tanda kutip.')
  return s
}
function closing(s: string, q: string) {
  for (let i = 1; i < s.length; i++) {
    if (q === '"' && s[i] === '\\') i++
    else if (s[i] === q) {
      if (q === "'" && s[i + 1] === "'") i++
      else return i
    }
  }
  return -1
}
function flow(s: string, no: number): unknown[] {
  if (!s.endsWith(']')) throw new YamlError(no, 'Daftar dalam [ ] harus selesai di baris yang sama.')
  const inner = s.slice(1, -1).trim(),
    out: unknown[] = []
  if (!inner) return out
  let i = 0
  while (i <= inner.length) {
    while (inner[i] === ' ') i++
    let j = i
    if (inner[i] === '"' || inner[i] === "'") {
      const end = closing(inner.slice(i), inner[i])
      if (end < 0) throw new YamlError(no, 'Tanda kutip di daftar tidak ditutup.')
      j = i + end + 1
    } else while (j < inner.length && inner[j] !== ',') j++
    const item = inner.slice(i, j).trim()
    if (!item) throw new YamlError(no, 'Ada isi kosong di daftar [ ].')
    if (/^[[{]/.test(item)) throw new YamlError(no, 'Daftar di dalam daftar ditulis per baris dengan tanda -.')
    out.push(scalar(item, no))
    while (inner[j] === ' ') j++
    if (j >= inner.length) break
    if (inner[j] !== ',') throw new YamlError(no, 'Pisahkan isi daftar dengan koma.')
    i = j + 1
  }
  return out
}

class Reader {
  lines: Line[]
  constructor(src: string) {
    const raw = src.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n')
    this.lines = raw.map((r, i) => ({ no: i + 1, raw: r, indent: 0, text: '' }))
    let started = false
    for (const l of this.lines) {
      if (/^\s*(#.*)?$/.test(l.raw)) continue
      l.indent = indentOf(l.raw, l.no)
      l.text = uncomment(l.raw.slice(l.indent))
      if (l.text === '---' && l.indent === 0) {
        if (started) throw new YamlError(l.no, 'Satu berkas hanya memuat satu dokumen.')
        l.text = ''
        continue
      }
      if (l.text === '...' && l.indent === 0) throw new YamlError(l.no, 'Satu berkas hanya memuat satu dokumen.')
      started = true
    }
  }
  /** The next line with content at or after i. Comment-only and blank lines carry no content. */
  next(i: number) {
    while (i < this.lines.length && !this.lines[i].text) i++
    return i
  }
  block(i: number, indent: number, depth: number): [unknown, number] {
    if (depth > MAX_DEPTH) throw new YamlError(this.lines[i].no, 'Isi bertingkat terlalu dalam.')
    const l = this.lines[i]
    return l.text === '-' || l.text.startsWith('- ') ? this.sequence(i, indent, depth) : this.mapping(i, indent, depth)
  }
  /** The value after `key:` or `-`: inline, a block scalar, or a nested block on the following lines. */
  value(rest: string, i: number, indent: number, depth: number, compactSeq: boolean): [unknown, number] {
    const l = this.lines[i]
    if (/^[|>][-+]?$/.test(rest)) return this.text(rest, i, indent)
    if (rest !== '') {
      const v = scalar(rest, l.no),
        n = this.next(i + 1)
      if (n < this.lines.length && this.lines[n].indent > indent) throw new YamlError(this.lines[n].no, 'Baris ini menjorok, tetapi baris sebelumnya sudah berisi nilai. Teks panjang ditulis dengan tanda |.')
      return [v, n]
    }
    const n = this.next(i + 1)
    if (n >= this.lines.length) return [null, n]
    const nl = this.lines[n]
    if (nl.indent > indent) return this.block(n, nl.indent, depth + 1)
    if (compactSeq && nl.indent === indent && (nl.text === '-' || nl.text.startsWith('- '))) return this.sequence(n, indent, depth + 1)
    return [null, n]
  }
  text(head: string, i: number, indent: number): [string, number] {
    const fold = head[0] === '>',
      chomp = head[1] ?? ''
    const body: string[] = []
    let j = i + 1,
      inner = -1
    for (; j < this.lines.length; j++) {
      const r = this.lines[j].raw
      if (/^\s*$/.test(r)) {
        body.push('')
        continue
      }
      const ind = indentOf(r, this.lines[j].no)
      if (ind <= indent) break
      if (inner < 0) inner = ind
      if (ind < inner) throw new YamlError(this.lines[j].no, 'Indentasi teks panjang tidak rapi.')
      body.push(r.slice(inner))
      this.lines[j].text = ''
    }
    let trailing = 0
    while (body.length && body[body.length - 1] === '') {
      body.pop()
      trailing++
    }
    let out = fold ? body.reduce((a, line, k) => (k === 0 ? line : line === '' ? a + '\n' : a.endsWith('\n') || /^\s/.test(line) ? a + line : a + ' ' + line), '') : body.join('\n')
    if (chomp === '+') out += '\n'.repeat(trailing + 1)
    else if (chomp !== '-' && body.length) out += '\n'
    return [out, this.next(j)]
  }
  mapping(i: number, indent: number, depth: number): [Record<string, unknown>, number] {
    const out: Record<string, unknown> = {}
    while (i < this.lines.length) {
      const l = this.lines[i]
      if (l.indent < indent) break
      if (l.indent > indent) throw new YamlError(l.no, 'Indentasi tidak rapi.')
      if (l.text === '-' || l.text.startsWith('- ')) throw new YamlError(l.no, 'Daftar dengan tanda - tidak boleh dicampur dengan kunci di tingkat yang sama.')
      if (l.text.startsWith('? ')) throw new YamlError(l.no, 'Kunci majemuk tidak dipakai di berkas ini.')
      const m = KEY.exec(l.text)
      if (!m) throw new YamlError(l.no, 'Baris ini perlu berbentuk kunci: nilai.')
      const key = m[1].startsWith('"') ? unquoteDouble(m[1], l.no) : m[1].startsWith("'") ? m[1].slice(1, -1).replace(/''/g, "'") : m[1]
      if (Object.hasOwn(out, key)) throw new YamlError(l.no, 'Kunci ' + key + ' ditulis dua kali.')
      if (key === '__proto__' || key === '<<') throw new YamlError(l.no, 'Kunci ' + key + ' tidak dipakai di berkas ini.')
      const [v, n] = this.value((m[2] ?? '').trim(), i, indent, depth, true)
      out[key] = v
      i = n
    }
    return [out, i]
  }
  sequence(i: number, indent: number, depth: number): [unknown[], number] {
    const out: unknown[] = []
    while (i < this.lines.length) {
      const l = this.lines[i]
      if (l.indent < indent) break
      if (l.indent > indent) throw new YamlError(l.no, 'Indentasi tidak rapi.')
      if (!(l.text === '-' || l.text.startsWith('- '))) break
      const rest = l.text.slice(1).replace(/^ +/, '')
      if (rest === '' || /^[|>][-+]?$/.test(rest)) {
        const [v, n] = this.value(rest, i, indent, depth, false)
        out.push(v)
        i = n
        continue
      }
      // "- key: value" or "- - x" opens a block whose indent is where its content starts.
      const at = indent + (l.text.length - rest.length)
      if (KEY.test(rest) || rest === '-' || rest.startsWith('- ')) {
        l.indent = at
        l.text = rest
        const [v, n] = this.block(i, at, depth + 1)
        out.push(v)
        i = n
        continue
      }
      const [v, n] = this.value(rest, i, indent, depth, false)
      out.push(v)
      i = n
    }
    return [out, i]
  }
}

/** Parse a YAML document of the subset above. An empty document is null. */
export function parse(src: string): unknown {
  if (src.length > 512 * 1024) throw new YamlError(0, 'Berkas terlalu besar.')
  const r = new Reader(src),
    start = r.next(0)
  if (start >= r.lines.length) return null
  const first = r.lines[start]
  let value: unknown, end: number
  if (first.text === '-' || first.text.startsWith('- ') || KEY.test(first.text)) [value, end] = r.block(start, first.indent, 0)
  else {
    value = scalar(first.text, first.no)
    end = r.next(start + 1)
  }
  if (end < r.lines.length) throw new YamlError(r.lines[end].no, 'Indentasi tidak rapi.')
  return value
}

const PLAIN = /^[A-Za-z0-9_./+()-][A-Za-z0-9 _./+(),'’-]*$/
function quoteIfNeeded(s: string) {
  if (s === '' || !PLAIN.test(s) || s !== s.trim() || / #|: /.test(s) || s.endsWith(':')) return JSON.stringify(s)
  const back = scalar(s, 0)
  return back === s ? s : JSON.stringify(s)
}
function key(k: string) {
  return /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(k) ? k : JSON.stringify(k)
}
function emit(v: unknown, indent: number, out: string[], prefix: string) {
  const pad = ' '.repeat(indent)
  if (Array.isArray(v)) {
    if (!v.length) return void out.push(prefix + '[]')
    if (prefix) out.push(prefix.trimEnd())
    for (const item of v) {
      if (item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length) {
        const lines: string[] = []
        emit(item, indent + 2, lines, '')
        lines[0] = pad + '- ' + lines[0].slice(indent + 2)
        out.push(...lines)
      } else emit(item, indent + 2, out, pad + '- ')
    }
    return
  }
  if (v && typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined)
    if (!entries.length) return void out.push(prefix + '{}')
    if (prefix) out.push(prefix.trimEnd())
    for (const [k, x] of entries) {
      const head = pad + key(k) + ':'
      emit(x, indent + 2, out, head + ' ')
    }
    return
  }
  if (typeof v === 'string' && v.includes('\n')) {
    const body = v.endsWith('\n') ? v.slice(0, -1) : v
    if (!body.includes('\n\n\n') && !/(^|\n) /.test(body) && !v.endsWith('\n\n')) {
      out.push(prefix + (v.endsWith('\n') ? '|' : '|-'))
      for (const line of body.split('\n')) out.push(line ? pad + line : '')
      return
    }
  }
  out.push(prefix + (v === null || v === undefined ? 'null' : typeof v === 'string' ? quoteIfNeeded(v) : typeof v === 'number' ? (Number.isFinite(v) ? String(v) : 'null') : String(v)))
}
/** Write a value as YAML of the subset above, with optional comment lines on top. */
export function stringify(value: unknown, comments: string[] = []): string {
  const out: string[] = comments.map((c) => ('# ' + c).trimEnd())
  emit(value, 0, out, '')
  return out.join('\n').replace(/^ +$/gm, '') + '\n'
}
