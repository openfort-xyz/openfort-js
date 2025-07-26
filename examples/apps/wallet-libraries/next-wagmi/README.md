# Wagmi Kit - Next.js

Check out the deployed app [here](https://wagmi.openfort.io/)!

## Getting Started

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

# Add your Openfort keys to .env.local
NEXTAUTH_OPENFORT_SECRET_KEY=
NEXT_PUBLIC_OPENFORT_PUBLIC_KEY=
NEXT_PUBLIC_SHIELD_API_KEY=

NEXTAUTH_SHIELD_ENCRYPTION_SHARE=
NEXTAUTH_SHIELD_SECRET_KEY=
```

If you want to sponsor transactions, you can add policies to your `.env.local` file. You can create gas sponsorship policies [from your Openfort dashboard](https://www.openfort.io/docs/configuration/gas-sponsorship).


```sh
NEXT_PUBLIC_POLICY_SEPOLIA=
NEXT_PUBLIC_POLICY_BASE_SEPOLIA=
```

## Building locally

In your openfort-js project root, run `yarn dev:wagmi`. You can now visit http://localhost:3000 to see your app and login with Openfort!
