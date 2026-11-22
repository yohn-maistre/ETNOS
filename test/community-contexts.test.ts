import { test } from "node:test";
import assert from "node:assert/strict";
import { Etnos } from "../src/store.ts";
import { Groups } from "../src/groups.ts";
import { api } from "../src/api.ts";

function world() {
  const s = new Etnos(":memory:", "https://etnos.example", () => Date.parse("2026-11-15T00:00:00Z")),
    admin = s.provision("did:web:admin.example", "Node steward"),
    owner = s.provision("did:web:owner.example", "Owner"),
    other = s.provision("did:web:other.example", "Other"),
    groups = new Groups(s, { stewardDid: admin.actor.did }),
    ctx = (slug: string, kind: "place" | "region" | "topic", facet?: string) =>
      groups.createContext(admin.actor.id, { slug, title: slug, kind, description: "Synthetic", language: "id", aliases: [], facet });
  const province = ctx("papua-tengah", "region"),
    region = ctx("mee-pago", "region"),
    nabire = ctx("nabire", "place"),
    paniai = ctx("paniai", "place"),
    school = ctx("sekolah-universitas", "topic", "institution-kind");
  groups.linkContext(admin.actor.id, nabire.id, region.id);
  groups.linkContext(admin.actor.id, nabire.id, province.id);
  groups.linkContext(admin.actor.id, paniai.id, region.id);
  return { s, admin, owner, other, groups, province, region, nabire, paniai, school };
}

test("a community labelled with a regency shows on the regency and everything above it", () => {
  const w = world();
  try {
    const room = w.s.createCommunity(w.owner.actor.id, "Komunitas Baca Nabire", "Membaca bersama", "public");
    w.groups.labelCommunity(w.owner.actor.id, room.id, w.nabire.id);
    w.groups.labelCommunity(w.owner.actor.id, room.id, w.school.id);
    w.groups.labelCommunity(w.owner.actor.id, room.id, w.nabire.id); // idempotent
    assert.deepEqual(w.groups.communityContexts(room.id).map((c) => c.slug), ["nabire", "sekolah-universitas"]);

    const direct = w.groups.contextDetail("nabire").communities;
    assert.equal(direct.length, 1);
    assert.equal(direct[0].via, null);
    assert.deepEqual(direct[0].kinds.map((k) => k.slug), ["sekolah-universitas"]);
    assert.deepEqual(Object.keys(direct[0]).sort(), ["admission", "description", "id", "kinds", "title", "via", "visibility"]);

    for (const up of ["mee-pago", "papua-tengah"]) {
      const list = w.groups.contextDetail(up).communities;
      assert.equal(list.length, 1, up);
      assert.equal(list[0].via?.slug, "nabire");
    }
    assert.equal(w.groups.contextDetail("paniai").communities.length, 0);
    // The kind lens lists it too, without naming itself as the kind.
    assert.deepEqual(w.groups.contextDetail("sekolah-universitas").communities[0].kinds, []);

    w.groups.labelCommunity(w.owner.actor.id, room.id, w.nabire.id, true);
    assert.equal(w.groups.contextDetail("mee-pago").communities.length, 0);
  } finally {
    w.s.close();
  }
});

