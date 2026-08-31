import type { NextApiRequest, NextApiResponse } from 'next'
import cors, { runMiddleware } from '../../utils/cors'
import openfort from '../../utils/openfortAdminConfig'

const contract_id = process.env.NEXT_PUBLIC_CONTRACT_ID
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

    const transaction = await openfort.transactions.create({
      account: account_id,
      chainId: chainId,
      feeSponsorship: policy_id,
      calls: [interaction_mint],
    })

    res.send({
      transactionId: transaction.id,
      hash: transaction.nextAction?.hash,
    })
  } catch (e) {
    console.log(e)
    res.status(500).send({
      error: 'Internal server error',
    })
  }
}
