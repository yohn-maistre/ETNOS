# Public news and video-card ports

The web Worker now has bounded, read-only adapters for WPW news and fixed-provider video metadata. They are optional public ports; the forum and its current membership checks remain independent.

- `GET /v1/news`: up to 12 published WPW items, title/summary/source count/place projection, same-origin image references.
- `GET /v1/news/:id`: a published story summary, key points, original source links and actual public place coordinates. No editorial dispatch/debug/internal records are projected.
- `GET /v1/news/:id/image`: fixed numeric ID resolved through WPW, restricted publisher image hosts, no redirects or forwarded credentials, 2 MiB maximum, image MIME and magic-byte validation. No general URL fetch proxy or storage copy.
- `GET /v1/video-preview/:provider/:id`: YouTube/Vimeo oEmbed title and same-origin cover reference. Never fetches an arbitrary user URL, forum page URL or player content.
- `GET /v1/video-preview/:provider/:id/image`: fixed YouTube thumbnail or validated Vimeo CDN image; 1 MiB maximum, no redirects, MIME and magic-byte checks.
- `GET /v1/feed/page?links=<JSON array>`: exact content URL association (maximum 16 URLs) within the ordinary visibility/paging query. Public news responses never contain private forum discussions; authenticated discussion retrieval is separate and no-store. Existing membership revocation still applies.

News summaries reuse WPW's existing story clusters. No separate embedding pipeline, new model, database or corpus extraction was introduced. Related discussion means a shared story/source link, not semantic inference. Full publisher articles are not scraped/rehosted.

Video scrolling/composition loads **cover/title only**. A player iframe/native video element is created only after Play is tapped. Nothing autoplays or buffers video merely because the card appears in the feed. An iframe uses origin-only `strict-origin-when-cross-origin` identification as required by YouTube; the app's general no-referrer policy and fixed frame-provider CSP remain. Native HTTPS video URLs are rendered as a native player only after interaction. Browser/platform embedding restrictions can still apply; the source link remains available.

UI and media caches reduce repeated public requests; metadata/failure payloads are bounded. The image port does not alter R2 usage or introduce a paid image-resizing service. Public image sizes/availability still depend on publishers. No new PDS, public AT broadcasting or account migration is part of this change.

Sources: https://developers.google.com/youtube/terms/required-minimum-functionality#api-client-identity-and-credentials and https://developers.google.com/youtube/iframe_api_revision_history (Error 153).
