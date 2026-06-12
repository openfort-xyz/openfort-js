---
"@openfort/openfort-js": patch
---

Bound iframe `sign()` against a frozen signer: 90s timeout (self-healing on retry), empty-signature guard, and a destroy-race checkpoint; exports `IframeSignTimeoutError` and `IframeSignEmptyResponseError`
