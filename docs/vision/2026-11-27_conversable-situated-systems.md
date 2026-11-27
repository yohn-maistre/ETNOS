# Abstraksi & ETNOS: Conversable Situated Systems

**Date:** 27 November 2026
**Scope:** Unified architecture, data sovereignty, edge perception, cognitive substrate, territorial infrastructure, long-horizon research tracks, and global replication model across `aksara-core` (Aksara Node) and `etnos` (ETNOS PDS & Living Commons).
**Status:** Working architectural synthesis aligning current repository implementations (`yohn-maistre/aksara-core`, `yohn-maistre/etnos`) with the Abstraksi Systems Catalogue (v2.5.8) and late-2026 protocol, edge-JEPA, cognitive, and bio-infrastructure research.

---

## 1. Core Thesis: Conversable Situated Systems

A physical or social system at macro scale (a watershed, a forest perimeter, a village solar microgrid, a school, a community clinic, a laboratory bench, a customary institution) becomes legible and governable when intelligence is embedded directly inside its operating loop. Most AI deployments fail outside well-connected offices because they treat physical reality as static text scraped from the open web and concentrate custody in distant clouds.

Abstraksi closes that gap by treating **natural ecosystems and human knowledge as stacked, coupled layers**: living biophysical systems at the base, human institutions, languages, and oral memory layered directly on top, and a shared sovereign substrate abstracting **structured knowledge, governed memory, and plural ontologies** out of both. Because the underlying substrate is modular and generalizable, it acts as a single productive engine capable of generating completely different downstream outputs, from transparent `PublicWork` between autonomous nodes of intelligence and civic institutions, to structured offline educational materials, reproducible scientific findings, and living community archives.

At its heart, every real-world system operates through the same four-layer cybernetic loop:

| Layer | Function in the Loop | Components | Truth ladder today (27 Nov 2026) |
| :--- | :--- | :--- | :--- |
| **1. Transduction** | Convert continuous physical reality and human context into calibrated observations and latent prediction-error ("surprise") vectors | Edge JEPA (`CHARM`, `LeWorldModel`, `Causal-JEPA`), orbital embeddings (`OlmoEarth v1.3`, `AlphaEarth`), commodity field sensor pods, human-scale room/voice endpoints, experimental bio-transducers | **Simulated:** `scripts/device_simulator.py` in aksara-core. **Proposed:** every model, pod and endpoint in this row. |
| **2. Sovereign Kernel** | Enforce principal identity, custodial rights, physical safety interlocks, capability leases, and signed receipts below cognition | `aksarad` (Rust + SQLite), `crates/kernel` (`effects.rs`, `memory.rs`, `library.rs`, `work.rs`, `computer.rs`), `aksara-hwd`, `python/aksara_device_sdk.py` | **Built (dev alpha):** `aksarad`, the kernel crates, `aksara_device_sdk.py`. **Designed (catalogue only):** `aksara-hwd`. |
| **3. Cognitive & Research Engine** | Abstract longitudinal telemetry and human records into structured ontologies, objective graphs, multi-form memory, dialogue, and counterfactual simulation | Mastra `AgentController` + Pi Durable adapters, `LongMemory`, Objective/Evidence Graphs, Heterogeneous Model Ecology, `JEPA-Anything`, Aksara Science Pack | **Built (dev alpha):** durable Mastra agent loop, preserved Pi Durable adapter, embedded `LongMemory`. **Designed (catalogue only):** `AgentController` as named, Objective/Evidence Graphs, model ecology routing, Science Pack records (`ResearchGap`, `ExperimentRun`). **Proposed:** `JEPA-Anything`. |
| **4. Shared Commons** | Provide a federated public and permissioned space where humans, institutions, and physical-asset DIDs converse, verify claims, and produce modular public outputs | `etnos` (ATProto Spaces + `ts-mls`, `AtSpaceCard.svelte`, `SpacesLab.svelte`, `Observatory`, `KamusTab`, `PetaKataPage`, `CommunitySeasons.svelte`, `TerrainMap.svelte`, `AgentConnections.svelte`, `ResidentParticipation.svelte`, `PublicWork` sidecar) | **Deployed (private alpha):** etnos communities, `Observatory`, `KamusTab`, `PetaKataPage`, `TerrainMap`, `CommunitySeasons`, `PublicWork` (`src/public-work.ts`). **Built, DMs only:** `ts-mls` (`apps/web/src/messaging/crypto.ts`), not yet on community Spaces. **Bench-tested:** ATProto Spaces via the official alpha in `labs/spaces`; production still uses ETNOS's own access-controlled storage. |

