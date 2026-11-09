import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    strictPort: true,
    // Local only by default. Extra hostnames (comma-separated) for a reverse proxy, e.g. NAPKINMATH_ALLOWED_HOSTS=.ts.net
    allowedHosts: process.env.NAPKINMATH_ALLOWED_HOSTS?.split(",") ?? [],
  },
});
