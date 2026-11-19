// Blobs on the multi-account host: served with headers that stop them from running as a page,
// never reachable by a crafted CID (staged uploads or private space blobs), and the operator
// token accepted by its published SHA-256. Synthetic accounts only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { FakePlc, call, hostRuntime, migrate, origin, signup } from "./host-harness.mjs";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
const HTML = new TextEncoder().encode("<!doctype html><html><body><script>alert(1)</script></body></html>");

async function upload(mf, token, bytes, type) {
	const r = await mf.dispatchFetch(origin + "/xrpc/com.atproto.repo.uploadBlob", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": type }, body: bytes });
	assert.equal(r.status, 200, await r.clone().text());
	return (await r.json()).blob;
}

test("blobs: safe headers, attachment for anything but plain media, crafted CIDs refused", async () => {
	const mf = hostRuntime({ plc: new FakePlc() });
	try {
		await migrate(mf);
		const ana = await signup(mf, "ana");
		const png = await upload(mf, ana.accessJwt, PNG, "image/png");
		const html = await upload(mf, ana.accessJwt, HTML, "text/html");
		// Staged uploads are not served until a record refers to them.
		assert.equal((await call(mf, `/xrpc/com.atproto.sync.getBlob?did=${ana.did}&cid=${png.ref.$link}`)).status, 404);
		// A crafted CID that names the staged prefix is refused before any lookup.
		assert.equal((await call(mf, `/xrpc/com.atproto.sync.getBlob?did=${ana.did}&cid=${encodeURIComponent("staged/" + png.ref.$link)}`)).status, 400);
		assert.equal((await call(mf, `/xrpc/com.atproto.sync.getBlob?did=${ana.did}&cid=${encodeURIComponent("space/x/" + png.ref.$link)}`)).status, 400);

		const w = await call(mf, "/xrpc/com.atproto.repo.createRecord", { token: ana.accessJwt, body: { repo: ana.did, collection: "space.etnos.lampiran", record: { $type: "space.etnos.lampiran", gambar: png, berkas: html, createdAt: new Date().toISOString() } } });
		assert.equal(w.status, 200, await w.clone().text());

		const image = await call(mf, `/xrpc/com.atproto.sync.getBlob?did=${ana.did}&cid=${png.ref.$link}`);
		assert.equal(image.status, 200);
		assert.equal(image.headers.get("content-security-policy"), "default-src 'none'; sandbox");
		assert.equal(image.headers.get("x-content-type-options"), "nosniff");
		assert.equal(image.headers.get("content-type"), "image/png");
		assert.equal(image.headers.get("content-disposition"), `inline; filename="${png.ref.$link}"`);
		assert.deepEqual(new Uint8Array(await image.arrayBuffer()), PNG);

		const page = await call(mf, `/xrpc/com.atproto.sync.getBlob?did=${ana.did}&cid=${html.ref.$link}`);
		assert.equal(page.status, 200);
		assert.equal(page.headers.get("content-security-policy"), "default-src 'none'; sandbox");
		assert.equal(page.headers.get("content-type"), "application/octet-stream");
		assert.equal(page.headers.get("content-disposition"), `attachment; filename="${html.ref.$link}"`);
		await page.arrayBuffer();

		// Deleting the account removes its blobs.
		assert.equal((await call(mf, "/xrpc/com.atproto.server.deleteAccount", { body: { did: ana.did, password: ana.password } })).status, 200);
		const bucket = await mf.getR2Bucket("BLOBS");
		assert.equal((await bucket.list({ prefix: ana.did + "/" })).objects.length, 0);
	} finally {
		await mf.dispose();
	}
});

test("operator: a token is accepted by its published SHA-256, and nothing else is", async () => {
	const token = randomBytes(32).toString("base64url");
	const mf = hostRuntime({ plc: new FakePlc(), vars: { OPERATOR_TOKEN: "", OPERATOR_TOKEN_SHA256: createHash("sha256").update(token).digest("hex") } });
	try {
		await migrate(mf);
		assert.equal((await call(mf, "/health")).status, 200);
		assert.equal((await call(mf, "/admin/invites", { body: { days: 1 }, token })).status, 200);
		assert.equal((await call(mf, "/admin/invites", { body: { days: 1 }, token: token.slice(1) + "x" })).status, 401);
		assert.equal((await call(mf, "/admin/invites", { body: { days: 1 }, token: "" })).status, 401);
	} finally {
		await mf.dispose();
	}
	const bad = hostRuntime({ plc: new FakePlc(), vars: { OPERATOR_TOKEN_SHA256: "not-a-hash" } });
	try {
		assert.equal((await call(bad, "/health")).status, 503);
	} finally {
		await bad.dispose();
	}
});
