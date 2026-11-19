// AT Protocol spaces (alpha) on the multi-account host: a lembaga's space hosted here, members
// on this host, private records readable only by members, removal effective at once, account
// deletion taking the space data with it, and a space whose authority lives on another PDS.
// Synthetic accounts only; the PLC directory is the in-memory fake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { Secp256k1Keypair } from "@atproto/crypto";
import { createDpopProof, createSpaceToken } from "@atproto/space";
import { FakePlc, call, hostRuntime, migrate, origin, signup } from "./host-harness.mjs";
import { didForGenesis, genesisOperation, signOperation } from "../src/host/plc.ts";

const persistDir = () => mkdtempSync(join(tmpdir(), "strata-spaces-"));
const TYPE = "space.etnos.komunitas";
const NOTE = "space.etnos.catatan";

/** A DPoP key as @atproto/space expects one (bareJwk, algorithms, createJwt). */
async function dpopKey() {
	const { privateKey, publicKey } = await generateKeyPair("ES256", { extractable: true });
	const jwk = await exportJWK(publicKey);
	return {
		bareJwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
		algorithms: ["ES256"],
		createJwt: (header, payload) => new SignJWT(payload).setProtectedHeader(header).sign(privateKey),
	};
}

const xrpc = (m) => `/xrpc/${m}`;

/** The reader's flow: delegation from their own PDS, then a credential from the space host. */
async function credentialFor(mf, reader, space, key) {
	const d = await call(mf, `${xrpc("com.atproto.space.getDelegationToken")}?space=${encodeURIComponent(space)}`, { token: reader.accessJwt });
	if (d.status !== 200) return { status: d.status, body: await d.json() };
	const { token } = await d.json();
	const path = xrpc("com.atproto.space.getSpaceCredential");
	const proof = await createDpopProof(key, { htm: "POST", htu: origin + path });
	const r = await call(mf, path, { body: { space }, headers: { authorization: `Bearer ${token}`, dpop: proof } });
	return { status: r.status, body: await r.json() };
}

async function readWith(mf, credential, key, space, repo, rkey) {
	const path = xrpc("com.atproto.space.getRecord");
	const proof = await createDpopProof(key, { htm: "GET", htu: origin + path, credential });
	return call(mf, `${path}?space=${encodeURIComponent(space)}&repo=${encodeURIComponent(repo)}&collection=${NOTE}&rkey=${rkey}`, { headers: { authorization: `DPoP ${credential}`, dpop: proof } });
}

