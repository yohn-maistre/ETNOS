import { createHash, randomUUID } from "node:crypto";
import { EtnosCore, Fault, type Post } from "./core.ts";
import { Groups, text, strings } from "./groups.ts";
import { canonical } from "./transport.ts";

type State =
  "proposed" | "adopted" | "active" | "blocked" | "completed" | "withdrawn";
type Work = {
  id: string;
  group_id: string;
  community_id: string;
  origin_post_id: string | null;
  title: string;
  description: string;
  state: State;
  revision: number;
  result_id: string | null;
  created: number;
  updated: number;
};
type Grant = {
  id: string;
  group_id: string;
  agent_id: string;
  issuer_id: string;
  expires: number;
  hourly_limit: number;
  revoked: number;
};
type Result = {
  id: string;
  work_id: string;
  author_id: string;
  text: string;
  citations: string;
  digest: string;
  state: "pending" | "accepted" | "rejected";
  created: number;
  grant_id: string | null;
};
const missing = (): never => {
  throw new Fault(404, "Not found");
};
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function citations(value: unknown) {
  return strings(value, 20).map((v) => {
    try {
      const u = new URL(text(v, 2000));
      if (u.protocol !== "https:" || u.username || u.password) throw Error();
      return u.href;
    } catch {
      throw new Fault(400, "Public HTTPS citations required");
    }
  });
}

