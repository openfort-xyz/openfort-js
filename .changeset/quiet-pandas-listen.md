---
'@openfort/openfort-js': patch
---

Stop probing the network to serve `eth_requestAccounts`. The chain id it reports is now resolved from the stored account (or the configured chains), the same way `getRpcProvider` already resolves it, instead of via a live `detectNetwork()` call whose only use was the `connect` event payload. Listing a locally-stored account no longer fails with `could not detect network` when the RPC endpoint is slow, rate-limited or unreachable — which surfaced as "Error creating wallet" during embedded wallet creation, including for EOAs that never touch an RPC.

`StaticJsonRpcProvider` is now also constructed with an explicit chain id, so it issues no detection round-trip and cannot cache a rejected network promise for the rest of the session.

The cached provider is also dropped on account switch (it already was on logout), so after switching to an account on a different chain, `eth_chainId` and pass-through RPC calls follow the new account instead of staying pinned to the previous chain.
