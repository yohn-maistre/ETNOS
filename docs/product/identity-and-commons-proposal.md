# Identity and a community-governed commons

Status: discussion proposal, 1 November 2026. Not an implemented authentication system or a decision to deploy every feature. The owner requested this discussion before the Cloudflare port and Honai integration. AT replaces the catalogue's previous social substrate choice; its custody and governance boundaries remain relevant.

Historical proposal: [Decision 001](../decisions/decision-001-product-and-runtime.md) now freezes the baseline, including local publication by default, independent private enrollment and the ETNOS/Aksara UI split. Its decisions supersede conflicting suggestions below.

## Product hypothesis

ETNOS is community-governed infrastructure for conversation, shared knowledge and public work. Aksara lets independently governed institutions and communities contribute useful work under explicit authority. Ordinary social life must remain useful with agents disabled.

Start with one lively Papuan commons and willing local partners. Regional views are discovery contexts, not automatic deployments or authorities. Independently operated nodes follow actual governance and operational needs. Indigenous nations, customary communities, schools, clinics and governments have different responsibilities; no actor type confers rights over the others. Communities elsewhere should shape their own deployment rather than inherit a Papuan administrative model.

Potential distinctive value is continuity from conversation to sourced, revisable knowledge and accountable work, with a practical boundary between public contribution and protected custody. Decentralized transport alone does not establish community governance or legitimacy.

## Login journey

1. Browse public content without an account.
2. Choose Sign in and enter an AT handle. Resolve handle to DID, confirm the handle binding, discover the DID's PDS and its authorization server through the standard OAuth flow.
3. Redirect to that authorization server. ETNOS does not collect the PDS password. Preserve the standard provider/hostname entry as an advanced/recovery option.
4. Verify the authorization result with the maintained SDK and establish an application session. Bind the verified DID to an internal principal; mutable handles are display identifiers, never authorization keys.
5. Request identity-only access first where supported. Request narrow publication permissions when the person elects to publish; do not silently fall back to broad account access if a provider lacks granular support.
6. Join public communities or accept an authorized private invitation. AT authentication itself grants neither community membership nor institutional authority.

Existing compatible AT accounts can participate; a Bluesky-branded account is not the protocol requirement. Sign-up/account hosting is a separate onboarding flow. We may offer a supported provider, but must disclose the operator, recovery and exit path rather than silently create a permanent hosting dependency.

An eventual private-only user can have a local identity with passkey or an institution-approved provider without creating a public AT account. Linking that identity to a DID requires fresh proof of control of both sides, not matching names or email addresses. Do not allow a weaker recovery/linking flow to take over an existing account. Private-only enrollment is proposed, not implemented.

## Separate authorities

| Concern | Authority | Public exposure |
| --- | --- | --- |
| Control of an AT account | Verified AT OAuth / DID binding | Handle, DID and hosting metadata are discoverable |
| ETNOS session | ETNOS deployment | Credential/session details stay private |
| Community participation | Current community membership and role | Private membership is not published by default |
| Institutional access | Institution's own Aksara authority | No public affiliation required |
| Knowledge publication | Relevant rights, reviewers and approved derivative | Only the approved public material and approved attribution |
| Agent representation | Accountable operator, scoped mandate, receiving community admission | Safe public representation statement and challenge route |

Institution profiles are governed entities with scoped human managers, not shared passwords. Changes of staff, domain or contractor must not lose institutional continuity. A domain handle establishes a domain relationship, not customary authority, community endorsement or legal legitimacy. People can use pseudonyms; a government or institution cannot inspect their private communities merely by joining ETNOS.

Treat public institution profile and agent identity separately. A dedicated service actor can publish under its own DID and an explicit profile binding. The agent receives bounded operational access through the authority layer; prompts/models do not receive root institutional credentials. Human-authored, AI-assisted, automated-service and authorized-representative contributions should be distinguishable without claiming perfect AI detection.

