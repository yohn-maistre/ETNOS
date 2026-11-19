// The self-hosting path: the same bundle on plain open-source workerd, with no Cloudflare
// products. Accounts and OAuth state live in SQLite-backed Durable Objects on local disk and
// the directory in DirectoryDurableObject. A restart keeps everything. The PLC directory is
// the in-memory fake, reached through workerd's global outbound; nothing leaves the machine.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { FakePlc, cfg } from "./host-harness.mjs";
import { selfHostConfig } from "../scripts/selfhost-config.mjs";

// The platform binary itself: the npm wrapper would leave it running when the wrapper is stopped.
const workerd = (await import("workerd")).default.default;

function plcServer(plc) {
	const server = createServer(async (req, res) => {
		const chunks = [];
		for await (const c of req) chunks.push(c);
		const body = chunks.length ? Buffer.concat(chunks) : undefined;
		const request = new Request(`https://plc.test${req.url}`, { method: req.method, headers: { "content-type": req.headers["content-type"] ?? "application/json" }, body });
		try {
			const r = await plc.handle(request);
			res.writeHead(r.status, Object.fromEntries(r.headers));
			res.end(Buffer.from(await r.arrayBuffer()));
		} catch {
			req.socket.destroy();
		}
	});
	return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

async function start(dir, port, plcPort) {
	writeFileSync(join(dir, "config.capnp"), selfHostConfig({ bundle: resolve("dist-host/worker.js"), storage: join(dir, "data"), port, plc: `127.0.0.1:${plcPort}`, vars: cfg.vars, compatibilityDate: cfg.compatibility_date, configDir: dir }));
	const child = spawn(workerd, ["serve", join(dir, "config.capnp"), "--experimental"], { stdio: ["ignore", "pipe", "pipe"] });
	let log = "";
	child.stdout.on("data", (d) => (log += d));
	child.stderr.on("data", (d) => (log += d));
	for (let i = 0; i < 100; i++) {
		try {
			await fetch(`http://127.0.0.1:${port}/health`);
			return { child, log: () => log };
		} catch {}
		await new Promise((ok) => setTimeout(ok, 100));
	}
	child.kill();
	throw new Error("workerd did not start: " + log);
}
const stop = (w) => new Promise((ok) => { if (w.child.exitCode !== null) return ok(); w.child.once("exit", ok); w.child.kill("SIGTERM"); });

test("self-hosted: the same bundle runs on plain workerd with the directory in a Durable Object, and survives a restart", async () => {
	const dir = mkdtempSync(join(tmpdir(), "pds-workerd-"));
	mkdirSync(join(dir, "data"));
	const plc = new FakePlc();
	const plcHttp = await plcServer(plc);
	const port = 20000 + Math.floor(Math.random() * 20000);
	// node:http, because fetch does not let a caller set Host.
	const call = (path, { body, token, host = "pds.test" } = {}) =>
		new Promise((ok, fail) => {
			const data = body === undefined ? undefined : JSON.stringify(body);
			const req = httpRequest({ host: "127.0.0.1", port, path, method: data ? "POST" : "GET", headers: { host, "x-forwarded-proto": "https", ...(data ? { "content-type": "application/json" } : {}), ...(token ? { authorization: "Bearer " + token } : {}) } }, (res) => {
				const chunks = [];
				res.on("data", (c) => chunks.push(c));
				res.on("end", () => ok(new Response(Buffer.concat(chunks), { status: res.statusCode })));
			});
			req.setTimeout(20000, () => req.destroy(new Error("timeout " + path)));
			req.on("error", fail);
			req.end(data);
		});
	let w = await start(dir, port, plcHttp.address().port);
	try {
		const inv = await call("/admin/invites", { body: { days: 7, note: "synthetic" }, token: cfg.vars.OPERATOR_TOKEN });
		assert.equal(inv.status, 200, w.log());
		const { code } = await inv.json();
		const created = await call("/xrpc/com.atproto.server.createAccount", { body: { handle: "rumah.people.test", password: "synthetic-password-rumah", inviteCode: code } });
		const account = await created.json();
		assert.equal(created.status, 200, JSON.stringify(account) + w.log());
		assert.match(account.did, /^did:plc:[a-z2-7]{24}$/);
		assert.equal(plc.posts, 1);
		// The same invite cannot be used twice: the directory batch is atomic in the object too.
		const again = await call("/xrpc/com.atproto.server.createAccount", { body: { handle: "lain.people.test", password: "synthetic-password-lain", inviteCode: code } });
		assert.equal(again.status, 400);
		const record = await call("/xrpc/com.atproto.repo.createRecord", { token: account.accessJwt, body: { repo: account.did, collection: "app.bsky.feed.post", record: { $type: "app.bsky.feed.post", text: "Uji di workerd", createdAt: new Date().toISOString() } } });
		assert.equal(record.status, 200, await record.clone().text());
		const { uri } = await record.json();
		await stop(w);

		w = await start(dir, port, plcHttp.address().port);
		const wellKnown = await call("/.well-known/atproto-did", { host: "rumah.people.test" });
		assert.equal(await wellKnown.text(), account.did);
		const rkey = uri.split("/").pop();
		const read = await call(`/xrpc/com.atproto.repo.getRecord?repo=rumah.people.test&collection=app.bsky.feed.post&rkey=${rkey}`);
		assert.equal(read.status, 200);
		assert.equal((await read.json()).value.text, "Uji di workerd");
		const session = await call("/xrpc/com.atproto.server.createSession", { body: { identifier: "rumah.people.test", password: "synthetic-password-rumah" } });
		assert.equal(session.status, 200);
	} finally {
		await stop(w);
		plcHttp.close();
		rmSync(dir, { recursive: true, force: true });
	}
});
