// next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { externalDir: true },
  webpack(config, { isServer }) {
    // Handle HeartbeatWorker file
    config.module.rules.unshift({
      test: /HeartbeatWorker\.js$/,
      type: 'asset/source',
    })

    if (!isServer) {
      config.output.globalObject = 'self'
      config.resolve.fallback = { fs: false, module: false, path: false }
    }

    // Ignore React Native dependencies in MetaMask SDK for browser builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    }

    config.resolve.extensionAlias = { '.js': ['.js', '.ts'] }

    return config
  },
}

export default withBundleAnalyzer(nextConfig)
