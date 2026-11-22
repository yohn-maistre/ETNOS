import {parse as parseConfig} from "jsonc-parser";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readCarWithRoot, verifyRepoCar } from "@atproto/repo";
const cfg = parseConfig(
    readFileSync("wrangler.test.jsonc", "utf8").replace(/^\/\/[^\n]*\n/, ""),
  ),
  origin = "https://pds.test";
function runtime(persist) {
  return new Miniflare(
    convertV4MiniflareOptions({
      name: "etnos-pds-local-only",
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
      resourcePersistencePath: persist,
    }),
  );
}
const request = (mf, path, body, token) =>
  mf.dispatchFetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
test("real workerd PDS: signed repository/CAR, R2, isolation, restart, bounds and no implicit service proxy", async () => {
  const dir = mkdtempSync(join(tmpdir(), "etnos-pds-local-"));
  let mf = runtime(dir);
  try {
    assert.equal((await request(mf, "/health")).status, 200);
    const metadata = await (
      await request(mf, "/.well-known/oauth-authorization-server")
    ).json();
    assert.equal(metadata.issuer, origin);
    assert.ok(metadata.dpop_signing_alg_values_supported.includes("ES256"));
    const login = await request(mf, "/xrpc/com.atproto.server.createSession", {
      identifier: "alice.test",
      password: "test-password",
    });
    assert.equal(login.status, 200);
    const session = await login.json();
    const racing = await Promise.all([
      request(
        mf,
        "/xrpc/com.atproto.server.refreshSession",
        {},
        session.refreshJwt,
      ),
      request(
        mf,
        "/xrpc/com.atproto.server.refreshSession",
        {},
        session.refreshJwt,
      ),
    ]);
    assert.deepEqual(racing.map((r) => r.status).sort(), [200, 400]);
    const nextSession = await racing.find((r) => r.status === 200).json();
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.server.refreshSession",
          {},
          session.refreshJwt,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.server.deleteSession",
          {},
          nextSession.refreshJwt,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.server.refreshSession",
          {},
          nextSession.refreshJwt,
        )
      ).status,
      400,
    );

    assert.equal(
      (await mf.dispatchFetch("https://wrong.test/health")).status,
      400,
    );
    assert.equal(
      (
        await request(mf, "/xrpc/com.atproto.server.createAccount", {
          handle: "stranger.test",
        })
      ).status,
      403,
    );
    assert.equal(
      (await request(mf, "/xrpc/app.bsky.feed.getTimeline")).status,
      501,
    );
    const body = {
      repo: cfg.vars.DID,
      collection: "org.example.strata.post",
      rkey: "first",
      validate: false,
      record: {
        $type: "org.example.strata.post",
        text: "Synthetic local PDS record",
        createdAt: "2026-11-01T00:00:00Z",
      },
    };
    assert.equal(
      (await request(mf, "/xrpc/com.atproto.repo.createRecord", body)).status,
      401,
    );
    let response = await request(
        mf,
        "/xrpc/com.atproto.repo.createRecord",
        body,
        cfg.vars.AUTH_TOKEN,
      ),
      created = await response.json();
    assert.equal(response.status, 200, JSON.stringify(created));
    assert.ok(created.cid);
    const casResponse = await request(
        mf,
        "/xrpc/com.atproto.repo.createRecord",
        { ...body, rkey: "cas" },
        cfg.vars.AUTH_TOKEN,
      ),
      cas = await casResponse.json();
    assert.equal(casResponse.status, 200);
    const swaps = await Promise.all(
      ["A", "B"].map((text) =>
        request(
          mf,
          "/xrpc/com.atproto.repo.putRecord",
          {
            ...body,
            rkey: "cas",
            swapRecord: cas.cid,
            record: { ...body.record, text },
          },
          cfg.vars.AUTH_TOKEN,
        ),
      ),
    );
    assert.deepEqual(swaps.map((r) => r.status).sort(), [200, 400]);
    // Commit preconditions apply to batch/create/delete as well as putRecord.
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.repo.createRecord",
          { ...body, rkey: "stale-create", swapCommit: "stale" },
          cfg.vars.AUTH_TOKEN,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.repo.applyWrites",
          { repo: cfg.vars.DID, writes: [], swapCommit: "stale" },
          cfg.vars.AUTH_TOKEN,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.repo.deleteRecord",
          {
            repo: cfg.vars.DID,
            collection: body.collection,
            rkey: "first",
            swapRecord: "stale",
          },
          cfg.vars.AUTH_TOKEN,
        )
      ).status,
      400,
    );
    // Identical record bytes may belong to two paths; deleting one retains the other.
    const twins = {
      ...body,
      record: { ...body.record, text: "Synthetic shared record bytes" },
    };
    for (const rkey of ["twin-a", "twin-b"])
      assert.equal(
        (
          await request(
            mf,
            "/xrpc/com.atproto.repo.createRecord",
            { ...twins, rkey },
            cfg.vars.AUTH_TOKEN,
          )
        ).status,
        200,
      );
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.repo.deleteRecord",
          { repo: cfg.vars.DID, collection: body.collection, rkey: "twin-a" },
          cfg.vars.AUTH_TOKEN,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.repo.getRecord?repo=" +
            cfg.vars.DID +
            "&collection=" +
            body.collection +
            "&rkey=twin-b",
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await mf.dispatchFetch(origin + "/xrpc/com.atproto.repo.importRepo", {
          method: "POST",
          headers: {
            authorization: "Bearer " + cfg.vars.AUTH_TOKEN,
            "content-type": "application/vnd.ipld.car",
          },
          body: "not a CAR",
        })
      ).status,
      409,
    );
    const record = await (
      await request(
        mf,
        "/xrpc/com.atproto.repo.getRecord?repo=" +
          cfg.vars.DID +
          "&collection=org.example.strata.post&rkey=first",
      )
    ).json();
    assert.equal(record.value.text, "Synthetic local PDS record");
    const car = await request(
        mf,
        "/xrpc/com.atproto.sync.getRepo?did=" + cfg.vars.DID,
      ),
      bytes = new Uint8Array(await car.arrayBuffer());
    assert.equal(car.status, 200);
    const parsed = await readCarWithRoot(bytes);
    assert.ok(parsed.blocks.size > 1);
    await verifyRepoCar(
      bytes,
      cfg.vars.DID,
      "did:key:" + cfg.vars.SIGNING_KEY_PUBLIC,
    );
    const blob = await mf.dispatchFetch(
      origin + "/xrpc/com.atproto.repo.uploadBlob",
      {
        method: "POST",
        headers: {
          authorization: "Bearer " + cfg.vars.AUTH_TOKEN,
          "content-type": "text/plain",
        },
        body: "Synthetic local blob",
      },
    );
    assert.equal(blob.status, 200);
    const uploaded = await blob.json();
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.sync.getBlob?did=" +
            cfg.vars.DID +
            "&cid=" +
            uploaded.blob.ref.$link,
        )
      ).status,
      404,
    );
    const attached = await request(
      mf,
      "/xrpc/com.atproto.repo.createRecord",
      {
        ...body,
        rkey: "with-blob",
        record: { ...body.record, attachment: uploaded.blob },
      },
      cfg.vars.AUTH_TOKEN,
    );
    assert.equal(attached.status, 200, await attached.text());
    const download = await request(
      mf,
      "/xrpc/com.atproto.sync.getBlob?did=" +
        cfg.vars.DID +
        "&cid=" +
        uploaded.blob.ref.$link,
    );
    assert.equal(await download.text(), "Synthetic local blob");
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.repo.createRecord",
          { ...body, repo: "did:web:other.test", rkey: "wrong" },
          cfg.vars.AUTH_TOKEN,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await mf.dispatchFetch(origin + "/xrpc/com.atproto.repo.createRecord", {
          method: "POST",
          headers: {
            authorization: "Bearer " + cfg.vars.AUTH_TOKEN,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            ...body,
            record: { ...body.record, text: "x".repeat(270000) },
          }),
        })
      ).status,
      413,
    );
    await mf.dispose();
    mf = runtime(dir);
    assert.equal(
      (
        await request(
          mf,
          "/xrpc/com.atproto.server.refreshSession",
          {},
          nextSession.refreshJwt,
        )
      ).status,
      400,
    );
    const restored = await (
      await request(
        mf,
        "/xrpc/com.atproto.repo.getRecord?repo=" +
          cfg.vars.DID +
          "&collection=org.example.strata.post&rkey=first",
      )
    ).json();
    assert.equal(restored.cid, created.cid);
    // Transactional auth limits persist independently of worker-isolate restarts.
    const stub = (await mf.getDurableObjectNamespace("ACCOUNT")).getByName(
        "account",
      ),
      key = "a".repeat(64),
      now = Date.now();
    for (let i = 0; i < 30; i++)
      assert.equal(await stub.consumeAuthBudget(key, now), true);
    assert.equal(await stub.consumeAuthBudget(key, now), false);
    console.log(
      JSON.stringify({
        syntheticOnly: true,
        publicIdentitiesCreated: 0,
        officialRepoVerification: true,
        restartPreserved: true,
        r2: true,
        bounded: true,
        concurrentRefresh: true,
        concurrentConditionalEdit: true,
        sharedRecordCidPreserved: true,
        destructiveImportDenied: true,
      }),
    );
  } finally {
    await mf.dispose();
    rmSync(dir, { recursive: true, force: true });
  }
});
