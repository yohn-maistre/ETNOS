# Aksara as a composer of views, not a coding agent

> **Decision changed 19 November:** the owner chose **OpenUI** (`@openuidev/svelte-lang`, MIT) instead of our own spec, to minimise custom code. The safety rules below (locked catalogue, viewer-checked data resolvers, steward approval, withdrawal) still apply; the spec format and renderer come from OpenUI. See `community-dictionary-2026-11-19.md` §12.

18 November 2026. Research only; no code changed. Marks: [V] read on the source page today, [S] secondary source or memory, [U] unverified. Sources are at the end.

## Summary and recommendation

1. Recommendation: do not make Aksara a coding agent. Let her compose views from a fixed, typed catalogue of components that Strata ships. Call this the composer model.
2. A view is a versioned JSON spec, validated by zod on the server. It holds layout, text and query parameters. It never holds data, code, HTML or URLs outside an allow-list.
3. Each primitive declares the one kind of Strata query it may run. The server runs that query as the viewer at render time, so visibility, withdrawal and membership are checked on every load.
4. A view is a record attached to a community or context page, with author, approver, revision history and a withdraw and rollback path. Aksara only drafts. A steward approves.
5. Borrow the shape of Vercel's json-render (Apache-2.0, flat element tree, catalogue of zod props, JSONL streaming) and the surface and data-model split of Google's A2UI. Own the schema and a small Svelte renderer. Spike `@json-render/svelte` for half a day before deciding to write our own renderer.
6. This runs on Workers Free. One drafting call costs about 40 neurons on Gemma 4 26B. JSON Mode is not documented for Gemma 4, so use prompt, zod check and one repair round.
7. Showcase slice (18-19 December): eight primitives, one steward-approved view on one community page, shown with its history and a withdrawal. About 8 to 10 working days.
8. Fuller version (January to February): 14 or more primitives, sign-up forms, deployment-added primitives, evaluation set. About 25 to 30 further days.
9. Model-written Svelte or JavaScript stays a Paid, opt-in, later phase, as the harness note already decided.
10. Open questions for the owner are at the end.

## 1. The main choice

The wishes are a region page with a map, timeline, language list and market board; a festival community with a schedule and sign-up; a language room with a word-of-the-day card. Each wish is a known arrangement of things Strata already knows how to show. That points to composing, not coding.

| Concern | (a) Agent writes and runs code | (b) Agent composes a JSON spec from a catalogue |
| --- | --- | --- |
| XSS | The model output is executable. Needs a sandboxed iframe with a strict CSP and a message bridge | The spec holds strings only. Our Svelte components render them as text. No raw HTML field exists |
| Data leaks across visibility | Code in an iframe has no cookies by design, so every read goes through a bridge we must write and police. One bridge bug leaks | Each primitive has one server-side query, run as the viewer through the existing checks. The spec cannot name a table or a private id |
| Prompt injection | A hostile post the agent read can steer the code it writes, and code can do more than data | The worst outcome is a bad layout or misleading text, both visible in the preview before a human approves |
| Review | A steward cannot review code. Review would fall to us | A steward reads a preview in the page itself, plus a plain-language list of what it shows and which queries it runs |
| Free-tier cost | Execution needs Workers Paid in every Cloudflare route [V, see section 3]. Many tool rounds drain the 10,000 daily neurons | One model call, about 40 neurons, then no run-time model cost. Views render from stored specs |
| Model needed | A model that writes working Svelte or JavaScript reliably. Small free models fail often | A model that fills a typed JSON form from a menu. A 26B model can do this with a repair round [S] |
| Portability | Code is tied to one deployment's styles and APIs | A spec moves between deployments that ship the same catalogue version. Missing primitives degrade to a notice |
| Accessibility | Whatever the model writes. No guarantee of labels, focus order or contrast | Primitives are reviewed once for keyboard, screen reader and contrast. Every view inherits that |
| Range | Unlimited | Limited to the catalogue. A new kind of feature needs a reviewed Svelte component |

The last row is the real cost of (b). It is also the point of a community engine, because new capability then passes human review once, in the repository, and not once per community.

Verdict for this section. Choose (b). Keep (a) as a Paid opt-in described in the harness note.

## 2. Existing standards and projects for (b)

