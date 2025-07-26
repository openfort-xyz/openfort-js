/**
 * Environment detection utilities for the SDK
 */

// Type declarations for React Native WebView
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ReactNativeWebView?: any;
      };
    };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ReactNativeWebView?: any;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __REACT_NATIVE_WEBVIEW__?: boolean;
  }
}

/**
 * Detects if the code is running in a React Native WebView environment
 */
export function isReactNativeWebView(): boolean {
  // Check for React Native WebView message handlers
  if (
    typeof window !== 'undefined' && (
      window?.webkit?.messageHandlers?.ReactNativeWebView
      || window?.ReactNativeWebView
      // eslint-disable-next-line no-underscore-dangle
      || window?.__REACT_NATIVE_WEBVIEW__
    )
  ) {
    return true;
  }

  // Check user agent for common mobile app WebViews
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    const ua = navigator.userAgent.toLowerCase();
    const mobileAppIdentifiers = [
      'fbav', // Facebook App
      'fban', // Facebook App (alternative)
      'instagram', // Instagram App
      'snapchat', // Snapchat App
      'linkedinapp', // LinkedIn App
      'twitter', // Twitter App
      'whatsapp', // WhatsApp
    ];

    if (mobileAppIdentifiers.some((identifier) => ua.includes(identifier))) {
      return true;
    }
  }

  // Check for React Native specific global
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return true;
  }

  return false;
}

/**
 * Detects if MessageChannel/MessagePort is supported in the current environment
 */
export function supportsMessageChannel(): boolean {
  return typeof MessageChannel !== 'undefined' && !isReactNativeWebView();
}

/**
 * Gets a string identifier for the current environment
 */
export function getEnvironmentName(): 'react-native' | 'browser' | 'node' | 'unknown' {
  if (isReactNativeWebView()) return 'react-native';
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return 'browser';
  if (typeof process !== 'undefined' && process.versions && process.versions.node) return 'node';
  return 'unknown';
}

/**
 * Checks if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
         && typeof document !== 'undefined'
         && !isReactNativeWebView();
}
