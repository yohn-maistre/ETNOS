import { randomUUID } from "node:crypto";
import { StrataCore, Fault, type Community } from "./core.ts";

export type Group = {
  id: string;
  title: string;
  description: string;
  kind: "collective" | "institution";
  visibility: "public" | "hidden-private";
  sponsorship: "unrequested" | "pending" | "enabled" | "suspended";
  created: number;
};
export type GroupRole = "owner" | "steward" | "member";
export type GroupAction = "manage" | "work" | "read";
export interface GroupAuthority {
  allows(actorId: string, groupId: string, action: GroupAction): boolean;
}
export type Context = {
  id: string;
  slug: string;
  title: string;
  kind: "place" | "region" | "topic" | "language";
  description: string;
  language: string;
  aliases: string[];
  created: number;
};
type ContextRow = Omit<Context, "aliases"> & {
  aliases: string;
  active: number;
};
const missing = (): never => {
  throw new Fault(404, "Not found");
};
export function text(value: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Fault(400, "Invalid input");
  return value.trim();
}
export function strings(value: unknown, max = 10): string[] {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    value.some((x) => typeof x !== "string")
  )
    throw new Fault(400, "String array required");
  return [...new Set(value as string[])];
}

/** Local group authority does not inherit institutional/source or forum rights. */
export class Groups implements GroupAuthority {
  readonly store: StrataCore;
  readonly stewardDid?: string;
  constructor(store: StrataCore, options: { stewardDid?: string } = {}) {
    this.store = store;
    this.stewardDid = options.stewardDid;
  }
  nodeSteward(actorId: string) {
    const a = this.store.actor(actorId);
    if (a.kind !== "human" || !this.stewardDid || a.did !== this.stewardDid)
      throw new Fault(403, "Node steward required");
  }
  group(id: string) {
    return (
      this.store.get<Group>("SELECT * FROM groups WHERE id=?", id) ?? missing()
    );
  }
  role(actorId: string | undefined, groupId: string) {
    return actorId
      ? this.store.get<{ role: GroupRole }>(
          "SELECT role FROM group_members WHERE group_id=? AND actor_id=? AND active=1",
          groupId,
          actorId,
        )?.role
      : undefined;
  }
  allows(actorId: string, groupId: string, action: GroupAction) {
    const g = this.group(groupId),
      role = this.role(actorId, groupId);
    if (action === "read") return g.visibility === "public" || !!role;
    return (
      this.store.actor(actorId).kind === "human" &&
      !!role &&
      ["owner", "steward"].includes(role) &&
      (action !== "work" ||
        (g.visibility === "public" && g.sponsorship === "enabled"))
    );
  }
  requireSteward(actorId: string, groupId: string) {
    if (
      this.group(groupId).visibility === "hidden-private" &&
      !this.role(actorId, groupId)
    )
      missing();
    if (!this.allows(actorId, groupId, "manage"))
      throw new Fault(403, "Group steward required");
  }
  read(actorId: string | undefined, groupId: string) {
    const g = this.group(groupId);
    if (g.visibility !== "public" && !this.role(actorId, groupId)) missing();
    return {
      ...g,
      spaces: this.spaces(actorId, groupId),
      contexts: this.contextLinks("group", groupId),
    };
  }
  list(actorId?: string) {
    return this.store
      .all<Group>(
        `SELECT g.* FROM groups g WHERE g.visibility='public' OR EXISTS(SELECT 1 FROM group_members m WHERE m.group_id=g.id AND m.actor_id=? AND m.active=1) ORDER BY g.created DESC,g.id LIMIT 100`,
        actorId ?? null,
      )
      .map((g) => this.read(actorId, g.id));
  }
  memberships(actorId: string) {
    this.store.actor(actorId);
    return this.store.all<{ group_id: string; role: GroupRole }>(
      "SELECT group_id,role FROM group_members WHERE actor_id=? AND active=1",
      actorId,
    );
  }
  create(
    actorId: string,
    title: string,
    description: string,
    kind: Group["kind"],
    visibility: Group["visibility"],
  ) {
    if (this.store.actor(actorId).kind !== "human")
      throw new Fault(403, "Human group owner required");
    if (
      !["collective", "institution"].includes(kind) ||
      !["public", "hidden-private"].includes(visibility)
    )
      throw new Fault(400, "Invalid group policy");
    return this.store.tx(() => {
      const id = randomUUID();
      this.store.run(
        "INSERT INTO groups VALUES(?,?,?,?,?,'unrequested',?)",
        id,
        text(title, 100),
        text(description, 2000),
        kind,
        visibility,
        this.store.clock(),
      );
      this.store.run(
        "INSERT INTO group_members VALUES(?,?,'owner',1)",
        id,
        actorId,
      );
      this.store.audit(actorId, "group.create", id);
      return this.read(actorId, id);
    });
  }
  members(actorId: string, groupId: string) {
    this.requireSteward(actorId, groupId);
    return this.store.all<{
      actor_id: string;
      role: GroupRole;
      active: number;
      name: string;
      kind: string;
    }>(
      "SELECT m.actor_id,m.role,m.active,a.name,a.kind FROM group_members m JOIN actors a ON a.id=m.actor_id WHERE m.group_id=? ORDER BY a.name LIMIT 100",
      groupId,
    );
  }
  setMember(
    actorId: string,
    groupId: string,
    target: string,
    active: boolean,
    role: GroupRole = "member",
  ) {
    return this.store.tx(() => {
      this.requireSteward(actorId, groupId);
      const who = this.store.actor(target),
        prior = this.store.get<{ role: GroupRole }>(
          "SELECT role FROM group_members WHERE group_id=? AND actor_id=?",
          groupId,
          target,
        );
      if (!["steward", "member"].includes(role) || prior?.role === "owner")
        throw new Fault(403, "Ownership transfer is not implemented");
      if (
        (role === "steward" || prior?.role === "steward") &&
        this.role(actorId, groupId) !== "owner"
      )
        throw new Fault(403, "Group owner required");
      if (role === "steward" && who.kind !== "human")
        throw new Fault(403, "Human governance required");
      this.store.run(
        "INSERT INTO group_members VALUES(?,?,?,?) ON CONFLICT(group_id,actor_id) DO UPDATE SET role=excluded.role,active=excluded.active",
        groupId,
        target,
        role,
        Number(active),
      );
      if (!active)
        this.store.run(
          "UPDATE work_grants SET revoked=1 WHERE group_id=? AND (agent_id=? OR issuer_id=?)",
          groupId,
          target,
          target,
        );
      this.store.audit(
        actorId,
        active ? "group.member.admit" : "group.member.revoke",
        groupId,
      );
      return { ok: true };
    });
  }
  requestSponsorship(actorId: string, groupId: string) {
    return this.store.tx(() => {
      this.requireSteward(actorId, groupId);
      const g = this.group(groupId);
      if (g.visibility !== "public")
        throw new Fault(400, "Public sponsor profile required");
      if (g.sponsorship === "enabled") return { state: "enabled" };
      this.store.run(
        "UPDATE groups SET sponsorship='pending' WHERE id=?",
        groupId,
      );
      this.store.audit(actorId, "sponsorship.request", groupId);
      return { state: "pending" };
    });
  }
  recognize(actorId: string, groupId: string, enabled: boolean) {
    return this.store.tx(() => {
      this.nodeSteward(actorId);
      const g = this.group(groupId);
      if (g.visibility !== "public") missing();
      if (enabled && g.sponsorship !== "pending")
        throw new Fault(409, "Sponsor must request admission");
      this.store.run(
        "UPDATE groups SET sponsorship=? WHERE id=?",
        enabled ? "enabled" : "suspended",
        groupId,
      );
      if (!enabled)
        this.store.run(
          "UPDATE work_grants SET revoked=1 WHERE group_id=?",
          groupId,
        );
      this.store.audit(
        actorId,
        enabled ? "sponsorship.enable" : "sponsorship.suspend",
        groupId,
      );
      return this.read(actorId, groupId);
    });
  }
  spaces(actorId: string | undefined, groupId: string) {
    const g = this.group(groupId);
    if (g.visibility !== "public" && !this.role(actorId, groupId)) missing();
    return this.store.all<Community & { space_id: string; modality: "forum" }>(
      `SELECT c.*,s.id AS space_id,s.modality FROM spaces s JOIN communities c ON c.id=s.community_id WHERE s.group_id=? AND (c.visibility!='hidden-private' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1)) ORDER BY s.created,s.id LIMIT 100`,
      groupId,
      actorId ?? null,
    );
  }
  bind(actorId: string, groupId: string, communityId: string) {
    return this.store.tx(() => {
      this.requireSteward(actorId, groupId);
      if (this.store.membership(actorId, communityId)?.role !== "owner")
        throw new Fault(
          403,
          "Both group governance and space ownership required",
        );
      const prior = this.store.get<{ group_id: string }>(
        "SELECT group_id FROM spaces WHERE community_id=?",
        communityId,
      );
      if (prior) {
        if (prior.group_id !== groupId)
          throw new Fault(409, "Space already belongs to a group");
        return this.spaces(actorId, groupId);
      }
      this.store.run(
        "INSERT INTO spaces VALUES(?,?,?,'forum',?)",
        randomUUID(),
        groupId,
        communityId,
        this.store.clock(),
      );
      this.store.audit(actorId, "space.bind", communityId);
      return this.spaces(actorId, groupId);
    });
  }
  createSpace(
    actorId: string,
    groupId: string,
    params: {
      title: string;
      description: string;
      visibility: Community["visibility"];
      automation?: boolean;
    },
  ) {
    return this.store.tx(() => {
      this.requireSteward(actorId, groupId);
      const c = this.store.createCommunity(
        actorId,
        params.title,
        params.description,
        params.visibility,
        params.automation,
      );
      this.bind(actorId, groupId, c.id);
      return c;
    });
  }
  context(id: string) {
    const c =
      this.store.get<ContextRow>(
        "SELECT * FROM contexts WHERE (id=? OR slug=?) AND active=1",
        id,
        id,
      ) ?? missing();
    return this.contextView(c);
  }
  private contextView(c: ContextRow): Context {
    const { active: _active, ...rest } = c;
    return { ...rest, aliases: JSON.parse(c.aliases) as string[] };
  }
  contexts() {
    return this.store
      .all<ContextRow>(
        "SELECT * FROM contexts WHERE active=1 ORDER BY kind,title LIMIT 200",
      )
      .map((c) => this.contextView(c));
  }
  createContext(
    actorId: string,
    params: {
      slug: string;
      title: string;
      kind: Context["kind"];
      description: string;
      language: string;
      aliases: string[];
    },
  ) {
    return this.store.tx(() => {
      this.nodeSteward(actorId);
      if (
        !/^[a-z0-9][a-z0-9-]{1,63}$/.test(params.slug) ||
        !["place", "region", "topic", "language"].includes(params.kind)
      )
        throw new Fault(400, "Invalid public context");
      if (this.store.get("SELECT 1 FROM contexts WHERE slug=?", params.slug))
        throw new Fault(409, "Context slug already exists");
      const id = randomUUID(),
        aliases = strings(params.aliases, 20).map((a) => text(a, 100));
      this.store.run(
        "INSERT INTO contexts VALUES(?,?,?,?,?,?,?,?,1)",
        id,
        params.slug,
        text(params.title, 100),
        params.kind,
        text(params.description, 2000),
        text(params.language, 40),
        JSON.stringify(aliases),
        this.store.clock(),
      );
      this.store.audit(actorId, "context.create", id);
      return this.context(id);
    });
  }
  /** Node stewards may correct a public context's alternative names. `kabar:<slug>` names a news-desk place. */
  setContextAliases(actorId: string, contextId: string, value: unknown) {
    return this.store.tx(() => {
      this.nodeSteward(actorId);
      const c = this.context(contextId),
        aliases = [...new Set(strings(value, 20).map((a) => text(a, 100)))];
      this.store.run("UPDATE contexts SET aliases=? WHERE id=?", JSON.stringify(aliases), c.id);
      this.store.audit(actorId, "context.aliases", c.id);
      return this.context(c.id);
    });
  }
  contextLinks(kind: "post" | "group" | "wiki" | "work", recordId: string) {
    return this.store
      .all<ContextRow>(
        `SELECT c.* FROM record_contexts l JOIN contexts c ON c.id=l.context_id WHERE l.record_kind=? AND l.record_id=? AND c.active=1 ORDER BY c.title LIMIT 10`,
        kind,
        recordId,
      )
      .map((c) => this.contextView(c));
  }
  private authorizeContext(
    actorId: string,
    kind: "post" | "group" | "wiki" | "work",
    recordId: string,
  ) {
    if (this.store.actor(actorId).kind !== "human")
      throw new Fault(
        403,
        "Context disclosure needs a human author or steward",
      );
    if (kind === "post") {
      const p = this.store.getPost(actorId, recordId);
      if (this.store.community(p.community_id).visibility !== "public")
        throw new Fault(400, "Public contexts require public contributions");
      if (p.author_id !== actorId)
        this.store.requireSteward(actorId, p.community_id);
    } else if (kind === "group") {
      this.requireSteward(actorId, recordId);
      if (this.group(recordId).visibility !== "public")
        throw new Fault(400, "Public group profile required");
    } else if (kind === "wiki") {
      const page =
        this.store.get<{ community_id: string }>(
          "SELECT community_id FROM wiki_pages WHERE id=?",
          recordId,
        ) ?? missing();
      this.store.requireSteward(actorId, page.community_id);
      if (this.store.community(page.community_id).visibility !== "public")
        missing();
    } else
      throw new Fault(
        400,
        "Use the sponsored-work action to assign work contexts",
      );
  }
  attach(
    actorId: string,
    kind: "post" | "group" | "wiki" | "work",
    recordId: string,
    contextId: string,
  ) {
    return this.store.tx(() => {
      this.authorizeContext(actorId, kind, recordId);
      const c = this.context(contextId);
      const count = this.store.get<{ n: number }>(
        "SELECT count(*) AS n FROM record_contexts WHERE record_kind=? AND record_id=?",
        kind,
        recordId,
      )!.n;
      if (
        count >= 10 &&
        !this.store.get(
          "SELECT 1 FROM record_contexts WHERE record_kind=? AND record_id=? AND context_id=?",
          kind,
          recordId,
          c.id,
        )
      )
        throw new Fault(400, "At most 10 public contexts");
      this.store.run(
        "INSERT OR IGNORE INTO record_contexts VALUES(?,?,?,?,?)",
        kind,
        recordId,
        c.id,
        actorId,
        this.store.clock(),
      );
      this.store.audit(actorId, "context.attach", recordId);
      return this.contextLinks(kind, recordId);
    });
  }
  detach(
    actorId: string,
    kind: "post" | "group" | "wiki",
    recordId: string,
    contextId: string,
  ) {
    return this.store.tx(() => {
      this.authorizeContext(actorId, kind, recordId);
      const c = this.context(contextId);
      this.store.run(
        "DELETE FROM record_contexts WHERE record_kind=? AND record_id=? AND context_id=?",
        kind,
        recordId,
        c.id,
      );
      this.store.audit(actorId, "context.detach", recordId);
      return this.contextLinks(kind, recordId);
    });
  }
  contextDetail(id: string) {
    const c = this.context(id);
    const groups = this.store.all<Group>(
      `SELECT g.* FROM groups g WHERE g.visibility='public' AND EXISTS(SELECT 1 FROM record_contexts l WHERE l.record_kind='group' AND l.record_id=g.id AND l.context_id=?) ORDER BY g.title LIMIT 50`,
      c.id,
    );
    const pages = this.store.all<{
      id: string;
      title: string;
      community_id: string;
    }>(
      `SELECT w.id,w.title,w.community_id FROM wiki_pages w JOIN communities c ON c.id=w.community_id WHERE c.visibility='public' AND w.revision_id IS NOT NULL AND EXISTS(SELECT 1 FROM record_contexts l WHERE l.record_kind='wiki' AND l.record_id=w.id AND l.context_id=?) ORDER BY w.title LIMIT 50`,
      c.id,
    );
    return { ...c, groups, pages, newsPlaces: newsPlaces(c) };
  }
}

/** Public news-desk place slugs for a context: explicit `kabar:` aliases, else the slug of a place or region. */
export function newsPlaces(c: Pick<Context, "slug" | "kind" | "aliases">) {
  const explicit = c.aliases.flatMap((a) => {
    const slug = a.startsWith("kabar:") ? a.slice(6) : "";
    return /^[-a-z0-9]{1,100}$/.test(slug) ? [slug] : [];
  });
  if (explicit.length) return [...new Set(explicit)].slice(0, 8);
  return c.kind === "place" || c.kind === "region" ? [c.slug] : [];
}
