/**
 * Push notifications (src/web-push.ts does the sending). SQLite triggers (schema.ts) queue a row in push_outbox
 * when someone with a subscription gets a reply, is mentioned, or sees a member's Kamus question cite their post;
 * the node's alarm sends the queue. A message carries one fixed line and a link, never post text, a name or a
 * community. Access is checked again when the message is sent, so a post that was hidden, deleted or moved out of
 * the reader's reach is never announced.
 */
import type { EtnosCore } from './core.ts'
import { Fault } from './core.ts'
import { json } from './api.ts'
import { pushEndpointAllowed, sendPush, unb64u, type PushMessage, type VapidKeys } from './web-push.ts'

/** A subscription not renewed by its device for this long stops. The app renews it each time it starts. */
export const PUSH_SUBSCRIPTION_DAYS = 60
/** A subscription made with an invitation request lasts as long as an unanswered request is worth waiting for. */
export const PUSH_REQUEST_DAYS = 30
const DAY = 86400000
const PER_ACTOR = 10

export type PushInput = { endpoint: string; p256dh: string; auth: string; expires: number | null }

/** The PushSubscription JSON a browser gives (subscription.toJSON()). */
export function pushInput(value: unknown): PushInput {
  const v = value as { endpoint?: unknown; expirationTime?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null
  const p256dh = v?.keys?.p256dh, auth = v?.keys?.auth
  if (!pushEndpointAllowed(v?.endpoint)) throw new Fault(400, 'Layanan notifikasi browser ini tidak didukung.')
  if (typeof p256dh !== 'string' || !/^[A-Za-z0-9_-]{87}$/.test(p256dh) || unb64u(p256dh)[0] !== 4) throw new Fault(400, 'Langganan notifikasi tidak valid.')
  if (typeof auth !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(auth)) throw new Fault(400, 'Langganan notifikasi tidak valid.')
  const expires = typeof v?.expirationTime === 'number' && Number.isFinite(v.expirationTime) ? v.expirationTime : null
  return { endpoint: v!.endpoint as string, p256dh, auth, expires }
}

type Row = { id: number; actor_id: string | null; request_id: string | null; kind: string; target: string }
type Sub = { id: string; endpoint: string; p256dh: string; auth: string }

export class PushCenter {
  private s: EtnosCore
  private keys: () => VapidKeys | null
  private fetcher: typeof fetch
  constructor(s: EtnosCore, keys: () => VapidKeys | null, fetcher: typeof fetch = fetch) { this.s = s; this.keys = keys; this.fetcher = fetcher }

  /** Upsert by endpoint: a device signed in to another account moves to that account. */
  subscribe(owner: { actorId: string } | { requestId: string }, input: PushInput) {
    const s = this.s, now = s.clock()
    const days = 'actorId' in owner ? PUSH_SUBSCRIPTION_DAYS : PUSH_REQUEST_DAYS
    const expires = Math.min(input.expires ?? Infinity, now + days * DAY)
    const actorId = 'actorId' in owner ? owner.actorId : null, requestId = 'requestId' in owner ? owner.requestId : null
    s.tx(() => {
      s.run(
        'INSERT INTO push_subscriptions(id,actor_id,request_id,endpoint,p256dh,auth,created,expires) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET actor_id=excluded.actor_id,request_id=excluded.request_id,p256dh=excluded.p256dh,auth=excluded.auth,created=excluded.created,expires=excluded.expires',
        crypto.randomUUID(), actorId, requestId, input.endpoint, input.p256dh, input.auth, now, expires,
      )
      // A person keeps at most ten devices; the oldest goes first.
      if (actorId) s.run('DELETE FROM push_subscriptions WHERE actor_id=? AND id NOT IN (SELECT id FROM push_subscriptions WHERE actor_id=? ORDER BY created DESC LIMIT ?)', actorId, actorId, PER_ACTOR)
    })
  }
  unsubscribe(actorId: string, endpoint: unknown) {
    if (typeof endpoint !== 'string') throw new Fault(400, 'Langganan notifikasi tidak valid.')
    this.s.run('DELETE FROM push_subscriptions WHERE actor_id=? AND endpoint=?', actorId, endpoint)
  }
  /** Everything queued for or held by an invitation request goes when the request goes. */
  forgetRequest(requestId: string) {
    this.s.run('DELETE FROM push_subscriptions WHERE request_id=?', requestId)
    this.s.run('DELETE FROM push_outbox WHERE request_id=?', requestId)
  }
  /** The approved request's device, if it asked to hear back. */
  queueInviteApproved(requestId: string) {
    this.s.run("INSERT OR IGNORE INTO push_outbox(request_id,kind,target,created) SELECT ?, 'invite', ?, ? WHERE EXISTS(SELECT 1 FROM push_subscriptions WHERE request_id=?)", requestId, requestId, this.s.clock(), requestId)
  }
  pending() {
    return !!this.s.get('SELECT 1 FROM push_outbox LIMIT 1')
  }

  /** What to say for one queued row, after checking the reader may still see what it points at. */
  message(row: Row): PushMessage | null {
    const s = this.s
    if (row.kind === 'invite') {
      const r = s.get<{ state: string }>('SELECT state FROM invite_requests WHERE id=?', row.target)
      return r?.state === 'approved' ? { title: 'ETNOS', body: 'Permintaan undanganmu disetujui. Pengelola akan mengirim tautan undangan lewat kontak yang kamu berikan.', url: '/gabung', tag: 'invite' } : null
    }
    if (!row.actor_id) return null
    const post = s.get<{ root_id: string | null; id: string; community_id: string }>('SELECT id,root_id,community_id FROM posts WHERE id=? AND deleted=0 AND hidden=0', row.target)
    if (!post) return null
    const community = s.get<{ id: string; visibility: string }>('SELECT id,visibility FROM communities WHERE id=?', post.community_id)
    if (!community || !s.canRead(row.actor_id, community as never)) return null
    // A reply also needs the post it answers to still be there.
    const root = post.root_id ?? post.id
    if (!s.get('SELECT 1 FROM posts WHERE id=? AND deleted=0 AND hidden=0', root)) return null
    const url = '/square/' + root
    if (row.kind === 'reply') return { title: 'ETNOS', body: 'Ada balasan baru untuk postinganmu.', url, tag: 'reply:' + root }
    if (row.kind === 'mention') return { title: 'ETNOS', body: 'Kamu disebut dalam sebuah postingan.', url, tag: 'mention:' + root }
    if (row.kind === 'kamus') return { title: 'ETNOS', body: 'Ada pertanyaan Kamus tentang postinganmu.', url, tag: 'kamus:' + root }
    return null
  }

  /** Send up to `limit` queued rows. Rows leave the queue before sending, so a message is sent at most once. */
  async flush(limit = 50) {
    const s = this.s, now = s.clock()
    s.run('DELETE FROM push_subscriptions WHERE expires<=?', now)
    s.run('DELETE FROM push_outbox WHERE created<?', now - DAY)
    const rows = s.all<Row>('SELECT id,actor_id,request_id,kind,target FROM push_outbox ORDER BY id LIMIT ?', limit)
    if (!rows.length) return { sent: 0, dropped: 0 }
    s.run('DELETE FROM push_outbox WHERE id<=?', rows[rows.length - 1].id)
    const keys = this.keys()
    if (!keys) return { sent: 0, dropped: rows.length }
    let sent = 0, dropped = 0
    for (const row of rows) {
      const message = this.message(row)
      if (!message) { dropped++; continue }
      const subs = row.actor_id
        ? s.all<Sub>('SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE actor_id=?', row.actor_id)
        : s.all<Sub>('SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE request_id=?', row.request_id!)
      for (const sub of subs) {
        const outcome = await sendPush(sub, message, keys, this.fetcher)
        if (outcome === 'gone') s.run('DELETE FROM push_subscriptions WHERE id=?', sub.id)
        if (outcome === 'sent') sent++
      }
      // The request's device has heard back; nothing more is sent to it.
      if (row.kind === 'invite') s.run('DELETE FROM push_subscriptions WHERE request_id=?', row.target)
    }
    return { sent, dropped }
  }

  /** GET /v1/push/key (public), and for a signed-in person POST /v1/push/subscribe, /unsubscribe and /status. */
  async route(request: Request, url: URL, principal: (r: Request) => { id: string } | undefined, writeGuard: (r: Request) => void): Promise<Response | undefined> {
    if (!url.pathname.startsWith('/v1/push/')) return undefined
    const keys = this.keys()
    if (url.pathname === '/v1/push/key' && request.method === 'GET') return json(200, { enabled: !!keys, publicKey: keys?.publicKey ?? null })
    if (request.method !== 'POST' || !['/v1/push/subscribe', '/v1/push/unsubscribe', '/v1/push/status'].includes(url.pathname)) return json(404, { error: 'Not found' })
    try {
      writeGuard(request)
      const actor = principal(request)
      if (!actor) throw new Fault(401, 'Authentication required')
      let body: { subscription?: unknown; endpoint?: unknown }
      try { body = await request.json() } catch { throw new Fault(400, 'Invalid JSON') }
      if (url.pathname === '/v1/push/unsubscribe') { this.unsubscribe(actor.id, body?.endpoint); return json(200, { subscribed: false }) }
      if (url.pathname === '/v1/push/status') {
        const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
        return json(200, { enabled: !!keys, subscribed: !!this.s.get('SELECT 1 FROM push_subscriptions WHERE actor_id=? AND endpoint=? AND expires>?', actor.id, endpoint, this.s.clock()) })
      }
      if (!keys) throw new Fault(409, 'Notifikasi belum dipasang di node ini.')
      this.subscribe({ actorId: actor.id }, pushInput(body?.subscription))
      return json(200, { subscribed: true })
    } catch (error) {
      return json(error instanceof Fault ? error.status : 400, { error: error instanceof Fault ? error.message : 'Permintaan tidak valid.' })
    }
  }
}
