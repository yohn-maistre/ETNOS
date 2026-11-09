import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { StrataCore, Fault } from "./core.ts";

type Device = {
  actor_id: string;
  id: string;
  signature_key: string;
  created: number;
};
type Thread = {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_device: string;
  recipient_device: string;
  package_id: string;
  state: "preparing" | "pending" | "active" | "closed";
  welcome: string | null;
  version: number;
  created: number;
  updated: number;
  request_key: string;
};
type Envelope = {
  id: string;
  thread_id: string;
  sender_id: string;
  client_id: string;
  version: number;
  ciphertext: string;
  created: number;
};
const missing = (): never => {
  throw new Fault(404, "Conversation unavailable");
};
function opaque(v: string, max = 24576) {
  if (
    typeof v !== "string" ||
    !v ||
    v.length > max ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      v,
    ) ||
    Buffer.from(v, "base64").toString("base64") !== v
  )
    throw new Fault(400, "Bounded canonical base64 required");
  return v;
}
function uuid(v: string) {
  if (
    typeof v !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v)
  )
    throw new Fault(400, "Stable UUID required");
  return v;
}
/** Experimental one-device, human-to-human ciphertext mailboxes. Not AT records.
 * Endpoints must validate MLS and device identity; a relay cannot prove encryption.
 */
