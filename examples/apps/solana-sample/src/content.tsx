/* eslint-disable react-hooks/exhaustive-deps */
import { AuthPlayerResponse, EmbeddedAccount, EmbeddedState, RecoveryMethod, ShieldAuthType } from "@openfort/openfort-js"
import { PublicKey } from "@solana/web3.js"
import { CSSProperties, useEffect, useState } from "react"
import { Login } from "./Login"
import { openfort } from "./openfort"
import SolanaExternalSignerComponent from "./solana"

export const Content = () => {
  const [embeddedState, setEmbeddedState] = useState(EmbeddedState.NONE)
  const [user, setUser] = useState<AuthPlayerResponse | null>(null)
  const [account, setAccount] = useState<EmbeddedAccount>()
  const [goalChain, setGoalChain] = useState<string>()

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

  useEffect(() => {
    const handleEmbeddedState = async () => {
      if (embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
        if (!user) await getUser();

        console.log("configuring embedded signer")
        await openfort.embeddedWallet.configure(
          { 
            chainId:103, 
            shieldAuthentication: {
              auth: ShieldAuthType.OPENFORT,
              token: (await openfort.getAccessToken())!,
            },
            recoveryParams: { recoveryMethod: RecoveryMethod.PASSWORD, password: "password" }
          }
        )
      }

      if (embeddedState === EmbeddedState.READY) {
        const account = await openfort.embeddedWallet.get()
        setAccount(account)
      }
    }

    handleEmbeddedState()
  }, [embeddedState])

  const configureChain = async (chain: string) => {
    setGoalChain(chain)
    await openfort.embeddedWallet.configure(
      { 
        chainId: parseInt(chain), 
        shieldAuthentication: {
          auth: ShieldAuthType.OPENFORT,
          token: (await openfort.getAccessToken())!,
        },
      }
    )
  }

  useEffect(() => {
    if (!goalChain) return

    let interval: NodeJS.Timeout | undefined

    const startPollAccount = () => {
      interval = setInterval(async () => {
        const account = await openfort.embeddedWallet.get()
        console.log("polling account", account)
        setAccount(account)
      }, 500)
    }

    if (account?.chainId && goalChain !== account.chainId) {
      startPollAccount()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [goalChain, account?.chainId])

  if (embeddedState === EmbeddedState.NONE || embeddedState === EmbeddedState.UNAUTHENTICATED) {
    return (
      <div className="text-white flex flex-col items-center gap-4">
        <Login />
      </div>
    )
  }
  console.log("Embedded wallet:", account)
  const isSolana = account?.chainType === "solana";
  
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
      <div className="flex flex-col items-center gap-4 opacity-[var(--opacity)]" style={{ "--opacity": goalChain && goalChain !== account?.chainId ? 0.5 : 1 } as CSSProperties}>
        <button onClick={() => configureChain(isSolana ? '80002' : '103')}>
          Switch to {
            isSolana ? "Polygon" : "Solana"
          }
        </button>
        <div className="w-xl">
          {isSolana ? (
            account && (
              <SolanaExternalSignerComponent publicKey={new PublicKey(account.address)} />
            )
          ) : (
            <div className="w-full">
              <h2>{account?.chainType}</h2>
              <div className="flex flex-col pt-2">
                <p><strong>Address:</strong> {account?.address}</p>
                {account?.ownerAddress && <p><strong>Owner:</strong> {account.ownerAddress}</p>}
                <p><strong>Chain id:</strong> {account?.chainId}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}