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

// Web push (src/push.ts on the node). The message holds one fixed line and a link inside ETNOS, never post text.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//') ? data.url : '/activity'
  const body = typeof data.body === 'string' ? data.body.slice(0, 200) : 'Ada kabar baru untukmu di ETNOS.'
  event.waitUntil(
    self.registration.showNotification(typeof data.title === 'string' ? data.title.slice(0, 60) : 'ETNOS', {
      body,
      tag: typeof data.tag === 'string' ? data.tag.slice(0, 120) : undefined,
      icon: '/branding/icon.svg',
      badge: '/branding/icon.svg',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/activity', self.location.origin)
  if (url.origin !== self.location.origin) return
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).origin === url.origin && 'focus' in client) {
          return client.focus().then((c) => (c && 'navigate' in c ? c.navigate(url.href) : undefined)).catch(() => self.clients.openWindow(url.href))
        }
      }
      return self.clients.openWindow(url.href)
    }),
  )
})
