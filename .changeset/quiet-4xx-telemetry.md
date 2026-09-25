---
"@openfort/openfort-js": patch
---

Every `OpenfortError` raised from an API response now has `statusCode`. Telemetry reads that field to skip 400 and 401, so wrong OTPs, expired tokens and key mismatches no longer reach Sentry.
