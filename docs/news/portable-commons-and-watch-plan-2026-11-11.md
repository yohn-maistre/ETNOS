# One commons, several places to run it

11 November 2026, Asia/Bangkok. Owner-requested implementation plan. This is a design and qualification checklist, not a claim that the current Linux CLI already hosts the full OAuth/UI/resident stack or that an npm installer has been published. Supplements the complete foundation without dropping its remaining scope.

## The distribution

Ship **ETNOS with Honai included**, one versioned release and one configuration. A community chooses Cloudflare, a Linux host, or Docker; its identities, content IDs, rules and UI remain the same. WPW remains an independent publication and can consume the same configurable news engine. The resident is optional, and ordinary reading/posting/Wiki must work without a model key.

Keep infrastructure adapters thin rather than requiring a new distributed system for every install:

| Capability | Linux / Node | Docker | Cloudflare |
| --- | --- | --- | --- |
| Authoritative forum state | Existing Node SQLite port, WAL and transactional outbox | Same Node app and persistent volume | Existing SQLite Durable Object port |
| Honai UI | Same-origin built assets | Same assets in the application image | Worker static assets |
| OAuth, sealed sessions, enrollment | Port the hosted web authentication contract to the Node HTTP adapter | Same Node adapter behind TLS proxy | Existing hosted Worker contract |
| Media and source snapshots | Filesystem blob adapter | Persistent volume, optional object store | Existing bounded media storage first; optional R2 adapter only when needed |
| Durable work | SQLite job leases/checkpoints, one supervised runner initially | Same runner, restart-safe | Existing DO alarms and generation fencing |
| Optional Pi resident | Pi loop over a qualified Node session/journal adapter | Same adapter | Existing Pi Durable/Agents SQLite DO implementation |
| News acquisition and interpretation | Same domain functions; bounded HTTP fetcher, SQL/blob/job/model ports | Same | Worker fetch/DO or D1 adapter; optional platform services |

The existing Node CLI is a loopback foundation API with local credentials. It does **not** already provide the hosted OAuth/assets/session stack. Pi's current Cloudflare session storage does **not** magically become a Linux runtime by putting it in Docker. Those are explicit adapter tasks, with shared behavior and current-access tests. The PDS package stays separately optional; Bluesky/provider OAuth remains the initial easy account path.

## Extract the Watch engine by seams

Read the actual Watch modules before copying: `services/watch-engine/src/sources/{registry,discover}`, `ingest/{extract,publication-date,prefilter,relevance,story,process}`, `cluster/{partition,evidence,synthesis-quality,index,editorial}`, `news-read`, `workflow`, `types`, and the shared following/analysis code. The current branch contains investigative-site changes unrelated to ETNOS: never merge that branch wholesale into a shared engine or overwrite the live Watch router incidentally.

1. **Inventory and provenance.** Record copied-file commit hashes, license/owner authorization and third-party notices. Watch's root lacks a clear license declaration; owner-directed use is authorized, but we must settle redistribution terms rather than invent an MIT label. Preserve authorship for parser/extractor dependencies.
2. **Pure domain first.** Extract canonical URL normalization, publication-date validation, bounded packet validation, partition checks, evidence comparison and synthesis acceptance rules. Keep model output untrusted; a classification cannot grant access, rights or publication authority.
3. **Typed ports.** Define `SourceRepository`, `ArticleRepository`, `DevelopmentRepository`, `SnapshotStore`, `JobQueue`, `ModelGateway`, `Clock` and `SourceFetcher`. Keep typed tables and operations; do not expose arbitrary SQL or turn every record into a universal JSON object. Node and Cloudflare can each supply repository adapters over their existing SQLite facilities.
4. **Move fixed editorial policy into presets.** WPW's place names, relevance thresholds, source registry, role taxonomy, desks, bilingual style, following sets and news branding become its own versioned preset. A new ETNOS install starts with an operator-confirmed place/language/source preset; a model may suggest sources, never silently authorize harvesting or infer ethnicity.
5. **Parallel read qualification.** Replay a small public, rights-qualified corpus into an isolated destination. Compare article canonical IDs, syndication groups, source counts, dated evidence, cluster merges/splits and accepted-public projections. Preserve disagreement rather than forcing exact model wording. Deterministic ingestion remains useful when the model is unavailable.
6. **Adopt incrementally.** Keep the existing private Watch gateway bridge and read adapter working while ETNOS adopts the extracted module. The engine publishes candidates through ETNOS's current Discovery/Knowledge transitions. It cannot insert public Wiki revisions or reach protected language rooms.
7. **Switch with a receipt.** Match engine/UI/schema/preset versions, back up/restore, retain old read URLs and reconcile uncertain jobs/outbox operations. Do not restart an outward action just because its previous response was lost. WPW can then adopt the shared package separately under its own editorial settings.

