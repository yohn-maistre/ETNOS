# Places, hierarchy and first-run: research and proposal

16 November 2026. For the owner and whoever builds next. Everything marked "Proposal" is a proposal. Facts about other platforms were fetched on 16 November 2026 unless marked "from memory". Sources are listed at the end.

## 0. The problem, in one paragraph

People start from where they are. Today the app does not. Places sit behind "Tempat & bahasa" under Jelajah. A regency, a customary region, a language, a topic and even a community kind all render as one "context" page. A kind such as "Forum musyawarah" is a page you can visit, but it is really a property of a room. The hierarchy exists in the data and is hidden in the screens.

## 0.1 What the code does today (checked)

- `src/catalogues/tanah-papua.json`, version 2026-11-15. Every entry has `kind` (`place`, `region`, `topic`, `language`), an optional `facet`, and `parents` (slugs).
- Entries by kind and facet: 256 languages; 40 regencies and 2 cities; 7 customary regions; 6 provinces; 23 plain topics; 3 topic groups; 9 cultural domains; 12 community kinds (one root plus 11); 8 institution kinds (one root plus 7).
- Parents are many-to-many (`context_parents`). 44 entries have two or more parents. Every regency has two: its province and its customary region (for example `nabire` has `papua-tengah` and `meepago`). Up to 20 parents per context. Cycles are refused. A community labelled with a child shows under all its ancestors (`src/groups.ts`, recursive query).
- Community kinds and institution kinds are `kind: topic` entries. A community "carries" its kind as a label, so each kind gets a page. This is the problem the owner saw.
- The catalogue's own notes say: the seven regions are reference regions, not customary land boundaries; regions with more than eight members (La Pago, Domberai) list only eight; districts and villages are not included; languages have no place parent because Glottolog gives only a point.
- Limits that matter later: the context list endpoint returns at most 1,000 rows and the parent list at most 5,000 (`src/groups.ts`, `contexts()`). A record may carry at most 10 public contexts.
- Web app: `/contexts` and `/contexts/:slug` (38 references to `/contexts` in `apps/web/src`). Map components today: `PlaceMap`, the region stack, `CoreSample`, `KnowledgeMap`, `NewsMap`. After signup the app goes to `/communities?welcome=1`. There is no onboarding for place, language or interests yet (the direction doc says it should be optional; sections "Ruang bahasa" and the later sweep).
- No lexicon (AT record schema) mentions contexts, so renaming routes and axes does not break published records.

Two data issues to fix whatever else happens:

1. The direction doc says Nabire sits in both Mee Pago and Saireri. The catalogue gives Nabire only Mee Pago. The model below needs this case to work.
2. Glottolog is now release 5.4 (2026). The catalogue cites 5.3.

## 1. What other platforms do

### 1.1 Table

