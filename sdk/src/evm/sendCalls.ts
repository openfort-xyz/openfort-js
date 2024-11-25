import { BackendApiClients } from '@openfort/openapi-clients';
import { Account } from 'configuration/account';
import { Authentication } from 'configuration/authentication';
import { JsonRpcError, RpcErrorCode } from './JsonRpcError';
import { Signer } from '../signer/isigner';
import { Interaction, ResponseResponse, TransactionIntentResponse } from '../types';

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

  const transactionResponse = await backendApiClients.transactionIntentsApi.createTransactionIntent(
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

  return transactionResponse.data;
};

export const sendCalls = async ({
  params,
  signer,
  account,
  authentication,
  backendClient,
  policyId,
}: WalletSendCallsParams): Promise<`0x${string}`> => {
  const openfortTransaction = await buildOpenfortTransactions(
    params[0].calls,
    backendClient,
    account,
    authentication,
    policyId,
  );
  let response: ResponseResponse;
  if (openfortTransaction?.nextAction?.payload?.signableHash) {
    const signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash);
    const openfortSignatureResponse = (
      await backendClient.transactionIntentsApi.signature({
        id: openfortTransaction.id,
        signatureRequest: { signature },
      })
    ).data.response;
    if (!openfortSignatureResponse) {
      throw new JsonRpcError(RpcErrorCode.RPC_SERVER_ERROR, 'Transaction failed to submit');
    }
    response = openfortSignatureResponse;
  } else if (openfortTransaction.response) {
    response = openfortTransaction.response;
  } else {
    throw new JsonRpcError(RpcErrorCode.RPC_SERVER_ERROR, 'Transaction failed to submit');
  }

  if (response.status === 0 && !response.transactionHash) {
    throw new JsonRpcError(RpcErrorCode.RPC_SERVER_ERROR, response.error.reason);
  }

  return response.transactionHash as `0x${string}`;
};
