import { defineConfig, devices } from "@playwright/test";

// E2E drives the real web UI against a live node (dev server proxies /api -> sneg via the
// ssh tunnel on :8808). These tests are the parity gate: each official screen + action is
// exercised end to end. Start the tunnel first: ssh -NL 8808:127.0.0.1:8080 sneg
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:5173", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
