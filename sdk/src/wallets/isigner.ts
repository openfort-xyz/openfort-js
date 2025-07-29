import type { RecoveryMethod } from '../types/types';

export interface Signer {
  sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean
  ): Promise<string>;
  logout(): Promise<void>;
  switchChain({ chainId }: { chainId: number }): Promise<void>;
  updateAuthentication(): Promise<void>;
  setEmbeddedRecovery(
    { recoveryMethod, recoveryPassword, encryptionSession }:
    { recoveryMethod: RecoveryMethod; recoveryPassword?: string, encryptionSession?: string }): Promise<void>;
  export(): Promise<string>;
  create(accountType: string, chainType: string): Promise<void>;
  recover(accountUuid: string): Promise<void>;
}
