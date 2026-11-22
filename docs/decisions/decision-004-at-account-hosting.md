# Decision 004: full AT accounts, separate account hosting

1 November 2026 · Follow-up: [Decision 005](decision-005-node-account-data-planes.md) adds source audits, measured WPW R2 inventory and the owner-authorized domain cutover. DNS parking observations below are historical.

Direction accepted: full AT experience. Hosting choice and an experimental PDS pilot remain under evaluation. Local-only passkey accounts are not being introduced as a substitute.

## Recommendation

Keep ETNOS's current SQLite Durable Object and Honai client. Add a **separate PDS boundary**, not an unrelated database migration. Account identity/repositories, the forum's local private/access-controlled data, and blob/media storage are different responsibilities.

The safest mature self-hosted path for twenty people is the official PDS on a small persistent Linux server, with SQLite and blob storage, while ETNOS stays on Cloudflare. The official guide currently recommends 1 core, 1 GB RAM and 20 GB SSD for 1–20 accounts. This is a documented recommended starting configuration, not a throughput guarantee or a free hosted offer. No VM was purchased or provisioned.

A Cloudflare-only AT pilot is technically plausible. Cirrus and pds.js are concrete existing implementations with signed repositories, OAuth and blob storage, not just SDK wrappers. Both currently describe themselves as experimental and single-account. We should evaluate one disposable identity, export/migration and recovery before making either the identity host for all twenty friends. There is no qualified turnkey multi-user ETNOS PDS deployed today.

Full AT identity does not require us to operate the PDS: a provider-hosted account plus a verified `name.etnos.space` handle is still a real AT account. That is the $0 incremental-hosting alternative while testing the self-hosted path. The provider retains account-hosting responsibility and may impose its own signup/abuse terms. Domain handles do not relocate the repository. The owner's current account is not migrated or reissued implicitly.

## Minimal service map

```text
Honai / etnos.space
  ├─ ETNOS Worker + existing forum SQLite DO
  │    communities, private content, membership, moderation, Wiki, local follows
  ├─ AT OAuth → account's PDS
  │    identity, credentials/OAuth, signed repo, CAR/sync, account operations
  └─ authorized media → private R2 bucket / existing bounded image store

PDS service (separate deployment)
  ├─ account/repository SQLite, isolated from forum authority
  ├─ public repository blobs → dedicated R2 bucket or compatible blob storage
  ├─ handle/DID resolution and PLC registration where applicable
  └─ recovery/verification delivery + backups + operational limits
```

Do not share the forum's membership table as PDS authorization. PDS identity proves who a caller is; it does not admit them into ETNOS or a protected community. Public AT repository blobs are not appropriate storage for private community images. Service keys, account keys and browser session secrets have separate scopes and rotation/recovery plans.

An AppView or relay is not required to be self-hosted merely to create accounts and publish records. Existing public infrastructure can provide compatible Bluesky reads. Our custom ETNOS records still need their own validated publishing/ingestion behavior. A PDS does not turn the current forum into a fully federating application automatically.

## Cloudflare-only options and work involved

| Option | Additional services | Main missing work |
| --- | --- | --- |
| Existing account provider + ETNOS handles | Domain proof endpoint/DNS, invite enrollment UI | Claim binding to verified DID, reserved names, takeover/reassignment policy, provider onboarding |
| Official PDS on a server | One persistent Linux service/container, PDS SQLite, blobs, recovery delivery, backups | Install/configure securely, invitation-only signup adapter, verification/recovery, monitoring/restore; additional hosting budget |
| Single-account Worker PDS per tester | Approximately twenty PDS Worker deployments/namespaces and per-identity configuration; R2 and a small provisioning registry | Secure repeatable provisioning, per-account keys, host routing, invitation/account lifecycle and recovery, version rollout, resource accounting; single-account projects do not supply all of this |
| Multi-tenant Worker PDS fork | One router/control plane, account DOs + registry, R2 and account lifecycle services | Tenant isolation throughout OAuth/repos/blobs/firehose/admin; signup/recovery/abuse flows, migrations, backups and compatibility qualification |

Do not use one server's single-account configuration to serve twenty identities by changing just the hostname. Neither a raw Postgres connection nor a shared JWT secret makes that a qualified multi-tenant PDS.

Cirrus (`ascorbic/cirrus`) documents OAuth, passkeys, tested account migration, DO repository state and R2, and explicitly labels itself experimental beta. pds.js (`pdsjs.dev`, source on Tangled) documents Workers/Deno/Node runtimes, did:plc, repo/sync, migration and OAuth/passkeys, but deliberately omits multi-user administration and invite codes. Its private Spaces features also remain experimental. Claims here are from upstream documentation; no additional live Cirrus/PDS account was created during this pass. The existing separate two-PDS Spaces lab is narrower evidence and must not be relabelled as Worker PDS production qualification.

## What free Cloudflare can support

Official product docs checked today give the following budgets. They are account allowances, not a promise that twenty hosted PDSes fit every workload:

- Workers Free: 100,000 requests/day **across the account**, 10 ms CPU/invocation, 128 MB/isolate, up to 100 Workers and 5 Cron triggers. Account-subscription billing access is unavailable through the current OAuth connector; the site's Free DNS plan does not establish Workers billing entitlement.
- SQLite Durable Objects Free: 100,000 requests/day, 13,000 GB-s duration/day, 5M rows read/day, 100k rows written/day, 5 GB total storage/account. The limits page's storage-full section specifies 1 GB/object Free (its general table also contains an inconsistent 10 GB row); plan to the conservative limit and verify enforcement. Paid allows 10 GB/object.
- R2 Standard: 10 GB-month storage, 1M Class A and 10M Class B operations/month included, internet egress free. A subsequent account API check confirmed R2 is already enabled with the `westpapua-watch-archive` bucket. No ETNOS/PDS bucket exists from this pass, and existing usage/billing allocation was not measured. The 10 GB included allowance is shared with that archive, not a fresh allowance per app.
- Repositories, sync/firehose requests, OAuth and blob reads can add network traffic even if twenty people rarely open the forum. Those requests and twenty Workers do not each get a separate 100k/day free budget. Scheduled keys/cleanup jobs and long-lived non-hibernating connections also consume resources.
- Signing, OAuth verification, CAR processing/import and repository traversal need actual CPU/memory profiling. Database size alone is not the limiting metric. A project that says “fits Free” for one identity does not prove our twenty-identity fleet does.

Illustration: if each of twenty identities received 1,000 dynamic PDS requests/day, that is 20,000/day before ETNOS, other Workers, blob reads and public relay/AppView activity. Our prior forum-only illustration was another ~14,000 API requests/day. These assumptions sum arithmetically but are not measured traffic. External readers/replication can exceed that without any new local members. Measure and cap work; don't infer a maximum safe registered-user count from a daily quota.

A $5/month Workers baseline can remove the small Free CPU limit and raise included allocations, but it does not fix incorrect multi-tenant authorization or supply production recovery. Models, a VM, mail, news ingestion and video have separate costs. No subscription changes were made.

## Free database alternatives

| Service | Current official free allowance checked today | Relevance |
| --- | --- | --- |
| Current Cloudflare SQLite DO | 5 GB/account total, conservatively 1 GB/object Free; request/row/duration budgets above | Best fit for the existing ETNOS transaction model. No migration needed for twenty people |
| Neon | **1 GB/project**, 100 CU-hours/project/month, 5 GB transfer; idle scale-to-zero after 5 minutes; storage cap/suspension at limits | Good candidate if we later need Postgres; not a PDS or a drop-in synchronous SQLite adapter. The current pricing page changed recently; older 0.5 GB claims are stale |
| Supabase | 500 MB Postgres/project, two active Free projects, 1 GB files, 5 GB egress plus cached allowance; pause after one inactive week; no automatic backups on Free | Useful Postgres/auth/storage platform if those services are selected. Supabase Auth is not AT PDS OAuth/repository hosting |
| CockroachDB Basic | Monthly $15 resource-consumption benefit for eligible pay-as-you-go orgs, described as 50M RUs + 10 GiB; limits/eligibility/billing setup apply | Distributed SQL is possible later; SQL compatibility, retries and transaction semantics need work. Not a reason to rewrite a twenty-user forum |
| Ladybug | Embedded graph/analytical database, not a hosted free transactional identity service | Useful to investigate for later graph analysis, not an account-hosting or forum-authority replacement |

None of these supplies the repository-signing, MST/CAR/sync, DID lifecycle, PDS OAuth and recovery behavior of an AT PDS. Adding a second managed relational database today would increase integration work without resolving the missing signup service.

## Registration implementation contract

Once a qualified PDS target is selected/configured:

1. Steward creates a recipient-bound or securely delivered, hash-stored, expiring one-use enrollment invitation; public website reads remain open. Forum enrollment and PDS account-creation invitations remain independently checked.
2. Signup presents the selected host, available ETNOS handle and public-identity disclosure, with required provider terms/verification. Do not imply the account is private because its first forum post stays local.
3. Submit credentials only to the selected PDS through a bounded audited adapter or first-party provider UI. Avoid retaining password plaintext or using the PDS admin credential in the browser. Handle the uncertain outcome of createAccount by reconciliation; do not blindly repeat creation.
4. Verify handle→DID→PDS resolution and register the verified DID for the intended ETNOS enrollment. The username alone is not identity proof. A failed forum step must leave a resumable account, not automatically delete a successfully created PDS identity.
5. Complete OAuth under the final canonical application origin. Require fresh user consent; preserve existing accounts and do not claim others' DIDs by user input.
6. Qualify login, logout, recovery, deactivation/deletion and CAR export/restore/migration with disposable users before inviting the cohort. An email forwarder is not an outbound verification/recovery mail service.

`etnos.space` has active nameservers and a Free DNS zone. Rechecking after the owner's follow-up still found Namecheap forwarding/parking records and no Worker custom-domain binding. Domain routing and encrypted-vault/OAuth origin continuity remain a separate gate, documented in [alpha-20.md](../history/alpha-20.md). No full account-creation UI is presented as working before these dependencies exist.

## Sources

- [Official PDS hosting guide](https://github.com/bluesky-social/pds)
- [Official AT PDS source](https://github.com/bluesky-social/atproto/tree/main/packages/pds)
- [Cirrus](https://github.com/ascorbic/cirrus)
- [pds.js](https://pdsjs.dev/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Neon pricing](https://neon.com/pricing), updated 31 October 2026
- [Supabase pricing](https://supabase.com/pricing), [platform compute/disk](https://supabase.com/docs/guides/platform/compute-and-disk)
- [Cockroach Basic planning/pricing](https://docs.cockroachlabs.com/docs/cockroachcloud/plan-your-cluster-basic)
