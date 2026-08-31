import type { BackendApiClients } from '@openfort/openapi-clients'
import { SDKConfiguration } from '../core/config/config'
import { OPENFORT_AUTH_ERROR_CODES } from '../core/errors/authErrorCodes'
import { ConfigurationError, SignerError } from '../core/errors/openfortError'
import { withApiError } from '../core/errors/withApiError'
import type { IStorage } from '../storage/istorage'
import type { SessionResponse, TransactionResponse } from '../types/types'

export class ProxyApi {
  constructor(
    _storage: IStorage,
    private backendApiClients: BackendApiClients,
    private validateAndRefreshToken: () => Promise<void>,
    private ensureInitialized: () => Promise<void>,
    private getSignerSignFunction?: () => Promise<(message: string | Uint8Array) => Promise<string>>
  ) {}

  /**
   * Signs (when needed) and submits the signature of a /v2/transactions transaction.
   * @param transactionId The transaction id (tin_).
   * @param hash The nextAction.hash to sign with the configured signer; ignored when a signature is given.
   * @param signature A ready-made signature (e.g. from a session key).
   * @param optimistic Resolve at broadcast instead of waiting for the receipt.
   */
  async sendTransactionSignatureRequest(
    transactionId: string,
    hash: string | null = null,
    signature: string | null = null,
    optimistic: boolean = false
  ): Promise<TransactionResponse> {
    await this.ensureInitialized()
    const configuration = SDKConfiguration.getInstance()
    if (!configuration) {
      throw new ConfigurationError('Configuration not found')
    }
    await this.validateAndRefreshToken()
    let newSignature = signature
    if (!newSignature) {
      if (!hash) {
        throw new ConfigurationError('No hash or signature provided')
      }

      if (!this.getSignerSignFunction) {
        throw new SignerError(
          OPENFORT_AUTH_ERROR_CODES.MISSING_SIGNER,
          'In order to sign a transaction intent, a signer must be configured'
        )
      }

      const signFunction = await this.getSignerSignFunction()

      newSignature = await signFunction(hash)
    }

    const request = {
      id: transactionId,
      submitTransactionSignatureRequestV2: {
        signature: newSignature,
        waitForReceipt: !optimistic,
      },
    }
    return withApiError<TransactionResponse>(
      async () => {
        const result = await this.backendApiClients.transactionsApi.submitTransactionSignatureV2(request)
        return result.data as TransactionResponse
      },
      { context: 'sendTransactionSignatureRequest' }
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