| Project | What it is | Licence | Maturity | Svelte and Workers fit | What to borrow |
| --- | --- | --- | --- | --- | --- |
| **json-render** (Vercel Labs) | Generative UI framework. Catalogue defined with `defineCatalog`, props as zod objects, `defineRegistry` maps entries to components, `catalog.prompt()` writes the system prompt [V] | Apache-2.0 [V] | About 19.8k stars [V]. npm core 0.23.1, 16 Nov 2026, 38 releases since 14 Jan 2026 [V]. Pre-1.0 and moves quickly | `@json-render/svelte` 0.23.1 is a Svelte 5 renderer with `zod ^4` and `svelte ^5` peers [V]. Pure JS, so Workers is fine for validation. Strata already uses zod v4 | Flat element tree (`type`, `props`, `children`, root key), `$state` bindings, repeat over arrays, visibility conditions, JSONL patch streaming, prompt generated from the catalogue |
| **A2UI** (Google) | Agent-to-UI protocol. The agent sends declarative JSON such as `createSurface`, using components from a catalogue the host registers. Data bindings and two-way bindings exist [V] | Apache-2.0 [V] | v1.0 spec, 17.6k stars, 309 open issues, roadmap lists v1.1 and sandboxed logic [V]. npm `@a2ui/web_core` 0.15.0, 2 Nov 2026 [V] | First-party renderers for Lit, Angular, React, Flutter, SwiftUI. Community renderers include Svelte, quality unchecked [V on a2ui.org, U on the renderer] | The split between the component tree, the data model and the catalogue. Locked catalogue as the safety boundary. Surfaces as the unit that can be replaced |
| **MCP Apps** and MCP-UI | A tool points to a `ui://` HTML resource that the host renders in a sandboxed iframe, with `_meta.ui.csp` and a postMessage JSON-RPC bridge [V] | `@modelcontextprotocol/ext-apps` 2.0.4 is MIT; `@mcp-ui/client` 7.1.1 is Apache-2.0 [V] | Supported by Claude, VS Code Copilot, Goose and others [V] | This is model-made HTML in an iframe, so it is the (a) family. Starter template for Svelte exists [V] | Not for our pages. Useful later if an outside agent such as Claude should show a Strata view in chat. The CSP declaration idea (declared origins checked against behaviour) is worth copying for any iframe we ever allow |
| **OpenAI Apps SDK widgets** | MCP Apps plus `window.openai` extras. The widget is an iframe. The page says to treat `structuredContent` as untrusted and keep authoritative data on the server [V] | Spec pages, not a library | Current | Not a fit for rendering our own pages | Two rules worth keeping. Treat tool output as untrusted input, and keep the server as the source of truth for state |
| **Vercel AI SDK generative UI** | Tools return data and the app maps `tool-<name>` parts to components [V]. Package `ai` 7.0.176, Apache-2.0 [V] | Apache-2.0 | Very active | Examples are React only [V]. I could not confirm `streamUI` status from the page [U] | The idea that a tool result is typed data and the component is chosen by the app. We already do this with `etnos_*` tools |
| **Thesys C1 / OpenUI** | C1 was a hosted API that returns UI. docs.thesys.dev now redirects to openui.com, which presents "OpenUI Lang" and a gateway [V]. Licence for the SDK reads "see LICENSE.md" on npm [V] | Unclear | Product has been renamed | Svelte is listed as supported on the OpenUI page [V]. Hosted gateway is a dependency | Avoid. A hosted generator adds a vendor and a data path. The compact-language idea (fewer output tokens than JSON) is worth testing only if JSON proves too long |
| **CopilotKit** | Three modes. Controlled (agent picks registered components), declarative (A2UI) and open-ended (MCP Apps) [V] | MIT, 38.8k stars [V] | Active; `@copilotkit/react-core` 1.89.0 on 17 Nov [V] | Frontends listed are React, Angular, Vue and React Native, not Svelte [V] | The three-way naming is a good way to explain our choice. No code |
| **Adaptive Cards** (Microsoft) | Card JSON schema with host-config theming | MIT source, EULA for some binaries [V] | JavaScript renderer last released April 2026, many v1.6 features unimplemented, 861 open issues [V] | No Svelte renderer listed [V] | Host config (the host, not the author, decides fonts and colours) and the rule that unknown elements fall back |
| **Slack Block Kit** | Blocks array of JSON objects with a `type`, limit of 50 blocks per message, 100 in modals [V] | Types package MIT [V] | Mature | Not a UI target for us | Hard block-count limits, top-level `text` fallback for screen readers [V] |
| **Retool, Appsmith, Notion and Coda blocks** | App and page builders whose apps are stored as JSON documents | Retool proprietary; Appsmith Apache-2.0 [S]; Notion and Coda proprietary [S] | Mature | Not fetched today | Shape only: a page is an ordered tree of typed blocks with versioned history. No code to copy. All [U] on details |

