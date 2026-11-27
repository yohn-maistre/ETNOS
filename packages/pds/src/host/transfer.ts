/**
 * Moving every account to a new identity host (docs/ops/cutover-2026-11-28.md, step 3).
 * ETNOS code (AGPL-3.0-only).
 *
 * `POST /admin/accounts/export` writes one gzipped JSON file with every account's host state:
 * the directory rows, each account object's tables (repository blocks and state, password hash,
 * passkeys, recovery-code hash, used reset links), its spaces tables, and the list of its blob
 * keys in R2. Sessions, OAuth grants, challenges and failure counters are left out, so people sign
 * in once more on the new host.
 *
 * Key custody. Inside each account object the private keys are unwrapped with the host KEK and
 * wrapped again under the transfer key (the Worker secret ACCOUNT_TRANSFER_KEY, 32 random bytes,
 * set on both hosts for the move only). The whole payload is then sealed with AES-256-GCM under a
 * second key derived from the transfer key, with the header as associated data, so the file holds
 * no plaintext key and no readable password hash, and any change to it is refused.
 *
 * `POST /admin/accounts/import` on the new host refuses, with nothing written, when the host already
 * holds any account, when the file is not an export, when a version differs, or when the transfer
 * key does not open it. Then it writes, in this order:
 *   1. each account object, in one SQLite transaction per object, with the keys wrapped under this
 *      host's own KEK and checked against the public keys in the identity row;
 *   2. each account's spaces object, one transaction each;
 *   3. the directory (accounts, invites, audit), in one batch, which is one transaction.
 * The edge reads the directory before it wakes any object, so until step 3 nothing written is
 * reachable. If the import stops before step 3, the directory is still empty, and running the same
 * import again replaces what the first run wrote. If it stops after step 3, the move is complete.
 * Blobs are copied bucket to bucket (scripts/copy-identity-blobs.mjs); the import only counts which
 * listed blobs it can already see.
 */
import { b64url, derive, fromB64url, randomBytes, unwrapSecret, wrapSecret, type WrappedSecret } from "./crypto.ts";
import type { HostEnv } from "./env.ts";

export const TRANSFER_FORMAT = "etnos-host-accounts";
export const TRANSFER_FORMAT_VERSION = 1;
/**
 * The shape of the host state this release writes and reads. Bump it when a copied table gains,
 * loses or renames a column, or when a table moves between the copy and skip lists below.
 */
export const HOST_STATE_SCHEMA = 1;

/** Account object tables that move. account_keys is rewrapped on the way (see below). */
export const ACCOUNT_COPY = [
	"host_identity",
	"account_keys",
	"host_passkeys",
	"host_recovery",
	"host_used_reset_links",
	"blocks",
	"repo_state",
	"firehose_events",
	"record_blob",
	"imported_blobs",
	"collections",
	"strata_record_refs",
	"strata_repo_meta",
	"preferences",
	"passkeys",
	"app_passwords",
] as const;
/** Account object tables that stay behind: sessions, OAuth, challenges, throttles and failure counters. */
export const ACCOUNT_SKIP = [
	"host_password_failures",
	"host_recovery_failures",
	"host_passkey_challenges",
	"host_tombstone",
	"strata_refresh_sessions",
	"strata_auth_budget",
	"passkey_tokens",
	"oauth_auth_codes",
	"oauth_tokens",
	"oauth_tokens_new",
	"oauth_clients",
	"oauth_par_requests",
	"oauth_nonces",
	"oauth_webauthn_challenges",
	"oauth_permission_sets",
] as const;
/** Spaces tables (alpha). Issued and revoked credentials move too, so a revocation stays in force. */
export const SPACES_COPY = ["sp_space", "sp_member", "sp_writer", "sp_issued", "sp_delegation", "sp_repo", "sp_record", "sp_oplog", "sp_revoked"] as const;
export const SPACES_SKIP = [] as const;
export const DIRECTORY_COPY = ["accounts", "invites", "audit"] as const;

/** One SQL value: text, number, null, or bytes as base64url. */
export type Cell = string | number | null | { $b: string };
export interface Table {
	columns: string[];
	rows: Cell[][];
}
export type Tables = Record<string, Table>;

const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

/** The transfer key from ACCOUNT_TRANSFER_KEY, or null when it is missing or not 32 bytes. */
export function transferKey(env: Pick<HostEnv, "ACCOUNT_TRANSFER_KEY">): Uint8Array | null {
	try {
		const bytes = fromB64url((env.ACCOUNT_TRANSFER_KEY ?? "").trim());
		return bytes.length === 32 ? bytes : null;
	} catch {
		return null;
	}
}

function encodeCell(value: SqlStorageValue): Cell {
	if (value instanceof ArrayBuffer) return { $b: b64url(new Uint8Array(value)) };
	if (value === null || typeof value === "string" || typeof value === "number") return value;
	throw new Error("Unsupported SQL value");
}

