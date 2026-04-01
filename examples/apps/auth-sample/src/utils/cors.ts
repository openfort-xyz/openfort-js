import Cors from 'cors'
import type { NextApiRequest, NextApiResponse } from 'next'

const allowedOrigins = [
  'https://create-next-app.openfort.io',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  ...(process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? []),
].filter(Boolean)

const cors = Cors({
  methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
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
