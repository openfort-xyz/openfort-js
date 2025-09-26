import type { NextApiRequest, NextApiResponse } from 'next';
import cors, { runMiddleware } from '@/utils/cors';
import { shieldUrl } from '@/utils/openfortConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await runMiddleware(req, res, cors);
    const response = await fetch(`${shieldUrl}/project/otp`, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
        "x-api-secret": process.env.NEXTAUTH_SHIELD_SECRET_KEY!,
      },
      method: "POST",
      body: JSON.stringify({
        user_id: req.body.user_id,
        dangerously_skip_verification: req.body.dangerously_skip_verification || false,
        email: req.body.email || null,
        phone: req.body.phone || null,
      }),
    });

    if (response.status === 429) {
      res.status(429).send({error: "OTP_RATE_LIMIT"});
    } else if (!response.ok) {
      const errorData = await response.json();
      if (errorData.code === "USER_CONTACTS_MISMATCH") {
        res.status(400).send({error: "USER_CONTACTS_MISMATCH"});
      } else {
        throw new Error("Failed to authorize user");
      }
    } else {
      res.status(200).send({ success: true });
    }
  } catch (e) {
    console.error(e);
    res.status(500).send({
      error: 'Internal server error',
    });
  }
}
