/**
 * AT Protocol spaces (alpha, proposal 0016) on the multi-account host. Strata code (AGPL-3.0-only)
 * around the MIT @getcirrus/spaces engine, which was written for one account per deployment.
 *
 * What this module adds for many accounts on one host:
 * - Every request is served for one hosted account (the "operator" the engine expects): the
 *   signed-in account for writes and management, the `repo` for reads, the space authority for
 *   credential and sync calls. That account must be active here.
 * - Space objects are named per account and space, so two hosted members of one space never
 *   share storage. Each account has its own space index.
 * - Space tokens are signed inside the account's object (signSpaceJwt); the key never leaves it.
 * - Sessions only count for their own account: one hosted account cannot read or write another's
 *   space repository by naming it.
 * - Removal takes effect at once. The alpha's space credentials are valid for up to two hours and
 *   cannot be revoked; this host records which user each credential was issued to, and on every
 *   credential read for a space whose authority is hosted here it checks that user against the
 *   space's current policy. For an authority on another host, a credential is accepted only while
 *   it is younger than SPACES_REMOTE_CREDENTIAL_MAX_AGE seconds (default 300).
 *
 * Spaces give access control, not confidentiality: this host's operator can read space data.
 */
import {
	SpaceDurableObject as EngineSpaceDurableObject,
	SpaceIndexDurableObject as EngineSpaceIndexDurableObject,
	createSpaceRoutes,
	parseSpaceErrorCode,
	requireSpaceUri,
	spaceErrorStatus,
	type SpaceHostConfig,
	type SpaceIndexStub,
	type SpaceRoutesHost,
	type SpaceScopeMatch,
	type SpaceSessionAuth,
	type SpaceStub,
} from "@getcirrus/spaces";
import { createSpaceToken, spaceHostAud } from "@atproto/space";
import { verifySignature } from "@atproto/crypto";
import { permissionsFor } from "@getcirrus/oauth-provider";
import { validator } from "../upstream/validation";
import { fromB64url } from "./crypto.ts";
import type { AccountRow } from "./directory.ts";
import type { HostEnv } from "./env.ts";
import { provider } from "./oauth.ts";
import { Host } from "./service.ts";
import { ExpiredTokenError, claimedSubject, verifySession } from "./session.ts";

const ISSUED_SCHEMA = "CREATE TABLE IF NOT EXISTS strata_issued_credentials (jti TEXT PRIMARY KEY, user_did TEXT NOT NULL, issued INTEGER NOT NULL, expires INTEGER NOT NULL)";

/** Name of an account's object for one space. */
const spaceObjectName = (operator: string, uri: string) => `${operator} ${uri}`;

/** Load a hosted account's signer for space tokens. The private key stays in the account object. */
export function accountSigner(host: Host, row: AccountRow) {
	const did = row.did!;
	return {
		jwtAlg: "ES256K",
		did: () => row.signing_key!,
		sign: (msg: Uint8Array) => host.account(row).signSpaceJwt(did, msg),
	};
}

export class HostedSpaceDurableObject extends EngineSpaceDurableObject<HostEnv> {
	protected getHostConfig(): SpaceHostConfig {
		// Used only for notification service JWTs from the alarm, issued by the space authority.
		const name = this.ctx.id.name ?? "";
		const operatorDid = name.split(" ")[0] ?? "";
		return {
			operatorDid,
			getKeypair: async () => {
				const host = new Host(this.env);
				const row = await host.dir.byDid(operatorDid);
				if (!row || row.status !== "active") throw new Error("Space operator is not an active account here");
				return accountSigner(host, row) as never;
			},
		};
	}

	private issuedTable() {
		this.ctx.storage.sql.exec(ISSUED_SCHEMA);
	}

	/** The authority object records whom each credential went to. */
	async rpcRecordIssued(jti: string, userDid: string, expires: number): Promise<void> {
		this.issuedTable();
		const now = Date.now();
		this.ctx.storage.sql.exec("DELETE FROM strata_issued_credentials WHERE expires < ?", now);
		this.ctx.storage.sql.exec("INSERT OR REPLACE INTO strata_issued_credentials VALUES (?,?,?,?)", jti, userDid, now, expires);
	}

