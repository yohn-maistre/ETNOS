// Moving every account to a new identity host: POST /admin/accounts/export on the old host, then
// POST /admin/accounts/import on an empty new host with another KEK (docs/ops/cutover-2026-11-28.md,
// step 3). Synthetic fixture accounts only; the PLC directory is the in-memory fake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
import { Secp256k1Keypair } from "@atproto/crypto";
import { FakePlc, call, domain, hostRuntime, migrate, objectFiles, operator, origin, signup } from "./host-harness.mjs";
import { openFile, unwrapFromTransfer } from "../src/host/transfer.ts";

const TRANSFER = Buffer.alloc(32, 7).toString("base64url");
const OTHER_TRANSFER = Buffer.alloc(32, 8).toString("base64url");
const NEW_KEK = Buffer.alloc(32, 9).toString("base64url");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
const tempDir = () => mkdtempSync(join(tmpdir(), "etnos-host-transfer-"));
const session = (mf, identifier, password) => call(mf, "/xrpc/com.atproto.server.createSession", { body: { identifier, password }, headers: { "cf-connecting-ip": "198.51.100.60" } });
const head = async (mf, did) => (await call(mf, `/xrpc/com.atproto.sync.getLatestCommit?did=${did}`)).json();
const exportFrom = (mf, token = operator) => mf.dispatchFetch(origin + "/admin/accounts/export", { method: "POST", headers: token ? { authorization: "Bearer " + token } : {} });
const importInto = (mf, bytes, token = operator) =>
	mf.dispatchFetch(origin + "/admin/accounts/import", { method: "POST", headers: { "content-type": "application/gzip", ...(token ? { authorization: "Bearer " + token } : {}) }, body: bytes });
const listAccounts = async (mf) => (await (await call(mf, "/admin/accounts", { token: operator })).json()).accounts;

/** An old host with two fixture accounts: a post with an image, a passkey row and a recovery code. */
async function oldHost() {
	const dir = tempDir(), plc = new FakePlc(), vars = { ACCOUNT_TRANSFER_KEY: TRANSFER };
	let mf = hostRuntime({ persist: dir, plc, vars });
	await migrate(mf);
	const ana = await signup(mf, "ana"), bob = await signup(mf, "bob");
	const up = await mf.dispatchFetch(origin + "/xrpc/com.atproto.repo.uploadBlob", { method: "POST", headers: { authorization: "Bearer " + ana.accessJwt, "content-type": "image/png" }, body: PNG });
	const blob = (await up.json()).blob;
	const post = await call(mf, "/xrpc/com.atproto.repo.createRecord", {
		token: ana.accessJwt,
		body: { repo: ana.did, collection: "org.example.post", rkey: "p1", record: { $type: "org.example.post", text: "data uji (fixture)", gambar: blob, createdAt: new Date().toISOString() } },
	});
	assert.equal(post.status, 200, await post.clone().text());
	assert.equal((await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: bob.accessJwt, body: { repo: bob.did, collection: "org.example.post", rkey: "b1", record: { $type: "org.example.post", text: "data uji (fixture)", createdAt: new Date().toISOString() } } })).status, 200);
	// A space (alpha) with Bob as a member.
	const space = await call(mf, "/xrpc/com.atproto.space.createSpace", { token: ana.accessJwt, body: { spaceType: "space.etnos.komunitas", skey: "ruang-uji", policy: { $type: "com.atproto.memberspace.policy" } } });
	assert.equal(space.status, 200, await space.clone().text());
	ana.space = (await space.json()).space;
	assert.equal((await call(mf, "/xrpc/com.atproto.memberspace.putMembers", { token: ana.accessJwt, body: { space: ana.space, members: [{ did: bob.did, read: true, write: false }] } })).status, 200);
	await mf.dispose();
	// A passkey row written straight into Ana's object (the WebAuthn ceremony is tested elsewhere).
	for (const file of objectFiles(dir, "HostedAccountDurableObject")) {
		const db = new DatabaseSync(file);
		const identity = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'host_identity'").get();
		if (identity && db.prepare("SELECT did FROM host_identity").get()?.did === ana.did)
			db.prepare("INSERT INTO host_passkeys VALUES (?,?,?,?,?,?)").run("cred-fixture-ana", "AAAA", 0, "[]", "HP uji (fixture)", Date.now());
		db.close();
	}
	mf = hostRuntime({ persist: dir, plc, vars });
	return { mf, dir, plc, ana, bob, blob, dispose: async () => (await mf.dispose(), rmSync(dir, { recursive: true, force: true })) };
}

