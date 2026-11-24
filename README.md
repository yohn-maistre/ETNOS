<div align="center">

# ETNOS

### Percakapan menjadi pengetahuan

**Open-source software that turns everyday community conversation into shared knowledge that the community owns, checks and corrects.**

[![Licence AGPL-3.0](https://img.shields.io/badge/licence-AGPL--3.0-blue?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Svelte 5](https://img.shields.io/badge/Svelte_5-ff3e00?style=flat-square&logo=svelte&logoColor=white)](https://svelte.dev)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-f38020?style=flat-square&logo=cloudflareworkers&logoColor=white)](https://workers.cloudflare.com)
[![Durable Objects (SQLite)](https://img.shields.io/badge/Durable_Objects-SQLite-f38020?style=flat-square&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/durable-objects/)
[![AT Protocol](https://img.shields.io/badge/AT_Protocol-0085ff?style=flat-square)](https://atproto.com)

[![Foundation checks](https://img.shields.io/github/actions/workflow/status/yohn-maistre/etnos/check.yml?style=flat-square&logo=githubactions&logoColor=white&label=checks)](https://github.com/yohn-maistre/etnos/actions/workflows/check.yml)
[![Deploy ETNOS](https://img.shields.io/github/actions/workflow/status/yohn-maistre/etnos/deploy-etnos.yml?style=flat-square&logo=githubactions&logoColor=white&label=deploy)](https://github.com/yohn-maistre/etnos/actions/workflows/deploy-etnos.yml)
[![Live site etnos.space](https://img.shields.io/badge/live-etnos.space-2da44e?style=flat-square)](https://etnos.space)

[Live site](https://etnos.space) · [Peta Kata](https://etnos.space/peta-kata) · [Docs](docs/README.md) · [How it works](#how-it-works) · [Tour](#a-short-tour) · [Architecture](#under-the-hood) · [Run locally](#run-locally) · [Licence](#licence-and-credits)

**English** · [Bahasa Indonesia](README.id.md)

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/home-desktop-dark.jpg">
  <img src="docs/assets/readme/home-desktop-light.jpg" alt="The ETNOS home on a desktop screen: the left menu with Beranda, Jelajah, Komunitas, Ensiklopedia and Jadwal Aksara, the community feed in the middle with a post from Aksara asking whether a wiki claim about Bahasa Ekari is still true, and news from Papuan publishers with community links on the right." width="100%">
</picture>

</div>

> [!NOTE]
> Reading is open to everyone at [etnos.space](https://etnos.space). People join with an ETNOS account on `etnos.space` (using a password or a WebAuthn passkey) or with an existing Bluesky account. Screens marked *(fixture)* below come from local test runs with invented names rather than real people.

**ETNOS** is open-source community software, and [etnos.space](https://etnos.space) is its first deployment for Tanah Papua. People talk, share voice notes, trade in Kios, post local opportunities, and build a dictionary and encyclopedia that stay under community control.

<details>
<summary><b>Ringkasan dalam bahasa Indonesia</b></summary>

<br>

ETNOS adalah ruang digital tempat orang Papua berbincang, mengirim pesan suara, berdagang lewat Kios, dan menyusun kamus serta ensiklopedia bersama. Ketika seseorang menulis kata dalam bahasa daerah, ETNOS menanyakan artinya dan menyimpan jawaban yang sudah diperiksa ke Kamus komunitas dan Peta Kata. Ketika seseorang menulis tentang Danau Tigi, posting itu muncul di halaman Danau Tigi di Ensiklopedia. Aksara, asisten AI yang bekerja secara terbuka, membantu merangkum kabar dan menyusun draf bersumber, tetapi manusia selalu memegang keputusan akhir. Akun berjalan di atas AT Protocol sehingga setiap orang tetap memiliki identitas dan datanya. Kodenya terbuka dengan lisensi AGPL-3.0 agar wilayah lain dapat menjalankan ETNOS sendiri.

</details>

## Why ETNOS exists

People across Tanah Papua already write and record knowledge every day, but existing platforms scatter and erase it.

- Everyday writing lives in small news sites, city Facebook groups, Instagram captions and WhatsApp groups that never connect and disappear within days.
- Most published records about Papua were written by outsiders and sit in journals, expensive books and museums abroad. Our own source survey of three customary regions lists **105 sources** held in places such as Leiden, Canberra and Jayapura.
- Badan Bahasa counts about **428 regional languages** in Tanah Papua, which is more than in any other part of Indonesia, according to [Antara Papua](https://papua.antaranews.com/berita/730961/balai-bahasa-papua-dan-pemkab-jayapura-tingkatkan-bahasa-sentani).
- The largest open wordlist database for New Guinea, TransNewGuinea.org, holds only **41 words of Ekari** from a single 1975 source, while the largest published Ekari dictionary dates back to Steltenpool in 1969.

<details>
<summary><b>Indonesian law and policy already ask for what ETNOS builds</b></summary>

<br>

| Instrument | What it asks for |
| --- | --- |
| Kongres Kebudayaan Indonesia 2023 | A cultural observatory (idea 10), sovereignty of masyarakat adat over the sources of their cultural knowledge (idea 9), and digital tools that manage cultural data and pass knowledge on (idea 8). |
| [UU 5/2017](https://pasal.id/peraturan/uu/uu-no-5-tahun-2017) on cultural advancement | Regional cultural plans that are drafted from the regencies upward, joined by PP 87/2021 for an integrated cultural data system. |
| UU 2/2021 on Special Autonomy for Papua (Otsus), [full text](https://peraturan.bpk.go.id/Download/165578/UU%20Nomor%202%20Tahun%202021.pdf) | Provincial duties to protect Papuan culture (Article 57), preserve regional languages (Article 58) and protect the intellectual property of Orang Asli Papua (Article 44). |
| [PP 56/2022](https://peraturan.bpk.go.id/Details/233504/pp-no-56-tahun-2022) | A national inventory of communal intellectual property that covers traditional cultural expressions and traditional knowledge. |

</details>

The full case and cited sources live in [framing and impact](docs/plan/framing-and-impact-2026-11-17.md) and [rationale threads](docs/plan/rationale-threads-2026-11-19.md).

## How it works

People write, record voice notes and share photos in their communities as they already do. ETNOS turns what they share into small questions, such as *does this word mean "tongue"?* or *is this post about Danau Tigi?* Members check each other in Periksa, and only what the community confirms enters the Kamus or the settled Ensiklopedia. Everything else stays a conversation on the matching place or topic page.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/diagram-loop-dark.svg">
    <img src="docs/assets/diagram-loop-light.svg" alt="What people already share (a post, a plant or bird photo, a voice note, a 3D capture) becomes a question back to them. Members check it in Periksa, and the result lands in the Kamus komunitas, as a new Ensiklopedia entry, or as Percakapan on an entry that already exists. Entries feed the Situs and the knowledge map." width="100%">
  </picture>
</p>

Under the interface there are only four core kinds of record. An **Akun** writes **Jejak** (posts, photos, voice notes, 3D captures) inside a **Ruang** (a community), and both can be *tentang* an **Entri**, which is a place, a language, a people, a species, a lembaga or a word. Every entry lives at `/wiki/<slug>`.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/diagram-kinds-dark.svg">
    <img src="docs/assets/diagram-kinds-light.svg" alt="Four kinds: an Akun (a person or Aksara) posts in a Ruang and writes Jejak. Jejak and Ruang are tentang an Entri, an Akun can manage an Entri, and an Entri can be part of another Entri." width="100%">
  </picture>
</p>

## A short tour

The **Ensiklopedia** gives every place, language, people, species, landform, object and lembaga in Tanah Papua one page with its sources, its revision history and the public conversations about it. The full-screen **Penampil** opens photos, specimens, audio and 3D models (`.glb`, `.spz`, `.ply`) with clickable 3D spatial pins, and the knowledge map plots entries by size and time span.

<p align="center"><img src="docs/assets/readme/strip-ensiklopedia.jpg" alt="Four phone screens: the Ensiklopedia front with counts and a grid of kinds, the page of the Cenderawasih kuning besar with its taxonomy and a museum specimen photo, the same specimen in the Penampil, and the knowledge map plotting entries by size and age." width="100%"></p>

The **Kamus in posts** underlines local-language words inside a language community and lets members tap a word to answer one question (*Artinya lidah?*). Members can attach native voice pronunciations, practise with Mode belajar, print QR-coded **Lembar Ajar** worksheets for schools, and explore spoken words across 256 Papuan languages on [Peta Kata](https://etnos.space/peta-kata).

<p align="center"><img src="docs/assets/readme/strip-kamus.jpg" alt="Four phone screens of a Mee language community with test data: posts with underlined Ekari words, a word card asking whether duwaa means kebun, Mode belajar with coloured word classes and a Kata hari ini card, and the Periksa deck for the word duwaa." width="100%"></p>

**Percakapan** links public posts to up to five entries, suggests names that appear in the text, and asks when a name is ambiguous (such as Puncak Jaya the regency versus the mountain). Public posts then appear under Percakapan on each entry page, and regional pages gather posts from smaller places inside them.

<p align="center"><img src="docs/assets/readme/strip-percakapan.jpg" alt="Four phone screens with test data: a post asking whether Puncak Jaya means the regency or the mountain, the composer suggesting entries named in the text, the Percakapan tab of Mee Pago listing posts from places inside it, and an empty Percakapan tab inviting the first post about Danau Tigi." width="100%"></p>

**Lembaga and Kios** give customary councils, sanggar, schools and district offices a profile in their own voice alongside their Ensiklopedia entry. Members open a Kios to sell crafts or produce with direct contact and printable QR **Kartu Asal** provenance tags, and they can also share structured **Peluang** (scholarships, grants, jobs) and **Titip bagasi** travel-courier posts.

<p align="center"><img src="docs/assets/readme/strip-lembaga.jpg" alt="Four phone screens with test data: a lembaga profile for a Dewan Adat with its own text and an office address, a member profile with a Kios offering pinang, sayur gedi and a noken, community settings with labels for place, topic and language, and the Ensiklopedia entry managed by the lembaga." width="100%"></p>

**Situs** lets a lembaga publish its own lightweight website directly from the public data that it already maintains on ETNOS, with two templates, version rollback and subdomain addresses under `nama.etnos.space`.

<p align="center"><img src="docs/assets/readme/strip-situs.jpg" alt="Four phone screens with test data: an editorial Situs for a sanggar with a large carving photo, an office-style Situs for a district office with WhatsApp and phone buttons, and the Situs editor showing the preview and the template and colour choices." width="100%"></p>

## Features

The table below lists every major capability and its current status on [etnos.space](https://etnos.space).

| Feature | What it does | Status |
| --- | --- | --- |
| Ensiklopedia & Penampil | One page per entry with sources, live-wiki review bar, history, Percakapan, knowledge map, dataset catalogue, and full-screen specimen/3D viewer. | ![Live](https://img.shields.io/badge/Live-2da44e?style=flat-square) |
| Kamus & Peta Kata | Underlined words in posts, one-question word cards, Artinya translations, Mode belajar, Kata hari ini, CSV/CLDF export, printable QR Lembar Ajar, and the `/peta-kata` spoken word atlas across 256 languages. | ![Live](https://img.shields.io/badge/Live-2da44e?style=flat-square) |
| Voice notes & Bantu tulis | In-browser voice recorder, 0.75x learner playback, cultural protocol gating, community transcription (Bantu tulis), optional Whisper transcription, Kamus pronunciation clips, and Android PWA Share Target for WhatsApp audio. | ![Live](https://img.shields.io/badge/Live-2da44e?style=flat-square) |
| 3D Gaussian Splats & spatial pins | Pure WebGL `.glb`, `.spz` and `.ply` rendering in Penampil with clickable 3D spatial pins, plus an optional serverless Modal GPU worker (`packages/splat-worker`) that turns walk-around videos into `.spz` splats. | ![Live](https://img.shields.io/badge/Live-2da44e?style=flat-square) |
| Periksa & Saluran | Swipe deck for community claim verification, opt-in public Pl@ntNet plant identification, and Kurasi Balik reciprocal museum IIIF annotations with W3C Web Annotation JSON-LD export. | ![Live](https://img.shields.io/badge/Live-2da44e?style=flat-square) |
| Autonomous Aksara | Scheduled WIT public librarian that summarizes daily news, drafts sourced Ensiklopedia pages (marked unreviewed until stewards accept or revert), and answers `@aksara` mentions using Google AI Studio, OpenRouter or Workers AI fallback. | ![Live](https://img.shields.io/badge/Live-2da44e?style=flat-square) |
| Communities, Lembaga, Kios, Peluang & Bagasi | Public and private communities, lembaga profiles, Kios offers with printable QR Kartu Asal tags, plus structured Peluang (scholarships/grants/jobs) and Titip bagasi (highland logistics) posts. | ![Live](https://img.shields.io/badge/Live-2da44e?style=flat-square) |
| News by place | Stories from Papuan publishers grouped by story and filtered by place, with every publisher credited. | ![Live](https://img.shields.io/badge/Live-2da44e?style=flat-square) |
| ETNOS identity host & Passkeys | Multi-account AT Protocol PDS (`name.etnos.space`) with WebAuthn Passkeys, daily signup cap, R2 CAR backups, and alpha AT Protocol Spaces revocation sync for private communities. | ![Live](https://img.shields.io/badge/Live-2da44e?style=flat-square) |
| Situs & `etnos.yaml` | Static websites for lembaga from their public ETNOS records, plus one-file deployment configuration so other regions can run their own ETNOS home. | ![Being tested](https://img.shields.io/badge/Being_tested-d29922?style=flat-square) |
| Encrypted direct messages | End-to-end encrypted messaging between devices. | ![Being tested](https://img.shields.io/badge/Being_tested-d29922?style=flat-square) |

## Under the hood

Everything in the core engine and web app is written in TypeScript. The same engine runs on Cloudflare Workers (inside a SQLite Durable Object with an anonymous edge cache for public reads) and locally on Node 24 with SQLite.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/diagram-architecture-dark.svg">
    <img src="docs/assets/diagram-architecture-light.svg" alt="Architecture: the Svelte 5 web app and Situs addresses at nama.etnos.space call the Worker API on Cloudflare Workers. The Worker uses the ETNOS node in a SQLite Durable Object and the Aksara runtime with its model gateway. It signs people in through OAuth with the identity host, a PDS that speaks the AT Protocol and keeps one Durable Object per account plus R2 blobs." width="100%">
  </picture>
</p>

People hold their accounts on an AT Protocol identity host, which is the same open protocol that powers Bluesky. Account holders can download their repository today, operators can run R2 CAR backups, and private community records never enter public AT records, anonymous edge caches, search results, or external APIs.

ETNOS is built to run as many independent homes rather than one central monopoly. Each region or people runs its own deployment under its own governance and shares only what it chooses to publish through open identifiers (Glottolog, Concepticon, GBIF, Wikidata, W3C Web Annotations). For moving a deployment onto a dedicated Cloudflare Free account, see [docs/ops/fresh-cloudflare-migration.md](docs/ops/fresh-cloudflare-migration.md).

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/diagram-homes-dark.svg">
    <img src="docs/assets/diagram-homes-light.svg" alt="Two ETNOS homes, one for Tanah Papua and one for another region, each with its communities, Kamus and entries. Each sends public records only to a shared index keyed by GBIF, Glottolog, Concepticon and Wikidata, which feeds a word atlas checked by speakers." width="100%">
  </picture>
</p>

## Principles

Six standing rules govern every feature in the codebase.

1. People decide what becomes settled knowledge, because stewards and members can inspect, edit or revert anything that Aksara drafts.
2. Every AI action carries an explicit AI label, runs inside steward-set budgets, and leaves a public work log.
3. Sources keep their credit, and headline-only sources stay headline-only.
4. Private data stays private across counts, search, edge caches, external channels and AI suggestions.
5. Local terms and account names stay as written, and split community answers remain visible instead of being forced into false consensus.
6. Every core community workflow continues to work when AI is turned off.

## Run locally

Install Node 24.19 or newer, then run the typechecks and test suite.

```bash
npm ci --ignore-scripts
npm run check
npm test
```

Start a local node seeded with synthetic fixture data.

```bash
npm run demo      # creates synthetic data in an empty database
npm start         # serves http://127.0.0.1:7342
```

Build the Svelte 5 web app and verify the Cloudflare Worker bundle.

```bash
npm ci --prefix apps/web --ignore-scripts
npm run build:ui
npm run build:worker
```

Environment settings use the `ETNOS_*` prefix, and older `STRATA_*` names remain supported ([setting names](docs/accounts-and-hosting/engineering.md#cloudflare-development)). Read [AGENTS.md](AGENTS.md) before contributing, because it defines the mandatory rules for access isolation, withdrawal and tests. Interface names follow [docs/naming.md](docs/naming.md), public writing follows [docs/voice.md](docs/voice.md), security reports follow [SECURITY.md](SECURITY.md), and authentication details live in [AUTH.md](AUTH.md).

## Repository layout

```text
src/                   ETNOS node: communities, posts, voice, 3D captures, Saluran, Peta Kata, wiki, edge cache, Worker
apps/web/              Svelte 5 PWA web app with Indonesian interface and zero-dependency WebGL 3DGS viewer
packages/pds/          Multi-account AT Protocol identity host (Passkeys, Spaces alpha, R2 CAR backups)
packages/splat-worker/ Optional Modal serverless GPU worker for video-to-3DGS (.spz)
docs/                  Plans, decisions, research, operations runbooks and release records
scripts/               Setup, migration and tooling scripts
deploy/                Release markers that trigger GitHub Actions deploys
test/                  Unit, boundary and workerd integration tests
```

## Documentation

| Document | What it holds |
| --- | --- |
| [docs/plan/what-etnos-is.md](docs/plan/what-etnos-is.md) | The whole picture in plain words |
| [docs/plan/one-page-system-2026-11-21.md](docs/plan/one-page-system-2026-11-21.md) | The four kinds, entry pages, Kamus in posts, lembaga, Percakapan and Situs |
| [docs/plan/saluran-2026-11-22.md](docs/plan/saluran-2026-11-22.md) | How photos, sound, 3D and time feed the Ensiklopedia |
| [docs/plan/many-etnos-2026-11-21.md](docs/plan/many-etnos-2026-11-21.md) | Many homes and one shared language |
| [docs/ops/fresh-cloudflare-migration.md](docs/ops/fresh-cloudflare-migration.md) | Dedicated Cloudflare Free account migration runbook |
| [docs/accounts-and-hosting/engineering.md](docs/accounts-and-hosting/engineering.md) | Developer and operator guide |

Every document is indexed in [docs/README.md](docs/README.md). Diagrams in this README are rendered with [pele](https://pele.run) via [docs/assets/build-diagrams.mjs](docs/assets/build-diagrams.mjs).

## Background

<details>
<summary><b>ETNOS grew over several years before this repository</b></summary>

<br>

- In **2023**, the idea and the name ETNOS were first drafted.
- In **March 2025**, [Saireri ETNOS](https://github.com/yohn-maistre/saireri-etnos) launched as an early web client for a federated community forum based on [Photon](https://github.com/Xyphyn/photon).
- In **March 2026**, [Honai Metro](https://github.com/yohn-maistre/honai-metro) forked Photon as a Papua-focused fediverse client with Bahasa Indonesia, a Papua wiki and a provincial dashboard.
- On **31 October 2026**, this repository started on top of the AT Protocol so people own their accounts while the engine centers on shared community knowledge and accountable stewards.

</details>

## Licence and credits

ETNOS is licensed under [AGPL-3.0-only](LICENSE), which requires anyone who runs a modified version for other people to share their source changes.

- The identity host in `packages/pds` is a fork of [Cirrus](https://github.com/ascorbic/cirrus) by Matt Kane and contributors under the MIT licence in [`packages/pds/LICENSE.cirrus`](packages/pds/LICENSE.cirrus).
- Earlier ETNOS web clients grew out of [Photon](https://github.com/Xyphyn/photon) (AGPL-3.0-only; see [`apps/web/licenses/photon-AGPL.txt`](apps/web/licenses/photon-AGPL.txt)) and took forum inspiration from PieFed.
- Complete third-party notices for the web app live in [`apps/web/licenses`](apps/web/licenses) and [`apps/web/public/third-party-notices.txt`](apps/web/public/third-party-notices.txt).