Every deployment scale (an office, a school, a coastal village, a forest catchment, a microgrid, or a field lab) is an instance of this same **Situated Node** abstraction.

---

## 2. Protocol, Data & Archival Sovereignty

### 2.1 ATProto Spaces + `ts-mls` + Local PDS
Standard public ATProto streams every commit over unauthenticated Relay firehoses (`com.atproto.sync.subscribeRepos`), exposing records permanently to third-party AI training scrapers. Moving ETNOS onto **ATProto Spaces** (entering Public Beta on December 1, 2026 across reference PDS hosts; date unverified, see §9.3) solves firehose leakage at the protocol layer when paired with self-hosted Aksara Nodes and Messaging Layer Security (`ts-mls`, already present in `etnos`).

* **Relay Bypass:** Space records never traverse public Relays. They sync directly from PDS hosts to authorized AppViews and private **Spaces Jetstream** sidecars (`mode: 'spaces'`).
* **Space Authority DIDs & Open Social Groups (`opensocial.group`):** Communities own Spaces under group DIDs that issue key-bound credentials independently of any single personal account.
* **Cryptographic Confidentiality via `ts-mls`:** ATProto Proposal 0016 scopes Spaces to access control, meaning PDS hosts read plaintext for indexing. Pairing self-hosted Aksara Node PDS (where the institution is both PDS host and Space Authority) with client-side `ts-mls` group encryption locks sensitive cultural archives, field coordinates, and raw media even when records traverse external infrastructure.
* **Explicit Protocol Boundaries:**
  * `did:plc` audit logs remain public metadata, so sensitive custodian topologies avoid exposing private internal inventories or involuntary organizational movement maps through handles or public directories.
  * ATProto assumes reachable HTTP/WebSocket hosts, so Aksara Nodes maintain local write queues and delay-tolerant outboxes for rural connectivity blackouts, re-evaluating revoked mandates before pushing upstream on reconnect.

### 2.2 Three-Ring Sovereignty Model

| Sovereignty Ring | Transport & Storage | Contents | Exposure to Public Scrapers |
| :--- | :--- | :--- | :--- |
| **Ring 0: Local Vault & MLS** | On-node SQLite/PostgreSQL + pgvector, or `ts-mls` E2EE blobs inside a Space | Raw video/audio streams, sacred cultural archives, exact sensitive coordinates, private keys | Zero (never leaves hardware in plaintext) |
| **Ring 1: Self-Hosted ETNOS Spaces** | Aksara Node Spaces PDS + private Spaces Jetstream sidecar | Community threads, verified local knowledge, JEPA anomaly alerts, Semantic Digital Twin state | Zero (gated by Space Authority credentials; off public Relays) |
| **Ring 2: Public Atmosphere** | Standard public ATProto repo | Deliberately approved public outputs: `Ensiklopedia` entries, `Observatory` showcases, open ecological bulletins, `PublicWork` milestones | Open by explicit human approval |

### 2.3 Plural Epistemology & Executable Indigenous Governance
Sovereignty extends beyond server placement into how knowledge, contradiction, and community authority behave across time:

