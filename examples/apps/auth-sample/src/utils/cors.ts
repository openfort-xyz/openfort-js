import Cors from 'cors'
import type { NextApiRequest, NextApiResponse } from 'next'

const cors = Cors({
  methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
  origin: '*',
  credentials: true,
})

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: (req: NextApiRequest, res: NextApiResponse, callback: (result: unknown) => void) => void
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: unknown) => {
      if (result instanceof Error) {
        return reject(result)
      }
      return resolve(result)
    })
  })
}

export default cors
export { runMiddleware }
