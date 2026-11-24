/** Pure zero-dependency ISO/IEC 18004 QR Code SVG generator (Byte mode, ECC Level L, Versions 1..6).
 * Handles URLs up to 134 UTF-8 bytes offline with zero network calls or external packages. */

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
}

const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

function rsGenerator(degree: number): Uint8Array {
  let poly: Uint8Array = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    const factor = EXP[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], factor)
    }
    poly = next
  }
  return poly
}

function rsRemainder(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGenerator(ecLen)
  const rem = new Uint8Array(ecLen)
  for (const byte of data) {
    const factor = byte ^ rem[0]
    for (let i = 0; i < ecLen - 1; i++) rem[i] = rem[i + 1]
    rem[ecLen - 1] = 0
    for (let i = 0; i < ecLen; i++) rem[i] ^= gfMul(gen[i + 1], factor)
  }
  return rem
}

// Level L parameters for Versions 1..6: [version, size, totalDataCodewords, ecPerBlock, numBlocks, alignCenters]
type VSpec = { v: number; size: number; dataCw: number; ecCw: number; blocks: number; align: number[] }
const VERSIONS: VSpec[] = [
  { v: 1, size: 21, dataCw: 19, ecCw: 7, blocks: 1, align: [] },
  { v: 2, size: 25, dataCw: 34, ecCw: 10, blocks: 1, align: [6, 18] },
  { v: 3, size: 29, dataCw: 55, ecCw: 15, blocks: 1, align: [6, 22] },
  { v: 4, size: 33, dataCw: 80, ecCw: 20, blocks: 1, align: [6, 26] },
  { v: 5, size: 37, dataCw: 108, ecCw: 26, blocks: 1, align: [6, 30] },
  { v: 6, size: 41, dataCw: 136, ecCw: 18, blocks: 2, align: [6, 34] },
]

// Format info bits for ECC Level L (bits 01) and masks 0..7, pre-masked with 0x5412 (ISO/IEC 18004 Table C.1)
const FORMAT_L = [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976]

