/**
 * Web Push without a paid service: VAPID (RFC 8292) and message encryption (RFC 8291, aes128gcm), with WebCrypto
 * only, so it runs on Workers and on Node. The browser's own push service (Google, Mozilla, Apple, Microsoft)
 * carries the message; it sees only ciphertext.
 *
 * Keys: ETNOS_VAPID_PUBLIC_KEY (the uncompressed P-256 point, 65 bytes, base64url) and ETNOS_VAPID_PRIVATE_KEY
 * (the 32-byte private scalar, base64url), as Worker secrets. scripts/vapid-keys.mjs makes a pair.
 */
const enc = new TextEncoder()

export function b64u(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function unb64u(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}
async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data as BufferSource))
}

export type VapidKeys = { publicKey: string; privateKey: string; subject: string }

/** Both halves present and well formed; otherwise push stays off. */
export function vapidKeys(env: { ETNOS_VAPID_PUBLIC_KEY?: string; ETNOS_VAPID_PRIVATE_KEY?: string; ETNOS_VAPID_SUBJECT?: string; ETNOS_ORIGIN?: string }): VapidKeys | null {
  const pub = env.ETNOS_VAPID_PUBLIC_KEY?.trim(), priv = env.ETNOS_VAPID_PRIVATE_KEY?.trim()
  if (!pub || !priv || !/^[A-Za-z0-9_-]{87}$/.test(pub) || !/^[A-Za-z0-9_-]{43}$/.test(priv)) return null
  const subject = env.ETNOS_VAPID_SUBJECT?.trim() || env.ETNOS_ORIGIN || ''
  if (!/^(https:\/\/|mailto:)/.test(subject)) return null
  return { publicKey: pub, privateKey: priv, subject }
}

async function signingKey(keys: VapidKeys) {
  const point = unb64u(keys.publicKey)
  return crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(point.slice(1, 33)), y: b64u(point.slice(33, 65)), d: keys.privateKey, ext: false }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

/** The Authorization header for one push service origin, valid 12 hours. */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, now = Date.now()) {
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: keys.subject })))
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await signingKey(keys), enc.encode(header + '.' + claims)))
  return `vapid t=${header}.${claims}.${b64u(signature)}, k=${keys.publicKey}`
}

/** RFC 8291: one aes128gcm record for the subscription's keys. */
export async function encryptPayload(plaintext: Uint8Array, p256dh: string, auth: string, salt = crypto.getRandomValues(new Uint8Array(16)), fixedLocal?: CryptoKeyPair) {
  const uaPublic = unb64u(p256dh), authSecret = unb64u(auth)
  // fixedLocal: the RFC 8291 test vector only; every real message uses a fresh key pair.
  const local = fixedLocal ?? ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair)
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey))
  const ua = await crypto.subtle.importKey('raw', uaPublic as BufferSource, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: ua } as EcdhKeyDeriveParams, local.privateKey, 256))
  const prkKey = await hmac(authSecret, ecdh)
  const ikm = await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])))
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)
  const key = await crypto.subtle.importKey('raw', cek as BufferSource, 'AES-GCM', false, ['encrypt'])
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, key, concat(plaintext, new Uint8Array([2])) as BufferSource))
  const rs = new Uint8Array([0, 0, 16, 0])
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher)
}

/** Push services ETNOS sends to. Anything else is refused, so a subscription cannot point the node elsewhere. */
export function pushEndpointAllowed(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return false
  let url: URL
  try { url = new URL(endpoint) } catch { return false }
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return false
  const h = url.hostname
  return h === 'fcm.googleapis.com' || h === 'updates.push.services.mozilla.com' || h === 'web.push.apple.com' || h.endsWith('.push.apple.com') || h.endsWith('.notify.windows.com')
}

export type PushMessage = { title: string; body: string; url: string; tag: string }

/** Send one message. The outcome says whether to keep the subscription. */
export async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, message: PushMessage, keys: VapidKeys, fetcher: typeof fetch = fetch): Promise<'sent' | 'gone' | 'failed'> {
  if (!pushEndpointAllowed(sub.endpoint)) return 'gone'
  try {
    const body = await encryptPayload(enc.encode(JSON.stringify(message)), sub.p256dh, sub.auth)
    const r = await fetcher(sub.endpoint, {
      method: 'POST',
      headers: { authorization: await vapidAuthorization(sub.endpoint, keys), 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: '86400', urgency: 'normal' },
      body,
      signal: AbortSignal.timeout(10000),
    })
    await r.body?.cancel()
    if (r.status === 404 || r.status === 410) return 'gone'
    return r.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}
