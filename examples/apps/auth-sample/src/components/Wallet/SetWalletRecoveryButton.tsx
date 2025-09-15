import type React from 'react';
import { useEffect, useState } from 'react';
import { useOpenfort } from '../../hooks/useOpenfort';
import { EmbeddedAccount, EmbeddedState, RecoveryMethod, RecoveryParams } from '@openfort/openfort-js';
import Loading from '../Loading';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Hex } from 'viem';
import { ChevronLeft } from 'lucide-react';
import openfort from '@/utils/openfortConfig';
import { OTPRequestModal } from '../OTPRequestModal';
import { OTPVerificationModal } from '../OTPVerificationModal';

const ChangeToAutomaticRecovery = ({ previousRecovery, onSuccess }: { previousRecovery: RecoveryParams, onSuccess: () => void }) => {
  const { getEncryptionSession, setRecoveryMethod, requestOTP } = useOpenfort();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOTPRequest, setShowOTPRequest] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [otpRequestLoading, setOtpRequestLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);

  const changeRecoveryWithSession = async (otpCode?: string) => {
    try {
      const encSessionResponse = await getEncryptionSession(otpCode);
      await setRecoveryMethod(previousRecovery, {
        recoveryMethod: RecoveryMethod.AUTOMATIC,
        encryptionSession: encSessionResponse,
      });
      onSuccess();
    } catch (error) {
      if (error.message === 'OTP_REQUIRED') {
        setShowOTPRequest(true);
      } else {
        console.error('Error setting automatic recovery:', error);
        setError(`Failed to set automatic recovery. Was ${previousRecovery.recoveryMethod} recovery correct? Check console log for more details.`);
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
      await changeRecoveryWithSession(otpCode);
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
            await changeRecoveryWithSession();
          } finally {
            setIsLoading(false);
          }
        }}
      >
      <p className="mb-2 text-sm text-gray-600">
        By setting Automatic Recovery, your wallet can be recovered using Openfort's secure recovery process. Learn more about how Automatic Recovery works in our
        <a
          href="https://www.openfort.io/docs/products/embedded-wallet/javascript/signer/recovery#automatic-recovery"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        > documentation
        </a>.
      </p>
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
}

const ChangeToPasswordRecovery = ({ previousRecovery, onSuccess }: { previousRecovery: RecoveryParams, onSuccess: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setRecoveryMethod } = useOpenfort();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const form = e.target as HTMLFormElement;
        const password = (form.elements.namedItem('password-passwordRecovery') as HTMLInputElement).value;
        if (!password || password.length === 0) {
          alert('Please enter a valid password');
          setIsLoading(false);
          return;
        }
        try {

          await setRecoveryMethod(previousRecovery, {
            recoveryMethod: RecoveryMethod.PASSWORD,
            password
          })

          onSuccess();
        } catch (error) {
          console.error('Error setting password recovery:', error);
          setError("Failed to set password recovery.  Check console log for more details.");
        }

        setIsLoading(false);
      }}
    >
      <p className="mb-4 text-sm text-gray-600">
        By setting Password Recovery, you will need to provide a password to recover your wallet. Make sure to choose a strong password and keep it safe, as it will be required for wallet recovery.
      </p>
      <label className="block mb-1 font-medium text-sm" htmlFor="password-passwordRecovery">
        New Password Recovery
      </label>
      <input
        name={`password-passwordRecovery`}
        type="text"
        placeholder="New password recovery"
        className="w-full p-2 border border-gray-200 rounded-lg mb-2"
      />
      <Button
        loading={isLoading}
        className='w-full'
        type="submit"
        variant="outline"
      >
        Set Password Recovery
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}

const ChangeToPasskeyRecovery = ({ previousRecovery, onSuccess }: { previousRecovery: RecoveryParams, onSuccess: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setRecoveryMethod } = useOpenfort();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
          await setRecoveryMethod(previousRecovery, {
            recoveryMethod: RecoveryMethod.PASSKEY,
          })

          onSuccess();
        } catch (error) {
          console.error('Error setting password recovery:', error);
          setError("Failed to set password recovery.  Check console log for more details.");
        }

        setIsLoading(false);
      }}
    >
      <p className="mb-4 text-sm text-gray-600">
        Passkey recovery allows you to recover your wallet using a registered passkey. Ensure that you have a passkey set up for this recovery method to work effectively.
      </p>
      <Button
        loading={isLoading}
        className='w-full'
        type="submit"
        variant="outline"
      >
        Set Passkey Recovery
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}