* **Three Permanently Distinct Epistemic Layers:** Every record maintains an inspectable boundary between (1) **original trace or calibrated record**, (2) **holder or community account**, and (3) **later analytical or scientific interpretation**. Contradictory oral variants, contested histories, and uncertain measurements remain visible rather than being flattened into a single synthetic LLM narrative.
* **Existence-Level Privacy & The Right Not to Digitize:** Discoverability, metadata listing, reading, quoting, translating, deriving embeddings, publishing, and model training are independent permissions. Hidden collections must not leak through search hit counts, facets, graph edges, or error responses, and opting not to digitize or share remains a valid first-class outcome.
* **Knowledge Recovery & Interoperable Provenance:** Oral and archival recovery pipelines feed steward-reviewed proposals rather than mutating canonical commons directly. Custodial rules inside the Rust kernel align with **CARE Principles**, **OCAP**, **Te Mana Raraunga**, **Local Contexts** (maintaining the strict distinction between community-issued Labels and institution-issued Notices), **Mukurtu** cultural protocols, and **IEEE 2890-2025** provenance guidance as executable governance metadata rather than static disclaimers.

---

## 3. Edge Perception, Embodiment & Semantic Digital Twins

### 3.1 2026 Edge-to-Hub JEPA Stack
Running massive generative video or multimodal world models on solar-powered or SBC field nodes exhausts power budgets reconstructing environmental noise (rain, wind, foliage sway, lighting jitter). Compact 2026 Joint-Embedding Predictive Architectures (JEPA) predict in abstract latent space, waking higher-level LLM agents only when latent prediction error ("surprise") spikes.

* **CHARM (ICML 2026):** Lightweight channel-aware Transformer + TCN for heterogeneous time-series. Injects plain-text channel descriptors (soil moisture, IMU vibration, piezo acoustics, inverter voltage) into an order-equivariant encoder so new field probes register plug-and-play without retraining.
* **LeWorldModel (LeWM, ~15M params):** 5M ViT-Tiny encoder + 10M predictor trained stably via SIGReg (and Temporally Centered SIGReg). Runs on mini-PCs or SBCs, emitting one latent token per frame and flagging physically implausible perimeter events.
* **Causal-JEPA:** Masks whole objects to plan with roughly 99% fewer latent features than patch-based world models, allowing field cameras to transmit compact object-state vectors over LoRa or Meshtastic back to a community Aksara Node.
* **JEPA-Anything:** Uses Orthogonal Predictive Factorization (OPF) on hub servers (`Node+`) to split latent targets into causal pathways for counterfactual intervention simulation (modeling water-level or microgrid outcomes before acting).
* **V-JEPA 2.1 (~1.2B+ params):** Reserved strictly for robotic contact/manipulation tasks attached to dedicated local GPU hardware.

### 3.2 Outward-Facing Field Sensing: The 4 Aksara Sensory Pods
To avoid custom PCB sprawl during v1, pods wrap commodity 2026 modular hardware (Espressif ESP-Mosaico, Arduino UNO Q, Seeed XIAO ESP32S3 + Wio-SX1262 LoRa kits, SenseCAP Solar Nodes, reCamera RISC-V 1-TOPS cameras) behind standardized USB-C/solar weatherproof housings and `aksara_device_sdk.py` descriptors:

1. **The Eye Pod (Visual/Thermal):** Modular RISC-V camera + LeWM/YOLO watching gates, docks, crop canopies, or analog gauges; transmits latent anomalies and event snapshots.
2. **The Ear Pod (Bioacoustic/Mechanical):** I2S MEMS mic array + piezo contact mic detecting chainsaws, illegal vessels, pest swarms, biodiversity vocalizations, or failing water-pump bearings.
3. **The Earth/Water Pod (Environmental):** Snap-in RS485/Grove probes for soil NPK/moisture, river turbidity, conductivity, ultrasonic tank depth, or solar battery current.
4. **The Beacon Pod (Tracker/Button):** IP66 dual-band GPS + LoRa unit (SenseCAP X1 class) carried by field stewards, boats, or livestock for perimeter check-ins and SOS signals.

### 3.3 Inward-Facing Embodiment & Beyond-the-Browser Access
Environmental pods connect Aksara outward to ecosystems; a parallel modular hardware family embeds Aksara inside schools, village halls, clinics, and labs so participation never requires every member to own a laptop:

* **Modular Human-Scale Hardware Roles:** Decoupling the serviceable headless **Node Core** (refurbished or commodity x86-64 compute plus an independent watchdog/status microcontroller) from optional place-bound endpoints: a **Presence Surface** (diffused ambient status light and room voice/earcons), an **Information Surface** (persistent low-power e-paper display rendering strictly pre-authorized frames and QR handoffs), and a targeted portable **Card** (principal-bound identity, voice capture, haptic cues, approval token, and physical data courier).
* **Voice & Low-Friction Channels as Primary Access:** Treating spoken room interaction, WhatsApp text and voice notes, and mobile PWA views as native pathways into the same governed trust domain, with explicit audience rules so shared rooms never leak private personal context and instead route sensitive turns to authenticated personal handoffs.
* **Aksara Interaction Model Trajectory:** A high-leverage long-term research target is training or distilling a compact local interaction model specifically for Indonesian, Papuan Malay, code-switching, local names, noisy rooms, interruptions, and communal turn-taking, far more valuable in the field than building a generic regional frontier LLM.

### 3.4 Graph-Based Semantic Digital Twin & The Closed-Loop Moat
Physical assets, watersheds, land parcels, and sensor pods are represented as typed graph nodes carrying spatial relations, causal edges, and an append-only timeline of JEPA surprise events and human annotations, avoiding fragile 3D polygon renders.

**Physical Assets as First-Class DID Participants:** Every water pump, solar inverter, cold-storage unit, or watershed monitor holds a DID inside its community ETNOS Space.

1. A field pod detects a latent surprise spike locally via CHARM or LeWM.
2. Aksara Node emits a structured ATProto Lexicon record into the gated ETNOS Space under the asset's DID.
3. A human steward replies in-thread with ground-truth context ("bearing wear on pump 2" or "authorized village boat").
4. The signed human annotation updates the Semantic Digital Twin graph and calibrates future edge thresholds.

Over seasons, each community accumulates a sovereign, human-verified physical-world dataset that centralized AI labs cannot scrape or replicate.

---

## 4. Cognitive Architecture Beyond Chat & Modular Outputs

Between raw edge perception and social federation sits Aksara's cognitive substrate. Rather than treating every interaction as a stateless chat prompt over generic RAG chunks, Aksara organizes intelligence around structured abstractions that compile into diverse modular outputs.

### 4.1 Objective, Prerequisite & Evidence Graphs
Institutional work, curriculum mastery, clinical administration, regulatory processes, and field science are modeled around navigable **objectives, prerequisites, and verifiable evidence** (drawing on Marble-style skill/objective DAG patterns). Conversation and retrieval serve concrete objectives; missing evidence visibly blocks consequential progress, and model confidence never substitutes for human or instrument verification.

### 4.2 Unified Multi-Form Governed Memory & Plural Ontologies
Rather than fragmenting context across isolated databases, Aksara treats three memory forms as overlapping, rebuildable projections over a single Rust-governed evidence and receipt history:
* **Knowledge:** Versioned source documents, structured blocks, concepts, and protected institutional wikis.
* **Memory:** Bitemporal episodes, evolving claims, institutional relationships, and continuity summaries.
* **Experience:** Verified tool runs, physical instrument outcomes, and reviewed task trajectories distilled into reusable procedural Skills.

Optional Pack-scoped **ontology authoring** allows communities and scientific groups to propose, version, and review domain vocabularies over eligible source sets without imposing a single rigid global ontology across every bioregion or culture.

### 4.3 Heterogeneous Model Ecology & Graceful Intelligence Ladder (`L0`–`L5`)
Aksara routes cognition across an explicit hierarchy so capability degrades gracefully when connectivity, cloud budgets, or battery reserves fluctuate:

