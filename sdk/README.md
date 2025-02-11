<div align="center">
  <h4>
    <a href="https://www.openfort.xyz/">
      Website
    </a>
    <span> | </span>
    <a href="https://www.openfort.xyz/docs">
      Documentation
    </a>
    <span> | </span>
    <a href="https://www.openfort.xyz/docs/reference/api/authentication">
      API Docs
    </a>
    <span> | </span>
    <a href="https://x.com/openfortxyz">
      X
    </a>
  </h4>
</div>

# Openfort.js Library

[![Version](https://img.shields.io/npm/v/@openfort/openfort-js.svg)](https://www.npmjs.org/package/@openfort/openfort-js)

The Openfort js library provides convenient access to handle client session keys and return signed messages back to Openfort from applications written in client-side JavaScript.

## Installation

```shell
npm install @openfort/openfort-js
```

```shell
yarn add @openfort/openfort-js
```

## Usage

With the Openfort Unity SDK, you can sign transaction intents using one of four methods or signers:
```typescript
const sdk = new Openfort({ baseConfiguration: { publishableKey: "pk_test_XXXXXXX"} });
```

### 1. Session Signer
The Session Signer allows you to use external signing keys, without needing to provide it every time. Here's how to use it:

- **Configure the Session Key**: Call `configureSessionKey()`. This method returns an Ethereum address and a boolean indicating whether you need to register the key from the backend.
```typescript
const sessionKey = sdk.configureSessionKey();
```
- **Register Key and Send Signature Session Request**: If `sessionKey.isRegistered` boolean is false, register the key from the backend. Refer to the documentation for [session keys](https://www.openfort.xyz/docs/guides/javascript/smart-wallet/advanced/session-keys).
- **Send Signature Transaction Intent Request**: When calling sendSignatureTransactionIntentRequest, pass the transaction intent ID and the user operation hash. The session signer will handle the signing.

### 2. External Sign

This method allows you to externally sign transaction intents without logging in or additional configurations:

- **Call SendSignatureTransactionIntentRequest**: Simply pass the transaction intent ID and the signature.
```typescript
const response = await sdk.sendSignatureTransactionIntentRequest("tin_xxxx", '0xUserOperationHash');
```

### 3. Embedded Signer

The Embedded Signer uses SSS to manage the private key on the client side. To learn more, visit our [security documentation](https://www.openfort.xyz/docs/security).
- **Login and Configure the Embedded Signer**: First, ensure the user is logged in, using `LoginWithEmailPassword`, `AuthenticateWithOAuth` or if not registred `SignUpWithEmailPassword`. Then call `ConfigureEmbeddedSigner`.
```typescript
  const shieldAuth: ShieldAuthentication = {
    auth: ShieldAuthType.OPENFORT,
    token: identityToken,
    authProvider: "firebase",
    tokenType: "idToken",
  };
  await sdk.loginWithEmailPassword("email", "password");
  // using automatic recovery
  await sdk.configureEmbeddedSigner(chainId, shieldAuth);
```
For now the only two recovery method available are the `PasswordRecovery` and `AutomaticRecovery`. Learn more about the [recovery methods](https://www.openfort.xyz/docs/guides/javascript/embedded-signer/recovery).
- **Send Signature Transaction Intent Request**: Similar to the session signer, pass the transaction intent ID and the user operation hash. The embedded signer reconstructs the key and signs the transaction.
```typescript
const response = await sdk.sendSignatureTransactionIntentRequest("transactionIntentId", "userOp");
```


## Usage examples
- [Next.js application with non-custodial signer](https://github.com/openfort-xyz/samples/tree/main/rainbow-ssv-nextjs)
- [Next.js application with custodial signer and social login](https://github.com/openfort-xyz/samples/tree/main/ssv-social-nextjs)

[next-action]: https://www.openfort.xyz/docs/api/transaction_intents#the-transaction-intent-object

<!--
# vim: set tw=79:
-->
