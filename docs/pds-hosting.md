# Optional PDS hosting

The [Strata PDS package](../packages/pds/README.md) is now an implemented, separately deployable experimental Worker service. Its foundation is an attributed MIT Cirrus fork using official AT repo/crypto libraries. The operator CLI supports Cloudflare, official-server/node and existing-provider profiles, JSON planning, dry-by-default initialization, local configuration checks and assumption-driven cost estimates. It does not silently provision cloud resources or identities.

A meaningful interoperability checkpoint now uses the actual official OAuth client against the actual workerd PDS: PAR, PKCE, DPoP and a scoped repository write, with synthetic local identities and intercepted network edges. Signed CAR verification, R2 visibility, restart and refresh-token replay/logout also run locally. Read the package for exact limits and remaining production gates; this is not live PDS signup for ETNOS users.

The Worker profile is one identity per deployment. A Linux/Aksara-node profile currently runs the official multi-account PDS container; porting DO storage to Linux is not implied. Hosting a person's identity on an institutional device is an opt-in custody decision, with recovery and uptime obligations. The ETNOS interface can remain centrally hosted and does not inherit the PDS's control over forum membership or private records.

Cloudflare Paid's example baseline is $5/account/month with adequate shared allowances, not $5 per identity. Free's CPU/request limits need profiling. Existing node hardware trades rental for power, administration, storage and reachability. Current WPW inventory is about 48MB including metadata; monthly operations and all other workloads still share provider allowances. No billing plan or PDS deployment changed during implementation.

The canonical website is now https://etnos.space. The old workers.dev URL is a redirect and browser-local encrypted-message recovery surface. Real public AT publication remains disabled; no account has been migrated.
