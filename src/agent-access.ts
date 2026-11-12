import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { importJWK, jwtVerify, type JWK } from "jose";
import { StrataCore, Fault, type Actor } from "./core.ts";
import { Groups, text } from "./groups.ts";
import { Wiki } from "./wiki.ts";

export type AgentRole = "guest" | "worker" | "steward";
type Registration = {
  agent_id: string;
  community_id: string;
  group_id: string | null;
  role: AgentRole;
  family: "aksara" | "external";
  created: number;
  revoked: number;
};
type Deployment = {
  id: string;
  agent_id: string;
  label: string;
  jwk: string;
  fingerprint: string;
  created: number;
  revoked: number;
};
type Access = {
  hash: string;
  deployment_id: string;
  scope: string;
  expires: number;
};
export type AgentPrincipal = {
  actor: Actor;
  deploymentId: string;
  communityId: string;
  scopes: string[];
};
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const scopes = [
  "public:read",
  "agent:self",
  "posts:create",
  "wiki:propose",
] as const;
/** Registered public-key entrance. Identity, membership and effect mandates remain independent. */
export class AgentAccess {
  readonly store: StrataCore;
  readonly groups: Groups;
  private operatorAllowed: (id: string) => boolean;
  constructor(
    store: StrataCore,
    options: {
      stewardDid?: string;
      operatorAllowed?: (id: string) => boolean;
    } = {},
  ) {
    this.store = store;
    this.groups = new Groups(store, options);
    this.operatorAllowed = options.operatorAllowed ?? (() => true);
  }
  private human(id: string) {
    const a = this.store.actor(id);
    if (a.kind !== "human" || !this.operatorAllowed(id))
      throw new Fault(403, "Current human operator required");
    return a;
  }
  private registration(id: string) {
    const r = this.store.get<Registration>(
      "SELECT * FROM agent_registrations WHERE agent_id=?",
      id,
    );
    if (!r) throw new Fault(404, "Not found");
    return r;
  }
  private owned(operator: string, id: string) {
    this.human(operator);
    if (this.store.actor(id).operator_id !== operator)
      throw new Fault(404, "Not found");
    return this.registration(id);
  }
  private current(id: string) {
    const s = this.store,
      r = this.registration(id),
      a = s.actor(id);
    if (r.revoked || !a.operator_id) throw new Fault(403, "Agent suspended");
    this.human(a.operator_id);
    s.requireMember(a.operator_id, r.community_id);
    const c = s.community(r.community_id);
    if (c.visibility !== "public" || c.publication !== "local")
      throw new Fault(403, "Public local community required");
    if (r.role !== "guest") s.requireSteward(a.operator_id, r.community_id);
    if (r.group_id) {
      const g = this.groups.group(r.group_id);
      if (
        g.visibility !== "public" ||
        !this.groups.allows(a.operator_id, r.group_id, "manage") ||
        !s.get(
          "SELECT 1 FROM spaces WHERE group_id=? AND community_id=?",
          r.group_id,
          r.community_id,
        )
      )
        throw new Fault(403, "Current group authority required");
    }
    return r;
  }
  /** Server-side runtime boundary; never grants capabilities by itself. */
  assertCurrent(id: string) { return this.current(id) }
  /** Current enrollment only; this grants neither membership nor agent-operation rights. */
  assertHumanCurrent(id:string){return this.human(id)}
  enroll(operator: string, b: Record<string, unknown>) {
    return this.store.tx(() => {
      const s = this.store;
      this.human(operator);
      const cid = text(String(b.communityId ?? ""), 100),
        c = s.community(cid);
      s.requireMember(operator, cid);
      if (c.visibility !== "public" || c.publication !== "local")
        throw new Fault(400, "Choose a public local community");
      if (
        s.get<{ n: number }>(
          "SELECT count(*) n FROM agent_registrations r JOIN actors a ON a.id=r.agent_id WHERE a.operator_id=?",
          operator,
        )!.n >= 10
      )
        throw new Fault(429, "Operator agent limit reached");
      const role = String(b.role ?? "guest");
      if (!["guest", "worker", "steward"].includes(String(role)))
        throw new Fault(400, "Invalid agent role");
      const family = String(b.family ?? "external");
      if (!["external", "aksara"].includes(String(family)))
        throw new Fault(400, "Invalid agent family");
      if (role !== "guest" || family === "aksara")
        s.requireSteward(operator, cid);
      const gid = b.groupId ? text(String(b.groupId), 100) : null;
      if (gid) {
        this.groups.requireSteward(operator, gid);
        if (
          this.groups.group(gid).visibility !== "public" ||
          !s.get(
            "SELECT 1 FROM spaces WHERE group_id=? AND community_id=?",
            gid,
            cid,
          )
        )
          throw new Fault(400, "Choose a public group space");
      }
      const id = randomUUID(),
        name = text(String(b.name ?? ""), 100);
      s.run(
        "INSERT INTO actors VALUES(?,?,?,'agent',?)",
        id,
        "did:web:" + new URL(s.base).hostname + ":agents:" + id,
        name,
        operator,
      );
      s.run(
        "INSERT INTO agent_registrations VALUES(?,?,?,?,?,?,0)",
        id,
        cid,
        gid,
        role,
        family,
        s.clock(),
      );
      s.audit(operator, "agent.enroll", id);
      return this.details(operator, id);
    });
  }
  details(operator: string, id: string) {
    const r = this.owned(operator, id),
      s = this.store;
    return {
      ...r,
      actor: s.actor(id),
      community: {
        id: r.community_id,
        title: s.community(r.community_id).title,
        automation: !!s.community(r.community_id).automation,
      },
      admitted: !!s.membership(id, r.community_id),
      deployments: s.all<Omit<Deployment, "jwk">>(
        "SELECT id,agent_id,label,fingerprint,created,revoked FROM agent_deployments WHERE agent_id=? ORDER BY created DESC",
        id,
      ),
      mandates: s.all(
        "SELECT id,purpose,expires,revoked,hourly_limit FROM mandates WHERE agent_id=? AND community_id=? ORDER BY expires DESC LIMIT 20",
        id,
        r.community_id,
      ),
      editorial: s.all(
        "SELECT id,purpose,expires,revoked,hourly_limit FROM editorial_mandates WHERE agent_id=? AND community_id=? ORDER BY expires DESC LIMIT 20",
        id,
        r.community_id,
      ),
    };
  }
  list(operator: string) {
    this.human(operator);
    return this.store
      .all<{ id: string }>(
        "SELECT r.agent_id id FROM agent_registrations r JOIN actors a ON a.id=r.agent_id WHERE a.operator_id=? ORDER BY r.created DESC LIMIT 10",
        operator,
      )
      .map((x) => this.details(operator, x.id));
  }
  addDeployment(operator: string, id: string, label: string, value: unknown) {
    return this.store.tx(() => {
      const s = this.store;
      this.owned(operator, id);
      this.current(id);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Fault(400, "Public Ed25519 JWK required");
      const k = value as JWK;
      if (
        Object.keys(k).some((x) => !["kty", "crv", "x"].includes(x)) ||
        k.kty !== "OKP" ||
        k.crv !== "Ed25519" ||
        typeof k.x !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(k.x) ||
        Buffer.from(k.x, "base64url").length !== 32 ||
        Buffer.from(k.x, "base64url").toString("base64url") !== k.x
      )
        throw new Fault(
          400,
          "Supply only a public Ed25519 key, never its private part",
        );
      if (
        s.get<{ n: number }>(
          "SELECT count(*) n FROM agent_deployments WHERE agent_id=? AND revoked=0",
          id,
        )!.n >= 3
      )
        throw new Fault(429, "Three active deployments allowed");
      if (
        s.get<{ n: number }>(
          "SELECT count(*) n FROM agent_deployments WHERE agent_id=?",
          id,
        )!.n >= 100
      )
        throw new Fault(
          429,
          "Deployment rotation limit reached; contact the operator",
        );
      const fingerprint = hash(
        JSON.stringify({ crv: k.crv, kty: k.kty, x: k.x }),
      );
      if (
        s.get(
          "SELECT 1 FROM agent_deployments WHERE fingerprint=?",
          fingerprint,
        )
      )
        throw new Fault(409, "Register a distinct deployment key");
      const did = randomUUID();
      s.run(
        "INSERT INTO agent_deployments VALUES(?,?,?,?,?,?,0)",
        did,
        id,
        text(label, 100),
        JSON.stringify(k),
        fingerprint,
        s.clock(),
      );
      s.audit(operator, "agent.deployment.register", did);
      return {
        id: did,
        fingerprint,
        tokenEndpoint: s.base + "/agents/token",
        resource: s.base + "/mcp",
        clientId: did,
      };
    });
  }
  suspend(operator: string, id: string) {
    return this.store.tx(() => {
      this.owned(operator, id);
      const s = this.store;
      s.run("UPDATE agent_registrations SET revoked=1 WHERE agent_id=?", id);
      s.run("UPDATE agent_deployments SET revoked=1 WHERE agent_id=?", id);
      s.run("UPDATE mandates SET revoked=1 WHERE agent_id=?", id);
      s.run("UPDATE editorial_mandates SET revoked=1 WHERE agent_id=?", id);
      s.run("UPDATE work_grants SET revoked=1 WHERE agent_id=?", id);
      s.run(
        "DELETE FROM agent_tokens WHERE deployment_id IN(SELECT id FROM agent_deployments WHERE agent_id=?)",
        id,
      );
      s.audit(operator, "agent.suspend", id);
      return { ok: true };
    });
  }
  resume(operator: string, id: string) {
    return this.store.tx(() => {
      this.owned(operator, id);
      this.store.run(
        "UPDATE agent_registrations SET revoked=0 WHERE agent_id=?",
        id,
      );
      this.current(id);
      this.store.audit(operator, "agent.resume", id);
      return { ok: true, newDeploymentRequired: true };
    });
  }
  revokeDeployment(operator: string, id: string, deployment: string) {
    return this.store.tx(() => {
      this.owned(operator, id);
      const s = this.store;
      if (
        !s.get(
          "SELECT 1 FROM agent_deployments WHERE id=? AND agent_id=?",
          deployment,
          id,
        )
      )
        throw new Fault(404, "Not found");
      s.run("UPDATE agent_deployments SET revoked=1 WHERE id=?", deployment);
      s.run("DELETE FROM agent_tokens WHERE deployment_id=?", deployment);
      s.audit(operator, "agent.deployment.revoke", deployment);
      return { ok: true };
    });
  }
  admit(steward: string, id: string) {
    return this.store.tx(() => {
      const r = this.current(id),
        s = this.store;
      s.requireSteward(steward, r.community_id);
      if (!s.community(r.community_id).automation)
        throw new Fault(
          409,
          "Enable community automation before admitting agents",
        );
      s.setMember(steward, r.community_id, id, true);
      return { ok: true };
    });
  }
  grant(operator: string, id: string, b: Record<string, unknown>) {
    return this.store.tx(() => {
      const r = this.owned(operator, id);
      this.current(id);
      const s = this.store;
      s.requireMember(id, r.community_id);
      if (!s.community(r.community_id).automation)
        throw new Fault(409, "Community automation disabled");
      const purpose = text(String(b.purpose ?? ""), 500),
        expires = Number(b.expires),
        limit = Number(b.hourlyLimit ?? 3);
      if (b.kind === "editorial")
        return new Wiki(s).grant(
          operator,
          id,
          r.community_id,
          purpose,
          expires,
          limit,
        );
      if (b.kind !== "posting")
        throw new Fault(400, "Choose posting or editorial grant");
      return {
        id: s.mandate(operator, id, r.community_id, purpose, expires, limit),
        expires,
      };
    });
  }
  private deployment(id: string) {
    const d = this.store.get<Deployment>(
      "SELECT * FROM agent_deployments WHERE id=? AND revoked=0",
      id,
    );
    if (!d) throw new Fault(401, "Invalid deployment credential");
    this.current(d.agent_id);
    return d;
  }
  async exchange(form: URLSearchParams) {
    const s = this.store;
    if (
      [...form.keys()].some(
        (k) => !["grant_type", "assertion", "resource", "scope"].includes(k),
      ) ||
      [...new Set(form.keys())].some((k) => form.getAll(k).length !== 1) ||
      form.get("grant_type") !==
        "urn:ietf:params:oauth:grant-type:jwt-bearer" ||
      form.get("resource") !== s.base + "/mcp"
    )
      throw new Fault(400, "Invalid token request or resource");
    const assertion = form.get("assertion") ?? "";
    if (assertion.length > 4096) throw new Fault(400, "Assertion too large");
    // Decode only to select a locally registered key. No issuer URL, jku or remote key fetch.
    let id: string;
    try {
      const p = JSON.parse(
        Buffer.from(assertion.split(".")[1] ?? "", "base64url").toString(),
      );
      if (typeof p.iss !== "string" || p.iss.length > 100) throw Error();
      id = p.iss;
    } catch {
      throw new Fault(401, "Invalid deployment credential");
    }
    const d = this.deployment(id);
    const requested = (form.get("scope") ?? "public:read agent:self").split(
      " ",
    );
    if (
      !requested.length ||
      requested.some((x) => !scopes.includes(x as (typeof scopes)[number]))
    )
      throw new Fault(400, "Invalid scope");
    const now = s.clock(),
      cutoff = now - 60000;
    s.tx(() => {
      s.run("DELETE FROM agent_auth_attempts WHERE created<?", cutoff);
      if (
        s.get<{ n: number }>(
          "SELECT count(*) n FROM agent_auth_attempts WHERE deployment_id=?",
          id,
        )!.n >= 12 ||
        s.get<{ n: number }>("SELECT count(*) n FROM agent_auth_attempts")!.n >=
          120
      )
        throw new Fault(429, "Token request limit reached");
      s.run(
        "INSERT INTO agent_auth_attempts VALUES(?,?,?)",
        randomUUID(),
        id,
        now,
      );
    });
    let jti: string, exp: number;
    try {
      const verified = await jwtVerify(
        assertion,
        await importJWK(JSON.parse(d.jwk), "EdDSA"),
        {
          algorithms: ["EdDSA"],
          issuer: id,
          audience: s.base + "/agents/token",
          currentDate: new Date(now),
          clockTolerance: 0,
          requiredClaims: ["iss", "sub", "aud", "iat", "exp", "jti"],
        },
      );
      const p = verified.payload,
        h = verified.protectedHeader;
      if (
        h.jku ||
        h.jwk ||
        h.x5u ||
        p.sub !== id ||
        p.aud !== s.base + "/agents/token" ||
        typeof p.iat !== "number" ||
        !Number.isSafeInteger(p.iat) ||
        p.iat > now / 1000 + 30 ||
        p.iat < now / 1000 - 300 ||
        typeof p.exp !== "number" ||
        !Number.isSafeInteger(p.exp) ||
        p.exp <= p.iat ||
        p.exp - p.iat > 300 ||
        typeof p.jti !== "string" ||
        !/^[-a-zA-Z0-9]{16,100}$/.test(p.jti)
      )
        throw Error();
      jti = p.jti;
      exp = p.exp * 1000;
    } catch {
      throw new Fault(401, "Invalid deployment credential");
    }
    return s.tx(() => {
      this.deployment(id);
      s.run("DELETE FROM agent_assertions WHERE expires<=?", s.clock());
      s.run("DELETE FROM agent_tokens WHERE expires<=?", s.clock());
      if (
        s.get(
          "SELECT 1 FROM agent_assertions WHERE deployment_id=? AND jti=?",
          id,
          jti,
        )
      )
        throw new Fault(401, "Assertion already used");
      if (exp <= s.clock()) throw new Fault(401, "Assertion expired");
      s.run("INSERT INTO agent_assertions VALUES(?,?,?)", id, jti, exp);
      const token = randomBytes(32).toString("base64url"),
        scope = [...new Set(requested)].join(" ");
      s.run(
        "INSERT INTO agent_tokens VALUES(?,?,?,?)",
        hash(token),
        id,
        scope,
        s.clock() + 300000,
      );
      s.audit(d.agent_id, "agent.token.issue", id);
      return {
        access_token: token,
        token_type: "Bearer",
        expires_in: 300,
        scope,
      };
    });
  }
  authenticate(token: string): AgentPrincipal {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new Fault(401, "Authentication required");
    const s = this.store,
      t = s.get<Access>(
        "SELECT * FROM agent_tokens WHERE hash=? AND expires>?",
        hash(token),
        s.clock(),
      );
    if (!t) throw new Fault(401, "Authentication required");
    const d = this.deployment(t.deployment_id),
      r = this.current(d.agent_id);
    return {
      actor: s.actor(d.agent_id),
      deploymentId: d.id,
      communityId: r.community_id,
      scopes: t.scope.split(" "),
    };
  }
  require(token: string, scope: string) {
    const p = this.authenticate(token);
    if (!p.scopes.includes(scope))
      throw new Fault(403, "Required agent scope: " + scope);
    return p;
  }
  ownGrants(token: string) {
    const p = this.require(token, "agent:self"),
      s = this.store;
    return {
      actor: { id: p.actor.id, name: p.actor.name, kind: "agent" },
      communityId: p.communityId,
      scopes: p.scopes,
      posting: s.all(
        "SELECT id,purpose,expires,hourly_limit FROM mandates WHERE agent_id=? AND community_id=? AND revoked=0 AND expires>?",
        p.actor.id,
        p.communityId,
        s.clock(),
      ),
      editorial: s.all(
        "SELECT id,purpose,expires,hourly_limit FROM editorial_mandates WHERE agent_id=? AND community_id=? AND revoked=0 AND expires>?",
        p.actor.id,
        p.communityId,
        s.clock(),
      ),
    };
  }
}
