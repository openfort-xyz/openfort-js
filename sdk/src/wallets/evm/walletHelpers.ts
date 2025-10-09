import { AccountType } from '../../types/types'
import type { Signer } from '../isigner'
import type { TypedDataPayload } from './types'

type SignMessageParameters = {
  hash: string
  implementationType: string
  chainId: number
  signer: Signer
  address: string
  factoryAddress?: string
  ownerAddress?: string
  salt?: string
}
const erc6492MagicBytes = '0x6492649264926492649264926492649264926492649264926492649264926492' as const

export const signMessage = async (parameters: SignMessageParameters): Promise<string> => {
  const { hash, signer, ownerAddress, factoryAddress, salt, chainId, address, implementationType } = parameters
  let typedDataHash = hash
  if (
    [
      AccountType.UPGRADEABLE_V5,
      AccountType.UPGRADEABLE_V6,
      AccountType.ZKSYNC_UPGRADEABLE_V1,
      AccountType.ZKSYNC_UPGRADEABLE_V2,
    ].includes(implementationType as AccountType)
  ) {
    const updatedDomain: TypedDataPayload['domain'] = {
      name: 'Openfort',
      version: '0.5',
      chainId: Number(chainId),
      verifyingContract: address,
    }
    const updatedTypes = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      OpenfortMessage: [{ name: 'hashedMessage', type: 'bytes32' }],
    }
    const updatedMessage = {
      hashedMessage: typedDataHash,
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { _TypedDataEncoder } = await import('@ethersproject/hash')
    typedDataHash = _TypedDataEncoder.hash(updatedDomain, updatedTypes, updatedMessage)
  }

  const signature = await signer.sign(typedDataHash, false, false)
  if (factoryAddress && salt) {
    if ([AccountType.UPGRADEABLE_V5, AccountType.UPGRADEABLE_V6].includes(implementationType as AccountType)) {
      const { id } = await import('@ethersproject/hash')
      const { defaultAbiCoder } = await import('@ethersproject/abi')
      const { hexConcat } = await import('@ethersproject/bytes')
      const createAccountSelector = id('createAccountWithNonce(address,bytes32,bool)').slice(0, 10)
      const encodedParams = defaultAbiCoder.encode(['address', 'bytes32', 'bool'], [ownerAddress, salt, false])
      const factoryCalldata = hexConcat([createAccountSelector, encodedParams])
      const metadata = defaultAbiCoder.encode(
        ['address', 'bytes', 'bytes'],
        [factoryAddress, factoryCalldata, signature]
      )
      return hexConcat([metadata, erc6492MagicBytes])
    }
  }
  return signature
}
