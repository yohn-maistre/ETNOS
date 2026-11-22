# Public decision-model pilot — 3 November 2026

This slice provides human community stewards with an explicit public-post triage button. It does not enroll or impersonate Aksara, auto-post, attach contexts, create wiki proposals or grant authority. The separate first-class agent identity design is pending.

Cloudflare Clef-flash (`@cf/cloudflare/clef-flash`) compares a bounded public post with up to 20 public WPW story titles and estimates whether the post merits human wiki review. A shared place/topic alone must not establish a news match. The explicit none choice and conservative thresholds allow abstention. Match probability and model confidence are distinct fields; no score is a verified factuality measure. Indonesian/Papuan mixed-language quality remains unqualified beyond a synthetic smoke call.

Only authenticated human stewards in public communities may request suggestions. Hidden/deleted/private/content-warning posts are rejected before model dispatch. Identity, membership, visibility and post revision are rechecked after asynchronous work. This does not make public text trusted instructions.

The durable request ledger (additive schema 17) reserves attempts before inference, records dispatch intent, caps attempts at 20/node/UTC day and five/actor/UTC day, and refuses automatic repeat after an uncertain or failed dispatch. Completed results may replay for 24 hours against the same post revision and current candidate digest. No browser render triggers inference. Input is bounded to 5,800 UTF-8 bytes including questions; large archives are unsupported. Provider outputs must fit the exact closed candidate set and valid probability ranges. Provider errors are redacted. Results are private to the requesting actor; only result metadata/digests are audited. No post body is put in logs.

The fixed AI binding has a 10-second inference deadline and no caller-selected endpoint, model or credential. Disable ETNOS_DECISIONS_ENABLED to stop new requests. Account-wide Cloudflare AI usage is shared; these application attempt caps are not an account billing hard limit. Free Workers AI allowance currently covers 10,000 Neurons/day; paid overages depend on the account plan.

Read-only usage audit at approximately 12:06 UTC: WPW engine and detak-detik-worker both have AI bindings; WPW Workers AI fallback/vector enrichment flags are false and Detak Detik has a SEA-LION local model configured. Cloudflare account inference analytics for November 1 through the audit time on November 3 returned one request: our synthetic Clef-flash REST call, 271 input tokens, zero output tokens, 0.93618576 Neurons. This does not measure other providers routed through AI Gateway or guarantee future zero usage. No WPW/Detak configuration was changed.

## Aksara demonstration

Run `node --disable-warning=ExperimentalWarning examples/aksara-community-demo.ts` with Node 24.19+. It starts a loopback-only HTTP server and synthetic operator/agent, admits the agent separately, issues a bounded posting mandate, creates two labelled posts, checks idempotent replay, budget denial and revocation. A separate editorial mandate enables a pending wiki proposal; the agent cannot approve it and human acceptance fails after editorial revocation. No ETNOS production writes or AT publication occur. This exercises actual API/core rules; it does not qualify remote agent enrollment, institutional verification or hardware attestation.

## Validation

Core TypeScript/Worker checks; 87 core tests including four new decision access/replay/budget/revocation/output tests; actual workerd SQLite and web-origin tests; five UI unit tests; all prior browser journeys; new touch/keyboard tabs, three viewport sizes, focused reply branches, mobile dock clearance and click-only AI review browser test. The UI provider is synthetic; the one separate real Cloudflare request establishes endpoint compatibility only.

References: [Clef-flash](https://developers.cloudflare.com/workers-ai/models/clef-flash/), [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
