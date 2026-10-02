/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: proxy /api -> the node HTTP API. In dev that is the sneg node via an ssh tunnel
// (ssh -NL 8808:127.0.0.1:8080 sneg). Override with NODE_API env for another node.
const NODE_API = process.env.NODE_API || "http://127.0.0.1:8808";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: NODE_API,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
