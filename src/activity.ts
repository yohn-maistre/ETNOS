import { Fault, StrataCore } from "./core.ts";

type ActivityRow = {
  id: string;
  kind:
    | "reply"
    | "wiki-review"
    | "wiki-decision"
    | "join-review"
    | "join-decision"
    | "dm-request"
    | "dm-message";
  target_id: string;
  title: string;
  detail: string;
  created: number;
  read_at: number | null;
};
/** A private, current-access projection. No notification stores a copy of content.
 * This bounded inbox covers the latest 100 eligible events, not push/DM delivery.
 */
export class Activity {
  private store: StrataCore;
  constructor(store: StrataCore) {
    this.store = store;
  }
  list(actorId: string) {
    const s = this.store,
      a = s.actor(actorId);
    // workerd limits compound SELECT terms; keep each projection below that limit.
    // Per-source top 100 contains every candidate for the merged top 100.
    const sources = [
      `
      SELECT 'reply:'||p.id AS id,'reply' AS kind,p.root_id AS target_id,c.title AS title,'Balasan baru' AS detail,p.created AS created
      FROM posts p JOIN posts parent ON parent.id=p.parent_id JOIN communities c ON c.id=p.community_id
      WHERE parent.author_id=?1 AND p.author_id!=?1 AND parent.hidden=0 AND p.hidden=0 AND parent.deleted=0 AND p.deleted=0 AND
        (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=?1 AND m.active=1))
      UNION ALL
      SELECT 'wiki-review:'||p.id,'wiki-review',w.id,w.title,'Usulan menunggu tinjauan',p.created
      FROM wiki_proposals p JOIN wiki_pages w ON w.id=p.page_id JOIN communities c ON c.id=w.community_id JOIN memberships m ON m.community_id=c.id
      WHERE ?2='human' AND c.visibility='public' AND p.state='pending' AND p.author_id!=?1 AND m.actor_id=?1 AND m.active=1 AND m.role IN ('owner','moderator')
      UNION ALL
      SELECT 'wiki-decision:'||p.id||':'||p.state,'wiki-decision',w.id,w.title,CASE p.state WHEN 'accepted' THEN 'Revisi diterima' ELSE 'Usulan ditolak' END,COALESCE(p.decided,p.created)
      FROM wiki_proposals p JOIN wiki_pages w ON w.id=p.page_id JOIN communities c ON c.id=w.community_id JOIN memberships m ON m.community_id=c.id
      WHERE c.visibility='public' AND p.state!='pending' AND p.author_id=?1 AND m.actor_id=?1 AND m.active=1
      UNION ALL
      SELECT 'join-review:'||r.community_id||':'||r.actor_id||':'||r.created,'join-review',c.id,c.title,'Permintaan bergabung',r.created
      FROM join_requests r JOIN communities c ON c.id=r.community_id JOIN memberships m ON m.community_id=c.id
      WHERE ?2='human' AND r.state='pending' AND r.actor_id!=?1 AND m.actor_id=?1 AND m.active=1 AND m.role IN ('owner','moderator')
      UNION ALL
      SELECT 'join-decision:'||r.community_id||':'||r.actor_id||':'||r.state||':'||COALESCE(r.decided,r.created),'join-decision',c.id,c.title,CASE r.state WHEN 'approved' THEN 'Permintaan bergabung diterima' ELSE 'Permintaan bergabung ditolak' END,COALESCE(r.decided,r.created)
      FROM join_requests r JOIN communities c ON c.id=r.community_id
      WHERE r.actor_id=?1 AND r.state!='pending' AND (c.visibility!='hidden-private' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=?1 AND m.active=1))
`,
      `      SELECT 'dm-request:'||t.id AS id,'dm-request' AS kind,t.id AS target_id,'Pesan privat' AS title,'Permintaan pesan' AS detail,t.updated AS created
      FROM dm_threads t WHERE t.recipient_id=?1 AND t.state='pending'
      UNION ALL
      SELECT 'dm-message:'||t.id||':'||t.version,'dm-message',t.id,'Pesan privat','Pesan baru',t.updated
      FROM dm_threads t LEFT JOIN dm_reads dr ON dr.thread_id=t.id AND dr.actor_id=?1
      WHERE (t.sender_id=?1 OR t.recipient_id=?1) AND t.state IN ('active','closed') AND t.version>COALESCE(dr.version,0)
        AND EXISTS(SELECT 1 FROM dm_envelopes e WHERE e.thread_id=t.id AND e.version>COALESCE(dr.version,0) AND e.sender_id!=?1)
`,
    ];
    const rows = sources
      .flatMap((source) =>
        s.all<ActivityRow>(
          `WITH events AS (${source}) SELECT e.*,r.read_at FROM events e LEFT JOIN activity_reads r ON r.event_key=e.id AND r.actor_id=?1 ORDER BY e.created DESC,e.id DESC LIMIT 100`,
          ...(source.includes("?2") ? [actorId, a.kind] : [actorId]),
        ),
      )
      .sort(
        (a, b) =>
          b.created - a.created || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
      )
      .slice(0, 100);
    const items = rows.map(({ target_id, read_at, ...row }) => ({
      ...row,
      read: read_at !== null,
      href: row.kind.startsWith("dm-")
        ? "/messages/" + target_id
        : row.kind === "reply"
          ? "/square/" + target_id
          : row.kind.startsWith("wiki")
            ? "/wiki/" + target_id
            : "/communities/" + target_id,
    }));
    return { items, unread: items.filter((i) => !i.read).length, window: 100 };
  }
  markRead(actorId: string, ids: unknown) {
    return this.store.tx(() => {
      if (
        !Array.isArray(ids) ||
        ids.length > 100 ||
        ids.some((id) => typeof id !== "string" || id.length > 240)
      )
        throw new Fault(400, "At most 100 activity identifiers required");
      const visible = new Set(this.list(actorId).items.map((i) => i.id));
      if (ids.some((id) => !visible.has(id)))
        throw new Fault(404, "Activity unavailable");
      for (const id of new Set(ids as string[]))
        this.store.run(
          "INSERT OR IGNORE INTO activity_reads VALUES(?,?,?)",
          actorId,
          id,
          this.store.clock(),
        );
      return this.list(actorId);
    });
  }
}
