/* eslint-disable class-methods-use-this */
import { PKCEData } from 'types';

const KEY_PKCE_STATE = 'pkce_state';
const KEY_PKCE_VERIFIER = 'pkce_verifier';

export default class DeviceCredentialsManager {
  public savePKCEData(data: PKCEData) {
    localStorage.setItem(KEY_PKCE_STATE, data.state);
    localStorage.setItem(KEY_PKCE_VERIFIER, data.verifier);
  }

  public getPKCEData(): PKCEData | null {
    const state = localStorage.getItem(KEY_PKCE_STATE);
    const verifier = localStorage.getItem(KEY_PKCE_VERIFIER);
    if (state && verifier) {
      return { state, verifier };
    }
    return null;
  }
}
