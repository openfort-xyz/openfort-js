/* eslint-disable no-var */
/* eslint-disable vars-on-top */

declare global {
  var openfortListener: ((fn: ((event: MessageEvent<any>) => void)) => void) | undefined;
  var openfortPostMessage: ((message: MessageEvent<any>) => void) | undefined;
  var JWK_UTILS: any;
}

export { };
