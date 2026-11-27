/**
 * OAuth for many accounts on one host (plan §2.2 rule 4). ETNOS code
 * (AGPL-3.0-only) wrapping the MIT @getcirrus/oauth-provider, not forking it.
 *
 * The provider has no account field, so this wrapper adds the account step:
 * the account comes from the client's login_hint (stored with the pushed
 * request) or from a short-lived signed cookie set when the person picks or
 * types an account. The provider is then built for that one account, and its
 * password check runs inside that account's object. Codes and tokens live in
 * the shared auth hub, each carrying its account in `sub`.
 */
import { ATProtoOAuthProvider, ClientResolver } from "@getcirrus/oauth-provider";
import { b64url, equal, fromB64url, hmac, sha256 } from "./crypto.ts";
import type { AccountRow } from "./directory.ts";
import { consentPage, flowLink, messagePage, selectorPage, signupPage, signupRecoveryPage, type OAuthPageContext } from "./pages.ts";
import { minimumAge, signupsClosed } from "./env.ts";
import type { Host } from "./service.ts";

const SELECT_COOKIE = "__Host-strata_oauth_account";
const REMEMBER_COOKIE = "__Host-strata_accounts";
const SELECT_TTL = 10 * 60 * 1000;

type VerifyUser = (password: string) => Promise<{ sub: string; handle: string } | null>;

export async function provider(host: Host, verifyUser?: VerifyUser) {
	const storage = await host.hub().store();
	const instance = new ATProtoOAuthProvider({
		storage,
		issuer: host.origin,
		dpopRequired: true,
		enablePAR: true,
		verifyUser,
	});
	return Object.assign(instance, { [Symbol.dispose]: () => storage[Symbol.dispose]() });
}

function cookie(request: Request, name: string): string | null {
	for (const part of (request.headers.get("cookie") ?? "").split(";")) {
		const [k, ...v] = part.trim().split("=");
		if (k === name) return v.join("=");
	}
	return null;
}

