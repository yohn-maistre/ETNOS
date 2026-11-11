# Next connected slice: offers, requests and writing

12 November 2026, Asia/Bangkok. Authorized continuation of the complete implementation plan after the Wiki/CPU/ranking releases. This is implementation design, not a claim that the slice is shipped.

An offer/request is one ordinary canonical post plus a domain extension keyed by its post ID. The existing actor, community, text/title, images, context relations, discussion, moderation and profile projection stay canonical. Add only price/unit, offer/request kind, explicit place relation, status, expiry and revision. Do not duplicate a merchant catalog across four feeds or treat a Wiki mention as a verified business.

First lifecycle: open → paused/fulfilled/withdrawn, with expiry computed honestly. Only the human author changes commercial terms, against an expected revision and a body-bound idempotency key. Anonymous reading follows the post's actual audience; a global browse shows public items only. An explicit private-community browse rechecks membership. Hidden/deleted posts, lost membership and expired/closed offers leave discovery immediately. A normal post edit cannot overwrite a changed price; canonical projections read the current extension rather than a frozen JSON card.

Contact uses the existing reply/DM entrance with explicit human action and current access. Do not publish phone/email by default or claim an inquiry is a completed transaction. Basic listings are free. No checkout, commission, escrow, payment custody, buyer protection, inventory verification or institution verification is implied. Agents may help prepare drafts later; an ordinary posting mandate does not authorize a commercial offer.

Reuse Forum.create inside the same transaction as the offering extension and transition receipt. Keep existing attachment, context, request replay, rate and audience checks. Initially require local-publication communities: generic AT post export does not yet maintain a qualified offering price/status lifecycle. Avoid exporting a stale product snapshot as an interoperable catalog.

UI: an obvious offer/request choice in the compact composer; progressive fields for price/unit and place; ordinary rich text/images remain available. A restrained native card shows kind, actual terms/status and contact. Reuse it on the post/thread, profile and an optional browse filter with one ID. Owner controls update status, not fake sold counts. No permanent extra sidebar anchor is required.

Writing: continue the existing Tiptap/Markdown/scoped-image implementation. Aim for one writing area, direct formatting, reliable Ctrl/Cmd+B/I, selection/undo, obvious image/link/poll/event/offer controls, accessible labels, preserved advanced Markdown, a clear audience, one dialog scroller and reachable publish/discard actions on mobile. Do not lose unsent typed attachments when changing the post kind. Existing durable retry payload, audience-widening confirmation, media scope/alt requirements and session/CSRF checks remain authoritative.

Qualification: atomic post/listing failure rollback; body-bound duplicate requests; concurrent price/status updates; outsider/revoked/private discovery isolation; deletion/moderation/expiry; forbidden agent commerce and unqualified AT export; one canonical value across profile/community/browse; real reply/DM contact; narrow/keyboard/reduced-motion writing and existing edit/poll/event/image journeys. Keep synthetic fixture businesses clearly labelled; no fabricated live market activity fills a demo gap.

## Offering implementation and local qualification

Implemented in `src/offerings.ts`, the shared offering contract and canonical post projection. Schema 26 adds one post-keyed extension and versioned history. Core post permissions/media/moderation remain authoritative. Human authors have 40 active listings and 60 term changes per item/hour; updates use expected revisions and durable body-bound receipts. Server-relative durations avoid relying on the browser clock. Creation rejects reply/AT/agent commerce, conflicting post request keys, invalid currencies and closed initial state. Failed extension insertion rolls back the post and image attachment.

The composer now exposes Penawaran (offer/request, price/unit and duration). One card is reused in threads, community Penawaran, profile Penawaran and `/offers`, reachable from Explore without another permanent sidebar anchor. Owner changes price/status in place. Public contact opens the existing recipient message entrance; protected listings use their current community discussion. This does not claim that a message was sent automatically or a transaction completed. Existing public reply creation was exercised as a real inquiry in the isolated browser fixture.

Local qualification: engine typecheck/130 tests including actual optional CPU fitting; UI typecheck zero errors/warnings, ten tests and production build; actual workerd public-listing/private-isolation contract; browser composer → canonical record → profile price edit → current community price → message entrance → actual inquiry reply → fulfillment and removal from open discovery, at 390/1440px. Existing welcome/signup/editor and Wiki journeys still pass. Fixtures are explicitly synthetic; no live seller, purchase or institutional endorsement is fabricated. Exact main/deployment receipt follows publication.

Adaptive writing remains the next part of this slice: rich formatting should be immediately usable, and long writing should have one scroll region and compact optional panels. The current visible Format control is retained until that change is qualified.

## Hosted offering release receipt

Strata `06f22ef`; matched public Honai Metro main `6140f66`. Existing Worker deployment `5d6295d2-e561-4842-a89d-33c3667cb68a`; version `dcee5713-6b1a-4252-8652-4f5aef74a339`, 100% traffic, created `2026-11-11T23:25:01.552156Z` (November 12 Bangkok). Server SHA-256 `b5cd38f9cebaf219fc6c5576f82996c0d3b22ee39264475dfaae25c5175960e5`, etag `c24b7a2eea6ffc4cae0adea71a5b67d84dbe539cd3095fbdae3130127d07ecfb`. Schema 26 applied additively; current OAuth/secret/DO/service bindings retained and no new paid resource or model request.

Public smoke matched the exact built bundle, actual public offer catalog and sort/Wiki/snapshot contracts, and narrow widths 320/390/1440 without overflow. Existing profiles, community art, welcome/auth controls, directly readable Wiki and recovery remained available; health `ok`, zero page errors. No live seller, offer, inquiry or purchase was inserted by this smoke.
