// Copies every object of the identity host's blob bucket (BLOBS, `etnos-identity-blobs`) from the old
// Cloudflare account to the new one over R2's S3 API (docs/ops/cutover-2026-11-28.md, step 3).
// Objects keep their keys and content type. An object already in the new bucket with the same size
// and ETag is skipped, so the script can be run again until it reports nothing left to copy.
//
//   OLD_R2_ACCOUNT_ID=<old-account-id> OLD_R2_ACCESS_KEY_ID=<id> OLD_R2_SECRET_ACCESS_KEY=<secret> \
//   NEW_R2_ACCOUNT_ID=<new-account-id> NEW_R2_ACCESS_KEY_ID=<id> NEW_R2_SECRET_ACCESS_KEY=<secret> \
//   node packages/pds/scripts/copy-identity-blobs.mjs [--dry-run] [--prefix did:plc:] \
//        [--from-bucket etnos-identity-blobs] [--to-bucket etnos-identity-blobs]
//
// The keys are R2 API tokens made in each account's dashboard (R2, Manage API tokens): "Object Read
// only" on the old bucket, "Object Read & Write" on the new one. The script prints keys and counts,
// never a credential. No dependencies: Signature V4 is done with node:crypto.
import { createHash, createHmac } from "node:crypto";
import { pathToFileURL } from "node:url";

const sha256hex = (data) => createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();
/** RFC 3986 encoding, as Signature V4 asks for. */
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

/**
 * Signature V4 headers for one request. `headers` are extra headers to sign (lowercase names).
 * Returns the headers to send, including authorization.
 */
export function signV4({ method, url, headers = {}, payloadHash, accessKeyId, secretAccessKey, region = "auto", service = "s3", now = new Date() }) {
	const u = new URL(url);
	const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
	const day = amzDate.slice(0, 8);
	const all = { ...headers, host: u.host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
	const names = Object.keys(all).map((n) => n.toLowerCase()).sort();
	const lower = Object.fromEntries(Object.entries(all).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, " ")]));
	const query = [...u.searchParams.entries()].map(([k, v]) => [enc(k), enc(v)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("&");
	const canonical = [method, u.pathname, query, names.map((n) => `${n}:${lower[n]}\n`).join(""), names.join(";"), payloadHash].join("\n");
	const scope = `${day}/${region}/${service}/aws4_request`;
	const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonical)].join("\n");
	const key = hmac(hmac(hmac(hmac("AWS4" + secretAccessKey, day), region), service), "aws4_request");
	const signature = createHmac("sha256", key).update(toSign).digest("hex");
	const out = { ...all, authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}` };
	delete out.host;
	return out;
}

const xmlText = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");
const tag = (xml, name) => {
	const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
	return m ? xmlText(m[1]) : null;
};

/** One side of the copy: an R2 bucket in one account. */
export function r2Bucket({ accountId, accessKeyId, secretAccessKey, bucket, endpoint, fetch: doFetch = fetch }) {
	if (!accountId && !endpoint) throw new Error("account id missing");
	if (!accessKeyId || !secretAccessKey) throw new Error("R2 credentials missing");
	const base = (endpoint ?? `https://${accountId}.r2.cloudflarestorage.com`).replace(/\/+$/, "");
	const objectUrl = (key) => `${base}/${enc(bucket)}/${key.split("/").map(enc).join("/")}`;
	const send = async (method, url, { body, headers = {} } = {}) => {
		const payloadHash = sha256hex(body ?? "");
		const signed = signV4({ method, url, headers, payloadHash, accessKeyId, secretAccessKey });
		return doFetch(url, { method, headers: signed, body });
	};
	return {
		bucket,
		async *list(prefix = "") {
			let token;
			do {
				const u = new URL(`${base}/${enc(bucket)}`);
				u.searchParams.set("list-type", "2");
				u.searchParams.set("max-keys", "1000");
				if (prefix) u.searchParams.set("prefix", prefix);
				if (token) u.searchParams.set("continuation-token", token);
				const r = await send("GET", u.toString());
				if (!r.ok) throw new Error(`list ${bucket}: HTTP ${r.status}`);
				const xml = await r.text();
				for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g))
					yield { key: tag(m[1], "Key"), size: Number(tag(m[1], "Size")), etag: (tag(m[1], "ETag") ?? "").replace(/"/g, "") };
				token = tag(xml, "IsTruncated") === "true" ? tag(xml, "NextContinuationToken") : null;
			} while (token);
		},
		async head(key) {
			const r = await send("HEAD", objectUrl(key));
			if (r.status === 404) return null;
			if (!r.ok) throw new Error(`head ${key}: HTTP ${r.status}`);
			return { size: Number(r.headers.get("content-length")), etag: (r.headers.get("etag") ?? "").replace(/"/g, "") };
		},
		async get(key) {
			const r = await send("GET", objectUrl(key));
			if (!r.ok) throw new Error(`get ${key}: HTTP ${r.status}`);
			return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get("content-type") };
		},
		async put(key, bytes, contentType) {
			const r = await send("PUT", objectUrl(key), { body: bytes, headers: contentType ? { "content-type": contentType } : {} });
			if (!r.ok) throw new Error(`put ${key}: HTTP ${r.status}`);
		},
	};
}

/** Copy every object under `prefix`. Returns counts; throws on the first failure (run again to resume). */
export async function copyBucket(from, to, { prefix = "", dryRun = false, log = () => {} } = {}) {
	const counts = { listed: 0, copied: 0, skipped: 0, bytes: 0 };
	for await (const o of from.list(prefix)) {
		counts.listed++;
		const there = await to.head(o.key);
		if (there && there.size === o.size && there.etag === o.etag) {
			counts.skipped++;
			continue;
		}
		log(`${dryRun ? "would copy" : "copy"} ${o.key} (${o.size} bytes)`);
		if (dryRun) continue;
		const { bytes, contentType } = await from.get(o.key);
		if (bytes.byteLength !== o.size) throw new Error(`${o.key}: read ${bytes.byteLength} of ${o.size} bytes`);
		await to.put(o.key, bytes, contentType);
		counts.copied++;
		counts.bytes += bytes.byteLength;
	}
	return counts;
}

async function main(argv) {
	const arg = (name, fallback) => {
		const i = argv.indexOf(name);
		return i >= 0 ? argv[i + 1] : fallback;
	};
	const side = (p, bucket) =>
		r2Bucket({ accountId: process.env[`${p}_R2_ACCOUNT_ID`], accessKeyId: process.env[`${p}_R2_ACCESS_KEY_ID`], secretAccessKey: process.env[`${p}_R2_SECRET_ACCESS_KEY`], bucket });
	const from = side("OLD", arg("--from-bucket", "etnos-identity-blobs"));
	const to = side("NEW", arg("--to-bucket", "etnos-identity-blobs"));
	const counts = await copyBucket(from, to, { prefix: arg("--prefix", ""), dryRun: argv.includes("--dry-run"), log: (line) => console.log(line) });
	console.log(JSON.stringify(counts));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
	main(process.argv.slice(2)).catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
