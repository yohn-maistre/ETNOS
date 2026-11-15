import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Strata } from "../src/store.ts";
import { Groups } from "../src/groups.ts";
import { PublicWork } from "../src/public-work.ts";
import { Wiki, newsStoryId } from "../src/wiki.ts";
import { Knowledge } from "../src/knowledge.ts";
import { api } from "../src/api.ts";

function fixture() {
  let now = Date.parse("2026-11-01T00:00:00Z");
  const s = new Strata(":memory:", "https://commons.example.org", () => now),
    admin = s.provision("did:web:admin.example", "Node steward"),
    owner = s.provision("did:web:owner.example", "Reviewer person");
  const groups = new Groups(s, { stewardDid: admin.actor.did }),
    work = new PublicWork(s, groups),
    wiki = new Wiki(s),
    knowledge = new Knowledge(s);
  const group = groups.create(owner.actor.id, "Public sponsor", "Synthetic", "institution", "public");
  const space = groups.createSpace(owner.actor.id, group.id, {
    title: "Public room",
    description: "Synthetic public room",
    visibility: "public",
    automation: true,
  });
  groups.requestSponsorship(owner.actor.id, group.id);
  groups.recognize(admin.actor.id, group.id, true);
  const context = (slug: string) =>
    groups.createContext(admin.actor.id, { slug, title: slug.toUpperCase(), kind: "place", description: "Synthetic place", language: "id", aliases: [] });
  const accept = (pageId: string, author: string, body: string, cited: string[], mandate?: string) => {
    const base = wiki.read(pageId, author).revision_id;
    const p = wiki.propose(author, pageId, base, body, cited, "id", "Synthetic perspective", mandate);
    now += 1000;
    return wiki.decide(owner.actor.id, p.id, p.digest, true);
  };
  return { s, admin, owner, groups, work, wiki, knowledge, group, space, context, accept, advance: (n: number) => (now += n) };
}

test("news citations are recognised only for this node's /news/:id and the desk's story link", () => {
  assert.equal(newsStoryId("https://commons.example.org/news/123", "https://commons.example.org"), "123");
  assert.equal(newsStoryId("https://westpapua.watch/story/?id=77", "https://commons.example.org"), "77");
  assert.equal(newsStoryId("https://westpapua.watch/story/?id=../x", "https://commons.example.org"), null);
  assert.equal(newsStoryId("https://elsewhere.example/news/123", "https://commons.example.org"), null);
});

