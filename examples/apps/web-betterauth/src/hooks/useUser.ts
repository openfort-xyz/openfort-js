import { useCallback } from 'react'
import openfort from '../utils/openfortConfig'

export const useUser = () => {
  const getAccessToken = useCallback(async () => {
    try {
      await openfort.getAccessToken()
    } catch (error) {
      console.error('Error getting access token:', error)
      throw error
    }
  }, [])

  return {
    getAccessToken,
  }
}
