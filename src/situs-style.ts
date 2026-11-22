/**
 * The one stylesheet of every Situs (served at /situs/_/situs.css). Colours and fonts come from the fixed lists in
 * src/situs-theme.ts as classes on <html>, so a page needs no inline style and a lembaga never writes CSS. Light
 * and dark follow the reader's system setting. Grafit (DESIGN.md) gives the neutrals, the radii and the row
 * rhythm; the lembaga's palette leads on colour.
 */
import { FONTS, PALETTE } from './situs-theme.ts'

const faces: Record<string, { family: string; weight: string }> = {
  geist: { family: 'Geist', weight: '100 900' },
  newsreader: { family: 'Newsreader', weight: '200 800' },
  'source-serif-4': { family: 'Source Serif 4', weight: '200 900' },
  'source-sans-3': { family: 'Source Sans 3', weight: '200 900' },
  'plus-jakarta-sans': { family: 'Plus Jakarta Sans', weight: '200 800' },
}
const serif = new Set(['Newsreader', 'Source Serif 4'])

const fontFaces = Object.entries(faces)
  .map(([file, f]) => `@font-face{font-family:"${f.family}";src:url(/fonts/situs/${file}.woff2) format("woff2");font-weight:${f.weight};font-style:normal;font-display:swap}`)
  .join('\n')
const fontClasses = FONTS.map(
  (f) => `.f-${f.id}{--font-h:"${f.heading}",${serif.has(f.heading) ? 'Georgia,serif' : 'system-ui,sans-serif'};--font-b:"${f.body}",system-ui,sans-serif;--h-weight:${serif.has(f.heading) ? 560 : 780};--h-track:${serif.has(f.heading) ? '-0.015em' : '-0.025em'}}`,
).join('\n')
const palette = PALETTE.map((p) => `.p-${p.id}{--p-fill:${p.light.fill};--p-on:${p.light.on};--p-ink:${p.light.ink}}.a-${p.id}{--a:${p.light.ink}}`).join('\n')
const paletteDark = PALETTE.map((p) => `.p-${p.id}{--p-fill:${p.dark.fill};--p-on:${p.dark.on};--p-ink:${p.dark.ink}}.a-${p.id}{--a:${p.dark.ink}}`).join('\n')

