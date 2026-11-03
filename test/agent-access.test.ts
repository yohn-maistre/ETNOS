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
      hourlyLimit: 2,
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
