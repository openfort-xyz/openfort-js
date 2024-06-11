import { _TypedDataEncoder } from '@ethersproject/hash';
import { TypedDataDomain } from '@ethersproject/abstract-signer';
import { EmbeddedSigner } from '../signer/embedded.signer';
import { AccountType } from '../types';
import { TypedDataPayload } from './types';

export const getSignedTypedData = async (
  typedData: TypedDataPayload,
  accountType: string,
  chainId: number,
  signer: EmbeddedSigner,
  evmAddress: string,
): Promise<string> => {
  // Ethers auto-generates the EIP712Domain type in the TypedDataEncoder, and so it needs to be removed
  const types = { ...typedData.types };
  // @ts-ignore
  delete types.EIP712Domain;

  // Hash the EIP712 payload and generate the complete payload
  let typedDataHash = _TypedDataEncoder.hash(typedData.domain, types, typedData.message);

  if (accountType === AccountType.UPGRADEABLE_V5) {
    const updatedDomain: TypedDataDomain = {
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
    // primaryType: "OpenfortMessage"
  }

  const ethsigNoType = await signer.sign(typedDataHash, false, false);

  return ethsigNoType;
};