test("export and import: two accounts move with their DIDs, repositories, passwords, passkeys, recovery codes and blobs", async () => {
	const old = await oldHost();
	const target = tempDir();
	let mf = hostRuntime({ persist: target, plc: old.plc, vars: { ACCOUNT_TRANSFER_KEY: TRANSFER, ACCOUNT_KEK_V1: NEW_KEK } });
	try {
		const before = { ana: await head(old.mf, old.ana.did), bob: await head(old.mf, old.bob.did) };
		const r = await exportFrom(old.mf);
		assert.equal(r.status, 200, await r.clone().text());
		assert.equal(r.headers.get("content-type"), "application/gzip");
		assert.match(r.headers.get("content-disposition"), /^attachment; filename="etnos-host-accounts-\d{8}T\d{6}\.json\.gz"$/);
		const file = new Uint8Array(await r.arrayBuffer());

		await migrate(mf);
		const imported = await importInto(mf, file);
		const summary = await imported.json();
		assert.equal(imported.status, 200, JSON.stringify(summary));
		assert.equal(summary.accounts, 2);
		assert.equal(summary.accountObjects, 2);
		assert.ok(summary.rows.directory >= 4 && summary.rows.accountObjects > 10, JSON.stringify(summary));
		assert.deepEqual(summary.blobs, { listed: 2, present: 0 }, "the staged and the public copy of Ana's image, not yet copied");

		// The blob copy (scripts/copy-identity-blobs.mjs does this between real buckets).
		const from = await old.mf.getR2Bucket("BLOBS"), to = await mf.getR2Bucket("BLOBS");
		for (const o of (await from.list()).objects) {
			const obj = await from.get(o.key);
			await to.put(o.key, await obj.arrayBuffer(), { httpMetadata: obj.httpMetadata });
		}

		for (const who of ["ana", "bob"]) {
			const a = old[who];
			// The DID, handle and repository head are unchanged.
			assert.deepEqual(await head(mf, a.did), before[who]);
			const signedIn = await session(mf, `${who}.${domain}`, a.password);
			const s = await signedIn.json();
			assert.equal(signedIn.status, 200, JSON.stringify(s));
			assert.equal(s.did, a.did);
			assert.equal(s.handle, `${who}.${domain}`);
			assert.equal((await (await call(mf, "/.well-known/atproto-did", { host: `https://${who}.${domain}` })).text()).trim(), a.did);
			// A session from the old host does not carry over.
			assert.equal((await call(mf, "/xrpc/com.atproto.server.getSession", { token: a.accessJwt })).status, 401);
			a.fresh = s.accessJwt;
		}
		assert.equal((await session(mf, `ana.${domain}`, old.bob.password)).status, 401);

		// Records, the image and the passkey are there; the signing key, now under the new KEK, signs a new commit.
		const record = await (await call(mf, `/xrpc/com.atproto.repo.getRecord?repo=${old.ana.did}&collection=org.example.post&rkey=p1`)).json();
		assert.equal(record.value.text, "data uji (fixture)");
		const image = await call(mf, `/xrpc/com.atproto.sync.getBlob?did=${old.ana.did}&cid=${old.blob.ref.$link}`);
		assert.equal(image.status, 200);
		assert.deepEqual(new Uint8Array(await image.arrayBuffer()), PNG);
		const passkeys = await (await call(mf, "/xrpc/space.etnos.passkey.list", { token: old.ana.fresh })).json();
		assert.deepEqual(passkeys.passkeys.map((p) => p.label), ["HP uji (fixture)"]);
		const members = await (await call(mf, `/xrpc/com.atproto.memberspace.listMembers?space=${encodeURIComponent(old.ana.space)}`, { token: old.ana.fresh })).json();
		assert.deepEqual(members.members.map((m) => m.did), [old.bob.did]);
		assert.ok(summary.rows.spaces >= 3, "the space, its repo row and its member");
		const write = await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: old.ana.fresh, body: { repo: old.ana.did, collection: "org.example.post", rkey: "p2", record: { $type: "org.example.post", text: "setelah pindah (fixture)", createdAt: new Date().toISOString() } } });
		assert.equal(write.status, 200, await write.clone().text());
		assert.notEqual((await head(mf, old.ana.did)).cid, before.ana.cid);

		// Bob's recovery code from sign-up still resets his password on the new host.
		const fresh = "synthetic-new-password-bob";
		const recovered = await call(mf, "/akun/pulihkan", { form: { handle: `bob.${domain}`, code: old.bob.etnosRecoveryCode, password: fresh, password2: fresh }, headers: { origin: "https://pds.test", "cf-connecting-ip": "198.51.100.61" } });
		assert.equal(recovered.status, 200, await recovered.clone().text());
		assert.equal((await session(mf, `bob.${domain}`, fresh)).status, 200);

		// Now the host holds accounts: a second import is refused.
		const again = await importInto(mf, file);
		assert.equal(again.status, 409);
		assert.equal((await again.json()).error, "HostNotEmpty");
	} finally {
		await mf.dispose();
		await old.dispose();
		rmSync(target, { recursive: true, force: true });
	}
});

