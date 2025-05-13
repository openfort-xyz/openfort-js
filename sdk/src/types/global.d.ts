/* eslint-disable no-var */
/* eslint-disable vars-on-top */

declare global {
  var openfort: {
    iframeListener: ((fn: ((event: MessageEvent<any>) => void)) => void);
    iframePostMessage: ((message: MessageEvent<any>) => void);
    jwk: {
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
  } | undefined;
}

export { };
