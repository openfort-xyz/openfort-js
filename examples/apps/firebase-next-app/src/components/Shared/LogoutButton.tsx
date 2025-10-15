import { EmbeddedState } from '@openfort/openfort-js'
import type React from 'react'
import { useOpenfort } from '@/hooks/useOpenfort'
import { useAuthentication } from '../../hooks/useAuthentication'

const LogoutButton: React.FC = () => {
  const { logout } = useAuthentication()
  const { embeddedState } = useOpenfort()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
      alert('Logout failed. Please try again.') // Consider a more sophisticated feedback mechanism
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`${embeddedState !== EmbeddedState.READY ? 'invisible' : 'viisble'} px-4 py-2 hover:bg-red-500 hover:text-white font-semibold rounded border text-red-600 border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-opacity-50 transition-colors duration-200`}
    >
      Logout
    </button>
  )
}

export default LogoutButton
