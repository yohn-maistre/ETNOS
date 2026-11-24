// ETNOS Service Worker: handles Android PWA Share Target ("Titip Suara" from WhatsApp)
// and offline shell/public-read caching ("Paket Kampung").
const SHARE_CACHE = 'etnos-share-intake'
const OFFLINE_CACHE = 'etnos-paket-v1'
const SHELL_URLS = ['/', '/manifest.webmanifest', '/branding/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(SHELL_URLS).catch(() => {})),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHARE_CACHE && k !== OFFLINE_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Handle Android PWA Share Target POST (e.g. forwarded WhatsApp voice note).
  if (event.request.method === 'POST' && url.pathname === '/share-intake') {
    event.respondWith(
      (async () => {
        try {
          const form = await event.request.formData()
          const file = form.get('audio')
          const title = String(form.get('title') || '')
          const text = String(form.get('text') || '')
          const sharedUrl = String(form.get('url') || '')
          const cache = await caches.open(SHARE_CACHE)
          if (file && typeof file === 'object' && 'arrayBuffer' in file) {
            const bytes = await file.arrayBuffer()
            await cache.put(
              '/__share_audio__',
              new Response(bytes, { headers: { 'content-type': file.type || 'audio/ogg' } }),
            )
            await cache.put(
              '/__share_meta__',
              new Response(
                JSON.stringify({
                  name: file.name || 'titip-suara.ogg',
                  title,
                  text: [text, sharedUrl].filter(Boolean).join('\n'),
                }),
                { headers: { 'content-type': 'application/json' } },
              ),
            )
          }
        } catch {
          /* fall through to home */
        }
        return Response.redirect('/?titip-suara=1', 303)
      })(),
    )
    return
  }

  // Only cache safe, anonymous-readable static assets and public Ensiklopedia JSON reads.
  // Never cache private community endpoints, auth routes, or authenticated API responses.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  const isStatic = /^\/(assets|branding|fonts|geo|img|observatory|textures)\//.test(url.pathname)
  const isPublicWiki =
    url.pathname === '/v1/entri' ||
    url.pathname === '/v1/contexts' ||
    /^\/v1\/entri\/[^/]+$/.test(url.pathname)

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(OFFLINE_CACHE).then((c) => c.put(event.request, copy))
            }
            return res
          }),
      ),
    )
    return
  }

  if (isPublicWiki) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(OFFLINE_CACHE).then((c) => c.put(event.request, copy))
          }
          return res
        })
        .catch(() => caches.match(event.request).then((hit) => hit || new Response('{"error":"Offline"}', { status: 503, headers: { 'content-type': 'application/json' } }))),
    )
  }
})
