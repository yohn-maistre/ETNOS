# Strata PDS · experimental

Optional, separately deployed AT account hosting inside the Strata repository. ETNOS and the forum engine do not require this package to run. It is a Strata-maintained fork of Cirrus's MIT PDS source using official AT repository and crypto libraries; see [UPSTREAM.md](UPSTREAM.md) for provenance and local changes. This is not an official Bluesky PDS distribution or a completed security audit.

## Implemented and checked locally

- Worker edge + SQLite account Durable Object + R2 blobs, with hibernating public sync sockets inherited from the attributed foundation.
- Public AT repository create/read/update/delete, signed commits and CAR export; official `verifyRepoCar` checks an actual local export.
- Real official Strata OAuth client → local PDS PAR/PKCE/DPoP authorization → scoped repository write, with all network edges intercepted. A read-only consent cannot write and a reused DPoP proof is rejected. No fake token exchange stands in for this test.
- Serialized account operations, authoritative conditional-write preconditions and atomic SQL block/root/reference updates; identical records at two paths retain their shared bytes when one changes.
- Upload staging: an uploaded blob is not publicly served until referenced by a public record. Do not use staging as private institutional storage.
- Durable legacy refresh-session registration, one-use rotation and logout revocation. A legacy access JWT remains valid until its normal two-hour expiry; immediate access-token revocation is not implemented.
- Host checks, bounded request streams (256KiB JSON, 5MiB blobs, 16MiB CAR imports; import requires an inactive empty account), login throttling and disabled implicit AppView/arbitrary-service proxying.
- Closed account creation, no relay notifications by default, Spaces off. The repository is still public; an unadvertised host is not private.

One Cloudflare deployment hosts **one identity**. Twenty people need isolated per-identity deployments or a future qualified multi-account implementation. Never reuse a shared DID or signing/session key across people. No PDS has been deployed or real identity created by the local test suite.

## CLI

From the repository root; requires Node 24.19+. These commands do not open the forum database. Use `node` directly or `npm run --silent pds -- ...` for pure JSON stdout.

```sh
node src/pds-cli.ts capabilities --json
node src/pds-cli.ts cost --requests-per-day 20000 --cpu-ms-per-request 2 --json
node src/pds-cli.ts plan --runtime cloudflare --hostname pds.example.org --handle alice.example.org --did did:web:pds.example.org --accounts 20 --json
node src/pds-cli.ts init --runtime cloudflare --hostname pds.example.org --handle alice.example.org --did did:web:pds.example.org --directory .strata-pds/alice --json
```

`init` is dry by default. Add `--write` to create private config files; an existing destination is refused. The sample hostname/DID above is illustrative, not an existing account. For real did:plc identities, verify ownership and migration authority; this command does not register or migrate a DID. A generated config references this checkout, so do not move it away independently.

Cloudflare profiles contain secret **names**, never values. They require a dedicated R2 bucket, a fresh namespace, unique signing/session/operator/password-hash secrets, stable HTTPS, handle verification, backups and OAuth/recovery qualification. Install dependencies in this package on a capable machine with `npm ci --ignore-scripts`. Supply secrets through the provider's secret channel; do not put passwords in CLI arguments or committed files. Only after qualification should a provider enter Strata's OAuth allowlist. PDS hosting does not grant forum enrollment.

Server/node option:

```sh
node src/pds-cli.ts plan --runtime server --hostname pds.example.org --accounts 20 --json
node src/pds-cli.ts init --runtime server --hostname pds.example.org --image 'ghcr.io/bluesky-social/pds@sha256:<verified-image-digest>' --directory .strata-pds/server --write --json
node src/pds-cli.ts doctor --manifest .strata-pds/server/manifest.json --json
```

The server profile intentionally uses the official multi-account PDS container behind a localhost-only port and an operator-managed TLS reverse proxy. It does **not** claim Cloudflare Durable Objects run unchanged on Linux. A future shared-storage-port implementation can replace that adapter without changing the CLI manifest. Resolve an actual official image digest; the placeholder is rejected. Generated env examples have empty secret fields and cannot safely start until completed.

Existing provider option:

```sh
node src/pds-cli.ts plan --runtime external --origin https://pds.example.org --json
```

`doctor` validates the local manifest. Its JSON states which DNS, TLS, secrets, interop and recovery checks have not been performed. No automatic deployment, subscription change, account creation, PLC write or account migration occurs. Agents should use scoped OAuth for account actions; the operator AUTH_TOKEN is not an agent credential. Each Cloudflare profile uses its own bucket/namespace and unique keys; included allowances are still shared across the account.

## Cost and capacity

At the documented example workload—20k Worker requests/day, 2ms average Worker CPU, 20k DO requests/day, 6k GB-s/month active DO duration, 0.2GB SQL and 2GB R2—the calculator yields **$5/month for the account's Paid baseline**, assuming the shared included allowances are available. The incremental bill may be zero if that account is already paid and other workloads leave enough headroom. This is arithmetic under assumptions, not measured capacity or a bill.

Free hosting is an experiment to qualify: 100k requests/day and 10ms Worker CPU/invocation are account limits, and average CPU cannot prove every password/signing/import request fits. A DNS zone's Free plan does not establish Workers billing entitlement. No paid plan was enabled.

A server has its chosen rental price plus storage/backups/egress. The CLI's default $5 server price is an assumption, not a provider quote. An existing Aksara computer removes a new VM rental but still needs power, storage, updates, backup and reliable public HTTPS. At 10W continuously and $0.10/kWh, modeled electricity is $0.72/month; it excludes the rest. Sleeping/offline nodes cannot serve PDS login/writes because ETNOS remains online.

The host's member count does not bound public relay requests. No DAU/RPS, RAM-per-account or general “Free fits twenty” claim has been measured. Streaming export under concurrent mutation still needs snapshot qualification. Full CAR export can stream; imports above 16MiB require another path or further bounded-streaming work. Video transcoding, email recovery, AI inference, institutional vaults and relay operation are separate services/costs.

## Verification

```sh
npm run check
npm test
```

The build command is a dry run against `wrangler.test.jsonc`, containing **public synthetic fixture keys**. Never deploy that fixture. Generated operator profiles are separate. Tests cover signed repository/CAR interoperability, R2 visibility, bounds, restart, refresh replay/logout and real OAuth client integration. They are not a full upstream conformance run, load test, passkey/recovery qualification or independent audit. OAuth grant-management/revocation UX and complete recovery remain qualification gates too; do not infer provider-wide token revocation from local ETNOS logout. Production signup remains closed pending those gates.

Public repo records and private Aksara/community data remain separate. See [Decision 005](../../docs/decision-005-node-account-data-planes.md) for permissioned Spaces, purpose/consent policies and node deployment profiles.