test("wiki trail and gaps project only accepted public records; drafts, proposals, mandates and private rooms never leak", async () => {
  const f = fixture(),
    { s, owner, groups, work, wiki, knowledge, space } = f;
  try {
    const lembah = f.context("lembah"),
      pesisir = f.context("pesisir"),
      gunung = f.context("gunung");
    const cited = ["https://commons.example.org/news/123", "https://westpapua.watch/story/?id=77", "https://archive.example.org/doc"];
    // A working note promoted to a page, then reviewed by a person.
    const note = knowledge.create(owner.actor.id, { communityId: space.id, title: "Catatan lembah", text: "Working account", citations: cited, requestKey: randomUUID() });
    const promotion = knowledge.promote(owner.actor.id, note.id, { revision: note.revision, requestKey: randomUUID() });
    const first = wiki.proposals(owner.actor.id, promotion.pageId)[0];
    f.advance(1000);
    wiki.decide(owner.actor.id, first.id, first.digest, true);
    const page = wiki.read(promotion.pageId);
    const told = s.createPost(owner.actor.id, space.id, "Catatan baru di Wiki");
    s.run("INSERT INTO knowledge_announcements VALUES(?,?,?,?,?)", note.id, note.revision, space.id, told.id, s.clock());
    groups.attach(owner.actor.id, "wiki", page.id, lembah.id);
    // A second revision written by an agent under an editorial mandate.
    const agent = s.provision("did:web:agent.example", "Editorial agent", owner.actor.id);
    s.setMember(owner.actor.id, space.id, agent.actor.id, true);
    const grant = wiki.grant(owner.actor.id, agent.actor.id, space.id, "Draft from public sources", s.clock() + 60000, 3);
    f.accept(page.id, agent.actor.id, "Agent revision", cited, grant.id);
    const revision = wiki.read(page.id).revision_id;
    // Restricted material that must never appear.
    const pending = wiki.propose(owner.actor.id, page.id, revision, "PENDING_SECRET wording", ["https://pending.example.org/secret"], "id", "Pending");
    const draft = wiki.createDraft(owner.actor.id, space.id, "DRAFT_TITLE", { text: "DRAFT_BODY", citations: [], language: "id", perspective: "Draft" });
    groups.attach(owner.actor.id, "wiki", draft.id, gunung.id);
    const closed = s.createCommunity(owner.actor.id, "Closing room", "Synthetic", "public");
    const hiddenPage = wiki.create(owner.actor.id, closed.id, "HIDDEN_PAGE_TITLE");
    f.accept(hiddenPage.id, owner.actor.id, "HIDDEN_BODY", []);
    groups.attach(owner.actor.id, "wiki", hiddenPage.id, gunung.id);
    s.run("UPDATE communities SET visibility='hidden-private' WHERE id=?", closed.id);
    const params = (title: string) => ({ groupId: f.group.id, communityId: space.id, title, description: "Synthetic work", requestKey: randomUUID(), contextIds: [lembah.id] });
    const open = work.create(owner.actor.id, params("OPEN_WORK"));
    const withdrawn = work.create(owner.actor.id, params("WITHDRAWN_WORK"));
    work.update(owner.actor.id, withdrawn.id, withdrawn.revision, "withdrawn");
    const uncited = wiki.create(owner.actor.id, space.id, "Uncited page");
    f.accept(uncited.id, owner.actor.id, "Plain text", []);

    const trail = wiki.trail(page.id);
    assert.deepEqual(trail.steps.map((x) => x.kind), ["sources", "note", "announced", "earlier", "proposed", "page", "work"]);
    const sources = trail.steps[0].items!;
    assert.deepEqual(sources.map((x) => x.href), ["/news/123", "/news/77", "https://archive.example.org/doc"]);
    assert.deepEqual(sources.map((x) => x.news), [true, true, false]);
    assert.equal(trail.steps.find((x) => x.kind === "note")!.href, "/wiki/notes/" + note.id);
    assert.equal(trail.steps.find((x) => x.kind === "announced")!.href, "/square/" + told.id);
    assert.equal(trail.steps.find((x) => x.kind === "proposed")!.actor!.kind, "agent");
    assert.equal(trail.steps.find((x) => x.kind === "page")!.actor!.kind, "human");
    assert.deepEqual(trail.steps.find((x) => x.kind === "page")!.contexts, [{ slug: "lembah", title: "LEMBAH" }]);
    assert.deepEqual(trail.steps.filter((x) => x.kind === "work").map((x) => x.href), ["/work/" + open.id]);
    const json = JSON.stringify(trail);
    for (const forbidden of ["PENDING_SECRET", "pending.example.org", pending.id, first.id, grant.id, "WITHDRAWN_WORK", "DRAFT_TITLE", "HIDDEN_PAGE_TITLE", "mandate", "proposal_id"])
      assert.equal(json.includes(forbidden), false, forbidden);

    // Withdrawal and visibility are rechecked at read time.
    s.run("UPDATE posts SET hidden=1 WHERE id=?", told.id);
    assert.equal(wiki.trail(page.id).steps.some((x) => x.kind === "announced"), false);
    s.run("UPDATE groups SET visibility='hidden-private' WHERE id=?", f.group.id);
    assert.equal(wiki.trail(page.id).steps.some((x) => x.kind === "work"), false);

    // Pending drafts and private rooms have no trail, even for their steward.
    const handler = api(s),
      get = (path: string) => handler(new Request(s.base + path, { headers: { authorization: "Bearer " + owner.token } }));
    assert.equal((await get("/v1/wiki/" + draft.id + "/trail")).status, 404);
    assert.equal((await get("/v1/wiki/" + hiddenPage.id + "/trail")).status, 404);
    const response = await handler(new Request(s.base + "/v1/wiki/" + page.id + "/trail"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");

    // Gaps: a draft or a now-private page does not fill a context, nor appear.
    const gaps = (await (await handler(new Request(s.base + "/v1/wiki/gaps"))).json()) as ReturnType<Wiki["gaps"]>;
    assert.deepEqual(gaps.contexts.map((x) => x.slug).sort(), ["gunung", "pesisir"]);
    assert.deepEqual(gaps.uncited.map((x) => x.id), [uncited.id]);
    const gapJson = JSON.stringify(gaps);
    for (const forbidden of ["DRAFT_TITLE", "HIDDEN_PAGE_TITLE", draft.id, hiddenPage.id, closed.id]) assert.equal(gapJson.includes(forbidden), false, forbidden);
    assert.equal(pesisir.slug, "pesisir");

    // Discovery reports news-desk citations from the accepted revision only.
    const row = wiki.discover().find((x) => x.id === page.id)!;
    assert.equal(row.newsCitations, 2);
    assert.equal(row.authorKind, "agent");
    assert.equal(row.reviewer.kind, "human");
  } finally {
    s.close();
  }
});
