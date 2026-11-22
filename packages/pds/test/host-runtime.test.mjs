// Multi-account identity host on real workerd (Miniflare). Synthetic identities
// only; the PLC directory is an in-memory fake and no request leaves the test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { webcrypto } from "node:crypto";
import { FakePlc, call, cfg, domain, hostRuntime, invite, migrate, objectFiles, operator, origin, signup } from "./host-harness.mjs";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const base58btc = {
	encode(bytes) {
		let n = BigInt("0x" + (Buffer.from(bytes).toString("hex") || "0")), out = "";
		while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
		for (const b of bytes) { if (b) break; out = "1" + out; }
		return "z" + out;
	},
};
const persistDir = () => mkdtempSync(join(tmpdir(), "etnos-host-"));
const post = (label, text) => ({ repo: undefined, collection: "org.example.post", rkey: label, validate: false, record: { $type: "org.example.post", text } });

test("accounts are created by invite, resolve by handle and carry the right PLC genesis", async () => {
	const dir = persistDir(), plc = new FakePlc(), mf = hostRuntime({ persist: dir, plc });
	try {
		await migrate(mf);
		const alice = await signup(mf, "alice");
		assert.match(alice.did, /^did:plc:[a-z2-7]{24}$/);
		assert.equal(alice.handle, `alice.${domain}`);
		const op = plc.ops.get(alice.did)[0];
		assert.deepEqual(op.alsoKnownAs, [`at://alice.${domain}`]);
		assert.equal(op.services.atproto_pds.endpoint, origin);
		assert.equal(op.rotationKeys.length, 2);
		assert.equal(op.rotationKeys[0], cfg.vars.ESCROW_ROTATION_KEY, "escrow key has priority over the host key");
		assert.notEqual(op.verificationMethods.atproto, op.rotationKeys[1], "signing key and rotation key are different keys");

		// Handle host serves only the well-known DID; the service host resolves it.
		const wk = await call(mf, "/.well-known/atproto-did", { host: `https://alice.${domain}` });
		assert.equal(await wk.text(), alice.did);
		assert.equal((await call(mf, "/xrpc/com.atproto.repo.listRecords?repo=x", { host: `https://alice.${domain}` })).status, 404);
		assert.equal((await call(mf, "/.well-known/atproto-did", { host: `https://nobody.${domain}` })).status, 404);
		assert.equal((await call(mf, "/.well-known/atproto-did", { host: `https://a.b.${domain}` })).status, 400);
		assert.equal((await call(mf, "/health", { host: "https://elsewhere.test" })).status, 400);
		assert.deepEqual(await (await call(mf, `/xrpc/com.atproto.identity.resolveHandle?handle=ALICE.${domain}`)).json(), { did: alice.did });
		const described = await (await call(mf, "/xrpc/com.atproto.server.describeServer")).json();
		assert.equal(described.inviteCodeRequired, true);
		assert.deepEqual(described.availableUserDomains, ["." + domain]);
		assert.equal(described.did, "did:web:pds.test");

		// The HTML sign-up page creates an account too, and refuses bad input plainly.
		const code = await invite(mf);
		const page = await call(mf, "/akun/baru?kode=" + code);
		// Pages keep Origin on their own form posts (no-referrer would make the browser send "Origin: null").
		assert.equal(page.headers.get("referrer-policy"), "same-origin");
		assert.equal((await call(mf, "/akun/baru", { form: { code, label: "bob", password: "x", password2: "x", age: "16" }, headers: { origin: "null" } })).status, 403);
		assert.equal(page.status, 200);
		assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/);
		assert.match(await page.text(), /Kode undangan/);
		const mismatch = await call(mf, "/akun/baru", { form: { code, label: "bob", password: "synthetic-pw-1", password2: "other-pw-1", age: "16" }, headers: { origin } });
		assert.equal(mismatch.status, 400);
		assert.match(await mismatch.text(), /Kedua kata sandi tidak sama/);
		const reserved = await call(mf, "/akun/baru", { form: { code, label: "admin", password: "synthetic-pw-1", password2: "synthetic-pw-1", age: "16" }, headers: { origin } });
		assert.match(await reserved.text(), /dipakai oleh sistem/);
		const done = await call(mf, "/akun/baru", { form: { code, label: "bob", password: "synthetic-pw-1", password2: "synthetic-pw-1", age: "16" }, headers: { origin } });
		const html = await done.text();
		assert.equal(done.status, 200, html);
		assert.match(html, /bob\.people\.test/);
		assert.match(html, /https:\/\/client\.test\/login\?handle=bob\.people\.test/);
		// A used invite cannot be used again, for any name.
		const reuse = await call(mf, "/xrpc/com.atproto.server.createAccount", { body: { handle: "carol", password: "synthetic-pw-1", inviteCode: code } });
		assert.equal((await reuse.json()).error, "InvalidInviteCode");
		assert.equal((await call(mf, "/xrpc/com.atproto.server.createAccount", { body: { handle: "carol", password: "synthetic-pw-1", inviteCode: "x".repeat(32) } })).status, 400);
		// Operator surface lists accounts but never keys.
		const listed = await (await call(mf, "/admin/accounts", { token: operator })).text();
		assert.match(listed, /alice/);
		assert.doesNotMatch(listed, /ciphertext|signing|rotation|password/i);
		assert.equal((await call(mf, "/admin/accounts")).status, 401);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("one account can never act as another", async () => {
	const dir = persistDir(), plc = new FakePlc(), mf = hostRuntime({ persist: dir, plc });
	try {
		const db = await migrate(mf);
		const alice = await signup(mf, "alice"), bob = await signup(mf, "bob");
		const bobWrite = await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: bob.accessJwt, body: { ...post("b1", "bob"), repo: bob.did } });
		assert.equal(bobWrite.status, 200);
		const bobBefore = await (await call(mf, `/xrpc/com.atproto.sync.getLatestCommit?did=${bob.did}`)).json();

		// Alice's token naming Bob's repo is refused on every write route.
		const writes = [
			["createRecord", { ...post("x", "forged"), repo: bob.did }],
			["putRecord", { ...post("b1", "forged"), repo: bob.did }],
			["deleteRecord", { repo: bob.did, collection: "org.example.post", rkey: "b1" }],
			["applyWrites", { repo: bob.did, writes: [{ $type: "com.atproto.repo.applyWrites#create", collection: "org.example.post", rkey: "y", value: { $type: "org.example.post", text: "forged" } }] }],
		];
		for (const [method, body] of writes) {
			const r = await call(mf, "/xrpc/com.atproto.repo." + method, { token: alice.accessJwt, body });
			assert.ok(r.status >= 400 && r.status < 500, method + " must be refused, got " + r.status);
		}
		const bobAfter = await (await call(mf, `/xrpc/com.atproto.sync.getLatestCommit?did=${bob.did}`)).json();
		assert.deepEqual(bobAfter, bobBefore, "Bob's repository is unchanged");

		// A token signed with Alice's secret but naming Bob is rejected; so is one for an unknown DID,
		// and neither wakes or creates any account object.
		const [h, p, s] = alice.accessJwt.split(".");
		const payload = JSON.parse(Buffer.from(p, "base64url"));
		const forged = [h, Buffer.from(JSON.stringify({ ...payload, sub: bob.did })).toString("base64url"), s].join(".");
		const filesBefore = objectFiles(dir, "HostedAccountDurableObject").length;
		assert.equal((await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: forged, body: { ...post("z", "forged"), repo: bob.did } })).status, 401);
		const ghost = [h, Buffer.from(JSON.stringify({ ...payload, sub: "did:plc:aaaaaaaaaaaaaaaaaaaaaaaa" })).toString("base64url"), s].join(".");
		assert.equal((await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: ghost, body: post("z", "x") })).status, 401);
		for (let i = 0; i < 5; i++) assert.equal((await call(mf, `/xrpc/com.atproto.repo.listRecords?repo=did:plc:${"b".repeat(23)}${i}&collection=x`)).status, 404);
		assert.equal(objectFiles(dir, "HostedAccountDurableObject").length, filesBefore, "no object created for forged or unknown DIDs");

		// The operator token is not an account credential.
		assert.equal((await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: operator, body: { ...post("o", "op"), repo: alice.did } })).status, 401);
		assert.equal((await call(mf, "/xrpc/com.atproto.server.getSession", { token: operator })).status, 401);

		// Defence in depth: the account object itself refuses a DID that is not its own.
		const row = await db.prepare("SELECT account_id FROM accounts WHERE did = ?").bind(alice.did).first();
		const ns = await mf.getDurableObjectNamespace("ACCOUNT");
		const aliceObject = ns.get(ns.idFromName("account:" + row.account_id));
		await assert.rejects(aliceObject.repoFor(bob.did));
		await assert.rejects(aliceObject.checkPassword(bob.did, bob.password));
		await assert.rejects(aliceObject.purge(bob.did));
		assert.equal((await aliceObject.fetch("https://do/xrpc/com.atproto.sync.getRepo", { headers: { "x-etnos-expected-did": bob.did } })).status, 404);

		// Reads resolve to exactly the named account.
		const aliceList = await (await call(mf, `/xrpc/com.atproto.repo.listRecords?repo=${alice.did}&collection=org.example.post`)).json();
		assert.equal(aliceList.records.length, 0);
		const bobList = await (await call(mf, `/xrpc/com.atproto.repo.listRecords?repo=BOB.${domain}&collection=org.example.post`)).json();
		assert.equal(bobList.records.length, 1);
		// Bob's password does not open Alice's session.
		assert.equal((await call(mf, "/xrpc/com.atproto.server.createSession", { body: { identifier: alice.handle, password: bob.password } })).status, 401);
		// listRepos lists exactly the active accounts.
		const repos = (await (await call(mf, "/xrpc/com.atproto.sync.listRepos")).json()).repos.map((r) => r.did).sort();
		assert.deepEqual(repos, [alice.did, bob.did].sort());
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("concurrent sign-ups: one winner per handle and per invite; accounts write in parallel", async () => {
	const dir = persistDir(), plc = new FakePlc(), mf = hostRuntime({ persist: dir, plc });
	try {
		await migrate(mf);
		const codes = await Promise.all([1, 2, 3, 4, 5].map(() => invite(mf)));
		const sameHandle = await Promise.all(
			codes.map((code, i) => call(mf, "/xrpc/com.atproto.server.createAccount", { body: { handle: "dina", password: "synthetic-pw-" + i, inviteCode: code }, headers: { "cf-connecting-ip": "203.0.113." + i } })),
		);
		assert.deepEqual(sameHandle.map((r) => r.status).sort(), [200, 400, 400, 400, 400]);
		const one = await invite(mf);
		const sameInvite = await Promise.all(
			["eka", "fajar", "gita", "hana"].map((h, i) => call(mf, "/xrpc/com.atproto.server.createAccount", { body: { handle: h, password: "synthetic-pw-x", inviteCode: one }, headers: { "cf-connecting-ip": "203.0.113.2" + i } })),
		);
		assert.deepEqual(sameInvite.map((r) => r.status).sort(), [200, 400, 400, 400]);
		assert.equal(plc.ops.size, 2, "exactly two DIDs were registered");

		const a = await signup(mf, "ira"), b = await signup(mf, "joko");
		const both = await Promise.all(
			Array.from({ length: 8 }, (_, i) => {
				const who = i % 2 ? a : b;
				return call(mf, "/xrpc/com.atproto.repo.createRecord", { token: who.accessJwt, body: { ...post("p" + i, "parallel " + i), repo: who.did } });
			}),
		);
		assert.ok(both.every((r) => r.status === 200));
		for (const who of [a, b]) {
			const list = await (await call(mf, `/xrpc/com.atproto.repo.listRecords?repo=${who.did}&collection=org.example.post`)).json();
			assert.equal(list.records.length, 4);
			assert.ok(list.records.every((r) => r.uri.startsWith(`at://${who.did}/`)));
		}
		// A replayed refresh token wins once.
		const racing = await Promise.all([a.refreshJwt, a.refreshJwt].map((t) => call(mf, "/xrpc/com.atproto.server.refreshSession", { method: "POST", token: t })));
		assert.deepEqual(racing.map((r) => r.status).sort(), [200, 400]);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("an uncertain PLC submission is reconciled by reading, never re-posted blindly", async () => {
	const dir = persistDir(), plc = new FakePlc(), mf = hostRuntime({ persist: dir, plc });
	try {
		const db = await migrate(mf);
		// Lost response after the directory stored the operation: read shows it, sign-up succeeds with one POST.
		plc.fail = "500-after-store";
		const first = await signup(mf, "kirana");
		assert.equal(plc.posts, 1);
		assert.ok(plc.ops.has(first.did));

		// Network failure before storing: the host reports "not finished", keeps the claim, and the
		// retry with the same invite and name reads first, then posts once. The DID does not change.
		const code = await invite(mf);
		plc.fail = "network-before-store";
		const posts = plc.posts;
		const failed = await call(mf, "/xrpc/com.atproto.server.createAccount", { body: { handle: "lani", password: "synthetic-pw-lani", inviteCode: code } });
		assert.equal(failed.status, 503);
		assert.equal((await failed.json()).error, "RegistrationIncomplete");
		const pending = await db.prepare("SELECT did, status FROM accounts WHERE handle = ?").bind(`lani.${domain}`).first();
		assert.equal(pending.status, "pending");
		assert.equal((await call(mf, "/.well-known/atproto-did", { host: `https://lani.${domain}` })).status, 404, "a pending account does not resolve");
		// Another person with the same code and a different password cannot take over the pending registration.
		assert.equal((await call(mf, "/xrpc/com.atproto.server.createAccount", { body: { handle: "lani", password: "someone-else-pw", inviteCode: code } })).status, 400);
		const readsBefore = plc.reads;
		const retried = await call(mf, "/xrpc/com.atproto.server.createAccount", { body: { handle: "lani", password: "synthetic-pw-lani", inviteCode: code } });
		assert.equal(retried.status, 200);
		assert.equal((await retried.json()).did, pending.did, "the resumed registration keeps its DID");
		assert.ok(plc.reads > readsBefore, "the retry read the directory first");
		assert.equal(plc.posts, posts + 2, "one failed POST, then exactly one more");
		assert.equal(plc.ops.size, 2);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

async function decryptKeys(dir, keks, did) {
	const keys = [];
	for (const file of objectFiles(dir, "HostedAccountDurableObject")) {
		const db = new DatabaseSync(file, { readOnly: true });
		try {
			const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='host_identity'").all();
			if (!tables.length) continue;
			const id = db.prepare("SELECT did FROM host_identity").get();
			if (!id || id.did !== did) continue;
			for (const row of db.prepare("SELECT purpose, kek_version, nonce, ciphertext FROM account_keys").all()) {
				const enc = new TextEncoder();
				const base = await webcrypto.subtle.importKey("raw", Buffer.from(keks[row.kek_version], "base64url"), "HKDF", false, ["deriveBits"]);
				const bits = await webcrypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: enc.encode(did), info: enc.encode(`account-key/${row.purpose}/v1`) }, base, 256);
				const key = await webcrypto.subtle.importKey("raw", bits, "AES-GCM", false, ["decrypt"]);
				const clear = new Uint8Array(await webcrypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(row.nonce, "base64url"), additionalData: enc.encode(`${did}|${row.purpose}|${row.kek_version}`) }, key, Buffer.from(row.ciphertext, "base64url")));
				await assert.rejects(webcrypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(row.nonce, "base64url"), additionalData: enc.encode(`${did}|${row.purpose}|${row.kek_version + 1}`) }, key, Buffer.from(row.ciphertext, "base64url")), "changed associated data fails closed");
				keys.push({ purpose: row.purpose, version: row.kek_version, clear, file });
			}
		} finally {
			db.close();
		}
	}
	return keys;
}

