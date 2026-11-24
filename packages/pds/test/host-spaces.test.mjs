// AT Protocol spaces (proposal 0016 as of 19 November 2026) on the multi-account host, read the
// way an official client reads them: a delegation token from the reader's PDS, a credential from
// authorizeSpaceSync bound to a P-256 key, RFC 9421 signatures, and MACs checked with the official
// @atproto/space helpers. Synthetic accounts only; the PLC directory is the in-memory fake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { P256Keypair, Secp256k1Keypair } from "@atproto/crypto";
import {
	COMMIT_MAC_PROFILE,
	RECORD_MAC_PROFILE,
	createSpaceCredential,
	createSpaceSigHeaders,
	encapsulate,
	formatMacRequest,
	verifyCommitMac,
	verifyRecord,
	verifyRepoStarFull,
} from "@atproto/space";
import { FakePlc, call, hostRuntime, migrate, operator, origin, signup } from "./host-harness.mjs";
import { b64url } from "../src/host/crypto.ts";
import { didForGenesis, genesisOperation, signOperation } from "../src/host/plc.ts";

const persistDir = () => mkdtempSync(join(tmpdir(), "etnos-spaces-"));
const TYPE = "space.etnos.komunitas";
const NOTE = "space.etnos.catatan";
const MEMBERS = { $type: "com.atproto.memberspace.policy" };
const x = (m) => `/xrpc/${m}`;

/** The reader's whole flow: delegation token from its own PDS, then a credential bound to a fresh key. */
async function authorize(mf, reader, space) {
	const key = await P256Keypair.create();
	const body = { space, credentialKey: key.did() };
	if (reader) {
		const d = await call(mf, `${x("com.atproto.space.getDelegationToken")}?space=${encodeURIComponent(space)}`, { token: reader.accessJwt });
		assert.equal(d.status, 200, await d.clone().text());
		body.delegationToken = (await d.json()).token;
	}
	const r = await call(mf, x("com.atproto.space.authorizeSpaceSync"), { body });
	return { status: r.status, body: await r.json(), key, delegationToken: body.delegationToken };
}

/** Credential headers for one audience, plus a MAC request when a profile is given. */
async function credentialHeaders(credential, key, audience, mac) {
	const authorization = `Atproto-Space-Credential ${credential}`;
	const { headers } = await createSpaceSigHeaders({ authorization, audience, keypair: key });
	return { ...headers, authorization, "atproto-space-audience": audience, ...(mac ? { "accept-signature": formatMacRequest(mac.profile, mac.keyShare) } : {}) };
}

async function kemOf(plc, did) {
	const doc = plc.document(did);
	const m = doc.verificationMethod.find((v) => v.id.endsWith("#atproto_kem"));
	assert.ok(m, "the DID document publishes #atproto_kem");
	return `did:key:${m.publicKeyMultibase}`;
}

async function readRecord(mf, plc, credential, key, space, repo, rkey) {
	const enc = await encapsulate(await kemOf(plc, repo));
	const headers = await credentialHeaders(credential, key, repo, { profile: RECORD_MAC_PROFILE, keyShare: enc.keyShare });
	const r = await call(mf, `${x("com.atproto.space.getRecord")}?space=${encodeURIComponent(space)}&repo=${repo}&collection=${NOTE}&rkey=${rkey}`, { headers });
	return { r, enc };
}

