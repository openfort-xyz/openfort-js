---
'@openfort/openfort-js': patch
---

Load only the four `@sentry/browser` pieces the SDK uses instead of the whole namespace, so bundlers drop Replay and Feedback: the `import { Openfort }` bundle shrinks from ~239 kB to ~152 kB (brotli). Telemetry behaviour is unchanged.
