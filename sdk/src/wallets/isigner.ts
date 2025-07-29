import type { RecoveryMethod } from '../types/types';

export interface Signer {
  sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean
  ): Promise<string>;
  disconnect(): Promise<void>;
  switchChain({ chainId }: { chainId: number }): Promise<void>;
  setEmbeddedRecovery(
    { recoveryMethod, recoveryPassword, encryptionSession }:
    { recoveryMethod: RecoveryMethod; recoveryPassword?: string, encryptionSession?: string }): Promise<void>;
  export(): Promise<string>;
}
