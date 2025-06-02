'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Address, type Hex, createWalletClient, custom, formatEther, getAddress, parseAbi, parseEther } from 'viem'
import {
  type BaseError,
  Connector,
  useAccount,
  useAccountEffect,
  useBalance,
  useBlockNumber,
  useChainId,
  useConnect,
  useConnections,
  useConnectorClient,
  useDisconnect,
  useEnsName,
  useReadContract,
  useReadContracts,
  useSendTransaction,
  useSignMessage,
  useSwitchAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
  useSendCalls
} from 'wagmi'
import { useRouter } from 'next/navigation'

import { wagmiContractConfig } from './contracts'
import { openfortInstance } from '../openfort'
import { erc7715Actions, GrantPermissionsReturnType } from 'viem/experimental'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

export default function App() {
  useAccountEffect({
    onConnect(_data) {
      // console.log('onConnect', data)
    },
    onDisconnect() {
      // console.log('onDisconnect')
    },
  })

  return (
    <>
      <Account />
      <Connect />
      <SwitchAccount />
      <SwitchChain />
      <SignMessage />
      <Connections />
      <BlockNumber />
      <Balance />
      <ConnectorClient />
      <SendTransaction />
      <ReadContract />
      <ReadContracts />
      <WriteContract />
      <WriteContracts />
      <GrantPermission />
    </>
  )
}

function Account() {
  const account = useAccount()
  const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({
    address: account.address,
  })

  return (
    <div>
      <h2>Account</h2>

      <div>
        account: {account.address} {ensName}
        <br />
        chainId: {account.chainId}
        <br />
        status: {account.status}
      </div>

      {account.status === 'connected' && (
        <button type="button" onClick={async() => {
          if (account.connector && account.connector.name.includes('Openfort')) {
            await openfortInstance.logout();
          }
          disconnect()
          }
          }>
          Disconnect
        </button>
      )}
    </div>
  )
}

function Connect() {
    const chainId = useChainId();
    const {connectors, connect, error} = useConnect();
    const router = useRouter()
    const [activeConnector, setActiveConnector] =
    useState<Connector | null>(null);
  
    useEffect(() => {
      if (
        error &&
        activeConnector?.name === 'Openfort' &&
        error.message ===
          'Unauthorized - must be authenticated and configured with a signer'
      ) {
        router.push('/authentication');
      }
    }, [error, activeConnector, router]);
  
    const handleConnect = (connector: Connector) => {
      setActiveConnector(connector);
      connect({connector, chainId});
    };
  
    return (
      <div>
        <div className="buttons">
          {connectors
            .filter((connector) => !connector.name.includes('Injected'))
            .map((connector) => (
              <ConnectorButton
                key={connector.uid}
                connector={connector}
                onClick={() => handleConnect(connector)}
              />
            ))}
        </div>
        {error && <div className="error">Error: {error.message}</div>}
      </div>
    );
}

function ConnectorButton({
    connector,
    onClick,
}: {
    connector: Connector;
    onClick: () => void;
    }) {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        (async () => {
        const provider = await connector.getProvider();
        setReady(!!provider);
        })();
    }, [connector, setReady]);

    return (
        <button
        className="button"
        disabled={!ready}
        onClick={onClick}
        type="button"
        >
        {connector.name}
        </button>
    );
}

function SwitchAccount() {
  const account = useAccount()
  const { connectors, switchAccount } = useSwitchAccount()

  return (
    <div>
      <h2>Switch Account</h2>

      {connectors.map((connector) => (
        <button
          disabled={account.connector?.uid === connector.uid}
          key={connector.uid}
          onClick={() => switchAccount({ connector })}
          type="button"
        >
          {connector.name}
        </button>
      ))}
    </div>
  )
}

function SwitchChain() {
  const chainId = useChainId()
  const { chains, switchChain, error } = useSwitchChain()

  return (
    <div>
      <h2>Switch Chain</h2>

      {chains.map((chain) => (
        <button
          disabled={chainId === chain.id}
          key={chain.id}
          onClick={() => switchChain({ chainId: chain.id })}
          type="button"
        >
          {chain.name}
        </button>
      ))}

      {error?.message}
    </div>
  )
}

function SignMessage() {
  const { data, signMessage, error } = useSignMessage()

  return (
    <div>
      <h2>Sign Message</h2>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.target as HTMLFormElement)
          signMessage({ message: formData.get('message') as string })
        }}
      >
        <input name="message" />
        <button type="submit">Sign Message</button>
        <p>{error?.message}</p>
      </form>

      {data}
    </div>
  )
}

function Connections() {
  const connections = useConnections()

  return (
    <div>
      <h2>Connections</h2>

      {connections.map((connection) => (
        <div key={connection.connector.uid}>
          <div>connector {connection.connector.name}</div>
          <div>accounts: {JSON.stringify(connection.accounts)}</div>
          <div>chainId: {connection.chainId}</div>
        </div>
      ))}
    </div>
  )
}

