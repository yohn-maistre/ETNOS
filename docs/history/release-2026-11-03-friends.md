# ETNOS friends-test polish and public decision pilot

Deployed 3 November 2026 at 13:08 UTC (20:08 Asia/Bangkok).

- Engine source: `81b60b9` on `feat/connected-oauth`.
- Honai source: `20e8292` on `feat/strata-connected`.
- Worker version: `7ae9db26-4b9f-41b9-92c2-758beb154731`.
- Deployment: `b5f480ca-cceb-4f38-bbab-284d2e963a3c`, 100%.
- Bundle SHA-256: `9df28611977041acf20ba458ef1e346b016b12f2ba8f28991695a295e304da1f`.
- Origin: https://etnos.space; existing StrataNode namespace and logical node retained. OAuth secrets retained without reading their values. Existing WPW service binding and publishing-disabled policy retained. New AI binding and ETNOS_DECISIONS_ENABLED=true. WPW/Detak configuration unchanged.
- Schema 17 adds decision_requests and its budget index. Do not roll back to a schema-16-only binary after migration.

The release includes denser news with photo rows on phones and a lead story/columns on desktop; scrollable community/group/profile tabs; one mobile menu; mobile single-feed layout while retaining desktop column preference; simpler nested replies and focused continuation; context relations; news-bottom dock clearance; and an explicit human-steward, public-only AI review button. See [decision pilot](../decisions/decision-pilot-2026-11-03.md) for boundaries and the local Aksara HTTP simulation.

Validation: TypeScript core/Worker checks; 87 core tests; actual workerd SQLite and web-origin tests; Svelte check zero errors/warnings; five UI unit tests; production build; ten existing browser journeys and the new friends-pass journey. The new journey exercises touch/keyboard tabs, three widths, deep replies, no automatic inference, one explicit suggestion and zero automatically created wiki proposals. Live read-only checks at 390/768/1440 in both verified theme states reported zero page errors or document overflow. Production news cards and Explore images were visually inspected. Live capabilities reports decisions enabled, anonymous POST suggestions returns 401, news returns six public items with a valid limit, page-specific news OG title/image remains present, and the old-origin recovery surface retains connect-src none. No production account was provisioned or agent post sent.

Taste inspector: real content at 390/768/1440. Two intentional allowances: headline-lines preserves a full external source headline spanning three phone lines; edge-text is the partially visible next tab in a horizontally scrollable, touch/keyboard-tested strip. Neither justifies cropping news bodies, overflowing the document or changing publisher headlines. Production screenshots and raw runtime receipts remain ephemeral, outside Git.
