// Kios (docs/plan/one-page-system-2026-11-21.md §7): shared helpers for the profile, lembaga and place blocks.
import type { Post } from './api'

export type KiosOwner = { kind: 'actor' | 'group'; id: string }
export type KiosView = {
  owner: KiosOwner & { title: string }
  open: boolean
  whatsapp: string
  rulesAccepted: boolean
  canManage: boolean
  rules: { key: string; label: string }[]
  items: Post[]
}

/** The line a Kios shows for an offer: its title, else the start of its text. */
export function offerTitle(post: Pick<Post, 'text' | 'content'>) {
  const t = (post.content?.title ?? '').trim() || post.text.replace(/[#*_>`[\]]/g, '').replace(/\s+/g, ' ').trim()
  return t.length > 80 ? t.slice(0, 78).trimEnd() + '…' : t
}

/** Price as people read it: Rp15.000, Gratis, or Harga dibicarakan. */
export function offerPrice(o: { price: number | null; kind: string }) {
  if (o.price === null) return o.kind === 'request' ? 'Anggaran terbuka' : 'Harga dibicarakan'
  if (o.price === 0) return 'Gratis'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(o.price)
}

/** A wa.me link with a short greeting about the Kios. */
export function whatsappLink(number: string, kiosTitle: string) {
  return 'https://wa.me/' + encodeURIComponent(number) + '?text=' + encodeURIComponent('Halo, saya lihat Kios ' + kiosTitle + ' di ETNOS.')
}