* **`L0` Deterministic Floor:** Rules, SQL/FTS5 lexical search, policy checks, and physical hardware safety interlocks.
* **`L1`–`L2` Local Edge & Interaction:** Tiny bounded decision models (for memory persistence triage, attention signals, and routing), local ASR/TTS, and compact interaction models over the local Library.
* **`L3` Local Deeper Reasoning:** Optional larger local models and `JEPA-Anything` hub simulations on `Node+` hardware.
* **`L4`–`L5` Governed Remote & Specialist Workers:** Policy-gated frontier models and remote scientific/compute clusters accessed through explicit egress rules and budgets.

### 4.4 Living Spatial Workspaces & Sandboxed Experience Publishing
At the user layer, Aksara evolves toward a single spatial living workspace, unifying personalized `Today` attention views, long-running private institutional lanes, shared human+agent `Channels`, and `Library` collections, without splitting "chat mode" from "app mode." Because the underlying structured knowledge and ontologies are clean and modular, the same substrate can compile governed knowledge into **sandboxed external outputs**: public community websites, lightweight operational mini-apps, interactive educational explainers, or bounded public front-desk Hosts running in isolated origins with zero ambient access to private institutional vaults.

---

## 5. Territorial Connectivity & Disruption-Tolerant Infrastructure

Real-world situated intelligence must remain operational across mountains, archipelagos, and intermittent rural grids. Connectivity is treated as a tiered, transport-agnostic layer beneath Aksara's governance contracts:

* **Payload-Class Connectivity Ladder:** Traffic is explicitly matched to physical link reality:
  * **`C0` (Tiny Envelopes):** Identity proofs, ACKs, SOS beacons, and scalar/latent anomaly alerts over NFC, BLE, or LoRa/Meshtastic.
  * **`C1` (Sparse Asynchronous):** Text messages, telemetry batches, learning progress receipts, and signed coordination requests over intermittent SMS, LoRa meshes, or opportunistic links.
  * **`C2` (Chunked Rich Media):** Audio specimens, lesson bundles, satellite embedding tiles, and instrument snapshots over LAN, directional outdoor Wi-Fi bridges, Wi-Fi HaLow/OpenMANET, or cellular failover.
  * **`C3` (Interactive & Heavy):** Realtime voice, rich collaboration, and remote specialist compute where healthy LAN or WAN backhaul exists.
* **Transport-Agnostic Encrypted Bundles (DTN):** Signed, encrypted, application-level envelopes carry stable IDs, TTLs, and delivery receipts across ordinary IP, **Bundle Protocol v7 (RFC 9171) / BPSec** or **Reticulum** overlays, and physical USB or smartphone "data mules." Intermediate relays transport ciphertext without acquiring read privileges or institutional authority, and expired or revoked mandates are re-checked before execution upon reconnection.
* **Compact Territorial Relays & Shared Compute:** Neighboring independent sites within a territory (for example, a school, clinic, watershed station, and community hall) can share outdoor directional backhaul, local software update mirrors, encrypted bundle spools, and leased inference capacity from a nearby `Node+` while keeping every institution's data custody strictly isolated.

---

## 6. Long-Horizon Research & Systems Trajectories

With natural ecosystems, human institutions, and structured ontologies resting on one sovereign substrate, seven intersecting trajectories define Abstraksi's long-term research and deployment horizon:

### Track 1: Planetary-to-Canopy Multi-Scale Digital Twins
Pair planetary Earth-observation embeddings with ground-level edge pods inside `etnos`'s `TerrainMap.svelte` and `Observatory`:
* **Orbital Prior:** AllenAI's **OlmoEarth v1.3** (128-d multi-year landscape embeddings) and DeepMind's **AlphaEarth Foundations** (64-d global embedding fields resilient to persistent tropical cloud cover) run on lightweight compute to track canopy loss, mining, or hydrological shifts across Papua.
* **Ground Fusion:** Bind local Aksara Pod DIDs to their exact GeoJSON polygons. When an upstream satellite embedding drifts in tandem with a downstream Earth/Water Pod turbidity spike, the **Watershed DID** opens a single evidence-linked ETNOS thread uniting the orbital delta, calibrated sensor curve, and steward observations.

