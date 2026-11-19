/**
 * did:plc genesis operations and a reconcile-first PLC directory client.
 * Strata code (AGPL-3.0-only), written from the did:plc specification
 * (https://web.plc.directory/spec/v0.1/did-plc). No PLC library code copied.
 *
 * AGENTS.md: never blindly retry an uncertain outward action. Every
 * submission first reads the directory's log for the DID; a submission whose
 * outcome is unknown is followed by another read, never by a blind re-POST.
 */
import { encode } from "@atcute/cbor";
import { Secp256k1Keypair, verifySignature } from "@atproto/crypto";
import { b64url, fromB64url, sha256 } from "./crypto.ts";

export interface UnsignedPlcOperation {
	type: "plc_operation";
	rotationKeys: string[];
	verificationMethods: Record<string, string>;
	alsoKnownAs: string[];
	services: Record<string, { type: string; endpoint: string }>;
	prev: string | null;
}

export interface SignedPlcOperation extends UnsignedPlcOperation {
	sig: string;
}

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

export function base32(bytes: Uint8Array): string {
	let bits = 0, value = 0, out = "";
	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += BASE32[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
	return out;
}

/** The DID is the first 24 base32 characters of SHA-256 over the DAG-CBOR of the signed genesis operation. */
export async function didForGenesis(op: SignedPlcOperation): Promise<string> {
	if (op.prev !== null) throw new Error("Not a genesis operation");
	return "did:plc:" + base32(await sha256(encode(op))).slice(0, 24);
}

export function unsigned(op: SignedPlcOperation): UnsignedPlcOperation {
	const { sig: _sig, ...rest } = op;
	return rest;
}

export async function signOperation(op: UnsignedPlcOperation, rotationKey: Secp256k1Keypair): Promise<SignedPlcOperation> {
	const sig = await rotationKey.sign(encode(op));
	return { ...op, sig: b64url(sig) };
}

/** True when one of the operation's own rotation keys signed it (genesis rule). */
export async function verifyGenesis(op: SignedPlcOperation): Promise<boolean> {
	const bytes = encode(unsigned(op));
	const sig = fromB64url(op.sig);
	for (const key of op.rotationKeys) {
		try {
			if (await verifySignature(key, bytes, sig)) return true;
		} catch {
			// Unsupported key types are skipped; the directory decides validity.
		}
	}
	return false;
}

export interface GenesisInput {
	handle: string;
	pdsEndpoint: string;
	signingDidKey: string;
	/** Highest priority first. The last entry signs the genesis operation. */
	rotationKeys: string[];
}

export function genesisOperation(input: GenesisInput): UnsignedPlcOperation {
	if (input.rotationKeys.length < 1 || input.rotationKeys.length > 5) throw new Error("A PLC identity needs 1 to 5 rotation keys");
	for (const key of input.rotationKeys) if (!/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/.test(key)) throw new Error("Rotation keys must be did:key values");
	return {
		type: "plc_operation",
		rotationKeys: input.rotationKeys,
		verificationMethods: { atproto: input.signingDidKey },
		alsoKnownAs: [`at://${input.handle}`],
		services: { atproto_pds: { type: "AtprotoPersonalDataServer", endpoint: input.pdsEndpoint } },
		prev: null,
	};
}

export type PlcOutcome =
	| { state: "registered"; already: boolean }
	| { state: "uncertain"; reason: string }
	| { state: "rejected"; status: number; reason: string };

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Register a genesis operation. Reads first; posts only when the directory has
 * no entry; on an unknown outcome reads again and reports "uncertain" rather
 * than posting a second time. The caller keeps the saga row and retries later.
 */
export async function registerGenesis(
	directory: string,
	did: string,
	op: SignedPlcOperation,
	fetcher: Fetcher = fetch,
): Promise<PlcOutcome> {
	const base = directory.replace(/\/+$/, "");
	const before = await readLast(base, did, fetcher);
	if (before.state === "present") {
		return before.op.sig === op.sig
			? { state: "registered", already: true }
			: { state: "rejected", status: 409, reason: "The directory holds a different operation for this DID" };
	}
	if (before.state === "unknown") return { state: "uncertain", reason: before.reason };
	let response: Response;
	try {
		response = await fetcher(`${base}/${did}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(op),
		});
	} catch {
		return reconcile(base, did, op, fetcher, "network error during submission");
	}
	if (response.ok) return { state: "registered", already: false };
	const reason = (await response.text().catch(() => "")).slice(0, 300);
	// A refusal may come from a concurrent submission of this same operation:
	// read again before reporting anything.
	const settled = await reconcile(base, did, op, fetcher, `directory answered ${response.status}`);
	if (settled.state === "registered" || response.status >= 500 || response.status === 429) return settled;
	return { state: "rejected", status: response.status, reason };
}

async function reconcile(base: string, did: string, op: SignedPlcOperation, fetcher: Fetcher, reason: string): Promise<PlcOutcome> {
	const after = await readLast(base, did, fetcher);
	if (after.state === "present" && after.op.sig === op.sig) return { state: "registered", already: false };
	return { state: "uncertain", reason };
}

type LastRead = { state: "present"; op: SignedPlcOperation } | { state: "absent" } | { state: "unknown"; reason: string };

export async function readLast(base: string, did: string, fetcher: Fetcher = fetch): Promise<LastRead> {
	try {
		const response = await fetcher(`${base}/${did}/log/last`);
		if (response.status === 404) return { state: "absent" };
		if (!response.ok) return { state: "unknown", reason: `directory read answered ${response.status}` };
		return { state: "present", op: (await response.json()) as SignedPlcOperation };
	} catch {
		return { state: "unknown", reason: "directory read failed" };
	}
}
