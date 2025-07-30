import type { RecoverParams, RecoveryMethod } from '../types/types';
import { EmbeddedSignerConfigureRequest } from './iframeManager';
import { ConfigureResponse } from './types';

export interface Signer {
  sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean
  ): Promise<string>;
  disconnect(): Promise<void>;
  configure(params: EmbeddedSignerConfigureRequest): Promise<ConfigureResponse>;
  switchChain({ chainId }: { chainId: number }): Promise<void>;
  switchChainV2({ accountUuid, chainId }: { accountUuid: string, chainId: number }): Promise<void>;
  setEmbeddedRecovery(
    { recoveryMethod, recoveryPassword, encryptionSession }:
    { recoveryMethod: RecoveryMethod; recoveryPassword?: string, encryptionSession?: string }): Promise<void>;
  export(): Promise<string>;
  create(accountType: string, chainType: string): Promise<void>;
  recover(params: RecoverParams): Promise<void>;
}
