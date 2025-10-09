import type { BackendApiClients } from '@openfort/openapi-clients'
import { SDKConfiguration } from '../core/config/config'
import { OpenfortError, OpenfortErrorType, withOpenfortError } from '../core/errors/openfortError'
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
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION)
    }
    await this.validateAndRefreshToken()
    let newSignature = signature
    if (!newSignature) {
      if (!signableHash) {
        throw new OpenfortError(
          'No signableHash or signature provided',
          OpenfortErrorType.OPERATION_NOT_SUPPORTED_ERROR
        )
      }

      if (!this.getSignerSignFunction) {
        throw new OpenfortError(
          'In order to sign a transaction intent, a signer must be configured',
          OpenfortErrorType.MISSING_SIGNER_ERROR
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
    return withOpenfortError<TransactionIntentResponse>(
      async () => {
        const result = await this.backendApiClients.transactionIntentsApi.signature(request)
        return result.data
      },
      { default: OpenfortErrorType.INTERNAL_ERROR }
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

    return withOpenfortError<SessionResponse>(
      async () => {
        const result = await this.backendApiClients.sessionsApi.signatureSession(request)
        return result.data
      },
      { default: OpenfortErrorType.INTERNAL_ERROR }
    )
  }
}