| Platform | Place | Hierarchy | Topics | First signup | First deployment | Borrow | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Lemmy** | None built in. A community is a flat name on one instance. | None. A "multi-community" bundles communities. | None. | You pick an instance, then follow communities. New users are subscribed to the instance default only. Feed tabs: Subscribed, Local, All. Users on small instances saw empty "Subscribed" views and an issue argued for a better default. | Newer versions add an admin-chosen "suggested" multi-community. A later change makes a fresh instance fetch the top 100 communities from lemmyverse.net and write a welcome post. | An admin-curated suggested list on the front page. A welcome post on day one. | A default view that is empty for new people. |
| **PieFed** | None built in. | **Topics**: a hierarchy of topics made by the instance admins. A topic holds communities. Topics can be imported from one JSON file. | Topics (admin) and **Feeds** (anyone, public or private, federated). Feeds are "multi-communities". | Topics are shown to new users during onboarding to help them find communities. A logged-out visitor sees a preset list chosen by admins. | Admin tools: scan a remote server for communities, load communities from Lemmyverse data (about 200), import a topics JSON. | Two layers: official shared topics, plus personal bundles. Topic tree as the onboarding screen. | Topic tree with no place axis. Users report confusion between Topics and Feeds. |
| **Mastodon** | None. Language and local/federated only. | None. Hashtags are flat. | Hashtags, featured hashtags, a profile directory. | A list of recommended accounts. Admins set an "always recommend" list, plus an automatic pool by interaction, with a pool per language. | Owner creates the admin account on the command line. Then fills in contact, description, rules. | Per-language recommendation pools. An "about this server: who it is for" page. | Starting from people instead of places. |
| **Bluesky** | None. | None. Lists are flat. | Custom feeds (code). | **Starter packs**: up to 150 accounts and 3 feeds, shared by link or QR. Joining through a pack follows them all. A study of the feature reports use grew over time. | Not applicable (hosted). | A shareable bundle that starts a person with a populated home. QR and link suit WhatsApp. | A pack that follows people only. Ours should bundle places, rooms and pages. Packs do not update after follow. |
| **Reddit** | A moderator can add a location (city, state or country) to a community so people near it find it. It cannot be removed once set. Places are otherwise subreddits named after cities. | None. Subreddits are flat. Related ones link by sidebar. | Interests picked at signup. | Steps seen in a recorded flow and a guide: optional gender question, choose interests, choose communities, avatar. | Founder creates a subreddit. | Interests then communities, in that order. | Asking gender. Location that cannot be unset. Flat geography. |
| **Discourse** | None. | Categories with subcategories. Default depth 2. A hidden setting can raise it to 3. Staff advise keeping defaults because deep nesting is hard to navigate. A topic has exactly one category. | **Tags** cut across categories. Tag groups, synonyms, and rules such as "one tag from this group". | Admin sets categories first. | Admin creates the first categories. | Two levels of nesting. One tree for where it lives, tags for what it is. Tag synonyms (we have aliases). | Using categories for everything. |
| **Nextdoor** | Core. A neighbourhood has mapped boundaries. Users are placed by verified address. | Neighbourhood, service area (ward, district), whole jurisdiction. Posts can target any of these. | None to speak of. | Address verification by device location, data vendors, or a mailed postcard. Unverified users get limited use. | A **Lead** (usually the founder) starts a neighbourhood. | **Agencies** post to every place under them, residents cannot start threads with the agency. Public agencies see only replies to their own posts. Boundaries from public data, polygons supplied when missing. | Address verification and real names. Wrong for Papua: unsafe, excludes people, and a place is not proof of residence. |
| **Facebook Groups** | A group can add a location. Mostly a text tag. | None. | Up to five tags and a group type. | Privacy at creation: public, private visible, private hidden. | Founder fills in settings. | Group type chosen at creation. Visible/hidden as two separate switches. | Location as free text. |
| **Wikipedia** | Categories by country, region, city. | Categories form a graph, not a tree. A category can have several parents. Pages go in the most specific category only. No loops. **Portals** are reader entrances to a topic, with a root article and categories. Portal tree mirrors the geography categories. | Categories double as topics. | Not applicable. | Not applicable. | Multi-parent with no loops. "Most specific only, parents roll up." A portal as a front page for a place or topic. | Using categories as tags. Wikipedia says do not. |
| **Kialo** | Not relevant. | A tree of claims. Not checked in this pass. | | | | Not used here. | |
| **OpenStreetMap** | Administrative boundaries with `admin_level`. For Indonesia: 2 country, 4 province, 5 kabupaten/kota, 6 kecamatan or distrik, 7 kelurahan, desa or kampung, 8 RW or dusun, 9 RT. | Level by number, not by parent. OSM warns that subnational boundaries can overlap, so data users should not assume a boundary is a subarea of only one parent. | Not applicable. | Not applicable. | Download or query by relation. | Use admin levels 4 to 7 as the place levels. Keep each place's OSM relation id. | Treating admin boundaries as the only truth. |
| **Wikidata** | Items for provinces, regencies and districts. Nabire regency has an Indonesian administrative code (91.04), OSM relation id, GeoNames id, capital, the 2022 law that moved it into Central Papua. | `located in the administrative territorial entity` (P131). It is transitive. You state only the most local parent. A separate property is for places that fall only partly in an entity. | Not applicable. | Not applicable. | Query the P131 tree under one root. | The chain, with dated statements and law citations. Codes and cross-ids per place. | Customary regions are not administrative entities, so P131 cannot hold them. |
| **Native Land Digital** | Maps territories, languages and treaties. Overlaps are deliberate. | None. Overlapping shapes. | Layers: territories, languages, treaties. | Search by place name or address. | Not applicable. | Overlap is allowed. "Not official sources" is stated on every page. Corrections invited from communities. Territories, languages and treaties are separate layers. | Showing one shape per people. |
| **Mukurtu and Local Contexts** | A site has communities. Place is not the organiser. | **Communities and sub-communities** by drag and drop. Each keeps its own protocols and members. Only top-level communities show on the home page. Each protocol belongs to one or more communities. | Taxonomies the site defines, including **community types** (library, family, tribe). | A new community prompts creating its first protocol. Every item must carry at least one protocol. | Site admin defines communities and types first. | Community type is a taxonomy value on the community, not a page. Items always say who may see them. TK Labels in three groups (provenance, protocol, permission) set by the community. | Putting protocol labels on anything but the community's own say. |
| **Ushahidi** | Location is a field on a report. A map is the home page. | Categories can have parent and child. A developer issue calls the model confusing. | Categories as survey fields. | Not applicable. | A deployment starts with **no** categories. The admin builds surveys, then categories. | A map as the front door of a deployment. | Starting empty. A first deployment needs a seed. |

### 1.2 Short notes

- **Nobody solves place plus topic plus group at once.** Lemmy, PieFed, Mastodon and Reddit have no place tree. Nextdoor has a place tree and nothing else. Wikipedia has multi-parent categories and no people. ETNOS can join them.
- **PieFed is the closest software.** Admin topics (tree) plus user feeds (bundles) is the right pair. Our pair is Tempat/Topik/Bahasa (tree) plus Paket mulai (bundle).
- **Discourse is the best advice on depth.** Two levels. Use tags for the rest. Our topics follow that.
- **Wikipedia is the best advice on multi-parent.** A node may have several parents. Items go in the most specific place. Parents roll up. No loops. The code already does this.
- **OSM and Wikidata give us a free skeleton**, with codes. The skeleton is administrative. Customary regions are not in it. That layer stays ours, sourced from planning documents, and says so.
- **Native Land Digital and Mukurtu give the ethic**: overlaps are allowed, the map is not the last word, and the community's own rules control its material. Our "wilayah acuan, bukan batas tanah adat" line is the same idea.
- **Nextdoor shows what not to copy.** Verified address is how they place people. We must not. A place chosen at signup is a feed preference only (direction doc, line 416).
- **Starter packs and Mastodon recommendations show the best first-run trick**: someone local hands you a bundle. For us, a steward or an Aksara per region hands you the bundle.

## 2. Proposed model

### 2.1 Separate axes

Proposal. Four things people call "labels" are really four different things. Split them.

