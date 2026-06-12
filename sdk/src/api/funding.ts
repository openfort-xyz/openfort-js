import { SDKConfiguration } from '../core/config/config'
import { ConfigurationError } from '../core/errors/openfortError'

/**
 * Funding (cross-chain wallet deposit) resource.
 *
 * Wraps the API's `/v2/funding` session endpoints: create a session for a
 * destination, set a single payment method (a source route) to mint a Relay
 * deposit address, then poll until terminal. Sessions are guarded by a
 * per-session `clientSecret` and authenticated with the project publishable key.
 *
 * NOTE: This thin wrapper calls the backend directly. Once the API's funding
 * endpoints are part of the published OpenAPI spec, this can move onto the
 * generated `BackendApiClients.fundingApi` like the other resources.
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

export interface FundingPaymentMethodInput {
  type: 'evm' | 'solana'
  source: FundingSource
  /** Origin-chain refund address; defaults server-side to the target address. */
  refundTo?: string
}

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

export interface FundingPaymentMethod {
  type: string
  source: FundingSource
  receiverAddress: string
  addressUri: string
  deeplinks: FundingWalletDeeplink[]
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

/** Hard ceiling per funding request so a stalled backend can't hang the app. */
const FUNDING_REQUEST_TIMEOUT_MS = 30_000

export class FundingApi {
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const configuration = SDKConfiguration.getInstance()
    if (!configuration) {
      throw new ConfigurationError('Configuration not found')
    }
    const response = await fetch(`${configuration.backendUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(FUNDING_REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Openfort funding request failed (${response.status}): ${body}`)
    }
    return response.json() as Promise<T>
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
    create: async (params: CreateFundingSessionParams): Promise<FundingSession> =>
      this.remember(
        await this.request<FundingSession>('/v2/funding/sessions', {
          method: 'POST',
          body: JSON.stringify(params),
        })
      ),

    setPaymentMethod: (
      sessionId: string,
      params: { paymentMethod: FundingPaymentMethodInput; clientSecret?: string }
    ): Promise<FundingSession> =>
      this.request<FundingSession>(`/v2/funding/sessions/${sessionId}/payment_methods`, {
        method: 'POST',
        body: JSON.stringify({
          clientSecret: this.resolveSecret(sessionId, params.clientSecret),
          paymentMethod: params.paymentMethod,
        }),
      }),

    get: (sessionId: string, params?: { clientSecret?: string }): Promise<FundingSession> => {
      const secret = this.resolveSecret(sessionId, params?.clientSecret)
      return this.request<FundingSession>(
        `/v2/funding/sessions/${sessionId}?clientSecret=${encodeURIComponent(secret)}`
      )
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
}
