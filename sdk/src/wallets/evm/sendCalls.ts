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
}: WalletSendCallsParams): Promise<`0x${string}`> => {
  const receipt = await sendCallsSync({
    params,
    signer,
    account,
    authentication,
    backendClient,
    policyId,
  })

  if (!receipt.transactionHash) {
    throw new Error('Transaction hash not available in receipt')
  }

  return receipt.transactionHash as `0x${string}`
}
