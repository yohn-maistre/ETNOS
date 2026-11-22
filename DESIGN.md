---
name: Grafit
description: The visual system of ETNOS on Strata. Neutral graphite surfaces, heavy type, open rows and pills, ink-print landscapes as the only imagery.
colors:
  ground-light: "#fafafa"
  surface-light: "#ffffff"
  raised-light: "#f2f2f2"
  border-light: "#e5e5e5"
  ink-light: "#171717"
  muted-light: "#666666"
  ground-dark: "#0a0a0a"
  surface-dark: "#171717"
  raised-dark: "#242424"
  border-dark: "#303030"
  ink-dark: "#f5f5f5"
  muted-dark: "#a1a1a1"
  accent: "#1f4e8c"
  wash-ink: "#ffffff"
  gap-mark: "#e0a83a"
  class-place: "#4f7a5e"
  class-language: "#a2643a"
  class-people: "#5b6ea8"
  level-matter-sky: "#008b9e"
  level-rock-earth: "#c9892b"
  level-living: "#067132"
  level-mind: "#b54d98"
  level-language-ritual: "#305eb7"
  level-society-rules: "#b32228"
  level-made-knowledge: "#857d0b"
typography:
  display:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  secondary:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.35
    fontFeature: "tnum"
rounded:
  thumb: "14px"
  card: "16px"
  shell: "24px"
  pill: "999px"
spacing:
  row-y: "14px"
  section-top: "28px"
  section-bottom: "24px"
  gutter-phone: "16px"
  gutter: "24px"
components:
  pill:
    backgroundColor: "transparent"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  pill-selected:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.pill}"
  row:
    textColor: "{colors.ink-light}"
    typography: "{typography.title}"
    padding: "14px 24px"
  thumbnail:
    rounded: "{rounded.thumb}"
    size: "76px"
  button-primary:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.surface-light}"
    rounded: "10px"
    height: "42px"
    padding: "0 16px"
---

# Design System: Grafit

## Overview

**Creative North Star: "Grafit"**

Graphite is a pencil's core: neutral, heavy when pressed, sharp at the edge. ETNOS uses it as the whole system. Surfaces are near-white or near-black graphite. Type does the work that colour and decoration do elsewhere: heavy titles, plain body, quiet meta lines. The only images with character are the ink-print landscapes of Tanah Papua and the photographs that come with news and pages.

The register comes from Threads and X, where ETNOS started: one centred column inside a rounded shell card, rows that run to the column edges on hover, pills for every choice, thumbnails on the right. It has Swiss roots (a grotesk typeface, hierarchy by weight and size, flush left, no ornament) without a strict Swiss grid. It is a social product first, so it reads at thumb speed on a phone over a slow connection.

Grafit was named on 20 November 2026 after the Jelajah redesign, which is the reference surface. The other bases (Kabut, Kertas, Batu, Tinta) stay as reader choices on the same structure.

**Key Characteristics:**
- Neutral graphite surfaces; colour only for the reader's accent, entry classes on the knowledge map and the gap mark.
- Heavy titles (700 to 800), 15 to 16px body, 13.5px meta.
- Open rows and pills instead of nested cards; varied shapes per section on one rhythm.
- One cover primitive (`cover-wash`) for image-led cards.
- Serat, a fine grain texture, on by default; the theme follows the time of day until the reader picks one.

## Colors

The palette is graphite neutrals plus one accent the reader can change.

