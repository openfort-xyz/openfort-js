# Embedded Wallets in Solana

A React + Vite sample app demonstrating Openfort embedded wallets on Solana devnet. Authenticate users, create wallets, sign messages, send SOL, and execute gasless transactions — all without requiring users to manage private keys.

## Quick Start

**Prerequisites:** Node.js v22.9+, pnpm, and an [Openfort account](https://openfort.io).

```sh
# From the monorepo root (openfort-js/)
pnpm install && pnpm build

# Configure environment
cp examples/apps/solana-sample/.env.local.example examples/apps/solana-sample/.env.local

# Start dev server
pnpm dev:solana
```

Open [http://localhost:5173](http://localhost:5173).

## Environment Variables

Set these in `.env.local` (get keys from the [Openfort dashboard](https://www.openfort.io/docs/configuration/api-keys)):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_PROJECT_PUBLISHABLE_KEY` | Yes | Openfort project publishable key |
| `VITE_SHIELD_PUBLISHABLE_KEY` | Yes | Shield publishable key (also used for gasless transactions) |
| `VITE_SOLANA_TEST_RECEIVE_ADDRESS` | No | Pre-filled recipient address for testing |

## Features

- **Email & guest auth** — sign up, log in, and manage sessions via Openfort
- **Embedded Solana wallets** — create, recover, and switch between accounts
- **Message signing** — sign arbitrary messages with the embedded wallet
- **SOL transfers** — send SOL on devnet with balance validation
- **Gasless transactions** — fee-less transfers via the Kora protocol
- **Transaction history** — view past transactions with Solana Explorer links
- **Private key export** — let users export their wallet key
- **Event monitor** — real-time log of SDK events (auth, wallet, signing)

## Key Files

| File | What it does |
|------|-------------|
| `src/openfort.ts` | Initializes the Openfort SDK |
| `src/contexts/OpenfortContext.tsx` | Auth state, wallet management, signing |
| `src/Login.tsx` | Email/password and guest login |
| `src/content.tsx` | Main UI — wallet actions, signing, transfers |
| `src/solana.tsx` | Solana transactions and gasless flow |
| `src/utils/kora.ts` | Kora protocol integration for gasless txs |
| `src/utils/transaction.ts` | Custom `TransactionSigner` bridging Openfort to Solana |

## Tech Stack

React 19, Vite, TypeScript, Tailwind CSS v4, `@solana/kit`, `@openfort/openfort-js`

## Learn More

[Openfort Embedded Wallet Docs](https://www.openfort.io/docs/products/embedded-wallet)
