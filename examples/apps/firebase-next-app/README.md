# Openfort embedded wallet with third-party Auth 

This is a template for integrating [**Openfort**](https://www.openfort.io/) into a [NextJS](https://nextjs.org/) project using [Firebase](https://firebase.google.com/) as for authentication. Check out the deployed app [here](https://firebase-auth-embedded-wallet.vercel.app/)!

This demo uses NextJS's [Pages Router](https://nextjs.org/docs/pages/building-your-application/routing).

## How to run locally

**1. Clone and configure the sample**

Copy the .env.local.example file into a file named .env.local in the folder of the server you want to use. For example:

You will need an Openfort account in order to run the demo. Once you set up your account, go to the Openfort [developer dashboard](https://www.openfort.io/docs/configuration/api-keys) to find your API keys.

To create non-csutodial wallets, you can follow the instructions [here](https://www.openfort.io/docs/products/embedded-wallet/javascript/signer/recovery).

```sh
# In your terminal, create .env.local from .env.example
cp .env.example .env.local

NEXTAUTH_OPENFORT_SECRET_KEY=
NEXTAUTH_SHIELD_SECRET_KEY=
NEXTAUTH_SHIELD_ENCRYPTION_SHARE=

NEXT_PUBLIC_SHIELD_API_KEY=
NEXT_PUBLIC_OPENFORT_PUBLIC_KEY=
```

**2. Create a Policy**

[![Required](https://img.shields.io/badge/REQUIRED-TRUE-ORANGE.svg)](https://shields.io/)

If you want to sponsor transactions, you can add policies to your `.env.local` file. You can create gas sponsorship policies from your [Openfort dashboard](https://dashboard.openfort.xyz/policies).

For this sample, create a policy in `Polygon Amoy` with a `catch all contracts` rule. [Learn more](https://www.openfort.io/docs/development/gas-sponsorship)

```sh
NEXT_PUBLIC_POLICY_ID=
```

**3. Get your Firebase Config**

First go to Firebase config: Console > Project settings > General and create an app for your project if you still don't have one. 

<img width="1083" alt="image" src="https://github.com/openfort-xyz/samples/assets/62625514/f5884f03-ebbd-4c16-a154-b04803d40874">

Update `.env` with those values (e.g. NEXT_PUBLIC_apiKey would be apiKey).

<img width="1066" alt="image" src="https://github.com/openfort-xyz/samples/assets/62625514/46067ccc-7821-4a9e-91c2-728ec17782c5">

Then go to Firebase-Admin config: Console > Project settings > Service accounts and generate a "New Private Key"

<img width="1005" alt="image" src="https://github.com/openfort-xyz/samples/assets/62625514/2281e7d8-096e-49d4-b0d4-d2344e933f34">

Update `.env` `firebase-admin` values with the json given.

***Enable auth***
Enable email provider in your firebase project.

**4. Set up Firebase Auth in Openfort**

To set up Firebase to authenticate players with Openfort, visit your [dashboard provider settings](https://dashboard.openfort.xyz/players/auth/providers). You can follow a guide on how to set up Firebase Auth in Openfort [here](https://www.openfort.io/docs/configuration/external-auth).

<div align="center">
  <img
    width="50%"
    height="50%"
    src="https://blog-cms.openfort.xyz/uploads/firebase_auth_8ccee72abf.png?updated_at=2023-11-09T19:56:44.398Z"
    alt='firebase auth'
  />
</div>

**5. Follow the server instructions on how to run**

Install & Run:

```sh
npm install
npm run dev
```

In your project directory, run `npm run dev`. You can now visit http://localhost:3000 to see your app and login with Openfort!


## Get support

If you have questions, comments, or need help with code, we're here to help:
- on Twitter at [@openfortxyz](https://twitter.com/openfort_hq)
- by [email](mailto:support+github@openfort.xyz)
