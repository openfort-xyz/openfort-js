import type { NextApiRequest, NextApiResponse } from 'next'
import openfort from '../../utils/openfortAdminConfig'

const policy_id = process.env.NEXT_PUBLIC_POLICY_ID
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = req.headers.authorization?.split(' ')[1]
  if (!accessToken) {
    return res.status(401).send({
      error: 'You must be signed in to view the protected content on this page.',
    })
  }

  try {
    const response = await openfort.iam.getSession({ accessToken })

    if (!response?.user.id) {
      return res.status(401).send({
        error: 'Invalid token or unable to verify user.',
      })
    }

    const { sessionAddress } = req.body
    if (!sessionAddress) {
      return res.status(400).send({
        error: 'Session duration and sessionAddress are required',
      })
    }

    const userId = response?.user.id

    const sessionRevoke = await openfort.sessions.revoke({
      player: userId,
      policy: policy_id,
      chainId,
      address: sessionAddress,
    })

    res.send({
      data: sessionRevoke,
    })
  } catch (e) {
    console.error(e)
    res.status(500).send({
      error: 'Internal server error',
    })
  }
}
