---
'@openfort/openfort-js': patch
---

Internal simplification of the core/config/storage layer: single project-scoped
lazy storage class, table-driven API error mapping, and direct API fields on
`Openfort` (the previous "not initialized" getter guards were unreachable —
`waitForInitialization()` is still required before storage-backed calls).
Removes the unused `@sentry/core` dependency. Deprecates `OpenfortError.walk()`
and `OPENFORT_AUTH_ERROR_CODES` (use `OPENFORT_ERROR_CODES`); both remain until
the next major.
