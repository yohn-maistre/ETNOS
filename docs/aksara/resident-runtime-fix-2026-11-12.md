# Hosted steward repair — 12 November 2026

The owner’s first hosted source digest stopped with “Model unavailable or invalid output; a new job requires an explicit request”, labelled Pi Durable · WPW AI Gateway. It produced no demonstrated public result. That failed run is the live receipt; local synthetic runs must not replace it.

## Reproduced defect and repair

Pi’s generic OpenAI adapter discarded Gemini `extra_content.google.thought_signature` between a provider tool call and the next request. An actual workerd/native-harness test reproduces a signed source-read tool call and requires the original signature on continuation. The repair retains the exact provider-issued metadata in private job-scoped runtime storage and restores it only for the same call ID, name and canonical arguments. It bounds size/count and refuses changed calls. It never fabricates signatures or uses a validator bypass. Official references: [Google thought signatures](https://aistudio.google.com/docs/thought-signatures), [OpenAI compatibility](https://aistudio.google.com/docs/openai).

This is a verified compatibility defect, not a conclusive diagnosis of that historical live request. Shared gateway metadata showed both accepted and rejected provider requests, but lacked correlation/payload evidence. We did not collect prompts, expose credentials, enable logs globally or replay the failed job.

Fixed operational codes now survive service/RPC boundaries. Studio gives Indonesian explanations for provider quota, transport, configuration, output, current-authority and runtime limits; optional technical detail contains only a fixed code. Untrusted provider bodies never reach the UI. Active job status refresh is bounded and does not reset an edited configuration. A manual Run racing the automatic alarm loads the current job state without re-executing it or displaying a generic data-conflict banner.

Existing authorizations, source read-sets, inference reservations, configured model routes and job/effect fences remain. The Pi storage tables are additive, scoped to the existing session namespace; forum schema remains 27. No paid service, fallback model or new namespace is introduced.

## Qualification

All 145 engine tests pass, including actual optional CPU clustering. Engine/Worker/Pi typechecks, native Pi tests, actual workerd signed-tool replay/quota/budget tests, forum Worker and same-origin web checks pass. Svelte reports zero errors/warnings; production UI build passes. The real-engine browser journey uses a clearly synthetic provider and verifies readable quota failure, stale Run reconciliation without retry, question-to-child reply and private-room exclusion with no page errors.

A fresh owner-authorized hosted task is still required after deployment. Inspect its exact state, model label and result; do not automatically retry the old failed/uncertain request. A successful transport alone does not qualify citation quality.

## Current marathon endpoint

The owner selected continuing through the **sourced public knowledge observatory**, then taking a break. Finish daily proactive policy, reviewed poll proposals/follow-through and attributed public relations over current Wiki/source primitives. Keep the broader 72-feature foundation and later private Aksara Node/language/AT work in the plan. Studio’s later Impeccable polish is retained; this repair only addresses operational clarity.

Deployment receipt will be appended after exact bundle and live checks.
