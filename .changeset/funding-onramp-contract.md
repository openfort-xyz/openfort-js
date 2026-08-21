---
'@openfort/openfort-js': minor
---

Added session-scoped onramp methods, embedded checkout helpers, the embedded-flow identity and limits reads (`funding.embedded.identity`, `funding.embedded.limits`), the wallet-pay limit helpers (`funding.walletPay.limits`, `funding.walletPay.startLimitUpgrade`), and testnet funding-chain selection. Regenerated the backend client against the current `/v2/funding` contract. Restricted `fund()` to non-interactive crypto payment methods.

Local cross-repository verification: start the API with a disposable database, a test project with hosted card funding enabled, `COINBASE_API_URL=http://127.0.0.1:3199`, and `COINBASE_WEBHOOK_SECRET=smoke_secret`; then run `OPENFORT_PUBLISHABLE_KEY=pk_test_... COINBASE_WEBHOOK_SECRET=smoke_secret pnpm smoke:funding-onramp`.
