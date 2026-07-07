---
"@openfort/openfort-js": patch
---

Send `chainId` on the SIWE login flow. `auth.initSiwe` and `auth.loginWithSiwe` now accept an optional `chainId`, forwarded to the `/siwe/nonce` and `/siwe/verify` requests. Without it the backend defaults the request chain ID to `1`, which no longer matches the chain ID embedded in the signed SIWE message and fails verification with `UNAUTHORIZED_SIWE_MESSAGE_MISMATCH`.
