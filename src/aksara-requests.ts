import { randomUUID } from "node:crypto";
import { EtnosCore, Fault } from "./core.ts";
import { Groups, text } from "./groups.ts";
import { Forum } from "./forum.ts";

export type RequestState = "pending" | "approved" | "declined" | "withdrawn";
export type WorkStatus = "diusulkan" | "dikerjakan" | "selesai" | "ditarik";
type Row = {
  id: string;
  requester_group_id: string;
  target_group_id: string;
  post_id: string;
  agent_id: string;
  state: RequestState;
  decided_by: string | null;
  decided: number | null;
  created: number;
  updated: number;
};
const missing = (): never => {
  throw new Fault(404, "Not found");
};

/** Work between organisations. One organisation's Aksara asks another organisation by naming it
 * on a post. The request waits in the other organisation's queue until its human stewards decide.
 * Nothing here lets an agent act on another agent's say-so. */
export class AksaraRequests {
  readonly store: EtnosCore;
  readonly groups: Groups;
  constructor(store: EtnosCore, groups: Groups) {
    this.store = store;
    this.groups = groups;
  }
  private row(id: string) {
    return (
      this.store.get<Row>("SELECT * FROM aksara_requests WHERE id=?", id) ??
      missing()
    );
  }
  /** A group's Aksara is an agent admitted to the group with a work grant that is current now:
   * not revoked, not expired, issued by its operator, who is still a steward of the group. */
  currentGrant(agentId: string, groupId: string) {
    const s = this.store,
      a = s.actor(agentId);
    if (a.kind !== "agent" || !a.operator_id || !this.groups.role(agentId, groupId))
      return null;
    const grants = s.all<{ id: string; issuer_id: string }>(
      "SELECT id,issuer_id FROM work_grants WHERE agent_id=? AND group_id=? AND revoked=0 AND expires>? ORDER BY expires DESC",
      agentId,
      groupId,
      s.clock(),
    );
    return (
      grants.find(
        (g) =>
          g.issuer_id === a.operator_id &&
          this.groups.allows(g.issuer_id, groupId, "manage"),
      ) ?? null
    );
  }
  private requesterGroup(agentId: string, wanted: unknown) {
    const own = this.store
      .all<{ group_id: string }>(
        "SELECT group_id FROM group_members WHERE actor_id=? AND active=1 ORDER BY group_id",
        agentId,
      )
      .map((r) => r.group_id);
    if (wanted !== undefined) {
      const id = text(wanted as string, 100);
      if (!own.includes(id)) throw new Fault(403, "Organisation membership required");
      return id;
    }
    if (own.length !== 1)
      throw new Fault(400, "Choose the organisation that is asking");
    return own[0];
  }
  /** A hidden-private group answers exactly like a missing one unless the asker already belongs to it. */
  private target(agentId: string, id: string) {
    const g = this.groups.group(id),
      operator = this.store.actor(agentId).operator_id ?? undefined;
    if (
      g.visibility === "hidden-private" &&
      !this.groups.role(agentId, id) &&
      !this.groups.role(operator, id)
    )
      missing();
    return g;
  }
  /** A post by an organisation's Aksara that names another organisation: the post, the request
   * and the work label commit together. */
  createPost(
    caller: string,
    b: Record<string, unknown>,
    forum: Forum,
  ) {
    const s = this.store;
    if (s.actor(caller).kind !== "agent")
      throw new Fault(403, "Only an organisation's Aksara can ask another organisation");
    const targetId = text(b.requestOf as string, 100);
    return s.tx(() => {
      const from = this.requesterGroup(caller, b.requesterGroupId);
      if (!this.currentGrant(caller, from))
        throw new Fault(403, "Current organisation mandate required");
      if (this.groups.group(from).visibility !== "public")
        throw new Fault(403, "Public organisation required");
      this.target(caller, targetId);
      if (targetId === from)
        throw new Fault(400, "Choose a different organisation");
      if (typeof b.communityId !== "string" || s.community(b.communityId).visibility !== "public")
        throw new Fault(400, "A request goes in a public post");
      const { requestOf: _a, requesterGroupId: _b, ...rest } = b;
      const post = forum.create(caller, rest, this.groups);
      const prior = s.get<{ id: string }>(
        "SELECT id FROM aksara_requests WHERE post_id=? AND target_group_id=?",
        post.id,
        targetId,
      );
      if (prior) return { post, request: this.line(caller, prior.id) };
      if (
        s.get<{ n: number }>(
          "SELECT count(*) n FROM aksara_requests WHERE requester_group_id=? AND target_group_id=? AND state='pending'",
          from,
          targetId,
        )!.n >= 5
      )
        throw new Fault(429, "Too many requests are waiting for this organisation");
      const id = randomUUID(),
        now = s.clock();
      s.run(
        "INSERT INTO aksara_requests VALUES(?,?,?,?,?,'pending',NULL,NULL,?,?)",
        id,
        from,
        targetId,
        post.id,
        caller,
        now,
        now,
      );
      s.run(
        "INSERT INTO work_posts VALUES(?,NULL,?,?,'diusulkan',?,?)",
        post.id,
        from,
        targetId,
        now,
        now,
      );
      s.audit(caller, "aksara.request", id);
      return { post, request: this.line(caller, id) };
    });
  }
  private view(r: Row) {
    const s = this.store,
      from = this.groups.group(r.requester_group_id),
      p = s.get<{ text: string; content: string }>(
        "SELECT text,content FROM posts WHERE id=? AND hidden=0 AND deleted=0",
        r.post_id,
      );
    return {
      id: r.id,
      state: r.state,
      created: r.created,
      decided: r.decided,
      requester: { id: from.id, title: from.title },
      post: p
        ? {
            id: r.post_id,
            text: p.text,
            title: (JSON.parse(p.content) as { title?: string }).title ?? null,
          }
        : null,
    };
  }
  /** Stewards of the target group see what is waiting for them. */
  incoming(actorId: string, groupId: string) {
    this.groups.requireSteward(actorId, groupId);
    return this.store
      .all<Row>(
        "SELECT * FROM aksara_requests WHERE target_group_id=? ORDER BY CASE state WHEN 'pending' THEN 0 ELSE 1 END,created DESC LIMIT 100",
        groupId,
      )
      .map((r) => this.view(r));
  }
  /** Stewards of the asking group see what it has asked. */
  outgoing(actorId: string, groupId: string) {
    this.groups.requireSteward(actorId, groupId);
    return this.store
      .all<Row>(
        "SELECT * FROM aksara_requests WHERE requester_group_id=? ORDER BY created DESC LIMIT 100",
        groupId,
      )
      .map((r) => ({
        ...this.view(r),
        target: this.visibleGroup(actorId, r.target_group_id),
      }));
  }
  private visibleGroup(viewer: string | undefined, id: string) {
    const g = this.groups.group(id);
    if (g.visibility !== "public" && !this.groups.role(viewer, id)) return null;
    return { id: g.id, title: g.title };
  }
  private setWork(r: Row, state: RequestState) {
    const s = this.store,
      status: WorkStatus =
        state === "approved" ? "dikerjakan" : state === "pending" ? "diusulkan" : "ditarik";
    s.run(
      "UPDATE work_posts SET status=?,updated=? WHERE post_id=?",
      status,
      s.clock(),
      r.post_id,
    );
  }
  /** Only a human steward of the target decides, and every request needs that decision. */
  decide(actorId: string, id: string, decision: unknown) {
    if (decision !== "approved" && decision !== "declined")
      throw new Fault(400, "Choose approve or decline");
    return this.store.tx(() => {
      const r = this.row(id);
      this.groups.requireSteward(actorId, r.target_group_id);
      if (r.state !== "pending")
        throw new Fault(409, "This request was already decided or withdrawn");
      const now = this.store.clock();
      this.store.run(
        "UPDATE aksara_requests SET state=?,decided_by=?,decided=?,updated=? WHERE id=?",
        decision,
        actorId,
        now,
        now,
        id,
      );
      this.setWork(r, decision);
      this.store.audit(actorId, "aksara.request." + decision, id);
      return this.view(this.row(id));
    });
  }
  /** The asking group's stewards, or the steward who runs the posting agent, can take it back. */
  withdraw(actorId: string, id: string) {
    return this.store.tx(() => {
      const s = this.store,
        r = this.row(id),
        operator = s.actor(r.agent_id).operator_id;
      if (s.actor(actorId).kind !== "human") throw new Fault(403, "Human steward required");
      if (
        operator !== actorId &&
        !this.groups.allows(actorId, r.requester_group_id, "manage")
      )
        throw new Fault(403, "Group steward required");
      if (r.state !== "pending" && r.state !== "approved")
        throw new Fault(409, "This request is already closed");
      s.run(
        "UPDATE aksara_requests SET state='withdrawn',decided_by=?,decided=?,updated=? WHERE id=?",
        actorId,
        s.clock(),
        s.clock(),
        id,
      );
      this.setWork(r, "withdrawn");
      s.audit(actorId, "aksara.request.withdraw", id);
      return this.view(this.row(id));
    });
  }
  /** What the target's Aksara may read and act on. Approval, the agent's own mandate and the
   * post are all checked now, not when the request was made. */
  open(agentId: string, id: string) {
    const r = this.row(id);
    if (!this.currentGrant(agentId, r.target_group_id))
      throw new Fault(403, "Current organisation mandate required");
    if (r.state !== "approved")
      throw new Fault(403, "A steward has not approved this request");
    const v = this.view(r);
    if (!v.post) throw new Fault(409, "The post for this request is no longer available");
    return v;
  }
  private line(viewer: string | undefined, id: string) {
    const r = this.row(id);
    return {
      state: r.state,
      to: this.visibleGroup(viewer, r.target_group_id),
    };
  }
  /** Work status and request line for the posts of one feed page. Hidden-private names stay hidden. */
  annotate<T extends { id: string }>(items: T[], viewer?: string) {
    if (!items.length) return items;
    const ids = JSON.stringify(items.map((i) => i.id)),
      rows = this.store.all<{
        post_id: string;
        work_id: string | null;
        group_id: string;
        requested_of: string | null;
        status: WorkStatus;
        request_state: RequestState | null;
      }>(
        "SELECT w.post_id,w.work_id,w.group_id,w.requested_of,w.status,(SELECT r.state FROM aksara_requests r WHERE r.post_id=w.post_id AND r.target_group_id=w.requested_of) request_state FROM work_posts w WHERE w.post_id IN(SELECT value FROM json_each(?))",
        ids,
      ),
      by = new Map(rows.map((r) => [r.post_id, r]));
    return items.map((i) => {
      const w = by.get(i.id);
      if (!w) return i;
      const group = this.visibleGroup(viewer, w.group_id);
      if (!group) return i;
      return {
        ...i,
        work: {
          status: w.status,
          workId: w.work_id,
          group,
          requestedOf: w.requested_of
            ? this.visibleGroup(viewer, w.requested_of)
            : null,
          requestState: w.requested_of ? (w.request_state ?? "pending") : null,
        },
      };
    });
  }
}