| Thing | What it is | Where it lives | Has a page? | Example |
| --- | --- | --- | --- | --- |
| **Place** | Somewhere on earth | Its own tree | Yes: Tempat | Nabire |
| **Language** | A language, by family | Its own tree (Glottolog) | Yes: Bahasa | Mee |
| **Topic** | What is talked about | Its own tree, two levels | Yes: Topik | Hutan & tanah |
| **Community kind** | How people gather | A field on each community | **No.** A filter chip on Komunitas | Forum musyawarah |
| **Institution kind** | What sort of body | A field on each organisation | **No.** A filter chip on Organisasi | Gereja |
| **Page or post kind** | Cerita, Kabar, Sejarah, Kata, Tanya | A field on the record | No. A tab or filter | Cerita |

Rules:

1. A label never goes on a person. Unchanged.
2. A community says where, in what language and about what by pointing at places, languages and topics. It says how people gather with one `kind` field.
3. A page about two axes together (Nabire plus Tradisi lisan) is a filter, not a new label. Unchanged from the direction doc.
4. Cultural domains (the ten objects in UU 5/2017) stay as a second topic scheme beside "Hidup bersama, Pengetahuan, Budaya & hiburan". The knowledge-map design says keep every scheme side by side. A topic belongs to one scheme per tree.

### 2.2 The place tree

Proposal.

```
Tanah Papua                          (root, level 0)
└── Wilayah adat      (7)            reference region, level 1
    └── Kabupaten / Kota  (42+)      level 2
        └── Distrik       (hundreds) level 3
            └── Kampung   (thousands) level 4
```

Provinces (6) are not a rung. They are a second, administrative parent of each regency (see 2.3). Reason: the owner's spine is region, regency, district, kampung. Government questions still need the province, so it stays one tap away as a chip.

| Level | Our name | OSM `admin_level` | Source of names and codes | Boundary available? | Shown in browse? |
| --- | --- | --- | --- | --- | --- |
| 0 | Tanah Papua | 2 (Indonesia) plus Papua New Guinea if wanted later | Ours | Bounds box | Yes |
| 1 | Wilayah adat | none | Planning documents (Bappenas RPJMN, RIPPP), carried in the catalogue | Union of regency outlines. A reference, drawn hatched | Yes |
| (admin) | Provinsi | 4 | Kemendagri code, Wikidata, OSM | Yes | As a chip and filter |
| 2 | Kabupaten / Kota | 5 | Same | Yes (BIG, simplified, licence not stated) | Yes |
| 3 | Distrik | 6 | Kemendagri 6-digit code, Wikidata | Partly. To verify | Only when it has content or a steward turns it on |
| 4 | Kampung / Desa / Kelurahan | 7 | Kemendagri 10-digit code (digit 5 of the village part separates kelurahan, desa and desa adat) | Mostly points. To verify | Only on demand |

Also keep, at any level: a Wikidata id, an OSM relation id, a Kemendagri code and a BPS code where they exist. BPS and Kemendagri publish a mapping between their codes.

Display rule, unchanged and now on every region page: **"Wilayah acuan, bukan batas tanah adat."** The catalogue already carries it. Native Land Digital's "not official sources" line is the model.

Kampung and distrik are not all loaded into the browse tree. They exist so people can pick them in a search box. A node appears in the directory only when a community, a page or a post uses it, or a steward switches it on. This keeps forty-two regency pages from becoming a forest of empty ones (the sitemap doc made the same point about empty rooms). It also keeps the directory under the current 1,000-row list limit.

### 2.3 Two kinds of parent, and a regency in more than one region

Today a parent is just a parent. Proposal: give each place edge a `relation` and a `share`.

| Edge | Meaning | Count per child | Example | Source |
| --- | --- | --- | --- | --- |
| `within` (administrative) | The law puts it there | Exactly one | Nabire within Papua Tengah | Kemendagri code, Wikidata P131, OSM. Dated and cited |
| `reference` (wilayah acuan) | A planning region it is counted in | One to three. Zero for distrik and kampung (they inherit) | Nabire in Mee Pago | Planning documents, quoted |

For a reference edge also record `share`: `whole` or `part`, and a one-line note with the source. This mirrors Wikidata's split between "located in" and "falls only partly in". Customary and planning regions are not administrative entities, so they cannot ride on P131. They are our own layer.

How a regency can belong to more than one region (the Nabire case):

- It has two `reference` edges. One is marked `primary`. The primary decides the default breadcrumb and the colour on the map.
- Each region page lists it. Nabire page shows "Juga di: Saireri".
- Roll-ups count by record id, not by path. A post under Nabire counts once on Tanah Papua, once on each region, once on the province. Nothing is added up twice.
- The map hatches a regency that is in two regions. It never picks one silently.
- A steward cannot add a reference edge without a source line. This is how a regency gets a second region.
- Open: confirm with the owner whether Nabire is in both lists and by what source. The direction doc says so. The catalogue does not.

Multi-parent rules for all axes:

| Axis | Parents allowed | Depth | Notes |
| --- | --- | --- | --- |
| Place | One `within`, up to three `reference` | 5 (root to kampung) | No loops. Roll-up de-duplicates |
| Language | One (family), from Glottolog | Family, language, optional dialect | Languages are never nested under places. A language is linked to places by "dituturkan di" with a reference point (see below) |
| Topic | One by default. A second only across two top groups, and only when a steward gives a reason | **Two levels at most** (group, topic) per scheme | Matches Discourse's advice. Three levels need a vote. Today 23 plain topics fit |

