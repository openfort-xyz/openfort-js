import { type Provider, RecoveryMethod } from '@openfort/openfort-js'
import { beamTestnet } from 'viem/chains'
import openfort from '../utils/openfortConfig'

const chainId = beamTestnet.id

class OpenfortService {
  async getEvmProvider(): Promise<Provider> {
    return openfort.embeddedWallet.getEthereumProvider({
      feeSponsorship: import.meta.env.VITE_POLICY_ID,
    })
  }

  async getEmbeddedState() {
    const state = await openfort.embeddedWallet.getEmbeddedState()
    return state
  }

  async getEncryptionSession(): Promise<string> {
    const endpoint = import.meta.env.VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT

    if (!endpoint) {
      throw new Error('VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT is not configured')
    }

    const url = import.meta.env.VITE_CREATE_ENCRYPTED_SESSION_BASE_URL
    if (!url) {
      throw new Error('VITE_CREATE_ENCRYPTED_SESSION_BASE_URL is not configured')
    }
    const resp = await fetch(url + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!resp.ok) {
      throw new Error('Failed to create encryption session')
    }

    const respJSON = await resp.json()
    return respJSON.session
  }

  async setAutomaticRecoveryMethod() {
    try {
      await openfort.embeddedWallet.configure({
        chainId,
        recoveryParams: {
          recoveryMethod: RecoveryMethod.AUTOMATIC,
          encryptionSession: await this.getEncryptionSession(),
        },
      })
    } catch (error) {
      console.error('Error configuring automatic recovery with Openfort:', error)
      throw error
    }
  }

  async setPasswordRecoveryMethod(password: string) {
    try {
      await openfort.embeddedWallet.configure({
        chainId,
        recoveryParams: {
          password,
          recoveryMethod: RecoveryMethod.PASSWORD,
        },
      })
    } catch (error) {
      console.error('Error configuring password recovery with Openfort:', error)
      throw error
    }
  }

  async setPasskeyRecoveryMethod() {
    try {
      await openfort.embeddedWallet.configure({
        chainId,
        recoveryParams: {
          recoveryMethod: RecoveryMethod.PASSKEY,
        },
      })
    } catch (error) {
      console.error('Error configuring passkey recovery with Openfort:', error)
      throw error
    }
  }

  async logout() {
    try {
      await openfort.auth.logout()
    } catch (error) {
      console.error('Error logging out with Openfort:', error)
      throw error
    }
  }
}

// Create a singleton instance of the OpenfortService
const openfortService = new OpenfortService()

export default openfortService