function decodeCell(value: Cell): SqlStorageValue {
	if (value === null || typeof value === "string") return value;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (value && typeof value === "object" && typeof value.$b === "string" && Object.keys(value).length === 1) {
		const bytes = fromB64url(value.$b);
		return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
	}
	throw new Error("Invalid cell");
}

/** Tables of one object's SQLite database. Refuses when a table is in neither list, so nothing is dropped silently. */
export function dumpTables(sql: SqlStorage, copy: readonly string[], skip: readonly string[]): Tables {
	const names = sql
		.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND substr(name, 1, 7) != 'sqlite_' AND substr(name, 1, 4) != '_cf_'")
		.toArray()
		.map((r) => r.name);
	for (const name of names) if (!copy.includes(name) && !skip.includes(name)) throw new Error(`UnknownTable ${name}`);
	const out: Tables = {};
	for (const name of copy) {
		if (!names.includes(name)) continue;
		const cursor = sql.exec(`SELECT * FROM "${name}"`);
		const columns = [...cursor.columnNames];
		const rows = [...cursor.raw()].map((row) => row.map(encodeCell));
		out[name] = { columns, rows };
	}
	return out;
}

/** Check the shape of tables from a file before anything is written. */
export function checkTables(value: unknown, copy: readonly string[]): Tables {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid tables");
	const out: Tables = {};
	for (const [name, table] of Object.entries(value as Record<string, unknown>)) {
		if (!copy.includes(name)) throw new Error(`Unexpected table ${name}`);
		const t = table as Partial<Table>;
		if (!Array.isArray(t?.columns) || !Array.isArray(t.rows)) throw new Error(`Invalid table ${name}`);
		if (!t.columns.length || t.columns.some((c) => typeof c !== "string" || !IDENT.test(c)) || new Set(t.columns).size !== t.columns.length)
			throw new Error(`Invalid columns in ${name}`);
		for (const row of t.rows) {
			if (!Array.isArray(row) || row.length !== t.columns.length) throw new Error(`Invalid row in ${name}`);
			row.forEach((cell) => decodeCell(cell as Cell));
		}
		out[name] = { columns: t.columns, rows: t.rows as Cell[][] };
	}
	return out;
}

/**
 * Replace the copied tables with the file's rows. Synchronous: call it inside one
 * transactionSync, so an object gets all of its rows or none. Every copied table that exists is
 * emptied first, which is what makes a second run of an interrupted import safe.
 */
export function loadTables(sql: SqlStorage, tables: Tables, copy: readonly string[]): number {
	const existing = new Set(
		sql
			.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
			.toArray()
			.map((r) => r.name),
	);
	for (const name of copy) if (existing.has(name)) sql.exec(`DELETE FROM "${name}"`);
	let written = 0;
	for (const [name, table] of Object.entries(tables)) {
		if (!copy.includes(name)) throw new Error(`Unexpected table ${name}`);
		const statement = `INSERT INTO "${name}" (${table.columns.map((c) => `"${c}"`).join(",")}) VALUES (${table.columns.map(() => "?").join(",")})`;
		for (const row of table.rows) {
			sql.exec(statement, ...row.map(decodeCell));
			written++;
		}
	}
	return written;
}

/** Wrap one private key under the transfer key, bound to the account and the key's purpose. */
export function wrapForTransfer(transfer: Uint8Array, did: string, purpose: string, clear: Uint8Array): Promise<WrappedSecret> {
	return wrapSecret(transfer, 0, did, `transfer/${purpose}`, clear);
}

export function unwrapFromTransfer(transfer: Uint8Array, did: string, purpose: string, wrapped: { nonce: string; ciphertext: string }): Promise<Uint8Array> {
	return unwrapSecret(transfer, did, `transfer/${purpose}`, { kekVersion: 0, nonce: wrapped.nonce, ciphertext: wrapped.ciphertext });
}

// ---------------------------------------------------------------------------------------------
// The file: a header in the clear, and the payload sealed under a key derived from the transfer key

export interface TransferHeader {
	format: typeof TRANSFER_FORMAT;
	formatVersion: number;
	schemaVersion: number;
	createdAt: string;
	source: string;
	/** Account objects in the file (directory rows without state are not counted). */
	accounts: number;
}

export interface TransferFile extends TransferHeader {
	nonce: string;
	ciphertext: string;
}

export interface TransferAccount {
	account_id: string;
	did: string;
	/** The account object's tables. Directory rows without state (deleted, or pending before keys) have no entry. */
	account: Tables;
	spaces: Tables | null;
	blobs: { key: string; size: number; etag: string }[];
}

export interface TransferPayload {
	directory: Tables;
	accounts: TransferAccount[];
}

