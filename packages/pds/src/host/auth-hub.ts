/**
 * One auth hub object for the whole host (plan §2.1). OAuth pushed requests,
 * codes and tokens are stored under random strings that do not say which
 * account they belong to, so they live in one shared store; every token row
 * carries its account in `sub`, and deletion purges by `sub`.
 *
 * Also holds the per-address sign-in budget (pseudonymous keys, no raw IPs).
 * Strata code (AGPL-3.0-only) reusing the attributed Cirrus OAuth storage.
 */
import { DurableObject } from "cloudflare:workers";
import { SqliteOAuthStorage } from "../upstream/oauth-storage";
import type { HostEnv } from "./env.ts";

export class AuthHubDurableObject extends DurableObject<HostEnv> {
	private storage: SqliteOAuthStorage | null = null;

	private oauth(): SqliteOAuthStorage {
		if (!this.storage) {
			this.storage = new SqliteOAuthStorage(this.ctx.storage.sql);
			this.storage.initSchema();
		}
		return this.storage;
	}

	async store(): Promise<SqliteOAuthStorage> {
		return this.oauth();
	}

	/** Remove every OAuth code and token for one account. */
	async purgeSubject(sub: string): Promise<void> {
		this.oauth();
		const sql = this.ctx.storage.sql;
		sql.exec("DELETE FROM oauth_tokens WHERE sub = ?", sub);
		sql.exec("DELETE FROM oauth_auth_codes WHERE sub = ?", sub);
	}

	/** Revoke every OAuth token for one account (deactivation). */
	async revokeSubject(sub: string): Promise<void> {
		await this.oauth().revokeAllTokens(sub);
	}

	/** Count live OAuth tokens for one account (tests and the status page). */
	async liveTokens(sub: string): Promise<number> {
		this.oauth();
		return this.ctx.storage.sql
			.exec<{ n: number }>("SELECT count(*) AS n FROM oauth_tokens WHERE sub = ? AND revoked = 0", sub)
			.toArray()[0]!.n;
	}

	/**
	 * Per-address budget for password and sign-up attempts: `limit` per
	 * ten-minute window for each key. There is no host-wide cap on sign-in, so
	 * one address cannot lock everyone out; sign-up has its own scope.
	 */
	async consume(scope: string, key: string, limit: number, now: number): Promise<boolean> {
		if (!/^[a-z-]{1,20}$/.test(scope) || !/^[A-Za-z0-9_-]{20,64}$/.test(key) || !Number.isInteger(limit) || limit < 1) return false;
		const sql = this.ctx.storage.sql;
		return this.ctx.storage.transactionSync(() => {
			sql.exec("CREATE TABLE IF NOT EXISTS host_budget (scope TEXT NOT NULL, key TEXT NOT NULL, window INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (scope, key))");
			const window = Math.floor(now / 600000);
			sql.exec("DELETE FROM host_budget WHERE window < ?", window);
			const used = sql.exec<{ count: number }>("SELECT count FROM host_budget WHERE scope = ? AND key = ?", scope, key).toArray()[0]?.count ?? 0;
			if (used >= limit) return false;
			sql.exec(
				"INSERT INTO host_budget VALUES (?,?,?,1) ON CONFLICT(scope, key) DO UPDATE SET count = count + 1",
				scope,
				key,
				window,
			);
			return true;
		});
	}

	override async alarm(): Promise<void> {
		this.oauth().cleanup();
	}
}
