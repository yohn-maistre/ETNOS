import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Strata } from "../src/store.ts";
import { Groups } from "../src/groups.ts";
import { PublicWork } from "../src/public-work.ts";
import { Wiki } from "../src/wiki.ts";
import { api } from "../src/api.ts";

function fixture() {
  let now = Date.parse("2026-11-01T00:00:00Z");
  const s = new Strata(":memory:", "https://strata.example", () => now),
    admin = s.provision("did:web:admin.example", "Node steward"),
    owner = s.provision(
      "did:web:institution.example",
      "Institution representative",
    ),
    member = s.provision("did:web:member.example", "Participant"),
    outsider = s.provision("did:web:other.example", "Other");
  const groups = new Groups(s, { stewardDid: admin.actor.did }),
    work = new PublicWork(s, groups),
    wiki = new Wiki(s);
  const group = groups.create(
    owner.actor.id,
    "Governed community",
    "Synthetic public profile",
    "institution",
    "public",
  );
  const space = groups.createSpace(owner.actor.id, group.id, {
    title: "Public conversation",
    description: "Synthetic public conversation",
    visibility: "public",
    automation: true,
  });
  const hidden = groups.createSpace(owner.actor.id, group.id, {
    title: "Protected staff conversation",
    description: "Synthetic private fixture",
    visibility: "hidden-private",
  });
  const enable = () => {
    groups.requestSponsorship(owner.actor.id, group.id);
    groups.recognize(admin.actor.id, group.id, true);
  };
  const params = () => ({
    groupId: group.id,
    communityId: space.id,
    title: "Institutional undertaking",
    description: "Synthetic scope and public outcome",
    requestKey: randomUUID(),
  });
  return {
    s,
    groups,
    work,
    wiki,
    group,
    space,
    hidden,
    admin,
    owner,
    member,
    outsider,
    enable,
    params,
    advance: (n: number) => (now += n),
  };
}

test("governed group membership does not grant private space access or expose its existence", () => {
  const f = fixture();
  const { s, groups, group, space, hidden, owner, member, admin } = f;
  try {
    groups.setMember(owner.actor.id, group.id, member.actor.id, true);
    assert.equal(groups.allows(member.actor.id, group.id, "read"), true);
    assert.equal(s.membership(member.actor.id, hidden.id), undefined);
    const secret = s.createPost(
      owner.actor.id,
      hidden.id,
      "Private staff material",
    );
    assert.throws(() => s.getPost(member.actor.id, secret.id), /Not found/);
    const publicView = JSON.stringify(groups.read(undefined, group.id));
    assert.equal(publicView.includes(hidden.id), false);
    assert.equal(publicView.includes(hidden.title), false);
    assert.equal(publicView.includes(space.id), true);
    assert.equal(publicView.includes(member.actor.id), false);
    assert.throws(() => groups.members(member.actor.id, group.id), /steward/);
    const concealed = groups.create(
      owner.actor.id,
      "Private body",
      "Synthetic",
      "collective",
      "hidden-private",
    );
    assert.throws(() => groups.read(admin.actor.id, concealed.id), /Not found/);
    assert.throws(
      () => groups.members(admin.actor.id, concealed.id),
      /Not found/,
    );
    const other = s.createCommunity(
      member.actor.id,
      "Another owner",
      "Synthetic",
      "public",
    );
    assert.throws(
      () => groups.bind(owner.actor.id, group.id, other.id),
      /Both/,
    );
    assert.throws(
      () => groups.bind(member.actor.id, group.id, other.id),
      /steward/,
    );
    assert.equal(groups.spaces(undefined, group.id).length, 1);
  } finally {
    s.close();
  }
});

