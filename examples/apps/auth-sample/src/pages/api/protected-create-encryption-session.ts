import type { NextApiRequest, NextApiResponse } from 'next';
import cors, { runMiddleware } from '@/utils/cors';
import { shieldUrl } from '@/utils/openfortConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await runMiddleware(req, res, cors);
    const response = await fetch(`${shieldUrl}/project/encryption-session`, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
        "x-api-secret": process.env.NEXTAUTH_SHIELD_SECRET_KEY!,
      },
      method: "POST",
      body: JSON.stringify({
        encryption_part: process.env.NEXTAUTH_SHIELD_ENCRYPTION_SHARE!,
        user_id: req.body.user_id,
        otp_code: req.body.otp_code,
      }),
    });

    // 404 may be thrown if there is no OTP found for user,
    // that's why we throw 428 to client understand that he needs to request an OTP
    if (response.status === 404) {
      res.status(428).send({error: "OTP_REQUIRED"});
    } else {
      if (!response.ok) {
        throw new Error("Failed to authorize user");
      }

      const jsonResponse = await response.json();

      res.status(200).send({
        session: jsonResponse.session_id,
      });
    }
  } catch (e) {
    console.error(`Internal Next.js API server error: ${e}`);
    res.status(500).send({
      error: 'Internal server error',
    });
  }
}
