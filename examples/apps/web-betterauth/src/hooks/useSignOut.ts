import { useCallback, useState } from 'react'
import { useDisconnect } from 'wagmi'
import openfortService from '../services/openfortService'

export const useSignOut = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { disconnect } = useDisconnect()

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true)
      disconnect()
      await openfortService.logout()
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [disconnect])

  return {
    signOut,
    isLoading,
  }
}