Language to place: "dituturkan di" is a many-to-many link, shown as "Bahasa yang dituturkan di sini" on a place page. It uses Glottolog's point and the countries list and says nothing about boundaries. The catalogue already refuses to draw language areas for the same reason.

### 2.4 Where things attach

| Thing | Place | Language | Topic | Kind | Notes |
| --- | --- | --- | --- | --- | --- |
| **Community** | Up to 3, one is primary. Lowest level that fits | Up to 2 | Up to 3 | Exactly one `kind` (field) | Appears on every ancestor of its places. Hidden communities carry none (unchanged) |
| **Organisation** | Up to 3 | Up to 2 | Up to 3 | One institution kind (field) | Unchanged otherwise |
| **Wiki page** | One or more "about" places | Optional | Up to 3 | Page kind later (orang, peristiwa, tempat, praktik, karya, lembaga) | A page still lives in a community. Place is what the page is about, not where it was written |
| **Post** | Inherits its community's primary place. Author may add one | Inherits | Inherits, may add | Post kind (Kabar, Cerita, Tanya) | Public communities only (unchanged) |
| **News story** | Places the story names | Optional | Optional | Kabar | From the news module |
| **Person** | Never | Private preference only | Private preference only | Never | Onboarding choices are preferences |

The 10-label cap per record becomes: 3 places, 2 languages, 3 topics, plus the single kind. Total is lower and each part is clearer.

### 2.5 What each page shows

| Page | Route (proposed) | Header | Sections, in order | Map |
| --- | --- | --- | --- | --- |
| **Place** | `/tempat/:slug` | Breadcrumb, name, level word, "Wilayah acuan, bukan batas tanah adat" on a region, province chip, other-region chip | 1. Sekarang di sini: recent posts. 2. Komunitas here (with "Mulai komunitas di sini"). 3. Wiki: pages about it, with the folded knowledge band filtered to it. 4. Kabar. 5. Bahasa dituturkan di sini. 6. Topik yang dibicarakan di sini. 7. Tempat di bawahnya (children). 8. Kerja publik. 9. Aksara for the region | Scope = this place, children drawn as outlines or points |
| **Language** | `/bahasa/:slug` | Name, family, ISO and Glottocode, status shown with care | 1. Ruang bahasa and learning communities. 2. Wiki (Kata, Cerita). 3. Dictionary link. 4. "Dituturkan di" list and one reference point. 5. Posts | A single point, not an area |
| **Topic** | `/topik/:slug` | Name, parent group, child chips | 1. Wiki. 2. Communities. 3. Posts. 4. "Di mana": top places for this topic. A filter "Semua tempat / pilih tempat" | Small shaded map optional, scope = whole site, shaded by count |
| **Community** | `/communities/:id` (unchanged) | Kind badge, place chips, topic chips, language chips, admission | Discussion, wiki, media, voices, offers, about | None by default. A mini map only if it has a primary place |
| **Kind** | none | none | A filter chip on Komunitas and Organisasi | none |
| **Region** | the Place page at level 1 | As Place, with the caveat shown above the fold | As Place, plus the region's Aksara and its seed pages | Scope = the region |

A topic page is **not** nested under a place. "Hutan & tanah in Paniai" is `/topik/hutan-tanah?tempat=paniai`, a filter. The filter chip row is the same on every page: Tempat, Topik, Bahasa.

## 3. Navigation

### 3.1 Tempat becomes a sidebar item

Proposal: yes. Places come first because people start from where they are.

| Today | Proposed |
| --- | --- |
| Beranda, Jelajah, Komunitas, Wiki, Kerja publik | Beranda, **Tempat**, Komunitas, Wiki, Jelajah. Kerja publik moves under Jelajah on phones |

Reasons: "Tempat & bahasa" is two clicks deep under Jelajah. It is the one entry that every community, page and topic hangs from. Nextdoor and Reddit make local the first screen. On a phone, five items fit in a bottom bar.

How the four fit together:

| Door | Question it answers | Browsed by |
| --- | --- | --- |
| **Tempat** | Where? What is here? | The place tree, with a map |
| **Komunitas** | Who talks? Which rooms can I join? | Filter chips: Tempat, Jenis, Topik, Bahasa |
| **Wiki** | What is known? | The knowledge map and band, then lists. Filter chips: Tempat, Topik, Bahasa |
| **Jelajah** | What else is going on? | News, offers, voices, organisations, public work, plus two directories: Topik and Bahasa |

One sentence for the interface: *Tempat is where you are. Wiki is what is known. Komunitas is who talks. They meet on the place page.*

Language and topic directories live in Jelajah, because few people start from them. They keep their own pages and routes. The language directory is a searchable list grouped by family. It must not be a 256-item scroll.

### 3.2 One map, a scope

Proposal. One map component with a `scope` prop.

| Where | Scope | What is drawn |
| --- | --- | --- |
| Wiki home | whole site | Seven regions, zoom to regencies. Dots or hatching from the knowledge items. The existing folded time band sits under it, as designed |
| Jelajah | whole site | Same, reduced |
| Tempat index | whole site | Same, with place search first |
| A place page | that place | Its children as outlines (or points when no boundary), the place itself as a frame. The band filtered to the place |
| A topic page | whole site | Optional shading by count |
| News | whole site or the story's places | Stories as points |

The knowledge-map design already puts "Tempat" as one lens and says the place page shows the same band filtered to its place ("Buka inti lapisan"). So the "core sample" on context pages and the map on the wiki home are one component with different scope and lens, not two features. Today there are separate `PlaceMap`, the region stack, `CoreSample`, `KnowledgeMap` and `NewsMap` components. Work out which can merge. I have not compared their code line by line.

