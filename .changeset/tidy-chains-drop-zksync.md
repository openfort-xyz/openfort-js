---
'@openfort/openfort-js': minor
---

Drop zkSync support and align the built-in RPC endpoints with the chains Openfort supports.

`sendCalls`, `registerSession`, and `revokeSession` no longer special-case chain ids 300 and 324 when signing the transaction's `signableHash`. Raw-hash signing (no EIP-191 prefix) is now selected solely by account type — EIP-7702 delegated accounts — which is what every supported chain needs.

`defaultChainRpcs` now covers only the chains Openfort supports (see https://www.openfort.io/docs/configuration/chains). The endpoints for opBNB Testnet (5611), Titan (84358), Clankermon (510525), Open Loot (510530, 510531), Saakuru (7225878), Zora (7777777, 999999999), Ancient8 (888888888, 28122024), and Degen (666666666) were removed.

Requesting a chain with no built-in endpoint now throws a `JsonRpcError` naming the chain instead of silently connecting to `http://localhost:8545`. Pass your own endpoint to keep using one of the removed chains:

```ts
const provider = await openfort.embeddedWallet.getEthereumProvider({
  chains: { 7777777: 'https://rpc.zora.energy' },
})
```
