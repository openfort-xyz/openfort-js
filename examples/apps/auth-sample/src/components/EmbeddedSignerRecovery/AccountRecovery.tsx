import { useEffect, useState } from 'react';
import { useOpenfort } from '../../hooks/useOpenfort';
import Loading from '../Loading';
import { Button } from '../ui/button';
import { StatusType, Toast } from '../Toasts';
import { AccountTypeEnum, ChainTypeEnum, EmbeddedAccount, MissingRecoveryPasswordError, RecoveryMethod, RecoveryParams, WrongRecoveryPasswordError } from '@openfort/openfort-js';
import openfort from '@/utils/openfortConfig';
import { Hex } from 'viem';
import { ChevronLeft, ChevronRight, ExpandIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);

const PasswordRecoveryForm = () => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
          const response = await openfort.embeddedWallet.create({
            accountType: AccountTypeEnum.SMART_ACCOUNT,
            chainType: ChainTypeEnum.EVM,
            recoveryParams: {
              recoveryMethod: RecoveryMethod.PASSWORD,
              password,
            },
            chainId,
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

const AutomaticRecovery = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getEncryptionSession } = useOpenfort();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
          await openfort.embeddedWallet.create({
            accountType: AccountTypeEnum.SMART_ACCOUNT,
            chainType: ChainTypeEnum.EVM,
            recoveryParams: {
              recoveryMethod: RecoveryMethod.AUTOMATIC,
              encryptionSession: await getEncryptionSession(),
            },
            chainId,
          })
        } catch (error) {
          console.error('Error setting automatic recovery:', error);
          setError('Failed to set automatic recovery. Check console log for more details.');
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
        Set Automatic Recovery
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
};




const ChangeWalletButton = ({ account }: { account: EmbeddedAccount }) => {
  const [loading, setLoading] = useState(false);
  const { getEncryptionSession } = useOpenfort();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleRecoverWallet = async (accountId: string, recoveryParams: RecoveryParams) => {
    setLoading(true);
    try {
      await openfort.embeddedWallet.recover({
        account: accountId,
        recoveryParams,
      });
    } catch (error) {
      console.error('Error switching wallet:', error);
      setError(`Failed to switch wallet. Check console log for more details.`);
    }
    setLoading(false);
  }

  return (
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
              handleRecoverWallet(account.id as Hex, {
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
            handleRecoverWallet(account.id as Hex, {
              recoveryMethod: RecoveryMethod.AUTOMATIC,
              encryptionSession: await getEncryptionSession()
            });
            setLoading(false);
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
          className={cn('text-xs px-2 py-1 rounded-full border border-gray-300 capitalize',)}
        >
          {account.recoveryMethod} recovery
        </span>
      </div>
      {
        expanded && (
          <>
            <p><strong>Wallet ID:</strong> {account.id}</p>
            <p className='break-all'><strong>Address:</strong> {account.address}</p>
            <p><strong>Recovery Method:</strong> {account.recoveryMethod}</p>
          </>
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
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
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
          <PasswordRecoveryForm />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>
          <AutomaticRecovery />
        </div>
      </>
    )
  }

  return (
    <div className='space-y-4'>
      {
        accounts.map((account) => (
          <ChangeWalletButton
            key={account.id}
            account={account}
          />
        ))
      }
    </div>
  );
};

export default AccountRecovery;
