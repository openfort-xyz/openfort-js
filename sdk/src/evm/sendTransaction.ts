import { StaticJsonRpcProvider, TransactionRequest } from '@ethersproject/providers';
import { BackendApiClients } from '@openfort/openapi-clients';
import { Interaction, ResponseResponse, TransactionIntentResponse } from 'types';
import { EmbeddedSigner } from 'signer/embedded.signer';
import InstanceManager from 'instanceManager';
import { JsonRpcError, RpcErrorCode } from './JsonRpcError';

export type EthSendTransactionParams = {
  signer: EmbeddedSigner;
  rpcProvider: StaticJsonRpcProvider;
  backendClient: BackendApiClients;
  instanceManager: InstanceManager;
  params: Array<any>;
};

const buildOpenfortTransactions = async (
  transactionRequest: TransactionRequest[],
  rpcProvider: StaticJsonRpcProvider,
  backendApiClients: BackendApiClients,
  instanceManager: InstanceManager,
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
  const accessToken = instanceManager.getAccessToken();
  if (!accessToken) {
    throw new JsonRpcError(RpcErrorCode.RPC_SERVER_ERROR, 'No access token found');
  }

  const transactionResponse = await backendApiClients.transactionIntentsApi.createTransactionIntent(
    {
      createTransactionIntentRequest: {
        // TODO: This should come from the config
        policy: 'pol_1fc278fe-82cc-43c2-aec8-f6a4bdc71169',
        chainId: (await rpcProvider.detectNetwork()).chainId,
        interactions,
      },
    },
    {
      headers: {
        authorization: `Bearer ${backendApiClients.config.backend.accessToken}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken.token,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-auth-provider': accessToken.thirdPartyProvider,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-token-type': accessToken.thirdPartyTokenType,
      },
    },
  );

  return transactionResponse.data;
};

export const sendTransaction = async ({
  params,
  signer,
  rpcProvider,
  backendClient,
  instanceManager,
}: EthSendTransactionParams): Promise<string> => {
  const openfortTransaction = await buildOpenfortTransactions(
    params,
    rpcProvider,
    backendClient,
    instanceManager,
  );
  let response: ResponseResponse;
  if (openfortTransaction?.nextAction?.payload?.userOperationHash) {
    const signature = await signer.sign(openfortTransaction.nextAction.payload.userOperationHash);
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
  console.log('Transaction hash:', response);
  return response.transactionHash!;
};
