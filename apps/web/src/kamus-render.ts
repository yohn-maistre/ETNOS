// Marks the words of a rendered post for the Kamus: a dotted underline (a button) on the open questions the server
// chose, and with Mode belajar a tint and a class letter on checked words. Works on the post's HTML, so plain and
// markdown posts are treated alike. Text inside links and code is left alone.
import { tokenize, normWord } from './kamus-text.ts'
import type { Annotation } from './kamus-posts.svelte.ts'

const LETTER: Record<string, string> = { benda: 'b', kerja: 'k', sifat: 's', lainnya: 'l' }
const NAME: Record<string, string> = { benda: 'kata benda', kerja: 'kata kerja', sifat: 'kata sifat', lainnya: 'jenis lainnya' }
const SKIP = new Set(['A', 'CODE', 'PRE', 'BUTTON', 'SCRIPT', 'STYLE'])
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Plain text as HTML with links, the way PostText shows it. */
export function plainHtml(text: string) {
  return text.split(/(https?:\/\/[^\s<>]+)/g).map((piece) => /^https?:\/\//.test(piece) ? `<a class="post-inline-link" href="${escape(piece)}" target="_blank" rel="noopener noreferrer nofollow">${escape(piece)}</a>` : escape(piece)).join('')
}

export function markWords(html: string, a: Annotation, learn: boolean) {
  if (typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html'), root = doc.body.firstElementChild as HTMLElement
  const ask = new Map(a.u.map(([w, key, kind]) => [w, { key, kind }])), checked = new Map(a.c)
  const used = new Set<string>()
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    let p = n.parentElement, skip = false
    while (p && p !== root) { if (SKIP.has(p.tagName)) { skip = true; break } p = p.parentElement }
    if (!skip && n.nodeValue?.trim()) nodes.push(n as Text)
  }
  for (const node of nodes) {
    const text = node.nodeValue!, tokens = tokenize(text)
    let at = 0, changed = false
    const frag = doc.createDocumentFragment()
    for (const t of tokens) {
      if (t.skip) continue
      const n = normWord(t.text), q = ask.get(n), cls = learn ? checked.get(n) : undefined
      if (!(q && !used.has(n)) && cls === undefined) continue
      frag.append(text.slice(at, t.start))
      if (q && !used.has(n)) {
        used.add(n)
        const b = doc.createElement('button')
        b.type = 'button'; b.className = 'kq'; b.dataset.w = t.text; b.dataset.key = q.key; b.dataset.kind = q.kind
        b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-label', `${t.text}, ada pertanyaan kamus`)
        b.textContent = t.text
        frag.append(b)
      } else {
        const s = doc.createElement('span')
        s.className = 'kc'; s.dataset.c = cls || 'x'
        s.textContent = t.text
        if (cls) { const l = doc.createElement('span'); l.className = 'kc-l'; l.setAttribute('aria-hidden', 'true'); l.title = NAME[cls]; l.textContent = LETTER[cls]; s.append(l) }
        frag.append(s)
      }
      at = t.end; changed = true
    }
    if (!changed) continue
    frag.append(text.slice(at))
    node.replaceWith(frag)
  }
  return root.innerHTML
}

/** The word under a tap, from the text at that point. */
export function wordAt(x: number, y: number): { word: string; el: HTMLElement } | null {
  const d = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }
  let node: Node | null = null, offset = 0
  if (d.caretPositionFromPoint) { const p = d.caretPositionFromPoint(x, y); node = p?.offsetNode ?? null; offset = p?.offset ?? 0 }
  else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); node = r?.startContainer ?? null; offset = r?.startOffset ?? 0 }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null
  const text = node.nodeValue ?? ''
  const isWord = (c: string) => /[\p{L}\p{M}'’-]/u.test(c)
  let s = offset, e = offset
  while (s > 0 && isWord(text[s - 1])) s--
  while (e < text.length && isWord(text[e])) e++
  const word = text.slice(s, e).replace(/^[-'’]+|[-'’]+$/g, '')
  if (!/^\p{L}/u.test(word)) return null
  return { word, el: node.parentElement as HTMLElement }
}
