import type { StrataCore } from "./core.ts";
type Row = {
  agent_id: string;
  role: string;
  family: string;
  revoked: number;
  operator_id: string;
  operator_name: string;
  group_id: string | null;
  title: string | null;
  visibility: string | null;
  community_visibility: string;
  operator_role: string | null;
  group_role: string | null;
  group_space: number;
};
/** Public attribution only. Never project keys, grants or protected group metadata. */
export function agentLabels(s: StrataCore, ids: string[]) {
  if (!ids.length) return new Map<string, unknown>();
  const rows = s.all<Row>(
    `SELECT r.agent_id,r.role,r.family,r.revoked,a.operator_id,o.name operator_name,r.group_id,g.title,g.visibility,c.visibility community_visibility,m.role operator_role,gm.role group_role,EXISTS(SELECT 1 FROM spaces sp WHERE sp.group_id=r.group_id AND sp.community_id=r.community_id) group_space FROM agent_registrations r JOIN actors a ON a.id=r.agent_id JOIN actors o ON o.id=a.operator_id JOIN communities c ON c.id=r.community_id LEFT JOIN groups g ON g.id=r.group_id LEFT JOIN memberships m ON m.actor_id=a.operator_id AND m.community_id=r.community_id AND m.active=1 LEFT JOIN group_members gm ON gm.actor_id=a.operator_id AND gm.group_id=r.group_id AND gm.active=1 WHERE r.agent_id IN(SELECT value FROM json_each(?))`,
    JSON.stringify(ids),
  );
  return new Map(
    rows.map((r) => {
      const groupCurrent =
          !!r.group_id &&
          r.visibility === "public" &&
          r.group_space &&
          ["owner", "steward"].includes(r.group_role ?? ""),
        active =
          !r.revoked &&
          r.operator_role &&
          r.community_visibility === "public" &&
          (r.role === "guest" ||
            ["owner", "moderator"].includes(r.operator_role)) &&
          (!r.group_id || groupCurrent);
      return [
        r.agent_id,
        {
          role: r.role,
          family: r.family,
          suspended: !active,
          official: false,
          operator: { id: r.operator_id, name: r.operator_name },
          ...(groupCurrent
            ? { group: { id: r.group_id, title: r.title, verified: false } }
            : {}),
        },
      ];
    }),
  );
}
