import type { BackendApiClients } from '@openfort/openapi-clients'
import type { CreateFundingSessionRequest, FundingSessionResponse } from '@openfort/openapi-clients/dist/backend'
import { withApiError } from '../core/errors/withApiError'

/**
 * Funding (cross-chain wallet deposit) resource.
 *
 * Wraps the API's `/v2/funding` session endpoints: create a session for a
 * destination, set a single payment method (a source route) to mint a Relay
 * deposit address, then poll until terminal. Sessions are guarded by a
 * per-session `clientSecret` and authenticated with the project publishable key.
 *
 * Delegates to the generated `BackendApiClients.fundingApi`, so request/response
 * shapes track the published OpenAPI spec. The public types below are the SDK's
 * stable surface; responses are mapped onto them.
 */

/** Where the funded crypto should land (CAIP-2 chain + token + wallet). */
export interface FundingTarget {
  chain: string
  currency: string
  address: string
}

/** The source route the user commits to sending from. */
export interface FundingSource {
  chain: string
  currency: string
  amount: string
}

export interface CreateFundingSessionParams {
  target: FundingTarget
  /** Lock the deposit to a fixed amount (destination base units). */
  amountUnits?: string
  metadata?: Record<string, string>
  /** Idempotency/correlation key — reusing it returns the existing session. */
  externalId?: string
  /** true = single-use deposit address; false (default) = open/reusable. */
  strict?: boolean
  /**
   * One-call funding: set the payment method at creation when the source route
   * is already known — the session comes back in `waiting_payment` with the
   * deposit address, skipping the separate setPaymentMethod round trip.
   */
  paymentMethod?: FundingPaymentMethodInput
}

interface FundingPaymentMethodBase {
  source: FundingSource
  /**
   * Origin-chain refund address (refunds land on the source chain). Optional —
   * the server defaults it to the target address for same-VM routes, or to a
   * source-VM stand-in for cross-VM routes (e.g. an EVM source funding a Solana
   * wallet), where the destination address isn't valid on the source chain.
   */
  refundTo?: string
}

/**
 * The source route the user commits to — an EVM or Solana self-custody
 * transfer. To fund from a centralized exchange, use `payLink` instead.
 */
export type FundingPaymentMethodInput =
  | (FundingPaymentMethodBase & { type: 'evm' })
  | (FundingPaymentMethodBase & { type: 'solana' })

export type FundingSessionStatus =
  | 'requires_payment_method'
  | 'waiting_payment'
  | 'processing'
  | 'succeeded'
  | 'bounced'
  | 'expired'

export interface FundingFee {
  kind: string
  amount: string
  currency: string
}

export interface FundingWalletDeeplink {
  app: string
  label: string
  url: string
}

/** Withdrawal guidance for a `cex` payment method. */
export interface FundingCexGuidance {
  /** Exchange id, e.g. "binance" | "coinbase". */
  exchange: string
  /** Network name as the exchange labels it, e.g. "Base", "Polygon". */
  network: string
  /** Minimum withdrawal in source base units, if the exchange enforces one. */
  minWithdrawal: string | null
  /** True when the network requires a destination tag / memo. */
  requiresMemo: boolean
}

export interface FundingPaymentMethod {
  type: string
  source: FundingSource
  receiverAddress: string
  addressUri: string
  deeplinks: FundingWalletDeeplink[]
  /** Withdrawal guidance; present only for `cex` payment methods, else null. */
  cex: FundingCexGuidance | null
  fees: FundingFee[]
  minAmount: string | null
}

export interface FundingSession {
  id: string
  object: string
  status: FundingSessionStatus
  clientSecret: string
  target: FundingTarget
  amountUnits: string | null
  metadata: Record<string, string> | null
  externalId: string | null
  strict: boolean
  paymentMethod: FundingPaymentMethod | null
  createdAt: number
  expiresAt: number
}

/**
 * Parameters for a Coinbase "Transfer funds" pay-link. Session-bound: the
 * destination chain and address come from the session, so the link can't be
 * redirected — the client only chooses the amount.
 */
export interface PayLinkParams {
  /** Funding session (starts with fnd_) whose wallet receives the funds. */
  sessionId: string
  /**
   * The session's client secret. Optional when the session was created on this
   * SDK instance (remembered from create()); required for sessions created elsewhere.
   */
  clientSecret?: string
  /** Amount to deliver, in the asset's human units (Coinbase enforces a minimum). */
  amount: string
  /** Destination asset ticker; defaults to "USDC" server-side. */
  asset?: string
}

/** A source currency available on a chain. */
export interface FundingCurrency {
  symbol: string
  /** Contract address, or the zero address for the chain's native asset. */
  address: string
  decimals: number
  logo: string | null
  /** True for the chain's native currency (ETH, SOL, POL, …). */
  native: boolean
}

/** A source chain the rail can route from, with its routable currencies. */
export interface FundingChain {
  /** CAIP-2 chain id, e.g. "eip155:8453". */
  id: string
  name: string
  logo: string | null
  vmType: string
  currencies: FundingCurrency[]
}

export class FundingApi {
  constructor(private readonly backendApiClients: BackendApiClients) {}

  private get fundingApi() {
    return this.backendApiClients.fundingApi
  }

  /**
   * Narrow a generated response onto the SDK's public {@link FundingSession}. The
   * spread keeps the shapes structurally checked (a dropped/renamed server field
   * breaks compilation), overriding only where the public type differs: `status`
   * is narrowed to the documented union, and the payment method carries no
   * exchange withdrawal guidance from the API today, so `cex` is always null.
   */
  private static toSession(response: FundingSessionResponse): FundingSession {
    return {
      ...response,
      status: response.status as FundingSessionStatus,
      paymentMethod: response.paymentMethod ? { ...response.paymentMethod, cex: null } : null,
    }
  }

