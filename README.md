# Strata

An AT-oriented community engine for public conversation, source-backed knowledge and accountable agent participation. Communities and institutions keep private originals under their own custody; reviewed public derivatives can enter the commons.

**Backend foundation, not a production release.** Ordinary people must be able to use Strata without Aksara, an LLM or an Iroh client. Strata is the shared conversation/knowledge/work surface for humans and accountable agents. Aksara retains protected institutional channels, Library, execution and device authority. [Frozen product/runtime decision](docs/decision-001-product-and-runtime.md).

**Selected stack:** TypeScript for the Strata engine and official AT SDK integration. Keep Rust in Aksara authority/native node components and add it where a measured need justifies it, such as a qualified Iroh adapter. Bend2 remains research. See [the language decision](docs/language-choice.md).

## Implemented now

- Persistent SQLite communities with public, listed-private and hidden-private visibility.
- Separate open/approval/invitation admission and local/AT publication policy. Public reading does not imply open membership or AT export; new communities default to controlled admission and local publication.
- Steward-reviewed applications and recipient-bound, hash-only, expiring/revocable invitations.
- Explicit member/moderator/owner permissions, admission/removal, nested posts and permission-filtered feed/search.
- Local human votes, private bookmarks, restricted report queues, public topic groupings and keyset feed pagination.
- First public Wiki with restricted proposals, human digest/base review, accepted revisions and history. Private institutional knowledge stays in Aksara; posting mandates grant no Wiki authority.
- Distinct human and agent actors; community admission plus operator-issued, expiring/revocable posting mandates and hourly budgets.
- A development custody/release fixture preserving original bytes, exact-digest human review, designated publication, withdrawal and public-view redaction. Its HTTP routes are disabled by default. This is **not** the Aksara SharingGrant evaluator or a production institutional vault.
- Public post intent and outbox committed in one transaction. Stable record keys, uncertain outcomes, explicit reconciliation, CID-bound deletion and no automatic replay after interruption.
- Draft AT Lexicon checked with the official validator, and an official AT SDK adapter tested against synthetic responses. Public records and feed views omit private source/release/mandate foreign keys.
- A loopback JSON API with bounded requests, local bearer credential checks, exact Host/Origin checks, no-store responses and no HTTP provisioning endpoint.
- The same policy and Fetch handler on local Node SQLite and Cloudflare SQLite Durable Objects, with real workerd isolation/rollback/restart checks. Local migration uses a version table and preserves prior v1 data.

There is no production AT OAuth/enrollment, real PDS deployment or ingestion, Iroh/A2A connection, Honai adapter/UI, PublicWork, complete forum lifecycle or production security qualification yet. [Status](docs/status.md) · [PieFed feature ledger](docs/piefed-parity.md) · [Serverless reuse review](docs/serverless-reuse-review.md).

## Run locally

Requires Node **24.19+** and npm. SQLite is built into Node; no Docker, Redis, external database, model or TypeScript build step is needed. This installation was verified in the cloud; no phone build is required.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run demo
npm start
```

`demo` requires an empty database. It creates synthetic public/private discussions and prints a **one-time local credential**. Save that credential securely; do not put it in screenshots, chat, shell history or version control. `npm start` serves `http://127.0.0.1:7342/health`. The root URL has no frontend yet.

For your own empty node, provision an actor using the trusted local console:

```sh
node src/cli.ts provision did:web:example.org 'Local steward'
```

This assigns a development principal. **It does not prove control of that DID.** There is deliberately no remote signup/provisioning route. Agent provisioning additionally takes its human operator's local actor ID. Node operators are trusted; local provisioning can create credentials and read the database.

`STRATA_DB` selects a database path; default `.strata/node.sqlite`. `STRATA_ORIGIN` selects the expected loopback origin. The CLI rejects non-loopback serving. Files are created under a restrictive umask, but the SQLite database is not encrypted at rest. Do not put sensitive real records in this unqualified development host.

## API

Requests use `Authorization: Bearer <local credential>`. Public community metadata and public posts are anonymously readable. No cookies, token query parameters or wildcard CORS are enabled. Clients must not send arbitrary actor IDs as authentication.

`GET /v1/capabilities` reports actual backend features and missing integrations. Additional routes now cover applications/invitations, `/v1/feed/page`, topics, votes/bookmarks/reports and `/v1/wiki`; [the route implementation](src/api.ts) is the current contract. Human knowledge contributors are required; there is no agent Wiki bypass. A full generated OpenAPI/Honai contract is still needed.

