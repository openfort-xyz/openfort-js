![Openfort Protocol][banner-image]

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
    <a href="https://twitter.com/openfortxyz">
      Twitter
    </a>
  </h4>
</div>

[banner-image]: https://blog-cms.openfort.xyz/uploads/openfortjs_f52fdc3f2d.png

# Openfort.js Library

[![Version](https://img.shields.io/npm/v/@openfort/openfort-js.svg)](https://www.npmjs.org/package/@openfort/openfort-js)

The Openfort js library provides convinient access to handle client session keys and return signed messages back to Openfort from applications written in client-side JavaScript.

## Installation

```shell
npm install @openfort/openfort-js
```

```shell
yarn add @openfort/openfort-js
```

## Usage

The package needs to be configured with your account's public key, which is
available in the [Openfort Dashboard][api-keys]. Require it with the key's
value:

```js
import Openfort from '@openfort/openfort-js';
const openfort = new Openfort('pk_test_...');
```
In order to sign messages, you have 4 options to choose from:
* Let Openfort handle the signing process, dont need to pass any signer to the Openfort instance.
* Sign yourself and pass the signature to Openfort, dont need to pass any signer to the Openfort instance.
* Use a Session Key to sign messages, you need to pass a SessionSigner to the Openfort instance.
* Use Embedded Signer to sign messages, you need to pass an Embedded Signer to the Openfort instance.

#### Session Signer
```ts
const sessionSigner = new SessionSigner()
const openfort = new Openfort('pk_test_...', sessionSigner);
```

#### Embedded Signer
For the embedded signer, if your player has an account you can pass it to the embedded signer to use it. If the account is not provided, the embedded signer will check if the localstorage has a device which is already registered, if not, it will create a new device and store it in the localstorage.
For the recovery process, you can ask the user for a password to encrypt the recovery share.

```ts
const embeddedSigner = new EmbeddedSigner('pk_test_...', 'acc_...', '********');
const openfort = new Openfort('pk_test_...', embeddedSigner);
```


### Create and store a new player session key

1. Create a session key pair for the player:

```typescript
openfort.createSessionKey();
```

2. Save the generated session key pair on device:

```typescript
openfort.saveSessionKey();
```

3. Authorize player with the game backend service and passing the address of the session key pair:

```typescript
const address = openfort.sessionKey.address
// API call to the game backend with the address to register it
```

#### Register the session key using a non-custodial signer

If the Openfort account is owned by an external signer, the owner must use it to sign and approve the registration of the session key. The hash containing the message to be signed appears in [next_actions][next-action] from the create session request.

```typescript
// Sign the message with the signer
await openfort.sendSignatureSessionRequest(
  session_id,
  signed_message
);
```

### Use the session key to sign a message

The hash containing the message to be signed appears in [next_actions][next-action] from the create transactionIntent request.

```typescript
await openfort.signMessage(message);
await openfort.sendSignatureTransactionIntentRequest(
    transactionIntent_id,
    signed_message
);
```

## Usage examples
- [Next.js application with non-custodial signer](https://github.com/openfort-xyz/samples/tree/main/rainbow-ssv-nextjs)
- [Next.js application with custodial signer and social login](https://github.com/openfort-xyz/samples/tree/main/ssv-social-nextjs)

[next-action]: https://www.openfort.xyz/docs/api/transaction_intents#the-transaction-intent-object

<!--
# vim: set tw=79:
-->
