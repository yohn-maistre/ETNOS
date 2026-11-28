import { randomUUID } from "node:crypto";
import { EtnosCore, Fault, type Community } from "./core.ts";
import type { Catalogue } from "./catalogue.ts";

export type Group = {
  id: string;
  title: string;
  description: string;
  kind: "collective" | "institution";
  visibility: "public" | "hidden-private";
  sponsorship: "unrequested" | "pending" | "enabled" | "suspended";
  created: number;
};
export type SeedLabels = { pages: { title: string; contexts: string[] }[] };
export type GroupRole ="owner" | "steward" | "member";
export type LabelRole = "about" | "language";
export type GroupAction = "manage" | "work" | "read";
export interface GroupAuthority {
  allows(actorId: string, groupId: string, action: GroupAction): boolean;
}
export type Context = {
  id: string;
  slug: string;
  title: string;
  kind: "place" | "region" | "topic" | "language";
  /** Finer, deployment-defined grouping, e.g. `customary-region` or `province`. Empty when unset. */
  facet: string;
  description: string;
  language: string;
  aliases: string[];
  created: number;
};
export type ContextRef = Pick<Context, "id" | "slug" | "title" | "kind" | "facet">;
type ContextParams = {
  slug: string;
  title: string;
  kind: Context["kind"];
  facet?: string;
  description: string;
  language: string;
  aliases: string[];
};
const contextKinds = ["place", "region", "topic", "language"];
const slugRule = /^[a-z0-9][a-z0-9-]{1,63}$/;
const facetRule = /^(?:[a-z][a-z-]{0,39})?$/;
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
/** The first sentence of a post, plain, cut at a word and never mid-word. */
function excerpt(text: string, max = 120) {
  const plain = text.replace(/https?:\/\/\S+/g, "").replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim();
  const first = plain.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? plain;
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).replace(/[,;:]$/, "") + "…";
}