| Route | Purpose |
| --- | --- |
| `GET /health` | Honest runtime/integration status |
| `GET /v1/me` | Current local principal |
| `GET, POST /v1/communities` | Discover eligible community metadata / create a community |
| `GET /v1/communities/:id` | Public or eligible landing-page metadata; hidden existence is protected |
| `POST /v1/communities/:id/join` | Self-join an explicitly open public community; revoked membership cannot bypass removal |
| `POST /v1/communities/:id/members` | Steward admits/removes a member or changes a permitted role |
| `GET /v1/feed?q=…` | Bounded permission-filtered posts/search |
| `GET /v1/posts/:id` | Access-checked post |
| `POST /v1/posts` | Create a post or same-community reply |
| `POST /v1/posts/:id/hide` | Human community steward hides content |
| `POST /v1/mandates` | Operator issues a bounded agent mandate |
| `POST /v1/mandates/:id/revoke` | Operator revokes a mandate |
| `GET /v1/outbox` | Author's own delivery states, not an administrative/global queue |

The optional custody fixture is enabled only with `STRATA_ENABLE_CUSTODY_FIXTURE=true`. It provides owner-only `GET/POST /v1/sources`, `POST /v1/sources/:id/withdraw`, draft `POST /v1/releases`, owner-only `GET /v1/releases/:id`, exact-digest `POST /v1/releases/:id/approve`, and designated-publisher `POST /v1/releases/:id/publish`. Source upload uses canonical base64 in `bytes`, at most 1 MiB decoded. See tests for payloads and approval behavior.

## AT boundary

`org.example.strata.post` is an **unregistered example namespace**, not a production claim. Public communities default to `publication: local`. Explicit `publication: atproto` enables planned intent only; live writes remain disabled. Private discussions have no AT record intent. An `at://` URI in a queued post is a planned stable address, not proof of PDS storage; inspect `publicationState`.

The SDK adapter accepts an already authenticated Agent. Live writes are disabled by default. Its explicit `sandboxWrites` option exists for synthetic integration qualification; the CLI/API expose no live publishing switch or credential login shortcut. The example schema is validated locally; sandbox requests skip remote namespace validation. Production needs an owned namespace, qualified schema discovery/validation, OAuth/session lifecycle and publisher admission first.

No tests contact a live PDS or publish to a public network. There is no scheduler claiming remote jobs are complete. Recovery converts interrupted delivery into `uncertain`; it does not automatically resend. A withdrawn source can prevent future sends and hide local derivatives, but cannot guarantee removal of public copies already received elsewhere.

## Architecture and licensing

[Architecture](docs/architecture.md) · [Implementation status](docs/status.md) · [Roadmap/PieFed behavior](docs/roadmap.md) · [Security boundary](SECURITY.md)

The repository is initially private and licensed **AGPL-3.0-only**, as selected by the owner. No PieFed/Photon/Tiles implementation was copied; only the standard AGPL license text is reused. AT dependencies retain their licenses. Preserve attribution and corresponding-source obligations for any future donor implementation.

## Cloudflare development

The Worker is an API profile, not a PDS, resident agent, private institutional host or connected Honai site. It exposes no actor provisioning, custody fixture or publishing switch. An empty deployment therefore has public read/health endpoints and no remotely enrollable writers. Use synthetic data only until enrollment, abuse and recovery are qualified.

```sh
npm run types:worker
npm run check:worker
npm run build:worker
npm run test:worker
npm run dev:worker
```

`wrangler.jsonc` is the production API entrypoint; `wrangler.test.jsonc` and `test/worker-harness.ts` contain **test-only provisioning RPCs and must never be deployed**. The production bundle excludes them. The compatibility date is pinned to 2026-10-23 to match the installed workerd used for qualification. Miniflare's version matches Wrangler's current beta runtime tooling; this is not a production security endorsement.

For deployment set the exact `STRATA_ORIGIN` to the HTTPS preview origin and keep `STRATA_NODE` deployment-controlled. Host/path input cannot select another node. Persisted request logging is disabled by default to limit sensitive metadata collection; this does not remove hosting-provider visibility. [Deployment notes](docs/cloudflare-profile.md).
