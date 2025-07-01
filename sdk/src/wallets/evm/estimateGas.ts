import { type BackendApiClients } from '@openfort/openapi-clients';
import { Account } from '../../core/configuration/account';
import { Authentication } from '../../core/configuration/authentication';
import { OpenfortErrorType, withOpenfortError } from '../../core/errors/openfortError';
import { JsonRpcError, RpcErrorCode } from './JsonRpcError';
import { Interaction, EstimateTransactionIntentGasResult } from '../../types/types';

export type EthEstimateGasParams = {
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
): Promise<EstimateTransactionIntentGasResult> => {
  const interactions: Interaction[] = calls.map((call) => {
    if (!call.to) {
      throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'eth_estimateGas requires a "to" field');
    }
    return {
      to: String(call.to),
      data: call.data ? String(call.data) : undefined,
      value: call.value ? String(call.value) : undefined,
    };
  });

  return withOpenfortError<EstimateTransactionIntentGasResult>(async () => {
    const response = await backendApiClients.transactionIntentsApi.estimateTransactionIntentCost(
      {
        createTransactionIntentRequest: {
          policy: policyId,
          chainId: account.chainId,
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

export const estimateGas = async ({
  params,
  account,
  authentication,
  backendClient,
  policyId,
}: EthEstimateGasParams): Promise<`0x${string}`> => {
  const openfortTransaction = await buildOpenfortTransactions(
    params,
    backendClient,
    account,
    authentication,
    policyId,
  ).catch((error) => {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message);
  });

  return openfortTransaction.estimatedTXGas as `0x${string}`;
};
