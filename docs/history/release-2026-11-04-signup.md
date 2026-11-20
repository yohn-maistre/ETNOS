# Open Bluesky signup release

Deployed to **https://etnos.space** on **4 November 2026 at 16:00:10.340529 UTC** (23:00 Bangkok), 100% traffic.

| Item | Receipt |
| --- | --- |
| Engine runtime source | `bfa708b7bae1683aaa0a41690e5b412386b235c7` |
| UI runtime source | `327aeb3ddd4787af627b678138c3c8a6c89ae4eb` |
| Worker version | `2497d144-11ab-497b-ab0d-eb21c89393fc` |
| Deployment | `6120bf15-8227-4db5-985e-2fa2a37cf50b` |
| Worker module bytes | 3,773,603 |
| Worker module SHA-256 | `21eb4edf263157b468e40db4a4bc6f82827ade42db63e89403f7634d684a338e` |
| Static assets | 75 files, 3,058,314 bytes |
| Schema | 19; one added enrollment-invitation table |
| Preserved namespace | `2b28195b06644e77bc380c8d41b65ce6`, class `StrataNode`, logical node `preview` |

The owner selected open signup through Bluesky. The actual provider-owned OAuth UI now replaces the generic outbound Bluesky link. Existing identities can enroll through the same continuation. A verified callback creates an ETNOS human session, with zero automatic community memberships. [Implementation and policy contract](../accounts-and-hosting/signup-2026-11-04.md).

`STRATA_ENROLLMENT_MODE=open` and `STRATA_CLIENT_NAME=ETNOS` are explicit. Compatibility date `2026-10-23`, `nodejs_compat`, existing OAuth/sealing secrets, ASSETS/AI/WATCH_NEWS bindings, canonical origin, existing DO namespace and disabled AT publishing remain. Live settings confirm preservation. Observability/logpush remains disabled under the incumbent privacy choice. No account migration, PDS, domain-handle mutation, service provisioning or billing change occurred.

## Validation

- Core TypeScript and Worker type checks pass; **103 core tests pass**.
- Actual-workerd SQLite/rollback/isolation/restart contract passes with provider-started signup; the minified Worker compilation also passes that contract. The production bundle excludes `TestNode` and its provisioning methods.
- UI Svelte check: zero errors/warnings; **9 UI unit checks**; production build.
- **All 16 browser journeys pass** against the production UI build with isolated synthetic data. The new journey uses the actual BrowserAuth/official SDK with a synthetic provider and verifies signup return, existing login, zero memberships, four widths, pixel sand, reduced motion and keyboard refresh. The final copy-only cleanup was followed by another check/build and the signup journey.
- Live Chromium: new signup shows no handle/invite input at 390/1440px. The button reaches the real `https://bsky.social/oauth/authorize` page offering **Create a new account**, **Sign in**, and **Cancel**. Cancellation returns through the real ETNOS callback to its retry screen, without enrollment. No real Bluesky account was created. This provider-entry/cancellation check ran on the initial signup deployment; the final patch only aligns the health-policy diagnostic.
- Final deployment: `/health` reports `atproto-oauth` and enrollment `open`; `/auth/options` reports Bluesky/open; capabilities report remote signup true and hosted accounts false; OAuth metadata names ETNOS and requests only `atproto`. Five public routes return 200, anonymous `/auth/me` remains empty, and anonymous MCP still lists eight tools and reads the public feed.

Real new-account creation, CAPTCHA, email and recovery still need a consenting newcomer's trial at the actual provider. Automated full-return evidence uses a simulated provider; it is not represented as a real person having signed up. Protected cultural content was never seeded or traversed live. Existing upstream crypto/bundler annotations and large UI entry/editor chunk notices remain; no performance/security certification is implied.

## Recovery

Schema-19-compatible, registration-closed version **`54a82b05-9ef3-4bab-8e81-a91f9f32b330`** was uploaded before activation and is available as a fallback, preserving the previous topic UI assets. It uses the initial signup engine `70e5167`, keeps the same keys/namespace and sets enrollment to `closed`. It was not activated during this release. Prefer a current-code deployment with enrollment `closed` when merely pausing new registrations.

**Do not roll back to schema-18 code after schema 19 has initialized.** The migration guard correctly rejects a newer database. A Worker rollback does not undo local data or provider-created identities. Preserve source/keys/data and reconcile provider outcomes; do not retry account creation automatically.

UI implementation and synthetic screenshots: [Honai delivery](https://github.com/yohn-maistre/honai-metro/blob/feat/strata-connected/docs/strata/signup-and-sandpile-2026-11-04.md).
