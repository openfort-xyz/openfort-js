import React from 'react';
import {useOpenfort} from '../hooks/useOpenfort';
import {useRouter} from 'next/router';

const LogoutButton: React.FC = () => {
  const {logout} = useOpenfort();
  const router = useRouter();
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed. Please try again.');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 hover:bg-red-500 hover:text-white font-semibold rounded border text-red-600 border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-opacity-50 transition-colors duration-200"
    >
      Logout
    </button>
  );
};

export default LogoutButton;
