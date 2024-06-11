import { SiweMessage } from "siwe";
import { sepolia } from "wagmi/chains";

export const createSIWEMessage = (address: string, nonce: string) =>
  new SiweMessage({
    domain: window.location.host,
    address,
    statement:
      "By signing, you are proving you own this wallet and logging in. This does not initiate a transaction or cost any fees.",
    uri: window.location.origin,
    version: "1",
    chainId: sepolia.id,
    nonce,
  }).prepareMessage();
