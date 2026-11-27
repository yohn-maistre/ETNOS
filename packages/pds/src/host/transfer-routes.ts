/**
 * The two operator routes that move every account to another host. The file format, the
 * refusals and the write order are described in transfer.ts. ETNOS code (AGPL-3.0-only).
 */
import type { AccountRow } from "./directory.ts";
import type { Host } from "./service.ts";
import { exportAccountSpaces, importAccountSpaces } from "./spaces.ts";
import {
	DIRECTORY_COPY,
	HOST_STATE_SCHEMA,
	TRANSFER_FORMAT,
	TRANSFER_FORMAT_VERSION,
	gzip,
	openFile,
	sealFile,
	transferKey,
	type Cell,
	type Table,
	type TransferAccount,
	type TransferHeader,
} from "./transfer.ts";

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const xerr = (status: number, error: string, message: string) => json(status, { error, message });
const NO_KEY = "ACCOUNT_TRANSFER_KEY is not set on this host (32 random bytes, base64url)";

function toTable(rows: Record<string, unknown>[], columns: string[]): Table {
	return { columns, rows: rows.map((r) => columns.map((c) => (r[c] ?? null) as Cell)) };
}

const DIRECTORY_COLUMNS: Record<(typeof DIRECTORY_COPY)[number], string[]> = {
	accounts: ["account_id", "did", "signing_key", "handle", "status", "invite_hash", "session_epoch", "created", "updated"],
	invites: ["hash", "created", "expires", "note", "used_by", "used_at", "revoked"],
	audit: ["id", "at", "actor", "action", "subject"],
};

async function listBlobs(host: Host, did: string): Promise<TransferAccount["blobs"]> {
	const out: TransferAccount["blobs"] = [];
	if (!host.env.BLOBS) return out;
	let cursor: string | undefined;
	do {
		const listed = await host.env.BLOBS.list({ prefix: `${did}/`, cursor });
		for (const o of listed.objects) out.push({ key: o.key, size: o.size, etag: o.etag });
		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor);
	return out;
}

/** POST /admin/accounts/export (operator only). */
export async function exportAccounts(host: Host): Promise<Response> {
	const transfer = transferKey(host.env);
	if (!transfer) return xerr(503, "TransferKeyMissing", NO_KEY);
	const directory = await host.dir.dumpAll();
	const rows = directory.accounts as unknown as AccountRow[];
	if (rows.some((r) => r.status === "deleting")) return xerr(409, "DeletionInProgress", "Finish the account deletions in progress, then export");
	const accounts: TransferAccount[] = [];
	for (const row of rows) {
		// A deleted account keeps only its directory row (the handle stays taken); a pending one may have no keys yet.
		if (!row.did || row.status === "deleted") continue;
		let state: TransferAccount["account"];
		try {
			state = await host.account(row).exportForTransfer(row.did);
		} catch (error) {
			if (row.status === "pending") continue;
			throw error;
		}
		accounts.push({
			account_id: row.account_id,
			did: row.did,
			account: state,
			spaces: await exportAccountSpaces(host.env, row.did),
			blobs: await listBlobs(host, row.did),
		});
	}
	const now = new Date();
	const header: TransferHeader = {
		format: TRANSFER_FORMAT,
		formatVersion: TRANSFER_FORMAT_VERSION,
		schemaVersion: HOST_STATE_SCHEMA,
		createdAt: now.toISOString(),
		source: host.env.PDS_HOSTNAME,
		accounts: accounts.length,
	};
	const file = await sealFile(transfer, header, {
		directory: {
			accounts: toTable(directory.accounts, DIRECTORY_COLUMNS.accounts),
			invites: toTable(directory.invites, DIRECTORY_COLUMNS.invites),
			audit: toTable(directory.audit, DIRECTORY_COLUMNS.audit),
		},
		accounts,
	});
	await host.dir.audit("operator", "accounts.export", String(accounts.length), now.getTime());
	const stamp = header.createdAt.replace(/[-:]/g, "").replace(/\..*$/, "");
	return new Response(await gzip(new TextEncoder().encode(JSON.stringify(file))), {
		headers: {
			"content-type": "application/gzip",
			"content-disposition": `attachment; filename="etnos-host-accounts-${stamp}.json.gz"`,
			"cache-control": "no-store",
		},
	});
}

/** POST /admin/accounts/import (operator only, on an empty host). */
export async function importAccounts(host: Host, request: Request): Promise<Response> {
	const transfer = transferKey(host.env);
	if (!transfer) return xerr(503, "TransferKeyMissing", NO_KEY);
	if ((await host.dir.countAccounts()) > 0) return xerr(409, "HostNotEmpty", "This host already holds accounts; import runs only on an empty host");
	const opened = await openFile(transfer, new Uint8Array(await request.arrayBuffer()));
	if (!opened.ok) return xerr(opened.status, opened.error, opened.message);
	const { payload } = opened;
	const dirAccounts = payload.directory.accounts;
	if (!dirAccounts) return xerr(400, "NotAnExport", "The export has no directory");
	const didOf = new Map(dirAccounts.rows.map((r) => [r[dirAccounts.columns.indexOf("account_id")], r[dirAccounts.columns.indexOf("did")]]));
	for (const a of payload.accounts) if (didOf.get(a.account_id) !== a.did) return xerr(400, "NotAnExport", "An account does not match its directory row");

	// 1 and 2: the account objects and their spaces. Unreachable until the directory is written.
	let accountRows = 0, spaceRows = 0;
	for (const a of payload.accounts) {
		const stub = host.account({ account_id: a.account_id });
		accountRows += await stub.importFromTransfer({ accountId: a.account_id, did: a.did, tables: a.account });
		if (a.spaces) spaceRows += await importAccountSpaces(host.env, a.did, a.spaces);
	}

	// 3: the directory in one batch. Session epochs move up by one, so no token from the old host works here.
	const epoch = dirAccounts.columns.indexOf("session_epoch");
	const tables = DIRECTORY_COPY.filter((name) => payload.directory[name]).map((name) => {
		const t = payload.directory[name]!;
		return { name, columns: t.columns, rows: name === "accounts" && epoch >= 0 ? t.rows.map((r) => r.map((c, i) => (i === epoch ? Number(c) + 1 : c))) : t.rows };
	});
	if ((await host.dir.countAccounts()) > 0) return xerr(409, "HostNotEmpty", "An account appeared on this host during the import; nothing was added to the directory");
	const directoryRowsWritten = await host.dir.insertAll(tables);
	const now = Date.now();
	await host.dir.audit("operator", "accounts.import", `${payload.accounts.length} from ${opened.header.source}`, now);

	// Blobs are copied bucket to bucket; count which listed blobs this host can already see.
	let listed = 0, present = 0;
	for (const a of payload.accounts) {
		if (!a.blobs.length) continue;
		listed += a.blobs.length;
		if (!host.env.BLOBS) continue;
		const here = new Set<string>();
		let cursor: string | undefined;
		do {
			const page = await host.env.BLOBS.list({ prefix: `${a.did}/`, cursor });
			for (const o of page.objects) here.add(o.key);
			cursor = page.truncated ? page.cursor : undefined;
		} while (cursor);
		present += a.blobs.filter((b) => here.has(b.key)).length;
	}
	return json(200, {
		accounts: dirAccounts.rows.length,
		accountObjects: payload.accounts.length,
		source: opened.header.source,
		exportedAt: opened.header.createdAt,
		rows: {
			directory: directoryRowsWritten,
			accountObjects: accountRows,
			spaces: spaceRows,
		},
		blobs: { listed, present },
	});
}
