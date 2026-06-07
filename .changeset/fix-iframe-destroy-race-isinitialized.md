---
'@openfort/openfort-js': patch
---

Fix iframe destroy race: guard against half-initialized client and stop surfacing misleading "configure your origin" error during teardown races.

`ReactNativeMessenger`'s public methods were declared with ES6 method shorthand. When `penpal`'s `connect()` captured `messenger.destroy` as a bare function reference and later invoked it via `connectionDestroyedHandler()`, `this` was `undefined` and the call threw `TypeError: Cannot read property 'isInitialized' of undefined` (Sentry OPENFORT-JS-HD, 76 events / 8 users on RN/iOS clients). `IframeManager.doInitialize()`'s generic catch wrapped that `TypeError` in the misleading "Failed to establish iFrame connection / configure your origin in the dashboard" copy, leading customers to suspect their dashboard origin config when the real cause was a teardown race.

This change:

- converts the 8 public methods on `ReactNativeMessenger` (`initialize`, `sendMessage`, `addMessageHandler`, `removeMessageHandler`, `handleMessage`, `setupMessagePort`, `destroy`, `reset`) to arrow-function class fields so `this` survives bare capture — matching `WindowMessenger`;
- makes `IframeManager.destroy()` idempotent and adds a `private isDestroyed` flag; `initialize()` and `doInitialize()` observe the flag at entry and between awaits;
- introduces `SessionEndedBeforeSetupError` ("Wallet session ended before setup completed."), thrown only on the teardown-race path. The original "configure your origin" hint is **preserved** for genuine handshake failures.
