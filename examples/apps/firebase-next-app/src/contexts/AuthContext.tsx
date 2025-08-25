import React, {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useContext,
} from "react";
import { authService } from "../services/authService";
import { User } from "firebase/auth";
import { useOpenfort } from "../hooks/useOpenfort";

interface AuthContextType {
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return authService.onIdTokenChanged(async (user) => {
      if (!user) {
        setUser(null);
        return;
      }
      const token = await user.getIdToken();
      setUser(user);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
