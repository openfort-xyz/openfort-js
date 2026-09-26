---
"@openfort/openfort-js": patch
---

`ListAccountsParams.order` is now typed `'asc' | 'desc'`. It previously used an enum the package did not export, so callers had no way to pass it without a type error.
