import type { NextApiRequest, NextApiResponse } from 'next'
import cors, { runMiddleware } from '../../utils/cors'
import openfort from '../../utils/openfortAdminConfig'
import { getSessionUserId } from '../../utils/sessionUser'

const contract_id = process.env.NEXT_PUBLIC_CONTRACT_ID
const policy_id = process.env.NEXT_PUBLIC_POLICY_ID
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors)

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

    const interaction_mint = {
      contractId: contract_id,
      functionName: 'mint',
      functionArgs: [account_id, 1],
    }

    const transaction = await openfort.transactions.create({
      accountId: account_id,
      chainId: chainId,
      feeSponsorshipId: policy_id,
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
