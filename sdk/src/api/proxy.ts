import type { BackendApiClients } from '@openfort/openapi-clients'
import { SDKConfiguration } from '../core/config/config'
import { OPENFORT_AUTH_ERROR_CODES } from '../core/errors/authErrorCodes'
import { ConfigurationError, SignerError } from '../core/errors/openfortError'
import { withApiError } from '../core/errors/withApiError'
import type { IStorage } from '../storage/istorage'
import type { SessionResponse, TransactionIntentResponse } from '../types/types'

export class ProxyApi {
  constructor(
    _storage: IStorage,
    private backendApiClients: BackendApiClients,
    private validateAndRefreshToken: () => Promise<void>,
    private ensureInitialized: () => Promise<void>,
    private getSignerSignFunction?: () => Promise<(message: string | Uint8Array) => Promise<string>>
  ) {}

  async sendSignatureTransactionIntentRequest(
    transactionIntentId: string,
    signableHash: string | null = null,
    signature: string | null = null,
    optimistic: boolean = false
  ): Promise<TransactionIntentResponse> {
    await this.ensureInitialized()
    const configuration = SDKConfiguration.getInstance()
    if (!configuration) {
      throw new ConfigurationError('Configuration not found')
    }
    await this.validateAndRefreshToken()
    let newSignature = signature
    if (!newSignature) {
      if (!signableHash) {
        throw new ConfigurationError('No signableHash or signature provided')
      }

      if (!this.getSignerSignFunction) {
        throw new SignerError(
          OPENFORT_AUTH_ERROR_CODES.MISSING_SIGNER,
          'In order to sign a transaction intent, a signer must be configured'
        )
      }

      const signFunction = await this.getSignerSignFunction()

      newSignature = await signFunction(signableHash)
    }

    const request = {
      id: transactionIntentId,
      signatureRequest: {
        signature: newSignature,
        optimistic,
      },
    }
    return withApiError<TransactionIntentResponse>(
      async () => {
        const result = await this.backendApiClients.transactionIntentsApi.signature(request)
        return result.data
      },
      { context: 'sendSignatureTransactionIntentRequest' }
    )
  }

  async sendSignatureSessionRequest(
    sessionId: string,
    signature: string,
    optimistic?: boolean
  ): Promise<SessionResponse> {
    await this.ensureInitialized()
    const request = {
      id: sessionId,
      signatureRequest: {
        signature,
        optimistic,
      },
    }

    return withApiError<SessionResponse>(
      async () => {
        const result = await this.backendApiClients.sessionsApi.signatureSession(request)
        return result.data
      },
      { context: 'sendSignatureSessionRequest' }
    )
  }
}
