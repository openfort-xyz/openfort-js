import {Bytes} from "@ethersproject/bytes";

export enum SignerType {
    EMBEDDED = "embedded",
    SESSION = "session",
}

export interface ISigner {
    sign(message: Bytes | string, requireArrayify?: boolean, requireHash?: boolean): Promise<string>;
    logout(): Promise<void>;
    useCredentials(): boolean;
    updateAuthentication(): Promise<void>;
    getSingerType(): SignerType;
}
