/* eslint-disable react-hooks/exhaustive-deps */
import { AccountTypeEnum, AuthPlayerResponse, ChainTypeEnum, EmbeddedAccount, EmbeddedState } from "@openfort/openfort-js"
import { PublicKey } from "@solana/web3.js"
import { useEffect, useState } from "react"
import { Login } from "./Login"
import { openfort } from "./openfort"
import SolanaExternalSignerComponent from "./solana"

export const Content = () => {
  const [embeddedState, setEmbeddedState] = useState(EmbeddedState.NONE)
  const [user, setUser] = useState<AuthPlayerResponse | null>(null)
  const [account, setAccount] = useState<EmbeddedAccount>()
  const [accounts, setAccounts] = useState<EmbeddedAccount[]>([])
  const [showAccounts, setShowAccounts] = useState(false)
  const [message, setMessage] = useState("")
  const [signature, setSignature] = useState("")

  useEffect(() => {
    const interval = setInterval(async () => {
      const state = await openfort.embeddedWallet.getEmbeddedState()
      setEmbeddedState(state)
      console.log(`Embedded Wallet state: ${state}`)
    }, 300)

    return () => clearInterval(interval)
  }, [])

  const getUser = async () => {
    const user = await openfort.user.get()
    console.log("User:", user)
    setUser(user)
  }

  const listAccounts = async () => {
    try {
      const accountsList = await openfort.embeddedWallet.listWithConfig({limit: 100})
      console.log("All accounts:", accountsList)
      setAccounts(accountsList)
      setShowAccounts(true)
    } catch (error) {
      console.error("Error listing accounts:", error)
    }
  }

  const createAccount = async () => {
    try {
      console.log("Creating new Solana account...")
      const newAccount = await openfort.embeddedWallet.create({
        accountType: AccountTypeEnum.EOA,
        chainType: ChainTypeEnum.SVM,
        chainId: 2, // Solana devnet
      })
      console.log("New account created:", newAccount)
      setAccount(newAccount)
      // Refresh the accounts list if it's currently shown
      if (showAccounts) {
        listAccounts()
      }
    } catch (error) {
      console.error("Error creating account:", error)
    }
  }

  const recoverAccount = async (accountId: string) => {
    try {
      console.log("Recovering account with ID:", accountId)
      const recoveredAccount = await openfort.embeddedWallet.recover({
        account: accountId,
      })
      console.log("Account recovered:", recoveredAccount)
      setAccount(recoveredAccount)
    } catch (error) {
      console.error("Error recovering account:", error)
    }
  }

  const signMessage = async () => {
    if (!message.trim()) {
      console.error("Please enter a message to sign")
      return
    }
    
    try {
      console.log("Signing message:", message)
      const sig = await openfort.embeddedWallet.signMessage(
        message,
        undefined,
        "SVM"
      )
      console.log("Message signed:", sig)
      setSignature(sig)
    } catch (error) {
      console.error("Error signing message:", error)
    }
  }

  useEffect(() => {
    const handleEmbeddedState = async () => {
      if (embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
        if (!user) await getUser();

        try {
          // First, try to list existing wallets
          console.log("checking for existing wallets")
          const existingWallets = await openfort.embeddedWallet.listWithConfig()
          const solanaWallets = existingWallets.filter(wallet => 
            wallet.accountType === AccountTypeEnum.EOA && 
            wallet.chainType === ChainTypeEnum.SVM
          );

          console.log("Here is selected existingWallets:", existingWallets);
          console.log("Here is solanaWallets array:", solanaWallets);

          if (solanaWallets.length > 0) {
            // If wallets exist, recover the first one
            console.log("recovering existing embedded signer", solanaWallets[0].address)
            await openfort.embeddedWallet.recover({
              account: solanaWallets[0].id,
              // not defining recoveryParams will default to automatic recovery
            })
          } else {
            // If no wallets exist, create a new one
            console.log("configuring embedded signer")
            await openfort.embeddedWallet.create(
              { 
                accountType: AccountTypeEnum.EOA,
                chainType: ChainTypeEnum.SVM,
                chainId: 2, // TODO: drop this hardcode
              }
            )
          }
        } catch (error) {
          console.error("Error configuring embedded wallet:", error)
          // Fallback to creating a new wallet if recovery fails
          console.log("fallback: creating new embedded signer")
          await openfort.embeddedWallet.create(
            { 
              accountType: AccountTypeEnum.EOA,
              chainType: ChainTypeEnum.SVM,
              chainId: 2, // TODO: drop this hardcode
            }
          )
        }
      }

      if (embeddedState === EmbeddedState.READY) {
        const account = await openfort.embeddedWallet.get()
        setAccount(account)
      }
    }
    handleEmbeddedState()
  }, [embeddedState])

  if (embeddedState === EmbeddedState.NONE || embeddedState === EmbeddedState.UNAUTHENTICATED) {
    return (
      <div className="text-white flex flex-col items-center gap-4">
        <Login />
      </div>
    )
  }
  console.log("Embedded wallet:", account)
  // const isSolana = account?.chainType === "solana";
  
  return (
    <div className="text-white flex flex-col items-center gap-4">
      <p className="text-lg" onClick={() => getUser()}>Openfort user:
        <span className="text-blue-200 mx-2">
          {user?.id}
        </span>
      </p>
      <button onClick={() => openfort.auth.logout()}>
        Logout
      </button>
      <div className="flex gap-4">
        <button onClick={listAccounts} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
          List Accounts
        </button>
        <button onClick={createAccount} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
          Create Account
        </button>
      </div>
      
      {showAccounts && (
        <div className="w-full max-w-4xl mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">All Accounts ({accounts.length})</h3>
            <button 
              onClick={() => setShowAccounts(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {accounts.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No accounts found</p>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm flex-1">
                      <div><span className="text-gray-400">ID:</span> <span className="font-mono">{acc.id}</span></div>
                      <div><span className="text-gray-400">Address:</span> <span className="font-mono">{acc.address}</span></div>
                      <div><span className="text-gray-400">Account Type:</span> <span>{acc.accountType}</span></div>
                      <div><span className="text-gray-400">Chain Type:</span> <span>{acc.chainType}</span></div>
                      <div><span className="text-gray-400">Chain ID:</span> <span>{acc.chainId}</span></div>
                      {acc.ownerAddress && (
                        <div><span className="text-gray-400">Owner:</span> <span className="font-mono">{acc.ownerAddress}</span></div>
                      )}
                    </div>
                    <button 
                      onClick={() => recoverAccount(acc.id)}
                      className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm ml-4 flex-shrink-0"
                    >
                      Recover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
        <div className="w-xl">
          {account && (
            <SolanaExternalSignerComponent publicKey={new PublicKey(account.address)} />
          )}
        </div>

        {account && (
          <div className="w-full max-w-2xl mt-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold mb-4 text-white">Sign Message</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message to sign:
                </label>
                <input
                  id="message"
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message here..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={signMessage}
                disabled={!message.trim()}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded text-white font-medium transition-colors"
              >
                Sign
              </button>
              {signature && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Signature:
                  </label>
                  <div className="p-3 bg-gray-700 rounded-md border border-gray-600">
                    <code className="text-xs text-green-400 break-all">{signature}</code>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  )
}