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
  const { getEncryptionSession, handleRecovery, requestOTP } = useOpenfort();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showOTPRequest, setShowOTPRequest] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [otpRequestLoading, setOtpRequestLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);

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
      if (error.message === 'OTP_REQUIRED') {
        setShowOTPRequest(true);
      } else {
        throw error; // Re-throw other errors to be handled by the calling function
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
    await requestOTP({ email: userEmail });
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