Map rules: list fallback for every view (phones, screen readers); regions drawn hatched with the caveat; kampung are points, never invented outlines; no living person is ever a dot.

### 3.3 Breadcrumbs

| Page | Breadcrumb |
| --- | --- |
| Place | Tanah Papua › Mee Pago › Nabire. Province as a chip: "Papua Tengah". Second region as a chip: "Juga di Saireri" |
| Kampung | Tanah Papua › Mee Pago › Nabire › Distrik X › Kampung Y |
| Wiki page | Wiki › Nabire (primary about-place path) › Page title |
| Community | Komunitas › Nabire (primary place) › Community name. Kind as a badge, not a crumb |
| Topic | Topik › Hutan & tanah (group) › topic |
| Language | Bahasa › Family › Language |
| Post | The community's breadcrumb, then the thread |

A breadcrumb always follows the **primary** path. Other paths show as chips.

## 4. First-time user

Proposal. Optional, short, no inference.

### 4.1 What the research says to do

- Reddit: pick interests, then communities. Skip the personal questions.
- PieFed: show the topic tree during onboarding.
- Mastodon: an admin-curated list always shown first, plus a pool by language.
- Bluesky: a bundle you join in one tap, from someone you trust.
- Lemmy: do not land people on an empty "Subscribed" view.
- Nextdoor: do not verify addresses. Do not ask for real names.

### 4.2 Flow

Shown once after the first sign-in. Four cards, each skippable, all editable later in Preferences. Total under a minute.

| Step | Title (Indonesian) | What it asks | Rules |
| --- | --- | --- | --- |
| 1 | Dekat mana? | Search a place at any level. Up to 3. Chips for the seven regions as a fallback | No GPS. No IP lookup. "Lewati" is the same size as "Lanjut". Text: "Ini hanya untuk mengatur berandamu. Bukan bukti tempat tinggal." |
| 2 | Bahasa | Languages you use or want to learn. Up to 5. Search with family grouping | Optional and private unless you choose to show it. No ethnicity (direction doc lines 49 and 374) |
| 3 | Minat | Topics as chips under their groups (Hidup bersama, Pengetahuan, Budaya & hiburan, Ranah budaya). Up to 5 | Two levels only |
| 4 | Mulai | Shows a bundle built from steps 1 to 3: three open rooms, two wiki pages to read, one question box, the region's Aksara to follow. Nothing is joined until the person taps | "Gabung semua" and single-item toggles, like a starter pack |

What is stored: three private lists on the account (places, languages, topics) as feed preferences. They are never shown on the profile unless the person says so. They are never used to prove who someone is or where they live.

Arriving by a shared bundle link or QR (Bluesky style): steps 1 to 3 are pre-filled from the bundle and still editable.

### 4.3 What they see after

| Place on the page | Content |
| --- | --- |
| Beranda | Tabs: **Untuk kamu** (posts carrying their places, below or above them, their topics, their languages) and **Semua**. If they skipped everything, only **Semua**. Never an empty tab |
| A card "Mulai di sini" | Until dismissed: their place page, three rooms, two pages, "Tanya sesuatu" |
| Empty states | Each says what to do: "Belum ada komunitas di Nabire. Mulai satu" |
| Preferences | The three lists, editable, with a plain sentence on what they do |

"Above them" means a person who picks Nabire also sees posts from its region's Aksara and Tanah Papua level, because roll-up goes up as well as down for feeds. Posts at kampung level under Nabire show too. Weight posts by closeness; that is a ranking question for later.

Nothing is inferred. If a person never picks a place, we never guess one.

## 5. First deployment: Aksara sets up a new community

Context: the knowledge-organisation doc says "Aksara can't yet draft a catalogue. The loader, the idempotent import and the 'never rewrite what a steward edited' rule exist." This section is the plan to close that gap. The direction doc fixes the agent split (one Aksara per customary region, one for the site) and says an agent switch is one switch per community.

### 5.1 Principles

1. Aksara drafts. A human confirms each step. Nothing loads without a click.
2. Every entry carries its source. A draft with no source line is rejected.
3. Open data first. Where open data has no answer (customary regions), Aksara reads the documents the steward names and quotes them.
4. The loader stays idempotent. It adds what is missing, never rewrites what a steward edited. A load can be undone because retired contexts stay retired.
5. Until steps 1 to 4 are confirmed, the site is in "setup" mode: not indexed, no agent posts.

### 5.2 Steps

