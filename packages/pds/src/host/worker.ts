/**
 * ETNOS identity host: many AT accounts on one Workers deployment.
 * ETNOS code (AGPL-3.0-only); the repository engine, OAuth storage and
 * repository handlers are the attributed Cirrus foundation (LICENSE.cirrus).
 *
 * Two kinds of host name (plan §2.2 rule 5):
 * - the service host (PDS_HOSTNAME) serves XRPC, OAuth and the sign-up page;
 * - <name>.HANDLE_DOMAIN serves only /.well-known/atproto-did.
 *
 * The directory (D1) is read before any account object is woken; tokens are
 * verified before any account object is woken (plan §2.2 rule 2).
 */
import { equal, randomToken, sha256Hex } from "./crypto.ts";
import type { AccountRow } from "./directory.ts";
import { hostConfigProblem, minimumAge, signupsClosed, type HostEnv } from "./env.ts";
import { labelForHost } from "./handles.ts";
import { continueAfterSignup, handleOAuth, provider, signupFlow } from "./oauth.ts";
import { homePage, messagePage, recoverPage, recoveredPage, resetLinkPage, signupDonePage, signupPage } from "./pages.ts";
import { readGrant, signGrant, type ResetGrant } from "./link-grant.ts";
import { b64url } from "./crypto.ts";
import { readLast, submitUpdate } from "./plc.ts";
import { READ_ROUTES, SYNC_ROUTES, WRITE_ROUTES, runScoped, scopedStub, type ScopedEnv } from "./repo-routes.ts";
import { Host } from "./service.ts";
import { ExpiredTokenError, claimedSubject, issueSession, serviceDid, verifySession } from "./session.ts";

export { HostedAccountDurableObject } from "./account-do.ts";
export { AuthHubDurableObject } from "./auth-hub.ts";
export { DirectoryDurableObject } from "./directory-do.ts";
export { HostedSpaceDurableObject, HostedSpaceIndexDurableObject } from "./spaces.ts";
import { handleSpaces, spacesEnabled } from "./spaces.ts";
import {
	createPasskeyLoginOptions,
	createPasskeyRegistrationOptions,
	verifyPasskeyLogin,
	verifyPasskeyRegistration,
} from "./passkeys.ts";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
	Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
const xerr = (status: number, error: string, message: string) => json(status, { error, message });

type Authed = { row: AccountRow; did: string; scope: string };

const usable = (row: AccountRow | null, allowDeactivated: boolean): row is AccountRow =>
	!!row && !!row.did && (row.status === "active" || (allowDeactivated && row.status === "deactivated"));

/** Who is calling. Never wakes an account object for an unknown or forged subject. */
async function authenticate(host: Host, request: Request, allowDeactivated = false): Promise<Authed | Response> {
	const header = request.headers.get("authorization") ?? "";
	if (header.startsWith("DPoP ")) {
		using p = await provider(host);
		const token = await p.verifyAccessToken(request);
		if (!token) return xerr(401, "AuthenticationRequired", "Invalid OAuth access token");
		const row = await host.dir.byDid(token.sub);
		if (!usable(row, false)) return xerr(401, "AuthenticationRequired", "Account is not active");
		return { row, did: row.did!, scope: token.scope };
	}
	if (!header.startsWith("Bearer ")) return xerr(401, "AuthMissing", "Authorization header required");
	const token = header.slice(7);
	const sub = claimedSubject(token);
	const row = sub ? await host.dir.byDid(sub) : null;
	if (!usable(row, allowDeactivated)) return xerr(401, "AuthenticationRequired", "Invalid authentication token");
	try {
		const payload = await verifySession(host.env, token, row.did!, row.session_epoch, "access");
		return { row, did: row.did!, scope: String(payload.scope) };
	} catch (error) {
		if (error instanceof ExpiredTokenError) return xerr(400, "ExpiredToken", "Token has expired");
		return xerr(401, "AuthenticationRequired", "Invalid authentication token");
	}
}

