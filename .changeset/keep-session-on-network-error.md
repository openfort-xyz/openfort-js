---
"@openfort/openfort-js": patch
---

Kept the session when validating it fails on a network error, timeout or server error. Only a rejected session (401, 403, or an expired or revoked session) now logs the user out, so going offline no longer signs users out.
