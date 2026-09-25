/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Playwright drives the app via http://127.0.0.1:3000 while `next dev`
  // binds to localhost — allow the alternate host for dev resources (HMR).
  // ALLOWED_DEV_ORIGINS adds more hosts, e.g. a tunnel used to test cookie sessions.
  allowedDevOrigins: ['127.0.0.1', ...(process.env.ALLOWED_DEV_ORIGINS?.split(',') ?? [])],
  transpilePackages: ['@rainbow-me/rainbowkit'],
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream', 'lokijs', 'encoding'],
  turbopack: {
    resolveAlias: {
      pino: './src/empty.js',
      'pino-pretty': './src/empty.js',
      'thread-stream': './src/empty.js',
      lokijs: './src/empty.js',
      encoding: './src/empty.js',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
}

module.exports = nextConfig
