---
'@openfort/openfort-js': patch
---

fix(iframeManager): only surface "configure your origin" for actual origin/403 failures; surface Penpal handshake timeouts as `IframeHandshakeTimeoutError`

`doInitialize()`'s catch used to collapse every handshake-time rejection into the misleading "Failed to establish iFrame connection ... configure your origin" copy. Telemetry on `playground.openfort.io` showed ~248 events / 14 days of `PenpalError: Connection timed out after 10000ms` being surfaced as origin-allowlist errors, masking the real cause (embed page unreachable, blocked by CSP, network drop).

The catch now discriminates:

- Penpal `CONNECTION_TIMEOUT` (or any handshake error matching `Connection timed out`) → new `IframeHandshakeTimeoutError`, with the original PenpalError preserved as `cause`.
- 403 / origin / forbidden / unauthorized-origin signals → existing "configure your origin" `OpenfortError` (unchanged).
- Everything else → new `IframeInitializeError`, preserving the original rejection as `cause`.

Exports two new error classes: `IframeHandshakeTimeoutError` and `IframeInitializeError`.
