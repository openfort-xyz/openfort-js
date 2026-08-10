import { createAuthClient } from 'better-auth/react'

const betterAuthRoot = import.meta.env.VITE_BETTERAUTH_URL || 'http://localhost:4001'
const betterAuthBasePath = import.meta.env.VITE_BETTERAUTH_BASE_PATH || '/api/auth'

// Initialize Better Auth client
// We're using Vite proxy, so no need to specify baseURL
export const authClient = createAuthClient({
  baseURL: betterAuthRoot,
  basePath: betterAuthBasePath,
  fetchOptions: {
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get('set-auth-token') // get the token from the response headers
      // Store the token securely (e.g., in localStorage)
      if (authToken) {
        localStorage.setItem('bearer_token', authToken)
      }
    },
  },
})

export const { signOut, useSession } = authClient
