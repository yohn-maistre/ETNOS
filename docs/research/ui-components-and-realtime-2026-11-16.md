# UI components, motion, live cursors, map rendering and reference products

16 November 2026. Research for the knowledge map explorer in `knowledge-map-design-2026-11-16.md`. Every version, star count and price below was read from the linked primary page on 16 November 2026 unless marked **unverified**. Star counts and download counts drift. Section 9 lists what could not be confirmed.

Short names used: "the band" is the folded time band, "the explorer" is the unfolded map with lenses, "the panel" is the reading panel, "paths" are the Jalur guided paths.

## 1. Recommendation up front

**Adopt (or keep)**

- **shadcn-svelte + Bits UI** stays the base. It is MIT, Svelte 5 and Tailwind 4, and the project changelog shows work in October 2026 [S1, S2]. Add these components as needed: `popover`, `command`, `carousel`, `chart`, `empty`, `spinner`, `kbd`, `item`, and the new `trace` (a list of agent steps) [S1].
- **Svelte's own motion** (`Spring`, `Tween`, `prefersReducedMotion`, `animate:flip`, `crossfade`) for almost all small interactions [S6, S7]. No new dependency.
- **View Transitions API** for big layout changes (band unfolds into explorer, lens switch, panel open). Same-document transitions are supported in Chrome, Safari and Firefox 144+ [S9, S10].
- **PartyServer** (Cloudflare, ISC licence) on a Durable Object for live cursors, or a plain hibernating Durable Object if you want zero dependencies [S11, S12, S13]. Not Liveblocks, Jazz, InstantDB, Convex or Supabase.
- **regl-scatterplot** (MIT) for the Makna/Waktu/Suara point cloud, wrapped as a Svelte action. It animates points from one layout to the next, zooms to points and does lasso selection, up to a claimed 20 million points [S20]. Keep Canvas 2D as the first build, as the design says; regl-scatterplot is the upgrade path.
- **svelte-maplibre-gl** (MIERUNE, MIT or Apache-2.0, Svelte 5 only) for the Tempat lens [S24].
- **Embla** through the shadcn-svelte carousel for "Untuk dibaca" [S1, S26].
- **A hand-built band** with `d3-scale` and `d3-shape` in SVG, or LayerCake (headless, runes since v11) if you want helpers [S25].

**Use with care**

- **Ding toasts** (`@yusufceng1z/ding-svelte`, already in `package.json`) are the "Ding" the owner means. They look right for one morphing status line. But the package is 11 days old at 0.0.x with one maintainer [S4, S5]. Wrap it behind our own `notify()` function so we can swap to `svelte-sonner` (stacking, 935k weekly downloads) in an hour [S8].
- **motion-sv** (Motion for Svelte 5, MIT, v0.2.2) only if we need shared-element layout animation or drag physics that Svelte cannot do. One maintainer, 2 dependents, layout animation needs a helper [S14].
- **embedding-atlas** `EmbeddingView` (Apple, MIT, v0.26.0, Svelte wrapper) as a fast prototype of the Makna lens. It is embeddable, but pre-1.0 and I could not confirm layout-to-layout transitions or the WebGPU fallback [S19].
- **cosmos.gl** or **sigma.js 4** for the Dasar graph lens if it grows past a few hundred nodes [S21, S23].

**Avoid**

- **vaul-svelte** for the springy drawer. The React original says it is unmaintained and the Svelte port's last release is a prerelease from March 2025 with open issues about Bits UI 2.x, which this repo uses [S15, S16]. shadcn-svelte's `drawer` is built on it [S3]. Use the existing `sheet` plus our own drag-to-dismiss with a `Spring`.
- **Liveblocks.** No Svelte package, free plan limited to 10 connections per room and branded, plus a vendor outside Cloudflare [S17, S18].
- **React Bits, Animate UI, Aceternity** as copy sources. React Bits and Animate UI use "MIT + Commons Clause", which forbids redistributing ported versions. Aceternity has its own licence that forbids redistributing the source [S27]. Our repo is AGPL and public. Take ideas, not code.
- **Flowbite-Svelte.** Skeleton's own docs say Flowbite Svelte clashes with its Tailwind setup, and a comparison says its Svelte 5 move was partial [S28, S29]. Not needed with shadcn-svelte.
- **Three.js / Threlte** for the main map. A 3D spinning view is striking (Marble does it) but it is harder on cheap phones and for screen readers [S22, S42]. Keep for a later "showcase" mode.

**What "arc ui" and "pin ui" are.** Both are React libraries with no Svelte version.
- *Arc UI* (uiarc.dev, by Elia Kuratli): React, CSS modules, `motion`, installed with the shadcn CLI. 121 components and 22 blocks are MIT; the rest is a paid Pro tier ($149 a year or $249 once) [S30]. It is the closest match to "arc ui" in my searches. Confirm with the owner.
- *Pin UI* (pinui.xyz, by Rachit Thakur, now under "Shadcn Labs"): animated React components rebuilt from Pinterest designs, MIT components, repo created 17 September 2026, 122 stars [S31]. Its "Presence Cards" and "Reader Card" are worth a look as visual references only.

## 2. Component libraries for Svelte 5

"Verified how" says what I read. "Svelte 5" means the package states support for Svelte 5.

