# Wagmi Kit - Vite

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

3. Initialize your environment variables by copying the `.env.example` file to an `.env` file. Then, in `.env`, [paste your Openfort ID from the dashboard](https://www.openfort.io/docs/configuration/api-keys).
```sh
# In your terminal, create .env from .env.example
cp .env.example .env

# Add your Openfort keys to .env
VITE_APP_OPENFORT_PUBLISHABLE_KEY=
VITE_APP_SHIELD_PUBLISHABLE_KEY=
```

## Building locally

In your openfort-js project root, run `yarn dev:wagmi-vite`. 