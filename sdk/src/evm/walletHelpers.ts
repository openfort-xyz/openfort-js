import { UnionOmit } from 'utils/helpers';
import { TypedDataPayload } from './types';
import { Signer } from '../signer/isigner';
import { AccountType } from '../types';

export const getSignedTypedData = async (
  typedData: UnionOmit<TypedDataPayload, 'primaryType'>,
  accountType: string,
  chainId: number,
  signer: Signer,
  evmAddress: string,
): Promise<string> => {
  // Ethers auto-generates the EIP712Domain type in the TypedDataEncoder, and so it needs to be removed
  const types = { ...typedData.types };
  // @ts-ignore
  delete types.EIP712Domain;

  // Hash the EIP712 payload and generate the complete payload
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { _TypedDataEncoder } = await import('@ethersproject/hash');
  let typedDataHash = _TypedDataEncoder.hash(typedData.domain, types, typedData.message);

  if ([
    AccountType.UPGRADEABLE_V5,
    AccountType.UPGRADEABLE_V6,
    AccountType.ZKSYNC_UPGRADEABLE_V1,
    AccountType.ZKSYNC_UPGRADEABLE_V2,
  ].includes(accountType as AccountType)) {
    const updatedDomain: TypedDataPayload['domain'] = {
      name: 'Openfort',
      version: '0.5',
      chainId: Number(chainId),
      verifyingContract: evmAddress,
    };
    const updatedTypes = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      OpenfortMessage: [{ name: 'hashedMessage', type: 'bytes32' }],
    };
    const updatedMessage = {
      hashedMessage: typedDataHash,
    };
    typedDataHash = _TypedDataEncoder.hash(updatedDomain, updatedTypes, updatedMessage);
  }

  const ethsigNoType = await signer.sign(typedDataHash, false, false);

  return ethsigNoType;
};
