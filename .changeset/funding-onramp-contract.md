---
'@openfort/openfort-js': minor
---

Added session-scoped onramp methods, regional subdivision forwarding, chained Relay quote details, embedded checkout helpers, and testnet funding-chain selection. Restricted `fund()` to non-interactive crypto payment methods.

Local cross-repository verification: start the API with a disposable database, a test project with hosted card funding enabled, `COINBASE_API_URL=http://127.0.0.1:3199`, and `COINBASE_WEBHOOK_SECRET=smoke_secret`; then run `OPENFORT_PUBLISHABLE_KEY=pk_test_... COINBASE_WEBHOOK_SECRET=smoke_secret pnpm smoke:funding-onramp`.
