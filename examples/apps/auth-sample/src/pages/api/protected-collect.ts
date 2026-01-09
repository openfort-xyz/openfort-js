import type { NextApiRequest, NextApiResponse } from 'next'
import cors, { runMiddleware } from '../../utils/cors'
import openfort from '../../utils/openfortAdminConfig'

const contract_id = process.env.NEXT_PUBLIC_CONTRACT_ID
const optimistic = true
const policy_id = process.env.NEXT_PUBLIC_POLICY_ID
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors)

  const accessToken = req.headers.authorization?.split(' ')[1]
  if (!accessToken) {
    return res.status(401).send({
      error: 'You must be signed in to view the protected content on this page.',
    })
  }

  try {
    const response = await openfort.iam.getSession({ token: accessToken })

    if (!response?.playerId) {
      return res.status(401).send({
        error: 'Invalid token or unable to verify user.',
      })
    }

    const playerId = response.playerId
    const interaction_mint = {
      contract: contract_id,
      functionName: 'mint',
      functionArgs: [playerId, 1],
    }

    const transactionIntent = await openfort.transactionIntents.create({
      player: playerId,
      policy: policy_id,
      chainId,
      optimistic,
      interactions: [interaction_mint],
    })

    res.send({
      transactionIntentId: transactionIntent.id,
      userOperationHash: transactionIntent.nextAction?.payload.userOperationHash,
    })
  } catch (e) {
    console.log(e)
    res.status(500).send({
      error: 'Internal server error',
    })
  }
}
