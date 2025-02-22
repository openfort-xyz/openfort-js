import type { NextApiRequest, NextApiResponse } from 'next';
import openfort from '../../utils/openfortAdminConfig';
import cors, { runMiddleware } from '@/utils/cors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await runMiddleware(req, res, cors);
    const session = await openfort.registerRecoverySession(process.env.NEXT_PUBLIC_SHIELD_API_KEY!, process.env.NEXTAUTH_SHIELD_SECRET_KEY!, process.env.NEXTAUTH_SHIELD_ENCRYPTION_SHARE!)
    res.status(200).send({
      session: session,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send({
      error: 'Internal server error',
    });
  }
}
