# ETNOS-domain handles with an existing account provider

4 November 2026 · research and bounded test receipt.

Custom domain handles are native ATProto, independently of where the PDS hosts the account. `friend.etnos.space` can resolve to the same DID as an account on an external provider. Changing the domain proof is not sufficient: the account's DID document must confirm that canonical handle too. Identity and local authorization remain anchored to the DID.

## Tests completed

- In the actual active `etnos.space` Cloudflare full zone, the zone API reports `Free Website`.
- Created one temporary DNS-only TXT record `_atproto.signup-probe.etnos.space`, TTL 60, pointing to the steward's already-public DID. Public Cloudflare DNS-over-HTTPS returned it.
- The official `@atproto/oauth-client-node@0.5.13` identity resolver rejected the unconfirmed alias against the live PLC document. The real account continued to claim `giyaibo.bsky.social`. No account, PDS, PLC or DID write occurred.
- Deleted the exact probe after rechecking its name/content. A subsequent zone listing returned zero records at that name. Cached DNS answers can persist until expiry; the reverse check rejects the alias regardless.
- `test/handle-portability.test.ts` uses the real official resolver with intercepted HTTP identity documents. It checks bidirectional confirmation and, with a fresh lookup, a changed PDS endpoint while the DID, canonical handle and existing local private-room rights remain unchanged. This is a location-change simulation, not a live record/key migration.
- `test/oauth.test.ts` exercises the existing actual BrowserAuth routes with an invited custom-domain handle and an external-provider fixture, through PKCE/PAR/DPoP to a browser session. This is invited login, not an implemented new-account signup endpoint.
- Core TypeScript check and **97 tests** passed. Runtime source and the deployed backend artifact are unchanged; only tests/docs are added.

## Proposed newcomer flow

ETNOS invitation → provider-started OAuth account creation → verified return and enrollment → optional approved ETNOS-domain handle → owner confirmation at the provider. The provider's OAuth web interface can create the account without requiring the Bluesky app to be installed. A generic link to an app's registration page does not preserve the OAuth return transaction.

Our current `/auth/start` accepts an invited, already-known account handle. Pre-account invite codes, provider-started signup, transactional redemption and a handle-claim UI remain to be implemented. Do not advertise this as an enabled seamless signup flow.

For a small pilot, operator-approved DNS TXT records avoid per-resolution Worker compute and do not require another domain registration. A future HTTPS resolver can use a wildcard DNS/Worker route and a durable DID mapping, provided first-level TLS, reserved names, unique claims, spoof checks, cache behavior and service collisions are qualified. No wildcard route or resolver was deployed in this experiment.

The namespace should not automatically recycle names or conflate local suspension with global account identity. An account owner must knowingly approve a handle change, which applies across AT apps; a friendly ETNOS profile URL can be separate. Treat namespace provisioning as an explicit public choice and do not publish private-only participants by default. Institutional names need a separate authorization policy.

For later migration, retain domain control, DID mappings, account recovery capabilities and forum state. A different PDS still requires current verified issuer discovery and provider-host qualification in ETNOS's allowlist. A different forum host requires a qualified database/media/session export/import and production adapter; the development loopback server is not a drop-in public replacement. No migration or billing-plan change was performed.

## Sources and alternatives

- [ATProto handle specification](https://atproto.com/specs/handle): DNS TXT, HTTPS well-known and mandatory reverse DID confirmation.
- [Network account management](https://atproto.com/blog/network-account-management): provider-started account creation during OAuth and return to an independent app.
- [Account migration](https://atproto.com/guides/account-migration): cooperative and recovery-based migration, repository/blob copying, and DID control.
- [Cloudflare wildcard DNS](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/), [Worker Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/), [Universal SSL coverage](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/).
- [Eurosky FAQ](https://eurosky.tech/faq/): free account hosting open globally, hosted in Europe. Portal beta and OAuth/provider-return qualification still matter.
- [Blacksky hosting guide](https://docs.blacksky.community/info-about-blacksky-the-community/migrating-to-blacksky-pds-complete-guide): public hosting domains `myatproto.social` and `cryptoanarchy.network`, distinct from community-specific `blacksky.app` handles. Provider policy and OAuth qualification are required before enabling an ETNOS integration.

Bluesky is the initial practical provider choice. Alternatives are candidates, not newly allowlisted services. The current connector cannot read Cloudflare account subscriptions without Billing Read; Free-zone DNS evidence does not prove the Workers account billing tier. No extra credentials were requested.