| Name | What it is | Svelte 5 support (verified how) | Licence | Size / cost | Maturity | Fit for us |
|---|---|---|---|---|---|---|
| shadcn-svelte | Copy-in styled components on Bits UI, Tailwind 4 | Yes: docs say "All components are updated for Tailwind v4 and Svelte 5" [S2] | MIT | Free; 9.3k stars, 577 forks [S1b] | High. Changelog entry October 2026 (Trace, Code Block, AI Elements) [S1] | Base. Already in use |
| shadcn-svelte components we lack | `popover`, `command`, `carousel` (Embla), `chart` (LayerChart), `drawer` (vaul-svelte), `sonner` (svelte-sonner), `empty`, `spinner`, `kbd`, `item`, `trace` | Listed in docs index [S1] | MIT | Free | High, except drawer (see below) | Add what each screen needs |
| shadcn-svelte-extras | Extra components: chat, code, copy button, tree view, file drop zone, tags input, rename, terminal, window | Repo says it keeps compatibility with shadcn-svelte [S32]. Svelte 5 not stated in text I read | MIT | Free; 606 stars; install with jsrepo or shadcn CLI | Medium, active | Good for `tree-view`, `rename`, `tags-input` |
| Bits UI | Headless primitives under shadcn-svelte | Yes (README; repo pins 2.20.2) [S33] | MIT | Free | High | Already the base |
| Melt UI | Headless builders (`melt` package for Svelte 5) | Skeleton's Svelte 5 guide imports `melt/builders` [S34]. Svelte 4 and 5 per a third-party review [S35] | MIT per its listing; **unverified** at source | Free; about 4.2k stars (third party) | Medium | Only for a primitive Bits UI lacks |
| Skeleton v3 | Tailwind design system and components | Yes, v3 requires Svelte 5 and Tailwind 4 [S29] | MIT, **unverified** | Free | Medium | No. Would duplicate shadcn tokens |
| Flowbite-Svelte | Large Tailwind component set | "Partial" per a third-party comparison [S29b]. Skeleton says it clashes with Skeleton [S28] | MIT, **unverified** | Free | Medium | No |
| Svelte Magic UI / Svelte Animations (sv-animations.vercel.app) | Community port of Magic UI, Aceternity, Fancy components; 50+ in the Magic set | Yes: "Built with Svelte 5, Tailwind CSS V4 and Motion Svelte" [S36]. Changelog entries to 23 Aug 2026 | Old repo MIT, 1,233 stars [S37]. Licence of the new repo **unverified** | Free; needs `motion-sv` | Medium. One maintainer | Good source of ideas (`Arc Timeline`, `Motion Grid`); copy only after licence check |
| Aceternity UI Svelte | Unofficial port | Svelte Motion based; **unverified** for Svelte 5 [S38] | Unofficial; upstream licence is restrictive [S27] | Free | Unknown | No |
| TFE Svelte Templates | 133 Svelte 5 parts incl. `CardStack`, `MorphingDialog`, `Timeline` | Says "Svelte 5, runes" [S39] | **Unverified** | Free | Small, one author | Reference only |
| Magic UI (React) | Animated effects | React only | MIT [S27] | 22.8k stars | High | Not usable directly |
| Motion Primitives, Animate UI, Origin UI, React Bits | React animated sets | React only. No Svelte port found for any of them | MIT; MIT + Commons Clause for Animate UI and React Bits [S27] | Free | Varies | Ideas only. Origin UI has become "coss ui" (Cal.com, Base UI) per one review [S40] |
| Arc UI, Pin UI | See section 1 | React only | MIT free core / MIT | Arc Pro is paid | New | Ideas only |
| svelte-sonner | Port of Emil Kowalski's Sonner | Peer `svelte ^5` [S8] | MIT | 935k weekly downloads, v1.2.3 (2 Nov 2026) | High | Fallback toast |
| Ding (`@yusufceng1z/ding-svelte`) | One toast that morphs in place with springs | Svelte 5 only [S4, S5] | MIT | Zero dependencies; no CSS import; 624 stars on the repo | Very new: package created 5 Nov 2026, 1,017 weekly downloads, no dependents [S5] | Keep, behind a wrapper |
| vaul-svelte | Port of Emil Kowalski's Vaul drawer | Works on Svelte 5 but flagged "abandoned"; open issue "Support bits-ui 2.x" [S15, S16] | MIT | Free | Stale | Avoid |
| embla-carousel-svelte | Carousel action | Peer range includes Svelte 5 [S26] | MIT | v8.6.0, published a year ago | High | Via shadcn carousel |

**On "Ding's toasts".** I found one match: Ding by Yusuf Cengiz, "toasts with real spring physics", one toast at a time that morphs into the next message instead of stacking. It has React, Svelte 5, Vue 3 and plain JS builds, no styles to import, light/dark/system themes, optional sound, and says it respects `prefers-reduced-motion` [S4]. The repo is `YusufCeng1z/ding`, MIT [S4b]. I could not find any other "Ding". Sonner is a different thing: Emil Kowalski's stacking toast [S8]. The owner's phrase "Emil Kowalski's Sonner toasts and Ding toasts" fits these two.

**Drawer detail.** Emil's own Vaul README says "This repo is unmaintained" [S15]. vaul-svelte's last release is `1.0.0-next.7` on 24 March 2025 and an open issue calls it abandoned [S16]. The shadcn-svelte drawer page still says it is built on vaul-svelte [S3]. Bits UI has an open request for its own drawer from March 2026 [S16b]. A commenter on the Vaul issue reports Ark UI's drawer works for Svelte; I did not read Ark UI's docs, so that is **unverified** [S15b].

## 3. Motion and micro-interactions

### What to use for each job

| Job | Best current tool | Why | Reduced motion |
|---|---|---|---|
| Hover, press, small fades, list reorder | Tailwind classes + `tw-animate-css` (installed) + `animate:flip` + `transition:fade/fly` | No new code. `flip` is "First, Last, Invert, Play" [S7] | Gate with `motion-reduce:` classes or `prefersReducedMotion.current` |
| A value that follows a target (cursor, panel height, band thickness) | `Spring` and `Tween` classes from `svelte/motion` (since Svelte 5.8.0) [S6] | `spring.target = v`; read `spring.current`. `set(value, { instant: true })` snaps. `preserveMomentum` helps fling gestures | `prefersReducedMotion` exists since 5.7.0; use `{ instant: true } ` when it is true |
| Item moves between two lists (card to panel, dot to list row) | `crossfade` send/receive from `svelte/transition` [S7] | Built in | Replace with `fade` |
| Page or lens switch, band to explorer, panel open | `document.startViewTransition` in SvelteKit `onNavigate`, or call it directly for in-page state | Browser does the snapshot and morph. Supported in Chrome 111+, Safari 18+, Firefox 144+ (caniuse 93% global use) [S9, S10, S11b] | Add `@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) { animation: none } }` |
| Springy sheet/drawer | Existing `sheet` + pointer events + `Spring` for the drag offset | No dependency on an abandoned port | Snap with `instant` |
| Morphing toast | Ding (wrapped), or svelte-sonner | See above | Ding says it honours the setting [S4] |
| Shared-element morph inside a page, drag, gestures | `motion-sv` (Motion for Svelte 5) | Only if the above are not enough [S14] | Motion respects it through its own config; **unverified** in our setup |
| Thousands of points moving between layouts | GPU, not DOM: regl-scatterplot `draw(points, { transition: true })`, cosmos.gl default transitions, deck.gl layer prop transitions [S20, S21, S41] | DOM animation cannot move 20,000 things | Pass `transitionDuration: 0` |

SvelteKit has no special view-transition API. The docs say to call `document.startViewTransition` in `onNavigate` [S9]. There was a bug with `experimental.async`, fixed in Svelte 5.39.6 [S9b]. The repo is on Svelte 5.49.1, so it is past that.

### Notes on `motion-sv`

