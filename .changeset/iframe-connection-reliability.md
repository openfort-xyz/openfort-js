---
"@openfort/openfort-js": patch
---

Harden iframe connection reliability: per-call RPC timeouts with typed errors (`IframeRpcTimeoutError`, `IframeConnectionDestroyedError`), a transparent one-shot handshake retry, and a new `onEmbeddedWalletConnectionLost` event with per-reason semantics (`rpc-timeout`, `handshake-timeout`, `iframe-reloaded`). Teardown no longer sends a penpal DESTROY to React Native WebView children (which permanently deafened them), the EIP-1193 provider rebuilds its signer after a connection loss instead of failing until logout, logout is bounded against a frozen iframe and flushes embed-side state even after a page reload, and mid-session embed reloads are reported exactly once (no false positives from the deprecated wire protocol's duplicate ACKs).