### Track 2: Human Institutions, Civic Coordination & Evidence Monitors
Treat human organizations and public institutions as conversable situated systems operating alongside physical assets:
* **Mandated Institutional & Community Agents:** Schools, clinics, cooperatives, NGOs, and customary bodies operate private Aksara trust domains and may optionally field clearly labeled, revocable public agents on ETNOS with explicit source scopes and human escalation paths.
* **Transparent `PublicWork` & Scoped A2A:** Independent institutions coordinate shared public projects, data requests, and reviews through ETNOS's `PublicWork` sidecar while keeping internal `WorkObjects`, finances, and archives strictly private, bridging multi-step peer work over authenticated A2A only under mutual local authorization.
* **Independent Trajectory & News Monitors:** Companion public-information projects (exemplified by West Papua Watch) maintain independent editorial governance while linking fast-moving developments and investigative evidence to slow encyclopedic Wiki context without silently rewriting contested history.

### Track 3: Resilient Education, Remote Learning & Interactive Knowledge
Turn the exact same ecological, historical, and linguistic substrate into structured, offline-capable learning outputs:
* **Offline-First Learning Continuity:** Schools and remote communities host locally cached content bundles (Kolibri-style delivery on a local Aksara Node) with pseudonymous learner bindings, teacher-reviewed learning evidence, and delay-tolerant progress sync across shared phones, printed NFC artifacts, or lightweight endpoints.
* **Interactive 2.5D Explainers & Spatial Exhibits:** Transform `Observatory` specimens, `Ensiklopedia` topics, and `Kamus` language records into lightweight animated 2.5D learning modules (HTML/SVG/Canvas-first so they run offline on modest phones) and place-linked QR or marker-AR exhibits that reconnect archives directly to physical territory.

### Track 4: Living Peripherals & Bio-Infrastructure
Extend the Biological Event Encoder and biomaterials track with rigorous controls and open documentation:
* **Self-Repairing Fungal Biosensors:** Following the **MIND** (*Mycoponically Integrated Network Device*, arXiv:2604.22947) `MINDTube` and `MINDPixel` bioceramic designs, evaluate extracellular mycelial and plant electrophysiology as heterogeneous input channels into CHARM, paired with simultaneous abiotic covariate channels (light, temperature, humidity, electrode drift) and randomized controls.
* **Batteryless Rhizosphere Sensing:** Evaluate **Plant Microbial Fuel Cells (PMFCs)** harvesting roughly $80\text{ J/day}$ from root-zone bacteria to power periodic LoRa transmissions while using current density directly as a soil-water proxy ($r = 0.95$ in published benchmarks).
* **Bioluminescent & Living Surfaces:** Track Empa's living *Desarmillaria tabescens* wood composites and InnoRenew's `ARCHI-SKIN` / `BIOLUMICOAT` fungal biofilm coatings for low-intensity ambient signage, moisture/toxicity bio-indicators, and humid-climate experimental Presence Surfaces.

### Track 5: Energy-Sovereign Compute & Coupled Microgrid Swarms
Treat local power and local compute as one coupled dynamical system:
* **Metabolic Compute Scheduling:** Bind the village solar inverter and battery bank to a DID via `aksara-hwd`. Surplus midday irradiance automatically schedules heavy batch jobs (JEPA fine-tuning, `Kamus` audio transcription, satellite diffs, irrigation pumping). Cloud cover and low state-of-charge step the Aksara Node down the intelligence ladder (`L5` $\rightarrow$ `L1` $\rightarrow$ `L0`), keeping SQLite FTS5, `Kamus`, and `Observatory` available on single-digit watts.
* **Peer-to-Peer Energy & Compute Co-ops:** Neighboring Aksara Nodes linked over directional Wi-Fi or LAN negotiate surplus watt-hours and shared inference slots on local `Node+` boxes through signed Capability Leases and local ledgers.

