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
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Openfort funding request failed (${response.status}): ${body}`)
    }
    return response.json() as Promise<T>
  }

  /** Funding session sub-resource: create → setPaymentMethod → get (poll). */
  public readonly sessions = {
    create: (params: CreateFundingSessionParams): Promise<FundingSession> =>
      this.request<FundingSession>('/v2/funding/sessions', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    setPaymentMethod: (
      sessionId: string,
      params: { clientSecret: string; paymentMethod: FundingPaymentMethodInput }
    ): Promise<FundingSession> =>
      this.request<FundingSession>(`/v2/funding/sessions/${sessionId}/payment_methods`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    get: (sessionId: string, params?: { clientSecret?: string }): Promise<FundingSession> => {
      const query = params?.clientSecret ? `?clientSecret=${encodeURIComponent(params.clientSecret)}` : ''
      return this.request<FundingSession>(`/v2/funding/sessions/${sessionId}${query}`)
    },
  }
}
