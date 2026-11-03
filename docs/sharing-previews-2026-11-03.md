# Public sharing previews — 3 November 2026

HTML responses now include route-specific Open Graph and Twitter cards without requiring JavaScript. News uses the current public title, summary and same-origin photo URL; posts, profiles, communities, organisations, accepted wiki revisions, contexts and public work use anonymous API projections. Generic routes use an ETNOS 1200×630 brand card.

Every projection starts a fresh anonymous request. Private/hidden content, private-only actors, wiki drafts, content-warning spoilers and account screens do not enter share metadata, including when the HTML request has a signed-in cookie. Unknown/protected pages use generic, noindex metadata and the root canonical URL. Metadata is bounded and escaped; image URLs use existing fixed public media/news/video ports. The HTML remains no-store, and recovery/canonical-origin protections are retained.

Validation: TypeScript app/Worker checks; 83 core tests including public/private sharing fixtures; actual workerd HTML tests with signed-in headers and tracking queries; UI checks, tests and production build; minified Worker dry run. The static card was inspected at its native 1200×630 size. Deployment and external crawler verification are recorded separately after release.

Messaging services control their own card caches. Existing messages may retain an earlier card until the service refreshes its cache. We cannot guarantee a particular messaging client's layout or force its cache to expire.
