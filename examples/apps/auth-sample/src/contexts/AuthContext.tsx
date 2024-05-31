import React, {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useContext,
} from 'react';
import {AuthPlayerResponse} from '@openfort/openfort-js';
import openfortService from '../services/openfortService';

interface AuthContextType {
  user: AuthPlayerResponse | null;
  setUser: React.Dispatch<React.SetStateAction<AuthPlayerResponse | null>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
});

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [user, setUser] = useState<AuthPlayerResponse | null>(null);

  useEffect(() => {
    const handle = setInterval(async () => {
      console.log(`refreshing token...`);
      if (user) {
        await openfortService.validateCredentials();
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(handle);
  }, []);

  return (
    <AuthContext.Provider value={{user, setUser}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
