import { type BackendApiClients } from '@openfort/openapi-clients';
import { Account } from '../../core/configuration/account';
import { Authentication } from '../../core/configuration/authentication';
import { OpenfortErrorType, withOpenfortError } from '../../core/errors/openfortError';
import { JsonRpcError, RpcErrorCode } from './JsonRpcError';
import { Signer } from '../isigner';
import { Interaction, TransactionIntentResponse } from '../../types/types';

export type WalletSendCallsParams = {
  signer: Signer
  backendClient: BackendApiClients;
  account: Account;
  authentication: Authentication;
  policyId?: string;
  params: any[]
};

type RawCall = { data?: `0x${string}`; to?: `0x${string}`; value?: bigint };

const buildOpenfortTransactions = async (
  calls: RawCall[],
  backendApiClients: BackendApiClients,
  account: Account,
  authentication: Authentication,
  policyId?: string,
): Promise<TransactionIntentResponse> => {
  const interactions: Interaction[] = calls.map((call) => {
    if (!call.to) {
      throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'wallet_sendCalls requires a "to" field');
    }
    return {
      to: String(call.to),
      data: call.data ? String(call.data) : undefined,
      value: call.value ? String(call.value) : undefined,
    };
  });

  return withOpenfortError<TransactionIntentResponse>(async () => {
    const response = await backendApiClients.transactionIntentsApi.createTransactionIntent(
      {
        createTransactionIntentRequest: {
          account: account.id,
          policy: policyId,
          chainId: account.chainId!,
          interactions,
        },
      },
      {
        headers: {
          authorization: `Bearer ${backendApiClients.config.backend.accessToken}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-player-token': authentication.token,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-auth-provider': authentication.thirdPartyProvider,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-token-type': authentication.thirdPartyTokenType,
        },
      },
    );
    return response.data;
    // eslint-disable-next-line @typescript-eslint/naming-convention
  }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
};

export const sendCalls = async ({
  params,
  signer,
  account,
  authentication,
  backendClient,
  policyId,
}: WalletSendCallsParams): Promise<`0x${string}`> => {
  const policy = params[0]?.capabilities?.paymasterService?.policy ?? policyId;
  const openfortTransaction = await buildOpenfortTransactions(
    params,
    backendClient,
    account,
    authentication,
    policy,
  ).catch((error) => {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message);
  });

  if (openfortTransaction.response?.error.reason) {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, openfortTransaction.response?.error.reason);
  }

  if (openfortTransaction?.nextAction?.payload?.signableHash) {
    let signature: string;
    // zkSync based chains need a different signature
    if ([300, 531050104, 324, 50104, 2741, 11124].includes(account.chainId!)) {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash, false, false);
    } else {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash);
    }
    const response = await withOpenfortError(async () => await backendClient.transactionIntentsApi.signature({
      id: openfortTransaction.id,
      signatureRequest: { signature },
    }), { default: OpenfortErrorType.AUTHENTICATION_ERROR }).catch((error) => {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message);
    });

    if (response.data.response?.status === 0) {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, response.data.response?.error.reason);
    }

    return response.data.response?.transactionHash as `0x${string}`;
  }
  return openfortTransaction.response?.transactionHash as `0x${string}`;
};