async function bodyJson(request: Request): Promise<Record<string, unknown>> {
	try {
		const value = await request.json();
		return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

async function sessionResponse(host: Host, row: AccountRow) {
	const did = row.did!;
	const session = await issueSession(host.env, did, row.session_epoch);
	await host.account(row).saveRefresh(did, session.jti, session.refreshExpires);
	return {
		accessJwt: session.accessJwt,
		refreshJwt: session.refreshJwt,
		handle: row.handle,
		did,
		active: row.status === "active",
		...(row.status === "active" ? {} : { status: row.status }),
	};
}

async function scoped(host: Host, request: Request, ctx: ExecutionContext, row: AccountRow, auth?: Authed): Promise<Response> {
	const env: ScopedEnv = {
		PDS_HOSTNAME: host.env.PDS_HOSTNAME,
		BLOBS: host.env.BLOBS,
		RELAYS: "",
		SPACES_ENABLED: "false",
		DID: row.did!,
		HANDLE: row.handle,
		SIGNING_KEY_PUBLIC: (row.signing_key ?? "").replace(/^did:key:/, ""),
		__stub: scopedStub(host.account(row), row.did!),
		...(auth ? { __auth: { did: auth.did, scope: auth.scope } } : {}),
	} as unknown as ScopedEnv;
	return runScoped(request, env, ctx);
}

/**
 * The operator token is either the OPERATOR_TOKEN secret or a token whose SHA-256 is
 * OPERATOR_TOKEN_SHA256. The hash form lets an operator who holds the token act
 * without a secrets channel; publishing the hash of a 256-bit random token is safe.
 */
async function isOperator(env: HostEnv, header: string): Promise<boolean> {
	if (!header.startsWith("Bearer ")) return false;
	const token = header.slice(7);
	if (token.length < 32) return false;
	if (env.OPERATOR_TOKEN && env.OPERATOR_TOKEN.length >= 32 && equal(token, env.OPERATOR_TOKEN)) return true;
	return !!env.OPERATOR_TOKEN_SHA256 && equal(await sha256Hex(token), env.OPERATOR_TOKEN_SHA256.toLowerCase());
}

async function admin(host: Host, request: Request, path: string, ctx: ExecutionContext): Promise<Response> {
	if (!(await isOperator(host.env, request.headers.get("authorization") ?? ""))) return xerr(401, "AuthenticationRequired", "Operator token required");
	const now = Date.now();
	if (path === "/admin/backup" && request.method === "POST") {
		if (!host.env.BLOBS) return xerr(503, "Unavailable", "R2 blob bucket is not bound");
		const day = new Date(now).toISOString().slice(0, 10);
		const rows = await host.dir.listActive(200);
		const backedUp: { did: string; handle: string; key: string; bytes: number; sha256: string }[] = [];
		for (const row of rows) {
			if (!row.did) continue;
			const repoUrl = new URL(`${host.origin}/xrpc/com.atproto.sync.getRepo?did=${encodeURIComponent(row.did)}`);
			const res = await scoped(host, new Request(repoUrl, { method: "GET" }), ctx, row);
			if (!res.ok) continue;
			const bytes = new Uint8Array(await res.arrayBuffer());
			const key = `backups/${day}/${row.did.replace(/[^a-zA-Z0-9._:-]/g, "_")}.car`;
			await host.env.BLOBS.put(key, bytes, { httpMetadata: { contentType: "application/vnd.ipld.car" } });
			backedUp.push({ did: row.did, handle: row.handle, key, bytes: bytes.byteLength, sha256: await sha256Hex(bytes) });
		}
		const manifestKey = `backups/${day}/manifest.json`;
		const manifest = { date: day, createdAt: new Date(now).toISOString(), count: backedUp.length, accounts: backedUp };
		await host.env.BLOBS.put(manifestKey, JSON.stringify(manifest, null, 2), { httpMetadata: { contentType: "application/json" } });
		await host.dir.audit("operator", "backup.run", manifestKey, now);
		return json(200, manifest);
	}
	if (path === "/admin/backups" && request.method === "GET") {
		if (!host.env.BLOBS) return xerr(503, "Unavailable", "R2 blob bucket is not bound");
		const listed = await host.env.BLOBS.list({ prefix: "backups/", limit: 100 });
		const manifests = listed.objects
			.filter((o) => o.key.endsWith("/manifest.json"))
			.map((o) => ({ key: o.key, size: o.size, uploaded: o.uploaded.toISOString() }))
			.sort((a, b) => b.key.localeCompare(a.key));
		return json(200, { backups: manifests });
	}
	if (path === "/admin/invites" && request.method === "POST") {
		const body = await bodyJson(request);
		const days = body.days === undefined ? 7 : Number(body.days);
		if (!Number.isInteger(days) || days < 1 || days > 30) return xerr(400, "InvalidRequest", "days must be 1 to 30");
		const note = typeof body.note === "string" ? body.note.slice(0, 200) : null;
		const code = randomToken(24), expires = now + days * 86400000;
		await host.dir.createInvite(code, expires, note, now);
		await host.dir.audit("operator", "invite.create", null, now);
		return json(200, { code, expires, url: `${host.origin}/akun/baru?kode=${code}` });
	}
	if (path === "/admin/invites/revoke" && request.method === "POST") {
		const body = await bodyJson(request);
		const ok = typeof body.code === "string" && (await host.dir.revokeInvite(body.code));
		return json(ok ? 200 : 404, { revoked: ok });
	}
	// Publish #atproto_kem (spaces MACs) for an account made before accounts got a KEM key at genesis.
	if (path === "/admin/accounts/kem" && request.method === "POST") {
		const body = await bodyJson(request);
		const row = typeof body.did === "string" ? await host.dir.byDid(body.did) : null;
		if (!row?.did || row.status !== "active") return xerr(404, "AccountNotFound", "No such account");
		const last = await readLast(host.env.PLC_URL, row.did);
		if (last.state !== "present") return xerr(502, "UpstreamFailure", "Could not read the directory");
		const op = await host.account(row).kemPlcUpdate(row.did, last.op);
		if (!op) return json(200, { published: false, reason: "already published" });
		const outcome = await submitUpdate(host.env.PLC_URL, row.did, op);
		if (outcome.state !== "registered") return xerr(502, "UpstreamFailure", outcome.reason);
		await host.dir.audit("operator", "account.kem", row.did, now);
		return json(200, { published: true });
	}
	// A one-time reset link for someone who lost the recovery code. Valid for 24 hours; the operator sends it.
	if (path === "/admin/accounts/reset-link" && request.method === "POST") {
		const body = await bodyJson(request);
		const actor = typeof body.did === "string" ? body.did : typeof body.handle === "string" ? body.handle.trim().toLowerCase() : "";
		const row = actor ? await host.dir.resolve(actor) : null;
		if (!usable(row, false)) return xerr(404, "AccountNotFound", "No such active account");
		const expires = now + 86_400_000;
		const link = await signGrant(await ownLinkKey(host), { kind: "reset", id: crypto.randomUUID(), handle: row.handle, expires });
		await host.dir.audit("operator", "account.reset-link", row.did, now);
		return json(200, { url: `${host.origin}/akun/pulihkan?tautan=${link}`, expires });
	}
	if (path === "/admin/accounts" && request.method === "GET")
		return json(200, {
			accounts: (await host.dir.listAll(200)).map((r) => ({ handle: r.handle, did: r.did, status: r.status, created: r.created })),
		});
	if ((path === "/admin/accounts/takedown" || path === "/admin/accounts/reinstate") && request.method === "POST") {
		const body = await bodyJson(request);
		const row = typeof body.did === "string" ? await host.dir.byDid(body.did) : null;
		if (!row) return xerr(404, "AccountNotFound", "No such account");
		const takedown = path.endsWith("takedown");
		const moved = takedown
			? await host.dir.transition(row.account_id, ["active", "deactivated"], "takendown", now, true)
			: await host.dir.transition(row.account_id, ["takendown"], "active", now);
		if (moved && takedown) await host.hub().revokeSubject(row.did!);
		if (moved) await host.dir.audit("operator", takedown ? "account.takedown" : "account.reinstate", row.did, now);
		return json(moved ? 200 : 409, { status: moved ? (takedown ? "takendown" : "active") : row.status });
	}
	return xerr(404, "NotFound", "No such admin route");
}

async function signupForm(host: Host, request: Request): Promise<Response> {
	const name = host.displayName, domain = host.env.HANDLE_DOMAIN;
	const origin = request.headers.get("origin");
	if (origin && origin !== host.origin) return messagePage("Permintaan ditolak", "Formulir ini harus dikirim dari halaman pembuatan akun.", 403);
	const form = await request.formData().catch(() => null);
	const get = (k: string) => {
		const v = form?.get(k);
		return typeof v === "string" ? v : "";
	};
	const values = { code: get("code"), label: get("label").toLowerCase(), minAge: minimumAge(host.env) };
	// A sign-up started from an app's sign-in carries that sign-in, so the new account continues to consent.
	const flow = await signupFlow(host, get("client_id"), get("request_uri"));
	if (get("password") !== get("password2")) return signupPage(name, domain, { ...values, error: "Kedua kata sandi tidak sama." }, 400, flow);
	if (get("age") !== String(values.minAge)) return signupPage(name, domain, { ...values, error: `Akun hanya untuk orang berusia ${values.minAge} tahun atau lebih.` }, 400, flow);
	if (!(await host.spend(request, "signup", 10)))
		return signupPage(name, domain, { ...values, error: "Terlalu banyak percobaan dari jaringan ini. Coba lagi dalam 10 menit." }, 429, flow);
	const result = await host.createAccount({ code: values.code, handle: values.label, password: get("password") });
	if (!result.ok) return signupPage(name, domain, { ...values, error: result.message }, result.status, flow);
	// The recovery code is made now and shown once; only its hash stays in the account object.
	const code = await host.account(result.row).newRecoveryCode(result.did);
	if (flow) return continueAfterSignup(flow, host, result.did, result.handle, code);
	return signupDonePage(name, result.handle, signinLink(host, result.handle), code);
}

const signinLink = (host: Host, handle: string) =>
	host.env.SIGNIN_URL ? `${host.env.SIGNIN_URL}${host.env.SIGNIN_URL.includes("?") ? "&" : "?"}handle=${encodeURIComponent(handle)}` : null;

/** The host's own key for reset links made with the operator token (link-grant.ts, kind "reset"). */
async function ownLinkKey(host: Host): Promise<string> {
	return b64url(await host.hostKey("reset-link/v1"));
}

/** A reset link made by the node (NODE_LINK_KEY) or by this host's admin route, still valid. */
async function resetGrant(host: Host, text: unknown): Promise<ResetGrant | null> {
	const now = Date.now();
	const grant = (await readGrant(host.env.NODE_LINK_KEY, text, now)) ?? (await readGrant(await ownLinkKey(host), text, now));
	return grant?.kind === "reset" ? grant : null;
}

const RECOVERY_FAILED = "Nama akun atau kode pemulihan salah.";
const LINK_FAILED = "Tautan pemulihan tidak berlaku. Tautan sudah lewat waktunya, sudah dipakai, atau salah. Minta tautan baru kepada pengelola.";

/**
 * Password reset: with the handle and the recovery code, or with a one-time link from the operator. Both are
 * budgeted per network address; the code path is also locked per account after five wrong codes. A success
 * ends every session of the account and replaces the recovery code.
 */
async function recoverForm(host: Host, request: Request): Promise<Response> {
	const name = host.displayName, domain = host.env.HANDLE_DOMAIN;
	const origin = request.headers.get("origin");
	if (origin && origin !== host.origin) return messagePage("Permintaan ditolak", "Formulir ini harus dikirim dari halaman pemulihan akun.", 403);
	const form = await request.formData().catch(() => null);
	const get = (k: string) => {
		const v = form?.get(k);
		return typeof v === "string" ? v : "";
	};
	const link = get("tautan"), handle = get("handle").trim().toLowerCase().replace(/^@/, "");
	const grant = link ? await resetGrant(host, link) : null;
	if (link && !grant) return messagePage("Tautan pemulihan tidak berlaku", LINK_FAILED, 400);
	const again = (error: string, status: number) =>
		grant ? resetLinkPage(name, grant.handle, link, error, status) : recoverPage(name, domain, { handle, error }, status);
	if (get("password") !== get("password2")) return again("Kedua kata sandi tidak sama.", 400);
	if (get("password").length < 8 || get("password").length > 256) return again("Kata sandi minimal 8 karakter.", 400);
	if (!(await host.spend(request, "recovery", 10))) return again("Terlalu banyak percobaan dari jaringan ini. Coba lagi dalam 10 menit.", 429);
	const target = grant ? grant.handle : handle.includes(".") ? handle : `${handle}.${domain}`;
	const row = target ? await host.dir.resolve(target) : null;
	if (!usable(row, false)) return grant ? messagePage("Tautan pemulihan tidak berlaku", LINK_FAILED, 400) : again(RECOVERY_FAILED, 400);
	const account = host.account(row);
	let code: string;
	if (grant) {
		const result = await account.recoverWithLink(row.did!, grant.id, get("password"));
		if (!result.ok || !result.code) return messagePage("Tautan pemulihan tidak berlaku", LINK_FAILED, 400);
		code = result.code;
	} else {
		const result = await account.recoverWithCode(row.did!, get("code"), get("password"));
		if (result.locked) return again("Terlalu banyak kode yang salah untuk akun ini. Coba lagi dalam 10 menit.", 429);
		if (!result.ok || !result.code) return again(RECOVERY_FAILED, 400);
		code = result.code;
	}
	const now = Date.now();
	await host.dir.bumpSessions(row.account_id, now);
	await host.hub().revokeSubject(row.did!);
	await host.dir.audit(grant ? "operator-link" : row.did!, grant ? "account.reset-link" : "account.recover", row.did, now);
	return recoveredPage(name, row.handle, code, signinLink(host, row.handle));
}

async function listRepos(host: Host, url: URL): Promise<Response> {
	const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 100);
	const rows = await host.dir.listActive(limit, url.searchParams.get("cursor") ?? undefined);
	const repos = [];
	for (const row of rows) {
		using facet = await host.account(row).repoFor(row.did!);
		const status = await facet.getStatus();
		repos.push({ did: row.did, head: status.head, rev: status.rev, active: true });
	}
	return json(200, { repos, ...(rows.length === limit ? { cursor: rows.at(-1)!.did } : {}) });
}

/** CIDv1 in base32 (the only form this host stores) or a legacy CIDv0. */
export const isPlainCid = (cid: string) => /^b[a-z2-7]{20,200}$/.test(cid) || /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);

