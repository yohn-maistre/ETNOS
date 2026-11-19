/**
 * AT Protocol spaces (alpha) on the multi-account host, following the text of proposal 0016
 * as of 19 November 2026 (https://github.com/bluesky-social/proposals/blob/main/0016-permissioned-data/README.md).
 * Strata code (AGPL-3.0-only). The protocol pieces come from the official MIT package
 * @atproto/space 0.0.0-spaces-alpha-20261117141222: credentials and delegation tokens, the
 * RFC 9421 credential signature, the HPKE secret for MACs, LtHash commits and STAR archives.
 * The request handling here was written for Workers and Durable Objects, after the official
 * alpha PDS (@atproto/pds, MIT) as the reference for behaviour; no code was copied from it.
 *
 * One Durable Object per hosted account holds both of its roles:
 * - as repo host, the account's space repos (records, LtHash commit, operation log) and the
 *   credentials that space authorities have revoked (notifyCredentialsRevoked, kept 61 minutes);
 * - as space host, the spaces it is the authority of (policy, member list, writer set) and the
 *   credentials it issued, with the user each one was issued for.
 *
 * Removal takes effect at once. A credential lasts 10 minutes, but on every read this host checks
 * a credential from a local authority against the space's current policy, and on removal the
 * authority sends notifyCredentialsRevoked for that user's credentials to every writer's repo
 * host, here or elsewhere.
 *
 * Spaces give access control, not confidentiality: this host's operator can read space data.
 */
import { DurableObject } from "cloudflare:workers";
import {
	COMMIT_MAC_PROFILE,
	MAX_RECORD_SIZE,
	RECORD_MAC_PROFILE,
	RepoCommit,
	SPACE_CREDENTIAL_MAX_AGE_SEC,
	createCommitMacHeaders,
	createDelegationToken,
	createRecordMacHeaders,
	createSpaceCredential,
	isP256DidKey,
	parseMacRequest,
	parseSpaceToken,
	serializeRecord,
	spaceHostAud,
	verifyCredentialSig,
	verifySpaceToken,
	writeRepoStar,
} from "@atproto/space";
import { decode as cborDecode } from "@atproto/lex-cbor";
import { jsonToLex, lexToJson } from "@atproto/lex-json";
import { verifySignature } from "@atproto/crypto";
import { CID } from "multiformats/cid";
import { b64url, fromB64url, randomToken } from "./crypto.ts";
import type { AccountRow } from "./directory.ts";
import type { HostEnv } from "./env.ts";
import { provider } from "./oauth.ts";
import { Host } from "./service.ts";
import { ExpiredTokenError, verifySession } from "./session.ts";

export const spacesEnabled = (env: HostEnv) => env.SPACES_ENABLED === "true" && !!env.SPACES;

/** Credentials this host issues last 10 minutes (the proposal's default). */
const CREDENTIAL_SECONDS = 600;
/** A revocation is kept longer than any credential can live (60 minutes plus clock skew). */
const REVOCATION_MS = (SPACE_CREDENTIAL_MAX_AGE_SEC + 60) * 1000;

// ---------------------------------------------------------------------------------------------
// Syntax

const NSID = /^[a-zA-Z](?:[a-zA-Z0-9-]{0,62})(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}))+\.[a-zA-Z][a-zA-Z0-9]{0,62}$/;
const KEY = /^[A-Za-z0-9._:~-]{1,512}$/;
const DID = /^did:[a-z]+:[a-zA-Z0-9._:%-]{1,2000}$/;
const isKey = (k: unknown): k is string => typeof k === "string" && KEY.test(k) && k !== "." && k !== "..";
const isNsid = (n: unknown): n is string => typeof n === "string" && n.length <= 317 && NSID.test(n);
const isDid = (d: unknown): d is string => typeof d === "string" && DID.test(d);

export interface SpaceRef {
	uri: string;
	authority: string;
	type: string;
	skey: string;
}

export function parseSpace(value: unknown): SpaceRef | null {
	if (typeof value !== "string") return null;
	const m = /^at:\/\/([^/]+)\/space\/([^/]+)\/([^/]+)$/.exec(value);
	if (!m || !isDid(m[1]) || !isNsid(m[2]) || !isKey(m[3])) return null;
	return { uri: value, authority: m[1]!, type: m[2]!, skey: m[3]! };
}

const S32 = "234567abcdefghijklmnopqrstuvwxyz";
const CLOCK = BigInt(Math.floor(Math.random() * 1024));
function tidMicros(tid: string): bigint {
	let v = 0n;
	for (const c of tid) v = (v << 5n) | BigInt(S32.indexOf(c));
	return v >> 10n;
}
/** A TID later than `prev` and not earlier than now. */
export function nextTid(prev?: string | null): string {
	let micros = BigInt(Date.now()) * 1000n;
	if (prev && /^[2-7a-z]{13}$/.test(prev)) {
		const p = tidMicros(prev);
		if (micros <= p) micros = p + 1n;
	}
	let v = (micros << 10n) | CLOCK, out = "";
	for (let i = 0; i < 13; i++) {
		out = S32[Number(v & 31n)] + out;
		v >>= 5n;
	}
	return out;
}
const tidTimeMs = (tid: string) => Number(tidMicros(tid) / 1000n);

// ---------------------------------------------------------------------------------------------
// Policies (the three baseline policies; this host implements personalspace and memberspace)

export type Policy =
	| { $type: "com.atproto.personalspace.policy" }
	| { $type: "com.atproto.memberspace.policy"; publicRead: boolean; publicWrite: boolean };

/** An XRPC error. The code travels in the message, because Durable Object RPC keeps only messages. */
class Refusal extends Error {
	constructor(readonly status: number, readonly code: string, readonly text: string) {
		super(`REFUSAL ${status} ${code} ${text}`);
	}
	static from(error: unknown): Refusal | null {
		if (error instanceof Refusal) return error;
		const m = /REFUSAL (\d{3}) (\w+) (.*)$/s.exec(error instanceof Error ? error.message : "");
		return m ? new Refusal(Number(m[1]), m[2]!, m[3]!) : null;
	}
}

function normalizePolicy(value: unknown): Policy {
	const p = (value ?? {}) as Record<string, unknown>;
	if (p.$type === "com.atproto.personalspace.policy") return { $type: "com.atproto.personalspace.policy" };
	if (p.$type === "com.atproto.memberspace.policy") {
		if (p.allowedApps !== undefined) throw new Refusal(400, "UnsupportedPolicy", "allowedApps needs client attestation, which this host does not verify yet");
		if (p.publishPolicy === true || p.publishMembers === true) throw new Refusal(400, "UnsupportedPolicy", "Publishing the policy or member list is not supported on this host yet");
		return { $type: "com.atproto.memberspace.policy", publicRead: p.publicRead === true, publicWrite: p.publicWrite === true };
	}
	throw new Refusal(400, "UnsupportedPolicy", `Unsupported policy: ${String(p.$type)}`);
}

// ---------------------------------------------------------------------------------------------
// The per-account object

