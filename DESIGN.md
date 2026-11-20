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

### Observatory front (`Observatorium.svelte`, `styles/observatorium.css`)
- **Character:** the wiki front rebuilt on the Jelajah rhythm: one gutter for every block (24px, 16px on phones), 28px above and 24px below each section, heavy section titles, rows that run to the card edges. The knowledge map comes first with three lenses as a pill group (*Ukuran dan waktu*, *Hubungan*, *Peta*), then wiki pages, the data catalogue, what is unknown and the large groups.
- **Size and pace chart (`ScaleConstellation.svelte`):** a canvas on the same 3% tinted ground as the network map, log axes in everyday units, level as colour, a dashed box for the selected thing's range. Flat on phones and with reduced motion; a slight 3D turn on wide screens with a mouse.

### Knowledge map (`KnowledgeGraph3D.svelte`)
- **Character:** a canvas in 3D on a 3% tinted ground, entries as dots sized by sources, labels with a surface-coloured halo, round 36px controls top right. Drag turns it with the finger.

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
