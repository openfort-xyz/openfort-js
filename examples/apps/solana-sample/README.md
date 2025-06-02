# Embedded Wallets in Solana

This project demonstrates a simple web application that integrates Openfort with Solana blockchain. It showcases how to:

- Create players using Openfort
- Execute transactions on Solana using Openfort's signer
- Switch chain to Polygon Amoy

## Prerequisites

- Node.js v16+
- Yarn or npm
- [Openfort Project](https://openfort.io)

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
  ```bash
  cp .env.example .env.local
  ```
  Fill in your Openfort API key and other required variables

## Building locally
In your openfort-js project root, run `yarn dev:solana`.
## Dependencies

The project relies on the following key dependencies:

- `@openfort/openfort-js`: JavaScript SDK to interact with Openfort's platform for managing players and transactions.
- `@solana/web3.js`: Core Solana JavaScript API for interacting with Solana blockchain.
- `vite`: Build tool that offers faster development experience and optimized production builds.