### Track 6: Decentralized Autonomous Field Science ("Living Labs")
Connect autonomous discovery loops directly to live, under-instrumented environments through the Aksara Science Pack and ETNOS `DatasetCatalogue`:
* Agents continuously compare calibrated pod telemetry against historical baselines and `CommunitySeasons.svelte` calendars.
* Anomalies log typed `ResearchGap` records (Coverage, Contradiction, Temporal) and propose low-risk verification tasks on frugal instruments (such as an **OpenFlexure** motorized microscope or field acoustic recorder) gated by human operator confirmation and hardware interlocks.
* Verified analyses return to ETNOS with raw data hashes, reproducible notebooks, and explicit uncertainty bounds.

### Track 7: Biocultural & Linguistic Systems as Coupled Dynamical Graphs
Weave physical telemetry directly into cultural and linguistic memory inside `etnos`:
* Species occurrences, bioacoustic specimens (`cikukua-tanduk.mp3`), 3D artifacts (`nokdiak-tubingen.glb`, `kapak-batu-manchester.glb`), and environmental trends link natively to vernacular naming, oral histories, and voice recordings in `KamusTab` and `PetaKataPage`.
* Restricted ecological and cultural knowledge stays inside `ts-mls` encrypted Spaces tagged with CARE and Local Contexts governance labels (`CommunityLabels.svelte`).
* Complex-systems diagnostics (echoing `Sandpile.svelte`) monitor early-warning indicators such as critical slowing down, seasonal synchronization shifts, and resource tipping points across coupled social-ecological graphs.

### Epistemic Discipline & The Frugal Research Ladder
To keep frontier R&D scientifically credible alongside real institutional deployments, all tracks follow three methodological rules:
1. **Explicit Truth Ladder:** Every claim and capability is explicitly tagged as *proposed* $\rightarrow$ *designed* $\rightarrow$ *simulated* $\rightarrow$ *bench-tested* $\rightarrow$ *independently reproduced / field-tested* $\rightarrow$ *deployed*.
2. **Frugal Research Ladder (`L0`–`L3`):** Physical science progresses cleanly from `L0` computational analysis and `L1` low-cost calibrated measurement to `L2` supervised instrument automation and only later `L3` high autonomy.
3. **Physical Safety Below Cognition & Open Null Results:** Deterministic instrument interlocks always outrank model commands, living-peripheral studies always compete against calibrated physical/statistical baselines, and failed or null experiments are published openly as legitimate scientific output.

---

## 7. Generalizing Globally: Universal Substrate vs. Bioregional Packs

Global scale happens through a strict architectural separation between **the generalizable substrate** (which produces modular civic, educational, scientific, and ecological outputs) and **deeply situated Bioregional Packs**:

* **The Universal Substrate (Planet-Portable):** `aksara-core` (Rust authority kernel, Device SDK, JEPA edge bridge, multi-form memory, objective/evidence graphs, DTN outbox, metabolic power scheduler) and `etnos` (ATProto Spaces + `ts-mls` engine, `Observatory`, `Kamus`, `Ensiklopedia`, `PublicWork` sidecar, educational/experience publishing). Core schemas carry zero hardcoded Papuan administrative regions, languages, or governance assumptions.
* **Modular Output Packs:** Mounted cleanly onto the same substrate depending on what a community or institution needs to produce: transparent `PublicWork` between autonomous nodes, offline educational curricula and 2.5D explainers, environmental observatories, archival stewardship portals, or reproducible science workspaces.
* **Bioregional Pack #1 (Papua):** Bundles the seven wilayah adat GeoJSON boundaries, Mee and Papuan language specimens, endemic biodiversity baselines, cloud-penetrating tropical satellite priors, Indonesian/Papuan Malay voice evaluation corpora, and customary stewardship templates.
* **Replication Across Regions:** Swapping the Bioregional Pack and CHARM channel descriptors deploys the identical stack to an Amazonian forestry collective, a Pacific coastal fisheries co-op, a Kalimantan peatland fire-watch network, an East African smallholder watershed, or an off-grid bio-fabrication lab anywhere in the world.

---

