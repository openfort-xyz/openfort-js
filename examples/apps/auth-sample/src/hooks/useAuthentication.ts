import { useAuth } from '../contexts/AuthContext';
import authService from '../services/openfortService';
import { useOpenfort } from './useOpenfort';

export const useAuthentication = () => {
  const { logout:signOut } = useOpenfort();
  const {setUser } = useAuth();

  const signIn = async (email: string, password: string) => {
    try {
      const authResponse = await authService.signInWithEmail(email, password);
      setUser(authResponse)
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await authService.signInWithGoogle();
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

  const signUp = async (email: string, password: string) => {
    try {
      await authService.signUpWithEmail(email, password);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    await signOut();
  };

  return { signIn, signUp, signInWithGoogle, logout, requestPasswordReset };
};
