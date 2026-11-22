// Local-only harness for the multi-account identity host. Every network edge
// is intercepted: the PLC directory is an in-memory fake at https://plc.test,
// and nothing reaches the Internet. Synthetic fixture values only.
import { parse as parseConfig } from "jsonc-parser";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { didForGenesis, verifyGenesis } from "../src/host/plc.ts";

export const cfg = parseConfig(readFileSync("wrangler.host-test.jsonc", "utf8").replace(/^\/\/[^\n]*\n\/\/[^\n]*\n/, ""));
export const origin = "https://pds.test";
export const domain = cfg.vars.HANDLE_DOMAIN;
export const operator = cfg.vars.OPERATOR_TOKEN;

/** In-memory PLC directory with fault injection. */
export class FakePlc {
	ops = new Map();
	posts = 0;
	reads = 0;
	fail = null; // "network-before-store" | "500-after-store" | null
	document(did) {
		const op = this.ops.get(did)?.at(-1);
		if (!op) return null;
		return {
			"@context": ["https://www.w3.org/ns/did/v1"],
			id: did,
			alsoKnownAs: op.alsoKnownAs,
			verificationMethod: Object.entries(op.verificationMethods).map(([id, key]) => ({ id: `${did}#${id}`, type: "Multikey", controller: did, publicKeyMultibase: key.replace("did:key:", "") })),
			service: [{ id: "#atproto_pds", type: "AtprotoPersonalDataServer", serviceEndpoint: op.services.atproto_pds.endpoint }],
		};
	}
	async handle(request) {
		const url = new URL(request.url);
		const parts = url.pathname.split("/").filter(Boolean);
		const did = decodeURIComponent(parts[0] ?? "");
		if (request.method === "GET" && parts[1] === "log" && parts[2] === "last") {
			this.reads++;
			const op = this.ops.get(did)?.at(-1);
			return op ? Response.json(op) : new Response("not found", { status: 404 });
		}
		if (request.method === "GET" && parts.length === 1) {
			const doc = this.document(did);
			return doc ? Response.json(doc) : new Response("not found", { status: 404 });
		}
		if (request.method === "POST" && parts.length === 1) {
			this.posts++;
			const mode = this.fail;
			this.fail = null;
			if (mode === "network-before-store") throw new Error("synthetic network failure");
			const op = await request.json();
			if (op.prev !== null && this.ops.has(did)) {
				// An update: prev must be the newest operation, signed by one of its rotation keys.
				const last = this.ops.get(did).at(-1);
				const { operationCid, unsigned } = await import("../src/host/plc.ts");
				const { verifySignature } = await import("@atproto/crypto");
				const { encode } = await import("@atcute/cbor");
				const { fromB64url } = await import("../src/host/crypto.ts");
				if (op.prev !== (await operationCid(last))) return new Response("prev is not the newest operation", { status: 400 });
				let signed = false;
				for (const key of last.rotationKeys) if (await verifySignature(key, encode(unsigned(op)), fromB64url(op.sig)).catch(() => false)) signed = true;
				if (!signed) return new Response("not signed by a rotation key", { status: 400 });
				this.ops.get(did).push(op);
				return new Response(null, { status: 200 });
			}
			if (this.ops.has(did)) return new Response("already registered", { status: 400 });
			if (op.prev !== null || (await didForGenesis(op)) !== did || !(await verifyGenesis(op))) return new Response("invalid operation", { status: 400 });
			this.ops.set(did, [op]);
			if (mode === "500-after-store") return new Response("synthetic failure", { status: 500 });
			return new Response(null, { status: 200 });
		}
		return new Response("unexpected", { status: 400 });
	}
}

export function hostRuntime({ persist, plc, vars = {}, outbound } = {}) {
	return new Miniflare(
		convertV4MiniflareOptions({
			name: "etnos-identity-host-local-only",
			modules: [{ type: "ESModule", path: "dist-host/worker.js" }],
			compatibilityDate: cfg.compatibility_date,
			compatibilityFlags: cfg.compatibility_flags,
			bindings: { ...cfg.vars, ...vars },
			durableObjects: {
				ACCOUNT: { className: "HostedAccountDurableObject", useSQLite: true },
				AUTH_HUB: { className: "AuthHubDurableObject", useSQLite: true },
				SPACES: { className: "HostedSpaceDurableObject", useSQLite: true },
				SPACES_INDEX: { className: "HostedSpaceIndexDurableObject", useSQLite: true },
			},
			d1Databases: ["DIRECTORY"],
			r2Buckets: ["BLOBS"],
			resourcePersistencePath: persist,
			outboundService: async (request) => {
				const url = new URL(request.url);
				if (url.origin === "https://plc.test" && plc) return plc.handle(request);
				if (outbound) {
					const r = await outbound(request);
					if (r) return r;
				}
				return new Response("Unexpected synthetic egress " + url.origin, { status: 400 });
			},
		}),
	);
}

export async function migrate(mf) {
	const db = await mf.getD1Database("DIRECTORY");
	for (const file of readdirSync("migrations").sort()) {
		const sql = readFileSync(join("migrations", file), "utf8").replace(/--[^\n]*\n/g, "\n");
		for (const statement of sql.split(";").map((s) => s.trim()).filter(Boolean)) await db.prepare(statement).run();
	}
	return db;
}

export function call(mf, path, { body, token, method, headers = {}, host = origin, form } = {}) {
	const init = { method: method ?? (body === undefined && form === undefined ? "GET" : "POST"), headers: { ...headers }, redirect: "manual" };
	if (body !== undefined) {
		init.headers["content-type"] = "application/json";
		init.body = JSON.stringify(body);
	}
	if (form !== undefined) {
		init.headers["content-type"] = "application/x-www-form-urlencoded";
		init.body = new URLSearchParams(form).toString();
	}
	if (token) init.headers.authorization = token.includes(" ") ? token : "Bearer " + token;
	return mf.dispatchFetch(host + path, init);
}

export async function invite(mf) {
	const r = await call(mf, "/admin/invites", { body: { days: 7, note: "synthetic test" }, token: operator });
	if (r.status !== 200) throw new Error("invite failed " + r.status + " " + (await r.text()));
	return (await r.json()).code;
}

export async function signup(mf, label, password = "synthetic-password-" + label, ip = "198.51.100.1") {
	const code = await invite(mf);
	const r = await call(mf, "/xrpc/com.atproto.server.createAccount", {
		body: { handle: `${label}.${domain}`, password, inviteCode: code },
		headers: { "cf-connecting-ip": ip },
	});
	const body = await r.json();
	if (r.status !== 200) throw new Error("signup failed " + r.status + " " + JSON.stringify(body));
	return { ...body, password, code };
}

/** SQLite files of one Durable Object class in the persistence directory. */
export function objectFiles(persist, className) {
	const root = join(persist, "do");
	if (!existsSync(root)) return [];
	const out = [];
	for (const dir of readdirSync(root)) if (dir.endsWith(className)) for (const f of readdirSync(join(root, dir))) if (f.endsWith(".sqlite")) out.push(join(root, dir, f));
	return out;
}
