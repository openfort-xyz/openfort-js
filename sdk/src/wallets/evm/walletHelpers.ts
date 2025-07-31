import { TypedDataPayload } from './types';
import { Signer } from '../isigner';
import { AccountType } from '../../types/types';

export const signMessage = async (
  hash: string,
  implementationType: string,
  chainId: number,
  signer: Signer,
  evmAddress: string,
): Promise<string> => {
  let typedDataHash = hash;
  if ([
    AccountType.UPGRADEABLE_V5,
    AccountType.UPGRADEABLE_V6,
    AccountType.ZKSYNC_UPGRADEABLE_V1,
    AccountType.ZKSYNC_UPGRADEABLE_V2,
  ].includes(implementationType as AccountType)) {
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
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { _TypedDataEncoder } = await import('@ethersproject/hash');
    typedDataHash = _TypedDataEncoder.hash(updatedDomain, updatedTypes, updatedMessage);
  }

  return await signer.sign(typedDataHash, false, false);
};
