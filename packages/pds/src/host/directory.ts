/**
 * The account directory in D1 (plan §2.1): handle → DID → account object,
 * invites and status. The edge reads it before waking any account object, so
 * made-up DIDs and deleted accounts never reach a Durable Object.
 */
import { sha256Hex } from "./crypto.ts";
import type { SqlDatabase } from "./ports.ts";

export type AccountStatus = "pending" | "active" | "deactivated" | "takendown" | "deleting" | "deleted";

export interface AccountRow {
	account_id: string;
	did: string | null;
	signing_key: string | null;
	handle: string;
	status: AccountStatus;
	invite_hash: string;
	session_epoch: number;
	created: number;
	updated: number;
}

export const inviteHash = (code: string) => sha256Hex("invite:" + code);

export class Directory {
	constructor(private db: SqlDatabase) {}

	byDid(did: string): Promise<AccountRow | null> {
		return this.db.prepare("SELECT * FROM accounts WHERE did = ?").bind(did).first<AccountRow>();
	}

	byHandle(handle: string): Promise<AccountRow | null> {
		return this.db.prepare("SELECT * FROM accounts WHERE handle = ?").bind(handle.toLowerCase()).first<AccountRow>();
	}

	byInvite(hash: string): Promise<AccountRow | null> {
		return this.db.prepare("SELECT * FROM accounts WHERE invite_hash = ?").bind(hash).first<AccountRow>();
	}

	/** Look up by DID or handle; only accounts that have a DID. */
	async resolve(actor: string): Promise<AccountRow | null> {
		if (!actor || actor.length > 253) return null;
		const row = actor.startsWith("did:") ? await this.byDid(actor) : await this.byHandle(actor);
		return row?.did ? row : null;
	}

	async listActive(limit: number, cursor?: string): Promise<AccountRow[]> {
		const result = await this.db
			.prepare("SELECT * FROM accounts WHERE status = 'active' AND did IS NOT NULL AND did > ? ORDER BY did LIMIT ?")
			.bind(cursor ?? "", limit)
			.all<AccountRow>();
		return result.results;
	}

	async listAll(limit: number): Promise<AccountRow[]> {
		return (await this.db.prepare("SELECT * FROM accounts ORDER BY created DESC LIMIT ?").bind(limit).all<AccountRow>()).results;
	}

	/**
	 * Claim a handle with an invite in one transaction. Exactly one of any
	 * number of concurrent claims on the same handle or the same invite wins
	 * (UNIQUE constraints inside one D1 batch).
	 */
	async claim(accountId: string, handle: string, hash: string, now: number): Promise<"claimed" | "handle-taken" | "invite-invalid"> {
		try {
			const [insert] = await this.db.batch([
				this.db
					.prepare(
						"INSERT INTO accounts (account_id, handle, status, invite_hash, created, updated) SELECT ?, ?, 'pending', ?, ?, ? WHERE EXISTS (SELECT 1 FROM invites WHERE hash = ? AND used_by IS NULL AND revoked = 0 AND expires > ?)",
					)
					.bind(accountId, handle, hash, now, now, hash, now),
				this.db.prepare("UPDATE invites SET used_by = ?, used_at = ? WHERE hash = ? AND used_by IS NULL").bind(accountId, now, hash),
			]);
			return insert!.meta.changes === 1 ? "claimed" : "invite-invalid";
		} catch (error) {
			const message = String(error);
			if (message.includes("accounts.handle")) return "handle-taken";
			if (message.includes("accounts.invite_hash")) return "invite-invalid";
			throw error;
		}
	}

	async setDid(accountId: string, did: string, signingKey: string, now: number): Promise<void> {
		await this.db
			.prepare("UPDATE accounts SET did = ?, signing_key = ?, updated = ? WHERE account_id = ? AND (did IS NULL OR did = ?)")
			.bind(did, signingKey, now, accountId, did)
			.run();
	}

	/** Move between states only from the listed ones; returns whether it moved. */
	async transition(accountId: string, from: AccountStatus[], to: AccountStatus, now: number, bumpSessions = false): Promise<boolean> {
		const marks = from.map(() => "?").join(",");
		const result = await this.db
			.prepare(
				`UPDATE accounts SET status = ?, updated = ?${bumpSessions ? ", session_epoch = session_epoch + 1" : ""} WHERE account_id = ? AND status IN (${marks})`,
			)
			.bind(to, now, accountId, ...from)
			.run();
		return result.meta.changes === 1;
	}

	async bumpSessions(accountId: string, now: number): Promise<void> {
		await this.db.prepare("UPDATE accounts SET session_epoch = session_epoch + 1, updated = ? WHERE account_id = ?").bind(now, accountId).run();
	}

	async createInvite(code: string, expires: number, note: string | null, now: number): Promise<void> {
		await this.db.prepare("INSERT INTO invites (hash, created, expires, note) VALUES (?,?,?,?)").bind(await inviteHash(code), now, expires, note).run();
	}

	async revokeInvite(code: string): Promise<boolean> {
		const result = await this.db.prepare("UPDATE invites SET revoked = 1 WHERE hash = ? AND used_by IS NULL").bind(await inviteHash(code)).run();
		return result.meta.changes === 1;
	}

	async audit(actor: string, action: string, subject: string | null, now: number): Promise<void> {
		await this.db.prepare("INSERT INTO audit (at, actor, action, subject) VALUES (?,?,?,?)").bind(now, actor, action, subject).run();
	}
}
