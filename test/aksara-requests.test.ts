import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Strata } from "../src/store.ts";
import { Groups } from "../src/groups.ts";
import { PublicWork } from "../src/public-work.ts";
import { Forum } from "../src/forum.ts";
import { AksaraRequests } from "../src/aksara-requests.ts";

function fixture() {
  let now = Date.parse("2026-11-20T00:00:00Z");
  const s = new Strata(":memory:", "https://strata.example", () => now),
    admin = s.provision("did:web:admin.example", "Node steward"),
    groups = new Groups(s, { stewardDid: admin.actor.did }),
    work = new PublicWork(s, groups),
    forum = new Forum(s),
    requests = new AksaraRequests(s, groups);
  const org = (name: string) => {
    const owner = s.provision(`did:web:${name}.example`, name + " steward"),
      member = s.provision(`did:web:${name}-member.example`, name + " member"),
      group = groups.create(owner.actor.id, name, "Synthetic", "institution", "public"),
      space = groups.createSpace(owner.actor.id, group.id, {
        title: name + " space",
        description: "Synthetic",
        visibility: "public",
        automation: true,
      });
    groups.requestSponsorship(owner.actor.id, group.id);
    groups.recognize(admin.actor.id, group.id, true);
    groups.setMember(owner.actor.id, group.id, member.actor.id, false);
    const agent = s.provision(`did:web:${name}-aksara.example`, name + " Aksara", owner.actor.id);
    groups.setMember(owner.actor.id, group.id, agent.actor.id, true);
    s.setMember(owner.actor.id, space.id, agent.actor.id, true);
    const mandate = s.mandate(owner.actor.id, agent.actor.id, space.id, "Posting", s.clock() + 86400000 * 3, 10);
    const grant = work.grant(owner.actor.id, group.id, agent.actor.id, s.clock() + 86400000, 5);
    return { owner, member, group, space, agent, mandate, grant };
  };
  const A = org("a"), B = org("b"), C = org("c");
  const outsider = s.provision("did:web:out.example", "Outsider");
  const ask = (from = A, to: string = B.group.id) =>
    requests.createPost(from.agent.actor.id, {
      communityId: from.space.id,
      text: "Aksara kami meminta bantuan untuk penelitian bersama.",
      mandateId: from.mandate,
      requestOf: to,
      requestKey: randomUUID(),
    }, forum);
  return { s, groups, work, forum, requests, A, B, C, outsider, ask, advance: (n: number) => (now += n) };
}

test("only the target's human stewards see and decide incoming requests", () => {
  const { s, requests, A, B, C, outsider, ask } = fixture();
  try {
    const made = ask();
    assert.equal(made.request.state, "pending");
    assert.equal(requests.incoming(B.owner.actor.id, B.group.id).length, 1);
    const id = requests.incoming(B.owner.actor.id, B.group.id)[0].id;
    for (const who of [A.owner, B.member, C.owner, outsider])
      assert.throws(() => requests.incoming(who.actor.id, B.group.id), /steward|Not found/);
    for (const who of [A.owner, B.member, C.owner, outsider])
      assert.throws(() => requests.decide(who.actor.id, id, "approved"), /steward|Not found/);
    assert.throws(() => requests.decide(B.agent.actor.id, id, "approved"), /steward/);
    assert.equal(requests.incoming(B.owner.actor.id, B.group.id)[0].state, "pending");
    assert.throws(() => ask(A, A.group.id), /different/);
    assert.throws(() => requests.createPost(A.owner.actor.id, { requestOf: B.group.id, communityId: A.space.id, text: "x" }, new Forum(s)), /Aksara/);
  } finally {
    s.close();
  }
});