- It is a port of Motion (formerly Framer Motion) to Svelte 5: v0.2.2, MIT, peer `svelte ^5.40.0`, 17,765 weekly downloads, 2 dependents, one author [S14].
- Layout animations differ from React: Svelte has no "before update" hook, so you wrap elements in `createLayoutMotion()` and give it the state it depends on. `layoutId` shared layouts, `AnimatePresence` and `Reorder` work without it [S14].
- Motion+ components (Cursor, Carousel, Ticker) are not available [S14b].
- It is a pre-1.0 port by one person. Risk is real but contained, because Motion's engine is the same one used by React and Vue.

### Sonner-style and Vaul-style feel without the libraries

Emil's pieces feel good for three reasons that we can copy: springs with real velocity (so interrupting keeps momentum), small scale changes (about 0.97 on press), and blur-plus-fade on text swaps. Svelte's `Spring` has the first. Tailwind has the rest. Arc UI documents the same numbers: press scale around 0.97, label cross-fade with a short blur, width springing to fit [S30b].

### One helper for the whole app (proposal)

A file `lib/motion.svelte.ts` exporting:
- `reduced` (wrapping `prefersReducedMotion`),
- `springFor(kind)` returning a `Spring` with house stiffness and damping,
- `vt(fn)` that runs `startViewTransition` only when supported and not reduced.

Every component then asks one place. This keeps the reduced-motion rule reviewable in one file.

## 4. Real-time presence and cursors

### Options compared

| Option | What it is | Svelte | Free tier / cost (verified date) | Licence | Fit |
|---|---|---|---|---|---|
| **Durable Object + Hibernation API** (plain) | Our own WebSocket room on Cloudflare | Any JS client | Workers Free includes SQLite Durable Objects. 100,000 requests a day; incoming WebSocket messages count 20:1; 13,000 GB-s a day; 5M rows read, 100k rows written a day [S12] | Cloudflare platform | Cheapest and fewest moving parts. We already run DOs |
| **PartyServer** + `partysocket` | Rooms, connections, broadcast, hibernation on top of a DO; the client reconnects and buffers | Framework-free | Same as above. Docs say it works on the Workers free plan [S11] | ISC. `partyserver` 0.5.10, 2.1M weekly downloads [S13] | **Recommended.** Cloudflare-maintained |
| PartyKit hosted platform | The old hosted service | n/a | **Shut down 23 October 2026** [S11] | n/a | Do not use. Existing guides that say `npx partykit deploy` are out of date |
| y-partyserver | Yjs backend for PartyServer, v2.2.0, 251k weekly downloads [S13b] | Via Yjs | Same | ISC | Only if we later need collaborative text editing. Overkill for cursors |
| Cloudflare Agents SDK | Agent class with state sync over WebSockets; extends PartyServer's `Server` [S42b, S42c] | Via client SDK | Same | **Unverified** | Useful later if Aksara agents themselves live as DOs. Heavier than we need now |
| Liveblocks | Hosted presence, cursors, storage | **No Svelte package**; use vanilla `@liveblocks/client`. A SvelteKit live-cursors example exists [S17, S17b] | Free: 3,000 collaboration minutes, 10 connections per room, 500 active rooms, "Powered by Liveblocks" badge; Pro $30 a month [S18] | Proprietary hosted | Avoid. Agent presence is supported, but limits and branding do not suit a public commons |
| Jazz 2 | Local-first relational DB | Svelte bindings (`jazz-tools/svelte`) [S43] | Package is `2.0.0-alpha.62` | **Unverified** | Alpha. Avoid |
| InstantDB | Reactive DB with presence and cursors | `@instantdb/svelte`; no SSR yet [S44] | Free: 1 GB, unlimited API requests [S45] | **Unverified** | Works, but adds a second database next to D1/DO SQLite |
| Convex | Reactive backend | Svelte support **unverified** | Free: 1M function calls, 0.5 GB [S46] | FSL Apache 2.0 | Avoid; second backend |
| Supabase Realtime | Broadcast, Presence, Postgres changes | JS client | Free: 2M messages and 200 peak connections a month [S47] | Open source | Avoid; second vendor |
| ElectricSQL | Postgres read-path sync, not presence | n/a | Cloud is beta | Apache 2.0 | Wrong tool |

**Which is simplest, cheapest and most maintainable for us.** A Durable Object we already know how to deploy, with PartyServer on top (about 40 lines of server code), costs nothing on the free plan for early traffic and keeps data inside Cloudflare, which matters for the privacy rules in `AGENTS.md`. Hosted services add a vendor, a cost cliff and a place where map activity data could leave our control.

### Free-tier arithmetic (my calculation from the pricing page [S12])

- Incoming WebSocket messages bill 20 to 1. 100,000 free requests a day therefore allow about 2,000,000 incoming messages a day. Outgoing messages are not billed.
- A person moving their mouse at 10 sent updates a second uses 10 messages a second. 2,000,000 messages is then about 55 hours of active mouse movement a day across the whole site.
- Duration: 13,000 GB-s a day at 128 MB (0.128 GB) is about 28 hours of active object time a day. Idle sockets on a hibernating object do not accrue duration [S12, S12b].
- Never write cursor positions to SQLite. Free rows written is 100,000 a day. Write only meaningful events (an agent started a task, finished one).
- When the free plan runs out, operations fail until 00:00 UTC [S12]. Plan: cap cursor send rate by load, and degrade to "who is here" with no live cursors.

### The architecture, step by step

Read this as a story of one cursor moving on the map. Words in **bold** are the five parts.

1. **Rooms.** One Durable Object per public map view, named like `map:mee-pago`. Everyone looking at that map connects to the same object. The object is a switchboard: it keeps a list of who is here and passes messages between them. Private community maps are separate rooms, and the Worker checks login and membership before it upgrades the connection. Nothing from a private room enters a public room, which is the rule in `AGENTS.md`.

2. **Connect.** The browser opens a WebSocket to `/parties/map/mee-pago` using `partysocket`. That library reconnects on its own and holds messages while offline. On connect the server sends a snapshot: the list of people and agents now in the room, with their last known position and activity text.

3. **Coordinates.** A cursor position is sent in **map coordinates** (where it is on the map), not screen pixels. Each browser has its own zoom and pan, so each browser converts map coordinates to its own screen when drawing. If you sent pixels, cursors would drift whenever two people had different zoom levels.

4. **Throttle (sender).** The browser sends a position at most every 50 ms (20 per second), and only if it changed by a minimum distance. Send nothing when the pointer is still, hidden or on a touch device with no hover. This is the biggest saving. The server also ignores any connection that sends faster than 25 messages a second.

5. **Relay (server).** On a message the server stamps it with the sender id and sends it to everyone else in the room. It does not store it. Per-connection facts (id, name, colour, kind: person or agent) go in `serializeAttachment`, which survives hibernation, with a limit of 16,384 bytes per connection [S12b]. Everything else about cursors is memory only and is rebuilt from the next messages after a wake-up.

