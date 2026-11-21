// Builds the seed records of the full-screen viewer (Penampil, /wiki/lihat/:id) and their media from open sources:
// two 3D scans (Zenodo copies of Sketchfab models, CC BY 4.0), a carved house post from The Met (CC0), four species of
// Tanah Papua (GBIF taxonomy and occurrences, Wikidata and Catalogue of Life names, Wikimedia Commons photos), a bird
// recording from iNaturalist (CC BY 4.0), five landforms (Wikidata facts, relief from open elevation tiles) and a
// table preview of the Universitas Cenderawasih butterfly collection (GBIF, CC0).
//
//   node scripts/observatory/build-viewer-seed.mjs [--work /tmp/etnos-viewer-seed]
//
// Needs ImageMagick (convert), ffmpeg and ffprobe. Downloads are cached in the work folder; the output goes to
// apps/web/public/observatory/viewer/. Every licence is checked against the source's own metadata when the script
// runs, and a file whose licence is not CC0, public domain or CC BY (any version) stops the build. Hand-written text
// (titles, summaries) only restates what the cited sources say; numbers from Wikidata were read on the date in CHECKED.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = join(ROOT, 'apps/web/public/observatory/viewer')
const WEB = '/observatory/viewer/'
const at = process.argv.indexOf('--work')
const WORK = resolve(at > 0 ? process.argv[at + 1] : '/tmp/etnos-viewer-seed', 'downloads')
const CHECKED = '2026-11-21'
const CHECKED_WORDS = '21 November 2026'
const UA = { 'user-agent': 'ETNOS-observatory-seed/1 (open data; https://etnos.space)' }
mkdirSync(WORK, { recursive: true }); mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function get(url, kind = 'json') {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, { headers: UA })
      if (r.status === 429 || r.status >= 500) throw new Error('status ' + r.status)
      if (!r.ok) throw new Error(url + ' ' + r.status)
      return kind === 'json' ? await r.json() : Buffer.from(await r.arrayBuffer())
    } catch (e) {
      if (i === 4 || /\s4\d\d$/.test(String(e.message))) throw e
      await sleep(2000 * (i + 1))
    }
  }
}
async function file(url, name) {
  const p = join(WORK, name)
  if (!existsSync(p)) { writeFileSync(p, await get(url, 'bin')); await sleep(400) }
  return p
}
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString()
/** A JPEG no larger than `max` pixels on its long edge; returns its public path and size. */
function jpeg(src, name, max, quality = 82) {
  const out = join(OUT, name)
  run('convert', [src + '[0]', '-auto-orient', '-strip', '-resize', `${max}x${max}>`, '-quality', String(quality), '-interlace', 'Plane', out])
  const [w, h] = run('identify', ['-format', '%w %h', out]).trim().split(' ').map(Number)
  return { src: WEB + name, width: w, height: h }
}
const OPEN = /^(cc0|cc-?0|public domain|pd|cc by( \d(\.\d)?)?|cc-by-\d\.\d|cc by \d\.\d)$/i
function assertOpen(name, what) { if (!OPEN.test(name.trim())) throw new Error(`Licence of ${what} is "${name}", which the viewer seed does not accept`) }
const LICENCE = {
  'CC0': { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  'CC BY 2.0': { name: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/' },
  'CC BY 2.5': { name: 'CC BY 2.5', url: 'https://creativecommons.org/licenses/by/2.5/' },
  'CC BY 4.0': { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  'Public domain': { name: 'Domain publik', url: 'https://creativecommons.org/publicdomain/mark/1.0/' },
}
const licenceOf = (short) => LICENCE[short] ?? (() => { throw new Error('No licence entry for ' + short) })()
const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

// ---------------------------------------------------------------------------------------------- Wikimedia Commons
async function commons(title) {
  const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', titles: title, prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '1600' })
  const d = await get(u); await sleep(1200)
  const page = d.query.pages[0], ii = page.imageinfo?.[0]
  if (!ii) throw new Error('No image info for ' + title)
  const m = ii.extmetadata ?? {}, short = strip(m.LicenseShortName?.value)
  assertOpen(short, title)
  return { thumb: ii.thumburl ?? ii.url, page: ii.descriptionurl, artist: strip(m.Artist?.value) || 'tanpa nama', licence: short === 'Public domain' ? 'Public domain' : short.replace(/^CC0.*/, 'CC0') }
}
async function commonsPhoto(title, name, alt, note, credit) {
  const c = await commons(title)
  const ext = c.thumb.split('?')[0].split('.').pop()
  const src = await file(c.thumb, name + '.src.' + ext)
  const img = jpeg(src, name + '.jpg', 1600)
  return { ...img, alt, credit: credit ?? c.artist, licence: licenceOf(c.licence), url: c.page, ...(note ? { note } : {}) }
}

// ------------------------------------------------------------------------------------------------------------ GBIF
const GBIF_PAPUA = ['IDN.22_1', 'IDN.23_1'] // GADM 4.1 level 1: Papua Barat and Papua, which together cover Tanah Papua.
async function gbifSpecies(key) {
  const s = await get('https://api.gbif.org/v1/species/' + key)
  const taxonomy = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus'].filter((r) => s[r]).map((r) => ({ rank: r, name: s[r] }))
  taxonomy.push({ rank: 'species', name: s.canonicalName })
  const v = await get(`https://api.gbif.org/v1/species/${key}/vernacularNames?limit=200`)
  const names = [...new Map(v.results.filter((r) => r.language === 'ind').map((r) => [r.vernacularName.toLowerCase(), { value: r.vernacularName, source: 'GBIF, dari ' + (r.source || 'sumber tanpa nama') }])).values()]
  return { canonical: s.canonicalName, authorship: s.authorship?.trim() || undefined, taxonomy, names }
}
/** Open-licence occurrences with coordinates in Tanah Papua, rounded to 0.1 degree and counted per cell. */
async function occurrences(key, slug) {
  const base = new URLSearchParams({ taxonKey: String(key), hasCoordinate: 'true', hasGeospatialIssue: 'false' })
  for (const g of GBIF_PAPUA) base.append('gadmGid', g)
  const total = (await get('https://api.gbif.org/v1/occurrence/search?' + base + '&limit=0')).count
  const open = new URLSearchParams(base); open.append('license', 'CC0_1_0'); open.append('license', 'CC_BY_4_0')
  const cells = new Map(); let shown = 0
  for (let offset = 0; offset < 6000; offset += 300) {
    const page = await get(`https://api.gbif.org/v1/occurrence/search?${open}&limit=300&offset=${offset}`)
    for (const r of page.results) {
      if (typeof r.decimalLongitude !== 'number') continue
      const k = Math.round(r.decimalLongitude * 10) / 10 + ',' + Math.round(r.decimalLatitude * 10) / 10
      cells.set(k, (cells.get(k) ?? 0) + 1); shown++
    }
    if (page.endOfRecords) break
    await sleep(300)
  }
  const points = [...cells].map(([k, n]) => [...k.split(',').map(Number), n]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const query = 'https://www.gbif.org/occurrence/map?' + base.toString().replace(/gadmGid=/g, 'gadm_gid=').replace('taxonKey', 'taxon_key').replace('hasCoordinate', 'has_coordinate').replace('hasGeospatialIssue', 'has_geospatial_issue')
  const name = 'occ-' + slug + '.json'
  writeFileSync(join(OUT, name), JSON.stringify({ checked: CHECKED, query: 'https://api.gbif.org/v1/occurrence/search?' + open, licences: ['CC0 1.0', 'CC BY 4.0'], rounding: '0.1', points }))
  return { src: WEB + name, shown, total, url: query, rounding: 'Letak setiap catatan dibulatkan ke kotak 0,1 derajat (sekitar 11 km), supaya tempat sarang atau tempat tinggal satwa tidak bisa dibaca dari peta.' }
}

// -------------------------------------------------------------------------------------------------------------- GLB
// Reads a Sketchfab export (float attributes, specular-glossiness material) and writes a smaller GLB: node transforms
// baked into the vertices, positions as 16-bit and normals as 8-bit normalised integers (KHR_mesh_quantization),
// 16-bit indices where they fit, and the colour texture as a JPEG. The shape and colours are unchanged.
function readGlb(buf) {
  const len = buf.readUInt32LE(12), json = JSON.parse(buf.subarray(20, 20 + len).toString()), binStart = 20 + len + 8
  return { json, bin: buf.subarray(binStart, binStart + buf.readUInt32LE(20 + len)) }
}
function accessorFloats(g, bin, i) {
  const a = g.accessors[i], bv = g.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]
  const bytes = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType], stride = bv.byteStride || n * bytes, base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0)
  const read = { 5126: (o) => bin.readFloatLE(o), 5125: (o) => bin.readUInt32LE(o), 5123: (o) => bin.readUInt16LE(o), 5121: (o) => bin.readUInt8(o) }[a.componentType]
  const out = new Float64Array(a.count * n)
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = read(base + k * stride + c * bytes)
  return out
}
function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o }
function localMatrix(n) {
  if (n.matrix) return n.matrix
  const [tx, ty, tz] = n.translation ?? [0, 0, 0], [x, y, z, w] = n.rotation ?? [0, 0, 0, 1], [sx, sy, sz] = n.scale ?? [1, 1, 1]
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + w * z) * sx, 2 * (x * z - w * y) * sx, 0, 2 * (x * y - w * z) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + w * x) * sy, 0, 2 * (x * z + w * y) * sz, 2 * (y * z - w * x) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1]
}
function inverseTranspose3(m) {
  const [a, b, c, , d, e, f, , g, h, i] = m
  const c00 = e * i - h * f, c01 = -(b * i - h * c), c02 = b * f - e * c, c10 = -(d * i - g * f), c11 = a * i - g * c, c12 = -(a * f - d * c), c20 = d * h - g * e, c21 = -(a * h - g * b), c22 = a * e - d * b
  const det = a * c00 + d * c01 + g * c02 || 1
  return [c00, c10, c20, c01, c11, c21, c02, c12, c22].map((v) => v / det)
}
function shrinkGlb(srcPath, outName) {
  const { json: g, bin } = readGlb(readFileSync(srcPath))
  const prims = []
  const visit = (ni, parent) => {
    const node = g.nodes[ni], m = mul(parent, localMatrix(node))
    if (node.mesh !== undefined) for (const p of g.meshes[node.mesh].primitives) {
      if ((p.mode ?? 4) !== 4) continue
      const pos = accessorFloats(g, bin, p.attributes.POSITION), nor = p.attributes.NORMAL !== undefined ? accessorFloats(g, bin, p.attributes.NORMAL) : null
      const uv = p.attributes.TEXCOORD_0 !== undefined ? accessorFloats(g, bin, p.attributes.TEXCOORD_0) : null, idx = p.indices !== undefined ? accessorFloats(g, bin, p.indices) : null
      const nm = inverseTranspose3(m)
      for (let k = 0; k < pos.length; k += 3) {
        const [x, y, z] = [pos[k], pos[k + 1], pos[k + 2]]
        pos[k] = m[0] * x + m[4] * y + m[8] * z + m[12]; pos[k + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; pos[k + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
        if (nor) {
          const [a, b, d] = [nor[k], nor[k + 1], nor[k + 2]], nx = nm[0] * a + nm[3] * b + nm[6] * d, ny = nm[1] * a + nm[4] * b + nm[7] * d, nz = nm[2] * a + nm[5] * b + nm[8] * d, l = Math.hypot(nx, ny, nz) || 1
          nor[k] = nx / l; nor[k + 1] = ny / l; nor[k + 2] = nz / l
        }
      }
      const mat = g.materials?.[p.material] ?? {}, sg = mat.extensions?.KHR_materials_pbrSpecularGlossiness
      prims.push({ pos, nor, uv, idx, texture: sg?.diffuseTexture?.index ?? mat.pbrMetallicRoughness?.baseColorTexture?.index, color: sg?.diffuseFactor ?? mat.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1] })
    }
    for (const c of node.children ?? []) visit(c, m)
  }
  for (const r of g.scenes[g.scene ?? 0].nodes) visit(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
  for (const p of prims) for (let k = 0; k < p.pos.length; k += 3) for (let c = 0; c < 3; c++) { lo[c] = Math.min(lo[c], p.pos[k + c]); hi[c] = Math.max(hi[c], p.pos[k + c]) }
  const centre = lo.map((v, c) => (v + hi[c]) / 2), half = Math.max(...hi.map((v, c) => (v - lo[c]) / 2)) || 1
  // One texture, re-encoded as a JPEG; every primitive of these scans shares it.
  const texIndex = prims.find((p) => p.texture !== undefined)?.texture
  let jpegBytes = null
  if (texIndex !== undefined) {
    const img = g.images[g.textures[texIndex].source], bv = g.bufferViews[img.bufferView]
    const raw = join(WORK, outName + '.texture.' + (img.mimeType === 'image/png' ? 'png' : 'jpg')), jpg = join(WORK, outName + '.texture.out.jpg')
    writeFileSync(raw, bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength))
    run('convert', [raw, '-strip', '-resize', '2048x2048>', '-quality', '80', '-sampling-factor', '4:2:0', jpg])
    jpegBytes = readFileSync(jpg)
  }
  const chunks = [], views = [], accessors = [], primitives = []
  let length = 0
  const push = (buf, stride, target) => { const pad = (4 - (length % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); length += pad } views.push({ buffer: 0, byteOffset: length, byteLength: buf.length, ...(stride ? { byteStride: stride } : {}), ...(target ? { target } : {}) }); chunks.push(buf); length += buf.length; return views.length - 1 }
  for (const p of prims) {
    const count = p.pos.length / 3, attributes = {}
    const qp = Buffer.alloc(count * 8), qmin = [Infinity, Infinity, Infinity], qmax = [-Infinity, -Infinity, -Infinity]
    for (let k = 0; k < count; k++) for (let c = 0; c < 3; c++) {
      const q = Math.round(((p.pos[k * 3 + c] - centre[c]) / half) * 32767); qp.writeInt16LE(q, k * 8 + c * 2)
      qmin[c] = Math.min(qmin[c], q / 32767); qmax[c] = Math.max(qmax[c], q / 32767)
    }
    accessors.push({ bufferView: push(qp, 8, 34962), componentType: 5122, normalized: true, count, type: 'VEC3', min: qmin, max: qmax }); attributes.POSITION = accessors.length - 1
    if (p.nor) {
      const qn = Buffer.alloc(count * 4)
      for (let k = 0; k < count; k++) for (let c = 0; c < 3; c++) qn.writeInt8(Math.round(p.nor[k * 3 + c] * 127), k * 4 + c)
      accessors.push({ bufferView: push(qn, 4, 34962), componentType: 5120, normalized: true, count, type: 'VEC3' }); attributes.NORMAL = accessors.length - 1
    }
    if (p.uv) {
      const inside = p.uv.every((v) => v >= 0 && v <= 1)
      const qu = Buffer.alloc(count * (inside ? 4 : 8))
      for (let k = 0; k < count * 2; k++) inside ? qu.writeUInt16LE(Math.round(p.uv[k] * 65535), k * 2) : qu.writeFloatLE(p.uv[k], k * 4)
      accessors.push({ bufferView: push(qu, inside ? 4 : 8, 34962), componentType: inside ? 5123 : 5126, ...(inside ? { normalized: true } : {}), count, type: 'VEC2' }); attributes.TEXCOORD_0 = accessors.length - 1
    }
    const prim = { attributes, mode: 4, material: 0 }
    if (p.idx) {
      const small = count <= 65535, qi = Buffer.alloc(p.idx.length * (small ? 2 : 4))
      p.idx.forEach((v, k) => (small ? qi.writeUInt16LE(v, k * 2) : qi.writeUInt32LE(v, k * 4)))
      accessors.push({ bufferView: push(qi, 0, 34963), componentType: small ? 5123 : 5125, count: p.idx.length, type: 'SCALAR' }); prim.indices = accessors.length - 1
    }
    primitives.push(prim)
  }
  const material = { name: 'scan', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: prims[0].color, metallicFactor: 0, roughnessFactor: 1 } }
  const out = { asset: { version: '2.0', generator: 'ETNOS build-viewer-seed', copyright: g.asset?.extras?.author ? `${g.asset.extras.author}, ${g.asset.extras.license}` : undefined, extras: g.asset?.extras }, extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'], scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, matrix: [half, 0, 0, 0, 0, half, 0, 0, 0, 0, half, 0, ...centre, 1] }], meshes: [{ primitives }], materials: [material], accessors, bufferViews: views, buffers: [{ byteLength: 0 }] }
  if (jpegBytes) { out.images = [{ bufferView: push(jpegBytes, 0, 0), mimeType: 'image/jpeg' }]; out.textures = [{ source: 0 }]; material.pbrMetallicRoughness.baseColorTexture = { index: 0 } }
  for (const v of out.bufferViews) if (!v.target) delete v.target
  const binary = Buffer.concat([...chunks, Buffer.alloc((4 - (length % 4)) % 4)])
  out.buffers[0].byteLength = binary.length
  let text = Buffer.from(JSON.stringify(out)); text = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)])
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + text.length + 8 + binary.length, 8)
  const ch = (buf, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(buf.length, 0); h.writeUInt32LE(type, 4); return Buffer.concat([h, buf]) }
  const glb = Buffer.concat([head, ch(text, 0x4e4f534a), ch(binary, 0x004e4942)])
  writeFileSync(join(OUT, outName), glb)
  return { src: WEB + outName, bytes: glb.length, triangles: primitives.reduce((s, p) => s + accessors[p.indices].count / 3, 0) }
}
async function zenodo(record) {
  const r = await get('https://zenodo.org/api/records/' + record)
  if (r.metadata.license?.id !== 'cc-by-4.0') throw new Error(`Zenodo ${record} licence is ${r.metadata.license?.id}`)
  const glb = r.files.find((f) => f.key.endsWith('.glb')), thumb = r.files.find((f) => f.key === 'thumb0.jpeg')
  return { meta: r.metadata, doi: r.links.doi, page: r.links.self_html, glb: await file(glb.links.self, record + '.glb'), thumb: thumb ? await file(thumb.links.self, record + '-thumb.jpeg') : null }
}

