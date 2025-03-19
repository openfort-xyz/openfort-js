/* eslint-disable no-var */
/* eslint-disable vars-on-top */

declare global {
  var openfortListener: ((fn: ((event: MessageEvent<any>) => void)) => void) | undefined;
  var openfortPostMessage: ((message: MessageEvent<any>) => void) | undefined;
  var JWK_UTILS: {
    getKey: (key: any) => any;
    parse: (sJWS: string) => any;
    verifyJWT: (sJWT: string, key: string | any, acceptField?: {
      alg?: string[] | undefined;
      aud?: string[] | undefined;
      iss?: string[] | undefined;
      jti?: string | undefined;
      sub?: string[] | undefined;
      verifyAt?: string | number | undefined;
      gracePeriod?: number | undefined;
    }) => boolean,
    getNow: () => number;
  };
}

export { };
