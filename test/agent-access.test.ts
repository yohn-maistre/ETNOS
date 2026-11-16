import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { Strata } from "../src/store.ts";
import { AgentAccess } from "../src/agent-access.ts";
import { agentRoutes } from "../src/agent-mcp.ts";
import { Wiki } from "../src/wiki.ts";
import { api } from "../src/api.ts";
async function fixture(file = ":memory:") {
  let now = Date.now();
  const s = new Strata(file, "https://strata.example", () => now),
    owner = s.provision("did:web:owner.example", "Owner"),
    other = s.provision("did:web:other.example", "Other"),
    room = s.createCommunity(
      owner.actor.id,
      "Public test",
      "Public local",
      "public",
      true,
      "open",
    ),
    secret = s.createCommunity(
      owner.actor.id,
      "Protected indigenous language",
      "NEVER DISCLOSE LANGUAGE COLLECTION",
      "hidden-private",
    ),
    listed = s.createCommunity(
      owner.actor.id,
      "Listed private",
      "Public directory only",
      "listed-private",
    );
  s.join(other.actor.id, room.id);
  const access = new AgentAccess(s),
    agent = access.enroll(owner.actor.id, {
      name: "Aksara local test",
      communityId: room.id,
      role: "steward",
      family: "aksara",
    }),
    keys = await generateKeyPair("EdDSA"),
    key = await exportJWK(keys.publicKey),
    deployment = access.addDeployment(
      owner.actor.id,
      agent.actor.id,
      "Local installation",
      key,
    ),
    route = agentRoutes(s, access);
  const assertion = (patch: Record<string, unknown> = {}) =>
    new SignJWT({ jti: randomUUID(), ...patch })
      .setProtectedHeader({ alg: "EdDSA" })
      .setIssuer(deployment.id)
      .setSubject(deployment.id)
      .setAudience(s.base + "/agents/token")
      .setIssuedAt(Math.floor(now / 1000))
      .setExpirationTime(Math.floor(now / 1000) + 120)
      .sign(keys.privateKey);
  const form = (
    a: string,
    scope = "public:read agent:self posts:create wiki:propose",
  ) =>
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: a,
      resource: s.base + "/mcp",
      scope,
    });
  const token = async () =>
    (await access.exchange(form(await assertion()))).access_token;
  const call = async (
    name: string,
    args: Record<string, unknown> = {},
    bearer?: string,
  ) => {
    const res = await route(
      new Request(s.base + "/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          ...(bearer ? { authorization: "Bearer " + bearer } : {}),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name, arguments: args },
        }),
      }),
    );
    const raw = await res!.text();
    return {
      status: res!.status,
      data: JSON.parse(
        raw.startsWith("event:")
          ? raw
              .split("\n")
              .find((l) => l.startsWith("data: "))!
              .slice(6)
          : raw,
      ),
    };
  };
  return {
    s,
    owner,
    other,
    room,
    secret,
    listed,
    access,
    agent,
    keys,
    key,
    deployment,
    assertion,
    form,
    token,
    call,
    setNow: (n: number) => (now = n),
    now: () => now,
  };
}
test("registered deployment assertions are audience-bound, replay-fenced, short lived and immediately revocable", async () => {
  const f = await fixture();
  try {
    const signed = await f.assertion(),
      token = await f.access.exchange(f.form(signed));
    assert.equal(token.expires_in, 300);
    assert.equal(
      f.access.authenticate(token.access_token).actor.id,
      f.agent.actor.id,
    );
    await assert.rejects(f.access.exchange(f.form(signed)), /already used/);
    const wrong = f.form(await f.assertion());
    wrong.set("resource", "https://other.example/mcp");
    await assert.rejects(f.access.exchange(wrong), /resource/);
    f.setNow(f.now() + 301000);
    assert.throws(() => f.access.authenticate(token.access_token));
    const fresh = await f.token();
    f.access.revokeDeployment(
      f.owner.actor.id,
      f.agent.actor.id,
      f.deployment.id,
    );
    assert.throws(() => f.access.authenticate(fresh));
    assert.equal(
      f.s.get<{ n: number }>(
        "SELECT count(*) n FROM credentials WHERE actor_id=?",
        f.agent.actor.id,
      )!.n,
      0,
      "no broad API bearer credential is created",
    );
  } finally {
    f.s.close();
  }
});
test("public MCP cannot traverse protected language/cultural spaces even when the agent is a member", async () => {
  const f = await fixture();
  try {
    const privatePost = f.s.createPost(
        f.owner.actor.id,
        f.secret.id,
        "SECRET LANGUAGE TEXT",
      ),
      listedPost = f.s.createPost(
        f.owner.actor.id,
        f.listed.id,
        "LISTED PRIVATE LANGUAGE TEXT",
      ),
      publicPost = f.s.createPost(
        f.owner.actor.id,
        f.room.id,
        "Public discussion",
      );
    f.s.setMember(f.owner.actor.id, f.secret.id, f.agent.actor.id, true);
    f.access.admit(f.owner.actor.id, f.agent.actor.id);
    const token = await f.token();
    for (const bearer of [undefined, token]) {
      const feed = await f.call("etnos_read_feed", {}, bearer);
      assert.equal(feed.status, 200);
      assert.ok(JSON.stringify(feed.data).includes(publicPost.id));
      assert.ok(!JSON.stringify(feed.data).includes("SECRET LANGUAGE"));
      for (const id of [privatePost.id, listedPost.id]) {
        const r = await f.call("etnos_read_thread", { postId: id }, bearer);
        assert.ok(r.data.result?.isError || r.data.error);
        assert.ok(!JSON.stringify(r.data).includes("LANGUAGE TEXT"));
      }
      const search = await f.call(
        "etnos_search",
        { query: "LANGUAGE" },
        bearer,
      );
      assert.ok(!JSON.stringify(search.data).includes("SECRET LANGUAGE TEXT"));
      assert.ok(!JSON.stringify(search.data).includes(f.secret.id));
      assert.ok(!JSON.stringify(search.data).includes(listedPost.id));
      const scoped = await f.call(
        "etnos_read_feed",
        { communityId: f.secret.id },
        bearer,
      );
      assert.ok(scoped.data.result?.isError || scoped.data.error);
    }
    assert.throws(
      () =>
        f.access.enroll(f.owner.actor.id, {
          name: "Bad agent",
          communityId: f.secret.id,
        }),
      /public local/,
    );
    const page = new Wiki(f.s).createDraft(
      f.owner.actor.id,
      f.room.id,
      "Unreviewed language draft",
      {
        text: "PROTECTED PENDING CULTURE",
        citations: [],
        language: "id",
        perspective: "Local test",
      },
      randomUUID(),
    );
    const wiki = await f.call("etnos_read_wiki", { pageId: page.id }, token);
    assert.ok(wiki.data.result?.isError || wiki.data.error);
    assert.ok(!JSON.stringify(wiki.data).includes("PROTECTED PENDING"));
  } finally {
    f.s.close();
  }
});
test("agents retain authorship, admission and separate grants; token scopes never grant votes or cross-community writes", async () => {
  const f = await fixture();
  try {
    const token = await f.token(),
      key = randomUUID(),
      args = {
        text: "A labelled synthetic agent post",
        mandateId: "missing",
        requestKey: key,
      };
    assert.equal((await f.call("etnos_create_post", args)).status, 401);
    assert.ok(
      (await f.call("etnos_create_post", args, token)).data.result.isError,
    );
    f.access.admit(f.owner.actor.id, f.agent.actor.id);
    const m = f.access.grant(f.owner.actor.id, f.agent.actor.id, {
      kind: "posting",
      purpose: "Test discussion",
      expires: f.now() + 600000,
      hourlyLimit: 10,
    });
    args.mandateId = m.id;
    const posted = await f.call("etnos_create_post", args, token);
    assert.equal(posted.status, 200);
    assert.ok(!posted.data.result.isError, JSON.stringify(posted.data));
    const p = posted.data.result.structuredContent.data;
    assert.equal(p.author.kind, "agent");
    assert.equal(p.author.agent.operator.id, f.owner.actor.id);
    assert.equal(p.author.agent.official, false);
    const replay = await f.call("etnos_create_post", args, token);
    assert.equal(replay.data.result.structuredContent.data.id, p.id);
    const rich = await f.call(
      "etnos_create_post",
      {
        ...args,
        text: "**Synthetic** formatted agent post",
        title: "Synthetic title",
        format: "markdown",
        requestKey: randomUUID(),
      },
      token,
    );
    assert.deepEqual(rich.data.result.structuredContent.data.content, {
      title: "Synthetic title",
      format: "markdown",
    });
    for (const smuggled of [
      { content: { poll: { options: ["a", "b"], closesAt: f.now() + 9e6 } } },
      { contextIds: ["x"] },
      { mediaIds: ["x"] },
    ])
      assert.ok(
        (
          await f.call(
            "etnos_create_post",
            { ...args, ...smuggled, requestKey: randomUUID() },
            token,
          )
        ).data.result.isError,
        "agent posts carry text presentation only",
      );
    const extra = await f.call(
      "etnos_create_post",
      { ...args, communityId: f.secret.id },
      token,
    );
    assert.ok(extra.data.result.isError);
    const limited = (
      await f.access.exchange(f.form(await f.assertion(), "public:read"))
    ).access_token;
    assert.ok(
      (
        await f.call(
          "etnos_create_post",
          { ...args, requestKey: randomUUID() },
          limited,
        )
      ).data.result.isError,
    );
    const arbitrary = await f.call("vote", { postId: p.id, value: 1 }, token);
    assert.ok(arbitrary.data.error || arbitrary.data.result?.isError);
    f.s.revokeMandate(f.owner.actor.id, m.id);
    assert.ok(
      (await f.call("etnos_create_post", args, token)).data.result.isError,
      "replay requires current effect authority",
    );
    const direct = await api(f.s, { principal: () => undefined })(
      new Request(f.s.base + "/v1/me", {
        headers: { authorization: "Bearer " + token },
      }),
    );
    assert.equal(
      direct.status,
      401,
      "agent token cannot become a human browser principal",
    );
  } finally {
    f.s.close();
  }
});
test("operator removal, tenant changes, private keys and impersonating registrations are rejected", async () => {
  const f = await fixture();
  try {
    assert.throws(() =>
      f.access.addDeployment(
        f.other.actor.id,
        f.agent.actor.id,
        "stolen",
        f.key,
      ),
    );
    assert.throws(
      () =>
        f.access.addDeployment(f.owner.actor.id, f.agent.actor.id, "bad", {
          ...f.key,
          d: "secret",
        }),
      /private part/,
    );
    assert.throws(
      () =>
        f.access.enroll(f.other.actor.id, {
          name: "Aksara impostor",
          family: "aksara",
          communityId: f.room.id,
        }),
      /steward/,
    );
    const signed = await f.assertion(),
      otherKeys = await generateKeyPair("EdDSA"),
      fake = await new SignJWT({ jti: randomUUID() })
        .setProtectedHeader({ alg: "EdDSA" })
        .setIssuer(f.deployment.id)
        .setSubject(f.deployment.id)
        .setAudience(f.s.base + "/agents/token")
        .setIssuedAt()
        .setExpirationTime("2m")
        .sign(otherKeys.privateKey);
    await assert.rejects(f.access.exchange(f.form(fake)));
    const token = await f.token();
    f.s.run(
      "UPDATE memberships SET active=0 WHERE community_id=? AND actor_id=?",
      f.room.id,
      f.owner.actor.id,
    );
    assert.throws(() => f.access.authenticate(token));
    await assert.rejects(f.access.exchange(f.form(signed)));
  } finally {
    f.s.close();
  }
});

