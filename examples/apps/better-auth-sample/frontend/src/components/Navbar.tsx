import { SetPage } from "../lib/openfortAuth";

export function Navbar({ setPage }: SetPage) {
  return (
    <nav className='flex flex-row space-x-12 px-10 bg-white font-bold p-4 rounded-lg shadow-lg justify-center items-center'>
      <button
        onClick={() => setPage('login')}
        className='text-[#242424] hover:bg-[#FB6157] hover:text-white px-4 py-2 rounded-lg transition'
      >
        Login
      </button>
      <div className='border-l border-gray-[#242424] h-6' />
      <button
        onClick={() => setPage('signup')}
        className='text-[#242424] hover:bg-[#FB6157] hover:text-white px-4 py-2 rounded-lg transition'
      >
        Sign Up
      </button>
      <div className='border-l border-gray-[#242424] h-6' />
      <button
        onClick={() => setPage('wallet')}
        className='text-[#242424] hover:bg-[#FB6157] hover:text-white px-4 py-2 rounded-lg transition'
      >
        Wallet
      </button>
    </nav>
  )
}
