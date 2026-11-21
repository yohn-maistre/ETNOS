import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseGlb } from '../src/viewer/glb.ts'

/** One triangle with quantised positions (int16) and normals (int8) under a scale-and-move node, as the seed writes. */
function triangleGlb(required = 'KHR_mesh_quantization'): ArrayBuffer {
  const pos = new Int16Array([0, 0, 0, 0, 32767, 0, 0, 0, 0, 32767, 0, 0]) // (0,0,0), (1,0,0), (0,1,0); stride 8
  const nor = new Int8Array([0, 0, 127, 0, 0, 0, 127, 0, 0, 0, 127, 0])
  const idx = new Uint16Array([0, 1, 2, 0])
  const bin = new Uint8Array(24 + 12 + 8)
  bin.set(new Uint8Array(pos.buffer), 0); bin.set(new Uint8Array(nor.buffer), 24); bin.set(new Uint8Array(idx.buffer), 36)
  const json = {
    asset: { version: '2.0' }, extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: [required],
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, matrix: [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 1, 0, 0, 1] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.5, 0.5, 0.5, 1] } }],
    accessors: [
      { bufferView: 0, componentType: 5122, normalized: true, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5120, normalized: true, count: 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 24, byteStride: 8 }, { buffer: 0, byteOffset: 24, byteLength: 12, byteStride: 4 }, { buffer: 0, byteOffset: 36, byteLength: 6 }],
    buffers: [{ byteLength: bin.length }],
  }
  let text = new TextEncoder().encode(JSON.stringify(json))
  const pad = (4 - (text.length % 4)) % 4
  if (pad) { const t = new Uint8Array(text.length + pad).fill(0x20); t.set(text); text = t }
  const out = new Uint8Array(12 + 8 + text.length + 8 + bin.length), dv = new DataView(out.buffer)
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true)
  dv.setUint32(12, text.length, true); dv.setUint32(16, 0x4e4f534a, true); out.set(text, 20)
  const b = 20 + text.length
  dv.setUint32(b, bin.length, true); dv.setUint32(b + 4, 0x004e4942, true); out.set(bin, b + 8)
  return out.buffer
}

test('a quantised GLB decodes to the right floats, with the node transform baked in', () => {
  const m = parseGlb(triangleGlb())
  assert.equal(m.meshes.length, 1)
  assert.equal(m.triangles, 1)
  assert.deepEqual([...m.meshes[0].positions], [1, 0, 0, 3, 0, 0, 1, 2, 0])
  assert.deepEqual(m.min, [1, 0, 0])
  assert.deepEqual(m.max, [3, 2, 0])
  assert.ok(Math.abs(m.meshes[0].normals![2] - 1) < 1e-6)
  assert.deepEqual([...m.meshes[0].indices!], [0, 1, 2])
  assert.equal(m.meshes[0].doubleSided, true)
})

test('files that need an extension the viewer cannot read are refused', () => {
  assert.throws(() => parseGlb(triangleGlb('KHR_draco_mesh_compression')), /unsupported/)
})
