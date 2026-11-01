# PieFed behavior and Strata delivery ledger

Baseline: PieFed `36dbeb44e1a729466917dc6d141bc965f6557cb4`, local `app/models.py`, community/user/post/feed/topic routes and README. This is a living feature-family checklist, not a claim of endpoint/API/federation parity. Inspect full donor behavior when implementing each family. No copied implementation.

**Local** means implemented backend behavior with synthetic tests, not completed UI or production deployment qualification. **Partial** identifies a narrower implementation. **Planned** has no working feature claim. **Adapt** changes the donor behavior for the selected protocol/authority. **Separate** belongs outside ordinary Strata authority.

| Family | Status | Existing behavior / missing acceptance |
| --- | --- | --- |
| Public community discovery | Local | Bounded metadata; public reading independent of admission |
| Listed-private / hidden-private groups | Local | Read filtering and hidden existence; no E2EE claim |
| Open / approval / invitation admission | Local | Independent of visibility; public defaults approval |
| Membership, owner/moderator/member | Local | Current access, removal, no self-escalation |
| Applications and steward decisions | Local | Pending/approved/declined; no automatic reapplication or appeals |
| Recipient-bound invitations | Local | Hash-only token, expiry, one use, revoke, issuer authority checked |
| Community ownership transfer | Planned | Accepted handover, recovery and succession; avoid unilateral takeover |
| Profiles, avatars, banners, rules, links | Planned | Public actor/institution bindings; private affiliations excluded |
| Moderator invitation/management UI | Partial | Role changes in API; safe discovery and UI missing |
| Text posts | Local | Persistent bounded body; post title/link/media types still absent |
| Nested replies | Local | Same-community references and parent-publication ordering |
| Author edit history | Planned | Stable identity, revision/conflict and AT update semantics |
| Author deletion and tombstones | Planned | Scoped PDS authority, replies and public-copy limitations |
| Moderator hiding | Local | Local suppression, cancel unsent intent; no author PDS deletion rights |
| Locking, pinning, announcements | Planned | Typed permissions and thread lifecycle |
| Cross-posts / duplicate links | Planned | References and disclosure boundaries |
| Images, galleries, video, attachments | Planned | R2/audience-bound delivery, upload limits, metadata stripping and safe processing |
| Link previews / remote fetch | Planned | SSRF, redirects, size/time limits and cache privacy |
| Polls | Planned | Eligibility, closing, multiple choice and vote privacy |
| Events / calendars / reminders | Planned | Time zones, RSVP privacy, feeds and expiry |
| Votes | Partial | One local +/-/clear vote per admitted human; no agent votes or public voter list; no AT vote export |
| Ranking / vote display controls | Planned | New ordering exists; hot/top/active/controversial not implemented |
| Cursor pagination | Local | Permission filter before limit; bounded newest feed and tied timestamps |
| Following / subscriptions | Planned | People and communities; approval and private relationship semantics |
| Topics / groupings | Partial | Public topics can group multiple public communities; rich hierarchy/admin and topic UI absent |
| User-created feeds / nested collections | Planned | Public/private collection membership and export filtering |
| Place and language discovery | Partial | Public place/region/topic/language contexts and aliases; no personal affiliation mapping. Source-qualified names/relationships, multilingual aliases, no forced region ontology |
| Search | Partial | Bounded text substring with current permissions; full text, filters and indexing absent |
| Bookmarks | Local | Private to actor; revoked access disappears from collection |
| Read/unread / saved filters / favourites | Planned | Private preferences and no covert tracking |
| Notifications / mentions / subscriptions | Partial | Current-access activity inbox/read state; replies, review/admission and generic DM notices. Mentions/subscriptions/push/email remain absent |
| Reports and steward triage | Partial | Restricted queue, decision, no reporter ID in queue projection; escalation/appeal UI absent |
| Moderation log | Partial | Internal audit; audience-safe public/moderator projections absent |
| Appeals and correction requests | Planned | Independent reviewer, outcomes and private evidence |
| User/community/domain/instance blocks | Planned | Personal filters distinct from server admission and institutional access |
| Suspensions, bans and anti-abuse | Partial | Membership removal exists; site bans, account limits, spam/flood/rate/bot protections absent |
| Content warnings / NSFW / alt text | Planned | Accessible rendering, preference and media metadata |
| Flairs / tags / custom emoji | Planned | Permission, localization and asset provenance |
| Private messaging / chat | Partial | Experimental ts-mls client-encrypted 1:1 human DMs; invitations, blocking, single device and encrypted local vault. Unaudited; no interop/recovery or sensitive-use qualification |
| RSS/Atom, imports and scheduled posts | Planned | Publication rights, SSRF and reauthorization at send time |
| Login, registration modes | Partial | Trusted local credential provisioning only; no remote signup or proof of DID control |
| AT OAuth / narrow permissions | Partial | Official SDK, sealed state/session/DPoP, invited enrollment and CSRF. Live publishing qualification remains |
| Private-only identity / passkeys | Planned | Qualified identity provider or standard passkey implementation |
| Sessions / recovery / TOTP | Planned | Devices, expiry, compromise recovery, step-up and account linking |
| Account export/delete/migration | Planned | Include app-side state, private memberships, PDS separation and practical exit |
| Site settings / roles / legal pages | Planned | Supported operator model, governance and bounded administration |
| Federation | Adapt | AT selected; no implicit ActivityPub, Lemmy or PieFed wire compatibility |
| Public AT publication | Partial | Explicit per-community intent, SDK adapter, durable uncertainty; live writes disabled |
| Owned Lexicons / schema discovery | Planned | Example NSID only; ownership and production validation required |
| Ingestion / backfill / index repair | Planned | Verified source records, cursors, deletion, identity migration and bounded replay |
| AT PDS hosting | Separate | Optional existing PDS implementation, never synonymous with forum/node |
| Public/private move | Adapt | Reviewed new public contribution, not a visibility switch |
| Community Wiki | Partial | Public page, restricted proposal, exact review/base, accepted revisions, history |
| Wiki collaboration / correction UI | Planned | Proposal queues, reviewed rebase, revision detail/diff, safe rendering, contestation and page lifecycle |
| Research within Wiki | Planned | Typed evidence/datasets/methods; preserve perspectives rather than AI consensus |
| Protected institutional knowledge | Separate | Aksara Library and authority; no private Wiki archive in public Strata |
| PublicWork | Partial | Admitted institutional/group sponsors, explicit adoption/author consent, bounded agent grants and reviewed public results; milestones/execution adapters remain |
| Agents | Partial | Human operator, separate admission, expiring posting mandate, budget and revocation |
| Agent profile / handoff / mute | Planned | Public remit, operator/challenge route, human-first feed controls |
| Agent Wiki/work authority | Partial | Separate expiring/budgeted editorial and sponsor-work grants; human acceptance; no service-auth/model execution or tool rights |
| Aksara release integration | Separate | Development custody fixture only; qualify actual Rust authority/release port |
| A2A partner requests | Planned | Independent receiving admission, bounded scope, refusal and receipts |
| Iroh transfer / private peering | Planned | Native transport, peer enrollment, authorization and metadata threat model |
| Offline drafts / exchange | Planned | Pending/sent states, current grant checks, safe shared-device storage |
| Hardware / sensors / resident agent | Separate | Aksara adapters and physical-effect authority, with approved public projections |
| Shared compute | Planned | Opt-in jobs, quotas, trust and confidential-data limits |
| Mobile / keyboard / accessibility / localization | Planned | Honai UI integration and actual browser/device evidence |
| Local persistent runtime | Local | Node SQLite transactions, migrations and reopen tests |
| Serverless runtime | Local | Worker + SQLite DO port; actual-workerd tests; deployment evidence tracked separately |
| Backup/restore / disk limits / monitoring | Partial | Reopen/restart only; real recovery, incident response and quota qualification absent |
| UI / client API | Partial | Same-origin Honai app, shadcn-svelte/Lucide, real local APIs and isolated browser contracts; broader forum lifecycle remains |

The forum's launch gate includes account admission/recovery, abuse controls, ordinary post lifecycle, safe media if enabled, moderation, notifications, accessibility and operational recovery. Backend rows passing tests do not satisfy that launch gate. Higher-level Wiki/agent work must not hide missing ordinary forum behavior.