export class DirectMessages {
  readonly s: StrataCore;
  constructor(s: StrataCore) {
    this.s = s;
  }
  private human(actorId: string) {
    if (this.s.actor(actorId).kind !== "human")
      throw new Fault(403, "Human messaging participant required");
  }
  device(actorId: string) {
    return this.s.get<Device>(
      "SELECT * FROM dm_devices WHERE actor_id=?",
      actorId,
    );
  }
  me(actorId: string) {
    this.human(actorId);
    const device = this.device(actorId);
    return {
      device: device ?? null,
      availablePackages: device
        ? this.s.get<{ n: number }>(
            "SELECT count(*) AS n FROM dm_packages WHERE actor_id=? AND thread_id IS NULL AND expires>?",
            actorId,
            this.s.clock(),
          )!.n
        : 0,
      experimental: true,
      e2eLibrary: "ts-mls/1.6.4",
      multiDevice: false,
    };
  }
  register(
    actorId: string,
    params: {
      deviceId: string;
      signatureKey: string;
      packages: { id: string; data: string }[];
    },
  ) {
    return this.s.tx(() => {
      this.human(actorId);
      uuid(params.deviceId);
      opaque(params.signatureKey, 200);
      if (![33, 65].includes(Buffer.from(params.signatureKey, "base64").length))
        throw new Fault(400, "P-256 messaging key required");
      const prior = this.device(actorId);
      if (
        prior &&
        (prior.id !== params.deviceId ||
          prior.signature_key !== params.signatureKey)
      )
        throw new Fault(
          409,
          "A messaging device already exists; restore its encrypted backup. Device replacement is not enabled.",
        );
      if (
        !Array.isArray(params.packages) ||
        params.packages.length < 1 ||
        params.packages.length > 8
      )
        throw new Fault(400, "One to eight single-use key packages required");
      this.s.run(
        "DELETE FROM dm_packages WHERE actor_id=? AND thread_id IS NULL AND expires<=?",
        actorId,
        this.s.clock(),
      );
      const fresh: typeof params.packages = [];
      if (
        new Set(params.packages.map((p) => p.id)).size !==
        params.packages.length
      )
        throw new Fault(400, "Unique key packages required");
      for (const p of params.packages) {
        uuid(p.id);
        opaque(p.data, 12000);
        const old = this.s.get<{ actor_id: string; data: string }>(
          "SELECT actor_id,data FROM dm_packages WHERE id=?",
          p.id,
        );
        if (old) {
          if (old.actor_id !== actorId || old.data !== p.data)
            throw new Fault(409, "Key package already registered");
        } else fresh.push(p);
      }
      if (
        this.s.get<{ n: number }>(
          "SELECT count(*) AS n FROM dm_packages WHERE actor_id=? AND thread_id IS NULL",
          actorId,
        )!.n +
          fresh.length >
        32
      )
        throw new Fault(429, "Messaging key package pool is full");
      if (!prior)
        this.s.run(
          "INSERT INTO dm_devices VALUES(?,?,?,?)",
          actorId,
          params.deviceId,
          params.signatureKey,
          this.s.clock(),
        );
      for (const p of fresh)
        this.s.run(
          "INSERT INTO dm_packages VALUES(?,?,?,?,NULL)",
          p.id,
          actorId,
          p.data,
          this.s.clock() + 7 * 86400000,
        );
      return this.me(actorId);
    });
  }
  private blocked(a: string, b: string) {
    return !!this.s.get(
      "SELECT 1 FROM dm_blocks WHERE (actor_id=? AND peer_id=?) OR (actor_id=? AND peer_id=?)",
      a,
      b,
      b,
      a,
    );
  }
  private thread(actorId: string, id: string) {
    this.human(actorId);
    const t =
      this.s.get<Thread>(
        "SELECT * FROM dm_threads WHERE id=? AND (sender_id=? OR recipient_id=?)",
        id,
        actorId,
        actorId,
      ) ?? missing();
    return t;
  }
  private participants(t: Thread) {
    return [t.sender_id, t.recipient_id].map((id) => {
      const a = this.s.actor(id),
        d = this.device(id)!;
      return {
        id: a.id,
        did: a.did,
        name: a.name,
        deviceId: d.id,
        signatureKey: d.signature_key,
      };
    });
  }
  read(actorId: string, id: string) {
    const t = this.thread(actorId, id),
      { request_key: _request, ...view } = t;
    return {
      ...view,
      participants: this.participants(t),
      incoming: t.recipient_id === actorId,
      readVersion:
        this.s.get<{ version: number }>(
          "SELECT version FROM dm_reads WHERE actor_id=? AND thread_id=?",
          actorId,
          id,
        )?.version ?? 0,
    };
  }
  list(actorId: string) {
    this.human(actorId);
    return this.s
      .all<{ id: string }>(
        "SELECT id FROM dm_threads WHERE (sender_id=? OR recipient_id=?) ORDER BY updated DESC,id DESC LIMIT 100",
        actorId,
        actorId,
      )
      .map((t) => {
        const { welcome: _welcome, ...view } = this.read(actorId, t.id);
        return view;
      });
  }
  contacts(actorId: string, query: string) {
    this.human(actorId);
    if (
      typeof query !== "string" ||
      query.trim().length < 2 ||
      query.length > 100
    )
      return [];
    return this.s.all<{ id: string; name: string; did: string }>(
      `SELECT a.id,a.name,a.did FROM actors a JOIN dm_devices d ON d.actor_id=a.id WHERE a.kind='human' AND a.id!=? AND (instr(lower(a.name),lower(?))>0 OR instr(lower(a.did),lower(?))>0) AND NOT EXISTS(SELECT 1 FROM dm_blocks b WHERE (b.actor_id=? AND b.peer_id=a.id) OR (b.peer_id=? AND b.actor_id=a.id)) AND (EXISTS(SELECT 1 FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.author_id=a.id AND p.hidden=0 AND p.deleted=0 AND (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))) OR EXISTS(SELECT 1 FROM dm_threads t WHERE (t.sender_id=? AND t.recipient_id=a.id) OR (t.recipient_id=? AND t.sender_id=a.id))) ORDER BY a.name LIMIT 20`,
      actorId,
      query.trim().replace(/^@/, ''),
      query.trim().replace(/^@/, ''),
      actorId,
      actorId,
      actorId,
      actorId,
      actorId,
    );
  }
  reserve(
    actorId: string,
    recipientId: string,
    deviceId: string,
    requestKey: string,
  ) {
    return this.s.tx(() => {
      this.human(actorId);
      uuid(requestKey);
      if (actorId === recipientId)
        throw new Fault(400, "Choose another participant");
      const device = this.device(actorId),
        peer = this.device(recipientId);
      if (!device || device.id !== deviceId)
        throw new Fault(403, "Set up your messaging device first");
      if (
        !peer ||
        this.s.actor(recipientId).kind !== "human" ||
        this.blocked(actorId, recipientId)
      )
        missing();
      const previous = this.s.get<Thread>(
        "SELECT * FROM dm_threads WHERE sender_id=? AND request_key=?",
        actorId,
        requestKey,
      );
      if (previous) {
        if (previous.recipient_id !== recipientId)
          throw new Fault(409, "Request key already used");
        return {
          ...this.read(actorId, previous.id),
          keyPackage: this.s.get<{ data: string }>(
            "SELECT data FROM dm_packages WHERE id=?",
            previous.package_id,
          )!.data,
        };
      }
      // No global private identity directory: only an existing public participant,
      // a currently shared forum participant, or a prior direct peer can be addressed.
      const known = this.s.get(
        `SELECT 1 FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.author_id=? AND p.hidden=0 AND (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1)) UNION ALL SELECT 1 FROM memberships a JOIN memberships b ON b.community_id=a.community_id WHERE a.actor_id=? AND b.actor_id=? AND a.active=1 AND b.active=1 UNION ALL SELECT 1 FROM dm_threads WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?) LIMIT 1`,
        recipientId,
        actorId,
        actorId,
        recipientId,
        actorId,
        recipientId,
        recipientId,
        actorId,
      );
      if (!known) missing();
      if (
        this.s.get<{ n: number }>(
          "SELECT count(*) AS n FROM dm_threads WHERE sender_id=? OR recipient_id=?",
          recipientId,
          recipientId,
        )!.n >= 100
      )
        missing();
      const active = this.s.get<Thread>(
        "SELECT * FROM dm_threads WHERE state!='closed' AND ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) ORDER BY created DESC LIMIT 1",
        actorId,
        recipientId,
        recipientId,
        actorId,
      );
      if (active)
        throw new Fault(409, "A conversation with this person already exists");
      if (
        this.s.get<{ n: number }>(
          "SELECT count(*) AS n FROM dm_threads WHERE sender_id=? AND created>?",
          actorId,
          this.s.clock() - 3600000,
        )!.n >= 5 ||
        this.s.get<{ n: number }>(
          "SELECT count(*) AS n FROM dm_threads WHERE sender_id=? OR recipient_id=?",
          actorId,
          actorId,
        )!.n >= 100
      )
        throw new Fault(429, "Message request limit reached");
      const kp =
        this.s.get<{ id: string; data: string }>(
          "SELECT id,data FROM dm_packages WHERE actor_id=? AND thread_id IS NULL AND expires>? ORDER BY id LIMIT 1",
          recipientId,
          this.s.clock(),
        ) ?? missing();
      const id = randomUUID(),
        now = this.s.clock();
      this.s.run(
        "INSERT INTO dm_threads VALUES(?,?,?,?,?,?,'preparing',NULL,0,?,?,?)",
        id,
        actorId,
        recipientId,
        deviceId,
        peer!.id,
        kp.id,
        now,
        now,
        requestKey,
      );
      this.s.run(
        "UPDATE dm_packages SET thread_id=? WHERE id=? AND thread_id IS NULL",
        id,
        kp.id,
      );
      return { ...this.read(actorId, id), keyPackage: kp.data };
    });
  }
  start(actorId: string, id: string, deviceId: string, welcome: string) {
    return this.s.tx(() => {
      const t = this.thread(actorId, id);
      if (
        t.sender_id !== actorId ||
        t.sender_device !== deviceId ||
        this.blocked(actorId, t.recipient_id)
      )
        missing();
      opaque(welcome);
      if (t.state === "pending" && t.welcome === welcome)
        return this.read(actorId, id);
      if (t.state !== "preparing")
        throw new Fault(409, "Request already initialized");
      this.s.run(
        "UPDATE dm_threads SET welcome=?,state='pending',updated=? WHERE id=?",
        welcome,
        this.s.clock(),
        id,
      );
      return this.read(actorId, id);
    });
  }
  decide(actorId: string, id: string, deviceId: string, accept: boolean) {
    return this.s.tx(() => {
      const t = this.thread(actorId, id);
      if (
        t.recipient_id !== actorId ||
        t.recipient_device !== deviceId ||
        this.blocked(actorId, t.sender_id)
      )
        missing();
      if (accept && t.state === "active") return this.read(actorId, id);
      if (t.state !== "pending")
        throw new Fault(409, "Request no longer pending");
      this.s.run(
        "UPDATE dm_threads SET state=?,updated=? WHERE id=?",
        accept ? "active" : "closed",
        this.s.clock(),
        id,
      );
      return this.read(actorId, id);
    });
  }
  messages(actorId: string, id: string, after = 0) {
    const t = this.thread(actorId, id);
    if (t.state !== "active" && t.state !== "closed")
      return { items: [], next: null };
    if (!Number.isSafeInteger(after) || after < 0)
      throw new Fault(400, "Invalid message cursor");
    const items = this.s.all<Envelope>(
      "SELECT * FROM dm_envelopes WHERE thread_id=? AND version>? ORDER BY version LIMIT 100",
      id,
      after,
    );
    return {
      items,
      next: items.length === 100 ? items[items.length - 1].version : null,
    };
  }
  send(
    actorId: string,
    id: string,
    deviceId: string,
    clientId: string,
    ciphertext: string,
  ) {
    return this.s.tx(() => {
      const t = this.thread(actorId, id);
      uuid(clientId);
      opaque(ciphertext);
      if (t.state !== "active" || this.blocked(t.sender_id, t.recipient_id))
        throw new Fault(403, "Conversation is closed");
      if (
        (t.sender_id === actorId ? t.sender_device : t.recipient_device) !==
        deviceId
      )
        throw new Fault(403, "Messaging device mismatch");
      const prior = this.s.get<Envelope>(
        "SELECT * FROM dm_envelopes WHERE sender_id=? AND client_id=?",
        actorId,
        clientId,
      );
      if (prior) {
        if (prior.thread_id !== id || prior.ciphertext !== ciphertext)
          throw new Fault(409, "Message identifier already used");
        return prior;
      }
      if (
        t.version >= 1000 ||
        this.s.get<{ n: number }>(
          "SELECT count(*) AS n FROM dm_envelopes WHERE sender_id=? AND created>?",
          actorId,
          this.s.clock() - 60000,
        )!.n >= 30
      )
        throw new Fault(429, "Message limit reached");
      const messageId = randomUUID(),
        now = this.s.clock();
      this.s.run(
        "INSERT INTO dm_envelopes VALUES(?,?,?,?,?,?,?)",
        messageId,
        id,
        actorId,
        clientId,
        t.version + 1,
        ciphertext,
        now,
      );
      this.s.run(
        "UPDATE dm_threads SET version=version+1,updated=? WHERE id=?",
        now,
        id,
      );
      return this.s.get<Envelope>(
        "SELECT * FROM dm_envelopes WHERE id=?",
        messageId,
      )!;
    });
  }
  markRead(actorId: string, id: string, version: number) {
    return this.s.tx(() => {
      const t = this.thread(actorId, id);
      if (!Number.isSafeInteger(version) || version < 0 || version > t.version)
        throw new Fault(400, "Invalid read cursor");
      this.s.run(
        "INSERT INTO dm_reads VALUES(?,?,?) ON CONFLICT(actor_id,thread_id) DO UPDATE SET version=MAX(dm_reads.version,excluded.version)",
        actorId,
        id,
        version,
      );
      return { ok: true };
    });
  }
  close(actorId: string, id: string, block = false) {
    return this.s.tx(() => {
      const t = this.thread(actorId, id),
        peer = t.sender_id === actorId ? t.recipient_id : t.sender_id;
      if (block)
        this.s.run(
          "INSERT OR IGNORE INTO dm_blocks VALUES(?,?)",
          actorId,
          peer,
        );
      this.s.run(
        "UPDATE dm_threads SET state='closed',updated=? WHERE id=?",
        this.s.clock(),
        id,
      );
      return { ok: true };
    });
  }
}