/** Public sponsor coordination only. No private task/tool execution or custody. */
export class PublicWork {
  readonly store: EtnosCore;
  readonly groups: Groups;
  constructor(store: EtnosCore, groups: Groups) {
    this.store = store;
    this.groups = groups;
  }
  private work(id: string) {
    return (
      this.store.get<Work>("SELECT * FROM public_work WHERE id=?", id) ??
      missing()
    );
  }
  private publicWork(id: string) {
    const w = this.work(id);
    if (
      this.groups.group(w.group_id).visibility !== "public" ||
      this.store.community(w.community_id).visibility !== "public"
    )
      missing();
    return w;
  }
  private authorize(
    actorId: string,
    groupId: string,
    communityId: string,
    grantId?: string,
    consume = true,
  ) {
    const s = this.store,
      a = s.actor(actorId),
      g = this.groups.group(groupId);
    if (g.visibility !== "public" || g.sponsorship !== "enabled")
      throw new Fault(403, "Admitted public sponsor required");
    s.requireMember(actorId, communityId);
    if (a.kind === "human") {
      this.groups.requireSteward(actorId, groupId);
      return;
    }
    const grant =
      s.get<Grant>("SELECT * FROM work_grants WHERE id=?", grantId ?? "") ??
      missing();
    if (
      grant.agent_id !== actorId ||
      grant.group_id !== groupId ||
      grant.revoked ||
      grant.expires <= s.clock() ||
      !this.groups.role(actorId, groupId) ||
      a.operator_id !== grant.issuer_id
    )
      throw new Fault(403, "Current sponsor-bound agent authority required");
    this.groups.requireSteward(grant.issuer_id, groupId);
    s.requireMember(grant.issuer_id, communityId);
    if (
      consume &&
      s.get<{ n: number }>(
        "SELECT count(*) AS n FROM work_events WHERE actor_id=? AND group_id=? AND created>?",
        actorId,
        groupId,
        s.clock() - 3600000,
      )!.n >= grant.hourly_limit
    )
      throw new Fault(429, "Institutional agent budget exceeded");
  }
  private status(state: State) {
    return state === "completed"
      ? "selesai"
      : state === "active" || state === "blocked"
        ? "dikerjakan"
        : state === "withdrawn"
          ? "ditarik"
          : "diusulkan";
  }
  private syncPost(id: string) {
    const w = this.work(id);
    this.store.run(
      "UPDATE work_posts SET status=?,updated=? WHERE work_id=?",
      this.status(w.state),
      this.store.clock(),
      id,
    );
  }
  private event(actorId: string, w: Work, kind: string) {
    this.store.run(
      "INSERT INTO work_events VALUES(?,?,?,?,?,?)",
      randomUUID(),
      w.id,
      w.group_id,
      actorId,
      kind,
      this.store.clock(),
    );
    this.store.audit(actorId, "work." + kind, w.id);
  }
  grant(
    actorId: string,
    groupId: string,
    agentId: string,
    expires: number,
    hourlyLimit = 5,
  ) {
    return this.store.tx(() => {
      this.groups.requireSteward(actorId, groupId);
      const a = this.store.actor(agentId),
        g = this.groups.group(groupId);
      if (
        g.visibility !== "public" ||
        g.sponsorship !== "enabled" ||
        a.kind !== "agent" ||
        a.operator_id !== actorId ||
        !this.groups.role(agentId, groupId)
      )
        throw new Fault(
          403,
          "Sponsor steward, registered operator and agent admission required",
        );
      if (
        !Number.isSafeInteger(expires) ||
        expires <= this.store.clock() ||
        expires > this.store.clock() + 86400000 ||
        !Number.isInteger(hourlyLimit) ||
        hourlyLimit < 1 ||
        hourlyLimit > 20
      )
        throw new Fault(400, "Invalid institutional grant bounds");
      const id = randomUUID();
      this.store.run(
        "INSERT INTO work_grants VALUES(?,?,?,?,?,?,0)",
        id,
        groupId,
        agentId,
        actorId,
        expires,
        hourlyLimit,
      );
      this.store.audit(actorId, "work.grant", groupId);
      return { id, expires };
    });
  }
  revoke(actorId: string, grantId: string) {
    return this.store.tx(() => {
      const grant =
        this.store.get<Grant>(
          "SELECT * FROM work_grants WHERE id=?",
          grantId,
        ) ?? missing();
      if (this.store.actor(actorId).kind !== "human")
        throw new Fault(403, "Human authority required");
      if (this.store.actor(grant.agent_id).operator_id !== actorId)
        this.groups.requireSteward(actorId, grant.group_id);
      this.store.run("UPDATE work_grants SET revoked=1 WHERE id=?", grantId);
      this.store.audit(actorId, "work.grant.revoke", grant.group_id);
      return { ok: true };
    });
  }
  consent(actorId: string, postId: string, groupId: string, expires: number) {
    return this.store.tx(() => {
      const p = this.store.getPost(actorId, postId);
      if (this.store.actor(actorId).kind !== "human" || p.author_id !== actorId)
        throw new Fault(403, "Original human author consent required");
      if (
        this.store.community(p.community_id).visibility !== "public" ||
        this.groups.group(groupId).visibility !== "public"
      )
        throw new Fault(400, "Public source and sponsor required");
      if (
        !Number.isSafeInteger(expires) ||
        expires <= this.store.clock() ||
        expires > this.store.clock() + 7 * 86400000
      )
        throw new Fault(400, "Consent expires within seven days");
      this.store.run(
        "INSERT INTO work_consents VALUES(?,?,?,?,?,0) ON CONFLICT(post_id,group_id) DO UPDATE SET author_id=excluded.author_id,digest=excluded.digest,expires=excluded.expires,revoked=0",
        postId,
        groupId,
        actorId,
        hash(p.text),
        expires,
      );
      this.store.audit(actorId, "work.adoption.allow", postId);
      return { ok: true, expires };
    });
  }
  revokeConsent(actorId: string, postId: string, groupId: string) {
    return this.store.tx(() => {
      const p = this.store.getPost(actorId, postId);
      if (p.author_id !== actorId || this.store.actor(actorId).kind !== "human")
        throw new Fault(403, "Original author required");
      this.store.run(
        "UPDATE work_consents SET revoked=1 WHERE post_id=? AND group_id=?",
        postId,
        groupId,
      );
      this.store.audit(actorId, "work.adoption.revoke", postId);
      return { ok: true };
    });
  }
  create(
    actorId: string,
    params: {
      groupId: string;
      communityId: string;
      title: string;
      description: string;
      originPostId?: string;
      contextIds?: string[];
      grantId?: string;
      mandateId?: string;
      requestKey: string;
    },
  ) {
    return this.store.tx(() => {
      const s = this.store;
      this.authorize(
        actorId,
        params.groupId,
        params.communityId,
        params.grantId,
        false,
      );
      if (s.community(params.communityId).visibility !== "public")
        throw new Fault(400, "Public discussion space required");
      if (!/^[a-f0-9-]{36}$/.test(params.requestKey))
        throw new Fault(400, "A stable request key is required");
      const contextIds = [
        ...new Set(
          strings(params.contextIds ?? []).map(
            (id) => this.groups.context(id).id,
          ),
        ),
      ];
      const content = {
        groupId: params.groupId,
        communityId: params.communityId,
        title: text(params.title, 160),
        description: text(params.description, 6000),
        originPostId: params.originPostId ?? null,
        contextIds: [...contextIds].sort(),
      };
      const digest = hash(canonical(content)),
        prior = s.get<{ target_id: string; digest: string }>(
          "SELECT target_id,digest FROM work_requests WHERE actor_id=? AND request_key=?",
          actorId,
          params.requestKey,
        );
      if (prior) {
        if (prior.digest !== digest)
          throw new Fault(409, "Request key already used for different work");
        return this.read(prior.target_id);
      }
      this.authorize(
        actorId,
        params.groupId,
        params.communityId,
        params.grantId,
      );
      if (params.originPostId) {
        const p = s.getPost(actorId, params.originPostId);
        if (s.community(p.community_id).visibility !== "public")
          throw new Fault(
            400,
            "Private discussions cannot become public references",
          );
        if (p.author_id !== actorId) {
          const consent = s.get<{
            digest: string;
            expires: number;
            revoked: number;
          }>(
            "SELECT digest,expires,revoked FROM work_consents WHERE post_id=? AND group_id=?",
            p.id,
            params.groupId,
          );
          if (
            !consent ||
            consent.revoked ||
            consent.expires <= s.clock() ||
            consent.digest !== hash(p.text)
          )
            throw new Fault(
              403,
              "Current author consent required to associate this discussion",
            );
        }
      }
      const id = randomUUID(),
        now = s.clock();
      s.run(
        "INSERT INTO public_work VALUES(?,?,?,?,?,?,?,1,NULL,?,?)",
        id,
        params.groupId,
        params.communityId,
        params.originPostId ?? null,
        content.title,
        content.description,
        params.originPostId ? "adopted" : "proposed",
        now,
        now,
      );
      for (const c of contextIds)
        s.run(
          "INSERT INTO record_contexts VALUES('work',?,?,?,?)",
          id,
          c,
          actorId,
          now,
        );
      const w = this.work(id);
      this.event(actorId, w, "open");
      // The item also reads as a post in the feed. An agent needs its posting mandate for that.
      if (s.actor(actorId).kind === "human" || params.mandateId) {
        const post = s.createPost(
          actorId,
          params.communityId,
          content.description,
          undefined,
          params.mandateId,
          { content: { title: content.title } },
        );
        s.run(
          "INSERT INTO work_posts VALUES(?,?,?,NULL,?,?,?)",
          post.id,
          id,
          params.groupId,
          this.status(w.state),
          now,
          now,
        );
      }
      s.run(
        "INSERT INTO work_requests VALUES(?,?,?,?)",
        actorId,
        params.requestKey,
        digest,
        id,
      );
      return this.read(id);
    });
  }
  read(id: string) {
    const w = this.publicWork(id),
      g = this.groups.group(w.group_id);
    const origin = w.origin_post_id
      ? this.store.get<Post>(
          "SELECT p.* FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.id=? AND p.hidden=0 AND c.visibility='public'",
          w.origin_post_id,
        )
      : undefined;
    const result = w.result_id
      ? this.store.get<{
          id: string;
          text: string;
          citations: string;
          digest: string;
          created: number;
        }>(
          "SELECT id,text,citations,digest,created FROM public_work_results WHERE id=?",
          w.result_id,
        )
      : undefined;
    return {
      ...w,
      origin_post_id: origin?.id ?? null,
      sponsor: {
        id: g.id,
        title: g.title,
        kind: g.kind,
        sponsorship: g.sponsorship,
      },
      contexts: this.groups.contextLinks("work", id),
      result: result
        ? { ...result, citations: JSON.parse(result.citations) as string[] }
        : null,
    };
  }
  list(options: { groupId?: string; contextId?: string } = {}) {
    const context = options.contextId
      ? this.groups.context(options.contextId).id
      : null;
    return this.store
      .all<{ id: string }>(
        `SELECT w.id FROM public_work w JOIN groups g ON g.id=w.group_id JOIN communities c ON c.id=w.community_id WHERE g.visibility='public' AND c.visibility='public' AND (? IS NULL OR w.group_id=?) AND (? IS NULL OR EXISTS(SELECT 1 FROM record_contexts l WHERE l.record_kind='work' AND l.record_id=w.id AND l.context_id=?)) ORDER BY w.updated DESC,w.id LIMIT 100`,
        options.groupId ?? null,
        options.groupId ?? null,
        context,
        context,
      )
      .map((w) => this.read(w.id));
  }
  update(
    actorId: string,
    id: string,
    revision: number,
    state: State,
    grantId?: string,
  ) {
    return this.store.tx(() => {
      const w = this.publicWork(id);
      this.authorize(actorId, w.group_id, w.community_id, grantId);
      if (!Number.isSafeInteger(revision) || revision !== w.revision)
        throw new Fault(409, "Work changed; review the current state");
      if (
        !["active", "blocked", "withdrawn"].includes(state) ||
        ["completed", "withdrawn"].includes(w.state)
      )
        throw new Fault(409, "Invalid work transition");
      if (state === "withdrawn" && this.store.actor(actorId).kind !== "human")
        throw new Fault(403, "Human sponsor withdrawal required");
      this.store.run(
        "UPDATE public_work SET state=?,revision=revision+1,updated=? WHERE id=?",
        state,
        this.store.clock(),
        id,
      );
      this.event(actorId, w, state);
      this.syncPost(id);
      return this.read(id);
    });
  }
  proposeResult(
    actorId: string,
    id: string,
    body: string,
    sourceUrls: string[],
    grantId?: string,
  ) {
    return this.store.tx(() => {
      const w = this.publicWork(id);
      this.authorize(actorId, w.group_id, w.community_id, grantId);
      if (["completed", "withdrawn"].includes(w.state))
        throw new Fault(409, "Work is settled");
      const content = {
          text: text(body, 50000),
          citations: citations(sourceUrls),
        },
        digest = hash(canonical(content)),
        rid = randomUUID();
      this.store.run(
        "INSERT INTO work_results VALUES(?,?,?,?,?,?,'pending',?,?)",
        rid,
        id,
        actorId,
        content.text,
        JSON.stringify(content.citations),
        digest,
        this.store.clock(),
        grantId ?? null,
      );
      this.event(actorId, w, "result.propose");
      return { id: rid, digest, state: "pending" };
    });
  }
  proposals(actorId: string, id: string) {
    const w = this.publicWork(id);
    this.groups.requireSteward(actorId, w.group_id);
    return this.store
      .all<Result>(
        "SELECT * FROM work_results WHERE work_id=? ORDER BY created DESC,id LIMIT 50",
        id,
      )
      .map((p) => ({ ...p, citations: JSON.parse(p.citations) as string[] }));
  }
  rejectResult(actorId: string, resultId: string, expectedDigest: string) {
    return this.store.tx(() => {
      const p =
          this.store.get<Result>(
            "SELECT * FROM work_results WHERE id=?",
            resultId,
          ) ?? missing(),
        w = this.publicWork(p.work_id);
      if (this.store.actor(actorId).kind !== "human")
        throw new Fault(403, "Human result review required");
      this.groups.requireSteward(actorId, w.group_id);
      if (p.state !== "pending" || p.digest !== expectedDigest)
        throw new Fault(409, "Review no longer matches current proposal");
      this.store.run(
        "UPDATE work_results SET state='rejected' WHERE id=?",
        resultId,
      );
      this.event(actorId, w, "result.reject");
      return { state: "rejected" };
    });
  }
  acceptResult(
    actorId: string,
    resultId: string,
    expectedDigest: string,
    revision: number,
  ) {
    return this.store.tx(() => {
      const p =
          this.store.get<Result>(
            "SELECT * FROM work_results WHERE id=?",
            resultId,
          ) ?? missing(),
        w = this.publicWork(p.work_id);
      if (this.store.actor(actorId).kind !== "human")
        throw new Fault(403, "Human result review required");
      this.authorize(actorId, w.group_id, w.community_id);
      if (
        p.state !== "pending" ||
        p.digest !== expectedDigest ||
        w.revision !== revision ||
        ["completed", "withdrawn"].includes(w.state)
      )
        throw new Fault(409, "Review no longer matches current work");
      this.authorize(
        p.author_id,
        w.group_id,
        w.community_id,
        p.grant_id ?? undefined,
        false,
      );
      if (!this.groups.role(p.author_id, w.group_id))
        throw new Fault(403, "Result author no longer admitted");
      const publicId = randomUUID();
      this.store.run(
        "INSERT INTO public_work_results VALUES(?,?,?,?,?,?,?,?)",
        publicId,
        w.id,
        p.id,
        p.text,
        p.citations,
        p.digest,
        this.store.clock(),
        actorId,
      );
      this.store.run(
        "UPDATE work_results SET state='accepted' WHERE id=?",
        resultId,
      );
      this.store.run(
        "UPDATE public_work SET state='completed',result_id=?,revision=revision+1,updated=? WHERE id=?",
        publicId,
        this.store.clock(),
        w.id,
      );
      this.event(actorId, w, "result.accept");
      this.syncPost(w.id);
      return this.read(w.id);
    });
  }
}
