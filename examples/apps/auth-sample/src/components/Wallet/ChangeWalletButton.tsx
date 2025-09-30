import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { EmbeddedAccount, RecoveryMethod, RecoveryParams } from '@openfort/openfort-js';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';
import { Hex } from 'viem';
import { useOpenfort } from '../../hooks/useOpenfort';
import Loading from '../Loading';
import { Button } from '../ui/button';
import { OTPRequestModal } from '../OTPRequestModal';
import { OTPVerificationModal } from '../OTPVerificationModal';

const ChangeWalletButton = ({ isCurrentAccount, account, handleSetMessage, onSuccess }: { isCurrentAccount: boolean, account: EmbeddedAccount, handleSetMessage: (msg: string) => void, onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const { getEncryptionSession, handleRecovery, requestOTP, getUserEmail } = useOpenfort();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showOTPRequest, setShowOTPRequest] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [otpRequestLoading, setOtpRequestLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const handleAutomaticRecoveryWithOTP = async (accountId: string, otpCode?: string) => {
    try {
      const encSessionResponse = await getEncryptionSession(otpCode);
      await handleRecoverWallet({
        accountId: accountId as Hex,
        recoveryParams: {
          recoveryMethod: RecoveryMethod.AUTOMATIC,
          encryptionSession: encSessionResponse
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'OTP_REQUIRED') {
        const storedEmail = getUserEmail();
        if (storedEmail) {
          setUserEmail(storedEmail);
          try {
            await requestOTP({ email: storedEmail }, false);
            setShowOTPVerification(true);
          } catch (otpError) {
            if (otpError instanceof Error && otpError.message === 'OTP_RATE_LIMIT') {
              setErrorModal('OTP generation rate limit exceeded. Please contact an admin to resolve it.');
            } else {
              console.error('Error requesting OTP with stored email:', otpError);
              setShowOTPRequest(true);
            }
          }
        } else {
          setShowOTPRequest(true);
        }
      } else {
        throw error; // Re-throw other errors to be handled by the calling function
      }
    }
  };

  const handleOTPRequest = async (contact: { email?: string; phone?: string }) => {
    const contactValue = contact.email || contact.phone || '';
    setOtpRequestLoading(true);
    try {
      await requestOTP(contact, false);
      setUserEmail(contactValue);
      setShowOTPRequest(false);
      setShowOTPVerification(true);
    } catch (error) {
      console.error('Error requesting OTP at ChangeWalletButton:', error);
      if (error instanceof Error && error.message === 'OTP_RATE_LIMIT') {
        throw new Error('OTP generation rate limit exceeded. Please contact an admin to resolve it.');
      } else if (error instanceof Error && error.message === 'USER_CONTACTS_MISMATCH') {
        throw new Error('User contact information doesnt match with saved one');
      } else {
        throw new Error('Failed to send verification code. Please try again.');
      }
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
      throw new Error('Invalid verification code. Please try again.');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await requestOTP({ email: userEmail }, false);
    } catch (error) {
      if (error instanceof Error && error.message === 'OTP_RATE_LIMIT') {
        throw new Error('OTP generation rate limit exceeded. Please contact an admin to resolve it.');
      } else if (error instanceof Error && error.message === 'USER_CONTACTS_MISMATCH') {
        throw new Error('User contact information doesnt match with saved one');
      } else {
        throw new Error('Failed to resend verification code. Please try again.');
      }
    }
  };

  const handleRecoverWallet = async ({ accountId, recoveryParams }: { accountId: string, recoveryParams: RecoveryParams }) => {
    setLoading(true);
    try {
      await handleRecovery({
        account: accountId,
        recoveryParams,
      })
      handleSetMessage(`Switched to wallet: ${accountId}`);
      onSuccess();
    } catch (error) {
      console.error('Error switching wallet:', error);
      handleSetMessage(`Failed to switch wallet. Check console log for more details.`);
    }
    setLoading(false);
  }

  return (
    <>
      <form
        key={account.id}
        className={cn('p-4 border border-gray-200 rounded-lg', isCurrentAccount && 'bg-gray-100')}
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
              await handleRecoverWallet({
                accountId: account.id as Hex,
                recoveryParams: {
                  recoveryMethod: RecoveryMethod.PASSWORD,
                  password,
                },
              });
              setLoading(false);
            } else {
              setShowPasswordInput(true);
            }
            return;
          case RecoveryMethod.AUTOMATIC:
            setLoading(true);
            try {
              await handleAutomaticRecoveryWithOTP(account.id);
            } finally {
              setLoading(false);
            }
            break;
          case RecoveryMethod.PASSKEY:
            setLoading(true);
            if (!account.recoveryMethodDetails?.passkeyId) {
              alert('No passkey ID found for this account.');
              setLoading(false);
              return;
            }
            await handleRecoverWallet({
              accountId: account.id as Hex,
              recoveryParams: {
                recoveryMethod: RecoveryMethod.PASSKEY,
                passkeyInfo: {
                  passkeyId: account.recoveryMethodDetails.passkeyId
                }
              }
            });
            setLoading(false);
            break;
          default:
            alert(`Recovery method ${account.recoveryMethod} not supported yet.`);
            return;
        }
      }}
    >
      <p><strong>Wallet ID:</strong> {account.id}</p>
      <p className='break-all'><strong>Address:</strong> {account.address}</p>
      <p><strong>Recovery Method:</strong> {account.recoveryMethod}</p>
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
        disabled={loading || isCurrentAccount}
        variant={"outline"}
        type="submit"
        loading={loading}
      >
        {
          isCurrentAccount ? (
            <>
              <CheckIcon className='mr-2 h-4 w-4' />
              Current wallet
            </>
          ) : 'Use this wallet'
        }
      </Button>
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

      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">Error</h3>
              <button
                type="button"
                onClick={() => setErrorModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <p className="text-gray-700 mb-4">{errorModal}</p>
            <button
              type="button"
              onClick={() => setErrorModal(null)}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const Content = ({ onSuccess, handleSetMessage }: { onSuccess: () => void, handleSetMessage: (message: string) => void }) => {
  const { account: currentAccount, accounts } = useOpenfort();

  if (!accounts) {
    return <Loading />;
  }

  return (
    <div className='space-y-4'>
      {accounts.length === 0 ? (
        <p>No wallets found for this user.</p>
      ) : (
        accounts.map((account) => (
          <ChangeWalletButton
            key={account.id}
            account={account}
            isCurrentAccount={currentAccount?.id === account.id}
            handleSetMessage={handleSetMessage}
            onSuccess={onSuccess}
          />
        ))
      )}
    </div>
  );
};

const ChangeWallet = ({ handleSetMessage }: { handleSetMessage: (message: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            className='w-full'
            variant="outline"
          >
            Change wallet
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle className="mb-4">
            Select a wallet to use
          </SheetTitle>
          <Content onSuccess={() => setOpen(false)} handleSetMessage={handleSetMessage} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default ChangeWallet;
