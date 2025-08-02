import { createAuthClient } from "better-auth/client"

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BACKEND_URL  // Backend URL
})