test("spaces: members read private records, others cannot, and removal takes effect at once", async () => {
	const dir = persistDir(), plc = new FakePlc(), mf = hostRuntime({ persist: dir, plc });
	try {
		await migrate(mf);
		const lembaga = await signup(mf, "lembaga"), ana = await signup(mf, "ana"), budi = await signup(mf, "budi"), citra = await signup(mf, "citra");
		assert.equal((await (await call(mf, "/health")).json()).spaces, "alpha");

		// The lembaga's own account is the authority; its space is a member list.
		const created = await call(mf, xrpc("com.atproto.simplespace.createSpace"), { token: lembaga.accessJwt, body: { type: TYPE, skey: "ruang-uji", policy: { $type: "com.atproto.simplespace.defs#memberListPolicy" }, appAccess: { $type: "com.atproto.simplespace.defs#open" } } });
		assert.equal(created.status, 200, JSON.stringify(await created.clone().json()));
		const space = (await created.json()).uri;
		assert.equal(space, `at://${lembaga.did}/space/${TYPE}/ruang-uji`);
		// Only the authority manages members; a member's session naming the lembaga is refused.
		assert.notEqual((await call(mf, xrpc("com.atproto.simplespace.addMember"), { token: ana.accessJwt, body: { space, did: ana.did } })).status, 200);
		for (const m of [ana, budi]) assert.equal((await call(mf, xrpc("com.atproto.simplespace.addMember"), { token: lembaga.accessJwt, body: { space, did: m.did } })).status, 200);

		// Ana writes into her own repository for the space.
		const w = await call(mf, xrpc("com.atproto.space.createRecord"), { token: ana.accessJwt, body: { space, repo: ana.did, collection: NOTE, record: { $type: NOTE, text: "Catatan uji untuk anggota", createdAt: new Date().toISOString() } } });
		assert.equal(w.status, 200, JSON.stringify(await w.clone().json()));
		const rkey = (await w.json()).uri.split("/").pop();
		// Budi's session cannot write into Ana's repository.
		assert.notEqual((await call(mf, xrpc("com.atproto.space.createRecord"), { token: budi.accessJwt, body: { space, repo: ana.did, collection: NOTE, record: { $type: NOTE, text: "x" } } })).status, 200);

		// Publication boundary: the record is not in Ana's public repository or its listings.
		const pub = await call(mf, `/xrpc/com.atproto.repo.listRecords?repo=${ana.did}&collection=${NOTE}`);
		assert.deepEqual((await pub.json()).records ?? [], []);
		assert.equal((await call(mf, `/xrpc/com.atproto.repo.getRecord?repo=${ana.did}&collection=${NOTE}&rkey=${rkey}`)).status, 400);
		const described = await (await call(mf, `/xrpc/com.atproto.repo.describeRepo?repo=${ana.did}`)).json();
		assert.ok(!(described.collections ?? []).includes(NOTE));

		// A member reads with a credential.
		const budiKey = await dpopKey();
		const cred = await credentialFor(mf, budi, space, budiKey);
		assert.equal(cred.status, 200, JSON.stringify(cred.body));
		const read = await readWith(mf, cred.body.credential, budiKey, space, ana.did, rkey);
		assert.equal(read.status, 200);
		assert.equal((await read.json()).value.text, "Catatan uji untuk anggota");
		// A stolen credential without the bound key is useless.
		assert.notEqual((await readWith(mf, cred.body.credential, await dpopKey(), space, ana.did, rkey)).status, 200);
		// A session only counts for its own account: Budi's session cannot read Ana's space repository.
		assert.equal((await call(mf, `${xrpc("com.atproto.space.getRecord")}?space=${encodeURIComponent(space)}&repo=${ana.did}&collection=${NOTE}&rkey=${rkey}`, { token: budi.accessJwt })).status, 401);
		// Without any credential, nothing.
		assert.equal((await call(mf, `${xrpc("com.atproto.space.getRecord")}?space=${encodeURIComponent(space)}&repo=${ana.did}&collection=${NOTE}&rkey=${rkey}`)).status, 401);

		// A non-member gets no credential.
		const outsider = await credentialFor(mf, citra, space, await dpopKey());
		assert.equal(outsider.status, 403);
		assert.equal(outsider.body.error, "UserNotAuthorized");

		// Removal: Budi's credential, valid for up to two hours in the alpha, stops working now.
		assert.equal((await call(mf, xrpc("com.atproto.simplespace.removeMember"), { token: lembaga.accessJwt, body: { space, did: budi.did } })).status, 200);
		const after = await readWith(mf, cred.body.credential, budiKey, space, ana.did, rkey);
		assert.equal(after.status, 403);
		assert.equal((await after.json()).error, "UserNotAuthorized");
		assert.equal((await credentialFor(mf, budi, space, await dpopKey())).status, 403);

		// A public space lets anyone with a credential read, still never through the public repository.
		const open = await call(mf, xrpc("com.atproto.simplespace.createSpace"), { token: lembaga.accessJwt, body: { type: TYPE, skey: "ruang-terbuka", policy: { $type: "com.atproto.simplespace.defs#publicPolicy" }, appAccess: { $type: "com.atproto.simplespace.defs#open" } } });
		const openSpace = (await open.json()).uri;
		const ow = await call(mf, xrpc("com.atproto.space.createRecord"), { token: ana.accessJwt, body: { space: openSpace, repo: ana.did, collection: NOTE, record: { $type: NOTE, text: "Catatan terbuka" } } });
		const openKey = (await ow.json()).uri.split("/").pop();
		const citraKey = await dpopKey(), cc = await credentialFor(mf, citra, openSpace, citraKey);
		assert.equal(cc.status, 200);
		assert.equal((await readWith(mf, cc.body.credential, citraKey, openSpace, ana.did, openKey)).status, 200);
		// The members-only credential does not open the other space.
		assert.notEqual((await readWith(mf, cc.body.credential, citraKey, space, ana.did, rkey)).status, 200);

		// Withdrawal: Ana deletes her account; her space repositories go with it.
		const lembagaKey = await dpopKey(), lc = await credentialFor(mf, lembaga, space, lembagaKey);
		assert.equal((await readWith(mf, lc.body.credential, lembagaKey, space, ana.did, rkey)).status, 200);
		const del = await call(mf, "/xrpc/com.atproto.server.deleteAccount", { body: { did: ana.did, password: ana.password } });
		assert.equal(del.status, 200);
		const gone = await readWith(mf, lc.body.credential, lembagaKey, space, ana.did, rkey);
		assert.notEqual(gone.status, 200);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("spaces: a space whose authority lives on another PDS, with credentials accepted only while fresh", async () => {
	const dir = persistDir(), plc = new FakePlc();
	// The community's own PDS, outside this host: a DID in the PLC fake with its own key.
	const signing = await Secp256k1Keypair.create(), rotation = await Secp256k1Keypair.create();
	const op = await signOperation(genesisOperation({ handle: "lembaga.example.test", pdsEndpoint: "https://lembaga-pds.test", signingDidKey: signing.did(), rotationKeys: [rotation.did()] }), rotation);
	const remote = await didForGenesis(op);
	plc.ops.set(remote, [op]);
	const notified = [];
	const mf = hostRuntime({
		persist: dir,
		plc,
		vars: { SPACES_REMOTE_CREDENTIAL_MAX_AGE: "2" },
		outbound: async (request) => {
			if (new URL(request.url).origin === "https://lembaga-pds.test") {
				notified.push(new URL(request.url).pathname);
				return Response.json({});
			}
			return null;
		},
	});
	try {
		await migrate(mf);
		const ana = await signup(mf, "ana");
		const space = `at://${remote}/space/${TYPE}/milik-lembaga`;
		const w = await call(mf, xrpc("com.atproto.space.createRecord"), { token: ana.accessJwt, body: { space, repo: ana.did, collection: NOTE, record: { $type: NOTE, text: "Di PDS lembaga" } } });
		assert.equal(w.status, 200, JSON.stringify(await w.clone().json()));
		const rkey = (await w.json()).uri.split("/").pop();
		// The write was announced to the space host on the lembaga's own PDS.
		for (let i = 0; i < 20 && !notified.length; i++) await new Promise((ok) => setTimeout(ok, 50));
		assert.ok(notified.includes("/xrpc/com.atproto.space.notifyWrite"));
		// A credential the remote authority signed is accepted while it is fresh...
		const key = await dpopKey();
		const jkt = (await import("jose")).calculateJwkThumbprint(key.bareJwk, "sha256");
		const credential = await createSpaceToken("credential", { iss: remote, sub: space, dpopJkt: await jkt }, signing);
		assert.equal((await readWith(mf, credential, key, space, ana.did, rkey)).status, 200);
		// ...and refused once older than this host allows, so removal there reaches here quickly.
		await new Promise((ok) => setTimeout(ok, 3100));
		const stale = await readWith(mf, credential, key, space, ana.did, rkey);
		assert.equal(stale.status, 401);
		// A credential signed by anyone else is refused outright.
		const forged = await createSpaceToken("credential", { iss: remote, sub: space, dpopJkt: await jkt }, await Secp256k1Keypair.create());
		assert.notEqual((await readWith(mf, forged, key, space, ana.did, rkey)).status, 200);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});