test("the target's Aksara cannot act before approval, nor after decline or withdrawal", () => {
  const { s, requests, A, B, ask } = fixture();
  try {
    const first = ask(), id = requests.outgoing(A.owner.actor.id, A.group.id)[0].id;
    assert.throws(() => requests.open(B.agent.actor.id, id), /not approved/);
    assert.throws(() => requests.open(A.agent.actor.id, id), /mandate/);
    requests.decide(B.owner.actor.id, id, "approved");
    assert.equal(requests.open(B.agent.actor.id, id).requester.id, A.group.id);
    assert.throws(() => requests.open(A.agent.actor.id, id), /mandate/);
    assert.throws(() => requests.withdraw(B.owner.actor.id, id), /steward/);
    requests.withdraw(A.owner.actor.id, id);
    assert.throws(() => requests.open(B.agent.actor.id, id), /not approved/);
    assert.throws(() => requests.decide(B.owner.actor.id, id, "approved"), /already/);
    const second = ask(), id2 = requests.incoming(B.owner.actor.id, B.group.id).find((r) => r.state === "pending")!.id;
    requests.decide(B.owner.actor.id, id2, "declined");
    assert.throws(() => requests.open(B.agent.actor.id, id2), /not approved/);
    assert.notEqual(first.post.id, second.post.id);
  } finally {
    s.close();
  }
});

test("a revoked or expired mandate blocks the target's Aksara even after approval", () => {
  const { s, requests, work, A, B, ask, advance } = fixture();
  try {
    ask();
    const id = requests.incoming(B.owner.actor.id, B.group.id)[0].id;
    requests.decide(B.owner.actor.id, id, "approved");
    requests.open(B.agent.actor.id, id);
    work.revoke(B.owner.actor.id, B.grant.id);
    assert.throws(() => requests.open(B.agent.actor.id, id), /mandate/);
    const renewed = work.grant(B.owner.actor.id, B.group.id, B.agent.actor.id, s.clock() + 1000, 5);
    assert.ok(renewed.id);
    requests.open(B.agent.actor.id, id);
    advance(2000);
    assert.throws(() => requests.open(B.agent.actor.id, id), /mandate/);
  } finally {
    s.close();
  }
});

test("a hidden-private target is not revealed to non-members", () => {
  const { s, groups, requests, A, C, ask } = fixture();
  try {
    const hidden = groups.create(C.owner.actor.id, "Rahasia", "Synthetic", "collective", "hidden-private");
    assert.throws(() => ask(A, hidden.id), /Not found/);
    assert.throws(() => ask(A, randomUUID()), /Not found/);
    assert.throws(() => requests.incoming(A.owner.actor.id, hidden.id), /Not found/);
  } finally {
    s.close();
  }
});

test("requests show as work posts with their status, and the Kerja filter finds them", () => {
  const { s, requests, work, A, B, ask } = fixture();
  try {
    const made = ask();
    const page = s.feedPage(undefined, { work: true });
    assert.deepEqual(page.items.map((p) => p.id), [made.post.id]);
    const [item] = requests.annotate(page.items) as any[];
    assert.equal(item.work.status, "diusulkan");
    assert.equal(item.work.requestedOf.title, "b");
    assert.equal(item.work.requestState, "pending");
    requests.decide(B.owner.actor.id, requests.incoming(B.owner.actor.id, B.group.id)[0].id, "approved");
    assert.equal((requests.annotate([made.post]) as any[])[0].work.status, "dikerjakan");
    const w = work.create(A.owner.actor.id, { groupId: A.group.id, communityId: A.space.id, title: "Pekerjaan", description: "Isi", requestKey: randomUUID() });
    const both = s.feedPage(undefined, { work: true }).items;
    assert.equal(both.length, 2);
    work.update(A.owner.actor.id, w.id, 1, "active");
    const posts = requests.annotate(s.feedPage(undefined, { work: true }).items) as any[];
    assert.ok(posts.some((p) => p.work.workId === w.id && p.work.status === "dikerjakan"));
    assert.equal(s.feedPage(undefined, { aksara: false, sort: "discussed" }).nextCursor, null);
  } finally {
    s.close();
  }
});
