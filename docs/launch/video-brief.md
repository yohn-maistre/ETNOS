# Launch video brief

*27 November 2026. For any agent or person who makes the Abstraksi launch reel, a teaser or a deck about ETNOS. Read [AGENTS.md](../../AGENTS.md) sections 1 to 5 first. Everything here must hold up in front of Papuan communities and partners. ETNOS was not entered in BUDAYA GO! 2026, so no cut mentions it.*

## 1. Purpose and audience

The first cut is the launch reel for Abstraksi's Instagram account. It introduces Abstraksi and its vision in a few seconds, then shows ETNOS as its first project. It is a launch film, not a product demo. The viewers are Papuan communities and lembaga adat, students and teachers, campus and language partners, and people who follow Abstraksi.

| Cut | Length | Format | Use |
| --- | --- | --- | --- |
| Launch reel | 30 to 45 seconds | 9:16 for Reels, plus a 4:5 feed version | Instagram first, then WhatsApp and the site |
| Walkthrough | 2 to 3 minutes | 16:9 | Partners and the README, later |

The reel must work with the sound off, so every spoken line is also burned in as a caption.

### The owner's opening idea for the reel

1. A fast collage of cultural artefacts and spoken words, stacked on top of each other. It shows knowledge that sits in many separate places.
2. The pieces break into points of light and come together into one clean digital monolith.
3. ETNOS runs through all of them as a fast thread that ties them together.
4. It ends on a clean Abstraksi wordmark. The style is minimal and clean, in the Grafit palette.

### Inputs from the code, so the picture is true

- **The points** can be real ETNOS data: the 256 Glottolog language points in `src/catalogues/tanah-papua.json` and the nodes of the knowledge map in `apps/web/public/observatory/knowledge/`, coloured as the map colours them. The monolith that forms is then made of ETNOS's own data. The three.js scenes in `apps/web/src/LanguageStage.svelte` and `MapStage.svelte` can be reused for the renders.
- **The thread** can follow the real loop: a post, then a question about a word in it, then a check by members, then an Ensiklopedia entry.
- **The collage** uses CC0 museum images (the Penampil already credits Naturalis and others) and only consented recordings. The scattered places are shown as abstract stand-ins (chat bubbles, PDF pages, museum drawers), never as real brand logos.
- **Tools.** Remotion is free for organisations of up to three people; Motion Canvas is MIT. Either can render 9:16 and 4:5 from one source.
- **The wordmark.** No Abstraksi wordmark file exists in this repository yet. It comes from the owner's Abstraksi vision document.
- **Vision features** that are not built yet are labelled *rencana* on screen.

## 2. The message

The frame is **percakapan menjadi pengetahuan**. The problem line, from [PRODUCT.md](../../PRODUCT.md), is that what is alive is not recorded, and what is recorded is not alive. The answer is that ETNOS lets people write as they already do, then asks small questions about what they wrote. Members check the answers, and the community decides what becomes part of its Kamus and its Ensiklopedia. The community holds the result.

Say what ETNOS does, in plain words. Do not claim it is the first, the biggest or revolutionary.

## 3. Story beats and the screens that show them

| # | Beat | Screen | Route or source |
| --- | --- | --- | --- |
| 1 | Most of what is written about Papua comes from outside, and daily talk disappears | Title cards with sourced facts (section 6) | None |
| 2 | People write as usual | Beranda and Alun-Alun on a phone | `/` |
| 3 | A local word becomes a question | A Kamus word card with *Ya*, *Bukan* and *Tidak tahu*, Mode belajar, a voice pronunciation | A language community; see `docs/assets/readme/strip-kamus.jpg` |
| 4 | A post about a place appears on that place's page | The *Tentang* picker, then the Percakapan tab of an entry | `/wiki/mee-pago`; see `strip-percakapan.jpg` |
| 5 | The Ensiklopedia grows | The front with its carousel, an entry, the Penampil, a 3D object, Peta Bahasa & Semantik, the knowledge map | `/wiki`, `/wiki/cenderawasih-kuning-besar`, `/wiki/peta-kata`, `/wiki/peta` |
| 6 | Members check each other | The Periksa deck, with a swipe | A community page |
| 7 | A lembaga gets its own website | A Situs at `nama.etnos.space`, then the editor | `/groups/<id>/situs`; see `strip-situs.jpg` |
| 8 | Members trade and help each other | Kios, Kartu Asal, Peluang | A profile with an open Kios |
| 9 | Aksara helps, in the open | An Aksara post with its AI label and sources, then the Aksara page | `/aksara` |
| 10 | The community owns it | The many-homes diagram, the AGPL and AT Protocol line | `docs/assets/diagram-homes-id-light.svg` |
| 11 | Invitation | The etnos.space address and the sign-in screen | `/` |

