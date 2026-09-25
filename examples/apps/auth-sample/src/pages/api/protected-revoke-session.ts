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

    const { sessionAddress } = req.body
    if (!sessionAddress) {
      return res.status(400).send({
        error: 'Session duration and sessionAddress are required',
      })
    }

    const sessionRevoke = await openfort.sessions.revoke({
      account: account_id,
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