const setCookie = (name: string, value: string, maxAge: number) =>
	`${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

async function requestTag(requestUri: string) {
	return b64url(await sha256("request:" + requestUri)).slice(0, 22);
}

/** Selection cookie: request tag, chosen DID (or "none"), expiry, MAC. */
async function readSelection(host: Host, request: Request, requestUri: string): Promise<string | null | "none"> {
	const raw = cookie(request, SELECT_COOKIE);
	if (!raw) return null;
	const parts = raw.split(".");
	if (parts.length !== 4) return null;
	const [tag, did, exp, mac] = parts as [string, string, string, string];
	const expected = await hmac(await host.hostKey("oauth-select/v1"), `${tag}.${did}.${exp}`);
	if (!equal(mac, expected) || tag !== (await requestTag(requestUri)) || Number(exp) < Date.now()) return null;
	return did === "none" ? "none" : decodeURIComponent(did);
}

async function selectionCookie(host: Host, requestUri: string, did: string | "none") {
	const tag = await requestTag(requestUri), exp = String(Date.now() + SELECT_TTL);
	const value = did === "none" ? "none" : encodeURIComponent(did);
	const mac = await hmac(await host.hostKey("oauth-select/v1"), `${tag}.${value}.${exp}`);
	return setCookie(SELECT_COOKIE, `${tag}.${value}.${exp}.${mac}`, SELECT_TTL / 1000);
}

/** Accounts used on this device, newest first, at most five. Signed so the list cannot be planted. */
async function readRemembered(host: Host, request: Request): Promise<string[]> {
	const raw = cookie(request, REMEMBER_COOKIE);
	if (!raw) return [];
	const [body, mac] = raw.split(".");
	if (!body || !mac || !equal(mac, await hmac(await host.hostKey("oauth-remember/v1"), body))) return [];
	try {
		const list = JSON.parse(new TextDecoder().decode(fromB64url(body)));
		return Array.isArray(list) ? list.filter((d): d is string => typeof d === "string").slice(0, 5) : [];
	} catch {
		return [];
	}
}

async function rememberCookie(host: Host, request: Request, did: string) {
	const list = [did, ...(await readRemembered(host, request)).filter((d) => d !== did)].slice(0, 5);
	const body = b64url(new TextEncoder().encode(JSON.stringify(list)));
	return setCookie(REMEMBER_COOKIE, `${body}.${await hmac(await host.hostKey("oauth-remember/v1"), body)}`, 180 * 86400);
}

async function activeAccount(host: Host, actor: string | undefined | null): Promise<AccountRow | null> {
	if (!actor || typeof actor !== "string") return null;
	const value = actor.trim().toLowerCase().replace(/^@/, "");
	const handle = value.startsWith("did:") || value.includes(".") ? value : `${value}.${host.env.HANDLE_DOMAIN}`;
	const row = await host.dir.resolve(value.startsWith("did:") ? actor.trim() : handle);
	return row && row.status === "active" ? row : null;
}

interface Pending {
	ctx: OAuthPageContext;
	loginHint?: string;
	prompt?: string;
}

async function pendingRequest(host: Host, clientId: string | null, requestUri: string | null): Promise<Pending | null> {
	if (!clientId || !requestUri || requestUri.length > 200 || clientId.length > 500) return null;
	using storage = await host.hub().store();
	const par = await storage.getPAR(requestUri);
	if (!par || par.clientId !== clientId || par.expiresAt < Date.now()) return null;
	let clientName = new URL(clientId).host;
	try {
		const client = await new ClientResolver({ storage }).resolveClient(clientId);
		if (client.clientName) clientName = client.clientName;
	} catch {
		return null;
	}
	const params = par.params as Record<string, string>;
	return {
		ctx: { clientName, clientId, requestUri, scope: params.scope ?? "atproto" },
		loginHint: params.login_hint,
		prompt: params.prompt,
	};
}

async function chosenAccount(host: Host, request: Request, pending: Pending): Promise<AccountRow | null> {
	const selected = await readSelection(host, request, pending.ctx.requestUri);
	if (selected === "none") return null;
	if (selected) return activeAccount(host, selected);
	return activeAccount(host, pending.loginHint);
}

async function selector(host: Host, request: Request, ctx: OAuthPageContext, error?: string, status = 200) {
	const handles: string[] = [];
	for (const did of await readRemembered(host, request)) {
		const row = await activeAccount(host, did);
		if (row) handles.push(row.handle);
	}
	return selectorPage(host.displayName, host.env.HANDLE_DOMAIN, ctx, handles, error, status);
}

/** The pending sign-in a sign-up form carried, if it is still valid. */
export async function signupFlow(host: Host, clientId: string, requestUri: string): Promise<OAuthPageContext | undefined> {
	if (!clientId && !requestUri) return undefined;
	return (await pendingRequest(host, clientId, requestUri))?.ctx;
}

/**
 * After sign-up inside a sign-in flow: show the recovery code once, with the new account already chosen, then go
 * on to consent, where the password is asked again.
 */
export async function continueAfterSignup(ctx: OAuthPageContext, host: Host, did: string, handle: string, code: string): Promise<Response> {
	return signupRecoveryPage(handle, code, flowLink(ctx), await selectionCookie(host, ctx.requestUri, did));
}

const expired = () => messagePage("Permintaan masuk sudah tidak berlaku", "Kembali ke aplikasi dan mulai lagi.", 400);

export async function handleOAuth(host: Host, request: Request): Promise<Response | null> {
	const url = new URL(request.url), path = url.pathname, method = request.method;

	if (path === "/.well-known/oauth-authorization-server" && method === "GET") {
		using p = await provider(host);
		return await p.handleMetadata();
	}
	if (path === "/.well-known/oauth-protected-resource" && method === "GET")
		return Response.json({ resource: host.origin, authorization_servers: [host.origin], scopes_supported: ["atproto", "transition:generic"] });
	if (path === "/oauth/jwks" && method === "GET") {
		using p = await provider(host);
		return await p.handleJwks();
	}
	if (path === "/oauth/par" && method === "POST") {
		using p = await provider(host);
		return await p.handlePAR(request);
	}

	if (path === "/oauth/authorize" && method === "GET") {
		if (/TelegramBot|Slackbot|Discordbot|Twitterbot|facebookexternalhit|WhatsApp/i.test(request.headers.get("user-agent") ?? ""))
			return messagePage("Buka tautan ini di peramban", "Tautan masuk ini hanya bisa dipakai sekali.", 200);
		const pending = await pendingRequest(host, url.searchParams.get("client_id"), url.searchParams.get("request_uri"));
		if (!pending) return expired();
		const account = await chosenAccount(host, request, pending);
		if (account) return consentPage(pending.ctx, account.handle);
		// An app that asked for a new account (prompt=create) lands on sign-up; "masuk=1" switches to sign-in.
		const create = url.searchParams.get("buat") === "1" || (pending.prompt === "create" && url.searchParams.get("masuk") !== "1");
		// The ETNOS node adds its signed grant as ?kode= when the person came from one of its invitation links.
		const code = (url.searchParams.get("kode") ?? "").slice(0, 600);
		if (create && !signupsClosed(host.env)) return signupPage(host.displayName, host.env.HANDLE_DOMAIN, { code, label: "", minAge: minimumAge(host.env) }, 200, pending.ctx);
		return selector(host, request, pending.ctx);
	}

	if ((path === "/oauth/select" || path === "/oauth/authorize") && method === "POST") {
		const origin = request.headers.get("origin");
		if (origin && origin !== host.origin) return messagePage("Permintaan ditolak", "Permintaan ini tidak berasal dari halaman masuk.", 403);
		const form = await request.clone().formData();
		const field = (name: string) => {
			const v = form.get(name);
			return typeof v === "string" ? v : null;
		};
		const pending = await pendingRequest(host, field("client_id"), field("request_uri"));
		if (!pending) return expired();
		const back = `/oauth/authorize?client_id=${encodeURIComponent(pending.ctx.clientId)}&request_uri=${encodeURIComponent(pending.ctx.requestUri)}`;

		if (path === "/oauth/select") {
			if (field("other")) {
				return new Response(null, { status: 303, headers: { location: back, "set-cookie": await selectionCookie(host, pending.ctx.requestUri, "none") } });
			}
			const row = await activeAccount(host, field("handle"));
			if (!row) return selector(host, request, pending.ctx, "Akun tidak ditemukan di server ini.", 404);
			return new Response(null, { status: 303, headers: { location: back, "set-cookie": await selectionCookie(host, pending.ctx.requestUri, row.did!) } });
		}

		if (field("action") === "deny") {
			using p = await provider(host);
			return await p.handleAuthorize(request);
		}
		const row = await chosenAccount(host, request, pending);
		if (!row) return selector(host, request, pending.ctx, undefined, 400);
		if (!(await host.spend(request, "password", 30)))
			return consentPage(pending.ctx, row.handle, "Terlalu banyak percobaan dari jaringan ini. Coba lagi dalam 10 menit.", 429);
		const did = row.did!;
		let locked = false;
		const verifyUser: VerifyUser = async (password) => {
			const result = await host.account(row).checkPassword(did, password);
			locked = result.locked;
			return result.ok ? { sub: did, handle: row.handle } : null;
		};
		using p = await provider(host, verifyUser);
		const response = await p.handleAuthorize(request);
		if (response.status === 401)
			return consentPage(
				pending.ctx,
				row.handle,
				locked ? "Terlalu banyak percobaan untuk akun ini. Coba lagi dalam 10 menit." : "Kata sandi salah.",
				401,
			);
		if (response.status === 302) {
			const headers = new Headers(response.headers);
			headers.append("set-cookie", await rememberCookie(host, request, did));
			headers.append("set-cookie", setCookie(SELECT_COOKIE, "", 0));
			headers.set("cache-control", "no-store");
			return new Response(null, { status: 302, headers });
		}
		return response;
	}

	if (path === "/oauth/token" && method === "POST") {
		using p = await provider(host);
		const response = await p.handleToken(request);
		if (response.status !== 200) return response;
		const body = (await response.clone().json()) as { sub?: string };
		const row = body.sub ? await host.dir.byDid(body.sub) : null;
		if (!row || row.status !== "active") {
			if (body.sub) await host.hub().revokeSubject(body.sub);
			return Response.json({ error: "invalid_grant", error_description: "Account is not active" }, { status: 400 });
		}
		return response;
	}

	if (path === "/oauth/userinfo" && method === "GET") {
		using p = await provider(host);
		const token = await p.verifyAccessToken(request);
		const row = token ? await host.dir.byDid(token.sub) : null;
		if (!token || !row || row.status !== "active") return Response.json({ error: "invalid_token" }, { status: 401 });
		return Response.json({ sub: token.sub, preferred_username: row.handle });
	}

	if (path === "/oauth/revoke" && method === "POST") {
		const type = request.headers.get("content-type") ?? "";
		let token: string | undefined;
		try {
			if (type.includes("application/json")) token = ((await request.json()) as { token?: string }).token;
			else if (type.includes("application/x-www-form-urlencoded")) token = new URLSearchParams(await request.text()).get("token") ?? undefined;
		} catch {
			return Response.json({ error: "invalid_request" }, { status: 400 });
		}
		if (typeof token === "string" && token.length < 500) {
			using storage = await host.hub().store();
			await storage.revokeToken(token);
			const byRefresh = await storage.getTokenByRefresh(token);
			if (byRefresh) await storage.revokeToken(byRefresh.accessToken);
		}
		return Response.json({});
	}

	if (path.startsWith("/oauth/")) return Response.json({ error: "not_found" }, { status: 404 });
	return null;
}
