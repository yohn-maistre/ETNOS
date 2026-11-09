# Cloudflare API profile

This profile runs Strata's shared Fetch handler and domain policy inside a SQLite-backed Durable Object, selected by a fixed node name from deployment configuration. Separate deployments have separate namespaces. It is not a PDS, an Aksara private workspace or a general peer gateway.

## Evidence and limits

- Local Node checks and the original policy/publication tests remain applicable.
- The test-only Worker runs the real core, Fetch routes, migrations and SQL adapter under workerd via the Miniflare version used by Wrangler. It tests approval admission, bound invitation/replay, hidden content, revoked membership, Host/Origin handling, rollback, byte fidelity, Wiki decisions, votes/bookmarks, uncertain outbox outcomes, independent storage and restart recovery.
- These tests use synthetic principals and a fake PDS. No live AT, production login, sensitive-source hosting or hardware performance result is implied.
- The API has no remote provisioning, signup, custody fixture or live publication switch. Locally provisioned bearer credentials are not production enrollment. Empty hosted instances are read-only until a separately qualified enrollment path exists.
- All synchronous policy mutations, audit and outbox intent share one transaction. External actions remain outside it. Restart marks in-flight delivery uncertain; it does not retry.
- A per-node DO is the initial coordination unit; it is not a benchmarked pan-regional capacity guarantee. Lists are bounded where implemented; quotas, request admission and abuse controls remain launch gates.
- Persisted Worker logging is disabled by default because authenticated URLs and private activity are sensitive. No claim of anonymity or absence of provider metadata. Structured redacted operational metrics need deliberate qualification.
- No paid-plan upgrade, external database, R2 bucket, Queue or model is required by this API profile. Free-tier quotas still apply; actual workloads and account billing must be checked before broader use.

## Deployment

Run cloud checks and the Worker dry build before deployment. `wrangler.jsonc` contains only the production API class. Never upload the test bundle or `TestNode`.

Set the exact origin to the deployed HTTPS URL. For example, a preview named `strata-preview` under an account's workers.dev subdomain uses that matching origin. Leave the logical node name fixed and independent of untrusted Host/path/query. Do not put credentials into config, URL query strings or logs.

An operator can deploy through Wrangler using their existing configured identity, or upload the same dry-built module with the Cloudflare connector and equivalent bindings/migrations. The connector path must preserve `StrataNode`, SQLite migration `v1`, nodejs_compat, exact origin and disabled persisted observability. No production resource is overwritten by a separate preview.

Smoke-check `/health`, `/v1/capabilities`, anonymous feed/community reads, unauthenticated writes, disabled custody routes and rejected foreign Origin. A health URL is an API preview, not a connected Honai UI.

The deployment receipt below is updated only after a real upload and external verification.

## Receipt

- API preview: <https://strata-preview.giyaibo.workers.dev/health>. The root has no UI.
- Created through the authenticated Cloudflare connector at 2026-10-31 19:09 UTC (1 November in Asia/Bangkok), without replacing an existing Worker.
- Worker `strata-preview`, exported production class `StrataNode`, SQLite migration tag `v1`, deployment `b969eb4a10a94efe81227de49707ca38`.
- Uploaded minified module: 154,372 bytes; SHA-256 `d287d4a99dc2ecf4e93dc6f105382576cc5e76ae301f8f7e476acd44478c400e`.
- Cloudflare reported module startup of 11 ms; this is not a request latency or load benchmark.
- External HTTPS checks passed: health/capabilities/feed/communities 200, anonymous identity/write 401, foreign Origin 403 and custody fixture 501. Public feed and communities are empty; no remote writer was enrolled.
- The preview is the API only. Honai, production login and live AT remain disconnected. No sensitive data or public AT test content was uploaded.

## Superseding connected preview checkpoint

The API-only first deployment above is historical. The preview now uses a same-origin Honai asset binding, official AT OAuth with controlled enrollment, and application sessions. See [connected-preview.md](connected-preview.md) for current behavior and its remaining gates. No hosted PDS, real account migration or live AT publication has been performed.
