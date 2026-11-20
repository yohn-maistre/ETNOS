# Commons experience and Node integration — 12 November 2026

Owner refinement, before the 14 November demonstration. This supplements the complete foundation; it does not replace its source or describe unbuilt features as delivered. Canonical UI is `apps/web`. [Execution plan](execution-plan.md), [feature ledger](feature-ledger.md), [next demo sequence](../competition/demo-release-next-2026-11-12.md), [writing experience](../product/writing-and-context-plan-2026-11-12.md).

## One understandable model

| Primitive | Meaning | Example | Authority consequence |
| --- | --- | --- | --- |
| Context | A description and set of relations; not a membership container | Tigi, Meepago, Mee language, reggae | No automatic membership, identity inference or right to speak for people |
| Community | A governed conversation with its own membership, rules and publication policy | Public Tigi commons; invited Mee language room | Access checks apply to every read, search, count and effect |
| Organization | Accountable institution/group and its authorized representatives | A language association or cooperative | A representative needs an explicit, current mandate |
| Space/audience | A specific access boundary for a community or organization | Public discussion, member room, custodians' work area | No implicit access through context, affiliation or an AT identity |
| Aksara Node | Independently operated custody, workspace and agent execution | Language recordings, internal channels, approved public derivatives | Separate storage/grants; the public steward has no automatic access |
| AT group identity | Optional interoperable group identity above permissioned spaces | A qualified future mapping of a governed group | Not a DID for every geographic, ethnic or language context |

Use typed many-to-many relations: community relates to place/language/topic; organization governs a community; context overlaps/contains/relates to other contexts. Administrative regions, customary territories and language use can overlap without one forced tree. A public context can link to a public language community without revealing that a hidden room exists. A private community does not become public because its place is public.

Home is a permission-filtered public commons/feed lens. **Beranda is one actual community**, not a universal parent or an authority over every community. The same post/offer/question/page retains one canonical identifier across permitted lenses.

## A useful Strata + Aksara Node bundle

Selected direction: package the two together for operators, keeping their authority boundaries intact. Strata remains usable without a Node or model. An optional Linux/Docker distribution can start Strata, an independently stored Node and an authenticated gateway; external AT providers remain the default identity route. Do not merge the institutional vault into the forum database or claim the existing Rust host runs inside a free Cloudflare Worker.

The hosted ETNOS Worker may connect to a separately operated Node over an explicitly configured authenticated endpoint. Node controls its own sources, workspace, cultural artifacts, language data, internal channels, jobs, grants, backups and publication decisions. Pairing must verify the Node/operator, issue narrowly scoped revocable credentials, show connection status, and support disconnect/export. MCP is the harness-neutral tool entrance, not the authorization evaluator. Public resident Pi and an institutional Node are separate principals even when their UI looks related.

PDS operations are optional infrastructure, **not a synonym for a private vault**. Standard AT repositories are public. A future Spaces-capable PDS remains separate from Node encryption, host trust and source custody. Existing Aksara development identities are not production authentication. Before claiming a working bundled journey: install on a clean host, pair two actual principals, exercise allowed/denied/revoked operations and backup/restore, publish only an approved derivative, and inspect all public projections for content and metadata leaks.

## AT beyond OAuth: implementation gates

1. Keep current official-SDK OAuth and local community policy. OAuth login alone is not public record interoperability.
2. Select an operator-owned production Lexicon namespace and record contracts for public posts/replies, article references and corrections; validate against official tools. Do not ship the example namespace as owned production authority.
3. Use existing transactional outbox/stable record keys. Qualification requires an owned test account: create, read back URI/CID, edit/delete with matching version, restart and reconcile a lost acknowledgement. An uncertain publication is not a safe unconditional retry. A disabled provider is an explicit unavailable state.
4. Add bounded public ingestion/readback with cursor recovery, deduplication, author/repository verification and deletion/takedown handling. Remote identity does not confer local membership or moderation powers.
5. Keep Groups/Spaces behind an experimental adapter and feature flag. Pin protocol/SDK versions and test a distinct non-sensitive environment. Map community membership and group roles deliberately, including the two-sided acceptance flow; test revocation and cache invalidation. Do not migrate real accounts or protected sources into the alpha to meet a demo date.

