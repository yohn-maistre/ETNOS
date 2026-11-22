/**
 * Renders a Situs page (src/situs.ts) to HTML on the server: no JavaScript, no inline styles, one stylesheet
 * (src/situs-style.ts). Every word a lembaga wrote is escaped, and every link is built here from data the lembaga
 * or ETNOS already checked (an https address, an email, a phone number, an ETNOS path), so a block can never carry
 * HTML, CSS or script of its own. Two templates share the blocks and differ in layout and voice of the type.
 */
import type { Contact } from './lembaga.ts'
import type { Picture, SitusBlock, SitusPage, Snapshot } from './situs.ts'
import { BLOCK_LABELS } from './situs-theme.ts'

export type RenderOptions = {
  /** The ETNOS origin, for links back into ETNOS and for share-card image addresses. */
  origin: string
  /** Where this page is served, for the canonical link. */
  canonical: string
  /** The deployment name for "Bagian dari …". */
  siteName: string
  /** Version of the stylesheet, so a new deploy is fetched. */
  styleVersion: string
}
export const SITUS_STYLE_PATH = '/situs/_/situs.css'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const date = (t: number) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jayapura' }).format(new Date(t))
const shortDate = (t: number) => {
  const parts = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jayapura' }).formatToParts(new Date(t))
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? ''
  return { day: get('day'), month: get('month').replace('.', ''), year: get('year') }
}
const rupiah = (n: number) => 'Rp' + new Intl.NumberFormat('id-ID').format(n)
const initials = (t: string) =>
  t.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ0-9]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'L'

