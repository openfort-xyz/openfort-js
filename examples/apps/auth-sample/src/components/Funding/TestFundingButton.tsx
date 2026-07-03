import type React from 'react'
import { useState } from 'react'
import { getErrorMessage } from '../../utils/errorHandler'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'

/**
 * Throwaway test aid: exercises the `client.funding.*` delegation (issue #316)
 * through the full SDK — init, storage, BackendApiClients, generated fundingApi —
 * against the live `/v2/funding/chains` endpoint. Not part of the sample UX;
 * remove before committing.
 */
const TestFundingButton: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const [loading, setLoading] = useState(false)

  const handleTestFunding = async () => {
    try {
      setLoading(true)
      const chains = await openfort.funding.chains()
      const summary = {
        chainCount: chains.length,
        sample: chains.slice(0, 3).map((c) => ({ id: c.id, name: c.name, currencies: c.currencies.length })),
      }
      handleSetMessage(JSON.stringify(summary, null, 2))
    } catch (error) {
      console.error('funding.chains() failed:', error)
      alert(`funding.chains() failed: ${getErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button className="w-full" disabled={loading} onClick={handleTestFunding} variant="outline">
        {loading ? <Loading /> : 'Test funding.chains()'}
      </Button>
    </div>
  )
}

export default TestFundingButton
