import type { StaticJsonRpcProvider } from '@ethersproject/providers'
import type { BackendApiClients } from '@openfort/openapi-clients'
import type { Account } from '../../core/configuration/account'
import type { Authentication } from '../../core/configuration/authentication'
import type { Signer } from '../isigner'
import { sendCallsSync } from './sendCallSync'

type WalletSendCallsParams = {
  signer: Signer
  backendClient: BackendApiClients
  account: Account
  authentication: Authentication
  rpcProvider: StaticJsonRpcProvider
  policyId?: string
  params: any[]
}

export const sendCalls = async ({
  params,
  signer,
  account,
  authentication,
  backendClient,
  rpcProvider,
  policyId,
}: WalletSendCallsParams): Promise<string> => {
  const response = await sendCallsSync({
    params,
    signer,
    account,
    authentication,
    backendClient,
    rpcProvider,
    policyId,
  })

  return response.id
}
