import React, {useCallback, useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';
import openfort from '../../utils/openfortConfig';
import {ethers} from 'ethers';
import MintNFTSessionButton from './MintNFTButtoSession';

const sessionMethods = [
  {id: '1hour', title: '1 Hour'},
  {id: '1day', title: '1 Day'},
  {id: '1month', title: '1 Month'},
];

const CreateSessionButton: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const {state, signMessage} = useOpenfort();
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  const createSession = useCallback(async (): Promise<{
    address: string;
    privateKey: string;
  } | null> => {
    const sessionKey = ethers.Wallet.createRandom();
    const sessionResponse = await fetch(`/api/protected-create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openfort.getAccessToken()}`,
      },
      body: JSON.stringify({
        sessionDuration: document.querySelector(
          'input[name="session-method"]:checked'
        )?.id,
        sessionAddress: sessionKey.address,
      }),
    });

    if (!sessionResponse.ok) {
      alert('Failed to create session: ' + sessionResponse.status);
      return null;
    }
    const sessionResponseJSON = await sessionResponse.json();

    if (sessionResponseJSON.data?.nextAction) {
      const signature = await signMessage(
        sessionResponseJSON.data?.nextAction.payload.userOperationHash,
        {
          hashMessage: true,
          arrayifyMessage: true,
        }
      );
      if (signature?.error) {
        throw new Error(`Failed to sign message. ${signature?.error}`);
      }
      const response = await openfort.sendSignatureSessionRequest(
        sessionResponseJSON.data.id,
        signature.data as string
      );
      if (!response?.isActive) {
        throw new Error('Session key registration failed');
      }
      setSessionKey(sessionKey.privateKey);
      return {address: sessionKey.address, privateKey: sessionKey.privateKey};
    } else {
      return null;
    }
  }, []);

  const revokeSession = useCallback(async (): Promise<string | null> => {
    if (!sessionKey) {
      return null;
    }
    const sessionSigner = new ethers.Wallet(sessionKey);

    const revokeResponse = await fetch(`/api/protected-revoke-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openfort.getAccessToken()}`,
      },
      body: JSON.stringify({
        sessionAddress: sessionSigner.address,
      }),
    });

    if (!revokeResponse.ok) {
      alert('Failed to revoke session: ' + revokeResponse.status);
      return null;
    }
    const revokeResponseJSON = await revokeResponse.json();

    if (revokeResponseJSON.data?.nextAction) {
      const signature = await signMessage(
        revokeResponseJSON.data?.nextAction.payload.userOperationHash,
        {
          hashMessage: true,
          arrayifyMessage: true,
        }
      );
      if (signature?.error) {
        throw new Error(`Failed to sign message. ${signature?.error}`);
      }
      const response = await openfort.sendSignatureSessionRequest(
        revokeResponseJSON.data.id,
        signature.data as string
      );
      return response?.id ?? null;
    } else {
      return revokeResponseJSON.response?.transactionHash;
    }
  }, [sessionKey]);

  const handleCreateSession = async () => {
    setLoading(true);
    const session = await createSession();
    setLoading(false);
    if (session) {
      handleSetMessage(
        `Session key registered successfully:\n   Address: ${session.address}\n   Private Key: ${session.privateKey}`
      );
    }
  };

  const handleRevokeSession = async () => {
    setLoading(true);
    const session = await revokeSession();
    setLoading(false);
    if (session) {
      setSessionKey(null);
      handleSetMessage(`Session key revoked successfully`);
    }
  };

  return (
    <div>
      <div>
        <fieldset>
          <legend className="font-medium leading-6 text-black">
            Session duration
          </legend>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            How long should the session last?
          </p>
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
        <button
          onClick={
            sessionKey !== null ? handleRevokeSession : handleCreateSession
          }
          disabled={state !== EmbeddedState.READY}
          className={`mt-4 w-44 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
        >
          {loading ? (
            <Loading />
          ) : sessionKey !== null ? (
            'Revoke session'
          ) : (
            'Create session'
          )}
        </button>
      </div>
      <MintNFTSessionButton
        handleSetMessage={handleSetMessage}
        sessionKey={sessionKey}
      />
    </div>
  );
};

export default CreateSessionButton;
