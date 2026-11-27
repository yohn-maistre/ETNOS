/**
 * Signed links between an ETNOS node and its identity host. Both sides hold one shared secret
 * (the node's ETNOS_IDENTITY_HOST_LINK_KEY and this host's NODE_LINK_KEY, the same 32 random bytes,
 * base64url). The node signs; the host checks. Nothing else crosses: the node never holds the host's
 * operator token, and the key can only make the two kinds of grant below.
 *
 * - "ig1" (invite): the node checked one of its own invitation links and lets the host make at most
 *   `n` accounts for it. The host records each slot as an ordinary invite row, so every slot is used
 *   once, exactly like an invite code from /admin/invites.
 * - "rg1" (reset): the node's operator lets the person who holds the link set a new password for one
 *   handle, once, before the link expires.
 *
 * Self-contained (WebCrypto only) so the node's tests can check that both sides agree.
 */

export type InviteGrant = { kind: "invite"; id: string; slots: number; inviteExpires: number; expires: number };
export type ResetGrant = { kind: "reset"; id: string; handle: string; expires: number };
export type LinkGrant = InviteGrant | ResetGrant;

const PREFIX = { invite: "ig1", reset: "rg1" } as const;

function b64url(bytes: Uint8Array): string {
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(text: string): Uint8Array {
	const s = atob(text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4));
	return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** A usable key is exactly 32 bytes in base64url. Anything else turns grants off. */
export function linkKeyBytes(key: string | undefined): Uint8Array | null {
	if (!key || !/^[A-Za-z0-9_-]{43}$/.test(key)) return null;
	const bytes = fromB64url(key);
	return bytes.length === 32 ? bytes : null;
}

async function mac(key: Uint8Array, message: string): Promise<string> {
	const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message))));
}

function same(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export async function signGrant(key: string, grant: LinkGrant): Promise<string> {
	const bytes = linkKeyBytes(key);
	if (!bytes) throw new Error("Link key must be 32 bytes in base64url");
	const body =
		grant.kind === "invite"
			? { i: grant.id, n: grant.slots, e: grant.inviteExpires, x: grant.expires }
			: { i: grant.id, h: grant.handle, x: grant.expires };
	const prefix = PREFIX[grant.kind];
	const payload = b64url(new TextEncoder().encode(JSON.stringify(body)));
	return `${prefix}.${payload}.${await mac(bytes, `etnos-link/${prefix}:${payload}`)}`;
}

/** The grant, if the signature holds and it has not expired; otherwise null. */
export async function readGrant(key: string | undefined, text: unknown, now: number): Promise<LinkGrant | null> {
	const bytes = linkKeyBytes(key);
	if (!bytes || typeof text !== "string" || text.length > 600) return null;
	const m = /^(ig1|rg1)\.([A-Za-z0-9_-]{8,500})\.([A-Za-z0-9_-]{43})$/.exec(text.trim());
	if (!m) return null;
	const [, prefix, payload, signature] = m as unknown as [string, "ig1" | "rg1", string, string];
	if (!same(signature, await mac(bytes, `etnos-link/${prefix}:${payload}`))) return null;
	let body: Record<string, unknown>;
	try {
		body = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
	} catch {
		return null;
	}
	const expires = Number(body.x);
	if (!Number.isFinite(expires) || expires <= now || typeof body.i !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(body.i)) return null;
	if (prefix === "ig1") {
		const slots = Number(body.n), inviteExpires = Number(body.e);
		if (!Number.isInteger(slots) || slots < 1 || slots > 20 || !Number.isFinite(inviteExpires) || inviteExpires <= now) return null;
		return { kind: "invite", id: body.i, slots, inviteExpires, expires };
	}
	if (typeof body.h !== "string" || body.h.length > 253 || !body.h.includes(".")) return null;
	return { kind: "reset", id: body.i, handle: body.h.toLowerCase(), expires };
}
