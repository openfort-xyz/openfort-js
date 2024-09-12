import type { NextApiRequest, NextApiResponse } from 'next';
import openfort from '../../utils/openfortAdminConfig';

const policy_id = process.env.NEXT_PUBLIC_SHIELD_API_KEY;
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).send({
      error: 'You must be signed in to view the protected content on this page.',
    });
  }

  try {
    const response = await openfort.iam.verifyAuthToken(
      accessToken,
    );

    if (!response?.playerId) {
      return res.status(401).send({
        error: 'Invalid token or unable to verify user.',
      });
    }

    const { sessionDuration, sessionAddress } = req.body;
    if (!sessionDuration || !sessionAddress) {
      return res.status(400).send({
        error: 'Session duration and sessionAddress are required',
      });
    }
    const sessionDurationNumber: { [key: string]: number } = {
      '1hour': 3600000,
      '1day': 86400000,
      '1month': 2592000000,
    }
    if (!sessionDurationNumber[sessionDuration]) {
      return res.status(400).send({
        error: 'Invalid session duration',
      });
    }


    // The unix timestamp in seconds when the session key becomes valid in number format.
    const validAfter = Math.floor(new Date().getTime() / 1000)
    // The unix timestamp in seconds when the session key becomes invalid in number format (where session duration is 1hour, 1day, 1month).
    const validUntil = Math.floor(new Date(Date.now() + sessionDurationNumber[sessionDuration]).getTime() / 1000)

    const playerId = response.playerId;

    const sessionRegistration = await openfort.sessions.create({
      player: playerId,
      policy: policy_id,
      chainId,
      address: sessionAddress,
      validAfter: Number(validAfter),
      validUntil: Number(validUntil),
    });

    res.send({
      data: sessionRegistration,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send({
      error: 'Internal server error',
    });
  }
}
