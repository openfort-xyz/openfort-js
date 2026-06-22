---
'@openfort/openfort-js': minor
---

Add the `openfort.funding` namespace for cross-chain wallet deposits: create, advance, and poll deposit sessions (`sessions.create` / `setPaymentMethod` / `get` / `wait`), a one-call `fund()` helper, `payLink()`, and `chains()`. Funding request failures throw a typed `RequestError` with the status and never include the raw backend body.
