import {Bytes} from "@ethersproject/bytes";

export interface Signer {
    sign(message: Bytes | string): Promise<string>;
}