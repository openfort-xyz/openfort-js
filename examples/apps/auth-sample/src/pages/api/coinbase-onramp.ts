import type { NextApiRequest, NextApiResponse } from 'next'
import { createRequest, fetchOnrampRequest } from './coinbase-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const partnerUserId = req.query.partnerUserId

  // Validate that partnerUserId is a non-empty string of allowed characters (alphanumerics, hyphens, underscores)
  if (typeof partnerUserId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(partnerUserId)) {
    res.status(400).json({ error: 'Invalid partnerUserId' })
    return
  }

  const request_method = 'GET'
  const { url, jwt } = await createRequest({
    request_method,
    request_path: `/onramp/v1/buy/user/${partnerUserId}/transactions`,
  })

  try {
    const txs = await fetchOnrampRequest({
      request_method,
      url,
      jwt,
      res,
    })
    res.status(200).json(txs)
  } catch (e) {
    return console.error(e)
  }
}