test("ordinary conversations do not create public work; sponsor admission, explicit adoption and author consent are required", () => {
  const f = fixture(),
    {
      s,
      groups,
      work,
      group,
      space,
      owner,
      member,
      admin,
      enable,
      params,
      advance,
    } = f;
  try {
    s.setMember(owner.actor.id, space.id, member.actor.id, true);
    const ordinary = s.createPost(
      member.actor.id,
      space.id,
      "Does someone have a used exhaust?",
    );
    assert.equal(work.list().length, 0);
    assert.throws(
      () => work.create(owner.actor.id, params()),
      /Admitted public sponsor/,
    );
    assert.throws(
      () => groups.recognize(owner.actor.id, group.id, true),
      /Node steward/,
    );
    assert.throws(
      () => groups.recognize(admin.actor.id, group.id, true),
      /request admission/,
    );
    enable();
    assert.throws(
      () => work.create(member.actor.id, params()),
      /Group steward/,
    );
    const adoption = { ...params(), originPostId: ordinary.id };
    assert.throws(
      () => work.create(owner.actor.id, adoption),
      /author consent/,
    );
    work.consent(member.actor.id, ordinary.id, group.id, s.clock() + 100);
    advance(101);
    assert.throws(
      () => work.create(owner.actor.id, adoption),
      /author consent/,
    );
    work.consent(member.actor.id, ordinary.id, group.id, s.clock() + 10000);
    work.revokeConsent(member.actor.id, ordinary.id, group.id);
    assert.throws(
      () => work.create(owner.actor.id, adoption),
      /author consent/,
    );
    work.consent(member.actor.id, ordinary.id, group.id, s.clock() + 10000);
    const item = work.create(owner.actor.id, adoption);
    assert.equal(item.state, "adopted");
    assert.equal(work.create(owner.actor.id, adoption).id, item.id);
    assert.equal(work.list().length, 1);
    assert.throws(
      () =>
        work.create(owner.actor.id, {
          ...adoption,
          title: "Different undertaking",
        }),
      /different work/,
    );
    s.hidePost(owner.actor.id, ordinary.id);
    assert.equal(work.read(item.id).origin_post_id, null);
  } finally {
    s.close();
  }
});

test("institutional agent grants are independent of posting and cannot reset their budget or approve results", () => {
  const f = fixture(),
    { s, groups, work, group, space, owner, enable, params, advance } = f;
  try {
    enable();
    const agent = s.provision(
      "did:web:agent.example",
      "Accountable Aksara",
      owner.actor.id,
    );
    groups.setMember(owner.actor.id, group.id, agent.actor.id, true);
    s.setMember(owner.actor.id, space.id, agent.actor.id, true);
    const posting = s.mandate(
      owner.actor.id,
      agent.actor.id,
      space.id,
      "Posting only",
      s.clock() + 10000,
    );
    assert.throws(
      () => work.create(agent.actor.id, { ...params(), grantId: posting }),
      /Not found/,
    );
    const grant = work.grant(
      owner.actor.id,
      group.id,
      agent.actor.id,
      s.clock() + 10000,
      2,
    );
    const request = { ...params(), grantId: grant.id },
      item = work.create(agent.actor.id, request);
    assert.equal(work.create(agent.actor.id, request).id, item.id);
    const result = work.proposeResult(
      agent.actor.id,
      item.id,
      "Proposed public result",
      [],
      grant.id,
    );
    assert.throws(
      () => work.acceptResult(agent.actor.id, result.id, result.digest, 1),
      /Human result review/,
    );
    assert.equal(work.read(item.id).result, null);
    const renewed = work.grant(
      owner.actor.id,
      group.id,
      agent.actor.id,
      s.clock() + 10000,
      2,
    );
    assert.throws(
      () => work.create(agent.actor.id, { ...params(), grantId: renewed.id }),
      /budget/,
    );
    work.revoke(owner.actor.id, grant.id);
    assert.throws(
      () => work.acceptResult(owner.actor.id, result.id, result.digest, 1),
      /Current sponsor-bound/,
    );
    advance(10001);
    assert.throws(
      () => work.create(agent.actor.id, { ...params(), grantId: renewed.id }),
      /Current sponsor-bound/,
    );
  } finally {
    s.close();
  }
});

test("public result review binds digest and work head, creates a separate public identifier and keeps proposals private", () => {
  const f = fixture(),
    { s, work, owner, outsider, enable, params } = f;
  try {
    enable();
    const item = work.create(owner.actor.id, params()),
      proposal = work.proposeResult(
        owner.actor.id,
        item.id,
        "Reviewed public outcome",
        ["https://evidence.example/public"],
      );
    assert.throws(() => work.proposals(outsider.actor.id, item.id), /steward/);
    assert.equal(
      JSON.stringify(work.read(item.id)).includes("Reviewed public outcome"),
      false,
    );
    assert.throws(
      () => work.acceptResult(owner.actor.id, proposal.id, "wrong", 1),
      /no longer matches/,
    );
    const active = work.update(owner.actor.id, item.id, 1, "active");
    assert.throws(
      () => work.acceptResult(owner.actor.id, proposal.id, proposal.digest, 1),
      /no longer matches/,
    );
    const accepted = work.acceptResult(
      owner.actor.id,
      proposal.id,
      proposal.digest,
      active.revision,
    );
    assert.equal(accepted.state, "completed");
    assert.equal(accepted.result?.text, "Reviewed public outcome");
    assert.notEqual(accepted.result?.id, proposal.id);
    assert.equal(JSON.stringify(accepted).includes(proposal.id), false);
    assert.equal(JSON.stringify(accepted).includes("grant_id"), false);
    assert.throws(
      () =>
        work.acceptResult(
          owner.actor.id,
          proposal.id,
          proposal.digest,
          active.revision,
        ),
      /no longer matches/,
    );
  } finally {
    s.close();
  }
});

