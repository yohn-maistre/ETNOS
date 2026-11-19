/**
 * Account lifecycle for the identity host: create (invite → handle claim →
 * keys and genesis inside the account object → PLC registration), deactivate,
 * reactivate and delete. Each step is recorded so a crash resumes instead of
 * repeating (plan §4 step 3); PLC outcomes are reconciled, never blindly
 * retried (AGENTS.md).
 */
import { derive, hmac, parseKek } from "./crypto.ts";
import { Directory, inviteHash, type AccountRow } from "./directory.ts";
import { directoryOverDurableObject } from "./directory-do.ts";
import type { HostEnv } from "./env.ts";
import { checkHandle } from "./handles.ts";
import { registerGenesis } from "./plc.ts";

export type Failure = { ok: false; status: number; error: string; message: string };
export type Created = { ok: true; did: string; handle: string; row: AccountRow };

const fail = (status: number, error: string, message: string): Failure => ({ ok: false, status, error, message });

export class Host {
	readonly dir: Directory;
	constructor(readonly env: HostEnv) {
		this.dir = new Directory(env.DIRECTORY ?? directoryOverDurableObject(env.DIRECTORY_DO!));
	}

	get origin() {
		return `https://${this.env.PDS_HOSTNAME}`;
	}

	get displayName() {
		return this.env.HOST_DISPLAY_NAME || this.env.HANDLE_DOMAIN;
	}

	account(row: Pick<AccountRow, "account_id">) {
		return this.env.ACCOUNT.get(this.env.ACCOUNT.idFromName("account:" + row.account_id));
	}

	hub() {
		return this.env.AUTH_HUB.get(this.env.AUTH_HUB.idFromName("auth-hub"));
	}

	/** A host-level secret for one purpose, derived from the KEK. */
	hostKey(purpose: string): Promise<Uint8Array> {
		return derive(parseKek(this.env.ACCOUNT_KEK_V1), "host", purpose);
	}

	/** Spend one unit of a per-address budget. Addresses are keyed by HMAC, never stored raw. */
	async spend(request: Request, scope: string, limit: number): Promise<boolean> {
		const address = request.headers.get("cf-connecting-ip") ?? "unavailable";
		const key = await hmac(await this.hostKey("throttle/v1"), scope + ":" + address);
		return this.hub().consume(scope, key, limit, Date.now());
	}

	async createAccount(input: { code: unknown; handle: unknown; password: unknown }): Promise<Created | Failure> {
		if (typeof input.code !== "string" || !/^[A-Za-z0-9_-]{16,100}$/.test(input.code.trim()))
			return fail(400, "InvalidInviteCode", "Kode undangan tidak berlaku atau sudah dipakai.");
		if (typeof input.handle !== "string") return fail(400, "InvalidHandle", "Nama akun wajib diisi.");
		const checked = checkHandle(input.handle, this.env.HANDLE_DOMAIN);
		if (!checked.ok) return fail(400, "InvalidHandle", checked.reason);
		if (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 256)
			return fail(400, "InvalidPassword", "Kata sandi minimal 8 karakter.");
		const code = input.code.trim(), hash = await inviteHash(code), now = Date.now();

		let row = await this.dir.byInvite(hash);
		if (row) {
			// Resume only the same registration: same invite, same name, still pending.
			if (row.status !== "pending" || row.handle !== checked.handle)
				return fail(400, "InvalidInviteCode", "Kode undangan tidak berlaku atau sudah dipakai.");
		} else {
			const accountId = crypto.randomUUID();
			const claim = await this.dir.claim(accountId, checked.handle, hash, now);
			if (claim === "handle-taken") return fail(400, "HandleNotAvailable", "Nama ini sudah dipakai. Pilih nama lain.");
			if (claim === "invite-invalid") return fail(400, "InvalidInviteCode", "Kode undangan tidak berlaku atau sudah dipakai.");
			row = (await this.dir.byInvite(hash))!;
			if (row.account_id !== accountId) return fail(400, "InvalidInviteCode", "Kode undangan tidak berlaku atau sudah dipakai.");
			await this.dir.audit("signup", "account.claim", row.handle, now);
		}

		let provisioned;
		try {
			provisioned = await this.account(row).provision({
				accountId: row.account_id,
				handle: row.handle,
				password: input.password,
				pdsEndpoint: this.origin,
				escrowRotationKey: this.env.ESCROW_ROTATION_KEY,
			});
		} catch {
			return fail(400, "InvalidInviteCode", "Kode undangan tidak berlaku atau sudah dipakai.");
		}
		await this.dir.setDid(row.account_id, provisioned.did, provisioned.signingKey, Date.now());

		const outcome = await registerGenesis(this.env.PLC_URL, provisioned.did, provisioned.operation);
		if (outcome.state === "uncertain")
			return fail(503, "RegistrationIncomplete", "Pendaftaran belum selesai. Coba lagi dengan kode undangan dan nama yang sama.");
		if (outcome.state === "rejected") {
			await this.dir.audit("signup", "account.plc-rejected", provisioned.did, Date.now());
			return fail(502, "RegistrationFailed", "Pendaftaran ditolak oleh direktori identitas. Hubungi pengurus.");
		}
		await this.dir.transition(row.account_id, ["pending"], "active", Date.now());
		await this.dir.audit("signup", "account.active", provisioned.did, Date.now());
		const fresh = (await this.dir.byDid(provisioned.did))!;
		return { ok: true, did: provisioned.did, handle: fresh.handle, row: fresh };
	}

	async deactivate(row: AccountRow): Promise<boolean> {
		if (!(await this.dir.transition(row.account_id, ["active"], "deactivated", Date.now(), true))) return false;
		await this.hub().revokeSubject(row.did!);
		const account = this.account(row);
		await account.revokeAllRefresh(row.did!);
		await account.setActive(row.did!, false);
		await this.dir.audit(row.did!, "account.deactivate", row.did, Date.now());
		return true;
	}

	async reactivate(row: AccountRow): Promise<boolean> {
		if (!(await this.dir.transition(row.account_id, ["deactivated"], "active", Date.now()))) return false;
		await this.account(row).setActive(row.did!, true);
		await this.dir.audit(row.did!, "account.activate", row.did, Date.now());
		return true;
	}

	/**
	 * Delete an account. The directory row moves to "deleting" first, which
	 * stops every route at the edge; then OAuth rows, the account object and
	 * blobs are purged; then the row becomes "deleted" and keeps its handle so
	 * nobody else can take the name. Every step is idempotent, so a crash is
	 * finished by running this again.
	 */
	async delete(row: AccountRow, actor: string): Promise<void> {
		const did = row.did!;
		await this.dir.transition(row.account_id, ["active", "deactivated", "takendown", "deleting"], "deleting", Date.now(), true);
		await this.hub().purgeSubject(did);
		await this.account(row).purge(did);
		if (this.env.BLOBS) {
			let cursor: string | undefined;
			do {
				const listed = await this.env.BLOBS.list({ prefix: `${did}/`, cursor });
				if (listed.objects.length) await this.env.BLOBS.delete(listed.objects.map((o) => o.key));
				cursor = listed.truncated ? listed.cursor : undefined;
			} while (cursor);
		}
		await this.dir.transition(row.account_id, ["deleting"], "deleted", Date.now());
		await this.dir.audit(actor, "account.delete", did, Date.now());
	}
}
