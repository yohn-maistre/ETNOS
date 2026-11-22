# ETNOS PDS provenance and local changes

`src/upstream/` is an in-repository fork of Cirrus's non-CLI PDS source, by Matt Kane and contributors: https://github.com/ascorbic/cirrus at commit `de476f57ba1fb936c6480a8fc278b6c7fc250cab`, package 0.19.0, fetched 1 November 2026. The upstream package declares MIT; that grant and attribution are preserved in LICENSE.cirrus. The repository's AGPL-3.0-only license covers ETNOS additions/modifications while preserving upstream MIT notices. Official AT repository/crypto primitives remain dependencies.

Final local deltas:

- Separate ETNOS edge entry: exact host routing, request-body bounds, closed registration and public hosting capabilities. Imports require an inactive empty account. Ordinary AT repositories remain public.
- Export the account-stub selector; remove implicit Bluesky AppView and arbitrary-service proxy routes. Ignore empty relay entries, making the unadvertised profile perform no crawl notification. Spaces stays off in generated profiles.
- Durable, bounded authentication-attempt budgets with pseudonymous keys and no raw IP storage.
- Durable legacy refresh JTI registration, atomic one-use rotation and logout revocation. Upstream deleteSession was a no-op. Legacy access JWTs retain their normal two-hour expiry; this is not instant access-token revocation. OAuth/DPoP session handling remains the provider foundation.
- Dispose repository/account RPC facets and OAuth provider storage explicitly after awaited operations.
- Serialize per-account engine read/write operations. Apply authoritative swapRecord/swapCommit checks to conditional mutations. Racing edit/refresh contracts require one winner.
- Apply block writes, record-reference updates, pruning and root changes in an explicit SQLite transaction. A path→CID index prevents deleting identical record bytes still used by another path. Build the index once for imported/preexisting repos and maintain it incrementally.
- Wrangler/TS7 compatibility: literal provenance version, CacheStorage type narrowing, NSID template typing and copied ArrayBuffers for Worker response bodies. The included upstream package.json remains provenance metadata.

- Account object identity (19 November 2026): `AccountDurableObject` reads its DID and signing key through an overridable `loadIdentity()` (default: the environment, as upstream) and its initial activation through `initialActive()`, instead of reading `env` in the constructor and storage initialiser. The multi-account host overrides both; the single-identity worker behaves as before.

`src/worker.ts`, `src/host/` (the multi-account identity host), the operator CLI and tests are ETNOS additions. `src/host/` imports the Cirrus account object, OAuth storage and repository handlers and wraps `@getcirrus/oauth-provider` without copying it. The server profile runs the official PDS container, not the Cloudflare implementation unchanged on Linux. `src/worker.ts` is single-account per deployment. `src/host/worker.ts` hosts many accounts (see docs/research/pds-multi-identity-build-2026-11-19.md). Neither has been deployed as a public PDS.

Remaining qualification includes streaming export snapshots during concurrent mutation, full import/migration/restore, passkey and recovery lifecycle, OAuth grant-management/revocation UX, abuse/CPU/load budgets and independent security review. Keep institutional/corpus/agent-private data outside public repositories. Local tests and an official-client OAuth exchange do not establish all of these properties.