export class Groups implements GroupAuthority {
  readonly store: EtnosCore;
  readonly stewardDid?: string;
  constructor(store: EtnosCore, options: { stewardDid?: string } = {}) {
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
      hiddenSpaces: this.hiddenSpaceCount(actorId, groupId),
      contexts: this.contextLinks("group", groupId),
    };
  }
  /** Owner decision (19 November): a public lembaga page says how many hidden private communities it has, never
   * their names. Only public lembaga show the count, and communities the reader already belongs to are listed, not counted.
   * A lembaga may choose to show nothing (lembaga_profiles.hide_count), and a community still forming is not counted. */
  hiddenSpaceCount(actorId: string | undefined, groupId: string) {
    if (this.group(groupId).visibility !== "public") return 0;
    if (this.store.get<{ hide_count: number }>("SELECT hide_count FROM lembaga_profiles WHERE group_id=?", groupId)?.hide_count) return 0;
    return (
      this.store.get<{ n: number }>(
        `SELECT COUNT(*) n FROM spaces s JOIN communities c ON c.id=s.community_id WHERE s.group_id=? AND c.visibility='hidden-private' AND c.forming_until IS NULL AND NOT EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1)`,
        groupId,
        actorId ?? null,
      )?.n ?? 0
    );
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
  /** Every public context with its parent ids, so a directory can draw the hierarchy in one read. */
  contexts() {
    const parents = new Map<string, string[]>();
    for (const l of this.store.all<{ context_id: string; parent_id: string }>(
      "SELECT l.context_id,l.parent_id FROM context_parents l JOIN contexts p ON p.id=l.parent_id AND p.active=1 ORDER BY l.created,l.parent_id LIMIT 5000",
    ))
      parents.set(l.context_id, [...(parents.get(l.context_id) ?? []), l.parent_id]);
    // What a map may shade by: reviewed pages, organisations and communities that
    // are public right now and carry the label directly. Nothing private is counted.
    const indexed = new Map<string, number>();
    for (const r of this.store.all<{ id: string; n: number }>(
      `SELECT id,SUM(n) n FROM(
        SELECT l.context_id id,COUNT(*) n FROM record_contexts l JOIN wiki_pages w ON w.id=l.record_id JOIN communities c ON c.id=w.community_id WHERE l.record_kind='wiki' AND c.visibility='public' AND w.revision_id IS NOT NULL GROUP BY l.context_id
        UNION ALL SELECT l.context_id,COUNT(*) FROM record_contexts l JOIN groups g ON g.id=l.record_id WHERE l.record_kind='group' AND g.visibility='public' GROUP BY l.context_id
        UNION ALL SELECT l.context_id,COUNT(*) FROM community_contexts l JOIN communities c ON c.id=l.community_id WHERE c.visibility='public' GROUP BY l.context_id
      ) GROUP BY id`,
    ))
      indexed.set(r.id, r.n);
    return this.store
      .all<ContextRow>(
        "SELECT * FROM contexts WHERE active=1 ORDER BY kind,title LIMIT 1000",
      )
      .map((c) => ({ ...this.contextView(c), parents: parents.get(c.id) ?? [], indexed: indexed.get(c.id) ?? 0 }));
  }
  createContext(actorId: string, params: ContextParams) {
    return this.store.tx(() => {
      this.nodeSteward(actorId);
      this.validContext(params);
      if (this.store.get("SELECT 1 FROM contexts WHERE slug=?", params.slug))
        throw new Fault(409, "Context slug already exists");
      const id = this.insertContext(params);
      this.store.audit(actorId, "context.create", id);
      return this.context(id);
    });
  }
  private validContext(params: ContextParams) {
    if (
      !params ||
      typeof params.slug !== "string" ||
      !slugRule.test(params.slug) ||
      !contextKinds.includes(params.kind) ||
      typeof (params.facet ?? "") !== "string" ||
      !facetRule.test(params.facet ?? "")
    )
      throw new Fault(400, "Invalid public context");
  }
  private insertContext(params: ContextParams) {
    this.validContext(params);
    const id = randomUUID(),
      aliases = strings(params.aliases, 20).map((a) => text(a, 100));
    this.store.run(
      "INSERT INTO contexts(id,slug,title,kind,description,language,aliases,created,active,facet) VALUES(?,?,?,?,?,?,?,?,1,?)",
      id,
      params.slug,
      text(params.title, 100),
      params.kind,
      text(params.description, 2000),
      text(params.language, 40),
      JSON.stringify(aliases),
      this.store.clock(),
      params.facet ?? "",
    );
    return id;
  }
  /** True when `parentId` already descends from `childId`, so linking would close a loop. */
  private wouldCycle(childId: string, parentId: string) {
    return !!this.store.get(
      "WITH RECURSIVE up(id,depth) AS (SELECT ?,0 UNION SELECT l.parent_id,up.depth+1 FROM context_parents l JOIN up ON l.context_id=up.id WHERE up.depth<64) SELECT 1 FROM up WHERE id=? LIMIT 1",
      parentId,
      childId,
    );
  }
  private linked(childId: string, parentId: string) {
    return !!this.store.get(
      "SELECT 1 FROM context_parents WHERE context_id=? AND parent_id=?",
      childId,
      parentId,
    );
  }
  private insertLink(actorId: string, childId: string, parentId: string) {
    if (childId === parentId || this.wouldCycle(childId, parentId))
      throw new Fault(409, "Context hierarchy cannot loop");
    if (
      this.store.get<{ n: number }>(
        "SELECT count(*) n FROM context_parents WHERE context_id=?",
        childId,
      )!.n >= 20
    )
      throw new Fault(400, "At most 20 parent contexts");
    this.store.run(
      "INSERT INTO context_parents(context_id,parent_id,issuer_id,created) VALUES(?,?,?,?)",
      childId,
      parentId,
      actorId,
      this.store.clock(),
    );
  }
  /** Node stewards place a public context under another; a regency may sit under a province and a region. */
  linkContext(actorId: string, contextId: string, parentId: string) {
    return this.store.tx(() => {
      this.nodeSteward(actorId);
      const child = this.context(contextId),
        parent = this.context(parentId);
      if (!this.linked(child.id, parent.id)) {
        this.insertLink(actorId, child.id, parent.id);
        this.store.audit(actorId, "context.link", child.id);
      }
      return this.contextDetail(child.id);
    });
  }
  unlinkContext(actorId: string, contextId: string, parentId: string) {
    return this.store.tx(() => {
      this.nodeSteward(actorId);
      const child = this.context(contextId),
        parent = this.context(parentId);
      if (this.linked(child.id, parent.id)) {
        this.store.run(
          "DELETE FROM context_parents WHERE context_id=? AND parent_id=?",
          child.id,
          parent.id,
        );
        this.store.audit(actorId, "context.unlink", child.id);
      }
      return this.contextDetail(child.id);
    });
  }
  /** Idempotent catalogue load. Creates missing contexts and adds missing aliases
   * and parent links; fills only empty fields; never deletes, renames or rewrites
   * what a steward edited. Retired contexts stay retired, and records attached to
   * contexts are not touched. */
  importCatalogue(actorId: string, catalogue: Catalogue) {
    return this.store.tx(() => {
      this.nodeSteward(actorId);
      if (!catalogue || !Array.isArray(catalogue.entries) || catalogue.entries.length > 2000)
        throw new Fault(400, "Invalid catalogue");
      const seen = new Set<string>();
      for (const e of catalogue.entries) {
        this.validContext(e);
        if (seen.has(e.slug) || !Array.isArray(e.parents) || e.parents.some((p) => typeof p !== "string"))
          throw new Fault(400, "Invalid catalogue entry");
        seen.add(e.slug);
      }
      let created = 0,
        updated = 0,
        skipped = 0,
        linked = 0,
        refused = 0;
      for (const e of catalogue.entries) {
        const row = this.store.get<ContextRow>("SELECT * FROM contexts WHERE slug=?", e.slug);
        if (!row) {
          this.insertContext(e);
          created++;
          continue;
        }
        if (!row.active) {
          skipped++;
          continue;
        }
        const aliases = JSON.parse(row.aliases) as string[],
          additions = strings(e.aliases, 20)
            .map((a) => text(a, 100))
            .filter((a) => !aliases.includes(a))
            .slice(0, Math.max(0, 20 - aliases.length)),
          facet = row.facet || e.facet || "",
          title = row.title.trim() && !(Array.isArray(e.previousTitles) && e.previousTitles.includes(row.title)) ? row.title : text(e.title, 100),
          // A description is replaced only when it is still, word for word, one this
          // catalogue wrote earlier. Anything a steward typed never matches.
          earlier = Array.isArray(e.previous) && e.previous.includes(row.description),
          description = row.description.trim() && !earlier ? row.description : text(e.description, 2000);
        if (!additions.length && facet === row.facet && title === row.title && description === row.description) {
          skipped++;
          continue;
        }
        this.store.run(
          "UPDATE contexts SET title=?,description=?,facet=?,aliases=? WHERE id=?",
          title,
          description,
          facet,
          JSON.stringify([...aliases, ...additions]),
          row.id,
        );
        updated++;
      }
      const active = (slug: string) =>
        this.store.get<{ id: string }>("SELECT id FROM contexts WHERE slug=? AND active=1", slug)?.id;
      for (const e of catalogue.entries) {
        const child = active(e.slug);
        for (const slug of e.parents) {
          const parent = active(slug);
          if (child && parent && this.linked(child, parent)) continue;
          if (!child || !parent) {
            refused++;
            continue;
          }
          try {
            this.insertLink(actorId, child, parent);
            linked++;
          } catch (error) {
            // A steward's own link already points the other way, or the context is full.
            if (!(error instanceof Fault)) throw error;
            refused++;
          }
        }
      }
      if (created || updated || linked)
        this.store.audit(actorId, "context.catalogue", text(catalogue.name, 100));
      return { created, updated, linked, skipped, refused };
    });
  }
  /** Node stewards may correct a public context's alternative names. `kabar:<slug>` names a news-desk place. */
  /**
   * First labels for seed wiki pages, applied by the node steward. Pages are matched by exact title among
   * published pages in public communities only; drafts, hidden pages and private communities are never touched.
   * Idempotent: a label already present is counted, not added twice. Retired contexts are skipped.
   */
  applySeedLabels(actorId: string, seed: SeedLabels) {
    return this.store.tx(() => {
      this.nodeSteward(actorId);
      if (
        !seed ||
        !Array.isArray(seed.pages) ||
        seed.pages.length > 500 ||
        seed.pages.some((e) => typeof e?.title !== "string" || !Array.isArray(e.contexts) || e.contexts.length > 10 || e.contexts.some((c) => typeof c !== "string"))
      )
        throw new Fault(400, "Invalid seed labels");
      let added = 0,
        present = 0;
      const missingPages: string[] = [],
        missingContexts = new Set<string>();
      for (const entry of seed.pages) {
        const pages = this.store.all<{ id: string }>(
          "SELECT w.id FROM wiki_pages w JOIN communities c ON c.id=w.community_id WHERE w.title=? AND c.visibility='public' AND w.draft=0 AND w.revision_id IS NOT NULL",
          text(entry.title, 200),
        );
        if (!pages.length) {
          missingPages.push(entry.title);
          continue;
        }
        for (const slug of entry.contexts) {
          const c = this.store.get<{ id: string }>("SELECT id FROM contexts WHERE slug=? AND active=1", slug);
          if (!c) {
            missingContexts.add(slug);
            continue;
          }
          for (const page of pages) {
            if (this.store.get("SELECT 1 FROM record_contexts WHERE record_kind='wiki' AND record_id=? AND context_id=?", page.id, c.id)) {
              present++;
              continue;
            }
            const count = this.store.get<{ n: number }>("SELECT count(*) AS n FROM record_contexts WHERE record_kind='wiki' AND record_id=?", page.id)!.n;
            if (count >= 10) continue;
            this.store.run("INSERT INTO record_contexts VALUES('wiki',?,?,?,?)", page.id, c.id, actorId, this.store.clock());
            added++;
          }
        }
      }
      this.store.audit(actorId, "context.seed-labels", "seed");
      return { added, present, missingPages, missingContexts: [...missingContexts] };
    });
  }
  /**
   * Retire a context (node steward only), or bring it back. A retired context drops out of every list, picker,
   * feed filter and thing page, because each of those reads active=1; its labels and history stay stored and the
   * catalogue import never revives it.
   */
  retireContext(actorId: string, contextId: string, retired: boolean) {
    return this.store.tx(() => {
      this.nodeSteward(actorId);
      const row = this.store.get<{ id: string; active: number }>("SELECT id,active FROM contexts WHERE id=? OR slug=?", contextId, contextId) ?? missing();
      this.store.run("UPDATE contexts SET active=? WHERE id=?", retired ? 0 : 1, row.id);
      if (Boolean(row.active) === retired) this.store.audit(actorId, retired ? "context.retire" : "context.restore", row.id);
      return { id: row.id, retired };
    });
  }
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
  /**
   * What is being talked about: places, languages and topics ranked by public posts in the last `days` days.
   * A post counts for a context when its thread is labelled with it or its community is. Only public
   * communities, never hidden, deleted or content-warned posts, and never a thread whose root is gone.
   * Each item names its busiest thread so Jelajah can link straight to it.
   */
  talked(days = 7) {
    const window = Math.min(Math.max(Math.trunc(Number.isFinite(days) ? days : 7), 1), 90);
    const since = this.store.clock() - window * 86400000;
    const visible = `SELECT p.id,COALESCE(p.root_id,p.id) root,p.community_id,p.author_id FROM posts p
      JOIN communities c ON c.id=p.community_id JOIN posts r ON r.id=COALESCE(p.root_id,p.id)
      WHERE c.visibility='public' AND p.hidden=0 AND p.deleted=0 AND r.hidden=0 AND r.deleted=0 AND p.created>=?
      AND COALESCE(json_extract(p.content,'$.warning'),'')='' AND COALESCE(json_extract(r.content,'$.warning'),'')=''`;
    const tagged = `WITH v AS (${visible}),
      t AS (SELECT v.*,l.context_id FROM v JOIN record_contexts l ON l.record_kind='post' AND l.record_id=v.root
        UNION SELECT v.*,cc.context_id FROM v JOIN community_contexts cc ON cc.community_id=v.community_id AND cc.role='about')`;
    const rows = this.store.all<ContextRow & { posts: number; threads: number; people: number }>(
      `${tagged} SELECT x.*,count(DISTINCT t.id) posts,count(DISTINCT t.root) threads,count(DISTINCT CASE WHEN a.kind='human' THEN t.author_id END) people
       FROM t JOIN contexts x ON x.id=t.context_id AND x.active=1 JOIN actors a ON a.id=t.author_id
       GROUP BY x.id HAVING people>0 ORDER BY people DESC,threads DESC,posts DESC,x.title LIMIT 12`,
      since,
    );
    if (!rows.length) return { days: window, items: [] };
    const leads = new Map(
      this.store
        .all<{ context_id: string; root: string; n: number; title: string | null; text: string; rank: number }>(
          `${tagged}, c AS (SELECT t.context_id,t.root,count(*) n FROM t JOIN actors a ON a.id=t.author_id WHERE t.context_id IN (SELECT value FROM json_each(?)) GROUP BY t.context_id,t.root HAVING sum(a.kind='human')>0)
           SELECT * FROM (SELECT c.context_id,c.root,c.n,json_extract(r.content,'$.title') title,r.text,ROW_NUMBER() OVER(PARTITION BY c.context_id ORDER BY c.n DESC,r.created DESC) rank FROM c JOIN posts r ON r.id=c.root) WHERE rank=1`,
          since,
          JSON.stringify(rows.map((r) => r.id)),
        )
        .map((l) => [l.context_id, { id: l.root, title: l.title ? excerpt(l.title) : excerpt(l.text) }]),
    );
    return {
      days: window,
      items: rows.map(({ posts, threads, people, ...c }) => ({ context: this.contextView(c), posts, threads, people, lead: leads.get(c.id) ?? null })),
    };
  }
  /** Public labels a community carries, each with its role: what it is about or where it is (`about`), or a
   * language its people write in (`language`, shown as "Bahasa yang dipakai"). A hidden community has none to
   * show, whatever is stored. */
  communityContexts(communityId: string) {
    if (this.store.community(communityId).visibility === "hidden-private") return [];
    return this.store
      .all<ContextRow & { role: LabelRole }>(
        "SELECT c.*,l.role FROM community_contexts l JOIN contexts c ON c.id=l.context_id WHERE l.community_id=? AND c.active=1 ORDER BY l.role,c.kind,c.title LIMIT 20",
        communityId,
      )
      .map(({ role, ...c }) => ({ ...this.contextView(c), role }));
  }
  /**
   * A human steward of a listed community says where it belongs, what it is about, or which languages its
   * people write in. The label is public, so a hidden community can never carry one; it grants no membership.
   * Without a role, a language is taken as "Bahasa yang dipakai" and anything else as "tentang", as before.
   */
  labelCommunity(actorId: string, communityId: string, contextId: string, remove = false, role?: LabelRole) {
    return this.store.tx(() => {
      if (this.store.actor(actorId).kind !== "human")
        throw new Fault(403, "Context disclosure needs a human steward");
      this.store.requireSteward(actorId, communityId);
      // A forming community is stored hidden; its labels wait with it and show once it opens.
      const target = this.store.community(communityId);
      if (target.visibility === "hidden-private" && (target.founding_visibility ?? "hidden-private") === "hidden-private")
        throw new Fault(400, "Hidden communities cannot carry public contexts");
      const c = this.context(contextId);
      if (role !== undefined && !["about", "language"].includes(role)) throw new Fault(400, "Invalid label role");
      const as: LabelRole = role ?? (c.kind === "language" ? "language" : "about");
      if (as === "language" && c.kind !== "language") throw new Fault(400, "Only a language can be a language in use");
      if (remove)
        this.store.run(
          "DELETE FROM community_contexts WHERE community_id=? AND context_id=?",
          communityId,
          c.id,
        );
      else {
        const held = this.store.all<{ context_id: string; role: LabelRole }>(
          "SELECT context_id,role FROM community_contexts WHERE community_id=?",
          communityId,
        );
        // Ten of each role: places and topics, and languages in use.
        if (held.filter((h) => h.role === as).length >= 10 && !held.some((h) => h.context_id === c.id))
          throw new Fault(400, "At most 10 public contexts");
        this.store.run(
          "INSERT INTO community_contexts(community_id,context_id,issuer_id,created,role) VALUES(?,?,?,?,?) ON CONFLICT(community_id,context_id) DO UPDATE SET role=excluded.role",
          communityId,
          c.id,
          actorId,
          this.store.clock(),
          as,
        );
      }
      this.store.audit(actorId, remove ? "community.unlabel" : "community.label", communityId);
      return this.communityContexts(communityId);
    });
  }
  /** The lembaga a community sits under, if it is public or the reader belongs to it. */
  communityGroup(actorId: string | undefined, communityId: string) {
    const g = this.store.get<Group>("SELECT g.* FROM spaces s JOIN groups g ON g.id=s.group_id WHERE s.community_id=?", communityId);
    if (!g || (g.visibility !== "public" && !this.role(actorId, g.id))) return null;
    return { id: g.id, title: g.title, kind: g.kind };
  }
  /** A community leaves its lembaga. Its owner or a steward of the lembaga may do this. */
  unbind(actorId: string, communityId: string) {
    return this.store.tx(() => {
      const prior = this.store.get<{ group_id: string }>("SELECT group_id FROM spaces WHERE community_id=?", communityId) ?? missing();
      const owner = this.store.membership(actorId, communityId)?.role === "owner" && this.store.actor(actorId).kind === "human";
      if (!owner && !this.allows(actorId, prior.group_id, "manage")) throw new Fault(403, "Community owner or group steward required");
      this.store.run("DELETE FROM spaces WHERE community_id=?", communityId);
      this.store.audit(actorId, "space.unbind", communityId);
      return { ok: true };
    });
  }
  /** Lembaga the person stewards, for "Dikelola oleh". */
  stewarded(actorId: string) {
    return this.store.all<Pick<Group, "id" | "title" | "kind" | "visibility">>(
      "SELECT g.id,g.title,g.kind,g.visibility FROM group_members m JOIN groups g ON g.id=m.group_id WHERE m.actor_id=? AND m.active=1 AND m.role IN ('owner','steward') ORDER BY g.title LIMIT 50",
      actorId,
    );
  }
  /**
   * Listed communities labelled with this context or anything beneath it, so a
   * region lists what its regencies hold. Visibility is read now, not when the
   * label was made. No member lists or counts.
   */
  communitiesIn(contextId: string) {
    const rows = this.store.all<{
      id: string;
      title: string;
      description: string;
      visibility: Community["visibility"];
      admission: Community["admission"];
      via_id: string;
      via_slug: string;
      via_title: string;
      depth: number;
    }>(
      `WITH RECURSIVE down(id,depth) AS (SELECT ?,0 UNION SELECT l.context_id,down.depth+1 FROM context_parents l JOIN down ON l.parent_id=down.id WHERE down.depth<8)
       SELECT c.id,c.title,c.description,c.visibility,c.admission,x.id via_id,x.slug via_slug,x.title via_title,min(d.depth) depth
       FROM (SELECT id,min(depth) depth FROM down GROUP BY id) d JOIN community_contexts l ON l.context_id=d.id
       JOIN contexts x ON x.id=l.context_id AND x.active=1 JOIN communities c ON c.id=l.community_id
       WHERE c.visibility!='hidden-private' GROUP BY c.id ORDER BY c.title LIMIT 100`,
      contextId,
    );
    return rows.map(({ via_id, via_slug, via_title, depth, ...c }) => ({
      ...c,
      via: depth ? { id: via_id, slug: via_slug, title: via_title } : null,
      kinds: this.store.all<{ id: string; slug: string; title: string }>(
        "SELECT x.id,x.slug,x.title FROM community_contexts l JOIN contexts x ON x.id=l.context_id WHERE l.community_id=? AND x.active=1 AND x.kind='topic' AND x.id!=? ORDER BY x.facet DESC,x.title LIMIT 3",
        c.id,
        contextId,
      ),
    }));
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
    const parents = this.store.all<ContextRef>(
      "SELECT p.id,p.slug,p.title,p.kind,p.facet FROM context_parents l JOIN contexts p ON p.id=l.parent_id WHERE l.context_id=? AND p.active=1 ORDER BY l.created,p.title LIMIT 20",
      c.id,
    );
    const children = this.store.all<ContextRef>(
      "SELECT x.id,x.slug,x.title,x.kind,x.facet FROM context_parents l JOIN contexts x ON x.id=l.context_id WHERE l.parent_id=? AND x.active=1 ORDER BY x.title LIMIT 200",
      c.id,
    );
    const childCount = this.store.get<{ n: number }>(
      "SELECT count(*) n FROM context_parents l JOIN contexts x ON x.id=l.context_id WHERE l.parent_id=? AND x.active=1",
      c.id,
    )!.n;
    return { ...c, groups, pages, parents, children, childCount, communities: this.communitiesIn(c.id), newsPlaces: newsPlaces(c) };
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