6. **Smoothing (receiver).** Updates arrive at 20 a second, but the screen draws 60 a second. If you place the cursor straight at each update, it jumps. Two proven fixes [S19b, S19c]:
   - **Spring smoothing:** each frame, move the drawn position a fraction of the way to the latest target, using a critically damped spring. Feels fluid, small delay, no overshoot. About 15 lines. We write it ourselves.
   - **Spline smoothing:** the `perfect-cursors` library (used by tldraw, MIT, 60k weekly downloads) fits a curve through the last few points. More accurate paths, one update of delay. Its last npm release is May 2022 and the repo has one contributor, so it is small and stable but not maintained [S19b].
   - Recommendation: spring first. Write straight to `element.style.transform` inside `requestAnimationFrame`, not to Svelte `$state`, so 20 cursors do not trigger 60 reactive updates a second each.

7. **Draw.** The cursors live in an HTML overlay above the canvas, not on the canvas. Each is a small arrow, a coloured label and, for agents, a bubble. The overlay hides cursors outside the visible region and clamps those near the edge. Agents use a different shape (a round pip, not an arrow) so no one mistakes an agent for a person.

8. **Agent activity text.** The agent is just another participant with `kind: "agent"`. Its message is `{ id, name: "Aksara · Mee Pago", x, y, itemId, activity: "Membaca sumber 1948 tentang Paniai", ts }`.
   - The agent's server code does not need a WebSocket. It calls the room object directly (a Durable Object call, `stub.agentPresence(msg)`) and the room broadcasts it. This avoids outbound sockets, which block hibernation [S12b].
   - Position changes are sent when the agent moves to a new item, not 20 times a second. The browser animates the move with a longer spring, so it glides.
   - Activity text changes at most every 2 seconds, is cut to 120 characters, is plain text only (no HTML), and is localised on the client from a code plus parameters where possible.
   - The agent's actions that matter ("sumber ditemukan", "halaman ditulis") are also written once to the item log in SQLite, which is the "every action leaves a dot" rule in the design.
   - If no message arrives for 30 seconds the room marks the agent idle and the browser fades it out. When the agent leaves, the room sends a `leave`.

9. **Accessibility and privacy.** Cursors are decoration. The same facts appear in a text list ("Aktivitas di peta ini"), which is the screen reader path. Use `aria-live="polite"` only for the one agent a person chose to follow. Show no human cursors until the person opts in ("Tampilkan saya di peta"). Never show cursors for conflict or sensitive items beyond regency level, per the design's risk list.

10. **Failure and abuse.** Messages are validated (numbers in range, text length). A room caps at about 50 live connections; beyond that new visitors get "who is here" counts but no cursors. If the object is overloaded Cloudflare returns an error and the client falls back to list-only mode.

**How a reviewer can check it.** Four tests prove most of the design: (a) open two browsers and move the mouse in one, the other shows it smoothly; (b) zoom one browser, the other cursor lands on the same item; (c) leave the tab idle for 10 minutes, then move, and the cursor still works (hibernation recovery); (d) send 100 messages a second from a script, and the server drops the excess. Also check that no code path writes cursor moves to SQLite and that no private room id can be joined without a membership check.

Example sketch (not tested):

```ts
// server (PartyServer)
export class MapRoom extends Server {
  static options = { hibernate: true };
  onConnect(conn, ctx) {
    conn.setState({ id: conn.id, kind: "person", name: ctx.request.headers.get("x-name") });
    conn.send(JSON.stringify({ t: "snapshot", peers: this.snapshot() }));
  }
  onMessage(conn, raw) {
    const m = parseCursor(raw);           // validate, rate-limit
    if (m) this.broadcast(JSON.stringify({ t: "c", id: conn.id, ...m }), [conn.id]);
  }
  agentPresence(a) { this.broadcast(JSON.stringify({ t: "agent", ...clean(a) })); }
}
```

## 5. Map and graph rendering

All of these are MIT. "Svelte 5" says how I know.

| Name | What it is | Svelte 5 (verified how) | Scale | Transitions and picking | Version / activity | Fit |
|---|---|---|---|---|---|---|
| Canvas 2D (own code) | Plain canvas | Any | Fine to about 20k simple dots, per the design | Own code | n/a | First build |
| regl-scatterplot | WebGL pan-zoom scatter, lasso | Vanilla JS; wrap in an action (no wrapper found) | "Up to 20 million points" claimed [S20] | `draw(points, { transition: true })` between two sets of the same size (matched by index); `zoomToPoints` with transition; hover, select, lasso events | v1.16.0, updated May 2026; 8k weekly downloads | **Best fit for Makna/Waktu/Suara switches** (same items, new x,y). When item count changes, redraw without transition |
| embedding-atlas `EmbeddingView` | Apple's embedding viewer component | **Yes**: `embedding-atlas/svelte` exports `EmbeddingView`, peer `svelte >=5` [S19] | "a few million points" | Tooltip, selection, labels, density map; transitions between layouts **unverified**; DeepWiki says WebGPU rendering (fallback **unverified**) | v0.26.0, updated 15 Oct 2026; 15k weekly downloads; 1 dependent | Quick Makna prototype. Colour categories are a `Uint8Array`, which fits 14 domains but not multi-label bridges |
| cosmos.gl | GPU force-directed graph | Vanilla; no Svelte wrapper | Hundreds of thousands of points and links [S21] | GPU transitions on by default (800 ms), `findPointsInRect`, hover callbacks | v3.6.0 (Nov 2026), OpenJS Foundation project, 125k weekly downloads | Dasar and Jalur graph lenses if they get large. Needs `luma.gl` peers |
| deck.gl | Layer-based WebGL framework | `svelte-maplibre` has deck.gl peers [S24b]. Own Svelte wrapper **unverified** | Large | Layer prop transitions (interpolation or spring), camera transitions, picking [S41] | 9.4.1, 14.7k stars; v9.4 "expected final v9 release" [S41b] | Heavy. Use if Tempat needs many points on the map |
| sigma.js 4 | WebGL graph with graphology | Vanilla; no wrapper | "Thousands of nodes and edges" | Node dragging, hover, picking padding | 4.0.6 (10 Nov 2026), 727k weekly downloads, **v4 was a rewrite on 8 Oct 2026** [S23] | Good for Dasar. Wait one or two releases before relying on v4 |
| Svelte Flow (`@xyflow/svelte`) | DOM node editor | Yes: "based on Svelte 5" since 1.0 [S48] | Hundreds of DOM nodes (docs say use `$state.raw`) | Drag, pan, zoom, keyboard navigation | 1.7.1, 321k weekly downloads | Paths editor and small Dasar trees, **not** the point cloud |
| Threlte 8 | three.js for Svelte | Yes, peer `svelte >=5` [S22] | Large | Full control | 8.7.0 (2 Nov 2026) | Only for a 3D showcase mode |
| LayerChart | Composable Svelte charts (shadcn `chart` uses it) | Peer `svelte ^5.57.0` [S25] | Chart-sized | Brush, tooltips, SSR | v2.10.1 (12 Nov 2026), 431k weekly downloads, 1.4k stars | Reports and band, **but requires Svelte 5.57; this repo is on 5.49.1** |
| LayerCake | Headless chart layout (Svg, Html, Canvas layers) | Peer `svelte >=5.40`, runes since v11 [S25b] | Chart-sized | n/a | v11.0.0 (6 Sep 2026) | Fine for the band |
| svelte-maplibre-gl | Svelte 5 wrapper for MapLibre GL JS | **Svelte 5 only**, peers `maplibre-gl ^5.19 or ^6` [S24] | Vector tiles | Markers, popups, GeoJSON layers | 2.2.1 (26 Oct 2026); commits through Aug 2026 | **Tempat lens** |
| svelte-maplibre (dimfeld) | Older wrapper | Peer `svelte ^5.0.0` [S24b] | Same | Has deck.gl integration | 2.0.1 (25 Sep 2026); needs `maplibre-gl ^6.7` | Alternative if deck.gl is wanted |
| embla-carousel-svelte | Carousel | Peer Svelte 3.49 to 5 [S26] | n/a | Swipe | 8.6.0 | "Untuk dibaca" |

