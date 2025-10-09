import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { type Connector, useChainId, useConnect } from 'wagmi'

export function ConnectorsList() {
  const chainId = useChainId()
  const { connectors, connect, error } = useConnect()
  const navigate = useNavigate()
  const [activeConnector, setActiveConnector] = React.useState<Connector | null>(null)

  React.useEffect(() => {
    if (
      error &&
      activeConnector?.name === 'Openfort' &&
      error.message === 'Unauthorized - must be authenticated and configured with a signer.'
    ) {
      navigate('/authentication')
    }
  }, [error, activeConnector, navigate])

  const handleConnect = (connector: Connector) => {
    setActiveConnector(connector)
    connect({ connector, chainId })
  }

  return (
    <div>
      <div className="buttons">
        {connectors
          .filter((connector) => !connector.name.includes('Injected'))
          .map((connector) => (
            <ConnectorButton key={connector.uid} connector={connector} onClick={() => handleConnect(connector)} />
          ))}
      </div>
      {error && <div className="error">Error: {error.message}</div>}
    </div>
  )
}

function ConnectorButton({ connector, onClick }: { connector: Connector; onClick: () => void }) {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    ;(async () => {
      const provider = await connector.getProvider()
      setReady(!!provider)
    })()
  }, [connector])

  return (
    <button className="button" disabled={!ready} onClick={onClick} type="button">
      {connector.name}
    </button>
  )
}
