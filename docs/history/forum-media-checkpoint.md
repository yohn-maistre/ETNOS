# Conversation and media checkpoint — 1 November 2026

The connected Honai app keeps Strata's OAuth, policy, Wiki, Groups/Spaces, PublicWork, activity and experimental encrypted-DM foundation. This pass adapts Photon/Honai behavior to Strata's own API rather than importing components bound to Lemmy/PieFed clients.

Implemented UI: conversational feed spacing, a mobile thread header and reply dock, author/avatar rails, nested replies with bounded visual indentation, branch collapse, reply-level vote/bookmark/report/share actions, specific reply permalinks, direct child counts, oldest/newest/top sibling ordering and explicit cursor loading. Sorting applies to loaded replies; it is not an AppView-wide ranking algorithm. Missing/hidden/unloaded parents retain an explicit context link. The post composer uses shadcn Dialog, Avatar, NativeSelect, Textarea and Button with an integrated destination and audience, image drafts, alt text and Ctrl/Cmd+Enter. Mobile uses a full-height composer and Chrome's resize-content keyboard behavior; physical-device keyboard testing remains.

Images support one to four attachments on root posts or replies, responsive galleries, alt text and a keyboard-controlled dialog viewer. Plain HTTPS/HTTP URLs are safe escaped links, not server-fetched previews. No remote image fetch/proxy, SVG, HTML, arbitrary file upload or iframe was added.

## Image authority and limits

Migration 13 adds a bounded preview image table to the existing SQLite node. No additional cloud resources or paid service were created. The client accepts JPG/PNG/WebP up to 12 MiB and re-encodes a static WebP up to 2048px per side and 512 KiB, removing EXIF/GPS and profile chunks. The server independently validates canonical base64, RIFF framing, allowed static-image chunks, codec signatures and dimensions; this is not a full server codec decode, malware scan or independent security review.

Uploads require a currently admitted human. Drafts are visible only to their owner and current community readers cannot inspect another member's unattached draft. Attachment requires the same owner and community, no previous attachment, at most four distinct images and an unexpired draft. Post, attachments, contextual links and any outbox intent commit atomically. Invalid attachment references roll back the whole post. Agents have no image-upload authority. AT-publishing destinations reject image uploads/attachment until the public blob/Lexicon contract is qualified; incomplete media posts cannot enter the AT outbox.

Every image fetch rechecks its attached post's current visibility/read permission. Revocation and moderation hiding prevent subsequent server reads of both metadata and bytes. Responses use no-store, nosniff and same-origin resource policy. Already downloaded copies cannot be recalled; private community images are access controlled, not end-to-end encrypted. DM media is not enabled.

Preview budgets: 8 MiB and 64 uploads per uploader per rolling day, 32 uploads/hour and 16 pending drafts per uploader, 64 MiB total image bytes and 5,000 image rows per logical node, four images per post, 24h draft expiry with opportunistic cleanup on uploads. Existing posts are never automatically expired to make space. An operator storage/retention UI, rate/flood protection, backup/restore qualification and a scalable object-store adapter remain work. These are deliberately small preview limits, not a free production media-hosting claim. Original institutional evidence still belongs in Aksara's custodial store, with separately reviewed public derivatives.

## Design/reuse

The owner supplied Threads/Bluesky screenshots and explicitly requested this direction. Reference behavior inspected in Honai: PostMedia/PostImage, PostActions and CommentTree. No donor implementation was copied; backend-specific SvelteKit/PieFed assumptions were replaced with portable Svelte components. shadcn-svelte/Bits UI and Lucide remain the baseline with existing notices. The owner's configurable Abstraksi/Aksara palette and Instrument Sans are retained.

[Unslop](https://github.com/heydamir/unslop), created by Damir Sokolovsky (@heydamir), CC BY 4.0, commit `1d13095e4bef6ad6c74f1dd828d84c4ba309a4dc`, is installed in the cloud workspace with its references and licence. Its spacing/type/quiet-chrome guidance is adapted to a reading-focused forum and the explicitly requested palette. Taste v2.1.5 remains installed. Neither skill's generic dashboard-width recommendation overrides the owner's Threads-style reading column. No generated marketing hero or fake deployed activity was added.

See [PieFed parity](../product/piefed-parity.md) for remaining families. Editing/deletion, polls/events, subscriptions/global ranking, video, rich moderation/recovery and protocol bridging are still incomplete.
