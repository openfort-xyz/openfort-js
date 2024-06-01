import type { NextApiRequest, NextApiResponse } from 'next';
import openfort from '../../utils/openfortAdminConfig';

const policy_id = 'pol_e7491b89-528e-40bb-b3c2-9d40afa4fefc';
const contract_id = 'con_8d6b19e8-3a5a-4643-8dee-778997a7dffc';
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
    const response = await openfort.iam.verifyAuthToken(
      accessToken,
    );

    if (!response?.playerId) {
      return res.status(401).send({
        error: 'Invalid token or unable to verify user.',
      });
    }

    const playerId = response.playerId;
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
