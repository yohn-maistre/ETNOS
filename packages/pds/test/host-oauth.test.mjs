// The official Strata OAuth client (ETNOS's own sign-in code) against the
// local multi-account identity host, with two synthetic accounts. Every network
// edge is intercepted; no DID, PLC operation or relay request leaves the test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BrowserAuth } from "../../../src/oauth.ts";
import { Strata } from "../../../src/store.ts";
import { FakePlc, call, domain, hostRuntime, invite, migrate, origin, signup } from "./host-harness.mjs";

const clientOrigin = "https://client.test";
const cookieOf = (response, name) => response.headers.getSetCookie().find((c) => c.startsWith(name + "="))?.split(";")[0];
const form = (url, extra) =>
	new URLSearchParams({ client_id: url.searchParams.get("client_id"), request_uri: url.searchParams.get("request_uri"), ...extra });

test("ETNOS signs in two hosted accounts through OAuth with an account step; neither can act as the other", async () => {
	const dir = mkdtempSync(join(tmpdir(), "strata-host-oauth-")), plc = new FakePlc();
	const s = new Strata(":memory:", clientOrigin);
	let auth;
	const mf = hostRuntime({
		persist: dir,
		plc,
		outbound: async (req) => {
			const url = new URL(req.url);
			if (url.origin === clientOrigin && ["/oauth/client-metadata.json", "/oauth/jwks.json"].includes(url.pathname)) return auth.route(new Request(req.url));
			return null;
		},
	});
	const fetcher = async (input, init) => {
		const req = new Request(input, init), url = new URL(req.url);
		// bsky.social stands in for any public resolver: it reads the handle host's well-known.
		if (url.hostname === "bsky.social" && url.pathname === "/xrpc/com.atproto.identity.resolveHandle") {
			const handle = url.searchParams.get("handle");
			const r = await mf.dispatchFetch(`https://${handle}/.well-known/atproto-did`);
			return r.ok ? Response.json({ did: await r.text() }) : Response.json({ error: "InvalidRequest" }, { status: 400 });
		}
		if (url.hostname === "plc.directory") {
			const doc = plc.document(decodeURIComponent(url.pathname.slice(1)));
			return doc ? Response.json(doc) : new Response("not found", { status: 404 });
		}
		if (url.origin === origin)
			return mf.dispatchFetch(req.url, { method: req.method, headers: Object.fromEntries(req.headers), ...(req.body ? { body: await req.arrayBuffer() } : {}), redirect: "manual" });
		throw Error("Unexpected fixture host " + url.host);
	};
	try {
		await migrate(mf);
		const alice = await signup(mf, "alice"), bob = await signup(mf, "bob");
		auth = await BrowserAuth.create(
			s,
			{
				origin: clientOrigin,
				privateJwk: JSON.stringify(generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ format: "jwk" })),
				sealKey: randomBytes(32).toString("base64url"),
				stewardDid: alice.did,
				allowedHosts: ["pds.test", "bsky.social", "plc.directory"],
				collection: "org.example.strata.post",
				publishingEnabled: true,
				accountHost: origin,
			},
			fetcher,
		);

		const start = async (handle) => {
			const r = await auth.route(
				new Request(clientOrigin + "/auth/start", { method: "POST", headers: { origin: clientOrigin, "content-type": "application/json" }, body: JSON.stringify({ handle, publishing: true }) }),
			);
			assert.equal(r.status, 200, await r.clone().text());
			return { flow: cookieOf(r, "__Host-strata_flow"), url: new URL((await r.json()).authorizationUrl) };
		};
		const finish = async (flow, location) => {
			const signed = await auth.route(new Request(location, { headers: { cookie: flow, origin: clientOrigin } }));
			assert.equal(signed.headers.get("location"), "/", await signed.clone().text());
			const cookie = cookieOf(signed, "__Host-strata");
			const me = await (await auth.route(new Request(clientOrigin + "/auth/me", { headers: { cookie } }))).json();
			const agent = await auth.agent(new Request(clientOrigin + "/v1/test", { method: "POST", headers: { origin: clientOrigin, cookie, "x-strata-csrf": me.csrf } }));
			return { cookie, me, agent };
		};

		// Alice: the client's login_hint selects her account; the page names it.
		const a = await start(alice.handle);
		assert.equal(a.url.origin, origin);
		const consent = await mf.dispatchFetch(a.url.href, { redirect: "manual" });
		const consentHtml = await consent.text();
		assert.equal(consent.status, 200, consentHtml);
		assert.match(consentHtml, /Masuk sebagai <strong>alice\.people\.test<\/strong>/);
		assert.match(consentHtml, /Menulis catatan jenis org\.example\.strata\.post/);
		assert.match(consent.headers.get("content-security-policy"), /frame-ancestors 'none'/);
		// Bob's password does not authorise Alice.
		const wrong = await mf.dispatchFetch(origin + "/oauth/authorize", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin }, body: form(a.url, { action: "approve", password: bob.password }), redirect: "manual" });
		assert.equal(wrong.status, 401);
		assert.match(await wrong.text(), /Kata sandi salah/);
		// A post from another site is refused.
		const foreign = await mf.dispatchFetch(origin + "/oauth/authorize", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://evil.test" }, body: form(a.url, { action: "approve", password: alice.password }), redirect: "manual" });
		assert.equal(foreign.status, 403);
		const approved = await mf.dispatchFetch(origin + "/oauth/authorize", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin }, body: form(a.url, { action: "approve", password: alice.password }), redirect: "manual" });
		assert.equal(approved.status, 302, await approved.clone().text());
		const remembered = cookieOf(approved, "__Host-strata_accounts");
		assert.ok(remembered, "the device remembers the account for the selector");
		const aliceSession = await finish(a.flow, approved.headers.get("location"));
		assert.equal(aliceSession.me.actor.did, alice.did);

		// Alice's DPoP grant writes her own repository and nobody else's.
		const created = await aliceSession.agent.com.atproto.repo.createRecord({ repo: alice.did, collection: "org.example.strata.post", rkey: "one", validate: false, record: { $type: "org.example.strata.post", text: "Synthetic hosted write" } });
		assert.ok(created.data.cid);
		await assert.rejects(
			aliceSession.agent.com.atproto.repo.createRecord({ repo: bob.did, collection: "org.example.strata.post", rkey: "forged", validate: false, record: { $type: "org.example.strata.post", text: "Must be refused" } }),
			(error) => error.status >= 400 && error.status < 500,
		);
		const bobRecords = await (await call(mf, `/xrpc/com.atproto.repo.listRecords?repo=${bob.did}&collection=org.example.strata.post`)).json();
		assert.equal(bobRecords.records.length, 0);

		// The steward enrolls Bob in ETNOS; enrollment is ETNOS's own decision, separate from the host.
		const invited = await auth.route(new Request(clientOrigin + "/auth/invite", { method: "POST", headers: { origin: clientOrigin, cookie: aliceSession.cookie, "x-strata-csrf": aliceSession.me.csrf, "content-type": "application/json" }, body: JSON.stringify({ handle: bob.handle }) }));
		assert.equal(invited.status, 200, await invited.clone().text());

		// Bob, on the same device: the hint selects Bob; "use another account" shows the selector with Alice remembered.
		const b = await start(bob.handle);
		const bobPage = await (await mf.dispatchFetch(b.url.href, { headers: { cookie: remembered } })).text();
		assert.match(bobPage, /Masuk sebagai <strong>bob\.people\.test/);
		const other = await mf.dispatchFetch(origin + "/oauth/select", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin, cookie: remembered }, body: form(b.url, { other: "1" }), redirect: "manual" });
		assert.equal(other.status, 303);
		const none = cookieOf(other, "__Host-strata_oauth_account");
		const selector = await (await mf.dispatchFetch(origin + other.headers.get("location"), { headers: { cookie: `${remembered}; ${none}` } })).text();
		assert.match(selector, /Pilih akun/);
		assert.match(selector, /<button class="account" type="submit">alice\.people\.test<\/button>/);
		const unknown = await mf.dispatchFetch(origin + "/oauth/select", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin }, body: form(b.url, { handle: "nobody" }), redirect: "manual" });
		assert.equal(unknown.status, 404);
		const picked = await mf.dispatchFetch(origin + "/oauth/select", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin }, body: form(b.url, { handle: "bob" }), redirect: "manual" });
		const pick = cookieOf(picked, "__Host-strata_oauth_account");
		assert.match(await (await mf.dispatchFetch(b.url.href, { headers: { cookie: pick } })).text(), /Masuk sebagai <strong>bob/);
		// A tampered selection (Alice's DID with Bob's MAC) is ignored; the page falls back to the hint.
		const [tag, , exp, mac] = pick.split("=")[1].split(".");
		const tampered = `__Host-strata_oauth_account=${tag}.${encodeURIComponent(alice.did)}.${exp}.${mac}`;
		assert.match(await (await mf.dispatchFetch(b.url.href, { headers: { cookie: tampered } })).text(), /Masuk sebagai <strong>bob/);
		// A selection made for another request does not carry over: Alice's earlier request is gone, so build a new one for Alice.
		const a2 = await start(alice.handle);
		const crossed = await mf.dispatchFetch(origin + "/oauth/authorize", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin, cookie: pick }, body: form(a2.url, { action: "approve", password: bob.password }), redirect: "manual" });
		assert.equal(crossed.status, 401, "Bob's selection and password cannot complete Alice's request");
		const bobApproved = await mf.dispatchFetch(origin + "/oauth/authorize", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin, cookie: pick }, body: form(b.url, { action: "approve", password: bob.password }), redirect: "manual" });
		assert.equal(bobApproved.status, 302, await bobApproved.clone().text());
		const bobSession = await finish(b.flow, bobApproved.headers.get("location"));
		assert.equal(bobSession.me.actor.did, bob.did);
		await bobSession.agent.com.atproto.repo.createRecord({ repo: bob.did, collection: "org.example.strata.post", rkey: "two", validate: false, record: { $type: "org.example.strata.post", text: "Bob's own" } });

		// Withdrawal: deleting Alice removes her OAuth grants; her ETNOS agent can no longer write. Bob continues.
		assert.equal((await call(mf, "/xrpc/com.atproto.server.deleteAccount", { body: { did: alice.did, password: alice.password } })).status, 200);
		await assert.rejects(aliceSession.agent.com.atproto.repo.createRecord({ repo: alice.did, collection: "org.example.strata.post", rkey: "after", validate: false, record: { $type: "org.example.strata.post", text: "after deletion" } }));
		const hub = (await mf.getDurableObjectNamespace("AUTH_HUB")).get((await mf.getDurableObjectNamespace("AUTH_HUB")).idFromName("auth-hub"));
		assert.equal(await hub.liveTokens(alice.did), 0);
		assert.ok((await hub.liveTokens(bob.did)) >= 1);
		const third = await bobSession.agent.com.atproto.repo.createRecord({ repo: bob.did, collection: "org.example.strata.post", rkey: "three", validate: false, record: { $type: "org.example.strata.post", text: "still works" } });
		assert.ok(third.data.cid);
		// A new person: an ETNOS invitation plus an account on the host, in one sign-up flow with no handle typed into ETNOS.
		assert.deepEqual(await (await auth.route(new Request(clientOrigin + "/auth/options"))).json(), { provider: "bluesky", enrollment: "invite", accountHost: origin });
		// The steward's account was deleted above, so the invitation row is written as the steward's Studio would write it.
		const enrollment = s.get("SELECT id FROM actors WHERE did = ?", alice.did);
		const invitation = randomBytes(32).toString("base64url");
		s.run("INSERT INTO enrollment_invitations(id,hash,issuer_id,created,expires) VALUES(?,?,?,?,?)", crypto.randomUUID(), createHash("sha256").update(invitation).digest("hex"), enrollment.id, s.clock(), s.clock() + 86400000);
		const started = await auth.route(new Request(clientOrigin + "/auth/start", { method: "POST", headers: { origin: clientOrigin, "content-type": "application/json" }, body: JSON.stringify({ mode: "signup", invitation, provider: "host" }) }));
		assert.equal(started.status, 200, await started.clone().text());
		const c = { flow: cookieOf(started, "__Host-strata_flow"), url: new URL((await started.json()).authorizationUrl) };
		assert.equal(c.url.origin, origin);
		// A sign-up asks the host for its sign-up page (prompt=create), carrying the pending sign-in.
		const landing = await (await mf.dispatchFetch(c.url.href)).text();
		assert.match(landing, /Buat akun/, "sign-up lands on the host's sign-up form");
		assert.ok(landing.includes(`name="request_uri" value="${c.url.searchParams.get("request_uri")}"`), "the form carries the pending sign-in");
		assert.match(await (await mf.dispatchFetch(c.url.href + "&masuk=1")).text(), /Pilih akun/, "an existing account can still sign in");
		const citra = { password: "synthetic-password-citra" };
		const madeAccount = await mf.dispatchFetch(origin + "/akun/baru", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin, "cf-connecting-ip": "198.51.100.7" }, body: form(c.url, { code: await invite(mf), label: "citra", password: citra.password, password2: citra.password, age: "16" }), redirect: "manual" });
		assert.equal(madeAccount.status, 303, await madeAccount.clone().text());
		assert.ok(madeAccount.headers.get("location").startsWith("/oauth/authorize?"), "a new account continues to consent");
		const chosen = cookieOf(madeAccount, "__Host-strata_oauth_account");
		assert.ok(chosen, "the new account is chosen for this sign-in");
		assert.match(await (await mf.dispatchFetch(origin + madeAccount.headers.get("location"), { headers: { cookie: chosen } })).text(), /citra\./, "consent names the new account");
		const wrongPassword = await mf.dispatchFetch(origin + "/oauth/authorize", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin, cookie: chosen }, body: form(c.url, { action: "approve", password: "not-the-password" }), redirect: "manual" });
		assert.notEqual(wrongPassword.status, 302, "consent still asks for the new account's password");
		const citraApproved = await mf.dispatchFetch(origin + "/oauth/authorize", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin, cookie: chosen }, body: form(c.url, { action: "approve", password: citra.password }), redirect: "manual" });
		assert.equal(citraApproved.status, 302, await citraApproved.clone().text());
		const signedCitra = await auth.route(new Request(citraApproved.headers.get("location"), { headers: { cookie: c.flow, origin: clientOrigin } }));
		assert.equal(signedCitra.status, 303, await signedCitra.clone().text());
		citra.did = s.get("SELECT did FROM actors WHERE name = ?", "citra." + domain)?.did;
		assert.ok(citra.did && s.get("SELECT 1 FROM enrollment_allowlist WHERE did = ?", citra.did), "the ETNOS invitation enrolled the new account");
		console.log(JSON.stringify({ syntheticOnly: true, accounts: 2, officialOAuthClient: true, accountStep: true, crossAccountDenied: true, deletionRevokesGrants: true, liveNetworkWrites: 0 }));
	} finally {
		await mf.dispose();
		s.close();
		rmSync(dir, { recursive: true, force: true });
	}
});
