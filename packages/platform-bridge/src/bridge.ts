/* eslint-disable no-console */
import { Openfort, OpenfortError, type SDKConfiguration } from '@openfort/openfort-js'
import { ethers } from 'ethers'

const keyFunctionName = 'fxName'
const keyRequestId = 'requestId'
const keyData = 'data'

const OPENFORT_FUNCTIONS = {
  init: 'init',
  logout: 'logout',
  getEthereumProvider: 'getEthereumProvider',
  configureEmbeddedWallet: 'configureEmbeddedWallet',
  createEmbeddedWallet: 'createEmbeddedWallet',
  recoverEmbeddedWallet: 'recoverEmbeddedWallet',
  listWallets: 'listWallets',
  getWallet: 'getWallet',
  logInWithEmailPassword: 'logInWithEmailPassword',
  signUpWithEmailPassword: 'signUpWithEmailPassword',
  signUpGuest: 'signUpGuest',
  requestEmailVerification: 'requestEmailVerification',
  resetPassword: 'resetPassword',
  requestResetPassword: 'requestResetPassword',
  verifyEmail: 'verifyEmail',
  initOAuth: 'initOAuth',
  initLinkOAuth: 'initLinkOAuth',
  unlinkOAuth: 'unlinkOAuth',
  initSiwe: 'initSiwe',
  loginWithSiwe: 'loginWithSiwe',
  initLinkSiwe: 'initLinkSiwe',
  linkWithSiwe: 'linkWithSiwe',
  unlinkWallet: 'unlinkWallet',
  storeCredentials: 'storeCredentials',
  sendSignatureTransactionIntentRequest: 'sendSignatureTransactionIntentRequest',
  signMessage: 'signMessage',
  signTypedData: 'signTypedData',
  getEmbeddedState: 'getEmbeddedState',
  getAccessToken: 'getAccessToken',
  getUser: 'getUser',
  validateAndRefreshToken: 'validateAndRefreshToken',
  setThirdPartyToken: 'setThirdPartyToken',
  // New auth methods
  logInWithIdToken: 'logInWithIdToken',
  requestEmailOtp: 'requestEmailOtp',
  logInWithEmailOtp: 'logInWithEmailOtp',
  verifyEmailOtp: 'verifyEmailOtp',
  requestPhoneOtp: 'requestPhoneOtp',
  logInWithPhoneOtp: 'logInWithPhoneOtp',
  linkPhoneOtp: 'linkPhoneOtp',
  addEmail: 'addEmail',
}

// To notify game engine that this file is loaded
const initRequest = 'init'
const initRequestId = '1'

// Used for pending setThirdPartyToken requests
const pending: Record<string, { resolve: (token: string) => void; reject: (error: any) => void }> = {}

let openfortClient: Openfort

