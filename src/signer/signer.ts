import {Bytes} from "@ethersproject/bytes";

export enum SignerType {
    EMBEDDED = "embedded",
    SESSION = "session",
    NONE = "none",
}

export interface ISigner {
    sign(message: Bytes | string): Promise<string>;
    logout(): Promise<void>;
    useCredentials(): boolean;
    updateAuthentication(): Promise<void>;
    getSingerType(): SignerType;
}
