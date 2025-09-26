import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import openfort from '@/utils/openfortConfig';
import { AccountTypeEnum, ChainTypeEnum, OTPRequiredError, RecoveryMethod } from '@openfort/openfort-js';
import { useState } from 'react';
import { polygonAmoy } from 'viem/chains';
import { useOpenfort } from '../../hooks/useOpenfort';
import { Button } from '../ui/button';
import { OTPRequestModal } from '../OTPRequestModal';
import { OTPVerificationModal } from '../OTPVerificationModal';

const PasswordRecoveryForm = ({ onSuccess, handleSetMessage }: { onSuccess: () => void, handleSetMessage: (message: string) => void }) => {
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
          const response = await createWallet({
            recoveryParams: {
              recoveryMethod: RecoveryMethod.PASSWORD,
              password,
            },
          })
          handleSetMessage(`Created a new wallet with password recovery.\nwallet: ${JSON.stringify(response, null, 2)}`);
          onSuccess();
        } catch (error) {
          console.error('Error setting password recovery:', error);
          setError('Failed to set password recovery. Check console log for more details.');
        }
        setIsLoading(false);
      }}
      className='p-4 border border-gray-200 rounded-lg'
    >
      <h3 className="font-medium text-black text-sm mb-2">
        Password Recovery
      </h3>
      <p className="mb-2 text-sm text-gray-600">
        Make sure to remember this password, as it will be required for wallet recovery.
      </p>
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
        variant="outline"
        loading={isLoading}
      >
        Create with Password Recovery
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
};

const AutomaticRecovery = ({ onSuccess, handleSetMessage }: { onSuccess: () => void, handleSetMessage: (message: string) => void }) => {
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
      const response = await createWallet({
        recoveryParams: {
          recoveryMethod: RecoveryMethod.AUTOMATIC,
          encryptionSession: encSessionResponse,
        },
      });
      handleSetMessage(`Created a new wallet with automatic recovery.\nwallet: ${JSON.stringify(response, null, 2)}`);
      onSuccess();
    } catch (error) {
      if (error instanceof Error && error.message === 'OTP_REQUIRED') {
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
      await requestOTP(contact, true);
      setUserEmail(contactValue);
      setShowOTPRequest(false);
      handleOTPVerification("");
    } catch (error) {
      if (error instanceof Error && error.message === 'OTP_RATE_LIMIT') {
        throw new Error('Rate limit exceeded. Please wait before requesting another code.');
      } else if (error instanceof Error && error.message === 'USER_CONTACTS_MISMATCH') {
        throw new Error('User contact information doesnt match with saved one');
      } else {
        throw error; // Re-throw the original error instead of wrapping it
      }
    } finally {
      console.log('Setting otpRequestLoading to false');
      setOtpRequestLoading(false);
    }
  };

  const handleOTPVerification = async (otpCode: string) => {
    setOtpVerifyLoading(true);
    try {
      // Pass the OTP code to getEncryptionSession
      await createWalletWithSession(otpCode);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Invalid verification code. Please try again.');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await requestOTP({ email: userEmail }, true);
    } catch (error) {
      if (error instanceof Error && error.message === 'OTP_RATE_LIMIT') {
        throw new Error('Rate limit exceeded. Please wait before requesting another code.');
      } else if (error instanceof Error && error.message === 'USER_CONTACTS_MISMATCH') {
        throw new Error('User contact information doesnt match with saved one');
      } else {
        throw error;
      }
    }
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
        className='p-4 border border-gray-200 rounded-lg'
      >
        <h3 className="font-medium text-black text-sm mb-2">
          Automatic Recovery
        </h3>
        <p className="mb-2 text-sm text-gray-600">
          Your wallet will be automatically recovered using the encryption session.
        </p>
        <Button
          className='w-full'
          type="submit"
          variant="outline"
          loading={isLoading}
        >
          Create with Automatic Recovery
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      <OTPRequestModal
        isOpen={showOTPRequest}
        onClose={() => setShowOTPRequest(false)}
        onSubmit={handleOTPRequest}
        isLoading={otpRequestLoading}
        title="Setup 2FA for Recovery"
        description="Put your 2FA information here for future key recovery"
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


const PasskeyRecovery = ({ onSuccess, handleSetMessage }: { onSuccess: () => void, handleSetMessage: (message: string) => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getEncryptionSession, createWallet } = useOpenfort();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
          const response = await createWallet({
            recoveryParams: {
              recoveryMethod: RecoveryMethod.PASSKEY,
            },
          })
          handleSetMessage(`Created a new wallet with passkey recovery.\nwallet: ${JSON.stringify(response, null, 2)}`);
          onSuccess();
        } catch (error) {
          console.error('Error setting passkey recovery:', error);
          setError('Failed to set passkey recovery. Check console log for more details.');
        }
        setIsLoading(false);
      }}
      className='p-4 border border-gray-200 rounded-lg'
    >
      <h3 className="font-medium text-black text-sm mb-2">
        Passkey Recovery
      </h3>
      <p className="mb-2 text-sm text-gray-600">
        Your wallet will be recovered using hosted passkey.
      </p>
      <Button
        className='w-full'
        type="submit"
        variant="outline"
        loading={isLoading}
      >
        Create with Passkey Recovery
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
};

const Content = ({ onSuccess, handleSetMessage }: { onSuccess: () => void, handleSetMessage: (message: string) => void }) => {

  return (
    <div className='space-y-2'>
      <p className="font-medium text-black text-sm">
        Choose a recovery method for your new wallet:
      </p>
      <AutomaticRecovery onSuccess={onSuccess} handleSetMessage={handleSetMessage} />
      <PasswordRecoveryForm onSuccess={onSuccess} handleSetMessage={handleSetMessage} />
      <PasskeyRecovery onSuccess={onSuccess} handleSetMessage={handleSetMessage} />
    </div >

  );
};

const CreateWalletButton = ({ handleSetMessage }: { handleSetMessage: (message: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            className='w-full'
            variant="outline"
          >
            + Create wallet
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle className="mb-4">
            Create a new wallet
          </SheetTitle>
          <Content onSuccess={() => setOpen(false)} handleSetMessage={handleSetMessage} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default CreateWalletButton;
