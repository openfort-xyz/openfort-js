---
'@openfort/openfort-js': minor
---

Added `overrides.customAuthDomain` for first-party cookie sessions. When set, the API, the embedded-wallet iframe and Shield are reached through the project's delegated host with credentialed requests, the session lives in an `HttpOnly` cookie, no token is stored or sent to the iframe, and `getAccessToken()` returns `null`. `storeCredentials` accepts a missing `token` for the OAuth callback of a cookie project.
