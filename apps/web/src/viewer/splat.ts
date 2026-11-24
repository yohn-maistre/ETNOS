/**
 * Zero-dependency browser parser for 3D Gaussian Splats:
 * - Niantic .spz v2 (gzipped quantized Gaussians, decompressed via browser DecompressionStream)
 * - Standard binary little-endian and ASCII .ply point/splat files
 *
 * Written for ETNOS Penampil (AGPL-3.0-only) to keep mobile 3G bundles tiny.
 */

export type SplatCloud = {
  count: number
  /** Interleaved XYZ floats (length = count * 3) */
  positions: Float32Array
  /** Interleaved RGBA floats in [0..1] (length = count * 4) */
  colors: Float32Array
  /** Mean Gaussian radius per point (length = count) */
  radii: Float32Array
  min: [number, number, number]
  max: [number, number, number]
}

const SH_C0 = 0.28209479177387814
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))

async function gunzip(bytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Browser tidak mendukung dekompresi SPZ (DecompressionStream).')
  }
  const ds = new DecompressionStream('gzip')
  const stream = new Response(new Blob([new Uint8Array(bytes)]).stream().pipeThrough(ds))
  return new Uint8Array(await stream.arrayBuffer())
}

/** Parses a Niantic SPZ v2 binary (gzipped or already inflated). */
export async function parseSpz(buffer: ArrayBuffer): Promise<SplatCloud> {
  let raw: Uint8Array = new Uint8Array(buffer)
  if (raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b) {
    raw = await gunzip(raw)
  }
  if (raw.length < 16) throw new Error('not-spz')
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  const magic = dv.getUint32(0, true)
  const version = dv.getUint32(4, true)
  if (magic !== 0x5053474e || (version !== 2 && version !== 3)) throw new Error('not-spz')

  const count = Math.min(dv.getUint32(8, true), 500_000)
  const fracBits = raw[13] || 12
  const scaleDiv = 1 / (1 << fracBits)

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 4)
  const radii = new Float32Array(count)
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]

  let off = 16
  // Positions: signed 24-bit fixed-point little-endian (9 bytes per point)
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++) {
      let v = raw[off] | (raw[off + 1] << 8) | (raw[off + 2] << 16)
      if (v & 0x800000) v |= ~0xffffff
      const f = v * scaleDiv
      positions[i * 3 + a] = f
      if (f < min[a]) min[a] = f
      if (f > max[a]) max[a] = f
      off += 3
    }
  }
  // Alphas: 1 byte per point
  const alphaOff = off
  off += count
  // Colors: 3 bytes per point
  const colorOff = off
  off += count * 3
  // Scales: 3 bytes per point (log_scale = byte / 16 - 10)
  const scaleOff = off

  for (let i = 0; i < count; i++) {
    colors[i * 4 + 0] = (raw[colorOff + i * 3 + 0] ?? 180) / 255
    colors[i * 4 + 1] = (raw[colorOff + i * 3 + 1] ?? 180) / 255
    colors[i * 4 + 2] = (raw[colorOff + i * 3 + 2] ?? 180) / 255
    colors[i * 4 + 3] = Math.max(0.05, (raw[alphaOff + i] ?? 230) / 255)
    if (scaleOff + i * 3 + 2 < raw.length) {
      const s0 = Math.exp(raw[scaleOff + i * 3 + 0] / 16 - 10)
      const s1 = Math.exp(raw[scaleOff + i * 3 + 1] / 16 - 10)
      const s2 = Math.exp(raw[scaleOff + i * 3 + 2] / 16 - 10)
      radii[i] = Math.max(0.002, Math.min(0.25, (s0 + s1 + s2) / 3))
    } else {
      radii[i] = 0.015
    }
  }

  return { count, positions, colors, radii, min, max }
}

