import { EmbeddedState } from '@openfort/openfort-js'
import { DialogDescription } from '@radix-ui/react-dialog'
import { useEffect, useRef, useState } from 'react'
import { type Address, formatEther } from 'viem'
import { polygonAmoy } from 'viem/chains'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useOpenfort } from '@/contexts/OpenfortContext'
import Loading from '../Loading'
import { Button } from '../ui/button'
import { AddFundsWithWagmi } from './AddFundsWithWagmi'

const StepEnum = {
  START: 0,
  SERVICE_PROGRESS: 1,
  COMPLETED: 3,
  WAGMI_WALLET: 10,
  MANUAL: 20,
} as const

const AddFunds: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const { state, getEvmProvider, getEOAAddress, getBalance } = useOpenfort()

  const [step, setStep] = useState<number>(0)
  const [service, setService] = useState<any>()
  const [cbLink, setCbLink] = useState<string>('')
  const [moonpayLink, setMoonpayLink] = useState<string>('')
  const [fundAmount, setFundAmount] = useState<string>('0.02')
  const [accountAddress, setAccountAddress] = useState<Address>()
  const [accountBalance, setAccountBalance] = useState<bigint>()
  const [txId, setTxId] = useState<string>()
  const intervalBalanceId = useRef<any>(null)
  const intervalFundingId = useRef<any>(null)

  const services = [
    {
      name: 'Coinbase Onramp',
      color: '#0051fc',
      logo: 'https://images.crunchbase.com/image/upload/c_pad,h_170,w_170,f_auto,b_white,q_auto:eco,dpr_1/bhusvwtttjcsxhaq0kil',
      link: cbLink,
      verifyUrl: `http://localhost:3000/api/coinbase-onramp/?partnerUserId=${txId}`,
      checkTxResult: async (verifyUrl: string) => {
        const response: any = await fetch(verifyUrl)
        if (!response.ok) return 'pending'

        const json = await response.json()
        if (!json.transactions) return 'pending'

        switch (json.transactions[0]?.status) {
          case 'ONRAMP_TRANSACTION_STATUS_SUCCESS':
            return 'completed'
          case 'ONRAMP_TRANSACTION_STATUS_FAILED':
            return 'failed'
          default:
            return 'pending'
        }
      },
    },
    {
      name: 'Moonpay',
      color: '#7d00fe',
      logo: 'https://images.crunchbase.com/image/upload/c_lpad,h_170,w_170,f_auto,b_white,q_auto:eco,dpr_1/jglje7ar0xc6j5lvai6t',
      link: moonpayLink,
      verifyUrl: `https://api.moonpay.com/v1/transactions/ext/${txId}?apiKey=${process.env.NEXT_PUBLIC_MOONPAY_API_KEY}`,
      checkTxResult: async (verifyUrl: string) => {
        const response: any = await fetch(verifyUrl)
        if (!response.ok) return 'pending'

        const json = await response.json()
        switch (json[0].status) {
          case 'completed':
            return 'completed'
          case 'failed':
            return 'failed'
          default:
            return 'pending'
        }
      },
    },
  ]

  useEffect(() => {
    const init = async () => {
      if (state !== EmbeddedState.READY) return

      const blockchain = 'ethereum'
      const accountAddress = await getEOAAddress()
      setAccountAddress(accountAddress as `0x${string}`)
      const txId = `openfort-${window.crypto.randomUUID()}`
      setTxId(txId)
      setCbLink(
        `https://pay.coinbase.com/buy/select-asset?partnerUserId=${txId}&appId=${process.env.NEXT_PUBLIC_COINBASE_PROJECTID}&addresses={"${accountAddress}":["${blockchain}"]}&presetCryptoAmount=${fundAmount}`
      )

      setMoonpayLink(
        `https://buy-sandbox.moonpay.com/?externalTransactionId=${txId}&apiKey=${process.env.NEXT_PUBLIC_MOONPAY_API_KEY}&walletAddress=${accountAddress}&currencyCode=ETH&quoteCurrencyAmount=${fundAmount}`
      )
    }
    init()
  }, [state, fundAmount, getEOAAddress])

  // In charge of checking the balance of the account when manual funding is selected
  useEffect(() => {
    ;(async () => {
      const provider = await getEvmProvider()
      if (!provider) {
        throw new Error('Failed to get EVM provider')
      }
      if (step === StepEnum.MANUAL) {
        const accountBalance = await getBalance(accountAddress as Address, polygonAmoy, provider)
        setAccountBalance(accountBalance)

        const intervalBalance = setInterval(async () => {
          const last = await getBalance(accountAddress as Address, polygonAmoy, provider)
          if (last !== accountBalance) {
            setStep(StepEnum.COMPLETED)
            clearInterval(intervalBalanceId.current)
          }
        }, 2000)

        intervalBalanceId.current = intervalBalance
      }
    })()
  }, [step, accountAddress, getBalance, getEvmProvider])

  // Triggers the external funding process
  const handleFund = async (service: any) => {
    setStep(StepEnum.SERVICE_PROGRESS)
    setService(service)
    window.open(service.link, '_blank')
    const intervalFund = setInterval(() => checkFunding(() => service.checkTxResult(service.verifyUrl)), 2000)
    intervalFundingId.current = intervalFund
  }

  const checkFunding = async (txResult: any) => {
    if ((await txResult()) === 'completed') {
      clearInterval(intervalFundingId.current)
      setStep(StepEnum.COMPLETED)
      handleSetMessage('Funds added successfully!')
    }
  }

  const handleDialogOpen = (open: boolean) => {
    if (!open) {
      setStep(0)
    }
  }

  return (
    <Dialog onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="w-full" disabled={step > 0} variant="outline">
          {step ? <Loading /> : 'Fund'}
        </Button>
      </DialogTrigger>

      {step === StepEnum.START && (
        <DialogContent>
          <DialogTitle>Add funds to your Openfort wallet</DialogTitle>

          <div className="flex place-items-baseline	justify-center">
            <input
              type="text"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              // @ts-expect-error
              style={{ '--funding-input-length': fundAmount.length }}
              className="w-[calc(1ch*var(--funding-input-length))] border-none p-0 text-4xl focus:border-none focus:ring-0 focus:outline-none text-right mr-2"
            />
            <div className="">ETH</div>
          </div>

          {services.map((service) => (
            <button
              key={service.name}
              type="button"
              style={{
                backgroundColor: service.color,
                backgroundImage: `url('${service.logo}')`,
              }}
              className={
                'w-full font-semibold border-none text-white py-4 rounded-lg bg-center bg-no-repeat bg-contain bg-right'
              }
              onClick={() => handleFund(service)}
            >
              {service.name}
            </button>
          ))}

          <button
            key="manual"
            type="button"
            style={{
              backgroundColor: '#000',
            }}
            className={'w-full font-semibold border-none text-white py-4 rounded-lg'}
            onClick={() => {
              setService(undefined)
              setStep(StepEnum.WAGMI_WALLET)
            }}
          >
            Transfer from wallet
          </button>
        </DialogContent>
      )}

      {step === StepEnum.SERVICE_PROGRESS && (
        <DialogContent>
          <DialogTitle>In Progress</DialogTitle>
          <div className="flex flex-col">
            <button
              key={service.name}
              type="button"
              style={{
                backgroundColor: service.color,
                backgroundImage: `url('${service.logo}')`,
              }}
              className={'w-16 h-16 border-none py-4 rounded-lg bg-center bg-no-repeat bg-contain bg-right m-auto'}
            ></button>
            <p className="m-auto mt-4">Go back to {service.name} to finish funding your account.</p>
          </div>
        </DialogContent>
      )}

      {step === StepEnum.WAGMI_WALLET && (
        <DialogContent>
          <DialogTitle>Transfer from wallet</DialogTitle>
          <DialogDescription>
            Connect a wallet to deposit funds or send funds manually to your wallet address.
          </DialogDescription>
          <div className="flex flex-col">
            <AddFundsWithWagmi
              fundAddress={accountAddress as Address}
              fundAmount={fundAmount}
              callback={() => {
                setStep(StepEnum.COMPLETED)
                handleSetMessage('Funds added successfully!')
              }}
            />

            <button
              type="button"
              onClick={() => {
                setService(undefined)
                setStep(StepEnum.MANUAL)
              }}
              className="m-auto mt-4 text-blue-600 hover:underline"
            >
              Send funds manually{' '}
            </button>
          </div>
        </DialogContent>
      )}

      {step === StepEnum.COMPLETED && (
        <DialogContent>
          <DialogTitle>Completed</DialogTitle>
          <div className="flex flex-col">
            {service && (
              <>
                <button
                  key={service.name}
                  type="button"
                  style={{
                    backgroundColor: service.color,
                    backgroundImage: `url('${service.logo}')`,
                  }}
                  className={'w-16 h-16 border-none py-4 rounded-lg bg-center bg-no-repeat bg-contain bg-right m-auto'}
                ></button>
                <p className="m-auto mt-4">Account was successfully funded using {service.name}!</p>
              </>
            )}

            {!service && <p className="m-auto mt-4">Account was successfully funded!</p>}
          </div>
        </DialogContent>
      )}

      {step === StepEnum.MANUAL && (
        <DialogContent>
          <DialogTitle>Send funds</DialogTitle>
          <DialogDescription>Send funds directly to your wallet by copying your wallet address.</DialogDescription>

          <div className="rounded p-2 bg-red-100">
            <p className="">
              Make sure to send on <span className="font-bold">Polygon Amoy</span>
            </p>
          </div>

          <div className="border rounded p-2">
            <p className="font-bold">Wallet address</p>
            <div className="flex justify-between">
              <p className="text-sm">
                {`${accountAddress?.substring(0, 5)}...${accountAddress?.substring(accountAddress.length - 4)}`}
                <button
                  type="button"
                  className="ml-2 text-blue-500"
                  onClick={() => navigator.clipboard.writeText(accountAddress as string)}
                >
                  Copy
                </button>
              </p>
              {(accountBalance as bigint) > 0 && <p className="text-sm">{formatEther(accountBalance as bigint)} ETH</p>}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}

export default AddFunds
