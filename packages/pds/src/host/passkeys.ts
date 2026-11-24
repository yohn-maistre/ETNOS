/**
 * WebAuthn / Passkeys for the ETNOS multi-account identity host (W3).
 *
 * Uses @simplewebauthn/server (MIT) for FIDO2 attestation and assertion checks.
 * Signing in with a passkey runs one ECDSA/Ed25519 verification (<0.5 ms CPU)
 * instead of PBKDF2 (~21 ms), keeping sign-in comfortably inside Cloudflare
 * Workers Free CPU budgets while letting Papuan phone users unlock with
 * fingerprint or screen lock.
 */
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
	type AuthenticatorTransportFuture,
	type RegistrationResponseJSON,
	type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { b64url, fromB64url } from "./crypto.ts";

export interface StoredPasskey {
	credential_id: string;
	public_key: string;
	counter: number;
	transports: string;
	label: string;
	created: number;
}

function parseTransports(raw: string): AuthenticatorTransportFuture[] | undefined {
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed.filter((x): x is AuthenticatorTransportFuture => typeof x === "string") as AuthenticatorTransportFuture[]) : undefined;
	} catch {
		return undefined;
	}
}

export async function createPasskeyRegistrationOptions(input: {
	rpName: string;
	rpID: string;
	did: string;
	handle: string;
	existing: StoredPasskey[];
}) {
	return generateRegistrationOptions({
		rpName: input.rpName,
		rpID: input.rpID,
		userName: input.handle,
		userDisplayName: input.handle,
		userID: new TextEncoder().encode(input.did),
		attestationType: "none",
		excludeCredentials: input.existing.map((k) => ({
			id: k.credential_id,
			transports: parseTransports(k.transports),
		})),
		authenticatorSelection: {
			residentKey: "preferred",
			userVerification: "preferred",
		},
	});
}

export async function verifyPasskeyRegistration(input: {
	response: RegistrationResponseJSON;
	expectedChallenge: string;
	expectedOrigin: string;
	expectedRPID: string;
}) {
	const verification = await verifyRegistrationResponse({
		response: input.response,
		expectedChallenge: input.expectedChallenge,
		expectedOrigin: input.expectedOrigin,
		expectedRPID: input.expectedRPID,
		requireUserVerification: false,
	});
	if (!verification.verified || !verification.registrationInfo) {
		return null;
	}
	const { credential } = verification.registrationInfo;
	return {
		credentialId: credential.id,
		publicKey: b64url(credential.publicKey),
		counter: credential.counter,
		transports: credential.transports ?? [],
	};
}

export async function createPasskeyLoginOptions(input: {
	rpID: string;
	credentials: StoredPasskey[];
}) {
	return generateAuthenticationOptions({
		rpID: input.rpID,
		userVerification: "preferred",
		allowCredentials: input.credentials.map((k) => ({
			id: k.credential_id,
			transports: parseTransports(k.transports),
		})),
	});
}

export async function verifyPasskeyLogin(input: {
	response: AuthenticationResponseJSON;
	expectedChallenge: string;
	expectedOrigin: string;
	expectedRPID: string;
	stored: StoredPasskey;
}) {
	const verification = await verifyAuthenticationResponse({
		response: input.response,
		expectedChallenge: input.expectedChallenge,
		expectedOrigin: input.expectedOrigin,
		expectedRPID: input.expectedRPID,
		requireUserVerification: false,
		credential: {
			id: input.stored.credential_id,
			publicKey: new Uint8Array(fromB64url(input.stored.public_key)),
			counter: input.stored.counter,
			transports: parseTransports(input.stored.transports),
		},
	});
	if (!verification.verified) return null;
	return {
		newCounter: verification.authenticationInfo.newCounter,
	};
}
