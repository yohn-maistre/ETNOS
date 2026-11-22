import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Etnos } from "../src/store.ts";
import { DirectMessages } from "../src/dm.ts";
import { Activity } from "../src/activity.ts";
import { api } from "../src/api.ts";
const opaque = Buffer.from(
  "Synthetic opaque envelope, not actual encryption",
).toString("base64");
function fixture() {
  const s = new Etnos(":memory:"),
    dm = new DirectMessages(s),
    a = s.provision("did:web:alice.example", "Alice"),
    b = s.provision("did:web:bob.example", "Bob"),
    c = s.provision("did:web:other.example", "Other"),
    space = s.createCommunity(
      a.actor.id,
      "Shared private forum",
      "Synthetic",
      "hidden-private",
    );
  s.setMember(a.actor.id, space.id, b.actor.id, true);
  for (const actor of [a, b, c])
    dm.register(actor.actor.id, {
      deviceId: randomUUID(),
      signatureKey: Buffer.alloc(33, 2).toString("base64"),
      packages: Array.from({ length: 8 }, () => ({
        id: randomUUID(),
        data: opaque,
      })),
    });
  const aid = a.actor.id,
    bid = b.actor.id;
  const reserve = () => dm.reserve(aid, bid, dm.device(aid)!.id, randomUUID());
  return { s, dm, a, b, c, aid, bid, reserve };
}

test("DM access requires a participant; requests, key packages and blocks stay out of public views", async () => {
  const f = fixture(),
    { s, dm, a, b, c, aid, bid, reserve } = f;
  try {
    const t = reserve();
    assert.equal(dm.me(bid).availablePackages, 7);
    assert.throws(() => dm.read(c.actor.id, t.id), /unavailable/);
    assert.throws(
      () => dm.reserve(aid, c.actor.id, dm.device(aid)!.id, randomUUID()),
      /unavailable/,
    );
    assert.equal(dm.list(c.actor.id).length, 0);
    dm.start(aid, t.id, dm.device(aid)!.id, opaque);
    assert.equal(new Activity(s).list(bid).items[0].kind, "dm-request");
    assert.equal(new Activity(s).list(c.actor.id).items.length, 0);
    assert.throws(
      () => dm.decide(aid, t.id, dm.device(aid)!.id, true),
      /unavailable/,
    );
    dm.decide(bid, t.id, dm.device(bid)!.id, true);
    const message = dm.send(
      aid,
      t.id,
      dm.device(aid)!.id,
      randomUUID(),
      opaque,
    );
    assert.equal(dm.messages(bid, t.id).items[0].ciphertext, opaque);
    assert.equal(new Activity(s).list(bid).items[0].kind, "dm-message");
    assert.throws(() => dm.messages(c.actor.id, t.id), /unavailable/);
    dm.markRead(bid, t.id, message.version);
    assert.equal(dm.read(bid, t.id).readVersion, 1);
    dm.close(bid, t.id, true);
    assert.throws(
      () => dm.send(aid, t.id, dm.device(aid)!.id, randomUUID(), opaque),
      /closed/,
    );
    assert.throws(() => reserve(), /unavailable/);
    const handler = api(s),
      publicView = await (
        await handler(new Request(s.base + "/v1/feed"))
      ).text();
    assert.equal(publicView.includes(t.id), false);
    assert.equal(publicView.includes(opaque), false);
    assert.equal(s.all("SELECT * FROM outbox").length, 0);
    assert.equal(
      (await handler(new Request(s.base + "/v1/dm/threads"))).status,
      401,
    );
  } finally {
    s.close();
  }
});

test("DM request and send replay are idempotent; key packages are single-use and device replacement cannot silently reset keys", () => {
  const { s, dm, aid, bid, reserve } = fixture();
  try {
    const key = randomUUID(),
      device = dm.device(aid)!,
      t = dm.reserve(aid, bid, device.id, key);
    assert.equal(dm.reserve(aid, bid, device.id, key).id, t.id);
    assert.equal(dm.me(bid).availablePackages, 7);
    assert.throws(() => reserve(), /already exists/);
    dm.start(aid, t.id, device.id, opaque);
    dm.decide(bid, t.id, dm.device(bid)!.id, true);
    const id = randomUUID();
    assert.equal(dm.send(aid, t.id, device.id, id, opaque).version, 1);
    assert.equal(dm.send(aid, t.id, device.id, id, opaque).version, 1);
    assert.throws(
      () =>
        dm.send(
          aid,
          t.id,
          device.id,
          id,
          Buffer.from("different").toString("base64"),
        ),
      /already used/,
    );
    assert.throws(
      () => dm.send(bid, t.id, "wrong", randomUUID(), opaque),
      /mismatch/,
    );
    assert.throws(() => dm.markRead(bid, t.id, 2), /cursor/);
    assert.throws(
      () =>
        dm.register(aid, {
          deviceId: randomUUID(),
          signatureKey: device.signature_key,
          packages: [{ id: randomUUID(), data: opaque }],
        }),
      /already exists/,
    );
    assert.throws(
      () => dm.send(aid, t.id, device.id, randomUUID(), "not base64"),
      /base64/,
    );
  } finally {
    s.close();
  }
});

test("lost key registration acknowledgement retries without making a consumed package reusable", () => {
  const { s, dm, aid, bid, reserve } = fixture();
  try {
    const before = dm.me(bid).availablePackages,
      known = s.get<{ id: string; data: string }>(
        "SELECT id,data FROM dm_packages WHERE actor_id=? ORDER BY id LIMIT 1",
        bid,
      )!,
      device = dm.device(bid)!;
    reserve();
    const remaining = dm.me(bid).availablePackages;
    assert.equal(remaining, before - 1);
    dm.register(bid, {
      deviceId: device.id,
      signatureKey: device.signature_key,
      packages: [known],
    });
    assert.equal(dm.me(bid).availablePackages, remaining);
    assert.throws(
      () =>
        dm.register(bid, {
          deviceId: device.id,
          signatureKey: device.signature_key,
          packages: [
            { id: known.id, data: Buffer.from("tampered").toString("base64") },
          ],
        }),
      /already registered/,
    );
  } finally {
    s.close();
  }
});

test('DM discovery excludes self and private-only strangers, matches DID, and retains existing peers without public posts',()=>{
 const{s,dm,aid,bid,c,reserve}=fixture()
 try{
  assert.deepEqual(dm.contacts(aid,'Alice'),[])
  assert.deepEqual(dm.contacts(aid,'Other'),[])
  assert.deepEqual(dm.contacts(aid,'Bob'),[])
  reserve()
  assert.equal(dm.contacts(aid,'@Bob')[0].id,bid)
  assert.equal(dm.contacts(aid,'did:web:bob.example')[0].id,bid)
  assert.deepEqual(dm.contacts(c.actor.id,'Bob'),[])
  const t=dm.list(aid)[0]
  dm.close(aid,t.id,true)
  assert.deepEqual(dm.contacts(aid,'Bob'),[])
 }finally{s.close()}
})
