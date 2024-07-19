// sign(
//     message: Uint8Array | string,
//     requireArrayify?: boolean,
//     requireHash?: boolean
//   ): Promise<string>;
//   logout(): Promise<void>;
//   useCredentials(): boolean;
//   updateAuthentication(): Promise<void>;
//   getSingerType(): SignerType;
//   export(): Promise<string>
import { IStorage, StorageKeys } from './storage/istorage';

export class Signer {
  type: 'session' | 'embedded';

  shield?: string; // TODO

  chainID?: number; // TODO ???

  constructor(type: 'session' | 'embedded') {
    this.type = type;
  }

  static fromStorage(storage: IStorage): Signer | null {
    const signer = storage.get(StorageKeys.SIGNER);
    if (!signer) {
      return null;
    }

    const signerObj = JSON.parse(signer);
    return new Signer(signerObj.type);
  }

  save(storage: IStorage): void {
    storage.save(StorageKeys.SIGNER, JSON.stringify(this));
  }

  static async embedded(): Promise<Signer> {
    return new Signer('embedded');
  }
}
