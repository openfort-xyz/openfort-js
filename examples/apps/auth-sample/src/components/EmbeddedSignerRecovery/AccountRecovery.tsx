import { useState } from 'react';
import { useOpenfort } from '../../hooks/useOpenfort';
import Loading from '../Loading';
import { Button } from '../ui/button';
import { StatusType, Toast } from '../Toasts';
import { MissingRecoveryPasswordError, RecoveryMethod, WrongRecoveryPasswordError } from '@openfort/openfort-js';

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);

const AccountRecovery: React.FC = () => {
  const { handleRecovery } = useOpenfort();
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [loadingAut, setLoadingAut] = useState(false);
  const [status, setStatus] = useState<StatusType>(null);

  return (
    <>
      <h2 className="text-left font-semibold text-2xl">{'Account recovery'}</h2>
      <div className="mb-5 mt-16">
        <div className="my-5">
          <input
            name="passwordRecovery"
            placeholder="Password to secure your recovery"
            className="w-full p-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div className="mb-5 flex justify-center items-center">
          <div className="w-full">
            <div className="flex justify-center items-center">
              <Button
                type="button"
                disabled={loadingPwd}
                className="bg-black text-white p-2.5 rounded-lg w-full"
                onClick={async () => {
                  const password = (
                    document.querySelector(
                      'input[name="passwordRecovery"]'
                    ) as HTMLInputElement
                  ).value;
                  setLoadingPwd(true);
                  try {
                    await handleRecovery({
                      method: RecoveryMethod.PASSWORD,
                      password,
                      chainId: chainId
                    });
                  } catch (e) {
                    if (e instanceof MissingRecoveryPasswordError) {
                      setStatus({
                        type: 'error',
                        title: 'Missing recovery password',
                      });
                    }
                    if (e instanceof WrongRecoveryPasswordError) {
                      setStatus({
                        type: 'error',
                        title: 'Wrong recovery password',
                      });
                    }
                  }
                  setLoadingPwd(false);
                }}
              >
                {loadingPwd ? <Loading /> : 'Continue with Password Recovery'}
              </Button>
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
              <Button
                variant="outline"
                type="button"
                disabled={loadingAut}
                className="bg-white text-black p-2.5 border border-gray-200 rounded-lg w-full hover:bg-gray-100"
                onClick={async () => {
                  setLoadingAut(true);
                  try {
                    await handleRecovery({
                      method: RecoveryMethod.AUTOMATIC,
                      chainId: chainId
                    });
                  } catch (e) {
                    if (e instanceof MissingRecoveryPasswordError) {
                      setStatus({
                        type: 'error',
                        title: 'Missing recovery password',
                      });
                    }
                    if (e instanceof WrongRecoveryPasswordError) {
                      setStatus({
                        type: 'error',
                        title: 'Wrong recovery password',
                      });
                    }
                  }
                  setLoadingAut(false);
                }}
              >
                {loadingAut ? <Loading /> : 'Continue with Automatic Recovery'}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Toast status={status} setStatus={setStatus} />
    </>
  );
};

export default AccountRecovery;
