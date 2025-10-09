import { EmbeddedState } from '@openfort/openfort-js'
import type React from 'react'
import ChangeWallet from '@/components/Wallet/ChangeWalletButton'
import CreateWalletButton from '@/components/Wallet/CreateWalletButton'
import ExportPrivateKey from '@/components/Wallet/ExportPrivateKeyButton'
import SetWalletRecovery from '@/components/Wallet/SetWalletRecoveryButton'
import { useOpenfort } from '../../hooks/useOpenfort'
import { Button } from '../ui/button'

const Wallets: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const { state, account, accounts, isLoadingAccounts } = useOpenfort()

  const handleListWallets = async () => {
    handleSetMessage(`wallet list (length: ${accounts.length}): ${JSON.stringify(accounts, null, 2)}`)
  }

  if (!account) {
    return <div>Loading account...</div>
  }

  const handleGetWallet = async () => {
    handleSetMessage(`Current wallet: ${JSON.stringify(account, null, 2)}`)
  }

  return (
    <>
      <div className="space-y-2">
        <span className="font-medium text-black">Current wallet</span>
        <Button className="w-full" onClick={handleGetWallet} disabled={state !== EmbeddedState.READY} variant="outline">
          Get wallet
        </Button>
        <ExportPrivateKey handleSetMessage={handleSetMessage} />
        <SetWalletRecovery handleSetMessage={handleSetMessage} />
      </div>
      <div className="space-y-2">
        <p className="font-medium text-black">User embedded wallets:</p>
        <Button
          className="w-full"
          onClick={handleListWallets}
          disabled={state !== EmbeddedState.READY || isLoadingAccounts}
          variant="outline"
        >
          List wallets
        </Button>
        <ChangeWallet handleSetMessage={handleSetMessage} />
        <CreateWalletButton handleSetMessage={handleSetMessage} />
      </div>
    </>
  )
}

export default Wallets
