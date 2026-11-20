// Renders the link preview images in public/share/ (1200 x 630 JPEG) with Playwright. Run from apps/web:
//   node scripts/share-cards.mjs
// The prints come from public/branding; the maps use the same EOX terrain tiles and atlas shapes as the site's
// small maps, so the card credits them. Output is committed; nothing renders at request time.
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Playwright is resolved from NODE_PATH or the project, whichever has it.
const { chromium } = createRequire(import.meta.url)('playwright')
const here = (p) => fileURLToPath(new URL('../' + p, import.meta.url))
const atlas = JSON.parse(readFileSync(here('src/papua-atlas.json'), 'utf8'))
const wordmark = readFileSync(here('src/BrandWordmark.svelte'), 'utf8').match(/<svg[\s\S]*<\/svg>/)[0].replace(/class="[^"]*"|class:reveal=\{animate\}/g, '')
const font = (p) => 'data:font/woff2;base64,' + readFileSync(here(p)).toString('base64')
const img = (p) => 'data:image/webp;base64,' + readFileSync(here(p)).toString('base64')
const prints = { tigi: [img('public/branding/tigi-print.webp'), 'Danau Tigi, Papua Tengah'], raja: [img('public/branding/raja-ampat-print.webp'), 'Raja Ampat, Papua Barat Daya'] }

// Site map coordinates are zoom-7 Web Mercator pixels from this origin (see src/terrain.ts).
const OX = 109 * 256 + 185.5, OY = 63 * 256 + 165
const TILE = 'https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg'
function tiles([x0, y0, w, h], px) {
  const z = Math.max(3, Math.min(9, Math.round(7 + Math.log2((px * 1.5) / w)))), size = 256 * 2 ** (7 - z), out = []
  for (let ty = Math.floor((y0 + OY) / size); ty <= Math.floor((y0 + h + OY) / size); ty++)
    for (let tx = Math.floor((x0 + OX) / size); tx <= Math.floor((x0 + w + OX) / size); tx++)
      out.push(`<image href="${TILE.replace('{z}', z).replace('{x}', tx).replace('{y}', ty)}" x="${tx * size - OX}" y="${ty * size - OY}" width="${size * 1.02}" height="${size * 1.02}" preserveAspectRatio="none"/>`)
  return out.join('')
}
function bbox(d) {
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number), xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}
function mapPanel(lit) {
  // The panel is 560 x 630 CSS px. Frame the lit region with room around it, or all of Tanah Papua.
  const aspect = 560 / 630
  let [x0, y0, x1, y1] = lit ? bbox(atlas.regions[lit].d) : [atlas.box[0], atlas.box[1], atlas.box[0] + atlas.box[2], atlas.box[1] + atlas.box[3]]
  let w = (x1 - x0) * (lit ? 1.9 : 1.08), h = (y1 - y0) * (lit ? 1.9 : 1.08)
  w = Math.max(w, h * aspect, lit ? 360 : 0); h = w / aspect
  const box = [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h], k = w / 560
  const shapes = Object.entries(atlas.regions).map(([id, r]) => `<path d="${r.d}" fill="${id === lit ? 'rgba(31,78,140,.30)' : lit ? 'rgba(255,255,255,.06)' : 'rgba(31,78,140,.12)'}" stroke="${id === lit ? '#14335c' : 'rgba(20,51,92,.45)'}" stroke-width="${(id === lit ? 2.4 : 1) * k}" stroke-linejoin="round"/>`).join('')
  return `<svg class="map" viewBox="${box.join(' ')}" preserveAspectRatio="xMidYMid slice">${tiles(box, 560)}${shapes}</svg>`
}

