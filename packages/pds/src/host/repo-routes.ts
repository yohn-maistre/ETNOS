/**
 * Repository and sync routes for one resolved account, reusing the attributed
 * Cirrus handlers. The edge decides which account a request is for and who
 * is calling; these handlers then see an environment that names only that
 * account (public values only, never a key), and a stub whose every call
 * names the expected DID so the account object can refuse a wrong one.
 */
import { Hono } from "hono";
import * as repo from "../upstream/xrpc/repo";
import * as sync from "../upstream/xrpc/sync";
import type { AccountDurableObject } from "../upstream/account-do";
import type { AuthedAppEnv, PDSEnv } from "../upstream/types";
import type { HostedAccountDurableObject } from "./account-do.ts";

export interface ScopedEnv extends PDSEnv {
	__stub: DurableObjectStub<AccountDurableObject>;
	__auth?: { did: string; scope: string };
}

export function scopedStub(stub: DurableObjectStub<HostedAccountDurableObject>, did: string): DurableObjectStub<AccountDurableObject> {
	const scoped = {
		repo: () => stub.repoFor(did),
		account: () => stub.accountFor(did),
		getFirehoseStatus: () => stub.getFirehoseStatus(),
		fetch: (input: Request | string, init?: RequestInit) => {
			const request = new Request(input, init);
			const headers = new Headers(request.headers);
			headers.set("x-etnos-expected-did", did);
			return stub.fetch(new Request(request, { headers }));
		},
	};
	return scoped as unknown as DurableObjectStub<AccountDurableObject>;
}

const app = new Hono<AuthedAppEnv>();

app.use("*", async (c, next) => {
	const auth = (c.env as ScopedEnv).__auth;
	if (auth) c.set("auth", auth);
	await next();
});

const s = (c: { env: PDSEnv }) => (c.env as ScopedEnv).__stub;

app.get("/xrpc/com.atproto.repo.describeRepo", (c) => repo.describeRepo(c as never, s(c)));
app.get("/xrpc/com.atproto.repo.getRecord", (c) => repo.getRecord(c as never, s(c)));
app.get("/xrpc/com.atproto.repo.listRecords", (c) => repo.listRecords(c as never, s(c)));
app.post("/xrpc/com.atproto.repo.createRecord", (c) => repo.createRecord(c as never, s(c)));
app.post("/xrpc/com.atproto.repo.putRecord", (c) => repo.putRecord(c as never, s(c)));
app.post("/xrpc/com.atproto.repo.deleteRecord", (c) => repo.deleteRecord(c as never, s(c)));
app.post("/xrpc/com.atproto.repo.applyWrites", (c) => repo.applyWrites(c as never, s(c)));
app.post("/xrpc/com.atproto.repo.uploadBlob", (c) => repo.uploadBlob(c as never, s(c)));
app.get("/xrpc/com.atproto.sync.getRepo", (c) => sync.getRepo(c as never, s(c)));
app.get("/xrpc/com.atproto.sync.getRepoStatus", (c) => sync.getRepoStatus(c as never, s(c)));
app.get("/xrpc/com.atproto.sync.getLatestCommit", (c) => sync.getLatestCommit(c as never, s(c)));
app.get("/xrpc/com.atproto.sync.getRecord", (c) => sync.getRecord(c as never, s(c)));
app.get("/xrpc/com.atproto.sync.getBlocks", (c) => sync.getBlocks(c as never, s(c)));
app.get("/xrpc/com.atproto.sync.getBlob", (c) => sync.getBlob(c as never, s(c)));
app.get("/xrpc/com.atproto.sync.listBlobs", (c) => sync.listBlobs(c as never, s(c)));

export const READ_ROUTES = new Set([
	"/xrpc/com.atproto.repo.describeRepo",
	"/xrpc/com.atproto.repo.getRecord",
	"/xrpc/com.atproto.repo.listRecords",
]);
export const SYNC_ROUTES = new Set([
	"/xrpc/com.atproto.sync.getRepo",
	"/xrpc/com.atproto.sync.getRepoStatus",
	"/xrpc/com.atproto.sync.getLatestCommit",
	"/xrpc/com.atproto.sync.getRecord",
	"/xrpc/com.atproto.sync.getBlocks",
	"/xrpc/com.atproto.sync.getBlob",
	"/xrpc/com.atproto.sync.listBlobs",
]);
export const WRITE_ROUTES = new Set([
	"/xrpc/com.atproto.repo.createRecord",
	"/xrpc/com.atproto.repo.putRecord",
	"/xrpc/com.atproto.repo.deleteRecord",
	"/xrpc/com.atproto.repo.applyWrites",
	"/xrpc/com.atproto.repo.uploadBlob",
]);

export function runScoped(request: Request, env: ScopedEnv, ctx: ExecutionContext): Promise<Response> {
	return Promise.resolve(app.fetch(request, env, ctx));
}
