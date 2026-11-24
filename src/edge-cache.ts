/** Anonymous public edge cache policy for Cloudflare Workers Free headroom.
 *
 * Hard privacy invariant:
 * - Only GET requests carrying NEITHER Cookie NOR Authorization headers may touch the cache.
 * - Only explicitly allowlisted public read-only JSON endpoints are eligible.
 * - Responses that are non-200 or carry Set-Cookie are never stored.
 * - Authenticated callers ALWAYS bypass both cache lookup and cache write. */

export type CacheRule = {
  ttl: number
}

const PUBLIC_GET_PATTERNS: Array<{ match: (path: string) => boolean; ttl: number }> = [
  { match: (p) => p === '/v1/entri' || /^\/v1\/entri\/[-a-z0-9]{1,120}$/.test(p), ttl: 90 },
  { match: (p) => p === '/v1/contexts' || p === '/v1/contexts/catalogue' || /^\/v1\/contexts\/[-a-z0-9]{1,120}$/.test(p), ttl: 120 },
  { match: (p) => p === '/v1/wiki/discover', ttl: 60 },
  { match: (p) => p === '/v1/aksara/jadwal', ttl: 60 },
  { match: (p) => p === '/v1/peta-kata' || p === '/v1/peta-kata/concepts', ttl: 90 },
  { match: (p) => p === '/v1/feed/page', ttl: 30 },
]

/** Returns the cache TTL (seconds) if and only if the request is strictly anonymous and allowlisted. */
export function publicCacheTtl(request: Request): number | null {
  if (request.method !== 'GET') return null
  if (request.headers.has('cookie') || request.headers.has('authorization')) return null
  const url = new URL(request.url)
  for (const rule of PUBLIC_GET_PATTERNS) {
    if (rule.match(url.pathname)) return rule.ttl
  }
  return null
}

/** Canonical anonymous cache key (no caller headers). */
export function publicCacheKey(request: Request): Request {
  const url = new URL(request.url)
  return new Request(url.origin + url.pathname + url.search, { method: 'GET' })
}

export type CacheStore = {
  match(key: Request): Promise<Response | undefined>
  put(key: Request, response: Response): Promise<void>
}

/** Serve an anonymous public API read via edge cache; authenticated or non-allowlisted requests pass straight through. */
export async function cachedPublicApi(
  request: Request,
  cache: CacheStore,
  upstream: (req: Request) => Promise<Response>,
): Promise<Response> {
  const ttl = publicCacheTtl(request)
  if (ttl === null) return upstream(request)

  const key = publicCacheKey(request)
  const hit = await cache.match(key)
  if (hit) {
    const h = new Headers(hit.headers)
    h.set('x-etnos-edge-cache', 'HIT')
    return new Response(hit.body, { status: hit.status, headers: h })
  }

  // Forward a clean anonymous request so no ambient caller headers ever affect the cached projection.
  const anonReq = new Request(key.url, { method: 'GET', headers: { accept: 'application/json' } })
  const res = await upstream(anonReq)
  if (res.status !== 200 || res.headers.has('set-cookie')) return res

  const bodyBytes = await res.arrayBuffer()
  const storeHeaders = new Headers(res.headers)
  storeHeaders.set('cache-control', `public, max-age=${ttl}, s-maxage=${ttl}`)
  storeHeaders.set('x-etnos-edge-cache', 'MISS')
  const toCache = new Response(bodyBytes, { status: 200, headers: storeHeaders })
  await cache.put(key, toCache.clone())
  return toCache
}
