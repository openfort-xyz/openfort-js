import { Account } from 'configuration/account';
import { JsonRpcError, RpcErrorCode } from './JsonRpcError';
import { Signer as OpenfortSigner } from '../signer/isigner';

interface PersonalSignParams {
  signer: OpenfortSigner;
  account: Account;
  params: any[];
}

export const personalSign = async ({
  params,
  signer,
  account,
}: PersonalSignParams): Promise<string> => {
  const message: string = params[0];
  const fromAddress: string = params[1];

  if (!fromAddress || !message) {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'personal_sign requires an address and a message');
  }

  if (fromAddress.toLowerCase() !== account.address.toLowerCase()) {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'personal_sign requires the signer to be the from address');
  }

  const signature = await signer.sign(message, false, true);

  return signature;
};
