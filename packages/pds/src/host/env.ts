import type { HostedAccountDurableObject } from "./account-do.ts";
import type { AuthHubDurableObject } from "./auth-hub.ts";
import type { DirectoryDurableObject } from "./directory-do.ts";
import type { HostedSpaceDurableObject, HostedSpaceIndexDurableObject } from "./spaces.ts";

/**
 * Configuration of the multi-account identity host. Host-level values only:
 * no per-account identity lives in the environment (plan §1, Config row).
 */
export interface HostEnv {
	/** Service host name, e.g. pds.etnos.space. Serves XRPC, OAuth and pages. */
	PDS_HOSTNAME: string;
	/** Domain whose first-level names are handles, e.g. etnos.space. */
	HANDLE_DOMAIN: string;
	/** Name shown in pages, e.g. ETNOS. */
	HOST_DISPLAY_NAME?: string;
	/** Where the "sign in" button after sign-up points; ?handle= is appended. */
	SIGNIN_URL?: string;
	/** PLC directory base URL. Must be set explicitly; see PLC_WRITES. */
	PLC_URL: string;
	/**
	 * Writes to the public directory at https://plc.directory are refused
	 * unless this is exactly "public-directory-approved" (owner decision).
	 * "off" closes sign-up entirely: the host serves pages, OAuth metadata and
	 * existing accounts, creates none, and needs no escrow key yet.
	 */
	PLC_WRITES?: string;
	/** Escrow rotation key (did:key), held offline by the owner. Required. */
	ESCROW_ROTATION_KEY?: string;
	/** Key-encryption keys, 32 bytes base64url each, as Workers secrets. */
	ACCOUNT_KEK_V1: string;
	ACCOUNT_KEK_V2?: string;
	ACCOUNT_KEK_CURRENT?: string;
	/** Operator token for /admin/* only. It can never act as an account. */
	OPERATOR_TOKEN: string;
	/** When "true", unknown handle hosts are passed to their origin instead of 404. */
	PASS_THROUGH_UNKNOWN_HOSTS?: string;
	ACCOUNT: DurableObjectNamespace<HostedAccountDurableObject>;
	AUTH_HUB: DurableObjectNamespace<AuthHubDurableObject>;
	/** The directory in D1 (Cloudflare). */
	DIRECTORY?: D1Database;
	/** Or the directory in a Durable Object (plain workerd, self-hosted). One of the two is required. */
	DIRECTORY_DO?: DurableObjectNamespace<DirectoryDurableObject>;
	BLOBS?: R2Bucket;
	/** AT Protocol spaces (alpha): "true" turns them on when both bindings exist. */
	SPACES_ENABLED?: string;
	SPACES?: DurableObjectNamespace<HostedSpaceDurableObject>;
	SPACES_INDEX?: DurableObjectNamespace<HostedSpaceIndexDurableObject>;
	/** Seconds a space credential from another host's authority is accepted (default 300). */
	SPACES_REMOTE_CREDENTIAL_MAX_AGE?: string;
}

export const PUBLIC_PLC = "https://plc.directory";

/** Sign-up is closed until the owner approves PLC writes (see PLC_WRITES). */
export const signupsClosed = (env: Pick<HostEnv, "PLC_WRITES">) => env.PLC_WRITES === "off";

/** Validate host configuration once per request; never logs values. */
export function hostConfigProblem(env: HostEnv): string | null {
	if (!env.PDS_HOSTNAME || !/^[a-z0-9.-]+$/.test(env.PDS_HOSTNAME)) return "PDS_HOSTNAME";
	if (!env.HANDLE_DOMAIN || !/^[a-z0-9.-]+$/.test(env.HANDLE_DOMAIN)) return "HANDLE_DOMAIN";
	if (!env.PLC_URL || !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/.test(env.PLC_URL.replace(/\/+$/, ""))) return "PLC_URL";
	if (env.PLC_URL.replace(/\/+$/, "") === PUBLIC_PLC && env.PLC_WRITES !== "public-directory-approved" && !signupsClosed(env)) return "PLC_WRITES";
	if (env.ESCROW_ROTATION_KEY ? !/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/.test(env.ESCROW_ROTATION_KEY) : !signupsClosed(env)) return "ESCROW_ROTATION_KEY";
	if (!env.ACCOUNT_KEK_V1) return "ACCOUNT_KEK_V1";
	if (!env.OPERATOR_TOKEN || env.OPERATOR_TOKEN.length < 32) return "OPERATOR_TOKEN";
	if (!env.ACCOUNT || !env.AUTH_HUB || (!env.DIRECTORY && !env.DIRECTORY_DO)) return "bindings";
	return null;
}
