---
'@openfort/openfort-js': minor
---

Add the `cex` payment method to `openfort.funding`: fund a wallet via a guided withdrawal from a centralized exchange. `sessions.create`, `sessions.setPaymentMethod`, and `fund()` accept `{ type: 'cex', cex, source }`, and a settled session's `paymentMethod.cex` carries the withdrawal guidance (`exchange`, `network`, `minWithdrawal`, `requiresMemo`).
