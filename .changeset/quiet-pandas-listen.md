---
'@openfort/openfort-js': patch
---

Stop probing the network to serve `eth_requestAccounts`. The chain id it reports is now resolved from the stored account (or the configured chains), the same way `getRpcProvider` already resolves it, instead of via a live `detectNetwork()` call whose only use was the `connect` event payload. Listing a locally-stored account no longer fails with `could not detect network` when the RPC endpoint is slow, rate-limited or unreachable — which surfaced as "Error creating wallet" during embedded wallet creation, including for EOAs that never touch an RPC.

`StaticJsonRpcProvider` is now also constructed with an explicit chain id, so it issues no detection round-trip and cannot cache a rejected network promise for the rest of the session.
