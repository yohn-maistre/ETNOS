# Security and deployment boundary

This is an unqualified development foundation with a loopback API and a separately configured HTTPS Cloudflare preview. The preview now has official AT OAuth and invitation-controlled enrollment, sealed provider credentials, browser-bound state and an HttpOnly application session. It has no end-to-end encryption, qualified private institutional custody, complete recovery or security audit. Use synthetic/low-risk public data; do not treat the preview as a production activist or institutional vault. See docs/history/connected-preview.md for exact validation and remaining gates.

The trusted boundary includes the local host/OS operator, trusted provisioning CLI and database. Untrusted HTTP callers cannot select a principal by DID or actor ID: bearer credentials bind a locally provisioned identity, and membership/role/mandate/source checks apply in domain methods. This is not proof of AT DID ownership.

Private source routes are fixture-only and disabled by default. Anonymous reads can access approved public metadata/posts; listed-private descriptions are deliberately discoverable while hidden-private existence is protected. Private membership and content are filtered before result projection. Public record fields are allowlisted and validated separately from internal records.

No database, credential, source material or fixture log belongs in Git. The CLI prints newly provisioned tokens once; store them securely. HTTP errors and audit entries do not contain bearer tokens or source bytes. Filesystem permissions reduce accidental disclosure but do not protect against the host OS account.

Withdrawal hides locally controlled derivatives and fences pending work. It cannot retract copies already learned or copied by third parties. Unknown remote outcomes are retained for explicit reconciliation, including a late write after an absent read. Deletion of a remotely changed record is not automatic.

Report vulnerabilities privately to the repository owner through an agreed private channel. A public reporting address/security-advisory process must be established before opening the repository to real deployments. Do not post source bytes, tokens or exploitable private-node details in a public issue.

## Hosted authentication boundary

Only explicitly qualified HTTPS provider hosts may receive OAuth discovery/token traffic. Identity verification does not grant deployment enrollment, community membership or institutional rights. Public metadata/JWKS contains public keys only. Signing and credential-sealing secrets are separate Cloudflare secret bindings and must be preserved during ordinary deployments. Server sessions expire after 24 hours; mutation requests require exact Origin and CSRF confirmation. The production profile rejects local fixture bearer credentials. The node steward and hosting operator are trusted within their declared roles; compromise is not contained by calling this serverless. Agent/service authentication and private-only enrollment remain separate work.

## Experimental direct messages

The forum DM slice uses client-side ts-mls and an encrypted local key/history vault. The library and application have not had an independent security audit; do not use this preview for sensitive activist communications. See [the exact threat model and limitations](docs/history/commons-implementation.md), including initial service-mediated key trust, metadata, malicious web delivery, a single browser/device, missing recovery/rekey/device migration and origin-bound local keys. No Signal/Matrix interoperability, agents reading DMs or server-side plaintext processing is enabled.

## Experimental PDS package

`packages/pds` is an optional attributed Cirrus-derived implementation, not a production-qualified identity host. Its tests use synthetic local identities and do not deploy accounts. Legacy refresh sessions have durable single-use rotation and logout revocation; legacy access JWTs still expire normally after two hours. Password recovery, passkey lifecycle, full migration/backup restoration, abuse/load qualification and independent review remain gates before hosted signup. Keep test keys and `wrangler.test.jsonc` off deployed services. Public repo data is public even with relay notification disabled.

The canonical-origin release includes an explicit passphrase-encrypted browser vault transfer for the old ETNOS URL. This is not general multi-device messaging or rollback-safe historical backup restoration. Do not reuse an old ratchet snapshot over newer active state.