test("spaces: members read with MACs, others cannot, and removal takes effect at once", async () => {
	const dir = persistDir(), plc = new FakePlc(), mf = hostRuntime({ persist: dir, plc });
	try {
		await migrate(mf);
		const lembaga = await signup(mf, "komunitas1"), ana = await signup(mf, "ana"), budi = await signup(mf, "budi"), citra = await signup(mf, "citra");
		assert.equal((await (await call(mf, "/health")).json()).spaces, "alpha");

		// The lembaga's own account is the authority of a memberspace.
		const created = await call(mf, x("com.atproto.space.createSpace"), { token: lembaga.accessJwt, body: { spaceType: TYPE, skey: "ruang-uji", policy: MEMBERS } });
		assert.equal(created.status, 200, await created.clone().text());
		const space = (await created.json()).space;
		assert.equal(space, `at://${lembaga.did}/space/${TYPE}/ruang-uji`);
		assert.equal((await call(mf, x("com.atproto.space.createSpace"), { token: lembaga.accessJwt, body: { spaceType: TYPE, skey: "ruang-uji", policy: MEMBERS } })).status, 400);
		assert.equal((await call(mf, x("com.atproto.space.createSpace"), { token: lembaga.accessJwt, body: { spaceType: TYPE, skey: "lain", policy: { $type: "com.atproto.managedspace.policy", managingApp: "did:web:x#y" } } })).status, 400);
		// Only the authority manages members.
		const notMine = await call(mf, x("com.atproto.memberspace.putMembers"), { token: ana.accessJwt, body: { space, members: [{ did: ana.did, read: true, write: true }] } });
		assert.equal((await notMine.json()).error, "NotAuthorized");
		const put = await call(mf, x("com.atproto.memberspace.putMembers"), { token: lembaga.accessJwt, body: { space, members: [ana, budi].map((m) => ({ did: m.did, read: true, write: true })) } });
		assert.equal(put.status, 200, await put.clone().text());
		assert.equal((await (await call(mf, `${x("com.atproto.memberspace.listMembers")}?space=${encodeURIComponent(space)}`, { token: lembaga.accessJwt })).json()).members.length, 2);

		// Ana writes into her own space repo; a session cannot write into someone else's.
		const w = await call(mf, x("com.atproto.space.createRecord"), { token: ana.accessJwt, body: { space, repo: ana.did, collection: NOTE, record: { $type: NOTE, text: "Catatan uji untuk anggota", createdAt: new Date().toISOString() } } });
		assert.equal(w.status, 200, await w.clone().text());
		const written = await w.json();
		const rkey = written.uri.split("/").pop();
		assert.equal(written.uri, `${space}/${ana.did}/${NOTE}/${rkey}`);
		assert.equal((await call(mf, x("com.atproto.space.createRecord"), { token: budi.accessJwt, body: { space, repo: ana.did, collection: NOTE, record: { $type: NOTE, text: "x" } } })).status, 403);

		// Publication boundary: nothing in Ana's public repository.
		assert.deepEqual((await (await call(mf, `/xrpc/com.atproto.repo.listRecords?repo=${ana.did}&collection=${NOTE}`)).json()).records ?? [], []);
		assert.notEqual((await call(mf, `/xrpc/com.atproto.repo.getRecord?repo=${ana.did}&collection=${NOTE}&rkey=${rkey}`)).status, 200);

		// Ana's write reached the writer set.
		const lw = await authorize(mf, lembaga, space);
		assert.equal(lw.status, 200, JSON.stringify(lw.body));
		const writers = await call(mf, `${x("com.atproto.space.listWriters")}?space=${encodeURIComponent(space)}`, { headers: await credentialHeaders(lw.body.credential, lw.key, lembaga.did) });
		assert.equal(writers.status, 200, await writers.clone().text());
		assert.deepEqual((await writers.json()).repos.map((r) => r.repo), [ana.did]);

		// Budi, a member, reads Ana's record with a credential and checks the MAC.
		const b = await authorize(mf, budi, space);
		assert.equal(b.status, 200, JSON.stringify(b.body));
		const { r: read, enc } = await readRecord(mf, plc, b.body.credential, b.key, space, ana.did, rkey);
		assert.equal(read.status, 200, await read.clone().text());
		assert.equal(read.headers.get("cache-control"), "no-store");
		const record = await read.json();
		assert.equal(record.value.text, "Catatan uji untuk anggota");
		await verifyRecord(record, { ...enc, headers: read.headers, uri: record.uri });
		// The delegation token is single use.
		const replay = await call(mf, x("com.atproto.space.authorizeSpaceSync"), { body: { space, credentialKey: (await P256Keypair.create()).did(), delegationToken: b.delegationToken } });
		assert.equal((await replay.json()).error, "InvalidDelegationToken");
		// A credential read must ask for a MAC; the wrong key or audience is refused.
		const noMac = await call(mf, `${x("com.atproto.space.getRecord")}?space=${encodeURIComponent(space)}&repo=${ana.did}&collection=${NOTE}&rkey=${rkey}`, { headers: await credentialHeaders(b.body.credential, b.key, ana.did) });
		assert.equal((await noMac.json()).error, "InvalidSpaceMac");
		assert.equal((await readRecord(mf, plc, b.body.credential, await P256Keypair.create(), space, ana.did, rkey)).r.status, 401);
		const wrongAud = await call(mf, `${x("com.atproto.space.getRecord")}?space=${encodeURIComponent(space)}&repo=${ana.did}&collection=${NOTE}&rkey=${rkey}`, { headers: await credentialHeaders(b.body.credential, b.key, budi.did) });
		assert.equal(wrongAud.status, 401);
		// A session counts only for its own repo.
		assert.notEqual((await call(mf, `${x("com.atproto.space.getRecord")}?space=${encodeURIComponent(space)}&repo=${ana.did}&collection=${NOTE}&rkey=${rkey}`, { token: budi.accessJwt })).status, 200);

		// Commit and whole-repo reads verify against the set hash and the MAC.
		const cEnc = await encapsulate(await kemOf(plc, ana.did));
		const latest = await call(mf, `${x("com.atproto.space.getLatestCommit")}?space=${encodeURIComponent(space)}&repo=${ana.did}`, { headers: await credentialHeaders(b.body.credential, b.key, ana.did, { profile: COMMIT_MAC_PROFILE, keyShare: cEnc.keyShare }) });
		assert.equal(latest.status, 200, await latest.clone().text());
		const commitJson = (await latest.json()).commit;
		const commit = { ...commitJson, data: Uint8Array.from(Buffer.from(commitJson.data.$bytes, "base64")) };
		verifyCommitMac(commit, { ...cEnc, headers: latest.headers });
		const sEnc = await encapsulate(await kemOf(plc, ana.did));
		const star = await call(mf, `${x("com.atproto.space.getRepo")}?space=${encodeURIComponent(space)}&repo=${ana.did}`, { headers: await credentialHeaders(b.body.credential, b.key, ana.did, { profile: COMMIT_MAC_PROFILE, keyShare: sEnc.keyShare }) });
		assert.equal(star.status, 200, await star.clone().text());
		assert.equal(star.headers.get("content-type"), "application/vnd.dasl.star");
		const full = await verifyRepoStarFull([new Uint8Array(await star.arrayBuffer())], { ...sEnc, headers: star.headers, space, repo: ana.did });
		assert.equal(full.records.length, 1);

		// A non-member gets no credential, and is told nothing about the space.
		const outsider = await authorize(mf, citra, space);
		assert.equal(outsider.body.error, "SpaceNotFound");

		// Removal: Budi's credential, otherwise valid for 10 minutes, is refused on the next read,
		// and the revocation is recorded at Ana's repo host as notifyCredentialsRevoked would.
		const removed = await call(mf, x("com.atproto.memberspace.removeMembers"), { token: lembaga.accessJwt, body: { space, dids: [budi.did] } });
		assert.equal(removed.status, 200, await removed.clone().text());
		const after = await readRecord(mf, plc, b.body.credential, b.key, space, ana.did, rkey);
		assert.equal(after.r.status, 401);
		assert.equal((await after.r.json()).error, "CredentialRevoked");
		assert.equal((await authorize(mf, budi, space)).body.error, "SpaceNotFound");

		// A public-read space gives a credential without a delegation token.
		const open = await call(mf, x("com.atproto.space.createSpace"), { token: lembaga.accessJwt, body: { spaceType: TYPE, skey: "terbuka", policy: { ...MEMBERS, publicRead: true } } });
		const openSpace = (await open.json()).space;
		assert.equal((await authorize(mf, null, openSpace)).status, 200);
		// ...which does not open the members-only space.
		const o = await authorize(mf, null, openSpace);
		assert.equal((await readRecord(mf, plc, o.body.credential, o.key, space, ana.did, rkey)).r.status, 400);

		// Deleting the space revokes outstanding credentials and answers SpaceDeleted.
		assert.equal((await call(mf, x("com.atproto.space.deleteSpace"), { token: lembaga.accessJwt, body: { space } })).status, 200);
		assert.equal((await readRecord(mf, plc, lw.body.credential, lw.key, space, ana.did, rkey)).r.status, 401);
		assert.equal((await authorize(mf, lembaga, space)).body.error, "SpaceDeleted");

		// Withdrawal: Ana deletes her account; her space repos go with it.
		const space2 = (await (await call(mf, x("com.atproto.space.createSpace"), { token: lembaga.accessJwt, body: { spaceType: TYPE, skey: "kedua", policy: MEMBERS } })).json()).space;
		await call(mf, x("com.atproto.memberspace.putMembers"), { token: lembaga.accessJwt, body: { space: space2, members: [{ did: ana.did, read: true, write: true }] } });
		const w2 = await call(mf, x("com.atproto.space.createRecord"), { token: ana.accessJwt, body: { space: space2, repo: ana.did, collection: NOTE, record: { $type: NOTE, text: "kedua" } } });
		const rkey2 = (await w2.json()).uri.split("/").pop();
		const l2 = await authorize(mf, lembaga, space2);
		assert.equal((await readRecord(mf, plc, l2.body.credential, l2.key, space2, ana.did, rkey2)).r.status, 200);
		assert.equal((await call(mf, "/xrpc/com.atproto.server.deleteAccount", { body: { did: ana.did, password: ana.password } })).status, 200);
		assert.notEqual((await readRecord(mf, plc, l2.body.credential, l2.key, space2, ana.did, rkey2)).r.status, 200);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("spaces: an authority on another PDS, with notifyRepoUpdate out and notifyCredentialsRevoked in", async () => {
	const dir = persistDir(), plc = new FakePlc();
	const signing = await Secp256k1Keypair.create(), rotation = await Secp256k1Keypair.create();
	const op = await signOperation(genesisOperation({ handle: "lembaga.example.test", pdsEndpoint: "https://lembaga-pds.test", signingDidKey: signing.did(), rotationKeys: [rotation.did()] }), rotation);
	const remote = await didForGenesis(op);
	plc.ops.set(remote, [op]);
	const notified = [];
	const mf = hostRuntime({
		persist: dir,
		plc,
		outbound: async (request) => {
			if (new URL(request.url).origin === "https://lembaga-pds.test") {
				notified.push({ path: new URL(request.url).pathname, auth: request.headers.get("authorization"), body: await request.json() });
				return Response.json({});
			}
			return null;
		},
	});
	const serviceJwt = async (aud, lxm) => {
		const now = Math.floor(Date.now() / 1000);
		const enc = (v) => b64url(new TextEncoder().encode(JSON.stringify(v)));
		const input = `${enc({ typ: "JWT", alg: "ES256K" })}.${enc({ iss: remote, aud, lxm, iat: now, exp: now + 60, jti: String(Math.random()) })}`;
		return `${input}.${b64url(await signing.sign(new TextEncoder().encode(input)))}`;
	};
	try {
		await migrate(mf);
		const ana = await signup(mf, "ana");
		const space = `at://${remote}/space/${TYPE}/milik-lembaga`;
		const w = await call(mf, x("com.atproto.space.createRecord"), { token: ana.accessJwt, body: { space, repo: ana.did, collection: NOTE, record: { $type: NOTE, text: "Di PDS lembaga" } } });
		assert.equal(w.status, 200, await w.clone().text());
		const rkey = (await w.json()).uri.split("/").pop();
		for (let i = 0; i < 40 && !notified.length; i++) await new Promise((ok) => setTimeout(ok, 50));
		const note = notified.find((n) => n.path === "/xrpc/com.atproto.space.notifyRepoUpdate");
		assert.ok(note, "the write was announced to the authority's PDS");
		assert.equal(note.body.repo, ana.did);
		assert.match(note.auth, /^Bearer /);

		// A credential the remote authority signed reads Ana's record here.
		const key = await P256Keypair.create();
		const credential = await createSpaceCredential({ iss: remote, sub: space, keyId: key.did(), keypair: signing });
		assert.equal((await readRecord(mf, plc, credential, key, space, ana.did, rkey)).r.status, 200);
		// A credential signed by another key is refused.
		const forged = await createSpaceCredential({ iss: remote, sub: space, keyId: key.did(), keypair: await Secp256k1Keypair.create() });
		assert.equal((await readRecord(mf, plc, forged, key, space, ana.did, rkey)).r.status, 401);

		// The authority revokes it. Only the authority may, and only for a repo hosted here.
		const jti = JSON.parse(Buffer.from(credential.split(".")[1], "base64url").toString()).jti;
		const lxm = "com.atproto.space.notifyCredentialsRevoked";
		const wrongAud = await call(mf, x(lxm), { body: { space, credentials: [jti] }, token: await serviceJwt("did:plc:notheretestaccount", lxm) });
		assert.equal(wrongAud.status, 403);
		const revoked = await call(mf, x(lxm), { body: { space, credentials: [jti] }, token: await serviceJwt(ana.did, lxm) });
		assert.equal(revoked.status, 200, await revoked.clone().text());
		const after = await readRecord(mf, plc, credential, key, space, ana.did, rkey);
		assert.equal(after.r.status, 401);
		assert.equal((await after.r.json()).error, "CredentialRevoked");
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("spaces: an account made before KEM keys gets #atproto_kem through a PLC update", async () => {
	const plc = new FakePlc(), mf = hostRuntime({ plc });
	try {
		await migrate(mf);
		const ana = await signup(mf, "ana");
		const genesis = plc.ops.get(ana.did)[0];
		assert.ok(genesis.verificationMethods.atproto_kem, "new accounts publish the KEM key at genesis");
		// Simulate an older account: the directory's newest operation lacks the KEM key.
		const { atproto_kem: _kem, ...rest } = genesis.verificationMethods;
		plc.ops.set(ana.did, [{ ...genesis, verificationMethods: rest }]);
		const r = await call(mf, "/admin/accounts/kem", { body: { did: ana.did }, token: operator });
		assert.equal(r.status, 200, await r.clone().text());
		assert.deepEqual(await r.json(), { published: true });
		const ops = plc.ops.get(ana.did);
		assert.equal(ops.length, 2);
		assert.equal(ops[1].verificationMethods.atproto_kem, genesis.verificationMethods.atproto_kem);
		assert.equal((await (await call(mf, "/admin/accounts/kem", { body: { did: ana.did }, token: operator })).json()).published, false);
	} finally {
		await mf.dispose();
	}
});