test("public contexts deduplicate a conversation and cannot index private associations or membership", () => {
  const f = fixture(),
    { s, groups, owner, admin, member, space, hidden, group } = f;
  try {
    const c = groups.createContext(admin.actor.id, {
      slug: "papua",
      title: "Papua",
      kind: "region",
      description: "Declared discovery context",
      language: "id",
      aliases: [],
    });
    assert.throws(
      () =>
        groups.createContext(owner.actor.id, {
          slug: "unapproved",
          title: "Unapproved",
          kind: "place",
          description: "Synthetic",
          language: "id",
          aliases: [],
        }),
      /Node steward/,
    );
    const p = s.createPost(owner.actor.id, space.id, "One conversation"),
      secret = s.createPost(owner.actor.id, hidden.id, "Private association");
    groups.attach(owner.actor.id, "post", p.id, c.id);
    groups.attach(owner.actor.id, "post", p.id, c.id);
    assert.equal(s.feedPage(undefined, { contextId: c.id }).items.length, 1);
    assert.throws(
      () => groups.attach(owner.actor.id, "post", secret.id, c.id),
      /public contributions/,
    );
    assert.throws(
      () => groups.attach(member.actor.id, "post", secret.id, c.id),
      /Not found/,
    );
    assert.throws(
      () => groups.attach(member.actor.id, "group", group.id, c.id),
      /steward/,
    );
    groups.attach(owner.actor.id, "group", group.id, c.id);
    const publicContext = JSON.stringify(groups.contextDetail(c.id));
    assert.equal(publicContext.includes(secret.id), false);
    assert.equal(publicContext.includes(owner.actor.id), false);
    const attachAudits = s.all(
      "SELECT * FROM audit WHERE action='context.attach'",
    ).length;
    groups.detach(owner.actor.id, "post", p.id, c.id);
    assert.equal(
      s.all("SELECT * FROM audit WHERE action='context.attach'").length,
      attachAudits,
    );
    assert.equal(s.feedPage(undefined, { contextId: c.id }).items.length, 0);
    assert.equal(groups.contextDetail(c.id).groups.length, 1);
  } finally {
    s.close();
  }
});

test("nested units roll back atomically, including a caught inner failure and a failed post/context API mutation", async () => {
  const f = fixture(),
    { s, owner, space, admin } = f;
  try {
    const n = s.all("SELECT * FROM audit").length;
    assert.throws(
      () =>
        s.tx(() => {
          s.audit(owner.actor.id, "outer.start", "fixture");
          try {
            s.tx(() => {
              s.audit(owner.actor.id, "inner.write", "fixture");
              throw Error("inner failure");
            });
          } catch {
            /* Outer caller cannot authorize a partial commit. */
          }
          s.audit(owner.actor.id, "outer.end", "fixture");
        }),
      /Nested operation failed/,
    );
    assert.equal(s.all("SELECT * FROM audit").length, n);
    const handler = api(s, { stewardDid: admin.actor.did }),
      before = s.all("SELECT * FROM posts").length;
    const response = await handler(
      new Request(s.base + "/v1/posts", {
        method: "POST",
        headers: {
          authorization: "Bearer " + owner.token,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          communityId: space.id,
          text: "Must roll back",
          contextIds: ["unknown"],
        }),
      }),
    );
    assert.equal(response.status, 404);
    assert.equal(s.all("SELECT * FROM posts").length, before);
    assert.equal(s.all("SELECT * FROM audit").length, n);
  } finally {
    s.close();
  }
});

