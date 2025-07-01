import { BackendApiClients } from '@openfort/openapi-clients';
import { SignerManager } from '../wallets/signer';
import { SDKConfiguration } from '../core/config/config';
import { OpenfortError, OpenfortErrorType, withOpenfortError } from '../core/errors/openfortError';
import { TransactionIntentResponse, SessionResponse } from '../types/types';
import { IStorage } from '../storage/istorage';

export class ProxyApi {
  constructor(
    private storage: IStorage,
    private backendApiClients: BackendApiClients,
    private validateAndRefreshToken: () => Promise<void>,
    private ensureInitialized: () => Promise<void>,
  ) { }

  async sendSignatureTransactionIntentRequest(
    transactionIntentId: string,
    signableHash: string | null = null,
    signature: string | null = null,
    optimistic: boolean = false,
  ): Promise<TransactionIntentResponse> {
    await this.ensureInitialized();
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    await this.validateAndRefreshToken();
    let newSignature = signature;
    if (!newSignature) {
      if (!signableHash) {
        throw new OpenfortError(
          'No signableHash or signature provided',
          OpenfortErrorType.OPERATION_NOT_SUPPORTED_ERROR,
        );
      }

      const signer = await SignerManager.fromStorage(this.storage);
      if (!signer) {
        throw new OpenfortError(
          'In order to sign a transaction intent, a signer must be configured',
          OpenfortErrorType.MISSING_SIGNER_ERROR,
        );
      }

      newSignature = await signer.sign(signableHash);
    }

    const request = {
      id: transactionIntentId,
      signatureRequest: {
        signature: newSignature,
        optimistic,
      },
    };
    return withOpenfortError<TransactionIntentResponse>(async () => {
      const result = await this.backendApiClients.transactionIntentsApi.signature(request);
      return result.data;
    }, { default: OpenfortErrorType.INTERNAL_ERROR });
  }

  async sendSignatureSessionRequest(
    sessionId: string,
    signature: string,
    optimistic?: boolean,
  ): Promise<SessionResponse> {
    await this.ensureInitialized();
    const request = {
      id: sessionId,
      signatureRequest: {
        signature,
        optimistic,
      },
    };

    return withOpenfortError<SessionResponse>(async () => {
      const result = await this.backendApiClients.sessionsApi.signatureSession(request);
      return result.data;
    }, { default: OpenfortErrorType.INTERNAL_ERROR });
  }
}
