import type React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthentication } from '../../hooks/useAuthentication'

const LogoutButton: React.FC = () => {
  const { user } = useAuth()
  const { logout } = useAuthentication()

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
      className={`${!user ? 'invisible' : 'visible'} px-4 py-2 hover:bg-red-500 hover:text-white font-semibold rounded border text-red-600 border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-opacity-50 transition-colors duration-200`}
    >
      Logout
    </button>
  )
}

export default LogoutButton
