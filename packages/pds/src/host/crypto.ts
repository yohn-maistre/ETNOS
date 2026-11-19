/**
 * Strata identity host: small cryptographic helpers built on WebCrypto.
 * Runs unchanged in workerd and in Node (tests). AGPL-3.0-only, Strata code.
 *
 * Key custody (plan §2.3): one host secret, the KEK, never leaves the
 * Workers secret store. Every per-account secret is derived from it with
 * HKDF, salted by the account's DID, so no per-account secret is stored.
 */

const enc = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(text: string): Uint8Array {
	if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error("Invalid base64url");
	const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
	const bin = atob(padded);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

export function hex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(text: string): Uint8Array {
	if (!/^(?:[0-9a-f]{2})*$/.test(text)) throw new Error("Invalid hex");
	const out = new Uint8Array(text.length / 2);
	for (let i = 0; i < out.length; i++) out[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16);
	return out;
}

/** Copy into a fresh ArrayBuffer-backed view (WebCrypto rejects shared or offset views in some runtimes). */
function buf(bytes: Uint8Array): ArrayBuffer {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
}

export function randomBytes(n: number): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(n));
}

export function randomToken(n = 32): string {
	return b64url(randomBytes(n));
}

export async function sha256(data: Uint8Array | string): Promise<Uint8Array> {
	const bytes = typeof data === "string" ? enc.encode(data) : data;
	return new Uint8Array(await crypto.subtle.digest("SHA-256", buf(bytes)));
}

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
	return hex(await sha256(data));
}

/** Constant-time comparison of two strings of possibly different length. */
export function equal(a: string, b: string): boolean {
	const x = enc.encode(a), y = enc.encode(b);
	let diff = x.length ^ y.length;
	for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
	return diff === 0;
}

/** Parse the KEK secret: 32 random bytes, base64url. Fails closed on anything else. */
export function parseKek(secret: string | undefined): Uint8Array {
	if (!secret) throw new Error("ACCOUNT_KEK_V1 is not configured");
	const bytes = fromB64url(secret.trim());
	if (bytes.length !== 32) throw new Error("ACCOUNT_KEK_V1 must be 32 bytes, base64url");
	return bytes;
}

/** HKDF-SHA256(KEK, salt, info) → 32 bytes. */
export async function derive(kek: Uint8Array, salt: string, info: string): Promise<Uint8Array> {
	const base = await crypto.subtle.importKey("raw", buf(kek), "HKDF", false, ["deriveBits"]);
	const bits = await crypto.subtle.deriveBits(
		{ name: "HKDF", hash: "SHA-256", salt: buf(enc.encode(salt)), info: buf(enc.encode(info)) },
		base,
		256,
	);
	return new Uint8Array(bits);
}

export interface WrappedSecret {
	kekVersion: number;
	nonce: string;
	ciphertext: string;
}

function aad(did: string, purpose: string, kekVersion: number): Uint8Array {
	return enc.encode(`${did}|${purpose}|${kekVersion}`);
}

/** AES-256-GCM wrap of a private key, with a wrapping key derived per account and purpose. */
export async function wrapSecret(
	kek: Uint8Array,
	kekVersion: number,
	did: string,
	purpose: string,
	plaintext: Uint8Array,
): Promise<WrappedSecret> {
	const keyBytes = await derive(kek, did, `account-key/${purpose}/v1`);
	const key = await crypto.subtle.importKey("raw", buf(keyBytes), "AES-GCM", false, ["encrypt"]);
	const nonce = randomBytes(12);
	const sealed = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: buf(nonce), additionalData: buf(aad(did, purpose, kekVersion)) },
		key,
		buf(plaintext),
	);
	return { kekVersion, nonce: b64url(nonce), ciphertext: b64url(new Uint8Array(sealed)) };
}

export async function unwrapSecret(
	kek: Uint8Array,
	did: string,
	purpose: string,
	wrapped: WrappedSecret,
): Promise<Uint8Array> {
	const keyBytes = await derive(kek, did, `account-key/${purpose}/v1`);
	const key = await crypto.subtle.importKey("raw", buf(keyBytes), "AES-GCM", false, ["decrypt"]);
	const clear = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: buf(fromB64url(wrapped.nonce)),
			additionalData: buf(aad(did, purpose, wrapped.kekVersion)),
		},
		key,
		buf(fromB64url(wrapped.ciphertext)),
	);
	return new Uint8Array(clear);
}

/** HMAC-SHA256 over a string, base64url. Used for signed cookies and pseudonymous throttle keys. */
export async function hmac(keyBytes: Uint8Array, message: string): Promise<string> {
	const key = await crypto.subtle.importKey("raw", buf(keyBytes), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, buf(enc.encode(message)))));
}

/**
 * Password hashing inside the account object. PBKDF2-SHA256 through native
 * WebCrypto; Workers caps PBKDF2 at 100,000 iterations. Format:
 * pbkdf2-sha256$<iterations>$<salt b64url>$<hash b64url>
 */
export const PASSWORD_ITERATIONS = 100_000;

export async function hashPassword(password: string, iterations = PASSWORD_ITERATIONS): Promise<string> {
	const salt = randomBytes(16);
	const hash = await pbkdf2(password, salt, iterations);
	return `pbkdf2-sha256$${iterations}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.split("$");
	if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
	const iterations = Number(parts[1]);
	if (!Number.isInteger(iterations) || iterations < 1 || iterations > PASSWORD_ITERATIONS) return false;
	const actual = await pbkdf2(password, fromB64url(parts[2]!), iterations);
	return equal(b64url(actual), parts[3]!);
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
	const base = await crypto.subtle.importKey("raw", buf(enc.encode(password.normalize("NFKC"))), "PBKDF2", false, ["deriveBits"]);
	const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: buf(salt), iterations }, base, 256);
	return new Uint8Array(bits);
}