test("AI Wiki drafts require editorial authority, remain restricted, and cannot accept their own knowledge", () => {
  const f = fixture(),
    { s, wiki, space, owner, outsider, advance } = f;
  try {
    const agent = s.provision(
      "did:web:editor.example",
      "Editorial agent",
      owner.actor.id,
    );
    s.setMember(owner.actor.id, space.id, agent.actor.id, true);
    const page = wiki.create(owner.actor.id, space.id, "Shared knowledge"),
      posting = s.mandate(
        owner.actor.id,
        agent.actor.id,
        space.id,
        "Only posts",
        s.clock() + 20000,
      );
    assert.throws(
      () =>
        wiki.propose(
          agent.actor.id,
          page.id,
          null,
          "Agent draft",
          [],
          "id",
          "Declared interpretation",
          posting,
        ),
      /editorial proposal mandate/,
    );
    const grant = wiki.grant(
      owner.actor.id,
      agent.actor.id,
      space.id,
      "Draft from approved public sources",
      s.clock() + 10000,
      2,
    );
    const p = wiki.propose(
      agent.actor.id,
      page.id,
      null,
      "Proposed interpretation",
      ["https://evidence.example/public"],
      "id",
      "Declared perspective",
      grant.id,
    );
    assert.equal(wiki.read(page.id).revision, null);
    assert.throws(
      () => wiki.proposals(outsider.actor.id, page.id),
      /Not found/,
    );
    assert.throws(
      () => wiki.decide(agent.actor.id, p.id, p.digest, true),
      /steward/,
    );
    const accepted = wiki.decide(owner.actor.id, p.id, p.digest, true);
    const visible = wiki.read(page.id);
    assert.equal(visible.revision?.authorKind, "agent");
    assert.equal(JSON.stringify(visible).includes(grant.id), false);
    assert.equal(JSON.stringify(visible).includes(p.id), false);
    const pending = wiki.propose(
      agent.actor.id,
      page.id,
      accepted.revisionId,
      "Next proposal",
      [],
      "id",
      "Perspective",
      grant.id,
    );
    const renewed = wiki.grant(
      owner.actor.id,
      agent.actor.id,
      space.id,
      "Renewal",
      s.clock() + 20000,
      2,
    );
    assert.throws(
      () =>
        wiki.propose(
          agent.actor.id,
          page.id,
          accepted.revisionId,
          "Budget bypass",
          [],
          "id",
          "Perspective",
          renewed.id,
        ),
      /budget/,
    );
    advance(10001);
    assert.throws(
      () => wiki.decide(owner.actor.id, pending.id, pending.digest, true),
      /editorial proposal mandate/,
    );
  } finally {
    s.close();
  }
});

test("editorial acceptance rechecks the issuing operator current forum authority", () => {
  const f = fixture(),
    { s, wiki, space, owner, member } = f;
  try {
    s.setMember(owner.actor.id, space.id, member.actor.id, true, "moderator");
    const agent = s.provision(
      "did:web:delegated-editor.example",
      "Delegated editor",
      member.actor.id,
    );
    s.setMember(owner.actor.id, space.id, agent.actor.id, true);
    const page = wiki.create(owner.actor.id, space.id, "Reviewed knowledge"),
      grant = wiki.grant(
        member.actor.id,
        agent.actor.id,
        space.id,
        "Only drafts",
        s.clock() + 10000,
      );
    const proposal = wiki.propose(
      agent.actor.id,
      page.id,
      null,
      "Proposed knowledge",
      [],
      "id",
      "Perspective",
      grant.id,
    );
    s.setMember(owner.actor.id, space.id, member.actor.id, true, "member");
    assert.throws(
      () => wiki.decide(owner.actor.id, proposal.id, proposal.digest, true),
      /steward/,
    );
    assert.equal(wiki.read(page.id).revision, null);
  } finally {
    s.close();
  }
});

test("private work proposals can be rejected by current human stewards without publication", () => {
  const f = fixture(),
    { s, work, owner, outsider, enable, params } = f;
  try {
    enable();
    const item = work.create(owner.actor.id, params()),
      p = work.proposeResult(
        owner.actor.id,
        item.id,
        "Rejected interpretation",
        [],
      );
    assert.throws(
      () => work.rejectResult(outsider.actor.id, p.id, p.digest),
      /steward/,
    );
    assert.throws(
      () => work.rejectResult(owner.actor.id, p.id, "wrong"),
      /no longer matches/,
    );
    work.rejectResult(owner.actor.id, p.id, p.digest);
    assert.equal(work.proposals(owner.actor.id, item.id)[0].state, "rejected");
    assert.equal(work.read(item.id).result, null);
    assert.throws(
      () => work.acceptResult(owner.actor.id, p.id, p.digest, 1),
      /no longer matches/,
    );
  } finally {
    s.close();
  }
});

test("only a node steward sets a context's news places, and malformed slugs are ignored", () => {
  const f = fixture(),
    { s, groups, owner, admin } = f;
  try {
    const c = groups.createContext(admin.actor.id, {
      slug: "meepago",
      title: "Meepago",
      kind: "region",
      description: "Declared discovery context",
      language: "id",
      aliases: [],
    });
    assert.deepEqual(groups.contextDetail(c.id).newsPlaces, ["meepago"]);
    assert.throws(() => groups.setContextAliases(owner.actor.id, c.id, ["kabar:nabire"]));
    assert.deepEqual(groups.contextDetail(c.id).newsPlaces, ["meepago"]);
    groups.setContextAliases(admin.actor.id, c.id, ["kabar:nabire", "kabar:paniai", "kabar:../admin", "Mee Pago", "kabar:nabire"]);
    assert.deepEqual(groups.contextDetail(c.id).newsPlaces, ["nabire", "paniai"]);
    const topic = groups.createContext(admin.actor.id, { slug: "reggae", title: "Reggae", kind: "topic", description: "Music", language: "id", aliases: [] });
    assert.deepEqual(groups.contextDetail(topic.id).newsPlaces, []);
  } finally {
    s.close();
  }
});

