import { test } from "node:test";
import assert from "node:assert/strict";
import { createPasskeyRegistrationOptions, createPasskeyLoginOptions } from "../src/host/passkeys.ts";

test("WebAuthn passkey registration and login options bind RP, DID and existing credentials", async () => {
	const reg = await createPasskeyRegistrationOptions({
		rpName: "ETNOS",
		rpID: "etnos-identity-host.giyaibo.workers.dev",
		did: "did:plc:testuser1234567890abcdef",
		handle: "yose.etnos.space",
		existing: [
			{
				credential_id: "cred-existing-1",
				public_key: "AAAA",
				counter: 3,
				transports: '["internal"]',
				label: "HP Yose",
				created: Date.now(),
			},
		],
	});
	assert.equal(reg.rp.id, "etnos-identity-host.giyaibo.workers.dev");
	assert.equal(reg.user.name, "yose.etnos.space");
	assert.ok(reg.challenge.length >= 20);
	assert.equal(reg.excludeCredentials?.length, 1);
	assert.equal(reg.excludeCredentials?.[0]?.id, "cred-existing-1");

	const login = await createPasskeyLoginOptions({
		rpID: "etnos-identity-host.giyaibo.workers.dev",
		credentials: [
			{
				credential_id: "cred-existing-1",
				public_key: "AAAA",
				counter: 3,
				transports: '["internal"]',
				label: "HP Yose",
				created: Date.now(),
			},
		],
	});
	assert.equal(login.rpId, "etnos-identity-host.giyaibo.workers.dev");
	assert.ok(login.challenge.length >= 20);
	assert.equal(login.allowCredentials?.length, 1);
	assert.equal(login.allowCredentials?.[0]?.id, "cred-existing-1");
});
