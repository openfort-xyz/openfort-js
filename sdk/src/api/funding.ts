import type { BackendApiClients } from '@openfort/openapi-clients'
import type {
  CreateFundingSessionRequest,
  FundingSessionResponse,
  SetPaymentMethodRequest,
} from '@openfort/openapi-clients/dist/backend'
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

/** Backend ids of the fiat (web2) funding methods. */
export type OnrampMethodId = 'apple_pay' | 'google_pay' | 'card' | 'bank_transfer'

/**
 * How the client executes a resolved fiat method: open `url` (`iframe`), mount
 * the provider's in-page Pay button (`native`), or run Stripe's Link element
 * flow (`embedded` — authenticate + collect via the coordinator, then commit
 * with `stripeLink` and perform the checkout).
 */
export type OnrampAngle = 'iframe' | 'native' | 'embedded'

/**
 * A fiat onramp commit. Openfort resolves the provider server-side from the
 * buyer's region + the session's destination — there is no provider choice
 * here. Wallet pay (`apple_pay`/`google_pay`) additionally requires the
 * OTP-verified buyer identity: use `verifications` (Coinbase-issued OTP) and
 * attach the record ids alongside the attested fields.
 */
export interface OnrampPaymentMethodInput {
  type: 'onramp'
  method: OnrampMethodId
  /** Fiat amount to prefill, in the source currency's human units. */
  sourceAmount?: string
  /** ISO-4217 fiat currency for `sourceAmount`. */
  sourceCurrency?: string
  /** Explicit buyer-country override (ISO-3166 alpha-2); wins over the request IP. */
  country?: string
  /** URL the provider redirects back to after a hosted checkout. */
  redirectUrl?: string
  /** Origin-chain refund address for an auto-bridged (chained) route. */
  refundTo?: string
  /** OTP-verified buyer email — wallet pay only. */
  email?: string
  /** OTP-verified US mobile in E.164 — wallet pay only. */
  phoneNumber?: string
  /** ISO-8601 time the phone OTP was verified — wallet pay only. */
  phoneNumberVerifiedAt?: string
  /** ISO-8601 time the buyer accepted Coinbase's Guest Checkout terms — wallet pay only. */
  agreementAcceptedAt?: string
  /** Coinbase Verification API record for the phone (see `verifications`). */
  smsVerificationId?: string
  /** Coinbase Verification API record for the email (see `verifications`). */
  emailVerificationId?: string
  /**
   * Stripe v2 embedded-components (Link-auth headless) flow — present when the
   * client authenticated the buyer with Link and collected a payment method.
   * Redeem the session's element secret afterwards via `sessions.checkout`.
   */
  stripeLink?: {
    /** The LinkAuthIntent minted by `stripeLink.createAuthIntent`. */
    linkAuthIntentId: string
    /** Link-authenticated buyer id from the client's authenticate() callback. */
    cryptoCustomerId: string
    /** Payment token from the client's collectPaymentMethod() element. */
    cryptoPaymentToken: string
  }
}

/**
 * The route the user commits to: an EVM or Solana self-custody transfer, or a
 * fiat onramp (`onramp`). To fund from a centralized exchange, use `payLink`.
 */
export type FundingPaymentMethodInput =
  | (FundingPaymentMethodBase & { type: 'evm' })
  | (FundingPaymentMethodBase & { type: 'solana' })
  | OnrampPaymentMethodInput

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

