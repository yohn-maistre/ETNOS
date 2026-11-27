// Signed links from the ETNOS node (link-grant.ts): one invitation link makes at most n accounts here,
// and nothing else the node holds can make an account. Synthetic values only; nothing leaves the test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FakePlc, call, domain, hostRuntime, migrate } from "./host-harness.mjs";
import { signGrant } from "../src/host/link-grant.ts";

const KEY = Buffer.alloc(32, 9).toString("base64url"), OTHER = Buffer.alloc(32, 3).toString("base64url");
const persistDir = () => mkdtempSync(join(tmpdir(), "etnos-host-links-"));
const create = (mf, label, inviteCode, ip = "198.51.100.7") =>
	call(mf, "/xrpc/com.atproto.server.createAccount", {
		body: { handle: `${label}.${domain}`, password: "synthetic-password-" + label, inviteCode },
		headers: { "cf-connecting-ip": ip },
	});
const grant = (overrides = {}, key = KEY) =>
	signGrant(key, { kind: "invite", id: "11111111-2222-4333-8444-555555555555", slots: 2, inviteExpires: Date.now() + 7 * 86400000, expires: Date.now() + 3600000, ...overrides });

test("a node grant makes at most its number of accounts; forged, expired and reset grants make none", async () => {
	const dir = persistDir(), mf = hostRuntime({ persist: dir, plc: new FakePlc(), vars: { NODE_LINK_KEY: KEY } });
	try {
		await migrate(mf);
		const code = await grant();
		assert.equal((await create(mf, "satu", code)).status, 200);
		assert.equal((await create(mf, "dua", code, "198.51.100.8")).status, 200);
		const third = await create(mf, "tiga", code, "198.51.100.9");
		assert.equal(third.status, 400);
		assert.equal((await third.json()).error, "InvalidInviteCode");
		// The same grant signed again (a fresh link visit) shares the same two slots.
		assert.equal((await create(mf, "empat", await grant())).status, 400);

		for (const bad of [
			await grant({ id: "99999999-2222-4333-8444-555555555555" }, OTHER),
			await grant({ id: "99999999-2222-4333-8444-555555555555", expires: Date.now() - 1 }),
			await grant({ id: "99999999-2222-4333-8444-555555555555", inviteExpires: Date.now() - 1 }),
			await signGrant(KEY, { kind: "reset", id: "99999999-2222-4333-8444-555555555555", handle: `lima.${domain}`, expires: Date.now() + 3600000 }),
			(await grant({ id: "99999999-2222-4333-8444-555555555555" })).replace(/.$/, (c) => (c === "A" ? "B" : "A")),
		]) {
			const r = await create(mf, "lima", bad, "198.51.100.10");
			assert.equal(r.status, 400, bad.slice(0, 4));
			assert.equal((await r.json()).error, "InvalidInviteCode");
		}

		// The sign-up page opened from a node link carries the grant without showing it as a field.
		const page = await (await call(mf, "/akun/baru?kode=" + encodeURIComponent(code))).text();
		assert.match(page, /Kode undangan/);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("without NODE_LINK_KEY the host accepts no node grant", async () => {
	const dir = persistDir(), mf = hostRuntime({ persist: dir, plc: new FakePlc() });
	try {
		await migrate(mf);
		const r = await create(mf, "enam", await grant());
		assert.equal(r.status, 400);
		assert.equal((await r.json()).error, "InvalidInviteCode");
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});
