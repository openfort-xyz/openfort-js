---
'@openfort/openfort-js': minor
---

Narrowed `OpenfortEvents.ON_SIGNED_MESSAGE` to the signatures it documents. The
event was emitted from the embedded signer's `sign()`, the single chokepoint for
all signing, so it also fired for transaction signing, user operations, session
key registration and revocation, delegation, and authorization signing — anything
counting the event counted far more than messages. It is now emitted only from
the message and typed-data paths: `signMessage()`, `signTypedData()`,
`personal_sign` and `eth_signTypedData(_v4)`.

Submitting a transaction intent signature no longer reports one either. That path
signed its `nextAction.hash` by calling `signMessage()` internally; it now uses a
dedicated non-emitting method.

Added a `type` discriminator to `SignedMessagePayload`: `'message'` for
`personal_sign` / `signMessage()`, `'typedData'` for EIP-712. The `signature`
field now always carries the value returned to the caller, ERC-6492-wrapped
where applicable.
