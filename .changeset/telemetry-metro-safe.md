---
'@openfort/openfort-js': minor
---

Make error telemetry resilient and opt-out. `InternalSentry.init` no longer lets the dynamic `import('@sentry/browser')` crash the host app — the import can fail to resolve in some bundlers (notably Metro / React Native), so failures are now caught and telemetry is simply skipped (queued capture calls stay unsent). Added a `disableTelemetry` flag to `OpenfortSDKConfiguration` to turn telemetry off entirely.
