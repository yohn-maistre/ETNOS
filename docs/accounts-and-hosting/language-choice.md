# Core language discussion

31 October 2026. Status: **owner selected TypeScript for ETNOS, with Rust where it makes sense**. AGPL-3.0-only is selected. Repository remains private.

The initial runnable foundation is TypeScript/Node/SQLite, using the official AT SDK and Lexicon validator. The owner chose this direction after considering Rust/Bend2: reuse the official SDK and keep the public engine lightweight, while retaining Rust in Aksara and appropriate native adapters. Eighteen tests and a CLI persistence/isolation smoke check pass; none proves a Rust/Bend implementation or a real network deployment.

## Selected responsibilities

- TypeScript: ETNOS's domain/application layer, AT SDK/Lexicons and web/backend integration.
- Rust: existing Aksara institutional authority and native peer/node components when qualified; a possible Iroh adapter, not a mandatory second ETNOS runtime.
- SQLite: initial persistent local profile. Hosted/serverless adapters require their own transactional and resource qualification.
- Bend2: optional bounded research, not a dependency or default engine.

No language choice alone proves security, latency or low memory. Keep this foundation modular without creating speculative polyglot services. The discussion below records why Rust was a serious alternative and Bend2 was not selected for the web host.

## Evaluated alternative: Rust core

Rust is a strong match for a small native node, SQLite transactions, explicit domain state, existing Aksara integration and Iroh's native library. A possible stack is a portable Rust domain crate, a native HTTP/storage host using established libraries, and separate platform adapters. Svelte/TypeScript can remain the frontend. AT integration can use qualified Rust libraries or a narrow TS transport adapter rather than recreating the protocol. Having Rust in both systems must not merge their separate authority/key/data boundaries.

Rust is not automatically low-RAM or secure: actual dependencies, buffers, indexes, request limits and workloads need measurement. The Cloudflare profile needs a separately qualified WASM/Workers storage boundary; native SQLite or Iroh UDP code does not simply run unchanged in Workers. No Rust toolchain or Rust application has been installed/built here yet.

## Bend2: keep a bounded experimental role

The old HigherOrderCO/Bend2 repository redirects to `bendlang/bend`. Source inspected at `9e8d7b7958ebb3bb72464dfb6b6b5f06949fbcad`:

- Native C/Metal/CUDA and JavaScript targets; the JS target is sequential.
- The README lists no built-in TLS/HTTP library/JSON/regex, limited standard-library effects, slow text processing and a young compiler/checker toolchain.
- Its proof system concerns Bend semantics and selected laws; the README explicitly distinguishes backend and translation/checker limitations. External storage/network drivers are not verified by proving a pure transition law.

This does not make Bend unsuitable for research. A separate policy-transition experiment could state assumptions and check laws such as removed membership denying future reads, or a release requiring an exact approved revision. That experiment must be checked against the actual implementation and may not become a second hidden authority. It is not currently a suitable default for the forum's HTTP/database/federation host without substantially more ecosystem work.

Primary source: https://github.com/bendlang/bend/tree/9e8d7b7958ebb3bb72464dfb6b6b5f06949fbcad#limitations

No Bend compiler was run and no backend benchmark was performed. Do not confuse Bend 2 with Bend 1/HVM or infer GPU speedups for an I/O-heavy public forum.
