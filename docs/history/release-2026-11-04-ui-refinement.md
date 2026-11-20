# ETNOS contribution and typography refinement — 4 November 2026 (Bangkok)

Live alpha: https://etnos.space. This implements the previous Impeccable P1/P2 list and the owner’s requested font-pair, cleaner Serat and expressive-profile direction.

## Exact runtime receipt

- Engine `cfa1fc3848158e602dd9edcee462d4143f5074e2` (`feat/connected-oauth`).
- Honai UI `c7633bc2a3288f606d5449cf2a0085704a78117c` (`feat/strata-connected`).
- Worker `strata-preview`, version `90e55f56-99ef-43b1-a106-eee3d069155f`, 100% in deployment `a16ca876-a29b-49e6-8fe6-396ccd12d872`.
- Uploaded 3 November 2026 18:56:25.412901 UTC / 4 November 2026 01:56:25.412901 Bangkok.
- Worker bundle 3,768,734 bytes, SHA-256 `b98434431f2f2b08df37120bf5669a41bc8a93affd5d1f3457b24c7b6f1a9be5`.
- 75 static assets, 3,054,623 bytes. Default font faces are served locally; optional font families load on selection. Asset byte totals are not initial-transfer sizes.
- Cloudflare reported 420ms startup at upload; this is not a user-traffic latency benchmark.

Existing origins, Durable Object namespace/class/logical node, secrets, WPW and AI bindings, disabled AT broadcasting, compatibility settings and disabled persisted observability were retained. Application schema remains **18**; no migration, new storage service or paid-plan change was introduced.

## Delivered behavior

Wiki/proposal forms now guard dirty and busy dismissal, recover account/page/base-scoped drafts within the same browser tab for at most 24 hours, clear local drafts on logout/account changes, and retain work when a newer base requires explicit comparison. Denied tab storage produces a visible warning. Tab recovery is not encrypted custody or a durable backup. Tiptap teardown no longer updates Svelte state through its blur transaction after destruction begins. The sticky submit area reserves space when focusing final source fields.

Public wiki revisions/history expose minimal contributor/reviewer identity (id, name, kind), after existing access checks. Pending proposal attribution remains inside the existing restricted proposal view. Agent contributors are explicitly labelled; attribution text is separate from account facts. No private membership, group, credentials or institution-source projection was added. Additions/removals are highlighted with text markers and a bounded line comparison; complete versions remain available. Human acceptance and current base/digest checks stay authoritative.

Writing shows destination and reading audience before the text. Moving a dirty private draft to a public room requires an explicit confirmation. Community creation requires a visibility choice and explains reading separately from admission and public directory metadata. Mobile dock labels, grouped navigation, a compact place entry and clearer account/invitation/public-reading paths reduce recall. Post-option hit areas are 44px. Common API failures use task-oriented Indonesian; generic conflict wording does not promise draft preservation for unrelated actions.

Appearance now offers Gabarito + Instrument Serif (default), Geist + official Geist Serif, Instrument Sans + Instrument Serif, Geist + Newsreader, and Source Sans 3 + Source Serif 4. Font faces are self-hosted and choices persist on the device. The official Geist Serif Regular is unmodified from geist@1.9.0 with its OFL retained. Serat remains default with a quieter soft intensity; Full, Plain and Dither choices remain. Profiles retain an accent-tinted monogram cover and overlapping avatar. No profile-photo/banner-upload feature is implied. Root PRODUCT.md, DESIGN.md and a validated design sidecar record the actual system.

## Validation and limits

- 94 engine tests; core and Worker TypeScript; actual workerd storage/access/restart and web-origin contracts pass.
- Seven UI unit tests; zero Svelte errors/warnings; ESLint and production build pass. The existing 12 browser journeys plus the new refinement journey pass against the production preview. Final targeted verification repeats draft recovery/conflict/discard, all five actual font faces, explicit community audience, private-to-public confirmation, agent proposal/human acceptance/attribution and final-field clearance after reviewer corrections.
- Responsive evidence spans 320/390/768/1440px. Supplementary light-theme settings/profile/wiki checks pass without page errors. Tests use disposable loopback identities; there are no synthetic production writes.
- The independent Impeccable finish reviewer scored its listed corrections resolved and returned **ship at that bounded scope**. This is not a new whole-site score or claim of universal accessibility, security, physical-device or slow-network qualification. The prior 23/40 baseline is not replaced by an invented improved score.
- The manual detector produced three style warnings: legacy semantic diff border, legacy Instrument Sans declaration and explicitly requested Geist Serif. These are documented exceptions; no detector result is treated as proof of design quality.

Public MCP discovery/read, protected-space denials and current authorization tests remain applicable. Aksara core source remains unchanged; resident scheduling, institutional verification and private cultural export are outside this release. Live read-only follow-up is recorded in the connected UI refinement receipt.

## Live follow-up

Fresh anonymous browser checks pass all five self-hosted font pairs at 320px and 36 route/viewport/theme combinations (six route families at 390/768/1440 in dark/light), with no page errors, horizontal overflow or API writes. Public MCP feed read and health/auth-guidance/capabilities reads succeed. No existing user session or private data was used; authenticated permission/state evidence remains the qualified loopback tests.
