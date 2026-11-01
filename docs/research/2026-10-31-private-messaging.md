# Private messaging: AT identity, separate encrypted delivery

Research checkpoint: 31 October 2026. **Subsequent implementation:** the owner selected forum-only DMs first. An experimental ts-mls client-encrypted 1:1 slice is now implemented; see [its exact limits](../commons-implementation.md). This research is not a claim of independent security review or a Signal/Matrix/Germ integration. The local activity inbox is a different feature and does not deliver private messages. This assessment supplements Decision 002; it does not authorize publication of a person's contact details.

## Recommendation

Keep AT for portable public identity and public records. Treat private messaging as a separately authorized surface with device-held keys and a private delivery service. Do not put message bodies, ciphertext archives, recipient lists, room rosters or notification contents in public AT repositories, blobs or firehoses. Public ciphertext is permanent collectible material and exposes relationships/timing; encrypting a public record does not make a private messaging system.

Use established protocols and maintained implementations. Evaluate Germ's AT-specific work first, alongside Matrix for a complete existing messaging stack and MLS libraries for a bespoke client. Do not design a new ratchet or describe a tested primitive as a qualified messenger. Start with explicit invitations and one-to-one text, and qualify the whole system before deploying sensitive conversations. Native/packaged clients should be considered for the high-risk use case: the operator delivering a browser app can change its JavaScript and compromise keys or plaintext on the next load.

## Existing projects and practical limits

| Candidate | Verified upstream evidence | Fit and gate |
| --- | --- | --- |
| Germ DM / Germ libraries | Existing AT-linked MLS messenger. February 2026 announcement describes iOS public beta; app-view guidance defines `com.germnetwork.declaration`, opt-in message buttons and DID/key discovery. Libraries include Rust and Swift work. | Closest product parallel. Linking to its app is different from embedding a web/Android client. Recheck platform availability and individual package licenses/qualification before reuse. Follow current declarations, not the older bio-link design. |
| Germ `atproto-pmr` | MIT repository includes TypeScript protocol core, Cloudflare Durable Object/KV implementation and key-monitor packages. README explicitly calls this a **first public draft**; grant-address derivation and body schemas/test vectors block a second interoperable implementation. Blocked-sender simulation is deliberately not production-complete. | Exceptionally relevant serverless delivery reference. Inspect/pin it and contribute to closure of the documented gaps; do not deploy its development default or claim Germ interoperability today. It is a relay, not the encryption client. |
| OpenMLS | Rust RFC 9420 library, MIT; `js` feature builds WASM. Current README lists WASM as built but **not tested/supported** on upstream CI. Maintainer audit post describes SRLabs findings, fixes described as versions “8.1 and 7.3” (verify exact crate releases before pinning), and one remaining Low issue at publication. | Candidate for a Rust/WASM endpoint with explicit browser/runtime qualification. Audit scope/version and remediation must be checked before pinning. It does not provide identity verification, delivery, recovery or our app policy by itself. |
| `ts-mls` | TypeScript RFC 9420 implementation targeting browsers/Node/serverless. README explicitly says **no formal security audit**. | Convenient isolated interoperability/performance spike, not a sufficient basis for promising activist-safe production messaging. |
| `signalapp/libsignal` | Official Rust implementation with Java, Swift and TypeScript wrappers; AGPLv3. README explicitly says use outside Signal is unsupported; npm includes native Node libraries. | Valuable established protocol, but no supported drop-in browser/Workers SDK established here. Copying a wrapper does not connect us to the Signal network. Prefer the existing Signal app as a companion initially. |
| Matrix | Existing messaging ecosystem with client-device crypto and recovery/device-verification workflows. SDK and homeserver integration require a separate current-version review. | Consider a complete Matrix integration instead of assembling a new messenger. Requires a Matrix service/account and operations; do not assume an entire homeserver is a free Worker or that all Matrix rooms are encrypted. No SDK compatibility was tested here. |

These are research candidates, not a decision that Germ/OpenMLS/Matrix is universally more secure. A failed fetch of an old Matrix WASM documentation URL was not treated as proof that the SDK is unavailable. No third-party messenger implementation was copied into Strata.

## Linking Signal or Matrix to an AT identity

The accounts remain independent. AT OAuth proves control of the AT identity; it does not prove ownership of a Signal account, a Matrix ID or a device encryption key. Signal does not expose AT login, and libsignal does not provide Signal account federation. A Signal username/share link can be attached by explicit consent, but is self-asserted until verified. Prefer a username link over collecting a phone number. Matrix SSO/OIDC, where a homeserver supports it, is a separate identity integration rather than automatic support for AT OAuth.

The safe initial product is an optional companion contact card, private to its owner until explicitly shared with a chosen audience. Do not infer links from names, crawl contacts, publish institutional staff rosters or write a public AT declaration automatically. Genuine cross-account verification needs a time-limited, recipient-bound challenge completed in the external channel, plus revocation, key-change handling and a way to unbind. No messages/challenges should be sent without the person's explicit action. A contact link is not a verified badge or an embedded E2EE DM implementation.