test("export file: no plaintext key bytes, no readable password hash, and keys open only with the transfer key", async () => {
	const old = await oldHost();
	try {
		const file = new Uint8Array(await (await exportFrom(old.mf)).arrayBuffer());
		const outer = gunzipSync(file);
		const opened = await openFile(Buffer.from(TRANSFER, "base64url"), file);
		assert.equal(opened.ok, true, JSON.stringify(opened));
		const inner = Buffer.from(JSON.stringify(opened.payload));
		assert.equal(outer.includes("pbkdf2-sha256"), false, "password hashes are sealed");
		assert.equal(outer.includes(old.ana.did), false, "the payload is sealed");
		assert.equal(opened.payload.accounts.length, 2);
		let keys = 0;
		for (const account of opened.payload.accounts) {
			const t = account.account.account_keys, id = account.account.host_identity;
			assert.ok(t.rows.every((r) => r[t.columns.indexOf("kek_version")] === 0), "keys are wrapped under the transfer key");
			for (const r of t.rows) {
				const purpose = r[t.columns.indexOf("purpose")];
				const clear = await unwrapFromTransfer(Buffer.from(TRANSFER, "base64url"), account.did, purpose, { nonce: r[t.columns.indexOf("nonce")], ciphertext: r[t.columns.indexOf("ciphertext")] });
				assert.equal(clear.length, 32);
				if (purpose === "signing") assert.equal((await Secp256k1Keypair.import(clear)).did(), id.rows[0][id.columns.indexOf("signing_did_key")]);
				const forms = [Buffer.from(clear), Buffer.from(clear).toString("hex"), Buffer.from(clear).toString("base64url"), Buffer.from(clear).toString("base64")];
				for (const form of forms) {
					assert.equal(Buffer.from(file).includes(form), false);
					assert.equal(outer.includes(form), false);
					assert.equal(inner.includes(form), false, "no plaintext key inside the sealed payload either");
				}
				await assert.rejects(unwrapFromTransfer(Buffer.from(OTHER_TRANSFER, "base64url"), account.did, purpose, { nonce: r[t.columns.indexOf("nonce")], ciphertext: r[t.columns.indexOf("ciphertext")] }));
				keys++;
			}
		}
		assert.equal(keys, 6, "signing, rotation and KEM key of each account");
		// Sessions, OAuth and failure counters stay behind.
		for (const account of opened.payload.accounts)
			for (const name of ["strata_refresh_sessions", "oauth_tokens", "host_password_failures", "host_passkey_challenges"]) assert.equal(account.account[name], undefined, name);
	} finally {
		await old.dispose();
	}
});