type Row = Record<string, SqlStorageValue>;
interface MemberRow {
	did: string;
	read: boolean;
	write: boolean;
}
export interface WriteOp {
	/** create: must not exist; update and delete: must exist; put: either. */
	action: "create" | "update" | "put" | "delete";
	collection: string;
	rkey: string;
	cid?: string;
	bytes?: Uint8Array;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sp_space (uri TEXT PRIMARY KEY, type TEXT NOT NULL, skey TEXT NOT NULL, policy TEXT, created INTEGER NOT NULL, deleted INTEGER, space_rev TEXT);
CREATE TABLE IF NOT EXISTS sp_member (space TEXT NOT NULL, did TEXT NOT NULL, read INTEGER NOT NULL, write INTEGER NOT NULL, PRIMARY KEY (space, did));
CREATE TABLE IF NOT EXISTS sp_writer (space TEXT NOT NULL, did TEXT NOT NULL, repo_rev TEXT NOT NULL, data BLOB NOT NULL, space_rev TEXT NOT NULL, removed INTEGER, PRIMARY KEY (space, did));
CREATE TABLE IF NOT EXISTS sp_issued (jti TEXT PRIMARY KEY, space TEXT NOT NULL, user TEXT, expires INTEGER NOT NULL, revoked INTEGER);
CREATE INDEX IF NOT EXISTS sp_issued_user ON sp_issued (space, user);
CREATE TABLE IF NOT EXISTS sp_delegation (key TEXT PRIMARY KEY, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sp_repo (space TEXT PRIMARY KEY, set_hash BLOB, rev TEXT);
CREATE TABLE IF NOT EXISTS sp_record (space TEXT NOT NULL, path TEXT NOT NULL, collection TEXT NOT NULL, rkey TEXT NOT NULL, cid TEXT NOT NULL, value BLOB NOT NULL, repo_rev TEXT NOT NULL, PRIMARY KEY (space, path));
CREATE TABLE IF NOT EXISTS sp_oplog (space TEXT NOT NULL, rev TEXT NOT NULL, idx INTEGER NOT NULL, collection TEXT NOT NULL, rkey TEXT NOT NULL, cid TEXT, prev TEXT, PRIMARY KEY (space, rev, idx));
CREATE TABLE IF NOT EXISTS sp_revoked (space TEXT NOT NULL, jti TEXT NOT NULL, expires INTEGER NOT NULL, PRIMARY KEY (space, jti));
`;

/** One account's space state. Every method is synchronous SQLite inside one transaction. */
export class HostedSpaceDurableObject extends DurableObject<HostEnv> {
	private ready = false;

	private sql<T extends Row = Row>(query: string, ...bindings: unknown[]): T[] {
		if (!this.ready) {
			for (const statement of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) this.ctx.storage.sql.exec(statement);
			this.ready = true;
		}
		return this.ctx.storage.sql.exec<T>(query, ...(bindings as SqlStorageValue[])).toArray();
	}

	private tx<T>(fn: () => T): T {
		this.sql("SELECT 1");
		return this.ctx.storage.transactionSync(fn);
	}

	// --- space host role -----------------------------------------------------------------------

	private space(uri: string): { policy: Policy | null; deleted: boolean; spaceRev: string | null } | null {
		const row = this.sql<{ policy: string | null; deleted: number | null; space_rev: string | null }>("SELECT policy, deleted, space_rev FROM sp_space WHERE uri = ?", uri)[0];
		return row ? { policy: row.policy ? (JSON.parse(row.policy) as Policy) : null, deleted: !!row.deleted, spaceRev: row.space_rev } : null;
	}

	private member(uri: string, did: string): MemberRow | null {
		const row = this.sql<{ read: number; write: number }>("SELECT read, write FROM sp_member WHERE space = ? AND did = ?", uri, did)[0];
		return row ? { did, read: !!row.read, write: !!row.write } : null;
	}

	/** The policy's decision for one account, as the proposal's baseline policies define it. */
	private allowed(ref: SpaceRef, user: string | null, access: "read" | "write"): boolean {
		const s = this.space(ref.uri);
		if (!s || s.deleted || !s.policy) return false;
		if (user && user === ref.authority) return true;
		if (s.policy.$type === "com.atproto.personalspace.policy") return false;
		if (access === "read" && s.policy.publicRead) return true;
		if (access === "write" && s.policy.publicWrite) {
			const m = user ? this.member(ref.uri, user) : null;
			return !!user && (!m || m.write);
		}
		return !!user && !!this.member(ref.uri, user)?.[access];
	}

	async rpcCreateSpace(ref: SpaceRef, policy: Policy): Promise<void> {
		this.tx(() => {
			const existing = this.space(ref.uri);
			if (existing && !existing.deleted) throw new Refusal(400, "SpaceAlreadyExists", "Space already exists");
			this.sql(
				"INSERT INTO sp_space (uri, type, skey, policy, created, deleted, space_rev) VALUES (?,?,?,?,?,NULL,NULL) ON CONFLICT(uri) DO UPDATE SET policy = excluded.policy, deleted = NULL",
				ref.uri,
				ref.type,
				ref.skey,
				JSON.stringify(policy),
				Date.now(),
			);
			this.sql("INSERT INTO sp_repo (space, set_hash, rev) VALUES (?, NULL, NULL) ON CONFLICT(space) DO NOTHING", ref.uri);
		});
	}

	async rpcGetSpace(uri: string): Promise<{ policy: Policy | null; deleted: boolean; spaceRev: string | null } | null> {
		return this.space(uri);
	}

	/** Replace the policy. A different policy type discards the member list. Returns credentials to revoke. */
	async rpcUpdateSpace(ref: SpaceRef, policy: Policy): Promise<string[]> {
		return this.tx(() => {
			const s = this.space(ref.uri);
			if (!s || s.deleted) throw new Refusal(400, "SpaceNotFound", "Space not found");
			if (s.policy?.$type !== policy.$type) this.sql("DELETE FROM sp_member WHERE space = ?", ref.uri);
			this.sql("UPDATE sp_space SET policy = ? WHERE uri = ?", JSON.stringify(policy), ref.uri);
			return this.revokeUnauthorized(ref);
		});
	}

	/** Tombstone the space, drop its policy, members and writers and the authority's own repo in it. */
	async rpcDeleteSpace(ref: SpaceRef): Promise<{ revoke: string[]; writers: string[] }> {
		return this.tx(() => {
			const s = this.space(ref.uri);
			if (!s || s.deleted) throw new Refusal(400, "SpaceNotFound", "Space not found");
			const writers = this.sql<{ did: string }>("SELECT did FROM sp_writer WHERE space = ?", ref.uri).map((r) => r.did);
			const revoke = this.sql<{ jti: string }>("SELECT jti FROM sp_issued WHERE space = ? AND expires > ? AND revoked IS NULL", ref.uri, Date.now()).map((r) => r.jti);
			this.sql("UPDATE sp_issued SET revoked = ? WHERE space = ?", Date.now(), ref.uri);
			this.sql("UPDATE sp_space SET deleted = ?, policy = NULL WHERE uri = ?", Date.now(), ref.uri);
			for (const table of ["sp_member", "sp_writer", "sp_record", "sp_oplog", "sp_repo"]) this.sql(`DELETE FROM ${table} WHERE space = ?`, ref.uri);
			return { revoke, writers };
		});
	}

	/** Mark issued credentials whose user the current policy no longer allows to read, and return them. */
	private revokeUnauthorized(ref: SpaceRef, only?: string[]): string[] {
		const rows = this.sql<{ jti: string; user: string | null }>("SELECT jti, user FROM sp_issued WHERE space = ? AND expires > ? AND revoked IS NULL", ref.uri, Date.now());
		const out: string[] = [];
		for (const r of rows) {
			if (only && !(r.user && only.includes(r.user))) continue;
			if (this.allowed(ref, r.user, "read")) continue;
			this.sql("UPDATE sp_issued SET revoked = ? WHERE jti = ?", Date.now(), r.jti);
			out.push(r.jti);
		}
		return out;
	}

	private requireMemberspace(uri: string): void {
		const s = this.space(uri);
		if (!s || s.deleted) throw new Refusal(400, "SpaceNotFound", "Space not found");
		if (s.policy?.$type !== "com.atproto.memberspace.policy") throw new Refusal(400, "PolicyMismatch", "Space is not governed by the memberspace policy");
	}

	async rpcPutMembers(ref: SpaceRef, members: MemberRow[]): Promise<{ revoke: string[]; removedWriters: string[] }> {
		return this.tx(() => {
			this.requireMemberspace(ref.uri);
			for (const m of members)
				this.sql("INSERT INTO sp_member (space, did, read, write) VALUES (?,?,?,?) ON CONFLICT(space, did) DO UPDATE SET read = excluded.read, write = excluded.write", ref.uri, m.did, m.read ? 1 : 0, m.write ? 1 : 0);
			const removedWriters = members.filter((m) => !m.write && m.did !== ref.authority).map((m) => m.did).filter((d) => this.removeWriter(ref, d));
			return { revoke: this.revokeUnauthorized(ref, members.map((m) => m.did)), removedWriters };
		});
	}

	async rpcRemoveMembers(ref: SpaceRef, dids: string[]): Promise<{ revoke: string[]; removedWriters: string[] }> {
		return this.tx(() => {
			this.requireMemberspace(ref.uri);
			for (const did of dids) this.sql("DELETE FROM sp_member WHERE space = ? AND did = ?", ref.uri, did);
			const removedWriters = dids.filter((d) => d !== ref.authority && this.removeWriter(ref, d));
			return { revoke: this.revokeUnauthorized(ref, dids), removedWriters };
		});
	}

	async rpcListMembers(uri: string, limit: number, cursor?: string): Promise<{ members: MemberRow[]; cursor?: string }> {
		this.requireMemberspace(uri);
		const rows = this.sql<{ did: string; read: number; write: number }>("SELECT did, read, write FROM sp_member WHERE space = ? AND did > ? ORDER BY did LIMIT ?", uri, cursor ?? "", limit);
		return { members: rows.map((r) => ({ did: r.did, read: !!r.read, write: !!r.write })), ...(rows.length === limit ? { cursor: rows.at(-1)!.did } : {}) };
	}

	/** Single use for delegation tokens. */
	async rpcUseDelegation(iss: string, jti: string, expires: number): Promise<boolean> {
		return this.tx(() => {
			this.sql("DELETE FROM sp_delegation WHERE expires < ?", Date.now() - 60_000);
			const key = `${iss} ${jti}`;
			if (this.sql("SELECT 1 FROM sp_delegation WHERE key = ?", key).length) return false;
			this.sql("INSERT INTO sp_delegation (key, expires) VALUES (?, ?)", key, expires);
			return true;
		});
	}

	/** The read decision for authorizeSpaceSync. */
	async rpcMayRead(ref: SpaceRef, user: string | null): Promise<"ok" | "deleted" | "missing" | "refused"> {
		const s = this.space(ref.uri);
		if (!s) return "missing";
		if (s.deleted) return "deleted";
		return this.allowed(ref, user, "read") ? "ok" : "refused";
	}

	/** Record an issued credential, deciding again in the same transaction so a removal in between wins. */
	async rpcRecordIssued(ref: SpaceRef, jti: string, user: string | null, expires: number): Promise<boolean> {
		return this.tx(() => {
			if (!this.allowed(ref, user, "read")) return false;
			this.sql("DELETE FROM sp_issued WHERE expires < ?", Date.now() - REVOCATION_MS);
			this.sql("INSERT INTO sp_issued (jti, space, user, expires, revoked) VALUES (?,?,?,?,NULL)", jti, ref.uri, user, expires);
			return true;
		});
	}

	/** At read time: is this credential still good under the space's current policy? */
	async rpcStillAuthorized(ref: SpaceRef, jti: string): Promise<boolean> {
		const row = this.sql<{ space: string; user: string | null; revoked: number | null }>("SELECT space, user, revoked FROM sp_issued WHERE jti = ?", jti)[0];
		if (!row || row.space !== ref.uri || row.revoked) return false;
		return this.allowed(ref, row.user, "read");
	}

	/** notifyRepoUpdate from a writer's repo host. Returns false when the policy does not let the repo write. */
	async rpcRecordWriter(ref: SpaceRef, did: string, repoRev: string, data: Uint8Array): Promise<"recorded" | "stale" | "forbidden" | "missing"> {
		return this.tx(() => {
			const s = this.space(ref.uri);
			if (!s || s.deleted) return "missing";
			if (!this.allowed(ref, did, "write")) return "forbidden";
			const current = this.sql<{ repo_rev: string; removed: number | null }>("SELECT repo_rev, removed FROM sp_writer WHERE space = ? AND did = ?", ref.uri, did)[0];
			if (current && current.repo_rev >= repoRev) return "stale";
			const spaceRev = nextTid(s.spaceRev);
			this.sql("UPDATE sp_space SET space_rev = ? WHERE uri = ?", spaceRev, ref.uri);
			this.sql(
				"INSERT INTO sp_writer (space, did, repo_rev, data, space_rev, removed) VALUES (?,?,?,?,?,NULL) ON CONFLICT(space, did) DO UPDATE SET repo_rev = excluded.repo_rev, data = excluded.data, space_rev = excluded.space_rev, removed = NULL",
				ref.uri,
				did,
				repoRev,
				data,
				spaceRev,
			);
			return "recorded";
		});
	}

	private removeWriter(ref: SpaceRef, did: string): boolean {
		const row = this.sql<{ removed: number | null }>("SELECT removed FROM sp_writer WHERE space = ? AND did = ?", ref.uri, did)[0];
		if (!row || row.removed) return false;
		const spaceRev = nextTid(this.space(ref.uri)?.spaceRev);
		this.sql("UPDATE sp_space SET space_rev = ? WHERE uri = ?", spaceRev, ref.uri);
		this.sql("UPDATE sp_writer SET removed = ?, space_rev = ? WHERE space = ? AND did = ?", Date.now(), spaceRev, ref.uri, did);
		return true;
	}

	async rpcRemoveWriter(ref: SpaceRef, did: string): Promise<void> {
		this.tx(() => {
			const s = this.space(ref.uri);
			if (!s || s.deleted) throw new Refusal(400, "SpaceNotFound", "Space not found");
			this.removeWriter(ref, did);
		});
	}

	async rpcListWriters(uri: string, limit: number, cursor?: string): Promise<{ repos: Record<string, unknown>[]; cursor?: string }> {
		const rows = this.sql<{ did: string; repo_rev: string; data: ArrayBuffer; space_rev: string; removed: number | null }>(
			"SELECT did, repo_rev, data, space_rev, removed FROM sp_writer WHERE space = ? AND space_rev > ? ORDER BY space_rev LIMIT ?",
			uri,
			cursor ?? "",
			limit,
		);
		return {
			repos: rows.map((r) =>
				r.removed
					? { $type: "com.atproto.space.defs#repoRemoved", repo: r.did, spaceRev: r.space_rev }
					: { $type: "com.atproto.space.defs#repoWrite", repo: r.did, repoRev: r.repo_rev, data: { $bytes: b64(new Uint8Array(r.data)) }, spaceRev: r.space_rev },
			),
			...(rows.length === limit ? { cursor: rows.at(-1)!.space_rev } : {}),
		};
	}

	async rpcWriters(uri: string): Promise<string[]> {
		return this.sql<{ did: string }>("SELECT did FROM sp_writer WHERE space = ?", uri).map((r) => r.did);
	}

	async rpcIssuedTo(uri: string, users: string[]): Promise<string[]> {
		return this.sql<{ jti: string; user: string | null }>("SELECT jti, user FROM sp_issued WHERE space = ? AND expires > ?", uri, Date.now())
			.filter((r) => r.user && users.includes(r.user))
			.map((r) => r.jti);
	}

	// --- repo host role ------------------------------------------------------------------------

	/** Apply writes as one commit sharing one rev. The caller has checked the account and the records. */
	async rpcApplyWrites(ref: SpaceRef, self: string, writes: WriteOp[]): Promise<{ rev: string; data: Uint8Array; results: { cid?: string }[] }> {
		return this.tx(() => {
			if (ref.authority === self) {
				const s = this.space(ref.uri);
				if (!s || s.deleted) throw new Refusal(400, "SpaceNotFound", "Space not found");
			}
			this.sql("INSERT INTO sp_repo (space, set_hash, rev) VALUES (?, NULL, NULL) ON CONFLICT(space) DO NOTHING", ref.uri);
			const state = this.sql<{ set_hash: ArrayBuffer | null; rev: string | null }>("SELECT set_hash, rev FROM sp_repo WHERE space = ?", ref.uri)[0]!;
			const commit = RepoCommit.fromState(state.set_hash ? new Uint8Array(state.set_hash) : null);
			const rev = nextTid(state.rev);
			const results: { cid?: string }[] = [];
			writes.forEach((w, idx) => {
				const path = `${w.collection}/${w.rkey}`;
				const prev = this.sql<{ cid: string }>("SELECT cid FROM sp_record WHERE space = ? AND path = ?", ref.uri, path)[0]?.cid ?? null;
				if (w.action === "create" && prev) throw new Refusal(400, "RecordAlreadyExists", `Record already exists: ${path}`);
				if ((w.action === "update" || w.action === "delete") && !prev) throw new Refusal(400, "RecordNotFound", `Record not found: ${path}`);
				if (prev) commit.setHash.remove(`${path}/${prev}`);
				if (w.action === "delete") {
					this.sql("DELETE FROM sp_record WHERE space = ? AND path = ?", ref.uri, path);
					results.push({});
				} else {
					this.sql(
						"INSERT INTO sp_record (space, path, collection, rkey, cid, value, repo_rev) VALUES (?,?,?,?,?,?,?) ON CONFLICT(space, path) DO UPDATE SET cid = excluded.cid, value = excluded.value, repo_rev = excluded.repo_rev",
						ref.uri,
						path,
						w.collection,
						w.rkey,
						w.cid!,
						w.bytes!,
						rev,
					);
					commit.setHash.add(`${path}/${w.cid}`);
					results.push({ cid: w.cid });
				}
				this.sql("INSERT INTO sp_oplog (space, rev, idx, collection, rkey, cid, prev) VALUES (?,?,?,?,?,?,?)", ref.uri, rev, idx, w.collection, w.rkey, w.action === "delete" ? null : w.cid!, prev);
			});
			const setHash = commit.setHash.state();
			this.sql("UPDATE sp_repo SET set_hash = ?, rev = ? WHERE space = ?", setHash, rev, ref.uri);
			return { rev, data: commit.setHash.digest(), results };
		});
	}

	/** Delete every record in the repo and clear the oplog, at a new rev. */
	async rpcClearRecords(ref: SpaceRef): Promise<{ rev: string; data: Uint8Array } | null> {
		return this.tx(() => {
			const state = this.sql<{ rev: string | null }>("SELECT rev FROM sp_repo WHERE space = ?", ref.uri)[0];
			if (!state || !this.sql("SELECT 1 FROM sp_record WHERE space = ? LIMIT 1", ref.uri).length) return null;
			this.sql("DELETE FROM sp_record WHERE space = ?", ref.uri);
			this.sql("DELETE FROM sp_oplog WHERE space = ?", ref.uri);
			const commit = new RepoCommit(), rev = nextTid(state.rev);
			this.sql("UPDATE sp_repo SET set_hash = ?, rev = ? WHERE space = ?", commit.setHash.state(), rev, ref.uri);
			return { rev, data: commit.setHash.digest() };
		});
	}

	async rpcRepoState(uri: string): Promise<{ rev: string; setHash: Uint8Array } | null> {
		const row = this.sql<{ set_hash: ArrayBuffer | null; rev: string | null }>("SELECT set_hash, rev FROM sp_repo WHERE space = ?", uri)[0];
		return row?.rev && row.set_hash ? { rev: row.rev, setHash: new Uint8Array(row.set_hash) } : null;
	}

	async rpcGetRecord(uri: string, path: string): Promise<{ cid: string; value: Uint8Array } | null> {
		const row = this.sql<{ cid: string; value: ArrayBuffer }>("SELECT cid, value FROM sp_record WHERE space = ? AND path = ?", uri, path)[0];
		return row ? { cid: row.cid, value: new Uint8Array(row.value) } : null;
	}

	async rpcListRecords(uri: string, collection: string | undefined, limit: number, cursor: string | undefined): Promise<{ path: string; collection: string; rkey: string; cid: string; value: Uint8Array }[]> {
		const rows = collection
			? this.sql<{ path: string; collection: string; rkey: string; cid: string; value: ArrayBuffer }>("SELECT path, collection, rkey, cid, value FROM sp_record WHERE space = ? AND collection = ? AND path > ? ORDER BY path LIMIT ?", uri, collection, cursor ?? "", limit)
			: this.sql<{ path: string; collection: string; rkey: string; cid: string; value: ArrayBuffer }>("SELECT path, collection, rkey, cid, value FROM sp_record WHERE space = ? AND path > ? ORDER BY path LIMIT ?", uri, cursor ?? "", limit);
		return rows.map((r) => ({ ...r, value: new Uint8Array(r.value) }));
	}

	async rpcListOps(uri: string, since: string | undefined, limit: number, cursor: string | undefined): Promise<{ ops: Row[]; values: Record<string, Uint8Array> }> {
		const [afterRev, afterIdx] = cursor ? [cursor.split(":")[0]!, Number(cursor.split(":")[1])] : [since ?? "", Number.MAX_SAFE_INTEGER];
		const ops = this.sql("SELECT rev, idx, collection, rkey, cid, prev FROM sp_oplog WHERE space = ? AND (rev > ? OR (rev = ? AND idx > ?)) ORDER BY rev, idx LIMIT ?", uri, afterRev, afterRev, cursor ? afterIdx : Number.MAX_SAFE_INTEGER, limit);
		const values: Record<string, Uint8Array> = {};
		for (const op of ops) {
			if (!op.cid) continue;
			const current = this.sql<{ cid: string; value: ArrayBuffer }>("SELECT cid, value FROM sp_record WHERE space = ? AND path = ?", uri, `${op.collection}/${op.rkey}`)[0];
			if (current && current.cid === op.cid) values[`${op.collection}/${op.rkey}`] = new Uint8Array(current.value);
		}
		return { ops, values };
	}

	async rpcHasOps(uri: string, since: string): Promise<boolean> {
		return this.sql("SELECT 1 FROM sp_oplog WHERE space = ? AND rev <= ? LIMIT 1", uri, since).length > 0;
	}

	async rpcRevoke(uri: string, jtis: string[]): Promise<void> {
		this.tx(() => {
			this.sql("DELETE FROM sp_revoked WHERE expires < ?", Date.now());
			for (const jti of jtis) this.sql("INSERT INTO sp_revoked (space, jti, expires) VALUES (?,?,?) ON CONFLICT(space, jti) DO UPDATE SET expires = excluded.expires", uri, jti, Date.now() + REVOCATION_MS);
		});
	}

	async rpcIsRevoked(uri: string, jti: string): Promise<boolean> {
		return this.sql("SELECT 1 FROM sp_revoked WHERE space = ? AND jti = ? AND expires > ?", uri, jti, Date.now()).length > 0;
	}

	/** Spaces the account is the authority of or holds a repo in. */
	async rpcListSpaces(type: string | undefined, authority: string | undefined, limit: number, cursor: string | undefined): Promise<Record<string, unknown>[]> {
		const rows = this.sql<{ uri: string; rev: string | null; set_hash: ArrayBuffer | null; space_rev: string | null; deleted: number | null }>(
			`SELECT u.uri AS uri, r.rev AS rev, r.set_hash AS set_hash, s.space_rev AS space_rev, s.deleted AS deleted FROM
			   (SELECT uri FROM sp_space UNION SELECT space AS uri FROM sp_repo) u
			   LEFT JOIN sp_repo r ON r.space = u.uri LEFT JOIN sp_space s ON s.uri = u.uri
			 WHERE u.uri > ? ORDER BY u.uri LIMIT ?`,
			cursor ?? "",
			limit * 4,
		);
		return rows
			.filter((r) => !r.deleted)
			.map((r) => ({ ref: parseSpace(r.uri), r }))
			.filter(({ ref }) => ref && (!type || ref.type === type) && (!authority || ref.authority === authority))
			.slice(0, limit)
			.map(({ r }) => ({
				space: r.uri,
				...(r.rev ? { repoRev: r.rev } : {}),
				...(r.set_hash ? { data: { $bytes: b64(RepoCommit.fromState(new Uint8Array(r.set_hash)).setHash.digest()) } } : {}),
				...(r.space_rev ? { spaceRev: r.space_rev } : {}),
			}));
	}

	async rpcPurge(): Promise<void> {
		await this.ctx.storage.deleteAll();
		this.ready = false;
	}
}

/** Kept so the deployed class (migration v2) still exists; the per-account object above holds all state. */
export class HostedSpaceIndexDurableObject extends DurableObject<HostEnv> {}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

// ---------------------------------------------------------------------------------------------
// The Worker side

const xerr = (status: number, error: string, message: string, headers: Record<string, string> = {}) =>
	Response.json({ error, message }, { status, headers: { "cache-control": "no-store", ...headers } });
const ok = (body: unknown, headers: Record<string, string> = {}) => Response.json(body, { headers: { "cache-control": "no-store", ...headers } });

const NOT_BUILT = new Set([
	"com.atproto.space.getBlob",
	"com.atproto.space.listBlobs",
	"com.atproto.space.importRepo",
	"com.atproto.space.exportSpaceMeta",
	"com.atproto.space.importSpaceMeta",
]);

type Stub = DurableObjectStub<HostedSpaceDurableObject>;
const objectFor = (env: HostEnv, did: string): Stub => env.SPACES!.get(env.SPACES!.idFromName(`acct ${did}`)) as Stub;

interface DidDoc {
	verificationMethod?: { id: string; publicKeyMultibase?: string }[];
	service?: { id: string; serviceEndpoint?: unknown }[];
}
const docCache = new Map<string, { at: number; doc: DidDoc | null }>();

async function resolveDid(env: HostEnv, did: string, fresh = false): Promise<DidDoc | null> {
	const cached = docCache.get(did);
	if (!fresh && cached && Date.now() - cached.at < 300_000) return cached.doc;
	let target: string;
	if (did.startsWith("did:plc:")) target = `${env.PLC_URL.replace(/\/+$/, "")}/${did}`;
	else if (did.startsWith("did:web:")) target = `https://${decodeURIComponent(did.slice(8))}/.well-known/did.json`;
	else return null;
	let doc: DidDoc | null = null;
	try {
		const r = await fetch(target, { headers: { accept: "application/json" } });
		doc = r.ok ? ((await r.json()) as DidDoc) : null;
	} catch {
		doc = null;
	}
	docCache.set(did, { at: Date.now(), doc });
	return doc;
}

const methodKey = (doc: DidDoc | null, id: string) => {
	const m = doc?.verificationMethod?.find((v) => v.id === `#${id}` || v.id.endsWith(`#${id}`));
	return m?.publicKeyMultibase ? `did:key:${m.publicKeyMultibase}` : null;
};
const pdsEndpoint = (doc: DidDoc | null) => {
	const s = doc?.service?.find((v) => v.id === "#atproto_pds" || v.id.endsWith("#atproto_pds"));
	return typeof s?.serviceEndpoint === "string" ? s.serviceEndpoint.replace(/\/+$/, "") : null;
};

/** What every handler needs: the host, who is local, keys, signing and outbound calls. */
class Spaces {
	constructor(
		readonly host: Host,
		readonly ctx: ExecutionContext,
		readonly internal: (request: Request) => Promise<Response>,
	) {}

