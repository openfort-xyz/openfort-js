---
"@openfort/openfort-js": patch
---

Set `referrerpolicy="strict-origin-when-cross-origin"` on the embedded wallet
iframe so the parent origin is sent on the iframe document request. Without
this, parent pages with a restrictive `Referrer-Policy` (e.g. `no-referrer`,
`same-origin`) caused the server-side allowlist check at
`/v1/projects/validate-origin` to receive an empty origin and return 403.
