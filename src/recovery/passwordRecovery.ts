import {IRecovery} from "./recovery";

export class PasswordRecovery implements IRecovery {
    private readonly recoveryPassword: string;
    constructor(recoveryPassword: string) {
        this.recoveryPassword = recoveryPassword;
    }
    public getRecoveryPassword(): Promise<string> {
        return Promise.resolve(this.recoveryPassword);
    }
}
