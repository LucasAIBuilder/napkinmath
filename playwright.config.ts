import { defineConfig, devices } from "@playwright/test";

// Tests run against production builds: the web app and the extension popup, each on its own preview server.
export default defineConfig({
  testDir: "tests/ui",
  fullyParallel: true,
  // Locally, cap browsers at 2: the default (half the cores) can exhaust memory in constrained environments.
  workers: process.env.CI ? undefined : 2,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    // Headless Chromium hides scrollbars by default; show them so scroll geometry matches a real browser.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } },
    },
    { name: "firefox", use: devices["Desktop Firefox"] },
  ],
  webServer: [
    {
      command: "npm run build && npx vite preview --port 4173 --strictPort --host 127.0.0.1",
      url: "http://127.0.0.1:4173",
      // analytics.spec.ts serves this build as https://napkinmath.app; Firefox keeps that Host header.
      env: { NAPKINMATH_ALLOWED_HOSTS: "napkinmath.app" },
    },
    {
      command:
        "npm run ext:build:chrome && npx vite preview --outDir extension/dist/chrome --port 4174 --strictPort --host 127.0.0.1",
      url: "http://127.0.0.1:4174/popup.html",
    },
  ],
});
