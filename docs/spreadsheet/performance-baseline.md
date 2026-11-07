# Spreadsheet performance baseline

Environment: local Linux, Node 22, Next.js 15.5.29, Chromium via Playwright, Univer 1.3.1. These are development-machine observations, not production network guarantees.

| Measure | Observation | Method |
| --- | ---: | --- |
| Lazy editor emitted JS | ~41.7 MB uncompressed | Largest production/dev emitted editor chunk inspection |
| All emitted JS | ~114 MB uncompressed (M01-T02 observation) | Filesystem chunk sizes; not transfer size |
| Warm editor readiness | ~2.26 s | Chromium development reload to ready state |
| Formula fixture readiness | ~2.48 s | Warm development visit |
| Dependency edit | ~340 ms | Keyboard edit through clipboard-verified formula update |
| Snapshot JSON | 471 bytes | Small two-sheet fixture export |
| Two snapshot imports | 456 ms | Chromium interaction plus readiness waits |
| Production cold editor readiness | 1.54 s | Local `next start`, `/practice/demo`, navigation to editor-ready |
| Production Next resource transfer | 1.89 MB across 21 resources | Browser Resource Timing `transferSize`; local loopback, cold page |

The emitted files are not gzip/Brotli transfer measurements. The 1.89 MB result is an actual browser-observed local transfer total, but it is not representative of CDN compression, cache policy, or real network latency. The editor is already client-only and lazy loaded; no safe bundle reduction was identified without changing Univer preset/package composition. Create a separate release task to set compressed-route and interaction budgets, then measure Web Vitals and transfer sizes on production hosting.

Lifecycle guardrail: only one editor owns a Univer runtime. Reset/import serialize destructive replacement. Cleanup marks the runtime disposed immediately, then defers Univer's internal React-root disposal until after React's current commit to avoid nested synchronous unmount warnings.

## Post-MVP scalability note

Keep formula calculation in the browser for the supported exercise size. Future APIs should remain stateless, use indexed lesson/progress queries and idempotent submission keys, and serve static editor assets through a CDN. Add rate limits at public API boundaries; introduce Redis, asynchronous jobs, or load tests only when measured catalog, submission, or persistence load justifies them.