### Primary
- **Accent blue** (#1f4e8c): the default accent (`--brand`), set by `appearance.svelte.ts` and adjustable by the reader. Used for the current tab bar, links that need emphasis, focus rings and the selected state of small controls. Never for large fills.

### Neutral
- **Grafit Ground** (#fafafa light / #0a0a0a dark): the page behind the shell card (`--page-ground`).
- **Grafit Surface** (#ffffff / #171717): the shell card and sheets.
- **Grafit Raised** (#f2f2f2 / #242424): secondary fills, hover backgrounds, thumbnails while loading.
- **Grafit Border** (#e5e5e5 / #303030): hairlines between sections and rows.
- **Grafit Ink** (#171717 / #f5f5f5): text and the primary button.
- **Grafit Muted** (#666666 / #a1a1a1): meta lines and secondary labels.

### Data colours
- **Tempat** (#4f7a5e), **Bahasa** (#a2643a), **Masyarakat** (#5b6ea8): classes of entries on the knowledge map and its legend.
- **Celah** (#e0a83a): the ring that marks a gap (an entry without a wiki page). Used only on the map.
- **Level bands** on the observatory (`apps/web/src/world-scale.ts`): seven colours for the seven bands of the Integrative Levels Classification, used in every lens of the knowledge map, its legend and the entry panel. Light theme: Materi dan langit #008b9e, Batuan dan bumi #c9892b, Makhluk hidup #067132, Pikiran #b54d98, Bahasa dan ritus #305eb7, Masyarakat dan aturan #b32228, Buatan dan pengetahuan #857d0b. Dark theme: #0097ab, #c68627, #1d7d3e, #c664a8, #4777d2, #be2e31, #918112. Both sets pass a palette validator for lightness, chroma and contrast, with adjacent colour-blind separation in the 6 to 8 band. That is why the legend always names each band and the chart has a list view. The three bands that hold things today (rock and earth, language and ritual, society and rules) are well apart for every reader.

### Named Rules
**The Graphite Rule.** Colour carries meaning or nothing. The accent marks the current or focused thing; data colours mark classes on maps. Decoration stays neutral.

**The Hover Fill Rule.** Hover is a 4% mix of the foreground into the background (`color-mix(in oklab, var(--foreground) 4%, transparent)`), never a dark fill. A hover that turns a control black reads as a click.

## Typography

**Body and display font:** Geist Variable (with sans-serif)

**Character:** one grotesk family at many weights. Hierarchy comes from size and weight, not from a second typeface.

### Hierarchy
- **Display** (800, 26px at 768px and wider, 22px on phones, line-height 1.15, -0.02em): section titles on Jelajah and the wiki front.
- **Title** (700, 16px, 1.3, -0.012em): row titles, clamped to two lines.
- **Body** (400, 15px, 1.55): posts and page text, up to about 68 characters per line.
- **Secondary** (400, 14.5px, 1.4, foreground at 78%): row summaries, clamped to two lines.
- **Meta** (400, 13.5px, 1.35, muted, tabular numbers): dates, counts, sources.

### Named Rules
**The One Family Rule.** No serif specimens and no second display face. Earlier serif word specimens made Jelajah read like an old blog.

**The Rare Eyebrow Rule.** Small labels above titles are allowed only where they fit visually, and rarely.

## Layout

One column inside the shell card, with the sidebar on the left on desktop and the dock at the bottom on phones. Sections run full width inside the card with padding 28px on top and 24px on the sides and bottom (16px on phones), separated by a hairline. Rows bleed to the column edges with `margin: 0 calc(var(--gutter) * -1)` so their hover fill reaches the card edges. Horizontal scrollers (places) fade out on the right with a mask. Section order on Jelajah: Kabar hari ini, Sedang dibicarakan, Topik, Komunitas dan lembaga, Tempat, Bahasa.

## Elevation & Depth

Flat by default. Depth comes from the ground and surface difference (the shell card sits on the page ground), from hairlines, and from translucent blurred bars (sticky tabs, map controls) over content. Sheets and dialogs use the shadcn defaults. Cover cards get depth from the wash over the image, not from shadows.

### Named Rules
**The Flat Card Rule.** Cards do not float. A card is a rounded image or a hairline group, never a shadowed box inside another box.

## Shapes

Rounded, soft corners at three sizes: 14px for thumbnails, 16px for cards and map tiles, about 24px for the shell card. Every choice is a pill (999px). Thumbnails carry an inset 1px ring at 8% foreground so light images keep an edge.

## Components

### Rows (`ExploreRow.svelte`)
- **Shape:** full-bleed list item, padding 14px by the gutter.
- **Content:** heavy title, optional summary, meta line; optional 76px thumbnail on the right.
- **Hover / focus:** the 4% fill; focus is a 2px ring inset by 2px.

### Pills
- **Style:** 36px tall, 14px horizontal padding, hairline border, 13.5px at weight 550.
- **Selected:** ink background, surface text (segmented groups and lenses).
- **Ghost pill:** the last pill in a set, linking to the full list ("Semua N topik").

### Cover wash (`styles/cover-wash.css`)
- **Character:** full-bleed art, a dark wash from the bottom, a white meta line and a heavy headline. Measured contrast is at least 7.76:1.
- **Use:** the lead news card and other image-led cards. One primitive for all of them.

### Buttons
- **Primary:** ink background, surface text, 10px radius, 42px tall.
- **Secondary:** shadcn `secondary` and `ghost` variants from `$lib/components/ui/button`.

### Navigation
- **Desktop:** shadcn sidebar that stays put (no collapse toggle).
- **Phones:** a floating dock (Beranda, Jelajah, Masuk or the reader's own items, Menu).
- **Section tabs:** a sticky rail with the current tab in bold and a 4px rounded bar in the accent.

### Entry panel (`EntityPanel.svelte`)
- **Character:** a shadcn Sheet, right side on desktop (up to 460px), bottom on phones (up to 86% of the screen, 18px top radius). Sections divided by hairlines with 13px muted headings.

### Ensiklopedia front (`EnsiklopediaFront.svelte`, `styles/observatorium.css`, `/wiki`)
- **Character:** the information hierarchy of a superapp on the Jelajah rhythm (one gutter, 24px and 16px on phones; heavy section titles; rows that run to the card edges). Top to bottom: title and search; a state card (a 2.5% tinted panel with 18px radius) holding up to three large numbers and either three round quick actions (*Jawab*, *Tambah*, *Riwayat*) or the *Masuk untuk membantu* pill; the kind grid; the map card; rows with *Lihat semua*.
- **Kind tiles:** a lucide icon on a 56px square with 16px radius (50px and 14px in the single row from 600px), tinted 13% with the level band colour that the kind's entries carry on the knowledge map, so the colour means the same thing in both places. *Lainnya* stays neutral and opens a list of pills under the grid. The badge is a small dark pill on the corner with a real count, and it is left out when there is no number. Three rows of three on phones, one row of nine from 600px.
- **Map card:** every point of the public graph in its default layout on a 3% ground, at a fixed 10 by 3 aspect, with the title, a count line and the lens pills that open `/wiki/peta?lens=`.
- **Card row:** 148px square images with 16px radius that scroll sideways, title and kind under each.

### Kind page (`KindPage.svelte`, `/wiki/jenis/:kind`)
- **Character:** a crumb, heavy title and count, then sub-kind circles (60px, 6% tint, the count inside, the label under, the current one filled in the foreground colour) that scroll sideways, a row of viewer thumbnails for kinds with records, status pills and a place pill, then rows. Filters are links, so the address carries them.

### Entry page (`EntryPage.svelte`, `EntryRail.svelte`, `/wiki/:slug`)
- **Character:** crumb chain, heavy title, a muted kind line, then the picture (a photo that opens the viewer, or the landscape print for places). Four tabs at most in the sticky section tab bar; kind modules sit inside *Tentang* after the article and the fact list, and *Dasar label* is a small block at the foot.
- **Letak rail:** in the shell's side rail from 1200px (220px wide between 1200 and 1359px, sticky): an indented tree of the chain with hairline elbows and the current entry in bold with its children, the wilayah adat as an overlay line, then *Komunitas di sini* (avatar rows), *Lembaga terkait* and *Terkait* (hairline rows with the sub-kind on the right). Below 1200px it is a row of chips under the picture, and the *Letak* chip opens the same rail inline.

### Knowledge map (`KnowledgeExplorer.svelte`, `MapStage.svelte`, `stage-layouts.ts`)
- **Character:** one canvas on a 3% tinted ground with one set of points; the lens pill group (*Ukuran dan waktu*, *Tingkat*, *Bidang ilmu*, *Kebutuhan*, *Hubungan*, *Peta*) only changes where the points go, and they move there in 650ms with an ease-in-out curve (a cut with reduced motion). Level is the colour in every lens. Groups are dashed rings with a label above and a count below; an empty group stays visible as a ring marked *belum ada*. Labels carry a surface-coloured halo and hide while points move. Round 36px controls top right (44px on touch screens).
- **Ukuran dan waktu:** a box with three log axes (size, pace, level) that the reader can turn all the way round; axis labels sit on the edges that face the reader. Phones start flat with a *Putar 3D* toggle.
- **Full screen (`KnowledgeMapPage.svelte`, `/wiki/peta`):** the same explorer filling the screen under a 60px bar with *Tutup*; the address keeps the lens and the selected thing.

### Viewer (`Viewer.svelte`, `viewer/*`, `styles/viewer.css`, `/wiki/lihat/:id`)
- **Character:** a full-screen shell with a 60px bar (*Tutup* and the path), the body on the left and a 400px reading panel on the right; on phones the body takes the top 62% and the panel follows. The body is chosen by kind and loaded only when opened: 3D object (WebGL, orbit, two light positions), species (photos, occurrence map, sound), landform (MapLibre relief), images (zoom and pan), sound (waveform and transcript), dataset (table preview).
- **Catalogue strip:** a 64px bar under the body with round step buttons, a tabular counter (*3 / 14*), 44px thumbnails with 10px radius (the current one outlined in the foreground colour, a kind icon when there is no image) and a *Semua* pill. Pulled up, or with *Semua*, it opens a grid of cards above itself (up to 72% of the screen, kind filter pills at the top) that rises in 240ms, or appears at once with reduced motion. On phones the bar gets a grab handle and the thumbnails take their own line.
- **Controls over a body:** round 36px buttons on a translucent surface (44px on touch screens) top right, pill groups for views. Every image shows its maker, licence and source under it; the panel ends with every source and licence of the record.

### Lembaga page (`LembagaPage.svelte`, `/groups/:id`)
- **Character:** the header holds a 64px logo tile (initials on a tint when there is no logo), a heavy title, a muted kind line (jenis · Publik), the lede, place pills and the actions. Then two sections with 22px titles: *Dari lembaga ini* (the lembaga's own text, a hairline fact list for contacts and website, recognition as sourced sentences with a muted disclaimer, community rows) and *Di ensiklopedia* (the claimed entry as a 3% tinted card with the reviewed excerpt and facts). A pending claim is a tinted note with *Setujui* and *Tolak* for the operator.
- **Jenis sections (`CommunityDirectory.svelte`):** the Lembaga tab lists one section per jenis with a 16px title and a muted count, under a row of 44px jump pills that scrolls sideways with the page gutter.

### Community labels (`CommunityLabels.svelte`, `CommunityPlaces.svelte`)
- **Fields:** three stacked fields with a 14px label and a muted hint. Search inputs are 44px. Chosen labels are 34px pills with a 28px round remove button. Matches are a bordered list of 44px rows with the kind on the right. Choosing a Papuan language shows a note on a 9% brand tint. The same component serves creation and the settings modal.
- **On the community page:** about labels as 32px outline pills (a pin icon for places), then one muted line with *Ditulis dalam bahasa …* and *Dikelola oleh …* as underlined links, and *Atur label* for stewards.

### Kios (`KiosBlock.svelte`, `KiosPlace.svelte`)
- **Block:** a 14px title with a bag icon and the switch on the right for whoever manages it; hairline rows of title (14.5px, 650), price and unit in tabular figures, and place; outline buttons *Kirim pesan* and *WhatsApp*; a 12.5px foot line that payment does not go through ETNOS. In the rail from 1360px, and inline above the tabs below that.
- **Opening:** a dialog with the house rules as a bulleted list on a 3% tint, an optional WhatsApp field and *Setuju dan buka*.
- **Kios di …:** an 18px section title in *Tentang* with hairline rows and the seller on the right, or a compact list in the Letak rail from 1200px. It is never shown in both places at once.

### Kamus in posts (`KamusBody.svelte`, `KamusCard.svelte`, `KamusTop.svelte`)
- **Question underline:** a dotted 2px underline in the accent colour, offset 0.22em, on at most three words per post. It is a button, so the keyboard reaches it. Every other word opens the card on tap.
- **Word card:** a solid card in the accent colour with the accent's foreground text, 16px radius, 360px wide next to the word on desktop and a bottom card with 12px margins on phones. Answers and chips are 44px tall; *Ya* is filled with the foreground colour. The source and licence sit under a hairline in 12.5px.
- **Notice card:** the same solid accent fill as a strip above the posts, shown from ten open questions or when claims wait in Periksa. One sentence counts both and one *Periksa* button opens the Kamus deck first, whose last screen continues to the other claims. The separate Periksa bar shows only when there is no Kamus.
- **Mode belajar:** checked words get a 15% tint and a 1.5px bottom line in their class colour, plus a small class letter, so colour is never the only cue. Word class colours reuse the level bands: benda #067132 (dark #1d7d3e), kerja #305eb7 (#4777d2), sifat #b54d98 (#c664a8), lainnya #857d0b (#918112). The legend names each class.
- **Cetak kamus:** a white page with two columns of entries by first letter, sources and licences in the footer; the print stylesheet hides everything else.

### Percakapan (`TentangPicker.svelte`, `TandaiPrompt.svelte`, the Percakapan tab of `EntryPage.svelte`)
- **In the composer:** chosen entries are 34px outline pills with a 28px round remove button, followed by a *Tentang* pill that opens a 44px search with a bordered list of 44px rows (kind on the right). Names found in the text are dashed 34px pills with a plus and the kind in muted 12.5px, after a muted *Disebut di tulisan*, and an *Abaikan* text button ends the row.
- **Tandai card:** one floating card (16px radius, hairline, soft shadow) centred at the bottom, above the dock on phones, with the question in 15px and the entry in 700, a muted line under it, and buttons at least 64 by 40px. A shared name shows one outline button per kind. It rises 8px in 220ms, or appears at once with reduced motion.
- **The tab:** the *Tulis tentang …* primary button and the *Termasuk tempat di dalamnya* switch on one line, then a 13px muted count line over a hairline. Each post has a 13px muted source line with a small icon (tag, people or pin) above its card, and an underlined link when it names a community or a place inside. Paging is a 40px outline pill. The empty state is a 17px title, one muted sentence and the primary button.

## Do's and Don'ts

### Do:
- **Do** use components from shadcn-svelte and bits-ui wherever they fit; copy their markup by hand only where a page cannot import them (the identity host's server pages).
- **Do** vary the component per section (lead card, rows, pills, avatar rows, scroller) on the same spacing rhythm.
- **Do** keep section titles at 22 to 26px and weight 800, rows at 16px and 700.
- **Do** use the 4% hover fill and the accent focus ring.
- **Do** follow `docs/voice.md` and `docs/naming.md` for every visible word.

### Don't:
- **Don't** bring back heavy rules, serif word specimens or open hairline lists without hierarchy.
- **Don't** nest cards in cards or add drop shadows to cards.
- **Don't** use colour for decoration; the accent and data colours carry meaning only.
- **Don't** let a sticky bar cover the shell card's rounded corners.
- **Don't** put interactive maps in lists; lists get static thumbnails, detail pages get the live map.
