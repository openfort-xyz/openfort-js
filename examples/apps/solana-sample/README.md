# Openfort + Solana

This project demonstrates a simple web application that integrates Openfort with Solana blockchain. It showcases how to:

- Create players using Openfort
- Execute transactions on Solana using Openfort's signer
- Switch chain to Polygon Amoy

## Prerequisites

- Node.js v16+
- Yarn or npm
- [Openfort Project](https://openfort.xyz)

## Getting Started

1. Clone this repository
2. Install dependencies:
  ```bash
  yarn install
  ```
3. Set up environment variables:
  ```bash
  cp .env.example .env.local
  ```
  Fill in your Openfort API key and other required variables

4. Run the development server:
  ```bash
  yarn dev
  ```
  ## Dependencies

  The project relies on the following key dependencies:

  - `@openfort/openfort-js`: JavaScript SDK to interact with Openfort's platform for managing players and transactions.
  - `@solana/web3.js`: Core Solana JavaScript API for interacting with Solana blockchain.
  - `vite`: Build tool that offers faster development experience and optimized production builds.
