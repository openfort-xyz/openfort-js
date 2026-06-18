---
"@openfort/openfort-js": patch
---

`personal_sign` now accepts plain UTF-8 messages (e.g. SIWE / EIP-4361 sign-in), not only hex-encoded ones — matching MetaMask/ethers/viem. Hex input produces the identical EIP-191 hash (no regression); plain strings that were previously run through `hexToString` and mangled now produce a valid signature.
