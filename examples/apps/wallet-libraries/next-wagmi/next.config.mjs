import bundleAnalyzer from '@next/bundle-analyzer'
import path from 'path'
import { fileURLToPath } from 'url'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename) // Fixed variable name from __filename to filename

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  webpack(config) {
    // Keep existing extension alias
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts'],
    }

    // Add module aliases for problematic packages
    config.resolve.alias = {
      ...config.resolve.alias,
      'supports-color': path.join(dirname, 'node_modules/supports-color'),
    }

    // Handle Node.js modules and force CJS resolution for supports-color
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'fs': false,
      'net': false,
      'tls': false,
      'supports-color': false,
    }

    // Add rule to handle supports-color ESM issues
    config.module = config.module || {}
    config.module.rules = config.module.rules || []
    config.module.rules.push({
      test: /debug\/src\/node\.js$/,
      resolve: {
        alias: {
          'supports-color': false
        }
      }
    })

    return config
  },
  transpilePackages: [
    'debug',
    'engine.io-client',
    'socket.io-client',
    'socket.io-parser',
    '@metamask/sdk'
  ],
}

export default withBundleAnalyzer(nextConfig)