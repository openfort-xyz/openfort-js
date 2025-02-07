import { BackendApiClients } from '@openfort/openapi-clients';
import { Account } from 'configuration/account';
import { Authentication } from 'configuration/authentication';
import { RevokeSessionRequest } from '@openfort/openapi-clients/dist/backend';
import { JsonRpcError, RpcErrorCode } from './JsonRpcError';
import { Signer } from '../signer/isigner';
import { SessionResponse } from '../types';

export type WalletRequestPermissionsParams = {
  params: RevokePermissionsRequestParams[];
  signer: Signer;
  backendClient: BackendApiClients;
  account: Account;
  authentication: Authentication;
  policyId?: string;
};

export type RevokePermissionsRequestParams = {
  permissionContext: `0x${string}`;
};

const formatSessionRequest = (
  address: string,
  chainId: number,
  player: string,
  policyId?: string,
): RevokeSessionRequest => {
  const request: RevokeSessionRequest = {
    address,
    chainId,
    player,
  };

  if (policyId) request.policy = policyId;

  return request;
};

const buildOpenfortTransactions = async (
  params: RevokePermissionsRequestParams,
  backendApiClients: BackendApiClients,
  account: Account,
  authentication: Authentication,
  policyId?: string,
): Promise<SessionResponse> => {
  const sessionRequest = formatSessionRequest(
    params.permissionContext,
    account.chainId,
    authentication.player,
    policyId,
  );

  const transactionResponse = await backendApiClients.sessionsApi.revokeSession(
    {
      revokeSessionRequest: sessionRequest,
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

export const revokeSession = async ({
  params,
  signer,
  account,
  authentication,
  backendClient,
  policyId,
}: WalletRequestPermissionsParams): Promise<{}> => {
  const param = params[0];
  if (!param.permissionContext) {
    return {};
  }
  const openfortTransaction = await buildOpenfortTransactions(
    param,
    backendClient,
    account,
    authentication,
    policyId,
  );

  let response: SessionResponse;

  if (openfortTransaction?.nextAction?.payload?.signableHash) {
    let signature;
    // zkSync based chains need a different signature
    if ([300, 531050104, 324, 50104, 2741, 11124].includes(account.chainId)) {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash, false, false);
    } else {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash);
    }

    const openfortSignatureResponse = await backendClient.sessionsApi.signatureSession({
      id: openfortTransaction.id,
      signatureRequest: { signature },
    });

    if (!openfortSignatureResponse) {
      throw new JsonRpcError(
        RpcErrorCode.RPC_SERVER_ERROR,
        'Transaction failed to submit',
      );
    }
    response = openfortSignatureResponse.data;
  } else {
    throw new JsonRpcError(
      RpcErrorCode.RPC_SERVER_ERROR,
      'Transaction failed to submit',
    );
  }

  if (response.isActive === false) {
    throw new JsonRpcError(
      RpcErrorCode.RPC_SERVER_ERROR,
      'Failed to request permissions',
    );
  }

  return {};
};