function Balance() {
  const { address } = useAccount()

  const { data: default_ } = useBalance({ address })
  const { data: account_ } = useBalance({ address })
  return (
    <div>
      <h2>Balance</h2>

      <div>
        Balance (Default Chain):{' '}
        {!!default_?.value && formatEther(default_.value)}
      </div>
      <div>
        Balance (Account Chain):{' '}
        {!!account_?.value && formatEther(account_.value)}
      </div>
    </div>
  )
}

function BlockNumber() {
  const { data: default_ } = useBlockNumber({ watch: true })
  const { data: account_ } = useBlockNumber({
    watch: true,
  })

  return (
    <div>
      <h2>Block Number</h2>

      <div>Block Number (Default Chain): {default_?.toString()}</div>
      <div>Block Number (Account Chain): {account_?.toString()}</div>
    </div>
  )
}

function ConnectorClient() {
  const { data, error } = useConnectorClient()
  return (
    <div>
      <h2>Connector Client</h2>
      client {data?.account?.address} {data?.chain?.id}
      {error?.message}
    </div>
  )
}

function SendTransaction() {
  const { data: hash, error, isPending, sendTransaction } = useSendTransaction()

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const to = formData.get('address') as Hex
    const value = formData.get('value') as string
    sendTransaction({ to, value: parseEther(value) })
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })

  return (
    <div>
      <h2>Send Transaction</h2>
      <form onSubmit={submit}>
        <input name="address" placeholder="Address" required />
        <input
          name="value"
          placeholder="Amount (ETH)"
          type="number"
          step="0.000000001"
          required
        />
        <button disabled={isPending} type="submit">
          {isPending ? 'Confirming...' : 'Send'}
        </button>
      </form>
      {hash && <div>Transaction Hash: {hash}</div>}
      {isConfirming && 'Waiting for confirmation...'}
      {isConfirmed && 'Transaction confirmed.'}
      {error && (
        <div>Error: {(error as BaseError).shortMessage || error.message}</div>
      )}
    </div>
  )
}

function ReadContract() {
  const { data: balance } = useReadContract({
    ...wagmiContractConfig,
    functionName: 'balanceOf',
    args: ['0x03A71968491d55603FFe1b11A9e23eF013f75bCF'],
  })

  return (
    <div>
      <h2>Read Contract</h2>
      <div>Balance: {balance?.toString()}</div>
    </div>
  )
}

function ReadContracts() {
  const { data } = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        ...wagmiContractConfig,
        functionName: 'balanceOf',
        args: ['0x03A71968491d55603FFe1b11A9e23eF013f75bCF'],
      },
      {
        ...wagmiContractConfig,
        functionName: 'ownerOf',
        args: [69n],
      },
      {
        ...wagmiContractConfig,
        functionName: 'totalSupply',
      },
    ],
  })
  const [balance, ownerOf, totalSupply] = data || []

  return (
    <div>
      <h2>Read Contract</h2>
      <div>Balance: {balance?.toString()}</div>
      <div>Owner of Token 69: {ownerOf?.toString()}</div>
      <div>Total Supply: {totalSupply?.toString()}</div>
    </div>
  )
}

function WriteContract() {
  const { data: hash, error, isPending, writeContract } = useWriteContract()

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const tokenId = formData.get('tokenId') as string
    writeContract({
      address: getAddress('0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2'),
      abi: parseAbi(['function mint(uint256 tokenId)']),
      functionName: 'mint',
      args: [BigInt(tokenId)],
    })
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })

  return (
    <div>
      <h2>Write Contract</h2>
      <form onSubmit={submit}>
        <input name="tokenId" placeholder="Token ID" type='number' required />
        <button disabled={isPending} type="submit">
          {isPending ? 'Confirming...' : 'Mint'}
        </button>
      </form>
      {hash && <div>Transaction Hash: {hash}</div>}
      {isConfirming && 'Waiting for confirmation...'}
      {isConfirmed && 'Transaction confirmed.'}
      {error && (
        <div>Error: {(error as BaseError).details || error.message}</div>
      )}
    </div>
  )
}



