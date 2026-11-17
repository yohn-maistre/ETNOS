import { test } from "node:test";
import assert from "node:assert/strict";
import { Strata } from "../src/store.ts";
import { Activity } from "../src/activity.ts";
import { Wiki } from "../src/wiki.ts";
import { api } from "../src/api.ts";

test("activity rechecks private admission, hidden posts and per-account read state without content snapshots", () => {
  const s = new Strata(":memory:"),
    activity = new Activity(s),
    owner = s.provision("did:web:owner.example", "Owner"),
    member = s.provision("did:web:member.example", "Member"),
    other = s.provision("did:web:other.example", "Other");
  try {
    const privateSpace = s.createCommunity(
      owner.actor.id,
      "Hidden staff",
      "Synthetic",
      "hidden-private",
    );
    s.setMember(owner.actor.id, privateSpace.id, member.actor.id, true);
    const root = s.createPost(
        member.actor.id,
        privateSpace.id,
        "Sensitive original",
      ),
      reply = s.createPost(
        owner.actor.id,
        privateSpace.id,
        "Sensitive answer",
        root.id,
      );
    const inbox = activity.list(member.actor.id);
    assert.equal(inbox.items.length, 1);
    assert.equal(inbox.unread, 1);
    assert.equal(inbox.items[0].href, "/square/" + root.id);
    assert.equal(JSON.stringify(inbox).includes(reply.text), false);
    assert.equal(activity.list(other.actor.id).items.length, 0);
    assert.throws(
      () => activity.markRead(other.actor.id, [inbox.items[0].id]),
      /unavailable/,
    );
    assert.equal(
      activity.markRead(member.actor.id, [inbox.items[0].id]).unread,
      0,
    );
    s.setMember(owner.actor.id, privateSpace.id, member.actor.id, false);
    assert.deepEqual(activity.list(member.actor.id).items, []);
    assert.throws(
      () => activity.markRead(member.actor.id, [inbox.items[0].id]),
      /unavailable/,
    );
    s.setMember(owner.actor.id, privateSpace.id, member.actor.id, true);
    assert.equal(activity.list(member.actor.id).unread, 0);
    s.hidePost(owner.actor.id, reply.id);
    assert.deepEqual(activity.list(member.actor.id).items, []);
  } finally {
    s.close();
  }
});

test("Wiki and membership review activity requires current authority; decisions stay in the recipient inbox", () => {
  let now = 1000;
  const s = new Strata(":memory:", "http://localhost:7342", () => now),
    activity = new Activity(s),
    wiki = new Wiki(s),
    owner = s.provision("did:web:owner.example", "Owner"),
    member = s.provision("did:web:member.example", "Member");
  try {
    const space = s.createCommunity(
      owner.actor.id,
      "Public forum",
      "Synthetic",
      "public",
      false,
      "approval",
    );
    s.requestJoin(member.actor.id, space.id, "Join please");
    assert.equal(activity.list(owner.actor.id).items[0].kind, "join-review");
    assert.equal(activity.list(member.actor.id).items.length, 0);
    now = 2000;
    s.decideJoin(owner.actor.id, space.id, member.actor.id, true);
    assert.equal(activity.list(owner.actor.id).items.length, 0);
    assert.equal(activity.list(member.actor.id).items[0].created, now);
    const page = wiki.create(owner.actor.id, space.id, "Public knowledge"),
      proposal = wiki.propose(
        member.actor.id,
        page.id,
        null,
        "Proposed change",
        [],
        "id",
        "Synthetic attribution",
      );
    assert.equal(activity.list(owner.actor.id).items[0].kind, "wiki-review");
    assert.equal(
      activity
        .list(member.actor.id)
        .items.some((i) => i.kind === "wiki-review"),
      false,
    );
    now = 3000;
    wiki.decide(owner.actor.id, proposal.id, proposal.digest, true);
    const decision = activity
      .list(member.actor.id)
      .items.find((i) => i.kind === "wiki-decision")!;
    assert.equal(decision.created, now);
    assert.equal(decision.detail, "Revisi diterima");
    s.setMember(owner.actor.id, space.id, member.actor.id, false);
    assert.equal(
      activity
        .list(member.actor.id)
        .items.some((i) => i.kind === "wiki-decision"),
      false,
    );
  } finally {
    s.close();
  }
});

test("activity HTTP requires authentication and never accepts a caller-supplied recipient", async () => {
  const s = new Strata(":memory:"),
    handler = api(s),
    a = s.provision("did:web:test.example", "Human");
  try {
    assert.equal(
      (await handler(new Request(s.base + "/v1/notifications"))).status,
      401,
    );
    const response = await handler(
      new Request(s.base + "/v1/notifications/read", {
        method: "POST",
        headers: {
          authorization: "Bearer " + a.token,
          "content-type": "application/json",
        },
        body: JSON.stringify({ ids: ["unknown"], actorId: "someone-else" }),
      }),
    );
    assert.equal(response.status, 404);
    assert.equal(
      s.get<{ n: number }>("SELECT count(*) AS n FROM activity_reads")!.n,
      0,
    );
  } finally {
    s.close();
  }
});

test("account pickers expose only currently readable participants, not private-only people or operator relationships", async () => {
  const s = new Strata(":memory:"),
    a = s.provision("did:web:a.example", "Visible A"),
    b = s.provision("did:web:b.example", "Visible B"),
    owner = s.provision("did:web:private.example", "Private owner"),
    secret = s.provision("did:web:secret.example", "Private member"),
    handler = api(s);
  try {
    const pub = s.createCommunity(b.actor.id, "Public", "Synthetic", "public");
    s.createPost(b.actor.id, pub.id, "Public contribution");
    const hidden = s.createCommunity(
      owner.actor.id,
      "Hidden",
      "Synthetic",
      "hidden-private",
    );
    s.setMember(owner.actor.id, hidden.id, secret.actor.id, true);
    s.createPost(secret.actor.id, hidden.id, "Private contribution");
    const call = async (q: string) =>
      (await (
        await handler(
          new Request(s.base + "/v1/people?q=" + q, {
            headers: { authorization: "Bearer " + a.token },
          }),
        )
      ).json()) as { id: string }[];
    assert.equal(
      (await call("Visible")).some((r) => r.id === b.actor.id),
      true,
    );
    assert.equal((await call("Private")).length, 0);
    s.setMember(owner.actor.id, hidden.id, a.actor.id, true);
    assert.equal(
      (await call("Private")).some((r) => r.id === secret.actor.id),
      true,
    );
    s.setMember(owner.actor.id, hidden.id, a.actor.id, false);
    assert.equal((await call("Private")).length, 0);
  } finally {
    s.close();
  }
});
