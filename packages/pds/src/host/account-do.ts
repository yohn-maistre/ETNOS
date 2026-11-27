/**
 * One Durable Object per hosted account (plan §2.1). ETNOS code
 * (AGPL-3.0-only) extending the attributed Cirrus account object.
 *
 * The object holds its own identity: DID, handle, the account's signing key
 * and host rotation key (both wrapped with a key derived from the host KEK),
 * the password hash and the repository. Key generation, PLC signing and
 * password hashing all run here, inside the object, never in the edge Worker.
 *
 * Every method the edge calls names the DID it expects. The object refuses
 * when that DID is not its own, so a routing bug cannot make one account act
 * as another (plan §2.2 rule 1). No method returns private key material.
 */
import { P256Keypair, Secp256k1Keypair } from "@atproto/crypto";
import { p256 } from "@noble/curves/p256";
import { decapsulate } from "@atproto/space";
import { AccountDurableObject } from "../upstream/account-do";
import type { RepoFacet } from "../upstream/repo/facet";
import type { AccountStore } from "../upstream/account/store";
import {
	fromB64url,
	hashPassword,
	hex,
	randomBytes,
	sha256Hex,
	parseKek,
	unwrapSecret,
	verifyPassword,
	wrapSecret,
	type WrappedSecret,
} from "./crypto.ts";
import { didForGenesis, genesisOperation, operationCid, signOperation, withServiceEndpoint, withVerificationMethod, type SignedPlcOperation } from "./plc.ts";
import type { HostEnv } from "./env.ts";

export interface ProvisionInput {
	accountId: string;
	handle: string;
	password: string;
	pdsEndpoint: string;
	/** Optional escrow rotation key (did:key), placed above the host key. */
	escrowRotationKey?: string;
}

export interface ProvisionResult {
	did: string;
	operation: SignedPlcOperation;
	signingKey: string;
	resumed: boolean;
}

export class AccountMismatchError extends Error {
	constructor() {
		super("AccountMismatch");
	}
}

const FAILURE_WINDOW_MS = 10 * 60 * 1000;
const FAILURES_PER_WINDOW = 10;
const RECOVERY_FAILURES_PER_WINDOW = 5;

