# ETNOS PDS work

This is a separately deployed experimental account-hosting service. Read README.md and UPSTREAM.md. Preserve upstream attribution and record local deltas. Never deploy wrangler.test.jsonc or its synthetic keys. Keep public repository APIs separate from private ETNOS/Aksara stores. No public PLC write, real-user account creation, migration, paid plan change or live stress test belongs in an automated fixture.

Run the root policy tests plus this package's check and test commands after changes. Tests must keep all OAuth client discovery/token traffic intercepted and all relay notifications disabled. Preserve restart, replay and concurrent refresh checks when modifying authentication. Do not call the package production-qualified merely because it compiles or a fixture passes.
