---
"@openfort/openfort-js": patch
---

Stop reporting 400/401 API responses to Sentry. `OpenfortError` now carries `statusCode` for every error class, so the existing suppression check in telemetry works.
