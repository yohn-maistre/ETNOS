/**
 * Strata identity host: many AT accounts on one Workers deployment.
 * Strata code (AGPL-3.0-only); the repository engine, OAuth storage and
 * repository handlers are the attributed Cirrus foundation (LICENSE.cirrus).
 *
 * Two kinds of host name (plan §2.2 rule 5):
 * - the service host (PDS_HOSTNAME) serves XRPC, OAuth and the sign-up page;
 * - <name>.HANDLE_DOMAIN serves only /.well-known/atproto-did.
 *
 * The directory (D1) is read before any account object is woken; tokens are
 * verified before any account object is woken (plan §2.2 rule 2).
 */
import { equal, randomToken } from "./crypto.ts";
import type { AccountRow } from "./directory.ts";
import { hostConfigProblem, type HostEnv } from "./env.ts";
import { labelForHost } from "./handles.ts";
import { handleOAuth, provider } from "./oauth.ts";
import { homePage, messagePage, signupDonePage, signupPage } from "./pages.ts";
import { READ_ROUTES, SYNC_ROUTES, WRITE_ROUTES, runScoped, scopedStub, type ScopedEnv } from "./repo-routes.ts";
import { Host } from "./service.ts";
import { ExpiredTokenError, claimedSubject, issueSession, serviceDid, verifySession } from "./session.ts";

export { HostedAccountDurableObject } from "./account-do.ts";
export { AuthHubDurableObject } from "./auth-hub.ts";

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

async function admin(host: Host, request: Request, path: string): Promise<Response> {
	const header = request.headers.get("authorization") ?? "";
	if (!header.startsWith("Bearer ") || !equal(header.slice(7), host.env.OPERATOR_TOKEN)) return xerr(401, "AuthenticationRequired", "Operator token required");
	const now = Date.now();
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
	const values = { code: get("code"), label: get("label").toLowerCase() };
	if (get("password") !== get("password2")) return signupPage(name, domain, { ...values, error: "Kedua kata sandi tidak sama." }, 400);
	if (get("age") !== "16") return signupPage(name, domain, { ...values, error: "Akun hanya untuk orang berusia 16 tahun atau lebih." }, 400);
	if (!(await host.spend(request, "signup", 10)))
		return signupPage(name, domain, { ...values, error: "Terlalu banyak percobaan dari jaringan ini. Coba lagi dalam 10 menit." }, 429);
	const result = await host.createAccount({ code: values.code, handle: values.label, password: get("password") });
	if (!result.ok) return signupPage(name, domain, { ...values, error: result.message }, result.status);
	const signin = host.env.SIGNIN_URL ? `${host.env.SIGNIN_URL}${host.env.SIGNIN_URL.includes("?") ? "&" : "?"}handle=${encodeURIComponent(result.handle)}` : null;
	return signupDonePage(name, result.handle, signin);
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
			service: "strata-identity-host",
			stage: "experimental",
			multiAccount: true,
			signup: "invite",
			publicRepository: true,
			firehose: false,
			passkeys: false,
		});
	if (path === "/.well-known/did.json")
		return json(200, {
			"@context": ["https://www.w3.org/ns/did/v1"],
			id: serviceDid(host.env),
			service: [{ id: "#atproto_pds", type: "AtprotoPersonalDataServer", serviceEndpoint: host.origin }],
		});
	if (path === "/akun/baru" && method === "GET")
		return signupPage(host.displayName, host.env.HANDLE_DOMAIN, { code: (url.searchParams.get("kode") ?? "").slice(0, 100) });
	if (path === "/akun/baru" && method === "POST") return signupForm(host, request);
	if (path.startsWith("/admin/")) return admin(host, request, path);

	const oauth = await handleOAuth(host, request);
	if (oauth) return oauth;

	if (!path.startsWith("/xrpc/")) return xerr(404, "NotFound", "Not found");
	if (request.headers.has("atproto-proxy")) return xerr(400, "InvalidRequest", "Service proxy is not enabled");

	if (path === "/xrpc/_health") return json(200, { version: "strata-identity-host" });
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
		return json(200, { did: session.did, handle: session.handle, accessJwt: session.accessJwt, refreshJwt: session.refreshJwt });
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
		const target = await publicTarget(host, url, READ_ROUTES.has(path) ? "repo" : "did");
		if (target instanceof Response) return target;
		return scoped(host, new Request(url, request), ctx, target);
	}
	if (WRITE_ROUTES.has(path)) {
		const auth = await authenticate(host, request);
		if (auth instanceof Response) return auth;
		// The account written to is always the caller's; a `repo` naming another
		// account is refused by the handlers (it does not match this DID).
		return scoped(host, request, ctx, auth.row, auth);
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

export default {
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
			headers.set("referrer-policy", "no-referrer");
			if (url.pathname.startsWith("/xrpc/") || url.pathname.startsWith("/.well-known/")) headers.set("access-control-allow-origin", "*");
			return new Response(response.body, { status: response.status, headers });
		} catch (error) {
			if (exceeded) return xerr(413, "PayloadTooLarge", "Request exceeds this host limit");
			console.error("identity host error on", url.pathname, error instanceof Error ? error.name : "unknown");
			return xerr(503, "Unavailable", "Temporarily unavailable");
		}
	},
} satisfies ExportedHandler<HostEnv>;