| Step | Aksara does | Human confirms | Output |
| --- | --- | --- | --- |
| 0. Frame | Reads the operator's answers: region name, countries, bounds, interface languages, the top place | Operator types them. Aksara does not guess | Root place and bounds |
| 1. Places | Pulls the administrative tree under the root from **Wikidata** (P131 chain, administrative code, OSM relation id), checks it against **OSM** relations at admin levels 4 to 7 and against the **Kemendagri code file** (the latest decree that Wikidata cites is Kepmendagri 300.2.2-2138 of 2025; check for a newer one on load) and the **BPS code mapping**. Lists every disagreement (a name, a parent, a missing item) with the three sources side by side | Picks the right answer for each disagreement. Confirms provinces, then regencies | Place tree to level 3, with codes and ids. Distrik and kampung loaded as "search only", not shown in browse |
| 1b. Reference regions | Reads the planning documents the steward names (for Papua: RPJMN 2020 to 2024 narrative and RIPPP 2022 to 2041) and drafts which regencies belong to which region, quoting the line. Marks any regency with two or no region | A person from the area checks each region, especially overlaps like Nabire | `reference` edges with `share` and source. The caveat text is attached to every region |
| 2. Languages | Reads **Glottolog 5.4** (CLDF, CC BY 4.0): selects languages whose point is inside the bounds or whose country list matches. Keeps the family tree. Notes endangerment status without a headline label | Removes outliers, adds missing, confirms the list. For each language a local person may rename the display name | Language axis with family nodes, Glottocode, ISO code, point. Link to places "dituturkan di" only where a source says so |
| 3. Topics | Copies the template topic set (Hidup bersama, Pengetahuan, Budaya & hiburan; cultural domains) and proposes local renames and any missing topic, with an example sentence for each. Enforces two levels | Edits names, accepts or drops each | Topic axis, two levels |
| 4. Rooms | Proposes one open room per top-level region (seven for Papua), sitewide rooms with open admission for the first two, and the community kinds from the template (admission defaults) | Edits descriptions, names the local moderators | Rooms and kinds. Not one room per regency |
| 5. Wiki stubs | For each region and regency writes a short page: capital, code, source, the law that formed it (from Wikidata). For each language a stub from Glottolog. All marked "ditulis Aksara, belum ditinjau" and live at once (owner decision: wiki pages go live before review) | Reads them later. Review marks them "ditinjau" | A page per place down to regency, a page per language. No kampung stubs |
| 6. Agents | Prepares the agent switch per region with a daily limit that starts low (two posts per place per day, from the direction doc) | A steward flips the switch. Agent starts after step 4 is confirmed | One Aksara per region, one for the site |
| 7. Handover | Lists the rooms that still run by the node steward and who has said they will take over | Two active members accept (the sitemap doc's rule) | Local moderators |

Boundary data (outlines) is a separate sub-step with its own licence note. For Papua the catalogue says the BIG outlines carry no stated licence and the owner has an open question about redrawing from Natural Earth and OSM. Default for a new deployment: OSM (ODbL, from memory, check) with credit. Wikidata data is CC0 (from memory, check).

### 5.3 What the operator sees in Studio

A "Mulai dari awal" page (Proposal), a vertical rail of the steps above.

| Part of the screen | What it shows |
| --- | --- |
| Rail | Step name, state (Draft, Perlu kamu, Dikonfirmasi, Dimuat), counts ("42 kabupaten, 3 beda sumber") |
| Step page | A table of entries. Columns: name, level, parent, codes, source chips, confidence note. Buttons: Terima, Ubah, Tolak, Terima semua yang cocok |
| Conflicts list | Only the rows where sources disagree, one line each, three answers side by side |
| Diff view | What will change on load: added, unchanged, will retire |
| Receipts | Who accepted what and when. Every Aksara action has a receipt (same discipline as clustering and decisions) |
| Credits | A generated list of sources, licences and the required credit lines |
| Gate | "Buka situs" is disabled until steps 1 to 4 are confirmed |
| Undo | Retire what a step loaded. Content that referenced it is kept (loader rule) |
| Budget | Tokens used so far and the daily cap |

Not in scope for this proposal: two Studios (operator and organisation). The direction doc says operator Studio comes first, and this page is the operator Studio.

### 5.4 Risks of first deployment

- **Wikidata and OSM drift.** Papua's boundaries changed in 2022 (laws 14, 15 and 16 of 2022 created three provinces; the Kemendagri changelog shows code changes such as Nabire from 91.04 to 94.01). Always record the date and the decree. Refuse to mix versions.
- **Aksara reads a planning document wrongly.** Hence the quotation rule and a local reviewer for step 1b.
- **Too many empty places.** Hence "search only" for distrik and kampung and no stubs below regency.
- **A small model drafting a long tree.** Do places and languages from files with code, not from the model. The model only explains disagreements and drafts text.
- **Setup mode becoming permanent.** Show the operator the three numbers that matter: places confirmed, rooms open, first posts live.

## 6. Migration from the current contexts

Proposal. Order matters: add before you remove.

### 6.1 Mapping

| Today | Becomes | How |
| --- | --- | --- |
| `kind: region`, facet `customary-region` (7) | Place, level 1 (Wilayah adat) | Add `axis = place`, `level = 1`. Keep ids and slugs. Agents' standing labels stay valid |
| `kind: region`, facet `province` (6) | Place, administrative level (Provinsi), a chip, not a rung | Keep ids. Mark edges to them `within` |
| `kind: place`, facets `regency` and `city` (42) | Place, level 2 | Classify each existing parent edge by the parent's facet: province becomes `within`, region becomes `reference` (`share = whole`, first one `primary`) |
| `kind: language` (256) | Language axis | Add `axis = language`. Later add family nodes from Glottolog and set parents |
| `kind: topic`, facets none, `topic-group`, `cultural-domain` (35) | Topic axis, two schemes | Add `scheme`. Check every entry is within two levels (today: yes) |
| `kind: topic`, facet `community-kind` (12) | **A `kind` field on communities** | Backfill `kind` from existing `community_contexts` rows that point at these entries. Then retire the 12 contexts. The form already asks "Komunitas seperti apa?", so the UI mostly exists |
| `kind: topic`, facet `institution-kind` (8) | **A `kind` field on organisations** | Backfill from `record_contexts` where `record_kind = 'group'`. Then retire |
| `/contexts`, `/contexts/:slug` (38 references in the web app) | `/tempat`, `/bahasa`, `/topik` | Keep `/contexts/:slug` as a redirect that looks up the axis. Old shared links keep working |
| Catalogue JSON | Version 2 | Add `axis`, `level`, `relation`, `share`, `codes` (kemendagri, bps, wikidata, osm), `scheme`, `communityKinds` stays. Keep v1 loadable |

Suggested sequence, each step shippable alone:

1. **Add columns, change nothing visible.** `axis`, `level`, `scheme` on contexts; `relation`, `share` on context parents; `kind` on communities and groups. Fill them from facets. Add tests that the inherited counts do not change.
2. **Backfill kinds.** Copy community-kind and institution-kind labels into the new fields. Show the kind as a badge and a filter chip on Komunitas and Organisasi. Keep the old pages live.
3. **Add the Tempat door and place page** on the new routes, with redirects from `/contexts`. Move the map in as the one component with scope.
4. **Add Topik and Bahasa directories** under Jelajah.
5. **Retire the community-kind and institution-kind contexts.** Redirect their old slugs to the filtered Komunitas or Organisasi list.
6. **Onboarding.** After the new places exist.
7. **Catalogue v2 and the Studio setup page.** After the shape is stable.

### 6.2 Risks

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Inherited counts and the hatching on the map change | The map hatches places with a reviewed page, a public community or a public organisation. Re-classifying edges could drop or double rows | Tests first: assert that counts per place before and after backfill are equal. Roll-up by record id |
| Communities lose their kind label | They carry a kind as a context today | Backfill before retiring. Keep retired rows. The loader never revives retired contexts, so do not re-run an old catalogue after retiring |
| Region membership is incomplete | La Pago and Domberai list only eight members. Nabire's second region is missing | Treat step 1b as part of the migration, with a local reviewer. Show "belum lengkap" on those pages until fixed |
| Old links break | 38 places in the web app and links shared on WhatsApp | Redirects from `/contexts/:slug`. No lexicon uses contexts, so no AT record changes |
| Directory limits | The list endpoint caps at 1,000 rows and the parent list at 5,000. Seeding distrik and kampung exceeds both | Page the endpoint and add a place search endpoint before loading anything below regency. Use a closure table or cache of ancestors if the recursive query gets slow |
| Agents' standing labels | Each regional Aksara carries one region label | Keep region ids and slugs. Test that an agent post still shows on region and regency pages |
| Wrong second parent | A regency in two regions is a claim about people | Require a source line and a reviewer. Never infer. The caveat text stays |
| A topic with two parents breaks "two levels" | `bahasa` and `musik-seni` have parents in two schemes | Allowed across schemes. Add a check that depth inside each scheme is at most two |
| Place picked at onboarding read as residence | Safety | Wording, storage as private preference, never shown, never used for access |
| Over-building | The showcase is 4 to 5 December | Do steps 1 to 3 of the sequence only. The model, redirects and the Tempat door are visible; the rest can wait |

### 6.3 Open questions for the owner

1. **Nabire** in one region or two, and on whose source?
2. **Provinces**: a chip beside the region (proposed) or a second tree under Tanah Papua?
3. **Kampung**: free text under a regency (the sitemap doc's proposal) or real nodes seeded from the Kemendagri codes and shown only on demand (this document)?
4. **Perantauan** (people outside Papua): add a root "Di luar Papua" with a few cities?
5. **Topic third level**: never, or by vote?
6. **Place in onboarding**: the first card, or after language? (Proposed: first.)
7. **Outlines**: keep BIG with credit, or redraw from OSM?

## Sources

All fetched 16 November 2026 unless noted.

Repository (read 16 November 2026):

- `docs/plan/direction-2026-11-16.md`, sections "Aksara by place", "Studio, news sources and the knowledge map", "Labels, places and groups", and lines 49, 374, 416 on onboarding.
- `docs/knowledge/knowledge-organisation-2026-11-15.md`, `docs/product/sitemap-and-communities-2026-11-15.md`, `docs/knowledge/knowledge-map-design-2026-11-16.md`, `docs/product/post-first-design-2026-11-11.md`.
- `src/catalogue.ts`, `src/catalogues/tanah-papua.json`, `src/groups.ts`, `apps/web/src/context-tree.ts`, `apps/web/src/App.svelte`.

Platforms and standards:

- Lemmy, Getting Started: https://join-lemmy.org/docs/users/01-getting-started.html
- Lemmy issue 2195, default view for new users: https://github.com/LemmyNet/lemmy/issues/2195
- Lemmy issue 5771, default multi-community for new instances (2025-06-11): https://github.com/LemmyNet/lemmy/issues/5771
- Lemmy `enums.rs` (listing types, registration modes): https://github.com/LemmyNet/lemmy/blob/main/crates/db_schema_file/src/enums.rs
- PieFed user guide (Topics): https://join.piefed.social/docs/user-guide/
- PieFed, how feeds federate (2025-04-30): https://join.piefed.social/2025/04/30/how-piefed-federates-feeds-aka-multi-reddits-or-multi-comms/
- PieFed admin guide (topics import, onboarding): https://join.piefed.social/docs/admin-guide/
- PieFed discoverability wiki (topics vs feeds): https://piefed.social/community/fediverse/wiki/piefed-discoverability
- PieFed API, topics and feeds endpoints (2025-07-29): https://piefed.social/post/1088682
- Mastodon, setting up your instance: https://docs.joinmastodon.org/admin/setup/
- Mastodon, discoverability (profile directory, featured hashtags): https://docs.joinmastodon.org/user/discoverability/
- Fedi.Tips, follow recommendations for new users: https://fedi.tips/recommending-accounts-to-follow-for-new-users-on-your-mastodon-server/
- Bluesky, Introducing Starter Packs (2024-06-26): https://www.bsky.social/about/blog/06-26-2024-starter-packs
- Balduf et al., Bootstrapping social networks: lessons from Bluesky starter packs (ICWSM): https://ojs.aaai.org/index.php/ICWSM/article/download/35810/37964/39878
- Reddit Mods help, community settings (location): https://mods.reddithelp.com/hc/en-us/articles/360022692051-Community-settings
- Reddit Help, sign up: https://support.reddithelp.com/hc/en-us/articles/360060420092-How-do-I-sign-up-for-a-Reddit-account
- Android Police, creating a Reddit profile (2022-09-17): https://www.androidpolice.com/how-to-create-a-reddit-profile/
- Discourse Meta, hidden settings (`max_category_nesting`, 2024-06-04): https://meta.discourse.org/t/hidden-settings-on-discourse-hosted-sites/310574
- Discourse Meta, sub-subcategories (2024-11-04): https://meta.discourse.org/t/sub-subcategories/177913
- Discourse Meta, subcategory under a subcategory: https://meta.discourse.org/t/creating-subcategory-under-a-subcategory/352040
- Discourse categories and tags (DeepWiki): https://deepwiki.com/discourse/discourse/5.4-categories-and-tags
- Nextdoor for Public Agencies (training manual, 2022-04-06): https://business.nextdoor.com/en-us/public-agency/resources/best-practices/nextdoor-for-public-agencies-training-manual
- Nextdoor for Public Agencies page: https://about.nextdoor.com/public-agency
- Nextdoor, how to modify your service area: https://nextdoorcrm.my.site.com/s/article/How-to-modify-your-service-area?language=en_GB
- Nextdoor declaration on address verification (court exhibit, 2024): https://ccianet.org/wp-content/uploads/2024/07/HB18-PI-Ex-5-Nextdoor-Pai.pdf
- Facebook group settings (location, tags, types), third-party guides, so low confidence: https://groupboss.io/blog/how-to-create-facebook-group/ and https://www.socialmediaexaminer.com/facebook-groups-8-management-tools/. I did not reach Facebook's own help pages.
- Wikipedia, Categorization: https://en.wikipedia.org/wiki/Wikipedia:Categorization
- Wikipedia, Portal guidelines: https://en.wikipedia.org/wiki/Wikipedia:Portal/Guidelines
- Wikipedia, categorizing portals (geography): https://en.wikipedia.org/wiki/Wikipedia:Portal_guidelines/Categorizing
- Kialo: not fetched. Left out of the proposal.
- OpenStreetMap wiki, `boundary=administrative` (including the Indonesia row): https://wiki.openstreetmap.org/wiki/Tag:boundary%3Dadministrative
- OpenStreetMap wiki, Indonesian Tagging Guidelines: https://wiki.openstreetmap.org/wiki/Indonesian_Tagging_Guidelines
- Wikidata P131: https://www.wikidata.org/wiki/Property:P131
- Wikidata, Nabire regency (Q27708): https://www.wikidata.org/wiki/Q27708
- Wikidata, Central Papua (Q12486766): https://www.wikidata.org/wiki/Q12486766
- Permendagri 58/2021 on codes (digit structure): https://peraturan.bpk.go.id/Download/190092/Permendagri%20Nomor%2058%20Tahun%202021.pdf
- BPS SIG, code bridging with Kemendagri: https://sig.bps.go.id/bridging-kode/index
- Region code change log, laws 14, 15, 16 of 2022: https://kode-wilayah-dan-pos.pages.dev/changelog (third-party; check against the decree)
- Kemendagri code datasets, third-party mirror (latest decree 300.2.2-2430 of 2025): https://cahyadsn.github.io/wilayah/
- Glottolog download page (release 5.4): https://glottolog.org/download
- Glottolog CLDF 5.4 (licence CC BY 4.0, columns): https://github.com/glottolog/glottolog-cldf
- Native Land Digital, overview and limits (third-party summary, 2021-02-04): https://www.thinkinghumanity.com/2021/02/interactive-map-shows-on-which-part-of-indegenous-land-you-are-currently-living.html. Native Land's own pages state "NLD maps are not official sources": https://native-land.ca/auth/login
- Mukurtu, communities and cultural protocols: https://docs.mukurtu.org/communities-cultural-protocols-categories/
- Mukurtu, community organization (sub-communities): https://docs.mukurtu.org/communities-cultural-protocols-categories/ManageCommunityOrganization/
- Mukurtu, create a community and first protocol: https://docs.mukurtu.org/communities-cultural-protocols-categories/CreateACommunityAndInitialCulturalProtocol/
- Mukurtu about: https://mukurtu.org/about/
- Local Contexts, TK Labels: https://localcontexts.org/labels/traditional-knowledge-labels/
- Ushahidi manual, categories: https://docs.ushahidi.com/platform-user-manual/3.-configuring-your-deployment/3.5-categories
- Ushahidi manual, surveys: https://docs.ushahidi.com/platform-user-manual/3.-configuring-your-deployment/3.3-surveys
- Ushahidi platform issue 1879, parent/child categories: https://github.com/ushahidi/platform/issues/1879

Not verified in this pass: OSM (ODbL) and Wikidata (CC0) licence wording; number of distrik and kampung in Papua; whether OSM or BIG has village boundaries for Papua; Native Land's current API terms; Facebook's own help pages.
