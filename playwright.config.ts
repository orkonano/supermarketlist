import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // single shared testcontainer DB — do not parallelize
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "next dev --webpack",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      TURSO_DATABASE_URL: "http://localhost:18080",
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      testIgnore: /api\/.*\.spec\.ts/, // API/MCP specs run headless under the `api` project
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    {
      // REST + MCP integration suite. API-key auth is independent of the session-cookie
      // flow, so this project needs no browser, no storageState, and no `setup` dependency.
      name: "api",
      testMatch: /api\/.*\.spec\.ts/, // e2e/api/*.spec.ts
    },
  ],
});
