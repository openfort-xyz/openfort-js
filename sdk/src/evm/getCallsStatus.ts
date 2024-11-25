import { BackendApiClients } from '@openfort/openapi-clients';
import { Account } from 'configuration/account';
import { Authentication } from 'configuration/authentication';
import { Prettify } from 'utils/helpers';
import { TransactionIntentResponse } from '../types';

export type GetCallsStatusParameters = string[];

// eslint-disable-next-line @typescript-eslint/naming-convention
export type WalletCallReceipt<quantity = `0x${string}`, status = `0x${string}`> = {
  logs: {
    address: `0x${string}`
    data: `0x${string}`
    topics: `0x${string}`[]
  }[]
  status: status
  blockHash: `0x${string}`
  blockNumber: quantity
  gasUsed: quantity
  transactionHash: `0x${string}`
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export type WalletGetCallsStatusReturnType<quantity = `0x${string}`, status = `0x${string}`> = {
  status: 'PENDING' | 'CONFIRMED'
  receipts?: WalletCallReceipt<quantity, status>[] | undefined
};

export type GetCallsStatusReturnType = Prettify<
WalletGetCallsStatusReturnType<bigint, 'success' | 'reverted'>
>;

export type GetCallsStatusParams = {
  backendClient: BackendApiClients;
  account: Account;
  authentication: Authentication;
  policyId?: string;
  params: GetCallsStatusParameters;
};

const buildOpenfortTransactions = async (
  transactionIntentId: string,
  backendApiClients: BackendApiClients,
  authentication: Authentication,
): Promise<TransactionIntentResponse> => {
  const transactionResponse = await backendApiClients.transactionIntentsApi.getTransactionIntent(
    {
      id: transactionIntentId,
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

export const getCallStatus = async ({
  params,
  authentication,
  backendClient,
}: GetCallsStatusParams): Promise<GetCallsStatusReturnType> => {
  const transactionIntent = await buildOpenfortTransactions(
    params[0],
    backendClient,
    authentication,
  );

  return {
    status: !transactionIntent.response ? 'PENDING' : 'CONFIRMED',
    receipts: transactionIntent.response
      ? [{
        status: transactionIntent.response.status === 0 ? 'reverted' : 'success',
        logs: transactionIntent.response.logs?.map((log) => ({
          address: log.address as `0x${string}`,
          data: log.data as `0x${string}`,
          topics: log.topics as `0x${string}`[],
        })) || [],
        blockHash: transactionIntent.response.transactionHash as `0x${string}` || '',
        blockNumber: BigInt(transactionIntent.response.blockNumber || 0),
        gasUsed: BigInt(transactionIntent.response.gasUsed || 0),
        transactionHash: transactionIntent.response.transactionHash as `0x${string}` || '',
      }]
      : undefined,
  };
};
