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
  const { account_id } = req.body
  if (!accessToken || !account_id) {
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

    const interaction_mint = {
      contract: contract_id,
      functionName: 'mint',
      functionArgs: [account_id, 1],
    }

    const transactionIntent = await openfort.transactionIntents.create({
      account: account_id,
      chainId: chainId,
      policy: policy_id,
      optimistic,
      interactions: [interaction_mint],
    })

    res.send({
      transactionIntentId: transactionIntent.id,
      userOperationHash: transactionIntent.nextAction?.payload.signableHash,
    })
  } catch (e) {
    console.log(e)
    res.status(500).send({
      error: 'Internal server error',
    })
  }
}
