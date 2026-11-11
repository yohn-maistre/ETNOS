# Complete feature ledger

Reviewed 11 November 2026. Every entry is in scope; status describes actual evidence, not priority. See [build order and gates](execution-plan.md), [source edition](living-commons.md) and [canonical JSON](feature-ledger.json). No new runtime capability is claimed by this planning checkpoint.

| ID | Capability | Stream | Current state | Dependencies |
| --- | --- | --- | --- | --- |
| [F01](#f01) | Engine + connected UI distribution | A | partial | Existing baseline |
| [F02](#f02) | Six-step instance onboarding | G | planned | F01, F09, F24, F47 |
| [F03](#f03) | Open provider signup and account continuity | A | partial | Existing baseline |
| [F04](#f04) | Compact five-anchor responsive shell | F | partial | F01 |
| [F05](#f05) | Separate contexts, feeds and identity | A | partial | F04 |
| [F06](#f06) | Native artifact cards and contextual panels | F | partial | F04, F43 |
| [F07](#f07) | Composable communities and ordinary language rooms | D | partial | F05, F43 |
| [F08](#f08) | Human, collective and institutional profiles | D | partial | F06, F32 |
| [F09](#f09) | Configurable source registry | B | partial | F43 |
| [F10](#f10) | Safe discovery and source egress | B | partial | F09 |
| [F11](#f11) | Acquisition snapshots, provenance and rights | B | partial | F10, F69 |
| [F12](#f12) | Deduplication and syndication | B | planned | F11 |
| [F13](#f13) | Developments, Issues and optional decision models | B | planned | F12, F27 |
| [F14](#f14) | Native news pages and social discussion | B | partial | F06, F13 |
| [F15](#f15) | Public literature and knowledge bootstrap | B | planned | F11, F16 |
| [F16](#f16) | Working knowledge contributions | B | partial | F43, F44 |
| [F17](#f17) | Reviewed Wiki revision experience | B | partial | F16, F19 |
| [F18](#f18) | Open, reviewed and restricted editorial policies | B | planned | F17, F44 |
| [F19](#f19) | Evidence kinds, claims and plurality | B | planned | F43 |
| [F20](#f20) | Corrections and dependency invalidation | B | partial | F17, F45 |
| [F21](#f21) | Wiki reader, atlas and linked contexts | F | partial | F17, F05 |
| [F22](#f22) | Explore curiosity modules | F | partial | F14, F21 |
| [F23](#f23) | Explicit For You and continued reading | F | partial | F22, F46 |
| [F24](#f24) | Embedded resident durable jobs | C | partial | F43, F44, F45 |
| [F25](#f25) | One resident identity with specialist skills | C | partial | F24, F28 |
| [F26](#f26) | Tool registry and runtime port | C | partial | F24 |
| [F27](#f27) | Model providers, secrets and measured budgets | C | partial | F26 |
| [F28](#f28) | Eligible mentions and public agent profiles | C | partial | F08, F05 |
| [F29](#f29) | Native agent artifact outputs | C | partial | F24, F06, F16 |
| [F30](#f30) | Current authority, anti-loop and effect controls | C | partial | F24, F44 |
| [F31](#f31) | External Aksara and compatible agents | C | partial | F26, F30 |
| [F32](#f32) | Verified representatives and response classes | D | planned | F43, F44 |
| [F33](#f33) | Questions, discussion and simple polls | D | partial | F07 |
| [F34](#f34) | Consultations, proposals, amendments and accountability | D | planned | F33, F44, F32 |
| [F35](#f35) | Sponsored PublicWork and follow-through | D | partial | F34, F32 |
| [F36](#f36) | Canonical offers, shops and contact flow | D | planned | F43, F44, F08 |
| [F37](#f37) | Payments, disputes and disclosed economics | D | planned | F36, F49 |
| [F38](#f38) | Public collections and cultural items | E | planned | F11, F43, F69 |
| [F39](#f39) | Protected Wiki, collections and page existence | E | planned | F46, F38, F18 |
| [F40](#f40) | Independent custody and approved derivatives | E | partial | F39, F20 |
| [F41](#f41) | Living language tools | E | planned | F07, F38, F39 |
| [F42](#f42) | Opt-in corpus, dataset and evaluation program | E | planned | F41, F40, F69 |
| [F43](#f43) | Seven common primitives over typed domains | A | partial | Existing baseline |
| [F44](#f44) | Shared transition checks and domain lifecycles | A | partial | F43 |
| [F45](#f45) | Events, outbox and dependency index | A | partial | F43 |
| [F46](#f46) | Permission-filtered projections everywhere | A | partial | F43 |
| [F47](#f47) | Role-aware Operator Studio | G | partial | F43, F44 |
| [F48](#f48) | Measured health, quotas and alerts | G | partial | F47, F24, F09 |
| [F49](#f49) | Moderation, report queue, appeals and reversal | G | partial | F44, F47 |
| [F50](#f50) | Plural governance, succession and roster privacy | G | planned | F32, F49, F64 |
| [F51](#f51) | Backups, restore and key/media recovery | G | partial | F45, F47 |
| [F52](#f52) | Owned AT records and live PDS reconciliation | G | partial | F44, F45, F56 |
| [F53](#f53) | Public ingestion cursor and index lifecycle | G | planned | F52, F46 |
| [F54](#f54) | AT Groups and GroupHost identity | G | partial | F32, F52 |
| [F55](#f55) | Spaces delegated backend sync | G | planned | F54, F46 |
| [F56](#f56) | PDS provider, handles and migration options | A | partial | F03 |
| [F57](#f57) | Low-bandwidth, offline and local node behavior | A | partial | F45, F51 |
| [F58](#f58) | Maps, place relations and safe observations | F | planned | F05, F43, F46 |
| [F59](#f59) | Reproducible public research and science | B | planned | F19, F45, F51 |
| [F60](#f60) | Voice, channels and local-language access | E | planned | F41, F46 |
| [F61](#f61) | Low-resource retrieval and semantic evaluation | C | planned | F27, F42 |
| [F62](#f62) | CARE, contested knowledge and source-use policy | E | partial | F19, F69 |
| [F63](#f63) | Genuine public seeding and resident introductions | B | planned | F15, F25 |
| [F64](#f64) | Export, exit and platform portability | G | partial | F46 |
| [F65](#f65) | Sustainable support, training and fees | G | planned | F36, F48 |
| [F66](#f66) | Field validation and meaningful measures | G | planned | F48, F62 |
| [F67](#f67) | Eight human stories and threat fixtures | G | planned | F30, F39, F35, F36, F51 |
| [F68](#f68) | Reproducible release and dependency provenance | A | partial | F01 |
| [F69](#f69) | Rights, custody and Local Contexts references | E | planned | F43 |
| [F70](#f70) | Actionable outages and incident notices | G | partial | F48, F49 |
| [F71](#f71) | Education and domain profiles without replacing systems of record | D | planned | F07, F35, F38 |
| [F72](#f72) | Route completion, accessibility and demo recording | F | planned | F06, F22, F67, F68 |

<a id="f01"></a>

## F01 — Engine + connected UI distribution

**partial · Stream A · Source sections 4, 22, 29 · Decisions D02, D03, D04, D14, D27, D28, D31, D32, D33, D34, D36, D37, D38**

Current evidence: Strata README.md; Honai apps/strata/UPSTREAM.md: separate buildable connected app, not embedded legacy Photon.

Acceptance: One canonical UI source, attributed donor snapshot, reproducible same-origin build and matched release manifest.

Release gate: Donor notices and build parity before source relocation.

Dependencies: existing baseline. Completion evidence: Local checkpoint 2026-11-11: Local canonical apps/web copy, donor notices, isolated install and successful UI build; hosted release manifest outstanding.; 2026-11-11 hosted checkpoint: canonical apps/web deployed on the existing same-origin Strata Worker; Honai main connected UI build passed. Receipt: docs/release-2026-11-11-commons-checkpoint.md.; 2026-11-11 plan: docs/portable-commons-and-watch-plan-2026-11-11.md maps Node/Docker/Cloudflare adapters, common CLI/browser wizard, Watch extraction, deploy-button limitations and migration gates. Installer and Linux web/Pi ports remain planned.; 2026-11-12 deployed welcome/profile/writing slice: matched main source, real provider form, visible existing rich editor/Ctrl+B fix, final solid compact compose buttons, quiet scrollbars and public browser qualification. Exact code/CI/version/deployment and remaining scope: docs/release-2026-11-12-welcome-writing.md. No claim of full foundation or hosted inference completion.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f02"></a>

## F02 — Six-step instance onboarding

**planned · Stream G · Source sections 18, 19 · Decisions D13, D14, D26, D34, D36, D37**

Current evidence: Public signup exists; complete operator setup wizard does not.

Acceptance: Operator configures identity/reach, participation, sources, intelligence, stewardship and previews actual eligible content before activation.

Release gate: Trusted operator identity; secrets server-side.

Dependencies: F01, F09, F24, F47. Completion evidence: 2026-11-11 plan: docs/portable-commons-and-watch-plan-2026-11-11.md maps Node/Docker/Cloudflare adapters, common CLI/browser wizard, Watch extraction, deploy-button limitations and migration gates. Installer and Linux web/Pi ports remain planned..

<a id="f03"></a>

## F03 — Open provider signup and account continuity

**partial · Stream A · Source sections 6, 18, 24 · Decisions D07, D08, D11, D12, D13, D14, D24, D25, D26, D34, D35, D36, D37**

Current evidence: docs/signup-2026-11-04.md; live /auth/options: open Bluesky provider flow.

Acceptance: New user creates provider account, returns through verified OAuth and enrolls without invite or automatic private membership.

Release gate: Second real-user completion and recovery qualification.

Dependencies: existing baseline. Completion evidence: 2026-11-11 owner-selected plan (not implementation qualification): Existing provider OAuth to accessible dismissible welcome/login dialog; direct login/recovery and public deep links retained. No new PDS/account backend. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md.; 2026-11-11 welcome/composer/profile implementation checkpoint: docs/welcome-and-profile-2026-11-11.md. Continuous fullscreen-to-dialog welcome over the current page, real provider form, local accent-aware prints/coded locations, existing profile editor and landscape footers; Local engine/UI/build and targeted production browser qualification passed; exact source/deployment receipts are maintained in that checkpoint. No change to membership or institutional authority.; 2026-11-12 deployed welcome/profile/writing slice: matched main source, real provider form, visible existing rich editor/Ctrl+B fix, final solid compact compose buttons, quiet scrollbars and public browser qualification. Exact code/CI/version/deployment and remaining scope: docs/release-2026-11-12-welcome-writing.md. No claim of full foundation or hosted inference completion..

<a id="f04"></a>

## F04 — Compact five-anchor responsive shell

**partial · Stream F · Source sections 5, 6, 7 · Decisions D05, D07, D08, D09, D10, D11, D12, D29**

Current evidence: Honai apps/strata/src/styles/conversation.css and existing shell/routes.

Acceptance: Compact readable desktop/mobile sidebar, Settings near account footer, reachable menu, no extra Home hero/Lajur, all bottom content clears navbar.

Release gate: Preserve 40px-or-larger menu targets and reduced motion.

Dependencies: F01. Completion evidence: Local checkpoint 2026-11-11: Local bounded centered shell, removed static region dropdown, restrained shared surface depth and floating labelled mobile dock; responsive checks at 320–1920 px and gradual theme/navigation paths pass.; 2026-11-11 owner-selected plan (not implementation qualification): Paper fresh default, distinct MessagesSquare private inbox and softer compose entry buttons; preserve saved choices, Jakarta + Geist Serif, sky accent and gradual themes. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md.; 2026-11-11 welcome/composer/profile implementation checkpoint: docs/welcome-and-profile-2026-11-11.md. Continuous fullscreen-to-dialog welcome over the current page, real provider form, local accent-aware prints/coded locations, existing profile editor and landscape footers; Local engine/UI/build and targeted production browser qualification passed; exact source/deployment receipts are maintained in that checkpoint. No change to membership or institutional authority.; 2026-11-12 deployed welcome/profile/writing slice: matched main source, real provider form, visible existing rich editor/Ctrl+B fix, final solid compact compose buttons, quiet scrollbars and public browser qualification. Exact code/CI/version/deployment and remaining scope: docs/release-2026-11-12-welcome-writing.md. No claim of full foundation or hosted inference completion.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained.; 2026-11-12 visual slice qualified locally: neutral shadow-free compact actions; outlined Jakarta startup, preloaded body font; abstract profile/seamless tabs; masked public community prints; semantic image hover/captions; monotonic request activity; mixed image/text Explore cards labelled newest. apps/web/tests/browser/commons-refinement.mjs plus welcome/signup journeys pass; engine 116 and UI 10 tests, Svelte 0 errors/warnings, production build. Ranking, custom photo persistence, Node bundle and integrated provisional Wiki are not qualified by this slice..

<a id="f05"></a>

## F05 — Separate contexts, feeds and identity

**partial · Stream A · Source sections 2, 6, 7, 16 · Decisions D04, D05, D06, D08, D11, D12, D28, D29, D30, D31**

Current evidence: docs/decision-002-groups-knowledge-and-regional-surfaces.md; existing context/group services.

Acceptance: Topics, places and languages are accurately labeled; switching lens changes discovery without switching actor or granting authority.

Release gate: No automatic ethnic/region membership or private roster inference.

Dependencies: F04. Completion evidence: 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f06"></a>

## F06 — Native artifact cards and contextual panels

**partial · Stream F · Source sections 6, 7, 15 · Decisions D03, D05, D08, D11, D12, D25, D26, D27, D29, D30, D31**

Current evidence: Existing post/news/Wiki routes and same-origin detail navigation.

Acceptance: Typed cards expose relevant actions; desktop panels and mobile sheets preserve origin, scroll and back without multiple feed columns.

Release gate: Keyboard, focus and direct-link fallback.

Dependencies: F04, F43. Completion evidence: 2026-11-11 reading pass: Jakarta/Geist Serif default, aligned Studio, original-ratio news/single-post images, single news discussion CTA, clear unread badges, stable muted avatar tints and static thread-end landscape; docs/ui-reading-pass-2026-11-11.md records screenshots and qualification.; 2026-11-11 welcome/composer/profile implementation checkpoint: docs/welcome-and-profile-2026-11-11.md. Continuous fullscreen-to-dialog welcome over the current page, real provider form, local accent-aware prints/coded locations, existing profile editor and landscape footers; Local engine/UI/build and targeted production browser qualification passed; exact source/deployment receipts are maintained in that checkpoint. No change to membership or institutional authority.; 2026-11-12 deployed welcome/profile/writing slice: matched main source, real provider form, visible existing rich editor/Ctrl+B fix, final solid compact compose buttons, quiet scrollbars and public browser qualification. Exact code/CI/version/deployment and remaining scope: docs/release-2026-11-12-welcome-writing.md. No claim of full foundation or hosted inference completion.; 2026-11-12 visual slice qualified locally: neutral shadow-free compact actions; outlined Jakarta startup, preloaded body font; abstract profile/seamless tabs; masked public community prints; semantic image hover/captions; monotonic request activity; mixed image/text Explore cards labelled newest. apps/web/tests/browser/commons-refinement.mjs plus welcome/signup journeys pass; engine 116 and UI 10 tests, Svelte 0 errors/warnings, production build. Ranking, custom photo persistence, Node bundle and integrated provisional Wiki are not qualified by this slice..

<a id="f07"></a>

## F07 — Composable communities and ordinary language rooms

**partial · Stream D · Source sections 3, 7, 11 · Decisions D05, D07, D08, D19, D20, D21, D22, D23, D24, D29**

Current evidence: docs/commons-implementation.md: local Groups/Spaces and community tabs.

Acceptance: Enabled modules compose one community; tabs scroll; empty/disabled modules do not overwhelm casual posting or language conversation.

Release gate: Space audience enforced independently of public group identity.

Dependencies: F05, F43. Completion evidence: not yet recorded.

<a id="f08"></a>

## F08 — Human, collective and institutional profiles

**partial · Stream D · Source sections 2, 7, 13 · Decisions D05, D06, D08, D10, D29, D30, D35**

Current evidence: Existing author profiles and local Groups; no verified institution onboarding.

Acceptance: Profiles show real identity/operator/status, contributions and optional docs/work/shop without fabricated verification or banner initials.

Release gate: Separate representation and posting grants.

Dependencies: F06, F32. Completion evidence: not yet recorded.

<a id="f09"></a>

## F09 — Configurable source registry

**partial · Stream B · Source sections 9, 18 · Decisions D13, D14, D18, D26, D34, D36**

Current evidence: src/news.ts is fixed WPW reader; Watch content/news-sources.json is reusable registry evidence.

Acceptance: Operator adds source role, language, scope, cadence, terms and index/news/review mode and sees sample results.

Release gate: Permission to add sources; no truth score from priority.

Dependencies: F43. Completion evidence: Local checkpoint 2026-11-11: Local src/discovery.ts source registry, state/rights/revision and Studio source flow; not deployed..

<a id="f10"></a>

## F10 — Safe discovery and source egress

**partial · Stream B · Source sections 9, 22, 23 · Decisions D02, D13, D14, D18, D23, D27, D28, D31, D32, D33, D34, D37**

Current evidence: Watch services/watch-engine/src/sources/discover.ts uses trusted fixed sources; arbitrary intake is unqualified.

Acceptance: Feed/page fetch bounds bytes, redirects, types, time and host reach; denied internal/credential-bearing targets cannot fetch.

Release gate: SSRF/DNS/redirect qualification or constrained broker.

Dependencies: F09. Completion evidence: Local checkpoint 2026-11-11: Local bounded allowlisted RSS/Atom/JSON Feed fetch and adversarial egress tests; not deployed or load-qualified..

<a id="f11"></a>

## F11 — Acquisition snapshots, provenance and rights

**partial · Stream B · Source sections 9, 10, 11 · Decisions D13, D14, D15, D16, D17, D18, D19, D20, D21, D22, D23, D24**

Current evidence: Watch ingest/process.ts records source/archive provenance; Strata has custody fixture only.

Acceptance: Every acquired resource has canonical source/time/hash, evidence kind, terms, excerpt/media use and retention; unauthorized body storage is refused.

Release gate: Source licenses and image rights; archive storage cap.

Dependencies: F10, F69. Completion evidence: Local checkpoint 2026-11-11: Local source snapshots/evidence and rights gates; full corpus provenance and rights program incomplete..

<a id="f12"></a>

## F12 — Deduplication and syndication

**planned · Stream B · Source sections 9 · Decisions D13, D14, D18**

Current evidence: Watch ingest/process.ts and cluster modules implement normalization/dedup for Watch.

Acceptance: Duplicate URLs/content/syndicated copies resolve to linked evidence without pretending each copy is independent confirmation.

Release gate: Canonicalization changes preserve provenance.

Dependencies: F11. Completion evidence: not yet recorded.

<a id="f13"></a>

## F13 — Developments, Issues and optional decision models

**planned · Stream B · Source sections 9, 10, 22 · Decisions D02, D13, D14, D15, D16, D17, D18, D27, D28, D32, D33, D34**

Current evidence: src/worker-decisions.ts supplies bounded decision adapter; no native Strata source clustering.

Acceptance: Headlines work without model; grouped developments and longer issues retain sources, uncertainty and editable membership; model abstains when unsuitable.

Release gate: Validate current free endpoint/model availability; no assumed free generation quota.

Dependencies: F12, F27. Completion evidence: not yet recorded.

<a id="f14"></a>

## F14 — Native news pages and social discussion

**partial · Stream B · Source sections 5, 9, 24 · Decisions D07, D09, D10, D13, D14, D18, D24, D25, D35, D36, D37**

Current evidence: Existing fixed-WPW news reader, Explore cards and news-linked posts.

Acceptance: Native configurable sources render cards, source comparisons, discussions, graceful padded photo fallback and complete mobile footer.

Release gate: Preserve WPW editorial identity and attribution.

Dependencies: F06, F13. Completion evidence: not yet recorded.

<a id="f15"></a>

## F15 — Public literature and knowledge bootstrap

**planned · Stream B · Source sections 9, 10, 18, 24 · Decisions D07, D13, D14, D15, D16, D17, D18, D24, D25, D26, D34, D35, D36, D37**

Current evidence: Current Wiki supports manually reviewed proposals; no source bootstrap.

Acceptance: A permitted publication yields source-linked working candidates and a visible review queue before people arrive.

Release gate: Public access does not imply republication or training license.

Dependencies: F11, F16. Completion evidence: not yet recorded.

<a id="f16"></a>

## F16 — Working knowledge contributions

**partial · Stream B · Source sections 8, 10 · Decisions D13, D15, D16, D17, D18, D20, D21, D22, D30, D35**

Current evidence: Public posts and Wiki proposals exist; no distinct working-page lifecycle.

Acceptance: People add a note, memory, question, correction or source with minimal ceremony; unresolved/plural accounts remain valid.

Release gate: No automatic promotion to accepted Wiki or official claim.

Dependencies: F43, F44. Completion evidence: Local checkpoint 2026-11-11: Local knowledge.ts notes/revisions/private membership filters and human Wiki promotion; source-to-note browser flow passes.; 2026-11-11 owner-selected plan (not implementation qualification): Make existing source-backed working notes visible as provisional starting points, with attributed contributions and the human-reviewed promotion path. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f17"></a>

## F17 — Reviewed Wiki revision experience

**partial · Stream B · Source sections 10, 21 · Decisions D13, D15, D16, D17, D18, D32, D37**

Current evidence: src/wiki.ts: public-only pages, proposals, digest/base review, revisions/history.

Acceptance: Reader sees readable page, sources and history; editor reviews diff, rebases conflict and accepts the exact current digest.

Release gate: No stale-base overwrite; human editorial acceptance per policy.

Dependencies: F16, F19. Completion evidence: 2026-11-11 reading pass: accepted-public Wiki discovery/excerpts, actual maintained-page/community browse, device-local continue reading and reader text size; docs/ui-reading-pass-2026-11-11.md. Draft/protected-page discovery isolation has a real API test.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f18"></a>

## F18 — Open, reviewed and restricted editorial policies

**planned · Stream B · Source sections 7, 10, 17 · Decisions D05, D06, D08, D13, D15, D16, D17, D18, D19, D20, D29, D30, D31, D37**

Current evidence: Current Wiki acceptance model is narrower; policy variants not implemented.

Acceptance: Each mode has explicit server-derived available actions and audit history; UI cannot bypass review by submitting another action.

Release gate: Current editorial role; policy migration does not expose private content.

Dependencies: F17, F44. Completion evidence: 2026-11-11: Wiki accepted-public discovery projection, excerpts/revision metadata and populated browse/recent cards; device-local continue reading and reader text size. Public/draft/protected migration fixtures verify no draft/private metadata enters discovery.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f19"></a>

## F19 — Evidence kinds, claims and plurality

**planned · Stream B · Source sections 8, 10, 17 · Decisions D06, D13, D15, D16, D17, D18, D19, D20, D21, D22, D30, D31, D35, D37**

Current evidence: Existing source digests and Wiki references are partial provenance, not a complete claim model.

Acceptance: Document, observation and permitted oral account can coexist; claims show uncertainty/contradiction without popularity-to-truth conversion.

Release gate: Interviews/recordings require source-specific consent/use policy.

Dependencies: F43. Completion evidence: 2026-11-11 owner-selected plan (not implementation qualification): Distinguish source-linked working notes, attributed accounts, reviewed reference and participation reports; preserve temporal scope, disagreement and correction. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md..

<a id="f20"></a>

## F20 — Corrections and dependency invalidation

**partial · Stream B · Source sections 10, 16, 21, 23 · Decisions D04, D11, D13, D15, D16, D17, D18, D23, D28, D29, D31, D32, D37**

Current evidence: Existing withdrawal fixture/outbox model; no full source-to-summary dependency propagation.

Acceptance: Correcting or withdrawing source flags affected pages/drafts/cards/jobs and blocks stale publication; public recall limits are stated.

Release gate: Retain lawful minimal receipt; no promise of internet-wide erasure.

Dependencies: F17, F45. Completion evidence: Local checkpoint 2026-11-11: Local source/post/edit/delete/moderation/accepted-Wiki context invalidation fences current and future resident contexts in the mutation transaction; acceptance/source rollback and late publication tests pass. Hosted correction program remains incomplete..

<a id="f21"></a>

## F21 — Wiki reader, atlas and linked contexts

**partial · Stream F · Source sections 5, 10 · Decisions D07, D09, D10, D13, D15, D16, D17, D18**

Current evidence: Existing Wiki/detail/context routes.

Acceptance: Related pages, translations, source links and place/language journeys connect naturally with reading continuity and accessible media.

Release gate: Avoid duplicating sensitive metadata in public related-page lists.

Dependencies: F17, F05. Completion evidence: Local checkpoint 2026-11-11: Existing Wiki reader has contents/history/sources; local contents clipping repair, Geist default/Jakarta option. Expanded atlas/discovery remains incomplete.; 2026-11-11 reading pass: accepted-public Wiki discovery/excerpts, actual maintained-page/community browse, device-local continue reading and reader text size; docs/ui-reading-pass-2026-11-11.md. Draft/protected-page discovery isolation has a real API test.; 2026-11-11 owner-selected plan (not implementation qualification): Contemporary culture/period pages reuse Wiki revisions and dated evidence; avoid a duplicate page per year or accepted discovery containing provisional drafts. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f22"></a>

## F22 — Explore curiosity modules

**partial · Stream F · Source sections 5, 6, 24 · Decisions D07, D08, D09, D10, D11, D12, D13, D24, D25, D35, D36, D37**

Current evidence: Existing Explore news, community voice and Wiki sections.

Acceptance: Featured page, on-this-day, permitted media and did-you-know cards use real eligible content; sections have clean single dividers.

Release gate: No invented anniversaries, top-read counts or cultural authority.

Dependencies: F14, F21. Completion evidence: 2026-11-11 reading pass: Jakarta/Geist Serif default, aligned Studio, original-ratio news/single-post images, single news discussion CTA, clear unread badges, stable muted avatar tints and static thread-end landscape; docs/ui-reading-pass-2026-11-11.md records screenshots and qualification..

<a id="f23"></a>

## F23 — Explicit For You and continued reading

**partial · Stream F · Source sections 5, 6, 25 · Decisions D07, D08, D09, D10, D11, D12, D38**

Current evidence: Current following/latest feeds and bookmarks are partial inputs; no For You explanation contract.

Acceptance: Person selects interests/languages, resumes reading and sees why a recommendation appears; chronological feed remains available.

Release gate: No inferred ethnicity or protected participation signals.

Dependencies: F22, F46. Completion evidence: 2026-11-11: Wiki accepted-public discovery projection, excerpts/revision metadata and populated browse/recent cards; device-local continue reading and reader text size. Public/draft/protected migration fixtures verify no draft/private metadata enters discovery.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained.; 2026-11-12 visual slice qualified locally: neutral shadow-free compact actions; outlined Jakarta startup, preloaded body font; abstract profile/seamless tabs; masked public community prints; semantic image hover/captions; monotonic request activity; mixed image/text Explore cards labelled newest. apps/web/tests/browser/commons-refinement.mjs plus welcome/signup journeys pass; engine 116 and UI 10 tests, Svelte 0 errors/warnings, production build. Ranking, custom photo persistence, Node bundle and integrated provisional Wiki are not qualified by this slice..

<a id="f24"></a>

## F24 — Embedded resident durable jobs

**partial · Stream C · Source sections 14, 15, 21, 22 · Decisions D02, D03, D12, D14, D25, D26, D27, D28, D30, D31, D32, D33, D34, D37**

Current evidence: src/agent-access.ts supplies entrance; no resident scheduler/lease/checkpoint loop.

Acceptance: Event/request resumes bounded work across restart, with lease generation, durable checkpoint and terminal receipt.

Release gate: Stale generations cannot act; bounded time/steps and kill switch.

Dependencies: F43, F44, F45. Completion evidence: Local checkpoint 2026-11-11: Local durable resident jobs, leases and budgets plus real Pi SQLite/workerd named-entrypoint/authority test pass at the engine compatibility pin; hosted inference/service bindings and full scheduler qualification remain pending.; 2026-11-11: native Studio setup uses real registration/admission and 24-hour posting/editorial grants with 3 jobs/day; private/no-automation/outsider/revoked-operator and replay tests pass. Pi service/bindings deployed, hosted inference awaiting authenticated operator activation.; Native activation refinement: explicit owner-only automation opt-in, atomic rollback on registration failure and 100-character idempotency keys covered; actual browser setup with initially disabled automation passes. Hosted Strata deployment a1bf590fe3f44e5e92a3e22f6b3b7a47; authenticated live inference still pending.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f25"></a>

## F25 — One resident identity with specialist skills

**partial · Stream C · Source sections 14, 15, 24 · Decisions D02, D03, D07, D12, D13, D24, D25, D26, D27, D30, D31, D35, D36, D37**

Current evidence: Agent actors/mandates exist, no deployed model acting as resident.

Acceptance: One labeled resident performs source/question/digest skills with operator identity; additional personas are optional.

Release gate: No synthetic crowd, false humanity or unconditional institutional voice.

Dependencies: F24, F28. Completion evidence: Local checkpoint 2026-11-11: Owner selected one Aksara identity and scoped specialists; local source/knowledge/question skills plus Pi helper. Mentions/weekly review incomplete.; 2026-11-11 research/plan: docs/agent-seeding-and-clustering-2026-11-11.md distinguishes optional real OpenCode companion/free-tier limits, Jev typed decisions and e-means batch clustering from explicit regional/institutional/offer structure. No new provider or clustering runtime enabled..

<a id="f26"></a>

## F26 — Tool registry and runtime port

**partial · Stream C · Source sections 14, 15, 22 · Decisions D02, D03, D12, D14, D25, D26, D27, D28, D30, D31, D32, D33, D34**

Current evidence: Aksara packages/runtime-pi and runtime-mastra illustrate bounded runtime boundaries.

Acceptance: Built-in runner and external harness use one typed tool/job/artifact interface with explicit capability budget.

Release gate: No arbitrary shell or global database/network tool by default.

Dependencies: F24. Completion evidence: Local checkpoint 2026-11-11: Local typed resident provider contract and Pi authority/model/tool adapters; native fixture loops passed, production qualification pending.; 2026-11-11 research/plan: docs/agent-seeding-and-clustering-2026-11-11.md distinguishes optional real OpenCode companion/free-tier limits, Jev typed decisions and e-means batch clustering from explicit regional/institutional/offer structure. No new provider or clustering runtime enabled.; 2026-11-11 owner-selected plan (not implementation qualification): Existing authenticated MCP is the harness-neutral external port; OpenCode is experimental/omittable; embedded Pi remains selected. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md..

<a id="f27"></a>

## F27 — Model providers, secrets and measured budgets

**partial · Stream C · Source sections 9, 14, 19 · Decisions D02, D03, D13, D14, D18, D25, D26, D27, D34, D37**

Current evidence: Cloudflare decision binding exists; embedded generation and provider quota accounting absent.

Acceptance: Operator chooses qualified model/provider, server-side secret, per-job/account budget and model-free fallback; failures remain actionable.

Release gate: Workers AI shared quota or separately verified free endpoint; no paid fallback.

Dependencies: F26. Completion evidence: 2026-11-11 research/plan: docs/agent-seeding-and-clustering-2026-11-11.md distinguishes optional real OpenCode companion/free-tier limits, Jev typed decisions and e-means batch clustering from explicit regional/institutional/offer structure. No new provider or clustering runtime enabled..

<a id="f28"></a>

## F28 — Eligible mentions and public agent profiles

**partial · Stream C · Source sections 2, 15 · Decisions D03, D05, D06, D12, D25, D26, D27, D29, D30, D31**

Current evidence: Actor-kind and agent access metadata exist; no full mention eligibility resolver.

Acceptance: Mention suggestions show only discoverable agents eligible in current scope, with operator/role/actions and clear unavailable states.

Release gate: No hidden membership, operator credential or institution spoofing leak.

Dependencies: F08, F05. Completion evidence: not yet recorded.

<a id="f29"></a>

## F29 — Native agent artifact outputs

**partial · Stream C · Source sections 6, 15 · Decisions D03, D08, D11, D12, D25, D26, D27, D30, D31**

Current evidence: Agent posting/editorial endpoints exist; no real resident execution.

Acceptance: Real job yields source comparison, diff, digest or question with trace/receipt in its destination feature.

Release gate: Evidence and audience revalidated at result use.

Dependencies: F24, F06, F16. Completion evidence: Local checkpoint 2026-11-11: Local resident result commit uses actual post/working-note pipelines and atomic terminal receipt; wider artifact types remain incomplete..

<a id="f30"></a>

## F30 — Current authority, anti-loop and effect controls

**partial · Stream C · Source sections 15, 17, 21, 23 · Decisions D03, D06, D12, D19, D20, D23, D25, D26, D27, D30, D31, D32, D37**

Current evidence: Existing expiring posting/editorial mandates and budgets, transactional outbox.

Acceptance: Revoked grant/source or stale job cannot publish; repeated triggers do not duplicate effects; stop control cancels eligible work.

Release gate: Boundary tests for revoke-after-read, timeout, replay and uncertain remote success.

Dependencies: F24, F44. Completion evidence: not yet recorded.

<a id="f31"></a>

## F31 — External Aksara and compatible agents

**partial · Stream C · Source sections 4, 15, 16 · Decisions D03, D04, D11, D12, D14, D25, D26, D27, D28, D29, D30, D31, D33**

Current evidence: Agent entrance exists; Aksara optional feat/etnos-public-reader branch is not main/live write integration.

Acceptance: Authorized external deployment reads allowed sources and posts a typed proposal through actual pipeline with separate credential and receipt.

Release gate: No access to institution private memory; credential issuance by legitimate operator.

Dependencies: F26, F30. Completion evidence: not yet recorded.

<a id="f32"></a>

## F32 — Verified representatives and response classes

**planned · Stream D · Source sections 2, 12, 15, 17 · Decisions D03, D05, D06, D10, D12, D19, D20, D25, D26, D27, D29, D30, D31, D37**

Current evidence: Local groups/sponsor work exist; auth options institutionalAccess false.

Acceptance: Human operator control is verified; institution grants scoped expiring authority; responses distinguish personal, draft and official.

Release gate: Real organizational verification; device attestation alone insufficient.

Dependencies: F43, F44. Completion evidence: not yet recorded.

<a id="f33"></a>

## F33 — Questions, discussion and simple polls

**partial · Stream D · Source sections 5, 12 · Decisions D05, D07, D09, D10, D30**

Current evidence: Current forum polls/Suara/replies are implemented per docs/forum-rich-content-checkpoint.md.

Acceptance: Casual question and poll are easy; accessible results and discussion do not imply binding mandate or factual truth.

Release gate: Current community membership/vote eligibility.

Dependencies: F07. Completion evidence: Local checkpoint 2026-11-11: Owner refined to ordinary typed posts and shared replies; current polls remain. No separate mandatory Discussion product; event/question slices remain pending.; 2026-11-11 owner-selected plan (not implementation qualification): Weekly questions/reports reuse posts/polls/replies, preserve method, response scope, disagreements and actual follow-through; no claim of population representativeness. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f34"></a>

## F34 — Consultations, proposals, amendments and accountability

**planned · Stream D · Source sections 5, 12, 21 · Decisions D05, D07, D09, D10, D30, D32, D37**

Current evidence: Existing Suara poll slice does not implement complete Decidim-style lifecycle.

Acceptance: Question accepts amendments/meetings, responsible response and action/no-action report; formal decisions have separate eligibility/quorum.

Release gate: Actual decision authority and participant rules; no vote-to-official shortcut.

Dependencies: F33, F44, F32. Completion evidence: not yet recorded.

<a id="f35"></a>

## F35 — Sponsored PublicWork and follow-through

**partial · Stream D · Source sections 2, 12 · Decisions D05, D06, D10, D29, D30**

Current evidence: Existing sponsored PublicWork service and local group work flows.

Acceptance: Commitment has responsible sponsor, milestones, volunteer contributions, progress/report and public receipt; personal task remains distinct.

Release gate: Sponsor role and work closure approval.

Dependencies: F34, F32. Completion evidence: not yet recorded.

<a id="f36"></a>

## F36 — Canonical offers, shops and contact flow

**planned · Stream D · Source sections 5, 13, 21 · Decisions D07, D09, D10, D32, D35, D37**

Current evidence: No native canonical offer/order workflow in current Strata baseline.

Acceptance: Seller creates one offer with price/status/location granularity/contact; same record projects to profile/community/Explore; contact works.

Release gate: Seller identity, abuse/reporting and sensitive location controls.

Dependencies: F43, F44, F08. Completion evidence: 2026-11-11 research/plan: docs/agent-seeding-and-clustering-2026-11-11.md distinguishes optional real OpenCode companion/free-tier limits, Jev typed decisions and e-means batch clustering from explicit regional/institutional/offer structure. No new provider or clustering runtime enabled.; 2026-11-11 owner-selected plan (not implementation qualification): Canonical offers and requests share provider/place/contact/status data and existing post/reply projections; basic listings free, actual contact before payments claims. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md..

<a id="f37"></a>

## F37 — Payments, disputes and disclosed economics

**planned · Stream D · Source sections 13, 24, 26 · Decisions D04, D07, D10, D13, D24, D25, D35, D36, D37, D38**

Current evidence: No payment provider, escrow or dispute integration configured.

Acceptance: Provider test-mode order/refund states and disclosed fees produce genuine receipts; live payment only after provider onboarding.

Release gate: Payment credentials, consumer/dispute policy and provider availability; not CF tier.

Dependencies: F36, F49. Completion evidence: not yet recorded.

<a id="f38"></a>

## F38 — Public collections and cultural items

**planned · Stream E · Source sections 8, 11, 20 · Decisions D15, D17, D19, D20, D21, D22, D23, D24, D30, D32, D35**

Current evidence: Custody/release development fixture is not a public collection product.

Acceptance: Collection/item describes permitted object, lineage, custodian and media/rights; finding aid does not imply access to original.

Release gate: Per-item rights and source attribution.

Dependencies: F11, F43, F69. Completion evidence: not yet recorded.

<a id="f39"></a>

## F39 — Protected Wiki, collections and page existence

**planned · Stream E · Source sections 8, 11, 23 · Decisions D15, D17, D19, D20, D21, D22, D23, D24, D30, D31, D35, D37**

Current evidence: src/wiki.ts explicitly restricts Wiki to public communities; private media checks exist.

Acceptance: Scoped participant reads page/item; outsider and revoked participant cannot learn existence/title/count or fetch history/media/export.

Release gate: All projection boundaries qualified before real sensitive data.

Dependencies: F46, F38, F18. Completion evidence: 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f40"></a>

## F40 — Independent custody and approved derivatives

**partial · Stream E · Source sections 4, 8, 11, 15 · Decisions D03, D04, D12, D14, D15, D17, D19, D20, D21, D22, D23, D24, D25, D26, D27, D30, D31, D33, D35**

Current evidence: Custody fixture has digest/release/withdrawal semantics, disabled by default; not Aksara grant evaluator.

Acceptance: Separate custodian approves exact public derivative with different ID; forum receives authorized output or refusal and respects withdrawal.

Release gate: Real institutional SharingGrant integration, not fixture credentials.

Dependencies: F39, F20. Completion evidence: not yet recorded.

<a id="f41"></a>

## F41 — Living language tools

**planned · Stream E · Source sections 3, 8, 11, 26 · Decisions D04, D07, D15, D17, D19, D20, D21, D22, D23, D24, D30, D35, D38**

Current evidence: Ordinary community conversation exists; structured lexicon/lesson/audio flow does not.

Acceptance: People converse, add opted-in lexicon/translation/lesson/audio items and control their audience without corpus enrollment.

Release gate: Language/custodian policy, accessible media and no automatic extraction.

Dependencies: F07, F38, F39. Completion evidence: 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f42"></a>

## F42 — Opt-in corpus, dataset and evaluation program

**planned · Stream E · Source sections 11, 26 · Decisions D04, D19, D20, D21, D22, D23, D24, D35, D38**

Current evidence: No implemented private dataset/training program.

Acceptance: Contributor-purpose permission creates versioned reviewed dataset with retention/withdrawal/evaluation policy; training scope is explicit.

Release gate: Program governance, source rights and separately provisioned training compute.

Dependencies: F41, F40, F69. Completion evidence: not yet recorded.

<a id="f43"></a>

## F43 — Seven common primitives over typed domains

**partial · Stream A · Source sections 20, 22, 1 · Decisions D01, D02, D07, D14, D24, D27, D28, D32, D33, D34**

Current evidence: Existing typed actors/communities/groups/contexts/posts/wiki/work; no common artifact/relation envelope.

Acceptance: Stable Actor/Scope/Artifact/Activity/Relation/Policy/Projection contracts link typed domains while preserving current storage and APIs.

Release gate: No destructive universal-blob migration.

Dependencies: existing baseline. Completion evidence: Local checkpoint 2026-11-11: Local commons.ts adds typed receipts/events/context epochs over domain tables; no universal blob replacement..

<a id="f44"></a>

## F44 — Shared transition checks and domain lifecycles

**partial · Stream A · Source sections 20, 21 · Decisions D24, D32, D37**

Current evidence: Existing optimistic Wiki review, mandate and outbox checks provide patterns.

Acceptance: Expected revision/action/request key/current authority and receipt are shared; each domain owns its states and available actions.

Release gate: Atomic writes and concurrency/replay tests.

Dependencies: F43. Completion evidence: not yet recorded.

<a id="f45"></a>

## F45 — Events, outbox and dependency index

**partial · Stream A · Source sections 20, 21, 22 · Decisions D02, D14, D24, D27, D28, D32, D33, D34, D37**

Current evidence: Existing public post/outbox transaction and reconciliation model.

Acceptance: Domain change and authorized event intent commit together; consumers are idempotent and source dependencies inspectable.

Release gate: No sensitive payload in public notifications/events; retention explicit.

Dependencies: F43. Completion evidence: Local checkpoint 2026-11-11: Local idempotent receipts/events and current source invalidation; full dependency invalidation/index incomplete..

<a id="f46"></a>

## F46 — Permission-filtered projections everywhere

**partial · Stream A · Source sections 11, 15, 17, 23 · Decisions D03, D06, D12, D19, D20, D21, D22, D23, D24, D25, D26, D27, D30, D31, D37**

Current evidence: Feed/search/private media enforce local checks; new private Wiki/prompts/embeddings absent.

Acceptance: Reads, search, cards, counts, caches, exports, prompts, model tools and media independently apply current audience; revocation invalidates derived views.

Release gate: Adversarial tests for public tools, hidden membership and cross-scope reuse.

Dependencies: F43. Completion evidence: not yet recorded.

<a id="f47"></a>

## F47 — Role-aware Operator Studio

**partial · Stream G · Source sections 18, 19 · Decisions D13, D14, D26, D34, D36, D37**

Current evidence: Scattered management controls exist; no unified role-separated Studio.

Acceptance: Infra operators, source editors and community mods see relevant actions; setup/review/jobs/quotas/recovery link to real objects.

Release gate: No DevOps secrets or cross-community mod access.

Dependencies: F43, F44. Completion evidence: Local checkpoint 2026-11-11: Local Studio source/knowledge/resident settings and job views, actual local browser journey; role-aware full operations scope incomplete..

<a id="f48"></a>

## F48 — Measured health, quotas and alerts

**partial · Stream G · Source sections 19, 25 · Decisions D34, D37, D38**

Current evidence: Current /health and /v1/capabilities exist; full measured usage/backup health absent.

Acceptance: Studio shows actual job state, freshness/errors, cost/storage headroom and backup age; unknown is visibly unknown.

Release gate: Cloudflare connector reauth/account telemetry permission; redact sensitive logs.

Dependencies: F47, F24, F09. Completion evidence: not yet recorded.

<a id="f49"></a>

## F49 — Moderation, report queue, appeals and reversal

**partial · Stream G · Source sections 17, 19, 23 · Decisions D06, D19, D20, D23, D30, D31, D34, D37**

Current evidence: Existing local hide/report/block flows; complete appeal/case lifecycle missing.

Acceptance: Assigned case captures allowed evidence, reason, decision, notice, appeal and reversible action with audit receipt.

Release gate: Honai donor behavior adapted to Strata authority, not legacy JWT API.

Dependencies: F44, F47. Completion evidence: not yet recorded.

<a id="f50"></a>

## F50 — Plural governance, succession and roster privacy

**planned · Stream G · Source sections 2, 17, 23 · Decisions D05, D06, D19, D20, D23, D29, D30, D31, D37**

Current evidence: Existing owner/mod/member roles; no full succession/representation dispute flow.

Acceptance: Group can transfer authority, document contested representation, dissent and leave without exposing private roster or implying pan-Papuan gatekeeper.

Release gate: Legitimate current grant and recipient acceptance; anti-lockout recovery.

Dependencies: F32, F49, F64. Completion evidence: not yet recorded.

<a id="f51"></a>

## F51 — Backups, restore and key/media recovery

**partial · Stream G · Source sections 19, 21, 23 · Decisions D23, D31, D32, D34, D37**

Current evidence: DO/Node restart tests exist; complete backup/restore qualification remains absent.

Acceptance: Synthetic backup restores relations, permissions, media and effect receipts without reissuing uncertain effects; key requirements documented.

Release gate: Restore evidence, protected export storage and operator custody.

Dependencies: F45, F47. Completion evidence: 2026-11-11: encrypted 63-table/125-row/two-blob backup restored locally; integrity/FK checks and real schema19-to24 migration passed. Recovery key remains ignored/private. Receipt: docs/release-2026-11-11-commons-checkpoint.md..

<a id="f52"></a>

## F52 — Owned AT records and live PDS reconciliation

**partial · Stream G · Source sections 16, 21, 22 · Decisions D02, D04, D11, D14, D27, D28, D29, D31, D32, D33, D34, D37**

Current evidence: Official SDK/Lexicon/outbox fixtures exist; liveFederation false.

Acceptance: Owned test account publishes/readbacks/updates/deletes canonical record and reconciles URI/CID after lost reply.

Release gate: Owned namespace, verified PDS credentials and live qualification.

Dependencies: F44, F45, F56. Completion evidence: not yet recorded.

<a id="f53"></a>

## F53 — Public ingestion cursor and index lifecycle

**planned · Stream G · Source sections 16, 22 · Decisions D02, D04, D11, D14, D27, D28, D29, D31, D32, D33, D34**

Current evidence: Current capability ingestion false; no qualified live indexer.

Acceptance: Cursor resumes public events/deletions/deactivation and rebuilds public indexes without private metadata.

Release gate: Protocol subscription/replay and deactivation tests.

Dependencies: F52, F46. Completion evidence: not yet recorded.

<a id="f54"></a>

## F54 — AT Groups and GroupHost identity

**partial · Stream G · Source sections 2, 7, 16 · Decisions D04, D05, D06, D08, D11, D28, D29, D30, D31**

Current evidence: Local Groups/Spaces are implemented; native Groups interop not qualified.

Acceptance: Qualified synthetic/owned group maps collective identity and role grants without treating context as group.

Release gate: Experimental protocol compatibility and actual authority-host control.

Dependencies: F32, F52. Completion evidence: not yet recorded.

<a id="f55"></a>

## F55 — Spaces delegated backend sync

**planned · Stream G · Source sections 11, 16, 23 · Decisions D04, D11, D19, D20, D21, D22, D23, D24, D28, D29, D31, D37**

Current evidence: Local Spaces lab fixtures exist; live private federation false.

Acceptance: Backend receives only delegated eligible streams, filters every viewer, handles revocation/cache TTL and uses space+author+collection+rkey identity.

Release gate: Protocol prototype qualification; no E2EE claim or real sensitive sync before isolation.

Dependencies: F54, F46. Completion evidence: not yet recorded.

<a id="f56"></a>

## F56 — PDS provider, handles and migration options

**partial · Stream A · Source sections 4, 16, 22 · Decisions D02, D03, D04, D11, D14, D27, D28, D29, D31, D32, D33, D34**

Current evidence: docs/pds-hosting.md and optional experimental Worker PDS; hostedAccounts false.

Acceptance: External provider remains default; native DNS/HTTP handle proof and migration plan survive host change without changing DID or community authority.

Release gate: Domain control, recovery and production qualification before hosted accounts.

Dependencies: F03. Completion evidence: 2026-11-11 plan: docs/portable-commons-and-watch-plan-2026-11-11.md maps Node/Docker/Cloudflare adapters, common CLI/browser wizard, Watch extraction, deploy-button limitations and migration gates. Installer and Linux web/Pi ports remain planned.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f57"></a>

## F57 — Low-bandwidth, offline and local node behavior

**partial · Stream A · Source sections 16, 22, 26 · Decisions D02, D04, D11, D14, D24, D27, D28, D29, D31, D32, D33, D34, D35, D38**

Current evidence: Local Node API exists; offlineSync/Iroh false.

Acceptance: Small payloads, resumable reading and explicit pending effects work offline; reconnect reconciles rather than blind-replaying.

Release gate: Independent local-node deployment/security profile; PDS offline limits shown.

Dependencies: F45, F51. Completion evidence: 2026-11-11 plan: docs/portable-commons-and-watch-plan-2026-11-11.md maps Node/Docker/Cloudflare adapters, common CLI/browser wizard, Watch extraction, deploy-button limitations and migration gates. Installer and Linux web/Pi ports remain planned..

<a id="f58"></a>

## F58 — Maps, place relations and safe observations

**planned · Stream F · Source sections 8, 20, 26 · Decisions D04, D15, D17, D20, D21, D22, D24, D30, D32, D35, D38**

Current evidence: Public contexts exist; full geospatial/observation experience absent.

Acceptance: Related place/region views accept provenance and appropriate precision; contested maps can coexist.

Release gate: No exposure of protected sites or inferred ethnic boundaries.

Dependencies: F05, F43, F46. Completion evidence: not yet recorded.

<a id="f59"></a>

## F59 — Reproducible public research and science

**planned · Stream B · Source sections 8, 22, 26 · Decisions D02, D04, D14, D15, D17, D20, D21, D22, D24, D27, D28, D30, D32, D33, D34, D35, D38**

Current evidence: No qualified scientific execution adapter; current capability scientific computation is not implied.

Acceptance: Research artifact records input hashes, method/version and inspectable output; external computation has explicit authority and receipt.

Release gate: Compute/runtime and scientific validation; no proof claim from schema.

Dependencies: F19, F45, F51. Completion evidence: not yet recorded.

<a id="f60"></a>

## F60 — Voice, channels and local-language access

**planned · Stream E · Source sections 3, 11, 26 · Decisions D04, D07, D19, D20, D21, D22, D23, D24, D35, D38**

Current evidence: Current public media/DM slices do not supply a complete voice/channel program.

Acceptance: Permitted recording/voice item has accessible playback/transcript fallback, audience and contributor controls.

Release gate: Storage/processing budgets, rights and actual device/network evaluation.

Dependencies: F41, F46. Completion evidence: not yet recorded.

<a id="f61"></a>

## F61 — Low-resource retrieval and semantic evaluation

**planned · Stream C · Source sections 10, 11, 15, 26 · Decisions D03, D04, D12, D13, D15, D16, D17, D18, D19, D20, D21, D22, D23, D24, D25, D26, D27, D30, D31, D35, D38**

Current evidence: Decision adapter exists; no qualified low-resource semantic corpus index.

Acceptance: Eligible corpus retrieves with provenance; language tests measure failure/abstention and private data stays isolated.

Release gate: Dataset scope and model suitability; no blanket vendor-training permission.

Dependencies: F27, F42. Completion evidence: 2026-11-11 research/plan: docs/agent-seeding-and-clustering-2026-11-11.md distinguishes optional real OpenCode companion/free-tier limits, Jev typed decisions and e-means batch clustering from explicit regional/institutional/offer structure. No new provider or clustering runtime enabled.; 2026-11-11 owner-selected plan (not implementation qualification): Immediate real upstream CPU Faiss e-means adapter selected, replacing the earlier wait-for-scale timing. Public versioned embeddings, actual fit/assign receipt, current eligibility and human corrections; no inferred institutional/region authority. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f62"></a>

## F62 — CARE, contested knowledge and source-use policy

**partial · Stream E · Source sections 3, 10, 11, 17 · Decisions D06, D07, D13, D15, D16, D17, D18, D19, D20, D21, D22, D23, D24, D30, D31, D37**

Current evidence: Existing source/release boundaries encode part of model; full cultural governance UX absent.

Acceptance: Public posting stays simple; sensitive use requests honor source-specific rights, plural authority and refusal.

Release gate: No centralized ethnicity verification or truth-by-engagement.

Dependencies: F19, F69. Completion evidence: not yet recorded.

<a id="f63"></a>

## F63 — Genuine public seeding and resident introductions

**planned · Stream B · Source sections 18, 24 · Decisions D07, D13, D14, D24, D25, D26, D34, D35, D36, D37**

Current evidence: Real existing human posts/news reader; no native reviewed bootstrap jobs.

Acceptance: Friend link opens useful sourced content and clearly labeled resident outputs; no fabricated humans, offices or sales.

Release gate: Rights/editorial review and honest test fixture labels.

Dependencies: F15, F25. Completion evidence: 2026-11-11 research/plan: docs/agent-seeding-and-clustering-2026-11-11.md distinguishes optional real OpenCode companion/free-tier limits, Jev typed decisions and e-means batch clustering from explicit regional/institutional/offer structure. No new provider or clustering runtime enabled..

<a id="f64"></a>

## F64 — Export, exit and platform portability

**partial · Stream G · Source sections 16, 17, 19 · Decisions D04, D06, D11, D19, D20, D28, D29, D30, D31, D34, D37**

Current evidence: AT identities are portable; full content/role/media export/exit not qualified.

Acceptance: Actor/group exports allowed data with rights/relations and leaves without handing private originals to platform/public export.

Release gate: Revocation/audience-aware export and successor/import test.

Dependencies: F46. Completion evidence: not yet recorded.

<a id="f65"></a>

## F65 — Sustainable support, training and fees

**planned · Stream G · Source sections 13, 23, 24, 26 · Decisions D04, D07, D10, D13, D23, D24, D25, D31, D35, D36, D37, D38**

Current evidence: No demonstrated operational cost/revenue program.

Acceptance: Actual hosting/model burden and optional support/training/fees are transparent and independent of editorial authority.

Release gate: No purchased verification, source prominence or institutional legitimacy.

Dependencies: F36, F48. Completion evidence: 2026-11-11 owner-selected plan (not implementation qualification): Validate paid setup/support and managed spaces, optional merchant tools and disclosed contextual placements around a free commons. Track human operating costs; no invented revenue or pay-for-authority. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained..

<a id="f66"></a>

## F66 — Field validation and meaningful measures

**planned · Stream G · Source sections 8, 25, 30 · Decisions D15, D17, D20, D21, D22, D30, D35, D37, D38**

Current evidence: No field study or success metrics established by source document.

Acceptance: Collect consented feedback on legitimacy, language, refusal, cost and completed actions; publish uncertainty and correction diversity.

Release gate: Privacy-conscious telemetry; no vanity engagement or invented results.

Dependencies: F48, F62. Completion evidence: not yet recorded.

<a id="f67"></a>

## F67 — Eight human stories and threat fixtures

**planned · Stream G · Source sections 8, 23, 24, 30 · Decisions D07, D13, D15, D17, D20, D21, D22, D23, D24, D25, D30, D31, D35, D36, D37, D38**

Current evidence: Existing policy/browser suites provide baseline, not all new stories.

Acceptance: A-H stories and five connected demo loops exercise real outcomes, stale authority, private probes, duplicate effects and source withdrawal.

Release gate: No fixture presented as production or verified real institution.

Dependencies: F30, F39, F35, F36, F51. Completion evidence: not yet recorded.

<a id="f68"></a>

## F68 — Reproducible release and dependency provenance

**partial · Stream A · Source sections 4, 22, 28, 29, 30, 27 · Decisions D02, D03, D04, D14, D27, D28, D31, D32, D33, D34, D36, D37, D38**

Current evidence: Engine main 3a6ed61; UI f489846; deployment receipts in docs.

Acceptance: One release manifest pins engine/UI/schema/providers/notices, checks and rollback/restore evidence; capability claims match deployed build.

Release gate: No unreviewed dependency license or secret in source.

Dependencies: F01. Completion evidence: 2026-11-11 plan: docs/portable-commons-and-watch-plan-2026-11-11.md maps Node/Docker/Cloudflare adapters, common CLI/browser wizard, Watch extraction, deploy-button limitations and migration gates. Installer and Linux web/Pi ports remain planned.; 2026-11-11 owner-selected plan (not implementation qualification): Concise continuing-project evidence: March Honai changes plus optional credited 2025 forum forks and current build; omit landing/Basehub links from judge-facing selection; retain detailed internal provenance. See docs/foundation/living-culture-refinement-2026-11-11.md and docs/foundation/execution-plan.md; lineage in docs/evidence/README.md..

<a id="f69"></a>

## F69 — Rights, custody and Local Contexts references

**planned · Stream E · Source sections 8, 11, 17, 20 · Decisions D06, D15, D17, D19, D20, D21, D22, D23, D24, D30, D31, D32, D35, D37**

Current evidence: Development custody fixture is narrow; no complete catalog rights model.

Acceptance: Rights state names permitted use, custodian, audience, protocol/label references and derivative/release obligations per item.

Release gate: Labels are references, not automatic consent or legal certification.

Dependencies: F43. Completion evidence: not yet recorded.

<a id="f70"></a>

## F70 — Actionable outages and incident notices

**partial · Stream G · Source sections 19, 23, 25 · Decisions D23, D31, D34, D37, D38**

Current evidence: Health endpoint exists; unified incident/affected-job notices absent.

Acceptance: Provider/source failures pause affected work with honest status, next action and recovery receipt without blocking ordinary reading.

Release gate: No exposed credentials/private evidence or fabricated green status.

Dependencies: F48, F49. Completion evidence: Local checkpoint 2026-11-11: Local Ding shared feedback/sound/mute/volume and contextual failure states; incident operations not yet complete..

<a id="f71"></a>

## F71 — Education and domain profiles without replacing systems of record

**planned · Stream D · Source sections 2, 4, 26 · Decisions D03, D04, D05, D06, D14, D24, D29, D30, D31, D33, D35, D38**

Current evidence: Generic groups/work exist; specialized profiles remain exploratory.

Acceptance: School/NGO domain enables relevant lessons/docs/work while independent institutional systems retain custody and execution authority.

Release gate: Explicit domain owner/purpose, no accidental records-system migration.

Dependencies: F07, F35, F38. Completion evidence: not yet recorded.

<a id="f72"></a>

## F72 — Route completion, accessibility and demo recording

**planned · Stream F · Source sections 5, 6, 24, 29, 30 · Decisions D07, D08, D09, D10, D11, D12, D13, D24, D25, D33, D35, D36, D37, D38**

Current evidence: Current responsive app and prior browser journeys exist; new routes not built.

Acceptance: Every shipped route has loading/empty/error/denied/success states; mobile keyboard/tabs/nav/theme work; Nov14 video records connected build.

Release gate: Manual device checks and exact recording build receipt.

Dependencies: F06, F22, F67, F68. Completion evidence: 2026-11-11 reading pass: Jakarta/Geist Serif default, aligned Studio, original-ratio news/single-post images, single news discussion CTA, clear unread badges, stable muted avatar tints and static thread-end landscape; docs/ui-reading-pass-2026-11-11.md records screenshots and qualification.; 2026-11-11 welcome/composer/profile implementation checkpoint: docs/welcome-and-profile-2026-11-11.md. Continuous fullscreen-to-dialog welcome over the current page, real provider form, local accent-aware prints/coded locations, existing profile editor and landscape footers; Local engine/UI/build and targeted production browser qualification passed; exact source/deployment receipts are maintained in that checkpoint. No change to membership or institutional authority.; 2026-11-12 deployed welcome/profile/writing slice: matched main source, real provider form, visible existing rich editor/Ctrl+B fix, final solid compact compose buttons, quiet scrollbars and public browser qualification. Exact code/CI/version/deployment and remaining scope: docs/release-2026-11-12-welcome-writing.md. No claim of full foundation or hosted inference completion.; 2026-11-12 owner refinement saved (planning, not qualification): docs/foundation/commons-experience-2026-11-12.md; A18–A20. Integrated provisional Wiki, independent Node/private language custody, AT adapter gates, restrained visual system and truthful discovery. Existing status retained.; 2026-11-12 visual slice qualified locally: neutral shadow-free compact actions; outlined Jakarta startup, preloaded body font; abstract profile/seamless tabs; masked public community prints; semantic image hover/captions; monotonic request activity; mixed image/text Explore cards labelled newest. apps/web/tests/browser/commons-refinement.mjs plus welcome/signup journeys pass; engine 116 and UI 10 tests, Svelte 0 errors/warnings, production build. Ranking, custom photo persistence, Node bundle and integrated provisional Wiki are not qualified by this slice..
