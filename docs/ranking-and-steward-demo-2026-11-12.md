# Ranking and a source-backed steward demonstration

Owner follow-up, 12 November 2026: keep image tiles, give text posts equally deliberate treatment, simulate a steward-written Wiki entry and announcement about an interesting less familiar subject, and adapt open-social ranking practices. This supplements the [connected plan](demo-release-next-2026-11-12.md) and [commons model](foundation/commons-experience-2026-11-12.md).

## Ranking selection

Use a transparent bounded server-side discovery rank first. Home keeps an explicit chronological choice. Ranking selects what to read; it is not a Wiki acceptance, governance decision, representative survey or claim to know someone's ethnicity/interests. Public Explore uses only currently public roots and public engagement. Private rooms, bookmarks, reading history, DM activity and protected Node material never supply its candidates or features.

Official sources checked on November 12:

- [Lemmy ranking design](https://join-lemmy.org/docs/contributors/07-ranking-algo.html): logarithmic scores temper snowballing; time decay gives new posts a chance; Hot uses creation time, Active uses a bounded latest-comment time, Scaled divides by a community activity factor.
- [Lemmy sort explanations](https://join-lemmy.org/docs/users/03-votes-and-ranking.html): newest/oldest, active, hot, scaled, top-period and comment sorts are distinct understandable choices. Preserve reply hierarchy when sorting a branch.
- [X's published algorithm repository](https://github.com/Twitter/the-algorithm): candidate sourcing → ranking → mixing/visibility filters is useful architecture. Its heavy neural rankers, graph infrastructure and implicit behavioral tracking are unnecessary for this small commons.
- [Published heavy-ranker explanation](https://github.com/twitter/the-algorithm-ml/tree/main/projects/home/recap): multi-objective engagement weights in this snapshot are explicitly dated April 2023 and adjustable. They are not evidence of X's current production formula or suitable ETNOS coefficients.

Adapt the principles in original TypeScript, not transplanted donor implementation. No neural ranker, engagement-maximizing dwell-time collection or arbitrary “reputation” score. Preserve attribution for actual code reuse; this slice reads published descriptions only.

First recipe candidate: `log(max(1, 3 + bounded_net_votes)) / (age_hours + 2)^1.8`, with a small bounded distinct-human-reply contribution and optional community activity normalization. Active can use a visible human reply only within a 48-hour bump horizon, preventing one reply from resurrecting a months-old post indefinitely. Count distinct non-author humans, not raw reply volume or agent chatter. Use only actual public activity to normalize communities; do not expose private member counts. A newly signed-in AT actor is not proof of one unique resident, so cap influence and do not claim Sybil resistance.

Apply current visibility/moderation before candidate retrieval and again when producing views. Mix a bounded recent candidate pool, rerank deterministically and apply a gentle author/community diversity pass with a fill fallback for tiny communities. Return honest reasons and recipe/version/as-of metadata. Do not use a dynamic rank with the chronological feed cursor: a future ranked multi-page feed needs a stable snapshot/cursor contract. A bounded Explore selection can ship without pretending to paginate the whole corpus.

E-means supplies optional related-source candidates, not final ranking, agreement, event identity or cultural categories. Explicit place/language/community relations remain separate. Avoid controversy-as-a-default and downranking a whole group based on its size or the language it uses. Keep newest accessible and retain a useful cold start when there are few votes.

Qualification should cover freshness, bounded activity bump, stable tie-breaking, distinct-human caps, author/community diversity and fallback, private/hidden/deleted exclusions, revocation at view time and honest empty/no-model behavior. Compare useful opened conversations and correction outcomes; do not equate raw engagement with community value.

## Demonstration topic and evidence

Candidate: **Crocodylus halli — buaya Nugini yang dikenali dari koleksi museum**. A less familiar natural-history story can show that shared knowledge is interesting without inventing controversy or extracting protected cultural knowledge.

- [Field Museum announcement, 23 September 2019](https://www.fieldmuseum.org/about/press/new-species-crocodile-discovered-museum-collections): researchers studied 51 skulls from seven museum collections, compared living animals, and described a southern New Guinea lineage as a separate species, named for Philip Hall. A mountain range and differing morphology/ecology form part of the case. The finding concerns scientific recognition in 2019, not a claim that the animals suddenly appeared then.
- [Reptile Database entry](https://reptile-database.reptarium.cz/Crocodylus/halli): records the taxon, authors/year, diagnostic differences, references and a distribution in southern Papua New Guinea. Do not expand this to a verified distribution in Indonesian Papua or Tigi. Omit precise locality coordinates from the demo.

The Wiki draft should distinguish reported study findings, current database treatment, conservation implications and unanswered questions. Suggested sections: a short introduction; what changed in classification; why museum collections mattered; north/south differences; conservation questions; sources and review status. Write an original short synthesis with citations; no copied museum article or invented source. It remains provisional until an actual authorized reviewer accepts it.

Run through the real Discovery → Knowledge → optional resident announcement transitions in an isolated clearly labelled demo node if live operator access is unavailable. Any simulated feed/model response must be labelled; real cited pages do not make simulated acquisition or inference an actual hosted run. Record the generated note/post identifiers, model/provider label, review state and duplicate/revocation results. The public steward must not be impersonated using a human's account or a bypassed auth path. Live publication can use the existing signed-in operator's Studio controls and current mandates; no automatic production credential is assumed.

## Implemented simulation and first ranker

`src/ranking.ts` implements the bounded public-only recipe and soft diversity described above. Explore offers Pilihan/Aktif/Terbaru; Home's chronological keyset contract is unchanged. The endpoint returns recipe/version/as-of and an explicitly bounded selection, not a fabricated ranked cursor or personalized model. Community normalization uses distinct humans with public posts/replies, not private membership. Tests cover public/private/moderation isolation, freshness, caps, 48-hour bump, cold-start fallback, exact newest ordering and agent/self-reply exclusion. Production release qualification/receipt follows separately.

[Original example draft](../examples/wiki/crocodylus-halli.md) and `scripts/simulate-steward.ts` reproduce the actual local Discovery → resident → provisional Wiki → native announcement pipeline. Run `npm run demo:steward -- .strata/NEW_DEDICATED_FILE.sqlite`. It refuses an existing nonempty node and never sends a live post/model request. Real cited references were researched; acquisition and the curated provider are explicitly simulated. The output receipt excludes the generated operator credential. A second identical read-set abstains. `apps/web/tests/browser/steward-demo.mjs` checks the actual reader, citations, TOC, announcement and 390/1440px views. A real hosted model run, community endorsement and a live public post are not inferred from this demonstration.