Licence note for AGPL-3.0. Apache-2.0 and MIT code may be included in an AGPL project. Neither json-render nor A2UI is AGPL or unlicensed. The AGENTS.md rule about AGPL donor code does not block them. Record attribution if we vendor anything.

My recommendation for the spec itself.
- Own the spec and its zod schema. Reason: Strata bindings are queries with visibility rules, not a generic `$state` path, and a pre-1.0 package that releases several times a month is a poor base for stored data that must stay valid for years.
- Match the flat tree shape of json-render closely so a later move onto `@json-render/svelte` or an A2UI adapter stays cheap.
- Spike `@json-render/svelte` for half a day. If it renders our catalogue with our zod schemas and works under Cloudflare's build, use it for the renderer and keep our own schema and validation. If not, write a renderer of about 200 lines. Either path is small.

## 3. If Aksara wrote code (short)

The harness note (18 November) found that every Cloudflare route to run model-written code needs Workers Paid [V on Dynamic Workers: "currently available only on the Workers Paid plan"]. Dynamic Workers include 1,000 unique workers, 10 million requests and 30 million CPU ms a month, then $0.002 per worker per day and $0.02 per million CPU ms [V]. Codemode (`@cloudflare/codemode` 0.5.6, MIT [V]) needs the same loader.

For UI the extra problem is the page. Model-written Svelte must be compiled and then served either into the main page (unsafe) or into a sandboxed iframe on a separate origin, with a CSP that names allowed origins, and a postMessage bridge for data. That is the MCP Apps design [V]. It is sound, but it needs a build step per view, a second origin, and a bridge that enforces visibility. Our steward cannot read the result.

Position: keep this as phase 3 and Paid, as already decided. It should never be the way an ordinary community gets a feature.

## 4. Design sketch for composed views

### 4.1 Catalogue v1

Primitives map to components and data that exist today. File names are in `apps/web/src`.

