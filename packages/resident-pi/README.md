# Optional Strata resident: Pi Durable

The resident uses one registered agent identity with isolated community/thread/epoch conversations and bounded specialist helpers. It does not replace independent Aksara Core, an institutional Library, private source custody or device authority. This package is optional; ordinary Strata reading/posting/source discovery works without it or an LLM.

Strata grants a short-lived work capability tied to a durable job generation, current source evidence, operator, agent and public community. Pi calls the private `ResidentAuthority` service before inference and tool reads. Strata owns budgets, current authorization and final atomic publication. Revocation, cancellation, changed evidence/context or exhausted budget causes abstention. The model port carries no provider secrets; a private WPW entrypoint reuses the operator's configured AI Gateway routes. Provider/model selection and credentials are not accepted from posts or tool prompts.

`src/extensions.ts` supplies current-source reads and a bounded research helper. Helpers share the parent budget and cannot publish independently. Compaction happens in the foreground through the same budget/authority port. A changed community epoch selects a fresh durable context, including after corrected/deleted/moderated posts and accepted Wiki revisions. Public resident code has no private-room tool or permission inheritance from institutional membership.

## Local qualification

From this directory, after root and package lockfile installs:

```
npm ci --ignore-scripts
npm run check
npm test
npm run test:worker
```

Exact package versions are in `package.json` and the lockfile. Wrangler resolves through the repository's pinned installation. Compatibility date **2026-10-23** deliberately matches the already tested Strata engine/workerd pin; Pi's required SQLite/Lifecycle/model/tool behavior passes at this date. An arbitrary newer date initially exceeded the installed runtime's support. No root toolchain upgrade or Linux Container service is needed for these native tests.

Two tests use actual Pi model/tool/helper loops with synthetic provider responses. The workerd test uses actual named Worker entrypoints, a SQLite Durable Object and Strata's authority through a synthetic configured model service. It confirms publication once and refusal of a forged work ticket. These tests do not prove a live hosted model call or account capacity.

## Deployment boundary

Default fetch returns 404; only the explicitly bound `ResidentRuntime` entrypoint accepts work. `wrangler.jsonc` binds the session DO, Strata authority and WPW model bridge. Qualify and deploy those named exports in an appropriate bootstrap order before enabling the resident; a dry-run can bundle code despite missing remote services. Keep existing persistent namespaces, back up and verify restore before schema migration, and record the exact release manifest. Do not use a temporary unauthenticated deployment to bypass access to the existing ETNOS account.

Studio config and grants are required separately. Hosted inference, scoped mentions and the wider foundation remain tracked in `../../docs/implementation-checkpoint-2026-11-11.md`. Current runtime is public-source only. Automatic Wiki acceptance, protected cultural-source access and official institutional representation are not agent defaults.
