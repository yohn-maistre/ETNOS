/**
 * Legacy session tokens (com.atproto.server.createSession) for hosted
 * accounts. Each account has its own HS256 secret, derived from the host KEK
 * with the DID as salt and never stored (plan §2.2 rule 3), so the edge can
 * verify a token without waking any account object and a token minted for one
 * account never verifies for another.
 *
 * Revocation: every token carries the account's session epoch (`sep`); the
 * directory bumps the epoch on deactivation, deletion and "sign out
 * everywhere", which invalidates every earlier token at the next request.
 */
import { SignJWT, decodeJwt, errors, jwtVerify, type JWTPayload } from "jose";
import { derive, parseKek } from "./crypto.ts";
import type { HostEnv } from "./env.ts";

const ACCESS_LIFETIME = "120m";
const REFRESH_LIFETIME = "90d";

export class ExpiredTokenError extends Error {}

export const serviceDid = (env: HostEnv) => `did:web:${env.PDS_HOSTNAME}`;

async function secretFor(env: HostEnv, did: string): Promise<Uint8Array> {
	return derive(parseKek(env.ACCOUNT_KEK_V1), did, "session-jwt/v1");
}

export async function issueSession(env: HostEnv, did: string, epoch: number): Promise<{ accessJwt: string; refreshJwt: string; jti: string; refreshExpires: number }> {
	const secret = await secretFor(env, did);
	const aud = serviceDid(env);
	const accessJwt = await new SignJWT({ scope: "com.atproto.access", sep: epoch })
		.setProtectedHeader({ alg: "HS256", typ: "at+jwt" })
		.setIssuedAt()
		.setAudience(aud)
		.setSubject(did)
		.setExpirationTime(ACCESS_LIFETIME)
		.sign(secret);
	const jti = crypto.randomUUID();
	const refreshJwt = await new SignJWT({ scope: "com.atproto.refresh", sep: epoch })
		.setProtectedHeader({ alg: "HS256", typ: "refresh+jwt" })
		.setIssuedAt()
		.setAudience(aud)
		.setSubject(did)
		.setJti(jti)
		.setExpirationTime(REFRESH_LIFETIME)
		.sign(secret);
	return { accessJwt, refreshJwt, jti, refreshExpires: decodeJwt(refreshJwt).exp! };
}

/** The unverified subject, used only to pick which secret to verify with. */
export function claimedSubject(token: string): string | null {
	try {
		const sub = decodeJwt(token).sub;
		return typeof sub === "string" && sub.startsWith("did:") && sub.length < 200 ? sub : null;
	} catch {
		return null;
	}
}

export async function verifySession(
	env: HostEnv,
	token: string,
	did: string,
	epoch: number,
	kind: "access" | "refresh",
): Promise<JWTPayload> {
	let payload: JWTPayload, typ: string | undefined;
	try {
		const result = await jwtVerify(token, await secretFor(env, did), { audience: serviceDid(env), subject: did, algorithms: ["HS256"] });
		payload = result.payload;
		typ = result.protectedHeader.typ;
	} catch (error) {
		if (error instanceof errors.JWTExpired) throw new ExpiredTokenError("Token has expired");
		throw new Error("Invalid token");
	}
	const expected = kind === "access" ? ["at+jwt", "com.atproto.access"] : ["refresh+jwt", "com.atproto.refresh"];
	if (typ !== expected[0] || payload.scope !== expected[1]) throw new Error("Invalid token type");
	if (payload.sep !== epoch) throw new Error("Session was revoked");
	if (kind === "refresh" && typeof payload.jti !== "string") throw new Error("Missing token id");
	return payload;
}
