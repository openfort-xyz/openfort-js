import type { FundingFee, FundingSessionStatus } from './funding'

/**
 * Canonical, SDK-agnostic analytics contract for the funding-session rail (the
 * crypto/wallet/exchange deposit flow backed by `/v2/funding/sessions/*` + Relay
 * bridging). The fiat "buy" onramp rail is intentionally out of scope — it's
 * provider-hosted and emits its own events elsewhere.
 *
 * This lives in `@openfort/openfort-js` on purpose: it is the one dependency
 * every JS-based client SDK (openfort-react, react-native, …) shares, so the
 * event names + property shapes are defined once here and imported everywhere.
 * A native SDK (Swift, …) that can't import this module should mirror the same
 * names and property keys so a single PostHog dashboard maps 1:1 across every
 * platform.
 *
 * Scope: **session-lifecycle (truth) events only** — the events derived from the
 * funding session state machine that {@link FundingApi} mediates. `openfort-js`
 * emits these itself (see {@link FundingApi.setAnalyticsSink}), so any SDK that
 * routes funding through `client.funding` gets them for free, no view-layer work:
 *   - `funding_session_created`
 *   - `funding_payment_method_set`
 *   - `funding_status_changed`
 *   - `funding_succeeded` / `funding_bounced` / `funding_expired`
 *   - `funding_session_error`
 *
 * View-layer UI-intent events (route selection, address-copy, abandonment) are
 * intentionally not modeled here for now: they can't be observed from the SDK
 * core, and the current decision is to track only the js/api data layer. They
 * can be added back as a separate client-emitted set if that changes.
 *
 * Every terminal event carries the session's routing dimensions
 * (`paymentMethodType`, `sourceChain`, `targetChain`, `targetCurrency`) so
 * outcome/timing insights can break down by them without cross-event joins.
 *
 * Event property values reuse the SDK's own vocabulary so a dashboard maps 1:1
 * to code: `status` values come from {@link FundingSessionStatus}, and
 * `paymentMethodType` from {@link PaymentMethodType} (`evm | solana | cex`).
 */

/**
 * Payment-method rail a funding session is funded through. `evm` and `solana`
 * are self-custody wallet sends; `cex` is a centralized-exchange withdrawal
 * (the `payLink` path).
 */
export type PaymentMethodType = 'evm' | 'solana' | 'cex'

/**
 * Routing dimensions of a session, attached to terminal events so a single
 * insight can segment outcomes/timing by them. `paymentMethodType`/`sourceChain`
 * are null only if a session somehow terminates before a payment method was set.
 */
export interface FundingSessionDimensions {
  paymentMethodType: PaymentMethodType | null
  /** CAIP-2 source chain funds were sent from. */
  sourceChain: string | null
  /** CAIP-2 destination chain funds settle on. */
  targetChain: string
  targetCurrency: string
}

export type FundingAnalyticsEvent =
  /** `sessions.create` returned — a deposit attempt exists (no address yet). */
  | {
      type: 'funding_session_created'
      sessionId: string
      /** CAIP-2 destination chain. */
      targetChain: string
      targetCurrency: string
      status: FundingSessionStatus
    }
  /** `sessions.setPaymentMethod` returned — a deposit address + quote now exist. */
  | {
      type: 'funding_payment_method_set'
      sessionId: string
      /** `evm | solana | cex`. */
      paymentMethodType: PaymentMethodType
      sourceChain: string
      sourceCurrency: string
      /** Source amount in the source token's smallest unit. */
      sourceAmount: string
      /** Address the user sends to (Relay deposit address). */
      receiverAddress: string | null
      /** Minimum to send for this route (source base units), or null. */
      minAmount: string | null
      /** Fee kinds attached to the route: `gas | relayerGas | relayerService | app`. */
      feeKinds: FundingFee['kind'][]
      status: FundingSessionStatus
    }
  /** The polled session moved between non-terminal states (e.g. waiting_payment → processing). */
  | {
      type: 'funding_status_changed'
      sessionId: string
      from: FundingSessionStatus
      to: FundingSessionStatus
    }
  /** Terminal: funds delivered to the destination wallet. */
  | ({
      type: 'funding_succeeded'
      sessionId: string
      /** On-chain settlement hash when the session exposes one, else null. */
      txHash: string | null
      secondsToTerminal: number
    } & FundingSessionDimensions)
  /** Terminal: source funds arrived but Relay refunded them (bridge failure). */
  | ({
      type: 'funding_bounced'
      sessionId: string
      secondsToTerminal: number
    } & FundingSessionDimensions)
  /** Terminal: nothing arrived before the session's TTL. */
  | ({
      type: 'funding_expired'
      sessionId: string
      secondsToTerminal: number
    } & FundingSessionDimensions)
  /** A funding call threw. `stage` locates the failing hop. */
  | {
      type: 'funding_session_error'
      sessionId: string | null
      stage: 'create' | 'setPaymentMethod' | 'poll'
      message: string
    }

/** Sink an integrator wires to their analytics backend (e.g. PostHog). */
export type FundingAnalyticsSink = (event: FundingAnalyticsEvent) => void

/**
 * Wrap a sink so a throwing integrator handler can never break the funding flow.
 * Returns a no-op emitter when no sink is configured. Analytics is best-effort
 * and must never surface an error into the deposit path.
 */
export function createFundingEmitter(sink?: FundingAnalyticsSink): FundingAnalyticsSink {
  if (!sink) return () => {}
  return (event) => {
    try {
      sink(event)
    } catch {
      // best-effort: a broken analytics handler must never break funding
    }
  }
}
