// Export all types and interfaces
export * from './types';

// Export main SDK classes
export { Openfort } from './core/openfort';

// Export API namespaces
export { AuthApi } from './api/auth';
export { EmbeddedWalletApi } from './api/embeddedWallet';
export { UserApi } from './api/user';
export { ProxyApi } from './api/proxy';

// Export storage interface
export { IStorage as Storage } from './storage/istorage';
