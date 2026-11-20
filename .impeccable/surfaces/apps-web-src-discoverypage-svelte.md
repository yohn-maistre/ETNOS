---
version: 1
slug: "apps-web-src-discoverypage-svelte"
primary_target: "apps/web/src/DiscoveryPage.svelte"
related_targets: []
---

# Jelajah

Scope: /explore (DiscoveryPage.svelte and its Explore* components). Visitor mode: Operate (browse and pick something to read or join). Audience: Papuans on phones, logged in or not. Constraints: real content only; voice.md copy; components from shadcn-svelte where they fit.

## Direction contract

THESIS: Jelajah is an Explore page in the Threads and X register, ordered Kabar, Sedang dibicarakan, Topik, Komunitas dan lembaga, Tempat, Bahasa. It refuses the editorial broadsheet arrangement (heavy rules, serif specimens, open hairline lists) that made it read like an old blog.

OWN-WORLD: Grafit neutrals, Geist throughout at heavier weights (titles 650 to 800), 15 to 17px rows with 16px vertical padding, full-bleed hover fills, 12 to 16px radii, thumbnails on the right, pill controls, avatars for communities. The ink-print landscapes stay the only imagery besides news photos.

STORY: The reader sees today's news first, then what people are talking about, then can pick a topic, join a community, or open a place or language.

FIRST VIEWPORT: Sticky tab bar (Kabar, Dibicarakan, Topik, Komunitas, Tempat, Bahasa) with a rounded 4px indicator. "Kabar hari ini" heading, the washed lead card, then news rows with 80px thumbnails right.

FORM: varied components per section: news rows with thumbnails, a ranked trending list, topic pills, community rows with avatar and a Lihat pill, a place scroller with map tiles, language chips. seed: none (pinned) "let's just get as close as we can to how threads does it, but of course with our information hierarchy"

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
