import './App.css'
import { useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { Wallet } from './components/Wallet';
import { Providers } from './providers'
import { Navbar } from './components/Navbar';
import logoBA from './assets/logo_ba.svg';
import logoOF from './assets/logo_of.svg';

function App() {
  const [page, setPage] = useState('wallet');
  return (
    <Providers>
      <div className='flex justify-start items-center flex-col space-y-20 min-h-[50vh]'>
        <div className='flex flex-row space-x-8 items-center'>
          <img src={logoBA} alt='Logo' className='w-20 h-auto' />
          <span className='text-6xl font-bold'>+</span>
          <img src={logoOF} alt='Logo' className='w-24 h-auto' />
        </div>
        <Navbar setPage={setPage} />
        {page === 'login' && <LoginForm setPage={setPage} />}
        {page === 'signup' && <SignupForm setPage={setPage} />}
        {page === 'wallet' && <Wallet setPage={setPage} />}
      </div>
    </Providers>
  )
}

export default App