test("only a human steward of the community may label it, and hidden communities never appear", () => {
  const w = world();
  try {
    const room = w.s.createCommunity(w.owner.actor.id, "Terbuka", "Synthetic", "public"),
      listed = w.s.createCommunity(w.owner.actor.id, "Terdaftar", "Synthetic", "listed-private", false, "approval"),
      hidden = w.s.createCommunity(w.owner.actor.id, "Tersembunyi", "Synthetic", "hidden-private", false, "invite");
    assert.throws(() => w.groups.labelCommunity(w.other.actor.id, room.id, w.nabire.id), /Not found|required/i);
    assert.throws(() => w.groups.labelCommunity(w.admin.actor.id, room.id, w.nabire.id), /Not found|required/i);
    assert.throws(() => w.groups.labelCommunity(w.owner.actor.id, hidden.id, w.nabire.id), /Hidden communities/);
    assert.equal(w.s.all("SELECT 1 FROM community_contexts").length, 0);

    w.groups.labelCommunity(w.owner.actor.id, listed.id, w.nabire.id);
    assert.deepEqual(w.groups.contextDetail("nabire").communities.map((c) => [c.title, c.visibility]), [["Terdaftar", "listed-private"]]);

    // A label stored before a community went hidden is never served.
    w.s.run("INSERT INTO community_contexts(community_id,context_id,issuer_id,created) VALUES(?,?,?,?)", hidden.id, w.nabire.id, w.owner.actor.id, 1);
    assert.deepEqual(w.groups.contextDetail("mee-pago").communities.map((c) => c.title), ["Terdaftar"]);
    assert.deepEqual(w.groups.communityContexts(hidden.id), []);
  } finally {
    w.s.close();
  }
});

test("the label route needs sign-in and the community page carries its labels", async () => {
  const w = world();
  try {
    const handler = api(w.s, { stewardDid: w.admin.actor.did }),
      room = w.s.createCommunity(w.owner.actor.id, "Terbuka", "Synthetic", "public"),
      send = (token: string | null, body: unknown) =>
        handler(new Request(w.s.base + "/v1/communities/" + room.id + "/contexts", { method: "POST", headers: { ...(token ? { authorization: "Bearer " + token } : {}), "content-type": "application/json" }, body: JSON.stringify(body) }));
    assert.equal((await send(null, { contextId: w.nabire.id })).status, 401);
    assert.equal((await send(w.other.token, { contextId: w.nabire.id })).status, 404);
    assert.equal((await send(w.owner.token, { contextId: w.nabire.id })).status, 200);
    const page = (await (await handler(new Request(w.s.base + "/v1/communities/" + room.id))).json()) as { contexts: { slug: string }[] };
    assert.deepEqual(page.contexts.map((c) => c.slug), ["nabire"]);
    assert.equal((await send(w.owner.token, { contextId: w.nabire.id, remove: true })).status, 200);
    assert.equal(w.groups.contextDetail("nabire").communities.length, 0);
  } finally {
    w.s.close();
  }
});

test("the public index counts only what is public right now", () => {
  const w = world();
  try {
    const open = w.s.createCommunity(w.owner.actor.id, "Terbuka", "Synthetic", "public"),
      listed = w.s.createCommunity(w.owner.actor.id, "Terdaftar", "Synthetic", "listed-private");
    w.groups.labelCommunity(w.owner.actor.id, open.id, w.nabire.id);
    w.groups.labelCommunity(w.owner.actor.id, listed.id, w.nabire.id);
    w.groups.labelCommunity(w.owner.actor.id, listed.id, w.paniai.id);
    const indexed = Object.fromEntries(w.groups.contexts().map((c) => [c.slug, c.indexed]));
    assert.equal(indexed.nabire, 1);
    assert.equal(indexed.paniai, 0);
    assert.equal(indexed["mee-pago"], 0);
  } finally {
    w.s.close();
  }
});

test("a post labelled with a regency shows in the feed of every place above it, and not beside it", () => {
  const w = world();
  try {
    const room = w.s.createCommunity(w.owner.actor.id, "Kabar Nabire", "Kabar", "public");
    const post = w.s.createPost(w.owner.actor.id, room.id, "Pasar Oyehe ramai pagi ini");
    w.groups.attach(w.owner.actor.id, "post", post.id, w.nabire.id);
    const ids = (slug: string) => w.s.feedPage(undefined, { contextId: w.groups.context(slug).id }).items.map((p) => p.id);
    assert.deepEqual(ids("nabire"), [post.id]);
    assert.deepEqual(ids("mee-pago"), [post.id]);
    assert.deepEqual(ids("papua-tengah"), [post.id]);
    assert.deepEqual(ids("paniai"), []);
  } finally {
    w.s.close();
  }
});