## 8. High-Level Technical Horizon

Rather than locking prematurely into rigid micro-tasks, near-term evolution concentrates on connecting the seams that unlock this whole stacked architecture:

* **Sovereign Spaces Bridge:** Converging self-hosted ATProto Spaces PDS, private Spaces Jetstream consumption, and `etnos`'s `ts-mls` encryption layer so Ring 0, Ring 1, and Ring 2 operate seamlessly across online and intermittent links.
* **First Physical-to-Commons Loop:** Closing the end-to-end cycle from a single simulated or commodity sensor pod (`aksara_device_sdk.py` + edge JEPA surprise filter) posting under an asset DID into a gated `etnos` Space, receiving signed human ground-truth calibration, and updating the local Semantic Digital Twin.
* **Ontology-to-Output Modularity:** Proving that the same underlying structured knowledge and ontology layer can cleanly emit at least two distinct modular outputs, such as a transparent cross-node `PublicWork` coordination thread and an offline-ready interactive educational artifact derived from `Observatory` + `Kamus` records.
* **Planetary-to-Canopy Fusion & Frugal Lab Baselines:** Pairing a lightweight orbital embedding prior (`OlmoEarth` / `AlphaEarth`) over a test watershed polygon in `TerrainMap.svelte`, while establishing controlled `L0`/`L1` bench baselines for frugal instrumentation and living-peripheral electrophysiology.

---

## 9. Open Design Constraints

These are known tensions in the architecture above. Each needs a design answer before the matching part of §8 is built.

### 9.1 Encryption vs. Search
`ts-mls` sealing and server-side indexing are mutually exclusive. A PDS or AppView cannot index, rank, facet, or embed content it cannot read, so anything sealed in Ring 0 drops out of every server-side search path.

* **Consequence:** `Kamus`, `Observatory`, and Ensiklopedia search over private content must run where plaintext legitimately exists: on the member's client (a local index built after decryption) or on the community's own Aksara Node acting as an authorized MLS member under its custodial rules.
* **Leak surface:** Any shared index (hit counts, facets, autocomplete, graph edges, embeddings) built over sealed content becomes a side channel. This is the same rule as existence-level privacy in §2.3: hidden collections must not surface through search metadata.
* **Design choice to make per Space:** sealed (MLS, client or node search only) versus access-controlled plaintext on a self-hosted PDS (server search allowed, confidentiality rests on who runs the host). Ring 1 as described above assumes the second.

### 9.2 Device Identity for Field Pods
ESP32-class pods (XIAO ESP32S3, SenseCAP nodes) cannot safely hold long-lived DID signing keys. Flash is readable to anyone with physical access, secure elements are absent or uneven, and lost or stolen pods are expected in the field.

* **Consequence:** The asset or pod DID is held by the Aksara Node, not the pod. The node signs records on each pod's behalf under a revocable Capability Lease that scopes which record types, channels, and rates that pod may emit.
* **Pod-to-node link:** Pods authenticate to their node with a per-pod symmetric or device key provisioned at enrollment, which the node can rotate or revoke without touching the public DID.
* **Revocation:** A captured pod loses its lease at the node; the asset DID, its history, and its Space membership stay intact. Records carry both the node's signature and the lease ID, so stewards can see which physical device produced each observation.

### 9.3 Unverified External Dependencies
* **ATProto Spaces public beta on 1 December 2026:** not confirmed. The confirmed public source is the Spaces alpha announcement (atproto.com/blog/atproto-spaces-alpha, August 2026); ETNOS tested against alpha snapshot `0.0.0-spaces-alpha-20261029171913` in `labs/spaces`. The Sovereign Spaces Bridge in §8 should not be scheduled against the beta date until it is confirmed.
* **Figures in §3 and §6 Track 4** (CHARM, LeWM parameter counts, Causal-JEPA feature reduction, PMFC 80 J/day and r = 0.95) are taken from their papers and are not yet reproduced by Abstraksi. They sit at *proposed* on the truth ladder until bench-tested.
