import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { plan, estimate, resourceName } from "../src/pds-hosting.ts";
test("PDS profiles keep account hosting, identity creation and forum admission distinct", () => {
  const p = plan({
    runtime: "cloudflare",
    hostname: "pds.example",
    handle: "alice.example",
    did: "did:web:pds.example",
    accounts: 20,
  });
  assert.equal(p.resources[0].count, 20);
  assert.equal(p.resources[2].count, 20);
  assert.notEqual(resourceName("pds-a.example"), resourceName("pds.a-example"));
  assert.ok(resourceName("longname.".repeat(20) + "example").length <= 56);
  assert.equal(p.spaces, false);
  assert.equal(p.publicRepo, true);
  assert.equal(p.signup, "closed");
  for (const hostname of [
    "http://pds.example",
    "PDS.example",
    "pds.example/path",
    "127.0.0.1",
    "-bad.example",
  ])
    assert.throws(() =>
      plan({
        runtime: "cloudflare",
        hostname,
        handle: "alice.example",
        did: "did:web:pds.example",
      }),
    );
  assert.throws(() =>
    plan({
      runtime: "cloudflare",
      hostname: "pds.example",
      handle: "alice.example",
      did: "did:web:someone-else.example",
    }),
  );
  assert.throws(() =>
    plan({ runtime: "external", origin: "https://pds.example/?token=secret" }),
  );
  assert.throws(() =>
    plan({
      runtime: "server",
      hostname: "pds.example",
      image: "ghcr.io/bluesky-social/pds:latest",
    }),
  );
});
test("cost model exposes assumptions, shared allowances and measured qualification gap", () => {
  const low = estimate();
  assert.equal(low.cloudflarePaid.estimatedAccountTotal, 5);
  assert.equal(low.freeTier.qualified, false);
  assert.ok(low.server.existingNodeElectricityMonthly > 0);
  const high = estimate({
    requestsPerDay: 1000000,
    cpuMsPerRequest: 10,
    doRequestsPerDay: 1000000,
  });
  assert.ok(high.cloudflarePaid.estimatedAccountTotal > 5);
  for (const value of [-1, NaN, Infinity])
    assert.throws(() => estimate({ requestsPerDay: value }));
});
test("agent CLI is parseable, dry by default and never overwrites existing deployment files", () => {
  const dir = mkdtempSync(join(tmpdir(), "strata-pds-plan-")),
    dest = join(dir, "profile");
  const run = (args: string[]) =>
    spawnSync(
      process.execPath,
      ["--disable-warning=ExperimentalWarning", "src/pds-cli.ts", ...args],
      { encoding: "utf8" },
    );
  const args = [
    "init",
    "--runtime",
    "cloudflare",
    "--hostname",
    "pds.example",
    "--handle",
    "alice.example",
    "--did",
    "did:web:pds.example",
    "--directory",
    dest,
    "--json",
  ];
  try {
    const dry = run(args);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(JSON.parse(dry.stdout).written, false);
    assert.equal(existsSync(dest), false);
    const saved = run([...args, "--write"]);
    assert.equal(saved.status, 0, saved.stderr);
    const cfg = JSON.parse(readFileSync(join(dest, "wrangler.jsonc"), "utf8"));
    assert.equal(cfg.vars.RELAYS, "");
    assert.equal(cfg.vars.SPACES_ENABLED, "false");
    assert.equal("JWT_SECRET" in cfg.vars, false);
    assert.ok(cfg.secrets.required.includes("JWT_SECRET"));
    assert.equal(run([...args, "--write"]).status, 1);
    assert.equal(
      JSON.parse(
        run(["doctor", "--manifest", join(dest, "manifest.json"), "--json"])
          .stdout,
      ).productionQualified,
      false,
    );
    assert.equal(
      run(["cost", "--requests-per-day", "NaN", "--json"]).status,
      1,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
