# Security and deployment boundary

This is an unqualified, loopback-only development foundation. Use synthetic data. It has no production OAuth, remote enrollment, TLS termination, end-to-end encryption, encrypted-at-rest database or security audit. Never expose it publicly by putting a tunnel in front and calling it production-ready.

The trusted boundary includes the local host/OS operator, trusted provisioning CLI and database. Untrusted HTTP callers cannot select a principal by DID or actor ID: bearer credentials bind a locally provisioned identity, and membership/role/mandate/source checks apply in domain methods. This is not proof of AT DID ownership.

Private source routes are fixture-only and disabled by default. Anonymous reads can access approved public metadata/posts; listed-private descriptions are deliberately discoverable while hidden-private existence is protected. Private membership and content are filtered before result projection. Public record fields are allowlisted and validated separately from internal records.

No database, credential, source material or fixture log belongs in Git. The CLI prints newly provisioned tokens once; store them securely. HTTP errors and audit entries do not contain bearer tokens or source bytes. Filesystem permissions reduce accidental disclosure but do not protect against the host OS account.

Withdrawal hides locally controlled derivatives and fences pending work. It cannot retract copies already learned or copied by third parties. Unknown remote outcomes are retained for explicit reconciliation, including a late write after an absent read. Deletion of a remotely changed record is not automatic.

Report vulnerabilities privately to the repository owner through an agreed private channel. A public reporting address/security-advisory process must be established before opening the repository to real deployments. Do not post source bytes, tokens or exploitable private-node details in a public issue.