const INLINE_BLOB = /^(image\/(png|jpeg|gif|webp|avif)|video\/(mp4|webm)|audio\/(mpeg|mp4|ogg|webm))$/;

/** Blobs are user content: never run as a page here, never sniffed, and downloaded unless they are plain media. */
function blobResponse(response: Response, cid: string): Response {
	const headers = new Headers(response.headers);
	headers.set("content-security-policy", "default-src 'none'; sandbox");
	headers.set("x-content-type-options", "nosniff");
	headers.set("cross-origin-resource-policy", "cross-origin");
	if (response.ok) {
		const type = (headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
		headers.set("content-disposition", `${INLINE_BLOB.test(type) ? "inline" : "attachment"}; filename="${cid}"`);
		if (!INLINE_BLOB.test(type)) headers.set("content-type", "application/octet-stream");
	}
	return new Response(response.body, { status: response.status, headers });
}

/** Rewrite ?repo= or ?did= from a handle to a DID after resolving it in the directory. */
async function publicTarget(host: Host, url: URL, param: "repo" | "did"): Promise<AccountRow | Response> {
	const actor = url.searchParams.get(param);
	if (!actor) return xerr(400, "InvalidRequest", `Missing required parameter: ${param}`);
	const row = await host.dir.resolve(actor);
	if (!row || row.status === "pending" || row.status === "deleting" || row.status === "deleted")
		return xerr(404, "RepoNotFound", "Repository not found");
	if (row.status === "takendown") return xerr(400, "RepoTakendown", "Repository has been taken down");
	if (row.status === "deactivated") return xerr(400, "RepoDeactivated", "Repository is deactivated");
	url.searchParams.set(param, row.did!);
	return row;
}

async function service(host: Host, request: Request, ctx: ExecutionContext): Promise<Response> {
	const url = new URL(request.url), path = url.pathname, method = request.method;

	if (path === "/" && method === "GET") return homePage(host.displayName, host.env.HANDLE_DOMAIN);
	if (path === "/health")
		return json(200, {
			service: "etnos-identity-host",
			stage: "experimental",
			multiAccount: true,
			signup: signupsClosed(host.env) ? "closed" : "invite",
			signupNote: signupsClosed(host.env)
				? "Pendaftaran di server ini belum dibuka."
				: "Akun hanya bisa dibuat dengan kode undangan dari pengurus. Server ini sedang diuji oleh kelompok kecil.",
			spaces: spacesEnabled(host.env) ? "alpha" : false,
			publicRepository: true,
			firehose: false,
			passkeys: true,
		});
	if (path === "/.well-known/did.json")
		return json(200, {
			"@context": ["https://www.w3.org/ns/did/v1"],
			id: serviceDid(host.env),
			service: [{ id: "#atproto_pds", type: "AtprotoPersonalDataServer", serviceEndpoint: host.origin }],
		});
	if (path === "/akun/baru" && signupsClosed(host.env))
		return messagePage("Pendaftaran belum dibuka", "Pendaftaran akun di server ini belum dibuka.", 503);
	if (path === "/akun/baru" && method === "GET")
		return signupPage(host.displayName, host.env.HANDLE_DOMAIN, { code: (url.searchParams.get("kode") ?? "").slice(0, 100), minAge: minimumAge(host.env) });
	if (path === "/akun/baru" && method === "POST") return signupForm(host, request);
	if (path === "/akun/pulihkan" && method === "GET") {
		const link = url.searchParams.get("tautan");
		if (!link) return recoverPage(host.displayName, host.env.HANDLE_DOMAIN, {});
		const grant = await resetGrant(host, link);
		return grant ? resetLinkPage(host.displayName, grant.handle, link) : messagePage("Tautan pemulihan tidak berlaku", LINK_FAILED, 400);
	}
	if (path === "/akun/pulihkan" && method === "POST") return recoverForm(host, request);
	if (path.startsWith("/admin/")) return admin(host, request, path, ctx);

	const oauth = await handleOAuth(host, request);
	if (oauth) return oauth;

	if (!path.startsWith("/xrpc/")) return xerr(404, "NotFound", "Not found");
	// CORS preflight for browser clients. XRPC carries bearer tokens, never cookies, so any origin may ask.
	if (method === "OPTIONS")
		return new Response(null, {
			status: 204,
			headers: {
				"access-control-allow-origin": "*",
				"access-control-allow-methods": "GET, POST, OPTIONS",
				"access-control-allow-headers": (request.headers.get("access-control-request-headers") ?? "content-type, authorization").slice(0, 512),
				"access-control-max-age": "86400",
			},
		});
	if (request.headers.has("atproto-proxy")) return xerr(400, "InvalidRequest", "Service proxy is not enabled");

	if (path === "/xrpc/_health") return json(200, { version: "etnos-identity-host" });
	if (path === "/xrpc/com.atproto.server.describeServer")
		return json(200, {
			did: serviceDid(host.env),
			availableUserDomains: ["." + host.env.HANDLE_DOMAIN],
			inviteCodeRequired: true,
			phoneVerificationRequired: false,
			links: {},
		});
	if (path === "/xrpc/com.atproto.identity.resolveHandle") {
		const handle = (url.searchParams.get("handle") ?? "").toLowerCase();
		const row = handle && !handle.startsWith("did:") ? await host.dir.byHandle(handle) : null;
		return row?.did && row.status === "active" ? json(200, { did: row.did }) : xerr(400, "InvalidRequest", "Unable to resolve handle");
	}

	if (path === "/xrpc/com.atproto.server.createAccount" && method === "POST") {
		if (!(await host.spend(request, "signup", 10))) return xerr(429, "RateLimitExceeded", "Try again later");
		const body = await bodyJson(request);
		const result = await host.createAccount({ code: body.inviteCode, handle: body.handle, password: body.password });
		if (!result.ok) return xerr(result.status, result.error, result.message);
		const session = await sessionResponse(host, result.row);
		// Not part of the lexicon: an ETNOS client shows this once; other clients ignore it.
		const etnosRecoveryCode = await host.account(result.row).newRecoveryCode(result.did);
		return json(200, { did: session.did, handle: session.handle, accessJwt: session.accessJwt, refreshJwt: session.refreshJwt, etnosRecoveryCode });
	}

	if (path === "/xrpc/com.atproto.server.createSession" && method === "POST") {
		if (!(await host.spend(request, "password", 30))) return xerr(429, "RateLimitExceeded", "Try again later");
		const body = await bodyJson(request);
		const identifier = typeof body.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
		const row = identifier ? await host.dir.resolve(identifier.startsWith("did:") ? String(body.identifier).trim() : identifier) : null;
		if (!usable(row, true) || typeof body.password !== "string") return xerr(401, "AuthenticationRequired", "Invalid identifier or password");
		const check = await host.account(row).checkPassword(row.did!, body.password);
		if (check.locked) return xerr(429, "RateLimitExceeded", "Too many attempts for this account; try again later");
		if (!check.ok) return xerr(401, "AuthenticationRequired", "Invalid identifier or password");
		return json(200, await sessionResponse(host, row));
	}

	if (path === "/xrpc/com.atproto.server.refreshSession" || path === "/xrpc/com.atproto.server.deleteSession") {
		if (method !== "POST") return xerr(405, "InvalidRequest", "POST required");
		const header = request.headers.get("authorization") ?? "";
		const token = header.startsWith("Bearer ") ? header.slice(7) : "";
		const sub = claimedSubject(token);
		const row = sub ? await host.dir.byDid(sub) : null;
		if (!usable(row, true)) return xerr(401, "AuthenticationRequired", "Invalid refresh token");
		let jti: string;
		try {
			jti = String((await verifySession(host.env, token, row.did!, row.session_epoch, "refresh")).jti);
		} catch (error) {
			if (error instanceof ExpiredTokenError) return xerr(400, "ExpiredToken", "Token has expired");
			return xerr(400, "InvalidToken", "Invalid refresh token");
		}
		const account = host.account(row);
		if (path.endsWith("deleteSession")) {
			await account.revokeRefresh(row.did!, jti);
			return json(200, {});
		}
		const next = await issueSession(host.env, row.did!, row.session_epoch);
		if (!(await account.rotateRefresh(row.did!, jti, next.jti, next.refreshExpires))) return xerr(400, "InvalidToken", "Refresh token was already used");
		return json(200, { accessJwt: next.accessJwt, refreshJwt: next.refreshJwt, handle: row.handle, did: row.did, active: row.status === "active" });
	}

	if (path === "/xrpc/com.atproto.server.getSession" || path === "/xrpc/com.atproto.server.checkAccountStatus") {
		const auth = await authenticate(host, request, true);
		if (auth instanceof Response) return auth;
		if (path.endsWith("getSession"))
			return json(200, { handle: auth.row.handle, did: auth.did, active: auth.row.status === "active", ...(auth.row.status === "active" ? {} : { status: auth.row.status }) });
		return json(200, { activated: auth.row.status === "active", validDid: true });
	}

	if (path === "/xrpc/com.atproto.server.deactivateAccount" && method === "POST") {
		const auth = await authenticate(host, request);
		if (auth instanceof Response) return auth;
		await host.deactivate(auth.row);
		return json(200, {});
	}
	if (path === "/xrpc/com.atproto.server.activateAccount" && method === "POST") {
		const auth = await authenticate(host, request, true);
		if (auth instanceof Response) return auth;
		if (auth.row.status === "deactivated") await host.reactivate(auth.row);
		return json(200, {});
	}
	if (path === "/xrpc/com.atproto.server.deleteAccount" && method === "POST") {
		if (!(await host.spend(request, "password", 30))) return xerr(429, "RateLimitExceeded", "Try again later");
		const body = await bodyJson(request);
		const row = typeof body.did === "string" ? await host.dir.byDid(body.did) : null;
		if (!usable(row, true) || typeof body.password !== "string") return xerr(401, "AuthenticationRequired", "Invalid account or password");
		const check = await host.account(row).checkPassword(row.did!, body.password);
		if (!check.ok) return xerr(check.locked ? 429 : 401, "AuthenticationRequired", "Invalid account or password");
		await host.delete(row, row.did!);
		return json(200, {});
	}

	if (path === "/xrpc/com.atproto.sync.listRepos" && method === "GET") return listRepos(host, url);

	if (READ_ROUTES.has(path) || SYNC_ROUTES.has(path)) {
		// A blob CID is used as part of an R2 key, so anything that is not a plain CID is refused:
		// otherwise "staged/…" or "space/…" would reach unreferenced uploads or private space blobs.
		if (path === "/xrpc/com.atproto.sync.getBlob" && !isPlainCid(url.searchParams.get("cid") ?? ""))
			return xerr(400, "InvalidRequest", "Invalid cid");
		const target = await publicTarget(host, url, READ_ROUTES.has(path) ? "repo" : "did");
		if (target instanceof Response) return target;
		const response = await scoped(host, new Request(url, request), ctx, target);
		return path === "/xrpc/com.atproto.sync.getBlob" ? blobResponse(response, url.searchParams.get("cid")!) : response;
	}
	if (WRITE_ROUTES.has(path)) {
		const auth = await authenticate(host, request);
		if (auth instanceof Response) return auth;
		// The account written to is always the caller's; a `repo` naming another
		// account is refused by the handlers (it does not match this DID).
		return scoped(host, request, ctx, auth.row, auth);
	}
	if (path.startsWith("/xrpc/com.atproto.space.") || path.startsWith("/xrpc/com.atproto.memberspace."))
		return handleSpaces(host, request, ctx, (inner) => worker.fetch(inner, host.env, ctx));

	// Passkeys (WebAuthn): <0.5 ms ECDSA sign-in avoiding ~21 ms PBKDF2 on Cloudflare Workers Free.
	if (path.startsWith("/xrpc/space.etnos.passkey.")) {
		if (path === "/xrpc/space.etnos.passkey.list" && method === "GET") {
			const auth = await authenticate(host, request);
			if (auth instanceof Response) return auth;
			const rows = await host.account(auth.row).listPasskeys(auth.did);
			return json(200, {
				passkeys: rows.map((r) => ({ id: r.credential_id, label: r.label, created: r.created })),
			});
		}
		if (path === "/xrpc/space.etnos.passkey.registerOptions" && method === "POST") {
			const auth = await authenticate(host, request);
			if (auth instanceof Response) return auth;
			const account = host.account(auth.row);
			const existing = await account.listPasskeys(auth.did);
			const options = await createPasskeyRegistrationOptions({
				rpName: host.displayName,
				rpID: host.env.PDS_HOSTNAME,
				did: auth.did,
				handle: auth.row.handle,
				existing,
			});
			await account.savePasskeyChallenge(auth.did, options.challenge, "register");
			return json(200, { options });
		}
		if (path === "/xrpc/space.etnos.passkey.registerVerify" && method === "POST") {
			const auth = await authenticate(host, request);
			if (auth instanceof Response) return auth;
			const body = await bodyJson(request);
			const challenge = typeof body.challenge === "string" ? body.challenge : "";
			const label = typeof body.label === "string" ? body.label.trim().slice(0, 80) : "Perangkat ini";
			const account = host.account(auth.row);
			if (!challenge || !(await account.consumePasskeyChallenge(auth.did, challenge, "register"))) {
				return xerr(400, "InvalidChallenge", "Tantangan kunci sandi tidak berlaku atau kedaluwarsa");
			}
			const verified = await verifyPasskeyRegistration({
				response: body.response as RegistrationResponseJSON,
				expectedChallenge: challenge,
				expectedOrigin: host.origin,
				expectedRPID: host.env.PDS_HOSTNAME,
			}).catch(() => null);
			if (!verified) return xerr(400, "InvalidAttestation", "Kunci sandi tidak dapat diverifikasi");
			await account.savePasskey(auth.did, { ...verified, label });
			await host.dir.audit(auth.did, "passkey.add", verified.credentialId.slice(0, 32), Date.now());
			return json(200, { id: verified.credentialId, label });
		}
		if (path === "/xrpc/space.etnos.passkey.delete" && method === "POST") {
			const auth = await authenticate(host, request);
			if (auth instanceof Response) return auth;
			const body = await bodyJson(request);
			const credentialId = typeof body.id === "string" ? body.id : "";
			const deleted = credentialId ? await host.account(auth.row).deletePasskey(auth.did, credentialId) : false;
			return json(deleted ? 200 : 404, { deleted });
		}
		if (path === "/xrpc/space.etnos.passkey.loginOptions" && method === "POST") {
			if (!(await host.spend(request, "password", 30))) return xerr(429, "RateLimitExceeded", "Try again later");
			const body = await bodyJson(request);
			const identifier = typeof body.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
			const row = identifier ? await host.dir.resolve(identifier.startsWith("did:") ? String(body.identifier).trim() : identifier) : null;
			if (!usable(row, true)) return json(200, { available: false });
			const account = host.account(row);
			const credentials = await account.listPasskeys(row.did!);
			if (!credentials.length) return json(200, { available: false });
			const options = await createPasskeyLoginOptions({ rpID: host.env.PDS_HOSTNAME, credentials });
			await account.savePasskeyChallenge(row.did!, options.challenge, "login");
			return json(200, { available: true, options });
		}
		if (path === "/xrpc/space.etnos.passkey.loginVerify" && method === "POST") {
			if (!(await host.spend(request, "password", 30))) return xerr(429, "RateLimitExceeded", "Try again later");
			const body = await bodyJson(request);
			const identifier = typeof body.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
			const challenge = typeof body.challenge === "string" ? body.challenge : "";
			const row = identifier ? await host.dir.resolve(identifier.startsWith("did:") ? String(body.identifier).trim() : identifier) : null;
			if (!usable(row, true) || !challenge) return xerr(401, "AuthenticationRequired", "Invalid passkey login");
			const account = host.account(row);
			if (!(await account.consumePasskeyChallenge(row.did!, challenge, "login"))) {
				return xerr(401, "AuthenticationRequired", "Passkey challenge expired");
			}
			const response = body.response as AuthenticationResponseJSON | undefined;
			const credentials = await account.listPasskeys(row.did!);
			const stored = response?.id ? credentials.find((c) => c.credential_id === response.id) : undefined;
			if (!stored || !response) return xerr(401, "AuthenticationRequired", "Unknown passkey");
			const verified = await verifyPasskeyLogin({
				response,
				expectedChallenge: challenge,
				expectedOrigin: host.origin,
				expectedRPID: host.env.PDS_HOSTNAME,
				stored,
			}).catch(() => null);
			if (!verified) return xerr(401, "AuthenticationRequired", "Passkey verification failed");
			await account.updatePasskeyCounter(row.did!, stored.credential_id, verified.newCounter);
			return json(200, await sessionResponse(host, row));
		}
	}
	return xerr(501, "MethodNotImplemented", "Not available on this host");
}

async function handleHost(host: Host, request: Request, label: string): Promise<Response> {
	const url = new URL(request.url);
	const row = await host.dir.byHandle(`${label}.${host.env.HANDLE_DOMAIN}`);
	if (!row) {
		if (host.env.PASS_THROUGH_UNKNOWN_HOSTS === "true") return fetch(request);
		return new Response("Not found", { status: 404 });
	}
	if (url.pathname === "/.well-known/atproto-did" && request.method === "GET" && row.status === "active" && row.did)
		return new Response(row.did, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "max-age=300" } });
	return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
}