**Which fits "1k to 20k items, smooth zoom, picking, transitions between layouts".** regl-scatterplot, then embedding-atlas. Both are made for this and need no force layout, because the layout is computed in the nightly batch, as the design says. cosmos.gl and sigma are graph tools: use them when links are the point (Dasar), not for the main cloud. Svelte Flow and Threlte do not fit.

**Two cautions.**
1. A point cloud on a canvas is invisible to screen readers and keyboards. The design already requires a list for every lens. Keep it the primary accessible path, and keep arrow-key navigation between neighbours.
2. Layout transitions need the same items in the same order. Keep a stable `item index → row` mapping, and rebuild without animation when items are added.

**For the Tempat lens.** MapLibre GL JS is at v6 and needs a Vite worker setting [S24, S24b]. Boundary layers must carry the "wilayah acuan, bukan batas tanah adat" note, which Native Land Digital's practice supports (see section 7). Where the basemap tiles come from, and their terms and cost, I did not research: **unverified**.

## 6. Ten to fifteen interaction patterns to borrow

Each pattern names the product, what it does, and where it goes in our design.

| # | Pattern | Source | Where in our design |
|---|---|---|---|
| 1 | **Citations that point to the exact passage.** Numbered marks in an answer open the source passage. Consensus also lists "supporting quotes" per paper | NotebookLM [S49], Consensus [S50] | Panel and "Tanya peta": each sentence links to the verified sentence in Dasar |
| 2 | **A table where each row is a source and each column a fact** (study type, year, why relevant). Add a column to extract more | Elicit [S50] | Dasar lens list view and the share card for a path: rows are sources with voice, date and "recorded when" |
| 3 | **A tally, not a verdict.** Consensus shows how many papers lean each way. Their own notes say the meter covers only the papers returned [S50, S50b] | Consensus | Berdampingan lens and the band's one-line summary: "3 sumber, 2 berbeda". Keep counts and gaps, no grade, as the design says |
| 4 | **Topic labels at several zoom levels, clickable to filter, editable by stewards** | Nomic Atlas [S51] | Makna lens. Domain labels appear and split as you zoom. Stewards rename a label; the rename is logged |
| 5 | **Slice by time and watch topics change** | Nomic Atlas [S51] | Band brush sets the range in the explorer. The "when it happened / when recorded" toggle swaps the axis with a morph |
| 6 | **Lasso or click to build a selection, then act on it** (tag, clean, export) | Nomic Atlas, Latent Scope [S51, S52] | Jalur: lasso a region, reorder the selection, write a sentence between each item. The selection also feeds "Tanya peta" |
| 7 | **Dim everything but the neighbours on hover; edge weight shows strength** | llm_wiki (sigma.js) [S53] | Dasar lens and reading panel "related items". Learn the pattern, do not copy the code (GPL) |
| 8 | **Click a node to ask about it** | NotebookLM mind map [S49] | Tap a dot, then "Tanya tentang ini" opens the panel with the question prefilled. NotebookLM's maps cannot be edited, so keep ours editable |
| 9 | **Gaps found, one click to research** | llm_wiki "knowledge gaps with Deep Research" [S53] | Celah lens. A thin cell has "Tambah di sini" for people and "Tugaskan Aksara" for stewards |
| 10 | **Summary hidden in a closed accordion, clearly labelled machine-made and unverified.** In an 8-person test the label raised trust. Wikipedia then paused the feature after editors objected and said editor moderation is required | Wikipedia Simple Summaries [S54, S55] | Panel: Aksara's summary sits in a labelled fold with "belum diverifikasi" until a steward verifies it. Never replace the main text |
| 11 | **A short story first, then a trail of images and maps; bilingual.** Te Ara adds a plain-language "short story" to each entry and a visual trail as another route | Te Ara [S56] | Carousel "Untuk dibaca" and the panel: short summary, then a media trail. Bahasa Indonesia and local languages from day one |
| 12 | **Protocol labels on each item, and access by relationship.** Mukurtu's TK Labels (seasonal, sacred, attribution) travel with the item; users see different "mini archives" | Mukurtu [S57] | "Jangan disebarkan" flag, shown as a label on the dot, panel and share card. A share card must carry the label and must not render for restricted items |
| 13 | **Boundaries that say whose view they are, plus open data.** Native Land states its aim to map by how Indigenous people want to be seen, and publishes GeoJSON and an API | Native Land Digital [S58] | Tempat lens boundary note and an open dataset link. Also the "Placenames Map" idea: show local names first |
| 14 | **Tap a dot, then follow what it rests on.** Marble's curriculum map: "tap any dot to see everything a learner must master before it", drag to spin, scroll to zoom, open source | Marble [S42] | Dasar lens: tap a claim and the chain of sources lights up, back to the earliest. Also the showcase demo |
| 15 | **One toast that changes into the next, instead of a stack** | Ding [S4] | Toasts and agent activity: "Aksara · Saireri mencari sumber kedua" morphs into "Sumber ditemukan". Use a stack only for batches |
| 16 | **Steps shown as a short list with expandable detail** (thought, ran, used 2 sources) | shadcn-svelte `Trace` [S1] | Agent cursor popover and Aktivitas: each Aksara task shows its steps and sources. Gives the swarm the legibility the design asks for |
| 17 | **One surface, several lenses, shareable by URL.** Atlas lets editors share maps; Heptabase puts the same card on several whiteboards and zoom changes the level of thought [S51, S59] | Nomic Atlas, Heptabase | Share cards: the URL stores lens, filters, selection and viewport; the card image is rendered from that URL. Items in a path stay single records reused across paths |

