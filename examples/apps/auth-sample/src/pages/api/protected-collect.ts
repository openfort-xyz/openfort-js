import type { NextApiRequest, NextApiResponse } from 'next';
import openfort from '../../utils/openfortAdminConfig';

const policy_id = 'pol_1fc278fe-82cc-43c2-aec8-f6a4bdc71169';
const contract_id = 'con_873c8285-42b8-4d75-94e1-a7d597493a97';
const chainId = 80002;
const optimistic = true;

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
    const response = await openfort.iam.verifyOAuthToken({
      provider: 'firebase',
      token: accessToken,
      tokenType: 'idToken',
    });

    if (!response?.id) {
      return res.status(401).send({
        error: 'Invalid token or unable to verify user.',
      });
    }

    const playerId = response.id;
    const interaction_mint = {
      contract: contract_id,
      functionName: 'mint',
      functionArgs: [playerId],
    };

    const transactionIntent = await openfort.transactionIntents.create({
      player: playerId,
      policy: policy_id,
      chainId,
      optimistic,
      interactions: [interaction_mint],
    });

    res.send({
      data: transactionIntent,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send({
      error: 'Internal server error',
    });
  }
}
