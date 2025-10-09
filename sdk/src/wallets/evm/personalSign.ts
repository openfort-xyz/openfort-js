import type { Account } from '../../core/configuration/account'
import { hexToString } from '../../utils/crypto'
import type { Signer as OpenfortSigner } from '../isigner'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'
import { signMessage } from './walletHelpers'

interface PersonalSignParams {
  signer: OpenfortSigner
  account: Account
  params: any[]
}

export const personalSign = async ({ params, signer, account }: PersonalSignParams): Promise<string> => {
  const message: string = params[0]
  const fromAddress: string = params[1]

  if (!fromAddress || !message) {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'personal_sign requires an address and a message')
  }

  if (fromAddress.toLowerCase() !== account.address.toLowerCase()) {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'personal_sign requires the signer to be the from address')
  }
  const { hashMessage } = await import('@ethersproject/hash')

  return await signMessage({
    hash: hashMessage(hexToString(message as `0x${string}`)),
    implementationType: (account.implementationType || account.type)!,
    chainId: Number(account.chainId),
    signer,
    address: fromAddress,
    salt: account.salt,
    factoryAddress: account.factoryAddress,
    ownerAddress: account.ownerAddress,
  })
}
