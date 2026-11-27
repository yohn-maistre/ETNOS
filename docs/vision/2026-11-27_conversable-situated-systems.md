# Abstraksi & ETNOS: Conversable Situated Systems

**Date:** 27 November 2026
**Scope:** Unified architecture, data sovereignty, edge perception, long-horizon research tracks, and global replication model across `aksara-core` (Aksara Node) and `etnos` (ETNOS PDS & Living Commons).
**Status:** Working architectural synthesis aligning current repository implementations (`yohn-maistre/aksara-core`, `yohn-maistre/etnos`) with the Abstraksi Systems Catalogue (v2.5.8) and late-2026 protocol, edge-JEPA, and bio-infrastructure research.

---

## 1. Core Thesis: Conversable Situated Systems

A physical or social system at macro scale (a watershed, a forest perimeter, a village solar microgrid, a school, a community clinic, a laboratory bench, a customary institution) becomes legible and governable when intelligence is embedded directly inside its operating loop. Most AI deployments fail outside well-connected offices because they treat physical reality as static text scraped from the open web and concentrate custody in distant clouds.

Abstraksi closes that gap by building a single four-layer cybernetic loop that lets humans, institutions, and physical systems sense, reason, remember, and coordinate under local custody.

| Layer | Function in the Loop | Concrete Components in Current Stack |
| :--- | :--- | :--- |
| **1. Transduction** | Convert continuous physical reality into calibrated observations and latent prediction-error ("surprise") vectors | Edge JEPA (`CHARM`, `LeWorldModel`, `Causal-JEPA`), orbital embeddings (`OlmoEarth v1.3`, `AlphaEarth`), commodity field sensor pods, experimental bio-transducers |
| **2. Sovereign Kernel** | Enforce principal identity, custodial rights, physical safety interlocks, capability leases, and signed receipts below cognition | `aksarad` (Rust + SQLite), `crates/kernel` (`effects.rs`, `memory.rs`, `library.rs`, `work.rs`, `computer.rs`), `aksara-hwd`, `python/aksara_device_sdk.py` |
| **3. Cognitive & Research Engine** | Translate longitudinal state into dialogue, counterfactual intervention modeling, and reproducible scientific inquiry | Mastra `AgentController` + Pi Durable adapters, `LongMemory`, `JEPA-Anything`, Aksara Science Pack (`Observation` -> `ResearchGap` -> `Hypothesis` -> `ExperimentRun`) |
| **4. Shared Commons** | Provide a federated public and permissioned space where humans, institutions, and physical-asset DIDs converse, verify claims, and coordinate work | `etnos` (ATProto Spaces + `ts-mls`, `AtSpaceCard.svelte`, `SpacesLab.svelte`, `Observatory`, `KamusTab`, `PetaKataPage`, `CommunitySeasons.svelte`, `TerrainMap.svelte`, `AgentConnections.svelte`, `ResidentParticipation.svelte`) |

Every deployment scale (an office, a coastal village, a forest catchment, a microgrid, or a field lab) is an instance of this same **Situated Node** abstraction.

---

## 2. Protocol & Data Sovereignty: ATProto Spaces + `ts-mls` + Local PDS

Standard public ATProto streams every commit over unauthenticated Relay firehoses (`com.atproto.sync.subscribeRepos`), exposing records permanently to third-party AI training scrapers. Moving ETNOS onto **ATProto Spaces** (entering Public Beta on December 1, 2026 across reference PDS hosts) solves firehose leakage at the protocol layer when paired with self-hosted Aksara Nodes and Messaging Layer Security (`ts-mls`, already present in `etnos`).

