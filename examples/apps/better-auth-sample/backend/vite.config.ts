import { defineConfig } from "vite";

export default defineConfig({
  ssr: {
    external: ["express", "better-auth", "dotenv"]
  }
});
