import openfort from '@/utils/openfortConfig';
import { EmbeddedAccount, EmbeddedState } from '@openfort/openfort-js';
import React, { useEffect, useState } from 'react';
import { useOpenfort } from '../../hooks/useOpenfort';
import Loading from '../Loading';
import { Button } from '../ui/button';
import ExportPrivateKey from '@/components/Wallet/ExportPrivateKeyButton';
import SetWalletRecovery from '@/components/Wallet/SetWalletRecoveryButton';
import ChangeWallet from '@/components/Wallet/ChangeWalletButton';
import CreateWalletButton from '@/components/Wallet/CreateWalletButton';

const Wallets: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({ handleSetMessage }) => {

  const [loading, setLoading] = useState(false);

  const { state, account } = useOpenfort();

  const handleListWallets = async () => {
    setLoading(true);
    handleSetMessage("wallet list: " + JSON.stringify(await openfort.embeddedWallet.list(), null, 2));
    setLoading(false);
  }

  if (!account) {
    return <div>Loading account...</div>;
  }

  const handleGetWallet = async () => {
    const account = await openfort.embeddedWallet.get();
    handleSetMessage("Current wallet: " + JSON.stringify(account, null, 2));
  }

  return (
    <>
      <div className='space-y-2'>
        <span className="font-medium text-black">
          Current wallet
        </span>
        <Button
          className='w-full'
          onClick={handleGetWallet}
          disabled={state !== EmbeddedState.READY}
          variant="outline"
        >
          Get wallet
        </Button>
        <ExportPrivateKey handleSetMessage={handleSetMessage} />
        <SetWalletRecovery
          handleSetMessage={handleSetMessage}
        />
      </div>
      <div className='space-y-2'>
        <p className="font-medium text-black">
          User embedded wallets:
        </p>
        <Button
          className='w-full'
          onClick={handleListWallets}
          disabled={state !== EmbeddedState.READY}
          variant="outline"
        >
          {loading ? <Loading /> : 'List wallets'}
        </Button>
        <ChangeWallet
          handleSetMessage={handleSetMessage}
        />
        <CreateWalletButton handleSetMessage={handleSetMessage} />
      </div>
    </>
  );
};

export default Wallets;