### Protocol Mechanics Used
* **Relay Bypass:** Space records never traverse public Relays. They sync directly from PDS hosts to authorized AppViews and private **Spaces Jetstream** sidecars (`mode: 'spaces'`).
* **Space Authority DIDs & Open Social Groups (`opensocial.group`):** Communities own Spaces under group DIDs that issue key-bound credentials independently of any single personal account.
* **Cryptographic Confidentiality via `ts-mls`:** ATProto Proposal 0016 scopes Spaces to access control, meaning PDS hosts read plaintext for indexing. Pairing self-hosted Aksara Node PDS (where the institution is both PDS host and Space Authority) with client-side `ts-mls` group encryption locks sensitive cultural archives, field coordinates, and raw media even when records traverse external infrastructure.
* **Explicit Constraints Managed by Architecture:**
  * `did:plc` audit logs remain public metadata, so sensitive custodian topologies avoid exposing private internal inventories through handles or public directories.
  * ATProto assumes reachable HTTP/WebSocket hosts, so Aksara Nodes maintain a local SQLite write queue and store-and-forward outbox for rural connectivity blackouts, re-evaluating revoked mandates before pushing upstream on reconnect.

### Three-Ring Sovereignty Model

| Sovereignty Ring | Transport & Storage | Contents | Exposure to Public Scrapers |
| :--- | :--- | :--- | :--- |
| **Ring 0: Local Vault & MLS** | On-node SQLite/PostgreSQL + pgvector, or `ts-mls` E2EE blobs inside a Space | Raw video/audio streams, sacred cultural archives, exact sensitive coordinates, private keys | Zero (never leaves hardware in plaintext) |
| **Ring 1: Self-Hosted ETNOS Spaces** | Aksara Node Spaces PDS + private Spaces Jetstream sidecar | Community threads, verified local knowledge, JEPA anomaly alerts, Semantic Digital Twin state | Zero (gated by Space Authority credentials; off public Relays) |
| **Ring 2: Public Atmosphere** | Standard public ATProto repo | Deliberately approved public outputs: `Ensiklopedia` entries, `Observatory` showcases, open ecological bulletins, `PublicWork` milestones | Open by explicit human approval |

---

## 3. Edge Perception, Modular Sensor Pods & Semantic Digital Twins

Running massive generative video or multimodal world models on solar-powered or SBC field nodes exhausts power budgets reconstructing environmental noise (rain, wind, foliage sway, lighting jitter). Compact 2026 Joint-Embedding Predictive Architectures (JEPA) predict in abstract latent space, waking higher-level LLM agents only when latent prediction error ("surprise") spikes.

### 2026 Edge-to-Hub JEPA Stack
* **CHARM (ICML 2026):** Lightweight channel-aware Transformer + TCN for heterogeneous time-series. Injects plain-text channel descriptors (soil moisture, IMU vibration, piezo acoustics, inverter voltage) into an order-equivariant encoder so new field probes register plug-and-play without retraining.
* **LeWorldModel (LeWM, ~15M params):** 5M ViT-Tiny encoder + 10M predictor trained stably via SIGReg (and Temporally Centered SIGReg). Runs on mini-PCs or SBCs, emitting one latent token per frame and flagging physically implausible perimeter events.
* **Causal-JEPA:** Masks whole objects to plan with roughly 99% fewer latent features than patch-based world models, allowing field cameras to transmit compact object-state vectors over LoRa or Meshtastic back to a community Aksara Node.
* **JEPA-Anything:** Uses Orthogonal Predictive Factorization (OPF) on hub servers (`Node+`) to split latent targets into causal pathways for counterfactual intervention simulation (modeling water-level or microgrid outcomes before acting).
* **V-JEPA 2.1 (~1.2B+ params):** Reserved strictly for robotic contact/manipulation tasks attached to dedicated local GPU hardware.

### Off-the-Shelf v1 Hardware & the 4 Aksara Sensory Pods
To avoid custom PCB sprawl during v1, pods wrap commodity 2026 modular hardware (Espressif ESP-Mosaico, Arduino UNO Q, Seeed XIAO ESP32S3 + Wio-SX1262 LoRa kits, SenseCAP Solar Nodes, reCamera RISC-V 1-TOPS cameras) behind standardized USB-C/solar weatherproof housings and `aksara_device_sdk.py` descriptors:

1. **The Eye Pod (Visual/Thermal):** Modular RISC-V camera + LeWM/YOLO watching gates, docks, crop canopies, or analog gauges; transmits latent anomalies and event snapshots.
2. **The Ear Pod (Bioacoustic/Mechanical):** I2S MEMS mic array + piezo contact mic detecting chainsaws, illegal vessels, pest swarms, biodiversity vocalizations, or failing water-pump bearings.
3. **The Earth/Water Pod (Environmental):** Snap-in RS485/Grove probes for soil NPK/moisture, river turbidity, conductivity, ultrasonic tank depth, or solar battery current.
4. **The Beacon Pod (Tracker/Button):** IP66 dual-band GPS + LoRa unit (SenseCAP X1 class) carried by field stewards, boats, or livestock for perimeter check-ins and SOS signals.

