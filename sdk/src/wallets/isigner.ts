import type { RecoveryMethod } from '../types/types';
import { SignerConfigureRequest, SignerRecoverRequest, SignerCreateRequest } from './iframeManager';
import { ConfigureResponse } from './types';

export interface Signer {
  sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean
  ): Promise<string>;
  disconnect(): Promise<void>;
  configure(params: SignerConfigureRequest): Promise<ConfigureResponse>;
  switchChain({ chainId }: { chainId: number }): Promise<void>;
  setEmbeddedRecovery(
    { recoveryMethod, recoveryPassword, encryptionSession }:
    { recoveryMethod: RecoveryMethod; recoveryPassword?: string, encryptionSession?: string }): Promise<void>;
  export(): Promise<string>;
  create(params: SignerCreateRequest): Promise<ConfigureResponse>;
  recover(params: SignerRecoverRequest): Promise<ConfigureResponse>;
}
