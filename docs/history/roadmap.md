# Public-square-first roadmap

The new engine uses AT contracts rather than mechanically translating PieFed's Flask code. PieFed is a product-behavior reference. Keep a parity ledger, distinguish deliberate omissions from unsupported features, and do not claim complete PieFed compatibility.

The current baseline is [Decision 001](../decisions/decision-001-product-and-runtime.md); use [the feature ledger](../product/piefed-parity.md) for delivered versus missing behavior. The local/DO runtime port, admission and first social/Wiki backend slices have advanced; controlled AT OAuth and the connected Honai client now run in preview; owner callback, owned namespace and live publishing remain qualification gates. [Decision 002](../decisions/decision-002-groups-knowledge-and-regional-surfaces.md) defines the larger target and the invariants that small experiments must preserve. The list below expresses product coverage rather than a claim that earlier entries must be completed before any later prototype.

1. Qualify owned AT namespaces and real OAuth/session enrollment against an isolated PDS. Keep arbitrary DID provisioning limited to development. Export/recover identity without exposing private affiliation.
2. Finish ordinary human forum behavior: topics, feed collections, following, votes with explicit privacy, cursor pagination/ranking, reports, moderation history, notifications, editing and deletion. These should work without Aksara.
3. Add audience-bound media and private community invitations/ownership succession, with anti-leakage tests across feeds/search/exports/notifications.
4. Introduce AT ingestion with verified source/record references, bounded collection subscriptions, durable cursors, backfill, deletion and identity-change handling. Public policy/record ownership must be explicit; valid signature does not force acceptance.
5. Add one real community/organization landing page and agent public profile. Bind verified operators and mandates, and test abuse/cost limits. Keep compute credentials behind admission.
6. Add source-backed Wiki proposals, exact-base steward decisions, contested perspectives and immutable revisions; then one explicitly institution/community-sponsored PublicWork/data-request profile, with current sponsor-bound authority. A public project is not an institutional WorkObject.
7. Replace the development custody fixture with the existing Aksara authority port and actual reviewed-release proof. Prove current source rights, origin/replay handling, receiving admission and correction/withdrawal.
8. Connect one A2A task between independent domains, then one optional permitted Iroh artifact transfer. Authenticated peers remain callers, not deputies. Test revoked peers, interrupted transfers and reauthorization after reconnect.
9. Qualify small-host and serverless profiles separately: measure resources, restore backups, rebuild public indexes, simulate outages and record operational costs.

Reference sources studied before this foundation:

- [AT overview](https://atproto.com/guides/overview), [application architecture](https://docs.bsky.app/docs/advanced-guides/federation-architecture), [Spaces alpha limitations](https://atproto.com/blog/atproto-spaces-alpha).
- [PieFed](https://codeberg.org/rimu/pyfedi), source inspected at `36dbeb44e1a729466917dc6d141bc965f6557cb4`. No implementation code copied.
- [Tiles](https://github.com/tilesprivacy/tiles/tree/fae4dcf63021697fe9caf3b7f94f35a2fefb0a9d), [Iroh](https://docs.iroh.computer/what-is-iroh): architectural references, no donor code copied.
- [Aksara](https://github.com/yohn-maistre/aksara-core), inspected at `2017d5b4b9363cad7ccf90e6cf964a1cd9641dfd`: current authority and publication seams. An interface/schema is not a production adapter.

The catalogue's source and permission boundaries are retained; AT selection and Iroh transport qualification reflect the owner's subsequent direction. The old Honai UI/main deployment is unchanged.

## Next product foundations

Implement local governed Groups/Spaces and explicit forum bindings, public place/topic contexts without inferred membership, institutional pages and deliberate work adoption, then explicit agent editorial drafts with current rights and exact-base review. Build the AT Group adapter in an isolated experimental profile. ETNOS is general-purpose, with Papua as the first regional lens. A funded listen-first hotline is a later surface, not a launch dependency. The full model, staged acceptance evidence and domain transition are specified in Decision 002.

## Community language preservation and corpus work

The [Mee pilot / community-language custody assessment](../research/2026-11-01-community-language-custody.md) records the renewed purpose, current AT Spaces/ActivityPods evidence, separate preservation/training/publication permissions, Aksara implementation gaps, reusable language tooling and the accompanying UI follow-through. It is a research proposal, not an approved collection protocol or a shipped private-federation/training feature.

The owner selected the narrower [forum-first alpha](../decisions/decision-003-forum-first-alpha.md): community-scoped content and access, operational forum/moderation and bounded Aksara participation first. Corpus/training/archive plumbing remains deferred.

Latest forum-first work: [rich content, lifecycle, capacity and Spaces experiment](forum-rich-content-checkpoint.md).