### Graph-Based Semantic Digital Twin & The Closed-Loop Moat
Physical assets, watersheds, land parcels, and sensor pods are represented as typed graph nodes carrying spatial relations, causal edges, and an append-only timeline of JEPA surprise events and human annotations, avoiding fragile 3D polygon renders.

**Physical Assets as First-Class DID Participants:** Every water pump, solar inverter, cold-storage unit, or watershed monitor holds a DID inside its community ETNOS Space.

1. A field pod detects a latent surprise spike locally via CHARM or LeWM.
2. Aksara Node emits a structured ATProto Lexicon record into the gated ETNOS Space under the asset's DID.
3. A human steward replies in-thread with ground-truth context ("bearing wear on pump 2" or "authorized village boat").
4. The signed human annotation updates the Semantic Digital Twin graph and calibrates future edge thresholds.

Over seasons, each community accumulates a sovereign, human-verified physical-world dataset that centralized AI labs cannot scrape or replicate.

---

## 4. Five Long-Horizon Research & Systems Tracks

### Track 1: Planetary-to-Canopy Multi-Scale Digital Twins
Pair planetary Earth-observation embeddings with ground-level edge pods inside `etnos`'s `TerrainMap.svelte` and `Observatory`:
* **Orbital Prior:** AllenAI's **OlmoEarth v1.3** (128-d multi-year landscape embeddings) and DeepMind's **AlphaEarth Foundations** (64-d global embedding fields resilient to persistent tropical cloud cover) run on lightweight compute to track canopy loss, mining, or hydrological shifts across Papua.
* **Ground Fusion:** Bind local Aksara Pod DIDs to their exact GeoJSON polygons. When an upstream satellite embedding drifts in tandem with a downstream Earth/Water Pod turbidity spike, the **Watershed DID** opens a single evidence-linked ETNOS thread uniting the orbital delta, calibrated sensor curve, and steward observations.

### Track 2: Living Peripherals & Bio-Infrastructure
Extend the Catalogue's Biological Event Encoder and materials track (§33) with strict scientific baselines and published null results:
* **Self-Repairing Fungal Biosensors:** Following the **MIND** (*Mycoponically Integrated Network Device*, arXiv:2604.22947) `MINDTube` and `MINDPixel` bioceramic designs, test extracellular mycelial and plant electrophysiology as heterogeneous input channels into CHARM, always paired with simultaneous abiotic covariate channels (light, temperature, humidity, electrode drift) and randomized controls.
* **Batteryless Rhizosphere Sensing:** Evaluate **Plant Microbial Fuel Cells (PMFCs)** harvesting ~80 J/day from root-zone bacteria to power periodic LoRa transmissions while using current density directly as a soil-water proxy.
* **Bioluminescent & Living Surfaces:** Track Empa's living *Desarmillaria tabescens* wood composites and InnoRenew's `ARCHI-SKIN` / `BIOLUMICOAT` fungal biofilm coatings for low-intensity ambient indicators, moisture markers, and humid-climate experimental Presence Surfaces.

### Track 3: Energy-Sovereign Compute & Coupled Microgrid Swarms
Treat local power and local compute as one coupled dynamical system:
* **Metabolic Compute Scheduling:** Bind the village solar inverter and battery bank to a DID via `aksara-hwd`. Surplus midday irradiance automatically schedules heavy batch jobs (JEPA fine-tuning, `Kamus` audio transcription, satellite diffs, irrigation pumping). Cloud cover and low state-of-charge step the Aksara Node down the intelligence ladder (`L5 -> L1 -> L0`), keeping SQLite FTS5, `Kamus`, and `Observatory` available on single-digit watts.
* **Peer-to-Peer Energy & Compute Co-ops:** Neighboring Aksara Nodes linked over directional Wi-Fi or LAN negotiate surplus watt-hours and shared inference slots on local `Node+` boxes through signed Capability Leases and local ledgers.

