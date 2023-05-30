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
const openfort = new Openfort('sk_test_...');
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

[next-action]: [https://dashboard.openfort.xyz/api-keys](https://www.openfort.xyz/docs/api/transaction_intents#the-transaction-intent-object)

<!--
# vim: set tw=79:
-->
