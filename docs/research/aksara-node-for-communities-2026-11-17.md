# An Aksara for a community, not an institution

17 November 2026. Read-only research for the owner. Nothing was changed in either repository. Read: aksara-core at commit `4456769` (README, AGENTS.md, DESIGN.md, `docs/platform/*`, `docs/integrations/etnos-handoff.md`, `docs/runbook.md`, `docs/phone.md`, `protocols/aksara/v1/README.md`, `crates/core-types`, `crates/kernel`) and Strata (the documents named in the brief, `src/agent-access.ts`, `src/resident.ts`, `src/core.ts`, `src/schema.ts`). Anything marked *(estimate)* or *(not checked)* is exactly that.

## 1. Short answer

- A community can already be the owner of an Aksara in both repos, because neither one requires a legal entity. What they require is a **named human who is accountable** and a **machine key that can be revoked**. A community supplies the first through its stewards.
- The thing that must not happen is the community "being" a key. Keys belong to machines and to individual people. The community holds a **mandate**, exercised by a small circle of stewards, and recorded in an audit log.
- Recommendation: build option (a) (community-scoped Aksara hosted by the ETNOS node, a steward circle holding the mandate) for the showcase. Design it so that a community device (b) is later just another deployment key under the same agent. Do not give communities their own DID (c) yet.
- Strata's current model is already compatible with this. Three small gaps are worth closing before 26–27 November, and they are mostly wording (section 8).

## 2. What "tied to an institution" means today

### In aksara-core (the local node)

| Question | What the code and docs say |
| --- | --- |
| What is an institution? | A tenancy boundary, nothing more. `init_dev` creates one `institution_id` in one SQLite file; principals, lanes, artifacts, work and memory all carry it (`crates/kernel/src/lib.rs` around line 204, `crates/kernel/src/schema.sql`). It does not need to be a legal body. One database holds one institution. |
| What does Aksara call a "community"? | Only a **profile**: the institutional database, separate from the personal one (`docs/platform/architecture.md`, `docs/platform/desktop-installation.md`). It is not the same word as Strata's community. This is a naming trap in every future conversation. |
| Who signs? | **Nobody signs anything.** People authenticate with bearer tokens stored as hashes (`principals.token_hash`). The only integrity feature is a hash chain over the event ledger, which the docs say does not establish tamper resistance (`docs/runbook.md`). I found no DID, no key pair and no signature code in the kernel. |
| Who holds keys? | Nobody, for the same reason. Tokens are development credentials from `init-dev`. The README and the platform docs say plainly: production identity and enrolment are not implemented, and the local identity chooser "is not production enrollment". |
| Who is accountable? | The `operator` role inside the database (`Principal.role`, `crates/core-types/src/lib.rs`). The operator approves effects and reviews memory but has "no universal private-data bypass" (`docs/runbook.md`). The host's OS account can still read the SQLite file: data is **not encrypted at rest** (`docs/platform/architecture.md`). |
| Where does data live? | On the machine running the host (`%LOCALAPPDATA%\Aksara` on Windows). Original bytes are kept; derived indexes and memory are rebuildable. |
| What mandates does the agent have? | Inside Aksara: none are ambient. Every use rechecks principal, institution, lane audience, purpose, policy epoch and work revision (`AGENTS.md`). Effects need exact approval; outward effects record an intent first. Toward Strata: **none are built**. Aksara can read Strata through a read-only MCP client; publishing to Strata is "unimplemented", and the publication schema carries a SharingGrant field that nothing evaluates (`protocols/aksara/v1/README.md`, `docs/integrations/etnos-handoff.md`). |
| Hardware | Simulated. The Device SDK has behaviour simulators; the hardware row in `docs/platform/component-coverage.csv` reads "design targets; no physical validation". The phone profile is a Termux/proot development setup with no measurements on a real handset (`docs/phone.md`). |
| Sync and offline | There is **no sync**. The outbox is "a local administrative primitive; there is no remote sync transport yet" (`docs/runbook.md`). Offline works for a local model after installation (`docs/platform/windows-local.md`); hosted models need the internet. Backup is a manual `backup` command. |

