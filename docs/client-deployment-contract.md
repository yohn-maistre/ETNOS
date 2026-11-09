# Engine, clients and deployment profiles

1 November 2026 · Alpha contract, not a stable third-party SDK

## Current separation

Strata (`yohn-maistre/strata`) owns policy, storage, transactional posts/outbox, API, OAuth/session and deployment adapters. Honai (`yohn-maistre/honai-metro`, `apps/strata`) owns the Svelte client. The selected preview builds Honai's static assets and bundles them with the Worker for a convenient same-origin application. The engine does not depend on Svelte, shadcn or Honai component code.

There are already two Worker entry points:

| Profile | Config / entry | UI behavior |
| --- | --- | --- |
| Engine API | `wrangler.jsonc` / `src/worker.ts` | No static client binding required |
| Integrated app | `wrangler.web.jsonc` / `src/web-worker.ts` | Same engine plus static Honai assets / SPA routing |
| Local development | `src/http.ts` and CLI, Node SQLite | Loopback developer API; not a production browser-auth server |

**Do not deploy both example configs unchanged.** They currently share the preview Worker name/node. A third-party deployment must choose its own name, logical node, bindings, steward DID, origin and secrets. Switching entry points blindly would overwrite the current hosted UI. We need neutral, validated starter templates before calling this a one-command public installer.

## Supported alpha hosting pattern

A deployer can build any client, host those assets on their chosen platform, and reverse-proxy `/v1`, `/auth` and OAuth metadata/callback to the engine under **one public origin**. Alternatively the integrated Worker serves the client directly. No browser credential or private node secret is baked into frontend assets. Share a canonical origin for sessions and content/media URLs. This preserves the present exact-Origin/Host, HttpOnly/Secure/SameSite cookies and CSRF boundary.

A separate *repository* or static build is already supported. A separately hosted client calling a different engine origin is **not currently supported merely by setting a base URL**: there is no general CORS credential policy or third-party app enrollment. Do not solve it with wildcard credentialed CORS, tokens in localStorage, removing CSRF, or forwarding the user's session to arbitrary clients. A genuinely independent native/mobile/third-party web client needs a documented OAuth client/scoped API capability model, revocation and tests. AT login to a different app does not confer local Strata rights.

## Contract to stabilize

- Versioned route/input/response schemas and generated OpenAPI/typed client, including errors, Unicode/size limits, pagination and idempotency keys.
- `GET /v1/capabilities` to hide unavailable features; UI must not imply remote signup, live federation or agent interop solely because a draft schema exists.
- Authentication adapters independent of presentation; current production principal rejects local developer bearer shortcuts.
- Reads/projected identifiers checked against current policy. Search and activity are not permission-free database views. Media remains authorized at fetch.
- Mutations keep business state, audit and outbox intent atomic. Clients receive durable states and reconcile uncertain outcomes, rather than blindly replaying a post.
- Local follows and private bookmarks are caller-owned preferences; clients must not expose them as public AT graph data.
- Media upload and future object-store ports separate from component rendering. Binary objects need ownership, quotas, expiry and export/restore manifests.
- News and agent providers are optional ports with independent costs/credentials; their absence cannot prevent ordinary conversation.
- Backend contract tests for any client; built-browser end-to-end tests for each shipped client. Current handwritten Honai types are not the same as a generated stable SDK.

A default beautiful client helps deployments start; it should not be a mandatory engine dependency. PyFedi's integrated application and Lemmy's separate clients are both reasonable packaging precedents. Our practical alpha choice is integrated same-origin hosting with separate source/builds, plus an explicitly documented engine-only profile. This is not yet compatibility with Photon/Lemmy clients: those speak Lemmy's API and semantics, which Strata does not implement.

## What Strata brings, without uniqueness claims

| Reference | Established strengths | Strata's intended emphasis / current tradeoff |
| --- | --- | --- |
| PyFedi/PieFed | Mature forum, community/topic and moderation workflows; ActivityPub interoperability | Local controlled communities, explicit human/agent mandates and a reviewed knowledge/work path, on a lightweight Worker runtime. Much moderation/discovery/ops maturity and ActivityPub federation remain missing here |
| Bluesky / AT clients | AT identity/repos, public records, portable account identity, large existing social infrastructure | Community-controlled local conversation and access rather than treating all repo data as the private forum. We currently use AT OAuth; live public record delivery/ingestion and PDS operations remain separate work |
| General Fediverse forums | Open federation, independent operators and community discussion | A deliberate place/language/institution context model, optional Aksara as persistent participant, and a governed path from discussion to reviewed knowledge. These ideas are not exclusive inventions |

The value to test with twenty friends is whether those pieces work together simply: conversation that is enjoyable before AI is online; access that stays under community control; knowledge that keeps attribution and review; and institutional agents whose powers have a visible limit. AT, serverless, encryption and AI are implementation choices with limits, not proof of social value or security.