	get env() {
		return this.host.env;
	}

	async local(did: string, allowInactive = false): Promise<AccountRow | null> {
		const row = await this.host.dir.byDid(did);
		if (!row?.did) return null;
		if (row.status === "active" || (allowInactive && (row.status === "deactivated" || row.status === "takendown"))) return row;
		return null;
	}

	async signingKey(did: string, fresh = false): Promise<string> {
		const row = await this.local(did, true);
		if (row?.signing_key) return row.signing_key;
		const key = methodKey(await resolveDid(this.env, did, fresh), "atproto");
		if (!key) throw new Refusal(401, "BadJwtIss", `No #atproto key for ${did}`);
		return key;
	}

	signer(row: AccountRow) {
		const did = row.did!;
		return { jwtAlg: "ES256K", sign: (bytes: Uint8Array) => this.host.account(row).signSpaceJwt(did, bytes) };
	}

	async serviceJwt(row: AccountRow, aud: string, lxm: string): Promise<string> {
		const now = Math.floor(Date.now() / 1000);
		const enc = (v: unknown) => b64url(new TextEncoder().encode(JSON.stringify(v)));
		const input = `${enc({ typ: "JWT", alg: "ES256K" })}.${enc({ iss: row.did, aud, lxm, iat: now, exp: now + 60, jti: randomToken(16) })}`;
		const sig = await this.host.account(row).signSpaceJwt(row.did!, new TextEncoder().encode(input));
		return `${input}.${b64url(sig)}`;
	}