declare global {
  interface Window {
    callFunction: (jsonData: string) => void
    requestAccessToken: () => Promise<string>
    onAccessTokenReceived: (requestId: string, token: string) => void
    ue: any
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Unity: any
    unityWebView: any
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
declare function blu_event(event: string, data: string): void
// eslint-disable-next-line @typescript-eslint/naming-convention
declare function UnityPostMessage(message: string): void

const callbackToGame = (data: object) => {
  const message = JSON.stringify(data)
  console.log(`callbackToGame: ${message}`)
  console.log(message)
  if (typeof window.ue !== 'undefined') {
    if (typeof window.ue.jsconnector === 'undefined') {
      console.error('Unreal JSConnector not defined')
    } else {
      window.ue.jsconnector.sendtogame(message)
    }
  } else if (typeof blu_event !== 'undefined') {
    blu_event('sendtogame', message)
  } else if (typeof UnityPostMessage !== 'undefined') {
    UnityPostMessage(message)
  } else if (typeof window.parent.unityWebView !== 'undefined') {
    window.parent.unityWebView.sendMessage('WebViewObject', message)
  } else if (typeof window.Unity !== 'undefined') {
    window.Unity.call(message)
  } else {
    console.error('No available game callbacks to call from OpenfortSDK platform-bridge')
  }
}

window.requestAccessToken = () =>
  new Promise((resolve, reject) => {
    const requestId = Date.now() + Math.random()
    pending[requestId] = { resolve, reject }

    callbackToGame({
      responseFor: OPENFORT_FUNCTIONS.setThirdPartyToken,
      requestId,
      success: true,
    })
  })

window.onAccessTokenReceived = (requestId, token) => {
  if (pending[requestId]) {
    pending[requestId].resolve(token)
    delete pending[requestId]
  }
}

window.callFunction = async (jsonData: string) => {
  // eslint-disable-line no-unused-vars
  console.log(`Call function ${jsonData}`)

  let fxName = null
  let requestId = null

  try {
    const json = JSON.parse(jsonData)
    fxName = json[keyFunctionName]
    requestId = json[keyRequestId]
    const data = json[keyData]

    switch (fxName) {
      case OPENFORT_FUNCTIONS.init: {
        const request = JSON.parse(data)
        if (!openfortClient) {
          const configuration = {
            baseConfiguration: {
              publishableKey: request.publishableKey,
              nativeAppIdentifier: request.nativeAppIdentifier,
            },
            shieldConfiguration: request.shieldPublishableKey
              ? {
                  shieldPublishableKey: request.shieldPublishableKey,
                  shieldDebug: request.shieldDebug ?? false,
                }
              : undefined,
            thirdPartyAuth: request.thirdPartyAuth?.provider
              ? {
                  provider: request.thirdPartyAuth.provider,
                  getAccessToken: async () => await window.requestAccessToken(),
                }
              : undefined,
            overrides: {
              backendUrl: request?.backendUrl ?? 'https://api.openfort.io',
              iframeUrl: request?.iframeUrl,
              shieldUrl: request?.shieldUrl ?? 'https://shield.openfort.io',
            },
          }
          openfortClient = new Openfort(configuration as unknown as SDKConfiguration)
          console.log('Openfort client initialized')
        }

        ethers.Wallet.createRandom()

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })

        break
      }
      case OPENFORT_FUNCTIONS.initOAuth: {
        const request = JSON.parse(data)
        const initOAuthResponse = await openfortClient.auth.initOAuth({
          provider: request.provider,
          redirectTo: request.redirectTo,
          options: request.options,
        })
        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          result: initOAuthResponse,
        })

        break
      }
      case OPENFORT_FUNCTIONS.logout: {
        await openfortClient.auth.logout()
        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.initLinkOAuth: {
        const request = JSON.parse(data)
        const initAuthResponse = await openfortClient.auth.initLinkOAuth({
          provider: request.provider,
          redirectTo: request.redirectTo,
          options: request.options,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          result: initAuthResponse,
        })

        break
      }
      case OPENFORT_FUNCTIONS.unlinkOAuth: {
        const request = JSON.parse(data)
        const result = await openfortClient.auth.unlinkOAuth({
          provider: request.provider,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          ...result,
        })
        break
      }
      case OPENFORT_FUNCTIONS.initSiwe: {
        const request = JSON.parse(data)
        const initResponse = await openfortClient.auth.initSiwe({
          address: request.address,
        })

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...initResponse,
        })
        break
      }
      case OPENFORT_FUNCTIONS.loginWithSiwe: {
        const request = JSON.parse(data)
        const authResponse = await openfortClient.auth.loginWithSiwe({
          signature: request.signature,
          message: request.message,
          walletClientType: request.walletClientType,
          connectorType: request.connectorType,
          address: request.address,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          ...authResponse,
        })
        break
      }
      case OPENFORT_FUNCTIONS.initLinkSiwe: {
        const request = JSON.parse(data)
        const result = await openfortClient.auth.initLinkSiwe({
          address: request.address,
        })

        callbackToGame({
          ...result,
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.linkWithSiwe: {
        const request = JSON.parse(data)
        const result = await openfortClient.auth.linkWithSiwe({
          signature: request.signature,
          message: request.message,
          walletClientType: request.walletClientType,
          connectorType: request.connectorType,
          address: request.address,
          chainId: request.chainId,
        })

        callbackToGame({
          ...result,
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.unlinkWallet: {
        const request = JSON.parse(data)
        const result = await openfortClient.auth.unlinkWallet({
          address: request.address,
          chainId: request.chainId,
        })

        callbackToGame({
          ...result,
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.storeCredentials: {
        const request = JSON.parse(data)
        await openfortClient.auth.storeCredentials({
          token: request.token,
          userId: request.userId,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.sendSignatureTransactionIntentRequest: {
        const request = JSON.parse(data)
        const transactionIntentResponse = await openfortClient.proxy.sendSignatureTransactionIntentRequest(
          request.transactionIntentId,
          request.userOperationHash,
          request.signature,
          request.optimistic
        )

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...transactionIntentResponse,
        })
        break
      }
      case OPENFORT_FUNCTIONS.signMessage: {
        const request = JSON.parse(data)
        const signature = await openfortClient.embeddedWallet.signMessage(request.message, request.options)

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          result: signature,
        })
        break
      }
      case OPENFORT_FUNCTIONS.signTypedData: {
        const request = JSON.parse(data)
        const signature = await openfortClient.embeddedWallet.signTypedData(
          request.domain,
          request.types,
          request.value
        )

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          result: signature,
        })
        break
      }
      case OPENFORT_FUNCTIONS.getEmbeddedState: {
        const embeddedState = await openfortClient.embeddedWallet.getEmbeddedState()
        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          result: embeddedState,
        })
        break
      }
      case OPENFORT_FUNCTIONS.validateAndRefreshToken: {
        const request = JSON.parse(data)
        await openfortClient.validateAndRefreshToken(request.forceRefresh)
        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.createEmbeddedWallet: {
        const request = JSON.parse(data)
        await openfortClient.embeddedWallet.create({
          chainType: request.chainType,
          accountType: request.accountType,
          recoveryParams: request.recoveryParams,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.recoverEmbeddedWallet: {
        const request = JSON.parse(data)
        await openfortClient.embeddedWallet.recover({
          account: request.accountAddress,
          recoveryParams: request.recoveryParams,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.getWallet: {
        const wallet = await openfortClient.embeddedWallet.get()

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...wallet,
        })
        break
      }
      case OPENFORT_FUNCTIONS.listWallets: {
        const request = JSON.parse(data)
        const wallets = await openfortClient.embeddedWallet.list({
          ...request,
        })

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...wallets,
        })
        break
      }
      case OPENFORT_FUNCTIONS.configureEmbeddedWallet: {
        const request = JSON.parse(data)
        await openfortClient.embeddedWallet.configure({
          chainId: request.chainId,
          recoveryParams: request.recoveryParams,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.requestResetPassword: {
        const request = JSON.parse(data)
        await openfortClient.auth.requestResetPassword({
          email: request.email,
          redirectUrl: request.redirectUrl,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.resetPassword: {
        const request = JSON.parse(data)
        await openfortClient.auth.resetPassword({
          password: request.password,
          token: request.token,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.requestEmailVerification: {
        const request = JSON.parse(data)
        await openfortClient.auth.requestEmailVerification({
          email: request.email,
          redirectUrl: request.redirectUrl,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.verifyEmail: {
        const request = JSON.parse(data)
        await openfortClient.auth.verifyEmail({
          token: request.token,
          callbackURL: request.callbackURL,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.logInWithEmailPassword: {
        const request = JSON.parse(data)
        const userInfo = await openfortClient.auth.logInWithEmailPassword({
          email: request.email,
          password: request.password,
        })

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userInfo,
        })
        break
      }
      case OPENFORT_FUNCTIONS.signUpGuest: {
        const userInfo = await openfortClient.auth.signUpGuest()

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userInfo,
        })
        break
      }
      case OPENFORT_FUNCTIONS.signUpWithEmailPassword: {
        const request = JSON.parse(data)
        const userInfo = await openfortClient.auth.signUpWithEmailPassword({
          email: request.email,
          password: request.password,
          name: request.name,
          callbackURL: request.callbackURL,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          ...userInfo,
        })
        break
      }
      case OPENFORT_FUNCTIONS.logInWithIdToken: {
        const request = JSON.parse(data)
        const authResponse = await openfortClient.auth.logInWithIdToken({
          provider: request.provider,
          token: request.token,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          ...authResponse,
        })
        break
      }
      case OPENFORT_FUNCTIONS.requestEmailOtp: {
        const request = JSON.parse(data)
        await openfortClient.auth.requestEmailOtp({
          email: request.email,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.logInWithEmailOtp: {
        const request = JSON.parse(data)
        const authResponse = await openfortClient.auth.logInWithEmailOtp({
          email: request.email,
          otp: request.otp,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          ...authResponse,
        })
        break
      }
      case OPENFORT_FUNCTIONS.verifyEmailOtp: {
        const request = JSON.parse(data)
        await openfortClient.auth.verifyEmailOtp({
          email: request.email,
          otp: request.otp,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.requestPhoneOtp: {
        const request = JSON.parse(data)
        await openfortClient.auth.requestPhoneOtp({
          phoneNumber: request.phoneNumber,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        })
        break
      }
      case OPENFORT_FUNCTIONS.logInWithPhoneOtp: {
        const request = JSON.parse(data)
        const authResponse = await openfortClient.auth.logInWithPhoneOtp({
          phoneNumber: request.phoneNumber,
          otp: request.otp,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          ...authResponse,
        })
        break
      }
      case OPENFORT_FUNCTIONS.linkPhoneOtp: {
        const request = JSON.parse(data)
        const authResponse = await openfortClient.auth.linkPhoneOtp({
          phoneNumber: request.phoneNumber,
          otp: request.otp,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          ...authResponse,
        })
        break
      }
      case OPENFORT_FUNCTIONS.addEmail: {
        const request = JSON.parse(data)
        const result = await openfortClient.auth.addEmail({
          email: request.email,
          callbackURL: request.callbackURL,
        })

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          ...result,
        })
        break
      }
      case OPENFORT_FUNCTIONS.getAccessToken: {
        const accessToken = await openfortClient.getAccessToken()

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          result: accessToken,
        })
        break
      }
      case OPENFORT_FUNCTIONS.getUser: {
        const userProfile = await openfortClient.user.get()

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userProfile,
        })
        break
      }
      case OPENFORT_FUNCTIONS.getEthereumProvider: {
        const evmProvider = await openfortClient.embeddedWallet.getEthereumProvider()

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...evmProvider,
        })
        break
      }
      case OPENFORT_FUNCTIONS.setThirdPartyToken: {
        const request = JSON.parse(data)

        window.onAccessTokenReceived(requestId, request.token)
        break
      }
      default:
        break
    }
  } catch (error: any) {
    console.log(error)
    callbackToGame({
      responseFor: fxName,
      requestId,
      success: false,
      error: error.message,
      errorCode: error instanceof OpenfortError ? error.error : null,
    })
  }
}

function onLoadHandler() {
  // File loaded
  // This is to prevent callFunction not defined error in Unity
  callbackToGame({
    responseFor: initRequest,
    requestId: initRequestId,
    success: true,
  })
}

console.log('index.ts loaded')

function winLoad(callback: () => void) {
  if (document.readyState === 'complete') {
    callback()
  } else {
    window.addEventListener('load', callback)
  }
}

winLoad(onLoadHandler)
