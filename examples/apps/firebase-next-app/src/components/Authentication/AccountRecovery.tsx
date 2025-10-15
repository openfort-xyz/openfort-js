import { useState } from 'react'
import { useOpenfort } from '@/contexts/OpenfortContext'
import Spinner from '../Shared/Spinner'

const AccountRecovery: React.FC = () => {
  const { handleRecovery } = useOpenfort()
  const [loadingPwd, setLoadingPwd] = useState(false)
  const [loadingAut, setLoadingAut] = useState(false)

  return (
    <>
      <h2 className="text-left font-semibold text-2xl">{'Account recovery'}</h2>
      <div className="mb-5 mt-16">
        <div className="my-5">
          <input
            type="number"
            name="passwordRecovery"
            placeholder="Password to secure your recovery"
            className="w-full p-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div className="mb-5 flex justify-center items-center">
          <div className="w-full">
            <div className="flex justify-center items-center">
              <button
                type="button"
                disabled={loadingPwd}
                className="bg-black text-white p-2.5 rounded-lg w-full"
                onClick={async () => {
                  const password = (document.querySelector('input[name="passwordRecovery"]') as HTMLInputElement).value
                  setLoadingPwd(true)
                  await handleRecovery('password', password)
                  setLoadingPwd(false)
                }}
              >
                {loadingPwd ? <Spinner /> : 'Continue with Password Recovery'}
              </button>
            </div>
            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
            <div className="flex justify-center items-center mt-2">
              <button
                type="button"
                disabled={loadingAut}
                className="bg-white text-black p-2.5 border border-gray-200 rounded-lg w-full hover:bg-gray-100"
                onClick={async () => {
                  setLoadingAut(true)
                  await handleRecovery('automatic')
                  setLoadingAut(false)
                }}
              >
                {loadingAut ? <Spinner /> : 'Set Automatic Recovery'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AccountRecovery
