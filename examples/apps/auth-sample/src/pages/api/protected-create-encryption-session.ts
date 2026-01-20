import type { NextApiRequest, NextApiResponse } from 'next'
import cors, { runMiddleware } from '@/utils/cors'
import { shieldUrl } from '@/utils/openfortConfig'
import openfort from '../../utils/openfortAdminConfig'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await runMiddleware(req, res, cors)
    const shieldProjectResponse = await fetch(`${shieldUrl}/project`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
        'x-api-secret': process.env.NEXTAUTH_SHIELD_SECRET_KEY!,
      },
    })

    if (!shieldProjectResponse.ok) {
      throw new Error('Failed to fetch Shield project details')
    }

    const shieldProjectData = await shieldProjectResponse.json()
    console.log('shieldProjectData', shieldProjectData)

    if (shieldProjectData.enabled_2fa) {
      console.log('2FA is enabled for the project')

      // check if user has no accounts with automatic recover
      const accounts = await openfort.accounts.list({ user: req.body.user_id })

      if (accounts.data.every((account) => account.recoveryMethod !== 'project')) {
        console.log("Requesting OTP since user doesn't have automatic recovery method")
        const res = await fetch(`${shieldUrl}/project/otp`, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
            'x-api-secret': process.env.NEXTAUTH_SHIELD_SECRET_KEY!,
          },
          method: 'POST',
          body: JSON.stringify({
            user_id: req.body.user_id,
            dangerously_skip_verification: true,
          }),
        })
        console.log('OTP response: ', res)
      }
    }

    const response = await fetch(`${shieldUrl}/project/encryption-session`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
        'x-api-secret': process.env.NEXTAUTH_SHIELD_SECRET_KEY!,
      },
      method: 'POST',
      body: JSON.stringify({
        encryption_part: process.env.NEXTAUTH_SHIELD_ENCRYPTION_SHARE!,
        user_id: req.body.user_id,
        otp_code: req.body.otp_code,
      }),
    })

    const jsonResponse = await response.json()

    // console.log('encryption session response', response, jsonResponse)

    // 428 or 400 may be thrown if there is no OTP found for user,
    // that's why we throw 428 to client understand that he needs to request an OTP
    if (response.status === 428 || response.status === 400) {
      console.log(response, jsonResponse)
      res.status(428).send({ error: 'OTP_REQUIRED' })
    } else {
      if (!response.ok) {
        throw new Error('Failed to authorize user')
      }

      res.status(200).send({
        session: jsonResponse.session_id,
      })
    }
  } catch (e) {
    console.error(`Internal Next.js API server error: ${e}`)
    res.status(500).send({
      error: 'Internal server error',
    })
  }
}
