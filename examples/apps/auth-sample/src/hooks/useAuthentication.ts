import { useAuth } from '../contexts/AuthContext';
import authService from '../services/openfortService';
import { useOpenfort } from './useOpenfort';

export const useAuthentication = () => {
  const { logout:signOut } = useOpenfort();
  const {setUser } = useAuth();

  const signIn = async (email: string, password: string) => {
    try {
      const authResponse = await authService.signInWithEmail(email, password);
      setUser(authResponse.player)
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const authResponse = await authService.signInWithGoogle();
      // open a new tab to the OAuth provider
      window.open(authResponse.url, '_blank');
      const authUser = await authService.poolOAuth(authResponse.key);
      setUser(authUser);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  const requestPasswordReset = async (email: string, redirectUrl: string) => {
    try {
      await authService.requestPasswordReset(email, redirectUrl);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  const resetPassword = async (email: string, password: string, state:string) => {
    try {
      await authService.resetPassword(email, password, state);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  const requestEmailVerification = async (email: string, redirectUrl: string) => {
    try {
      await authService.requestEmailVerification(email, redirectUrl);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const authResponse = await authService.signUpWithEmail(email, password);
      setUser(authResponse.player)
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    await signOut();
  };

  return { signIn, signUp, signInWithGoogle, resetPassword, logout, requestEmailVerification, requestPasswordReset };
};