(17 listed; the owner asked for 10 to 15. Cut 8 and 17 first if scope is tight.)

## 7. Reference products and projects

| Product | What it does | Pattern worth borrowing | Caution | Source |
|---|---|---|---|---|
| NotebookLM | Answers only from your sources, numbered citations that jump to the passage; Studio panel makes audio, mind maps, reports from the same sources | Citations; Studio-style "make a path/summary/card from this selection" | Mind maps can now be prompted but not edited [S49b] | S49 |
| Elicit | Searches 138M+ papers, builds an extraction table you can add columns to | Source tables | Read-only claims about coverage come from a third party | S50 |
| Consensus | Short answer plus a meter of how papers lean, supporting quotes per paper, retractions flagged | Tally and quotes | Meter is about returned papers only | S50 |
| Perplexity | Answer with inline citations and a Sources panel; Research mode | Sources panel | I did not review Perplexity Pages: **unverified** | S50 |
| Are.na | Channels of blocks, connect the same block into many channels, no ads or recommendations | Reuse of items across paths | Limited spatial layout | S59 |
| Heptabase | Cards on whiteboards, same card on several boards, PDF highlights become cards | Cards and reuse | Lag at hundreds of cards, per its own guide [S59b] | S59 |
| Kosmik | Infinite canvas, built-in browser, source link kept for every capture | Source link always kept | No free plan now [S59b] | S59 |
| Obsidian canvas, Logseq | Free canvas over local files; Logseq is open-source outliner | Own-your-files ethos | Not researched in depth: **unverified** | S60 |
| Tana, Anytype, Observable | Not researched in this pass | n/a | **Unresearched** | n/a |
| Nomic Atlas | Data map with hierarchical topic labels, vector search, time slice, lasso, editable topics | Patterns 4, 5, 6, 17 | Hosted product | S51 |
| Latent Scope | Open-source embed, project, cluster, LLM-label, then explore; image map; compare views | Compare two maps; share selection across panes | **Licence and stars unverified** | S52 |
| Wikipedia | Simple Summaries test, paused after editor discussion | Pattern 10 | Social cost of AI text without editors | S54, S55 |
| Te Ara | Short story plus media trail; bilingual; open standards; content kept outside the CMS | Pattern 11 | Built in 2000s tech | S56 |
| Native Land Digital | Map, treaties, languages, placenames; open GeoJSON and API; Indigenous-led | Pattern 13 | Their data is contested in places; we should say so | S58 |
| Mukurtu | Community archive with cultural protocols and TK Labels; layered narratives | Pattern 12 | Drupal-based; design lesson only | S57 |
| Marble | Open map of primary school: 7 curriculum frameworks, AI agents propose links, team reviews, open source; tap to follow prerequisites | Pattern 14; agents-propose, humans-review | I read only the page text, not the repo | S42 |
| nashsu/llm_wiki | Desktop app that builds a linked wiki from documents; sigma.js graph; Louvain clusters; "knowledge gaps" insights | Patterns 7, 9 | 21,651 stars, created 8 April 2026; README says GPL-3.0 while the repo listing says "Other". **Do not copy code** (AGENTS.md: no copying of copyleft donor code until licensing is settled) | S53 |
| rahulnyk/knowledgegraph | Text corpus to graph | Not a pattern we need | 4.1k stars (second-hand post, 6 Oct 2026) | S61 |
| robert-mcdermott/ai-knowledge-graph | Triples with the source sentence kept for every relation | Each relation keeps its sentence, like our Dasar | 3,137 stars, Apache-2.0, last commit about 2 months ago | S61b |
| SamurAIGPT/llm-wiki-agent | Agent maintains linked wiki; flags contradictions; lint report | Contradiction flags feed Berdampingan | Small, **stars unverified** | S61c |

Overall reading: the strongest shared habits are (1) every claim points to a passage, (2) one set of items shown in several arrangements, (3) machine output is labelled and editable by people, and (4) the Indigenous-led products put protocol and framing in the interface, not in a footnote. The third and fourth are the ones where ETNOS should be stricter than the products above.

## 8. Fit with what is installed

From `apps/web/package.json`: `svelte 5.49.1`, `bits-ui 2.20.2`, `tailwindcss 4.3.3`, `tw-animate-css 1.4.0`, `@lucide/svelte 1.66.0`, `@yusufceng1z/ding-svelte 0.0.5`, `tailwind-variants`, `@internationalized/date`. Existing `ui/` folder has: alert-dialog, avatar, badge, breadcrumb, button, card, checkbox, dialog, dropdown-menu, field, input, label, native-select, scroll-area, select, separator, sheet, sidebar, skeleton, switch, tabs, textarea, tooltip, plus Geist and other fonts.

Notes:
- No `popover`, `command`, `carousel`, `chart` or `drawer` yet. Add the first three; skip `drawer`.
- LayerChart 2.10 needs Svelte 5.57 or later. Either bump Svelte (a minor bump, but run `npm run check` and `npm test` first), or avoid LayerChart and hand-build the band.
- `motion-sv` and `layercake` need Svelte 5.40 or later, which 5.49.1 meets [S14, S25b].
- `@yusufceng1z/ding-svelte` is pinned at 0.0.5. The npm page I fetched showed 0.0.4 as latest and updated on 10 November 2026, so 0.0.5 is either newer than my read or the page lagged. **Unverified.**
- Adding any copied component means recording attribution, per `AGENTS.md`. MIT parts (shadcn-svelte, extras, svelte-animations) are fine with a notice; Commons Clause and Aceternity code should not be copied.

## 9. What I could not confirm

- Whether `0.0.5` of Ding exists on npm (page showed 0.0.4).
- The licence of the newer Svelte Magic UI repo (`SikandarJODD/animations`); only the older repo's MIT licence was confirmed.
- Whether shadcn-svelte `chart` currently pins a LayerChart version that fits Svelte 5.49.1.
- Whether embedding-atlas animates between layouts, and whether it works without WebGPU.
- Ark UI's Svelte drawer (only a user comment).
- The licences of Melt UI, Skeleton, Flowbite-Svelte, TFE templates, y-partyserver's dependents, Jazz, InstantDB.
- Motion's own size and whether `motion-sv` honours the reduced-motion setting on its own.
- Convex's Svelte support.
- Map tile hosting terms and cost for the Tempat lens.
- Perplexity Pages, Tana, Anytype, Observable, Obsidian graph, Logseq interaction details.
- Whether "arc ui" means uiarc.dev. It is the best match; ask the owner.
- Star counts are as reported by the source page at the time of reading and some third-party pages are weeks old.

