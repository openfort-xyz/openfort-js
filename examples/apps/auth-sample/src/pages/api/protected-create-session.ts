import type { NextApiRequest, NextApiResponse } from 'next'
import openfort from '../../utils/openfortAdminConfig'
import { getSessionUserId } from '../../utils/sessionUser'

const policy_id = process.env.NEXT_PUBLIC_POLICY_ID
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { account_id } = req.body
  if (!account_id) {
    return res.status(401).send({
      error: 'You must be signed in to view the protected content on this page.',
    })
  }

  try {
    if (!(await getSessionUserId(req))) {
      return res.status(401).send({
        error: 'You must be signed in to view the protected content on this page.',
      })
    }

    const { sessionDuration, sessionAddress } = req.body
    if (!sessionDuration || !sessionAddress) {
      return res.status(400).send({
        error: 'Session duration and sessionAddress are required',
      })
    }
    const sessionDurationNumber: { [key: string]: number } = {
      '1hour': 3600000,
      '1day': 86400000,
      '1month': 2592000000,
    }
    if (!sessionDurationNumber[sessionDuration]) {
      return res.status(400).send({
        error: 'Invalid session duration',
      })
    }

    // The unix timestamp in seconds when the session key becomes valid in number format.
    const validAfter = Math.floor(Date.now() / 1000)
    // The unix timestamp in seconds when the session key becomes invalid in number format (where session duration is 1hour, 1day, 1month).
    const validUntil = Math.floor(new Date(Date.now() + sessionDurationNumber[sessionDuration]).getTime() / 1000)

    const sessionRegistration = await openfort.sessions.create({
      account: account_id,
      policy: policy_id,
      chainId,
      address: sessionAddress,
      validAfter: Number(validAfter),
      validUntil: Number(validUntil),
    })

    res.send({
      data: sessionRegistration,
    })
  } catch (e) {
    console.error(e)
    res.status(500).send({
      error: 'Internal server error',
    })
  }
}