	/** Verify inbound service auth for one method; returns iss and aud. */
	async verifyServiceJwt(request: Request, lxm: string): Promise<{ iss: string; aud: string }> {
		const header = request.headers.get("authorization") ?? "";
		const token = header.startsWith("Bearer ") ? header.slice(7) : "";
		const parts = token.split(".");
		if (parts.length !== 3) throw new Refusal(401, "AuthenticationRequired", "Service auth required");
		let payload: Record<string, unknown>, head: Record<string, unknown>;
		try {
			head = JSON.parse(new TextDecoder().decode(fromB64url(parts[0]!)));
			payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[1]!)));
		} catch {
			throw new Refusal(401, "BadJwt", "Malformed service JWT");
		}
		const { iss, aud, exp } = payload;
		if (!isDid(iss) || typeof aud !== "string") throw new Refusal(401, "BadJwt", "Service JWT missing iss or aud");
		if (payload.lxm !== lxm) throw new Refusal(401, "BadJwtLexiconMethod", `Service JWT not bound to ${lxm}`);
		if (typeof exp !== "number" || exp < Math.floor(Date.now() / 1000) - 5 || exp > Math.floor(Date.now() / 1000) + 300)
			throw new Refusal(401, "JwtExpired", "Service JWT expired or too long-lived");
		const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`), sig = fromB64url(parts[2]!);
		const alg = typeof head.alg === "string" ? head.alg : undefined;
		const check = async (fresh: boolean) => verifySignature(await this.signingKey(iss, fresh), data, sig, { jwtAlg: alg });
		if (!(await check(false).catch(() => false)) && !(await check(true).catch(() => false))) throw new Refusal(401, "BadJwtSignature", "Invalid service JWT signature");
		return { iss, aud };
	}

	/** POST to an XRPC method on another account's PDS, here or elsewhere. */
	async call(target: string, method: string, body: unknown, from: AccountRow, aud: string): Promise<Response> {
		const headers = { "content-type": "application/json", authorization: `Bearer ${await this.serviceJwt(from, aud, method)}` };
		const local = await this.local(target, true);
		const base = local ? this.host.origin : pdsEndpoint(await resolveDid(this.env, target));
		if (!base) throw new Error(`No PDS for ${target}`);
		const request = new Request(`${base}/xrpc/${method}`, { method: "POST", headers, body: JSON.stringify(body) });
		if (new URL(request.url).origin === this.host.origin) return this.internal(request);
		return fetch(request);
	}

	/** Tell the space host about a new repo state (local authority: directly; remote: notifyRepoUpdate). */
	async notifyRepoUpdate(ref: SpaceRef, writer: AccountRow, rev: string, data: Uint8Array): Promise<void> {
		if (ref.authority === writer.did) {
			await objectFor(this.env, ref.authority).rpcRecordWriter(ref, writer.did!, rev, data);
			return;
		}
		if (await this.local(ref.authority, true)) {
			await objectFor(this.env, ref.authority).rpcRecordWriter(ref, writer.did!, rev, data);
			return;
		}
		const body = { space: ref.uri, repo: writer.did, repoRev: rev, data: { $bytes: b64(data) } };
		this.ctx.waitUntil(
			(async () => {
				for (let attempt = 0; attempt < 4; attempt++) {
					try {
						const r = await this.call(ref.authority, "com.atproto.space.notifyRepoUpdate", body, writer, spaceHostAud(ref.authority as `did:${string}:${string}`));
						if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429)) return;
					} catch {
						// retried below
					}
					await new Promise((done) => setTimeout(done, 500 * 4 ** attempt));
				}
			})(),
		);
	}

	/**
	 * Revoke credentials at every writer's repo host. Local repos are updated before this
	 * returns; other hosts get notifyCredentialsRevoked, retried a few times in the background.
	 */
	async revoke(ref: SpaceRef, authority: AccountRow, jtis: string[]): Promise<void> {
		if (!jtis.length) return;
		const writers = new Set([...(await objectFor(this.env, ref.authority).rpcWriters(ref.uri)), ref.authority]);
		for (const writer of writers) {
			if (await this.local(writer, true)) {
				await objectFor(this.env, writer).rpcRevoke(ref.uri, jtis);
				continue;
			}
			for (let i = 0; i < jtis.length; i += 100) {
				const body = { space: ref.uri, credentials: jtis.slice(i, i + 100) };
				this.ctx.waitUntil(
					(async () => {
						for (let attempt = 0; attempt < 4; attempt++) {
							try {
								const r = await this.call(writer, "com.atproto.space.notifyCredentialsRevoked", body, authority, writer);
								if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429)) return;
							} catch {
								// retried below
							}
							await new Promise((done) => setTimeout(done, 500 * 4 ** attempt));
						}
					})(),
				);
			}
		}
	}
}

type Caller = { kind: "session"; row: AccountRow } | { kind: "credential"; space: SpaceRef; jti: string; iat: number };

/** A session (password session or full-access OAuth) for one account here. */
async function sessionOf(s: Spaces, request: Request): Promise<AccountRow | Response> {
	const header = request.headers.get("authorization") ?? "";
	if (header.startsWith("DPoP ")) {
		using p = await provider(s.host);
		const token = await p.verifyAccessToken(request);
		const row = token ? await s.local(token.sub) : null;
		if (!token || !row) return xerr(401, "AuthenticationRequired", "Invalid OAuth access token");
		if (!token.scope.split(" ").includes("transition:generic"))
			return xerr(403, "ScopeMissing", "This host checks only full-access OAuth sessions for spaces; space: scopes are not checked yet");
		return row;
	}
	if (!header.startsWith("Bearer ")) return xerr(401, "AuthMissing", "Authorization header required");
	const token = header.slice(7);
	let sub: unknown;
	try {
		sub = JSON.parse(new TextDecoder().decode(fromB64url(token.split(".")[1] ?? ""))).sub;
	} catch {
		return xerr(401, "AuthenticationRequired", "Invalid authentication token");
	}
	const row = isDid(sub) ? await s.local(sub) : null;
	if (!row) return xerr(401, "AuthenticationRequired", "Invalid authentication token");
	try {
		await verifySession(s.env, token, row.did!, row.session_epoch, "access");
		return row;
	} catch (error) {
		if (error instanceof ExpiredTokenError) return xerr(400, "ExpiredToken", "Token has expired");
		return xerr(401, "AuthenticationRequired", "Invalid authentication token");
	}
}

/**
 * A space credential with its RFC 9421 signature, checked as the proposal lists, then against
 * revocations here and, for an authority on this host, against the space's current policy.
 */
async function credentialOf(s: Spaces, request: Request, audience: string): Promise<Caller | Response> {
	const header = request.headers.get("authorization") ?? "";
	const space = /^atproto-space-credential /i.test(header) ? header.slice(header.indexOf(" ") + 1) : null;
	if (!space) return xerr(401, "AuthMissing", "Space credential required");
	try {
		const { payload } = await verifySpaceToken("credential", space, { getSigningKey: (iss: string, fresh: boolean) => s.signingKey(iss, fresh) as Promise<`did:key:${string}`> } as never);
		const ref = parseSpace(payload.sub);
		if (!ref) return xerr(401, "BadJwtSub", "Credential subject is not a space");
		if (payload.iss !== ref.authority) return xerr(401, "BadJwtIss", "Credential issuer is not the space authority");
		const aud = request.headers.get("atproto-space-audience");
		if (!aud || aud !== audience) return xerr(401, "BadSpaceAudience", "Atproto-Space-Audience does not match this request");
		const headers: Record<string, string> = {};
		request.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
		await verifyCredentialSig(headers, payload.cnf!.kid);
		const caller: Caller = { kind: "credential", space: ref, jti: payload.jti, iat: payload.iat };
		if (await objectFor(s.env, audience).rpcIsRevoked(ref.uri, payload.jti)) return xerr(401, "CredentialRevoked", "Space credential has been revoked");
		if (await s.local(ref.authority, true)) {
			if (!(await objectFor(s.env, ref.authority).rpcStillAuthorized(ref, payload.jti))) return xerr(401, "CredentialRevoked", "Space credential has been revoked");
		} else {
			const maxAge = Number(s.env.SPACES_REMOTE_CREDENTIAL_MAX_AGE ?? "0");
			if (maxAge > 0 && Math.floor(Date.now() / 1000) - payload.iat > maxAge) return xerr(401, "JwtExpired", "Credential is older than this host accepts");
		}
		return caller;
	} catch (error) {
		const code = (error as { code?: string }).code ?? "BadJwt";
		return xerr(401, code, (error as Error).message ?? "Invalid space credential");
	}
}

const recordUri = (ref: SpaceRef, repo: string, collection: string, rkey: string) => `${ref.uri}/${repo}/${collection}/${rkey}`;
const toJson = (bytes: Uint8Array) => lexToJson(cborDecode(bytes) as never);
const commitJson = (c: { ver: number; repo: string; space: string; rev: string; data: Uint8Array }) => ({ ...c, data: { $bytes: b64(c.data) } });

async function body(request: Request): Promise<Record<string, unknown>> {
	try {
		const v = await request.json();
		return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

const limitOf = (url: URL, def: number, max: number) => Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") ?? String(def), 10) || def, 1), max);

/** Prepare one record write: JSON to DRISL, its CID, size and key checks. */
async function prepare(action: WriteOp["action"], collection: unknown, rkey: unknown, value: unknown): Promise<WriteOp> {
	if (!isNsid(collection)) throw new Refusal(400, "InvalidRequest", "Invalid collection");
	const key = rkey === undefined && action === "create" ? nextTid() : rkey;
	if (!isKey(key)) throw new Refusal(400, "InvalidRequest", "Invalid record key");
	if (action === "delete") return { action, collection, rkey: key };
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Refusal(400, "InvalidRequest", "A record must be an object");
	let lex: unknown;
	try {
		lex = jsonToLex(value as never);
	} catch {
		throw new Refusal(400, "InvalidRequest", "The record is not valid data");
	}
	const serialized = await serializeRecord(collection as never, key as never, lex as never);
	if (serialized.bytes.length > MAX_RECORD_SIZE) throw new Refusal(400, "RecordTooLarge", "Record is larger than 1 MiB");
	return { action, collection, rkey: key, cid: serialized.cid.toString(), bytes: serialized.bytes };
}

/** MAC headers for a credential read (required) or an own-account read that asked for one. */
async function macFor(s: Spaces, request: Request, caller: Caller, row: AccountRow, profile: typeof COMMIT_MAC_PROFILE | typeof RECORD_MAC_PROFILE) {
	const asked = parseMacRequest(request.headers.get("accept-signature") ?? undefined, profile);
	if (!asked) {
		if (caller.kind === "credential") throw new Refusal(400, "InvalidSpaceMac", `A MAC must be requested with tag "${profile}"`);
		return null;
	}
	const sharedSecret = await s.host.account(row).spaceKemSecret(row.did!, asked.keyShare);
	return { ...asked, sharedSecret };
}

const MAC_HEADERS = { vary: "Accept-Signature", "access-control-expose-headers": "atproto-space-commit, atproto-space-record, signature-input, signature" };

export async function handleSpaces(host: Host, request: Request, ctx: ExecutionContext, internal: (request: Request) => Promise<Response>): Promise<Response> {
	const url = new URL(request.url);
	const method = url.pathname.slice("/xrpc/".length);
	if (!spacesEnabled(host.env)) return xerr(501, "MethodNotImplemented", "Spaces are not enabled on this host");
	if (NOT_BUILT.has(method)) return xerr(501, "MethodNotImplemented", `${method} is not built on this host yet`);
	const s = new Spaces(host, ctx, internal);
	try {
		return await route(s, request, url, method);
	} catch (error) {
		const refusal = Refusal.from(error);
		if (refusal) return xerr(refusal.status, refusal.code, refusal.text);
		throw error;
	}
}

async function route(s: Spaces, request: Request, url: URL, method: string): Promise<Response> {
	const env = s.env;
	const POST = request.method === "POST";

	// --- writes to the caller's own space repo ---------------------------------------------------
	if (POST && ["com.atproto.space.createRecord", "com.atproto.space.putRecord", "com.atproto.space.deleteRecord", "com.atproto.space.applyWrites", "com.atproto.space.clearRecords"].includes(method)) {
		const row = await sessionOf(s, request);
		if (row instanceof Response) return row;
		const b = await body(request);
		const ref = parseSpace(b.space);
		if (!ref) return xerr(400, "InvalidRequest", "Invalid space");
		if (b.repo !== row.did) return xerr(403, "NotAuthorized", "A session writes only to its own repository");
		const repo = objectFor(env, row.did!);
		if (method === "com.atproto.space.clearRecords") {
			const done = await repo.rpcClearRecords(ref);
			if (done) await s.notifyRepoUpdate(ref, row, done.rev, done.data);
			return ok({});
		}
		let writes: WriteOp[];
		if (method === "com.atproto.space.applyWrites") {
			if (!Array.isArray(b.writes) || b.writes.length === 0 || b.writes.length > 200) return xerr(400, "InvalidRequest", "1 to 200 writes");
			writes = [];
			for (const w of b.writes as Record<string, unknown>[]) {
				const kind = String(w.$type ?? "").split("#")[1];
				if (kind !== "create" && kind !== "update" && kind !== "delete") return xerr(400, "InvalidRequest", "Unknown write type");
				writes.push(await prepare(kind, w.collection, w.rkey, w.value));
			}
		} else {
			const action = method.endsWith("createRecord") ? "create" : method.endsWith("putRecord") ? "put" : "delete";
			writes = [await prepare(action, b.collection, b.rkey, b.record)];
		}
		const done = await repo.rpcApplyWrites(ref, row.did!, writes);
		await s.notifyRepoUpdate(ref, row, done.rev, done.data);
		const results = writes.map((w, i) => (w.action === "delete" ? {} : { uri: recordUri(ref, row.did!, w.collection, w.rkey), cid: done.results[i]!.cid, validationStatus: "unknown" }));
		if (method === "com.atproto.space.applyWrites")
			return ok({ results: results.map((r, i) => ({ $type: `com.atproto.space.applyWrites#${writes[i]!.action}Result`, ...r })) });
		if (method === "com.atproto.space.deleteRecord") return ok({});
		return ok(results[0]);
	}

	// --- reads of one account's space repo (own session or a space credential) ---------------------
	if (["com.atproto.space.getRecord", "com.atproto.space.listRecords", "com.atproto.space.getLatestCommit", "com.atproto.space.getRepo", "com.atproto.space.listRepoOps"].includes(method)) {
		const ref = parseSpace(url.searchParams.get("space"));
		const repoDid = url.searchParams.get("repo");
		if (!ref || !isDid(repoDid)) return xerr(400, "InvalidRequest", "space and repo are required");
		const row = await s.local(repoDid);
		if (!row) return xerr(400, "RepoNotFound", "Repository not found");
		let caller: Caller;
		if (/^atproto-space-credential /i.test(request.headers.get("authorization") ?? "")) {
			const c = await credentialOf(s, request, repoDid);
			if (c instanceof Response) return c;
			if (c.kind === "credential" && c.space.uri !== ref.uri) return xerr(400, "InvalidCredential", "Credential is not scoped to this space");
			caller = c;
		} else {
			const own = await sessionOf(s, request);
			if (own instanceof Response) return own;
			if (own.did !== repoDid) return xerr(400, "RepoNotFound", "Repository not found");
			caller = { kind: "session", row: own };
		}
		const repo = objectFor(env, repoDid);
		const state = await repo.rpcRepoState(ref.uri);
		const commit = state ? RepoCommit.fromState(state.setHash).toCommit({ space: ref.uri as never, repo: repoDid as never, rev: state.rev as never }) : null;

		if (method === "com.atproto.space.getRecord") {
			const collection = url.searchParams.get("collection"), rkey = url.searchParams.get("rkey");
			if (!isNsid(collection) || !isKey(rkey)) return xerr(400, "InvalidRequest", "collection and rkey are required");
			const record = await repo.rpcGetRecord(ref.uri, `${collection}/${rkey}`);
			if (!record) return xerr(400, "RecordNotFound", "Record not found");
			const uri = recordUri(ref, repoDid, collection, rkey);
			const mac = await macFor(s, request, caller, row, RECORD_MAC_PROFILE);
			const extra = mac ? createRecordMacHeaders(uri as never, CID.parse(record.cid) as never, mac).headers : {};
			return ok({ uri, cid: record.cid, value: toJson(record.value) }, { ...MAC_HEADERS, ...extra });
		}
		if (method === "com.atproto.space.listRecords") {
			const collection = url.searchParams.get("collection") ?? undefined;
			if (collection !== undefined && !isNsid(collection)) return xerr(400, "InvalidRequest", "Invalid collection");
			const limit = limitOf(url, 50, 1000), exclude = url.searchParams.get("excludeValues") === "true";
			const rows = await repo.rpcListRecords(ref.uri, collection, limit, url.searchParams.get("cursor") ?? undefined);
			return ok({
				records: rows.map((r) => ({ uri: recordUri(ref, repoDid, r.collection, r.rkey), cid: r.cid, ...(exclude ? {} : { value: toJson(r.value) }) })),
				...(rows.length === limit ? { cursor: rows.at(-1)!.path } : {}),
			});
		}
		if (!commit) return xerr(400, "RepoNotFound", "No repository in this space");
		const mac = await macFor(s, request, caller, row, COMMIT_MAC_PROFILE);
		const macHeaders = mac ? createCommitMacHeaders(commit, mac).headers : {};
		if (method === "com.atproto.space.getLatestCommit") return ok({ commit: commitJson(commit) }, { ...MAC_HEADERS, ...macHeaders });
		if (method === "com.atproto.space.getRepo") {
			const records: { collection: string; rkey: string; bytes: Uint8Array }[] = [];
			let cursor: string | undefined;
			for (;;) {
				const page = await repo.rpcListRecords(ref.uri, undefined, 1000, cursor);
				for (const r of page) records.push({ collection: r.collection, rkey: r.rkey, bytes: r.value });
				if (page.length < 1000) break;
				cursor = page.at(-1)!.path;
			}
			const chunks: Uint8Array[] = [];
			for await (const chunk of writeRepoStar(commit, records as never)) chunks.push(chunk);
			const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
			let at = 0;
			for (const c of chunks) {
				out.set(c, at);
				at += c.length;
			}
			return new Response(out, { headers: { "content-type": "application/vnd.dasl.star", "cache-control": "no-store", ...MAC_HEADERS, ...macHeaders } });
		}
		// listRepoOps
		const since = url.searchParams.get("since") ?? undefined, limit = limitOf(url, 100, 1000), exclude = url.searchParams.get("excludeValues") === "true";
		const page = await repo.rpcListOps(ref.uri, since, limit, url.searchParams.get("cursor") ?? undefined);
		const last = page.ops.at(-1);
		return ok(
			{
				ops: page.ops.map((o) => {
					const value = !exclude && o.cid ? page.values[`${o.collection}/${o.rkey}`] : undefined;
					return { rev: o.rev, collection: o.collection, rkey: o.rkey, cid: o.cid ?? null, prev: o.prev ?? null, ...(value ? { value: toJson(value) } : {}) };
				}),
				commit: commitJson(commit),
				...(page.ops.length === limit && last ? { cursor: `${last.rev}:${last.idx}` } : {}),
			},
			{ ...MAC_HEADERS, ...macHeaders },
		);
	}

	// --- delegation tokens (the user's PDS) -------------------------------------------------------
	if (method === "com.atproto.space.getDelegationToken") {
		const row = await sessionOf(s, request);
		if (row instanceof Response) return row;
		const ref = parseSpace(url.searchParams.get("space"));
		if (!ref) return xerr(400, "InvalidRequest", "Invalid space");
		const token = await createDelegationToken({ iss: row.did as never, sub: ref.uri as never, aud: spaceHostAud(ref.authority as never), keypair: s.signer(row) as never });
		return ok({ token });
	}

	// --- the space host: credentials --------------------------------------------------------------
	if (method === "com.atproto.space.authorizeSpaceSync" && POST) {
		const b = await body(request);
		const ref = parseSpace(b.space);
		if (!ref) return xerr(400, "InvalidRequest", "Invalid space");
		if (typeof b.credentialKey !== "string" || !isP256DidKey(b.credentialKey)) return xerr(400, "InvalidRequest", "credentialKey must be a P-256 did:key");
		const authority = await s.host.dir.byDid(ref.authority);
		if (!authority?.did || authority.status === "deleted" || authority.status === "deleting" || authority.status === "pending") return xerr(400, "SpaceNotFound", "Space not found");
		if (authority.status === "takendown") return xerr(400, "RepoTakendown", "The space authority has been taken down");
		if (authority.status === "deactivated") return xerr(400, "RepoDeactivated", "The space authority is deactivated");
		const object = objectFor(env, ref.authority);
		const exists = await object.rpcMayRead(ref, null);
		if (exists === "missing") return xerr(400, "SpaceNotFound", "Space not found");
		if (exists === "deleted") return xerr(400, "SpaceDeleted", "Space has been deleted");
		let user: string | null = null;
		if (typeof b.delegationToken === "string") {
			try {
				const { payload } = await verifySpaceToken("delegation", b.delegationToken, { getSigningKey: (iss: string, fresh: boolean) => s.signingKey(iss, fresh) } as never);
				if (payload.sub !== ref.uri) return xerr(400, "InvalidDelegationToken", "Delegation token subject does not match the space");
				if (payload.aud !== spaceHostAud(ref.authority as never)) return xerr(400, "InvalidDelegationToken", "Delegation token audience does not match the space authority");
				if (!isDid(payload.iss)) return xerr(400, "InvalidDelegationToken", "Delegation token issuer is not a DID");
				if (!(await object.rpcUseDelegation(payload.iss, payload.jti, payload.exp * 1000))) return xerr(400, "InvalidDelegationToken", "Delegation token has already been used");
				user = payload.iss;
			} catch (error) {
				if (Refusal.from(error)) throw error;
				return xerr(400, "InvalidDelegationToken", (error as Error).message);
			}
		}
		// Not authorized reads like a missing space, as the reference PDS does.
		if ((await object.rpcMayRead(ref, user)) !== "ok") return xerr(400, "SpaceNotFound", "Space not found");
		const credential = await createSpaceCredential({ iss: ref.authority as never, sub: ref.uri as never, keyId: b.credentialKey as never, keypair: s.signer(authority) as never, expiresInSec: CREDENTIAL_SECONDS });
		const { payload } = parseSpaceToken("credential", credential);
		if (!(await object.rpcRecordIssued(ref, payload.jti, user, payload.exp * 1000))) return xerr(400, "SpaceNotFound", "Space not found");
		const space = await object.rpcGetSpace(ref.uri);
		return ok({ credential, ...(space?.spaceRev ? { spaceRev: space.spaceRev } : {}) });
	}

	if (method === "com.atproto.space.listWriters") {
		const ref = parseSpace(url.searchParams.get("space"));
		if (!ref) return xerr(400, "InvalidRequest", "Invalid space");
		if (!(await s.local(ref.authority))) return xerr(400, "SpaceNotFound", "Space not found");
		const c = await credentialOf(s, request, ref.authority);
		if (c instanceof Response) return c;
		if (c.kind === "credential" && c.space.uri !== ref.uri) return xerr(400, "InvalidCredential", "Credential is not scoped to this space");
		return ok(await objectFor(env, ref.authority).rpcListWriters(ref.uri, limitOf(url, 100, 1000), url.searchParams.get("cursor") ?? undefined));
	}

	if (method === "com.atproto.space.notifyRepoUpdate" && POST) {
		const auth = await s.verifyServiceJwt(request, method);
		const b = await body(request);
		const ref = parseSpace(b.space);
		if (!ref || !isDid(b.repo) || typeof b.repoRev !== "string" || !/^[2-7a-z]{13}$/.test(b.repoRev)) return xerr(400, "InvalidRequest", "space, repo, repoRev and data are required");
		if (auth.iss !== b.repo) return xerr(403, "Forbidden", "Notification iss does not match the repo");
		if (auth.aud !== ref.authority && auth.aud !== spaceHostAud(ref.authority as never)) return xerr(403, "Forbidden", "Notification aud does not match the space authority");
		if (!(await s.local(ref.authority, true))) return xerr(400, "SpaceNotFound", "Space not found");
		if (tidTimeMs(b.repoRev) > Date.now() + 300_000) return xerr(400, "FutureRev", "Repo revision is in the future");
		const data = (b.data as { $bytes?: string } | undefined)?.$bytes;
		if (typeof data !== "string") return xerr(400, "InvalidRequest", "data is required");
		const result = await objectFor(env, ref.authority).rpcRecordWriter(ref, b.repo, b.repoRev, Uint8Array.from(atob(data), (c) => c.charCodeAt(0)));
		if (result === "missing") return xerr(400, "SpaceNotFound", "Space not found");
		if (result === "forbidden") return xerr(403, "Forbidden", "Repo is not authorized to write to the space");
		return ok({});
	}

	if (method === "com.atproto.space.notifyCredentialsRevoked" && POST) {
		const auth = await s.verifyServiceJwt(request, method);
		const b = await body(request);
		const ref = parseSpace(b.space);
		if (!ref || !Array.isArray(b.credentials) || !b.credentials.length || b.credentials.length > 100 || !b.credentials.every((j) => typeof j === "string" && j.length > 0 && j.length < 200))
			return xerr(400, "InvalidRequest", "space and 1 to 100 credentials are required");
		if (auth.iss !== ref.authority) return xerr(403, "Forbidden", "Revocation issuer is not the space authority");
		if (!isDid(auth.aud) || !(await s.local(auth.aud, true))) return xerr(403, "Forbidden", "Revocation audience does not match a repo hosted here");
		await objectFor(env, auth.aud).rpcRevoke(ref.uri, b.credentials as string[]);
		return ok({});
	}

	// --- the space host: management by the authority -----------------------------------------------
	const MANAGE = [
		"com.atproto.space.createSpace",
		"com.atproto.space.getSpace",
		"com.atproto.space.updateSpace",
		"com.atproto.space.deleteSpace",
		"com.atproto.space.listSpaces",
		"com.atproto.space.removeWriter",
		"com.atproto.memberspace.putMembers",
		"com.atproto.memberspace.removeMembers",
		"com.atproto.memberspace.listMembers",
	];
	if (!MANAGE.includes(method)) return xerr(501, "MethodNotImplemented", "Not available on this host");
	const row = await sessionOf(s, request);
	if (row instanceof Response) return row;
	const self = row.did!;
	const object = objectFor(env, self);

	if (method === "com.atproto.space.listSpaces") {
		const limit = limitOf(url, 50, 100);
		const spaces = (await object.rpcListSpaces(url.searchParams.get("spaceType") ?? undefined, url.searchParams.get("spaceDid") ?? undefined, limit, url.searchParams.get("cursor") ?? undefined)) as unknown as { space: string }[];
		return ok({ spaces, ...(spaces.length === limit ? { cursor: spaces.at(-1)!.space } : {}) });
	}

	const b = POST ? await body(request) : {};
	const ref = parseSpace(POST ? b.space : url.searchParams.get("space"));
	if (method === "com.atproto.space.createSpace") {
		if (!isNsid(b.spaceType)) return xerr(400, "InvalidRequest", "spaceType must be an NSID");
		const skey = b.skey === undefined ? nextTid() : b.skey;
		if (!isKey(skey)) return xerr(400, "InvalidRequest", "Invalid skey");
		const created: SpaceRef = { uri: `at://${self}/space/${b.spaceType}/${skey}`, authority: self, type: b.spaceType, skey };
		await object.rpcCreateSpace(created, normalizePolicy(b.policy));
		return ok({ space: created.uri });
	}
	if (!ref) return xerr(400, "InvalidRequest", "Invalid space");
	if (ref.authority !== self) return xerr(400, "NotAuthorized", "Not the space authority");

	if (method === "com.atproto.space.getSpace") {
		const space = await object.rpcGetSpace(ref.uri);
		if (!space || space.deleted) return xerr(400, "SpaceNotFound", "Space not found");
		return ok({ space: ref.uri, policy: space.policy });
	}
	if (method === "com.atproto.space.updateSpace") {
		await s.revoke(ref, row, await object.rpcUpdateSpace(ref, normalizePolicy(b.policy)));
		return ok({});
	}
	if (method === "com.atproto.space.deleteSpace") {
		const { revoke } = await object.rpcDeleteSpace(ref);
		await s.revoke(ref, row, revoke);
		return ok({});
	}
	if (method === "com.atproto.space.removeWriter") {
		if (!isDid(b.repo)) return xerr(400, "InvalidRequest", "repo must be a DID");
		await object.rpcRemoveWriter(ref, b.repo);
		return ok({});
	}
	if (method === "com.atproto.memberspace.listMembers") return ok(await object.rpcListMembers(ref.uri, limitOf(url, 100, 1000), url.searchParams.get("cursor") ?? undefined));
	if (method === "com.atproto.memberspace.putMembers") {
		if (!Array.isArray(b.members) || b.members.length > 100) return xerr(400, "InvalidRequest", "members must be a list of at most 100");
		const members: MemberRow[] = [];
		for (const m of b.members as Record<string, unknown>[]) {
			if (!isDid(m.did) || typeof m.read !== "boolean" || typeof m.write !== "boolean") return xerr(400, "InvalidRequest", "Each member needs did, read and write");
			members.push({ did: m.did, read: m.read, write: m.write });
		}
		const { revoke } = await object.rpcPutMembers(ref, members);
		await s.revoke(ref, row, revoke);
		return ok({});
	}
	// removeMembers
	if (!Array.isArray(b.dids) || b.dids.length > 100 || !b.dids.every(isDid)) return xerr(400, "InvalidRequest", "dids must be a list of at most 100 DIDs");
	const { revoke } = await object.rpcRemoveMembers(ref, b.dids as string[]);
	await s.revoke(ref, row, revoke);
	return ok({});
}

/** On account deletion: everything the account held in spaces, as repo host and as authority. */
export async function purgeAccountSpaces(env: HostEnv, did: string): Promise<void> {
	if (!env.SPACES) return;
	await objectFor(env, did).rpcPurge();
}
