import Cors from 'cors'
import type { NextApiRequest, NextApiResponse } from 'next'

const allowedOrigins = [
  'https://create-next-app.openfort.io',
  ...(process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? []),
].filter(Boolean)

const isAllowedOrigin = (origin: string) =>
  allowedOrigins.includes(origin) ||
  /^https:\/\/[a-z0-9-]+\.openfort\.io$/.test(origin) ||
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

const cors = Cors({
  methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
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
