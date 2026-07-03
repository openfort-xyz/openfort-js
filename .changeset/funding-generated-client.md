---
"@openfort/openfort-js": patch
---

Funding resource now delegates to the generated `BackendApiClients.fundingApi` instead of hand-rolling HTTP calls, so its request/response shapes track the published OpenAPI spec. Public funding types and method signatures are unchanged.
