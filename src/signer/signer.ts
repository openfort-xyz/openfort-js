import {Bytes} from "@ethersproject/bytes";

export enum SignerType {
    EMBEDDED = "embedded",
    SESSION = "session",
}

export interface ISigner {
    sign(message: Bytes | string): Promise<string>;
    logout(): Promise<void>;
    useCredentials(): boolean;
    updateAuthentication(): void;
    getSingerType(): SignerType;
}
