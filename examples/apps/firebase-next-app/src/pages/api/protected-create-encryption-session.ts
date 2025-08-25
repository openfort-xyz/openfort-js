import type { NextApiRequest, NextApiResponse } from 'next';
import { shieldUrl } from '../../utils/openfortConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await fetch(`${shieldUrl}/project/encryption-session`, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
        "x-api-secret": process.env.NEXTAUTH_SHIELD_SECRET_KEY!,
      },
      method: "POST",
      body: JSON.stringify({
        encryption_part: process.env.NEXTAUTH_SHIELD_ENCRYPTION_SHARE!,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to authorize user");
    }

    const jsonResponse = await response.json();
    res.status(200).send({
      session: jsonResponse.session_id,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send({
      error: 'Internal server error',
    });
  }
}