test("private keys stay wrapped at rest, never appear in any response, and survive KEK rotation", async () => {
	const dir = persistDir(), plc = new FakePlc();
	let mf = hostRuntime({ persist: dir, plc });
	const seen = [];
	const record = async (r) => {
		seen.push([...r.headers].join("\n") + "\n" + (await r.clone().text()));
		return r;
	};
	try {
		await migrate(mf);
		const alice = await signup(mf, "alice");
		seen.push(JSON.stringify(alice));
		// A full scripted lifecycle with error paths.
		const paths = [
			["/xrpc/com.atproto.repo.createRecord", { token: alice.accessJwt, body: { ...post("k", "key test"), repo: alice.did } }],
			["/xrpc/com.atproto.repo.describeRepo?repo=" + alice.did, {}],
			["/xrpc/com.atproto.sync.getRepo?did=" + alice.did, {}],
			["/xrpc/com.atproto.sync.getRepoStatus?did=" + alice.did, {}],
			["/xrpc/com.atproto.server.getSession", { token: alice.accessJwt }],
			["/xrpc/com.atproto.server.createSession", { body: { identifier: alice.did, password: "wrong-password" } }],
			["/xrpc/com.atproto.server.createSession", { body: { identifier: alice.handle, password: alice.password } }],
			["/xrpc/com.atproto.identity.getRecommendedDidCredentials", { token: alice.accessJwt }],
			["/xrpc/com.atproto.identity.signPlcOperation", { token: alice.accessJwt, body: {} }],
			["/admin/accounts", { token: operator }],
			["/xrpc/com.atproto.repo.createRecord", { token: alice.accessJwt, body: { repo: alice.did } }],
		];
		for (const [path, opts] of paths) await record(await call(mf, path, opts));
		const keys = await decryptKeys(dir, { 1: cfg.vars.ACCOUNT_KEK_V1 }, alice.did);
		assert.deepEqual(keys.map((k) => k.purpose).sort(), ["kem", "rotation", "signing"]);
		assert.ok(keys.every((k) => k.clear.length === 32 && k.version === 1));
		const raw = readFileSync(keys[0].file);
		for (const key of keys) {
			const b = Buffer.from(key.clear);
			const forms = [b.toString("hex"), b.toString("base64"), b.toString("base64url"), base58btc.encode(key.clear), "z" + base58btc.encode(key.clear).slice(1)];
			for (const text of seen) for (const form of forms) assert.ok(!text.includes(form), `${key.purpose} key leaked in a response`);
			assert.equal(raw.indexOf(b), -1, `${key.purpose} key is stored in plaintext`);
			assert.equal(raw.indexOf(Buffer.from(b.toString("hex"))), -1);
		}
		await mf.dispose();

		// Rotation: add V2 and make it current. Old rows decrypt and are rewrapped on use.
		const v2 = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString("base64url");
		mf = hostRuntime({ persist: dir, plc, vars: { ACCOUNT_KEK_V2: v2, ACCOUNT_KEK_CURRENT: "2" } });
		const w = await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: alice.accessJwt, body: { ...post("k2", "after rotation"), repo: alice.did } });
		assert.equal(w.status, 200, await w.clone().text());
		await mf.dispose();
		const rotated = await decryptKeys(dir, { 1: cfg.vars.ACCOUNT_KEK_V1, 2: v2 }, alice.did);
		assert.ok(rotated.some((k) => k.purpose === "signing" && k.version === 2), "signing key rewrapped under V2");
		assert.deepEqual(Buffer.from(rotated.find((k) => k.purpose === "signing").clear), Buffer.from(keys.find((k) => k.purpose === "signing").clear));

		// With V1 replaced by another value, the rewrapped signing key still signs commits.
		mf = hostRuntime({ persist: dir, plc, vars: { ACCOUNT_KEK_V2: v2, ACCOUNT_KEK_CURRENT: "2", ACCOUNT_KEK_V1: Buffer.alloc(32, 7).toString("base64url") } });
		const after = await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: (await (await call(mf, "/xrpc/com.atproto.server.createSession", { body: { identifier: alice.did, password: alice.password } })).json()).accessJwt, body: { ...post("k3", "v2 only"), repo: alice.did } });
		// Session tokens are derived from V1, so the new session signs with the replaced V1; the write must still commit with the V2 signing key.
		assert.equal(after.status, 200, await after.clone().text());
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("withdrawal: deactivation hides the account and stops its tokens; deletion purges everything and keeps the name", async () => {
	const dir = persistDir(), plc = new FakePlc(), mf = hostRuntime({ persist: dir, plc });
	try {
		const db = await migrate(mf);
		const alice = await signup(mf, "alice"), bob = await signup(mf, "bob");
		await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: alice.accessJwt, body: { ...post("a", "hello"), repo: alice.did } });

		assert.equal((await call(mf, "/xrpc/com.atproto.server.deactivateAccount", { token: alice.accessJwt, body: {} })).status, 200);
		assert.equal((await call(mf, "/.well-known/atproto-did", { host: `https://alice.${domain}` })).status, 404);
		assert.equal((await (await call(mf, `/xrpc/com.atproto.repo.getRecord?repo=${alice.did}&collection=org.example.post&rkey=a`)).json()).error, "RepoDeactivated");
		assert.equal((await call(mf, "/xrpc/com.atproto.server.getSession", { token: alice.accessJwt })).status, 401, "old tokens stop at once");
		assert.equal((await call(mf, "/xrpc/com.atproto.server.refreshSession", { method: "POST", token: alice.refreshJwt })).status, 400);
		assert.equal((await call(mf, "/xrpc/com.atproto.identity.resolveHandle?handle=alice." + domain)).status, 400);
		const repos = (await (await call(mf, "/xrpc/com.atproto.sync.listRepos")).json()).repos.map((r) => r.did);
		assert.deepEqual(repos, [bob.did]);
		// Signing in again shows the state; only reactivation is allowed with that session.
		const again = await (await call(mf, "/xrpc/com.atproto.server.createSession", { body: { identifier: alice.handle, password: alice.password } })).json();
		assert.equal(again.active, false);
		assert.equal(again.status, "deactivated");
		assert.equal((await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: again.accessJwt, body: { ...post("b", "x"), repo: alice.did } })).status, 401);
		assert.equal((await call(mf, "/xrpc/com.atproto.server.activateAccount", { token: again.accessJwt, body: {} })).status, 200);
		assert.equal(await (await call(mf, "/.well-known/atproto-did", { host: `https://alice.${domain}` })).text(), alice.did);

		// Takedown by the operator stops the account; it is not deletion.
		assert.equal((await call(mf, "/admin/accounts/takedown", { token: operator, body: { did: bob.did } })).status, 200);
		assert.equal((await call(mf, "/xrpc/com.atproto.server.createSession", { body: { identifier: bob.handle, password: bob.password } })).status, 401);
		assert.equal((await (await call(mf, `/xrpc/com.atproto.repo.describeRepo?repo=${bob.did}`)).json()).error, "RepoTakendown");
		assert.equal((await call(mf, "/admin/accounts/reinstate", { token: operator, body: { did: bob.did } })).status, 200);

		// Deletion needs the password; a wrong one changes nothing.
		assert.equal((await call(mf, "/xrpc/com.atproto.server.deleteAccount", { body: { did: alice.did, password: bob.password } })).status, 401);
		const row = await db.prepare("SELECT account_id FROM accounts WHERE did = ?").bind(alice.did).first();
		assert.equal((await call(mf, "/xrpc/com.atproto.server.deleteAccount", { body: { did: alice.did, password: alice.password } })).status, 200);
		const status = await db.prepare("SELECT status, handle FROM accounts WHERE did = ?").bind(alice.did).first();
		assert.deepEqual({ ...status }, { status: "deleted", handle: `alice.${domain}` });
		assert.equal((await call(mf, `/xrpc/com.atproto.repo.getRecord?repo=${alice.did}&collection=org.example.post&rkey=a`)).status, 404);
		assert.equal((await call(mf, `/xrpc/com.atproto.sync.getRepo?did=${alice.did}`)).status, 404);
		assert.equal((await call(mf, "/.well-known/atproto-did", { host: `https://alice.${domain}` })).status, 404);
		assert.equal((await call(mf, "/xrpc/com.atproto.server.createSession", { body: { identifier: alice.did, password: alice.password } })).status, 401);
		// The object holds a tombstone only, and cannot be provisioned again.
		const ns = await mf.getDurableObjectNamespace("ACCOUNT");
		const object = ns.get(ns.idFromName("account:" + row.account_id));
		await assert.rejects(object.repoFor(alice.did));
		await assert.rejects(object.provision({ accountId: row.account_id, handle: `alice.${domain}`, password: alice.password, pdsEndpoint: origin }));
		const tables = [];
		for (const file of objectFiles(dir, "HostedAccountDurableObject")) {
			const sqlite = new DatabaseSync(file, { readOnly: true });
			try {
				const tomb = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='host_tombstone'").all();
				if (tomb.length && sqlite.prepare("SELECT did FROM host_tombstone").get()?.did === alice.did) {
					for (const t of sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()) {
						const n = sqlite.prepare(`SELECT count(*) AS n FROM "${t.name}"`).get().n;
						if (n) tables.push(t.name);
					}
				}
			} finally {
				sqlite.close();
			}
		}
		assert.deepEqual(tables.filter((t) => !t.startsWith("_cf")), ["host_tombstone"], "only the tombstone remains");
		// The name stays taken; Bob is unaffected.
		const retake = await call(mf, "/xrpc/com.atproto.server.createAccount", { body: { handle: "alice", password: "synthetic-pw-new", inviteCode: await invite(mf) } });
		assert.equal((await retake.json()).error, "HandleNotAvailable");
		assert.equal((await call(mf, "/xrpc/com.atproto.server.createSession", { body: { identifier: bob.handle, password: bob.password } })).status, 200);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("sign-in throttles: one address cannot lock others out; one account's failures do not lock another", async () => {
	const dir = persistDir(), plc = new FakePlc(), mf = hostRuntime({ persist: dir, plc });
	try {
		await migrate(mf);
		const alice = await signup(mf, "alice"), bob = await signup(mf, "bob");
		const attempt = (who, password, ip) => call(mf, "/xrpc/com.atproto.server.createSession", { body: { identifier: who.handle, password }, headers: { "cf-connecting-ip": ip } });
		// Ten failures lock Alice's password checks; Bob is unaffected.
		for (let i = 0; i < 10; i++) assert.equal((await attempt(alice, "wrong-" + i, "192.0.2." + i)).status, 401);
		assert.equal((await attempt(alice, alice.password, "192.0.2.50")).status, 429);
		assert.equal((await attempt(bob, bob.password, "192.0.2.51")).status, 200);
		// One address spends its budget (unknown names count too); another address still signs in.
		const nobody = { handle: `nobody.${domain}` };
		let last;
		for (let i = 0; i < 31; i++) last = await attempt(nobody, "wrong-" + i, "198.51.100.77");
		assert.equal(last.status, 429);
		assert.equal((await attempt(bob, bob.password, "198.51.100.77")).status, 429, "the spent address is refused");
		assert.equal((await attempt(bob, bob.password, "198.51.100.78")).status, 200, "another address is not");
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("publication boundary and configuration guards", async () => {
	const dir = persistDir(), plc = new FakePlc(), mf = hostRuntime({ persist: dir, plc });
	try {
		await migrate(mf);
		const alice = await signup(mf, "alice");
		for (const path of ["/xrpc/com.atproto.sync.subscribeRepos", "/xrpc/com.atproto.space.getBlob", "/xrpc/app.bsky.feed.getTimeline", "/xrpc/com.atproto.repo.importRepo"])
			assert.equal((await call(mf, path, { token: alice.accessJwt })).status, 501, path);
		assert.equal((await call(mf, "/xrpc/app.bsky.actor.getProfile?actor=x", { headers: { "atproto-proxy": "did:web:api.bsky.app#bsky_appview" } })).status, 400);
		assert.equal((await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: alice.accessJwt, body: { ...post("big", "x".repeat(300000)), repo: alice.did } })).status, 413);
		const health = await (await call(mf, "/health")).json();
		assert.equal(health.multiAccount, true);
		assert.equal(health.signup, "invite");
		assert.equal(health.firehose, false);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
	// The public PLC directory is refused without the owner's explicit setting.
	const guarded = hostRuntime({ plc: new FakePlc(), vars: { PLC_URL: "https://plc.directory" } });
	try {
		assert.equal((await call(guarded, "/health")).status, 503);
	} finally {
		await guarded.dispose();
	}
	const weak = hostRuntime({ plc: new FakePlc(), vars: { OPERATOR_TOKEN: "short" } });
	try {
		assert.equal((await call(weak, "/health")).status, 503);
	} finally {
		await weak.dispose();
	}
});

test("closed sign-up: the host runs against the public PLC directory without writing to it or holding an escrow key", async () => {
	const dir = persistDir(), plc = new FakePlc();
	const mf = hostRuntime({ persist: dir, plc, vars: { PLC_URL: "https://plc.directory", PLC_WRITES: "off", ESCROW_ROTATION_KEY: "" } });
	try {
		await migrate(mf);
		const health = await (await call(mf, "/health")).json();
		assert.equal(health.signup, "closed");
		assert.equal((await call(mf, "/xrpc/com.atproto.server.describeServer")).status, 200);
		assert.equal((await call(mf, "/.well-known/oauth-authorization-server")).status, 200);
		assert.equal((await call(mf, "/akun/baru")).status, 503);
		const code = await invite(mf);
		const r = await call(mf, "/xrpc/com.atproto.server.createAccount", { body: { handle: `rumah.${domain}`, password: "synthetic-password", inviteCode: code } });
		assert.equal(r.status, 503);
		assert.equal((await r.json()).error, "SignupsClosed");
		assert.equal(plc.posts + plc.reads, 0);
		// The invite was not spent and no row was claimed.
		const db = await mf.getD1Database("DIRECTORY");
		assert.equal((await db.prepare("SELECT count(*) n FROM accounts").first()).n, 0);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
	// A malformed escrow key is still refused when one is given.
	const bad = hostRuntime({ plc: new FakePlc(), vars: { PLC_WRITES: "off", ESCROW_ROTATION_KEY: "not-a-key" } });
	try {
		assert.equal((await call(bad, "/health")).status, 503);
	} finally {
		await bad.dispose();
	}
});