// ------------------------------------------------------------------------------------------------------------ build
const objects = []
const wikidata = (q, title) => ({ title: 'Wikidata ' + q + (title ? ', ' + title : ''), url: 'https://www.wikidata.org/wiki/' + q, publisher: 'Wikidata', licence: LICENCE.CC0 })
const thumbOf = (src, name) => jpeg(src, name, 320, 78).src

// 3D: the specimen of a western long-beaked echidna in Tübingen.
{
  const z = await zenodo('10341250')
  const m = shrinkGlb(z.glb, 'nokdiak-tubingen.glb')
  objects.push({
    id: 'spesimen-nokdiak-tubingen', kind: 'model', title: 'Spesimen nokdiak naroten di Tübingen', subtitle: 'Koleksi Zoologi Universitas Tübingen',
    summary: 'Model 3D dari spesimen awetan nokdiak naroten (dulu disebut Proechidna bruijnii) di Koleksi Zoologi Universitas Tübingen, Jerman. Menurut keterangan koleksi, satwa ini hanya hidup di Pulau Papua, terutama di hutan, dan bisa ditemukan sampai ketinggian 4.000 meter. Ia aktif pada senja dan malam hari dan memakan cacing tanah dengan lidahnya yang panjang dan lengket.',
    related: ['nokdiak-naroten'], thumb: z.thumb ? thumbOf(z.thumb, 'nokdiak-tubingen-thumb.jpg') : undefined,
    facts: [{ label: 'Model', value: `${m.triangles.toLocaleString('id-ID')} segitiga, dengan warna dari foto spesimen` }, { label: 'Ukuran sebenarnya', value: 'Belum tercatat dalam sumber' }],
    model: { src: m.src, bytes: m.bytes },
    sources: [
      { title: z.meta.title, url: z.page, publisher: 'Zenodo, komunitas 3D Big Data Space (salinan Objaverse 1.0 dari Sketchfab)', attribution: 'Model oleh escience-tuebingen, Universitas Tübingen', licence: LICENCE['CC BY 4.0'], note: 'ETNOS memperkecil berkasnya (bentuk dan warna tidak diubah). DOI ' + z.doi.replace('https://doi.org/', '') },
      { title: 'Halaman model di Sketchfab', url: 'https://sketchfab.com/3d-models/praparat-eines-langschnabeligels-089def5fa750415cb6826b21612699ee', publisher: 'Sketchfab', licence: LICENCE['CC BY 4.0'] },
    ],
    checked: CHECKED,
  })
}
// 3D: a polished stone axe of unrecorded origin, similar to New Guinea axes.
{
  const z = await zenodo('10273384')
  const m = shrinkGlb(z.glb, 'kapak-batu-manchester.glb')
  objects.push({
    id: 'kapak-batu-manchester', kind: 'model', title: 'Kapak batu yang diasah', subtitle: 'Koleksi ajar Arkeologi, Universitas Manchester',
    summary: 'Model 3D kapak batu dari dolerit atau basal di koleksi ajar Jurusan Arkeologi Universitas Manchester. Kapak ini diserahkan oleh British Museum tanpa keterangan asal. Menurut pembuat model, bentuknya mirip kapak di museum lain yang berasal dari Nugini dan Kepulauan Admiralty, jadi asalnya dari Tanah Papua belum pasti.',
    thumb: z.thumb ? thumbOf(z.thumb, 'kapak-batu-manchester-thumb.jpg') : undefined,
    facts: [{ label: 'Asal', value: 'Tidak tercatat. Mirip kapak dari Nugini dan Kepulauan Admiralty menurut pembuat model' }, { label: 'Model', value: `${m.triangles.toLocaleString('id-ID')} segitiga` }],
    model: { src: m.src, bytes: m.bytes },
    sources: [
      { title: z.meta.title, url: z.page, publisher: 'Zenodo, komunitas 3D Big Data Space (salinan Objaverse 1.0 dari Sketchfab)', attribution: 'Model oleh ursulackah', licence: LICENCE['CC BY 4.0'], note: 'ETNOS memperkecil berkasnya (bentuk dan warna tidak diubah). DOI ' + z.doi.replace('https://doi.org/', '') },
      { title: 'Catatan pembuatan model', url: 'https://uackahmsc.wordpress.com/2021/02/26/processing-the-stone-axe/', publisher: 'ursulackah' },
    ],
    checked: CHECKED,
  })
}
// Images: a Sentani house post figure at The Met.
{
  const o = await get('https://collectionapi.metmuseum.org/public/collection/v1/objects/313629')
  if (!o.isPublicDomain) throw new Error('Met 313629 is no longer public domain')
  const urls = [o.primaryImage, ...o.additionalImages].slice(0, 4)
  const alts = ['Patung tiang rumah dari kayu, tampak depan', 'Patung tiang rumah, tampak dari sudut lain', 'Patung tiang rumah, tampak dari sudut lain', 'Patung tiang rumah, tampak dari sudut lain']
  const photos = []
  for (const [i, u] of urls.entries()) photos.push({ ...jpeg(await file(u, `met-313629-${i}.jpg`), `sentani-tiang-${i + 1}.jpg`, 1800), alt: alts[i], credit: 'The Metropolitan Museum of Art', licence: LICENCE.CC0, url: o.objectURL })
  objects.push({
    id: 'patung-tiang-rumah-sentani', kind: 'images', title: 'Patung tiang rumah dari Sentani', subtitle: 'The Metropolitan Museum of Art, New York',
    summary: 'Patung kayu yang dulu menjadi bagian tiang rumah, dibuat seniman Sentani pada abad ke-19. Menurut catatan museum, patung ini berasal dari Kabiterau dan kini ada di Michael C. Rockefeller Wing.',
    thumb: thumbOf(join(OUT, 'sentani-tiang-1.jpg'), 'sentani-tiang-thumb.jpg'), photos,
    facts: [{ label: 'Bahan', value: 'Kayu' }, { label: 'Ukuran', value: 'Tinggi 91,8 cm, lebar 21,6 cm, tebal 21,6 cm' }, { label: 'Masa', value: 'Abad ke-19' }, { label: 'Nomor koleksi', value: o.accessionNumber }, { label: 'Asal menurut museum', value: `${o.city}, ${o.state}, ${o.country}` }],
    sources: [{ title: 'House post figure (' + o.accessionNumber + ')', url: o.objectURL, publisher: 'The Metropolitan Museum of Art', attribution: o.creditLine, licence: LICENCE.CC0, note: 'Foto dan data dari Open Access The Met.' }],
    checked: CHECKED,
  })
}
// Species.
// The Commons author field of the Naturalis scan holds the species authority, so that photo's credit is given by hand.
const SPECIES = [
  { id: 'cenderawasih-kuning-besar', key: 2494862, q: 'Q325356', title: 'Cenderawasih kuning besar', iucn: 'Risiko rendah',
    summary: 'Burung cenderawasih dari suku Paradisaeidae. Peta sebaran menunjukkan tempat-tempat di Tanah Papua tempat burung ini pernah dicatat menurut GBIF.',
    photos: [['File:Naturalis Biodiversity Center - RMNH.AVES.43200 2 - Paradisaea apoda apoda Linnaeus, 1758 - Paradisaeidae - bird skin specimen.jpeg', 'Kulit awetan cenderawasih kuning besar di Naturalis', 'Spesimen museum di Naturalis Biodiversity Center, Leiden.', 'Naturalis Biodiversity Center'], ['File:Paradisaea apoda -Bali Bird Park-5.jpg', 'Cenderawasih kuning besar jantan di taman burung', 'Difoto di Bali Bird Park, bukan di alam.']] },
  { id: 'kanguru-pohon-nemena', key: 2440221, q: 'Q209139', title: 'Kanguru pohon nemena', iucn: 'Rentan',
    summary: 'Kanguru pohon dari suku Macropodidae. Menurut Wikidata, satwa ini endemik di Papua.',
    photos: [['File:Dendrolagus ursinus 349114871.jpg', 'Kanguru pohon nemena di pohon', null], ['File:Ursine tree-kangaroo.jpg', 'Kanguru pohon nemena', null]] },
  { id: 'kupu-kupu-sayap-burung-rothschild', key: 1937479, q: 'Q142839', title: 'Kupu-kupu sayap burung Rothschild', iucn: 'Hampir terancam',
    summary: 'Kupu-kupu sayap burung dari suku Papilionidae. Spesimen di foto berasal dari Pegunungan Arfak dan Danau Anggi menurut keterangan Ulster Museum.',
    photos: [['File:Rothschildi P3010061.jpg', 'Kupu-kupu sayap burung Rothschild jantan, sisi atas', 'Spesimen Ulster Museum dari Arfak, 1979.'], ['File:Rothschildi fups P3010001.jpg', 'Kupu-kupu sayap burung Rothschild betina, sisi atas', 'Spesimen Ulster Museum dari Danau Anggi, 1976.']] },
  { id: 'nokdiak-naroten', key: 2433391, q: 'Q635949', title: 'Nokdiak naroten', iucn: 'Terancam kritis', related: ['spesimen-nokdiak-tubingen'],
    summary: 'Mamalia dari ordo Monotremata, kelompok mamalia yang bertelur. Model 3D spesimennya dari Universitas Tübingen bisa dibuka di penampil.',
    photos: [['File:Zaglossus bruijnii 581779220.jpg', 'Nokdiak naroten di lantai hutan', null]] },
]
for (const s of SPECIES) {
  const t = await gbifSpecies(s.key)
  const photos = []
  for (const [i, [title, alt, note, credit]] of s.photos.entries()) photos.push(await commonsPhoto(title, `${s.id}-${i + 1}`, alt, note, credit))
  const occ = await occurrences(s.key, s.id)
  const names = [{ value: s.title, source: 'Wikidata ' + s.q }, ...t.names.filter((n) => n.value.toLowerCase().replace(/-/g, ' ') !== s.title.toLowerCase())]
  objects.push({
    id: s.id, kind: 'species', title: s.title, subtitle: t.canonical, summary: s.summary, related: s.related,
    thumb: thumbOf(join(OUT, `${s.id}-1.jpg`), `${s.id}-thumb.jpg`), photos,
    species: { gbif: s.key, scientificName: t.canonical, authorship: t.authorship, taxonomy: t.taxonomy, names, localNames: 'Nama dalam bahasa-bahasa di Tanah Papua belum tercatat di ETNOS. Penutur bisa menambahkannya lewat kamus komunitas.', occurrences: occ },
    facts: [{ label: 'Status konservasi IUCN', value: s.iucn + ' (menurut Wikidata)', source: { title: 'Wikidata ' + s.q, url: 'https://www.wikidata.org/wiki/' + s.q } }],
    sources: [
      { title: 'GBIF Backbone Taxonomy, takson ' + s.key, url: 'https://www.gbif.org/species/' + s.key, publisher: 'GBIF Secretariat', licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' } },
      { title: 'Catatan keberadaan di Tanah Papua', url: occ.url, publisher: 'GBIF.org', attribution: 'GBIF.org (' + CHECKED_WORDS + '), pencarian occurrence', note: 'Hanya catatan berlisensi CC0 1.0 atau CC BY 4.0 yang ditampilkan.' },
      wikidata(s.q, 'nama dan status konservasi'),
      ...photos.map((p) => ({ title: 'Foto: ' + decodeURIComponent(p.url.split('/File:')[1] ?? p.url).replace(/_/g, ' '), url: p.url, publisher: 'Wikimedia Commons', attribution: p.credit, licence: p.licence })),
    ],
    checked: CHECKED,
  })
}
// Audio: a helmeted friarbird recorded in Papua Barat.
{
  const occ = await get('https://api.gbif.org/v1/occurrence/5935303582')
  const sound = occ.media.find((m) => m.type === 'Sound')
  if (sound.license !== 'http://creativecommons.org/licenses/by/4.0/') throw new Error('Recording licence changed: ' + sound.license)
  const wav = await file(sound.identifier, 'inat-1717096.wav'), out = join(OUT, 'cikukua-tanduk.mp3')
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k', out])
  const seconds = Math.round(Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out])) * 10) / 10
  const date = new Date(occ.eventDate.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  objects.push({
    id: 'suara-cikukua-tanduk', kind: 'audio', title: 'Suara cikukua tanduk', subtitle: 'Philemon buceroides',
    summary: `Rekaman suara cikukua tanduk dari iNaturalist. Direkam oleh ${sound.rightsHolder} pada ${date} di Provinsi ${occ.stateProvince} menurut catatan GBIF.`,
    audio: { src: WEB + 'cikukua-tanduk.mp3', type: 'audio/mpeg', seconds, transcript: null, recorded: date, place: 'Provinsi ' + occ.stateProvince },
    facts: [{ label: 'Durasi', value: seconds.toLocaleString('id-ID') + ' detik' }, { label: 'Nama', value: 'Cikukua tanduk menurut Wikidata Q795511 dan Catalogue of Life' }],
    sources: [
      { title: 'Rekaman iNaturalist ' + sound.references.split('/').pop(), url: sound.references, publisher: 'iNaturalist', attribution: 'Rekaman oleh ' + sound.rightsHolder, licence: LICENCE['CC BY 4.0'], note: 'ETNOS mengubah berkas WAV menjadi MP3 mono.' },
      { title: 'Catatan GBIF ' + occ.key, url: 'https://www.gbif.org/occurrence/' + occ.key, publisher: 'GBIF.org, dataset iNaturalist research-grade observations' },
      wikidata('Q795511', 'nama'),
    ],
    checked: CHECKED,
  })
}
// Landforms. Numbers were read from Wikidata on CHECKED; each names the reference Wikidata gives for it.
const TERRAIN = { title: 'Terrain Tiles', url: 'https://registry.opendata.aws/terrain-tiles/', publisher: 'Mapzen dan AWS Open Data', attribution: 'SRTM dan GMTED2010 (USGS), ETOPO1 (NOAA)', note: 'Relief di penampil dibuat dari ubin ketinggian ini.' }
const LANDFORMS = [
  { id: 'bentang-puncak-jaya', about: 'puncak-jaya', q: 'Q1045888', title: 'Puncak Jaya', subtitle: 'Gunung, Barisan Sudirman', view: { center: [137.1833, -4.0833], zoom: 11.6, pitch: 62, bearing: 20 },
    summary: 'Gunung tertinggi di Oseania dan puncak pulau tertinggi di dunia, menurut Wikidata. Letaknya di Barisan Sudirman, Kabupaten Mimika.',
    facts: [['Ketinggian', '4.884 meter (Wikidata, dari Wikipedia bahasa Jerman)'], ['Prominensi', '4.884 meter (Wikidata)'], ['Wilayah', 'Kabupaten Mimika (Wikidata)']] },
  { id: 'bentang-danau-paniai', about: 'danau-paniai', q: 'Q2329795', title: 'Danau Paniai', subtitle: 'Danau', view: { center: [136.3178, -3.9022], zoom: 10.6, pitch: 55, bearing: 0 },
    summary: 'Danau di Tanah Papua. Menurut Wikidata, permukaannya ada di ketinggian sekitar 1.750 meter dan luasnya sekitar 150 km².',
    facts: [['Ketinggian', '1.752 meter (Wikidata, dari Wikipedia bahasa Italia). Nilai lain di Wikidata 1.750 dan 1.766 meter'], ['Luas', '150 km² (Wikidata, dari Wikipedia bahasa Prancis)'], ['Kedalaman', '44 meter (Wikidata, dari Wikipedia bahasa Italia)']] },
  { id: 'bentang-lembah-baliem', about: 'lembah-baliem', q: 'Q804967', title: 'Lembah Baliem', subtitle: 'Lembah, Pegunungan Maoke', view: { center: [138.896, -4.0218], zoom: 9.8, pitch: 58, bearing: -15 },
    summary: 'Lembah di Pegunungan Maoke, Provinsi Papua Pegunungan, menurut Wikidata.',
    facts: [['Wilayah', 'Provinsi Papua Pegunungan (Wikidata)'], ['Pegunungan', 'Pegunungan Maoke (Wikidata)']] },
  { id: 'bentang-danau-habema', about: 'danau-habema', q: 'Q24940441', title: 'Danau Habema', subtitle: 'Danau', view: { center: [138.6678, -4.1378], zoom: 11.4, pitch: 58, bearing: 10 },
    summary: 'Danau di Tanah Papua. Menurut Wikidata, letaknya di ketinggian 3.319 meter.',
    facts: [['Ketinggian', '3.319 meter (Wikidata, tanpa rujukan)']] },
  { id: 'bentang-teluk-cenderawasih', about: 'teluk-cenderawasih', q: 'Q1053381', title: 'Teluk Cenderawasih', subtitle: 'Teluk', view: { center: [135.3333, -2.5], zoom: 6.6, pitch: 35, bearing: 0 },
    summary: 'Teluk di utara Tanah Papua. Menurut Wikidata, titik terdalamnya sekitar 1.627 meter.',
    facts: [['Kedalaman', '1.627 meter (Wikidata, dari Wikipedia bahasa Italia)']] },
]
for (const l of LANDFORMS) objects.push({
  id: l.id, kind: 'landform', title: l.title, subtitle: l.subtitle, summary: l.summary, about: [l.about],
  landform: l.view,
  facts: [{ label: 'Koordinat', value: `${Math.abs(l.view.center[1]).toLocaleString('id-ID')}° LS, ${l.view.center[0].toLocaleString('id-ID')}° BT (Wikidata)` }, ...l.facts.map(([label, value]) => ({ label, value, source: { title: 'Wikidata ' + l.q, url: 'https://www.wikidata.org/wiki/' + l.q } }))],
  sources: [wikidata(l.q, l.title), TERRAIN],
  checked: CHECKED,
})
// Dataset: the Universitas Cenderawasih butterfly collection, with its first rows.
{
  const DATASET = 'ds-1db332c2ac9546726058' // datasetId('doi:10.15468/4tp4nw')
  const page = await get('https://api.gbif.org/v1/occurrence/search?datasetKey=2072dee7-979c-4d0e-806c-3211c9e976ce&limit=30')
  if (page.results.some((r) => !/publicdomain\/zero/.test(r.license))) throw new Error('UNCEN rows are not all CC0')
  const columns = [{ key: 'catalogNumber', label: 'Nomor' }, { key: 'scientificName', label: 'Nama ilmiah' }, { key: 'family', label: 'Suku' }, { key: 'year', label: 'Tahun' }, { key: 'stateProvince', label: 'Provinsi' }, { key: 'locality', label: 'Tempat' }]
  const rows = page.results.map((r) => Object.fromEntries(columns.map((c) => [c.key, r[c.key] ?? null])))
  writeFileSync(join(OUT, 'uncen-kupu-kupu-pratinjau.json'), JSON.stringify({ checked: CHECKED_WORDS, source: 'GBIF.org', columns, rows, total: page.count }))
  objects.push({
    id: 'data-' + DATASET, kind: 'dataset', title: 'Koleksi kupu-kupu Papua di Universitas Cenderawasih', subtitle: 'Universitas Cenderawasih',
    summary: `${page.count.toLocaleString('id-ID')} catatan spesimen kupu-kupu dari koleksi Jurusan Biologi FMIPA Universitas Cenderawasih di Jayapura, dikumpulkan antara 1905 dan 2009. Sebagian besar catatan berasal dari Provinsi Papua dan Papua Barat.`,
    dataset: { id: DATASET, preview: WEB + 'uncen-kupu-kupu-pratinjau.json' }, datasets: [DATASET],
    sources: [{ title: 'UNCEN, Cenderawasih University Papuan Butterflies', url: 'https://doi.org/10.15468/4tp4nw', publisher: 'Universitas Cenderawasih, lewat GBIF', attribution: 'Ramandey E. R., Warikar E. L., Overduin-de Vries A. M. 2024', licence: LICENCE.CC0 }],
    checked: CHECKED,
  })
}

const order = ['model', 'species', 'landform', 'images', 'audio', 'dataset']
objects.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
writeFileSync(join(OUT, 'objects.json'), JSON.stringify({ version: 1, checked: CHECKED, about: 'Catatan contoh untuk penampil ETNOS, dibuat oleh scripts/observatory/build-viewer-seed.mjs dari sumber terbuka. Setiap catatan menyebut sumber dan lisensinya.', objects }, null, 1) + '\n')
let total = 0
for (const f of run('ls', [OUT]).trim().split('\n')) total += statSync(join(OUT, f)).size
console.log(`${objects.length} records, ${(total / 1e6).toFixed(2)} MB in ${OUT}`)
await import('./build-viewer-index.mjs')
