import type { User } from 'firebase/auth'
import type React from 'react'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import openfort from '@/utils/openfortConfig'
import { authService } from '../services/authService'

interface AuthContextType {
  user: User | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
})

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    return authService.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user)
      if (!user) {
        setUser(null)
        return
      }
      await user.getIdToken()
      await openfort.getAccessToken()
      setUser(user)
    })
  }, [])

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  return useContext(AuthContext)
}