## Authentication implementation requirements

- Use the official maintained AT OAuth implementation with verified issuer/subject/discovery, state, PKCE, PAR and DPoP behavior; do not hand-roll the protocol. Qualify its actual Workers compatibility before choosing a server or browser SDK profile.
- Persist short-lived authorization-flow state and session/DPoP material outside isolate memory. Protect refresh tokens, coordinate refresh, apply expiry and revoke app sessions separately from community membership.
- Prefer a same-origin server-side session with Secure, HttpOnly cookies and appropriate SameSite/CSRF protection for Honai. Keep institutional Aksara sessions on their own protected origin and authority boundary.
- Check current membership and mandates on each admitted operation. A still-valid OAuth token does not preserve removed community access.
- Follow the OAuth specification's discovery requirements and protect server-side fetches against SSRF/private-network access and unsafe redirects. A user-supplied PDS URL is untrusted input.
- Provide session/device removal, recovery, identity/provider migration and rate-limited enrollment. Never log tokens or disclose hidden affiliations through failures, autocomplete or analytics.
- Request permissions for the owned ETNOS collections and only the needed operations. Account management and unrelated Bluesky record writes are not ordinary ETNOS login requirements.
- Private enrollment, emergency recovery, ownership succession and migration need explicit qualification; none is implied by the local fixture tokens in this repository.

## Public AT publication

Honai → authenticated ETNOS operation → policy check → durable post and outbox transaction → authorized publisher → author's PDS → acknowledged URI/CID → ETNOS's public index/view.

An intended URI is not a successful receipt. Retain uncertain-outcome reconciliation and CID-bound edits/deletes. A private post has no public AT intent. An app session is not an unlimited, perpetual permission to publish as its owner.

Custom ETNOS Lexicon records do not automatically appear in Bluesky or become intelligible to every AT app. An optional Bluesky cross-post is a separate, explicit action with its own attribution, permissions and lifecycle. AT interoperability also does not automatically provide ActivityPub interoperability.

Public records may be fetched, indexed and copied beyond the chosen UI. App moderation controls local presentation; deletion cannot recall all copies. Hosting choice is not end-to-end encryption: PDS operators are trusted with hosted public accounts, and ordinary hosted private discussion requires trust in its host too. Rights/protocol notices can state obligations, but cannot technically prevent copying or model training on publicly accessible data.

Preserve separate public identifiers for approved derivatives. Private source identifiers, hidden affiliations, archive existence and internal work traces must not be emitted as public provenance.

## Three different network choices

1. Public discovery: follow public people, communities, topics or places across deployments. Public means broadly retrievable, not restricted to the selected partner list.
2. Collaboration partnership: two organizations agree to a project or a public request. This grants no blanket access to their sources or memberships.
3. Protected exchange: a source custodian authorizes a specific recipient, purpose, operation and lifetime; the receiving authority independently admits the work. HTTPS/A2A first, optional Iroh transport later.

Do not offer a misleading single Federate everything toggle. An invitation-only collaboration circle can have protected exchange; public AT records cannot be advertised as readable only by approved Indigenous peers. Publicly naming partners can itself require consent.

## Useful first product surfaces

- Familiar Home feed for people and community activity, Following, restrained discovery and meaningful notifications. Agents can be muted or filtered and have no special voting weight.
- Community/institution pages with About, Discussions, Knowledge and Work where applicable. Separate public profile from private staff workspace and hide irrelevant empty tabs.
- One integrated Wiki entry: places, histories, languages, public research and datasets are related views rather than separate mandatory products. Preserve named perspectives, provenance, uncertain translations and revision/correction history.
- Wiki proposals and accepted revisions are different states. An agent or a popular post cannot silently turn a contested statement into accepted knowledge. Immutable identifiers should be separate from translated display names and claims about boundaries.
- Small PublicWork objects: question/request, accountable participants, needed contribution, status and reviewed result. They are public coordination records, not remote institutional WorkObjects.
- Agent profiles show operator, limited remit, permitted public sources/capabilities where safe, correction history and Ask a person. Capability listings must not expose protected archives.
- A composer with an explicit, understandable audience. Publishing a private discussion later creates a separately reviewed public contribution, not an in-place audience flip.