test("refusals: operator only, no transfer secret, wrong transfer key, a host with accounts, not an export, other versions", async () => {
	const old = await oldHost();
	const target = tempDir();
	const plc = old.plc;
	try {
		// Operator only, on both routes.
		assert.equal((await exportFrom(old.mf, null)).status, 401);
		assert.equal((await exportFrom(old.mf, old.ana.accessJwt)).status, 401);
		assert.equal((await exportFrom(old.mf, "x".repeat(40))).status, 401);
		const file = new Uint8Array(await (await exportFrom(old.mf)).arrayBuffer());

		// No transfer secret: neither side runs.
		const bare = hostRuntime({ plc, vars: { ACCOUNT_KEK_V1: NEW_KEK } });
		try {
			await migrate(bare);
			const r = await importInto(bare, file);
			assert.equal(r.status, 503);
			assert.equal((await r.json()).error, "TransferKeyMissing");
		} finally {
			await bare.dispose();
		}
		const bareOld = hostRuntime({ plc });
		try {
			await migrate(bareOld);
			await signup(bareOld, "cici");
			assert.equal((await exportFrom(bareOld)).status, 503);
		} finally {
			await bareOld.dispose();
		}

		// Wrong transfer key, not an export, other versions: refused, and nothing is written at all.
		let mf = hostRuntime({ persist: target, plc, vars: { ACCOUNT_TRANSFER_KEY: OTHER_TRANSFER, ACCOUNT_KEK_V1: NEW_KEK } });
		await migrate(mf);
		assert.equal((await importInto(mf, file, null)).status, 401);
		assert.equal((await importInto(mf, file, "x".repeat(40))).status, 401);
		const wrong = await importInto(mf, file);
		assert.equal(wrong.status, 400);
		assert.equal((await wrong.json()).error, "TransferKeyMismatch");
		const header = JSON.parse(gunzipSync(file));
		const variant = (change) => gzipSync(JSON.stringify({ ...header, ...change }));
		for (const [bytes, error] of [
			[new TextEncoder().encode("not gzip"), "NotAnExport"],
			[gzipSync(JSON.stringify({ hello: "world" })), "NotAnExport"],
			[gzipSync("[1,2,3]"), "NotAnExport"],
			[variant({ format: "etnos-node-backup" }), "NotAnExport"],
			[variant({ formatVersion: 2 }), "VersionMismatch"],
			[variant({ schemaVersion: 99 }), "VersionMismatch"],
		]) {
			const r = await importInto(mf, bytes);
			assert.equal(r.status, 400);
			assert.equal((await r.json()).error, error);
		}
		await mf.dispose();
		for (const f of objectFiles(target, "HostedAccountDurableObject")) {
			const db = new DatabaseSync(f);
			assert.equal(db.prepare("SELECT 1 FROM sqlite_master WHERE name IN ('host_identity', 'blocks')").get(), undefined, "no account object was written");
			db.close();
		}

		// The right key on the same host: a changed header or payload is still refused, the file itself goes in.
		mf = hostRuntime({ persist: target, plc, vars: { ACCOUNT_TRANSFER_KEY: TRANSFER, ACCOUNT_KEK_V1: NEW_KEK } });
		assert.deepEqual(await listAccounts(mf), []);
		for (const change of [{ source: "evil.test" }, { accounts: 1 }, { ciphertext: header.ciphertext.slice(0, -4) + (header.ciphertext.endsWith("AAAA") ? "BBBB" : "AAAA") }]) {
			const r = await importInto(mf, variant(change));
			assert.equal(r.status, 400);
			assert.equal((await r.json()).error, "TransferKeyMismatch");
		}
		assert.deepEqual(await listAccounts(mf), []);
		assert.equal((await importInto(mf, file)).status, 200);

		// An import that stopped before the directory was written is run again on the emptied directory.
		const db = await mf.getD1Database("DIRECTORY");
		for (const table of ["accounts", "invites", "audit"]) await db.prepare(`DELETE FROM ${table}`).run();
		const rerun = await importInto(mf, file);
		assert.equal(rerun.status, 200, await rerun.clone().text());
		assert.equal((await session(mf, `ana.${domain}`, old.ana.password)).status, 200);
		await mf.dispose();

		// A host that already holds an account refuses, and keeps only its own account.
		const busy = hostRuntime({ plc, vars: { ACCOUNT_TRANSFER_KEY: TRANSFER, ACCOUNT_KEK_V1: NEW_KEK } });
		try {
			await migrate(busy);
			await signup(busy, "dodi");
			const r = await importInto(busy, file);
			assert.equal(r.status, 409);
			assert.equal((await r.json()).error, "HostNotEmpty");
			assert.deepEqual((await listAccounts(busy)).map((a) => a.handle), [`dodi.${domain}`]);
		} finally {
			await busy.dispose();
		}
	} finally {
		await old.dispose();
		rmSync(target, { recursive: true, force: true });
	}
});
