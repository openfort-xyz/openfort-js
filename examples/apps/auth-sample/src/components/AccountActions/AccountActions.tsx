import { useState } from 'react'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import BackendMintButton from './BackendMintButton'
import EIP1193MintButton from './EIP1193MintButton'
import EIP1193CreateSessionButton from '../SessionKey/EIP1193CreateSessionButton'
import BackendCreateSessionButton from '../SessionKey/BackendCreateSessionButton'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'

const sessionMethods = [
    {id: '1hour', title: '1 Hour'},
    {id: '1day', title: '1 Day'},
    {id: '1month', title: '1 Month'},
  ];

export default function AccountActions({ handleSetMessage }: { handleSetMessage: (message: string) => void }) {
  const [isProviderEnabled, setIsProviderEnabled] = useState(true)
  const [sessionKey, setSessionKey] = useState<`0x${string}` | null>(null);

  return (
    <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
      <h2 className="font-medium text-xl pb-4">
        Account actions
      </h2>
      
      <div className="flex items-center space-x-2 mb-4">
        <Switch 
          id="provider-switch"
          checked={isProviderEnabled}
          onCheckedChange={setIsProviderEnabled}
        />
        <Label htmlFor="provider-switch">EIP-1193 Provider</Label>
      </div>

      {isProviderEnabled ? (
        <div>
             <EIP1193MintButton handleSetMessage={handleSetMessage} />
        </div>
      ) : (
        <div className='space-y-2'>
            <Alert className='bg-blue-50'>
                <AlertTitle>Backend Action!</AlertTitle>
                <AlertDescription>
                    This mode creates an API call to your backend to mint the NFT.
                </AlertDescription>
            </Alert>
            <BackendMintButton handleSetMessage={handleSetMessage} />
        </div>
      )}
        <fieldset>
            <legend className="font-medium leading-6 text-black">
            Session key duration
            </legend>
            <div className="mt-3 space-y-1">
                {sessionMethods.map((sessionMethod) => (
                    <div key={sessionMethod.id} className="flex items-center">
                        <input
                            disabled={sessionKey !== null}
                            id={sessionMethod.id}
                            name="session-method"
                            type="radio"
                            defaultChecked={sessionMethod.id === '1day'}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                        />
                        <label
                            htmlFor={sessionMethod.id}
                            className="ml-3 block text-sm font-medium leading-6 text-gray-900"
                        >
                            {sessionMethod.title}
                        </label>
                    </div>
                ))}
            </div>
        </fieldset>
        {isProviderEnabled ? (
        <div>
            <EIP1193CreateSessionButton handleSetMessage={handleSetMessage} setSessionKey={setSessionKey} sessionKey={sessionKey}/>
        </div>
      ) : (
        <div className='space-y-2'>
            <BackendCreateSessionButton handleSetMessage={handleSetMessage} setSessionKey={setSessionKey} sessionKey={sessionKey}/>
        </div>
      )}
    </div>
  )
}