## Where practical value can exceed another feed

Language support: original-language text and attribution stay attached to translations; people can correct names and translations. Voice/transcription needs speaker consent and uncertainty indicators. Not all knowledge should be recorded or published.

Connectivity: text-first pages, bounded media, resumable uploads, local drafts and explicit queued/sent/failed states. Offline drafts are not permission to send after membership or source rights expire. Shared-device storage/logout and sensitive notifications need deliberate defaults. Full offline browsing of private content is a separately qualified feature.

Knowledge stewardship: contributor/holder/reviewer attribution, source-specific rights, public correction/challenge routes and plural accounts. Local Contexts protocols are a relevant interoperability candidate, not a label we may assign on a community's behalf. No blanket community-consent checkbox.

Human–AI work: a public question can become an independently accepted Aksara task; people see the request, safe progress, evidence and reviewed result. Aksara can refuse or hand off. Raw private tool traces, prompts and institutional memory stay out of the public thread. Default to bounded agent participation; avoid autonomous reply loops and manufactured consensus.

Local utility: events, service notices, language resources, practical school/university collaboration, public environmental observations and maintainable project records. Clinics can share public guidance; patient records are not ordinary ETNOS content. Government participation does not confer moderator or data-access authority.

Network benefits are hypotheses to test with partners: share reusable public materials, compare locally interpreted findings, seek expertise, collaborate across languages and reduce duplicated work. Every participating group should retain decisions about representation, protected data and withdrawal from future cooperation.

## Implementation sequence following discussion

1. Port storage and request handling to Workers plus SQLite Durable Objects while retaining local Node support and the same isolation/outbox tests. No PDS hosting is implied by this deployment.
2. Qualify real AT OAuth and narrow publication permissions, an owned namespace, session storage and one post/reply/correction lifecycle using synthetic data and dedicated test accounts. If an isolated PDS is used, distinguish it from public-network interoperability evidence.
3. Add Honai's ETNOS client and capability handling, then connect real feeds, communities, replies and publication status. Do not report unsupported votes/notifications as successful.
4. Deploy a separate preview with controlled write enrollment. An invite-only UI does not make public AT test posts private. No confidential sources or private institutional credentials belong in this preview.
5. Add one reviewed Wiki proposal and one bounded public request returned by one Aksara participant. Measure whether humans find this useful before expanding agent/network features.

A region is not a deployment plan. One useful commons and a small number of accountable partners are a better validation unit than provisioning an instance for every island. The wider network should emerge from communities choosing to participate.

## Sources checked

- [AT OAuth](https://atproto.com/specs/oauth): handle/DID and server entry, discovery, authorization and token binding.
- [AT identity](https://atproto.com/guides/identity): handles, DIDs, hosting and verified handle binding.
- [AT permissions](https://atproto.com/specs/permission): public-repository collection/operation permissions and separate account permissions.
- [AT overview](https://atproto.com/guides/overview) and [migration](https://atproto.com/guides/account-migration): public repositories, hosting trust and portability/recovery dependencies.
- [GIDA CARE principles](https://www.gida-global.org/care-principles-copy): people/purpose and collective authority alongside data reuse.
- [Local Contexts TK Labels](https://localcontexts.org/labels/traditional-knowledge-labels/): community-specific protocols, conditions and responsibilities.

The owner's supplied catalogue v2.5.8, especially §§28–29, 39 and 61, informs the governance boundary. Its private text is not redistributed. This proposal makes no claim of community endorsement, CARE certification or completed privacy/security qualification.
