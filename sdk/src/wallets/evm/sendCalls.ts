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
  policyId?: string
  params: any[]
}

export const sendCalls = async ({
  params,
  signer,
  account,
  authentication,
  backendClient,
  policyId,
}: WalletSendCallsParams): Promise<string> => {
  const response = await sendCallsSync({
    params,
    signer,
    account,
    authentication,
    backendClient,
    policyId,
  })

  return response.id
}
