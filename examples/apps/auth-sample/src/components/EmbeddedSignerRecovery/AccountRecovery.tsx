import { useState } from 'react';
import { useOpenfort } from '../../hooks/useOpenfort';
import Loading from '../Loading';
import { Button } from '../ui/button';
import { EmbeddedAccount, RecoveryMethod, RecoveryParams } from '@openfort/openfort-js';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OTPRequestModal } from '../OTPRequestModal';
import { OTPVerificationModal } from '../OTPVerificationModal';

const CreateWalletPasswordForm = () => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createWallet } = useOpenfort();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
          await createWallet({
            recoveryParams: {
              recoveryMethod: RecoveryMethod.PASSWORD,
              password,
            },
          })
        } catch (error) {
          console.error('Error setting password recovery:', error);
          setError('Failed to set password recovery. Check console log for more details.');
        }
        setIsLoading(false);
      }}
    >
      <input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter a strong password"
        className="w-full p-2 mb-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-opacity-50"
        required
      />
      <Button
        className='w-full'
        type="submit"
        loading={isLoading}
      >
        Set Password Recovery
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
};

const CreateWalletAutomaticForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOTPRequest, setShowOTPRequest] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [otpRequestLoading, setOtpRequestLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const { getEncryptionSession, createWallet, requestOTP } = useOpenfort();

  const createWalletWithSession = async (otpCode?: string) => {
    try {
      const encSessionResponse = await getEncryptionSession(otpCode);
      await createWallet({
        recoveryParams: {
          recoveryMethod: RecoveryMethod.AUTOMATIC,
          encryptionSession: encSessionResponse,
        },
      });
    } catch (error) {
      if (error.message === 'OTP_REQUIRED') {
        setShowOTPRequest(true);
      } else {
        console.error('Error creating wallet:', error);
        setError('Failed to create wallet. Check console log for more details.');
      }
    }
  };

  const handleOTPRequest = async (contact: { email?: string; phone?: string }) => {
    const contactValue = contact.email || contact.phone || '';
    setOtpRequestLoading(true);
    try {
      await requestOTP(contact);
      setUserEmail(contactValue);
      setShowOTPRequest(false);
      setShowOTPVerification(true);
    } catch (error) {
      console.error('Error requesting OTP:', error);
      throw new Error('Failed to send verification code. Please try again.');
    } finally {
      setOtpRequestLoading(false);
    }
  };

  const handleOTPVerification = async (otpCode: string) => {
    setOtpVerifyLoading(true);
    try {
      await createWalletWithSession(otpCode);
      setShowOTPVerification(false);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Invalid verification code. Please try again.');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const handleResendOTP = async () => {
    await requestOTP({ email: userEmail });
  };

  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setIsLoading(true);
          setError(null);
          try {
            await createWalletWithSession();
          } finally {
            setIsLoading(false);
          }
        }}
      >
        <Button
          className='w-full'
          type="submit"
          variant="outline"
          loading={isLoading}
        >
          Set Automatic Recovery
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      <OTPRequestModal
        isOpen={showOTPRequest}
        onClose={() => setShowOTPRequest(false)}
        onSubmit={handleOTPRequest}
        isLoading={otpRequestLoading}
      />

      <OTPVerificationModal
        isOpen={showOTPVerification}
        onClose={() => setShowOTPVerification(false)}
        onSubmit={handleOTPVerification}
        onResendOTP={handleResendOTP}
        email={userEmail}
        isLoading={otpVerifyLoading}
      />
    </>
  );
};

const CreateWalletPasskeyForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createWallet } = useOpenfort();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
          await createWallet({
            recoveryParams: {
              recoveryMethod: RecoveryMethod.PASSKEY,
            },
          });
        } catch (error) {
          console.error('Error setting passkey recovery:', error);
          setError('Failed to set passkey recovery. Check console log for more details.');
        }
        setIsLoading(false);
      }}
    >
      <Button
        className='w-full'
        type="submit"
        variant="outline"
        loading={isLoading}
      >
        Continue with Passkey Recovery
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
};




