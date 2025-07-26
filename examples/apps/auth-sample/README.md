# Openfort Invisible wallet `create-next-app` Starter

This is a template for integrating [**Openfort Invisible Wallet**](https://www.openfort.io/) into a [NextJS](https://nextjs.org/) project. Check out the deployed app [here](https://create-next-app.openfort.io/)!

This demo uses NextJS's [Pages Router](https://nextjs.org/docs/pages/building-your-application/routing).


## Setup

1. Clone this repository and open it in your terminal. 
```sh
git clone https://github.com/openfort-xyz/openfort-js.git
```

2. Install the necessary dependencies (including [Openfort JS](https://www.npmjs.com/package/@openfort/openfort-js)) with `yarn`.
```sh
yarn install
yarn build
```

3. Initialize your environment variables by copying the `.env.example` file to an `.env.local` file. Then, in `.env.local`, [paste your Openfort ID from the dashboard](https://www.openfort.io/docs/configuration/api-keys).
```sh
# In your terminal, create .env.local from .env.example
cp .env.example .env.local
```

```sh
# Add your Openfort keys to .env.local
NEXTAUTH_OPENFORT_SECRET_KEY=
NEXT_PUBLIC_OPENFORT_PUBLIC_KEY=
NEXT_PUBLIC_SHIELD_API_KEY=

NEXTAUTH_SHIELD_ENCRYPTION_SHARE=
NEXTAUTH_SHIELD_SECRET_KEY=
```

## Building locally

In your openfort-js project root, run `yarn dev:nextjs`. You can now visit http://localhost:3000 to see your app and login with Openfort!

## Check out:
- `components/AccountActions/AccountActions.tsx` for how to send transactions.
- `components/Signatures/SignMessageButton.tsx` for how to sign messages.


**Check out [our docs](https://www.openfort.io/docs/products/embedded-wallet/javascript/quickstart) for more guidance around using Openfort in your app!**
