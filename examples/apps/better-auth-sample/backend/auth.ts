import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

export const auth = betterAuth({
  database: new Database("./sqlite.db"), // Specify any DB system
  trustedOrigins: [process.env.BETTER_AUTH_URL || "", process.env.BACKEND_URL || ""],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    rememberMe: true,
  },
  socialProviders: {
    google: {
      enabled: true,
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirectURI: process.env.BACKEND_URL + "/api/auth/callback/google", // By default it redirects to the frontend, specify backend URL
    },
  },
})