## 4. How to capture the screens

- **Public pages** can be filmed on the live site. Use Playwright with `recordVideo`, a 390 × 844 viewport for phones and 1440 × 900 for desktop, and `deviceScaleFactor: 2`. Close the welcome dialog by clicking *Jelajahi dulu*. Film light and dark.
- **Signed-in flows** such as Kamus cards, Periksa, the composer and the Situs editor are filmed on a local dev server with test data. Run `npx vite --port 5191` in `apps/web`, and route `**/v1/**` and `**/auth/**` to etnos.space, or run a local node with `npm run demo`. Test names carry *(fixture)* or *data uji*; either keep the marker on screen or use names that are clearly invented, and never use a real person's name.
- **Never film** Studio service keys, operator tokens, invite codes, email addresses, direct messages or any private community.
- Ready-made stills are in `docs/assets/readme/` (desktop home and five phone strips). The Indonesian document in `docs/share/` has page images.

## 5. Brand assets

| Asset | Where | Note |
| --- | --- | --- |
| Wordmark *etnos.* | `apps/web/src/BrandWordmark.svelte`, notice in `apps/web/public/branding/WORDMARK-NOTICE.md` | Glyph outlines from Plus Jakarta Sans 800 (SIL OFL). Keep the dot. In text, write ETNOS |
| App icon | `apps/web/public/branding/icon.svg` | |
| Ink-print landscapes | `apps/web/public/branding/*.webp`, `apps/web/public/share/*.jpg` | AI-generated illustrations from owner references (`artwork-manifest.json`). Label them as illustrations, never as photographs or traditional art |
| Colours and type | [DESIGN.md](../../DESIGN.md) | Grafit neutrals, accent `#1f4e8c`, Geist Variable as the single family |
| Diagrams | `docs/assets/diagram-*-id-light.svg` and `-dark.svg` | Indonesian versions, built with `docs/assets/build-diagrams.mjs` (pele) |

## 6. Facts you may use, with their sources

Use only these, worded as here, or check a new figure against its source before using it.

| Fact | Source |
| --- | --- |
| Badan Bahasa counts about 428 regional languages in Tanah Papua | Antara Papua, linked in README.md |
| The project's survey of three customary regions lists 105 sources, held in places such as Leiden, Canberra and Jayapura | README.md, *Why ETNOS exists* |
| TransNewGuinea.org holds 41 words of Ekari, all from one 1975 source | README.md |
| The largest Ekari dictionary, by Steltenpool, was published in 1969 | README.md |
| Internet use in Maluku and Papua is 69.74%, against 81.72% nationally | APJII 2026, in PRODUCT.md |
| Live counts (entries, languages, places) | Read them from `/wiki` on the day of filming, and show the date |

## 7. Voice, sound and people

- **Narration** is in plain Indonesian, following [docs/voice.md](../voice.md). Short sentences, no slang, no *ngobrol* or *obrolan*, no *warga*, no poetic lines except the tagline. Subtitles in Indonesian and English.
- **Papuan voices and faces** appear only with written consent from each person. Papuan Malay or a regional language is spoken by a real speaker who agreed to it, never by synthetic speech. Do not clone anyone's voice. If a synthetic narrator is used, say so in the credits.
- **Music** is original, CC0, or licensed with credit. Traditional songs and dances appear only with permission from the community that holds them.
- **Cultural care.** Do not show sacred objects, rites or restricted knowledge. Museum images keep their credit and licence line (the Penampil shows it, for example *Naturalis Biodiversity Center · CC0 1.0*). Do not show the exact location of hunted or traded species.

## 8. Do not

- Name West Papua Watch.
- Frame Papua as part of a political bloc, or use separatist or state symbols.
- Show invented numbers, testimonials, or users presented as real.
- Show another person's posts without consent. The owner's own public posts are fine.
- Put large video files in git. Keep the scripts, storyboard and final links in `docs/launch/`, and store the media in a release or external storage.

## 9. Before publishing

1. The owner watches the cut and approves it.
2. Every number has its source and date.
3. Consent forms for every voice and face are stored with the owner, outside the repository.
4. Credits name the music, the museum images, the open-source projects (ETNOS under AGPL-3.0, Cirrus, Photon) and the data sources shown.