  /**
   * Client secrets remembered from create() responses, so follow-up calls in
   * the same SDK instance don't need to thread the secret manually. Passing an
   * explicit `clientSecret` always overrides (e.g. sessions created elsewhere).
   */
  private readonly secrets = new Map<string, string>()

  private resolveSecret(sessionId: string, explicit?: string): string {
    const secret = explicit ?? this.secrets.get(sessionId)
    if (!secret) {
      throw new Error(
        `No clientSecret known for funding session ${sessionId} — pass it explicitly (it was returned when the session was created)`
      )
    }
    return secret
  }

  private remember(session: FundingSession): FundingSession {
    if (session.clientSecret) {
      this.secrets.set(session.id, session.clientSecret)
    }
    return session
  }

  /** Funding session sub-resource: create → setPaymentMethod → get/wait. */
  public readonly sessions = {
    create: async (params: CreateFundingSessionParams): Promise<FundingSession> => {
      const response = await withApiError(
        async () =>
          (
            await this.fundingApi.createFundingSession({
              createFundingSessionRequest: params as CreateFundingSessionRequest,
            })
          ).data,
        { context: 'funding.sessions.create' }
      )
      return this.remember(FundingApi.toSession(response))
    },

    setPaymentMethod: async (
      sessionId: string,
      params: { paymentMethod: FundingPaymentMethodInput; clientSecret?: string }
    ): Promise<FundingSession> => {
      const clientSecret = this.resolveSecret(sessionId, params.clientSecret)
      const response = await withApiError(
        async () =>
          (
            await this.fundingApi.setPaymentMethod({
              sessionId,
              setPaymentMethodRequest: { clientSecret, paymentMethod: params.paymentMethod },
            })
          ).data,
        { context: 'funding.sessions.setPaymentMethod' }
      )
      return FundingApi.toSession(response)
    },

    get: async (sessionId: string, params?: { clientSecret?: string }): Promise<FundingSession> => {
      const clientSecret = this.resolveSecret(sessionId, params?.clientSecret)
      const response = await withApiError(
        async () => (await this.fundingApi.getFundingSession({ sessionId, clientSecret })).data,
        { context: 'funding.sessions.get' }
      )
      return FundingApi.toSession(response)
    },

    /**
     * Poll a session until it reaches a terminal status (`succeeded`, `bounced`,
     * or `expired`). Resolves with the terminal session; rejects on timeout.
     */
    wait: async (
      sessionId: string,
      params?: { clientSecret?: string; pollMs?: number; timeoutMs?: number }
    ): Promise<FundingSession> => {
      const pollMs = params?.pollMs ?? 4_000
      const timeoutMs = params?.timeoutMs ?? 30 * 60_000
      const deadline = Date.now() + timeoutMs
      for (;;) {
        const session = await this.sessions.get(sessionId, params)
        if (session.status === 'succeeded' || session.status === 'bounced' || session.status === 'expired') {
          return session
        }
        if (Date.now() >= deadline) {
          throw new Error(`Timed out waiting for funding session ${sessionId} (last status: ${session.status})`)
        }
        await new Promise((resolve) => setTimeout(resolve, pollMs))
      }
    },
  }

  /**
   * One-call deposit: create a session with the payment method set, then poll
   * until it reaches a terminal status (`succeeded`, `bounced`, or `expired`).
   * Bundles `sessions.create` + `sessions.wait` — the headless equivalent of the
   * React `useFunding().fund()` flow. Resolves with the terminal session; rejects
   * on timeout.
   */
  public readonly fund = async (params: {
    target: FundingTarget
    paymentMethod: FundingPaymentMethodInput
    /** Lock the deposit to a fixed amount (destination base units). */
    amountUnits?: string
    metadata?: Record<string, string>
    /** Idempotency/correlation key — reusing it returns the existing session. */
    externalId?: string
    /** true = single-use deposit address; false (default) = open/reusable. */
    strict?: boolean
    /** Poll interval and overall timeout for the wait phase. */
    wait?: { pollMs?: number; timeoutMs?: number }
  }): Promise<FundingSession> => {
    const session = await this.sessions.create({
      target: params.target,
      paymentMethod: params.paymentMethod,
      amountUnits: params.amountUnits,
      metadata: params.metadata,
      externalId: params.externalId,
      strict: params.strict,
    })
    return this.sessions.wait(session.id, params.wait)
  }

  /**
   * Resolve a prefilled Coinbase "Transfer funds" URL that delivers the asset to
   * the session's wallet. Session-bound — the destination comes from the session,
   * so the client only chooses the amount. Powers the "send from an exchange" path.
   */
  public readonly payLink = async (params: PayLinkParams): Promise<string> => {
    const clientSecret = this.resolveSecret(params.sessionId, params.clientSecret)
    const response = await withApiError(
      async () =>
        (
          await this.fundingApi.createPayLink({
            payLinkRequest: {
              sessionId: params.sessionId,
              clientSecret,
              amount: params.amount,
              asset: params.asset,
            },
          })
        ).data,
      { context: 'funding.payLink' }
    )
    return response.url
  }

  /**
   * The source chains + currencies the rail can route from — a live passthrough
   * of the provider's supported routes, for building the source picker.
   */
  public readonly chains = async (): Promise<FundingChain[]> => {
    const response = await withApiError(async () => (await this.fundingApi.listChains({})).data, {
      context: 'funding.chains',
    })
    return response.chains
  }
}