Official sources checked 12 November 2026: [Spaces alpha, 20 August](https://atproto.com/blog/atproto-spaces-alpha) says it is not production-ready, may destroy data, and provides access control rather than encryption. [Atmospheric Groups, 22 October](https://atproto.com/blog/atmospheric-groups-intro) describes the community proposal as a group DID with multiple permissioned spaces, separate writer repositories, roles and membership acceptance. This is a promising mapping, not evidence that our integration is already implemented or qualified.

## Private language participation

A language context is a discoverable description only where approved. An explicit language community can be private or hidden, governed by its own people, and linked to a Node for protected holdings. Everyday chat is not automatically a corpus. Recordings, transcription, annotation, training and publication each need their own permitted purpose and custody policy. Do not infer a person's ethnicity or language from their location/profile.

Private originals, their existence, member lists, embeddings, source labels and aggregate counts do not enter public AT records, global search, steward prompts, feed announcements or maps. Public derivatives have separate identifiers and approved text/media. Check grants at retrieval and again before the outward effect; withdrawal invalidates dependent work. Node storage/private discussion/Spaces interoperability are three related but distinct qualifications.

## One Wiki experience, steward first

Keep internal working-note and proposal machinery; remove the need for a separate public “working knowledge” destination. Wiki home contains a readable lead/atlas, selected pages, recently changed pages, and an **Dalam pengembangan** section for explicitly publishable provisional material. A provisional page needs a truthful review label, sources and correction path. Existing accepted revisions retain their human-reviewed meaning. Changing a homepage label must not silently relax `wiki.decide` or expose restricted proposals.

The steward can seed source-backed public drafts under an explicit editorial mandate and policy. It should abstain when evidence is thin and distinguish contemporary reports, attributed claims and interpretation. People can read, inspect citations, suggest corrections or contribute directly; writing is not an onboarding requirement. Review is an exception queue and visible status, not compulsory paragraph-by-paragraph bureaucracy.

Reader: clear title/summary, compact review and update information, sections, collapsible TOC, numbered citations, references, related pages, language/version choice, history and a reachable correction action. Preserve text-size/continue-reading and mobile reading width. Do not invent references or describe an AI draft as community consensus.

After an eligible page publication/update, one native attributed steward post may invite checking in the relevant community: “Halo, sa baru saja tambah halaman ini di wiki. Mohon dicek.” The exact voice is configurable. Link the page/revision, disclose the agent/operator, enforce current membership/mandate/quotas and use a durable deduplication key `(page, revision, community, announcement-kind)`. Announcements enter ordinary accessible feeds; no broadcast to every community, no private-source hints, no automatic announcement for every edit. Corrections can update the same conversation.

A Wiki-home atlas is an optional doorway, not a prerequisite to reading. Reuse WPW atlas code/texture only after checking actual asset/data licenses, attribution, projection/performance and deployment compatibility. Use one shared map component with accessible text alternatives and approved place labels. Never put protected locations on a public map. Texture alone does not establish accurate geography or cultural authority.

## Participation and discovery

Keep the existing community Suara tab and Explore's aggregate; refine wording and use real filtered data. No additional global polls destination is needed yet. Poll results show actual counts, dates and method; opt-in participants do not represent the whole people. Cross-community reports preserve audience, question wording, time window and method instead of treating incompatible polls as one vote.

Explore should lead with news, useful public conversations and Suara. Use a balanced mix of image tiles and carefully typeset text cards, uncropped images, author/community context and an honest “Percakapan terbaru” label while only recent accessible search results exist. Wiki and contexts get concise destination links and keep their fuller discovery in their own homes. Keep image tiles where useful; text-only posts deserve equally deliberate spacing and typography. The owner explicitly retained image tiles in the follow-up.

Candidate ranking, **not yet implemented**: server-side time decay over eligible posts, bounded distinct-human replies/reactions, per-author/community diversity and anti-spam caps; compare against simple newest and editorial picks. Measure useful opened discussions, correction/dispute behavior and cold-start coverage. No fabricated “trending” counts, private engagement signals, vote-as-truth scoring or client-side ranking of inaccessible records. E-means clusters public permitted embeddings for retrieval/discovery; it does not issue governance, editorial acceptance or ethnicity labels. The actual optional upstream Faiss CPU work remains an immediate separate implementation slice, as A13 requires.

Thread feed previews are documented for later reference screenshots: one actual accessible reply connected to its root with a quiet curved line, not a detached quote card. Decide selection server-side (explicitly selected/most useful or first reply), label it honestly, preserve branch navigation and avoid duplicate feed entries. No claimed “top reply” until ranking exists. On mobile, retain width and tap targets.

## Deliberate visual system

- Primary actions become compact solid **neutral**, without glow/shadow. Secondary actions use paper/card surfaces. Accent remains for navigation, focus and selected state. This supersedes the colour part of A17, preserving solid shape, compact size and scrollbar behavior.
- Startup uses fixed Jakarta letter outlines so a system-font wordmark cannot flash. A brief left-to-right letter reveal is optional and reduced-motion safe. Keep the existing continuous spring morph; secondary elements fade subtly, with no competing sweep. Repeat members keep the session fade; public deep links remain unobstructed.
- Abstract thin programmatic linework is the profile fallback. It conveys no inferred location. Curated prints belong in community headers and optional welcome art. Profile/community custom photo editing needs actual persisted media/rights API, not a pretend local-only save.
- Community print fades into the active reading surface via a mask; the text begins below its quiet edge. Use compact description, actual audience/admission and permitted actions. Add stats only when a real permission-filtered contract exists; never count hidden participants globally.
- Artwork captions use shared image/scrim ink roles with guaranteed contrast in both themes. Image overlays keep their own ink on hover. Ordinary surface hover uses shared surface roles; no one-off hardcoded colour per card.
- The network line advances monotonically while the request batch is pending, caps before completion, then reaches the end only after the batch settles. It is activity progress, not a claimed measured download percentage. Use a slow palette gradient; reduced motion keeps a static gradient. Handle aborts, overlap, short gaps and unmount.
- Keep main scroll position visible through its quiet translucent thumb; component thumbs may hide idle. Preserve keyboard/forced-colour usability and safe-area bottom clearance.

### Animation choice

Quick official-source comparison, not a popularity census: [Svelte Spring/Tween](https://svelte.dev/docs/svelte/svelte-motion) already fits the existing continuous morph; [Motion's Svelte guide](https://motion.dev/docs/svelte) supports Svelte 5 attachments and JavaScript APIs without an official Svelte component API; [Anime.js](https://animejs.com/documentation/) is a candidate for more elaborate SVG/timelines. Cult UI patterns are inspiration, not an assumed Svelte drop-in. Keep native Svelte + CSS for this release; no dependency just to stagger six letters. Vector brand outlines solve font swapping independently of animation. Preserve the font's redistribution notice when deriving glyphs, and preload the normal Latin Jakarta face for the rest of the interface.

## Order and honest acceptance

1. Save this supplement, amendments and linked implementation plan first. Preserve all original foundation decisions.
2. Ship the bounded visual slice: neutral actions, stable wordmark, seamless profile tabs/linework, masked community art, image-hover/caption roles, slow network activity and truthful compact Explore cards. Check narrow/mobile/keyboard/reduced-motion, saved themes and actual editor/auth journeys.
3. Build integrated Wiki home/provisional publication contracts and bounded announcement job, reusing existing accepted reader/proposals. Qualification includes private proposal isolation, source withdrawal, stale review and duplicate announcement prevention.
4. Connect the actual public source → steward → provisional/accepted page → discussion/correction loop; implement the selected CPU e-means adapter. Record actual model/provider receipts separately from fixtures.
5. Finish canonical offers/requests and participation outcomes with real lifecycle/contact/status; language/private Node pairing and public derivative release remain boundary-tested deliverables, not decorative screens.
6. Qualify owned-account public AT publication and the optional clean-install Node bundle. Spaces interop remains explicitly experimental until upstream and our tests justify a stronger claim.

Demo narrative: someone finds a relevant conversation/source, the steward documents it with inspectable references, neighbors correct/answer it, a community can act or offer something useful, and a private language room retains control of its originals while choosing a public derivative. One installation may demonstrate the whole story; one database or one all-powerful agent must not erase its boundaries.

Sustainability stays practical: free ordinary participation/basic offers; test paid setup/managed Node hosting/support, optional merchant tools and clearly disclosed contextual sponsorship. Do not monetize protected language data, grant sponsors editorial authority or rely on unproven free frontier-model access. No new index repository or expanded prior-evidence exercise is required for this slice.
