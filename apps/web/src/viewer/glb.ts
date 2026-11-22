// A small reader for binary glTF 2.0 (.glb) files, enough for the scanned objects in the viewer: triangle meshes with
// positions, normals, texture coordinates and indices (as floats, or as normalised integers under
// KHR_mesh_quantization), a node tree with matrices or translation, rotation and scale, and one base colour (factor
// and texture) per material, from the core material or the older specular-glossiness extension that Sketchfab exports
// use. Compressed meshes (Draco, meshopt) are not read; the seed script stores quantised but uncompressed files. Written for ETNOS (AGPL-3.0); it follows the glTF 2.0 specification by the Khronos Group.

export type Mesh = {
  positions: Float32Array
  normals: Float32Array | null
  uvs: Float32Array | null
  indices: Uint16Array | Uint32Array | null
  color: [number, number, number, number]
  texture: Blob | null
  doubleSided: boolean
}
export type Model = { meshes: Mesh[]; min: [number, number, number]; max: [number, number, number]; triangles: number }

type Json = Record<string, any>
const SIZE: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }

export function parseGlb(buffer: ArrayBuffer): Model {
  const view = new DataView(buffer)
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('not-glb')
  let offset = 12, json: Json | null = null, bin: ArrayBuffer | null = null
  while (offset + 8 <= buffer.byteLength) {
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, length)))
    else if (type === 0x004e4942) bin = buffer.slice(start, start + length)
    offset = start + length + ((4 - (length % 4)) % 4)
  }
  if (!json || !bin) throw new Error('not-glb')
  const required: string[] = json.extensionsRequired ?? []
  if (required.some((e) => !['KHR_materials_pbrSpecularGlossiness', 'KHR_texture_transform', 'KHR_mesh_quantization'].includes(e))) throw new Error('unsupported:' + required.join(','))
  const g = json, data = bin

  type Typed = Float32Array | Uint32Array | Uint16Array | Uint8Array | Int16Array | Int8Array
  const CTOR: Record<number, { new (n: number | ArrayBuffer): Typed; BYTES_PER_ELEMENT: number }> = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array, 5122: Int16Array, 5120: Int8Array }
  const READ: Record<number, (dv: DataView, at: number) => number> = { 5126: (dv, at) => dv.getFloat32(at, true), 5125: (dv, at) => dv.getUint32(at, true), 5123: (dv, at) => dv.getUint16(at, true), 5121: (dv, at) => dv.getUint8(at), 5122: (dv, at) => dv.getInt16(at, true), 5120: (dv, at) => dv.getInt8(at) }
  function raw(i: number): Typed {
    const a = g.accessors[i], bv = g.bufferViews[a.bufferView], n = SIZE[a.type], count = a.count, Ctor = CTOR[a.componentType] ?? Uint8Array
    const bytes = Ctor.BYTES_PER_ELEMENT, base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = bv.byteStride ?? 0
    if (!stride || stride === n * bytes) return new Ctor(data.slice(base, base + count * n * bytes))
    const out = new Ctor(count * n), dv = new DataView(data), read = READ[a.componentType] ?? READ[5121]
    for (let k = 0; k < count; k++) for (let c = 0; c < n; c++) out[k * n + c] = read(dv, base + k * stride + c * bytes)
    return out
  }
  /** An attribute as floats: normalised integers are mapped to 0..1 or -1..1 as the specification says. */
  function floats(i: number): Float32Array {
    const a = g.accessors[i], v = raw(i)
    if (v instanceof Float32Array) return v
    if (!a.normalized) return Float32Array.from(v)
    const div = { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[a.componentType as number] ?? 1
    return Float32Array.from(v, (x) => Math.max(x / div, -1))
  }
  function indices(i: number): Uint16Array | Uint32Array {
    const v = raw(i)
    return v instanceof Uint16Array || v instanceof Uint32Array ? v : Uint32Array.from(v)
  }
  function image(textureIndex: number | undefined): Blob | null {
    if (textureIndex === undefined) return null
    const t = g.textures?.[textureIndex], img = t ? g.images?.[t.source] : null
    if (!img || img.bufferView === undefined) return null
    const bv = g.bufferViews[img.bufferView], start = bv.byteOffset ?? 0
    return new Blob([data.slice(start, start + bv.byteLength)], { type: img.mimeType ?? 'image/png' })
  }
  const meshes: Mesh[] = [], min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  let triangles = 0
  function visit(nodeIndex: number, parent: Float32Array) {
    const node = g.nodes[nodeIndex], m = multiply(parent, local(node))
    if (node.mesh !== undefined) for (const p of g.meshes[node.mesh].primitives) {
      if (p.mode !== undefined && p.mode !== 4) continue
      const pos = floats(p.attributes.POSITION)
      const nor = p.attributes.NORMAL !== undefined ? floats(p.attributes.NORMAL) : null
      const uvs = p.attributes.TEXCOORD_0 !== undefined ? floats(p.attributes.TEXCOORD_0) : null
      const idx = p.indices !== undefined ? indices(p.indices) : null
      // Bake the node transform into the vertices, so the renderer draws every mesh with one matrix.
      const nm = normalMatrix(m)
      for (let k = 0; k < pos.length; k += 3) {
        const x = pos[k], y = pos[k + 1], z = pos[k + 2]
        pos[k] = m[0] * x + m[4] * y + m[8] * z + m[12]; pos[k + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; pos[k + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
        for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], pos[k + c]); max[c] = Math.max(max[c], pos[k + c]) }
        if (nor) {
          const a = nor[k], b = nor[k + 1], d = nor[k + 2]
          const nx = nm[0] * a + nm[3] * b + nm[6] * d, ny = nm[1] * a + nm[4] * b + nm[7] * d, nz = nm[2] * a + nm[5] * b + nm[8] * d, l = Math.hypot(nx, ny, nz) || 1
          nor[k] = nx / l; nor[k + 1] = ny / l; nor[k + 2] = nz / l
        }
      }
      const mat = p.material !== undefined ? g.materials?.[p.material] ?? {} : {}
      const sg = mat.extensions?.KHR_materials_pbrSpecularGlossiness, pbr = mat.pbrMetallicRoughness ?? {}
      const color = (sg?.diffuseFactor ?? pbr.baseColorFactor ?? [1, 1, 1, 1]) as [number, number, number, number]
      const texture = image(sg?.diffuseTexture?.index ?? pbr.baseColorTexture?.index)
      triangles += (idx ? idx.length : pos.length / 3) / 3
      meshes.push({ positions: pos, normals: nor, uvs, indices: idx, color, texture, doubleSided: !!mat.doubleSided })
    }
    for (const c of node.children ?? []) visit(c, m)
  }
  const scene = g.scenes?.[g.scene ?? 0]
  for (const root of scene?.nodes ?? g.nodes.map((_: unknown, i: number) => i)) visit(root, identity())
  if (!meshes.length) throw new Error('empty')
  return { meshes, min, max, triangles: Math.round(triangles) }
}

export const identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
function local(node: Json): Float32Array {
  if (node.matrix) return new Float32Array(node.matrix)
  const [tx, ty, tz] = node.translation ?? [0, 0, 0], [x, y, z, w] = node.rotation ?? [0, 0, 0, 1], [sx, sy, sz] = node.scale ?? [1, 1, 1]
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z
  return new Float32Array([
    (1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0,
    2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0,
    2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ])
}
/** Column-major 4×4 product a·b. */
export function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
  return o
}
/** The inverse transpose of the upper 3×3 of a column-major matrix, for normals. */
function normalMatrix(m: Float32Array): Float32Array {
  const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10]
  const c00 = e * i - h * f, c01 = -(b * i - h * c), c02 = b * f - e * c
  const c10 = -(d * i - g * f), c11 = a * i - g * c, c12 = -(a * f - d * c)
  const c20 = d * h - g * e, c21 = -(a * h - g * b), c22 = a * e - d * b
  const det = a * c00 + d * c01 + g * c02 || 1
  return new Float32Array([c00, c10, c20, c01, c11, c21, c02, c12, c22].map((v) => v / det))
}