### In Strata (the public engine)

| Question | What the code and docs say |
| --- | --- |
| Who is the unit? | The **community**, a row with a title, visibility and an `automation` flag (`src/schema.ts`). It has members with roles `owner`, `moderator`, `member`. It has no DID and no key. |
| Who is the agent? | A separate actor of kind `agent` with a generated local identifier shaped like `did:web:<host>:agents:<id>`. The docs state this "is not a claim of externally verified AT DID control" (`docs/aksara/agent-entrance-2026-11-03.md`). |
| Who signs? | The **deployment**. Each installation registers its own public Ed25519 key and proves possession with a signed JWT assertion; Strata hands back a five-minute scoped token (`src/agent-access.ts`, `exchange`). The private key sits in a file on whatever machine runs the agent. |
| Who is accountable? | One named human **operator**, who must be a current member and, for any agent above guest, a current steward of that community (`AgentAccess.current`). Public labels read "Agen, dikelola oleh [operator]" (`src/agent-labels.ts`, `docs/aksara/agent-institution-design-2026-11-03.md`). If the operator stops being a steward, the agent fails closed. |
| What may the agent do? | A posting mandate (short: expiry is capped at 24 hours, `StrataCore.mandate`) or the newer per-agent, per-community **switch** (`agent_switches`: posts, wiki, daily limit, on/off). The switch counts only while its issuer is still the agent's operator and still a steward (`activeSwitch`). It cannot vote, approve wiki changes or claim official approval. |
| Where does data live? | In the ETNOS node's Durable Object SQLite. The research note on custody says plainly that a namespace is not isolation from a privileged operator, and that private rooms are readable by the ETNOS operator until Spaces (`docs/research/2026-11-01-community-language-custody.md`, showcase plan section 22 question 3). |
| Which "Aksara" is this? | Not aksara-core. ETNOS's Aksara is the **resident**: `packages/resident-pi` (pi-durable on a Worker) plus `src/resident*.ts`, one configuration per community (`resident_configs`). aksara-core is the separate "node" half. The two are connected by design documents, not by code. |

Two things follow. First, today's "institution" in Aksara is really "a database with one operator", and today's "institution" in Strata is really "a community with a named steward and a revocable machine key". Neither needs a company. Second, the pieces the owner pictured (device, node, institution) belong to the aksara-core side, which is the less finished side.

## 3. Can a community be the owner?

Yes, with one honest change of wording: the community is the **principal that the agent serves**, and a **circle of stewards** is the principal that answers for it. The software never needs "the community" to sign a thing.

What has to be true, and where the two repos stand:

| Need | Strata today | aksara-core today |
| --- | --- | --- |
| Agent is bound to one community | Yes (`agent_registrations.community_id`, immutable) | Yes (`institution_id`), but one per database |
| A named human answers for it | Yes (operator, shown in label) | Operator role, not shown outside |
| More than one steward can act | Partly: any steward can list members; but the agent has **one** operator | One operator in the dev profile; more can be created |
| Handing over to another steward | **Not implemented.** No operator transfer (searched `src/`). Community "owner transfer is not implemented" (`StrataCore.setMember`) | No enrolment flow at all |
| Revoke fast | Yes: `suspend` revokes registration, deployment keys, mandates, switch, work grants and live tokens in one transaction | Deactivate a principal (`active`); no remote kill |
| A key that is not a person | Yes: deployment key per machine, up to three active, rotatable | None |

So the community-as-owner model needs **handover** and **a second steward**, not a new identity system.

## 4. The hard cases

**Who holds the key.** Do not make "the community's key". Separate three things:

| Thing | Who should hold it | Why |
| --- | --- | --- |
| Agent deployment key (signs the agent's calls) | The machine that runs it (the ETNOS Worker today, a community device later) | It is a machine credential; it must be rotatable by any current steward without a ceremony |
| Authority over the agent (switch, mandate, operator of record) | Individual stewards, each with their own AT login, at least two named | People can be removed, replaced and held to account; the audit log already records issuer and action |
| Recovery of the public side (platform keys, the future PLC rotation keys) | ETNOS (the owner plus one named co-holder, offline backup) | This is the open question in showcase plan section 22 and does not change because a community is involved |

Considered and rejected for now:

| Key option | Verdict |
| --- | --- |
| One steward holds everything | Fast, and fragile. One lost phone ends the Aksara or hands it to one person. Acceptable only as the starting state with a second steward named. |
| Cryptographic threshold (for example two of three) | Too heavy for mixed digital literacy and not needed. Strata already has the stronger, simpler rule available: "enable, rotate and change mandate only when two stewards have approved". That is an application rule with a log, not a secret-sharing scheme. Not built yet. |
| ETNOS holds the key in custody for the community | Honest for option (a), because ETNOS hosts it. It must then be said, not hidden: "dikelola oleh stewards, dijalankan oleh ETNOS". |
| The device itself holds the key | Right for the deployment key (it signs for itself). Wrong as the only authority: a stolen device must not equal a stolen community. |

**When stewards change.** Today the agent stops working the moment its operator stops being a steward. That is the safe failure. What is missing is the ordinary case: the old steward hands over and nothing breaks. Needed: "transfer operator" to another current steward, which rotates the deployment key and keeps history attributed to the old operator at the time. Also needed: someone besides the owner can promote a new moderator if the owner disappears (`setMember` lets only an owner do that). *(Estimate: 1–2 days for operator handover with tests; owner succession is a separate decision.)*

**When a community splits.** The honest answer is "it becomes two communities". There is no split in the model and there should not be one. The old community keeps its history and its agent. The new one registers its own agent under its own stewards and starts with empty memory. Memory is **not forked**. A contribution moves to the new place only if the person who made it moves it. Rival claims are the reason: this is why the showcase plan refuses a single official room per language (section 7) and the same reasoning rules out a single official Aksara per language.

**When a community goes quiet.** Mandates already expire within 24 hours, but the newer switch has no expiry (`agent_switches` has no `expires` column). A community Aksara should pause itself if no steward has reconfirmed in, say, 60 days (my suggestion), stay readable, stop posting, and show "dijeda, belum ada steward aktif". Resumption by any current steward. Export of the community's own material to its stewards on request. *(Estimate: under 1 day.)*

**Device lost or stolen.** Two separate problems.

- The **public voice**: a steward suspends the deployment in Strata and every key and token dies at once. This works today (`AgentAccess.suspend`).
- The **data on the device**: aksara-core has no disk encryption, no remote wipe and no pairing story; the host's OS account can read everything (`docs/platform/architecture.md`). A community device would need full-disk encryption with a passphrase a steward knows, and a clear rule that the device keeps only what that community has agreed to keep. None of that exists in the repo. Not a showcase item.

**Who answers for what the agent posts.** Same as now, one level up: the label says what it is and who keeps it ("Agen, dikelola oleh [steward of record] untuk [komunitas]"). A community Aksara must never present itself as the community's *voice*. Who may speak for a customary community is itself a customary question, which the institution design doc already leaves to local process ("Community/Indigenous authorities need their own locally legitimate process", `docs/aksara/agent-institution-design-2026-11-03.md`). Official statements, if they ever exist, need explicit human approval of the exact text, which is a designed gate and not built.

**Consent and withdrawal from memory.** Where the repos stand:

- aksara-core: only the **owner of an artifact** can withdraw it (`withdraw_artifact` in `crates/kernel/src/library.rs`). Withdrawal makes dependent derived items and memory ineligible, but the original bytes stay "for provenance" (`docs/runbook.md`). A steward cannot withdraw someone else's contribution on their behalf, and there is no hard delete. This protects members from stewards, and it fails communities where deletion is the expectation (and UU PDP erasure rights). Say so; do not claim "erasure".
- Strata: sources carry an owner and a withdrawn flag, and `withdrawSource` retires derived items (`src/core.ts`). The planned place notebook resolves every remembered fact against its source at read time, so a withdrawn or private source drops out at once (`docs/research/resident-harness-2026-11-17.md`, section 6). That notebook is **not built**, and it ingests only public or accepted material.

For a community-owned Aksara the rule should be: memory is built only from what a person put in a public place or in a room that said so on entry; each fact points back to the person's contribution; a person can withdraw it; "community-agreed" facts need two stewards' approval and still point back. Hard deletion needs its own build.

**Private rooms.** Moving a private room's Aksara onto a community device moves *who can read* it from the ETNOS operator to whoever keeps that device. It does not remove the reader. Spaces (public beta 1 December) is access control, not encryption (showcase plan section 12.3). Until then the sentence "the operator can technically read this room" stays true, and a community device would add "and whoever keeps the device". Do not promise otherwise on stage.

## 5. Options, smallest to largest

All effort figures are my rough estimates *(estimate)*, not measured.

| | (a) Community-scoped Aksara, hosted by ETNOS | (b) Community device, syncing with the node | (c) Community as its own DID |
| --- | --- | --- | --- |
| What it is | Aksara in a community, kept by a named steward circle. Runs on the ETNOS Worker. No hardware. | The same agent running on a refurbished box or a steward's laptop; Strata sees it as another deployment key. | The community gets an AT account (`did:plc`) and handle; the agent acts for it. |
| What exists | Community, stewards, agent registration per community, operator label, switch, mandates, suspend, resident per community, audit log (`src/agent-access.ts`, `src/core.ts`, `src/resident.ts`) | aksara-core on Windows or a laptop; an ARM64 bundle (CI not yet run remotely); local model; backup command; Strata multi-deployment per agent (three active) | AT sign-in; agent DIDs are local `did:web` look-alikes; multi-account PDS is a planned track, not built |
| What is missing | Operator handover; second-steward rule; switch reconfirm; per-community notebook with withdrawal; plain-language label for "kept by" | Production identity and enrolment; encryption at rest; any sync; a Strata publication path with SharingGrant; device pairing, updates, signed releases; real hardware measurements; non-technical install and recovery | Multi-account PDS; a rotation-key ceremony; community account custody; owner succession; Spaces group-host role (untested); schema names fixed |
| Main risks | ETNOS is the custodian and can read; stewards may overstate "ours"; one steward becomes de facto owner | Support burden for refurbished hardware; power and connectivity; theft; unsupported platform (Node 24, Rust 1.99, no measured ARM numbers); drift between two stores | A DID is permanent and public. Who holds it is a governance fight; rival groups; split or capture; irreversible mistakes if it is made before governance exists |
| Rough effort | 3–5 days hardening on top of the already planned regional work | Months, and mostly outside code (supply, support, security review) | 1–2 weeks of code after the multi-account PDS, plus months of agreement |
| BUDAYA GO! 18–19 Dec | **Yes.** It is what the demo already shows, if worded as "kept by stewards". | Roadmap slide only; one laptop demo of aksara-core is possible but proves nothing about sync or Strata | Design slide only. Do not ship |
| Later | Foundation for the others | Pilot after Spaces, hosting and recovery are qualified (`docs/decisions/decision-005-node-account-data-planes.md`) | Only for a group that asks for portability and has settled who may hold it |

A note the owner should hear plainly: `docs/plan/direction-2026-11-16.md` defines the Aksara Node as "the definition above, not a hardware box" (three parts: the aksara-core host, a reference PDS and the link to ETNOS). The brief pictures a refurbished device. Both can be true if the word is used carefully: **node is software; a device is one way to host it.** The proposal should say it that way, or judges will ask for a box and a sync demo that do not exist.

An intermediate step is worth naming because it exists today: a **steward's own laptop** runs the Windows desktop build as the community's private workspace, and a steward posts to Strata as themselves. That uses no sync and no Strata publication path. It is a pilot shape, not a product.

## 6. How this fits the BUDAYA GO! showcase

What can be claimed on upload day, in the plan's own rule of "only what is live":

- "Aksara · Mee Pago adalah program yang dikelola oleh [nama steward] dan [nama steward] dari wilayahnya, dijalankan di server ETNOS." True once two named stewards exist and the label shows them.
- "Agen yang sama nanti bisa dijalankan di mesin komunitas sendiri." Roadmap, labelled as such.
- Do **not** claim: community-held keys, community-held data, a community DID, a device that syncs, or any private room the community alone can read.

The demo idea in `docs/plan/framing-and-impact-2026-11-17.md` section 7.3 (two demo institutions' agents coordinating, each human approving) already works with this model. Calling them "komunitas demo" rather than institutions needs no code.

One check on the seven regional Aksaras: as planned they are created from the place pack and run by the ETNOS operator. That makes them **ETNOS-owned voices labelled by region**, not community-owned. The plan's own rule ("a regional voice turns on when its scope has seeded pages and a named human steward", section 9) is what turns that into a community Aksara. Enforce it in the label, not just in the plan.

## 7. Recommendation

1. **Adopt (a) as the community model**, called "Aksara komunitas": an agent registered to one community, kept by a steward circle (at least two named stewards, one of record), hosted by ETNOS, switch off by default, paused if unattended for 60 days.
2. **Keep keys where they are**: deployment key on the machine, authority in individual stewards, platform recovery with ETNOS. No threshold cryptography, no "community key".
3. **Treat a device (b) as a second deployment of the same agent**, later, after aksara-core has production enrolment, encryption at rest and a real sync path. Do not market it before then. Until then call a node "software".
4. **Hold back (c)**. Revisit after Spaces has been tested and a real community has asked for portability, and decide governance first (who may hold the rotation keys, how a split is handled).
5. **Do not copy code between the repos.** The link between them stays a protocol (MCP and the agent entrance), as the handoff note says.

## 8. Does Strata's current model need to change before 26–27 November?

It is **already compatible** at the level that matters: community-bound agents, a named human operator, machine keys per deployment, a single suspend, separate mandates. No schema change is needed to *describe* this in the proposal. I would still do these before upload day, smallest first:

| Change | Why | Estimate |
| --- | --- | --- |
| Wording: "dikelola oleh [steward] untuk [komunitas]", never "institution" for a community, never "community-owned data" while data sits on ETNOS | Honesty; avoids a judge pulling the thread | 0.5 day, copy only |
| Require, and show, a second named steward before a regional or community Aksara switch can be turned on (the "at least two stewards" rule exists only in `docs/plan/direction-2026-11-16.md`; I did not find it enforced in `src/`) | Removes the one-steward fragility without new identity work | 1 day |
| Switch reconfirmation: the switch pauses itself after N days without a steward's reconfirmation | Covers "goes quiet" | under 1 day |
| Operator handover (transfer to another current steward, rotate the deployment key, keep history) | Covers "stewards rotate" | 1–2 days |

Can wait until after the showcase: owner succession in `setMember`, a per-community notebook with withdrawal (already in the resident-harness plan), hard deletion semantics, any device or DID work.

## 9. Questions for the owner

1. Are the regional Aksaras to be community-kept at launch, or ETNOS-kept until a steward from that region is named? The label depends on the answer.
2. Is "at least two stewards before the Aksara switch turns on" acceptable to your culture lead, or will one steward be all you have in some regions on day one?
3. Does the proposal need the device story at all, or is "node = software, device later" enough for the juknis?
4. Do you accept saying, in every community Aksara's about page, that ETNOS hosts it and can technically read what it stores?

## 10. What I did not verify

- I did not run either codebase, and I did not read any key file.
- I did not read the private Aksara catalogue (it is referenced from Strata but not in the checkout), so the hardware node designs (Presence, Information, Card, CAD) were seen only through the coverage table.
- I did not audit how a departing member's earlier posts or contributions behave in Strata; that matters for withdrawal and should be checked before any claim.
- The Spaces group-host role is described in `docs/plan/direction-2026-11-16.md` as untested and depends on the 1 December beta.
- All effort figures are guesses from the code's shape, not measurements.
