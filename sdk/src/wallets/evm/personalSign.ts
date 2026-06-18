import type { Account } from '../../core/configuration/account'
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

  // personal_sign (EIP-191) accepts either a 0x-prefixed byte string or a plain UTF-8
  // string. Hash the raw bytes for hex input and the string itself otherwise — matching
  // MetaMask/ethers/viem. Previously only hex was handled, so callers passing a raw
  // string (e.g. a SIWE / EIP-4361 sign-in message) produced an invalid signature.
  const { hashMessage } = await import('@ethersproject/hash')
  const { arrayify, isHexString } = await import('@ethersproject/bytes')
  const data = isHexString(message) ? arrayify(message) : message

  return await signMessage({
    hash: hashMessage(data),
    implementationType: (account.implementationType || account.type)!,
    chainId: Number(account.chainId),
    signer,
    address: fromAddress,
    salt: account.salt,
    factoryAddress: account.factoryAddress,
    ownerAddress: account.ownerAddress,
  })
}