## 10. Sources

All accessed 16 November 2026. "Published" is given where the page showed a date.

**shadcn-svelte and component libraries**
- S1 shadcn-svelte docs index (llms.txt): https://www.shadcn-svelte.com/llms.txt
- S1 changelog, "October 2026 - Trace, Code Block and AI Elements": https://shadcn-svelte.com/docs/changelog
- S1b shadcn-svelte repo (9,260 stars, MIT): https://github.com/huntabyte/shadcn-svelte
- S2 Tailwind v4 and Svelte 5 note: https://shadcn-svelte.com/docs/migration/tailwind-v4
- S3 Drawer, Carousel, Sonner added January 2024; drawer built on vaul-svelte: https://shadcn-svelte.com/docs/changelog/2024-01-new-components
- S32 shadcn-svelte-extras repo (606 stars, MIT): https://github.com/ieedan/shadcn-svelte-extras and https://shadcn-svelte-extras.com/docs
- S33 Bits UI repo: https://github.com/huntabyte/bits-ui
- S34 Skeleton page for Melt UI (Svelte 5, `melt/builders`): https://www.skeleton.dev/docs/svelte/integrations/melt-ui
- S35 Melt UI listing, 15 May 2026 (third party): https://sveltekitui.com/libraries/melt-ui/
- S28 Skeleton install page (cannot mix with Flowbite Svelte): https://www.skeleton.dev/docs/svelte/get-started/installation.md
- S29 Svelte UI comparison, 15 Oct 2026 (third party): https://svgrid.com/blog/svelte-ui-component-library-what-to-look-for/ (also S29b, same page for Flowbite note)
- S36 Svelte Magic UI: https://sv-animations.vercel.app/magic and changelog https://sv-animations.vercel.app/changelog
- S37 SikandarJODD/svelte-animations (1,233 stars, MIT): https://github.com/SikandarJODD/svelte-animations
- S38 Aceternity UI Svelte (unofficial): https://aceternity.sveltekit.io/
- S39 TFE Svelte Templates: https://tfe-svelte-templates.vercel.app/
- S27 React animation library comparison, 21 Oct 2026 (licences, stars): https://snapcn.dev/best-shadcn-animation-libraries ; also https://eased.dev/compare and https://wingo-ui.com/blog/magic-ui-alternatives (16 Oct 2026)
- S40 coss ui as next step after Origin UI, 3 Nov 2026 (third party): https://tactileui.dev/blog/ui-component-libraries-compared-2026
- S30 Arc UI: https://uiarc.dev/ and https://uiarc.dev/docs/introduction (also S30b button page https://uiarc.dev/components/button)
- S31 Pin UI repo (created 17 Sep 2026, 122 stars): https://github.com/shadcn-labs/pin-ui and https://www.pinui.xyz/components
- S8 svelte-sonner 1.2.3: https://www.npmjs.com/package/svelte-sonner and releases https://github.com/wobsoriano/svelte-sonner/releases
- S4 Ding site and repo: https://ding.yusufcengiz.dev/ , https://ding.yusufcengiz.dev/llms.txt , https://github.com/yusufceng1z/ding (S4b)
- S5 `@yusufceng1z/ding-svelte` npm (created 5 Nov 2026): https://www.npmjs.com/package/@yusufceng1z/ding-svelte
- S15 Vaul (React) README "unmaintained": https://github.com/emilkowalski/vaul/ ; S15b "Vaul's future" issue (thread to 17 Jun 2026): https://github.com/emilkowalski/vaul/issues/630
- S16 vaul-svelte repo and "Abandoned package?" issue (22 Jan 2026): https://github.com/huntabyte/vaul-svelte/ , https://github.com/huntabyte/vaul-svelte/issues/138 ; S16b Bits UI drawer request (13 Mar 2026): https://github.com/huntabyte/bits-ui/discussions/1986
- S26 embla-carousel-svelte: https://www.npmjs.com/package/embla-carousel-svelte and https://www.embla-carousel.com/docs/get-started/svelte

**Motion**
- S6 svelte/motion docs (Spring, Tween, prefersReducedMotion): https://svelte.dev/docs/svelte/svelte-motion
- S7 svelte/animate (flip) and svelte/transition (crossfade): https://svelte.dev/docs/svelte/svelte-animate , https://svelte.dev/docs/svelte/svelte-transition
- S14 motion-sv: https://www.npmjs.com/package/motion-sv , https://github.com/hanielu/motion-svelte , docs https://motion.hyprsonic.dev/docs and https://motion.hyprsonic.dev/docs/coming-from-react-or-vue (S14b)
- S9 SvelteKit view transitions FAQ: https://svelte.dev/docs/kit/faq ; S9b view transitions bug with async, fixed in 5.39.6: https://github.com/sveltejs/kit/issues/14220
- S10 Same-document view transitions Baseline Newly available, 16 Oct 2025: https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available
- S11b caniuse view transitions: https://caniuse.com/view-transitions

**Real-time**
- S11 PartyKit hosted platform shutdown, 9 Oct 2026: https://blog.partykit.io/posts/hosted-platform-shutdown/ ; migration guide (updated 8 Oct 2026): https://docs.partykit.io/guides/migrate-to-partyserver/
- S13 partyserver npm: https://www.npmjs.com/package/partyserver ; S13b y-partyserver: https://www.npmjs.com/package/y-partyserver ; repo https://github.com/cloudflare/partykit/
- Cloudflare acquires PartyKit, 5 Apr 2024: https://blog.cloudflare.com/cloudflare-acquires-partykit/
- S12 Durable Objects pricing (updated 13 Nov 2026): https://developers.cloudflare.com/durable-objects/platform/pricing/ ; limits https://developers.cloudflare.com/durable-objects/platform/limits/
- S12b Durable Objects WebSockets and hibernation (updated 30 Oct 2026): https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Cloudflare live cursor tracker example: https://cloudflare-experiments.com/docs/experiments/live-cursor-tracker ; hibernation notes on frequent small messages: https://flaviocopes.com/courses/cloudflare/use-hibernating-websockets/
- S42b Agents SDK WebSockets and state: https://developers.cloudflare.com/agents/runtime/capabilities/websockets/ ; S42c internals (extends PartyServer): https://developers.cloudflare.com/agents/agent-class/internals/
- S17 Liveblocks Svelte guide (no Svelte package): https://liveblocks.io/docs/get-started/svelte ; S17b example https://liveblocks.io/examples/live-cursors/sveltekit-live-cursors ; presence and agent presence https://liveblocks.io/docs/use-cases/presence
- S18 Liveblocks pricing: https://liveblocks.io/pricing and plans https://liveblocks.io/docs/pricing/plans (the plans page says Free is for non-commercial personal projects; the pricing FAQ says commercial use is allowed with the badge; these conflict)
- S19b perfect-cursors repo and npm: https://github.com/steveruizok/perfect-cursors/ , https://www.npmjs.com/package/perfect-cursors ; S19c Liveblocks, "How to animate multiplayer cursors", 5 Jul 2022: https://liveblocks.io/blog/how-to-animate-multiplayer-cursors
- S43 Jazz: https://www.npmjs.com/package/jazz-tools (published 14 Nov 2026), https://jazz.tools/docs/reference/framework-patterns
- S44 InstantDB Svelte: https://www.instantdb.com/docs/start-svelte ; S45 pricing note: https://www.vibecodewithmatt.com/tools/instantdb (23 Jun 2026, third party)
- S46 Convex, S47 Supabase, Electric comparison, 16 Mar 2026 (third party): https://pocketlantern.dev/briefs/realtime-sync-framework-convex-vs-electric-sql-2026 ; Convex pricing Nov 2026: https://stitchdb.com/blog/convex-alternatives ; Supabase: https://supabase.com/kb/guides/best-realtime-providers

