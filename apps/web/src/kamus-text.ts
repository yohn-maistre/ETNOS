/** Kamus in posts: the pure text steps, shared by the server and the web app (no I/O, no model).
 *
 * 1. Tokenise a post. Numbers, links, mentions and hashtags are skipped, and so is a capitalised word that does not
 *    start a sentence, because it is most likely a name (Timika, Paniai, Arafura).
 * 2. Match a word to the Kamus: the headword, then a known spelling (tulisan lain), then the word with one suffix
 *    taken off. A stem match is only a question ("Bentuk dari ibo?"), never a fact.
 * 3. Choose which words carry an underline: open questions only, at most one per sentence and three per post, the
 *    most frequent first.
 * 4. Align Artinya pairs (a post and its Indonesian translation) by a Dice count, and guess an Indonesian word's class
 *    from a small rule set. Both only produce questions for people to answer.
 *
 * It lives in the web app so the dev server can serve it; the server imports it from here. It has no imports and no
 * Node APIs. */

export type Skip = 'number' | 'url' | 'mention' | 'name'
export type Token = { text: string; norm: string; start: number; end: number; sentence: number; initial: boolean; skip?: Skip }
export const WORD_CLASSES = ['benda', 'kerja', 'sifat', 'lainnya'] as const
export type WordClass = (typeof WORD_CLASSES)[number]
export const CLASS_LABEL: Record<WordClass, string> = { benda: 'kata benda', kerja: 'kata kerja', sifat: 'kata sifat', lainnya: 'lainnya' }

/** Suffixes for Mee (Ekari), from the grammar notes in docs/research/mee-text-sources-2026-11-21.md. A steward can
 * edit a community's list; a language without a list starts with none. */
export const DEFAULT_SUFFIXES: Record<string, string[]> = { ekar1243: ['kodo', 'make', 'ida', 'iga', 'ko', 'ka', 'ya'] }
export const MIN_STEM = 3

/** Lowercase, NFC, edge hyphens and apostrophes removed. The same rule as the Kamus headword index. */
export const normWord = (w: string) => w.toLowerCase().normalize('NFC').replace(/^[-'’]+|[-'’]+$/g, '')

