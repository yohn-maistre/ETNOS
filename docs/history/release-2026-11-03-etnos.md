# ETNOS alpha delivery — 3 November 2026 (Asia/Bangkok)

Live: https://etnos.space

## Source and deployment

- Engine code: `aa24b1f398baabed01bd7e67092b5a59eb7e5371` on `feat/connected-oauth` (PR #1).
- Honai UI: `b1ce8699eddcee16d3893396b99de661a3c24986` on `feat/strata-connected` (PR #1).
- Current Worker deployment: `8658d6fce2d843a582f45a216d106558`, uploaded 2026-11-02 17:37:22 UTC / 3 November 00:37:22 Bangkok.
- Worker artifact SHA-256: `9cca5e07bd19e8d6cac13cd0a73d1ae8ced325f26393bc494243aff084747c85`; 2,873,819 bytes. Reported startup 148 ms is a deployment observation, not a traffic-capacity benchmark.
- Static assets: 35 files, 1,657,649 bytes; the runtime correction retained the existing UI assets.

The canonical origin, logical node `preview`, existing Durable Object namespace, schema 15, OAuth/seal secrets and WPW service binding were preserved. No new database migration, R2 bucket, paid service, PDS rollout or account migration. Anyone can read the public forum; posting remains invite-only, and AT broadcasting remains disabled. Legacy-origin recovery and canonical redirects remain in place.

## Delivered

Native WPW news summaries with original sources, credited images and public place maps; exact-link related discussions behind ordinary current access checks; video cover/title cards in composer/feed, with no player or video buffering until Play; full-screen image viewer with caption and ALT; improved profile/community identity headers and media views; community pagination; desktop inline and mobile docked replies; entry back/scroll restoration; flat sidebar and one mobile menu; compact poll choices and form controls; one thin request-lifecycle loading line and page skeletons; optional stronger texture; optional Lajur feeds with at most three columns and active-only mobile loading.

Photo re-encoding/compression and metadata stripping were already in the upload path and remain enforced. No public follower or private institution-membership disclosure was added. Native news and multi-column code are lazy loaded.

## Evidence

- 74 engine tests, type checks, actual workerd SQLite/access/transaction/restart checks, and the actual web Worker contract pass. The web contract now exercises outbound oEmbed, video-cover and news-photo requests and checks that forum cookies/authorization never reach them.
- Five UI checks, Svelte diagnostics (zero errors/warnings), lint and production build pass. Eight browser journeys pass across the implemented areas. After changing the loader, its journey was updated to assert the progress line and reduced-motion behavior. The new journey also verifies native news sharing/discussion, community pagination, cover-only preview before Play and 320/390/768/1440px bounds.
- Source-code CI is green in both repositories, including the separately packaged optional PDS tests. That does not make the PDS live or security-qualified.
- Live anonymous screenshots cover home, Explore, native news and Lajur at 320/390/768/1440px, with no horizontal overflow, page errors or external player requests before Play.
- Live `/health` reports `atproto-oauth-invite-only` and federation disabled. The news feed returns 12 actual items; Explore presents nine and the home rail five. Published story/source/place reads return 200.
- The actual posted YouTube link resolves to **Inside the World’s Most Hidden Conflict**; its cover returns JPEG, 30,789 bytes. A live news photo returns JPEG, 148,359 bytes. No iframe/native video element exists before Play. Origin-only iframe identification is checked separately without downloading player bytes.

All browser writes use isolated loopback fixtures. No synthetic posts, people, polls or discussion results were seeded into the public site. Live checks are anonymous reads, not real-user OAuth completion, an AT publish, a confidential-data trial or a production-security audit. Publisher image availability and video-provider playback restrictions remain external dependencies.

## Follow-up design, not shipped features

[Wiki and community engagement](../product/wiki-and-community-engagement-2026-11-03.md) records a reviewed knowledge atlas, optional public Git export, restricted proposal/reviewer groups, selective rich editing and the question → response → report → institutional follow-through loop. Existing community polls are not representative surveys or cryptographically secret ballots. No consultation/report system or additional AI pipeline is implied by this release.