export function qrMatrix(text: string): { size: number; modules: Uint8Array } {
  const bytes = new TextEncoder().encode(text)
  const spec = VERSIONS.find((s) => bytes.length + 2 <= s.dataCw) ?? VERSIONS[VERSIONS.length - 1]
  const payload = bytes.slice(0, spec.dataCw - 2)

  // Bitstream: Byte mode (0100), 8-bit length, payload bytes, terminator, pad bytes 0xEC/0x11
  const bits: number[] = []
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  push(0b0100, 4)
  push(payload.length, 8)
  for (const b of payload) push(b, 8)
  const capBits = spec.dataCw * 8
  push(0, Math.min(4, capBits - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)
  const data = new Uint8Array(spec.dataCw)
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]
    data[i >> 3] = v
  }
  for (let i = bits.length >> 3, p = 0; i < spec.dataCw; i++, p++) data[i] = p % 2 === 0 ? 0xec : 0x11

  // Split into RS blocks and interleave data + EC codewords
  const blockLen = spec.dataCw / spec.blocks
  const dBlocks: Uint8Array[] = []
  const eBlocks: Uint8Array[] = []
  for (let b = 0; b < spec.blocks; b++) {
    const slice = data.slice(b * blockLen, (b + 1) * blockLen)
    dBlocks.push(slice)
    eBlocks.push(rsRemainder(slice, spec.ecCw))
  }
  const stream: number[] = []
  for (let i = 0; i < blockLen; i++) for (const blk of dBlocks) stream.push(blk[i])
  for (let i = 0; i < spec.ecCw; i++) for (const blk of eBlocks) stream.push(blk[i])

  const n = spec.size
  const mat = new Uint8Array(n * n)
  const fn = new Uint8Array(n * n) // 1 = function module (not masked)
  const setFn = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= n || c < 0 || c >= n) return
    mat[r * n + c] = dark ? 1 : 0
    fn[r * n + c] = 1
  }

  // Finder patterns + separators
  const finder = (tr: number, tc: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = tr + dr, c = tc + dc
        if (r < 0 || r >= n || c < 0 || c >= n) continue
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6
        const dark = inOuter && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4))
        setFn(r, c, dark)
      }
    }
  }
  finder(0, 0)
  finder(0, n - 7)
  finder(n - 7, 0)

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    setFn(6, i, i % 2 === 0)
    setFn(i, 6, i % 2 === 0)
  }

  // Alignment patterns
  for (const r of spec.align) {
    for (const c of spec.align) {
      if (fn[r * n + c]) continue
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setFn(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1)
        }
      }
    }
  }

  // Reserve format info + dark module
  for (let i = 0; i < 9; i++) {
    if (!fn[8 * n + i]) setFn(8, i, false)
    if (!fn[i * n + 8]) setFn(i, 8, false)
  }
  for (let i = 0; i < 8; i++) {
    setFn(8, n - 1 - i, false)
    setFn(n - 1 - i, 8, false)
  }
  setFn(4 * spec.v + 9, 8, true)

  // Place data bits in upward/downward 2-column zigzag
  let bitIdx = 0
  const totalBits = stream.length * 8
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    const upward = ((right + 1) & 2) === 0
    for (let step = 0; step < n; step++) {
      const r = upward ? n - 1 - step : step
      for (let dx = 0; dx < 2; dx++) {
        const c = right - dx
        if (fn[r * n + c]) continue
        const dark = bitIdx < totalBits ? ((stream[bitIdx >> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0 : false
        mat[r * n + c] = dark ? 1 : 0
        bitIdx++
      }
    }
  }

  // Evaluate masks 0..7 and choose lowest simple penalty (balance + runs)
  const maskFn = (m: number, r: number, c: number) => {
    switch (m) {
      case 0: return (r + c) % 2 === 0
      case 1: return r % 2 === 0
      case 2: return c % 3 === 0
      case 3: return (r + c) % 3 === 0
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
    }
  }

  let bestMask = 0, bestScore = Infinity
  let bestMat = mat
  for (let m = 0; m < 8; m++) {
    const cand = new Uint8Array(mat)
    let darkCount = 0
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const idx = r * n + c
        if (!fn[idx] && maskFn(m, r, c)) cand[idx] ^= 1
        if (cand[idx]) darkCount++
      }
    }
    // Write format info
    const fmt = FORMAT_L[m]
    const bit = (i: number) => ((fmt >>> i) & 1)
    for (let i = 0; i <= 5; i++) cand[8 * n + i] = bit(14 - i)
    cand[8 * n + 7] = bit(8)
    cand[8 * n + 8] = bit(7)
    cand[7 * n + 8] = bit(6)
    for (let i = 0; i <= 5; i++) cand[(5 - i) * n + 8] = bit(5 - i)
    for (let i = 0; i <= 7; i++) cand[8 * n + (n - 1 - i)] = bit(i)
    for (let i = 0; i <= 6; i++) cand[(n - 7 + i) * n + 8] = bit(14 - i)

    // Score runs + balance
    let score = Math.abs(darkCount * 20 - n * n * 10)
    for (let r = 0; r < n; r++) {
      let run = 1
      for (let c = 1; c < n; c++) {
        if (cand[r * n + c] === cand[r * n + c - 1]) { run++; if (run === 5) score += 3; else if (run > 5) score += 1 }
        else run = 1
      }
    }
    for (let c = 0; c < n; c++) {
      let run = 1
      for (let r = 1; r < n; r++) {
        if (cand[r * n + c] === cand[(r - 1) * n + c]) { run++; if (run === 5) score += 3; else if (run > 5) score += 1 }
        else run = 1
      }
    }
    if (score < bestScore) { bestScore = score; bestMask = m; bestMat = cand }
  }
  void bestMask
  return { size: n, modules: bestMat }
}

/** Render a crisp vector SVG QR code with a 2-module quiet zone. */
export function qrSvg(text: string, px = 120): string {
  const { size, modules } = qrMatrix(text)
  const quiet = 2
  const view = size + quiet * 2
  const parts: string[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r * size + c]) parts.push(`M${c + quiet},${r + quiet}h1v1h-1z`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view} ${view}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="Kode QR"><rect width="${view}" height="${view}" fill="#ffffff"/><path d="${parts.join('')}" fill="#111111"/></svg>`
}
