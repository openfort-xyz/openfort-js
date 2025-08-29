import openfort from "@/utils/openfortConfig";
import { User } from "firebase/auth";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { authService } from "../services/authService";

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
    return authService.onAuthStateChanged(async (user) => {
      console.log("Auth state changed:", user);
      if (!user) {
        setUser(null);
        return;
      }
      await user.getIdToken();
      await openfort.getAccessToken();
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