export const SITUS_CSS = `${fontFaces}
${fontClasses}
${palette}
:root{--ground:#fafafa;--surface:#ffffff;--ink:#171717;--muted:#5c5c5c;--line:#e4e4e4;--band:var(--p-fill);--band-on:var(--p-on);--gutter:16px;color-scheme:light dark}
.t-editorial{--ground:color-mix(in oklab,var(--p-ink) 3%,#fcfcfb)}
@media (prefers-color-scheme:dark){
${paletteDark}
:root{--ground:#0d0d0d;--surface:#171717;--ink:#f2f2f2;--muted:#a8a8a8;--line:#2b2b2b;--band:color-mix(in oklab,var(--p-ink) 16%,#101010);--band-on:#f5f5f5}
.t-editorial{--ground:color-mix(in oklab,var(--p-ink) 4%,#0d0d0d)}
}
@media (min-width:720px){:root{--gutter:32px}}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:72px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--font-b);font-size:16.5px;line-height:1.6;font-feature-settings:"kern";text-rendering:optimizeLegibility}
::selection{background:color-mix(in oklab,var(--p-ink) 24%,transparent)}
a{color:inherit;text-decoration-line:underline;text-decoration-thickness:1px;text-underline-offset:3px;text-decoration-color:color-mix(in oklab,var(--a) 60%,transparent)}
a:hover{text-decoration-color:var(--a)}
:focus-visible{outline:2px solid var(--a);outline-offset:3px;border-radius:6px}
img{display:block;max-width:100%;height:auto}
h1,h2,h3{font-family:var(--font-h);font-weight:var(--h-weight);letter-spacing:var(--h-track);line-height:1.12;text-wrap:balance;margin:0}
p{margin:0}
.wrap{width:100%;max-width:1104px;margin:0 auto;padding:0 var(--gutter)}
.i{width:17px;height:17px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.meta{color:var(--muted);font-size:14px;line-height:1.45}
.skip{position:absolute;left:-9999px}
.skip:focus{left:16px;top:8px;z-index:20;background:var(--surface);padding:8px 14px;border-radius:10px}

.etnos-bar{font-size:13px;color:var(--muted);border-bottom:1px solid var(--line);background:var(--surface)}
.etnos-bar .wrap{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:36px}
.etnos-bar a{text-decoration:none;display:inline-flex;align-items:center;gap:4px}
.etnos-bar a:hover{color:var(--ink)}
.etnos-bar .i{width:13px;height:13px}
.etnos-bar-page{display:none!important}
@media (min-width:560px){.etnos-bar-page{display:inline-flex!important}}
.draft-note{background:color-mix(in oklab,var(--a) 16%,var(--surface));font-size:14px;padding:10px 0}

.site-head{position:sticky;top:0;z-index:10;background:color-mix(in oklab,var(--ground) 86%,transparent);-webkit-backdrop-filter:saturate(1.4) blur(14px);backdrop-filter:saturate(1.4) blur(14px);border-bottom:1px solid color-mix(in oklab,var(--line) 70%,transparent)}
.head-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 20px;min-height:60px}
.brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;font-size:15.5px;letter-spacing:-0.01em;min-width:0;padding:8px 0}
.brand span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.brand-logo{width:32px;height:32px;border-radius:9px;object-fit:cover}
.mono{display:inline-grid;place-items:center;flex:none;background:color-mix(in oklab,var(--p-ink) 13%,var(--surface));color:var(--p-ink);font-weight:800;font-size:13px;letter-spacing:0;font-family:var(--font-b)}
.brand-logo.mono{font-size:12px}
.site-head nav{margin:0 calc(var(--gutter) * -1);padding:0 var(--gutter);overflow-x:auto;scrollbar-width:none;max-width:calc(100% + var(--gutter) * 2)}
.site-head nav::-webkit-scrollbar{display:none}
.site-head ul{display:flex;gap:2px;margin:0;padding:0 0 8px;list-style:none;white-space:nowrap}
.site-head nav a{display:inline-flex;align-items:center;min-height:40px;padding:0 12px;border-radius:999px;text-decoration:none;font-size:14.5px;font-weight:550;color:var(--muted)}
.site-head nav a:hover{color:var(--ink);background:color-mix(in oklab,var(--ink) 5%,transparent)}
@media (min-width:720px){.site-head nav{margin:0;padding:0;max-width:none}.site-head ul{padding:0}.head-row{flex-wrap:nowrap}}

.pill{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);text-decoration:none;font-size:14.5px;font-weight:600;font-family:var(--font-b);letter-spacing:0}
.pill:hover{border-color:color-mix(in oklab,var(--ink) 35%,transparent)}
.pill.solid{background:var(--p-fill);border-color:var(--p-fill);color:var(--p-on)}
.quick{display:flex;flex-wrap:wrap;gap:8px}

.hero h1{font-size:clamp(2.1rem,7vw,4.4rem)}
.hero-text{font-size:clamp(1.08rem,2.2vw,1.3rem);line-height:1.5;max-width:44ch}
.hero-kind{color:var(--muted);font-size:14.5px}
.t-editorial .hero{padding-bottom:12px}
.t-editorial .hero-media{margin:0;background:color-mix(in oklab,var(--p-ink) 10%,var(--surface))}
.t-editorial .hero-media img{width:100%;height:min(68vh,620px);object-fit:cover}
.t-editorial .hero-copy{display:grid;gap:18px;padding-top:44px;padding-bottom:24px}
.t-editorial .hero:not(.has-cover) .hero-copy{padding-top:72px}
.t-editorial .hero h1{max-width:18ch}
@media (min-width:900px){.t-editorial .hero-copy{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);column-gap:48px;align-items:end}.t-editorial .hero h1{grid-row:span 3}.t-editorial .hero-copy>:not(h1){grid-column:2}}

.t-lembaga .hero{background:var(--band);color:var(--band-on);padding:40px 0 44px}
.t-lembaga .hero:has(.hero-strip){padding-bottom:0}
.hero-grid{display:grid;gap:18px}
.hero-id{display:flex;align-items:center;gap:16px}
.hero-logo{width:72px;height:72px;border-radius:18px;object-fit:cover;background:#fff;box-shadow:0 1px 0 rgba(0,0,0,.08),0 8px 24px -12px rgba(0,0,0,.4)}
.hero-logo.mono{font-size:24px;background:var(--band-on);color:var(--band)}
.t-lembaga .hero h1{font-size:clamp(1.8rem,5vw,3rem)}
.t-lembaga .hero-kind{color:color-mix(in oklab,var(--band-on) 82%,transparent);margin-top:4px}
.t-lembaga .hero-text{color:color-mix(in oklab,var(--band-on) 94%,transparent);max-width:60ch}
.t-lembaga .hero .pill{background:transparent;color:var(--band-on);border-color:color-mix(in oklab,var(--band-on) 45%,transparent)}
.t-lembaga .hero .pill:hover{border-color:var(--band-on)}
.t-lembaga .hero .pill.solid{background:var(--band-on);color:var(--band);border-color:var(--band-on)}
.hero-strip{margin:32px auto 0;transform:translateY(40px);margin-bottom:0}
.hero-strip img{width:100%;aspect-ratio:21/9;object-fit:cover;border-radius:18px;box-shadow:0 18px 40px -24px rgba(0,0,0,.45)}
.t-lembaga .hero:has(.hero-strip)+.block{padding-top:96px}

.plain-title{padding-top:48px}
.plain-title h1{font-size:clamp(2rem,6vw,3.4rem)}
.block{padding:52px 0}
.t-lembaga .block+.block{border-top:1px solid var(--line)}
.t-editorial .block{padding:60px 0}
@media (min-width:720px){.block{padding:72px 0}.t-editorial .block{padding:84px 0}}
.block-title{font-size:clamp(1.55rem,3.6vw,2.3rem);margin-bottom:24px}
.t-lembaga .block-title{font-size:clamp(1.4rem,3vw,1.85rem)}

.tentang{display:grid;gap:32px}
.prose{display:grid;gap:16px;max-width:66ch;font-size:1.08rem}
.t-editorial .prose{font-size:1.14rem;line-height:1.65}
@media (min-width:900px){.tentang{grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr);gap:56px;align-items:start}}
.facts{margin:0;display:grid}
.facts>div{display:grid;gap:2px;padding:12px 0;border-top:1px solid var(--line)}
.facts>div:last-child{border-bottom:1px solid var(--line)}
.facts dt{color:var(--muted);font-size:13.5px}
.facts dd{margin:0;font-size:15.5px;overflow-wrap:anywhere}
.t-lembaga .tentang .facts{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:6px 20px}
.t-lembaga .tentang .facts>div:first-child{border-top:0}
.t-lembaga .tentang .facts>div:last-child{border-bottom:0}
@media (min-width:640px){.facts.contact>div{grid-template-columns:180px minmax(0,1fr);gap:20px;align-items:baseline}}

.posts{list-style:none;margin:0 calc(var(--gutter) * -1);padding:0;display:grid}
.post{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:16px;align-items:start;padding:16px var(--gutter);text-decoration:none;border-radius:0}
.posts li+li .post{border-top:1px solid var(--line)}
.post:hover{background:color-mix(in oklab,var(--ink) 4%,transparent)}
.post time{display:grid;line-height:1.1;font-variant-numeric:tabular-nums}
.post time .d{font-size:1.7rem;font-weight:750;color:var(--a);font-family:var(--font-b);letter-spacing:-0.02em}
.post time .m{font-size:12.5px;color:var(--muted);margin-top:4px}
.post-body{display:grid;gap:4px;min-width:0}
.post-body strong{font-size:1.06rem;line-height:1.35;font-weight:700}
.excerpt{color:color-mix(in oklab,var(--ink) 80%,transparent);font-size:15px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.thumb{width:84px;height:84px;object-fit:cover;border-radius:14px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
@media (min-width:720px){.posts{margin:0}.post{border-radius:14px;padding:18px 16px}.thumb{width:112px;height:84px}}
.more{margin-top:20px;font-size:15px}
.more a{display:inline-flex;align-items:center;gap:6px;font-weight:600}

.gallery{list-style:none;margin:0;padding:0}
.t-editorial .gallery{columns:2 160px;column-gap:12px}
.t-editorial .gallery li{break-inside:avoid;margin-bottom:12px}
.t-lembaga .gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.g-img{width:100%;border-radius:12px;background:color-mix(in oklab,var(--p-ink) 8%,var(--surface))}
.t-lembaga .g-img{aspect-ratio:1;object-fit:cover}
@media (min-width:900px){.t-editorial .gallery{columns:3;column-gap:16px}.t-editorial .gallery li{margin-bottom:16px}}
.caption{display:block;font-size:13px;color:var(--muted);margin-top:6px;line-height:1.4}

.rows{list-style:none;margin:0;padding:0;display:grid}
.rows a{display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid var(--line);text-decoration:none}
.rows li:last-child a{border-bottom:1px solid var(--line)}
.rows a>span:not(.mono):not(.price){display:grid;gap:2px;flex:1;min-width:0}
.rows strong{font-size:1.02rem;font-weight:700;line-height:1.35}
.rows a>.i:last-child{color:var(--muted)}
.rows a:hover strong{text-decoration:underline;text-decoration-color:var(--a);text-underline-offset:3px}
.rows .i:first-child{color:var(--p-ink)}
.mono.small{width:40px;height:40px;border-radius:12px}
.price{font-variant-numeric:tabular-nums;font-weight:650;text-align:right;white-space:nowrap}
.price span{font-weight:400;color:var(--muted);font-size:13.5px}
.note{display:flex;gap:8px;align-items:flex-start;margin-top:16px;color:var(--muted);font-size:14px;max-width:66ch}
.note .i{margin-top:2px}

.site-foot{border-top:1px solid var(--line);padding:40px 0 56px;background:var(--surface)}
.foot-grid{display:grid;gap:16px}
.foot-name{font-weight:700;font-size:15.5px}
@media (min-width:720px){.foot-grid{grid-template-columns:1fr 1.4fr;align-items:end}.foot-grid>p{text-align:right}}
@media print{.site-head,.etnos-bar{position:static}.site-head nav{display:none}}
`

/** A short content hash, so each deploy's stylesheet is a new address. */
export const SITUS_STYLE_VERSION = (() => {
  let h = 5381
  for (let i = 0; i < SITUS_CSS.length; i++) h = ((h << 5) + h + SITUS_CSS.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
})()
