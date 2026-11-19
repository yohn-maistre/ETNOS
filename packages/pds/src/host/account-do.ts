/**
 * One Durable Object per hosted account (plan §2.1). Strata code
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
	parseKek,
	unwrapSecret,
	verifyPassword,
	wrapSecret,
	type WrappedSecret,
} from "./crypto.ts";
import { didForGenesis, genesisOperation, operationCid, signOperation, withVerificationMethod, type SignedPlcOperation } from "./plc.ts";
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
			this.assertAccount(request.headers.get("x-strata-expected-did") ?? "");
		} catch {
			return new Response("Not found", { status: 404 });
		}
		return super.fetch(request);
	}
}