| Primitive | Binds to | Exists today | Notes |
| --- | --- | --- | --- |
| `map` | Places in a context, optional quake layer | `PlaceMap.svelte`, `ExplorePlaces.svelte`; outlines come from the deployment's `site-map.json` | Props: context id, layers (list from an enum), zoom preset. No coordinates typed by the model |
| `timeline` | Reviewed wiki pages with period, filtered by context | `Timeline.svelte`, endpoint `/v1/wiki/timeline` | Props: context filter, bands subset |
| `post_list` | Posts in a community or context, filtered by labels | `PostCard.svelte`, feed queries | Props: labels (from the community's own label set), limit up to 20, sort. Labels are an enum read from the community at validation time |
| `event_list` with RSVP | Event posts, `event_responses` table | `PostCard.svelte` event part; table `event_responses` (going, interested) | Spec names the community and a time window. The RSVP write is the existing endpoint |
| `offer_board` | `offerings` table | `OfferingCard.svelte`, `OfferingCatalog.svelte` | Props: kind, place, status open only |
| `wiki_excerpt` | A wiki page id, first N sentences | `WikiExperience.svelte`, `WikiPlaces.svelte` | Server returns the current reviewed revision. A withdrawn page returns "removed" |
| `sources_panel` | The sources of a post or page | `SourcesPanel.svelte` | Always shown under Aksara-written text blocks |
| `poll` | A poll post, `poll_votes` table | Poll in `PostCard.svelte` | Spec names the post; creating the poll is a normal post action |
| `signup_form` | New: `view_forms` and `view_form_entries` | None | Fields from an enum of types (name, text, choice, number), capped at 8. Entries visible to stewards only. Needs a privacy line. Phase 2 |
| `counter` | A count query from an enum (members, posts this week, pages in a context) | Part of the stats on community pages | Props: which count, label text. The number is computed, never typed |
| `word_card` | Words in a language context; word of the day is chosen by a deterministic rule | New, builds on the language room design in the showcase plan, section 7 | Needs a word source. Without one it is an empty state |
| `gallery` | Strata media ids already attached to the community | `PostMedia.svelte` | Ids are checked for community ownership and visibility at render |
| `text` | Short authored text, plain or restricted markdown through the existing `markdown.ts` | `PostText.svelte` | Hard cap, no HTML, links only to internal routes or https URLs shown with their host |
| `section`, `columns`, `tabs` | Layout | shadcn `tabs`, `card` | Max depth 3. Max 40 elements per view |

### 4.2 Spec format

A flat tree, versioned, small.

```json
{
  "v": 1,
  "catalogue": "2026-12",
  "root": "page",
  "elements": {
    "page":  { "type": "section", "props": {"title": "Festival Danau Sentani"}, "children": ["sched", "join"] },
    "sched": { "type": "event_list", "props": {"window": "next_30_days", "labels": ["festival"], "limit": 10} },
    "join":  { "type": "signup_form", "props": {"title": "Daftar jadi relawan", "fields": [{"key":"nama","kind":"text","label":"Nama"}]} }
  }
}
```

Rules enforced by zod on the server, and again when the client renders.
- Unknown element types, unknown props and extra keys are errors (`strict`).
- All strings have length caps. All lists have count caps. All ids are validated against the current community.
- No `html`, `style`, `script`, `src` or free `href` field exists anywhere.
- The spec is stored and compared by a hash of its canonical form.
- The catalogue version is recorded so an old view can be migrated or shown with a notice.

### 4.3 Storage

Two tables, modelled on `wiki_proposals`, `wiki_revisions` and `desk_drafts`.

| Table | Key fields |
| --- | --- |
| `views` | id, community_id or context_id (one of), slug, title, state (`draft`, `proposed`, `live`, `withdrawn`), live_revision, created |
| `view_revisions` | view_id, revision, spec (JSON), spec_hash, catalogue_version, author_id (Aksara agent or a person), mandate_id for agent authors, request_text (the steward's words), model, checks (JSON of validation results), approver_id, approved_at, note |

Revisions are append-only. Rollback means making a new revision that points to an older spec, so the history stays honest. The live pointer moves only through the approval path. A withdrawn view stops rendering at once and shows a short notice to stewards.

### 4.4 Flow

1. A steward writes in plain Indonesian: "Kami mau halaman untuk festival. Ada jadwal dan pendaftaran relawan."
2. Aksara reads the catalogue (generated from the zod schema) and the community's facts (labels, context, available data). She returns a spec through a new tool, `etnos_propose_view`, in the style of `etnos_propose_page` in `src/agent-mcp.ts`.
3. The server validates, runs a dry render of every binding as the requesting steward, and stores a `proposed` revision. Checks and a plain list ("Menampilkan: 10 acara dalam 30 hari; formulir dengan 1 kolom") are stored with it.
4. The steward sees a preview in the real page, with a banner. They can edit text, remove elements, or ask Aksara to change it.
5. A steward approves. Approval re-validates against the current catalogue, re-checks the author mandate, and writes the audit row. Publication is atomic with its audit and outbox intent, as AGENTS.md requires.
6. Withdrawal is one click by any steward and takes effect on the next request. Rollback creates a new revision.

Authority. The agent needs the community's automation flag (`automation` is checked in `src/agent-access.ts`) and a mandate with a new purpose, for example `compose_view`, which allows drafting only. It cannot approve. This mirrors the existing editorial mandate path.

### 4.5 Data bindings and visibility

- The spec contains parameters, never data. The page asks one endpoint, for example `GET /v1/views/:id/data`, which runs each primitive's resolver with the viewer's identity.
- Each resolver reuses the existing read functions (`Forum`, `Wiki`, offerings, search) and therefore the existing access checks. There is no second permission system.
- Two viewers of one view can see different rows. Responses are not shared in a cache across viewers unless the whole view is public-only and no element is viewer-specific.
- A binding to anything outside the view's own community or its public data is rejected at validation, and again at render.
- Withdrawn or hidden records vanish at render time because the resolver joins to the record's current state. A test must cover this.
- Text inside a view (titles, captions) is authored content and goes through the same redaction as posts when stored.
- Private rooms never feed a public view. A view on a private community is visible only to its members, by the community's own check.

### 4.6 How a deployment adds its own primitive

A primitive is four files in the repo: a zod props schema, a server resolver, a Svelte component and a test. It is registered in one catalogue list and the catalogue version is bumped. It goes through normal code review. ETNOS's Papua-specific primitives (for example a customary-region badge, a language map) live in the ETNOS deployment's catalogue file, and the engine ships only the generic ones. Aksara sees only the catalogue of the deployment she runs in.

### 4.7 Tests required

AGENTS.md asks for isolation, withdrawal, concurrency and durable publication tests. For this feature.

- Access isolation. A non-member sees no rows from a private community through any primitive. A view cannot name another community's ids.
- Withdrawal. Withdrawing a post, wiki revision, media item or the view itself removes it from rendered output on the next request.
- Publication boundary. An agent without a mandate cannot create a revision. An agent cannot approve. A `proposed` revision is never served to the public.
- Concurrency and replay. Two approvals in a row leave one live revision. A repeated `etnos_propose_view` with the same request key does not create a second revision.
- Schema safety. Fuzz the validator with HTML, script strings, javascript: URLs, oversize lists and deep trees.
- Injection. A post that tells Aksara to add a link or primitive does not change the spec outside the steward's request (checked by the evaluation set below).
- Accessibility. Each primitive gets an automated axe check and a keyboard test.
- Evaluation set. About 30 plain-Indonesian requests with the expected primitive lists, run against Gemma 4 26B and a Gemini free model. Record the validity rate on first try and after one repair round.

## 5. Effort

Estimates are working days for one developer who knows the repo. They are my estimates [S], not measured.

| Slice | Contents | Days |
| --- | --- | --- |
| Showcase slice | `views` and `view_revisions` tables; zod catalogue with 8 primitives (`section`, `text`, `post_list`, `event_list`, `map`, `timeline`, `wiki_excerpt`, `sources_panel`); renderer; data endpoint with viewer-checked resolvers; `etnos_propose_view`; preview and approve UI for stewards; withdrawal; tests for isolation, withdrawal and publication; one approved view on one community page | 8 to 10 |
| Showcase extras | `poll`, `offer_board`, `counter` (existing data, thin wrappers) | 2 to 3 |
| Fuller version | `signup_form` with privacy handling; `word_card` and its data source; `gallery`; revision diff UI; rollback; deployment catalogue file and docs; evaluation set and repair loop tuning; accessibility audits; migration of old catalogue versions; ETNOS-specific primitives | 25 to 30 |
| Spike | `@json-render/svelte` against our schema | 0.5 |

The showcase plan already asks for a lot before the 26 to 27 November proposal upload and the 18 to 19 December showcase. This feature should be a decision for after the proposal. The proposal can describe it as a roadmap item with a mock preview.

## 6. Honest verdict

**Is "coding agent" the right frame.** No, for this product. A coding agent suits a developer who can read what it wrote. A steward in a Papuan community cannot, and should not have to. On Free the daily model budget allows a handful of long coding tasks a day [per the harness note], and nothing can execute the output without Paid. The frame also moves trust from reviewed components to model output.

**Is "composer" better.** Yes. It reuses what we already built and review. Components stay hand-made, accessible and in Indonesian. The agent does the part that is hard for stewards, which is knowing what exists and putting it in order. It costs about 40 neurons for one draft, which is cheap even on the free tier.

**What the owner's real instinct gets right.** ETNOS will need more tailor-made features, and hand-building each one does not scale. The answer is to turn each hand-built feature into a catalogue primitive once, so the next community gets it by asking. Shipping primitives is the owner's idea, and it is the correct one.

**What is doable on Workers Free with Gemma 4 or a Gemini free key.**
- One-round drafting from a menu of 8 to 14 primitives. Estimated 2,000 input and 800 output tokens, about 40 neurons (9,091 per million input and 27,273 per million output, from the harness note). With a repair round, about 120.
- Workers AI JSON Mode lists Llama and Hermes models, not Gemma 4 [V]. It also does not guarantee schema compliance and does not stream [V]. So rely on a short catalogue prompt, zod validation and one repair round, and measure first-try validity on the evaluation set.
- If Gemma 4 proves weak, a template-first mode is available. The model picks one of about six named layouts and fills a few slots. This is less flexible and more reliable.
- A cap of about 10 drafts a day for the whole site keeps this under 5 percent of the daily budget.
- Rendering costs no model neurons. Reads count against the shared 5 million daily row reads, so resolvers need row caps.

**What to show at the 18-19 December showcase.**
- A steward types a request in Indonesian on a community page. Aksara drafts a view. A preview appears with the list of what it shows. The steward approves. The page changes.
- Then the same page for a viewer who is not a member, showing that private data is not there, and one withdrawal that removes an element at once.
- Say plainly that Aksara does not write code, and that every component was reviewed by people.
- If time is short, show a recorded mock and a hand-written spec rendered by the real renderer. Do not show a live model draft unless the evaluation set has passed.

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Gemma 4 returns invalid or odd specs | zod validation, one repair round, template-first fallback, evaluation set, steward preview before anything is live |
| Catalogue grows into a second UI framework | Cap element count and depth. Add primitives only when two communities want them |
| Steward approves without reading | Plain-language summary of what the view shows and which queries it runs, shown before the approve button |
| Sign-up form collects personal data | Steward-only entries, a visible privacy line, retention limit, deletion on request. Legal check of Indonesian data protection rules is [U] and not done here |
| Spec outlives its catalogue | Versioned catalogue, migration functions, unknown elements render a notice |
| Pre-1.0 dependency churn (json-render, A2UI) | Own the schema, borrow the shape, pin versions if a renderer is adopted |
| Time before showcase | Treat as post-proposal work. The feature must not delay the items already promised |

## 8. Open questions for the owner

1. Should this wait until after the 26 to 27 November proposal upload and appear there only as a roadmap item with a mock?
2. Who approves a view on a community page, any steward or the community owner only?
3. May a sign-up form collect names and phone numbers in the pilot, and who holds the entries?
4. Should the first live view be on a festival community, a region page or a language room?
5. Is a template-first mode acceptable if Gemma 4 cannot produce valid specs reliably?
6. Should views be allowed on public pages for anonymous visitors, or only for logged-in members at first?
7. Do we want outside agents (for example Claude through MCP Apps) to be able to show a Strata view in chat later?

## Sources (accessed 18 November 2026)

| Title | URL | Notes |
| --- | --- | --- |
| A2UI repository (google/A2UI) | https://github.com/google/A2UI | Read. Apache-2.0, 17.6k stars, v1.0 spec |
| A2UI site | https://a2ui.org/ | Read. Catalogue, community renderers incl. Svelte |
| json-render repository (vercel-labs) | https://github.com/vercel-labs/json-render | Read. Apache-2.0, about 19.8k stars, Svelte 5 package listed |
| json-render docs | https://json-render.dev/docs | Read. Flat spec, `$state`, JSONL patches. Licence and versions not on this page |
| npm registry, `@json-render/svelte`, `@json-render/core`, `@a2ui/web_core`, `ai`, `@mcp-ui/client`, `@modelcontextprotocol/ext-apps`, `@thesysai/genui-sdk`, `@copilotkit/react-core`, `adaptivecards`, `@slack/types`, `@cloudflare/codemode` | https://registry.npmjs.org/ (package names as listed) | Versions, dates and licences read via the registry API |
| MCP Apps overview | https://modelcontextprotocol.io/extensions/apps/overview | Read |
| OpenAI Apps SDK, build a ChatGPT UI | https://developers.openai.com/apps-sdk/build/chatgpt-ui | Read |
| AI SDK, generative user interfaces | https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces | Read. Does not mention `streamUI` or Svelte |
| Thesys docs, redirected | https://docs.thesys.dev/ then https://www.openui.com/docs?from=c1 | Redirect followed. Page does not mention C1, licence or pricing |
| CopilotKit repository | https://github.com/CopilotKit/CopilotKit | Read. MIT, 38.8k stars |
| Adaptive Cards repository | https://github.com/microsoft/AdaptiveCards | Read |
| Slack Block Kit | https://docs.slack.dev/block-kit/ | Read |
| Cloudflare Dynamic Workers pricing | https://developers.cloudflare.com/dynamic-workers/pricing/ | Read. Paid only |
| Cloudflare Workers AI JSON Mode | https://developers.cloudflare.com/workers-ai/features/json-mode/ | Read. Gemma 4 not listed |
| Local | docs/research/aksara-workers-harness-2026-11-18.md; docs/plan/showcase-plan-2026-11-17.md; AGENTS.md; src/agent-mcp.ts, src/agent-access.ts, src/schema.ts, src/desk.ts; apps/web/src components named in section 4 | Read in the repo |

Not fetched: Retool, Appsmith, Notion and Coda documentation (marked [S] or [U] above); Workers AI neuron prices were taken from the 18 November harness note.