test("deployment identity, assertion replay and revocation survive database reopen", async () => {
  const dir = await mkdtemp(join(tmpdir(), "etnos-agent-reopen-")),
    file = join(dir, "node.sqlite"),
    f = await fixture(file);
  let next: Strata | undefined;
  try {
    const assertion = await f.assertion(),
      token = (await f.access.exchange(f.form(assertion))).access_token;
    f.s.close();
    next = new Strata(file, "https://strata.example");
    const access = new AgentAccess(next);
    assert.equal(access.authenticate(token).actor.id, f.agent.actor.id);
    await assert.rejects(access.exchange(f.form(assertion)), /already used/);
    access.suspend(f.owner.actor.id, f.agent.actor.id);
    access.resume(f.owner.actor.id, f.agent.actor.id);
    assert.throws(() => access.authenticate(token));
    next.close();
    next = new Strata(file, "https://strata.example");
    assert.throws(() => new AgentAccess(next!).authenticate(token));
    await assert.rejects(
      new AgentAccess(next).exchange(f.form(await f.assertion())),
    );
  } finally {
    try {
      f.s.close();
    } catch {}
    next?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test("concurrent assertion exchange mints once and stale operator authority cannot complete authentication", async () => {
  const f = await fixture();
  try {
    const assertion = await f.assertion(),
      results = await Promise.allSettled([
        f.access.exchange(f.form(assertion)),
        f.access.exchange(f.form(assertion)),
      ]);
    assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
    let allowed = true;
    const checked = new AgentAccess(f.s, { operatorAllowed: () => allowed }),
      signed = await f.assertion(),
      pending = checked.exchange(f.form(signed));
    allowed = false;
    await assert.rejects(pending);
  } finally {
    f.s.close();
  }
});
test("an agent proposes a new wiki page only under an editorial mandate; the page stays hidden until a human accepts it", async () => {
  const f = await fixture();
  try {
    const wiki = new Wiki(f.s),
      token = await f.token(),
      page = {
        title: "Nabire",
        text: "## Letak\n\nNabire berada di pesisir Teluk Cenderawasih [1].\n\nPenduduknya 99.000 jiwa menurut Zeta.",
        citations: ["https://example.org/nabire"],
        basis: [{ source: 1, text: "Nabire terletak di pesisir Teluk Cenderawasih." }],
        language: "id",
        perspective: "Disusun dari sumber terbuka",
      };
    // Not admitted to the community: nothing is revealed.
    const outside = await f.call("etnos_propose_page", { ...page, editorialMandateId: randomUUID(), requestKey: randomUUID() }, token);
    assert.match(JSON.stringify(outside.data), /Not found/);
    f.access.admit(f.owner.actor.id, f.agent.actor.id);
    const refused = await f.call("etnos_propose_page", { ...page, editorialMandateId: randomUUID(), requestKey: randomUUID() }, token);
    assert.match(JSON.stringify(refused.data), /editorial proposal mandate/);
    assert.equal(wiki.all(f.owner.actor.id, f.room.id).length, 0);
    const grant = wiki.grant(f.owner.actor.id, f.agent.actor.id, f.room.id, "Seed pages", f.now() + 3600000, 5),
      key = randomUUID(),
      made = await f.call("etnos_propose_page", { ...page, editorialMandateId: grant.id, requestKey: key }, token),
      result = made.data.result.structuredContent.data;
    assert.equal(result.state, "pending");
    // The reviewer is told what the quotes do not support.
    assert.deepEqual(result.checks.unknown.sort(), ["99.000", "Zeta"]);
    assert.equal(result.checks.uncited, 1);
    // Replay returns the same proposal; a second page with the same title is refused.
    const again = await f.call("etnos_propose_page", { ...page, editorialMandateId: grant.id, requestKey: key }, token);
    assert.equal(again.data.result.structuredContent.data.id, result.id);
    const twin = await f.call("etnos_propose_page", { ...page, editorialMandateId: grant.id, requestKey: randomUUID() }, token);
    assert.match(JSON.stringify(twin.data), /exists or awaits review/);
    // Hidden from the public, from other members and from the public tools.
    assert.throws(() => wiki.read(result.pageId), /Not found/);
    assert.throws(() => wiki.read(result.pageId, f.other.actor.id), /Not found/);
    const peek = await f.call("etnos_read_wiki", { pageId: result.pageId });
    assert.ok(!JSON.stringify(peek.data).includes("Teluk Cenderawasih"));
    assert.ok(!JSON.stringify(await f.call("etnos_search", { query: "Nabire" })).includes(result.pageId));
    // The agent cannot accept its own page; the steward can, and sees the basis.
    assert.throws(() => wiki.decide(f.agent.actor.id, result.id, result.digest, true));
    const seen = wiki.proposals(f.owner.actor.id, result.pageId)[0]!;
    assert.equal(seen.basis.quotes[0].text, page.basis[0]!.text);
    wiki.decide(f.owner.actor.id, result.id, result.digest, true);
    assert.equal(wiki.read(result.pageId).title, "Nabire");
    // A basis quote must point at a cited source.
    const stray = await f.call("etnos_propose_page", { ...page, title: "Paniai", basis: [{ source: 2, text: "Tidak ada sumber kedua." }], editorialMandateId: grant.id, requestKey: randomUUID() }, token);
    assert.match(JSON.stringify(stray.data), /Basis must name a cited source/);
    // A revoked mandate stops new pages.
    wiki.revoke(f.owner.actor.id, grant.id);
    const late = await f.call("etnos_propose_page", { ...page, title: "Dogiyai", editorialMandateId: grant.id, requestKey: randomUUID() }, token);
    assert.match(JSON.stringify(late.data), /editorial proposal mandate/);
  } finally {
    f.s.close();
  }
});
test("one agent switch replaces mandates: operator-steward only, off stops the next write, daily budget, and it rescues acceptance after a mandate expires", async () => {
  const f = await fixture();
  try {
    const wiki = new Wiki(f.s),
      token = await f.token(),
      post = (text: string) => f.call("etnos_create_post", { text, requestKey: randomUUID() }, token);
    f.access.admit(f.owner.actor.id, f.agent.actor.id);
    // Nothing granted: refused.
    assert.match(JSON.stringify((await post("tanpa izin")).data), /mandate required/);
    // Only the agent's operator, as a steward, can turn it on.
    assert.throws(() => f.access.setSwitch(f.other.actor.id, f.agent.actor.id, { enabled: true, posts: true, wiki: false, dailyLimit: 2 }));
    assert.throws(() => f.s.setSwitch(f.other.actor.id, f.agent.actor.id, f.room.id, { enabled: true, posts: true, wiki: false, dailyLimit: 2 }), /operator/);
    assert.throws(() => f.access.setSwitch(f.owner.actor.id, f.agent.actor.id, { enabled: true, posts: true, wiki: false, dailyLimit: 0 }), /Invalid switch/);
    const on = f.access.setSwitch(f.owner.actor.id, f.agent.actor.id, { enabled: true, posts: true, wiki: false, dailyLimit: 2 });
    assert.deepEqual({ ...on, updated: 0 }, { posts: true, wiki: false, dailyLimit: 2, enabled: true, updated: 0 });
    // Posts work without any mandate id, up to the daily limit.
    assert.equal((await post("satu")).data.result.isError, undefined);
    assert.equal((await post("dua")).data.result.isError, undefined);
    assert.match(JSON.stringify((await post("tiga")).data), /budget/);
    f.setNow(f.now() + 86400001);
    const fresh = await f.token(),
      again = await f.call("etnos_create_post", { text: "hari baru", requestKey: randomUUID() }, fresh);
    assert.equal(again.data.result.isError, undefined);
    // Wiki is a separate checkbox.
    const page = { title: "Moni", text: "Orang Moni tinggal di Intan Jaya [1].", citations: ["https://example.org/moni"], basis: [{ source: 1, text: "Orang Moni tinggal di Intan Jaya." }], language: "id", perspective: "Uji" };
    assert.match(JSON.stringify((await f.call("etnos_propose_page", { ...page, requestKey: randomUUID() }, fresh)).data), /editorial proposal mandate/);
    // Off stops the next write at once.
    f.access.setSwitch(f.owner.actor.id, f.agent.actor.id, { enabled: false, posts: true, wiki: false, dailyLimit: 2 });
    assert.match(JSON.stringify((await f.call("etnos_create_post", { text: "mati", requestKey: randomUUID() }, fresh)).data), /mandate required/);
    // A page proposed under a mandate cannot be accepted once the mandate expires, unless the wiki switch is on.
    const grant = wiki.grant(f.owner.actor.id, f.agent.actor.id, f.room.id, "Seed", f.now() + 3600000, 5),
      made = (await f.call("etnos_propose_page", { ...page, editorialMandateId: grant.id, requestKey: randomUUID() }, fresh)).data.result.structuredContent.data;
    f.setNow(f.now() + 3600001);
    assert.throws(() => wiki.decide(f.owner.actor.id, made.id, made.digest, true), /editorial proposal mandate/);
    f.access.setSwitch(f.owner.actor.id, f.agent.actor.id, { enabled: true, posts: false, wiki: true, dailyLimit: 5 });
    wiki.decide(f.owner.actor.id, made.id, made.digest, true);
    assert.equal(wiki.read(made.pageId).title, "Moni");
    // The agent sees its switch; suspending the agent turns the switch off.
    const grants = (await f.call("etnos_my_grants", {}, await f.token())).data.result.structuredContent.data;
    assert.deepEqual(grants.switch, { posts: false, wiki: true, dailyLimit: 5 });
    f.access.suspend(f.owner.actor.id, f.agent.actor.id);
    assert.equal(f.s.switchView(f.agent.actor.id, f.room.id).enabled, false);
  } finally {
    f.s.close();
  }
});
test("live wiki: pages publish before review when the community turns it on; review marks them, revert restores or hides", async () => {
  const f = await fixture();
  try {
    const wiki = new Wiki(f.s),
      token = await f.token(),
      page = (title: string) => ({ title, text: "Danau Paniai berada di Paniai [1].", citations: ["https://example.org/p"], basis: [{ source: 1, text: "Danau Paniai berada di Paniai." }], language: "id", perspective: "Uji", requestKey: randomUUID() });
    f.access.admit(f.owner.actor.id, f.agent.actor.id);
    f.access.setSwitch(f.owner.actor.id, f.agent.actor.id, { enabled: true, posts: false, wiki: true, dailyLimit: 20 });
    // Off by default: the page stays hidden.
    const hidden = (await f.call("etnos_propose_page", page("Paniai"), token)).data.result.structuredContent.data;
    assert.equal(hidden.state, "pending");
    assert.throws(() => wiki.read(hidden.pageId), /Not found/);
    // Only a human steward turns live publishing on.
    assert.throws(() => wiki.setLive(f.other.actor.id, f.room.id, true));
    wiki.setLive(f.owner.actor.id, f.room.id, true);
    const live = (await f.call("etnos_propose_page", page("Deiyai"), token)).data.result.structuredContent.data;
    assert.equal(live.state, "accepted");
    const read = wiki.read(live.pageId);
    assert.equal(read.revision!.review, "unreviewed");
    assert.equal(read.revision!.reviewer, null);
    assert.equal(read.revision!.author.kind, "agent");
    // The queue is for reviewers; the agent and other members cannot review.
    assert.equal(wiki.unreviewed(f.owner.actor.id, f.room.id).length, 1);
    assert.throws(() => wiki.unreviewed(f.other.actor.id, f.room.id));
    assert.throws(() => wiki.review(f.agent.actor.id, live.revisionId, true));
    // An edit by the agent on top also goes live; reverting it restores the first revision.
    const edit = (await f.call("etnos_propose_wiki", { pageId: live.pageId, baseRevision: live.revisionId, text: "Teks salah.", citations: ["https://example.org/p"], language: "id", perspective: "Uji", requestKey: randomUUID() }, token)).data.result.structuredContent.data;
    assert.equal(wiki.read(live.pageId).revision!.text, "Teks salah.");
    wiki.review(f.owner.actor.id, edit.revisionId, false);
    assert.equal(wiki.read(live.pageId).revision!.id, live.revisionId);
    assert.throws(() => wiki.review(f.owner.actor.id, edit.revisionId, true), /Already reviewed/);
    // Reviewing names the reviewer.
    wiki.review(f.owner.actor.id, live.revisionId, true);
    assert.equal(wiki.read(live.pageId).revision!.review, "reviewed");
    assert.equal(wiki.read(live.pageId).revision!.reviewer!.id, f.owner.actor.id);
    // Reverting a new page's only revision hides the page again.
    const lone = (await f.call("etnos_propose_page", page("Dogiyai"), token)).data.result.structuredContent.data;
    wiki.review(f.owner.actor.id, lone.revisionId, false);
    assert.throws(() => wiki.read(lone.pageId), /Not found/);
  } finally {
    f.s.close();
  }
});
