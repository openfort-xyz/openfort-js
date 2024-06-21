import type { NextApiRequest, NextApiResponse } from 'next';
import openfort from '../../utils/openfortAdminConfig';

const policy_id = 'pol_e7491b89-528e-40bb-b3c2-9d40afa4fefc';
const chainId = 80002;

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

    const { sessionAddress } = req.body;
    if (!sessionAddress) {
      return res.status(400).send({
        error: 'Session duration and sessionAddress are required',
      });
    }

    const playerId = response.playerId;

    const sessionRevoke = await openfort.sessions.revoke({
      player: playerId,
      policy: policy_id,
      chainId,
      address: sessionAddress,
    });

    res.send({
      data: sessionRevoke,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send({
      error: 'Internal server error',
    });
  }
}
