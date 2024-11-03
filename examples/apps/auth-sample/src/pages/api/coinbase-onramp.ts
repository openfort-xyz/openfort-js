import { NextApiRequest, NextApiResponse } from "next";
import { createRequest, fetchOnrampRequest } from "./coinbase-helpers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
    const partnerUserId = req.query.partnerUserId;

    const request_method = 'GET';
    const {url, jwt} = await createRequest({
      request_method,
      request_path: '/onramp/v1/buy/user/' + partnerUserId + '/transactions',
    });

    try{
      const txs = await fetchOnrampRequest({
        request_method,
        url,
        jwt,
        res,
      });
      res.status(200).json(txs);
    }catch(e){
      return console.error(e);
    }
};