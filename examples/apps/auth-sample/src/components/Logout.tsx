import { useRouter } from 'next/router'
import type React from 'react'
import { useOpenfort } from '@/contexts/OpenfortContext'
import { Button } from './ui/button'

const LogoutButton: React.FC = () => {
  const { logout } = useOpenfort()
  const router = useRouter()
  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      alert('Logout failed. Please try again.')
    }
  }

  return (
    <Button variant="destructive" onClick={handleLogout}>
      Logout
    </Button>
  )
}

export default LogoutButton