### Track 4: Decentralized Autonomous Field Science ("Living Labs")
Connect autonomous discovery loops directly to live, under-instrumented environments through the Aksara Science Pack and ETNOS `DatasetCatalogue`:
* Agents continuously compare calibrated pod telemetry against historical baselines and `CommunitySeasons.svelte` calendars.
* Anomalies log typed `ResearchGap` records (Coverage, Contradiction, Temporal) and propose low-risk verification tasks on frugal instruments (such as an **OpenFlexure** motorized microscope or field acoustic recorder) gated by human operator confirmation and hardware interlocks.
* Verified analyses return to ETNOS with raw data hashes, reproducible notebooks, and explicit uncertainty bounds.

### Track 5: Biocultural & Linguistic Systems as Coupled Dynamical Graphs
Weave physical telemetry directly into cultural and linguistic memory inside `etnos`:
* Species occurrences, bioacoustic specimens (`cikukua-tanduk.mp3`), 3D artifacts (`nokdiak-tubingen.glb`, `kapak-batu-manchester.glb`), and environmental trends link natively to vernacular naming, oral histories, and voice recordings in `KamusTab` and `PetaKataPage`.
* Restricted ecological and cultural knowledge stays inside `ts-mls` encrypted Spaces tagged with CARE and Local Contexts governance labels (`CommunityLabels.svelte`).
* Complex-systems diagnostics (echoing `Sandpile.svelte`) monitor early-warning indicators such as critical slowing down, seasonal synchronization shifts, and resource tipping points across coupled social-ecological graphs.

---

## 5. Generalizing Globally: Universal Substrate vs. Bioregional Packs

Global scale happens through a strict boundary between planet-portable infrastructure and deeply situated regional packs:

* **Universal Substrate:** `aksara-core` (Rust kernel, Device SDK, JEPA-to-Lexicon bridge, Mastra/Pi runtimes, metabolic power scheduler) and `etnos` (ATProto Spaces + `ts-mls` engine, `Observatory`, `Kamus`, `Ensiklopedia`, `PublicWork` sidecar). Core schemas carry zero hardcoded Papuan administrative regions, languages, or governance assumptions.
* **Bioregional Pack #1 (Papua):** Bundles the seven wilayah adat GeoJSON boundaries, Mee and Papuan language specimens, endemic biodiversity baselines, cloud-penetrating tropical satellite priors, and customary stewardship templates.
* **Replication Across Regions:** Swapping the Bioregional Pack and CHARM channel descriptors deploys the identical stack to an Amazonian forestry collective, a Pacific coastal fisheries co-op, a Kalimantan peatland fire-watch network, an East African smallholder watershed, or an off-grid bio-fabrication lab.

---

## 6. Immediate Engineering Sequence

1. **Deploy Reference Spaces PDS on Aksara Node:** Adopt the December 1, 2026 ATProto Spaces PDS release and wire a local Spaces Jetstream sidecar (`mode: 'spaces'`) alongside `etnos`'s existing `SpacesLab.svelte` and `ts-mls` key lifecycle.
2. **Ship the First Sensor-Event Lexicon:** Define a minimal ATProto Lexicon for calibrated `ObservationEnvelope` + JEPA surprise alerts, allowing `python/aksara_device_sdk.py` (simulated first via `device_simulator.py`, then on a single XIAO ESP32S3 + probe) to post as a first-class DID into a gated `etnos` Space and accept signed steward replies.
3. **Wire Ground-Truth Calibration & Digital Twin Graph:** Persist steward replies into `aksarad` SQLite + `LongMemory` and project asset timelines into `etnos/apps/web/public/observatory/knowledge/graph.json` or live Space queries.
4. **Add Macro Orbital Layer:** Run a single OlmoEarth v1.3 embedding diff over one test Papuan watershed polygon and display it inside `TerrainMap.svelte`.
5. **Run First Controlled Bench Rig:** Execute one low-risk physical instrument loop (environmental probe or OpenFlexure capture) and one controlled plant-electrophysiology covariate dataset before scaling field deployments.