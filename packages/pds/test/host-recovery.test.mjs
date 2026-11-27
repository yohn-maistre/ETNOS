// Account recovery on the identity host: a one-time recovery code shown once at sign-up (only its hash kept),
// a password reset with the handle and that code, and a one-time reset link from the operator or the node.
// Synthetic accounts only; the PLC directory is the in-memory fake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FakePlc, call, domain, hostRuntime, invite, migrate, objectFiles, operator, signup } from "./host-harness.mjs";
import { signGrant } from "../src/host/link-grant.ts";

const KEY = Buffer.alloc(32, 4).toString("base64url");
const persistDir = () => mkdtempSync(join(tmpdir(), "etnos-host-recovery-"));
const session = (mf, identifier, password) => call(mf, "/xrpc/com.atproto.server.createSession", { body: { identifier, password }, headers: { "cf-connecting-ip": "198.51.100.40" } });
const recover = (mf, fields, ip = "198.51.100.41") => call(mf, "/akun/pulihkan", { form: fields, headers: { origin: "https://pds.test", "cf-connecting-ip": ip } });
const codeIn = (html) => /class="code">([A-Z2-9-]{23})</.exec(html)?.[1];

test("sign-up shows a recovery code once and keeps only its hash; handle plus code resets the password once", async () => {
	const dir = persistDir(), mf = hostRuntime({ persist: dir, plc: new FakePlc() });
	try {
		await migrate(mf);
		// The sign-up form shows the code on the page that follows.
		const page = await call(mf, "/akun/baru", {
			form: { code: await invite(mf), label: "dewi", password: "synthetic-password-dewi", password2: "synthetic-password-dewi", age: "18" },
			headers: { origin: "https://pds.test", "cf-connecting-ip": "198.51.100.30" },
		});
		const html = await page.text();
		assert.equal(page.status, 200, html);
		const code = codeIn(html);
		assert.match(code ?? "", /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/);
		// XRPC sign-up returns one too.
		const eko = await signup(mf, "eko");
		assert.match(eko.etnosRecoveryCode, /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/);
		await mf.dispose();
		for (const file of objectFiles(dir, "HostedAccountDurableObject")) {
			const bytes = readFileSync(file).toString("latin1");
			assert.equal(bytes.includes(code), false, "the code is not stored");
			assert.equal(bytes.includes(code.replace(/-/g, "")), false, "the code is not stored");
			assert.equal(bytes.includes(eko.etnosRecoveryCode), false, "the code is not stored");
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("recovery code reset: refusals, one-time use, sessions end, per-account lock", async () => {
	const dir = persistDir(), mf = hostRuntime({ persist: dir, plc: new FakePlc() });
	try {
		await migrate(mf);
		const fajar = await signup(mf, "fajar"), gita = await signup(mf, "gita");
		const handle = `fajar.${domain}`, fresh = "synthetic-new-password-fajar";
		assert.equal((await session(mf, handle, fajar.password)).status, 200);

		// Wrong code, another account's code, a mismatched password and an unknown account are all refused alike.
		for (const fields of [
			{ handle, code: "AAAAA-AAAAA-AAAAA-AAAAA", password: fresh, password2: fresh },
			{ handle, code: gita.etnosRecoveryCode, password: fresh, password2: fresh },
			{ handle: `tidakada.${domain}`, code: fajar.etnosRecoveryCode, password: fresh, password2: fresh },
		]) {
			const r = await recover(mf, fields);
			assert.equal(r.status, 400);
			assert.match(await r.text(), /Nama akun atau kode pemulihan salah/);
		}
		assert.equal((await recover(mf, { handle, code: fajar.etnosRecoveryCode, password: fresh, password2: "other-password" })).status, 400);
		assert.equal((await session(mf, handle, fajar.password)).status, 200, "nothing changed yet");

		// Short form of the name, lower case and no dashes still match.
		const done = await recover(mf, { handle: "fajar", code: fajar.etnosRecoveryCode.toLowerCase().replace(/-/g, " "), password: fresh, password2: fresh });
		const doneHtml = await done.text();
		assert.equal(done.status, 200, doneHtml);
		const next = codeIn(doneHtml);
		assert.ok(next && next !== fajar.etnosRecoveryCode, "a new code replaces the used one");
		assert.equal((await session(mf, handle, fajar.password)).status, 401, "the old password stops working");
		assert.equal((await session(mf, handle, fresh)).status, 200);
		// The old session token no longer works.
		assert.equal((await call(mf, "/xrpc/com.atproto.server.getSession", { token: fajar.accessJwt })).status, 401);
		// The used code cannot be used again.
		assert.equal((await recover(mf, { handle, code: fajar.etnosRecoveryCode, password: "another-password-1", password2: "another-password-1" })).status, 400);

		// Five wrong codes lock this path for the account, even with the right code and from other addresses.
		for (let i = 0; i < 4; i++) await recover(mf, { handle, code: "BBBBB-BBBBB-BBBBB-BBBBB", password: fresh, password2: fresh }, `198.51.100.${50 + i}`);
		const locked = await recover(mf, { handle, code: next, password: "another-password-2", password2: "another-password-2" }, "198.51.100.60");
		assert.equal(locked.status, 429);
		// Another account is not locked by these failures.
		assert.equal((await recover(mf, { handle: `gita.${domain}`, code: gita.etnosRecoveryCode, password: fresh, password2: fresh }, "198.51.100.61")).status, 200);
		// A foreign origin is refused before anything is checked.
		assert.equal((await call(mf, "/akun/pulihkan", { form: { handle, code: next, password: fresh, password2: fresh }, headers: { origin: "https://evil.test" } })).status, 403);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("one network address gets ten reset tries per ten minutes", async () => {
	const dir = persistDir(), mf = hostRuntime({ persist: dir, plc: new FakePlc() });
	try {
		await migrate(mf);
		const statuses = [];
		for (let i = 0; i < 11; i++) statuses.push((await recover(mf, { handle: `orang${i}.${domain}`, code: "CCCCC-CCCCC-CCCCC-CCCCC", password: "pw-123456", password2: "pw-123456" }, "198.51.100.70")).status);
		assert.deepEqual(statuses.slice(0, 10), Array(10).fill(400));
		assert.equal(statuses[10], 429);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("operator reset links: operator token only, one use, expiry, tampering; node-signed links work with the shared key", async () => {
	const dir = persistDir(), mf = hostRuntime({ persist: dir, plc: new FakePlc(), vars: { NODE_LINK_KEY: KEY } });
	try {
		await migrate(mf);
		const hana = await signup(mf, "hana"), handle = `hana.${domain}`;
		assert.equal((await call(mf, "/admin/accounts/reset-link", { body: { handle } })).status, 401);
		assert.equal((await call(mf, "/admin/accounts/reset-link", { body: { handle }, token: "x".repeat(40) })).status, 401);
		assert.equal((await call(mf, "/admin/accounts/reset-link", { body: { handle: `tidakada.${domain}` }, token: operator })).status, 404);
		const made = await call(mf, "/admin/accounts/reset-link", { body: { handle }, token: operator });
		assert.equal(made.status, 200);
		const { url } = await made.json();
		const link = new URL(url).searchParams.get("tautan");
		assert.ok(url.startsWith("https://pds.test/akun/pulihkan?tautan=rg1."));
		assert.match(await (await call(mf, "/akun/pulihkan?tautan=" + encodeURIComponent(link))).text(), /hana\./);
		const fresh = "synthetic-reset-password-hana";
		const used = await recover(mf, { tautan: link, password: fresh, password2: fresh });
		assert.equal(used.status, 200, await used.clone().text());
		assert.ok(codeIn(await used.text()), "a new recovery code is shown");
		assert.equal((await session(mf, handle, hana.password)).status, 401);
		assert.equal((await session(mf, handle, fresh)).status, 200);
		assert.equal((await recover(mf, { tautan: link, password: "second-use-1", password2: "second-use-1" })).status, 400, "a link works once");
		assert.equal((await call(mf, "/akun/pulihkan?tautan=" + encodeURIComponent(link.slice(0, -2) + "AA"))).status, 400, "a changed link is refused");

		// The node signs with the shared key; an expired link and a link signed with another key are refused.
		const nodeLink = await signGrant(KEY, { kind: "reset", id: "33333333-2222-4333-8444-555555555555", handle, expires: Date.now() + 3600000 });
		assert.equal((await recover(mf, { tautan: nodeLink, password: "node-reset-pass", password2: "node-reset-pass" })).status, 200);
		const expired = await signGrant(KEY, { kind: "reset", id: "44444444-2222-4333-8444-555555555555", handle, expires: Date.now() - 1 });
		const foreign = await signGrant(Buffer.alloc(32, 8).toString("base64url"), { kind: "reset", id: "55555555-2222-4333-8444-555555555555", handle, expires: Date.now() + 3600000 });
		const inviteGrant = await signGrant(KEY, { kind: "invite", id: "66666666-2222-4333-8444-555555555555", slots: 1, inviteExpires: Date.now() + 3600000, expires: Date.now() + 3600000 });
		for (const bad of [expired, foreign, inviteGrant]) assert.equal((await recover(mf, { tautan: bad, password: "bad-reset-pass", password2: "bad-reset-pass" })).status, 400);
		assert.equal((await session(mf, handle, "node-reset-pass")).status, 200);
		// Passkey sign-in options are unchanged for the account.
		assert.equal((await call(mf, "/xrpc/space.etnos.passkey.loginOptions", { body: { identifier: handle } })).status, 200);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});
