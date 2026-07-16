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

## Two classes of event — who emits what

| Class | Events | Emitter |
|---|---|---|
| **Session-lifecycle (truth)** | `funding_session_created`, `funding_payment_method_set`, `funding_status_changed`, `funding_succeeded`, `funding_bounced`, `funding_expired`, `funding_session_error` | **`openfort-js`** (any SDK routing funding through `client.funding` gets them free). A native SDK that reimplements the funding calls emits them at the equivalent hops. |
| **UI-intent** | `funding_route_selected`, `funding_address_copied`, `funding_session_abandoned` | **Each client SDK**, from its own view layer — the SDK core never observes these. |

## Session model

A funding **session** is one deposit attempt. Group all events by `sessionId`
(format `fnd_*`). `sessionId` is `null` only for `funding_address_copied` /
`funding_route_selected` on a same-chain transfer (no Relay session is created).

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

### Lifecycle (emitted by `openfort-js`)

| Event | When | Properties |
|---|---|---|
| `funding_session_created` | `sessions.create` returned | `sessionId`, `targetChain` (CAIP-2), `targetCurrency`, `status` |
| `funding_payment_method_set` | `sessions.setPaymentMethod` returned (or one-call create) — deposit address + quote now exist | `sessionId`, `paymentMethodType`, `sourceChain`, `sourceCurrency`, `sourceAmount` (source base units), `receiverAddress`, `minAmount`, `feeKinds[]`, `status` |
| `funding_status_changed` | Poll observed a non-terminal transition | `sessionId`, `from`, `to` |
| `funding_succeeded` | Terminal: funds delivered | `sessionId`, `txHash` (nullable), `secondsToTerminal` |
| `funding_bounced` | Terminal: refunded | `sessionId`, `secondsToTerminal` |
| `funding_expired` | Terminal: TTL elapsed, nothing arrived | `sessionId`, `secondsToTerminal` |
| `funding_session_error` | A funding call threw | `sessionId` (nullable on create), `stage` (`create` \| `setPaymentMethod` \| `poll`), `message` |

`secondsToTerminal` is measured from the SDK's first observation of the session.

### UI-intent (emitted by each client SDK)

| Event | When | Properties |
|---|---|---|
| `funding_route_selected` | User picked a source route in the UI | `kind` (`crypto` \| `cex`), `sourceChain`, `sourceCurrency`, `destChain` |
| `funding_address_copied` | User copied the deposit address (high-intent) | `sessionId` (nullable), `chain`, `asset` |
| `funding_session_abandoned` | Flow left (reset/unmount) with a non-terminal session | `sessionId`, `lastStatus`, `secondsInSession` |

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

Emission is best-effort: a throwing sink can never break the deposit flow. A
client SDK forwards both the lifecycle events (from the sink) and its own
UI-intent events into the same backend.

## Native SDK (Swift) implementation notes

Emit the same event `type` strings and property keys. Lifecycle events fire at
the equivalent funding hops (create / set-payment-method / poll / terminal /
error); UI-intent events fire from the deposit UI. Keep `sessionId`, chain ids
(CAIP-2), and `paymentMethodType` values byte-identical to the table above so
funnels line up with the JS SDKs.
