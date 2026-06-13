---
'@openfort/openfort-js': minor
---

Surface clearer errors. The EIP-1193 `request()` now awaits the underlying call so asynchronous failures (e.g. a node rejecting `eth_sendTransaction`) are caught and wrapped as `JsonRpcError` instead of leaking the raw node response. Common messages — insufficient funds, execution reverted, nonce conflicts, gas errors — are normalized to short, readable text (unknown messages pass through unchanged). The "Storage is not accessible" error now explains the likely cause (e.g. an unsigned React Native build can't use the keychain).
