# ETNOS canonical alpha — 1 November 2026

Live: **https://etnos.space** · Worker `strata-preview` · deployment `7b71555a27e14baaa0de7012bbeb32d1`.

## What shipped

Honai `df56a50`; engine implementation `a73d354`, followed by documentation `d8e9e15`. The canonical HTTPS origin is now etnos.space. Existing logical node `preview`, Durable Object namespace `2b28195b06644e77bc380c8d41b65ce6`, migration tag v1, application schema 15 and both OAuth signing/sealing secret bindings were retained. No forum data was reseeded, account migrated or PDS deployed.

The UI consolidates search around the command dialog and retains shareable results. It removes duplicate visual page headings, compacts reply sorting, quiets composer focus decoration and adds an original reduced-motion-aware pixel loader/pull refresh. Explore and the contextual sidebar show published WPW news; the mobile lead is readable and generic fallback tiles recede when real content is available. Settings can explicitly transfer the previous origin's passphrase-encrypted DM vault.

The legacy workers.dev origin redirects GET navigation, drops OAuth callback parameters and rejects writes. Only `/recover-messages` and static assets remain available there; the recovery page has `connect-src 'none'`. New-origin OAuth requires fresh consent. Local browser theme preferences are origin-specific. DMs still need the old browser's encrypted export and the original passphrase; no automatic multi-device/ratchet recovery is implied.

## News boundary

The edge reads a fixed public WPW endpoint through a service binding, with a fixed public HTTPS fallback. It forwards no forum cookies, authorization, search queries or member data. Input is bounded to 256KiB and projected to six public headline/link/date/source-count items, omitting images/raw debug fields. Successful responses are cached at the edge for five minutes; failure is small and independent of forum storage. No crawler, AI inference or WPW engine deployment was added.

## Optional PDS checkpoint

The repository now includes a separate experimental serverless PDS and JSON operator CLI; see [the hosting guide](pds-hosting.md) and [package details](../packages/pds/README.md). It is an attributed MIT Cirrus fork using official AT libraries, with Strata security/concurrency/storage fixes and local interoperability checks. Cloudflare profiles are single-account per Worker; Linux/node profiles use the official PDS container. No real PDS service, hosted signup, public DID or account migration was created. Full recovery/migration, concurrent streaming exports, provider grant management, passkey lifecycle, production quotas and independent review remain gates.

The calculator's example is $5/account/month on Workers Paid when shared included allowances are available; Free CPU/request suitability is not qualified. Existing nodes remove new VM rental but retain power, storage, backup and reachability costs. Snapshot R2 inventory: 5,419 objects, 47,267,302 payload + 1,008,653 metadata bytes, from the account's sole WPW archive bucket. Metrics can lag and this is not a monthly bill or operations measurement.

## Evidence

- 69 foundation tests; Worker types current; Worker typecheck and actual-workerd forum contracts pass.
- Dedicated actual-workerd web contract checks canonical routing, recovery-only legacy behavior, rejected legacy writes, callback query stripping and a news service request with no forwarded credentials.
- Two PDS workerd suites verify signed CARs with the official library, R2 staging/public reads, restart, concurrent refresh/edit, shared record CIDs, stale preconditions and destructive-import refusal. The actual official OAuth client completes PAR/PKCE/DPoP, writes under a granted scope, fails read-only writes and rejects reused DPoP proofs. All PDS identities/egress are local synthetic fixtures.
- Honai Svelte checks, four native tests, root lint and seven built-browser journeys pass. They cover forum/media, governance/wiki, encrypted DMs, discovery/follows, dialogs and the new polish/origin-transfer flow, without production writes.
- Live public screenshots at 390/768/1440px show no horizontal overflow or browser errors. Production health/news return 200; news contains six real headlines; old navigation returns 302, old writes 405, recovery 200. A live sign-in start for the configured steward returns the Bluesky authorization host; no real-user callback or public AT write was performed.
- Taste v2 inspection of the selected existing direction reports no FAIL findings. It flags the proportion of sub-13px text at mobile/tablet widths; those samples are metadata/subline text, while post content remains larger. The last mobile pass enlarges the news lead. Screenshots/fixture logs are workspace evidence under `/workspace/shared/production-pass`, not seeded production content.
- GitHub foundation/PDS jobs and Honai connected-ui/lint checks passed for the implementation heads.

Artifact: 2,866,669 bytes; SHA-256 `9e187d60023e03f7fb31a3f1b9d19e208956e4a3bdff685fa09d263801bee1ae`; 33 UI assets. Cloudflare reported 112ms startup for this upload. This is a build observation, not measured request latency, CPU qualification or throughput.

Public reading and invitation-controlled participation remain the alpha policy. Public AT broadcasting stays disabled behind the example namespace. ActivityPub, a live Aksara connector and production-sensitive data ingestion are not implied by this release.