	async rpcIssuedTo(jti: string): Promise<string | null> {
		this.issuedTable();
		const row = this.ctx.storage.sql.exec<{ user_did: string }>("SELECT user_did FROM strata_issued_credentials WHERE jti = ? AND expires >= ?", jti, Date.now()).toArray()[0];
		return row?.user_did ?? null;
	}
}

export class HostedSpaceIndexDurableObject extends EngineSpaceIndexDurableObject<HostEnv> {}

export const spacesEnabled = (env: HostEnv) => env.SPACES_ENABLED === "true" && !!env.SPACES && !!env.SPACES_INDEX;

const SESSION_METHODS = new Set([
	"com.atproto.space.getDelegationToken",
	"com.atproto.space.listSpaces",
	"com.atproto.space.createRecord",
	"com.atproto.space.putRecord",
	"com.atproto.space.deleteRecord",
	"com.atproto.space.applyWrites",
	"com.atproto.space.uploadBlob",
	"com.atproto.simplespace.createSpace",
	"com.atproto.simplespace.updateSpace",
	"com.atproto.simplespace.deleteSpace",
	"com.atproto.simplespace.addMember",
	"com.atproto.simplespace.removeMember",
	"com.atproto.simplespace.getSpace",
	"com.atproto.simplespace.listMembers",
]);
const READ_METHODS = new Set([
	"com.atproto.space.getRecord",
	"com.atproto.space.listRecords",
	"com.atproto.space.getLatestCommit",
	"com.atproto.space.listRepoOps",
	"com.atproto.space.getRepo",
	"com.atproto.space.listBlobs",
	"com.atproto.space.getBlob",
]);
const AUTHORITY_METHODS = new Set([
	"com.atproto.space.getSpaceCredential",
	"com.atproto.space.listRepos",
	"com.atproto.space.registerNotify",
	"com.atproto.space.unregisterNotify",
	"com.atproto.space.notifyWrite",
]);

const xerr = (status: number, error: string, message: string) => Response.json({ error, message }, { status });

function decodeJwt(token: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
	const [h, p] = token.split(".");
	if (!h || !p) return null;
	try {
		const decode = (part: string) => JSON.parse(new TextDecoder().decode(fromB64url(part))) as Record<string, unknown>;
		return { header: decode(h), payload: decode(p) };
	} catch {
		return null;
	}
}

/** Which hosted account a spaces request is for, before any authentication. */
async function operatorFor(host: Host, method: string, request: Request, url: URL): Promise<string | null> {
	const header = request.headers.get("authorization") ?? "";
	const body = request.method === "POST" && (request.headers.get("content-type") ?? "").includes("application/json")
		? ((await request.clone().json().catch(() => ({}))) as Record<string, unknown>)
		: {};
	const spaceParam = String(url.searchParams.get("space") ?? body.space ?? "");
	const authorityOf = () => {
		try {
			return requireSpaceUri(spaceParam).authority;
		} catch {
			return null;
		}
	};
	if (SESSION_METHODS.has(method)) {
		if (header.startsWith("DPoP ")) {
			using p = await provider(host);
			return (await p.verifyAccessToken(request))?.sub ?? null;
		}
		return header.startsWith("Bearer ") ? claimedSubject(header.slice(7)) : null;
	}
	if (READ_METHODS.has(method)) return url.searchParams.get("repo");
	if (AUTHORITY_METHODS.has(method)) return authorityOf();
	if (method === "com.atproto.space.notifySpaceDeleted") {
		const aud = header.startsWith("Bearer ") ? decodeJwt(header.slice(7))?.payload.aud : null;
		return typeof aud === "string" ? aud.split("#")[0]! : null;
	}
	return null;
}