/** Where a contact value leads, or '' when it is plain text. The same rules as the lembaga page. */
export function contactHref(v: string) {
  if (/^https:\/\/[^\s"'<>]+$/.test(v)) return v
  if (/^[^@\s"'<>]+@[^@\s"'<>]+\.[a-z]{2,}$/i.test(v)) return 'mailto:' + v
  if (/^\+?[0-9][0-9\s-]{6,}$/.test(v)) return 'tel:' + v.replace(/[\s-]/g, '')
  return ''
}
const domain = (u: string) => u.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')

const icons = {
  arrow: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  phone: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  chat: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg>',
  pin: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
  globe: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>',
  people: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  book: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  bag: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>',
}

type Ctx = { page: SitusPage; snap: Snapshot; o: RenderOptions; lembagaHref: string; editorial: boolean }
const etnos = (c: Ctx, path: string) => c.o.origin + path
const img = (p: Picture, cls: string, eager = false) =>
  `<img class="${cls}" src="/v1/media/${esc(p.id)}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
const logo = (c: Ctx, cls: string) =>
  c.snap.lembaga.logo
    ? `<img class="${cls}" src="/v1/groups/${esc(c.snap.lembaga.id)}/logo" alt="" width="64" height="64">`
    : `<span class="${cls} mono" aria-hidden="true">${esc(initials(c.snap.lembaga.title))}</span>`
const paragraphs = (t: string) =>
  t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
const heading = (c: Ctx, b: SitusBlock) => `<h2 class="block-title">${esc(b.title?.trim() || BLOCK_LABELS[b.type])}</h2>`

/** Quick ways to reach the lembaga: the first phone, email and WhatsApp it gives. */
function quick(c: Ctx) {
  const l = c.snap.lembaga,
    out: string[] = []
  const phone = l.contacts.find((x) => contactHref(x.value).startsWith('tel:')),
    mail = l.contacts.find((x) => contactHref(x.value).startsWith('mailto:'))
  const wa = l.whatsapp || c.snap.kios?.whatsapp || ''
  if (wa) out.push(`<a class="pill solid" href="https://wa.me/${esc(wa)}" rel="noreferrer">${icons.chat}WhatsApp</a>`)
  if (phone) out.push(`<a class="pill" href="${esc(contactHref(phone.value))}">${icons.phone}Telepon</a>`)
  if (mail) out.push(`<a class="pill" href="${esc(contactHref(mail.value))}">${icons.mail}Surel</a>`)
  if (l.website) out.push(`<a class="pill" href="${esc(l.website)}" rel="noreferrer">${icons.globe}${esc(domain(l.website))}</a>`)
  return out.length ? `<div class="quick">${out.join('')}</div>` : ''
}

/** Each block returns '' when it has nothing to show, and then it and its navigation link are left out. */
const blocks: Record<SitusBlock['type'], (c: Ctx, b: SitusBlock) => string> = {
  hero(c, b) {
    const l = c.snap.lembaga,
      h = b as Extract<SitusBlock, { type: 'hero' }>
    const title = h.title?.trim() || l.title,
      text = (h.text ?? '').trim() || l.description
    const cover = (h.image ?? 'cover') === 'cover' ? l.cover : null
    const kind = [l.jenis ?? (l.kind === 'institution' ? 'Lembaga' : 'Kelompok'), ...l.places.slice(0, 2).map((p) => p.title)].join(' · ')
    if (c.editorial)
      return `<section class="hero${cover ? ' has-cover' : ''}">${cover ? `<figure class="hero-media">${img(cover, 'hero-img', true)}</figure>` : ''}<div class="hero-copy wrap">
        <h1>${esc(title)}</h1>${text ? `<p class="hero-text">${esc(text)}</p>` : ''}<p class="hero-kind">${esc(kind)}</p>${quick(c)}</div></section>`
    return `<section class="hero band"><div class="wrap hero-grid"><div class="hero-id">${(h.image ?? 'cover') === 'none' ? '' : logo(c, 'hero-logo')}<div><h1>${esc(title)}</h1><p class="hero-kind">${esc(kind)}</p></div></div>
      ${text ? `<p class="hero-text">${esc(text)}</p>` : ''}${quick(c)}</div>${cover ? `<figure class="hero-strip wrap">${img(cover, 'hero-img', true)}</figure>` : ''}</section>`
  },
  tentang(c, b) {
    const l = c.snap.lembaga
    if (!l.about.trim() && !l.places.length && !l.languages.length) return ''
    const facts = [
      l.jenis ? `<div><dt>Jenis</dt><dd>${esc(l.jenis)}</dd></div>` : '',
      l.places.length ? `<div><dt>Tempat</dt><dd>${l.places.map((p) => `<a href="${esc(etnos(c, '/wiki/' + encodeURIComponent(p.slug)))}">${esc(p.title)}</a>`).join(', ')}</dd></div>` : '',
      l.languages.length ? `<div><dt>Bahasa</dt><dd>${l.languages.map((p) => `<a href="${esc(etnos(c, '/wiki/' + encodeURIComponent(p.slug)))}">${esc(p.title)}</a>`).join(', ')}</dd></div>` : '',
    ].join('')
    return `${heading(c, b)}<div class="tentang">${l.about.trim() ? `<div class="prose">${paragraphs(l.about)}</div>` : ''}${facts ? `<dl class="facts">${facts}</dl>` : ''}</div>`
  },
  kegiatan(c, b) {
    if (!c.snap.posts.length) return ''
    const rows = c.snap.posts.map((p) => {
      const d = shortDate(p.created)
      return `<li><a class="post" href="${esc(etnos(c, '/square/' + encodeURIComponent(p.id)))}">
        <time datetime="${new Date(p.created).toISOString().slice(0, 10)}"><span class="d">${esc(d.day)}</span><span class="m">${esc(d.month)} ${esc(d.year)}</span></time>
        <span class="post-body"><strong>${esc(p.title)}</strong>${p.excerpt ? `<span class="excerpt">${esc(p.excerpt)}</span>` : ''}<span class="meta">${esc(p.community.title)}</span></span>
        ${p.image ? img(p.image, 'thumb') : ''}</a></li>`
    })
    return `${heading(c, b)}<ol class="posts">${rows.join('')}</ol><p class="more"><a href="${esc(c.lembagaHref)}">Kegiatan lain di ETNOS${icons.arrow}</a></p>`
  },
  galeri(c, b) {
    if (!c.snap.gallery.length) return ''
    return `${heading(c, b)}<ul class="gallery">${c.snap.gallery.map((p) => `<li>${img(p, 'g-img')}${p.alt ? `<span class="caption">${esc(p.alt)}</span>` : ''}</li>`).join('')}</ul>`
  },
  publikasi(c, b) {
    const items = [
      ...(c.snap.entry ? [{ href: '/wiki/' + encodeURIComponent(c.snap.entry.slug), title: c.snap.entry.title, note: 'Entri ensiklopedia yang dikelola lembaga ini' }] : []),
      ...c.snap.pages.map((p) => ({ href: '/wiki/' + encodeURIComponent(p.id), title: p.title, note: 'Halaman ensiklopedia dari komunitas lembaga ini' })),
    ]
    if (!items.length) return ''
    return `${heading(c, b)}<ul class="rows">${items.map((i) => `<li><a href="${esc(etnos(c, i.href))}">${icons.book}<span><strong>${esc(i.title)}</strong><span class="meta">${esc(i.note)}</span></span>${icons.arrow}</a></li>`).join('')}</ul>`
  },
  komunitas(c, b) {
    if (!c.snap.communities.length) return ''
    return `${heading(c, b)}<ul class="rows">${c.snap.communities.map((m) => `<li><a href="${esc(etnos(c, '/communities/' + encodeURIComponent(m.id)))}"><span class="mono small" aria-hidden="true">${esc(initials(m.title))}</span><span><strong>${esc(m.title)}</strong>${m.description ? `<span class="meta">${esc(m.description)}</span>` : ''}</span>${icons.arrow}</a></li>`).join('')}</ul><p class="note">${icons.people}Komunitas ini terbuka di ETNOS. Siapa saja bisa membaca, dan anggota bisa ikut menulis.</p>`
  },
  kios(c, b) {
    const k = c.snap.kios
    if (!k || !k.items.length) return ''
    return `${heading(c, b)}<ul class="rows kios">${k.items.map((i) => `<li><a href="${esc(etnos(c, '/square/' + encodeURIComponent(i.id)))}"><span><strong>${esc(i.title)}</strong><span class="meta">${i.place ? esc(i.place) : 'Tanpa tempat'}</span></span><span class="price">${i.price === null ? 'Tanya harga' : esc(rupiah(i.price)) + (i.unit ? ` <span>per ${esc(i.unit)}</span>` : '')}</span></a></li>`).join('')}</ul>
      <p class="note">${icons.bag}${k.whatsapp ? `Pesan lewat <a href="https://wa.me/${esc(k.whatsapp)}" rel="noreferrer">WhatsApp</a> atau Kirim pesan di ETNOS.` : 'Pesan lewat Kirim pesan di ETNOS.'} Pembayaran tidak lewat ETNOS.</p>`
  },
  kontak(c, b) {
    const l = c.snap.lembaga
    if (!l.contacts.length && !l.website && !l.whatsapp) return ''
    const row = (label: string, value: string, href: string) => `<div><dt>${esc(label)}</dt><dd>${href ? `<a href="${esc(href)}"${href.startsWith('https:') ? ' rel="noreferrer"' : ''}>${esc(value)}</a>` : esc(value)}</dd></div>`
    const list = [
      ...l.contacts.map((x: Contact) => row(x.label, x.value, contactHref(x.value))),
      l.whatsapp ? row('WhatsApp', '+' + l.whatsapp, 'https://wa.me/' + l.whatsapp) : '',
      l.website ? row('Situs web', domain(l.website), l.website) : '',
    ].join('')
    return `${heading(c, b)}<dl class="facts contact">${list}</dl>`
  },
}

export function renderSitus(page: SitusPage, o: RenderOptions) {
  const snap = page.snapshot,
    l = snap.lembaga,
    config = page.config
  const c: Ctx = { page, snap, o, lembagaHref: o.origin + '/groups/' + encodeURIComponent(l.id), editorial: config.template === 'editorial' }
  const rendered = config.blocks.map((b) => ({ b, html: blocks[b.type](c, b) })).filter((x) => x.html)
  const shown = new Set(rendered.map((x) => x.b.id))
  const nav = (config.navigation ?? []).filter((n) => shown.has(n.block) && rendered.find((x) => x.b.id === n.block)?.b.type !== 'hero')
  const body = rendered
    .map(({ b, html }) => (b.type === 'hero' ? html : `<section class="block b-${b.type}" id="${esc(b.id)}"><div class="wrap">${html}</div></section>`))
    .join('\n')
  const description = (l.description || l.about).replace(/\s+/g, ' ').trim().slice(0, 200)
  const shareImage = l.cover ? o.origin + '/v1/media/' + l.cover.id : l.logo ? o.origin + '/v1/groups/' + l.id + '/logo' : ''
  const classes = ['t-' + config.template, 'p-' + config.theme.primary, 'a-' + config.theme.accent, 'f-' + config.theme.fonts].join(' ')
  const hasHero = rendered.some((x) => x.b.type === 'hero')
  return `<!doctype html>
<html lang="id" class="${esc(classes)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(l.title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
<link rel="canonical" href="${esc(o.canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(l.title)}">
${description ? `<meta property="og:description" content="${esc(description)}">` : ''}
<meta property="og:url" content="${esc(o.canonical)}">
<meta property="og:site_name" content="${esc(l.title)}">
${shareImage ? `<meta property="og:image" content="${esc(shareImage)}">` : ''}
<meta name="twitter:card" content="${l.cover ? 'summary_large_image' : 'summary'}">
${page.draft ? '<meta name="robots" content="noindex, nofollow">' : ''}
<link rel="stylesheet" href="${SITUS_STYLE_PATH}?v=${esc(o.styleVersion)}">
</head>
<body>
<a class="skip" href="#isi">Langsung ke isi</a>
<div class="etnos-bar"><div class="wrap"><a href="${esc(c.lembagaHref)}">Bagian dari ${esc(o.siteName)}</a><a href="${esc(c.lembagaHref)}" class="etnos-bar-page">Halaman lembaga di ${esc(o.siteName)}${icons.arrow}</a></div></div>
${page.draft ? '<p class="draft-note" role="status"><span class="wrap">Pratinjau draf. Halaman ini belum diterbitkan dan hanya terlihat oleh pengelola lembaga.</span></p>' : ''}
<header class="site-head"><div class="wrap head-row"><a class="brand" href="#isi">${logo(c, 'brand-logo')}<span>${esc(l.title)}</span></a>${nav.length ? `<nav aria-label="Bagian situs"><ul>${nav.map((n) => `<li><a href="#${esc(n.block)}">${esc(n.label)}</a></li>`).join('')}</ul></nav>` : ''}</div></header>
<main id="isi">
${hasHero ? '' : `<div class="wrap plain-title"><h1>${esc(l.title)}</h1></div>`}
${body}
</main>
<footer class="site-foot"><div class="wrap foot-grid">
<div><p class="foot-name">${esc(l.title)}</p>${page.published ? `<p class="meta">Diperbarui ${esc(date(page.published))}</p>` : ''}</div>
<p class="meta">Isi situs ini diambil dari data publik ${esc(l.title)} di ${esc(o.siteName)}. <a href="${esc(c.lembagaHref)}">Bagian dari ${esc(o.siteName)}</a></p>
</div></footer>
</body>
</html>
`
}
