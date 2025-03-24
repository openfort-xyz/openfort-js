/* eslint-disable react-hooks/exhaustive-deps */
import { AuthPlayerResponse, EmbeddedState, ShieldAuthType } from "@openfort/openfort-js"
import { PublicKey } from "@solana/web3.js"
import { CSSProperties, useEffect, useState } from "react"
import { Login } from "./Login"
import { openfort } from "./openfort"
import SolanaExternalSignerComponent from "./solana"

// const chainId = 80002
const chainId = 103

export const Content = () => {
  const [embeddedState, setEmbeddedState] = useState(EmbeddedState.NONE)
  const [user, setUser] = useState<AuthPlayerResponse | null>(null)
  const [account, setAccount] = useState<{
    address: string;
    ownerAddress: string;
    accountType: string;
    chainId: number;
  }>()
  const [goalChain, setGoalChain] = useState<number>()

  useEffect(() => {
    const interval = setInterval(async () => {
      const state = openfort.getEmbeddedState()
      setEmbeddedState(state)
      console.log(state)
    }, 300)

    return () => clearInterval(interval)
  }, [])


  const getUser = async () => {
    const user = await openfort.getUser()
    setUser(user)
  }

  useEffect(() => {
    if (EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED)
      if (!user) getUser();

    if (embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
      console.log("configuring embedded signer")
      openfort.configureEmbeddedSigner(chainId, {
        auth: ShieldAuthType.OPENFORT,
        token: openfort.getAccessToken()!,
      }, "whatever")
    }

    if (embeddedState === EmbeddedState.READY) {
      openfort.getAccount().then(account =>
        // console.log(account)
        setAccount(account)
      )
    }
  }, [embeddedState])

  const configureChain = (chain: number) => {
    setGoalChain(chain)
    openfort.configureEmbeddedSigner(chain, {
      auth: ShieldAuthType.OPENFORT,
      token: openfort.getAccessToken()!,
    })
  }

  useEffect(() => {
    if (!goalChain) return

    let interval: NodeJS.Timeout | undefined

    const startPullAccount = () => {
      interval = setInterval(async () => {
        const account = await openfort.getAccount()
        console.log("polling account", account)
        setAccount(account)
      }, 500)
    }

    if (goalChain !== account?.chainId) {
      startPullAccount()
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

  const isSolana = account?.accountType === "sol";
  return (
    <div className="text-white flex flex-col items-center gap-4">
      <p className="text-lg" onClick={() => getUser()}>Openfort user:
        <span className="text-blue-200 mx-2">
          {user?.id}
        </span>
      </p>
      <button onClick={() => openfort.logout()}>
        Logout
      </button>
      <div className="flex flex-col items-center gap-4 opacity-[var(--opacity)]" style={{ "--opacity": goalChain && goalChain !== account?.chainId ? 0.5 : 1 } as CSSProperties}>
        <button onClick={() => configureChain(isSolana ? 80002 : 103)}>
          Switch to {
            isSolana ? "Polygon" : "Solana"
          }
        </button>
        <div className="w-xl">
          {isSolana ? (
            account && (
              <SolanaExternalSignerComponent publicKey={new PublicKey(account.ownerAddress)} />
            )
          ) : (
            <div className="w-full">
              <h2>{account?.accountType}</h2>
              <div className="flex flex-col pt-2">
                <p><strong>Address:</strong> {account?.address}</p>
                <p><strong>Owner:</strong> {account?.ownerAddress}</p>
                <p><strong>Chain id:</strong> {account?.chainId}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  )
}