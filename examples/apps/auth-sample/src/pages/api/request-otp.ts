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
        email: req.body.email || null,
        phone: req.body.phone || null,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to authorize user");
    }

    res.status(200).send({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).send({
      error: 'Internal server error',
    });
  }
}
