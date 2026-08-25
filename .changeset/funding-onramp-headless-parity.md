---
"@openfort/openfort-js": minor
---

Added the headless onramp surface to `openfort.funding`: sessionless `methods()` discovery, `embedded.identity()`, buyer `limits()` (auth-intent and verified-phone forms), `startLimitUpgrade()`, and an `angles` capability filter on methods, quotes, and commits so clients that can only open a browser (React Native) never resolve a flow they cannot execute. Regenerated the backend client against the funding routing branch, which also removed the `subdivision` and quote `refundTo` parameters that no longer exist in the API contract.
