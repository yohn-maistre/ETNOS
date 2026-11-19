// Pure-function tests for the identity host: did:plc derivation (checked against
// a public genesis operation of an organisation account, read from
// plc.directory on 19 November 2026), PLC reconcile logic and handle rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Secp256k1Keypair } from "@atproto/crypto";
import { didForGenesis, genesisOperation, registerGenesis, signOperation, verifyGenesis } from "../src/host/plc.ts";
import { checkHandle, labelForHost } from "../src/host/handles.ts";
import { hashPassword, verifyPassword, wrapSecret, unwrapSecret } from "../src/host/crypto.ts";

const PUBLIC_GENESIS = {"sig": "9NuYV7AqwHVTc0YuWzNV3CJafsSZWH7qCxHRUIP2xWlB-YexXC1OaYAnUayiCXLVzRQ8WBXIqF-SvZdNalwcjA", "prev": null, "type": "plc_operation", "services": {"atproto_pds": {"type": "AtprotoPersonalDataServer", "endpoint": "https://bsky.social"}}, "alsoKnownAs": ["at://bluesky-team.bsky.social"], "rotationKeys": ["did:key:zQ3shhCGUqDKjStzuDxPkTxN6ujddP4RkEKJJouJGRRkaLGbg", "did:key:zQ3shpKnbdPx3g3CmPf5cRVTPe1HtSwVn5ish3wSnDPQCbLJK"], "verificationMethods": {"atproto": "did:key:zQ3shXjHeiBuRCKmM36cuYnm7YEMzhGnCmCyW92sRJ9pribSF"}};

test("DID derivation matches the public PLC directory", async () => {
	assert.equal(await didForGenesis(PUBLIC_GENESIS), "did:plc:z72i7hdynmk6r22z27h6tvur");
	assert.equal(await verifyGenesis(PUBLIC_GENESIS), true);
	assert.equal(await verifyGenesis({ ...PUBLIC_GENESIS, alsoKnownAs: ["at://changed.example"] }), false);
});

test("a locally signed genesis verifies and its DID is stable", async () => {
	const signing = await Secp256k1Keypair.create(), rotation = await Secp256k1Keypair.create();
	const op = await signOperation(genesisOperation({ handle: "a.example.test", pdsEndpoint: "https://pds.example.test", signingDidKey: signing.did(), rotationKeys: [rotation.did()] }), rotation);
	assert.equal(await verifyGenesis(op), true);
	assert.equal(await didForGenesis(op), await didForGenesis(structuredClone(op)));
	assert.throws(() => genesisOperation({ handle: "a", pdsEndpoint: "https://x", signingDidKey: signing.did(), rotationKeys: [] }));
});

test("registerGenesis reads before posting and never posts twice on an unknown outcome", async () => {
	const rotation = await Secp256k1Keypair.create();
	const op = await signOperation(genesisOperation({ handle: "b.example.test", pdsEndpoint: "https://pds.example.test", signingDidKey: rotation.did(), rotationKeys: [rotation.did()] }), rotation);
	const did = await didForGenesis(op);
	const calls = [];
	const directory = (behaviour) => async (url, init) => {
		calls.push((init?.method ?? "GET") + " " + url);
		return behaviour(url, init);
	};
	// Unreadable directory: no POST at all.
	calls.length = 0;
	assert.equal((await registerGenesis("https://plc.test", did, op, directory(() => new Response("", { status: 503 })))).state, "uncertain");
	assert.deepEqual(calls.map((c) => c.split(" ")[0]), ["GET"]);
	// Already present with the same signature: registered without POST.
	calls.length = 0;
	assert.deepEqual(await registerGenesis("https://plc.test", did, op, directory(() => Response.json(op))), { state: "registered", already: true });
	assert.deepEqual(calls.map((c) => c.split(" ")[0]), ["GET"]);
	// A different operation under the DID is a conflict, never overwritten.
	assert.equal((await registerGenesis("https://plc.test", did, op, directory(() => Response.json({ ...op, sig: "other" })))).state, "rejected");
	// POST throws: read again, report uncertain, exactly one POST.
	calls.length = 0;
	const r = await registerGenesis("https://plc.test", did, op, directory((url, init) => {
		if (init?.method === "POST") throw new Error("network");
		return new Response("", { status: 404 });
	}));
	assert.equal(r.state, "uncertain");
	assert.deepEqual(calls.map((c) => c.split(" ")[0]), ["GET", "POST", "GET"]);
});

test("handle rules: one lowercase label, reserved names refused", () => {
	assert.deepEqual(checkHandle("Giyai-Bo", "etnos.space"), { ok: true, label: "giyai-bo", handle: "giyai-bo.etnos.space" });
	assert.equal(checkHandle("giyaibo.etnos.space", "etnos.space").ok, true);
	for (const bad of ["ab", "-abc", "abc-", "a.b", "a--b", "admin", "pds", "x".repeat(21), "ünï"]) assert.equal(checkHandle(bad, "etnos.space").ok, false, bad);
	assert.equal(labelForHost("giyaibo.etnos.space", "etnos.space"), "giyaibo");
	assert.equal(labelForHost("a.b.etnos.space", "etnos.space"), null);
	assert.equal(labelForHost("etnos.space", "etnos.space"), null);
});

test("password hashes and wrapped keys round-trip and fail closed", async () => {
	const stored = await hashPassword("synthetic password", 1000);
	assert.equal(await verifyPassword("synthetic password", stored), true);
	assert.equal(await verifyPassword("synthetic passworD", stored), false);
	assert.equal(await verifyPassword("x", "bcrypt$whatever"), false);
	const kek = crypto.getRandomValues(new Uint8Array(32)), secret = crypto.getRandomValues(new Uint8Array(32));
	const wrapped = await wrapSecret(kek, 1, "did:plc:a", "signing", secret);
	assert.deepEqual(await unwrapSecret(kek, "did:plc:a", "signing", wrapped), secret);
	await assert.rejects(unwrapSecret(kek, "did:plc:b", "signing", wrapped), "another DID cannot unwrap");
	await assert.rejects(unwrapSecret(kek, "did:plc:a", "rotation", wrapped), "another purpose cannot unwrap");
});
