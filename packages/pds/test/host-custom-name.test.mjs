// The identity host on a name of its own (W1, private alpha): PDS_HOSTNAME akun.<domain> while handles stay
// <name>.<domain>. The service answers on that name, new DIDs point at it, the name itself can never be a
// handle, and handle names still answer only /.well-known/atproto-did. Synthetic accounts; in-memory PLC.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FakePlc, call, domain, hostRuntime, migrate, operator } from "./host-harness.mjs";

test("the identity host runs on akun.<domain>: service, DID documents, reserved name and handle routing", async () => {
	const dir = mkdtempSync(join(tmpdir(), "etnos-host-name-")), plc = new FakePlc();
	const name = "akun." + domain, host = "https://" + name;
	const mf = hostRuntime({ persist: dir, plc, vars: { PDS_HOSTNAME: name } });
	try {
		await migrate(mf);
		const described = await (await call(mf, "/xrpc/com.atproto.server.describeServer", { host })).json();
		assert.equal(described.did, "did:web:" + name);
		const didDoc = await (await call(mf, "/.well-known/did.json", { host })).json();
		assert.equal(didDoc.id, "did:web:" + name);
		assert.equal(didDoc.service[0].serviceEndpoint, host);

		const invite = async () => (await (await call(mf, "/admin/invites", { body: { days: 7, note: "synthetic test" }, token: operator, host })).json()).code;
		// The service name is reserved: nobody can take akun.<domain> as a handle.
		const taken = await call(mf, "/xrpc/com.atproto.server.createAccount", { host, body: { handle: name, password: "synthetic-password-akun", inviteCode: await invite() }, headers: { "cf-connecting-ip": "198.51.100.90" } });
		assert.equal(taken.status, 400);
		const made = await call(mf, "/xrpc/com.atproto.server.createAccount", { host, body: { handle: "dewi." + domain, password: "synthetic-password-dewi", inviteCode: await invite() }, headers: { "cf-connecting-ip": "198.51.100.91" } });
		assert.equal(made.status, 200, await made.clone().text());
		const { did } = await made.json();
		// The new DID document names the custom host as the account's PDS.
		const op = plc.ops.get(did).at(-1);
		assert.equal(op.services.atproto_pds.endpoint, host);
		// The handle name answers the handle lookup; the service name does not resolve to any account.
		assert.equal((await (await call(mf, "/.well-known/atproto-did", { host: "https://dewi." + domain })).text()).trim(), did);
		const own = await call(mf, "/.well-known/atproto-did", { host });
		assert.notEqual((await own.text()).trim(), did);
		// The workers.dev name used before is not this host any more.
		assert.equal((await call(mf, "/xrpc/com.atproto.server.describeServer", { host: "https://etnos-identity-host.example.workers.dev" })).status, 400);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});

test("moving an existing host to akun.<domain>: the operator repoints each DID document once, and the accounts keep working", async () => {
	const dir = mkdtempSync(join(tmpdir(), "etnos-host-move-")), plc = new FakePlc();
	const name = "akun." + domain, host = "https://" + name;
	let mf = hostRuntime({ persist: dir, plc });
	try {
		await migrate(mf);
		const { signup } = await import("./host-harness.mjs");
		const gita = await signup(mf, "gita"), hana = await signup(mf, "hana");
		assert.equal(plc.ops.get(gita.did).at(-1).services.atproto_pds.endpoint, "https://pds.test");
		await mf.dispose();
		// Same storage, new name.
		mf = hostRuntime({ persist: dir, plc, vars: { PDS_HOSTNAME: name } });
		assert.equal((await call(mf, "/admin/accounts/service-endpoint", { host, body: {} })).status, 401);
		const one = await (await call(mf, "/admin/accounts/service-endpoint", { host, body: { did: gita.did }, token: operator })).json();
		assert.deepEqual(one, { endpoint: host, results: [{ did: gita.did, result: "updated" }] });
		const all = await (await call(mf, "/admin/accounts/service-endpoint", { host, body: {}, token: operator })).json();
		assert.deepEqual(all.results.map((r) => r.result).sort(), ["already", "updated"]);
		for (const did of [gita.did, hana.did]) {
			const last = plc.ops.get(did).at(-1);
			assert.equal(last.services.atproto_pds.endpoint, host);
			assert.deepEqual(last.alsoKnownAs, plc.ops.get(did)[0].alsoKnownAs, "the handle is unchanged");
			assert.deepEqual(last.rotationKeys, plc.ops.get(did)[0].rotationKeys, "the rotation keys are unchanged");
		}
		// Passwords still work on the new name; sessions from the old name do not carry over.
		const s = await call(mf, "/xrpc/com.atproto.server.createSession", { host, body: { identifier: "gita." + domain, password: gita.password }, headers: { "cf-connecting-ip": "198.51.100.95" } });
		assert.equal(s.status, 200);
		assert.equal((await call(mf, "/xrpc/com.atproto.server.getSession", { host, token: gita.accessJwt })).status, 401);
	} finally {
		await mf.dispose();
		rmSync(dir, { recursive: true, force: true });
	}
});