test("context hierarchy: only node stewards link, loops are refused, and detail lists public parents and children", async () => {
  const f = fixture(),
    { s, groups, owner, admin } = f;
  try {
    const make = (slug: string, kind: "place" | "region" | "topic", facet = "") =>
      groups.createContext(admin.actor.id, { slug, title: slug.toUpperCase(), kind, facet, description: "Synthetic " + slug, language: "id", aliases: [] });
    const region = make("wilayah-uji", "region", "customary-region"),
      province = make("provinsi-uji", "region", "province"),
      regency = make("kabupaten-uji", "place", "regency"),
      district = make("distrik-uji", "place");
    assert.equal(region.facet, "customary-region");
    assert.throws(() => groups.linkContext(owner.actor.id, regency.id, province.id), /Node steward required/);
    const handler = api(s, { stewardDid: admin.actor.did }),
      post = (token: string, path: string, body: unknown) =>
        handler(new Request(s.base + path, { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(body) }));
    assert.equal((await post(owner.token, "/v1/contexts/" + regency.id + "/parents", { parentId: province.id })).status, 403);
    assert.equal(s.all("SELECT * FROM context_parents").length, 0);
    assert.equal((await post(admin.token, "/v1/contexts/" + regency.slug + "/parents", { parentId: province.slug })).status, 200);
    groups.linkContext(admin.actor.id, regency.id, region.id);
    groups.linkContext(admin.actor.id, regency.id, region.id); // replay is a no-op
    groups.linkContext(admin.actor.id, district.id, regency.id);
    assert.equal(s.all("SELECT * FROM context_parents").length, 3);
    // Direct and transitive loops are refused, as is a self-link.
    assert.throws(() => groups.linkContext(admin.actor.id, province.id, regency.id), /cannot loop/);
    assert.throws(() => groups.linkContext(admin.actor.id, region.id, district.id), /cannot loop/);
    assert.throws(() => groups.linkContext(admin.actor.id, region.id, region.id), /cannot loop/);
    assert.equal((await post(admin.token, "/v1/contexts/" + province.id + "/parents", { parentId: district.id })).status, 409);
    assert.equal(s.all("SELECT * FROM context_parents").length, 3);
    const detail = groups.contextDetail(regency.slug);
    assert.deepEqual(detail.parents.map((p) => p.slug), ["provinsi-uji", "wilayah-uji"]);
    assert.deepEqual(detail.children.map((c) => c.slug), ["distrik-uji"]);
    assert.deepEqual(groups.contextDetail(region.id).children.map((c) => [c.slug, c.facet]), [["kabupaten-uji", "regency"]]);
    assert.equal(groups.contextDetail(province.id).childCount, 1);
    const listed = groups.contexts().find((c) => c.id === regency.id)!;
    assert.deepEqual([...listed.parents].sort(), [province.id, region.id].sort());
    const read = (await (await handler(new Request(s.base + "/v1/contexts/" + region.slug))).json()) as { children: { slug: string }[] };
    assert.deepEqual(read.children.map((c) => c.slug), ["kabupaten-uji"]);
    // A retired context leaves both lists; only a node steward may unlink.
    s.run("UPDATE contexts SET active=0 WHERE id=?", district.id);
    assert.deepEqual(groups.contextDetail(regency.id).children, []);
    assert.equal(groups.contextDetail(regency.id).childCount, 0);
    assert.throws(() => groups.unlinkContext(owner.actor.id, regency.id, region.id), /Node steward required/);
    assert.equal((await post(admin.token, "/v1/contexts/" + regency.id + "/parents", { parentId: region.id, remove: true })).status, 200);
    assert.deepEqual(groups.contextDetail(regency.id).parents.map((p) => p.slug), ["provinsi-uji"]);
    assert.deepEqual(groups.contextDetail(region.id).children, []);
    assert.equal(s.all("SELECT * FROM audit WHERE action='context.link'").length, 3);
    assert.equal(s.all("SELECT * FROM audit WHERE action='context.unlink'").length, 1);
  } finally {
    s.close();
  }
});