const aad = (h: TransferHeader) => new TextEncoder().encode(JSON.stringify([h.format, h.formatVersion, h.schemaVersion, h.createdAt, h.source, h.accounts]));
const buf = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

async function payloadKey(transfer: Uint8Array, usage: KeyUsage): Promise<CryptoKey> {
	return crypto.subtle.importKey("raw", buf(await derive(transfer, "etnos-host-transfer", "payload/v1")), "AES-GCM", false, [usage]);
}

export async function sealFile(transfer: Uint8Array, header: TransferHeader, payload: TransferPayload): Promise<TransferFile> {
	const nonce = randomBytes(12);
	const sealed = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: buf(nonce), additionalData: buf(aad(header)) },
		await payloadKey(transfer, "encrypt"),
		buf(new TextEncoder().encode(JSON.stringify(payload))),
	);
	return { ...header, nonce: b64url(nonce), ciphertext: b64url(new Uint8Array(sealed)) };
}

export type Opened = { ok: true; header: TransferHeader; payload: TransferPayload } | { ok: false; status: number; error: string; message: string };

/** Read a file: shape and versions first, then the seal. Nothing here writes. */
export async function openFile(transfer: Uint8Array, bytes: Uint8Array): Promise<Opened> {
	const refuse = (status: number, error: string, message: string): Opened => ({ ok: false, status, error, message });
	let file: Partial<TransferFile>;
	try {
		file = JSON.parse(new TextDecoder().decode(await gunzip(bytes)));
	} catch {
		return refuse(400, "NotAnExport", "The file is not a gzipped ETNOS host export");
	}
	if (!file || typeof file !== "object" || file.format !== TRANSFER_FORMAT) return refuse(400, "NotAnExport", "The file is not an ETNOS host export");
	if (file.formatVersion !== TRANSFER_FORMAT_VERSION)
		return refuse(400, "VersionMismatch", `Export format ${String(file.formatVersion)}; this host reads format ${TRANSFER_FORMAT_VERSION}`);
	if (file.schemaVersion !== HOST_STATE_SCHEMA)
		return refuse(400, "VersionMismatch", `Host state schema ${String(file.schemaVersion)}; this host has schema ${HOST_STATE_SCHEMA}. Deploy the same release on both hosts.`);
	if (typeof file.createdAt !== "string" || typeof file.source !== "string" || !Number.isInteger(file.accounts) || typeof file.nonce !== "string" || typeof file.ciphertext !== "string")
		return refuse(400, "NotAnExport", "The export header is incomplete");
	const header: TransferHeader = {
		format: TRANSFER_FORMAT,
		formatVersion: file.formatVersion,
		schemaVersion: file.schemaVersion,
		createdAt: file.createdAt,
		source: file.source,
		accounts: file.accounts!,
	};
	let clear: ArrayBuffer;
	try {
		clear = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: buf(fromB64url(file.nonce)), additionalData: buf(aad(header)) },
			await payloadKey(transfer, "decrypt"),
			buf(fromB64url(file.ciphertext)),
		);
	} catch {
		return refuse(400, "TransferKeyMismatch", "The transfer key does not open this file, or the file was changed");
	}
	try {
		const raw = JSON.parse(new TextDecoder().decode(clear)) as TransferPayload;
		const payload: TransferPayload = { directory: checkTables(raw.directory, DIRECTORY_COPY), accounts: [] };
		if (!Array.isArray(raw.accounts) || raw.accounts.length !== header.accounts) throw new Error("account count");
		for (const a of raw.accounts) {
			if (typeof a?.account_id !== "string" || typeof a.did !== "string" || !/^did:[a-z]+:[A-Za-z0-9._:%-]{1,2000}$/.test(a.did)) throw new Error("account");
			if (!Array.isArray(a.blobs) || a.blobs.some((b) => typeof b?.key !== "string" || !b.key.startsWith(`${a.did}/`))) throw new Error("blobs");
			payload.accounts.push({
				account_id: a.account_id,
				did: a.did,
				account: checkTables(a.account, ACCOUNT_COPY),
				spaces: a.spaces === null ? null : checkTables(a.spaces, SPACES_COPY),
				blobs: a.blobs,
			});
		}
		return { ok: true, header, payload };
	} catch (error) {
		return refuse(400, "NotAnExport", `The export payload is malformed (${error instanceof Error ? error.message.slice(0, 120) : "error"})`);
	}
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
	const out = new Response(new Blob([buf(bytes)]).stream().pipeThrough(stream));
	return new Uint8Array(await out.arrayBuffer());
}
export const gzip = (bytes: Uint8Array) => pipe(bytes, new CompressionStream("gzip"));
export const gunzip = (bytes: Uint8Array) => pipe(bytes, new DecompressionStream("gzip"));