export async function handleSpaces(host: Host, request: Request, ctx: ExecutionContext, internal: (request: Request) => Promise<Response>): Promise<Response> {
	const url = new URL(request.url);
	const method = url.pathname.slice("/xrpc/".length);
	const env = host.env;
	if (!spacesEnabled(env)) return xerr(501, "MethodNotImplemented", "Spaces are not enabled on this host");
	if (!SESSION_METHODS.has(method) && !READ_METHODS.has(method) && !AUTHORITY_METHODS.has(method) && method !== "com.atproto.space.notifySpaceDeleted")
		return xerr(501, "MethodNotImplemented", "Not available on this host");

	// Read the body once; the engine and the checks below each get their own copy.
	const raw = request.method === "POST" ? await request.arrayBuffer() : null;
	request = new Request(request, { body: raw });
	const bodySpace = raw && (request.headers.get("content-type") ?? "").includes("application/json")
		? (() => { try { return (JSON.parse(new TextDecoder().decode(raw)) as { space?: unknown }).space; } catch { return undefined; } })()
		: undefined;
	const operator = await operatorFor(host, method, request.clone() as Request, url);
	const row = operator ? await host.dir.byDid(operator) : null;
	if (!row || row.status !== "active" || !row.did) return xerr(404, "RepoNotFound", "Repository not found");
	const operatorDid = row.did;
	const signer = accountSigner(host, row);

	async function hostedKey(did: string): Promise<string | null> {
		const r = await host.dir.byDid(did);
		return r && r.status === "active" && r.signing_key ? r.signing_key : null;
	}
	async function didDocument(did: string): Promise<Record<string, unknown> | null> {
		let target: string;
		if (did.startsWith("did:plc:")) target = `${env.PLC_URL.replace(/\/+$/, "")}/${did}`;
		else if (did.startsWith("did:web:")) target = `https://${decodeURIComponent(did.slice(8))}/.well-known/did.json`;
		else return null;
		const r = await fetch(target, { headers: { accept: "application/json" } });
		return r.ok ? ((await r.json()) as Record<string, unknown>) : null;
	}
	const getSigningKey = async (iss: string, kid: string | undefined) => {
		if (kid && kid !== "#atproto" && kid !== "#atproto_space") throw new Error(`Unsupported signing key id: ${kid}`);
		const local = await hostedKey(iss);
		if (local) return local;
		const doc = await didDocument(iss);
		const methods = (doc?.verificationMethod ?? []) as { id: string; publicKeyMultibase?: string }[];
		const find = (f: string) => methods.find((m) => m.id === f || m.id.endsWith(f));
		const m = (kid ? find(kid) : undefined) ?? find("#atproto");
		if (!m?.publicKeyMultibase) throw new Error(`No signing key for ${iss}`);
		return `did:key:${m.publicKeyMultibase}`;
	};
	const resolveServiceEndpoint = async (service: string) => {
		const [did, fragment] = service.split("#") as [string, string?];
		if (await hostedKey(did)) return !fragment || fragment === "atproto_pds" ? host.origin : null;
		const doc = await didDocument(did);
		const services = (doc?.service ?? []) as { id: string; serviceEndpoint: unknown }[];
		const want = `#${fragment ?? "atproto_pds"}`;
		const entry = services.find((s) => s.id === want || s.id.endsWith(want));
		return typeof entry?.serviceEndpoint === "string" ? entry.serviceEndpoint : null;
	};
	const getSpaceDO = (operatorOf: string, uri: string) => env.SPACES!.get(env.SPACES!.idFromName(spaceObjectName(operatorOf, uri))) as unknown as SpaceStub & DurableObjectStub<HostedSpaceDurableObject>;

	/** Sessions count only for their own account. */
	async function authenticate(c: { req: { raw: Request } }): Promise<SpaceSessionAuth | Response> {
		const req = c.req.raw, header = req.headers.get("authorization") ?? "";
		if (header.startsWith("DPoP ")) {
			using p = await provider(host);
			const token = await p.verifyAccessToken(req);
			if (!token || token.sub !== operatorDid) return xerr(401, "AuthenticationRequired", "Invalid OAuth access token");
			const perms = permissionsFor(token.scope);
			return { did: operatorDid, fullTrust: false, allowsSpace: (m: SpaceScopeMatch) => perms.allowsSpace(m as never) };
		}
		if (!header.startsWith("Bearer ")) return xerr(401, "AuthMissing", "Authorization header required");
		const fresh = await host.dir.byDid(operatorDid);
		if (!fresh || fresh.status !== "active") return xerr(401, "AuthenticationRequired", "Account is not active");
		try {
			await verifySession(env, header.slice(7), operatorDid, fresh.session_epoch, "access");
			return { did: operatorDid, fullTrust: true, allowsSpace: () => true };
		} catch (error) {
			if (error instanceof ExpiredTokenError) return xerr(400, "ExpiredToken", "Token has expired");
			return xerr(401, "AuthenticationRequired", "Invalid authentication token");
		}
	}

	const routesHost: SpaceRoutesHost = {
		operatorDid,
		publicOrigin: host.origin,
		blobs: env.BLOBS,
		getKeypair: async () => signer as never,
		getSigningKey,
		resolveServiceEndpoint,
		resolveAuthorityEndpoint: async (did) => (await resolveServiceEndpoint(`${did}#atproto_space_host`)) ?? (await resolveServiceEndpoint(did)),
		verifyServiceJwt: async (token, lxm) => {
			const parts = token.split("."), decoded = decodeJwt(token);
			if (parts.length !== 3 || !decoded) throw new Error("Malformed service JWT");
			const { iss, aud, exp } = decoded.payload;
			if (typeof iss !== "string" || typeof aud !== "string") throw new Error("Service JWT missing iss or aud");
			if (decoded.payload.lxm !== lxm) throw new Error(`Service JWT not bound to ${lxm}`);
			if (typeof exp !== "number" || exp < Math.floor(Date.now() / 1000) - 5) throw new Error("Service JWT expired");
			const ok = await verifySignature(await getSigningKey(iss, undefined), new TextEncoder().encode(`${parts[0]}.${parts[1]}`), fromB64url(parts[2]!));
			if (!ok) throw new Error("Invalid service JWT signature");
			return { iss, aud };
		},
		authenticate: authenticate as never,
		validateRecord: ({ collection, record, rkey, validate }) => {
			const result = validator.validate({ collection, record, rkey, validate });
			return { record: result.record, status: result.status };
		},
		getSpaceDO: (uri) => getSpaceDO(operatorDid, uri),
		getIndexDO: () => env.SPACES_INDEX!.get(env.SPACES_INDEX!.idFromName(`index ${operatorDid}`)) as unknown as SpaceIndexStub,
		// A Worker cannot fetch its own host name; calls between accounts on this host stay inside.
		outboundFetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
			const req = new Request(input, init);
			return new URL(req.url).origin === host.origin ? internal(req) : fetch(req);
		}) as typeof fetch,
	};

	// Removal is immediate: credential reads are checked against the authority's current policy.
	if (READ_METHODS.has(method) && (request.headers.get("authorization") ?? "").startsWith("DPoP ")) {
		const credential = decodeJwt((request.headers.get("authorization") ?? "").slice(5));
		if (credential?.header.typ === "atproto-space-credential+jwt") {
			const denied = await checkCredentialNow(credential.payload, url.searchParams.get("space") ?? "");
			if (denied) return denied;
		}
	}

	async function checkCredentialNow(payload: Record<string, unknown>, space: string): Promise<Response | null> {
		let ref;
		try {
			ref = requireSpaceUri(space);
		} catch {
			return null; // the engine rejects it with the right error
		}
		const authority = await host.dir.byDid(ref.authority);
		if (!authority || authority.status !== "active") {
			const maxAge = Number(env.SPACES_REMOTE_CREDENTIAL_MAX_AGE ?? "300");
			const iat = Number(payload.iat);
			if (!Number.isFinite(iat) || Date.now() / 1000 - iat > maxAge)
				return xerr(401, "InvalidCredential", "Space credential is too old for this host; get a fresh one");
			return null;
		}
		const stub = getSpaceDO(ref.authority, ref.uri);
		const user = typeof payload.jti === "string" ? await stub.rpcIssuedTo(payload.jti) : null;
		if (!user) return xerr(401, "InvalidCredential", "Space credential is not known to its authority");
		if (user === ref.authority) return null;
		const { meta, config } = await stub.rpcGetAuthorityState();
		if (!meta || meta.deletedAt || !config) return xerr(403, "SpaceNotFound", "Space not found");
		const policy = config.policy as { kind: string };
		if (policy.kind === "public") return null;
		if (policy.kind === "member-list" && (await stub.rpcIsMember(user))) return null;
		if (policy.kind === "managing-app" && Date.now() / 1000 - Number(payload.iat) <= 60) return null;
		return xerr(403, "UserNotAuthorized", "No longer a member of this space");
	}

	const app = createSpaceRoutes(routesHost);

	// The user's-PDS role: delegation tokens and the space list, for the signed-in account.
	app.get("/xrpc/com.atproto.space.getDelegationToken", async (c) => {
		try {
			const ref = requireSpaceUri(c.req.query("space"));
			const session = await authenticate(c);
			if (session instanceof Response) return session;
			if (!session.fullTrust && !session.allowsSpace({ type: ref.type, authority: ref.authority, skey: ref.skey, action: "read" } as SpaceScopeMatch))
				return c.json({ error: "InsufficientScope", message: "Token does not cover reading this space" }, 403);
			const token = await createSpaceToken("delegation", { iss: operatorDid, sub: ref.uri, aud: spaceHostAud(ref.authority) }, signer as never);
			return c.json({ token });
		} catch (err) {
			const parsed = parseSpaceErrorCode(err);
			if (parsed) return c.json({ error: parsed.code, message: parsed.message }, spaceErrorStatus(parsed.code) as never);
			throw err;
		}
	});
	app.get("/xrpc/com.atproto.space.listSpaces", async (c) => {
		const session = await authenticate(c);
		if (session instanceof Response) return session;
		const limit = Math.min(Math.max(Number.parseInt(c.req.query("limit") ?? "50", 10) || 50, 1), 100);
		const page = await routesHost.getIndexDO().rpcList({ type: c.req.query("type"), authority: c.req.query("did"), state: "active", limit, afterUri: c.req.query("cursor") });
		const last = page.spaces[page.spaces.length - 1];
		return c.json({ spaces: page.spaces.map((s) => ({ uri: s.uri })), ...(page.hasMore && last ? { cursor: last.uri } : {}) });
	});

	const response = await app.fetch(request.clone() as Request, env as never, ctx);

	// Record whom a credential went to, so later reads can be checked against current membership.
	if (method === "com.atproto.space.getSpaceCredential" && response.status === 200) {
		const delegation = decodeJwt((request.headers.get("authorization") ?? "").slice(7));
		const body = (await response.clone().json()) as { credential?: string };
		const issued = body.credential ? decodeJwt(body.credential) : null;
		const user = delegation?.payload.iss, jti = issued?.payload.jti, exp = Number(issued?.payload.exp);
		if (typeof user !== "string" || typeof jti !== "string" || typeof bodySpace !== "string") return xerr(500, "InternalServerError", "Credential not recorded");
		await getSpaceDO(operatorDid, requireSpaceUri(bodySpace).uri).rpcRecordIssued(jti, user, exp * 1000);
	}
	return response;
}

/** On account deletion: remove every space object the account holds and its index. */
export async function purgeAccountSpaces(env: HostEnv, did: string): Promise<void> {
	if (!env.SPACES || !env.SPACES_INDEX) return;
	const index = env.SPACES_INDEX.get(env.SPACES_INDEX.idFromName(`index ${did}`)) as unknown as SpaceIndexStub;
	let afterUri: string | undefined;
	for (;;) {
		const page = await index.rpcList({ limit: 500, afterUri });
		for (const s of page.spaces) await (env.SPACES.get(env.SPACES.idFromName(spaceObjectName(did, s.uri))) as unknown as SpaceStub).rpcDestroy();
		if (!page.hasMore || !page.spaces.length) break;
		afterUri = page.spaces[page.spaces.length - 1]!.uri;
	}
	await index.rpcDestroy();
}
