// Web push in the browser: ask once, subscribe with the node's public key, and keep the node's copy fresh.
// The node sends a fixed line and a link only (src/push.ts at the root).
import { request } from './api'

export type PushState = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on'

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext
}
const key = async () => (await request<{ enabled: boolean; publicKey: string | null }>('/v1/push/key', undefined, undefined, true).catch(() => ({ enabled: false, publicKey: null })))
function bytes(b64: string) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}
/** The app's service worker (main.ts registers it on https). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg) return reg
  return location.protocol === 'https:' ? navigator.serviceWorker.ready : null
}
async function current() {
  return (await registration())?.pushManager.getSubscription() ?? null
}

/** A subscription made with the node's present key; one made with an older key is replaced. */
export async function browserSubscription(ask: boolean): Promise<PushSubscription | null> {
  const k = await key()
  if (!k.enabled || !k.publicKey) return null
  if (ask && Notification.permission === 'default' && (await Notification.requestPermission()) !== 'granted') return null
  if (Notification.permission !== 'granted') return null
  const reg = await registration()
  if (!reg) return null
  const applicationServerKey = bytes(k.publicKey)
  let sub = await reg.pushManager.getSubscription()
  const same = sub?.options.applicationServerKey && new Uint8Array(sub.options.applicationServerKey).join() === applicationServerKey.join()
  if (sub && !same) {
    await sub.unsubscribe().catch(() => {})
    sub = null
  }
  return sub ?? reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported() || !(await registration().catch(() => null))) return 'unsupported'
  if (!(await key()).enabled) return 'unavailable'
  if (Notification.permission === 'denied') return 'denied'
  const sub = await current().catch(() => null)
  if (!sub) return 'off'
  const status = await request<{ subscribed: boolean }>('/v1/push/status', { endpoint: sub.endpoint }, undefined, true).catch(() => ({ subscribed: false }))
  return status.subscribed ? 'on' : 'off'
}

export async function enablePush(): Promise<PushState> {
  const sub = await browserSubscription(true)
  if (!sub) return Notification.permission === 'denied' ? 'denied' : 'off'
  await request('/v1/push/subscribe', { subscription: sub.toJSON() }, undefined, true)
  return 'on'
}

export async function disablePush() {
  const sub = await current().catch(() => null)
  if (!sub) return
  await request('/v1/push/unsubscribe', { endpoint: sub.endpoint }, undefined, true).catch(() => {})
  await sub.unsubscribe().catch(() => {})
}

/** After sign-in: renew the node's copy so it does not expire while the app is in use. */
export async function renewPush() {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const sub = await current().catch(() => null)
  if (!sub) return
  const status = await request<{ subscribed: boolean }>('/v1/push/status', { endpoint: sub.endpoint }, undefined, true).catch(() => null)
  // Only a device that is on for this account is renewed; switching it off stays off.
  if (!status?.subscribed) return
  // browserSubscription replaces a subscription made with an older node key.
  const fresh = await browserSubscription(false).catch(() => null)
  if (fresh) await request('/v1/push/subscribe', { subscription: fresh.toJSON() }, undefined, true).catch(() => {})
}
