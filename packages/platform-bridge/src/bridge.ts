/* eslint-disable no-console */
import Openfort, { OpenfortError, SDKConfiguration } from '@openfort/openfort-js';
import { ethers } from 'ethers';

const keyFunctionName = 'fxName';
const keyRequestId = 'requestId';
const keyData = 'data';

const OPENFORT_FUNCTIONS = {
  init: 'init',
  logout: 'logout',
  getEthereumProvider: 'getEthereumProvider',
  configureSessionKey: 'configureSessionKey',
  configureEmbeddedSigner: 'configureEmbeddedSigner',
  logInWithEmailPassword: 'logInWithEmailPassword',
  signUpWithEmailPassword: 'signUpWithEmailPassword',
  linkEmailPassword: 'linkEmailPassword',
  unlinkEmailPassword: 'unlinkEmailPassword',
  requestEmailVerification: 'requestEmailVerification',
  resetPassword: 'resetPassword',
  requestResetPassword: 'requestResetPassword',
  verifyEmail: 'verifyEmail',
  initOAuth: 'initOAuth',
  initLinkOAuth: 'initLinkOAuth',
  unlinkOAuth: 'unlinkOAuth',
  poolOAuth: 'poolOAuth',
  authenticateWithThirdPartyProvider: 'authenticateWithThirdPartyProvider',
  initSIWE: 'initSIWE',
  authenticateWithSIWE: 'authenticateWithSIWE',
  linkWallet: 'linkWallet',
  unlinkWallet: 'unlinkWallet',
  storeCredentials: 'storeCredentials',
  sendSignatureTransactionIntentRequest: 'sendSignatureTransactionIntentRequest',
  signMessage: 'signMessage',
  signTypedData: 'signTypedData',
  sendSignatureSessionRequest: 'sendSignatureSessionRequest',
  getEmbeddedState: 'getEmbeddedState',
  getAccessToken: 'getAccessToken',
  getUser: 'getUser',
  validateAndRefreshToken: 'validateAndRefreshToken',
};

// To notify game engine that this file is loaded
const initRequest = 'init';
const initRequestId = '1';

let openfortClient: Openfort;