const VerifyPasswordRecovery = ({ onVerified }: { onVerified: (password: string) => void }) => {
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const password = (form.elements.namedItem('password-verifyRecovery') as HTMLInputElement).value;
        if (!password || password.length === 0) {
          alert('Please enter a valid password');
          return;
        }
        onVerified(password);
      }}
    >
      <p className="mb-4 text-sm text-gray-600">
        To proceed with changing your recovery method, please verify your current Password Recovery by entering your existing password.
      </p>
      <label className="block mb-1 font-medium text-sm" htmlFor="password-verifyRecovery">
        Verify your current password
      </label>
      <input
        name={`password-verifyRecovery`}
        type="text"
        placeholder="Verify current password recovery"
        className="w-full p-2 border border-gray-200 rounded-lg mb-2"
      />
      <Button
        className='w-full'
        type="submit"
        variant="outline"
      >
        Verify Password Recovery
      </Button>
    </form>
  );
}

const SetWalletRecoveryContent = ({ onSuccess, handleSetMessage }: { onSuccess: () => void, handleSetMessage: (message: string) => void }) => {
  const { refetchAccount, account, state, getEncryptionSession, requestOTP } = useOpenfort();

  const [previousRecovery, setPreviousRecovery] = useState<RecoveryParams>();
  const [changingTo, setChangingTo] = useState<RecoveryMethod | null>(null);
  
  // OTP state
  const [showOTPRequest, setShowOTPRequest] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [otpRequestLoading, setOtpRequestLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);

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
      const encryptionSession = await getEncryptionSession(otpCode);
      setPreviousRecovery({
        recoveryMethod: RecoveryMethod.AUTOMATIC,
        encryptionSession
      });
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

  const handleRecoveryChangeSuccess = async () => {
    await refetchAccount();
    handleSetMessage("Wallet recovery method successfully changed to " + changingTo + ".");
    setChangingTo(null);
    setPreviousRecovery(undefined);
    onSuccess();
  };

  const renderChangingTo = () => {
    if (!previousRecovery) return null;

    switch (changingTo) {
      case RecoveryMethod.AUTOMATIC:
        return <ChangeToAutomaticRecovery previousRecovery={previousRecovery} onSuccess={handleRecoveryChangeSuccess} />;
      case RecoveryMethod.PASSWORD:
        return <ChangeToPasswordRecovery previousRecovery={previousRecovery} onSuccess={handleRecoveryChangeSuccess} />;
      case RecoveryMethod.PASSKEY:
        return <ChangeToPasskeyRecovery previousRecovery={previousRecovery} onSuccess={handleRecoveryChangeSuccess} />;
      case null:
      case undefined:
        return null;
      default: return <div>Recovery method not supported: "{changingTo}"</div>;
    }
  }

  useEffect(() => {
    if (!previousRecovery && account?.recoveryMethod === RecoveryMethod.AUTOMATIC) {
      (async () => {
        try {
          const encryptionSession = await getEncryptionSession();
          setPreviousRecovery({
            recoveryMethod: RecoveryMethod.AUTOMATIC,
            encryptionSession
          });
        } catch (error) {
          if (error.message === 'OTP_REQUIRED') {
            setShowOTPRequest(true);
          } else {
            console.error('Error getting encryption session:', error);
          }
        }
      })();
    }
  }, [previousRecovery]);

  const renderVerifyPreviousRecovery = () => {
    if (previousRecovery || !account) return null;

    switch (account.recoveryMethod) {
      case RecoveryMethod.AUTOMATIC:
        return <Loading />;
      case RecoveryMethod.PASSWORD:
        return <VerifyPasswordRecovery onVerified={async (password) => {
          setPreviousRecovery({
            recoveryMethod: RecoveryMethod.PASSWORD,
            password
          });
        }} />;
      default: return null;
    }
  }


  return (
    <>
      {
        previousRecovery && (
          !changingTo ? (
            <>
              <div className="mb-4 text-sm">
                Current recovery method: {account?.recoveryMethod || 'Not set'}
              </div>
              {[RecoveryMethod.AUTOMATIC, RecoveryMethod.PASSWORD, RecoveryMethod.PASSKEY].map((method) => (
                <Button
                  key={method}
                  className='w-full mb-2'
                  disabled={method === account?.recoveryMethod || state !== EmbeddedState.READY}
                  onClick={async () => {
                    setChangingTo(method);
                  }}
                >
                  Set {method} recovery
                </Button>
              ))}
            </>
          ) : (
            <button
              type="button"
              className='flex mb-4'
              onClick={() => setChangingTo(null)}
            >
              <ChevronLeft className="mr-2" />
              <div className="text-sm">
                Changing to: <b>{changingTo} recovery</b>
              </div>
            </button>
          )
        )
      }
      {renderChangingTo()}
      {renderVerifyPreviousRecovery()}

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

const SetWalletRecovery = ({ handleSetMessage }: { handleSetMessage: (message: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            className='w-full'
            variant="outline"
          >
            Set wallet recovery
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle className="mb-4">
            Change Wallet Recovery Method
          </SheetTitle>
          <SetWalletRecoveryContent onSuccess={() => setOpen(false)} handleSetMessage={handleSetMessage} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default SetWalletRecovery;