const css = `
@font-face{font-family:Serif;src:url(${font('public/fonts/GeistSerif-Regular.woff2')}) format('woff2')}
@font-face{font-family:Sans;src:url(${font('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#f3f1ea;color:#151515;font-family:Sans;-webkit-font-smoothing:antialiased}
.copy{position:absolute;left:72px;top:64px;bottom:58px;width:560px;display:flex;flex-direction:column}
.mark{height:44px;color:#151515}.mark svg{height:44px;width:auto;display:block}
.mid{margin-top:auto;margin-bottom:auto}
h1{font-family:Serif;font-weight:400;font-size:68px;line-height:1.04;letter-spacing:-.025em;text-wrap:balance}
p{margin-top:22px;font-size:25px;line-height:1.38;color:#55534d;max-width:30ch;text-wrap:pretty}
.foot{display:flex;align-items:baseline;gap:14px;font-size:19px}.foot b{font-weight:640;letter-spacing:-.01em}.foot span{color:#8a877d;font-size:15px}
.art{position:absolute;right:0;top:0;width:560px;height:630px;overflow:hidden;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 16%);mask-image:linear-gradient(to right,transparent 0,#000 16%)}
.art img{width:100%;height:100%;object-fit:cover}
.map{width:100%;height:100%;display:block;filter:saturate(.9)}
.credit{position:absolute;right:16px;bottom:12px;font-size:12px;color:#55534d;background:rgba(243,241,234,.8);padding:2px 7px;border-radius:5px}
`
function page(c) {
  const art = c.print ? `<img src="${prints[c.print][0]}" style="object-position:${c.pos ?? '50% 55%'}">` : mapPanel(c.region)
  const caption = c.print ? 'Ilustrasi · ' + prints[c.print][1] : ''
  return `<!doctype html><meta charset="utf-8"><style>${css}</style><div class="art">${art}</div>${c.print ? '' : '<div class="credit">Terrain © EOX · OpenStreetMap contributors</div>'}
  <div class="copy"><div class="mark">${wordmark}</div><div class="mid"><h1>${c.title}</h1>${c.text ? `<p>${c.text}</p>` : ''}</div>
  <div class="foot"><b>etnos.space</b>${caption ? `<span>${caption}</span>` : ''}</div></div>`
}

const regionText = 'Baca kabar dan halaman tentang wilayah ini.'
const cards = [
  { file: 'default', print: 'tigi', title: 'Ngobrol soal Papua, bareng orang Papua', text: 'Baca kabar terbaru dan ikut ngobrol di komunitasmu. Kamu juga bisa menulis tentang kampung dan bahasamu.' },
  { file: 'explore', print: 'raja', title: 'Jelajah', text: 'Lihat apa yang sedang dibicarakan warga Papua hari ini.', pos: '50% 60%' },
  { file: 'news', print: 'raja', title: 'Kabar', text: 'Kabar terbaru dari Papua beserta sumber aslinya.', pos: '50% 40%' },
  { file: 'communities', print: 'tigi', title: 'Komunitas', text: 'Cari komunitas yang cocok, lalu ikut ngobrol.', pos: '50% 75%' },
  { file: 'jadwal', print: 'tigi', title: 'Jadwal Aksara', text: 'Lihat jam berapa Aksara menulis setiap hari.', pos: '50% 30%' },
  { file: 'wiki', title: 'Pengetahuan bersama', text: 'Halaman tentang Papua yang ditulis dan diperiksa bersama warga.' },
  ...Object.keys(atlas.regions).map((id) => ({ file: 'region-' + id, region: id, title: { meepago: 'Mee Pago', 'la-pago': 'La Pago', 'ha-anim': 'Ha Anim', 'mamta-tabi': 'Mamta (Tabi)', saireri: 'Saireri', domberai: 'Domberai', bomberai: 'Bomberai' }[id] ?? id, text: regionText })),
]

mkdirSync(here('public/share'), { recursive: true })
const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
for (const c of cards) {
  await p.setContent(page(c), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  writeFileSync(here(`public/share/${c.file}.jpg`), await p.screenshot({ type: 'jpeg', quality: 86 }))
  console.log(c.file)
}
await browser.close()