**Map and graph**
- S19 embedding-atlas: https://apple.github.io/embedding-atlas/embedding-view.html , https://www.npmjs.com/package/embedding-atlas , https://github.com/apple/embedding-atlas , DeepWiki https://deepwiki.com/apple/embedding-atlas/2.4-javascript-integration
- S20 regl-scatterplot: https://github.com/flekschas/regl-scatterplot/ , https://www.npmjs.com/package/regl-scatterplot
- S21 cosmos.gl: https://www.npmjs.com/package/@cosmos.gl/graph , https://github.com/cosmosgl/graph/ ; v3 announcement, 25 Jun 2026: https://openjsf.org/blog/cosmos-gl-v3
- S41 deck.gl animations: https://deck.gl/docs/developer-guide/animations-and-transitions ; S41b what's new (9.4, 5 Sep 2026): https://deck.gl/docs/whats-new ; repo https://github.com/visgl/deck.gl/ ; npm https://www.npmjs.com/package/deck.gl
- S23 sigma.js: https://www.npmjs.com/package/sigma , releases https://github.com/jacomyal/sigma.js/releases/ , migration https://www.sigmajs.org/how-to/technical/migration-v3-v4/
- S48 Svelte Flow: https://www.npmjs.com/package/@xyflow/svelte , changelog https://github.com/xyflow/xyflow/blob/main/packages/svelte/CHANGELOG.md , quick start https://svelteflow.dev/learn
- S22 Threlte: https://www.npmjs.com/package/@threlte/core , https://threlte.xyz/blog/threlte-8/
- S25 LayerChart: https://www.npmjs.com/package/layerchart , releases https://www.layerchart.com/docs/releases ; S25b LayerCake: https://www.npmjs.com/package/layercake
- S24 svelte-maplibre-gl: https://www.npmjs.com/package/svelte-maplibre-gl , https://makewithmaplibre.com/sdks/svelte-maplibre-gl-mierune/ ; S24b svelte-maplibre: https://www.npmjs.com/package/svelte-maplibre , https://github.com/dimfeld/svelte-maplibre/blob/HEAD/CHANGELOG.md

**Products and projects**
- S49 NotebookLM: Google Workspace update, 20 Mar 2026 https://workspaceupdates.googleblog.com/2026/03/new-ways-to-customize-and-interact-with-your-content-in-NotebookLM.html ; guide 30 Oct 2026 https://aibirdview.com/blog/how-to-use-notebooklm ; Studio panel, 11 Jan 2026 https://www.xda-developers.com/notebooklm-studio-panel-secret-second-app/ ; S49b Mind Maps prompts but not editable, 7 Jun 2026 https://www.xda-developers.com/notebooklms-mind-maps-were-useless-to-me-until-this-one-update-changed-everything/
- S50 Elicit, Consensus, Perplexity compared, 13 Nov 2026: https://searchenginewatch.com/best-ai-search-engines-for-research/ ; S50b workflow note, 5 May 2026: https://www.airesearchreviews.com/best-tools/ai-systematic-review-workflow-perplexity-elicit-consensus
- S51 Nomic Atlas controls and topic modelling: https://docs.nomic.ai/atlas/datasets/data-maps/controls , https://docs.nomic.ai/atlas/datasets/data-maps/topic-modeling , https://github.com/nomic-ai/nomic
- S52 Latent Scope: https://github.com/enjalot/latent-scope , https://enjalot.github.io/latent-scope/explore-and-curate
- S53 llm_wiki: https://github.com/nashsu/llm_wiki
- S54 Wikipedia Simple Article Summaries: https://www.mediawiki.org/wiki/Reading/Web/Content_Discovery_Experiments/Simple_Article_Summaries and usability study https://www.mediawiki.org/wiki/Reading/Web/Content_Discovery_Experiments/Simple_Article_Summaries/Usability_study ; S55 pause after editor discussion: https://en.wikipedia.org/wiki/Wikipedia:Village_pump_(technical)/Archive_222
- S56 Te Ara history (design and short story): https://teara.govt.nz/en/te-ara-a-history/print , https://teara.govt.nz/en/te-ara-a-history/page-4
- S57 Mukurtu: https://www.dlib.org/dlib/may17/christen/05christen.html (15 May 2017) and https://ad-hoc-museum-collective.github.io/GWU-museum-digital-practice-2019/essays/essay-13/ (4 Dec 2019)
- S58 Native Land Digital: https://native-land.ca/
- S42 Marble curriculum: https://withmarble.com/curriculum
- S59 Are.na, Heptabase, Enterall comparison, 12 Oct 2026: https://enterall.co/blog/news/best-are-na-alternatives-for-visual-note-taking-2026 ; S59b Heptabase alternatives (Kosmik pricing, lag), 22 May 2026: https://dessence.ai/blog/heptabase-alternatives-for-visual-thinkers-2026 ; Kosmik vs Heptabase: https://www.kosmik.app/blog/kosmik-vs-heptabase
- S60 Obsidian, Logseq mention (third party), 16 Sep 2026: https://mentalclone.com/blog/heptabase-alternative
- S61 rahulnyk/knowledgegraph post, 6 Oct 2026: https://agihunt.info/en/p/1a111247457a685bf0e0a2b5dc9 ; S61b https://thedailyrepo.com/r/robert-mcdermott/ai-knowledge-graph/ ; S61c https://agentlenshq.com/projects/ghp%3ASamurAIGPT/llm-wiki-agent