// Links, mentions, hashtags, numbers and words, in that order of preference.
const PIECE = /(https?:\/\/[^\s<>]+|www\.[^\s<>]+)|([@#][\p{L}\p{N}_.-]+)|(\p{N}[\p{N}.,:/-]*)|(\p{L}[\p{L}\p{M}'’-]*)/gu
const SENTENCE_END = /[.!?…]["'”’)\]]*\s*$|\n\s*$/

/** Every piece of a post that a reader could tap, with its place in the text. */
export function tokenize(text: string): Token[] {
  const out: Token[] = []
  let sentence = 0, initial = true, last = 0
  for (const m of text.matchAll(PIECE)) {
    const start = m.index ?? 0, raw = m[0], between = text.slice(last, start)
    if (out.length && SENTENCE_END.test(between)) { sentence++; initial = true }
    last = start + raw.length
    if (m[1] || m[2] || m[3]) {
      // A trailing full stop on a link or a number belongs to the sentence, not to the piece.
      const trimmed = raw.replace(/[.,:;!?]+$/, ''), end = start + trimmed.length
      out.push({ text: trimmed, norm: '', start, end, sentence, initial, skip: m[1] ? 'url' : m[2] ? 'mention' : 'number' })
      last = end
      initial = false
      continue
    }
    const word = raw.replace(/[-'’]+$/, ''), end = start + word.length
    const capital = /^\p{Lu}/u.test(word)
    const token: Token = { text: word, norm: normWord(word), start, end, sentence, initial }
    if (capital && !initial) token.skip = 'name'
    out.push(token)
    last = end
    initial = false
  }
  return out
}

/** The forms the matcher can find, by normalised spelling. */
export type Lookup = (norm: string) => boolean
/** A word with one suffix taken off, when the rest is a known word. Longest suffix first. */
export function stripSuffix(norm: string, suffixes: readonly string[], known: Lookup): { stem: string; suffix: string } | null {
  const list = [...new Set(suffixes.map((s) => normWord(s.replace(/^-/, ''))).filter(Boolean))].sort((a, b) => b.length - a.length)
  for (const suffix of list) {
    if (!norm.endsWith(suffix) || norm.length - suffix.length < MIN_STEM) continue
    const stem = norm.slice(0, -suffix.length)
    if (known(stem)) return { stem, suffix }
  }
  return null
}

export type Match = { kind: 'exact' | 'stem'; norm: string; stem?: string; suffix?: string }
/** Exact headword or spelling first, then one suffix off. Words shorter than three letters are never matched. */
export function matchWord(norm: string, known: Lookup, suffixes: readonly string[]): Match | null {
  if (norm.length < MIN_STEM) return null
  if (known(norm)) return { kind: 'exact', norm }
  const s = stripSuffix(norm, suffixes, known)
  return s ? { kind: 'stem', norm, stem: s.stem, suffix: s.suffix } : null
}

export type Candidate = { token: Token; key: string; weight: number }
/** Underlines for one post: at most one per sentence and `perPost` in all, the heaviest first, each key once. */
export function chooseUnderlines(candidates: Candidate[], perPost = 3): Candidate[] {
  const sorted = [...candidates].sort((a, b) => b.weight - a.weight || a.token.start - b.token.start)
  const sentences = new Set<number>(), keys = new Set<string>(), out: Candidate[] = []
  for (const c of sorted) {
    if (out.length >= perPost) break
    if (sentences.has(c.token.sentence) || keys.has(c.key)) continue
    sentences.add(c.token.sentence); keys.add(c.key); out.push(c)
  }
  return out.sort((a, b) => a.token.start - b.token.start)
}

/** Words of the Indonesian side that carry no meaning of their own for alignment. */
export const ID_STOP = new Set(('yang dan di ke dari itu ini ada tidak sudah akan juga untuk dengan pada dalam atau karena jadi lalu tapi ' +
  'saya aku kamu kau dia ia kami kita mereka anda sa ko de dong kitong kam tong torang ' +
  'apa siapa mana kapan bagaimana mengapa kenapa berapa ya tak belum masih lagi saja pun nya lah kah sangat sekali bisa mau harus').split(' '))

/** Tokens of an Indonesian sentence worth aligning. */
export const indonesianWords = (text: string) => [...new Set(tokenize(text).filter((t) => !t.skip && t.norm.length >= 3 && !ID_STOP.has(t.norm)).map((t) => t.norm))]

export type Pair = { local: string[]; indonesian: string[] }
export type Alignment = { local: string; indonesian: string; dice: number; together: number }
/** Dice over pairs: 2·together / (pairs with the local word + pairs with the Indonesian word). A candidate needs at
 * least `min` pairs where both occur, and the best Indonesian word for each local word wins. */
export function align(pairs: Pair[], o: { min?: number; threshold?: number } = {}): Alignment[] {
  const min = o.min ?? 2, threshold = o.threshold ?? 0.5
  const cl = new Map<string, number>(), ci = new Map<string, number>(), co = new Map<string, Map<string, number>>()
  for (const p of pairs) {
    const L = [...new Set(p.local)], I = [...new Set(p.indonesian)]
    for (const l of L) cl.set(l, (cl.get(l) ?? 0) + 1)
    for (const i of I) ci.set(i, (ci.get(i) ?? 0) + 1)
    for (const l of L) { const m = co.get(l) ?? new Map<string, number>(); for (const i of I) m.set(i, (m.get(i) ?? 0) + 1); co.set(l, m) }
  }
  const out: Alignment[] = []
  for (const [l, m] of co) {
    let best: Alignment | null = null
    for (const [i, n] of m) {
      if (n < min) continue
      const dice = (2 * n) / (cl.get(l)! + ci.get(i)!)
      if (dice >= threshold && (!best || dice > best.dice || (dice === best.dice && i < best.indonesian))) best = { local: l, indonesian: i, dice: Math.round(dice * 1000) / 1000, together: n }
    }
    if (best) out.push(best)
  }
  return out.sort((a, b) => b.dice - a.dice || b.together - a.together || a.local.localeCompare(b.local))
}

const ADJECTIVES = new Set(('besar kecil baik buruk jahat baru lama tua muda panjang pendek tinggi rendah berat ringan merah hitam putih hijau kuning biru ' +
  'manis pahit asin asam dingin panas jauh dekat banyak sedikit tebal tipis lebar sempit keras lunak basah kering cepat lambat bagus cantik ' +
  'kotor bersih sakit senang sedih takut kuat lemah gemuk kurus kaya miskin dalam dangkal terang gelap penuh kosong benar salah').split(' '))
const VERBS = new Set(('makan minum pergi datang lihat dengar tidur duduk lari jalan pukul gigit ambil beri kasih bawa tahu tanam masak cari pulang ' +
  'naik turun mandi tulis baca bilang buat potong bakar tiup jatuh ikat isap sembunyi tertawa menangis berdiri pikul gali jual beli tunggu').split(' '))
const FUNCTION = new Set([...ID_STOP, 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'bukan', 'jangan', 'dan', 'atau'])

/** A guess at an Indonesian word's class from a small rule set: closed lists first, then affixes. The answer is
 * shown only inside a question, such as "Artinya rumah? (kata benda)". */
export function guessClass(word: string): WordClass | '' {
  const w = normWord(word)
  if (w.length < 2) return ''
  if (FUNCTION.has(w)) return 'lainnya'
  if (ADJECTIVES.has(w)) return 'sifat'
  if (VERBS.has(w)) return 'kerja'
  if (/^(ke|pe|per|pem|pen|peng|peny)\p{L}{3,}an$/u.test(w) || /^(pe|pem|pen|peng|peny)\p{L}{3,}$/u.test(w)) return 'benda'
  if (/^(me|mem|men|meng|meny|ber|bel|di)\p{L}{3,}$/u.test(w)) return 'kerja'
  if (/^ter\p{L}{3,}$/u.test(w)) return ''
  return 'benda'
}

/** A Dice score as a share of agreement in words: shown only to stewards, never as a fact. */
export const diceText = (d: number) => Math.round(d * 100) + '%'
