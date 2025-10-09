// Export all types and interfaces

// Export API namespaces
// biome-ignore lint/performance/noBarrelFile: Main SDK entry point needs to export all public APIs
export { AuthApi } from './api/auth'
export { EmbeddedWalletApi } from './api/embeddedWallet'
export { ProxyApi } from './api/proxy'
export { UserApi } from './api/user'
// Export main SDK classes
export { Openfort } from './core/openfort'
// Export storage interface
export { IStorage as Storage } from './storage/istorage'
// biome-ignore lint/performance/noReExportAll: Main SDK entry point needs to re-export all types
export * from './types'
