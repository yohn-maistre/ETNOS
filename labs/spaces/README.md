# Official AT Spaces alpha trial

This is a real integration test against the official alpha PDS and SDK, isolated from Strata's production dependencies and database. It starts two disposable PDS services and a development PLC directory, creates three synthetic accounts, runs the access checks and destroys the services. No real account, OAuth grant, community or data is imported.

Snapshot: **0.0.0-spaces-alpha-20261029171913**. Node 24.19+; run on a development machine/cloud workspace, **not the secondary phone**. No PostgreSQL, Redis or Docker is needed for this smaller official devnet.

```sh
cd labs/spaces
npm ci
npm run probe
```

`report.json` records the passing checks and observed limits. Expected-denial requests also produce upstream development server error logs; a successful probe exits 0. No credentials or private keys are written to the report. The development PDS uses temporary filesystem directories; this is not an unattended public service or a supported production hosting configuration.

The report is displayed read-only at `/labs/spaces` in Honai. That page is evidence of this local protocol experiment, **not a live Cloudflare-hosted PDS or an enabled private-AT community**. The Worker cannot run the official Node PDS unchanged. The existing hosted forum continues using Strata's local access-controlled storage.

## Observed fit

- A community can map to a `com.atproto.memberspace.policy` Space controlled by its authority. That mapping does not confer Strata membership or permission to use conversations for training.
- Members write in their own PDS's repository within the Space. The authority and each author's PDS are separate trust/storage locations; this is not automatically one community-owned database.
- Cross-PDS reading uses a delegation token, P-256-bound credential, the official HTTP signature helper and a per-request KEM/MAC verified with official helpers. This trial does not invent cryptography.
- Private records were absent from public `repo.getRecord`/`repo.listRecords`; an attached private blob was readable with a Space credential and denied through anonymous private and public sync blob endpoints. Full public CAR/firehose isolation still needs independent inspection.
- Current credentials last **600 seconds**. After membership removal, minting a new credential was denied, but the previously issued credential still read the other PDS immediately afterward. Notification delivery, explicit credential revocation, lost notifications and expiry need qualification. This matters for activist/community safety.
- Spaces is access control, **not E2EE**. Hosting operators remain in the trust boundary.
- An author may keep arbitrary data in their own repository. Inclusion in a community's writer set/index must be qualified separately; do not equate a successful author-local write with admission to the forum.

## Remaining integration gates

Production OAuth and least-privilege Space scopes; deployable alpha PDS placement; complete writer-set synchronization and spoofed/removed-author exclusion; protected cache/index invalidation; deletion/revocation/expiry races; metadata leakage and blob deduplication across public/private records; pagination, backup/restore, migration, limits and abuse controls; version upgrade strategy. Only then should an explicitly selected test community opt in. Never automatically export existing private Strata rows.

## Upstream contribution candidates

The published dependency ranges `^0.0.0-spaces-alpha-…` can select stable `0.0.0` placeholder packages containing `workspace:*` dependencies. A plain npm install exited unsuccessfully; pnpm identified the unresolved workspace package. Pinning all 36 published AT alpha packages via npm overrides resolves this reproducibly. A small upstream packaging regression test and installation note would be useful; no upstream issue or PR has been sent.

Sources: [Permissioned Data proposal](https://github.com/bluesky-social/proposals/blob/main/0016-permissioned-data/README.md), [implementation PR 5187](https://github.com/bluesky-social/atproto/pull/5187), [official Bulletin example](https://github.com/bluesky-social/bulletin). Proposal and implementation are moving targets; the lockfile is the experiment's contract.
