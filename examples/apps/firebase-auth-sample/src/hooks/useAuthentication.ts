import { authService } from '../services/authService';
import { useOpenfort } from './useOpenfort';

export const useAuthentication = () => {
  const { logout: signOut } = useOpenfort();

  const signIn = async (email: string, password: string) => {
    try {
      await authService.signIn(email, password);
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

  const signUp = async (email: string, password: string) => {
    try {
      await authService.signUp(email, password);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut();
    await authService.logout();
  };

  return { signIn, signUp, signInWithGoogle, logout };
};
