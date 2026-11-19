/**
 * The seams between the identity host and the runtime it runs on. The host code depends on
 * these shapes, not on Cloudflare products, so the same code can run on Cloudflare Workers
 * (D1, Durable Objects, R2) and on plain workerd in a container, where the directory lives in
 * a Durable Object on local disk (directory-do.ts).
 *
 * - SqlDatabase: the subset of the D1 API the directory uses. D1 satisfies it as is.
 * - Account and auth state: SQLite-backed Durable Objects, which workerd also runs on local disk.
 * - Blobs: the R2 bucket binding. Optional; see the self-hosting plan for the local path.
 * - Runtime: fetch (PLC directory, identity resolution), alarms and secrets come from the
 *   Workers runtime API, which workerd implements.
 */
export interface SqlResult<T = Record<string, unknown>> {
	results: T[];
	meta: { changes: number };
}

export interface SqlStatement {
	bind(...values: unknown[]): SqlStatement;
	first<T = Record<string, unknown>>(): Promise<T | null>;
	all<T = Record<string, unknown>>(): Promise<SqlResult<T>>;
	run(): Promise<SqlResult>;
}

export interface SqlDatabase {
	prepare(sql: string): SqlStatement;
	/** Runs every statement in one transaction; all or none. */
	batch(statements: SqlStatement[]): Promise<SqlResult[]>;
}
