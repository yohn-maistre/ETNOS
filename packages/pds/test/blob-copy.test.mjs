// The blob copy for the move to a new Cloudflare account (scripts/copy-identity-blobs.mjs): Signature
// V4 against the published AWS example, and a copy between two in-memory S3 buckets with paging, a
// re-run that skips everything, and a dry run. Nothing leaves the process.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyBucket, r2Bucket, signV4 } from "../scripts/copy-identity-blobs.mjs";

test("Signature V4 matches the AWS example for GET Object", () => {
	const headers = signV4({
		method: "GET",
		url: "https://examplebucket.s3.amazonaws.com/test.txt",
		headers: { range: "bytes=0-9" },
		payloadHash: createHash("sha256").update("").digest("hex"),
		accessKeyId: "AKIAIOSFODNN7EXAMPLE",
		secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
		region: "us-east-1",
		now: new Date("2013-05-24T00:00:00Z"),
	});
	assert.equal(
		headers.authorization,
		"AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
	);
});

/** An S3 bucket in memory that checks every signature and lists two keys per page. */
function fakeS3(name, credentials) {
	const objects = new Map();
	const fetch = async (url, init) => {
		const u = new URL(url);
		const signed = signV4({
			method: init.method,
			url,
			headers: init.headers["content-type"] ? { "content-type": init.headers["content-type"] } : {},
			payloadHash: init.headers["x-amz-content-sha256"],
			...credentials,
			now: new Date(init.headers["x-amz-date"].replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z")),
		});
		if (signed.authorization !== init.headers.authorization) return new Response("SignatureDoesNotMatch", { status: 403 });
		const [, bucket, ...rest] = u.pathname.split("/");
		if (bucket !== name) return new Response("NoSuchBucket", { status: 404 });
		const key = rest.map(decodeURIComponent).join("/");
		if (init.method === "GET" && !key) {
			const keys = [...objects.keys()].filter((k) => k.startsWith(u.searchParams.get("prefix") ?? "")).sort();
			const start = Number(u.searchParams.get("continuation-token") ?? 0), page = keys.slice(start, start + 2);
			const more = start + 2 < keys.length;
			const body = `<ListBucketResult>${page.map((k) => `<Contents><Key>${k.replace(/&/g, "&amp;")}</Key><Size>${objects.get(k).bytes.byteLength}</Size><ETag>"${objects.get(k).etag}"</ETag></Contents>`).join("")}<IsTruncated>${more}</IsTruncated>${more ? `<NextContinuationToken>${start + 2}</NextContinuationToken>` : ""}</ListBucketResult>`;
			return new Response(body);
		}
		const o = objects.get(key);
		if (init.method === "HEAD") return o ? new Response(null, { headers: { "content-length": String(o.bytes.byteLength), etag: `"${o.etag}"` } }) : new Response(null, { status: 404 });
		if (init.method === "GET") return o ? new Response(o.bytes, { headers: { "content-type": o.type } }) : new Response(null, { status: 404 });
		if (init.method === "PUT") {
			const bytes = new Uint8Array(init.body);
			objects.set(key, { bytes, type: init.headers["content-type"] ?? "application/octet-stream", etag: createHash("md5").update(bytes).digest("hex") });
			return new Response(null);
		}
		return new Response(null, { status: 400 });
	};
	return { objects, fetch, bucket: r2Bucket({ endpoint: "https://fake.r2.test", bucket: name, ...credentials, fetch }) };
}

test("copy: every object with its key and type, paged listing, a re-run copies nothing, a dry run writes nothing", async () => {
	const old = fakeS3("etnos-identity-blobs", { accessKeyId: "old-key-id", secretAccessKey: "old-secret-fixture" });
	const fresh = fakeS3("etnos-identity-blobs", { accessKeyId: "new-key-id", secretAccessKey: "new-secret-fixture" });
	const did = "did:plc:fixtureaaaaaaaaaaaaaaaaa";
	const put = (key, text, type) => old.bucket.put(key, new TextEncoder().encode(text), type);
	await put(`${did}/bafkreifixtureone`, "gambar uji (fixture)", "image/png");
	await put(`${did}/staged/bafkreifixturetwo`, "unggahan uji (fixture)", "image/jpeg");
	await put(`${did}/space/x/bafkreifixturethree`, "ruang uji (fixture)", "application/octet-stream");
	await put("backups/2026-11-28/manifest.json", "{}", "application/json");
	await put("did:plc:other/a&b", "kunci aneh (fixture)", "text/plain");

	const dry = await copyBucket(old.bucket, fresh.bucket, { dryRun: true });
	assert.deepEqual(dry, { listed: 5, copied: 0, skipped: 0, bytes: 0 });
	assert.equal(fresh.objects.size, 0);

	const first = await copyBucket(old.bucket, fresh.bucket);
	assert.equal(first.listed, 5);
	assert.equal(first.copied, 5);
	for (const [key, o] of old.objects) {
		assert.deepEqual(fresh.objects.get(key)?.bytes, o.bytes, key);
		assert.equal(fresh.objects.get(key).type, o.type, key);
	}
	assert.deepEqual(await copyBucket(old.bucket, fresh.bucket), { listed: 5, copied: 0, skipped: 5, bytes: 0 });
	assert.deepEqual((await copyBucket(old.bucket, fresh.bucket, { prefix: did + "/" })).listed, 3);

	// Wrong credentials are refused by the bucket, and the error names no secret.
	const wrong = r2Bucket({ endpoint: "https://fake.r2.test", bucket: "etnos-identity-blobs", accessKeyId: "old-key-id", secretAccessKey: "not-the-secret", fetch: old.fetch });
	await assert.rejects(copyBucket(wrong, fresh.bucket), (e) => /HTTP 403/.test(e.message) && !e.message.includes("not-the-secret"));
});