/** Parses standard binary little-endian or ASCII Gaussian Splat .ply files. */
export function parsePly(buffer: ArrayBuffer): SplatCloud {
  const bytes = new Uint8Array(buffer)
  const headText = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 8192)))
  const endMarker = 'end_header\n'
  const endMarkerCr = 'end_header\r\n'
  let headerEnd = headText.indexOf(endMarker)
  let bodyOffset = headerEnd >= 0 ? headerEnd + endMarker.length : -1
  if (headerEnd < 0) {
    headerEnd = headText.indexOf(endMarkerCr)
    bodyOffset = headerEnd >= 0 ? headerEnd + endMarkerCr.length : -1
  }
  if (headerEnd < 0 || bodyOffset < 0) throw new Error('not-ply')

  const lines = headText.slice(0, headerEnd).split(/\r?\n/)
  let format: 'ascii' | 'binary_little_endian' = 'binary_little_endian'
  let vertexCount = 0
  let inVertex = false
  const props: { name: string; type: string; size: number }[] = []
  const TYPE_SIZE: Record<string, number> = {
    char: 1, int8: 1, uchar: 1, uint8: 1,
    short: 2, int16: 2, ushort: 2, uint16: 2,
    int: 4, int32: 4, uint: 4, uint32: 4, float: 4, float32: 4,
    double: 8, float64: 8,
  }

  for (const line of lines) {
    const p = line.trim().split(/\s+/)
    if (p[0] === 'format') format = p[1] === 'ascii' ? 'ascii' : 'binary_little_endian'
    else if (p[0] === 'element') {
      inVertex = p[1] === 'vertex'
      if (inVertex) vertexCount = Math.min(Number(p[2]) || 0, 500_000)
    } else if (p[0] === 'property' && inVertex && p[1] !== 'list') {
      props.push({ type: p[1], name: p[2], size: TYPE_SIZE[p[1]] ?? 4 })
    }
  }
  if (!vertexCount) throw new Error('empty-ply')

  const positions = new Float32Array(vertexCount * 3)
  const colors = new Float32Array(vertexCount * 4)
  const radii = new Float32Array(vertexCount)
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]

  const idxOf = (name: string) => props.findIndex((p) => p.name === name)
  const ix = idxOf('x'), iy = idxOf('y'), iz = idxOf('z')
  const ir = idxOf('red'), ig = idxOf('green'), ib = idxOf('blue')
  const idc0 = idxOf('f_dc_0'), idc1 = idxOf('f_dc_1'), idc2 = idxOf('f_dc_2')
  const iop = idxOf('opacity')
  const is0 = idxOf('scale_0'), is1 = idxOf('scale_1'), is2 = idxOf('scale_2')

  if (format === 'ascii') {
    const bodyLines = new TextDecoder('latin1').decode(bytes.subarray(bodyOffset)).split(/\r?\n/)
    let written = 0
    for (let i = 0; i < vertexCount && i < bodyLines.length; i++) {
      const vals = bodyLines[i].trim().split(/\s+/).map(Number)
      if (vals.length < 3 || !Number.isFinite(vals[ix])) continue
      const x = vals[ix], y = vals[iy], z = vals[iz]
      positions[written * 3 + 0] = x
      positions[written * 3 + 1] = y
      positions[written * 3 + 2] = z
      if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x
      if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y
      if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z
      colors[written * 4 + 0] = idc0 >= 0 ? Math.max(0, Math.min(1, 0.5 + SH_C0 * vals[idc0])) : ir >= 0 ? vals[ir] / 255 : 0.8
      colors[written * 4 + 1] = idc1 >= 0 ? Math.max(0, Math.min(1, 0.5 + SH_C0 * vals[idc1])) : ig >= 0 ? vals[ig] / 255 : 0.78
      colors[written * 4 + 2] = idc2 >= 0 ? Math.max(0, Math.min(1, 0.5 + SH_C0 * vals[idc2])) : ib >= 0 ? vals[ib] / 255 : 0.75
      colors[written * 4 + 3] = iop >= 0 ? sigmoid(vals[iop]) : 0.92
      radii[written] = is0 >= 0 ? Math.max(0.002, Math.min(0.25, (Math.exp(vals[is0]) + Math.exp(vals[is1]) + Math.exp(vals[is2])) / 3)) : 0.018
      written++
    }
    return { count: written, positions: positions.subarray(0, written * 3), colors: colors.subarray(0, written * 4), radii: radii.subarray(0, written), min, max }
  }

  // Binary little-endian
  const stride = props.reduce((sum, p) => sum + p.size, 0)
  const offsets: number[] = []
  let acc = 0
  for (const p of props) { offsets.push(acc); acc += p.size }
  const dv = new DataView(buffer, bodyOffset)
  const readVal = (rowOff: number, propIdx: number) => {
    const p = props[propIdx], at = rowOff + offsets[propIdx]
    if (p.type === 'float' || p.type === 'float32') return dv.getFloat32(at, true)
    if (p.type === 'double' || p.type === 'float64') return dv.getFloat64(at, true)
    if (p.type === 'uchar' || p.type === 'uint8') return dv.getUint8(at)
    if (p.type === 'char' || p.type === 'int8') return dv.getInt8(at)
    if (p.type === 'short' || p.type === 'int16') return dv.getInt16(at, true)
    if (p.type === 'ushort' || p.type === 'uint16') return dv.getUint16(at, true)
    return dv.getInt32(at, true)
  }

  for (let i = 0; i < vertexCount; i++) {
    const rowOff = i * stride
    if (rowOff + stride > dv.byteLength) break
    const x = readVal(rowOff, ix), y = readVal(rowOff, iy), z = readVal(rowOff, iz)
    positions[i * 3 + 0] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z
    if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x
    if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y
    if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z
    colors[i * 4 + 0] = idc0 >= 0 ? Math.max(0, Math.min(1, 0.5 + SH_C0 * readVal(rowOff, idc0))) : ir >= 0 ? readVal(rowOff, ir) / 255 : 0.8
    colors[i * 4 + 1] = idc1 >= 0 ? Math.max(0, Math.min(1, 0.5 + SH_C0 * readVal(rowOff, idc1))) : ig >= 0 ? readVal(rowOff, ig) / 255 : 0.78
    colors[i * 4 + 2] = idc2 >= 0 ? Math.max(0, Math.min(1, 0.5 + SH_C0 * readVal(rowOff, idc2))) : ib >= 0 ? readVal(rowOff, ib) / 255 : 0.75
    colors[i * 4 + 3] = iop >= 0 ? sigmoid(readVal(rowOff, iop)) : 0.92
    radii[i] = is0 >= 0
      ? Math.max(0.002, Math.min(0.25, (Math.exp(readVal(rowOff, is0)) + Math.exp(readVal(rowOff, is1)) + Math.exp(readVal(rowOff, is2))) / 3))
      : 0.018
  }
  return { count: vertexCount, positions, colors, radii, min, max }
}