declare global {
  interface Window {
    callFunction: (jsonData: string) => void;
    ue: any;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Unity: any;
    unityWebView: any;
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
declare function blu_event(event: string, data: string): void;
// eslint-disable-next-line @typescript-eslint/naming-convention
declare function UnityPostMessage(message: string): void;

const callbackToGame = (data: object) => {
  const message = JSON.stringify(data);
  console.log(`callbackToGame: ${message}`);
  console.log(message);
  if (typeof window.ue !== 'undefined') {
    if (typeof window.ue.jsconnector === 'undefined') {
      console.error('Unreal JSConnector not defined');
    } else {
      window.ue.jsconnector.sendtogame(message);
    }
  } else if (typeof blu_event !== 'undefined') {
    blu_event('sendtogame', message);
  } else if (typeof UnityPostMessage !== 'undefined') {
    UnityPostMessage(message);
  } else if (typeof window.parent.unityWebView !== 'undefined') {
    window.parent.unityWebView.sendMessage('WebViewObject', message);
  } else if (typeof window.Unity !== 'undefined') {
    window.Unity.call(message);
  } else {
    console.error(
      'No available game callbacks to call from OpenfortSDK platform-bridge',
    );
  }
};

window.callFunction = async (jsonData: string) => {
  // eslint-disable-line no-unused-vars
  console.log(`Call function ${jsonData}`);

  let fxName = null;
  let requestId = null;

  try {
    const json = JSON.parse(jsonData);
    fxName = json[keyFunctionName];
    requestId = json[keyRequestId];
    const data = json[keyData];

    switch (fxName) {
      case OPENFORT_FUNCTIONS.init: {
        const request = JSON.parse(data);
        if (!openfortClient) {
          const configuration = {
            baseConfiguration: {
              publishableKey: request.publishableKey,
            },
            shieldConfiguration: request.shieldPublishableKey && request.shieldEncryptionKey ? {
              shieldPublishableKey: request.shieldPublishableKey,
              shieldEncryptionKey: request.shieldEncryptionKey,
              shieldDebug: request.shieldDebug ?? false,
            } : undefined,
            overrides: {
              backendUrl: request.backendUrl ?? 'https://api.openfort.xyz',
              iframeUrl: request.iframeUrl ?? 'https://embedded.openfort.xyz',
              shieldUrl: request.shieldUrl ?? 'https://shield.openfort.xyz',
            },
          };
          openfortClient = new Openfort(configuration as unknown as SDKConfiguration);
          console.log('Openfort client initialized');
        }

        ethers.Wallet.createRandom();

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        });

        break;
      }
      case OPENFORT_FUNCTIONS.initOAuth: {
        const request = JSON.parse(data);
        const initOAuthResponse = await openfortClient?.initOAuth({
          provider: request.provider,
          options: {
            ...request.options, usePooling: request.usePooling,
          },
        });
        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...initOAuthResponse,
        });

        break;
      }
      case OPENFORT_FUNCTIONS.logout: {
        await openfortClient?.logout();
        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.initLinkOAuth: {
        const request = JSON.parse(data);
        const initAuthResponse = await openfortClient?.initLinkOAuth({
          authToken: request.authToken,
          provider: request.provider,
          options: request.options,
        });

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...initAuthResponse,
        });

        break;
      }
      case OPENFORT_FUNCTIONS.unlinkOAuth: {
        const request = JSON.parse(data);
        const userProfile = await openfortClient?.unlinkOAuth({
          authToken: request.authToken,
          provider: request.provider,
        });

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userProfile,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.poolOAuth: {
        const request = JSON.parse(data);
        const authResponse = await openfortClient?.poolOAuth(
          request.key,
        );
        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...authResponse,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.authenticateWithThirdPartyProvider: {
        const request = JSON.parse(data);
        const userProfile = await openfortClient?.authenticateWithThirdPartyProvider({
          provider: request.provider,
          token: request.token,
          tokenType: request.tokenType,
        });

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userProfile,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.initSIWE: {
        const request = JSON.parse(data);
        const initResponse = await openfortClient?.initSIWE({
          address: request.address,
        });

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...initResponse,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.authenticateWithSIWE: {
        const request = JSON.parse(data);
        const authResponse = await openfortClient?.authenticateWithSIWE({
          connectorType: request.connectorType,
          message: request.message,
          signature: request.signature,
          walletClientType: request.walletClientType,
        });

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...authResponse,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.linkWallet: {
        const request = JSON.parse(data);
        const userProfile = await openfortClient?.linkWallet({
          authToken: request.authToken,
          connectorType: request.connectorType,
          message: request.message,
          signature: request.signature,
          walletClientType: request.walletClientType,
        });

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userProfile,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.unlinkWallet: {
        const request = JSON.parse(data);
        const userProfile = await openfortClient?.unlinkWallet({
          address: request.address,
          authToken: request.authToken,
        });

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userProfile,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.storeCredentials: {
        const request = JSON.parse(data);
        await openfortClient?.storeCredentials({
          accessToken: request.accessToken,
          refreshToken: request.refreshToken,
          player: request.player,
        });

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.sendSignatureTransactionIntentRequest: {
        const request = JSON.parse(data);
        const transactionIntentResponse = await openfortClient?.sendSignatureTransactionIntentRequest(
          request.transactionIntentId,
          request.userOperationHash,
          request.signature,
          request.optimistic,
        );

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...transactionIntentResponse,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.signMessage: {
        const request = JSON.parse(data);
        const signature = await openfortClient?.signMessage(
          request.message,
          request.options,
        );

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          result: signature,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.signTypedData: {
        const request = JSON.parse(data);
        const signature = await openfortClient?.signTypedData(
          request.domain,
          request.types,
          request.value,
        );

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          result: signature,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.sendSignatureSessionRequest: {
        const request = JSON.parse(data);
        const sessionResponse = await openfortClient?.sendSignatureSessionRequest(
          request.sessionId,
          request.signature,
          request.optimistic,
        );

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...sessionResponse,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.getEmbeddedState: {
        const embeddedState = openfortClient?.getEmbeddedState();
        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          result: embeddedState,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.validateAndRefreshToken: {
        const request = JSON.parse(data);
        await openfortClient?.validateAndRefreshToken(request.forceRefresh);
        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.configureSessionKey: {
        const sessionKey = openfortClient?.configureSessionKey();

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
            sessionKey,
          },
          ...sessionKey,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.configureEmbeddedSigner: {
        const request = JSON.parse(data);
        await openfortClient?.configureEmbeddedSigner(
          request.chainId,
          request.shieldAuthentication,
          request.recoveryPassword,
        );

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.requestResetPassword: {
        const request = JSON.parse(data);
        await openfortClient?.requestResetPassword({
          email: request.email,
          redirectUrl: request.redirectUrl,
        });

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.resetPassword: {
        const request = JSON.parse(data);
        await openfortClient?.resetPassword({
          email: request.email,
          password: request.password,
          state: request.state,
        });

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.requestEmailVerification: {
        const request = JSON.parse(data);
        await openfortClient?.requestEmailVerification({
          email: request.email,
          redirectUrl: request.redirectUrl,
        });

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.verifyEmail: {
        const request = JSON.parse(data);
        await openfortClient?.verifyEmail({
          email: request.email,
          state: request.state,
        });

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.unlinkEmailPassword: {
        const request = JSON.parse(data);
        const userInfo = openfortClient?.unlinkEmailPassword({
          email: request.email,
          authToken: request.authToken,
        });

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userInfo,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.linkEmailPassword: {
        const request = JSON.parse(data);
        const userInfo = await openfortClient?.linkEmailPassword(
          {
            email: request.email,
            password: request.password,
            authToken: request.authToken,
          },
        );

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userInfo,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.logInWithEmailPassword: {
        const request = JSON.parse(data);
        const userInfo = await openfortClient?.logInWithEmailPassword({
          email: request.email,
          password: request.password,
        });

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userInfo,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.signUpWithEmailPassword: {
        const request = JSON.parse(data);
        const userInfo = await openfortClient?.signUpWithEmailPassword({
          email: request.email,
          password: request.password,
          options: request.options,
        });

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userInfo,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.getAccessToken: {
        const accessToken = await openfortClient?.getAccessToken();

        callbackToGame({
          responseFor: fxName,
          requestId,
          success: true,
          result: accessToken,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.getUser: {
        const userProfile = await openfortClient?.getUser();

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...userProfile,
        });
        break;
      }
      case OPENFORT_FUNCTIONS.getEthereumProvider: {
        const evmProvider = openfortClient?.getEthereumProvider();

        callbackToGame({
          ...{
            responseFor: fxName,
            requestId,
            success: true,
          },
          ...evmProvider,
        });
        break;
      }
      default:
        break;
    }
  } catch (error: any) {
    console.log(error);
    callbackToGame({
      responseFor: fxName,
      requestId,
      success: false,
      error: error.message,
      errorType: error instanceof OpenfortError ? error.type : null,
    });
  }
};

function onLoadHandler() {
  // File loaded
  // This is to prevent callFunction not defined error in Unity
  callbackToGame({
    responseFor: initRequest,
    requestId: initRequestId,
    success: true,
  });
}

console.log('index.ts loaded');

function winLoad(callback: { (): void }) {
  if (document.readyState === 'complete') {
    callback();
  } else {
    window.addEventListener('load', callback);
  }
}

winLoad(onLoadHandler);
