import { type StaticJsonRpcProvider } from '@ethersproject/providers';
import { SignerManager } from '../signer';
import { JsonRpcError, ProviderErrorCode, RpcErrorCode } from './JsonRpcError';
import { IStorage } from '../../storage/istorage';

export interface AddEthereumChainParameter {
  chainId: string;
  blockExplorerUrls?: string[];
  chainName?: string;
  iconUrls?: string[];
  rpcUrls?: string[];
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface AddChainParams {
  rpcProvider: StaticJsonRpcProvider;
  params: Array<any>;
  storage: IStorage;
}

const REQUIRED_CHAIN_PROPERTIES = ['chainId', 'chainName', 'nativeCurrency'];

const isValidChainParameter = (chainParam: object): chainParam is AddEthereumChainParameter => (
  REQUIRED_CHAIN_PROPERTIES.every((key) => key in chainParam)
);

const validateNativeCurrency = (nativeCurrency: any): boolean => {
  if (!nativeCurrency || typeof nativeCurrency !== 'object') return false;

  const hasRequiredProperties = (
    'name' in nativeCurrency
        && 'symbol' in nativeCurrency
        && 'decimals' in nativeCurrency
  );

  if (!hasRequiredProperties) return false;

  return (
    typeof nativeCurrency.name === 'string'
        && typeof nativeCurrency.symbol === 'string'
        && typeof nativeCurrency.decimals === 'number'
        && Number.isInteger(nativeCurrency.decimals)
  );
};

const transformChainParameter = (chainParam: any): AddEthereumChainParameter => {
  if (!chainParam || typeof chainParam !== 'object') {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'Invalid chain parameter: expected an object',
    );
  }

  if (!isValidChainParameter(chainParam)) {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      `Invalid chain parameter. The following properties are required: ${REQUIRED_CHAIN_PROPERTIES.join(', ')}`,
    );
  }

  if (!chainParam.chainName || chainParam.chainName.trim() === '') {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'chainName cannot be empty',
    );
  }

  if (!validateNativeCurrency(chainParam.nativeCurrency)) {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'Invalid nativeCurrency object',
    );
  }

  if (chainParam.rpcUrls?.length === 0) {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'At least one RPC URL must be provided',
    );
  }

  // Ensure chainId is a valid hex string
  if (!/^0x[0-9a-fA-F]+$/.test(chainParam.chainId)) {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'chainId must be a valid hex string',
    );
  }

  return {
    chainId: chainParam.chainId,
    blockExplorerUrls: chainParam.blockExplorerUrls || [],
    chainName: chainParam.chainName,
    iconUrls: chainParam.iconUrls || [],
    rpcUrls: chainParam.rpcUrls || [],
    nativeCurrency: chainParam.nativeCurrency,
  };
};

export const addEthereumChain = async ({
  params,
  rpcProvider,
  storage,
}: AddChainParams): Promise<null | boolean> => {
  if (!params || !Array.isArray(params) || params.length === 0) {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'Invalid parameters for wallet_addEthereumChain',
    );
  }

  const chainParameter = transformChainParameter(params[0]);
  const chainIdNumber = parseInt(chainParameter.chainId, 16);

  // Get current chainId
  const { chainId: currentChainId } = await rpcProvider.detectNetwork();

  // If we're already on this chain, return false
  if (chainIdNumber === currentChainId) {
    return false;
  }

  try {
    const signer = await SignerManager.embedded(storage);
    if (!signer) {
      throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - no account available');
    }

    // If we successfully configured the chain, return null (success)
    return null;
  } catch (error: any) {
    if (error instanceof Error) {
      throw new JsonRpcError(
        RpcErrorCode.INTERNAL_ERROR,
        `Failed to add chain: ${error.message}`,
      );
    }
    throw new JsonRpcError(
      RpcErrorCode.INTERNAL_ERROR,
      'Failed to add chain',
    );
  }
};