/** A committed crypto-rail payment method (Relay deposit address). */
export interface FundingCryptoPaymentMethod {
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

/**
 * A committed fiat onramp payment method. The executing provider is resolved
 * server-side and intentionally not part of the response — the client renders
 * per `angle`: open `url`, mount it as the native Pay button, or run the
 * Stripe Link element flow against `providerSessionId`.
 */
export interface FundingOnrampPaymentMethod {
  type: 'onramp'
  method: OnrampMethodId | string
  angle: OnrampAngle | string
  url: string | null
  /**
   * The provider's own session id for this commit — for the Stripe Link (v2)
   * flow, pass it to the coordinator's `performCheckout`.
   */
  providerSessionId?: string | null
  fees: FundingFee[]
  minAmount: string | null
}

/** Discriminate on `type`: `'onramp'` is fiat; everything else is a crypto rail. */
export type FundingPaymentMethod = FundingCryptoPaymentMethod | FundingOnrampPaymentMethod

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

/** One resolved fiat method row. The provider is auto-selected and never shown. */
export interface ResolvedFundingMethod {
  method: OnrampMethodId | string
  /** Executing provider — for telemetry only, never display. */
  provider: string
  angle: OnrampAngle | string
  /** Display label, derived client-side from `method` + `rail`. */
  label: string
  /** Regional bank rail for bank transfers ("ach" | "sepa" | "interac"). */
  rail?: string
  /** Client must still gate on device capability (e.g. Apple Pay needs an Apple device). */
  requiresDeviceCheck?: boolean
  /**
   * Provider PUBLISHABLE key for `embedded` rows — the pre-commit elements
   * (e.g. Stripe's Link auth) initialize with it. Public by design.
   */
  providerPublishableKey?: string
}

/** The API sends `method` + `rail`; the label and device gating are client concerns. */
const METHOD_PRESENTATION: Record<OnrampMethodId, { label: string; requiresDeviceCheck?: boolean }> = {
  apple_pay: { label: 'Apple Pay', requiresDeviceCheck: true },
  google_pay: { label: 'Google Pay', requiresDeviceCheck: true },
  card: { label: 'Card' },
  bank_transfer: { label: 'Bank transfer' },
}

const RAIL_LABEL: Record<string, string> = { ach: 'ACH', sepa: 'SEPA', interac: 'Interac' }

function presentMethodRow(row: Omit<ResolvedFundingMethod, 'label' | 'requiresDeviceCheck'>): ResolvedFundingMethod {
  const fixed = METHOD_PRESENTATION[row.method as OnrampMethodId]
  const railLabel = row.rail ? RAIL_LABEL[row.rail] : undefined
  return {
    ...row,
    label: railLabel ?? fixed?.label ?? row.method,
    ...(fixed?.requiresDeviceCheck ? { requiresDeviceCheck: true } : {}),
  }
}

/** Resolved fiat methods for a session's destination + the buyer's region. */
export interface ResolvedFundingMethods {
  /** Resolved ISO-3166 alpha-2 country, or null for rest-of-world. */
  country: string | null
  methods: ResolvedFundingMethod[]
}

export interface OnrampFee {
  type: string
  amount: string
  currency: string
}

/** A priced onramp route for a session — matches the checkout the user will get. */
export interface OnrampQuote {
  provider?: string
  sourceAmount: string
  sourceCurrency: string
  destinationAmount: string
  destinationCurrency: string
  destinationNetwork: string
  fees: OnrampFee[]
  exchangeRate: string
}

/** A started Coinbase-issued OTP verification (the code is on its way). */
export interface OnrampVerificationStart {
  verificationId: string
  /** ISO-8601 — the OTP expires ~10 minutes after initiation. */
  otpExpiresAt?: string
}

/** A completed verification — attach its id to a wallet-pay commit (valid ~60 days). */
export interface OnrampVerificationRecord {
  verificationId: string
  verificationExpiresAt?: string
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
    const pm = response.paymentMethod
    return {
      ...response,
      status: response.status as FundingSessionStatus,
      // Fiat methods pass through as-is; crypto rails carry no exchange
      // withdrawal guidance from the API today, so `cex` is always null.
      paymentMethod: pm
        ? pm.type === 'onramp'
          ? (pm as FundingOnrampPaymentMethod)
          : ({ ...pm, cex: null } as FundingCryptoPaymentMethod)
        : null,
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
              setPaymentMethodRequest: {
                clientSecret,
                // The generator flattens the crypto|onramp request union onto a
                // single shape; the SDK union is the source of truth.
                paymentMethod: params.paymentMethod as unknown as SetPaymentMethodRequest['paymentMethod'],
              },
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

    /**
     * The fiat methods available for this session's destination and the buyer's
     * region, resolved server-side. Render the rows and commit one with
     * `setPaymentMethod({ type: 'onramp', method })` — there is no provider
     * choice on the client.
     */
    methods: async (
      sessionId: string,
      params?: { clientSecret?: string; country?: string }
    ): Promise<ResolvedFundingMethods> => {
      const clientSecret = this.resolveSecret(sessionId, params?.clientSecret)
      const response = await withApiError(
        async () =>
          (await this.fundingApi.getFundingSessionMethods({ sessionId, clientSecret, country: params?.country })).data,
        { context: 'funding.sessions.methods' }
      )
      return {
        country: response.country ?? null,
        methods: (response.methods ?? []).map(presentMethodRow),
      }
    },

    /**
     * Price a fiat route for this session before committing it — resolved
     * exactly as `setPaymentMethod` would resolve it, so the quote matches the
     * checkout the user will get.
     */
    quote: async (
      sessionId: string,
      params: {
        method: OnrampMethodId
        sourceAmount: string
        sourceCurrency: string
        country?: string
        clientSecret?: string
      }
    ): Promise<OnrampQuote> => {
      const clientSecret = this.resolveSecret(sessionId, params.clientSecret)
      const response = await withApiError(
        async () =>
          (
            await this.fundingApi.quoteFundingSession({
              sessionId,
              sessionQuoteRequest: {
                clientSecret,
                method: params.method,
                sourceAmount: params.sourceAmount,
                sourceCurrency: params.sourceCurrency,
                country: params.country,
              },
            })
          ).data,
        { context: 'funding.sessions.quote' }
      )
      return response as OnrampQuote
    },

    /**
     * Stripe v2 (Link-auth headless) checkout: confirms the committed headless
     * onramp session and returns the one-shot provider client secret for the
     * client's performCheckout element.
     */
    checkout: async (sessionId: string, params?: { clientSecret?: string }): Promise<{ clientSecret: string }> => {
      const clientSecret = this.resolveSecret(sessionId, params?.clientSecret)
      const response = await withApiError(
        async () =>
          (
            await this.fundingApi.checkoutFundingOnrampSession({
              sessionId,
              checkoutFundingOnrampSessionRequest: { clientSecret },
            })
          ).data,
        { context: 'funding.sessions.checkout' }
      )
      return response as { clientSecret: string }
    },
  }

