import { SignOptions, sign } from "jsonwebtoken";
import crypto from "crypto";
import { NextApiResponse } from "next";

export type createRequestParams = {
  request_method: "GET" | "POST";
  request_path: string;
};

export async function fetchApiCredentials() {
  const key = await import('../../../cdp_api_key.json');
  const key_name = key.name;
  const key_secret = key.privateKey;

  return { key_name, key_secret };
}

export async function createRequest({
  request_method,
  request_path,
}: createRequestParams) {
  const { key_name, key_secret } = await fetchApiCredentials();
  const host = "api.developer.coinbase.com";

  const url = `https://${host}${request_path}`;
  const uri = `${request_method} ${host}${request_path}`;

  const payload = {
    iss: "coinbase-cloud",
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    sub: key_name,
    uri,
  };

  const signOptions: SignOptions = {
    algorithm: "ES256",
    header: {
      kid: key_name,
      // @ts-ignore
      nonce: crypto.randomBytes(16).toString("hex"), // non-standard, coinbase-specific header that is necessary
    },
  };

  const jwt = sign(payload, key_secret, signOptions);

  return { url, jwt };
}

type fetchOnrampRequestParams = {
  request_method: "GET" | "POST";
  url: string;
  jwt: string;
  body?: string;
  res: NextApiResponse;
};

export async function fetchOnrampRequest({
  request_method,
  url,
  jwt,
  body,
  res,
}: fetchOnrampRequestParams) {
  try {
    const ret = await fetch(url, {
      method: request_method,
      body: body,
      headers: { Authorization: "Bearer " + jwt },
    });
    return ret.json();
  } catch (error) {
    throw error;
  }
}