Start with one in-process module and SQL repository per deployment. A queue, vector database, browser service or model reranker is optional when measured demand justifies it. Watch's current code directly calls D1, Queues, Workflows and optional Vectorize; those calls must move behind ports before promising Linux portability. Feed intake must retain host/path approval, redirect revalidation, byte/deadline limits, cooldowns, terms/rights and source-revision checks. A trusted fixed publisher registry is not a safe arbitrary-URL crawler.

## One installer, CLI and browser views of the same plan

Proposed commands (names are a proposal, **not published commands**):

```text
etnos init                  # interactive, creates a private local draft
etnos init --ui              # the same draft through a loopback browser wizard
etnos plan                  # resources, modules, permissions, quotas, changes
etnos doctor                # bounded read-only checks and specific remedies
etnos deploy --target ...   # applies the reviewed plan, records a receipt
etnos backup / restore      # encrypted portable state, integrity, rehearsal
etnos upgrade               # backed-up migration plus matched assets/runtime
```

Publish a real npm package only after reproducible packaging and name/provenance verification. `npx` can run that release on servers; Linux release archives can include a pinned runtime where helpful. A signed Docker image is another package of the same application, not another configuration format. Prefer a CLI-launched browser wizard over an Electron desktop installer: fewer platforms and no second privileged updater to maintain.

Wizard steps:

1. **Home:** instance name, language/timezone and public URL. Optional place presets are discovery preferences; they do not establish residence or institutional ownership.
2. **Host:** Linux/Docker/Cloudflare, persistent storage, existing resources to reuse, TLS/domain setup and estimated resource requirements. Show actual checks rather than a green generic “ready”.
3. **First owner and people:** establish the first operator through the real provider callback and a one-time owner-bootstrap flow. Select open/controlled enrollment separately from community admission. A setup token cannot become an ongoing global-admin bypass.
4. **Commons:** public starter community, rules, optional organization/place relationships and protected rooms. Default all automated access to protected cultural material off; explain audiences at the point of creation rather than burying them in a long introduction.
5. **Sources and optional resident:** preview a few actual source items, confirm usage rights and budget, opt into Pi and a model route. Accept operator credentials via local secure input or a supported provider's actual OAuth flow, never a generic “Sign in to any LLM” promise. Keys stay server-side and out of config exports/UI logs. ETNOS can continue to use Watch's existing private configured gateway until a provider-independent adapter is qualified.
6. **Review and first task:** show the manifest/diff, make the deployment concrete, verify callback/media/posting/backup paths, and run a bounded public source → note → human-reviewed Wiki/optional resident demonstration. No fake activity or automatic claim of institutional representation.

The browser wizard listens on loopback with a short-lived one-time setup credential, exact Origin/Host/CSRF checks and no wildcard CORS. A headless remote operator can use SSH forwarding or the terminal flow. Do not expose an unauthenticated installer to the public internet. Secret inputs are write-only; credentials never appear in command arguments, normal reports, template defaults or exported manifests. Configuration files use restrictive permissions, redacted public diagnostics and explicit secret references. Existing installations refuse an accidental new-owner/bootstrap path.