const LIMIT_DEFAULT = 256 * 1024, LIMIT_BLOB = 5 * 1024 * 1024;

const worker = {
	async fetch(request: Request, env: HostEnv, ctx: ExecutionContext): Promise<Response> {
		const problem = hostConfigProblem(env);
		if (problem) {
			console.error("identity host configuration incomplete:", problem);
			return xerr(503, "Unavailable", "Host is not configured");
		}
		const url = new URL(request.url);
		if (url.protocol !== "https:") return xerr(400, "InvalidRequest", "HTTPS required");
		const host = new Host(env);
		if (url.hostname !== env.PDS_HOSTNAME) {
			const label = labelForHost(url.hostname, env.HANDLE_DOMAIN);
			if (!label || url.port) return xerr(400, "InvalidRequest", "Unexpected host");
			return handleHost(host, request, label);
		}
		if (request.headers.get("content-encoding") && request.headers.get("content-encoding") !== "identity")
			return xerr(415, "InvalidRequest", "Compressed request bodies are not supported");
		const limit = url.pathname === "/xrpc/com.atproto.repo.uploadBlob" ? LIMIT_BLOB : LIMIT_DEFAULT;
		if (Number(request.headers.get("content-length")) > limit) return xerr(413, "PayloadTooLarge", "Request exceeds this host limit");
		let exceeded = false, received = 0;
		if (request.body) {
			const stream = request.body.pipeThrough(
				new TransformStream<Uint8Array, Uint8Array>({
					transform(chunk, controller) {
						received += chunk.byteLength;
						if (received > limit) {
							exceeded = true;
							controller.error(new Error("Body limit"));
						} else controller.enqueue(chunk);
					},
				}),
			);
			request = new Request(request, { body: stream, duplex: "half" } as RequestInit);
		}
		try {
			const response = await service(host, request, ctx);
			if (exceeded) return xerr(413, "PayloadTooLarge", "Request exceeds this host limit");
			const headers = new Headers(response.headers);
			headers.set("x-content-type-options", "nosniff");
			if (!headers.has("referrer-policy")) headers.set("referrer-policy", "no-referrer");
			if (url.pathname.startsWith("/xrpc/") || url.pathname.startsWith("/.well-known/")) headers.set("access-control-allow-origin", "*");
			return new Response(response.body, { status: response.status, headers });
		} catch (error) {
			if (exceeded) return xerr(413, "PayloadTooLarge", "Request exceeds this host limit");
			console.error("identity host error on", url.pathname, error instanceof Error ? error.name : "unknown");
			return xerr(503, "Unavailable", "Temporarily unavailable");
		}
	},
} satisfies ExportedHandler<HostEnv>;

export default worker;
