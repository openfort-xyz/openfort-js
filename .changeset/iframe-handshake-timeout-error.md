---
"@openfort/openfort-js": patch
---

Surface a penpal handshake `CONNECTION_TIMEOUT` as a typed `IframeHandshakeTimeoutError` instead of the native-app "configure your origin" copy, which misled web embeds whose origin was correctly configured (Sentry OPENFORT-JS-D0). The original PenpalError is preserved as `cause`; non-timeout handshake failures keep the existing hint.
