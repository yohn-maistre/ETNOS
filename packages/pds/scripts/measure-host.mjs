// Local timing of the identity host's heavy steps. Wall time on this machine,
// workerd through Miniflare (includes harness overhead), plus the same crypto
// in Node. An upper bound for orientation, not Cloudflare's CPU metering.
// Run from packages/pds after `npm run build`: node scripts/measure-host.mjs
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Secp256k1Keypair } from "@atproto/crypto";
import { SignJWT, jwtVerify } from "jose";
import { FakePlc, call, hostRuntime, invite, migrate, signup } from "../test/host-harness.mjs";
import { didForGenesis, genesisOperation, signOperation } from "../src/host/plc.ts";
import { derive, hashPassword, unwrapSecret, verifyPassword, wrapSecret } from "../src/host/crypto.ts";

const stats = (xs) => {
	const s = [...xs].sort((a, b) => a - b);
	const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
	return { n: s.length, median: +q(0.5).toFixed(2), p90: +q(0.9).toFixed(2) };
};
async function time(n, fn) {
	const out = [];
	for (let i = 0; i < n; i++) {
		const t = performance.now();
		await fn(i);
		out.push(performance.now() - t);
	}
	return stats(out);
}
const results = {};
const kek = crypto.getRandomValues(new Uint8Array(32));
results["node: two keygens + genesis sign + DID"] = await time(30, async () => {
	const s = await Secp256k1Keypair.create({ exportable: true }), r = await Secp256k1Keypair.create({ exportable: true });
	await didForGenesis(await signOperation(genesisOperation({ handle: "m.example.test", pdsEndpoint: "https://pds.example.test", signingDidKey: s.did(), rotationKeys: [r.did()] }), r));
});
results["node: PBKDF2-SHA256 100k (hash)"] = await time(10, () => hashPassword("synthetic password"));
const stored = await hashPassword("synthetic password");
results["node: PBKDF2-SHA256 100k (verify)"] = await time(10, () => verifyPassword("synthetic password", stored));
const w = await wrapSecret(kek, 1, "did:plc:m", "signing", crypto.getRandomValues(new Uint8Array(32)));
results["node: HKDF + AES-GCM unwrap"] = await time(50, () => unwrapSecret(kek, "did:plc:m", "signing", w));
const secret = await derive(kek, "did:plc:m", "session-jwt/v1");
const jwt = await new SignJWT({ scope: "com.atproto.access" }).setProtectedHeader({ alg: "HS256" }).setSubject("did:plc:m").setExpirationTime("1h").sign(secret);
results["node: HKDF + HS256 verify"] = await time(50, async () => jwtVerify(jwt, await derive(kek, "did:plc:m", "session-jwt/v1")));

const dir = mkdtempSync(join(tmpdir(), "etnos-host-measure-"));
const mf = hostRuntime({ persist: dir, plc: new FakePlc() });
try {
	await migrate(mf);
	await signup(mf, "warmup");
	const codes = [];
	for (let i = 0; i < 10; i++) codes.push(await invite(mf));
	results["workerd: createAccount (claim, keys, genesis, PLC, session)"] = await time(10, (i) =>
		call(mf, "/xrpc/com.atproto.server.createAccount", { body: { handle: "measure" + i, password: "synthetic-pw-" + i, inviteCode: codes[i] }, headers: { "cf-connecting-ip": "192.0.2." + i } }),
	);
	const a = await signup(mf, "measured", undefined, "192.0.2.200");
	results["workerd: createSession (PBKDF2 inside the account object)"] = await time(8, (i) => call(mf, "/xrpc/com.atproto.server.createSession", { body: { identifier: a.handle, password: a.password }, headers: { "cf-connecting-ip": "198.51.100." + i } }));
	results["workerd: createRecord (token check, commit, signature)"] = await time(30, (i) => call(mf, "/xrpc/com.atproto.repo.createRecord", { token: a.accessJwt, body: { repo: a.did, collection: "org.example.post", rkey: "r" + i, validate: false, record: { $type: "org.example.post", text: "m" + i } } }));
	results["workerd: getRecord (D1 lookup + account object)"] = await time(30, (i) => call(mf, `/xrpc/com.atproto.repo.getRecord?repo=${a.did}&collection=org.example.post&rkey=r${i}`));
	results["workerd: handle well-known (D1 only)"] = await time(30, () => call(mf, "/.well-known/atproto-did", { host: "https://measured.people.test" }));
	results["workerd: describeServer (static)"] = await time(30, () => call(mf, "/xrpc/com.atproto.server.describeServer"));
} finally {
	await mf.dispose();
	rmSync(dir, { recursive: true, force: true });
}
console.log(JSON.stringify({ measuredOn: new Date().toISOString().slice(0, 10), node: process.version, unit: "ms wall", results }, null, 2));
