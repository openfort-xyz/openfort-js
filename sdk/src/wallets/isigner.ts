import type { Account } from 'core/configuration/account'
import type { RecoveryMethod } from '../types/types'
import type { SignerConfigureRequest, SignerCreateRequest, SignerRecoverRequest } from './iframeManager'

export interface Signer {
  sign(message: Uint8Array | string, requireArrayify?: boolean, requireHash?: boolean): Promise<string>
  disconnect(): Promise<void>
  configure(params: SignerConfigureRequest): Promise<Account>
  switchChain({ chainId }: { chainId: number }): Promise<void>
  setRecoveryMethod({
    recoveryMethod,
    recoveryPassword,
    encryptionSession,
  }: {
    recoveryMethod: RecoveryMethod
    recoveryPassword?: string
    encryptionSession?: string
  }): Promise<void>
  export(): Promise<string>
  create(params: SignerCreateRequest): Promise<Account>
  recover(params: SignerRecoverRequest): Promise<Account>
}
