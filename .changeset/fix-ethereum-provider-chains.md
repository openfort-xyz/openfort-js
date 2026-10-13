---
'@openfort/openfort-js': patch
---

Fixed `getEthereumProvider` dropping the `chains` argument when the embedded wallet provider already existed. The provider is memoized for the session and keeps its `chains` object by reference, so chains supplied by a later call - for example RPC URLs passed through the wagmi bridge - were silently ignored. Each call's chains are now merged into the same object, so a provider created earlier still sees them.
