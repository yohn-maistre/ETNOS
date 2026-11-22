/**
 * The `*.etnos.space` dispatcher (docs/plan/one-page-system-2026-11-21.md §8), written and tested but OFF until
 * the owner confirms DNS: the web Worker calls it only when ETNOS_SITUS_SUBDOMAINS is "on", and no route sends
 * these hosts to the web Worker yet. The steps to switch it on are in docs/plan/situs-subdomains.md.
 *
 * For a request to <name>.etnos.space:
 * - /.well-known/atproto-did is answered by the identity host, because the same name is also an AT handle;
 * - www goes to the main address;
 * - a reserved name (the identity host's list, one list for both) or an invalid one is 404;
 * - / serves the lembaga's published Situs, or redirects to the lembaga page when it has none;
 * - the stylesheet, the Situs fonts and the two image paths a Situs uses are served so the page works there;
 * - everything else is 404.
 * It returns null for any host that is not a name under the zone, so the caller handles it as before.
 */
import { RESERVED_LABELS, labelForHost } from '../packages/pds/src/host/handles.ts'
import { SITUS_STYLE_PATH } from './situs-render.ts'

export type DispatchDeps = {
  enabled: boolean
  /** The domain whose first-level names are handles and Situs addresses, for example etnos.space. */
  zone: string
  /** The main ETNOS origin, for www and for the lembaga page fallback. */
  origin: string
  /** The identity host (a service binding), for /.well-known/atproto-did. Without it that path is 404. */
  identity?: (request: Request) => Promise<Response>
  /** The published Situs page for a name, or null when there is none. */
  page: (name: string) => Promise<Response | null>
  /** The lembaga id behind a name, when a lembaga holds it but has not published. */
  lembaga: (name: string) => Promise<string | null>
  css: () => Response
  /** A static file of the web app (the Situs fonts). */
  asset: (path: string) => Promise<Response>
  /** An anonymous read of a public image path (/v1/media/<id> or /v1/groups/<id>/logo). */
  image: (path: string) => Promise<Response>
}

const text = (status: number, body: string, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } })

/** The name a host stands for under the zone: a label, '' for the zone itself or another host, null for an invalid name. */
export function subdomainOf(host: string, zone: string): string | '' | null {
  const h = host.toLowerCase().replace(/:\d+$/, ''),
    z = zone.toLowerCase()
  if (h === z || !h.endsWith('.' + z)) return ''
  return labelForHost(h, z)
}

export async function dispatchSubdomain(request: Request, deps: DispatchDeps): Promise<Response | null> {
  if (!deps.enabled) return null
  const url = new URL(request.url),
    label = subdomainOf(url.hostname, deps.zone)
  if (label === '') return null
  if (label === null) return text(404, 'Not found')
  if (url.pathname === '/.well-known/atproto-did') return deps.identity ? deps.identity(request) : text(404, 'Not found')
  if (label === 'www') return new Response(null, { status: 301, headers: { location: deps.origin + url.pathname + url.search, 'cache-control': 'public, max-age=3600' } })
  if (RESERVED_LABELS.has(label)) return text(404, 'Not found')
  if (request.method !== 'GET' && request.method !== 'HEAD') return text(405, 'Method not allowed', { allow: 'GET, HEAD' })
  const path = url.pathname
  if (path === SITUS_STYLE_PATH) return deps.css()
  if (/^\/fonts\/situs\/[a-z0-9-]+\.woff2$/.test(path)) return deps.asset(path)
  if (/^\/v1\/media\/[0-9a-f-]{36}$/.test(path) || /^\/v1\/groups\/[0-9A-Za-z-]{1,64}\/logo$/.test(path)) return deps.image(path)
  if (path !== '/') return text(404, 'Not found')
  const page = await deps.page(label)
  if (page) return page
  const lembaga = await deps.lembaga(label)
  if (lembaga) return new Response(null, { status: 302, headers: { location: deps.origin + '/groups/' + encodeURIComponent(lembaga), 'cache-control': 'no-store' } })
  return text(404, 'Not found')
}
