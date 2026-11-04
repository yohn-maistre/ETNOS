# ETNOS navigation and automatic-theme release

Deployed at **4 November 2026, 15:38 Bangkok** (08:38:06.971524 UTC), serving https://etnos.space at 100%.

| Item | Value |
| --- | --- |
| UI source | `yohn-maistre/honai-metro` `df89bae9a9f63bf74060b65765cb90ba5b445524` (main change `3bb19b8`) |
| Engine runtime source | `cfa1fc3848158e602dd9edcee462d4143f5074e2`, unchanged from the prior UI release |
| Worker | `strata-preview` |
| Version | `5fc90ae7-2665-4242-a72e-86853e53b230` |
| Deployment | `120e4fe2-2359-4f7e-bbb3-b676a518be15` |
| Backend module | 3,768,734 bytes; SHA-256 `b98434431f2f2b08df37120bf5669a41bc8a93affd5d1f3457b24c7b6f1a9be5` (byte-identical) |
| Static assets | 74 files, 3,049,125 bytes; no FeedBoard/FeedColumn chunk |
| Durable Object | Existing `2b28195b06644e77bc380c8d41b65ce6`, `StrataNode`, node `preview` |
| Schema | 18, no migration |
| Compatibility | `2026-10-23`, `nodejs_compat` |

Preserved existing OAuth/sealing secrets, AI and WPW service bindings, production origin, decision opt-in support and disabled AT broadcasting. No Aksara Core changes, institutional credentials, private-source indexing or synthetic production posts.

## Delivered behavior

Home returns to one feed; Lajur and the added welcome/context row are removed. Old `/board` URLs go Home. The earlier profile cover remains without oversized initials. Shared destinations precede Posting and personal tools; Settings is above sign-in/profile, and collapses to an accessible icon on tablet. Phones have a topbar theme control.

A unified directory links communities, organisations, places/languages and followed rooms. Permission-filtered organisation links group visible rooms; a public child does not expose a hidden parent. Room admission stays independent. Empty context relations stay hidden. Native horizontal tabs and stacked search/selectors support narrow screens.

Fresh presentation defaults use sky blue and the device-local clock: light 06:00–18:00, otherwise dark. Explicit legacy/manual choices remain intact. Automatic changes ease over 30 seconds, with contrast-guarded intermediate palettes; reduced motion skips the prolonged shift. The news index and Explore retain padded text when photographs fail. Phone link previews stay compact; the composer has one close action and a reachable header submit with native validation.

## Validation

- Connected app: zero Svelte errors/warnings, production build and 9 UI unit checks, including both clock boundaries and intermediate text/action contrast on every base in both directions.
- All 14 loopback browser journeys passed against the production build. New coverage includes 24 route/width samples, legacy layout redirects, directory grouping/private-parent filtering, failed photos, scheduled/manual/legacy theme preferences, reduced motion and 390×500 composer controls.
- Final compact Settings change: repeated check/build and navigation contract, including hidden visual label at 768px with the accessible name retained.
- Live anonymous browsing: 24 loaded route/width/theme samples (390/1440px, light/dark), `/board` redirect and public profile cover, zero browser errors. Final asset-matched Settings/Home checks pass at 390/768/1440px.
- Live health is 200; the unchanged official client lists eight anonymous MCP tools and reads the public feed. No production writes.
- Existing backend/MLS/privacy qualification remains in prior receipts. No new backend test claim is made for this frontend-only pass. Existing crypto bundler notices and entry/editor chunk-size warnings remain; physical-device keyboard behavior is still a tester check.

UI model rationale, primary references and synthetic screenshots: [navigation follow-up](https://github.com/yohn-maistre/honai-metro/blob/feat/strata-connected/docs/strata/navigation-2026-11-04.md). The Open Groups public/private Space distinction informs discovery; experimental AT Spaces is not enabled for production cultural-data storage.

Previous complete version for operational rollback: `90e55f56-99ef-43b1-a106-eee3d069155f`. A short intermediate UI upload was superseded by the final compact Settings version above. Storage and credentials are unchanged.
