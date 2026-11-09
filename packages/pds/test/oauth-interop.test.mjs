import {parse as parseConfig} from "jsonc-parser";
// Real official OAuth client against the real local Worker PDS. All network
// edges are intercepted; no account/DID/PLC/relay write reaches the Internet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { BrowserAuth } from "../../../src/oauth.ts";
import { Strata } from "../../../src/store.ts";
const cfg = parseConfig(
    readFileSync("wrangler.test.jsonc", "utf8").replace(/^\/\/[^\n]*\n/, ""),
  ),
  clientOrigin = "https://client.test",
  pdsOrigin = "https://pds.test";
test("official Strata OAuth client completes PAR/PKCE/DPoP with local Strata PDS and writes a permitted record", async () => {
  let auth, mf;
  const writes = [];
  const s = new Strata(":memory:", clientOrigin),
    outbound = [];
  const privateJwk = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  }).privateKey.export({ format: "jwk" });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      name: "strata-pds-oauth-local-only",
      modules: [
        { type: "ESModule", path: "dist/worker.js" },
        ...readdirSync("dist")
          .filter((n) => n.endsWith(".html"))
          .map((n) => ({ type: "Text", path: "dist/" + n })),
      ],
      compatibilityDate: cfg.compatibility_date,
      compatibilityFlags: cfg.compatibility_flags,
      bindings: cfg.vars,
      durableObjects: {
        ACCOUNT: { className: "AccountDurableObject", useSQLite: true },
      },
      r2Buckets: ["BLOBS"],
      outboundService: async (req) => {
        const url = new URL(req.url);
        outbound.push(url.origin + url.pathname);
        if (
          url.origin === clientOrigin &&
          ["/oauth/client-metadata.json", "/oauth/jwks.json"].includes(
            url.pathname,
          )
        )
          return await auth.route(new Request(req.url));
        return new Response("Unexpected synthetic egress", { status: 400 });
      },
    }),
  );
  const fetcher = async (input, init) => {
    const req = new Request(input, init),
      url = new URL(req.url);
    if (
      url.hostname === "bsky.social" &&
      url.pathname === "/xrpc/com.atproto.identity.resolveHandle"
    )
      return Response.json({ did: cfg.vars.DID });
    if (
      url.origin === pdsOrigin &&
      url.pathname === "/xrpc/com.atproto.repo.createRecord"
    )
      writes.push({
        url: req.url,
        method: req.method,
        headers: Object.fromEntries(req.headers),
        body: await req.clone().arrayBuffer(),
      });
    if (url.origin === pdsOrigin)
      return mf.dispatchFetch(req.url, {
        method: req.method,
        headers: Object.fromEntries(req.headers),
        ...(req.body ? { body: await req.arrayBuffer() } : {}),
        redirect: "manual",
      });
    throw Error("Unexpected fixture host " + url.host);
  };
  try {
    auth = await BrowserAuth.create(
      s,
      {
        origin: clientOrigin,
        privateJwk: JSON.stringify(privateJwk),
        sealKey: randomBytes(32).toString("base64url"),
        stewardDid: cfg.vars.DID,
        allowedHosts: ["pds.test", "bsky.social"],
        collection: "org.example.strata.post",
        publishingEnabled: true,
      },
      fetcher,
    );
    const start = await auth.route(
      new Request(clientOrigin + "/auth/start", {
        method: "POST",
        headers: { origin: clientOrigin, "content-type": "application/json" },
        body: JSON.stringify({ handle: "alice.test", publishing: true }),
      }),
    );
    assert.equal(start.status, 200, await start.clone().text());
    const flowCookie = start.headers
        .getSetCookie()
        .find((c) => c.startsWith("__Host-strata_flow="))
        .split(";")[0],
      authorizeUrl = new URL((await start.json()).authorizationUrl);
    const consent = await mf.dispatchFetch(authorizeUrl.href, {
      redirect: "manual",
    });
    assert.equal(consent.status, 200, await consent.clone().text());
    const body = new URLSearchParams({
      client_id: authorizeUrl.searchParams.get("client_id"),
      request_uri: authorizeUrl.searchParams.get("request_uri"),
      action: "approve",
      password: "test-password",
    });
    const approved = await mf.dispatchFetch(pdsOrigin + "/oauth/authorize", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: pdsOrigin,
      },
      body,
      redirect: "manual",
    });
    assert.equal(approved.status, 302, await approved.clone().text());
    const callback = approved.headers.get("location");
    assert.ok(callback.startsWith(clientOrigin + "/auth/callback?"));
    const signed = await auth.route(
      new Request(callback, {
        headers: { cookie: flowCookie, origin: clientOrigin },
      }),
    );
    assert.equal(
      signed.headers.get("location"),
      "/",
      await signed.clone().text(),
    );
    const cookie = signed.headers
        .getSetCookie()
        .find((c) => c.startsWith("__Host-strata="))
        .split(";")[0],
      me = await (
        await auth.route(
          new Request(clientOrigin + "/auth/me", { headers: { cookie } }),
        )
      ).json();
    assert.equal(me.actor.did, cfg.vars.DID);
    const agent = await auth.agent(
      new Request(clientOrigin + "/v1/test", {
        method: "POST",
        headers: { origin: clientOrigin, cookie, "x-strata-csrf": me.csrf },
      }),
    );
    const created = await agent.com.atproto.repo.createRecord({
      repo: cfg.vars.DID,
      collection: "org.example.strata.post",
      rkey: "oauth-interop",
      validate: false,
      record: {
        $type: "org.example.strata.post",
        text: "Synthetic official SDK DPoP write",
      },
    });
    assert.ok(created.data.cid);
    const actual = await (
      await mf.dispatchFetch(
        pdsOrigin +
          "/xrpc/com.atproto.repo.getRecord?repo=" +
          cfg.vars.DID +
          "&collection=org.example.strata.post&rkey=oauth-interop",
      )
    ).json();
    assert.equal(actual.value.text, "Synthetic official SDK DPoP write");
    const replay = writes.at(-1);
    assert.equal(
      (
        await mf.dispatchFetch(replay.url, {
          method: replay.method,
          headers: replay.headers,
          body: replay.body,
        })
      ).status,
      401,
    );
    // A second consent requests identity only; declared client capabilities do
    // not grant write authority when the user grants a smaller scope.
    const readStart = await auth.route(
      new Request(clientOrigin + "/auth/start", {
        method: "POST",
        headers: { origin: clientOrigin, "content-type": "application/json" },
        body: JSON.stringify({ handle: "alice.test", publishing: false }),
      }),
    );
    assert.equal(readStart.status, 200);
    const readCookie = readStart.headers
        .getSetCookie()
        .find((c) => c.startsWith("__Host-strata_flow="))
        .split(";")[0],
      readUrl = new URL((await readStart.json()).authorizationUrl);
    const readApproved = await mf.dispatchFetch(
      pdsOrigin + "/oauth/authorize",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: pdsOrigin,
        },
        body: new URLSearchParams({
          client_id: readUrl.searchParams.get("client_id"),
          request_uri: readUrl.searchParams.get("request_uri"),
          action: "approve",
          password: "test-password",
        }),
        redirect: "manual",
      },
    );
    assert.equal(readApproved.status, 302);
    const readSigned = await auth.route(
        new Request(readApproved.headers.get("location"), {
          headers: { cookie: readCookie, origin: clientOrigin },
        }),
      ),
      readSession = readSigned.headers
        .getSetCookie()
        .find((c) => c.startsWith("__Host-strata="))
        .split(";")[0],
      readMe = await (
        await auth.route(
          new Request(clientOrigin + "/auth/me", {
            headers: { cookie: readSession },
          }),
        )
      ).json();
    const readAgent = await auth.agent(
      new Request(clientOrigin + "/v1/test", {
        method: "POST",
        headers: {
          origin: clientOrigin,
          cookie: readSession,
          "x-strata-csrf": readMe.csrf,
        },
      }),
    );
    await assert.rejects(
      readAgent.com.atproto.repo.createRecord({
        repo: cfg.vars.DID,
        collection: "org.example.strata.post",
        rkey: "denied-write",
        validate: false,
        record: { $type: "org.example.strata.post", text: "Must be denied" },
      }),
      (error) => error.status === 403,
    );
    assert.ok(
      outbound.some(
        (url) => url === clientOrigin + "/oauth/client-metadata.json",
      ),
    );
    console.log(
      JSON.stringify({
        syntheticOnly: true,
        officialOAuthClient: true,
        PAR: true,
        PKCE: true,
        DPoP: true,
        permittedRepositoryWrite: true,
        readOnlyGrantCannotWrite: true,
        dpopReplayDenied: true,
        liveNetworkWrites: 0,
      }),
    );
  } finally {
    await mf.dispose();
    s.close();
  }
});