## Cloudflare entry path and free-tier posture

The official [Deploy to Cloudflare button](https://developers.cloudflare.com/workers/platform/deploy-buttons/) supports provisioning Durable Objects and other declared resources. It needs a **public**, self-contained repository/template. Its documented monorepo limitation matters here: multiple Worker applications are not deployed together, and a selected subdirectory must include all its dependencies.

Therefore publish a generated, version-pinned **core template** for the single forum/UI Worker, rather than a button that points at a private monorepo and promises the entire stack. The guided CLI can orchestrate the optional Pi and news/model Workers in dependency order and verify named service bindings. The browser review shows which modules are available, disabled or still missing credentials. Never silently attach another operator's existing storage or create paid resources to make a badge green.

[SQLite Durable Objects are available on Workers Free](https://developers.cloudflare.com/durable-objects/platform/pricing/); the documented allowances include 5 million rows read/day, 100,000 rows written/day and 5 GB total SQL storage. Exceeding a free allowance causes affected operations to fail until reset. [Limits](https://developers.cloudflare.com/durable-objects/platform/limits/) also constrain row/blob size and per-object storage. These published figures do not prove our current account plan, nor that an entire production crawler fits every free limit. Keep model quotas separate from platform quotas.

The core requires no model/vector/browser service. Bound news source counts, interval, bytes and per-day acquisition, and resident calls/tokens/steps outside Pi. Read-only diagnosis and usage meters should show the actual failing resource. Operators can pause ingestion/residents independently while the ordinary public square stays available. No paid product was enabled as part of this design pass.

## Portability and migration contract

Use one `etnos.instance.json` manifest with schema/release/preset versions, module toggles, public origin, adapter names/resource references and secret **references**, not values. Validate it identically in CLI and GUI. Infrastructure-specific details belong in the target adapter section; stable actor/DID/community/artifact IDs and institutional mandates belong to durable state, never to machine identity.

An export contains encrypted database/media/source snapshots, checksums and a release/schema manifest. Keep keys separate, record secret re-entry/rotation requirements, and prove restore on an isolated destination. Moving a forum database is different from migrating an AT PDS account: retain each user's DID and provider relationship, and update public origins/OAuth client metadata/allowed redirects deliberately. Preserve IDs, roles, protected-space access, source rights, outbox identities, tombstones and job receipts. Do not auto-resume an uncertain public publish after import.

Migration should support a drain/read-only window, snapshot + final delta, destination integrity/authorization checks, explicit cutover and a rollback plan that accounts for writes after cutover. A one-time private SQL backup is a useful proven building block, not a finished operator recovery product. Recovery must cover OAuth seals, signing keys, blobs and old encrypted DM material as separate concerns.

## Next implementation slices

1. Finish/qualify the current hosted resident run and ordinary signup/first-post journey; retain the public-only resident boundary.
2. Extract Watch's pure normalization/evidence/packet-validation core with provenance and fixtures; add Node/D1 repository parity for a bounded public corpus.
3. Port the existing web OAuth/session/assets contract to the Node server; qualify Linux restart and current-session revocation. Package Docker against that same entrypoint.
4. Implement manifest validation, `plan` and `doctor` first, then CLI setup and the GUI as an adapter over those functions. Reuse the PDS planner's dry-run/secret-reference conventions without bundling PDS hosting into default forum signup.
5. Build the isolated core Cloudflare template, orchestrated optional-service deploy, encrypted restore command and matched release artifact. Verify on a fresh account/host and a real upgrade, rather than declaring portability from types alone.

The complete foundation still includes mentions, offers/events, protected knowledge/cultural collections, governance, discovery/ranking and operator recovery. They remain recorded in the ledger; this distribution plan does not replace them with an installer project.
