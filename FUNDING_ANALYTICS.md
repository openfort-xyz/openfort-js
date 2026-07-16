# Funding-session analytics — cross-SDK event contract

This is the **canonical, SDK-agnostic** event contract for the funding-session
rail (the crypto/wallet/exchange deposit flow backed by `/v2/funding/sessions/*`
+ Relay bridging). The fiat "buy"/onramp rail is **out of scope** — it's
provider-hosted and emits its own events.

Every Openfort client SDK — `openfort-react`, `react-native`, and native SDKs
(Swift, …) — must emit these exact event names and property keys so a **single
PostHog dashboard maps 1:1 across every platform**. JS SDKs import the types from
`@openfort/openfort-js` (`FundingAnalyticsEvent`, `FundingAnalyticsSink`); a
native SDK that can't import the module reimplements the same names/keys against
this document.

## Scope: session-lifecycle (truth) events only

The tracked set is the events derived from the funding session state machine that
`FundingApi` mediates. **`openfort-js` emits them itself**, so any SDK that routes
funding through `client.funding` gets them for free — no view-layer work per SDK.

View-layer **UI-intent** events (route selection, address-copy, session
abandonment) are **intentionally not tracked for now**: the SDK core never
observes them, and the current decision is to instrument only the js/api data
layer. They can be reintroduced later as a separate client-emitted set.

## Session model

A funding **session** is one deposit attempt. Group all events by `sessionId`
(format `fnd_*`).

Backend status state machine (authoritative), mirrored by every SDK:

```
requires_payment_method → waiting_payment → processing → { succeeded | bounced | expired }
```

`succeeded | bounced | expired` are terminal. `bounced` = source funds arrived
but Relay refunded them (bridge failure). `expired` = nothing arrived before the
24h TTL.

## Events

Property values reuse SDK vocabulary: `status` ∈ the state machine above;
`paymentMethodType` ∈ `evm | solana | cex`.

| Event | When | Properties |
|---|---|---|
| `funding_session_created` | `sessions.create` returned | `sessionId`, `targetChain` (CAIP-2), `targetCurrency`, `status` |
| `funding_payment_method_set` | `sessions.setPaymentMethod` returned (or one-call create) — deposit address + quote now exist | `sessionId`, `paymentMethodType`, `sourceChain`, `sourceCurrency`, `sourceAmount` (source base units), `receiverAddress`, `minAmount`, `feeKinds[]`, `status` |
| `funding_status_changed` | Poll observed a non-terminal transition | `sessionId`, `from`, `to` |
| `funding_succeeded` | Terminal: funds delivered | `sessionId`, `txHash` (nullable), `secondsToTerminal`, **+ dimensions** |
| `funding_bounced` | Terminal: refunded | `sessionId`, `secondsToTerminal`, **+ dimensions** |
| `funding_expired` | Terminal: TTL elapsed, nothing arrived | `sessionId`, `secondsToTerminal`, **+ dimensions** |
| `funding_session_error` | A funding call threw | `sessionId` (nullable on create), `stage` (`create` \| `setPaymentMethod` \| `poll`), `message` |

**Terminal dimensions** (on `funding_succeeded` / `funding_bounced` /
`funding_expired`): `paymentMethodType` (nullable), `sourceChain` (nullable, CAIP-2),
`targetChain` (CAIP-2), `targetCurrency`. Carried on the terminal event itself so
outcome/timing insights break down by route without cross-event joins.

`secondsToTerminal` is measured from the SDK's first observation of the session.

## Wiring (JS SDKs)

```ts
// At SDK construction:
new Openfort({
  baseConfiguration: { publishableKey },
  overrides: { funding: { onEvent: (e) => posthog.capture(e.type, e) } },
})

// Or at runtime:
client.funding.setAnalyticsSink((e) => posthog.capture(e.type, e))
```

Emission is best-effort: a throwing sink can never break the deposit flow.

## Native SDK (Swift) implementation notes

Emit the same event `type` strings and property keys. Lifecycle events fire at
the equivalent funding hops (create / set-payment-method / poll / terminal /
error). Keep `sessionId`, chain ids (CAIP-2), and `paymentMethodType` values
byte-identical to the table above so funnels line up with the JS SDKs.