  /**
   * Coinbase-issued OTP verification for native wallet pay (Apple/Google Pay):
   * Coinbase sends and checks the code itself. Verify the buyer's phone and
   * email, then attach the returned ids to the wallet-pay commit as
   * `smsVerificationId` / `emailVerificationId` (records stay valid ~60 days).
   * Sandbox destinations (`+1000…` numbers, `@sandbox.test` emails) accept the
   * fixed code 000000 on test-mode projects.
   */
  public readonly verifications = {
    create: async (params: { channel: 'sms' | 'email'; destination: string }): Promise<OnrampVerificationStart> => {
      const response = await withApiError(
        async () => (await this.fundingApi.createOnrampVerification({ createOnrampVerificationRequest: params })).data,
        { context: 'funding.verifications.create' }
      )
      return response as OnrampVerificationStart
    },

    submit: async (verificationId: string, otpCode: string): Promise<OnrampVerificationRecord> => {
      const response = await withApiError(
        async () =>
          (
            await this.fundingApi.submitOnrampVerification({
              verificationId,
              submitOnrampVerificationRequest: { otpCode },
            })
          ).data,
        { context: 'funding.verifications.submit' }
      )
      return response as OnrampVerificationRecord
    },
  }

  /**
   * Stripe v2 embedded-components (Link-auth headless) helpers: mint the
   * LinkAuthIntent the client's auth element needs, then exchange it for its
   * server-side token after the buyer completes Link. The token never reaches
   * the client — committing (`stripeLink` on the payment method) and
   * `sessions.checkout` look it up by the intent id.
   */
  public readonly stripeLink = {
    createAuthIntent: async (params: { email: string }): Promise<{ id: string }> => {
      const response = await withApiError(
        async () =>
          (await this.fundingApi.createStripeLinkAuthIntent({ createStripeLinkAuthIntentRequest: params })).data,
        { context: 'funding.stripeLink.createAuthIntent' }
      )
      return response as { id: string }
    },

    exchangeToken: async (intentId: string): Promise<void> => {
      await withApiError(async () => (await this.fundingApi.exchangeStripeLinkToken({ intentId })).data, {
        context: 'funding.stripeLink.exchangeToken',
      })
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
