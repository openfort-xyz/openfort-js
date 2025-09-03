import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import openfort from '@/utils/openfortConfig';
import { AccountTypeEnum, ChainTypeEnum, RecoveryMethod } from '@openfort/openfort-js';
import { useState } from 'react';
import { polygonAmoy } from 'viem/chains';
import { useOpenfort } from '../../hooks/useOpenfort';
import { Button } from '../ui/button';

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
  const { getEncryptionSession, createWallet } = useOpenfort();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
          const response = await createWallet({
            recoveryParams: {
              recoveryMethod: RecoveryMethod.AUTOMATIC,
              encryptionSession: await getEncryptionSession(),
            },
          })
          handleSetMessage(`Created a new wallet with automatic recovery.\nwallet: ${JSON.stringify(response, null, 2)}`);
          onSuccess();
        } catch (error) {
          console.error('Error setting automatic recovery:', error);
          setError('Failed to set automatic recovery. Check console log for more details.');
        }
        setIsLoading(false);
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