Avoid a transparent Signal/Matrix/Strata bridge: a bridge that reads and re-encrypts messages is another plaintext endpoint. Disclose such an endpoint and obtain consent if it is ever added; otherwise keep the companion apps separate. Do not use an unofficial `signal-cli` bot to silently ingest activists' chats.

## Endpoint, identity and relay boundary

1. A device generates dedicated messaging keys. Never reuse PDS repository signing keys, OAuth tokens or the Worker's OAuth seal key as message decryption keys.
2. Bind a messaging identity to the stable AT DID, with independent device proofs, explicit enrollment, key continuity and warnings/verification for replacements. AT/PDS takeover can replace a public declaration; an existing trusted conversation must not silently accept a replacement as the same verified endpoint. Key transparency/equivocation detection is a qualification requirement, not supplied by a normal PDS read.
3. Use the chosen library's validated session/group state, forward secrecy, post-compromise updates, replay protection and membership epochs. One protocol's key package is not sufficient for another's interoperability. MLS group authorization and ordering must be specified and tested; DO serialization can help adjudicate commits but is not cryptographic validation.
4. A Worker can authenticate relay requests, bound requests/quotas and queue opaque envelopes with TTLs. A DO can coordinate one logical mailbox/room. Keep content-decryption keys at endpoints; storage backups contain only encrypted state/envelopes under the chosen recovery policy. Storage placement and routing IDs still expose metadata to operators; this does not provide anonymity or traffic-analysis resistance.
5. Prefer HTTPS store-and-forward so the recipient can be offline. Iroh can later carry compatible encrypted envelopes between admitted native peers. Iroh transport encryption alone is not asynchronous multi-device E2EE and does not guarantee delivery or offline mesh connectivity.
6. Recover by an already verified device or user-held encrypted recovery secret. An AT password reset or deployment administrator must not silently recover old plaintext. Explain clearly when losing all devices/recovery material loses history. Removing a device or member prevents new authorized epochs; it cannot erase copies they already read.

Use strict CSP, isolated crypto code, no third-party analytics in messaging, encrypted local key storage with explicit lock/unlock, generic push payloads, encrypted attachments with independent keys and bounded retention. Device theft, malicious extensions/OS, screenshots, an authorized recipient and a malicious web build remain relevant limits. Passkeys can help authenticate/unlock; they are not automatically a portable key backup or message-encryption protocol.

## Aksara participation

Aksara is **not** implicitly a participant in every DM or staff room. Inviting an agent adds a separately identified cryptographic endpoint, disclosed to everyone in the room. Its custodian must authorize the specific role and data use. If a remote LLM processes plaintext, that provider is within the disclosure boundary; encrypted transport does not hide prompts from it. No automatic summaries, training, public-memory releases, forwarding or institutional access follow from messaging admission. Removing the agent rotates future access and revokes its grants; it cannot unlearn plaintext already received.

## Qualification sequence

- Complete and qualify the current experimental forum-only DM slice; capability discovery must expose its experimental and unaudited status.
- Review Germ's PMR core/storage/trust contracts and current library licenses, compare a real Matrix integration against a Rust/WASM MLS spike. Measure bundle size, storage and low-end Android behavior here; no build on the owner's phone.
- Isolated synthetic endpoints only: invitation, send while offline, dedup/replay, failed/duplicate commits, device addition/removal, key-package reuse, key changes, recovery, backup/restore and malicious relay/equivocation. Include independent interop test vectors.
- Threat-model review with community stewards, abuse/consent controls, supply-chain and external security review before enabling sensitive use. Record exact audited dependencies and deployment artifact. Passing application tests is not a security certification.

## Sources actually inspected

- [Germ's AT integration architecture (2025; historical bio-link implementation)](https://www.germnetwork.com/blog/integrating-germ-atproto)
- [Germ AT public beta (February 2026)](https://www.germnetwork.com/blog/germ-dm-for-at-protocol-is-live)
- [Current Germ button/declaration guidance](https://mark-germ.leaflet.pub/3mem22lhe222t)
- [Germ Personal Messaging Relay code and first-draft caveats](https://github.com/germ-network/atproto-pmr)
- [Germ's MLS adoption and mls-rs lineage](https://www.germnetwork.com/blog/germ-dm-is-now-on-messaging-layer-security)
- [OpenMLS README and platform support](https://github.com/openmls/openmls)
- [OpenMLS WASM manual](https://book.openmls.tech/user_manual/wasm.html)
- [OpenMLS maintainer audit report summary](https://blog.phnx.im/openmls-independent-security-audit/)
- [ts-mls README including unaudited disclaimer](https://github.com/LukaJCB/ts-mls)
- [Official libsignal README: external use unsupported and native bindings](https://github.com/signalapp/libsignal)
- [MLS standard, RFC 9420](https://www.rfc-editor.org/rfc/rfc9420.html)