function WriteContracts() {
  const { data: hash, error, isPending, sendCalls } = useSendCalls()

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const tokenId = formData.get('tokenId') as string
    sendCalls(
      {
        calls: [
          {
            to: getAddress('0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2'),
            abi: parseAbi(['function mint(uint256 tokenId)']),
            functionName: 'mint',
            args: [BigInt(tokenId)],
          },
          {
            to: getAddress('0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2'),
            abi: parseAbi(['function mint(uint256 tokenId)']),
            functionName: 'mint',
            args: [BigInt(tokenId)],
          }
        ],
      }
    )
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: hash?.id as `0x${string}`,
    })

  return (
    <div>
      <h2>Write Contracts (Batch)</h2>
      <form onSubmit={submit}>
        <input name="tokenId" placeholder="Token ID" type='number' required />
        <button disabled={isPending} type="submit">
          {isPending ? 'Confirming...' : 'Mint'}
        </button>
      </form>
      {hash && <div>Transaction Hash: {hash?.id}</div>}
      {isConfirming && 'Waiting for confirmation...'}
      {isConfirmed && 'Transaction confirmed.'}
      {error && (
        <div>Error: {(error as BaseError).details || error.message}</div>
      )}
    </div>
  )
}

function GrantPermission() {
  const { connector, chain } = useAccount();
  const [error, setError] = useState<BaseError | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GrantPermissionsReturnType | null>(null);
  const [mounted, setMounted] = useState(false);

  const [expiryMinutes, setExpiryMinutes] = useState(24 * 60);
  const [limit, setLimit] = useState(5);
  const [whitelistedContracts, setWhitelistedContracts] = useState<`0x${string}`[]>([]);
  const [newContract, setNewContract] = useState<`0x${string}`>('0x');

  const PRESET_EXPIRY = {
    DAY: 24 * 60,
    WEEK: 7 * 24 * 60,
    MONTH: 30 * 24 * 60
  };

  useEffect(() => {
    setMounted(true);
    setWhitelistedContracts(['0x2522f4fc9af2e1954a3d13f7a5b2683a00a4543a']);
  }, []);

  async function grantPermissions(sessionKeyAddress: Address) {
    const provider = await connector?.getProvider();
    const walletClient = createWalletClient({
      chain,
      transport: custom(provider as any),
    }).extend(erc7715Actions());

    const response = await walletClient.grantPermissions({
      signer: {
        type: "key",
        data: {
          id: sessionKeyAddress
        }
      },
      expiry: expiryMinutes * 60,
      permissions: whitelistedContracts.map(contract => ({
        type: 'contract-call',
        data: {
          address: contract,
          calls: []
        },
        policies: [
          {
            type: {
              custom: "usage-limit"
            },
            data: {
              limit
            }
          }
        ]
      }))
    });

    return response;
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      const privateKey = generatePrivateKey();
      const accountSession = privateKeyToAccount(privateKey).address;
      const response = await grantPermissions(accountSession);
      setResult(response);
    } catch (err) {
      setError(err as BaseError);
    } finally {
      setPending(false);
    }
  }

  function handleAddContract() {
    if (newContract && !whitelistedContracts.includes(newContract)) {
      try {
        const formattedAddress = getAddress(newContract);
        setWhitelistedContracts([...whitelistedContracts, formattedAddress]);
        setNewContract('0x');
      } catch (err) {
        setError(new Error('Invalid address format') as BaseError);
      }
    }
  }

  function handleRemoveContract(contract: `0x${string}`) {
    setWhitelistedContracts(whitelistedContracts.filter(c => c !== contract));
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Session keys</h2>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <div>
            <label className="block">
              Expiry (minutes):
              <input
                type="number"
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                min="1"
                className="mt-1 block w-full rounded border p-2"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => setExpiryMinutes(PRESET_EXPIRY.DAY)}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              1 Day
            </button>
            <button 
              type="button" 
              onClick={() => setExpiryMinutes(PRESET_EXPIRY.WEEK)}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              1 Week
            </button>
            <button 
              type="button" 
              onClick={() => setExpiryMinutes(PRESET_EXPIRY.MONTH)}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              1 Month
            </button>
          </div>
        </div>

        <div>
          <label className="block">
            Usage Limit:
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              min="1"
              className="mt-1 block w-full rounded border p-2"
            />
          </label>
        </div>

        <div>
          <p className="font-medium">Whitelisted Contracts:</p>
          <div className="space-y-2 mt-2">
            {whitelistedContracts.map((contract) => (
              <div key={contract} className="flex items-center gap-2">
                <span className="flex-1 font-mono">{contract}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveContract(contract)}
                  className="px-3 py-1 bg-red-500 text-white rounded"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={newContract}
              onChange={(e) => setNewContract(e.target.value as `0x${string}`)}
              placeholder="Add contract address (0x...)"
              className="flex-1 rounded border p-2"
            />
            <button 
              type="button"
              onClick={handleAddContract}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              Add Contract
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={pending}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {pending ? 'Registering...' : 'Register key'}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          Registered! Permission context: {result.permissionsContext}
        </div>
      )}
      {error && (
        <div className="mt-4 p-4 bg-red-100 rounded">
          Error: {error.details || error.message}
        </div>
      )}
    </div>
  );
}
