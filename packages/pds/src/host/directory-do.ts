/**
 * The account directory as a SQLite-backed Durable Object, for runtimes without D1 (plain
 * workerd on a community's own machine). Same schema and same statements as the D1 directory:
 * the edge talks to it through `SqlDatabase`, so directory.ts does not change.
 *
 * One object holds the whole directory. Its storage is a single SQLite file, and its input gate
 * serialises requests, so a batch is atomic exactly as a D1 batch is.
 */
import { DurableObject } from "cloudflare:workers";
import schema from "./directory-schema.ts";
import type { SqlDatabase, SqlResult, SqlStatement } from "./ports.ts";

type Mode = "first" | "all" | "run";
type Call = { sql: string; params: unknown[] };

export class DirectoryDurableObject extends DurableObject<Record<string, unknown>> {
	constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			for (const statement of schema.replace(/--[^\n]*\n/g, "\n").split(";").map((s) => s.trim()).filter(Boolean))
				ctx.storage.sql.exec(statement);
		});
	}

	private exec({ sql, params }: Call): SqlResult {
		const results = this.ctx.storage.sql.exec(sql, ...(params as SqlStorageValue[])).toArray();
		const changes = /^\s*(insert|update|delete|replace)\b/i.test(sql)
			? Number(this.ctx.storage.sql.exec("SELECT changes() AS c").one().c)
			: 0;
		return { results, meta: { changes } };
	}

	async query(call: Call, mode: Mode): Promise<SqlResult | Record<string, unknown> | null> {
		const out = this.exec(call);
		return mode === "first" ? (out.results[0] ?? null) : out;
	}

	async batch(calls: Call[]): Promise<SqlResult[]> {
		return this.ctx.storage.transactionSync(() => calls.map((c) => this.exec(c)));
	}
}

type DirectoryStub = DurableObjectStub<DirectoryDurableObject>;

class Statement implements SqlStatement {
	constructor(
		private readonly stub: DirectoryStub,
		readonly call: Call,
	) {}
	bind(...values: unknown[]): SqlStatement {
		return new Statement(this.stub, { sql: this.call.sql, params: values });
	}
	async first<T>(): Promise<T | null> {
		return (await this.stub.query(this.call, "first")) as T | null;
	}
	async all<T>(): Promise<SqlResult<T>> {
		return (await this.stub.query(this.call, "all")) as unknown as SqlResult<T>;
	}
	async run(): Promise<SqlResult> {
		return (await this.stub.query(this.call, "run")) as unknown as SqlResult;
	}
}

/** A `SqlDatabase` backed by the directory object. */
export function directoryOverDurableObject(ns: DurableObjectNamespace<DirectoryDurableObject>): SqlDatabase {
	const stub = ns.get(ns.idFromName("directory"));
	return {
		prepare: (sql) => new Statement(stub, { sql, params: [] }),
		batch: async (statements) => (await stub.batch(statements.map((s) => (s as Statement).call))) as SqlResult[],
	};
}
