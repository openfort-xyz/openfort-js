---
"@openfort/openfort-js": patch
---

Remove the non-functional `cex` variant from `FundingPaymentMethodInput`. Centralized-exchange funding goes through `funding.payLink`, not `setPaymentMethod` — the `cex` payment method was always rejected by the API.