const RecoverWalletButton = ({ account }: { account: EmbeddedAccount }) => {
  const [loading, setLoading] = useState(false);
  const { getEncryptionSession, handleRecovery, requestOTP } = useOpenfort();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showOTPRequest, setShowOTPRequest] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [otpRequestLoading, setOtpRequestLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);

  const handleRecoverWallet = async (accountId: string, recoveryParams: RecoveryParams) => {
    setLoading(true);
    try {
      await handleRecovery({
        account: accountId,
        recoveryParams,
      });
    } catch (error) {
      console.error('Error recovering wallet:', error);
      setError(`Failed to recover wallet. Check console log for more details.`);
    }
    setLoading(false);
  }

  const handleAutomaticRecoveryWithOTP = async (accountId: string, otpCode?: string) => {
    try {
      const encSessionResponse = await getEncryptionSession(otpCode);
      await handleRecoverWallet(accountId, {
        recoveryMethod: RecoveryMethod.AUTOMATIC,
        encryptionSession: encSessionResponse,
      });
    } catch (error) {
      if (error.message === 'OTP_REQUIRED') {
        setShowOTPRequest(true);
      } else {
        console.error('Error recovering wallet:', error);
        setError('Failed to recover wallet. Check console log for more details.');
      }
    }
  };

  const handleOTPRequest = async (email: string) => {
    setOtpRequestLoading(true);
    try {
      await requestOTP({ email });
      setUserEmail(email);
      setShowOTPRequest(false);
      setShowOTPVerification(true);
    } catch (error) {
      console.error('Error requesting OTP:', error);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setOtpRequestLoading(false);
    }
  };

  const handleOTPVerification = async (otpCode: string) => {
    setOtpVerifyLoading(true);
    try {
      await handleAutomaticRecoveryWithOTP(account.id, otpCode);
      setShowOTPVerification(false);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError('Invalid verification code. Please try again.');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await requestOTP({ email: userEmail });
    } catch (error) {
      setError('Failed to resend verification code. Please try again.');
    }
  };

  return (
    <>
      <form
        key={account.id}
        className='p-4 border border-gray-200 rounded-lg relative'
        onSubmit={async (e) => {
        e.preventDefault();
        switch (account.recoveryMethod) {
          case RecoveryMethod.PASSWORD:
            if (showPasswordInput) {
              const formData = new FormData(e.currentTarget);
              const password = formData.get('password-recovery') as string;
              if (!password || password.length === 0) {
                alert('Please enter a valid password');
                return;
              }
              setLoading(true);
              await handleRecoverWallet(account.id, {
                recoveryMethod: RecoveryMethod.PASSWORD,
                password,
              });
              setLoading(false);
            } else {
              setShowPasswordInput(true);
            }
            return;
          case RecoveryMethod.AUTOMATIC:
            setLoading(true);
            setError(null);
            try {
              await handleAutomaticRecoveryWithOTP(account.id);
            } finally {
              setLoading(false);
            }
            break;
          case RecoveryMethod.PASSKEY:
            setLoading(true)
            await handleRecoverWallet(account.id, {
              recoveryMethod: RecoveryMethod.PASSKEY,
              passkeyInfo: {
                passkeyId: account.recoveryMethodDetails?.passkeyId!
              }
            })
            setLoading(false)
            break;
          default:
            alert(`Recovery method ${account.recoveryMethod} not supported yet.`);
            return;
        }
      }}
    >

      <div className='flex items-center gap-2 justify-between w-full'>
        <button
          type='button'
          className='flex gap-2 items-center cursor-pointer mb-2'
          onClick={() => setExpanded(!expanded)}
        >

          <ChevronRight
            className='transition-transform h-4 w-4'
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          <p className='text-sm'>
            {account.address.substring(0, 6)}...{account.address.substring(account.address.length - 4)}
          </p>
        </button>
        <span
          className={cn('text-xs px-2 py-1 rounded-full border border-gray-300 capitalize')}
          id='recovery-method-badge'
        >
          {`${account.recoveryMethod} recovery`}
        </span>
      </div>
      {
        expanded && (
          <div className='mb-2 text-sm'>
            <p><strong>Wallet ID:</strong> {account.id}</p>
            <p className='break-all'><strong>Address:</strong> {account.address}</p>
            <p><strong>Recovery Method:</strong> {account.recoveryMethod}</p>
            <p><strong>Chain ID:</strong> {account.chainId}</p>
          </div>
        )
      }
      {
        showPasswordInput && (
          <input
            name='password-recovery'
            type="text"
            placeholder="Enter wallet password recovery"
            className="mt-2 w-full border border-gray-300 rounded-md p-2"
          />
        )
      }
      <Button
        className='mt-2 w-full'
        disabled={loading}
        variant={"outline"}
        type="submit"
        loading={loading}
      >
        Use this wallet
      </Button>
        {error && <p className="mt-2 text-sm text-red-600" id="wallet-recovery-error">{error}</p>}
      </form>
      
      <OTPRequestModal
        isOpen={showOTPRequest}
        onClose={() => setShowOTPRequest(false)}
        onSubmit={handleOTPRequest}
        isLoading={otpRequestLoading}
      />

      <OTPVerificationModal
        isOpen={showOTPVerification}
        onClose={() => setShowOTPVerification(false)}
        onSubmit={handleOTPVerification}
        onResendOTP={handleResendOTP}
        email={userEmail}
        isLoading={otpVerifyLoading}
      />
    </>
  );
};

const AccountRecovery: React.FC = () => {
  const { accounts, isLoadingAccounts } = useOpenfort();

  if (isLoadingAccounts) {
    return <Loading />;
  }

  if (accounts.length === 0) {
    return (
      <>
        <h2 className="text-left font-semibold text-2xl">Create a new account</h2>
        <p className="mt-2 text-sm text-gray-600">
          You don't have any accounts yet. Please create a new account to get started with the embedded signer.
        </p>
        <div className='mt-10 space-y-6'>
          <CreateWalletPasswordForm />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>
          <CreateWalletPasskeyForm />
          <CreateWalletAutomaticForm />
        </div>
      </>
    )
  }

  return (
    <div className='space-y-4'>
      {
        accounts.map((account) => (
          <RecoverWalletButton
            key={account.id}
            account={account}
          />
        ))
      }
    </div>
  );
};

export default AccountRecovery;