/** Recovery codes: 20 characters from a 32-letter alphabet without look-alikes (100 bits), in groups of five. */
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function recoveryCode(): string {
	const bytes = randomBytes(20);
	let out = "";
	for (let i = 0; i < 20; i++) out += (i && i % 5 === 0 ? "-" : "") + RECOVERY_ALPHABET[bytes[i]! & 31];
	return out;
}
/** Spaces, dashes and letter case do not matter when the code is typed back. */
export const normalRecoveryCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
const recoveryHash = (did: string, code: string) => sha256Hex(`recovery:${did}:${normalRecoveryCode(code)}`);
function same(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

interface IdentityRow {
	account_id: string;
	did: string;
	handle: string;
	signing_did_key: string;
	rotation_did_key: string;
	genesis: string;
	password_hash: string;
	created: number;
}

export class HostedAccountDurableObject extends AccountDurableObject {
	private hostSchemaReady = false;
	private signingKeyHex: string | null = null;

	private get hostEnv(): HostEnv {
		return this.env as unknown as HostEnv;
	}

	private hostSchema(): void {
		if (this.hostSchemaReady) return;
		const sql = this.ctx.storage.sql;
		sql.exec(`CREATE TABLE IF NOT EXISTS host_identity (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			account_id TEXT NOT NULL, did TEXT NOT NULL, handle TEXT NOT NULL,
			signing_did_key TEXT NOT NULL, rotation_did_key TEXT NOT NULL,
			genesis TEXT NOT NULL, password_hash TEXT NOT NULL, created INTEGER NOT NULL)`);
		sql.exec(`CREATE TABLE IF NOT EXISTS account_keys (
			purpose TEXT PRIMARY KEY, kek_version INTEGER NOT NULL,
			nonce TEXT NOT NULL, ciphertext TEXT NOT NULL)`);
		sql.exec(`CREATE TABLE IF NOT EXISTS host_password_failures (window INTEGER PRIMARY KEY, count INTEGER NOT NULL)`);
		sql.exec(`CREATE TABLE IF NOT EXISTS host_tombstone (id INTEGER PRIMARY KEY CHECK (id = 1), did TEXT, at INTEGER NOT NULL)`);
		sql.exec(`CREATE TABLE IF NOT EXISTS host_passkeys (
			credential_id TEXT PRIMARY KEY, public_key TEXT NOT NULL,
			counter INTEGER NOT NULL, transports TEXT NOT NULL,
			label TEXT NOT NULL, created INTEGER NOT NULL)`);
		sql.exec(`CREATE TABLE IF NOT EXISTS host_passkey_challenges (
			challenge TEXT PRIMARY KEY, kind TEXT NOT NULL, expires INTEGER NOT NULL)`);
		// Account recovery: the hash of the one-time recovery code, failed tries per window, and used reset links.
		sql.exec(`CREATE TABLE IF NOT EXISTS host_recovery (id INTEGER PRIMARY KEY CHECK (id = 1), code_hash TEXT NOT NULL, created INTEGER NOT NULL)`);
		sql.exec(`CREATE TABLE IF NOT EXISTS host_recovery_failures (window INTEGER PRIMARY KEY, count INTEGER NOT NULL)`);
		sql.exec(`CREATE TABLE IF NOT EXISTS host_used_reset_links (id TEXT PRIMARY KEY, used INTEGER NOT NULL)`);
		this.hostSchemaReady = true;
	}

	private identityRow(): IdentityRow | undefined {
		this.hostSchema();
		return this.ctx.storage.sql.exec("SELECT * FROM host_identity WHERE id = 1").toArray()[0] as unknown as IdentityRow | undefined;
	}

	private tombstoned(): boolean {
		this.hostSchema();
		return this.ctx.storage.sql.exec("SELECT 1 FROM host_tombstone WHERE id = 1").toArray().length > 0;
	}

	/** Defence in depth: the edge names the DID it routed for; anything else is refused. */
	private assertAccount(expectedDid: string): IdentityRow {
		const row = this.identityRow();
		if (!row || this.tombstoned() || typeof expectedDid !== "string" || row.did !== expectedDid) throw new AccountMismatchError();
		return row;
	}

	private kek(version: number): Uint8Array {
		const secret = (this.hostEnv as unknown as Record<string, string | undefined>)[`ACCOUNT_KEK_V${version}`];
		return parseKek(secret);
	}

	private currentKekVersion(): number {
		const v = Number(this.hostEnv.ACCOUNT_KEK_CURRENT ?? "1");
		if (!Number.isInteger(v) || v < 1) throw new Error("ACCOUNT_KEK_CURRENT must be a positive integer");
		return v;
	}

	private async storeKey(did: string, purpose: string, plaintext: Uint8Array): Promise<void> {
		const version = this.currentKekVersion();
		const wrapped = await wrapSecret(this.kek(version), version, did, purpose, plaintext);
		this.ctx.storage.sql.exec(
			"INSERT INTO account_keys VALUES (?,?,?,?) ON CONFLICT(purpose) DO UPDATE SET kek_version = excluded.kek_version, nonce = excluded.nonce, ciphertext = excluded.ciphertext",
			purpose,
			wrapped.kekVersion,
			wrapped.nonce,
			wrapped.ciphertext,
		);
	}

	/** Unwrap a key; rewrap lazily under the current KEK version (plan §2.3, KEK rotation). */
	private async loadKey(did: string, purpose: string): Promise<Uint8Array> {
		const row = this.ctx.storage.sql
			.exec<{ kek_version: number; nonce: string; ciphertext: string }>("SELECT kek_version, nonce, ciphertext FROM account_keys WHERE purpose = ?", purpose)
			.toArray()[0];
		if (!row) throw new Error("Account key missing");
		const wrapped: WrappedSecret = { kekVersion: row.kek_version, nonce: row.nonce, ciphertext: row.ciphertext };
		const clear = await unwrapSecret(this.kek(row.kek_version), did, purpose, wrapped);
		if (row.kek_version !== this.currentKekVersion()) await this.storeKey(did, purpose, clear);
		return clear;
	}

	protected override async loadIdentity(): Promise<{ did: string; signingKey: string }> {
		const row = this.identityRow();
		if (!row || this.tombstoned()) throw new Error("Account is not provisioned");
		if (!this.signingKeyHex) this.signingKeyHex = hex(await this.loadKey(row.did, "signing"));
		return { did: row.did, signingKey: this.signingKeyHex };
	}

	protected override initialActive(): boolean {
		return true;
	}

	/**
	 * Create keys, the genesis operation and the DID, inside this object.
	 * Idempotent for a resumed registration: the same password returns the same
	 * DID and operation; any other password is refused.
	 */
	async provision(input: ProvisionInput): Promise<ProvisionResult> {
		return this.ctx.blockConcurrencyWhile(async () => {
			this.hostSchema();
			if (this.tombstoned()) throw new Error("Account was deleted");
			const existing = this.identityRow();
			if (existing) {
				if (existing.account_id !== input.accountId || existing.handle !== input.handle) throw new AccountMismatchError();
				if (!(await verifyPassword(input.password, existing.password_hash))) throw new Error("PasswordMismatch");
				return { did: existing.did, operation: JSON.parse(existing.genesis), signingKey: existing.signing_did_key, resumed: true };
			}
			const signing = await Secp256k1Keypair.create({ exportable: true });
			const rotation = await Secp256k1Keypair.create({ exportable: true });
			const kem = await P256Keypair.create({ exportable: true });
			const rotationKeys = [...(input.escrowRotationKey ? [input.escrowRotationKey] : []), rotation.did()];
			const operation = await signOperation(
				genesisOperation({ handle: input.handle, pdsEndpoint: input.pdsEndpoint, signingDidKey: signing.did(), rotationKeys, kemDidKey: kem.did() }),
				rotation,
			);
			const did = await didForGenesis(operation);
			const passwordHash = await hashPassword(input.password);
			const signingBytes = await signing.export();
			const rotationBytes = await rotation.export();
			const kemBytes = await kem.export();
			await this.storeKey(did, "signing", signingBytes);
			await this.storeKey(did, "rotation", rotationBytes);
			await this.storeKey(did, "kem", kemBytes);
			signingBytes.fill(0);
			rotationBytes.fill(0);
			kemBytes.fill(0);
			this.ctx.storage.sql.exec(
				"INSERT INTO host_identity VALUES (1,?,?,?,?,?,?,?,?)",
				input.accountId,
				did,
				input.handle,
				signing.did(),
				rotation.did(),
				JSON.stringify(operation),
				passwordHash,
				Date.now(),
			);
			return { did, operation, signingKey: signing.did(), resumed: false };
		});
	}

	/**
	 * Check a password. Failures are counted per account in ten-minute windows;
	 * after ten failures the account refuses password checks until the window
	 * ends. Another account's failures never count here.
	 */
	async checkPassword(expectedDid: string, password: string): Promise<{ ok: boolean; locked: boolean }> {
		const row = this.assertAccount(expectedDid);
		const sql = this.ctx.storage.sql;
		const window = Math.floor(Date.now() / FAILURE_WINDOW_MS);
		sql.exec("DELETE FROM host_password_failures WHERE window < ?", window);
		const failures = sql.exec<{ count: number }>("SELECT count FROM host_password_failures WHERE window = ?", window).toArray()[0]?.count ?? 0;
		if (failures >= FAILURES_PER_WINDOW) return { ok: false, locked: true };
		const ok = typeof password === "string" && password.length <= 256 && (await verifyPassword(password, row.password_hash));
		if (!ok) sql.exec("INSERT INTO host_password_failures VALUES (?,1) ON CONFLICT(window) DO UPDATE SET count = count + 1", window);
		return { ok, locked: false };
	}

	/**
	 * Make a new one-time recovery code and keep only its hash. The code is returned once, to be shown to
	 * the person; any earlier code stops working.
	 */
	async newRecoveryCode(expectedDid: string): Promise<string> {
		const row = this.assertAccount(expectedDid);
		const code = recoveryCode();
		this.ctx.storage.sql.exec(
			"INSERT INTO host_recovery VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET code_hash = excluded.code_hash, created = excluded.created",
			await recoveryHash(row.did, code),
			Date.now(),
		);
		return code;
	}

	/**
	 * Set a new password with the recovery code. Five wrong codes in ten minutes lock this path for the
	 * account until the window ends. On success the code is used up and a new one is returned.
	 */
	async recoverWithCode(expectedDid: string, code: string, password: string): Promise<{ ok: boolean; locked: boolean; code?: string }> {
		const row = this.assertAccount(expectedDid);
		const sql = this.ctx.storage.sql;
		const window = Math.floor(Date.now() / FAILURE_WINDOW_MS);
		sql.exec("DELETE FROM host_recovery_failures WHERE window < ?", window);
		const failures = sql.exec<{ count: number }>("SELECT count FROM host_recovery_failures WHERE window = ?", window).toArray()[0]?.count ?? 0;
		if (failures >= RECOVERY_FAILURES_PER_WINDOW) return { ok: false, locked: true };
		const stored = sql.exec<{ code_hash: string }>("SELECT code_hash FROM host_recovery WHERE id = 1").toArray()[0];
		const ok = !!stored && typeof code === "string" && code.length <= 64 && same(await recoveryHash(row.did, code), stored.code_hash);
		if (!ok) {
			sql.exec("INSERT INTO host_recovery_failures VALUES (?,1) ON CONFLICT(window) DO UPDATE SET count = count + 1", window);
			return { ok: false, locked: false };
		}
		await this.replacePassword(row, password);
		return { ok: true, locked: false, code: await this.newRecoveryCode(expectedDid) };
	}

	/** Set a new password with an operator's reset link. Each link id works once. */
	async recoverWithLink(expectedDid: string, linkId: string, password: string): Promise<{ ok: boolean; code?: string }> {
		const row = this.assertAccount(expectedDid);
		const sql = this.ctx.storage.sql;
		if (sql.exec("SELECT 1 FROM host_used_reset_links WHERE id = ?", linkId).toArray().length) return { ok: false };
		sql.exec("INSERT INTO host_used_reset_links VALUES (?,?)", linkId, Date.now());
		await this.replacePassword(row, password);
		return { ok: true, code: await this.newRecoveryCode(expectedDid) };
	}

	/** New password hash; every refresh session of the account ends, and failed password tries are cleared. */
	private async replacePassword(row: IdentityRow, password: string): Promise<void> {
		if (typeof password !== "string" || password.length < 8 || password.length > 256) throw new Error("InvalidPassword");
		const hash = await hashPassword(password);
		this.ctx.storage.sql.exec("UPDATE host_identity SET password_hash = ? WHERE id = 1 AND did = ?", hash, row.did);
		this.ctx.storage.sql.exec("DELETE FROM host_password_failures");
		this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS strata_refresh_sessions (jti TEXT PRIMARY KEY, expires INTEGER NOT NULL)");
		this.ctx.storage.sql.exec("DELETE FROM strata_refresh_sessions");
	}

	async listPasskeys(expectedDid: string): Promise<{ credential_id: string; public_key: string; counter: number; transports: string; label: string; created: number }[]> {
		this.assertAccount(expectedDid);
		return this.ctx.storage.sql
			.exec("SELECT credential_id, public_key, counter, transports, label, created FROM host_passkeys ORDER BY created DESC")
			.toArray() as unknown as { credential_id: string; public_key: string; counter: number; transports: string; label: string; created: number }[];
	}

	async savePasskeyChallenge(expectedDid: string, challenge: string, kind: "register" | "login", ttlMs = 300_000): Promise<void> {
		this.assertAccount(expectedDid);
		const now = Date.now();
		this.ctx.storage.sql.exec("DELETE FROM host_passkey_challenges WHERE expires < ?", now);
		this.ctx.storage.sql.exec("INSERT OR REPLACE INTO host_passkey_challenges VALUES (?,?,?)", challenge, kind, now + ttlMs);
	}

	async consumePasskeyChallenge(expectedDid: string, challenge: string, kind: "register" | "login"): Promise<boolean> {
		this.assertAccount(expectedDid);
		const now = Date.now();
		const row = this.ctx.storage.sql
			.exec<{ challenge: string }>("SELECT challenge FROM host_passkey_challenges WHERE challenge = ? AND kind = ? AND expires >= ?", challenge, kind, now)
			.toArray()[0];
		this.ctx.storage.sql.exec("DELETE FROM host_passkey_challenges WHERE challenge = ? OR expires < ?", challenge, now);
		return !!row;
	}

	async savePasskey(
		expectedDid: string,
		input: { credentialId: string; publicKey: string; counter: number; transports: string[]; label: string },
	): Promise<void> {
		this.assertAccount(expectedDid);
		const count = this.ctx.storage.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM host_passkeys").one().n;
		if (count >= 10) throw new Error("Maximum 10 passkeys per account");
		this.ctx.storage.sql.exec(
			"INSERT OR REPLACE INTO host_passkeys VALUES (?,?,?,?,?,?)",
			input.credentialId,
			input.publicKey,
			input.counter,
			JSON.stringify(input.transports),
			input.label.slice(0, 80) || "Perangkat ini",
			Date.now(),
		);
	}

	async updatePasskeyCounter(expectedDid: string, credentialId: string, counter: number): Promise<void> {
		this.assertAccount(expectedDid);
		this.ctx.storage.sql.exec("UPDATE host_passkeys SET counter = ? WHERE credential_id = ?", counter, credentialId);
	}

	async deletePasskey(expectedDid: string, credentialId: string): Promise<boolean> {
		this.assertAccount(expectedDid);
		const existing = this.ctx.storage.sql.exec("SELECT 1 FROM host_passkeys WHERE credential_id = ?", credentialId).toArray().length;
		if (!existing) return false;
		this.ctx.storage.sql.exec("DELETE FROM host_passkeys WHERE credential_id = ?", credentialId);
		return true;
	}

	async repoFor(expectedDid: string): Promise<RepoFacet> {
		this.assertAccount(expectedDid);
		return this.repo();
	}

	async accountFor(expectedDid: string): Promise<AccountStore> {
		this.assertAccount(expectedDid);
		return this.account();
	}

	async saveRefresh(expectedDid: string, jti: string, expires: number): Promise<void> {
		this.assertAccount(expectedDid);
		this.saveRefreshSession(jti, expires);
	}

	async rotateRefresh(expectedDid: string, previous: string, next: string, expires: number): Promise<boolean> {
		this.assertAccount(expectedDid);
		return this.rotateRefreshSession(previous, next, expires);
	}

	async revokeRefresh(expectedDid: string, jti: string): Promise<void> {
		this.assertAccount(expectedDid);
		this.revokeRefreshSession(jti);
	}

	/** Revoke every legacy refresh session (deactivation, deletion, sign-out everywhere). */
	async revokeAllRefresh(expectedDid: string): Promise<void> {
		this.assertAccount(expectedDid);
		this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS strata_refresh_sessions (jti TEXT PRIMARY KEY, expires INTEGER NOT NULL)");
		this.ctx.storage.sql.exec("DELETE FROM strata_refresh_sessions");
	}

	/**
	 * Sign a space token or a spaces service JWT for this account (atproto spaces alpha). The key
	 * never leaves this object, and only JWT signing inputs of the space kinds are signed: a space
	 * delegation or credential, or a service JWT bound to a com.atproto.space or simplespace method
	 * and issued by this account. Anything else is refused, so this is not a general signing oracle.
	 */
	async signSpaceJwt(expectedDid: string, signingInput: Uint8Array): Promise<Uint8Array> {
		this.assertAccount(expectedDid);
		const text = new TextDecoder().decode(signingInput);
		const [h, p, extra] = text.split(".");
		if (!h || !p || extra !== undefined) throw new Error("Not a JWT signing input");
		const decode = (part: string) => JSON.parse(new TextDecoder().decode(fromB64url(part))) as Record<string, unknown>;
		const header = decode(h), payload = decode(p);
		const spaceToken = header.typ === "atproto-space-delegation+jwt" || header.typ === "atproto-space-credential+jwt";
		const spaceService = header.typ === "JWT" && typeof payload.lxm === "string" && /^com\.atproto\.(space|memberspace)\./.test(payload.lxm);
		if (header.alg !== "ES256K" || payload.iss !== expectedDid || !(spaceToken || spaceService)) throw new Error("Refused to sign");
		const { signingKey } = await this.loadIdentity();
		const keypair = await Secp256k1Keypair.import(signingKey);
		return keypair.sign(signingInput);
	}

	/** The account's #atproto_kem public key (P-256 did:key), made on first use for older accounts. */
	async spaceKemKey(expectedDid: string): Promise<string> {
		this.assertAccount(expectedDid);
		return (await this.kemKeypair(expectedDid)).did;
	}

	/**
	 * The shared secret for one MAC on a space read (proposal 0016, "Shared secret"): HPKE
	 * export with DHKEM(P-256), derived by the official @atproto/space helper. Only the
	 * derived 32-byte secret leaves this object, never the KEM private key.
	 */
	async spaceKemSecret(expectedDid: string, keyShare: string): Promise<Uint8Array> {
		this.assertAccount(expectedDid);
		const { did, privateKey } = await this.kemKeypair(expectedDid);
		const keypair = { did: () => did, ecdh: (publicKey: Uint8Array) => p256.getSharedSecret(privateKey, publicKey, true).slice(1) };
		return decapsulate(keypair as never, keyShare as `did:${string}:${string}`);
	}

	/**
	 * A PLC update that publishes #atproto_kem for an account made before the KEM key existed.
	 * Keeps every other field of `last`, which must be the directory's newest operation for
	 * this DID, and is signed with the host rotation key, which must still be listed in it.
	 */
	async kemPlcUpdate(expectedDid: string, last: SignedPlcOperation): Promise<SignedPlcOperation | null> {
		const row = this.assertAccount(expectedDid);
		const { did } = await this.kemKeypair(expectedDid);
		if (last.verificationMethods?.atproto_kem === did) return null;
		if (!last.rotationKeys.includes(row.rotation_did_key)) throw new Error("The host rotation key is no longer listed");
		const rotation = await Secp256k1Keypair.import(await this.loadKey(row.did, "rotation"));
		return signOperation(withVerificationMethod(last, await operationCid(last), "atproto_kem", did), rotation);
	}

	/** Move to a new host name: the same DID document with the PDS service at `endpoint`, signed by the host's rotation key. */
	async servicePlcUpdate(expectedDid: string, last: SignedPlcOperation, endpoint: string): Promise<SignedPlcOperation | null> {
		const row = this.assertAccount(expectedDid);
		if (last.services?.atproto_pds?.endpoint === endpoint) return null;
		if (!last.rotationKeys.includes(row.rotation_did_key)) throw new Error("The host rotation key is no longer listed");
		const rotation = await Secp256k1Keypair.import(await this.loadKey(row.did, "rotation"));
		return signOperation(withServiceEndpoint(last, await operationCid(last), endpoint), rotation);
	}

	private async kemKeypair(did: string): Promise<{ did: string; privateKey: Uint8Array }> {
		const stored = this.ctx.storage.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM account_keys WHERE purpose = 'kem'").one().n;
		if (!stored) {
			const fresh = await P256Keypair.create({ exportable: true });
			const bytes = await fresh.export();
			await this.storeKey(did, "kem", bytes);
			bytes.fill(0);
		}
		const privateKey = await this.loadKey(did, "kem");
		const keypair = await P256Keypair.import(privateKey);
		return { did: keypair.did(), privateKey };
	}

	async setActive(expectedDid: string, active: boolean): Promise<void> {
		this.assertAccount(expectedDid);
		const repo = await this.repo();
		if (active) await repo.activateAccount();
		else await repo.deactivateAccount();
	}

	/** Public facts only: DID, handle, public keys and the genesis operation. */
	async publicIdentity(expectedDid: string): Promise<{ did: string; handle: string; signingKey: string; rotationKey: string; genesis: SignedPlcOperation }> {
		const row = this.assertAccount(expectedDid);
		return { did: row.did, handle: row.handle, signingKey: row.signing_did_key, rotationKey: row.rotation_did_key, genesis: JSON.parse(row.genesis) };
	}

	/**
	 * Delete everything this object holds and leave a tombstone, so the
	 * object can never be provisioned or read again. Idempotent.
	 */
	async purge(expectedDid: string): Promise<void> {
		this.hostSchema();
		if (this.tombstoned()) return;
		this.assertAccount(expectedDid);
		await this.ctx.storage.deleteAlarm();
		await this.ctx.storage.deleteAll();
		this.hostSchemaReady = false;
		this.signingKeyHex = null;
		this.hostSchema();
		this.ctx.storage.sql.exec("INSERT INTO host_tombstone VALUES (1, ?, ?)", expectedDid, Date.now());
	}

	override async alarm(): Promise<void> {
		if (!this.identityRow() || this.tombstoned()) return;
		await super.alarm();
	}

	override async fetch(request: Request): Promise<Response> {
		try {
			// x-strata-expected-did: the header's name before the rename, kept for a request from the previous release.
			this.assertAccount(request.headers.get("x-etnos-expected-did") ?? request.headers.get("x-strata-expected-did") ?? "");
		} catch {
			return new Response("Not found", { status: 404 });
		}
		return super.fetch(request);
	}
}

