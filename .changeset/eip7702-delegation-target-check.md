---
'@openfort/openfort-js': patch
---

fix(evm): correct EIP-7702 delegated-account handling to prevent AA24 signature errors — re-authorize when the EOA is delegated to a different implementation, and sign the raw v0.8 hash for all delegated accounts (CaliburV9 and others, not only Calibur)
