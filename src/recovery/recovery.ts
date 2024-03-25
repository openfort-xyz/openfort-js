export interface IRecovery {
    getRecoveryPassword(): Promise<string>;
}
