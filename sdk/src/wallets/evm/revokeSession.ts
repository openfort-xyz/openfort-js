import { type BackendApiClients } from '@openfort/openapi-clients';
import { RevokeSessionRequest } from '@openfort/openapi-clients/dist/backend';
import { Account } from '../../core/configuration/account';
import { Authentication } from '../../core/configuration/authentication';
import { OpenfortErrorType, withOpenfortError } from '../../core/errors/openfortError';
import { JsonRpcError, RpcErrorCode } from './JsonRpcError';
import { Signer } from '../isigner';
import { SessionResponse } from '../../types/types';

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
  account?: string,
): RevokeSessionRequest => {
  const request: RevokeSessionRequest = {
    address,
    chainId,
    player,
    account,
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
    account.chainId!,
    authentication.player,
    policyId,
    account.id,
  );

  return withOpenfortError<SessionResponse>(async () => {
    const response = await backendApiClients.sessionsApi.revokeSession(
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

    return response.data;
    // eslint-disable-next-line @typescript-eslint/naming-convention
  }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
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
    await signer.disconnect();
    return {};
  }
  const openfortTransaction = await buildOpenfortTransactions(
    param,
    backendClient,
    account,
    authentication,
    policyId,
  ).catch((error) => {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message);
  });

  if (openfortTransaction?.nextAction?.payload?.signableHash) {
    let signature;
    // zkSync based chains need a different signature
    if ([300, 531050104, 324, 50104, 2741, 11124].includes(account.chainId!)) {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash, false, false);
    } else {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash);
    }

    const openfortSignatureResponse = await backendClient.sessionsApi.signatureSession({
      id: openfortTransaction.id,
      signatureRequest: { signature },
    }).catch((error) => {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message);
    });

    return openfortSignatureResponse.data;
  }
  return openfortTransaction;
};
