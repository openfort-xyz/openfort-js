import { TransactionRequest } from '@ethersproject/providers';
import { BackendApiClients } from '@openfort/openapi-clients';
import { Account } from 'configuration/account';
import { Authentication } from 'configuration/authentication';
import { JsonRpcError, RpcErrorCode } from './JsonRpcError';
import { Signer } from '../signer/isigner';
import { Interaction, ResponseResponse, TransactionIntentResponse } from '../types';

export type EthSendTransactionParams = {
  signer: Signer
  backendClient: BackendApiClients;
  account: Account;
  authentication: Authentication;
  params: Array<any>;
  policyId?: string;
};

const buildOpenfortTransactions = async (
  transactionRequest: TransactionRequest[],
  backendApiClients: BackendApiClients,
  account: Account,
  authentication: Authentication,
  policyId?: string,
): Promise<TransactionIntentResponse> => {
  const interactions:Interaction[] = transactionRequest.map((tx) => {
    if (!tx.to) {
      throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'eth_sendTransaction requires a "to" field');
    }
    return {
      to: String(tx.to),
      data: tx.data ? String(tx.data) : undefined,
      value: tx.value ? String(tx.value) : undefined,
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

export const sendTransaction = async ({
  params,
  signer,
  account,
  authentication,
  backendClient,
  policyId,
}: EthSendTransactionParams): Promise<string> => {
  const openfortTransaction = await buildOpenfortTransactions(
    params,
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

  return response.transactionHash!;
};
