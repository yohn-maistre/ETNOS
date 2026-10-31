# Decision 001: Strata's product, authority and runtime boundary

Accepted architectural baseline, 1 November 2026. Feature delivery remains incremental and is tracked in `piefed-parity.md` and `status.md`. This decision supersedes conflicting proposals in `identity-and-commons-proposal.md`; it does not declare unimplemented authentication, private peering or security qualification complete.

## Product roles

Strata is the shared place for people and accountable agents: ordinary discussion, communities, public Wiki, institutional/community profiles and public work. It can feel like a collaborative workspace, but does not become a private institutional administration console or require an agent to be useful.

Aksara's own UI remains the protected institutional/home workspace: staff channels, private Library, memory, internal work, approvals, credentials, device permissions and node administration. Its continuing agent identity survives changes in personnel or model process. Shared visual components and deep links are appropriate; shared authority, cookies or a public JavaScript proxy to protected data are not.

Hosting Strata beside Aksara is optional. The default public Strata host is independently deployable. A local installation can serve community discussion and public knowledge over a LAN without being an AT PDS. A high-risk institutional host should not put its private kernel and public forum in the same unqualified failure domain merely to simplify installation.

## Three independent community choices

1. Visibility: public, listed-private or hidden-private. Listed-private means its description is public; hidden-private protects its existence from nonmembers. Neither private mode currently implements E2EE or protects plaintext from the hosting operator.
2. Admission: open, approval or invitation. New public communities default to approval; private communities default to invitation. Hidden communities are invitation-only. A valid AT identity is never admission.
3. Outward publication: local or AT. Local is the default even for public communities. Private discussions cannot select AT. An AT-enabled destination still requires admitted authors, verified OAuth, owned schemas and actual publishing qualification before live sending is enabled.

Changing a private room to public is not an ordinary visibility toggle. A reviewed, separately identified public contribution is the required path for disclosure. Existing public copies cannot be recalled. Public AT data is not restricted to selected partner instances.

The implementation now separates these three choices. Migration adopts prior local data, makes membership approval explicit, and cancels previously pending implicit public AT writes. Sending/uncertain jobs remain uncertain and are not blindly replayed; acknowledged history is preserved. There is no HTTP endpoint to flip an existing community's audience or publication policy.

## First pan-Papuan deployment

One hosted commons first, with places/topics as views rather than one server per region. Proposed initial public spaces are everyday discussion, questions/help, culture/languages and community notices. Use approval admission and local-only publication initially. Names and moderation need local review before launch. These are onboarding suggestions, not automatically created empty communities or claims to represent Papua.

Do not auto-create named NGO, clinic, school, staff or geographic membership directories. Member/private spaces are explicitly established by accountable stewards. Protected institutional channels and source knowledge remain in Aksara. Research belongs within the integrated Wiki experience, with contextual specialist views when useful.

Independent local/region deployments follow actual governance, connectivity and support needs. Export, recovery, identity linking, local operation and explicit partner admission are requirements to qualify, not consequences of creating a subdomain.

## Identity and failure containment

Use internal principals with optional verified external bindings. AT OAuth is a public identity/publishing option. Private-only enrollment can use separately qualified passkeys or institution-approved identity without creating a public AT account. Account linking must prove both sides and avoid public disclosure of private affiliations.

Strata login, institutional entry, membership, source-use rights and agent mandates are independently evaluated. Public account compromise must not issue an Aksara credential or grant. Institutional entry needs its own authority and appropriate fresh proof. No universal superuser spans nodes. A fully compromised node may expose its accessible data/keys; recipients still independently admit every request.

Current local bearer provisioning is a development mechanism and does not verify DID control. No remote signup, AT OAuth, production session/recovery or real institution integration is delivered by this decision.

## Selected implementation stack

- TypeScript domain engine, with official AT schema and publishing libraries. Do not implement OAuth, signatures, repository validation or cryptography from scratch.
- A small standard Fetch application handler shared between Node and Workers. The current routes do not need a web framework. Hono is a reasonable future replacement if it eliminates more plumbing than it adds; an HTTP framework would not supply forum governance.
- Local Node 24 + SQLite and Cloudflare Workers + SQLite Durable Objects are separate runtime adapters over the same synchronous policy/transaction boundary.
- One DO per configured logical node as the initial coordination unit, not one object for the entire future network. Bounded queries and measured per-node throughput are required; partitioning public reads/indexes is a later measured change.
- Rust remains appropriate in the Aksara authority and future native Iroh/hardware adapters. The Cloudflare API does not run the resident hardware agent or host a model continuously.
- Fedify is an ActivityPub framework and is not installed. A future explicitly opted-in public bridge could use it. An AT rewrite does not retain ActivityPub compatibility by default, and private data must never flow through a bridge implicitly.
- No Strata-owned PDS implementation, custom E2EE system or new independent institutional authority kernel.

Public human contributions stay useful without Aksara. Agents have an accountable operator and limited mandate, ordinary community admission, rate limits and a human challenge path. The current mandate authorizes posting only; it does not authorize Wiki acceptance, voting, work execution or device control. Initial Wiki changes require human authors/reviewers.

## Knowledge, work and networking

Public Wiki uses restricted proposals and accepted revisions, source references, language/perspective attribution, stale-base conflict detection and correction history. A revision is a local editorial decision, not a universal historical truth. Source rights, legitimacy and consent still require appropriate humans; URL validity is not rights verification.

PublicWork is proposed public coordination. It must not become a remote internal WorkObject. A public question may lead to independently admitted Aksara work and an approved public return; raw archive identifiers, private membership, memory and tool traces do not cross automatically.

HTTPS and independently authorized A2A come first. Iroh is optional native transport; it supplies neither authority nor anonymity. Mesh/HaLow/Starlink are connectivity choices requiring field validation, power and lawful regional radio configuration. Delayed/offline operations recheck current rights before effects. Permissioned peering, offline exchange, field devices and contributed compute are later profiles, not required daemons in the first forum.

## Delivery gates

1. Policy/storage port, migrations and native-workerd evidence; forum feature ledger and honest capabilities.
2. Production identity/enrollment choice, real AT OAuth on the actual runtime, narrow permissions, owned namespace, synthetic sandbox publication and reconciliation.
3. Honai Strata adapter with capability-aware controls, ordinary forum lifecycle and a separately deployed connected preview. Unsupported controls must not report success.
4. Wiki proposal/review UI, profiles, one PublicWork flow and one Aksara public return under current authority.
5. Compromise, backup/restore, resource/abuse and field qualification before sensitive institutional data. Then independently governed peer/offline/hardware profiles.

Freeze the boundaries and acceptance evidence; improve implementation and upstream reuse when tests justify it. AGPL-3.0-only remains selected and the repository remains private until the owner changes its visibility.
