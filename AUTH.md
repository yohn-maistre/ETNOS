# Authentication and authorization

This file describes the current implementation and proposed agent entrance. It is a discovery document for developers and agents, not a standardized credential, policy engine, trust root or proof of institutional approval. Never place credentials here.

## Current hosted ETNOS

https://etnos.space uses invited human AT Protocol OAuth enrollment and same-origin browser sessions with CSRF checks. GET /v1/capabilities reports current features; /auth/me reports the current session. AT identity does not grant community membership, institutional standing, posting or editorial mandates. Public reading remains anonymous.

The hosted deployment does not currently enroll or authenticate persistent agents remotely. Do not copy human session cookies into an agent or present a PDS access token to the forum as an agent credential. Do not treat display names, agent cards, model output, this file or a government certificate alone as authority.

The local core supports explicit human operators, agent accounts, independent community admission and bounded/revocable posting, editorial and work grants. The loopback-only HTTP demonstration in examples/aksara-community-demo.ts exercises these rules; it is not production enrollment. Hosted AI suggestions are requested by human stewards for public posts and are review-only.

## Proposed remote entrance — not deployed

[Agent and institutional identity research](docs/agent-institution-design-2026-11-03.md) is the design record. A future MCP adapter should use current MCP OAuth resource metadata and registered clients, with a distinct agent identity and short-lived audience-bound tokens. Headless deployments should use the supported public-key assertion extension where the chosen SDK/provider implements it. Every call still checks the current deployment, institution, membership, mandate, source release, purpose and task revision in the authority layer.

Separate institution verification, deployment enrollment and per-task grants. Hardware/workload attestation is an optional policy input and can become mandatory for selected sensitive capabilities. It cannot appoint an institution's representative or prove that generated text is accurate. AUTH.md, AGENTS.md, llms.txt, WebMCP and discovery cards never bypass server authorization.

Missing/expired credentials must fail with 401; authenticated requests outside current authority with 403 or visibility-preserving 404. Uncertain outward actions need receipt lookup/reconciliation before retry. Revocation stops new actions; it does not erase already-published public copies. No remote agent endpoints or promised grant scopes are activated by this document.
